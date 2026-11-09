// SPEC 第 4 節尺寸規則：fixtures F1/F2/F3/F5/F7 字面值 + 邊界，全為手算期望。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLengthAttr, parseViewBox, resolveIntrinsic, roundHalfAwayFromZero,
  computeOutputSize, checkOutputCaps, validateDimensionInput, isValidHexColor, outputFileName,
} from '../public/js/core/size.mjs';

test('F1: width+height 屬性 → rule 1, intrinsic 200x100', () => {
  const intrinsic = resolveIntrinsic({ widthAttr: '200', heightAttr: '100', viewBoxAttr: '0 0 200 100' });
  assert.deepEqual(intrinsic, { ok: true, width: 200, height: 100, rule: 1, source: 'attributes' });
  assert.deepEqual(computeOutputSize(intrinsic, 'width', 400), { width: 400, height: 200 });
  assert.deepEqual(computeOutputSize(intrinsic, 'scale', 50), { width: 100, height: 50 });
  assert.deepEqual(computeOutputSize(intrinsic, 'height', 50), { width: 100, height: 50 });
});

test('F2: 只有 viewBox → rule 3, intrinsic 24x24; width 96 → 96x96', () => {
  const intrinsic = resolveIntrinsic({ widthAttr: null, heightAttr: null, viewBoxAttr: '0 0 24 24' });
  assert.deepEqual(intrinsic, { ok: true, width: 24, height: 24, rule: 3, source: 'viewBox' });
  assert.deepEqual(computeOutputSize(intrinsic, 'width', 96), { width: 96, height: 96 });
});

test('F3: width=150 + viewBox 300x150 → rule 2, intrinsic 150x75; scale 200% → 300x150', () => {
  const intrinsic = resolveIntrinsic({ widthAttr: '150', heightAttr: null, viewBoxAttr: '0 0 300 150' });
  assert.deepEqual(intrinsic, { ok: true, width: 150, height: 75, rule: 2, source: 'derived' });
  assert.deepEqual(computeOutputSize(intrinsic, 'scale', 200), { width: 300, height: 150 });
});

test('rule 2 (height only): height=100 + viewBox 300x150 → 200x100', () => {
  const intrinsic = resolveIntrinsic({ widthAttr: null, heightAttr: '100', viewBoxAttr: '0 0 300 150' });
  assert.deepEqual(intrinsic, { ok: true, width: 200, height: 100, rule: 2, source: 'derived' });
});

test('rule 4: 無可用尺寸且無 viewBox → undeterminable', () => {
  assert.deepEqual(resolveIntrinsic({ widthAttr: null, heightAttr: null, viewBoxAttr: null }),
    { ok: false, code: 'undeterminable' });
});

test('單位與百分比屬性視同缺席；px 與純數字有效', () => {
  assert.equal(parseLengthAttr('10mm'), null);
  assert.equal(parseLengthAttr('50%'), null);
  assert.equal(parseLengthAttr('0'), null);
  assert.equal(parseLengthAttr('-5'), null);
  assert.equal(parseLengthAttr('24px'), 24);
  assert.equal(parseLengthAttr('24'), 24);
  assert.equal(parseLengthAttr('2.5'), 2.5);
  // width=10mm 視同缺席 → 落到 viewBox 的 rule 3。
  const intrinsic = resolveIntrinsic({ widthAttr: '10mm', heightAttr: '50%', viewBoxAttr: '0 0 24 24' });
  assert.deepEqual(intrinsic, { ok: true, width: 24, height: 24, rule: 3, source: 'viewBox' });
});

test('退化 viewBox（寬或高 <= 0）視同缺席；逗號分隔可解析', () => {
  assert.equal(parseViewBox('0 0 0 24'), null);
  assert.equal(parseViewBox('0 0 24 -1'), null);
  assert.equal(parseViewBox('0 0 24'), null);
  assert.deepEqual(parseViewBox('0,0,24,24'), { minX: 0, minY: 0, width: 24, height: 24 });
  assert.deepEqual(resolveIntrinsic({ widthAttr: null, heightAttr: null, viewBoxAttr: '0 0 0 24' }),
    { ok: false, code: 'undeterminable' });
});

test('F5: intrinsic 3x2, width 100 → height = round(66.67) = 67', () => {
  assert.deepEqual(computeOutputSize({ width: 3, height: 2 }, 'width', 100), { width: 100, height: 67 });
});

test('四捨五入 half away from zero：x.5 進位、未選維度下限 1', () => {
  assert.equal(roundHalfAwayFromZero(2.5), 3);
  assert.equal(roundHalfAwayFromZero(66.5), 67);
  assert.equal(roundHalfAwayFromZero(66.49), 66);
  // intrinsic 2x1, width 5 → height = round(2.5) = 3。
  assert.deepEqual(computeOutputSize({ width: 2, height: 1 }, 'width', 5), { width: 5, height: 3 });
  // intrinsic 1000x1, width 16 → height = round(0.016) = 0 → 下限 1。
  assert.deepEqual(computeOutputSize({ width: 1000, height: 1 }, 'width', 16), { width: 16, height: 1 });
});

test('F7: 上限邊界 — 恰在上限允許，超過即 over-cap', () => {
  const wide = resolveIntrinsic({ widthAttr: '200', heightAttr: '100', viewBoxAttr: null });
  const scaled = computeOutputSize(wide, 'scale', 1000);
  assert.deepEqual(scaled, { width: 2000, height: 1000 });
  assert.equal(checkOutputCaps(scaled), null); // 2,000,000 px 允許
  const atCap = computeOutputSize(wide, 'width', 8192);
  assert.deepEqual(atCap, { width: 8192, height: 4096 });
  assert.equal(checkOutputCaps(atCap), null); // 33,554,432 px 恰在上限
  const square = resolveIntrinsic({ widthAttr: '100', heightAttr: '100', viewBoxAttr: null });
  const over = computeOutputSize(square, 'width', 8192);
  assert.deepEqual(over, { width: 8192, height: 8192 });
  assert.deepEqual(checkOutputCaps(over), { code: 'output-over-cap', width: 8192, height: 8192 });
});

test('控制值驗證：寬高整數 16–8192；比例 10–1000 最多一位小數', () => {
  assert.deepEqual(validateDimensionInput('16', 'width'), { ok: true, value: 16 });
  assert.deepEqual(validateDimensionInput('8192', 'height'), { ok: true, value: 8192 });
  assert.equal(validateDimensionInput('15', 'width').ok, false);
  assert.equal(validateDimensionInput('8193', 'width').ok, false);
  assert.equal(validateDimensionInput('10.5', 'width').ok, false);
  assert.equal(validateDimensionInput('', 'width').ok, false);
  assert.deepEqual(validateDimensionInput('10', 'scale'), { ok: true, value: 10 });
  assert.deepEqual(validateDimensionInput('1000', 'scale'), { ok: true, value: 1000 });
  assert.deepEqual(validateDimensionInput('33.3', 'scale'), { ok: true, value: 33.3 });
  assert.equal(validateDimensionInput('33.33', 'scale').ok, false);
  assert.equal(validateDimensionInput('9.9', 'scale').ok, false);
  assert.equal(validateDimensionInput('1000.1', 'scale').ok, false);
});

test('背景 hex 與檔名', () => {
  assert.equal(isValidHexColor('#3366CC'), true);
  assert.equal(isValidHexColor('#3366cc'), true);
  assert.equal(isValidHexColor('3366CC'), false);
  assert.equal(isValidHexColor('#12345'), false);
  assert.equal(isValidHexColor('#1234567'), false);
  assert.equal(isValidHexColor('#GGGGGG'), false);
  assert.equal(outputFileName(400, 200), 'svg-converted-400x200.png');
});
