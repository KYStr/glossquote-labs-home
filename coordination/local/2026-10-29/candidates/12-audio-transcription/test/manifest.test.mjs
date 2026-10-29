import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, validateManifest, totalAssetBytes, MAX_ASSET_BYTES, MAX_TOTAL_BYTES } from '../public/js/core/manifest.mjs';

const revision = 'a'.repeat(40);
function fixture() {
  return {
    schemaVersion: 1, modelId: 'Test/whisper-base', revision, runtimeVersion: '3.8.1',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    files: [{ path: `/models/whisper-base/${revision}/config.json`, bytes: 2, sha256: 'b'.repeat(64), mime: 'application/json' }],
  };
}

test('accepts a complete bounded manifest and binds it to the selected immutable candidate', () => {
  const manifest = parseManifest(JSON.stringify(fixture()), { modelId: 'Test/whisper-base', revision });
  assert.equal(totalAssetBytes(manifest), 2);
  assert(Object.isFrozen(manifest.files));
  assert.throws(() => validateManifest(fixture(), { revision: 'c'.repeat(40) }), /MANIFEST_INVALID/u);
  assert.throws(() => validateManifest(fixture(), { modelId: 'Test/whisper-base.en' }), /MANIFEST_INVALID/u);
});

test('rejects draft metadata, unknown fields, unsupported configuration, malformed and oversized JSON', () => {
  const mutations = [
    m => { m.files[0].sha256 = null; }, m => { m.files[0].bytes = null; },
    m => { m.extra = true; }, m => { m.files[0].extra = true; },
    m => { m.dtype.extra = 'q8'; }, m => { m.dtype.encoder_model = 'fp32'; },
    m => { m.revision = 'main'; }, m => { m.runtimeVersion = 'latest'; },
    m => { m.files[0].bytes = 1.5; }, m => { m.files[0].mime = 'text/html'; },
    m => { m.files[0].sha256 = 'x'.repeat(64); },
  ];
  for (const mutate of mutations) { const value = fixture(); mutate(value); assert.throws(() => validateManifest(value), /MANIFEST_INVALID/u); }
  assert.throws(() => parseManifest('{'), /MANIFEST_INVALID/u);
  assert.throws(() => parseManifest(' '.repeat(65 * 1024)), /MANIFEST_INVALID/u);
});

test('rejects traversal, external/ambiguous paths, mismatched revision, and duplicate assets before retrieval', () => {
  const paths = [
    'https://example.invalid/config.json', '/vendor/onnx/../config.json', '/vendor/onnx/./config.json',
    '/vendor/onnx//config.json', '/vendor/onnx/%2e%2e/config.json', '/vendor/onnx/config.json?x=1',
    '/vendor/onnx/config.json#x', '/vendor/onnx/config\\x.json', '/not-allowed/config.json',
    `/models/whisper-base/${'b'.repeat(40)}/config.json`,
  ];
  for (const path of paths) { const value = fixture(); value.files[0].path = path; assert.throws(() => validateManifest(value), /MANIFEST_INVALID/u); }
  const value = fixture(); value.files.push({ ...value.files[0] });
  assert.throws(() => validateManifest(value), /MANIFEST_INVALID/u);
});

test('enforces individual and aggregate budgets with exact boundary acceptance', () => {
  const value = fixture(); value.files[0].bytes = MAX_ASSET_BYTES;
  assert.equal(totalAssetBytes(validateManifest(value)), MAX_ASSET_BYTES);
  value.files[0].bytes += 1;
  assert.throws(() => validateManifest(value), /MANIFEST_INVALID/u);
  value.files[0].bytes = MAX_ASSET_BYTES;
  value.files.push({ ...value.files[0], path: '/vendor/onnx/runtime.wasm', bytes: MAX_TOTAL_BYTES - MAX_ASSET_BYTES, mime: 'application/wasm' });
  assert.equal(totalAssetBytes(validateManifest(value)), MAX_TOTAL_BYTES);
  value.files[1].bytes += 1;
  assert.throws(() => validateManifest(value), /MANIFEST_INVALID/u);
});
