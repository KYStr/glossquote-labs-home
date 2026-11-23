// Core tests for the HbA1c Converter.
// Every expected value in the fixture loop is the literal from the fixed
// SPEC fixtures (test/fixtures.mjs, vendored verbatim). The extra cases
// below are hand-derived from the SPEC rules (endpoint tables, category
// cut points, validation order) — never from the implementation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run } from '../public/js/core/convert.mjs';
import { FIXTURES } from './fixtures.mjs';

const coreCases = FIXTURES.cases.filter((c) => c.kind === 'core');

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test('category cut points use the unrounded value (5.69 / 5.7 / 6.49 / 6.5)', () => {
  assert.equal(run({ value: '5.69', unit: 'a1c-percent' }).result.category, 'normal');
  assert.equal(run({ value: '5.7', unit: 'a1c-percent' }).result.category, 'prediabetes');
  assert.equal(run({ value: '6.49', unit: 'a1c-percent' }).result.category, 'prediabetes');
  assert.equal(run({ value: '6.5', unit: 'a1c-percent' }).result.category, 'diabetes-range');
});

test('per-unit range endpoints are accepted; just outside is RANGE', () => {
  // SPEC inputsOutputs table endpoints.
  for (const input of [
    { value: '3.0', unit: 'a1c-percent' },
    { value: '20.0', unit: 'a1c-percent' },
    { value: '9.29', unit: 'ifcc' },
    { value: '195.08', unit: 'ifcc' },
    { value: '39.40', unit: 'eag-mgdl' },
    { value: '527.30', unit: 'eag-mgdl' },
    { value: '2.19', unit: 'eag-mmoll' },
    { value: '29.29', unit: 'eag-mmoll' },
  ]) {
    assert.equal(run(input).ok, true, `${input.unit} ${input.value} must be valid`);
  }
  for (const input of [
    { value: '2.99', unit: 'a1c-percent' },
    { value: '20.01', unit: 'a1c-percent' },
    { value: '9.28', unit: 'ifcc' },
    { value: '195.09', unit: 'ifcc' },
    { value: '39.39', unit: 'eag-mgdl' },
    { value: '527.31', unit: 'eag-mgdl' },
    { value: '2.18', unit: 'eag-mmoll' },
    { value: '29.30', unit: 'eag-mmoll' },
  ]) {
    assert.deepEqual(
      run(input),
      { ok: false, error: { code: 'RANGE', field: 'value', row: null } },
      `${input.unit} ${input.value} must be RANGE`,
    );
  }
});

test('round trip: an eAG mmol/L input comes back unchanged at 1 decimal', () => {
  // SPEC tests: "以 mmol/L 輸入再輸出 mmol/L 往返不變".
  const outcome = run({ value: '8.5', unit: 'eag-mmoll' });
  assert.equal(outcome.result.eagMmoll, '8.5');
  const outcome2 = run({ value: '2.19', unit: 'eag-mmoll' });
  assert.equal(outcome2.result.eagMmoll, '2.2');
});

test('half-up rounding at the display step: 6.5% eAG is 139.85 -> 140', () => {
  // Hand-derived: 28.7 × 6.5 − 46.7 = 139.85 exactly; half rounds up.
  assert.equal(run({ value: '6.5', unit: 'a1c-percent' }).result.eagMgdl, '140');
});

test('leading zeros are accepted as numbers (SPEC grammar is a digit-count rule)', () => {
  assert.equal(run({ value: '07', unit: 'a1c-percent' }).result.a1cPercent, '7.00');
  assert.equal(run({ value: '07.50', unit: 'a1c-percent' }).result.a1cPercent, '7.50');
});

test('validation order and error shapes', () => {
  // SCHEMA: missing field, extra field, wrong type, non-object, accessor.
  assert.deepEqual(run({ unit: 'a1c-percent' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ value: '7', unit: 'a1c-percent', extra: 'x' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ value: 7, unit: 'a1c-percent' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run(null),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run([7]),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  const accessor = { unit: 'a1c-percent' };
  Object.defineProperty(accessor, 'value', { enumerable: true, get: () => '7' });
  assert.deepEqual(run(accessor),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } });

  // Unit problems are SCHEMA with field "unit" (SPEC step 1).
  assert.deepEqual(run({ value: '7' }),
    { ok: false, error: { code: 'SCHEMA', field: 'unit', row: null } });
  assert.deepEqual(run({ value: '7', unit: 7 }),
    { ok: false, error: { code: 'SCHEMA', field: 'unit', row: null } });
  assert.deepEqual(run({ value: '7', unit: 'percent' }),
    { ok: false, error: { code: 'SCHEMA', field: 'unit', row: null } });

  // INPUT_LIMIT beats grammar.
  assert.deepEqual(run({ value: '123456789', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'INPUT_LIMIT', field: 'value', row: null } });
  // 8 units passes capacity, then the grammar rejects 8 integer digits.
  assert.deepEqual(run({ value: '12345678', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'NUMBER_FORMAT', field: 'value', row: null } });

  // EMPTY then NUMBER_FORMAT.
  assert.deepEqual(run({ value: '', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'EMPTY', field: 'value', row: null } });
  for (const bad of ['1.234', '+5', ' 5', '1e3', '.5', '5.', 'abc', '-5', '7,5']) {
    assert.deepEqual(run({ value: bad, unit: 'a1c-percent' }),
      { ok: false, error: { code: 'NUMBER_FORMAT', field: 'value', row: null } }, bad);
  }
  // '00.5' matches the digit-count grammar (two integer digits) and
  // parses as 0.5, so it reaches the range check, not the grammar check.
  assert.deepEqual(run({ value: '00.5', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'RANGE', field: 'value', row: null } });

  // Hostile strings are inert data: too long, or not the grammar.
  assert.deepEqual(run({ value: '<script>alert(1)</script>', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'INPUT_LIMIT', field: 'value', row: null } });
  assert.deepEqual(run({ value: '7;DROP', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'NUMBER_FORMAT', field: 'value', row: null } });
  // A lone surrogate is not ASCII, so the grammar rejects it.
  assert.deepEqual(run({ value: '1\uD800', unit: 'a1c-percent' }),
    { ok: false, error: { code: 'NUMBER_FORMAT', field: 'value', row: null } });
});
