export const MAX_FILE_BYTES = 8_388_608;
export const MAX_TOTAL_BYTES = 16_777_216;
export const MAX_EDGE = 4096;
export const MAX_PIXELS = 8_000_000;

export function fail(code) { throw new Error(code); }
export function validateFileSize(size) {
  if (!Number.isSafeInteger(size) || size < 0) fail('HEADER_INVALID');
  if (size === 0) fail('FILE_EMPTY');
  if (size > MAX_FILE_BYTES) fail('FILE_TOO_LARGE');
  return size;
}
export function visualDimensions({ width, height, orientation = 1 }) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !Number.isInteger(orientation) || orientation < 1 || orientation > 8) fail('DIMENSION_INVALID');
  if (width > MAX_EDGE || height > MAX_EDGE) fail('DIMENSION_LIMIT');
  if (width * height > MAX_PIXELS) fail('PIXEL_LIMIT');
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}
export function assertSameDimensions(left, right) {
  const a = visualDimensions(left), b = visualDimensions(right);
  if (a.width !== b.width || a.height !== b.height) fail('DIMENSION_MISMATCH');
  return a;
}
export function validatePairBytes(a, b) {
  validateFileSize(a); validateFileSize(b);
  if (a + b > MAX_TOTAL_BYTES) fail('TOTAL_TOO_LARGE');
}
export function validateSettings(settings) {
  if (!settings || Object.getPrototypeOf(settings) !== Object.prototype || Object.keys(settings).sort().join(',') !== 'mode,opacity,threshold') fail('SETTINGS_INVALID');
  const { mode, opacity, threshold } = settings;
  if (!['blend', 'difference'].includes(mode) || !Number.isInteger(opacity) || opacity < 0 || opacity > 100 || !Number.isInteger(threshold) || threshold < 0 || threshold > 255) fail('SETTINGS_INVALID');
  return { mode, opacity, threshold };
}
