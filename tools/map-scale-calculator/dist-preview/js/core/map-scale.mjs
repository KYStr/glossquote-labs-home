// Pure core for the Map Scale Calculator
// (spec-map-scale-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// SPEC rules implemented here:
// - Validation order per field: capacity (INPUT_LIMIT, raw > 12
//   units) -> unpaired surrogate (UNICODE) -> empty (EMPTY) ->
//   grammar (scale INTEGER_FORMAT, distances DECIMAL_FORMAT) ->
//   range (RANGE). Fields are validated in the order mode, scale,
//   realUnit (reverse only), mapCm (forward) / realValue (reverse).
// - scale: ASCII decimal integer string, "0" or non-zero leading,
//   range 1-10,000,000. "0" passes grammar and fails RANGE.
// - Distances: ASCII digits with an optional single decimal point,
//   at least one digit on each side of the point, at most 3 decimal
//   places, no sign / space / exponent. mapCm range 0.01-10,000 cm;
//   realValue range 0.01-1,000,000 m or 0.01-1,000 km by realUnit.
// - All arithmetic is exact integer (BigInt) rational arithmetic on
//   milli-units (thousandths); binary floating point is never used.
// - Rounding only at output, half-up: realMeters 2 decimals,
//   realKilometers 3 decimals, reverse-computed mapCentimeters 2
//   decimals. Forward mapCentimeters is the input echoed back,
//   normalized (trailing zeros trimmed), not re-rounded. The
//   primary unit is decided on the exact unrounded metres:
//   forward < 1000 m is "m", >= 1000 m is "km"; reverse is "cm".
// - Reverse realMeters / realKilometers follow the SPEC point-3
//   output rounding (2 / 3 decimals, half-up, then trailing zeros
//   trimmed). The SPEC point-4 wording ("正規化值") is ambiguous
//   against this for 3-decimal metre inputs (for example 12.345 m
//   -> realMeters "12.35", realKilometers "0.012" under the point-3
//   reading, versus "12.345" / "0.012345" under an exact-conversion
//   reading); the implementation follows point 3, the only place
//   that pins the rounding, and records the tension as a
//   spec-errata candidate in HANDOFF.md.
// - The common-scales table is derived from the 1:N definition
//   only: 1 cm on the map = N cm = N/100 m in reality; 1 km in
//   reality = 100,000 cm, so map cm = 100,000/N.

export const ALLOWED_FIELDS = ["mode", "scale", "mapCm", "realValue", "realUnit"];

export const DEFAULTS = {
  mode: "map-to-real",
  scale: "25000",
  mapCm: "4",
  realValue: "1",
  realUnit: "km",
};

// The worked example is fixtures.json case 1 (forward-25000-basic)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { mapCm: "4", mode: "map-to-real", scale: "25000" };

export const MAX_RAW_UNITS = 12;

export const SCALE_MIN = 1;
export const SCALE_MAX = 10000000;

// Distance ranges, in milli-units (thousandths of the input unit).
export const MAP_CM_MIN_MILLI = 10n;
export const MAP_CM_MAX_MILLI = 10000000n;
export const REAL_M_MIN_MILLI = 10n;
export const REAL_M_MAX_MILLI = 1000000000n;
export const REAL_KM_MIN_MILLI = 10n;
export const REAL_KM_MAX_MILLI = 1000000n;

// Pinned common-scales table (SPEC inputsOutputs). metersPerCm is
// the exact real metres for 1 cm on the map (N/100); cmPerKm is the
// exact map centimetres for 1 real kilometre (100,000/N). Values
// are decimal strings so the table carries no binary float.
export const COMMON_SCALES = [
  { scale: 1000, metersPerCm: "10", cmPerKm: "100" },
  { scale: 5000, metersPerCm: "50", cmPerKm: "20" },
  { scale: 10000, metersPerCm: "100", cmPerKm: "10" },
  { scale: 25000, metersPerCm: "250", cmPerKm: "4" },
  { scale: 50000, metersPerCm: "500", cmPerKm: "2" },
  { scale: 100000, metersPerCm: "1000", cmPerKm: "1" },
  { scale: 200000, metersPerCm: "2000", cmPerKm: "0.5" },
];

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]{1,3})?$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

// Reads one own-data string field without invoking accessors.
// Returns the string, or null when the field is absent, an accessor,
// or not a string.
function readOwnString(input, field) {
  const descriptor = Object.getOwnPropertyDescriptor(input, field);
  if (descriptor === undefined || !("value" in descriptor)) return null;
  if (typeof descriptor.value !== "string") return null;
  return descriptor.value;
}

// Per-field validation in the SPEC order: capacity, unpaired
// surrogate, empty, grammar, range. `parse` converts a
// grammar-valid string to its exact value; `checkRange` reports
// whether that value is in range. Returns { value } or { error }.
function validateField(field, value, pattern, code, parse, checkRange) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!pattern.test(value)) return { error: failure(code, field) };
  const parsed = parse(value);
  if (!checkRange(parsed)) return { error: failure("RANGE", field) };
  return { value: parsed };
}

// Parses a grammar-valid decimal string ("12", "2.5", "0.010")
// into exact milli-units (thousandths) as a BigInt.
function parseDecimalMilli(value) {
  const dot = value.indexOf(".");
  const intPart = dot === -1 ? value : value.slice(0, dot);
  const fracPart = dot === -1 ? "" : value.slice(dot + 1);
  return BigInt(intPart) * 1000n + BigInt(fracPart.padEnd(3, "0") || "0");
}

// Half-up rounding of a non-negative rational numerator/denominator
// to the nearest integer: floor(n/d + 1/2).
function roundDivHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Formats an integer scaled value: `scaled` counts units of
// 10^-places. Trailing zeros are trimmed ("1000", "1.25", "0.309").
function formatScaled(scaled, places) {
  const unit = 10n ** BigInt(places);
  const whole = scaled / unit;
  let frac = (scaled % unit).toString().padStart(places, "0");
  while (frac.endsWith("0")) frac = frac.slice(0, -1);
  return frac === "" ? whole.toString() : `${whole.toString()}.${frac}`;
}

// Formats exact milli-units (thousandths) with trailing zeros
// trimmed. Used for echoed / exactly-converted values.
function formatMilli(milli) {
  return formatScaled(milli, 3);
}

export function run(input) {
  if (!isPlainObject(input)) return failure("SCHEMA", null);
  const keys = Object.keys(input);
  for (const key of keys) {
    if (!ALLOWED_FIELDS.includes(key)) return failure("SCHEMA", null);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) return failure("SCHEMA", null);
  }

  // mode first: any other value (including a missing or non-string
  // mode) is SCHEMA with field "mode".
  const mode = readOwnString(input, "mode");
  if (mode !== "map-to-real" && mode !== "real-to-map") return failure("SCHEMA", "mode");

  // scale second.
  const scaleRaw = readOwnString(input, "scale");
  if (scaleRaw === null) return failure("SCHEMA", null);
  const scaleOutcome = validateField(
    "scale",
    scaleRaw,
    INTEGER_PATTERN,
    "INTEGER_FORMAT",
    (value) => BigInt(value),
    (parsed) => parsed >= BigInt(SCALE_MIN) && parsed <= BigInt(SCALE_MAX),
  );
  if (scaleOutcome.error) return scaleOutcome.error;
  const scale = scaleOutcome.value;

  if (mode === "map-to-real") {
    const mapRaw = readOwnString(input, "mapCm");
    if (mapRaw === null) return failure("SCHEMA", null);
    const mapOutcome = validateField(
      "mapCm",
      mapRaw,
      DECIMAL_PATTERN,
      "DECIMAL_FORMAT",
      parseDecimalMilli,
      (milli) => milli >= MAP_CM_MIN_MILLI && milli <= MAP_CM_MAX_MILLI,
    );
    if (mapOutcome.error) return mapOutcome.error;
    const mapMilli = mapOutcome.value;

    // Exact real metres = mapMilli * N / 100000.
    // realMeters (2 dp): hundredths = round(mapMilli * N / 1000).
    // realKilometers (3 dp): thousandths = round(mapMilli * N / 100000).
    const realMetersHundredths = roundDivHalfUp(mapMilli * scale, 1000n);
    const realKmThousandths = roundDivHalfUp(mapMilli * scale, 100000n);
    // Primary unit on the exact unrounded metres: < 1000 m is "m".
    const primaryUnit = mapMilli * scale < 100000000n ? "m" : "km";
    return {
      ok: true,
      result: {
        mode,
        scale: Number(scale),
        mapCentimeters: formatMilli(mapMilli),
        realMeters: formatScaled(realMetersHundredths, 2),
        realKilometers: formatScaled(realKmThousandths, 3),
        primaryUnit,
      },
    };
  }

  // real-to-map: realUnit, then realValue.
  const realUnit = readOwnString(input, "realUnit");
  if (realUnit !== "m" && realUnit !== "km") return failure("SCHEMA", "realUnit");
  const realRaw = readOwnString(input, "realValue");
  if (realRaw === null) return failure("SCHEMA", null);
  const [minMilli, maxMilli] =
    realUnit === "m" ? [REAL_M_MIN_MILLI, REAL_M_MAX_MILLI] : [REAL_KM_MIN_MILLI, REAL_KM_MAX_MILLI];
  const realOutcome = validateField(
    "realValue",
    realRaw,
    DECIMAL_PATTERN,
    "DECIMAL_FORMAT",
    parseDecimalMilli,
    (milli) => milli >= minMilli && milli <= maxMilli,
  );
  if (realOutcome.error) return realOutcome.error;
  const realMilli = realOutcome.value;

  let realMetersHundredths;
  let realKmThousandths;
  let mapHundredths;
  if (realUnit === "m") {
    // metres = realMilli / 1000; kilometres = realMilli / 1000000.
    realMetersHundredths = roundDivHalfUp(realMilli, 10n);
    realKmThousandths = roundDivHalfUp(realMilli, 1000n);
    // Map cm = (realMilli / 10) / N; hundredths = realMilli * 10 / N.
    mapHundredths = roundDivHalfUp(realMilli * 10n, scale);
  } else {
    // 1 milli-km is exactly 1 m; kilometres = realMilli / 1000.
    realMetersHundredths = realMilli * 100n;
    realKmThousandths = realMilli;
    // Map cm = realMilli * 100 / N; hundredths = realMilli * 10000 / N.
    mapHundredths = roundDivHalfUp(realMilli * 10000n, scale);
  }
  return {
    ok: true,
    result: {
      mode,
      scale: Number(scale),
      mapCentimeters: formatScaled(mapHundredths, 2),
      realMeters: formatScaled(realMetersHundredths, 2),
      realKilometers: formatScaled(realKmThousandths, 3),
      primaryUnit: "cm",
    },
  };
}

// Fixed report download: map-scale-report.json. The content is the
// result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "map-scale-report.json";
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
