// Validation and formatting tests. Expectations are derived from SPEC
// section 2/4 bounds and section 3 error categories (empty, non-numeric,
// out of bounds, more than two decimal places, non-whole counts/coats),
// plus the half-up display rule of section 4.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { frac, formatHalfUp2 } from '../public/js/core/fractions.mjs';
import {
  parseDecimal,
  validateDecimalField,
  validateWholeField,
  validateCanSize,
} from '../public/js/core/paint-core.mjs';

test('parseDecimal accepts plain decimals and trims whitespace', () => {
  assert.deepEqual(parseDecimal('4'), { ok: true, hundredths: 400n });
  assert.deepEqual(parseDecimal('4.5'), { ok: true, hundredths: 450n });
  assert.deepEqual(parseDecimal('4.50'), { ok: true, hundredths: 450n });
  assert.deepEqual(parseDecimal(' 2.8 '), { ok: true, hundredths: 280n });
  assert.deepEqual(parseDecimal('0'), { ok: true, hundredths: 0n });
});

test('parseDecimal refuses empty, non-numeric and >2dp input', () => {
  assert.equal(parseDecimal('').code, 'empty');
  assert.equal(parseDecimal('   ').code, 'empty');
  assert.equal(parseDecimal('abc').code, 'not-a-number');
  assert.equal(parseDecimal('1e3').code, 'not-a-number'); // no exponent guessing
  assert.equal(parseDecimal('4,5').code, 'not-a-number'); // no locale guessing
  assert.equal(parseDecimal('4.').code, 'not-a-number');
  assert.equal(parseDecimal('.5').code, 'not-a-number');
  assert.equal(parseDecimal('2.805').code, 'too-many-decimals');
});

test('dimension bounds: exact limits accepted, just outside refused', () => {
  for (const name of ['length', 'width']) {
    assert.equal(validateDecimalField(name, '0.1').ok, true, `${name} min`);
    assert.equal(validateDecimalField(name, '100').ok, true, `${name} max`);
    assert.equal(validateDecimalField(name, '0.09').code, 'out-of-range');
    assert.equal(validateDecimalField(name, '100.01').code, 'out-of-range');
    assert.equal(validateDecimalField(name, '-1').code, 'out-of-range');
    assert.equal(validateDecimalField(name, '0').code, 'out-of-range');
  }
  assert.equal(validateDecimalField('height', '0.1').ok, true);
  assert.equal(validateDecimalField('height', '10').ok, true);
  assert.equal(validateDecimalField('height', '10.01').code, 'out-of-range');
});

test('custom openings and coverage bounds', () => {
  assert.equal(validateDecimalField('customOpenings', '0').ok, true);
  assert.equal(validateDecimalField('customOpenings', '1000').ok, true);
  assert.equal(validateDecimalField('customOpenings', '1000.01').code, 'out-of-range');
  assert.equal(validateDecimalField('customOpenings', '-0.01').code, 'out-of-range');
  assert.equal(validateDecimalField('coverage', '1').ok, true);
  assert.equal(validateDecimalField('coverage', '30').ok, true);
  assert.equal(validateDecimalField('coverage', '0.99').code, 'out-of-range');
  assert.equal(validateDecimalField('coverage', '30.01').code, 'out-of-range');
});

test('counts: 0 and 20 accepted, 21 and non-whole refused', () => {
  for (const name of ['doors', 'windows']) {
    assert.deepEqual(validateWholeField(name, '0'), { ok: true, value: 0 });
    assert.deepEqual(validateWholeField(name, '20'), { ok: true, value: 20 });
    assert.equal(validateWholeField(name, '21').code, 'out-of-range');
    assert.equal(validateWholeField(name, '-1').code, 'out-of-range');
    assert.equal(validateWholeField(name, '1.5').code, 'not-whole');
    assert.equal(validateWholeField(name, '').code, 'empty');
    assert.equal(validateWholeField(name, 'x').code, 'not-a-number');
  }
});

test('coats: 1 and 4 accepted, 0 and 5 refused, non-whole refused', () => {
  assert.deepEqual(validateWholeField('coats', '1'), { ok: true, value: 1 });
  assert.deepEqual(validateWholeField('coats', '4'), { ok: true, value: 4 });
  assert.equal(validateWholeField('coats', '0').code, 'out-of-range');
  assert.equal(validateWholeField('coats', '5').code, 'out-of-range');
  assert.equal(validateWholeField('coats', '2.5').code, 'not-whole');
});

test('can size: only the closed list 0.5 / 1 / 2.5 / 5 / 10 L', () => {
  for (const s of ['0.5', '1', '2.5', '5', '10']) {
    assert.equal(validateCanSize(s).ok, true, `can size ${s}`);
  }
  assert.equal(validateCanSize('3').code, 'out-of-range');
  assert.equal(validateCanSize('0.25').code, 'out-of-range');
  assert.equal(validateCanSize('').code, 'empty');
});

test('display rounding is half-up to 2 dp on exact values', () => {
  assert.equal(formatHalfUp2(frac(1018, 1000)), '1.02'); // 1.018
  assert.equal(formatHalfUp2(frac(201, 200)), '1.01'); // 1.005 exactly -> up
  assert.equal(formatHalfUp2(frac(107, 40)), '2.68'); // 2.675 exactly -> up
  assert.equal(formatHalfUp2(frac(1, 8)), '0.13'); // 0.125 -> up
  assert.equal(formatHalfUp2(frac(1004, 1000)), '1.00'); // 1.004 -> down
  assert.equal(formatHalfUp2(frac(0)), '0.00');
  assert.equal(formatHalfUp2(frac(5, 2)), '2.50');
  assert.equal(formatHalfUp2(frac(5040, 100)), '50.40');
});
