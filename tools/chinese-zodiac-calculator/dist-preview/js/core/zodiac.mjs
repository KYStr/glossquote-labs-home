// Chinese Zodiac Calculator core: pure, deterministic, integer-only.
//
// The zodiac year is decided by the pinned Chinese New Year table
// below (one entry per zodiac year 1959-2036; 1959 and 2036 are
// boundary rows only). A birth date on or after its Gregorian year's
// CNY belongs to that Gregorian year's zodiac year; a date before it
// belongs to the previous one. There is no extrapolation: dates
// outside the pinned input ranges are OUT_OF_RANGE. No Date object,
// no timezone, no randomness.
//
// Fixed spec: docs/specs/chinese-zodiac-calculator/SPEC.md, spec
// candidate b68311b57e79ddbbae922a0672b4bd8fe299ba3a (PR #173). The
// CNY table is vendored verbatim from that SPEC as literal data.

export const FIELDS = ["birthDate", "asOfDate"];

// The SPEC pins one raw capacity for both fields: 32 code units.
export const MAX_RAW_UNITS = { birthDate: 32, asOfDate: 32 };

export const DEFAULTS = { birthDate: "", asOfDate: "" };

// Load example = the fixed spec's fixtures.json case 1
// (pre-cny-2025) input.
export const EXAMPLE = { birthDate: "2025-01-15", asOfDate: "" };

export const REPORT_FILENAME = "chinese-zodiac-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

// Chinese New Year (lunar 1/1, Gregorian date) per zodiac year,
// vendored verbatim from the fixed SPEC's CNY table: years 1959-2036.
export const CNY_DATES = {

  1959: "1959-02-08",
  1960: "1960-01-28",
  1961: "1961-02-15",
  1962: "1962-02-05",
  1963: "1963-01-25",
  1964: "1964-02-13",
  1965: "1965-02-02",
  1966: "1966-01-21",
  1967: "1967-02-09",
  1968: "1968-01-30",
  1969: "1969-02-17",
  1970: "1970-02-06",
  1971: "1971-01-27",
  1972: "1972-02-15",
  1973: "1973-02-03",
  1974: "1974-01-23",
  1975: "1975-02-11",
  1976: "1976-01-31",
  1977: "1977-02-18",
  1978: "1978-02-07",
  1979: "1979-01-28",
  1980: "1980-02-16",
  1981: "1981-02-05",
  1982: "1982-01-25",
  1983: "1983-02-13",
  1984: "1984-02-02",
  1985: "1985-02-20",
  1986: "1986-02-09",
  1987: "1987-01-29",
  1988: "1988-02-17",
  1989: "1989-02-06",
  1990: "1990-01-27",
  1991: "1991-02-15",
  1992: "1992-02-04",
  1993: "1993-01-23",
  1994: "1994-02-10",
  1995: "1995-01-31",
  1996: "1996-02-19",
  1997: "1997-02-07",
  1998: "1998-01-28",
  1999: "1999-02-16",
  2000: "2000-02-05",
  2001: "2001-01-24",
  2002: "2002-02-12",
  2003: "2003-02-01",
  2004: "2004-01-22",
  2005: "2005-02-09",
  2006: "2006-01-29",
  2007: "2007-02-18",
  2008: "2008-02-07",
  2009: "2009-01-26",
  2010: "2010-02-14",
  2011: "2011-02-03",
  2012: "2012-01-23",
  2013: "2013-02-10",
  2014: "2014-01-31",
  2015: "2015-02-19",
  2016: "2016-02-08",
  2017: "2017-01-28",
  2018: "2018-02-16",
  2019: "2019-02-05",
  2020: "2020-01-25",
  2021: "2021-02-12",
  2022: "2022-02-01",
  2023: "2023-01-22",
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-03",
  2031: "2031-01-23",
  2032: "2032-02-11",
  2033: "2033-01-31",
  2034: "2034-02-19",
  2035: "2035-02-08",
  2036: "2036-01-28",};

// Animal data by animalIndex = (zodiacYear - 4) mod 12.
export const ANIMALS = [
  { zh: "鼠", en: "Rat", branch: "子" },
  { zh: "牛", en: "Ox", branch: "丑" },
  { zh: "虎", en: "Tiger", branch: "寅" },
  { zh: "兔", en: "Rabbit", branch: "卯" },
  { zh: "龍", en: "Dragon", branch: "辰" },
  { zh: "蛇", en: "Snake", branch: "巳" },
  { zh: "馬", en: "Horse", branch: "午" },
  { zh: "羊", en: "Goat", branch: "未" },
  { zh: "猴", en: "Monkey", branch: "申" },
  { zh: "雞", en: "Rooster", branch: "酉" },
  { zh: "狗", en: "Dog", branch: "戌" },
  { zh: "豬", en: "Pig", branch: "亥" },
];

// Heavenly stems by stemIndex = (zodiacYear - 4) mod 10, with the
// element each stem pair maps to.
export const STEMS = [
  { zh: "甲", elementZh: "木", elementEn: "Wood" },
  { zh: "乙", elementZh: "木", elementEn: "Wood" },
  { zh: "丙", elementZh: "火", elementEn: "Fire" },
  { zh: "丁", elementZh: "火", elementEn: "Fire" },
  { zh: "戊", elementZh: "土", elementEn: "Earth" },
  { zh: "己", elementZh: "土", elementEn: "Earth" },
  { zh: "庚", elementZh: "金", elementEn: "Metal" },
  { zh: "辛", elementZh: "金", elementEn: "Metal" },
  { zh: "壬", elementZh: "水", elementEn: "Water" },
  { zh: "癸", elementZh: "水", elementEn: "Water" },
];

// Pinyin is a page-display cosmetic layer only; it never enters the
// core result object.
export const STEM_PINYIN = [
  "Jia",
  "Yi",
  "Bing",
  "Ding",
  "Wu",
  "Ji",
  "Geng",
  "Xin",
  "Ren",
  "Gui",
];
export const BRANCH_PINYIN = [
  "Zi",
  "Chou",
  "Yin",
  "Mao",
  "Chen",
  "Si",
  "Wu",
  "Wei",
  "Shen",
  "You",
  "Xu",
  "Hai",
];

const DATE_GRAMMAR = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function positiveMod(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

// Days from civil (Howard Hinnant's algorithm): an integer day count
// for a Gregorian date, with 1970-01-01 = 0. Pure integer arithmetic.
export function gregorianToDayNumber(year, month, day) {
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const monthPrime = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

// Inverse of gregorianToDayNumber.
export function dayNumberToGregorian(dayNumber) {
  const shifted = dayNumber + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime < 10 ? monthPrime + 3 : monthPrime - 9;
  return { year: month <= 2 ? year + 1 : year, month, day };
}

function formatGregorian({ year, month, day }) {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isRealGregorianDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  const limit = month === 2 && isLeapYear(year) ? 29 : MONTH_DAYS[month - 1];
  return day <= limit;
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// CNY day numbers, derived once from the literal table above.
const CNY_DAY_NUMBERS = {};
for (const [year, text] of Object.entries(CNY_DATES)) {
  const [y, m, d] = text.split("-").map(Number);
  CNY_DAY_NUMBERS[year] = gregorianToDayNumber(y, m, d);
}

// Input ranges (day numbers): birth 1960-01-01..2035-12-31; as-of
// 1960-01-01..2036-12-31.
const BIRTH_MIN_DAY = gregorianToDayNumber(1960, 1, 1);
const BIRTH_MAX_DAY = gregorianToDayNumber(2035, 12, 31);
const ASOF_MIN_DAY = gregorianToDayNumber(1960, 1, 1);
const ASOF_MAX_DAY = gregorianToDayNumber(2036, 12, 31);

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

// Validates and parses one date field. For an optional field, the
// empty string means "not provided" and yields { provided: false }
// after the capacity and Unicode checks. Returns either
// { error } or { provided, year, dayNumber }.
function parseField(raw, field, { required, minDay, maxDay }) {
  if (raw.length > MAX_RAW_UNITS[field]) return { error: failure("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(raw)) return { error: failure("UNICODE", field) };
  if (raw === "") {
    if (required) return { error: failure("EMPTY", field) };
    return { provided: false };
  }
  if (!DATE_GRAMMAR.test(raw)) return { error: failure("DATE_FORMAT", field) };
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  const day = Number(raw.slice(8, 10));
  if (!isRealGregorianDate(year, month, day)) {
    return { error: failure("DATE_INVALID", field) };
  }
  const dayNumber = gregorianToDayNumber(year, month, day);
  if (dayNumber < minDay || dayNumber > maxDay) {
    return { error: failure("OUT_OF_RANGE", field) };
  }
  return { provided: true, year, dayNumber };
}

// The zodiac year containing a date: the Gregorian year when the date
// is on/after that year's CNY, otherwise the previous year.
function zodiacYearOf({ year, dayNumber }) {
  return dayNumber >= CNY_DAY_NUMBERS[year] ? year : year - 1;
}

export function run(input) {
  // Schema: a plain object whose own enumerable keys are exactly
  // birthDate and asOfDate, each a data property holding a string.
  if (!isPlainObject(input)) return failure("SCHEMA", null);
  const keys = Object.keys(input);
  if (
    keys.length !== FIELDS.length ||
    !FIELDS.every((field) => keys.includes(field))
  ) {
    return failure("SCHEMA", null);
  }
  for (const field of FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !("value" in descriptor)) return failure("SCHEMA", field);
    if (typeof descriptor.value !== "string") return failure("SCHEMA", field);
  }

  // Field checks in field order, then check order.
  const birth = parseField(input.birthDate, "birthDate", {
    required: true,
    minDay: BIRTH_MIN_DAY,
    maxDay: BIRTH_MAX_DAY,
  });
  if (birth.error) return birth.error;
  const asOf = parseField(input.asOfDate, "asOfDate", {
    required: false,
    minDay: ASOF_MIN_DAY,
    maxDay: ASOF_MAX_DAY,
  });
  if (asOf.error) return asOf.error;

  const zodiacYear = zodiacYearOf(birth);
  const animalIndex = positiveMod(zodiacYear - 4, 12);
  const stemIndex = positiveMod(zodiacYear - 4, 10);
  const animal = ANIMALS[animalIndex];
  const stem = STEMS[stemIndex];

  const result = {
    zodiacYear,
    animalIndex,
    animalZh: animal.zh,
    animalEn: animal.en,
    branchZh: animal.branch,
    stemZh: stem.zh,
    elementZh: stem.elementZh,
    elementEn: stem.elementEn,
    ganzhiZh: `${stem.zh}${animal.branch}`,
    spanStart: CNY_DATES[zodiacYear],
    spanEnd: formatGregorian(
      dayNumberToGregorian(CNY_DAY_NUMBERS[zodiacYear + 1] - 1),
    ),
    cnyOfBirthYear: CNY_DATES[birth.year],
    beforeCny: birth.dayNumber < CNY_DAY_NUMBERS[birth.year],
    asOfZodiacYear: null,
    isBenMingNian: null,
    nextBenMingNianYear: null,
    nextBenMingNianStart: null,
  };

  if (asOf.provided) {
    const asOfZodiacYear = zodiacYearOf(asOf);
    const asOfAnimalIndex = positiveMod(asOfZodiacYear - 4, 12);
    const isBenMingNian = asOfAnimalIndex === animalIndex;
    const nextBenMingNianYear = isBenMingNian
      ? asOfZodiacYear + 12
      : asOfZodiacYear + positiveMod(animalIndex - asOfAnimalIndex, 12);
    result.asOfZodiacYear = asOfZodiacYear;
    result.isBenMingNian = isBenMingNian;
    result.nextBenMingNianYear = nextBenMingNianYear;
    result.nextBenMingNianStart =
      nextBenMingNianYear <= 2036 ? CNY_DATES[nextBenMingNianYear] : null;
  }

  return { ok: true, result };
}

// --- Report serialization -------------------------------------------
// Canonical JSON: compact, object keys sorted recursively by UTF-16
// code units, array order unchanged, exactly one trailing LF, UTF-8
// without BOM. A hand-written serializer guarantees the product's own
// toJSON is never invoked (hostile values are refused instead).

function serializeCanonical(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeCanonical(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new Error("accessor in report value");
      }
      return `${JSON.stringify(key)}:${serializeCanonical(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  const failureReport = {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  };
  if (!isPlainObject(result)) return failureReport;
  let text;
  try {
    text = `${serializeCanonical(result)}\n`;
  } catch {
    return failureReport;
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) return failureReport;
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
