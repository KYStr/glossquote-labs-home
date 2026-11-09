// Typed-input field validation: bounds from SPEC sections 2 and 6.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseDistanceField,
  parsePaceField,
  parseTimeField,
} from '../public/js/core/validate.mjs';

test('time field accepts 1 second through 99:59:59', () => {
  assert.deepEqual(parseTimeField('1'), { ok: true, seconds: 1 });
  assert.deepEqual(parseTimeField('99:59:59'), { ok: true, seconds: 359999 });
  assert.deepEqual(parseTimeField('55:00'), { ok: true, seconds: 3300 });
});

test('time field refuses zero and overflow', () => {
  assert.equal(parseTimeField('0').code, 'too-small');
  assert.equal(parseTimeField('0:00').code, 'too-small');
  assert.equal(parseTimeField('100:00:00').code, 'too-large');
});

test('pace field: zero is its own error; bounds 0:30-59:59 per unit', () => {
  assert.equal(parsePaceField('0:00', 'km').code, 'zero');
  assert.equal(parsePaceField('0', 'km').code, 'zero');
  assert.equal(parsePaceField('0:29', 'km').code, 'too-small');
  assert.equal(parsePaceField('60:00', 'km').code, 'too-large');
  assert.equal(parsePaceField('45:90', 'km').code, 'component');
  const low = parsePaceField('0:30', 'km');
  assert.equal(low.ok, true);
  assert.equal(low.secondsPerKm, 30);
  const high = parsePaceField('59:59', 'km');
  assert.equal(high.ok, true);
  assert.equal(high.secondsPerKm, 3599);
});

test('pace field converts per-mile input to seconds per km', () => {
  const parsed = parsePaceField('5:30', 'mi');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.secondsPerUnit, 330);
  // 330 / 1.609344 = 205.0525... s/km, derived from the exact factor.
  assert.ok(Math.abs(parsed.secondsPerKm - 205.0525) < 0.001);
});

test('distance field accepts 0.01 through 300 of the chosen unit', () => {
  assert.deepEqual(parseDistanceField('0.01', 'km'), { ok: true, value: 0.01, km: 0.01 });
  assert.deepEqual(parseDistanceField('300', 'km'), { ok: true, value: 300, km: 300 });
  assert.deepEqual(parseDistanceField('10.5', 'km'), { ok: true, value: 10.5, km: 10.5 });
  assert.deepEqual(parseDistanceField('21.0975', 'km'), {
    ok: true,
    value: 21.0975,
    km: 21.0975,
  });
});

test('distance field refuses zero, above 300, and non-decimals', () => {
  assert.equal(parseDistanceField('0', 'km').code, 'too-small');
  assert.equal(parseDistanceField('0.001', 'km').code, 'too-small');
  assert.equal(parseDistanceField('300.01', 'km').code, 'too-large');
  assert.equal(parseDistanceField('-5', 'km').code, 'malformed');
  assert.equal(parseDistanceField('abc', 'km').code, 'malformed');
  assert.equal(parseDistanceField('1e3', 'km').code, 'malformed');
  assert.equal(parseDistanceField('10.', 'km').code, 'malformed');
  assert.equal(parseDistanceField('', 'km').code, 'empty');
});

test('distance field converts miles with the exact factor', () => {
  const parsed = parseDistanceField('10', 'mi');
  assert.equal(parsed.ok, true);
  assert.ok(Math.abs(parsed.km - 16.09344) < 1e-9);
});
