import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AssetLoader } from '../public/js/asset-loader.mjs';
import { SELECTED_MODEL, REQUIRED_ASSET_PATHS } from '../public/js/core/manifest.mjs';

const body = '{}';
const digest = createHash('sha256').update(body).digest('hex');
const origin = 'http://127.0.0.1:5192';
const mime = assetPath => assetPath.endsWith('.json') ? 'application/json' : assetPath.endsWith('.wasm') ? 'application/wasm' : assetPath.endsWith('.onnx') ? 'application/octet-stream' : /\.m?js$/u.test(assetPath) ? 'text/javascript' : 'text/plain';
function fixture() {
  return { schemaVersion: 1, ...SELECTED_MODEL, dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, files: REQUIRED_ASSET_PATHS.map(assetPath => ({ path: assetPath, bytes: body.length, sha256: digest, mime: mime(assetPath) })) };
}

test('browser loader rejects changed candidate and incomplete or extra asset closure before fetch', async () => {
  let calls = 0;
  const loader = new AssetLoader({ origin, fetchImpl: async () => { calls += 1; return new Response(body); } });
  const changed = fixture(); changed.modelId = 'Test/whisper-base';
  await assert.rejects(loader.load(changed), /MANIFEST_INVALID/u);
  for (const removed of ['encoder_model_quantized.onnx', 'decoder_model_merged_quantized.onnx', 'transformers.min.js', 'ort-wasm-simd-threaded.jsep.wasm']) {
    const value = fixture(); value.files = value.files.filter(file => !file.path.endsWith(removed));
    await assert.rejects(loader.load(value), /MANIFEST_INVALID/u);
  }
  const extra = fixture(); extra.files.push({ ...extra.files[0], path: '/vendor/onnx/unexpected.json' });
  await assert.rejects(loader.load(extra), /MANIFEST_INVALID/u);
  assert.equal(calls, 0);
});

test('loads and verifies the whole allowlist once, then runtime reads only the memory map', async () => {
  let calls = 0;
  const loader = new AssetLoader({ origin, fetchImpl: async (url, options) => {
    calls += 1;
    assert(url.startsWith(origin + '/'));
    assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    return new Response(body, { headers: { 'Content-Length': String(body.length) } });
  } });
  const progress = [];
  const loaded = await loader.load(fixture(), { onProgress: item => progress.push(item.loaded) });
  assert.equal(loaded.loadedBytes, REQUIRED_ASSET_PATHS.length * body.length);
  assert.equal(calls, REQUIRED_ASSET_PATHS.length);
  assert(progress.every((value, index) => index === 0 || value >= progress[index - 1]));
  const assetPath = REQUIRED_ASSET_PATHS[0];
  assert.equal(await (await loader.fetch(assetPath)).text(), body);
  assert.equal(loader.audit().reads[assetPath], 1);
  for (const request of [origin + assetPath + '?x=1', 'https://example.invalid' + assetPath, '/vendor/onnx/not-listed.wasm', '/vendor/onnx/../onnx/LICENSE.txt']) await assert.rejects(loader.fetch(request), /ASSET_REQUEST_BLOCKED/u);
  await assert.rejects(loader.fetch(assetPath, { method: 'POST', body: 'fake' }), /ASSET_REQUEST_BLOCKED/u);
  assert.equal(calls, REQUIRED_ASSET_PATHS.length);
  loader.clear();
  assert.equal(loader.verified.size, 0);
  await assert.rejects(loader.fetch(assetPath), /ASSET_REQUEST_BLOCKED/u);
});

test('corruption, oversized/short responses and redirects fail before model initialization', async () => {
  for (const [response, code] of [
    [new Response('{x'), 'ASSET_INTEGRITY_FAILED'], [new Response('{}x'), 'ASSET_INTEGRITY_FAILED'],
    [new Response('{'), 'ASSET_INTEGRITY_FAILED'], [new Response(null, { status: 302 }), 'MODEL_LOAD_FAILED'],
    [new Response('', { status: 404 }), 'MODEL_LOAD_FAILED'],
  ]) {
    const loader = new AssetLoader({ origin, fetchImpl: async () => response });
    await assert.rejects(loader.load(fixture()), new RegExp(code, 'u'));
    assert.equal(loader.verified.size, 0);
  }
});

test('abort before and during download leaves no verified assets available', async () => {
  let calls = 0;
  const loader = new AssetLoader({ origin, fetchImpl: async () => { calls += 1; return new Response(body); } });
  const before = new AbortController(); before.abort();
  await assert.rejects(loader.load(fixture(), { signal: before.signal }), /MODEL_LOAD_FAILED/u);
  assert.equal(calls, 0);
  const during = new AbortController();
  await assert.rejects(loader.load(fixture(), { signal: during.signal, onProgress: () => during.abort() }), /MODEL_LOAD_FAILED/u);
  assert.equal(loader.verified.size, 0);
});
