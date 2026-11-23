// Pure core for the Golden Hour Calculator.
//
// Fixed contract: spec-golden-hour-calculator-20261121 (spec draft PR
// #396, registry rev 1827). NOAA fractional-year approximation with
// gamma evaluated at local noon (hour = 12), zenith angle 90.833
// degrees; golden hour is the span while the geometric solar
// elevation is between -4 and +6 degrees, blue hour between -6 and
// -4 degrees (PhotoPills convention). All derivation is IEEE-754
// double precision with no intermediate rounding, exactly as the
// SPEC's steps 1-13 prescribe. The core never reads a clock, the
// network, storage, or the DOM, and never uses Date or Intl, so the
// same input always yields the same result in any host timezone.

export const FIELDS = ["date", "latitude", "longitude", "utcOffset"];

export const FIELD_LIMITS = {
  date: 10,
  latitude: 12,
  longitude: 12,
  utcOffset: 6,
};

export const DEFAULTS = {
  date: "",
  latitude: "25.0330",
  longitude: "121.5654",
  utcOffset: "+08:00",
};

export const EXAMPLE = {
  date: "2026-06-21",
  latitude: "25.0330",
  longitude: "121.5654",
  utcOffset: "+08:00",
};

export const REPORT_FILENAME = "golden-hour-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

// ---------------------------------------------------------------------------
// Small helpers

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
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

// Reads one field as an own data property. Accessors are never invoked:
// a non-data descriptor (or a missing key) yields undefined here and the
// caller reports SCHEMA.
function readRawInput(source, field) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, field);
  if (descriptor === undefined || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

// The shape rule: input must be a plain object whose keys are a subset
// of FIELDS, with all four fields present as own string data
// properties. Every present value must be a string.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const keys = Object.keys(input);
  for (const key of keys) {
    if (!FIELDS.includes(key)) return null;
  }
  const snapshot = {};
  for (const field of FIELDS) {
    const value = readRawInput(input, field);
    if (typeof value !== "string") return null;
    snapshot[field] = value;
  }
  return snapshot;
}

// Per-field prelude, in the SPEC's order: capacity, then unpaired
// surrogate, then emptiness. Returns an error object or null.
function checkPrelude(field, value) {
  if (value.length > FIELD_LIMITS[field]) return failure("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(value)) return failure("UNICODE", field);
  if (value === "") return failure("EMPTY", field);
  return null;
}

// ---------------------------------------------------------------------------
// Field grammars. Each returns { value } or { error } (prelude already ran).

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_PATTERN = /^-?(0|[1-9]\d{0,2})(\.\d{1,4})?$/;
const OFFSET_PATTERN = /^[+-]\d{2}:\d{2}$/;
const OFFSET_MINUTES = new Set(["00", "15", "30", "45"]);

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

function dayOfYear(year, month, day) {
  let doy = day;
  for (let monthIndex = 1; monthIndex < month; monthIndex += 1) {
    doy += daysInMonth(year, monthIndex);
  }
  return doy;
}

function parseDate(text) {
  if (!DATE_PATTERN.test(text)) return { error: failure("DATE_FORMAT", "date") };
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(5, 7));
  const day = Number(text.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("DATE_FORMAT", "date") };
  }
  // Fixed YYYY-MM-DD shape, so lexicographic order is calendar order.
  if (text < "1900-01-01" || text > "2100-12-31") {
    return { error: failure("RANGE", "date") };
  }
  return { value: { year, month, day, doy: dayOfYear(year, month, day) } };
}

function parseDecimal(text, field, low, high) {
  if (!DECIMAL_PATTERN.test(text)) return { error: failure("DECIMAL_FORMAT", field) };
  const value = Number(text);
  if (value < low || value > high) return { error: failure("RANGE", field) };
  return { value };
}

function parseOffset(text) {
  if (!OFFSET_PATTERN.test(text)) return { error: failure("OFFSET_FORMAT", "utcOffset") };
  if (!OFFSET_MINUTES.has(text.slice(4, 6))) {
    return { error: failure("OFFSET_FORMAT", "utcOffset") };
  }
  const sign = text[0] === "-" ? -1 : 1;
  const minutes = sign * (Number(text.slice(1, 3)) * 60 + Number(text.slice(4, 6)));
  if (minutes < -720 || minutes > 840) return { error: failure("RANGE", "utcOffset") };
  return { value: minutes };
}

// ---------------------------------------------------------------------------
// Derivation (SPEC steps 1-13). No intermediate rounding.

const DEGREE = Math.PI / 180;
const ZENITH_DEGREES = 90.833;

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Converts an unrounded UTC minute value to a local clock reading:
// rounded = floor(raw + 0.5); dayOffset = floor(rounded / 1440);
// display = rounded - 1440 * dayOffset, formatted HH:MM.
function toLocalTime(rawUtcMinutes, utcOffsetMinutes) {
  const raw = rawUtcMinutes + utcOffsetMinutes;
  const rounded = Math.floor(raw + 0.5);
  const dayOffset = Math.floor(rounded / 1440);
  const displayMinutes = rounded - 1440 * dayOffset;
  return {
    time: `${pad2(Math.floor(displayMinutes / 60))}:${pad2(displayMinutes % 60)}`,
    dayOffset,
    raw,
  };
}

function makeWindow(startLocal, endLocal) {
  return {
    start: startLocal.time,
    startDayOffset: startLocal.dayOffset,
    end: endLocal.time,
    endDayOffset: endLocal.dayOffset,
    durationMinutes: Math.floor(endLocal.raw - startLocal.raw + 0.5),
  };
}

// ---------------------------------------------------------------------------
// run: validate a raw string snapshot and compute the golden/blue hours.

export function run(input) {
  const snapshot = readSchema(input);
  if (snapshot === null) return failure("SCHEMA", null);

  // Fields in the SPEC's order: date, latitude, longitude, utcOffset.
  // Per field: capacity, then surrogate, then EMPTY, then grammar,
  // then range. Only the first error is returned.
  const datePrelude = checkPrelude("date", snapshot.date);
  if (datePrelude !== null) return datePrelude;
  const parsedDate = parseDate(snapshot.date);
  if (parsedDate.error) return parsedDate.error;
  const { doy } = parsedDate.value;

  const latitudePrelude = checkPrelude("latitude", snapshot.latitude);
  if (latitudePrelude !== null) return latitudePrelude;
  const parsedLatitude = parseDecimal(snapshot.latitude, "latitude", -89.9, 89.9);
  if (parsedLatitude.error) return parsedLatitude.error;
  const latitude = parsedLatitude.value;

  const longitudePrelude = checkPrelude("longitude", snapshot.longitude);
  if (longitudePrelude !== null) return longitudePrelude;
  const parsedLongitude = parseDecimal(snapshot.longitude, "longitude", -180, 180);
  if (parsedLongitude.error) return parsedLongitude.error;
  const longitude = parsedLongitude.value;

  const offsetPrelude = checkPrelude("utcOffset", snapshot.utcOffset);
  if (offsetPrelude !== null) return offsetPrelude;
  const parsedOffset = parseOffset(snapshot.utcOffset);
  if (parsedOffset.error) return parsedOffset.error;
  const utcOffsetMinutes = parsedOffset.value;

  // Step 2: gamma at local noon (hour = 12, so the (hour-12)/24 term
  // is 0); denominator is always 365, leap years included.
  const gamma = (2 * Math.PI / 365) * (doy - 1);
  const cosGamma = Math.cos(gamma);
  const sinGamma = Math.sin(gamma);
  const cos2Gamma = Math.cos(2 * gamma);
  const sin2Gamma = Math.sin(2 * gamma);
  const cos3Gamma = Math.cos(3 * gamma);
  const sin3Gamma = Math.sin(3 * gamma);

  // Step 3: equation of time, minutes.
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * cosGamma -
      0.032077 * sinGamma -
      0.014615 * cos2Gamma -
      0.040849 * sin2Gamma);

  // Step 4: solar declination, radians.
  const decl =
    0.006918 -
    0.399912 * cosGamma +
    0.070257 * sinGamma -
    0.006758 * cos2Gamma +
    0.000907 * sin2Gamma -
    0.002697 * cos3Gamma +
    0.00148 * sin3Gamma;

  const phi = latitude * DEGREE;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinDecl = Math.sin(decl);
  const cosDecl = Math.cos(decl);

  // Step 10: solar noon elevation, degrees, half-up to 1 decimal.
  // Computed (and returned) for polar day and polar night as well.
  const declDegrees = decl / DEGREE;
  const noonElevationRaw = 90 - Math.abs(latitude - declDegrees);
  const noonElevation = Math.floor(noonElevationRaw * 10 + 0.5) / 10;

  // Step 5: sunrise/sunset hour angle from the 90.833-degree zenith.
  const cosHa =
    Math.cos(ZENITH_DEGREES * DEGREE) / (cosPhi * cosDecl) -
    Math.tan(phi) * Math.tan(decl);

  // Step 6: polar day / polar night. Times, day offsets and day length
  // are null; noon elevation and the windowStatus values are still returned.
  if (cosHa > 1 || cosHa < -1) {
    const polarStatus = cosHa > 1 ? "POLAR_NIGHT" : "POLAR_DAY";
    const polarWindowStatus = cosHa > 1 ? "SUN_NEVER_HIGH" : "SUN_NEVER_LOW";
    return {
      ok: true,
      result: {
        status: polarStatus,
        sunrise: null,
        sunriseDayOffset: null,
        solarNoon: null,
        solarNoonDayOffset: null,
        sunset: null,
        sunsetDayOffset: null,
        dayLengthMinutes: null,
        dayLength: null,
        utcOffsetMinutes,
        noonElevation,
        goldenMorning: null,
        goldenEvening: null,
        blueMorning: null,
        blueEvening: null,
        windowStatus: {
          goldenMorning: polarWindowStatus,
          goldenEvening: polarWindowStatus,
          blueMorning: polarWindowStatus,
          blueEvening: polarWindowStatus,
        },
      },
    };
  }

  // Step 7: hour angle and the three UTC minute values.
  const haDegrees = Math.acos(cosHa) / DEGREE;
  const sunriseUtc = 720 - 4 * (longitude + haDegrees) - eqtime;
  const solarNoonUtc = 720 - 4 * longitude - eqtime;
  const sunsetUtc = 720 - 4 * (longitude - haDegrees) - eqtime;

  // Step 8: local clock readings.
  const sunriseLocal = toLocalTime(sunriseUtc, utcOffsetMinutes);
  const solarNoonLocal = toLocalTime(solarNoonUtc, utcOffsetMinutes);
  const sunsetLocal = toLocalTime(sunsetUtc, utcOffsetMinutes);

  // Step 9: day length from the unrounded local values.
  const dayLengthMinutes = Math.floor(sunsetLocal.raw - sunriseLocal.raw + 0.5);
  const dayLength = `${Math.floor(dayLengthMinutes / 60)}:${pad2(dayLengthMinutes % 60)}`;

  // Step 11: hour angle for each target elevation. An angle has an
  // intersection exactly when |cosH| <= 1; the sign of the out-of-range
  // value is not needed for the windowStatus rule (step 12 keys only
  // on whether each bound has an intersection).
  function hourAngleForElevation(elevationDegrees) {
    const cosH =
      (Math.sin(elevationDegrees * DEGREE) - sinPhi * sinDecl) / (cosPhi * cosDecl);
    if (cosH > 1 || cosH < -1) return null;
    return Math.acos(cosH) / DEGREE;
  }

  const hourAngles = {
    6: hourAngleForElevation(6),
    "-4": hourAngleForElevation(-4),
    "-6": hourAngleForElevation(-6),
  };

  // Step 12: the four windows. The low bound is -4 for golden hour and
  // -6 for blue hour; the high bound is +6 for golden hour and -4 for
  // blue hour. A missing low bound reports SUN_NEVER_LOW, a present low
  // bound with a missing high bound reports SUN_NEVER_HIGH, and when
  // both bounds are missing the low bound rules (SUN_NEVER_LOW).
  // Morning windows run low -> high; evening windows run high -> low.
  function buildWindow(lowAngle, highAngle, morning) {
    const lowH = hourAngles[lowAngle];
    const highH = hourAngles[highAngle];
    if (lowH === null) return { value: null, status: "SUN_NEVER_LOW" };
    if (highH === null) return { value: null, status: "SUN_NEVER_HIGH" };
    let startLocal;
    let endLocal;
    if (morning) {
      startLocal = toLocalTime(solarNoonUtc - 4 * lowH, utcOffsetMinutes);
      endLocal = toLocalTime(solarNoonUtc - 4 * highH, utcOffsetMinutes);
    } else {
      startLocal = toLocalTime(solarNoonUtc + 4 * highH, utcOffsetMinutes);
      endLocal = toLocalTime(solarNoonUtc + 4 * lowH, utcOffsetMinutes);
    }
    return { value: makeWindow(startLocal, endLocal), status: "OK" };
  }

  const goldenMorning = buildWindow(-4, 6, true);
  const goldenEvening = buildWindow(-4, 6, false);
  const blueMorning = buildWindow(-6, -4, true);
  const blueEvening = buildWindow(-6, -4, false);

  return {
    ok: true,
    result: {
      status: "NORMAL",
      sunrise: sunriseLocal.time,
      sunriseDayOffset: sunriseLocal.dayOffset,
      solarNoon: solarNoonLocal.time,
      solarNoonDayOffset: solarNoonLocal.dayOffset,
      sunset: sunsetLocal.time,
      sunsetDayOffset: sunsetLocal.dayOffset,
      dayLengthMinutes,
      dayLength,
      utcOffsetMinutes,
      noonElevation,
      goldenMorning: goldenMorning.value,
      goldenEvening: goldenEvening.value,
      blueMorning: blueMorning.value,
      blueEvening: blueEvening.value,
      windowStatus: {
        goldenMorning: goldenMorning.status,
        goldenEvening: goldenEvening.status,
        blueMorning: blueMorning.status,
        blueEvening: blueEvening.status,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Canonical report serialization: compact JSON, object keys sorted
// ascending by UTF-16 code units recursively, array order unchanged,
// exactly one trailing LF. Built from primitives only — an input
// toJSON is never invoked.

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number in report");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts = keys.map((key) => `${JSON.stringify(key)}:${serializeValue(value[key])}`);
    return `{${parts.join(",")}}`;
  }
  throw new TypeError("unsupported value in report");
}

export function serializeReport(result) {
  return `${serializeValue(result)}\n`;
}
