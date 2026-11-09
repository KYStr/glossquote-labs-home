import { LIMITS, RenameError, inspectItems, validateOutputName, collisionKey } from './filename-planner.mjs';

export const MAX_CHUNK_BYTES = 256 * 1024;
export const UINT32_MAX = 0xffffffff;
const fail = code => { throw new RenameError(code); };
const table = Object.freeze(Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
}));
function updateCrc(state, chunk) {
  for (const byte of chunk) state = table[(state ^ byte) & 255] ^ (state >>> 8);
  return state >>> 0;
}
export function crc32(chunks) {
  let state = UINT32_MAX;
  for (const chunk of chunks) {
    if (!(chunk instanceof Uint8Array)) fail('ZIP_INPUT');
    state = updateCrc(state, chunk);
  }
  return (state ^ UINT32_MAX) >>> 0;
}
export function uint32(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > UINT32_MAX) fail('ZIP_BOUNDS');
  return value;
}
// Arithmetic-only public preflight permits boundary tests without huge payloads.
export function preflightZipLayout(records) {
  if (!Array.isArray(records) || records.length < 1 || records.length > LIMITS.count) fail('ZIP_INPUT');
  let offset = 0; let centralSize = 0;
  const locals = [];
  for (const record of records) {
    uint32(record.size);
    if (!Number.isInteger(record.nameBytes) || record.nameBytes < 1 || record.nameBytes > LIMITS.nameBytes) fail('ZIP_INPUT');
    locals.push(uint32(offset));
    offset = uint32(offset + 30 + record.nameBytes + record.size);
    centralSize = uint32(centralSize + 46 + record.nameBytes);
  }
  const centralOffset = uint32(offset);
  const archiveSize = uint32(centralOffset + centralSize + 22);
  return { locals, centralOffset, centralSize, archiveSize };
}
function header(length) {
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  return { bytes, u16: (at, value) => view.setUint16(at, value, true), u32: (at, value) => view.setUint32(at, uint32(value), true) };
}
function localHeader(name, size, crc) {
  const h = header(30);
  h.u32(0, 0x04034b50); h.u16(4, 10); h.u16(6, 0x0800); h.u16(8, 0);
  h.u16(10, 0); h.u16(12, 0x0021); h.u32(14, crc); h.u32(18, size); h.u32(22, size); h.u16(26, name.length);
  return h.bytes;
}
function centralHeader(name, size, crc, offset) {
  const h = header(46);
  h.u32(0, 0x02014b50); h.u16(4, 20); h.u16(6, 10); h.u16(8, 0x0800);
  h.u16(10, 0); h.u16(12, 0); h.u16(14, 0x0021); h.u32(16, crc);
  h.u32(20, size); h.u32(24, size); h.u16(28, name.length); h.u32(42, offset);
  return h.bytes;
}
function endHeader(count, layout) {
  const h = header(22);
  h.u32(0, 0x06054b50); h.u16(8, count); h.u16(10, count);
  h.u32(12, layout.centralSize); h.u32(16, layout.centralOffset);
  return h.bytes;
}

export async function buildStoreZip(entries, options = {}) {
  const { signal, generation, isCurrent = () => true, onReader = () => {}, onProgress = () => {},
    yieldTask = () => new Promise(resolve => setTimeout(resolve, 0)), createBlob = parts => new Blob(parts, { type: 'application/zip' }) } = options;
  const active = () => { if (signal?.aborted || !isCurrent(generation)) fail('CANCELLED'); };
  active();
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > LIMITS.count) fail('ZIP_INPUT');
  const metadata = entries.map(entry => ({ name: entry.name, size: entry.size }));
  if (inspectItems(metadata).errors.length) fail('ZIP_INPUT');
  const keys = new Set();
  const names = entries.map(entry => {
    const checked = validateOutputName(entry.name);
    if (checked.normalizedName !== entry.name || typeof entry.stream !== 'function') fail('ZIP_INPUT');
    const key = collisionKey(entry.name);
    if (keys.has(key)) fail('COLLISION'); keys.add(key);
    return new TextEncoder().encode(entry.name);
  });
  const layout = preflightZipLayout(entries.map((entry, i) => ({ size: entry.size, nameBytes: names[i].length })));
  const parts = []; const central = [];
  let reader = null; let cancelledReader = false;
  const cancelReader = () => {
    if (!reader || cancelledReader) return;
    cancelledReader = true;
    try { Promise.resolve(reader.cancel()).catch(() => {}); } catch { /* fixed outer failure path */ }
  };
  signal?.addEventListener('abort', cancelReader);
  try {
    for (let index = 0; index < entries.length; index++) {
      active();
      const entry = entries[index]; const chunks = [];
      let count = 0; let crc = UINT32_MAX; let staged = null; let stagedLength = 0; let readsSinceYield = 0;
      try {
        reader = entry.stream().getReader(); cancelledReader = false; onReader(reader);
        active(); onProgress({ current: index + 1, completed: index, total: entries.length });
        while (true) {
          active(); const result = await reader.read(); active();
          if (result.done) break;
          const value = result.value;
          if (!(value instanceof Uint8Array) || value.byteLength === 0) fail('READ_FAILED');
          if (count + value.byteLength > entry.size) fail('READ_SIZE');
          for (let start = 0; start < value.byteLength;) {
            active();
            if (!staged) staged = new Uint8Array(Math.min(MAX_CHUNK_BYTES, entry.size - count));
            const amount = Math.min(value.byteLength - start, staged.byteLength - stagedLength);
            const piece = value.subarray(start, start + amount);
            staged.set(piece, stagedLength); stagedLength += amount; count += amount; start += amount;
            crc = updateCrc(crc, piece);
            if (stagedLength === staged.byteLength) {
              chunks.push(staged); staged = null; stagedLength = 0; readsSinceYield = 0;
              // Yield a task, not just a microtask: cancel/input can run during CRC.
              active(); await yieldTask(); active();
            }
          }
          if (++readsSinceYield >= 64) { readsSinceYield = 0; active(); await yieldTask(); active(); }
        }
        if (count !== entry.size) fail('READ_SIZE');
        crc = (crc ^ UINT32_MAX) >>> 0;
        parts.push(localHeader(names[index], count, crc), names[index], ...chunks);
        central.push(centralHeader(names[index], count, crc, layout.locals[index]), names[index]);
        onProgress({ current: index + 1, completed: index + 1, total: entries.length });
      } finally {
        // Release even after read/cancel/resource failures; no File bytes retained here.
        if (reader) {
          cancelReader();
          try { reader.releaseLock(); } catch { /* pending reads are cancelled above */ }
        }
        reader = null; onReader(null); staged = null; chunks.length = 0;
      }
    }
    active();
    parts.push(...central, endHeader(entries.length, layout));
    let blob;
    try { blob = createBlob(parts); } catch { fail('ZIP_FAILED'); }
    active();
    if (!blob || blob.size !== layout.archiveSize || blob.type !== 'application/zip') fail('ZIP_FAILED');
    return blob;
  } catch (error) {
    cancelReader();
    if (signal?.aborted || !isCurrent(generation)) fail('CANCELLED');
    if (error instanceof RenameError) throw error;
    fail('READ_FAILED');
  } finally {
    signal?.removeEventListener('abort', cancelReader);
    parts.length = 0; central.length = 0;
  }
}
