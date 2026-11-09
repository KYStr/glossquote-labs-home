import { parseISODate, enumerateAllowedDates, formatCivilDate } from './civil-date.mjs';

const FIELDS = Object.freeze(['titleRaw', 'totalPagesRaw', 'completedPagesRaw', 'startDateRaw', 'endDateRaw', 'weekdays', 'dailyCapRaw']);
const error = (code, field) => ({ code, field });
const rejected = (code) => ({ ok: false, errors: [error(code, 'root')] });

function titleError(raw) {
  if (/[\u0000-\u001f\u007f-\u009f]/.test(raw)) return 'TITLE_CONTROL';
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = raw.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return 'TITLE_SURROGATE';
    } else if (c >= 0xdc00 && c <= 0xdfff) return 'TITLE_SURROGATE';
  }
  return raw.trim().length > 80 ? 'TITLE_TRIMMED_TOO_LONG' : null;
}

function integerError(raw, prefix, minimum) {
  if (raw === '') return prefix === 'DAILY_CAP' ? null : `${prefix}_REQUIRED`;
  if (!/^[0-9]{1,5}$/.test(raw)) return `${prefix}_FORMAT`;
  const n = Number(raw);
  return n < minimum || n > 10000 ? `${prefix}_RANGE` : null;
}

// Never read a property until its descriptor has been checked. Traps are caught
// at the validation boundary; their exception text is never returned.
function inspectWeekdays(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return { code: 'WEEKDAYS_TYPE' };
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (!Number.isInteger(length) || length < 0 || length > 7) return { code: 'WEEKDAYS_INVALID' };
  const keys = Reflect.ownKeys(descriptors);
  const expected = new Set(['length', ...Array.from({ length }, (_, i) => String(i))]);
  if (keys.some((key) => typeof key !== 'string' || !expected.has(key))) return { code: 'WEEKDAYS_EXTRA' };
  const values = [];
  for (let i = 0; i < length; i += 1) {
    const d = descriptors[String(i)];
    if (!d) return { code: 'WEEKDAYS_SPARSE' };
    if (!Object.hasOwn(d, 'value') || !d.enumerable) return { code: 'WEEKDAYS_EXTRA' };
    values.push(d.value);
  }
  if (length === 0) return { code: 'WEEKDAYS_EMPTY' };
  if (values.some((n) => typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 7)) return { code: 'WEEKDAYS_INVALID' };
  if (new Set(values).size !== length) return { code: 'WEEKDAYS_DUPLICATE' };
  return { values: values.sort((a, b) => a - b) };
}

export function validateReadingPlanInput(input) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return rejected('SCHEMA_SHAPE');
    const proto = Object.getPrototypeOf(input);
    if (proto !== Object.prototype && proto !== null) return rejected('SCHEMA_SHAPE');
    const keys = Reflect.ownKeys(input);
    if (keys.length !== FIELDS.length || keys.some((key) => typeof key !== 'string' || !FIELDS.includes(key))) return rejected('SCHEMA_KEYS');
    const raw = Object.create(null);
    for (const field of FIELDS) {
      const d = Object.getOwnPropertyDescriptor(input, field);
      if (!d || !d.enumerable || !Object.hasOwn(d, 'value')) return rejected('SCHEMA_ACCESSOR');
      raw[field] = d.value;
    }
    const errors = [];
    const passed = Object.create(null);
    const values = Object.create(null);
    for (const field of FIELDS) {
      let code = null;
      const value = raw[field];
      if (field === 'weekdays') {
        const inspected = inspectWeekdays(value);
        code = inspected.code ?? null;
        values.weekdays = inspected.values;
      } else {
        const prefix = ({ titleRaw: 'TITLE', totalPagesRaw: 'TOTAL', completedPagesRaw: 'COMPLETED', startDateRaw: 'START_DATE', endDateRaw: 'END_DATE', dailyCapRaw: 'DAILY_CAP' })[field];
        if (typeof value !== 'string') code = `${prefix}_TYPE`;
        else if (value.length > 256) code = `${prefix}_TOO_LONG`;
        else if (field === 'titleRaw') { code = titleError(value); if (!code) values.title = value.trim(); }
        else if (field === 'startDateRaw' || field === 'endDateRaw') {
          const parsed = parseISODate(value);
          if (!parsed.ok) code = `${prefix}_${parsed.code.slice(5)}`;
          else values[field === 'startDateRaw' ? 'startDate' : 'endDate'] = parsed.date;
        } else {
          code = integerError(value, prefix, field === 'completedPagesRaw' ? 0 : 1);
          if (!code) values[field === 'totalPagesRaw' ? 'totalPages' : field === 'completedPagesRaw' ? 'completedPages' : 'dailyCap'] = value === '' ? null : Number(value);
        }
      }
      passed[field] = !code;
      if (code) errors.push(error(code, field));
    }
    let countsOK = passed.totalPagesRaw && passed.completedPagesRaw;
    if (countsOK && values.completedPages > values.totalPages) {
      errors.push(error('COMPLETED_GT_TOTAL', 'completedPagesRaw')); countsOK = false;
    }
    let datesOK = passed.startDateRaw && passed.endDateRaw;
    if (datesOK) {
      const span = values.endDate.ordinal - values.startDate.ordinal + 1;
      if (span < 1) { errors.push(error('DATE_ORDER', 'endDateRaw')); datesOK = false; }
      else if (span > 366) { errors.push(error('DATE_WINDOW_TOO_LONG', 'endDateRaw')); datesOK = false; }
    }
    if (countsOK && datesOK && passed.weekdays && values.totalPages > values.completedPages && enumerateAllowedDates(values.startDate, values.endDate, values.weekdays).length === 0) errors.push(error('NO_READING_DAYS', 'weekdays'));
    return errors.length ? { ok: false, errors } : { ok: true, normalized: { title: values.title, totalPages: values.totalPages, completedPages: values.completedPages, startDate: values.startDate, endDate: values.endDate, weekdays: values.weekdays, dailyCap: values.dailyCap } };
  } catch {
    return rejected('SCHEMA_UNINSPECTABLE');
  }
}

export function createReadingPlan(input) {
  const validation = validateReadingPlanInput(input);
  if (!validation.ok) return { kind: 'invalid', primaryCode: validation.errors[0].code, errors: validation.errors };
  const v = validation.normalized;
  const dates = enumerateAllowedDates(v.startDate, v.endDate, v.weekdays);
  const R = v.totalPages - v.completedPages;
  const D = dates.length;
  const base = { totalPages: v.totalPages, completedPages: v.completedPages, remainingPages: R, selectedStartDate: formatCivilDate(v.startDate), selectedEndDate: formatCivilDate(v.endDate), eligibleDayCount: D };
  if (R === 0) return { kind: 'plan', title: v.title, status: 'no-remaining-pages', summary: { ...base, minimumPagesPerReadingDay: null, readingDays: 0, flexibleDays: 0, lastReadingDate: null }, schedule: [] };
  const minimum = Math.ceil(R / D);
  if (v.dailyCap !== null && minimum > v.dailyCap) return { kind: 'infeasible', summary: { ...base, dailyCap: v.dailyCap, capacityPages: v.dailyCap * D, shortfallPages: R - v.dailyCap * D, minimumReadingDays: Math.ceil(R / v.dailyCap) } };
  const q = Math.floor(R / D);
  const r = R % D;
  let nextPage = v.completedPages + 1;
  const schedule = dates.map((date, i) => {
    const pagesPerDay = q + (i < r ? 1 : 0);
    const row = { date: formatCivilDate(date), isoWeekday: date.isoWeekday, pagesPerDay, pageStart: pagesPerDay ? nextPage : null, pageEnd: pagesPerDay ? nextPage + pagesPerDay - 1 : null, kind: pagesPerDay ? 'reading' : 'flex' };
    nextPage += pagesPerDay;
    return row;
  });
  const readingDays = Math.min(R, D);
  return { kind: 'plan', title: v.title, status: 'scheduled', summary: { ...base, minimumPagesPerReadingDay: minimum, readingDays, flexibleDays: D - readingDays, lastReadingDate: schedule[readingDays - 1].date }, schedule };
}
