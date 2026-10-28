import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createSpikeServer } from '../scripts/serve-spike.mjs';

test('spike serves fixed test roots and injects HTTP faults without touching assets', async t => {
  let fault = 'normal'; const records = [];
  const server = createSpikeServer({ getFault: () => fault, onRequest: record => records.push(record) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (pathname, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: pathname, method }, response => {
      const parts = []; response.on('data', chunk => parts.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(parts) }));
    }); req.on('error', reject); req.end();
  });
  assert.equal((await request('/spike/index.html')).status, 200);
  assert.equal((await request('/fixtures/generated/t02-v1/en-01.wav')).status, 200);
  assert.equal((await request('/scripts/serve.mjs')).status, 404);
  assert.equal((await request('/spike/index.html', 'POST')).status, 405);
  assert.equal((await request('/spike/index.html?text=synthetic-canary')).status, 400);
  const pathname = '/models/whisper-base/64da57285918e20ea79ea5c88eed7197933abaa8/config.json';
  const normal = await request(pathname); assert.equal(normal.status, 200);
  fault = 'missing'; assert.equal((await request(pathname)).status, 404);
  fault = 'redirect'; const redirect = await request(pathname); assert.equal(redirect.status, 302); assert.equal(redirect.headers.location, '/spike/index.html');
  fault = 'corrupt'; const corrupt = await request(pathname); assert.equal(corrupt.status, 200); assert.equal(corrupt.body.length, normal.body.length); assert.notDeepEqual(corrupt.body, normal.body);
  fault = 'normal'; assert.deepEqual((await request(pathname)).body, normal.body);
  assert.ok(records.every(record => !JSON.stringify(record).includes('synthetic-canary')));
});
