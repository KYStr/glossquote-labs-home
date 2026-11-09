// Gregorian civil arithmetic only. Ordinal 0 is Monday, 0001-01-01.
export function isLeapYear(year) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

export function daysInMonth(year, month) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function civilOrdinal(year, month, day) {
  const y = year - 1;
  let ordinal = 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + day - 1;
  for (let m = 1; m < month; m += 1) ordinal += daysInMonth(year, m);
  return ordinal;
}

export function weekdayForCivilDate(year, month, day) {
  return (civilOrdinal(year, month, day) % 7) + 1;
}

export function formatCivilDate({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseISODate(raw) {
  const fail = (code) => ({ ok: false, code });
  if (typeof raw !== 'string') return fail('DATE_TYPE');
  if (raw.length > 256) return fail('DATE_TOO_LONG');
  if (raw === '') return fail('DATE_REQUIRED');
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw)) return fail('DATE_FORMAT');
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  const day = Number(raw.slice(8, 10));
  if (year < 1900 || year > 2100) return fail('DATE_RANGE');
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return fail('DATE_INVALID');
  const ordinal = civilOrdinal(year, month, day);
  return { ok: true, date: { year, month, day, ordinal, isoWeekday: ordinal % 7 + 1 } };
}

export function enumerateAllowedDates(startDate, endDate, sortedWeekdays) {
  const span = endDate.ordinal - startDate.ordinal + 1;
  if (!Number.isInteger(span) || span < 1 || span > 366) throw new RangeError('DATE_WINDOW');
  let { year, month, day } = startDate;
  const allowed = new Set(sortedWeekdays);
  const dates = [];
  for (let offset = 0; offset < span; offset += 1) {
    const ordinal = startDate.ordinal + offset;
    const isoWeekday = ordinal % 7 + 1;
    if (allowed.has(isoWeekday)) dates.push({ year, month, day, ordinal, isoWeekday });
    day += 1;
    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
  }
  return dates;
}
