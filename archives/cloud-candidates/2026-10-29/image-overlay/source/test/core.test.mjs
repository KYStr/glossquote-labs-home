// 核心測試涵蓋精確像素、邊界與惡意容器，不依賴 Canvas。
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, checkDimensions, inspectImage, checkPair, checkSettings, renderPixels, whiteChannel, crc32 } from '../public/js/core/images.mjs';
import { png, jpeg, chunk, frame } from './helpers.mjs';
const render = (a, b, mode = 'overlay', opacity = 50, current) => renderPixels(a, b, { mode, opacity }, current, async () => {});
test('limits and integer dimensions', () => {
  assert.deepEqual(checkDimensions(2000, 2000), { width: 2000, height: 2000 });
  assert.deepEqual(checkDimensions(4096, 1), { width: 4096, height: 1 });
  for (const shape of [[0, 1], [1.5, 2], [NaN, 1], [Infinity, 1]]) assert.throws(() => checkDimensions(...shape), /CORRUPT/);
  for (const shape of [[4097, 1], [2001, 2000]]) assert.throws(() => checkDimensions(...shape), /DIMENSIONS/);
});
test('valid PNG signature, dimensions, CRC', () => {
  assert.deepEqual(inspectImage(png()), { width: 2, height: 1, mime: 'image/png' });
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});
test('PNG corruption, truncation, extra trailing data', () => {
  const damaged = png(); damaged[20] ^= 1;
  for (const bytes of [damaged, png().slice(0, -2), new Uint8Array([...png(), 1]), new Uint8Array([137])]) assert.throws(() => inspectImage(bytes), /CORRUPT/);
});
test('PNG animation and unknown critical chunks rejected', () => {
  for (const type of ['acTL', 'fcTL', 'fdAT', 'ABCD']) assert.throws(() => inspectImage(png(2, 1, [chunk(type)])), /FORMAT/);
});
test('huge PNG refused before decoder', () => {
  for (const shape of [[4097, 1], [2001, 2000]]) assert.throws(() => inspectImage(png(...shape)), /DIMENSIONS/);
});
test('JPEG baseline and progressive headers', () => {
  for (const marker of [192, 194]) assert.deepEqual(inspectImage(jpeg(320, 240, marker)), { width: 320, height: 240, mime: 'image/jpeg' });
});
test('JPEG unsupported SOF and corrupt lengths', () => {
  assert.throws(() => inspectImage(jpeg(2, 1, 193)), /FORMAT/);
  assert.throws(() => inspectImage(jpeg().slice(0, -2)), /CORRUPT/);
  const bytes = jpeg(); bytes[4] = 255; assert.throws(() => inspectImage(bytes), /CORRUPT/);
  assert.throws(() => inspectImage(jpeg(4097, 1)), /DIMENSIONS/);
});
test('empty, oversized and unrelated formats', () => {
  assert.throws(() => inspectImage(new Uint8Array()), /EMPTY/);
  assert.throws(() => inspectImage(new Uint8Array(LIMITS.bytes + 1)), /FILE_SIZE/);
  for (const value of ['<svg/>', 'GIF89a', 'RIFF WEBP']) assert.throws(() => inspectImage(new TextEncoder().encode(value)), /FORMAT/);
});
test('pair uses both oriented dimensions, never area alone', () => {
  assert.throws(() => checkPair(frame(), null), /NEED_TWO/);
  assert.throws(() => checkPair(frame(2, 1), frame(1, 2)), /MISMATCH/);
});
test('settings reject float, string, invalid mode and nonfinite values', () => {
  for (const opacity of [-1, 101, 0.5, '50', NaN, Infinity]) assert.throws(() => checkSettings({ mode: 'overlay', opacity }), /SETTINGS/);
  assert.throws(() => checkSettings({ mode: '<img>', opacity: 50 }), /SETTINGS/);
});
test('overlay endpoints and exact half-up interpolation', async () => {
  const a = frame(1, 1, [0, 10, 100, 255]), b = frame(1, 1, [1, 21, 200, 255]);
  assert.deepEqual([...(await render(a, b, 'overlay', 0)).data], [0, 10, 100, 255]);
  assert.deepEqual([...(await render(a, b, 'overlay', 100)).data], [1, 21, 200, 255]);
  assert.deepEqual([...(await render(a, b)).data], [1, 16, 150, 255]);
});
test('absolute difference is channelwise, symmetric and opaque', async () => {
  const a = frame(1, 1, [0, 50, 230, 255]), b = frame(1, 1, [200, 20, 100, 255]);
  assert.deepEqual([...(await render(a, b, 'difference')).data], [200, 30, 130, 255]);
  assert.deepEqual((await render(a, b, 'difference')).data, (await render(b, a, 'difference')).data);
  assert.deepEqual([...(await render(a, a, 'difference')).data], [0, 0, 0, 255]);
});
test('white compositing removes hidden transparent RGB', async () => {
  assert.equal(whiteChannel(0, 128), 127);
  const a = frame(1, 1, [0, 120, 80, 0]), b = frame(1, 1, [255, 255, 255, 255]);
  assert.deepEqual([...(await render(a, b)).data], [255, 255, 255, 255]);
  assert.deepEqual([...(await render(a, b, 'difference')).data], [0, 0, 0, 255]);
});
test('malformed pixel buffer rejected', async () => {
  await assert.rejects(render({ width: 1, height: 1, data: new Uint8Array(4) }, frame(1, 1)), /CORRUPT/);
});
test('render observes cancellation before allocation and after yield', async () => {
  await assert.rejects(render(frame(), frame(), 'overlay', 50, () => false), /CANCELLED/);
  let alive = true;
  await assert.rejects(renderPixels(frame(), frame(), { mode: 'overlay', opacity: 50 }, () => alive, async () => { alive = false; }), /CANCELLED/);
});
test('JPEG preflight scans after SOS and refuses late dimensions or frames', () => {
  const base = jpeg();
  const dnl = new Uint8Array([...base.slice(0, -2), 255, 220, 0, 4, 255, 255, 255, 217]);
  const secondFrame = new Uint8Array([...base.slice(0, -2), ...jpeg(3, 1).slice(2)]);
  assert.throws(() => inspectImage(dnl), /FORMAT/); assert.throws(() => inspectImage(secondFrame), /CORRUPT/);
  const trailingImage = new Uint8Array([...base, ...base]); assert.throws(() => inspectImage(trailingImage), /CORRUPT/);
});
test('JPEG entropy stuffing/restart and additional progressive scan accepted', () => {
  const base = jpeg(2, 1, 194);
  const entropy = new Uint8Array([...base.slice(0, -2), 255, 0, 40, 255, 208, 50, 255, 218, 0, 8, 1, 1, 0, 1, 63, 0, 20, 255, 217]);
  assert.deepEqual(inspectImage(entropy), { width: 2, height: 1, mime: 'image/jpeg' });
});
