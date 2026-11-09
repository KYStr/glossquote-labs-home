import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadingPlan, validateReadingPlanInput } from '../public/js/core/reading-plan.mjs';
import { input, onePage, P5_ROWS } from './helpers/fixtures.mjs';
const make = (changes) => createReadingPlan(input(changes));
function invalid(changes, code, field) { assert.deepEqual(make(changes), { kind: 'invalid', primaryCode: code, errors: [{ code, field }] }); }
test('C01 P5 all summary and schedule fields', () => assert.deepEqual(make(), { kind: 'plan', title: '', status: 'scheduled', summary: { totalPages: 100, completedPages: 40, remainingPages: 60, selectedStartDate: '2026-10-19', selectedEndDate: '2026-10-23', eligibleDayCount: 5, minimumPagesPerReadingDay: 12, readingDays: 5, flexibleDays: 0, lastReadingDate: '2026-10-23' }, schedule: P5_ROWS }));
test('C02 fewer pages than dates preserves null flex rows', () => {
  const p = make({ totalPagesRaw: '43' });
  assert.equal(p.summary.remainingPages, 3); assert.equal(p.summary.readingDays, 3); assert.equal(p.summary.flexibleDays, 2); assert.equal(p.summary.lastReadingDate, '2026-10-21'); assert.equal(p.summary.minimumPagesPerReadingDay, 1);
  assert.deepEqual(p.schedule, [
    { date: '2026-10-19', isoWeekday: 1, pagesPerDay: 1, pageStart: 41, pageEnd: 41, kind: 'reading' },
    { date: '2026-10-20', isoWeekday: 2, pagesPerDay: 1, pageStart: 42, pageEnd: 42, kind: 'reading' },
    { date: '2026-10-21', isoWeekday: 3, pagesPerDay: 1, pageStart: 43, pageEnd: 43, kind: 'reading' },
    { date: '2026-10-22', isoWeekday: 4, pagesPerDay: 0, pageStart: null, pageEnd: null, kind: 'flex' },
    { date: '2026-10-23', isoWeekday: 5, pagesPerDay: 0, pageStart: null, pageEnd: null, kind: 'flex' }
  ]);
});
test('C03 remainder goes to earlier dates', () => {
  const p = make({ totalPagesRaw: '51', endDateRaw: '2026-10-21', weekdays: [1, 2, 3] });
  assert.equal(p.summary.remainingPages, 11); assert.equal(p.summary.minimumPagesPerReadingDay, 4);
  assert.deepEqual(p.schedule, [
    { date: '2026-10-19', isoWeekday: 1, pagesPerDay: 4, pageStart: 41, pageEnd: 44, kind: 'reading' },
    { date: '2026-10-20', isoWeekday: 2, pagesPerDay: 4, pageStart: 45, pageEnd: 48, kind: 'reading' },
    { date: '2026-10-21', isoWeekday: 3, pagesPerDay: 3, pageStart: 49, pageEnd: 51, kind: 'reading' }
  ]);
});
test('C04 infeasible contains capacity only, no title/schedule', () => assert.deepEqual(make({ dailyCapRaw: '10' }), { kind: 'infeasible', summary: { totalPages: 100, completedPages: 40, remainingPages: 60, selectedStartDate: '2026-10-19', selectedEndDate: '2026-10-23', eligibleDayCount: 5, dailyCap: 10, capacityPages: 50, shortfallPages: 10, minimumReadingDays: 6 } }));
test('C05 cap exact capacity is feasible', () => { const p = make({ totalPagesRaw: '90', dailyCapRaw: '10' }); assert.equal(p.kind, 'plan'); assert.deepEqual(p.schedule.map(r => [r.pagesPerDay, r.pageStart, r.pageEnd]), [[10, 41, 50], [10, 51, 60], [10, 61, 70], [10, 71, 80], [10, 81, 90]]); });
test('C06 blank cap imposes no default', () => { const p = make({ completedPagesRaw: '0' }); assert.equal(p.kind, 'plan'); assert.deepEqual(p.schedule.map(r => r.pagesPerDay), [20, 20, 20, 20, 20]); assert.equal(p.schedule.at(-1).pageEnd, 100); });
test('C07 one remaining page and four flex dates', () => { const p = createReadingPlan(onePage()); assert.equal(p.summary.readingDays, 1); assert.equal(p.summary.flexibleDays, 4); assert.deepEqual(p.schedule.map(r => [r.pagesPerDay, r.pageStart, r.pageEnd]), [[1, 1, 1], [0, null, null], [0, null, null], [0, null, null], [0, null, null]]); });
test('C08 inclusive one-day plan', () => { const p = createReadingPlan(onePage({ endDateRaw: '2026-10-19', weekdays: [1] })); assert.equal(p.summary.eligibleDayCount, 1); assert.deepEqual(p.schedule, [{ date: '2026-10-19', isoWeekday: 1, pagesPerDay: 1, pageStart: 1, pageEnd: 1, kind: 'reading' }]); });
test('C09 weekends included when selected', () => { const p = createReadingPlan(onePage({ startDateRaw: '2026-10-24', endDateRaw: '2026-10-25', weekdays: [6, 7] })); assert.equal(p.summary.eligibleDayCount, 2); assert.deepEqual(p.schedule, [{ date: '2026-10-24', isoWeekday: 6, pagesPerDay: 1, pageStart: 1, pageEnd: 1, kind: 'reading' }, { date: '2026-10-25', isoWeekday: 7, pagesPerDay: 0, pageStart: null, pageEnd: null, kind: 'flex' }]); });
test('C10 weekday order never changes output or mutates input', () => { const raw = Object.freeze(input({ weekdays: Object.freeze([5, 4, 3, 2, 1]) })); assert.deepEqual(createReadingPlan(raw), make()); assert.deepEqual(raw.weekdays, [5, 4, 3, 2, 1]); });
test('C11 both boundaries included, no dates outside window', () => { const p = make({ startDateRaw: '2026-10-20', endDateRaw: '2026-10-22' }); assert.deepEqual(p.schedule.map(r => r.date), ['2026-10-20', '2026-10-21', '2026-10-22']); assert.deepEqual(p.schedule.map(r => [r.pageStart, r.pageEnd]), [[41, 60], [61, 80], [81, 100]]); });
test('C12 zero remaining pages has no historical schedule', () => assert.deepEqual(make({ totalPagesRaw: '40' }), { kind: 'plan', title: '', status: 'no-remaining-pages', summary: { totalPages: 40, completedPages: 40, remainingPages: 0, selectedStartDate: '2026-10-19', selectedEndDate: '2026-10-23', eligibleDayCount: 5, minimumPagesPerReadingDay: null, readingDays: 0, flexibleDays: 0, lastReadingDate: null }, schedule: [] }));
test('C13 zero pages succeeds with no available dates', () => { const p = createReadingPlan(onePage({ completedPagesRaw: '1', startDateRaw: '2026-10-24', endDateRaw: '2026-10-24', weekdays: [1], dailyCapRaw: '1' })); assert.equal(p.status, 'no-remaining-pages'); assert.equal(p.summary.eligibleDayCount, 0); assert.deepEqual(p.schedule, []); });
test('C14 positive pages without dates is invalid', () => assert.deepEqual(createReadingPlan(onePage({ startDateRaw: '2026-10-24', endDateRaw: '2026-10-24', weekdays: [1] })), { kind: 'invalid', primaryCode: 'NO_READING_DAYS', errors: [{ code: 'NO_READING_DAYS', field: 'weekdays' }] }));
test('C25 maximum total and zero completed', () => { const p = make({ totalPagesRaw: '10000', completedPagesRaw: '0' }); assert.equal(p.summary.totalPages, 10000); assert.equal(p.summary.completedPages, 0); assert.equal(p.schedule.at(-1).pageEnd, 10000); });
test('C26 invalid total range', () => { for (const totalPagesRaw of ['0', '10001']) invalid({ totalPagesRaw }, 'TOTAL_RANGE', 'totalPagesRaw'); });
test('C27 commas rejected', () => invalid({ totalPagesRaw: '1,000' }, 'TOTAL_FORMAT', 'totalPagesRaw'));
test('C28 non-ASCII digits rejected', () => { for (const totalPagesRaw of ['١٠٠', '１００']) invalid({ totalPagesRaw }, 'TOTAL_FORMAT', 'totalPagesRaw'); });
test('C29 no numeric coercion', () => { for (const raw of ['+3', '-1', '1e2', ' 3 ', '3.0']) for (const [field, prefix] of [['totalPagesRaw', 'TOTAL'], ['completedPagesRaw', 'COMPLETED'], ['dailyCapRaw', 'DAILY_CAP']]) invalid({ [field]: raw }, `${prefix}_FORMAT`, field); });
test('C30 completed cannot exceed total', () => invalid({ totalPagesRaw: '10', completedPagesRaw: '11' }, 'COMPLETED_GT_TOTAL', 'completedPagesRaw'));
test('C31 cap boundaries validate before feasibility', () => { assert.equal(make({ dailyCapRaw: '1' }).kind, 'infeasible'); assert.equal(make({ dailyCapRaw: '10000' }).kind, 'plan'); });
test('C32 cap range', () => { for (const dailyCapRaw of ['0', '10001']) invalid({ dailyCapRaw }, 'DAILY_CAP_RANGE', 'dailyCapRaw'); });
test('C33 normalized title does not modify original string', () => { const raw = input({ titleRaw: '  我的書  ' }); assert.equal(validateReadingPlanInput(raw).normalized.title, '我的書'); assert.equal(make({ titleRaw: raw.titleRaw }).title, '我的書'); assert.equal(raw.titleRaw, '  我的書  '); });
test('C34 valid pairs counted as UTF-16 units', () => { assert.equal(make({ titleRaw: '📖'.repeat(40) }).kind, 'plan'); });
test('C35 trimmed title boundary', () => invalid({ titleRaw: 'x'.repeat(81) }, 'TITLE_TRIMMED_TOO_LONG', 'titleRaw'));
test('C36 raw title boundary', () => invalid({ titleRaw: ' '.repeat(257) }, 'TITLE_TOO_LONG', 'titleRaw'));
test('C37 control code ranges rejected without echo', () => { for (const n of [0, 9, 10, 31, 127, 128, 159]) invalid({ titleRaw: `canary${String.fromCharCode(n)}` }, 'TITLE_CONTROL', 'titleRaw'); });
test('C38 unpaired surrogates rejected', () => { for (const titleRaw of ['\ud800', '\udc00', '\ud800x', 'x\udfff', '\ud800\ud800']) invalid({ titleRaw }, 'TITLE_SURROGATE', 'titleRaw'); assert.equal(make({ titleRaw: '\ud800\udc00' }).kind, 'plan'); });
test('C39 exact keys including nonenumerable and symbols', () => {
  const missing = input(); delete missing.dailyCapRaw;
  const extra = input(); Object.defineProperty(extra, 'hidden', { value: 1 });
  for (const value of [missing, input({ extra: 1 }), Object.assign(input(), { [Symbol('x')]: 1 }), extra]) assert.deepEqual(createReadingPlan(value), { kind: 'invalid', primaryCode: 'SCHEMA_KEYS', errors: [{ code: 'SCHEMA_KEYS', field: 'root' }] });
});
test('C40 root getter never executes', () => { let calls = 0; const value = input(); Object.defineProperty(value, 'titleRaw', { enumerable: true, get() { calls += 1; return 'x'; } }); assert.equal(createReadingPlan(value).primaryCode, 'SCHEMA_ACCESSOR'); assert.equal(calls, 0); });
test('C41 throwing Proxy cannot leak exception', () => { const value = new Proxy(input(), { ownKeys() { throw new Error('CANARY_SECRET'); } }); assert.deepEqual(createReadingPlan(value), { kind: 'invalid', primaryCode: 'SCHEMA_UNINSPECTABLE', errors: [{ code: 'SCHEMA_UNINSPECTABLE', field: 'root' }] }); });
test('C42 weekday structural and semantic rejection', () => {
  const extra = [1]; extra.x = 1;
  for (const [weekdays, code] of [[[], 'EMPTY'], [new Array(1), 'SPARSE'], [[1, 1], 'DUPLICATE'], [[0], 'INVALID'], [[8], 'INVALID'], ['1', 'TYPE'], [extra, 'EXTRA']]) invalid({ weekdays }, `WEEKDAYS_${code}`, 'weekdays');
});
test('C43 deterministic errors and primary code', () => assert.deepEqual(make({ totalPagesRaw: '0', startDateRaw: '2026-2-03' }), { kind: 'invalid', primaryCode: 'TOTAL_RANGE', errors: [{ code: 'TOTAL_RANGE', field: 'totalPagesRaw' }, { code: 'START_DATE_FORMAT', field: 'startDateRaw' }] }));
test('C44 reversed dates do not append window error', () => invalid({ startDateRaw: '2100-12-31', endDateRaw: '1900-01-01' }, 'DATE_ORDER', 'endDateRaw'));
test('C47 wrong primitive types remain field errors', () => { for (const value of [1, null, {}]) for (const [field, prefix] of [['totalPagesRaw', 'TOTAL'], ['completedPagesRaw', 'COMPLETED'], ['startDateRaw', 'START_DATE'], ['endDateRaw', 'END_DATE'], ['dailyCapRaw', 'DAILY_CAP']]) invalid({ [field]: value }, `${prefix}_TYPE`, field); });
test('C48 raw size precedes semantic errors', () => { for (const [field, prefix] of [['totalPagesRaw', 'TOTAL'], ['completedPagesRaw', 'COMPLETED'], ['startDateRaw', 'START_DATE'], ['endDateRaw', 'END_DATE'], ['dailyCapRaw', 'DAILY_CAP']]) invalid({ [field]: '1'.repeat(257) }, `${prefix}_TOO_LONG`, field); });
test('all root shapes, revoked traps and array descriptors fail closed', () => {
  for (const value of [null, undefined, 1, 'x', [], new (class X {})()]) assert.equal(createReadingPlan(value).primaryCode, 'SCHEMA_SHAPE');
  assert.equal(createReadingPlan(Object.assign(Object.create(null), input())).kind, 'plan');
  const revoked = Proxy.revocable(input(), {}); revoked.revoke(); assert.equal(createReadingPlan(revoked.proxy).primaryCode, 'SCHEMA_UNINSPECTABLE');
  const symbol = [1]; symbol[Symbol()] = 1; invalid({ weekdays: symbol }, 'WEEKDAYS_EXTRA', 'weekdays');
  let calls = 0; const getter = [1]; Object.defineProperty(getter, '0', { get() { calls += 1; return 1; } }); invalid({ weekdays: getter }, 'WEEKDAYS_EXTRA', 'weekdays'); assert.equal(calls, 0);
  const hidden = [1]; Object.defineProperty(hidden, '0', { enumerable: false }); invalid({ weekdays: hidden }, 'WEEKDAYS_EXTRA', 'weekdays');
  invalid({ weekdays: new (class X extends Array {})(1) }, 'WEEKDAYS_TYPE', 'weekdays');
  for (const weekdays of [[1.1], [NaN], [Infinity], ['1'], [true]]) invalid({ weekdays }, 'WEEKDAYS_INVALID', 'weekdays');
});
test('empty/type/size precedence, leading zeros and R=0 still validates', () => {
  invalid({ titleRaw: null }, 'TITLE_TYPE', 'titleRaw'); invalid({ totalPagesRaw: '' }, 'TOTAL_REQUIRED', 'totalPagesRaw'); invalid({ completedPagesRaw: '' }, 'COMPLETED_REQUIRED', 'completedPagesRaw');
  invalid({ completedPagesRaw: '10001' }, 'COMPLETED_RANGE', 'completedPagesRaw');
  invalid({ totalPagesRaw: '40', weekdays: [] }, 'WEEKDAYS_EMPTY', 'weekdays');
  invalid({ totalPagesRaw: '40', startDateRaw: '' }, 'START_DATE_REQUIRED', 'startDateRaw');
  const p = make({ totalPagesRaw: '00100', completedPagesRaw: '00040', dailyCapRaw: '00012' }); assert.deepEqual(p, make());
});
test('independent allocation invariants across counts, windows and caps', () => {
  for (const R of [1, 2, 3, 5, 11, 60, 99, 366, 9999]) for (const weekdays of [[1], [2, 4, 6], [1, 2, 3, 4, 5, 6, 7]]) {
    const p = createReadingPlan(onePage({ totalPagesRaw: String(R + 1), completedPagesRaw: '1', startDateRaw: '2024-01-01', endDateRaw: '2024-12-31', weekdays }));
    assert.equal(p.kind, 'plan'); assert(p.schedule.length <= 366);
    let next = 2; let total = 0; let last = '';
    const counts = [];
    for (const row of p.schedule) {
      assert(row.date > last); last = row.date; assert(weekdays.includes(row.isoWeekday));
      total += row.pagesPerDay; counts.push(row.pagesPerDay);
      if (row.pagesPerDay) { assert.equal(row.pageStart, next); assert.equal(row.pageEnd - row.pageStart + 1, row.pagesPerDay); next = row.pageEnd + 1; }
      else { assert.equal(row.pageStart, null); assert.equal(row.pageEnd, null); assert.equal(row.kind, 'flex'); }
    }
    assert.equal(total, R); assert.equal(next, R + 2); assert(Math.max(...counts) - Math.min(...counts) <= 1);
    assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
    assert.equal(p.summary.readingDays + p.summary.flexibleDays, p.schedule.length);
  }
});
