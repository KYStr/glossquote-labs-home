import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectRasterHeader as inspect, validateFileSize, MAX_FILE_BYTES } from '../public/js/core/format-headers.mjs';
import { png, pngSignature, ihdr, chunk, concat, be32, jpeg, exif, segment, fixtureCrc } from './fixtures.mjs';

const code = (bytes, expected) => assert.deepEqual(inspect(bytes), { ok: false, error: { code: expected } });
test('H01/H03 size gate refuses empty and oversized before any reader/decoder', () => {
  let reads = 0, decodes = 0;
  const run = size => {
    const gate = validateFileSize(size);
    if (!gate.ok) return gate.error.code;
    reads++; decodes++;
  };
  assert.equal(run(0), 'FILE_EMPTY'); assert.equal(run(MAX_FILE_BYTES + 1), 'FILE_TOO_LARGE');
  assert.equal(reads, 0); assert.equal(decodes, 0);
  code(new Uint8Array(), 'FILE_EMPTY');
  code(new Uint8Array(MAX_FILE_BYTES + 1), 'FILE_TOO_LARGE');
});
test('H02 exact 8 MiB PNG structure reaches parser and is accepted, without pixel allocation', () => {
  const base = png();
  const bytes = png({ before: [chunk('teSt', new Uint8Array(MAX_FILE_BYTES - base.length - 12))] });
  assert.equal(bytes.length, MAX_FILE_BYTES);
  assert.equal(inspect(bytes).ok, true);
});
test('H04 static PNG dimensions and independent CRC known vector', () => {
  assert.equal(fixtureCrc(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.deepEqual(inspect(png()), { ok: true, format: 'png', width: 24, height: 16, orientation: 1, visualWidth: 24, visualHeight: 16, pixelCount: 384 });
});
test('H05/H06 APNG markers are refused at every traversable position', () => {
  const actl = chunk('acTL', concat(be32(2), be32(0)));
  for (const type of ['acTL', 'fcTL', 'fdAT']) {
    const data = type === 'acTL' ? actl : chunk(type, new Uint8Array(type === 'fcTL' ? 26 : 4));
    code(png({ before: [data] }), 'ANIMATED_PNG');
    code(png({ after: [data] }), 'ANIMATED_PNG');
  }
});
test('H07/H08 bounds and every chunk CRC are checked', () => {
  const bytes = png();
  bytes.set(be32(0x7fffffff), 33); code(bytes, 'HEADER_TRUNCATED');
  for (const at of [29, 42, png().length - 1]) {
    const corrupt = png(); corrupt[at] ^= 1; code(corrupt, 'HEADER_INVALID');
  }
});
test('H09 invalid width, absent end and trailing data fail closed', () => {
  code(png({ width: 0 }), 'HEADER_INVALID');
  code(png().slice(0, -12), 'HEADER_INVALID');
  code(concat(png(), Uint8Array.of(0)), 'HEADER_INVALID');
  code(concat(pngSignature, ihdr(), chunk('IEND')), 'HEADER_INVALID');
  code(concat(pngSignature, ihdr(), chunk('IDAT'), chunk('IEND', Uint8Array.of(0))), 'HEADER_INVALID');
});
test('H10–H14 independent per-edge and product boundaries', () => {
  for (const [width, height, expected] of [[8192, 1953, 15998976], [4000, 4000, 16000000]]) {
    const result = inspect(png({ width, height })); assert.equal(result.ok, true); assert.equal(result.pixelCount, expected);
  }
  code(png({ width: 8193, height: 1 }), 'DIMENSION_LIMIT');
  code(png({ width: 4001, height: 4000 }), 'PIXEL_LIMIT');
  code(png({ width: 8000, height: 2001 }), 'PIXEL_LIMIT');
});
test('PNG critical ordering, legal IHDR combinations and ancillary order', () => {
  code(png({ before: [ihdr()] }), 'HEADER_INVALID');
  code(concat(pngSignature, chunk('tEXt'), ihdr(), chunk('IDAT'), chunk('IEND')), 'HEADER_INVALID');
  code(png({ after: [chunk('tEXt'), chunk('IDAT')] }), 'HEADER_INVALID');
  code(png({ before: [chunk('ABCD')] }), 'HEADER_UNSAFE');
  code(png({ before: [chunk('abcd')] }), 'HEADER_INVALID');
  code(png({ depth: 4, color: 6 }), 'HEADER_INVALID');
  code(png({ color: 3 }), 'HEADER_INVALID');
  assert.equal(inspect(png({ color: 3, before: [chunk('PLTE', Uint8Array.of(255, 0, 0)), chunk('tRNS', Uint8Array.of(128))] })).ok, true);
  code(png({ after: [chunk('gAMA', be32(45455))] }), 'HEADER_INVALID');
  code(png({ before: [chunk('pHYs', new Uint8Array(9)), chunk('pHYs', new Uint8Array(9))] }), 'HEADER_INVALID');
  code(png({ before: [chunk('tRNS', Uint8Array.of(0))] }), 'HEADER_INVALID');
});
test('J01/J02 baseline/progressive JPEG, default EXIF and byte-offset view', () => {
  assert.deepEqual(inspect(jpeg()), { ok: true, format: 'jpeg', width: 13, height: 7, orientation: 1, visualWidth: 13, visualHeight: 7, pixelCount: 91 });
  assert.equal(inspect(jpeg({ marker: 0xc2, apps: [exif()] })).ok, true);
  const wrapped = concat(Uint8Array.of(1, 2, 3), jpeg());
  assert.equal(inspect(wrapped.subarray(3)).ok, true);
});
test('J03–J09 all eight orientation fields and both TIFF byte orders, parser only', () => {
  const expected = [[1, 3, 2], [2, 3, 2], [3, 3, 2], [4, 3, 2], [5, 2, 3], [6, 2, 3], [7, 2, 3], [8, 2, 3]];
  for (const [orientation, visualWidth, visualHeight] of expected) for (const little of [true, false]) {
    assert.deepEqual(inspect(jpeg({ width: 3, height: 2, apps: [exif({ orientation, little })] })), { ok: true, format: 'jpeg', width: 3, height: 2, orientation, visualWidth, visualHeight, pixelCount: 6 });
  }
});
test('J10/J11 EXIF orientation malformed, duplicate, offsets and truncated entries', () => {
  for (const options of [{ orientation: 0 }, { orientation: 9 }, { type: 4 }, { count: 2 }, { tags: 2 }]) code(jpeg({ apps: [exif(options)] }), 'EXIF_INVALID');
  code(jpeg({ apps: [exif(), exif()] }), 'EXIF_INVALID');
  for (const index of [10, 12, 16, 22]) {
    const broken = exif(); broken[index] = 0xff; code(jpeg({ apps: [broken] }), 'EXIF_INVALID');
  }
  const short = exif().slice(0, -4); short[3] -= 4;
  code(jpeg({ apps: [short] }), 'EXIF_INVALID');
  assert.equal(inspect(jpeg({ apps: [exif({ tags: 0 }), segment(0xe1, Uint8Array.of(1, 2))] })).orientation, 1);
});
test('J12 incomplete and ambiguous JPEG markers have fixed failures', () => {
  code(Uint8Array.of(255), 'HEADER_TRUNCATED');
  code(Uint8Array.of(255, 216, 255, 224, 0, 1), 'HEADER_INVALID');
  code(Uint8Array.of(255, 216, 255, 225, 0, 20, 69), 'HEADER_TRUNCATED');
  code(concat(Uint8Array.of(255, 216), segment(0xda, Uint8Array.of(1, 1, 0, 0, 63, 0))), 'HEADER_INVALID');
  code(jpeg({ includeSos: false }), 'HEADER_INVALID');
  code(concat(Uint8Array.of(255, 216, 255, 0), jpeg().subarray(2)), 'HEADER_INVALID');
  code(concat(jpeg({ includeSos: false }), jpeg().subarray(2)), 'HEADER_INVALID');
});
test('J13 JPEG modes and component/sampling restrictions', () => {
  for (const options of [{ precision: 12 }, { marker: 0xc1 }, { marker: 0xc3 }, { components: 4 }]) code(jpeg(options), 'JPEG_MODE_UNSUPPORTED');
  for (const sampling of [0, 0x15, 0x51, 0x44]) code(jpeg({ sampling }), 'HEADER_INVALID');
  assert.equal(inspect(jpeg({ components: 1 })).ok, true);
});
test('JPEG error priority is structure/mode before EXIF, then dimensions', () => {
  code(jpeg({ precision: 12, apps: [exif({ orientation: 9 })] }), 'JPEG_MODE_UNSUPPORTED');
  code(jpeg({ includeSos: false, apps: [exif({ orientation: 9 })] }), 'HEADER_INVALID');
  code(jpeg({ width: 8193, apps: [exif({ orientation: 9 })] }), 'EXIF_INVALID');
});
test('unknown formats, unsafe types and bounded mutation/truncation never throw or leak input', () => {
  for (const input of [null, {}, [], 'CANARY_FAKE_SECRET']) code(input, 'HEADER_UNSAFE');
  for (const text of ['GIF89a', 'RIFFfakeWEBP', '<svg>fake</svg>']) code(new TextEncoder().encode(text), 'UNSUPPORTED_FORMAT');
  for (const source of [png(), jpeg({ apps: [exif()] })]) for (let end = 1; end < source.length; end++) {
    const result = inspect(source.subarray(0, end));
    assert.equal(typeof result.ok, 'boolean');
    if (!result.ok) assert.deepEqual(Object.keys(result.error), ['code']);
  }
});
