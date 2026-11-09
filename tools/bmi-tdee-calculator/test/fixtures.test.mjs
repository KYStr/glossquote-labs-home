// SPEC §4 worked fixtures — every expected value below is copied from the
// SPEC's hand-derived fixture list, not from the implementation's output.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compute,
  formatDecimal,
  heightToImperial,
  kgToLb,
  validateHeightImperial,
  validateWeightImperial,
} from '../public/js/core/bmi.mjs';

test('M1: male, 30 y, 175 cm, 70 kg', () => {
  const r = compute({ sex: 'male', ageYears: 30, heightCm: 175, weightKg: 70 });
  assert.equal(r.bmiText, '22.9');
  assert.equal(r.categoryId, 'normal');
  assert.equal(r.bmr, 1648.75);
  assert.equal(r.bmrText, '1649');
  const tdee = Object.fromEntries(r.tdee.map((row) => [row.id, row.kcalText]));
  assert.deepEqual(tdee, {
    sedentary: '1979', // 1978.5 exactly — rounds half away from zero
    light: '2267',
    moderate: '2556',
    active: '2844',
    athlete: '3133',
  });
});

test('F1: female, 30 y, 175 cm, 70 kg', () => {
  const r = compute({ sex: 'female', ageYears: 30, heightCm: 175, weightKg: 70 });
  assert.equal(r.bmiText, '22.9');
  assert.equal(r.categoryId, 'normal');
  assert.equal(r.bmr, 1482.75);
  assert.equal(r.bmrText, '1483');
  assert.equal(r.tdee.find((row) => row.id === 'moderate').kcalText, '2298');
});

test('boundaries at 200 cm: edges belong to the upper band', () => {
  const cases = [
    [74, '18.5', 'normal'],
    [100, '25.0', 'overweight'],
    [120, '30.0', 'obese-1'],
    [140, '35.0', 'obese-2'],
    [160, '40.0', 'obese-3'],
  ];
  for (const [weightKg, bmiText, categoryId] of cases) {
    const r = compute({ sex: 'male', ageYears: 30, heightCm: 200, weightKg });
    assert.equal(r.bmiText, bmiText, `${weightKg} kg display`);
    assert.equal(r.categoryId, categoryId, `${weightKg} kg category`);
  }
});

test('trap case: 73.9 kg at 200 cm displays 18.5 but is underweight', () => {
  const r = compute({ sex: 'female', ageYears: 30, heightCm: 200, weightKg: 73.9 });
  assert.ok(Math.abs(r.bmi - 18.475) < 1e-9);
  assert.equal(r.bmiText, '18.5');
  assert.equal(r.categoryId, 'underweight'); // judged on the unrounded value
});

test('imperial fixture: male, 30 y, 5 ft 9 in, 154 lb', () => {
  const height = validateHeightImperial('5', '9');
  assert.equal(height.ok, true);
  assert.ok(Math.abs(height.value - 175.26) < 1e-9); // 69 in = 175.26 cm
  const weight = validateWeightImperial('154');
  assert.equal(weight.ok, true);
  assert.ok(Math.abs(weight.value - 69.85322498) < 1e-6); // 154 lb in kg
  const r = compute({ sex: 'male', ageYears: 30, heightCm: height.value, weightKg: weight.value });
  assert.equal(r.bmiText, '22.7');
  assert.equal(r.categoryId, 'normal');
  assert.equal(r.bmrText, '1649'); // 1648.907…
});

test('healthy range at 160 cm: [47.36, 64.0) kg with exclusive upper bound', () => {
  const r = compute({ sex: 'female', ageYears: 30, heightCm: 160, weightKg: 60 });
  assert.ok(Math.abs(r.healthyRangeKg.low - 47.36) < 1e-9);
  assert.ok(Math.abs(r.healthyRangeKg.highExclusive - 64.0) < 1e-9);
  assert.equal(formatDecimal(r.healthyRangeKg.low, 1), '47.4');
  assert.equal(formatDecimal(r.healthyRangeKg.highExclusive, 1), '64.0');
  // Same bounds converted to lb (hand-computed): 47.36 kg = 104.41… lb,
  // 64.0 kg = 141.09… lb.
  assert.equal(formatDecimal(r.healthyRangeLb.low, 1), '104.4');
  assert.equal(formatDecimal(r.healthyRangeLb.highExclusive, 1), '141.1');
});

test('unit toggle round trip: display conversion never mutates the metric store', () => {
  const store = { sex: 'female', ageYears: 30, heightCm: 175, weightKg: 70 };
  const before = compute(store);
  // Metric -> imperial display values (hand-computed): 175 cm = 68.897… in
  // -> 69 in -> 5 ft 9 in; 70 kg = 154.323… lb -> "154.3".
  const imp = heightToImperial(store.heightCm);
  assert.deepEqual({ feet: imp.feet, inches: imp.inches }, { feet: 5, inches: 9 });
  assert.equal(formatDecimal(kgToLb(store.weightKg), 1), '154.3');
  // Toggling back re-derives display from the same unrounded store, so the
  // computed outputs are bit-for-bit the same.
  const after = compute(store);
  assert.deepEqual(after, before);
});

test('under-18 flag follows the entered age', () => {
  assert.equal(compute({ sex: 'female', ageYears: 17, heightCm: 160, weightKg: 50 }).under18, true);
  assert.equal(compute({ sex: 'female', ageYears: 18, heightCm: 160, weightKg: 50 }).under18, false);
});
