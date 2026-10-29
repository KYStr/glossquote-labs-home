export const MAX_MANIFEST_BYTES = 64 * 1024;
export const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
export const MAX_ASSET_BYTES = 160 * 1024 * 1024;
const ROOT_FIELDS = ['schemaVersion', 'modelId', 'revision', 'runtimeVersion', 'dtype', 'files'];
const FILE_FIELDS = ['path', 'bytes', 'sha256', 'mime'];
const DTYPES = ['encoder_model', 'decoder_model_merged'];
export const SELECTED_MODEL = Object.freeze({ modelId: 'Xenova/whisper-base', revision: '64da57285918e20ea79ea5c88eed7197933abaa8', runtimeVersion: '3.8.1' });
export const REQUIRED_ASSET_PATHS = Object.freeze([
  ...['config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json',
    'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx', 'MODEL-CARD.txt',
    'LICENSE-APACHE.txt', 'OPENAI-LICENSE.txt', 'UPSTREAM-MODEL-CARD.txt', 'NOTICE.txt']
    .map(name => `/models/whisper-base/${SELECTED_MODEL.revision}/${name}`),
  '/vendor/transformers/transformers.min.js', '/vendor/transformers/LICENSE.txt', '/vendor/transformers/JINJA-LICENSE.txt',
  '/vendor/onnx/ort-wasm-simd-threaded.jsep.mjs', '/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm',
  '/vendor/onnx/LICENSE.txt', '/vendor/onnx/ThirdPartyNotices.txt',
]);
const MIME_BY_EXTENSION = new Map([
  ['json', 'application/json'], ['onnx', 'application/octet-stream'],
  ['onnx_data', 'application/octet-stream'], ['bin', 'application/octet-stream'],
  ['js', 'text/javascript'], ['mjs', 'text/javascript'],
  ['wasm', 'application/wasm'], ['txt', 'text/plain'],
]);

function fail() { throw new Error('MANIFEST_INVALID'); }
function exact(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) fail();
}

export function validateManifest(value, expected = {}) {
  exact(value, ROOT_FIELDS);
  if (value.schemaVersion !== 1 || !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/u.test(value.modelId)
    || !/^[a-f\d]{40}$/u.test(value.revision) || value.runtimeVersion !== '3.8.1') fail();
  for (const key of ['modelId', 'revision', 'runtimeVersion']) if (expected[key] !== undefined && value[key] !== expected[key]) fail();
  exact(value.dtype, DTYPES);
  if (DTYPES.some(key => value.dtype[key] !== 'q8')) fail();
  if (!Array.isArray(value.files) || value.files.length === 0 || value.files.length > 64) fail();
  const prefix = `/models/whisper-base/${value.revision}/`;
  const paths = new Set();
  let totalBytes = 0;
  const files = value.files.map(file => {
    exact(file, FILE_FIELDS);
    if (typeof file.path !== 'string' || !/^\/[a-zA-Z\d_./-]+$/u.test(file.path)
      || file.path.includes('//') || file.path.split('/').some(part => part === '.' || part === '..')
      || !(file.path.startsWith(prefix) || file.path.startsWith('/vendor/transformers/') || file.path.startsWith('/vendor/onnx/'))
      || paths.has(file.path) || paths.has(file.path.toLowerCase())) fail();
    paths.add(file.path);
    paths.add(file.path.toLowerCase());
    if (!Number.isSafeInteger(file.bytes) || file.bytes <= 0 || file.bytes > MAX_ASSET_BYTES
      || typeof file.sha256 !== 'string' || !/^[a-f\d]{64}$/u.test(file.sha256)
      || MIME_BY_EXTENSION.get(file.path.split('.').at(-1)) !== file.mime) fail();
    totalBytes += file.bytes;
    if (totalBytes > MAX_TOTAL_BYTES) fail();
    return Object.freeze({ ...file });
  });
  const normalized = { ...value, dtype: Object.freeze({ ...value.dtype }), files: Object.freeze(files) };
  if (new TextEncoder().encode(JSON.stringify(normalized)).byteLength > MAX_MANIFEST_BYTES) fail();
  return Object.freeze(normalized);
}

export function parseManifest(text, expected = {}) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_MANIFEST_BYTES) fail();
  let value;
  try { value = JSON.parse(text); } catch { fail(); }
  return validateManifest(value, expected);
}

export function validateSelectedManifest(value) {
  const manifest = validateManifest(value, SELECTED_MODEL);
  const paths = new Set(manifest.files.map(file => file.path));
  if (paths.size !== REQUIRED_ASSET_PATHS.length || REQUIRED_ASSET_PATHS.some(assetPath => !paths.has(assetPath))) fail();
  return manifest;
}

export function totalAssetBytes(manifest) {
  return manifest.files.reduce((total, file) => total + file.bytes, 0);
}
