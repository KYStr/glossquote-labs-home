// SPEC §4/§7(f): display rounding is half away from zero, while the
// category always uses the unrounded value.
import assert from 'node:assert/strict';
import test from 'node:test';
import { compute, formatDecimal, roundHalfAwayFromZero } from '../public/js/core/bmi.mjs';

test('roundHalfAwayFromZero handles ties in both directions', () => {
  assert.equal(roundHalfAwayFromZero(2.5, 0), 3);
  assert.equal(roundHalfAwayFromZero(-2.5, 0), -3);
  assert.equal(roundHalfAwayFromZero(1978.5, 0), 1979); // M1 sedentary tie
  assert.equal(roundHalfAwayFromZero(18.475, 1), 18.5); // trap-case tie
  assert.equal(roundHalfAwayFromZero(2.4, 0), 2);
  assert.equal(roundHalfAwayFromZero(2.6, 0), 3);
});

test('constructed BMI of x.x5 rounds up in display; category uses unrounded', () => {
  // 91.4 kg at 200 cm: BMI = 22.85 exactly -> displays 22.9, still normal.
  const r = compute({ sex: 'male', ageYears: 30, heightCm: 200, weightKg: 91.4 });
  assert.ok(Math.abs(r.bmi - 22.85) < 1e-9);
  assert.equal(r.bmiText, '22.9');
  assert.equal(r.categoryId, 'normal');
});

test('displayed 25.0 can still be normal (BMI 24.96)', () => {
  // 99.84 kg at 200 cm: BMI = 24.96 -> displays 25.0, category normal.
  const r = compute({ sex: 'female', ageYears: 30, heightCm: 200, weightKg: 99.84 });
  assert.equal(r.bmiText, '25.0');
  assert.equal(r.categoryId, 'normal');
});

test('BMR whole-kcal tie rounds half away from zero', () => {
  // Female, 30 y, 170 cm, 60 kg: 600 + 1062.5 - 150 - 161 = 1351.5 -> 1352.
  const r = compute({ sex: 'female', ageYears: 30, heightCm: 170, weightKg: 60 });
  assert.equal(r.bmr, 1351.5);
  assert.equal(r.bmrText, '1352');
  assert.equal(formatDecimal(1351.5, 0), '1352');
});
