// Core tests. Every expected value is derived from SPEC section 4 by hand
// (formula applied to the printed constants), never from the implementation.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL, parseWeight, computeRange, createCalculator,
  cupsTenthsFromExact40, roundHalfUpMl, formatMl, formatCupsTenths,
} from '../public/js/core/model.mjs';

// SPEC section 4 fixtures W1-W4, reproduced exactly (ml and cups).
const FIXTURES = [
  // [kgTenths, activity, climate, lowMl, highMl, lowCups, highCups]
  [700, 'sedentary', 'temperate', 2100, 2450, '8.4', '9.8'],   // W1
  [700, 'moderate', 'temperate', 2800, 3150, '11.2', '12.6'],  // W2
  [600, 'light', 'warm', 2365, 2695, '9.5', '10.8'],           // W3
  [800, 'high', 'hot', 4313, 4813, '17.3', '19.3'],            // W4 (half-up)
];
for (const [t, a, c, lo, hi, lc, hc] of FIXTURES) {
  test('fixture ' + t / 10 + 'kg ' + a + ' ' + c, () => {
    const r = computeRange(t, a, c);
    assert.equal(r.lowMl, lo);
    assert.equal(r.highMl, hi);
    assert.equal(formatCupsTenths(r.lowCupsTenths), lc);
    assert.equal(formatCupsTenths(r.highCupsTenths), hc);
  });
}

test('W4 exact values are the .5 cases before rounding', () => {
  const r = computeRange(800, 'high', 'hot');
  assert.equal(r.lowExact40 / 40, 4312.5);
  assert.equal(r.highExact40 / 40, 4812.5);
  assert.equal(roundHalfUpMl(r.lowExact40), 4313);
  assert.equal(roundHalfUpMl(r.highExact40), 4813);
});

// SPEC 7(b): order of operations is (base + activity) x climate.
// W3 serves, plus a constructed case: 50 kg, light, hot.
// Correct: (1500+350) x 1.25 = 2312.5 -> 2313. Wrong order would give
// 1500 x 1.25 + 350 = 2225.
test('order of operations: activity added before climate multiplier', () => {
  const r = computeRange(500, 'light', 'hot');
  assert.equal(r.lowMl, 2313);
  assert.equal(r.highMl, 2625); // (1750+350) x 1.25
  assert.notEqual(r.lowMl, 2225);
});

// SPEC 7(c): cups are computed from the exact values, not the rounded ml.
// W4 low: exact 4312.5 ml -> 17.25 cups -> 17.3 (from exact). Note: under
// this SPEC's pinned constants a displayed-decimal difference between the
// two derivations is mathematically unattainable (the 250 ml cup and the
// 0.5 ml rounding quantum align: 25 ml = exactly 1000 units of 1/40 ml, so
// ml rounding can never cross a tenth-of-a-cup boundary). The sweep below
// proves that invariant over the entire input domain; see VERIFICATION.md
// spec-errata candidate E2. The function-level assertions here pin that the
// implementation derives cups from the exact value.
test('cups derive from exact values (W4 half-up case)', () => {
  assert.equal(cupsTenthsFromExact40(172500), 173); // 4312.5 ml exactly -> 17.3
  assert.equal(cupsTenthsFromExact40(192500), 193); // 4812.5 ml exactly -> 19.3
  const r = computeRange(800, 'high', 'hot');
  assert.equal(r.lowCupsTenths, cupsTenthsFromExact40(r.lowExact40));
  assert.equal(r.highCupsTenths, cupsTenthsFromExact40(r.highExact40));
});

test('sweep: cups-from-exact equals cups-from-rounded across the whole domain (E2 invariant)', () => {
  for (let t = 200; t <= 3000; t += 1) {
    for (const a of MODEL.activityOrder) {
      for (const c of MODEL.climateOrder) {
        const r = computeRange(t, a, c);
        assert.equal(r.lowCupsTenths, cupsTenthsFromExact40(r.lowMl * 40));
        assert.equal(r.highCupsTenths, cupsTenthsFromExact40(r.highMl * 40));
      }
    }
  }
});

// Every activity and climate selection exercised at 70 kg.
// Hand-derived: base 2100-2450; add activity to both ends; then multiply.
const GRID70 = [
  ['sedentary', 'temperate', 2100, 2450], ['sedentary', 'warm', 2310, 2695], ['sedentary', 'hot', 2625, 3063],
  ['light', 'temperate', 2450, 2800], ['light', 'warm', 2695, 3080], ['light', 'hot', 3063, 3500],
  ['moderate', 'temperate', 2800, 3150], ['moderate', 'warm', 3080, 3465], ['moderate', 'hot', 3500, 3938],
  ['high', 'temperate', 3150, 3500], ['high', 'warm', 3465, 3850], ['high', 'hot', 3938, 4375],
];
for (const [a, c, lo, hi] of GRID70) {
  test('70kg grid ' + a + ' ' + c, () => {
    const r = computeRange(700, a, c);
    assert.equal(r.lowMl, lo);
    assert.equal(r.highMl, hi);
  });
}

test('bounds: 20.0 and 300.0 kg accepted', () => {
  assert.deepEqual(parseWeight('20'), { ok: true, kgTenths: 200 });
  assert.deepEqual(parseWeight('20.0'), { ok: true, kgTenths: 200 });
  assert.deepEqual(parseWeight('300'), { ok: true, kgTenths: 3000 });
  assert.deepEqual(parseWeight('300.0'), { ok: true, kgTenths: 3000 });
  const min = computeRange(200, 'sedentary', 'temperate');
  assert.equal(min.lowMl, 600);
  assert.equal(min.highMl, 700);
});

test('SPEC section 4 extreme: 300 kg, high, hot (formula-derived; see errata E1)', () => {
  // (30x300 + 1050) x 1.25 = 12562.5 -> 12,563; (35x300 + 1050) x 1.25 =
  // 14437.5 -> 14,438. The SPEC prints the range as 12,563-14,063; its low
  // end matches the formula, its high end does not (errata candidate E1).
  const r = computeRange(3000, 'high', 'hot');
  assert.equal(r.lowMl, 12563);
  assert.equal(r.highMl, 14438);
});

test('bounds: out-of-range and malformed weights refused with reasons', () => {
  assert.deepEqual(parseWeight('19.9'), { ok: false, reason: 'range' });
  assert.deepEqual(parseWeight('300.1'), { ok: false, reason: 'range' });
  assert.deepEqual(parseWeight('70.05'), { ok: false, reason: 'decimals' });
  assert.deepEqual(parseWeight('70.55'), { ok: false, reason: 'decimals' });
  assert.deepEqual(parseWeight(''), { ok: false, reason: 'empty' });
  assert.deepEqual(parseWeight('   '), { ok: false, reason: 'empty' });
  assert.deepEqual(parseWeight('abc'), { ok: false, reason: 'format' });
  assert.deepEqual(parseWeight('1e3'), { ok: false, reason: 'format' });
  assert.deepEqual(parseWeight('-50'), { ok: false, reason: 'format' });
  assert.deepEqual(parseWeight('70.'), { ok: false, reason: 'format' });
  assert.deepEqual(parseWeight('.5'), { ok: false, reason: 'format' });
  assert.deepEqual(parseWeight(70), { ok: true, kgTenths: 700 });
  assert.deepEqual(parseWeight(70.5), { ok: true, kgTenths: 705 });
  assert.deepEqual(parseWeight(70.05), { ok: false, reason: 'decimals' });
});

test('unknown activity or climate is refused', () => {
  assert.throws(() => computeRange(700, 'extreme', 'temperate'), RangeError);
  assert.throws(() => computeRange(700, 'sedentary', 'freezing'), RangeError);
});

// SPEC 7(e): freeze behaviour of the calculator lifecycle.
test('freeze: invalid weight keeps the last valid range', () => {
  const calc = createCalculator();
  const first = calc.update({ weightRaw: '70', activity: 'sedentary', climate: 'temperate' });
  assert.equal(first.status, 'ok');
  assert.equal(first.result.lowMl, 2100);

  const bad = calc.update({ weightRaw: '15', activity: 'high', climate: 'hot' });
  assert.equal(bad.status, 'error');
  assert.equal(bad.reason, 'range');
  assert.equal(bad.result, first.result); // frozen, unchanged by new selects

  const bad2 = calc.update({ weightRaw: '70.05', activity: 'moderate', climate: 'warm' });
  assert.equal(bad2.status, 'error');
  assert.equal(bad2.reason, 'decimals');
  assert.equal(bad2.result, first.result);

  const fixed = calc.update({ weightRaw: '60', activity: 'light', climate: 'warm' });
  assert.equal(fixed.status, 'ok');
  assert.equal(fixed.result.lowMl, 2365); // W3
  assert.equal(fixed.result.highMl, 2695);
});

test('formatting: grouped ml and one-decimal cups', () => {
  assert.equal(formatMl(2100), '2,100');
  assert.equal(formatMl(12563), '12,563');
  assert.equal(formatMl(700), '700');
  assert.equal(formatCupsTenths(84), '8.4');
  assert.equal(formatCupsTenths(100), '10.0');
  assert.equal(formatCupsTenths(5), '0.5');
});
