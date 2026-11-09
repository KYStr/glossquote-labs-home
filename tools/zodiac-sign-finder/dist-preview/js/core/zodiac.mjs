// Pure core for the Zodiac Sign Finder.
//
// Synchronous, dependency-free data transformation implementing
// docs/specs/zodiac-sign-finder/SPEC.md (spec-zodiac-sign-finder-20261109):
// strict schema and per-field validation in the SPEC's fixed order, a
// cross-field date-existence check (Gregorian leap rule), lookup in the
// fixed tropical zodiac table by integer md = month * 100 + day, and the
// cusp rule. No DOM, no network, no storage, no Date, no imports: the
// same bytes are embedded into the page's module Worker at build time
// and imported directly by the tests.

export const LIMITS = Object.freeze({
  FIELD_MAX_UTF16: 8,
  REPORT_MAX_BYTES: 2097152,
});

/**
 * The fixed tropical zodiac table, in cycle order starting at Aries.
 * startMd/endMd are month * 100 + day integers; Capricorn wraps the
 * year end (startMd 1222 > endMd 119) and is matched with OR instead
 * of AND. Element/modality are the SPEC's machine values.
 */
export const SIGNS = Object.freeze([
  Object.freeze({ sign: "aries", symbol: "♈", startMonth: 3, startDay: 21, endMonth: 4, endDay: 19, startMd: 321, endMd: 419, element: "fire", modality: "cardinal" }),
  Object.freeze({ sign: "taurus", symbol: "♉", startMonth: 4, startDay: 20, endMonth: 5, endDay: 20, startMd: 420, endMd: 520, element: "earth", modality: "fixed" }),
  Object.freeze({ sign: "gemini", symbol: "♊", startMonth: 5, startDay: 21, endMonth: 6, endDay: 20, startMd: 521, endMd: 620, element: "air", modality: "mutable" }),
  Object.freeze({ sign: "cancer", symbol: "♋", startMonth: 6, startDay: 21, endMonth: 7, endDay: 22, startMd: 621, endMd: 722, element: "water", modality: "cardinal" }),
  Object.freeze({ sign: "leo", symbol: "♌", startMonth: 7, startDay: 23, endMonth: 8, endDay: 22, startMd: 723, endMd: 822, element: "fire", modality: "fixed" }),
  Object.freeze({ sign: "virgo", symbol: "♍", startMonth: 8, startDay: 23, endMonth: 9, endDay: 22, startMd: 823, endMd: 922, element: "earth", modality: "mutable" }),
  Object.freeze({ sign: "libra", symbol: "♎", startMonth: 9, startDay: 23, endMonth: 10, endDay: 22, startMd: 923, endMd: 1022, element: "air", modality: "cardinal" }),
  Object.freeze({ sign: "scorpio", symbol: "♏", startMonth: 10, startDay: 23, endMonth: 11, endDay: 21, startMd: 1023, endMd: 1121, element: "water", modality: "fixed" }),
  Object.freeze({ sign: "sagittarius", symbol: "♐", startMonth: 11, startDay: 22, endMonth: 12, endDay: 21, startMd: 1122, endMd: 1221, element: "fire", modality: "mutable" }),
  Object.freeze({ sign: "capricorn", symbol: "♑", startMonth: 12, startDay: 22, endMonth: 1, endDay: 19, startMd: 1222, endMd: 119, element: "earth", modality: "cardinal" }),
  Object.freeze({ sign: "aquarius", symbol: "♒", startMonth: 1, startDay: 20, endMonth: 2, endDay: 18, startMd: 120, endMd: 218, element: "air", modality: "fixed" }),
  Object.freeze({ sign: "pisces", symbol: "♓", startMonth: 2, startDay: 19, endMonth: 3, endDay: 20, startMd: 219, endMd: 320, element: "water", modality: "mutable" }),
]);

/** Display names per sign (SPEC table: 中文 / English). */
export const SIGN_NAMES = Object.freeze({
  aries: Object.freeze({ zh: "牡羊座", en: "Aries" }),
  taurus: Object.freeze({ zh: "金牛座", en: "Taurus" }),
  gemini: Object.freeze({ zh: "雙子座", en: "Gemini" }),
  cancer: Object.freeze({ zh: "巨蟹座", en: "Cancer" }),
  leo: Object.freeze({ zh: "獅子座", en: "Leo" }),
  virgo: Object.freeze({ zh: "處女座", en: "Virgo" }),
  libra: Object.freeze({ zh: "天秤座", en: "Libra" }),
  scorpio: Object.freeze({ zh: "天蠍座", en: "Scorpio" }),
  sagittarius: Object.freeze({ zh: "射手座", en: "Sagittarius" }),
  capricorn: Object.freeze({ zh: "摩羯座", en: "Capricorn" }),
  aquarius: Object.freeze({ zh: "水瓶座", en: "Aquarius" }),
  pisces: Object.freeze({ zh: "雙魚座", en: "Pisces" }),
});

/** Element display strings (SPEC: fire=火象／Fire, ...). */
export const ELEMENT_LABELS = Object.freeze({
  fire: Object.freeze({ zh: "火象", en: "Fire" }),
  earth: Object.freeze({ zh: "土象", en: "Earth" }),
  air: Object.freeze({ zh: "風象", en: "Air" }),
  water: Object.freeze({ zh: "水象", en: "Water" }),
});

/** Modality display strings (SPEC: cardinal=基本／Cardinal, ...). */
export const MODALITY_LABELS = Object.freeze({
  cardinal: Object.freeze({ zh: "基本", en: "Cardinal" }),
  fixed: Object.freeze({ zh: "固定", en: "Fixed" }),
  mutable: Object.freeze({ zh: "變動", en: "Mutable" }),
});

/** English month abbreviations for range display (Jan–Dec). */
export const MONTH_ABBR_EN = Object.freeze([
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]);

const FIELDS = Object.freeze(["month", "day", "year"]);
const RANGES = Object.freeze({
  month: Object.freeze([1, 12]),
  day: Object.freeze([1, 31]),
  year: Object.freeze([1, 9999]),
});
// Days per month for a common year; February gains a day in leap
// years and when no year was given (SPEC inputsOutputs step 2).
const DAYS_IN_MONTH = Object.freeze([
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
]);
// ASCII decimal integer grammar: "0", or a non-zero digit followed by
// any digits. No whitespace, sign, decimal point, or exponent.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isLeapYear(year) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

/**
 * Validate the input and look up the zodiac sign.
 *
 * Input: a plain object with exactly the string fields month, day,
 * year (year may be "" for "not provided"). Returns { ok: true,
 * result } or { ok: false, error: { code, field, row: null } }.
 * Validation order is the SPEC's: whole-input SCHEMA first, then
 * per-field checks in the order month, day, year (each: INPUT_LIMIT,
 * UNICODE, EMPTY — skipped for year — INTEGER_FORMAT, RANGE), then
 * the cross-field DATE_INVALID existence check.
 */
export function run(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return fail("SCHEMA", null);
  }
  const keys = Object.keys(input);
  if (
    keys.length !== FIELDS.length ||
    !FIELDS.every((field) => Object.prototype.hasOwnProperty.call(input, field))
  ) {
    return fail("SCHEMA", null);
  }
  // Read own data properties only; accessors and non-strings are SCHEMA.
  const raw = {};
  for (const field of FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      return fail("SCHEMA", null);
    }
    raw[field] = descriptor.value;
  }

  const parsed = {};
  for (const field of FIELDS) {
    const text = raw[field];
    if (text.length > LIMITS.FIELD_MAX_UTF16) return fail("INPUT_LIMIT", field);
    if (hasUnpairedSurrogate(text)) return fail("UNICODE", field);
    if (field !== "year" && text === "") return fail("EMPTY", field);
    if (text === "") {
      parsed[field] = null; // year not provided
      continue;
    }
    if (!INTEGER_PATTERN.test(text)) return fail("INTEGER_FORMAT", field);
    const value = Number(text);
    const [min, max] = RANGES[field];
    if (value < min || value > max) return fail("RANGE", field);
    parsed[field] = value;
  }

  const februaryDays =
    parsed.year === null || isLeapYear(parsed.year) ? 29 : 28;
  const daysInMonth =
    parsed.month === 2 ? februaryDays : DAYS_IN_MONTH[parsed.month - 1];
  if (parsed.day > daysInMonth) return fail("DATE_INVALID", "day");

  const md = parsed.month * 100 + parsed.day;
  let index = -1;
  for (let i = 0; i < SIGNS.length; i += 1) {
    const row = SIGNS[i];
    const hit =
      row.sign === "capricorn"
        ? md >= row.startMd || md <= row.endMd
        : md >= row.startMd && md <= row.endMd;
    if (hit) {
      index = i;
      break;
    }
  }
  const row = SIGNS[index];
  const atStart = md === row.startMd;
  const atEnd = md === row.endMd;
  const cusp = atStart || atEnd;
  const cuspNeighbor = atStart
    ? SIGNS[(index + SIGNS.length - 1) % SIGNS.length].sign
    : atEnd
      ? SIGNS[(index + 1) % SIGNS.length].sign
      : null;

  return {
    ok: true,
    result: {
      sign: row.sign,
      symbol: row.symbol,
      element: row.element,
      modality: row.modality,
      rangeStart: { month: row.startMonth, day: row.startDay },
      rangeEnd: { month: row.endMonth, day: row.endDay },
      cusp,
      cuspNeighbor,
    },
  };
}

/**
 * Canonical JSON: compact, object own keys sorted by UTF-16 code unit
 * ascending recursively, array order unchanged. Strings use JSON
 * literal escaping; the input's toJSON is never consulted.
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
  );
  return `{${parts.join(",")}}`;
}

/**
 * Serialize a result into the fixed report bytes for
 * zodiac-sign-report.json: compact canonical JSON plus exactly one
 * trailing LF, UTF-8, no BOM. Returns { ok: true, text, bytes } or
 * { ok: false, error } with OUTPUT_LIMIT above the SPEC's cap.
 */
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > LIMITS.REPORT_MAX_BYTES) {
    return fail("OUTPUT_LIMIT", null);
  }
  return { ok: true, text, bytes };
}
