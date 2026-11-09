// Workdays Calculator — pure core.
// Counts business days between two dates (mode "count") or steps a number
// of business days from a start date (mode "shift"), excluding Saturdays,
// Sundays, and a user-supplied holiday list. All date math is integer
// Julian Day Number arithmetic (Fliegel–Van Flandern); no Date object,
// host clock, or host timezone is ever read, so results are identical on
// every machine.
//
// Endpoint rule (pinned by the SPEC): the start date is excluded and the
// end date is included — count uses the directed half-open interval
// (start, end], and shift is its exact inverse.

const COUNT_FIELDS = ["mode", "startDate", "endDate", "holidays"];
const SHIFT_FIELDS = ["mode", "startDate", "days", "holidays"];

const DATE_RAW_LIMIT = 10;
const DAYS_RAW_LIMIT = 5;
const HOLIDAYS_RAW_LIMIT = 4096;
const HOLIDAY_ROW_LIMIT = 400;
const DAYS_MIN = -3660;
const DAYS_MAX = 3660;
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

export const REPORT_BYTES_LIMIT = 2097152;

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
// The SPEC pins the days grammar as -?(0|[1-9][0-9]*) and states in the
// same sentence that "-0" does not satisfy it; the pattern below is that
// grammar with "-0" excluded, exactly as the SPEC's test list requires
// ("-0" and "007" are INTEGER_FORMAT).
const INTEGER_PATTERN = /^(0|-?[1-9][0-9]*)$/;

function failure(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_DAYS[month - 1];
}

// Fliegel–Van Flandern integer Julian Day Number for a Gregorian date.
export function jdnFromCivil(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// Inverse of jdnFromCivil (Fliegel–Van Flandern).
export function civilFromJdn(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

// Weekday numbering pinned by the SPEC: 0 = Sunday .. 6 = Saturday.
export function weekdayFromJdn(jdn) {
  return (jdn + 1) % 7;
}

function isWeekendJdn(jdn) {
  const weekday = weekdayFromJdn(jdn);
  return weekday === 0 || weekday === 6;
}

function formatDate({ year, month, day }) {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hasLoneSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function readOwnData(input, name) {
  const descriptor = Object.getOwnPropertyDescriptor(input, name);
  if (!descriptor) return { present: false, accessor: false, value: undefined };
  if (!("value" in descriptor)) return { present: true, accessor: true, value: undefined };
  return { present: true, accessor: false, value: descriptor.value };
}

// Validates one raw date string in the pinned order: capacity, unicode,
// empty, grammar, real-date, range. Returns {parts} or {error} with the
// field unset; the caller stamps the field (and row, for holiday lines).
function validateDateRaw(raw) {
  if (raw.length > DATE_RAW_LIMIT) return { error: failure("INPUT_LIMIT", null) };
  if (hasLoneSurrogate(raw)) return { error: failure("UNICODE", null) };
  if (raw === "") return { error: failure("EMPTY", null) };
  if (!DATE_PATTERN.test(raw)) return { error: failure("DATE_FORMAT", null) };
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  const day = Number(raw.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("INVALID_DATE", null) };
  }
  if (year < YEAR_MIN || year > YEAR_MAX) return { error: failure("RANGE", null) };
  return { parts: { year, month, day } };
}

// Validates one holiday line's content (the whole-string capacity and
// unicode checks, and the empty-line skip, happen in parseHolidays).
// Returns {jdn} or {error} with the row unset.
function validateHolidayLine(line) {
  if (!DATE_PATTERN.test(line)) return { error: failure("DATE_FORMAT", null) };
  const year = Number(line.slice(0, 4));
  const month = Number(line.slice(5, 7));
  const day = Number(line.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("INVALID_DATE", null) };
  }
  if (year < YEAR_MIN || year > YEAR_MAX) return { error: failure("RANGE", null) };
  return { jdn: jdnFromCivil(year, month, day) };
}

// Parses the holidays textarea (LF-separated DOM value). Blank lines are
// skipped but still occupy their row number. The 401st non-blank line
// fails with ROW_LIMIT before its content is examined. Returns
// {set, nonBlankLines} or {error}.
function parseHolidays(raw) {
  if (raw.length > HOLIDAYS_RAW_LIMIT) {
    return { error: failure("INPUT_LIMIT", "holidays") };
  }
  if (hasLoneSurrogate(raw)) return { error: failure("UNICODE", "holidays") };
  const set = new Set();
  if (raw === "") return { set, nonBlankLines: 0 };
  const lines = raw.split("\n");
  let nonBlankLines = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "") continue;
    nonBlankLines += 1;
    const row = index + 1;
    if (nonBlankLines > HOLIDAY_ROW_LIMIT) {
      return { error: failure("ROW_LIMIT", "holidays", row) };
    }
    const checked = validateHolidayLine(line);
    if (checked.error) {
      return { error: failure(checked.error.error.code, "holidays", row) };
    }
    set.add(checked.jdn);
  }
  return { set, nonBlankLines };
}

function runCount(startParts, endParts, startRaw, endRaw, holidays) {
  const startJdn = jdnFromCivil(startParts.year, startParts.month, startParts.day);
  const endJdn = jdnFromCivil(endParts.year, endParts.month, endParts.day);
  const lo = Math.min(startJdn, endJdn);
  const hi = Math.max(startJdn, endJdn);
  const span = hi - lo;

  // Whole-week decomposition over the unsigned interval (lo, hi]: every
  // run of 7 consecutive days holds exactly 2 weekend days; only the
  // remainder (at most 6 days) is enumerated directly.
  const fullWeeks = Math.floor(span / 7);
  const remainder = span - fullWeeks * 7;
  let weekendDays = fullWeeks * 2;
  for (let jdn = hi - remainder + 1; jdn <= hi; jdn += 1) {
    if (isWeekendJdn(jdn)) weekendDays += 1;
  }
  const weekdayDays = span - weekendDays;

  let holidaysSubtracted = 0;
  let holidaysOnWeekends = 0;
  for (const jdn of holidays.set) {
    if (jdn > lo && jdn <= hi) {
      if (isWeekendJdn(jdn)) holidaysOnWeekends += 1;
      else holidaysSubtracted += 1;
    }
  }
  const holidaysOutOfRange = holidays.set.size - holidaysSubtracted - holidaysOnWeekends;
  const magnitude = weekdayDays - holidaysSubtracted;
  const businessDays = startJdn <= endJdn ? magnitude : -magnitude;

  return {
    ok: true,
    result: {
      mode: "count",
      startDate: startRaw,
      endDate: endRaw,
      startWeekday: weekdayFromJdn(startJdn),
      endWeekday: weekdayFromJdn(endJdn),
      calendarDays: endJdn - startJdn,
      businessDays,
      weekendDays,
      holidaysSubtracted,
      holidaysOnWeekends,
      holidaysOutOfRange,
      duplicateHolidayLines: holidays.nonBlankLines - holidays.set.size,
    },
  };
}

function runShift(startParts, startRaw, daysValue, holidays) {
  const startJdn = jdnFromCivil(startParts.year, startParts.month, startParts.day);
  const isBusinessDay = (jdn) => !isWeekendJdn(jdn) && !holidays.set.has(jdn);

  let resultJdn = startJdn;
  if (daysValue !== 0) {
    const step = daysValue > 0 ? 1 : -1;
    let remaining = Math.abs(daysValue);
    while (remaining > 0) {
      resultJdn += step;
      if (isBusinessDay(resultJdn)) remaining -= 1;
    }
  }

  return {
    ok: true,
    result: {
      mode: "shift",
      startDate: startRaw,
      days: daysValue,
      resultDate: formatDate(civilFromJdn(resultJdn)),
      resultWeekday: weekdayFromJdn(resultJdn),
      resultIsBusinessDay: isBusinessDay(resultJdn),
      calendarDaysMoved: resultJdn - startJdn,
    },
  };
}

function runInner(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failure("SCHEMA", null);
  }
  const modeField = readOwnData(input, "mode");
  if (!modeField.present || modeField.accessor || typeof modeField.value !== "string") {
    return failure("SCHEMA", null);
  }
  const mode = modeField.value;
  if (mode !== "count" && mode !== "shift") return failure("ENUM", "mode");

  const fieldNames = mode === "count" ? COUNT_FIELDS : SHIFT_FIELDS;
  for (const key of Object.keys(input)) {
    if (!fieldNames.includes(key)) return failure("SCHEMA", key);
  }
  const values = {};
  for (const name of fieldNames) {
    const field = readOwnData(input, name);
    if (!field.present || field.accessor || typeof field.value !== "string") {
      return failure("SCHEMA", name);
    }
    values[name] = field.value;
  }

  const startCheck = validateDateRaw(values.startDate);
  if (startCheck.error) {
    return failure(startCheck.error.error.code, "startDate");
  }

  let endParts = null;
  let daysValue = null;
  if (mode === "count") {
    const endCheck = validateDateRaw(values.endDate);
    if (endCheck.error) return failure(endCheck.error.error.code, "endDate");
    endParts = endCheck.parts;
  } else {
    const raw = values.days;
    if (raw.length > DAYS_RAW_LIMIT) return failure("INPUT_LIMIT", "days");
    if (hasLoneSurrogate(raw)) return failure("UNICODE", "days");
    if (raw === "") return failure("EMPTY", "days");
    if (!INTEGER_PATTERN.test(raw)) return failure("INTEGER_FORMAT", "days");
    daysValue = Number(raw);
    if (daysValue < DAYS_MIN || daysValue > DAYS_MAX) return failure("RANGE", "days");
  }

  const holidays = parseHolidays(values.holidays);
  if (holidays.error) return holidays.error;

  if (mode === "count") {
    return runCount(startCheck.parts, endParts, values.startDate, values.endDate, holidays);
  }
  return runShift(startCheck.parts, values.startDate, daysValue, holidays);
}

export function run(input) {
  try {
    return runInner(input);
  } catch {
    return failure("INTERNAL", null);
  }
}

// Canonical report serialization pinned by the SPEC: compact JSON, object
// own keys sorted ascending by UTF-16 code units recursively, array order
// preserved, exactly one trailing LF. Strings use standard JSON literal
// escaping; the input's own toJSON is never consulted.
function writeCanonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => writeCanonical(entry)).join(",")}]`;
  const keys = Object.keys(value).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${writeCanonical(value[key])}`)
    .join(",");
  return `{${body}}`;
}

export function serializeReport(result) {
  return `${writeCanonical(result)}\n`;
}
