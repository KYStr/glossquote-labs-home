import test from 'node:test';
import assert from 'node:assert/strict';
import { parseISODate, weekdayForCivilDate, enumerateAllowedDates, formatCivilDate, civilOrdinal } from '../public/js/core/civil-date.mjs';
import { createReadingPlan } from '../public/js/core/reading-plan.mjs';
import { onePage } from './helpers/fixtures.mjs';
const all = [1, 2, 3, 4, 5, 6, 7];
function range(startDateRaw, endDateRaw) { return createReadingPlan(onePage({ startDateRaw, endDateRaw, weekdays: all })); }
function invalid(changes, code, field) {
  assert.deepEqual(createReadingPlan(onePage(changes)), { kind: 'invalid', primaryCode: code, errors: [{ code, field }] });
}
test('C15 Gregorian leap day is Thursday and is included', () => {
  const p = range('2024-02-28', '2024-03-01');
  assert.equal(p.kind, 'plan'); assert.equal(p.summary.eligibleDayCount, 3);
  assert.deepEqual(p.schedule, [
    { date: '2024-02-28', isoWeekday: 3, pagesPerDay: 1, pageStart: 1, pageEnd: 1, kind: 'reading' },
    { date: '2024-02-29', isoWeekday: 4, pagesPerDay: 0, pageStart: null, pageEnd: null, kind: 'flex' },
    { date: '2024-03-01', isoWeekday: 5, pagesPerDay: 0, pageStart: null, pageEnd: null, kind: 'flex' }
  ]);
});
test('C16 1900 is not a leap year', () => { const p = range('1900-02-28', '1900-03-01'); assert.equal(p.summary.eligibleDayCount, 2); assert.deepEqual(p.schedule.map(r => [r.date, r.isoWeekday]), [['1900-02-28', 3], ['1900-03-01', 4]]); });
test('C17 2000 is a leap year', () => { const p = range('2000-02-28', '2000-03-01'); assert.equal(p.summary.eligibleDayCount, 3); assert.deepEqual(p.schedule.map(r => [r.date, r.isoWeekday]), [['2000-02-28', 1], ['2000-02-29', 2], ['2000-03-01', 3]]); });
test('C18 inclusive 366-day boundary', () => { const p = range('2026-01-01', '2027-01-01'); assert.equal(p.kind, 'plan'); assert.equal(p.schedule.length, 366); assert.equal(p.schedule.at(-1).date, '2027-01-01'); });
test('C19 inclusive 367 days rejected', () => invalid({ startDateRaw: '2026-01-01', endDateRaw: '2027-01-02' }, 'DATE_WINDOW_TOO_LONG', 'endDateRaw'));
test('C20 dates cannot be reversed', () => invalid({ startDateRaw: '2026-10-20', endDateRaw: '2026-10-19' }, 'DATE_ORDER', 'endDateRaw'));
test('C21 no auto padding of dates', () => invalid({ startDateRaw: '2026-2-03' }, 'START_DATE_FORMAT', 'startDateRaw'));
test('C22 nonexistent date does not roll forward', () => invalid({ startDateRaw: '2026-02-30' }, 'START_DATE_INVALID', 'startDateRaw'));
test('C23 lower supported year', () => invalid({ startDateRaw: '1899-12-31' }, 'START_DATE_RANGE', 'startDateRaw'));
test('C24 upper supported year', () => invalid({ endDateRaw: '2101-01-01' }, 'END_DATE_RANGE', 'endDateRaw'));
test('civil parser types, syntax, month ends, centuries and supported endpoints', () => {
  for (const raw of [null, 1, {}, [], true]) assert.equal(parseISODate(raw).code, 'DATE_TYPE');
  for (const raw of ['2026-10-19 ', ' 2026-10-19', '２０２６-10-19', '2026/10/19', '2026-10-19T00:00:00Z']) assert.equal(parseISODate(raw).code, 'DATE_FORMAT');
  for (const raw of ['2026-00-01', '2026-13-01', '2026-04-31', '1900-02-29', '2100-02-29', '2026-01-00']) assert.equal(parseISODate(raw).code, 'DATE_INVALID');
  assert.equal(parseISODate('').code, 'DATE_REQUIRED'); assert.equal(parseISODate('x'.repeat(257)).code, 'DATE_TOO_LONG');
  for (const raw of ['1900-01-01', '2100-12-31', '2000-02-29']) assert.equal(formatCivilDate(parseISODate(raw).date), raw);
  assert.equal(weekdayForCivilDate(1900, 1, 1), 1); assert.equal(weekdayForCivilDate(1970, 1, 1), 4); assert.equal(civilOrdinal(1, 1, 1), 0);
});
test('enumeration is bounded and handles year rollover', () => {
  const dates = enumerateAllowedDates(parseISODate('2026-12-31').date, parseISODate('2027-01-02').date, all);
  assert.deepEqual(dates.map(formatCivilDate), ['2026-12-31', '2027-01-01', '2027-01-02']);
  assert.throws(() => enumerateAllowedDates(parseISODate('2026-01-01').date, parseISODate('2027-01-02').date, all), /DATE_WINDOW/);
});
