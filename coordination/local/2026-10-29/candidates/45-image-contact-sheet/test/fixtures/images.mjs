import { deflateSync } from 'node:zlib';

export function join(...buffers) { return Buffer.concat(buffers.map((b) => Buffer.from(b))); }
export function u32(value) { const b = Buffer.alloc(4); b.writeUInt32BE(value); return b; }
function checksum(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
export function chunk(name, data) {
  const body = join(Buffer.from(name), data);
  return join(u32(data.length), body, u32(checksum(body)));
}
export function tiff(orientations = [1], { little = true } = {}) {
  const b = Buffer.alloc(8 + 2 + orientations.length * 12 + 4);
  const s16 = (value, offset) => little ? b.writeUInt16LE(value, offset) : b.writeUInt16BE(value, offset);
  const s32 = (value, offset) => little ? b.writeUInt32LE(value, offset) : b.writeUInt32BE(value, offset);
  b[0] = b[1] = little ? 73 : 77; s16(42, 2); s32(8, 4); s16(orientations.length, 8);
  orientations.forEach((value, i) => {
    const offset = 10 + i * 12;
    s16(0x0112, offset); s16(3, offset + 2); s32(1, offset + 4); s16(value, offset + 8);
  });
  return b;
}
export function makePng({ width = 3, height = 2, exif, extra = [], afterData = [], headerOnly = false, rgba } = {}) {
  const ihdr = join(u32(width), u32(height), [8, 6, 0, 0, 0]);
  // Large dimension tests use a one-pixel payload and test structure ONLY, never image decoding.
  const w = headerOnly ? 1 : width, h = headerOnly ? 1 : height;
  const pixels = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const color = rgba?.[y * w + x] ?? [240, 80, 24, 255];
    pixels.set(color, y * (1 + w * 4) + 1 + x * 4);
  }
  return join([137, 80, 78, 71, 13, 10, 26, 10], chunk('IHDR', ihdr),
    ...(exif ? [chunk('eXIf', exif)] : []), ...extra, chunk('IDAT', deflateSync(pixels)), ...afterData, chunk('IEND', Buffer.alloc(0)));
}
export function segment(marker, payload) {
  const length = Buffer.alloc(2); length.writeUInt16BE(payload.length + 2);
  return join([255, marker], length, payload);
}
export function makeJpeg({ width = 300, height = 200, exifs = [] } = {}) {
  const sof = Buffer.from([8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0]);
  // Parser fixture: contains SOF/SOS/EOI but no tables or valid compressed pixels.
  return join([255, 216], ...exifs.map((e) => segment(0xe1, join(Buffer.from('Exif\0\0'), e))),
    segment(0xc0, sof), segment(0xda, [1, 1, 0, 0, 63, 0]), [0x12, 255, 0, 0x34, 255, 217]);
}

// Original synthetic JPEG encoder: six constant 8x8 grayscale blocks, baseline DC-only data.
// These bytes are provided for the deferred browser gate; Node only inspects their structure.
export function asymmetricJpeg(orientation = 1) {
  const quant = join([0], Buffer.alloc(64, 1));
  const sof = [8, 0, 24, 0, 16, 1, 1, 0x11, 0];
  const dcCounts = [0, 0, 0, 12, ...Array(12).fill(0)];
  const acCounts = [1, ...Array(15).fill(0)];
  const tables = join([0], dcCounts, Array.from({ length: 12 }, (_, i) => i), [0x10], acCounts, [0]);
  const bits = [];
  const writeBits = (value, count) => { for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1); };
  let previous = 0;
  for (const value of [32, 220, 96, 160, 64, 192]) {
    const dc = 8 * (value - 128), difference = dc - previous; previous = dc;
    const size = difference === 0 ? 0 : Math.floor(Math.log2(Math.abs(difference))) + 1;
    writeBits(size, 4);
    if (size) writeBits(difference < 0 ? ((1 << size) - 1) + difference : difference, size);
    writeBits(0, 1);
  }
  while (bits.length % 8) bits.push(1);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    const value = bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0);
    data.push(value); if (value === 255) data.push(0);
  }
  return join([255, 216], segment(0xe1, join(Buffer.from('Exif\0\0'), tiff([orientation]))),
    segment(0xdb, quant), segment(0xc0, sof), segment(0xc4, tables), segment(0xda, [1, 1, 0, 0, 63, 0]), data, [255, 217]);
}
export function fakeFile(name, bytes = makePng(), type = 'image/png') {
  const data = new Uint8Array(bytes);
  return { name, type, size: data.byteLength, reads: 0,
    async arrayBuffer() { this.reads++; return data.slice().buffer; } };
}
