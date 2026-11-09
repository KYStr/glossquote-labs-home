import { fail } from './errors.js';
export const MAX_BYTES = 2097152;
export function decodeInput(bytes) {
  if (!(bytes instanceof Uint8Array)) fail('INVALID_ENCODING');
  if (bytes.byteLength > MAX_BYTES) fail('INPUT_TOO_LARGE');
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) fail('INVALID_ENCODING');
  const offset = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(offset)); }
  catch { fail('INVALID_ENCODING'); }
}
