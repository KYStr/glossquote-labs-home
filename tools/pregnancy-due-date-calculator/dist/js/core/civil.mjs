// Civil-date arithmetic in the proleptic Gregorian calendar.
//
// Every computation in this tool is done on an integer day count
// (days since 1970-01-01 in the civil calendar) using the
// days-from-civil / civil-from-days conversions. No timestamps, no
// time zones and no daylight-saving rules can influence a result:
// a civil date maps to exactly one integer and back.
//
// This module is pure: no DOM, no network, no storage, no Date.

// Days from civil (Howard Hinnant's algorithm, public domain math).
// y: full year (may be <= 0 for completeness), m: 1-12, d: 1-31.
export function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400; // [0, 399]
  const mp = m > 2 ? m - 3 : m + 9; // Mar=0 .. Feb=11
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

// Civil-from-days: exact inverse of daysFromCivil.
// Returns { year, month, day } with month 1-12, day 1-31.
export function civilFromDays(z) {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153); // Mar=0 .. Feb=11
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? y + 1 : y, month, day };
}

export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function monthLength(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_LENGTHS[month - 1];
}

// True when (year, month, day) is a date that exists in the calendar.
export function isValidCivil(year, month, day) {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthLength(year, month)
  );
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Strictly parse a "YYYY-MM-DD" string into a day count.
// Returns null for malformed or impossible dates (e.g. 2026-02-30).
export function parseCivilDate(text) {
  if (typeof text !== "string") return null;
  const match = DATE_PATTERN.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCivil(year, month, day)) return null;
  return daysFromCivil(year, month, day);
}

export function formatCivilDate(dayCount) {
  const { year, month, day } = civilFromDays(dayCount);
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Day counting is exclusive-of-start: addDays(z, 1) is the next
// calendar day, matching ordinary calendar addition.
export function addDays(dayCount, n) {
  return dayCount + n;
}

export function diffDays(laterDayCount, earlierDayCount) {
  return laterDayCount - earlierDayCount;
}
