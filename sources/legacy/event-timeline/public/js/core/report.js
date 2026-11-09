import { formatClock, formatScheduleClock, formatTargetClock } from './schedule.js';

export function formatPlainTextReport(schedule, locale) {
  const en = locale === 'en';
  const minutes = value => `${value} ${en ? 'min' : '分鐘'}`;
  const lines = [en ? 'GlossQuote Event Timeline' : 'GlossQuote 活動時間表', `${en ? 'Start' : '開始'}\t${formatClock(schedule.startMinuteOfDay)}`];
  schedule.rows.forEach((row, index) => {
    lines.push(`${String(index + 1).padStart(2, '0')}\t${formatScheduleClock(row.startAbsoluteMinute, locale)}–${formatScheduleClock(row.endAbsoluteMinute, locale)}\t${row.name}\t${minutes(row.durationMinutes)}`);
    if (row.note) lines.push(`${en ? 'Note' : '備註'}\t${row.note}`);
  });
  lines.push(`${en ? 'Total' : '總長'}\t${minutes(schedule.totalMinutes)}`, `${en ? 'End' : '結束'}\t${formatScheduleClock(schedule.endAbsoluteMinute, locale)}`);
  const comparison = schedule.targetComparison;
  if (comparison !== null) {
    lines.push(`${en ? 'Target' : '目標'}\t${formatTargetClock({ minuteOfDay: comparison.targetMinuteOfDay, dayOffset: comparison.targetDayOffset }, locale)}`);
    const difference = comparison.differenceMinutes;
    const text = difference === 0 ? en ? 'On time' : '準時' : en ? `${Math.abs(difference)} min ${difference > 0 ? 'early' : 'late'}` : `${difference > 0 ? '提早' : '超時'} ${Math.abs(difference)} 分鐘`;
    lines.push(`${en ? 'Difference' : '差異'}\t${text}`);
  }
  return lines.join('\n');
}

export function encodeUtf8Report(report) {
  return new TextEncoder().encode(report);
}
