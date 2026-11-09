import { LIMITS } from './limits.js';

export async function compareFilesBytewise(fileA, fileB, chunkBytes = LIMITS.chunkBytes) {
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > LIMITS.chunkBytes) throw new Error('VERIFY_FAILED');
  if (!Number.isSafeInteger(fileA.size) || !Number.isSafeInteger(fileB.size) || fileA.size < 0 || fileB.size < 0) throw new Error('VERIFY_FAILED');
  if (fileA.size !== fileB.size) return false;
  for (let offset = 0; offset < fileA.size; offset += chunkBytes) {
    const end = Math.min(offset + chunkBytes, fileA.size);
    let a = null, b = null;
    try {
      a = await fileA.slice(offset, end).arrayBuffer();
      b = await fileB.slice(offset, end).arrayBuffer();
      if (!(a instanceof ArrayBuffer) || !(b instanceof ArrayBuffer) || a.byteLength !== end - offset || b.byteLength !== end - offset) throw new Error('VERIFY_FAILED');
      const viewA = new Uint8Array(a), viewB = new Uint8Array(b);
      for (let index = 0; index < viewA.length; index++) if (viewA[index] !== viewB[index]) return false;
    } finally { a = null; b = null; }
  }
  return true;
}
