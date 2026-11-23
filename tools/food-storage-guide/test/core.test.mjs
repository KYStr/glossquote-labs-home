// Core tests. Expected values are the literal SPEC fixtures, vendored
// verbatim in test/fixtures.json from the spec candidate
// (spec-food-storage-guide-20261121, spec PR #404; the spec is not yet
// merged into this branch's base, so the expectations are carried here and
// never derived from the implementation).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { cellFor, run } from '../public/js/core/core.mjs';

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
  item: 'ground-beef',
  location: 'fridge',
  opened: false,
  startDate: '2026-11-20',
  todayDate: '2026-11-20',
};

test('status boundary: remaining 2 is use-soon, remaining 3 is fresh', () => {
  const soon = run({ ...base, todayDate: '2026-11-19' });
  assert.equal(soon.ok, true);
  assert.equal(soon.result.remainingDays, 2);
  assert.equal(soon.result.status, 'use-soon');
  const fresh = run({ ...base, todayDate: '2026-11-18' });
  assert.equal(fresh.ok, true);
  assert.equal(fresh.result.remainingDays, 3);
  assert.equal(fresh.result.status, 'fresh');
});

test('package date: missing is PACKAGE_DATE_REQUIRED, bad shape is DATE_FORMAT, unreal is DATE_RANGE', () => {
  const milk = { item: 'milk', location: 'fridge', opened: false, startDate: '2026-11-20', todayDate: '2026-11-21' };
  assert.deepStrictEqual(
    run(milk),
    { ok: false, error: { code: 'PACKAGE_DATE_REQUIRED', field: 'packageDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...milk, packageDate: '11/25/2026' }),
    { ok: false, error: { code: 'DATE_FORMAT', field: 'packageDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...milk, packageDate: '2026-02-30' }),
    { ok: false, error: { code: 'DATE_RANGE', field: 'packageDate', row: null } },
  );
  const past = run({ ...milk, packageDate: '2026-11-20' });
  assert.equal(past.ok, true);
  assert.equal(past.result.remainingDays, -1);
  assert.equal(past.result.status, 'expired');
  assert.equal(past.result.safeUntil, '2026-11-20');
  assert.equal(past.result.bestUntil, '2026-11-20');
  assert.equal(past.result.rangeDays, null);
});

test('packageDate is ignored entirely when the cell is not PKG', () => {
  assert.equal(run({ ...base, location: 'freezer', packageDate: 'not-a-date' }).ok, true);
  assert.equal(run({ ...base, location: 'freezer', packageDate: 42 }).ok, true);
});

test('opened toggle does nothing for items without an opened split', () => {
  const opened = run({ ...base, opened: true });
  const closed = run({ ...base, opened: false });
  assert.equal(opened.ok, true);
  assert.equal(closed.ok, true);
  // The echoed `opened` flag differs by construction; the derived values
  // (range, dates, remaining, status) must be identical.
  assert.deepStrictEqual(opened.result.rangeDays, closed.result.rangeDays);
  assert.equal(opened.result.safeUntil, closed.result.safeUntil);
  assert.equal(opened.result.bestUntil, closed.result.bestUntil);
  assert.equal(opened.result.remainingDays, closed.result.remainingDays);
  assert.equal(opened.result.status, closed.result.status);
  const butter = run({ item: 'butter', location: 'fridge', opened: true, startDate: '2026-11-01', todayDate: '2026-11-01' });
  assert.deepStrictEqual(butter.result.rangeDays, { min: 30, max: 60 });
});

test('opened splits: hot dogs unopened 14 days, bread fridge unopened has no data', () => {
  const unopened = run({ item: 'hot-dogs', location: 'fridge', opened: false, startDate: '2026-11-18', todayDate: '2026-11-21' });
  assert.equal(unopened.ok, true);
  assert.deepStrictEqual(unopened.result.rangeDays, { min: 14, max: 14 });
  assert.equal(unopened.result.safeUntil, '2026-12-02');
  assert.deepStrictEqual(
    run({ item: 'bread', location: 'fridge', opened: false, startDate: '2026-11-01', todayDate: '2026-11-01' }),
    { ok: false, error: { code: 'NOT_APPLICABLE', field: 'location', row: null } },
  );
  const breadOpened = run({ item: 'bread', location: 'fridge', opened: true, startDate: '2026-11-01', todayDate: '2026-11-01' });
  assert.deepStrictEqual(breadOpened.result.rangeDays, { min: 14, max: 21 });
});

test('unopened-only gaps: white rice and ketchup fridge unopened are NOT_APPLICABLE', () => {
  assert.deepStrictEqual(
    run({ item: 'white-rice', location: 'fridge', opened: false, startDate: '2026-11-01', todayDate: '2026-11-01' }),
    { ok: false, error: { code: 'NOT_APPLICABLE', field: 'location', row: null } },
  );
  const riceOpened = run({ item: 'white-rice', location: 'fridge', opened: true, startDate: '2026-11-01', todayDate: '2026-11-01' });
  assert.deepStrictEqual(riceOpened.result.rangeDays, { min: 180, max: 180 });
  assert.deepStrictEqual(
    run({ item: 'ketchup', location: 'fridge', opened: false, startDate: '2026-11-01', todayDate: '2026-11-01' }),
    { ok: false, error: { code: 'NOT_APPLICABLE', field: 'location', row: null } },
  );
  assert.deepStrictEqual(
    run({ item: 'canned-soup', location: 'freezer', opened: false, startDate: '2026-11-01', todayDate: '2026-11-01' }),
    { ok: false, error: { code: 'NOT_APPLICABLE', field: 'location', row: null } },
  );
});

test('startDate year 1999 and 2101 are DATE_RANGE; bad shape is DATE_FORMAT', () => {
  assert.deepStrictEqual(
    run({ ...base, startDate: '1999-12-31' }),
    { ok: false, error: { code: 'DATE_RANGE', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, startDate: '2101-01-01' }),
    { ok: false, error: { code: 'DATE_RANGE', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, startDate: '2026/11/20' }),
    { ok: false, error: { code: 'DATE_FORMAT', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, startDate: '' }),
    { ok: false, error: { code: 'DATE_FORMAT', field: 'startDate', row: null } },
  );
});

test('unknown item is SCHEMA; unknown location is SCHEMA', () => {
  assert.deepStrictEqual(
    run({ ...base, item: 'chocolate' }),
    { ok: false, error: { code: 'SCHEMA', field: 'item', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, location: 'cellar' }),
    { ok: false, error: { code: 'SCHEMA', field: 'location', row: null } },
  );
});

test('over-64-character raw strings are INPUT_LIMIT; lone surrogates are UNICODE', () => {
  assert.deepStrictEqual(
    run({ ...base, item: 'x'.repeat(65) }),
    { ok: false, error: { code: 'INPUT_LIMIT', field: 'item', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, startDate: 'x'.repeat(65) }),
    { ok: false, error: { code: 'INPUT_LIMIT', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, startDate: '2026-11-\uD800' }),
    { ok: false, error: { code: 'UNICODE', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, item: '\uD800' }),
    { ok: false, error: { code: 'UNICODE', field: 'item', row: null } },
  );
});

test('unknown, missing, wrongly-typed fields and accessors are SCHEMA', () => {
  assert.deepStrictEqual(
    run({ ...base, extra: 'x' }),
    { ok: false, error: { code: 'SCHEMA', field: 'extra', row: null } },
  );
  const missing = { ...base };
  delete missing.startDate;
  assert.deepStrictEqual(
    run(missing),
    { ok: false, error: { code: 'SCHEMA', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, opened: 'false' }),
    { ok: false, error: { code: 'SCHEMA', field: 'opened', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, startDate: 20261120 }),
    { ok: false, error: { code: 'SCHEMA', field: 'startDate', row: null } },
  );
  assert.deepStrictEqual(
    run({ ...base, todayDate: null }),
    { ok: false, error: { code: 'SCHEMA', field: 'todayDate', row: null } },
  );
  const withAccessor = { ...base };
  Object.defineProperty(withAccessor, 'startDate', {
    enumerable: true,
    get() { return '2026-11-20'; },
  });
  assert.deepStrictEqual(
    run(withAccessor),
    { ok: false, error: { code: 'SCHEMA', field: 'startDate', row: null } },
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

test('omitted opened defaults to false; omitted todayDate uses the device local date', () => {
  const noOpened = run({ item: 'ground-beef', location: 'fridge', startDate: '2026-11-20', todayDate: '2026-11-20' });
  assert.equal(noOpened.ok, true);
  assert.equal(noOpened.result.opened, false);

  // Independent local-date derivation (not the core's helper): today in
  // the device timezone, start = today, ground beef fridge min 1 day.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + 86400000);
  const tomorrowText = `${tomorrow.getUTCFullYear()}-${pad(tomorrow.getUTCMonth() + 1)}-${pad(tomorrow.getUTCDate())}`;
  const outcome = run({ item: 'ground-beef', location: 'fridge', opened: false, startDate: today });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.safeUntil, tomorrowText);
  assert.equal(outcome.result.remainingDays, 1);
  assert.equal(outcome.result.status, 'use-soon');
});

test('first error wins in the pinned order: bad item beats bad date, bad date beats NR', () => {
  assert.deepStrictEqual(
    run({ ...base, item: 'nope', startDate: '2026-02-30' }),
    { ok: false, error: { code: 'SCHEMA', field: 'item', row: null } },
  );
  assert.deepStrictEqual(
    run({ item: 'eggs-in-shell', location: 'freezer', opened: false, startDate: '2026-02-30', todayDate: '2026-11-10' }),
    { ok: false, error: { code: 'DATE_RANGE', field: 'startDate', row: null } },
  );
});

test('cellFor exposes the table for the UI: PKG, NR, range and no-data', () => {
  assert.equal(cellFor('milk', 'fridge', false), 'PKG');
  assert.equal(cellFor('eggs-in-shell', 'freezer', false), 'NR');
  assert.equal(cellFor('ground-beef', 'pantry', false), null);
  assert.deepStrictEqual(cellFor('ground-beef', 'fridge', false), { min: 1, max: 2 });
  assert.deepStrictEqual(cellFor('hot-dogs', 'fridge', true), { min: 7, max: 7 });
  assert.equal(cellFor('nope', 'fridge', false), undefined);
});
