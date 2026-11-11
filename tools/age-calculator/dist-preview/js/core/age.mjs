// Pure core for the Age Calculator (spec-age-calculator-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. Every
// computation is integer Julian day number (JDN) arithmetic exactly
// as the SPEC pins:
//   JDN by the Fliegel & Van Flandern integer formula
//   total days = JDN(reference) - JDN(birth)
//   age years/months/days by repeatedly borrowing full preceding months
//     until the day count is non-negative, then borrowing a year if needed
//   weekday index = (JDN(birth) + 1) mod 7, 0 = Sunday
//   the observed birthday in a year is the birth month/day, except a
//     February 29 birth observes March 1 in a non-leap year
//   the next birthday is the first observed birthday on or after the
//     reference day; its year minus the birth year is the turning age

export const FIELDS = ["birthDate", "referenceDate"];

export const DEFAULTS = { birthDate: "", referenceDate: "" };

// The worked example is fixtures.json case 1 (borrow-days-months)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { birthDate: "1990-05-15", referenceDate: "2026-11-09" };

export const MAX_RAW_UNITS = 10;

export const MIN_DATE = "1900-01-01";
export const MAX_DATE = "2100-12-31";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MIN_PARTS = [1900, 1, 1];
const MAX_PARTS = [2100, 12, 31];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const WEEKDAY_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
export const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

// Lexicographic comparison of [year, month, day] parts.
function compareParts(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function formatParts(parts) {
  const [year, month, day] = parts;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Julian day number, Fliegel & Van Flandern integer formula as the
// SPEC pins it. All intermediate values are small exact integers.
function jdn([year, month, day]) {
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

// The observed birthday of the birth month/day in the given year:
// February 29 is observed on March 1 when the year is not a leap
// year. The year itself is not range-limited here (the next birthday
// may fall in 2101).
function observedBirthday(birth, year) {
  if (birth[1] === 2 && birth[2] === 29 && !isLeapYear(year)) return [year, 3, 1];
  return [year, birth[1], birth[2]];
}

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the two
// fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, real calendar day, range. Returns the
// parsed [year, month, day] parts or an { error } outcome.
function validateField(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DATE_PATTERN.test(value)) return { error: failure("DATE_FORMAT", field) };
  const parts = [Number(value.slice(0, 4)), Number(value.slice(5, 7)), Number(value.slice(8, 10))];
  const [year, month, day] = parts;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("INVALID_DATE", field) };
  }
  if (compareParts(parts, MIN_PARTS) < 0 || compareParts(parts, MAX_PARTS) > 0) {
    return { error: failure("RANGE", field) };
  }
  return { parts };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of FIELDS) {
    const outcome = validateField(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.parts;
  }
  const birth = checked.birthDate;
  const ref = checked.referenceDate;

  const birthJdn = jdn(birth);
  const refJdn = jdn(ref);

  // Cross-field: the reference day must not precede the birth day.
  // Equal is legal (age zero).
  if (refJdn < birthJdn) return failure("DATE_ORDER", "referenceDate");

  const totalDays = refJdn - birthJdn;

  // Borrow full months in reverse calendar order until days are non-negative.
  let ageYears = ref[0] - birth[0];
  let ageMonths = ref[1] - birth[1];
  let ageDays = ref[2] - birth[2];
  let borrowedYear = ref[0];
  let borrowedMonth = ref[1];
  while (ageDays < 0) {
    ageMonths -= 1;
    borrowedMonth -= 1;
    if (borrowedMonth === 0) {
      borrowedMonth = 12;
      borrowedYear -= 1;
    }
    ageDays += daysInMonth(borrowedYear, borrowedMonth);
  }
  if (ageMonths < 0) {
    ageYears -= 1;
    ageMonths += 12;
  }

  const birthWeekdayIndex = (birthJdn + 1) % 7;

  const observedThisYear = observedBirthday(birth, ref[0]);
  const isBirthdayToday = compareParts(observedThisYear, ref) === 0;
  const nextBirthdayParts =
    jdn(observedThisYear) >= refJdn ? observedThisYear : observedBirthday(birth, ref[0] + 1);
  const daysUntilNextBirthday = jdn(nextBirthdayParts) - refJdn;
  const turningAge = nextBirthdayParts[0] - birth[0];

  return {
    ok: true,
    result: {
      ageYears,
      ageMonths,
      ageDays,
      totalDays,
      birthWeekdayIndex,
      birthWeekdayZh: WEEKDAY_ZH[birthWeekdayIndex],
      birthWeekdayEn: WEEKDAY_EN[birthWeekdayIndex],
      isBirthdayToday,
      nextBirthday: formatParts(nextBirthdayParts),
      daysUntilNextBirthday,
      turningAge,
    },
  };
}

// Fixed report download: age-report.json. The content is the result's
// compact JSON with object keys sorted recursively by UTF-16 code
// units, array order unchanged, exactly one trailing LF, UTF-8
// without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "age-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
