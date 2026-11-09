import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ASSETS, HEADERS, mime } from './manifest.mjs';
import { sha256 } from './files.mjs';

function get(path, method = 'GET', host = '127.0.0.1:4216') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: 4216, path, method, headers: { Host: host }, agent: false }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, bytes: Buffer.concat(chunks) }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('HTTP_TIMEOUT')));
    req.on('error', reject); req.end();
  });
}
export async function runHttpSmoke(root) {
  const results = [];
  for (const file of ASSETS.filter(file => file !== '_headers')) {
    const expected = await readFile(join(root, file));
    for (const method of ['GET', 'HEAD']) {
      const response = await get('/' + file, method);
      assert.equal(response.status, 200); assert.equal(response.headers['content-type'], mime(file));
      for (const [key, value] of Object.entries(HEADERS)) assert.equal(response.headers[key.toLowerCase()], value);
      assert.equal(response.headers['content-length'], String(expected.length));
      assert.deepEqual(response.bytes, method === 'HEAD' ? Buffer.alloc(0) : expected);
      results.push({ path: '/' + file, method, status: response.status, bytes: response.bytes.length, sha256: sha256(response.bytes) });
    }
  }
  for (const [path, status, method, host] of [
    ['/', 200], ['/en/', 200], ['/missing', 404], ['/_headers', 404], ['/package.json', 404], ['/core.mjs?draft=FAKE', 404],
    ['/../AGENTS.md', 404], ['/%2e%2e/AGENTS.md', 404], ['/en/nope', 404], ['/index.html', 405, 'POST'], ['/index.html', 421, 'GET', 'outside.invalid']
  ]) {
    const response = await get(path, method, host); assert.equal(response.status, status); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
    if (status !== 200) assert.ok(response.bytes.includes(Buffer.from('noindex')));
    results.push({ path, method: method ?? 'GET', status });
  }
  return { status: 'PASS', origin: 'http://127.0.0.1:4216', checks: results.length, servedAssets: 12, emittedAssets: 13, results, browserEvidence: 'NOT_RUN_USER_FOCUS_INCIDENT' };
}
