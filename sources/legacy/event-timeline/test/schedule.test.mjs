import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../public/js/core/validation.js';
import { calculateSchedule, formatClock, formatScheduleClock, formatTargetClock } from '../public/js/core/schedule.js';
import { D, R, normalizedExample, exampleSchedule } from './helpers.mjs';
test('C19', () => assert.deepEqual(calculateSchedule(normalizedExample), exampleSchedule));
test('C20', () => assert.deepEqual(calculateSchedule(validateDraft(D('23:40', '', false, [R('r1', 'A', '30'), R('r2', 'B', '20')])).value), {
  startMinuteOfDay: 1420, totalMinutes: 50, endAbsoluteMinute: 1470, endMinuteOfDay: 30, endDayOffset: 1,
  rows: [
    { id: 'r1', name: 'A', durationMinutes: 30, note: '', startAbsoluteMinute: 1420, endAbsoluteMinute: 1450, startMinuteOfDay: 1420, endMinuteOfDay: 10, startDayOffset: 0, endDayOffset: 1 },
    { id: 'r2', name: 'B', durationMinutes: 20, note: '', startAbsoluteMinute: 1450, endAbsoluteMinute: 1470, startMinuteOfDay: 10, endMinuteOfDay: 30, startDayOffset: 1, endDayOffset: 1 }
  ], targetComparison: null
}));
test('C21', () => {
  const result = calculateSchedule(validateDraft(D('00:00', '', false, [R('r1', 'A', '720'), R('r2', 'B', '720')])).value);
  assert.equal(result.totalMinutes, 1440); assert.equal(result.endAbsoluteMinute, 1440); assert.equal(result.endMinuteOfDay, 0); assert.equal(result.endDayOffset, 1);
  assert.equal(formatScheduleClock(result.endAbsoluteMinute, 'zh-Hant'), '00:00（次日）');
});
test('C23', () => {
  const result = validateDraft(D()); assert.equal(result.ok, true); assert.equal(result.value.target, null);
  assert.equal(calculateSchedule(result.value).targetComparison, null);
});
test('C27', () => assert.deepEqual(validateDraft(D('09:00', '09:00', true)).value.target, { minuteOfDay: 540, dayOffset: 1, absoluteMinute: 1980 }));
test('Additional formatting and bounded integer invariants', () => {
  assert.equal(formatClock(0), '00:00'); assert.equal(formatClock(1439), '23:59');
  assert.equal(formatScheduleClock(2879, 'en'), '23:59 (next day)');
  assert.equal(formatTargetClock({ minuteOfDay: 540, dayOffset: 1 }, 'en'), '09:00 (next day)');
  const result = calculateSchedule(validateDraft(D('23:59', '00:01', true, [R('r1', 'A', '720'), R('r2', 'B', '720')])).value);
  assert.equal(result.endAbsoluteMinute, 2879); assert.equal(result.targetComparison.differenceMinutes, -1438); assert.equal(result.targetComparison.relation, 'late');
  for (const row of result.rows) { assert.equal(row.endAbsoluteMinute - row.startAbsoluteMinute, 720); assert.ok(row.endDayOffset <= 1); }
  assert.throws(() => formatClock(1440), RangeError);
});
