import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { validateManifest, RUNTIME_FILES, RUNTIME_ID, MAX_RUNTIME_BYTES } from '../public/js/core/manifest.mjs';
import { createSpikeServer } from '../scripts/serve-spike.mjs';

const candidate = () => ({ schemaVersion: 1, runtimeId: RUNTIME_ID, files: RUNTIME_FILES.map((file) => ({ ...file, bytes: 10, sha256: 'a'.repeat(64) })) });
test('VA-07 exact same-origin manifest and hard budget', () => {
  const valid = validateManifest(candidate());
  assert.equal(valid.totalBytes, RUNTIME_FILES.length * 10);
  assert.ok(Object.isFrozen(valid.files));
  const mutations = [
    (v) => { v.extra = true; }, (v) => { v.schemaVersion = 2; }, (v) => { v.runtimeId = 'https://invalid.test/'; },
    (v) => { v.files[0].path = '../secret'; }, (v) => { v.files[0].path = 'https://invalid.test/asset'; },
    (v) => { v.files[0].path += '?x=1'; }, (v) => { v.files[1] = { ...v.files[0] }; },
    (v) => { v.files[0].bytes = MAX_RUNTIME_BYTES; }, (v) => { v.files[0].bytes = 0; },
    (v) => { v.files[0].bytes = 1.5; }, (v) => { v.files[0].sha256 = 'unknown'; },
    (v) => { v.files[0].mime = 'text/html'; }, (v) => { v.files[0].extra = true; },
    (v) => { v.files = []; },
  ];
  for (const mutate of mutations) { const value = candidate(); mutate(value); assert.throws(() => validateManifest(value), /RUNTIME_INTEGRITY_FAILED/); }
});
test('staged bytes and hashes match exact manifest', async () => {
  const manifest = validateManifest(JSON.parse(await readFile(new URL('../public/runtime-manifest.json', import.meta.url), 'utf8')));
  for (const entry of manifest.files) {
    const bytes = await readFile(new URL(`../public${entry.path}`, import.meta.url));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
});
test('spike only exposes approved roots and exact manifest, with redacted rejected routes', async (t) => {
  const log = [];
  const server = createSpikeServer({ log: (record) => log.push(record) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (route) => new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port: server.address().port, path: route }, (res) => {
      const chunks = []; res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, bytes: Buffer.concat(chunks) }));
    }); req.on('error', reject);
  });
  const manifest = await request('/runtime-manifest.json');
  assert.equal(manifest.status, 200); assert.equal(JSON.parse(manifest.bytes).runtimeId, RUNTIME_ID);
  for (const route of ['/', '/index.html', '/package.json', '/docs/DEPENDENCIES.md', '/runtime-manifest.json/extra', '/spike/private-name.dat']) assert.equal((await request(route)).status, 404);
  assert.equal((await request('/spike/%2e%2e/package.json')).status, 403);
  const wasm = await request('/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm');
  assert.equal(wasm.status, 200); assert.equal(wasm.headers['content-type'], 'application/wasm');
  assert.equal(log.find((record) => record.status === 404).route, 'REJECTED_ROUTE');
  assert.equal(JSON.stringify(log).includes('private-name'), false);
});

test('spike failure servers use real missing or changed bytes without mutating vendor', async (t) => {
  assert.throws(() => createSpikeServer({ fault: 'arbitrary-path' }), /Unknown fixed spike fault/);
  const original = await readFile(new URL('../public/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm', import.meta.url));
  const originalHash = createHash('sha256').update(original).digest('hex');
  for (const fault of ['missing-wasm', 'corrupt-wasm']) {
    const server = createSpikeServer({ fault });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm`);
    if (fault === 'missing-wasm') assert.equal(response.status, 404);
    else {
      assert.equal(response.status, 200);
      const changed = Buffer.from(await response.arrayBuffer());
      assert.equal(changed.length, original.length);
      assert.equal(changed.subarray(0, -1).equals(original.subarray(0, -1)), true);
      assert.equal(changed.at(-1), original.at(-1) ^ 1);
      assert.notEqual(createHash('sha256').update(changed).digest('hex'), originalHash);
    }
  }
  assert.equal(createHash('sha256').update(await readFile(new URL('../public/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm', import.meta.url))).digest('hex'), originalHash);
});
