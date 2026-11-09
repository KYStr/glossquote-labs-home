import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMask, mapPointerRect, validateMaskList } from '../public/js/core/geometry.mjs';
const rect = { left: 0, top: 0, width: 200, height: 100 };
const mask = overrides => ({ id: 'mask-1', x: 2, y: 1, width: 2, height: 1, ...overrides });
test('G01/G02 CSS-to-original mapping with reverse drag and real image offset', () => {
  const expected = { ok: true, rect: { x: 40, y: 20, width: 20, height: 20 } };
  assert.deepEqual(mapPointerRect({ x: 20, y: 10 }, { x: 30, y: 20 }, rect, 400, 200), expected);
  assert.deepEqual(mapPointerRect({ x: 30, y: 20 }, { x: 20, y: 10 }, rect, 400, 200), expected);
  assert.deepEqual(mapPointerRect({ x: 120, y: 60 }, { x: 130, y: 70 }, { ...rect, left: 100, top: 50 }, 400, 200), expected);
});
test('G03/G04 floor, ceil, clamp and nonzero subpixel rectangle', () => {
  const image = { left: 0, top: 0, width: 10, height: 10 };
  assert.deepEqual(mapPointerRect({ x: 1.2, y: 2.7 }, { x: 4.1, y: 5.01 }, image, 10, 10).rect, { x: 1, y: 2, width: 4, height: 4 });
  assert.deepEqual(mapPointerRect({ x: -2.2, y: -1.1 }, { x: 3.2, y: 4.1 }, image, 10, 10).rect, { x: 0, y: 0, width: 4, height: 5 });
  assert.deepEqual(mapPointerRect({ x: 1.1, y: 1.1 }, { x: 1.2, y: 1.2 }, image, 10, 10).rect, { x: 1, y: 1, width: 1, height: 1 });
});
test('G05 raw zero spans remain zero before rounding, off-image rectangles cannot exist', () => {
  for (const [a, b] of [[{ x: 1.2, y: 1.2 }, { x: 1.2, y: 1.2 }], [{ x: 1.2, y: 1 }, { x: 1.2, y: 5 }], [{ x: -20, y: -20 }, { x: -10, y: -10 }]]) {
    assert.equal(mapPointerRect(a, b, rect, 400, 200).error.code, 'MASK_ZERO_AREA');
  }
});
test('G06/G07 exact half-open integer masks and errors do not mutate input', () => {
  assert.deepEqual(normalizeMask(mask(), 4, 3), { ok: true, mask: mask() });
  for (const [overrides, code] of [[{ width: 1.5 }, 'MASK_INVALID'], [{ x: -1 }, 'MASK_OUT_OF_BOUNDS'], [{ x: 3 }, 'MASK_OUT_OF_BOUNDS'], [{ width: 0 }, 'MASK_ZERO_AREA'], [{ y: Infinity }, 'MASK_INVALID']]) {
    const raw = Object.freeze(mask(overrides));
    assert.equal(normalizeMask(raw, 4, 3).error.code, code);
  }
});
test('G08 50 masks accepted, 51 refused; duplicate IDs and sparse/extra arrays refused', () => {
  const masks = Array.from({ length: 50 }, (_, index) => mask({ id: `mask-${index}` }));
  assert.equal(validateMaskList(masks, 4, 3).masks.length, 50);
  assert.equal(validateMaskList([...masks, mask({ id: 'last' })], 4, 3).error.code, 'MASK_LIMIT');
  assert.equal(validateMaskList([mask(), mask()], 4, 3).error.code, 'MASK_INVALID');
  assert.equal(validateMaskList(new Array(1), 4, 3).error.code, 'MASK_INVALID');
  const extra = []; extra.fake = 1;
  assert.equal(validateMaskList(extra, 4, 3).error.code, 'MASK_INVALID');
});
test('schema rejects unknown/accessor/symbol/prototype without reading getter or echoing values', () => {
  let reads = 0;
  const getter = { ...mask() }; Object.defineProperty(getter, 'x', { get() { reads++; return 2; } });
  for (const raw of [getter, mask({ fake: 'CANARY_FAKE_SECRET' }), Object.assign(Object.create({ inherited: true }), mask()), { ...mask(), [Symbol('secret')]: 1 }]) {
    assert.equal(normalizeMask(raw, 4, 3).error.code, 'MASK_INVALID');
    assert.equal(JSON.stringify(normalizeMask(raw, 4, 3)).includes('CANARY_FAKE_SECRET'), false);
  }
  assert.equal(reads, 0);
  assert.equal(mapPointerRect({ x: NaN, y: 0 }, { x: 1, y: 1 }, rect, 4, 3).error.code, 'MASK_INVALID');
});
