import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AssetLoader } from '../public/js/asset-loader.mjs';
import { SELECTED_MODEL, REQUIRED_ASSET_PATHS } from '../public/js/core/manifest.mjs';
import { chunkedResponse, RESPONSE_CHUNK_BYTES } from './spike/chunked-response.mjs';

class StreamLoader extends AssetLoader { createResponse(entry) { return chunkedResponse(entry); } }
const origin = 'http://127.0.0.1:5192';
const source = new Uint8Array(RESPONSE_CHUNK_BYTES * 2 + 7).fill(43);

test('chunk reads are bounded, preserve bytes and cannot mutate verified storage or other readers', async () => {
  const entry = { buffer: source.slice(), mime: 'application/octet-stream' };
  const response = chunkedResponse(entry), other = chunkedResponse(entry);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), String(entry.buffer.byteLength));
  const reader = response.body.getReader();
  let bytes = 0, chunks = 0;
  for (;;) {
    const item = await reader.read(); if (item.done) break;
    assert(item.value.byteLength <= RESPONSE_CHUNK_BYTES);
    assert(item.value.every(value => value === 43));
    bytes += item.value.byteLength; chunks += 1; item.value.fill(99);
  }
  assert.equal(bytes, source.byteLength); assert.equal(chunks, 3);
  assert.deepEqual(entry.buffer, source);
  const consumed = new Uint8Array(await other.arrayBuffer());
  assert.deepEqual(consumed, source); consumed.fill(0); assert.deepEqual(entry.buffer, source);
});

test('streamed responses inherit exact loader integrity and request gates with no extra native fetch', async () => {
  const body = '{}', sha256 = createHash('sha256').update(body).digest('hex');
  const mime = path => path.endsWith('.json') ? 'application/json' : path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.onnx') ? 'application/octet-stream' : /\.m?js$/u.test(path) ? 'text/javascript' : 'text/plain';
  const manifest = { schemaVersion: 1, ...SELECTED_MODEL, dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, files: REQUIRED_ASSET_PATHS.map(path => ({ path, bytes: 2, sha256, mime: mime(path) })) };
  let calls = 0;
  const loader = new StreamLoader({ origin, fetchImpl: async () => { calls += 1; return new Response(body); } });
  await loader.load(manifest);
  const path = REQUIRED_ASSET_PATHS[0];
  assert.equal(await (await loader.fetch(path)).text(), body);
  for (const request of [path + '?x=1', 'https://example.invalid' + path, '/vendor/onnx/unlisted.wasm', '/vendor/onnx/../onnx/LICENSE.txt']) await assert.rejects(loader.fetch(request), /ASSET_REQUEST_BLOCKED/u);
  await assert.rejects(loader.fetch(path, { method: 'POST', body: 'fake' }), /ASSET_REQUEST_BLOCKED/u);
  assert.equal(calls, REQUIRED_ASSET_PATHS.length);
  loader.clear(); await assert.rejects(loader.fetch(path), /ASSET_REQUEST_BLOCKED/u);
  const corrupt = new StreamLoader({ origin, fetchImpl: async () => new Response('{x') });
  await assert.rejects(corrupt.load(manifest), /ASSET_INTEGRITY_FAILED/u); assert.equal(corrupt.verified.size, 0);
});

test('production default still snapshots its Response body at construction', async () => {
  const loader = new AssetLoader({ origin }), entry = { buffer: new Uint8Array([11, 22]), mime: 'application/octet-stream' };
  const response = loader.createResponse(entry); entry.buffer.fill(0);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([11, 22]));
});
