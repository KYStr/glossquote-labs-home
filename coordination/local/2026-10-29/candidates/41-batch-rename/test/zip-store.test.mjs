import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoreZip, crc32, preflightZipLayout, uint32, UINT32_MAX, MAX_CHUNK_BYTES } from '../public/js/core/zip-store.mjs';

export function entry(name, bytes) { return { name, size: bytes.length, stream: () => new ReadableStream({ start(controller) { if (bytes.length) controller.enqueue(bytes); controller.close(); } }) }; }
const fast = { yieldTask: async () => {} };
test('BR30: independent fixed CRC vectors and chunk accumulation', () => {
  const ascii = new Uint8Array([49, 50, 51, 52, 53, 54, 55, 56, 57]);
  assert.equal(crc32([ascii]), 0xcbf43926);
  assert.equal(crc32([ascii.slice(0, 3), ascii.slice(3, 7), ascii.slice(7)]), 0xcbf43926);
  assert.equal(crc32([]), 0); assert.equal(crc32([new Uint8Array()]), 0);
  assert.throws(() => crc32(['abc']), { code: 'ZIP_INPUT' });
});
test('BR29/31: local, central, EOCD fixed fields and exact binary/zero payload (Node structural evidence)', async () => {
  const payload = new Uint8Array([0, 255, 16, 65, 0]); const snapshot = payload.slice();
  const zip = await buildStoreZip([entry('é.bin', payload), entry('zero', new Uint8Array())], fast);
  assert.equal(zip.type, 'application/zip');
  const bytes = new Uint8Array(await zip.arrayBuffer()); const v = new DataView(bytes.buffer);
  const u16 = at => v.getUint16(at, true); const u32 = at => v.getUint32(at, true);
  assert.deepEqual(Array.from(bytes.slice(0, 14)), [80, 75, 3, 4, 10, 0, 0, 8, 0, 0, 0, 0, 33, 0]);
  assert.equal(u32(18), 5); assert.equal(u32(22), 5); assert.equal(u16(26), 6); assert.equal(u16(28), 0);
  assert.deepEqual(Array.from(bytes.slice(30, 36)), [195, 169, 46, 98, 105, 110]);
  assert.deepEqual(Array.from(bytes.slice(36, 41)), [0, 255, 16, 65, 0]);
  assert.equal(u32(41), 0x04034b50); assert.equal(u32(55), 0); assert.equal(u32(59), 0); assert.equal(u32(63), 0);
  assert.equal(u32(75), 0x02014b50); assert.equal(u16(79), 20); assert.equal(u16(81), 10);
  assert.equal(u16(83), 0x0800); assert.equal(u16(85), 0); assert.equal(u16(87), 0); assert.equal(u16(89), 0x21);
  assert.equal(u32(91), u32(14)); assert.equal(u32(95), 5); assert.equal(u32(99), 5);
  assert.equal(u16(103), 6);
  for (const at of [105, 107, 109, 111]) assert.equal(u16(at), 0);
  assert.equal(u32(113), 0); assert.equal(u32(117), 0);
  assert.equal(u32(127), 0x02014b50); assert.equal(u32(169), 41);
  assert.equal(u32(177), 0x06054b50);
  assert.equal(u16(181), 0); assert.equal(u16(183), 0); assert.equal(u16(185), 2); assert.equal(u16(187), 2);
  assert.equal(u32(189), 102); assert.equal(u32(193), 75); assert.equal(u16(197), 0); assert.equal(bytes.length, 199);
  assert.deepEqual(payload, snapshot);
});
test('BR33: arithmetic uint32 preflight at exact limit and overflow, without allocation', () => {
  assert.equal(uint32(0xffffffff), 0xffffffff);
  for (const value of [0x100000000, -1, NaN, 1.1]) assert.throws(() => uint32(value), { code: 'ZIP_BOUNDS' });
  assert.deepEqual(preflightZipLayout([{ size: UINT32_MAX - 100, nameBytes: 1 }]), { locals: [0], centralOffset: UINT32_MAX - 69, centralSize: 47, archiveSize: UINT32_MAX });
  assert.throws(() => preflightZipLayout([{ size: UINT32_MAX - 99, nameBytes: 1 }]), { code: 'ZIP_BOUNDS' });
  assert.throws(() => preflightZipLayout([{ size: UINT32_MAX, nameBytes: 1 }]), { code: 'ZIP_BOUNDS' });
  for (const records of [[], [{ size: 0, nameBytes: 181 }], [{ size: 0, nameBytes: 0 }]]) assert.throws(() => preflightZipLayout(records), { code: 'ZIP_INPUT' });
});
test('bounded reads copy chunks no larger than 256 KiB and keep STORE order', async () => {
  const bytes = new Uint8Array(MAX_CHUNK_BYTES * 2 + 1); bytes[bytes.length - 1] = 255;
  let lengths = []; let ticks = 0;
  const zip = await buildStoreZip([entry('large.bin', bytes)], {
    yieldTask: async () => { ticks++; },
    createBlob(parts) { lengths = parts.map(part => part.byteLength); return new Blob(parts, { type: 'application/zip' }); },
  });
  assert.equal(ticks, 3); assert.equal(Math.max(...lengths), 262144); assert.equal(zip.size, 524405);
});
test('writer refuses unplanned/duplicate names and verifies byte length before any download', async () => {
  for (const name of ['../bad', 'CON.txt', 'e\u0301.txt']) await assert.rejects(buildStoreZip([entry(name, new Uint8Array())], fast));
  await assert.rejects(buildStoreZip([entry('ss', new Uint8Array()), entry('ß', new Uint8Array())], fast), { code: 'COLLISION' });
  const short = { ...entry('x', new Uint8Array([1])), size: 2 };
  const long = { ...entry('x', new Uint8Array([1, 2])), size: 1 };
  for (const input of [short, long]) await assert.rejects(buildStoreZip([input], fast), { code: 'READ_SIZE' });
});
