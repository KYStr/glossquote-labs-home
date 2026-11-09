import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectImageHeader, validateFileSizes, preflightSelection } from '../public/js/core/image-preflight.mjs';
import { ImageInputError } from '../public/js/core/errors.mjs';
import { makePng, makeJpeg, asymmetricJpeg, tiff, chunk, join, segment, fakeFile } from './fixtures/images.mjs';

const code = (value) => (error) => error instanceof ImageInputError && error.code === value;
const sized = (bytes) => ({ name: 'synthetic.png', size: bytes, arrayBuffer() { throw new Error('must not read'); } });

test('A01: count 30 passes; 31 fails before reading', async () => {
  assert.deepEqual(validateFileSizes(Array.from({ length: 30 }, () => sized(1))), { count: 30, bytes: 30 });
  await assert.rejects(preflightSelection(Array.from({ length: 31 }, () => sized(1))), code('TOO_MANY_FILES'));
  assert.throws(() => validateFileSizes([]), code('IMAGE_HEADER_INVALID'));
});
test('A02/A03: exact byte gates use metadata without allocating large media', async () => {
  assert.equal(validateFileSizes([sized(8_388_608)]).bytes, 8_388_608);
  await assert.rejects(preflightSelection([sized(8_388_609)]), code('FILE_TOO_LARGE'));
  const exact = Array.from({ length: 8 }, () => sized(8_388_608));
  assert.equal(validateFileSizes(exact).bytes, 67_108_864);
  await assert.rejects(preflightSelection([...exact, sized(1)]), code('TOTAL_TOO_LARGE'));
  for (const bytes of [0, -1, NaN, 1.5]) assert.throws(() => validateFileSizes([sized(bytes)]), code('IMAGE_HEADER_INVALID'));
});
test('A04/A05: independent PNG/JPEG dimensions and absent EXIF defaults', () => {
  for (const [bytes, format] of [[makePng({ width: 300, height: 200 }), 'png'], [makeJpeg(), 'jpeg']]) {
    assert.deepEqual(inspectImageHeader(bytes), { format, rawWidth: 300, rawHeight: 200, orientation: 1, animated: false, visualWidth: 300, visualHeight: 200 });
  }
});
test('A06: spoofed name/MIME never override bytes; malformed selection is atomic', async () => {
  const valid = fakeFile('actually-jpeg.png', makeJpeg(), 'image/png');
  assert.equal((await preflightSelection([valid]))[0].metadata.format, 'jpeg');
  const spoof = fakeFile('looks-like.png', Buffer.from('<svg onload="x"/>'), 'image/png');
  const later = fakeFile('not-read.png');
  await assert.rejects(preflightSelection([valid, spoof, later]), (error) => error.code === 'UNSUPPORTED_FORMAT' && error.details.index === 1);
  assert.equal(later.reads, 0); assert.equal(spoof.reads, 1);
  await assert.rejects(preflightSelection([{ ...fakeFile('size.png'), size: 1 }]), code('IMAGE_HEADER_INVALID'));
});
test('A07: APNG chunks and GIF/SVG/unknown rejected', () => {
  for (const name of ['acTL', 'fcTL', 'fdAT']) assert.throws(() => inspectImageHeader(makePng({ extra: [chunk(name, Buffer.alloc(8))] })), code('ANIMATED_PNG'));
  for (const bytes of [Buffer.from('GIF89a'), Buffer.from('<svg/>'), Buffer.from([1, 2, 3]), Buffer.alloc(0)]) assert.throws(() => inspectImageHeader(bytes), code('UNSUPPORTED_FORMAT'));
});
test('A08: 16 MP and 8192 edge boundaries, zero and one over', () => {
  assert.equal(inspectImageHeader(makePng({ width: 4000, height: 4000, headerOnly: true })).rawWidth, 4000);
  assert.throws(() => inspectImageHeader(makePng({ width: 4001, height: 4000, headerOnly: true })), code('PIXEL_LIMIT'));
  assert.equal(inspectImageHeader(makeJpeg({ width: 8192, height: 1 })).rawWidth, 8192);
  assert.throws(() => inspectImageHeader(makeJpeg({ width: 8193, height: 1 })), code('EDGE_LIMIT'));
  assert.throws(() => inspectImageHeader(makePng({ width: 0, height: 1, headerOnly: true })), code('IMAGE_HEADER_INVALID'));
});
test('A09: all EXIF 1–8, both byte orders, PNG/JPEG and consistent duplicate', () => {
  for (let orientation = 1; orientation <= 8; orientation++) for (const little of [true, false]) {
    const e = tiff([orientation], { little });
    for (const bytes of [makeJpeg({ width: 4000, height: 3000, exifs: [e] }), makePng({ width: 4000, height: 3000, exif: e, headerOnly: true })]) {
      const m = inspectImageHeader(bytes);
      assert.equal(m.orientation, orientation);
      assert.equal(m.visualWidth, orientation >= 5 ? 3000 : 4000);
      assert.equal(m.visualHeight, orientation >= 5 ? 4000 : 3000);
    }
  }
  assert.equal(inspectImageHeader(makeJpeg({ exifs: [tiff([6, 6]), tiff([6])] })).orientation, 6);
  assert.equal(inspectImageHeader(makePng({ afterData: [chunk('eXIf', tiff([8]))] })).orientation, 8);
  assert.equal(inspectImageHeader(makeJpeg({ exifs: [tiff([])] })).orientation, 1);
});
test('A09 negative: invalid orientation, offsets, shape, contradictory and truncated EXIF', () => {
  const offset = tiff([1]); offset.writeUInt32LE(0xffffffff, 4);
  const type = tiff([1]); type.writeUInt16LE(4, 12);
  const count = tiff([1]); count.writeUInt32LE(2, 14);
  const next = tiff([1]); next.writeUInt32LE(0xffffffff, 22);
  for (const e of [tiff([0]), tiff([9]), tiff([1, 8]), offset, type, count, next, Buffer.from([73, 73]), tiff([1]).subarray(0, 24)]) {
    assert.throws(() => inspectImageHeader(makeJpeg({ exifs: [e] })), code('EXIF_INVALID'));
  }
  assert.throws(() => inspectImageHeader(makeJpeg({ exifs: [tiff([6]), tiff([8])] })), code('EXIF_INVALID'));
  assert.throws(() => inspectImageHeader(makePng({ exif: tiff([1]), extra: [chunk('eXIf', tiff([1]))] })), code('EXIF_INVALID'));
  const malformed = join([255, 216], segment(0xe1, Buffer.from('Exif\0')), makeJpeg().subarray(2));
  assert.throws(() => inspectImageHeader(malformed), code('EXIF_INVALID'));
});
test('bounded PNG structure rejects CRC, chunk overflow, duplicate IHDR, missing IDAT/IEND, unknown critical', () => {
  const base = makePng();
  const badCrc = Buffer.from(base); badCrc[29] ^= 1;
  const overflow = Buffer.from(base); overflow.writeUInt32BE(0xffffffff, 8);
  const duplicate = join(base.subarray(0, 33), base.subarray(8));
  const noData = join(base.subarray(0, 33), chunk('IEND', []));
  const unknown = makePng({ extra: [chunk('ABCD', [])] });
  for (const bytes of [badCrc, overflow, duplicate, noData, unknown, base.subarray(0, -1), join(base, [1])]) assert.throws(() => inspectImageHeader(bytes), code('IMAGE_HEADER_INVALID'));
});
test('bounded JPEG structure rejects duplicate SOF, no EOI/SOS, bad lengths and stray markers', () => {
  const base = makeJpeg();
  const duplicate = join(base.subarray(0, 15), base.subarray(2));
  const length = Buffer.from(base); length.writeUInt16BE(0xffff, 4);
  for (const bytes of [base.subarray(0, -2), base.subarray(0, 15), duplicate, length, join(base, [0]), Buffer.from([255, 216, 255])]) assert.throws(() => inspectImageHeader(bytes), code('IMAGE_HEADER_INVALID'));
});
test('preflight is serial, one read per File, cancellation fences late header reads', async () => {
  const files = [fakeFile('a.png'), fakeFile('b.png'), fakeFile('c.png')];
  const progress = [];
  await preflightSelection(files, { onProgress: (p) => progress.push(p.index) });
  assert.deepEqual(files.map((f) => f.reads), [1, 1, 1]); assert.deepEqual(progress, [1, 2, 3]);
  let resolve;
  const late = { name: 'late.png', size: makePng().length, arrayBuffer: () => new Promise((r) => { resolve = r; }) };
  const abort = new AbortController();
  const task = preflightSelection([late, ...files], { signal: abort.signal });
  abort.abort(); resolve(Uint8Array.from(makePng()).buffer);
  await assert.rejects(task, code('CANCELLED'));
  assert.deepEqual(files.map((f) => f.reads), [1, 1, 1]);
});
test('deterministic truncation/mutation corpus never leaks native offset exceptions', () => {
  for (const original of [makePng(), makeJpeg({ exifs: [tiff([6])] })]) {
    for (let length = 0; length < original.length; length++) {
      assert.throws(() => inspectImageHeader(original.subarray(0, length)), (error) => error instanceof ImageInputError);
    }
    for (let i = 0; i < original.length; i++) {
      const bytes = Buffer.from(original); bytes[i] ^= 0xa5;
      try { inspectImageHeader(bytes); } catch (error) { assert.ok(error instanceof ImageInputError); }
    }
  }
});
test('future asymmetric EXIF fixtures are small and structurally 16×24 / 24×16 ONLY', () => {
  for (let i = 1; i <= 8; i++) {
    const bytes = asymmetricJpeg(i); assert.ok(bytes.length < 1024);
    const m = inspectImageHeader(bytes);
    assert.equal(m.visualWidth, i >= 5 ? 24 : 16); assert.equal(m.visualHeight, i >= 5 ? 16 : 24);
  }
});
