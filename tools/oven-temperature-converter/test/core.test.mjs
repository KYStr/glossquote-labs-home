// Core tests for the Oven Temperature Converter.
// Every expected value in the fixture loop is the literal from the fixed
// SPEC fixtures (test/fixtures.mjs, vendored verbatim). The extra cases
// below are hand-derived from the SPEC rules (chart rows, midpoints,
// boundaries, validation order) — never from the implementation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run, GAS_CHART } from '../public/js/core/convert.mjs';
import { FIXTURES } from './fixtures.mjs';

const coreCases = FIXTURES.cases.filter((c) => c.kind === 'core');

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test('every chart row as a gas input returns its own paired values', () => {
  for (const row of GAS_CHART) {
    const value = String(row.gasHundredths / 100);
    const outcome = run({ value, unit: 'gas', basis: 'conventional' });
    assert.equal(outcome.ok, true, `gas ${value} must be valid`);
    assert.equal(outcome.result.conventional.celsius, row.celsius);
    assert.equal(outcome.result.conventional.fahrenheit, row.fahrenheit);
    assert.equal(outcome.result.conventional.gasMark, row.gasMark);
    assert.equal(outcome.result.conventional.gasMarkRange, 'in');
    assert.equal(outcome.result.fan.celsius, row.celsius - 20);
  }
});

test('gas spellings "0.50" and "1.0" are numerically equal to chart values', () => {
  assert.deepEqual(
    run({ value: '0.50', unit: 'gas', basis: 'conventional' }),
    run({ value: '0.5', unit: 'gas', basis: 'conventional' }),
  );
  assert.equal(run({ value: '1.0', unit: 'gas', basis: 'conventional' }).result.conventional.gasMark, '1');
  assert.equal(run({ value: '0.25', unit: 'gas', basis: 'conventional' }).result.conventional.gasMark, '¼');
});

// Midpoints between consecutive chart °C rows take the hotter row.
// Hand-derived from the pinned chart: (110+120)/2=115, (120+140)/2=130,
// (140+150)/2=145, (150+170)/2=160, (170+180)/2=175, (180+190)/2=185,
// (190+200)/2=195, (200+220)/2=210, (220+230)/2=225, (230+240)/2=235,
// (240+260)/2=250.
const MIDPOINTS = [
  [115, '½'], [130, '1'], [145, '2'], [160, '3'], [175, '4'], [185, '5'],
  [195, '6'], [210, '7'], [225, '8'], [235, '9'], [250, '10'],
];
for (const [celsius, gasMark] of MIDPOINTS) {
  test(`midpoint ${celsius}°C takes the hotter gas row ${gasMark}`, () => {
    const outcome = run({ value: String(celsius), unit: 'celsius', basis: 'conventional' });
    assert.equal(outcome.result.conventional.gasMark, gasMark);
  });
}

test('gas lookup from a °F input uses the exact converted °C, not the rounded °C', () => {
  // 364.9°F = (364.90 − 32) × 5/9 = 184.944…°C exactly: nearer to 180
  // (Gas 4) than to 190, although the rounded display value is 185,
  // which on its own would tie and take Gas 5.
  const outcome = run({ value: '364.9', unit: 'fahrenheit', basis: 'conventional' });
  assert.equal(outcome.result.conventional.celsius, 185);
  assert.equal(outcome.result.conventional.gasMark, '4');
});

test('range endpoints are accepted; just outside is RANGE', () => {
  assert.equal(run({ value: '-50', unit: 'celsius', basis: 'conventional' }).ok, true);
  assert.equal(run({ value: '350', unit: 'celsius', basis: 'conventional' }).ok, true);
  assert.equal(run({ value: '-58', unit: 'fahrenheit', basis: 'conventional' }).ok, true);
  assert.equal(run({ value: '662', unit: 'fahrenheit', basis: 'conventional' }).ok, true);
  assert.deepEqual(
    run({ value: '-50.01', unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'RANGE', field: 'value', row: null } },
  );
  assert.deepEqual(
    run({ value: '350.01', unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'RANGE', field: 'value', row: null } },
  );
  assert.deepEqual(
    run({ value: '662.01', unit: 'fahrenheit', basis: 'conventional' }),
    { ok: false, error: { code: 'RANGE', field: 'value', row: null } },
  );
});

test('"-0" is treated as 0', () => {
  const outcome = run({ value: '-0', unit: 'celsius', basis: 'conventional' });
  assert.deepEqual(outcome.result.conventional, {
    celsius: 0, fahrenheit: 32, gasMark: null, gasMarkRange: 'below',
  });
  assert.deepEqual(outcome.result.fan, {
    celsius: -20, fahrenheit: -4, gasMark: null, gasMarkRange: 'below',
  });
});

test('fan basis from fahrenheit adds 25 °F back before converting', () => {
  // Input is the fan setting 325 °F: conventional = 350 °F exactly,
  // fan side stays 325 °F = 162.777… °C → 163.
  const outcome = run({ value: '325', unit: 'fahrenheit', basis: 'fan' });
  assert.deepEqual(outcome.result.conventional, {
    celsius: 177, fahrenheit: 350, gasMark: '4', gasMarkRange: 'in',
  });
  assert.deepEqual(outcome.result.fan, {
    celsius: 163, fahrenheit: 325, gasMark: '3', gasMarkRange: 'in',
  });
});

test('validation order and error shapes', () => {
  // SCHEMA: missing field, extra field, wrong type, non-object, accessor.
  assert.deepEqual(run({ unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ value: '180', unit: 'celsius', basis: 'conventional', extra: 'x' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ value: 180, unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run(null),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  const accessor = { unit: 'celsius', basis: 'conventional' };
  Object.defineProperty(accessor, 'value', { enumerable: true, get: () => '180' });
  assert.deepEqual(run(accessor),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });

  // INPUT_LIMIT beats grammar; UNICODE beats grammar.
  assert.deepEqual(run({ value: '123456789', unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'INPUT_LIMIT', field: 'value', row: null } });
  assert.deepEqual(run({ value: '1\uD800', unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'UNICODE', field: 'value', row: null } });

  // EMPTY then DECIMAL_FORMAT.
  assert.deepEqual(run({ value: '', unit: 'celsius', basis: 'conventional' }),
    { ok: false, error: { code: 'EMPTY', field: 'value', row: null } });
  for (const bad of ['1.234', '+5', ' 5', '1e3', '.5', '5.', '00.5', 'abc']) {
    assert.deepEqual(run({ value: bad, unit: 'celsius', basis: 'conventional' }),
      { ok: false, error: { code: 'DECIMAL_FORMAT', field: 'value', row: null } }, bad);
  }

  // ENUM in unit-then-basis order.
  assert.deepEqual(run({ value: '180', unit: 'kelvin', basis: 'conventional' }),
    { ok: false, error: { code: 'ENUM', field: 'unit', row: null } });
  assert.deepEqual(run({ value: '180', unit: 'celsius', basis: 'eco' }),
    { ok: false, error: { code: 'ENUM', field: 'basis', row: null } });

  // FAN_GAS (step 5) precedes GAS_VALUE (step 6).
  assert.deepEqual(run({ value: '3.5', unit: 'gas', basis: 'fan' }),
    { ok: false, error: { code: 'FAN_GAS', field: 'basis', row: null } });
  assert.deepEqual(run({ value: '10.5', unit: 'gas', basis: 'conventional' }),
    { ok: false, error: { code: 'GAS_VALUE', field: 'value', row: null } });
  assert.deepEqual(run({ value: '0', unit: 'gas', basis: 'conventional' }),
    { ok: false, error: { code: 'GAS_VALUE', field: 'value', row: null } });
});
