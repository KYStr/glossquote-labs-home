import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectImage } from '../public/js/core/image-header.mjs';
import { pngFixture, chunk, jpegFixture, tiff } from './fixtures.mjs';

test('PNG signature, CRC, chunks and oriented dimensions', () => {
  assert.deepEqual(inspectImage(pngFixture()),{kind:'png',width:2,height:1,orientation:1});
  assert.deepEqual(inspectImage(pngFixture({width:20,height:10,extra:[chunk('eXIf',tiff(6))]})),{kind:'png',width:20,height:10,orientation:6});
});
test('A07 all JPEG EXIF orientations, endian, SOF0/SOF2, no EXIF', () => {
  for (let orientation=1; orientation<=8; orientation++) for (const little of [true,false]) {
    assert.deepEqual(inspectImage(jpegFixture({orientation,exif:tiff(orientation,little)})),{kind:'jpeg',width:20,height:10,orientation});
  }
  assert.equal(inspectImage(jpegFixture({mode:0xc2})).kind,'jpeg');
  assert.equal(inspectImage(jpegFixture({exif:null})).orientation,1);
});
test('A08 pixel, edge, byte and empty limits reject headers', () => {
  assert.throws(() => inspectImage(pngFixture({width:4096,height:4096})),/PIXEL_LIMIT/);
  assert.throws(() => inspectImage(pngFixture({width:4097})),/DIMENSION_LIMIT/);
  assert.throws(() => inspectImage(new Uint8Array(8_388_609)),/FILE_TOO_LARGE/);
  assert.throws(() => inspectImage(new Uint8Array()),/FILE_EMPTY/);
  assert.throws(() => inspectImage([]),/HEADER_UNSAFE/);
});
test('A09 SVG and mismatched file signatures are unsupported', () => {
  for (const text of ['<svg xmlns="http://www.w3.org/2000/svg"/>','GIF89a','RIFF\0WEBP']) assert.throws(() => inspectImage(new TextEncoder().encode(text)),/UNSUPPORTED_FORMAT/);
});
test('PNG animation, malformed CRC, truncation, trailing bytes and unknown critical chunks rejected', () => {
  assert.throws(() => inspectImage(pngFixture({extra:[chunk('acTL',new Uint8Array(8))]})),/ANIMATED_PNG/);
  const bad = pngFixture(); bad[29] ^= 1;
  assert.throws(() => inspectImage(bad),/HEADER_INVALID/);
  const good=pngFixture();
  assert.throws(() => inspectImage(good.subarray(0,good.length-1)),/HEADER_TRUNCATED/);
  assert.throws(() => inspectImage(new Uint8Array([...good,0])),/HEADER_INVALID/);
  assert.throws(() => inspectImage(pngFixture({extra:[chunk('ABCD')]})),/HEADER_UNSAFE/);
});
test('JPEG truncation after SOS, invalid segment, unsupported frame and trailing payload fail closed', () => {
  const jpeg=jpegFixture();
  assert.throws(() => inspectImage(jpeg.subarray(0,jpeg.length-2)),/HEADER_TRUNCATED/);
  assert.throws(() => inspectImage(new Uint8Array([...jpeg,0])),/HEADER_INVALID/);
  assert.throws(() => inspectImage(jpegFixture({mode:0xc1})),/JPEG_MODE_UNSUPPORTED/);
  assert.throws(() => inspectImage(new Uint8Array([255,216,255,225,0,1])),/HEADER_INVALID/);
  assert.throws(() => inspectImage(new Uint8Array([255,216,255,225,0,255])),/HEADER_TRUNCATED/);
});
test('malformed EXIF orientation, byte order, pointer and cyclic IFD rejected for PNG and JPEG', () => {
  const cycle=tiff(); cycle.writeUInt32LE(8,22);
  const pointer=tiff(); pointer.writeUInt32LE(0xfffffff0,4);
  const order=tiff(); order[0]=0;
  for (const exif of [tiff(0),tiff(9),pointer,cycle,order,Buffer.alloc(4)]) {
    assert.throws(() => inspectImage(jpegFixture({exif})),/EXIF_INVALID/);
    assert.throws(() => inspectImage(pngFixture({extra:[chunk('eXIf',exif)]})),/EXIF_INVALID/);
  }
});
