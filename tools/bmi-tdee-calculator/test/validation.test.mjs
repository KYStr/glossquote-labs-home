// SPEC §2/§4 validation: range edges accepted, one step beyond refused,
// non-integer age refused, inches >= 12 refused with the fold-into-feet code.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAge,
  validateHeightImperial,
  validateHeightMetric,
  validateWeightImperial,
  validateWeightMetric,
} from '../public/js/core/bmi.mjs';

test('age: edges 10 and 120 accepted; 9 and 121 refused', () => {
  assert.deepEqual(validateAge('10'), { ok: true, value: 10 });
  assert.deepEqual(validateAge('120'), { ok: true, value: 120 });
  assert.equal(validateAge('9').error, 'out-of-range');
  assert.equal(validateAge('121').error, 'out-of-range');
});

test('age: non-integer, non-numeric and empty refused distinctly', () => {
  assert.equal(validateAge('30.5').error, 'not-integer');
  assert.equal(validateAge('abc').error, 'not-a-number');
  assert.equal(validateAge('').error, 'empty');
  assert.equal(validateAge('  ').error, 'empty');
});

test('height metric: edges 50 and 272 cm accepted; just outside refused', () => {
  assert.equal(validateHeightMetric('50').ok, true);
  assert.equal(validateHeightMetric('272').ok, true);
  assert.equal(validateHeightMetric('49.9').error, 'out-of-range');
  assert.equal(validateHeightMetric('272.1').error, 'out-of-range');
  assert.equal(validateHeightMetric('tall').error, 'not-a-number');
});

test('weight metric: edges 10 and 635 kg accepted; just outside refused', () => {
  assert.equal(validateWeightMetric('10').ok, true);
  assert.equal(validateWeightMetric('635').ok, true);
  assert.equal(validateWeightMetric('9.9').error, 'out-of-range');
  assert.equal(validateWeightMetric('635.1').error, 'out-of-range');
});

test('imperial height: inches = 12 refused with fold-into-feet error', () => {
  const r = validateHeightImperial('5', '12');
  assert.equal(r.ok, false);
  assert.equal(r.field, 'inches');
  assert.equal(r.error, 'inches-too-large');
  assert.equal(validateHeightImperial('5', '11').ok, true);
  assert.equal(validateHeightImperial('5', '0').ok, true);
});

test('imperial height: fractional feet refused; total range enforced post-conversion', () => {
  assert.equal(validateHeightImperial('5.5', '6').error, 'not-integer');
  // 9 ft = 274.32 cm, above the 272 cm cap.
  assert.equal(validateHeightImperial('9', '0').error, 'out-of-range');
  // 1 ft 8 in = 50.8 cm, inside range.
  assert.equal(validateHeightImperial('1', '8').ok, true);
  // 1 ft 7 in = 48.26 cm, below the 50 cm floor.
  assert.equal(validateHeightImperial('1', '7').error, 'out-of-range');
});

test('imperial weight: conversion then range (154 lb ok; 10 lb refused as < 10 kg)', () => {
  assert.equal(validateWeightImperial('154').ok, true);
  assert.equal(validateWeightImperial('10').error, 'out-of-range'); // 4.5359237 kg
  assert.equal(validateWeightImperial('22.1').ok, true); // 10.024… kg
});
