export const RUNTIME_ID = 'ffmpeg-0.12.15-core-0.12.10-st';
export const MAX_RUNTIME_BYTES = 80 * 1024 * 1024;
export const RUNTIME_FILES = Object.freeze([
  ...['index.js', 'classes.js', 'const.js', 'errors.js', 'utils.js', 'worker.js', 'types.js'].map((name) => Object.freeze({ path: `/vendor/ffmpeg/ffmpeg-0.12.15/${name}`, mime: 'text/javascript' })),
  Object.freeze({ path: '/vendor/ffmpeg/core-0.12.10/ffmpeg-core.js', mime: 'text/javascript' }),
  Object.freeze({ path: '/vendor/ffmpeg/core-0.12.10/ffmpeg-core.wasm', mime: 'application/wasm' }),
]);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
export function validateManifest(value) {
  const reject = () => { throw new Error('RUNTIME_INTEGRITY_FAILED'); };
  if (!exact(value, ['schemaVersion', 'runtimeId', 'files']) || value.schemaVersion !== 1 || value.runtimeId !== RUNTIME_ID || !Array.isArray(value.files) || value.files.length !== RUNTIME_FILES.length) reject();
  let total = 0;
  const seen = new Set();
  const files = value.files.map((entry) => {
    if (!exact(entry, ['path', 'bytes', 'sha256', 'mime'])) reject();
    const expected = RUNTIME_FILES.find((file) => file.path === entry.path);
    if (!expected || entry.mime !== expected.mime || seen.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) reject();
    seen.add(entry.path); total += entry.bytes;
    if (total > MAX_RUNTIME_BYTES) reject();
    return Object.freeze({ ...entry });
  });
  return Object.freeze({ schemaVersion: 1, runtimeId: RUNTIME_ID, files: Object.freeze(files), totalBytes: total });
}
