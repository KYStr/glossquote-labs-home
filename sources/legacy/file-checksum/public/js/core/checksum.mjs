export const MAX_FILE_BYTES = 134217728;
export const MAX_EXPECTED_CODE_UNITS = 256;
export const ERROR_CODES = Object.freeze([
  'FILE_REQUIRED', 'SIZE_INVALID', 'SIZE_LIMIT', 'EXPECTED_LENGTH', 'EXPECTED_FORMAT',
  'HASH_FORMAT', 'HASH_LENGTH', 'UNSUPPORTED_ENVIRONMENT', 'WORKER_START_FAILED',
  'WORKER_PROTOCOL', 'WORKER_FAILED', 'WORKER_MESSAGE_FAILED', 'READ_FAILED',
  'READ_SIZE_MISMATCH', 'HASH_FAILED', 'TIMEOUT',
]);
const HASH_PATTERN = /^[0-9a-f]{64}$/;
export class ProductError extends Error {
  constructor(code) {
    const fixed = ERROR_CODES.includes(code) ? code : 'WORKER_PROTOCOL';
    super(fixed);
    this.name = 'ProductError';
    this.code = fixed;
  }
}
export function validateFileSize(size) {
  if (!Number.isSafeInteger(size) || size < 0) throw new ProductError('SIZE_INVALID');
  if (size > MAX_FILE_BYTES) throw new ProductError('SIZE_LIMIT');
  return size;
}
export function parseExpected(source) {
  if (typeof source !== 'string') return Object.freeze({ state: 'invalid', hex: null, code: 'EXPECTED_FORMAT' });
  if (source.length > MAX_EXPECTED_CODE_UNITS) return Object.freeze({ state: 'invalid', hex: null, code: 'EXPECTED_LENGTH' });
  const trimmed = source.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
  if (trimmed === '') return Object.freeze({ state: 'empty', hex: null, code: null });
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) return Object.freeze({ state: 'invalid', hex: null, code: 'EXPECTED_FORMAT' });
  return Object.freeze({ state: 'valid', hex: trimmed.toLowerCase(), code: null });
}
export function bytesToHex(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 32 || bytes.length !== 32) throw new ProductError('HASH_LENGTH');
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export function assertHash(hash) {
  if (typeof hash !== 'string' || !HASH_PATTERN.test(hash)) throw new ProductError('HASH_FORMAT');
  return hash;
}
function isParsedExpected(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
  const keys = Reflect.ownKeys(result);
  if (keys.length !== 3 || !keys.every(key => ['state', 'hex', 'code'].includes(key))) return false;
  if (keys.some(key => !Object.getOwnPropertyDescriptor(result, key).hasOwnProperty('value'))) return false;
  if (result.state === 'empty') return result.hex === null && result.code === null;
  if (result.state === 'invalid') return result.hex === null && ['EXPECTED_LENGTH', 'EXPECTED_FORMAT'].includes(result.code);
  return result.state === 'valid' && typeof result.hex === 'string' && HASH_PATTERN.test(result.hex) && result.code === null;
}
export function compareHash(hash, expectedResult) {
  if (hash === null) return 'pending';
  assertHash(hash);
  if (!isParsedExpected(expectedResult)) throw new ProductError('EXPECTED_FORMAT');
  if (expectedResult.state === 'empty') return 'not-provided';
  if (expectedResult.state === 'invalid') return 'invalid';
  return hash === expectedResult.hex ? 'match' : 'mismatch';
}
export function serializeHash(hash) { return `${assertHash(hash)}\n`; }
