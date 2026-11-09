// Core tests. Expected values are the literal SPEC fixtures, vendored
// verbatim in test/fixtures.json from docs/specs/taiwan-income-tax-calculator/
// fixtures.json at spec candidate commit d92e4046b619363629cd402046431b9b6997edd0
// (spec PR #142; the spec is not yet merged into this branch's base, so the
// expectations are carried here and never derived from the implementation).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { run } from '../public/js/core/core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await readFile(path.join(here, 'fixtures.json'), 'utf8'));

const coreCases = fixtures.cases.filter((entry) => entry.kind === 'core');
assert.equal(coreCases.length, 12);

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepStrictEqual(run(entry.input), entry.expected);
  });
}

const base = {
  grossSalary: '720000',
  filingStatus: 'single',
  selfAge70Plus: false,
  spouseAge70Plus: null,
  dependentsUnder70: '0',
  dependents70Plus: '0',
};

test('upper limits are valid: salary 99,999,999 and 20 dependents each', () => {
  const outcome = run({ ...base, grossSalary: '99999999', dependentsUnder70: '20', dependents70Plus: '20' });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.grossSalary, 99999999);
});

test('nine-digit salary hits INPUT_LIMIT before RANGE', () => {
  assert.deepStrictEqual(
    run({ ...base, grossSalary: '100000000' }),
    { ok: false, error: { code: 'INPUT_LIMIT', field: 'grossSalary', row: null } },
  );
});

test('empty salary is EMPTY, blank dependents are EMPTY', () => {
  assert.deepStrictEqual(
    run({ ...base, grossSalary: '' }),
    { ok: false, error: { code: 'EMPTY', field: 'grossSalary', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, dependents70Plus: '' }),
    { ok: false, error: { code: 'EMPTY', field: 'dependents70Plus', row: null } },
  );
});

test('leading zeros, signs, spaces and full-width digits are INTEGER_FORMAT', () => {
  for (const bad of ['007', '+720000', ' 720000', '720000 ', '７２００００', '1e6', '-5']) {
    assert.deepStrictEqual(
      run({ ...base, grossSalary: bad }),
      { ok: false, error: { code: 'INTEGER_FORMAT', field: 'grossSalary', row: null } },
      `input ${JSON.stringify(bad)}`,
    );
  }
});

test('salary "0" is valid and yields zero tax', () => {
  const outcome = run({ ...base, grossSalary: '0' });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.taxPayable, 0);
  assert.equal(outcome.result.salarySpecialDeduction, 0);
});

test('unknown, missing, wrongly-typed fields and accessors are SCHEMA', () => {
  assert.deepStrictEqual(
    run({ ...base, extra: 'x' }),
    { ok: false, error: { code: 'SCHEMA', field: 'extra', row: null } },
  );
  const missing = { ...base };
  delete missing.dependents70Plus;
  assert.deepStrictEqual(
    run(missing),
    { ok: false, error: { code: 'SCHEMA', field: 'dependents70Plus', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, grossSalary: 720000 }),
    { ok: false, error: { code: 'SCHEMA', field: 'grossSalary', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, selfAge70Plus: 'false' }),
    { ok: false, error: { code: 'SCHEMA', field: 'selfAge70Plus', row: null } },
  );
  const withAccessor = { ...base };
  Object.defineProperty(withAccessor, 'grossSalary', {
    enumerable: true,
    get() { return '720000'; },
  });
  assert.deepStrictEqual(
    run(withAccessor),
    { ok: false, error: { code: 'SCHEMA', field: 'grossSalary', row: null } },
  );
});

test('non-object inputs are SCHEMA with field null', () => {
  for (const bad of [null, undefined, 'x', 42, true, []]) {
    assert.deepStrictEqual(
      run(bad),
      { ok: false, error: { code: 'SCHEMA', field: null, row: null } },
    );
  }
});

test('filing status: non-string is SCHEMA, unknown string is ENUM_VALUE', () => {
  assert.deepStrictEqual(
    run({ ...base, filingStatus: 1 }),
    { ok: false, error: { code: 'SCHEMA', field: 'filingStatus', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, filingStatus: 'head-of-household' }),
    { ok: false, error: { code: 'ENUM_VALUE', field: 'filingStatus', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, filingStatus: '' }),
    { ok: false, error: { code: 'ENUM_VALUE', field: 'filingStatus', row: null } },
  );
});

test('married without a spouse age flag is SCHEMA; married with flag computes', () => {
  assert.deepStrictEqual(
    run({ ...base, filingStatus: 'married', spouseAge70Plus: null }),
    { ok: false, error: { code: 'SCHEMA', field: 'spouseAge70Plus', row: null } },
  );
  const outcome = run({
    ...base,
    grossSalary: '1000000',
    filingStatus: 'married',
    spouseAge70Plus: true,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.exemptionTotal, 97000 + 145500);
  assert.equal(outcome.result.standardDeduction, 262000);
});

test('lone surrogate in filing status is ENUM_VALUE, never a crash', () => {
  assert.deepStrictEqual(
    run({ ...base, filingStatus: '\uD800' }),
    { ok: false, error: { code: 'ENUM_VALUE', field: 'filingStatus', row: null } },
  );
});

test('bracket continuity: exact tax at 590,000 and 590,001 differs by under NT$1', () => {
  const at = run({ ...base, grossSalary: '1036000' }).result;
  const above = run({ ...base, grossSalary: '1036001' }).result;
  assert.equal(at.taxableNet, 590000);
  assert.equal(above.taxableNet, 590001);
  assert.equal(at.taxPayable, 29500);
  assert.equal(above.taxPayable, 29500);
});

test('first error wins in the pinned field order', () => {
  // grossSalary precedes dependents in the table order.
  assert.deepStrictEqual(
    run({ ...base, grossSalary: '1.5', dependentsUnder70: '21' }),
    { ok: false, error: { code: 'INTEGER_FORMAT', field: 'grossSalary', row: null } },
  );
  // dependentsUnder70 precedes dependents70Plus.
  assert.deepStrictEqual(
    run({ ...base, dependentsUnder70: '21', dependents70Plus: '99' }),
    { ok: false, error: { code: 'RANGE', field: 'dependentsUnder70', row: null } },
  );
});
