// All fixture bytes are synthetic. No user files are read by tests.
export const fakeName = 'synthetic.png';

export function concat(...arrays) {
  const result = new Uint8Array(arrays.reduce((size, array) => size + array.length, 0));
  let offset = 0;
  for (const array of arrays) { result.set(array, offset); offset += array.length; }
  return result;
}
export function be32(number) { return Uint8Array.of(number >>> 24, number >>> 16, number >>> 8, number); }
// Independent, bitwise CRC fixture writer; production uses a lookup table.
export function fixtureCrc(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export const pngSignature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
export function chunk(type, data = new Uint8Array()) {
  const body = concat(Uint8Array.from(type, char => char.charCodeAt(0)), data);
  return concat(be32(data.length), body, be32(fixtureCrc(body)));
}
export function ihdr(width = 24, height = 16, depth = 8, color = 6, tail = [0, 0, 0]) {
  return chunk('IHDR', concat(be32(width), be32(height), Uint8Array.of(depth, color, ...tail)));
}
export function png({ width = 24, height = 16, before = [], after = [], data = Uint8Array.of(0), depth = 8, color = 6 } = {}) {
  return concat(pngSignature, ihdr(width, height, depth, color), ...before, chunk('IDAT', data), ...after, chunk('IEND'));
}
export function segment(marker, data) { const length = data.length + 2; return concat(Uint8Array.of(255, marker, length >>> 8, length), data); }
export function exif({ orientation = 1, little = true, tags = 1, type = 3, count = 1 } = {}) {
  const tiff = new Uint8Array(8 + 2 + 12 * tags + 4);
  const view = new DataView(tiff.buffer);
  tiff[0] = tiff[1] = little ? 0x49 : 0x4d;
  view.setUint16(2, 42, little); view.setUint32(4, 8, little); view.setUint16(8, tags, little);
  for (let index = 0; index < tags; index++) {
    const at = 10 + index * 12;
    view.setUint16(at, 0x0112, little); view.setUint16(at + 2, type, little);
    view.setUint32(at + 4, count, little); view.setUint16(at + 8, orientation, little);
  }
  return segment(0xe1, concat(Uint8Array.of(69, 120, 105, 102, 0, 0), tiff));
}
export function jpeg({ width = 13, height = 7, marker = 0xc0, precision = 8, components = 3, apps = [], sampling = 0x11, includeSos = true } = {}) {
  const specs = [];
  for (let index = 1; index <= components; index++) specs.push(index, sampling, 0);
  const sof = segment(marker, Uint8Array.of(precision, height >>> 8, height, width >>> 8, width, components, ...specs));
  const scans = [];
  for (let index = 1; index <= components; index++) scans.push(index, 0);
  const sos = segment(0xda, Uint8Array.of(components, ...scans, 0, marker === 0xc2 ? 0 : 63, 0));
  return concat(Uint8Array.of(255, 216), ...apps, sof, ...(includeSos ? [sos, Uint8Array.of(0, 255, 0, 255, 217)] : []));
}
