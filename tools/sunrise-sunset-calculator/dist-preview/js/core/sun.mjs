// Pure core for the Sunrise & Sunset Calculator
// (spec-sunrise-sunset-calculator-20261109). Synchronous data-in /
// data-out only: no DOM, no network, no storage, no Date, and no host
// timezone reads — the result depends only on the input strings, so it
// is identical on every engine and in every timezone.
//
// The computation is the NOAA fractional-year approximation exactly as
// the SPEC pins it, all in IEEE-754 doubles with no intermediate
// rounding:
//   doy     = day of year (proleptic Gregorian)
//   gamma   = (2*pi/365) * (doy - 1)            (evaluated at local noon)
//   eqtime  = 229.18 * (0.000075 + 0.001868*cos(g) - 0.032077*sin(g)
//             - 0.014615*cos(2g) - 0.040849*sin(2g))            [minutes]
//   decl    = 0.006918 - 0.399912*cos(g) + 0.070257*sin(g)
//             - 0.006758*cos(2g) + 0.000907*sin(2g)
//             - 0.002697*cos(3g) + 0.00148*sin(3g)              [radians]
//   cosHa   = cos(90.833 deg) / (cos(phi)*cos(decl)) - tan(phi)*tan(decl)
//   cosHa > 1 -> POLAR_NIGHT, cosHa < -1 -> POLAR_DAY
//   sunrise UTC minutes = 720 - 4*(longitude + haDeg) - eqtime
//   noon    UTC minutes = 720 - 4*longitude - eqtime
//   sunset  UTC minutes = 720 - 4*(longitude - haDeg) - eqtime
// Local minutes add the fixed UTC offset; each time rounds once with
// floor(raw + 0.5), carries dayOffset = floor(rounded / 1440) in
// {-1, 0, 1}, and displays modulo 1440 as HH:MM. Day length comes from
// the unrounded local minutes, rounded once the same way.

export const FIELDS = ["date", "latitude", "longitude", "utcOffset"];

export const DEFAULTS = {
  date: "",
  latitude: "25.0330",
  longitude: "121.5654",
  utcOffset: "+08:00",
};

// The worked example is fixtures.json case 1 (taipei-summer-solstice)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  date: "2026-06-21",
  latitude: "25.0330",
  longitude: "121.5654",
  utcOffset: "+08:00",
};

// Per-field raw capacities in UTF-16 code units (SPEC inputsOutputs).
export const FIELD_LIMITS = { date: 10, latitude: 12, longitude: 12, utcOffset: 6 };

export const REPORT_FILENAME = "sunrise-sunset-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

// Grammar patterns. Date: fixed YYYY-MM-DD shape; calendar validity is
// checked separately and also reports DATE_FORMAT.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Decimal: optional "-", integer part "0" or non-zero-leading with at
// most 3 digits, optional fraction "." plus 1-4 digits. No "+", no
// whitespace, no exponent.
const DECIMAL_PATTERN = /^-?(0|[1-9]\d{0,2})(\.\d{1,4})?$/;
// Offset: sign, two-digit hour, colon, two-digit minute; the minute
// part must be a quarter hour, checked separately as OFFSET_FORMAT.
const OFFSET_PATTERN = /^[+-]\d{2}:\d{2}$/;
const QUARTER_MINUTES = new Set(["00", "15", "30", "45"]);

const LATITUDE_RANGE = [-89.9, 89.9];
const LONGITUDE_RANGE = [-180, 180];
const OFFSET_MINUTES_RANGE = [-720, 840];

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the four
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

// True when the string contains an unpaired UTF-16 surrogate.
function hasUnpairedSurrogate(value) {
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

// Per-field checks before grammar, in the SPEC's order: capacity, then
// unpaired surrogate, then empty. Returns an error object or null.
function checkPrelude(field, value) {
  if (value.length > FIELD_LIMITS[field]) return failure("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(value)) return failure("UNICODE", field);
  if (value.length === 0) return failure("EMPTY", field);
  return null;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year, month) {
  return month === 2 && isLeapYear(year) ? 29 : MONTH_DAYS[month - 1];
}

function dayOfYear(year, month, day) {
  let total = day;
  for (let m = 1; m < month; m += 1) total += daysInMonth(year, m);
  return total;
}

function validateDate(value) {
  const prelude = checkPrelude("date", value);
  if (prelude) return { error: prelude };
  if (!DATE_PATTERN.test(value)) return { error: failure("DATE_FORMAT", "date") };
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("DATE_FORMAT", "date") };
  }
  // Range 1900-01-01 .. 2100-12-31; the grammar fixes a four-digit
  // year, so the bounds reduce to the year plus the first/last day.
  if (year < 1900 || year > 2100) return { error: failure("RANGE", "date") };
  return { value: { year, month, day } };
}

function validateDecimal(field, value, range) {
  const prelude = checkPrelude(field, value);
  if (prelude) return { error: prelude };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const numeric = Number(value);
  if (numeric < range[0] || numeric > range[1]) return { error: failure("RANGE", field) };
  return { value: numeric };
}

function validateOffset(value) {
  const prelude = checkPrelude("utcOffset", value);
  if (prelude) return { error: prelude };
  if (!OFFSET_PATTERN.test(value) || !QUARTER_MINUTES.has(value.slice(4, 6))) {
    return { error: failure("OFFSET_FORMAT", "utcOffset") };
  }
  const sign = value.startsWith("-") ? -1 : 1;
  const minutes = sign * (Number(value.slice(1, 3)) * 60 + Number(value.slice(4, 6)));
  if (minutes < OFFSET_MINUTES_RANGE[0] || minutes > OFFSET_MINUTES_RANGE[1]) {
    return { error: failure("RANGE", "utcOffset") };
  }
  return { value: minutes };
}

function formatTimeOfDay(displayMinutes) {
  const hours = Math.floor(displayMinutes / 60);
  const minutes = displayMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Rounds one unrounded local-minute value exactly as the SPEC pins:
// rounded = floor(raw + 0.5), dayOffset = floor(rounded / 1440), the
// displayed minute is rounded modulo 1440.
function placeTime(rawLocalMinutes) {
  const rounded = Math.floor(rawLocalMinutes + 0.5);
  const dayOffset = Math.floor(rounded / 1440);
  return { text: formatTimeOfDay(rounded - 1440 * dayOffset), dayOffset };
}

function compute({ year, month, day }, latitude, longitude, offsetMinutes) {
  const doy = dayOfYear(year, month, day);
  const gamma = ((2 * Math.PI) / 365) * (doy - 1);
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const phi = (latitude * Math.PI) / 180;
  const cosHa =
    Math.cos((90.833 * Math.PI) / 180) / (Math.cos(phi) * Math.cos(decl)) -
    Math.tan(phi) * Math.tan(decl);

  if (cosHa > 1 || cosHa < -1) {
    return {
      status: cosHa > 1 ? "POLAR_NIGHT" : "POLAR_DAY",
      sunrise: null,
      sunriseDayOffset: null,
      solarNoon: null,
      solarNoonDayOffset: null,
      sunset: null,
      sunsetDayOffset: null,
      dayLengthMinutes: null,
      dayLength: null,
      utcOffsetMinutes: offsetMinutes,
    };
  }

  const haDeg = (Math.acos(cosHa) * 180) / Math.PI;
  const sunriseRaw = 720 - 4 * (longitude + haDeg) - eqtime + offsetMinutes;
  const noonRaw = 720 - 4 * longitude - eqtime + offsetMinutes;
  const sunsetRaw = 720 - 4 * (longitude - haDeg) - eqtime + offsetMinutes;
  const sunrise = placeTime(sunriseRaw);
  const solarNoon = placeTime(noonRaw);
  const sunset = placeTime(sunsetRaw);
  const dayLengthMinutes = Math.floor(sunsetRaw - sunriseRaw + 0.5);
  return {
    status: "NORMAL",
    sunrise: sunrise.text,
    sunriseDayOffset: sunrise.dayOffset,
    solarNoon: solarNoon.text,
    solarNoonDayOffset: solarNoon.dayOffset,
    sunset: sunset.text,
    sunsetDayOffset: sunset.dayOffset,
    dayLengthMinutes,
    dayLength: `${Math.floor(dayLengthMinutes / 60)}:${String(dayLengthMinutes % 60).padStart(2, "0")}`,
    utcOffsetMinutes: offsetMinutes,
  };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Validation order is fixed: SCHEMA first, then field by field in
  // the order date, latitude, longitude, utcOffset; only the first
  // error is reported.
  const date = validateDate(raw.date);
  if (date.error) return date.error;
  const latitude = validateDecimal("latitude", raw.latitude, LATITUDE_RANGE);
  if (latitude.error) return latitude.error;
  const longitude = validateDecimal("longitude", raw.longitude, LONGITUDE_RANGE);
  if (longitude.error) return longitude.error;
  const offset = validateOffset(raw.utcOffset);
  if (offset.error) return offset.error;

  return {
    ok: true,
    result: compute(date.value, latitude.value, longitude.value, offset.value),
  };
}

// Canonical report serialization (SPEC inputsOutputs): the result as
// compact JSON, object own keys sorted ascending by UTF-16 code units
// recursively, array order unchanged, one trailing LF, UTF-8 no BOM.
// Built field by field from primitives: the input's toJSON is never
// invoked and no input string reaches the output unescaped.
export function serializeReport(result) {
  return `${serializeValue(result)}\n`;
}

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  const keys = Object.keys(value).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${serializeValue(value[key])}`);
  return `{${parts.join(",")}}`;
}
