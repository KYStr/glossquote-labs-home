import { formatClock } from './parse-clock.js';
export { formatClock } from './parse-clock.js';

export function calculateSchedule(input) {
  let minute = input.startMinuteOfDay;
  const rows = input.rows.map(row => {
    const start = minute;
    minute += row.durationMinutes;
    return { id: row.id, name: row.name, durationMinutes: row.durationMinutes, note: row.note,
      startAbsoluteMinute: start, endAbsoluteMinute: minute,
      startMinuteOfDay: start % 1440, endMinuteOfDay: minute % 1440,
      startDayOffset: Math.floor(start / 1440), endDayOffset: Math.floor(minute / 1440) };
  });
  const target = input.target;
  const difference = target === null ? null : target.absoluteMinute - minute;
  return { startMinuteOfDay: input.startMinuteOfDay, totalMinutes: input.totalMinutes,
    endAbsoluteMinute: minute, endMinuteOfDay: minute % 1440, endDayOffset: Math.floor(minute / 1440), rows,
    targetComparison: target === null ? null : { targetAbsoluteMinute: target.absoluteMinute, targetMinuteOfDay: target.minuteOfDay,
      targetDayOffset: target.dayOffset, differenceMinutes: difference, relation: difference > 0 ? 'early' : difference < 0 ? 'late' : 'on-time' } };
}

export function formatScheduleClock(absoluteMinute, locale) {
  if (!Number.isSafeInteger(absoluteMinute) || absoluteMinute < 0 || absoluteMinute > 2879) throw new RangeError('Invalid schedule minute');
  return formatClock(absoluteMinute % 1440) + (absoluteMinute >= 1440 ? locale === 'en' ? ' (next day)' : '（次日）' : '');
}

export function formatTargetClock(target, locale) {
  const suffix = locale === 'en' ? target.dayOffset === 1 ? ' (next day)' : ' (same day)' : target.dayOffset === 1 ? '（次日）' : '（當日）';
  return formatClock(target.minuteOfDay) + suffix;
}
