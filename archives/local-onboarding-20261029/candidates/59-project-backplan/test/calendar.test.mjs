import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCivilDate, toOrdinal, fromOrdinal, weekday, buildWorkdayCalendar } from '../public/js/core/calendar.mjs';

test('Gregorian input parser includes 2000 leap day and excludes impossible dates and years', () => {
  assert.ok(parseCivilDate('2000-02-29'));
  assert.ok(parseCivilDate('2099-12-31'));
  for (const date of ['2001-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '1999-12-31', '2100-01-01', '2026-1-01', 20261023]) assert.equal(parseCivilDate(date), null);
});
test('civil ordinal and inverse agree with independent Gregorian UTC dates from 1400 to 2099', () => {
  assert.equal(toOrdinal(1970, 1, 1), 719162);
  assert.equal(fromOrdinal(0), '0001-01-01');
  assert.equal(fromOrdinal(toOrdinal(99, 3, 1)), '0099-03-01');
  assert.equal(toOrdinal(2000, 3, 1) - toOrdinal(2000, 2, 28), 2);
  assert.equal(toOrdinal(1900, 3, 1) - toOrdinal(1900, 2, 28), 1);
  for (let year = 1400; year <= 2099; year += 1) {
    for (const [month, day] of [[1, 1], [2, 28], [3, 1], [12, 31]]) {
      const ms = Date.UTC(year, month - 1, day);
      const iso = new Date(ms).toISOString().slice(0, 10);
      const ordinal = toOrdinal(year, month, day);
      assert.equal(ordinal, ms / 86400000 + 719162);
      assert.equal(fromOrdinal(ordinal), iso);
      assert.equal(weekday(ordinal), new Date(ms).getUTCDay());
    }
  }
});
test('A03/A04/A06/A07: exact inclusive workday arrays and deadline adjustments', () => {
  const week = [1, 2, 3, 4, 5];
  const weekend = buildWorkdayCalendar('2026-10-24', week, [], 1);
  assert.equal(weekend.effectiveDeadline, '2026-10-23');
  assert.equal(weekend.deadlineAdjustmentDays, 1);
  assert.equal(weekend.deadlineAdjusted, true);
  assert.deepEqual(buildWorkdayCalendar('2026-10-23', week, ['2026-10-23'], 4).workdayDates, ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22']);
  assert.deepEqual(buildWorkdayCalendar('2026-10-23', [2, 4], [], 2).workdayDates, ['2026-10-20', '2026-10-22']);
  assert.deepEqual(buildWorkdayCalendar('2026-10-23', week, ['2026-10-20'], 4).workdayDates, ['2026-10-19', '2026-10-21', '2026-10-22', '2026-10-23']);
  assert.deepEqual(buildWorkdayCalendar('2026-10-23', week, ['2026-10-18'], 5).workdayDates, ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
});
test('A08/A17: empty week rejected; holiday normalization may cross into year 1999', () => {
  assert.throws(() => buildWorkdayCalendar('2026-10-23', [], [], 1), /CALENDAR_INPUT/);
  const c = buildWorkdayCalendar('2000-01-01', [6], ['2000-01-01'], 1);
  assert.equal(c.effectiveDeadline, '1999-12-25');
  assert.equal(c.anchor, '1999-12-25');
  assert.equal(c.deadlineAdjustmentDays, 7);
  const all2000 = Array.from({ length: 366 }, (_, i) => new Date(Date.UTC(2000, 0, 1) + i * 86400000).toISOString().slice(0, 10));
  const last = buildWorkdayCalendar('2000-12-31', [0, 1, 2, 3, 4, 5, 6], all2000, 1);
  assert.equal(last.effectiveDeadline, '1999-12-31');
  assert.equal(last.deadlineAdjustmentDays, 366);
});
test('A11: maximum calendar is finite, inclusive, pre-2000, and reports actual visits', () => {
  const progress = [];
  const c = buildWorkdayCalendar('2000-01-07', [1], [], 26000, { onProgress: p => progress.push(p) });
  assert.equal(c.anchor, '1501-09-23');
  assert.equal(c.effectiveDeadline, '2000-01-03');
  assert.equal(c.workdayDates.length, 26000);
  assert.equal(c.ordinalToIndex.size, 26000);
  assert.equal(c.visitedCivilDays, 181998);
  assert.equal(progress.at(-1).completed, c.visitedCivilDays);
  for (let i = 1; i < progress.length; i += 1) assert.ok(progress[i].completed > progress[i - 1].completed);
});
