// Proleptic Gregorian civil arithmetic. No Date, locale, or timezone conversions.
export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year, month) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function toOrdinal(year, month, day) {
  const previous = year - 1;
  let ordinal = 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400);
  for (let m = 1; m < month; m += 1) ordinal += daysInMonth(year, m);
  return ordinal + day - 1; // 0001-01-01 = 0, a Monday.
}

export function fromOrdinal(ordinal) {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= toOrdinal(10000, 1, 1)) {
    throw new RangeError('CIVIL_RANGE');
  }
  let low = 1;
  let high = 10000;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (toOrdinal(middle, 1, 1) <= ordinal) low = middle;
    else high = middle;
  }
  const year = low;
  let rest = ordinal - toOrdinal(year, 1, 1);
  let month = 1;
  while (rest >= daysInMonth(year, month)) {
    rest -= daysInMonth(year, month);
    month += 1;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(rest + 1).padStart(2, '0')}`;
}

export function parseCivilDate(value, { minYear = 2000, maxYear = 2099 } = {}) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < minYear || year > maxYear || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day, ordinal: toOrdinal(year, month, day) };
}

export function weekday(ordinal) {
  return ((ordinal + 1) % 7 + 7) % 7;
}

export function buildWorkdayCalendar(deadline, workweek, holidays, countBack, { onProgress = () => {} } = {}) {
  const parsed = parseCivilDate(deadline);
  if (!parsed || !Array.isArray(workweek) || workweek.length === 0 || workweek.length > 7 ||
      new Set(workweek).size !== workweek.length || [...workweek].some(d => !Number.isInteger(d) || d < 0 || d > 6) ||
      !Array.isArray(holidays) || holidays.length > 366 || new Set(holidays).size !== holidays.length ||
      [...holidays].some(d => !parseCivilDate(d)) || !Number.isInteger(countBack) || countBack < 1 || countBack > 26000) {
    throw new RangeError('CALENDAR_INPUT');
  }
  const selected = new Set(workweek);
  const excluded = new Set(holidays.map(d => parseCivilDate(d).ordinal));
  const datesDescending = [];
  const ordinalsDescending = [];
  let cursor = parsed.ordinal;
  let effectiveOrdinal;
  let visitedCivilDays = 0;
  // Upper bound: one weekday per week plus all 366 holidays, including normalization.
  const maximumVisits = (countBack + 366) * 7 + 7;
  while (datesDescending.length < countBack) {
    visitedCivilDays += 1;
    if (visitedCivilDays > maximumVisits || cursor < toOrdinal(1400, 1, 1)) throw new RangeError('CALENDAR_RANGE');
    if (selected.has(weekday(cursor)) && !excluded.has(cursor)) {
      if (effectiveOrdinal === undefined) effectiveOrdinal = cursor;
      datesDescending.push(fromOrdinal(cursor));
      ordinalsDescending.push(cursor);
    }
    if (visitedCivilDays % 512 === 0) onProgress({ phase: 'calendar', completed: visitedCivilDays, unit: 'civilDays' });
    cursor -= 1;
  }
  onProgress({ phase: 'calendar', completed: visitedCivilDays, unit: 'civilDays' });
  const workdayDates = datesDescending.reverse();
  const ordinals = ordinalsDescending.reverse();
  if (workdayDates.length !== countBack) throw new RangeError('CALENDAR_INTERNAL');
  return {
    anchor: workdayDates[0],
    effectiveDeadline: fromOrdinal(effectiveOrdinal),
    deadlineAdjusted: effectiveOrdinal !== parsed.ordinal,
    deadlineAdjustmentDays: parsed.ordinal - effectiveOrdinal,
    workdayDates,
    ordinalToIndex: new Map(ordinals.map((day, index) => [day, index])),
    visitedCivilDays
  };
}
