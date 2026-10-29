import { deflateSync } from 'node:zlib';

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function chunk(type, bytes = []) {
  const body = Buffer.from(bytes), name = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(body.length + 12);
  output.writeUInt32BE(body.length, 0); name.copy(output, 4); body.copy(output, 8);
  output.writeUInt32BE(crc32(output.subarray(4, output.length - 4)), output.length - 4);
  return output;
}
export function pngFixture({ width = 2, height = 1, extra = [], pixels = null } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = pixels ? Buffer.concat(Array.from({ length: height }, (_, row) => Buffer.concat([Buffer.from([0]), Buffer.from(pixels.subarray(row * width * 4, (row + 1) * width * 4))]))) : Buffer.from([0, 0, 0, 0, 255, 255, 255, 255, 255]);
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), ...extra, chunk('IDAT', deflateSync(raw)), chunk('IEND')]));
}
export function tiff(orientation = 1, little = true) {
  const bytes = Buffer.alloc(26), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  bytes[0] = bytes[1] = little ? 73 : 77;
  view.setUint16(2, 42, little); view.setUint32(4, 8, little); view.setUint16(8, 1, little);
  view.setUint16(10, 0x0112, little); view.setUint16(12, 3, little); view.setUint32(14, 1, little); view.setUint16(18, orientation, little);
  return bytes;
}
function segment(marker, body) { return Buffer.concat([Buffer.from([255, marker, (body.length + 2) >>> 8, (body.length + 2) & 255]), Buffer.from(body)]); }
// Deliberately synthetic framing fixture, not proof of native JPEG decoding.
export function jpegFixture({ orientation = 1, width = 20, height = 10, mode = 0xc0, exif = tiff(orientation) } = {}) {
  const app = exif === null ? [] : [segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), exif]))];
  return new Uint8Array(Buffer.concat([Buffer.from([255, 216]), ...app,
    segment(mode, [8, height >>> 8, height & 255, width >>> 8, width & 255, 1, 1, 0x11, 0]),
    segment(0xda, [1, 1, 0, 0, mode === 0xc2 ? 0 : 63, 0]),
    Buffer.from([0x42, 0xff, 0, 0x71, 0xff, 0xd9]) ]));
}
export const rgba = (...values) => new Uint8ClampedArray(values);
