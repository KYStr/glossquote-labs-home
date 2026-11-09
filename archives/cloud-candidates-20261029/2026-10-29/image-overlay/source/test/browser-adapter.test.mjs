// 注入最小 Canvas/Bitmap 替身，只驗證資源契約，不冒稱真瀏覽器測試。
import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeImage, supported } from '../public/js/browser.mjs';
import { png, frame } from './helpers.mjs';
async function withBrowser(run, { cancel = false, badShape = false, drawError = false, contextMissing = false } = {}) {
  const originals = { document: globalThis.document, createImageBitmap: globalThis.createImageBitmap, ImageData: globalThis.ImageData };
  let closed = 0, decodedBlob, decodeOptions, canvas;
  globalThis.ImageData = class {};
  globalThis.createImageBitmap = async (blob, options) => { decodedBlob = blob; decodeOptions = options; return { width: badShape ? 3 : 2, height: 1, close() { closed++; } }; };
  globalThis.document = { createElement: () => canvas = { width: 0, height: 0, getContext: () => contextMissing ? null : { drawImage() { if (drawError) throw Error('draw failed'); }, getImageData: () => ({ data: frame().data }) } } };
  try { await run({ decode: () => decodeImage(png(), { width: 2, height: 1, mime: 'image/png' }, () => !cancel), inspect: () => ({ closed, decodedBlob, decodeOptions, canvas }) }); }
  finally { for (const [key, value] of Object.entries(originals)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
}
test('adapter closes bitmap and clears canvas after success', async () => withBrowser(async ({ decode, inspect }) => {
  const result = await decode(); assert.equal(result.data.length, 8);
  const state = inspect(); assert.equal(state.closed, 1); assert.equal(state.canvas.width, 1); assert.equal(state.canvas.height, 1);
  assert.equal(state.decodedBlob.type, 'image/png'); assert.equal(state.decodedBlob.size, png().length); assert.deepEqual(state.decodeOptions, { imageOrientation: 'from-image' });
}));
test('cancelled native decode closes bitmap before allocating canvas', async () => withBrowser(async ({ decode, inspect }) => {
  await assert.rejects(decode(), /CANCELLED/); assert.equal(inspect().closed, 1); assert.equal(inspect().canvas, undefined);
}, { cancel: true }));
test('unexpected native dimensions rejected before canvas', async () => withBrowser(async ({ decode, inspect }) => {
  await assert.rejects(decode(), /CORRUPT/); assert.equal(inspect().closed, 1); assert.equal(inspect().canvas, undefined);
}, { badShape: true }));
test('canvas exceptions still release all native resources', async () => withBrowser(async ({ decode, inspect }) => {
  await assert.rejects(decode(), /draw failed/); assert.equal(inspect().closed, 1); assert.equal(inspect().canvas.width, 1);
}, { drawError: true }));
test('missing context fails explicitly and frees bitmap', async () => withBrowser(async ({ decode, inspect }) => {
  await assert.rejects(decode(), /DECODE/); assert.equal(inspect().closed, 1); assert.equal(inspect().canvas.width, 1);
}, { contextMissing: true }));
test('capability probe identifies missing native APIs', () => { assert.equal(supported(), false); });
test('capability probe contains a throwing native Canvas implementation', async () => withBrowser(async () => {
  globalThis.document.createElement = () => { throw Error('Canvas blocked'); };
  assert.equal(supported(), false);
}));
