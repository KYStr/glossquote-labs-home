import { LIMITS, fail } from './errors.mjs';

export function validateOutputBytes(bytes, type) {
  const limit = type === 'png' ? LIMITS.pngBytes : type === 'text' ? LIMITS.textBytes : 0;
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > limit) fail('OUTPUT_TOO_LARGE', { type, bytes });
}

export function buildIndexText(items) {
  const records = items.map(({ file, metadata }, i) =>
    `${i + 1}\t${JSON.stringify(file.name)}\t${metadata.visualWidth}x${metadata.visualHeight}`);
  const bytes = new TextEncoder().encode('Photo contact sheet index v1\n' + records.join('\n') + '\n');
  validateOutputBytes(bytes.byteLength, 'text');
  return bytes;
}
