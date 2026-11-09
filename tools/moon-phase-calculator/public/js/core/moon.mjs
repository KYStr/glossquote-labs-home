// Pure core for the Moon Phase Calculator
// (spec-moon-phase-calculator-20261109). Synchronous data-in /
// data-out only: no DOM, no network, no storage, and no Date object —
// calendar arithmetic uses the SPEC's integer Julian-day algorithms
// (Fliegel & Van Flandern forward, Richards inverse), so results never
// depend on the host timezone.
//
// Fixed model (SPEC inputsOutputs):
//   S       = 29.530588853 days (average synodic month)
//   JD_REF  = 2451550.1 (reference new moon; the constant itself is
//             authoritative, not any clock-time label for it)
//   Evaluation instant is the input date at 12:00 UTC, i.e. JD = JDN.
//   age     = (JD - JD_REF) mod S            in [0, S), positive modulo
//   index   = floor(((age + S/16) mod S) / (S/8)) mod 8
//   illum   = (1 - cos(2*pi*age/S)) / 2 * 100
//   toNew   = (S - age) mod S;  toFull = (S/2 - age) mod S
//   Event dates come from the UNROUNDED event JD; the local date adds
//   utcOffset minutes / 1440 first. Display values are rounded half-up
//   to one decimal exactly once, from the unrounded values.

export const FIELDS = ["date", "utcOffset"];

export const DEFAULTS = { date: "", utcOffset: "+08:00" };

// The worked example is fixtures.json case 1 (reference-epoch) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { date: "2000-01-06", utcOffset: "+08:00" };

export const SYNODIC_MONTH = 29.530588853;
export const REFERENCE_JD = 2451550.1;

export const PHASES = [
  { zh: "新月", en: "New Moon" },
  { zh: "眉月", en: "Waxing Crescent" },
  { zh: "上弦月", en: "First Quarter" },
  { zh: "盈凸月", en: "Waxing Gibbous" },
  { zh: "滿月", en: "Full Moon" },
  { zh: "虧凸月", en: "Waning Gibbous" },
  { zh: "下弦月", en: "Last Quarter" },
  { zh: "殘月", en: "Waning Crescent" },
];

// Per-field raw capacity in UTF-16 code units (SPEC inputsOutputs).
export const MAX_RAW_UNITS = { date: 10, utcOffset: 6 };

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const OFFSET_PATTERN = /^[+-][0-9]{2}:[0-9]{2}$/;

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

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Per-field checks the SPEC pins ahead of grammar, in order:
// capacity INPUT_LIMIT, unpaired surrogate UNICODE, empty EMPTY.
// Returns the pinned error code, or null.
function preGrammarError(field, value) {
  if (value.length > MAX_RAW_UNITS[field]) return "INPUT_LIMIT";
  if (hasUnpairedSurrogate(value)) return "UNICODE";
  if (value.length === 0) return "EMPTY";
  return null;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

// Fliegel & Van Flandern integer JDN (SPEC step 1). Pure integer
// arithmetic; every division operand is positive here.
export function dateToJdn(year, month, day) {
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

export const MIN_JDN = dateToJdn(1900, 1, 1);
export const MAX_JDN = dateToJdn(2100, 12, 31);

// Richards integer inverse (SPEC step 6): JDN -> Gregorian fields.
function jdnToDate(jdn) {
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

function formatDate({ year, month, day }) {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Mathematical positive modulo: result in [0, modulus).
function positiveModulo(value, modulus) {
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder;
}

// Round half-up to one decimal, applied once to an unrounded value.
// All display values here are non-negative, so floor(x*10 + 0.5) is
// the pinned half-up rule.
function roundHalfUp1(value) {
  return Math.floor(value * 10 + 0.5) / 10;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Field order is fixed: date first, then utcOffset (SPEC).
  const datePre = preGrammarError("date", raw.date);
  if (datePre !== null) return failure(datePre, "date");
  if (!DATE_PATTERN.test(raw.date)) return failure("DATE_FORMAT", "date");
  const year = Number(raw.date.slice(0, 4));
  const month = Number(raw.date.slice(5, 7));
  const day = Number(raw.date.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return failure("INVALID_DATE", "date");
  }
  const julianDay = dateToJdn(year, month, day);
  if (julianDay < MIN_JDN || julianDay > MAX_JDN) return failure("RANGE", "date");

  const offsetPre = preGrammarError("utcOffset", raw.utcOffset);
  if (offsetPre !== null) return failure(offsetPre, "utcOffset");
  if (!OFFSET_PATTERN.test(raw.utcOffset)) return failure("OFFSET_FORMAT", "utcOffset");
  const offsetSign = raw.utcOffset.startsWith("-") ? -1 : 1;
  const offsetMinutes =
    offsetSign * (Number(raw.utcOffset.slice(1, 3)) * 60 + Number(raw.utcOffset.slice(4, 6)));
  const offsetMinutePart = Number(raw.utcOffset.slice(4, 6));
  if (offsetMinutePart % 15 !== 0 || offsetMinutes < -720 || offsetMinutes > 840) {
    return failure("RANGE", "utcOffset");
  }

  const age = positiveModulo(julianDay - REFERENCE_JD, SYNODIC_MONTH);
  const phaseIndex =
    Math.floor(positiveModulo(age + SYNODIC_MONTH / 16, SYNODIC_MONTH) / (SYNODIC_MONTH / 8)) % 8;
  const illumination = ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2) * 100;
  const daysToNew = positiveModulo(SYNODIC_MONTH - age, SYNODIC_MONTH);
  const daysToFull = positiveModulo(SYNODIC_MONTH / 2 - age, SYNODIC_MONTH);

  // Event dates come from the unrounded event moments (SPEC step 6).
  const eventDate = (eventJd, extraMinutes) =>
    formatDate(jdnToDate(Math.floor(eventJd + extraMinutes / 1440 + 0.5)));
  const newEventJd = julianDay + daysToNew;
  const fullEventJd = julianDay + daysToFull;

  return {
    ok: true,
    result: {
      julianDay,
      ageDays: roundHalfUp1(age),
      phaseIndex,
      phaseZh: PHASES[phaseIndex].zh,
      phaseEn: PHASES[phaseIndex].en,
      illuminationPercent: roundHalfUp1(illumination),
      daysToNextNewMoon: roundHalfUp1(daysToNew),
      nextNewMoonDate: eventDate(newEventJd, 0),
      nextNewMoonDateLocal: eventDate(newEventJd, offsetMinutes),
      daysToNextFullMoon: roundHalfUp1(daysToFull),
      nextFullMoonDate: eventDate(fullEventJd, 0),
      nextFullMoonDateLocal: eventDate(fullEventJd, offsetMinutes),
    },
  };
}

// Fixed report download: moon-phase-report.json. The content is the
// result's compact JSON with object keys sorted recursively by UTF-16
// code units, array order unchanged, exactly one trailing LF, UTF-8
// without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, finite numbers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "moon-phase-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("report values must be finite");
    return JSON.stringify(value);
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
