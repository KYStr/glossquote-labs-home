// Bike Frame Size Calculator — pure core.
// Exact integer arithmetic in units of 1e-4 cm (BigInt); no floating-point
// math on operands or results (string lengths and indexes excepted), per
// SPEC. run(input) is a synchronous pure data transform:
//   input  {heightCm, inseamCm, bikeType} — decimal strings (at most one
//            decimal place) plus the bike type, exact own data properties.
//   output {ok:true, result:{bikeType, heightCm, inseamCm, centreCm,
//            centreIn, rangeCm:{low,high}, rangeIn:{low,high}, letter,
//            saddleHeightCm, warning}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
// Formulas (SPEC §4, Guimard family, pinned): road centre = inseam x 0.67,
// hybrid centre = inseam x 0.64, mountain centre = road centre - 11 cm,
// saddle height (LeMond) = inseam x 0.883, 1 in = 2.54 cm exact. The
// recommended range is centre +/- 1.0 cm; the inch figures are arithmetic
// conversions of the centimetre figures, not shop labels. The letter size
// comes from height alone (half-open intervals). The inseam/height ratio
// warns outside [0.40, 0.50] inclusive, on the exact ratio, without
// blocking the result.

export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 220;
export const INSEAM_MIN_CM = 50;
export const INSEAM_MAX_CM = 110;
export const MAX_RAW_LENGTH = 6;
export const REPORT_FILENAME = "bike-frame-size-report.json";
export const MAX_REPORT_BYTES = 2097152;

// Grammar: at least one integer digit, optional fraction of exactly one
// digit. Leading zeros are allowed. ".5", "5.", "+5", "1e3", "1,000" and
// two-decimal values are rejected.
const DECIMAL_RE = /^[0-9]+(\.[0-9])?$/;

const BIKE_TYPES = ["road", "mountain", "hybrid"];

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Parse a grammar-valid decimal string into tenths of a centimetre
// (BigInt). Returns null when the grammar does not match.
function parseTenths(raw) {
  if (!DECIMAL_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "0" : raw.slice(dot + 1);
  return BigInt(intPart) * 10n + BigInt(fracPart);
}

// Validate one numeric field in the SPEC order: capacity, surrogate,
// empty, grammar, range. Returns {value: tenths} or {error}.
function validateField(raw, field, minTenths, maxTenths) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", field) };
  if (raw === "") return { error: fail("EMPTY", field) };
  const value = parseTenths(raw);
  if (value === null) return { error: fail("DECIMAL_FORMAT", field) };
  if (value < minTenths || value > maxTenths) {
    return { error: fail("RANGE", field) };
  }
  return { value };
}

// Normalized echo of a grammar-valid input string: leading zeros stripped,
// trailing fraction zeros trimmed, zero shown as "0". Null when invalid.
export function normalizeEcho(raw) {
  if (typeof raw !== "string" || !DECIMAL_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  let intPart = dot === -1 ? raw : raw.slice(0, dot);
  let fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  intPart = intPart.replace(/^0+(?=[0-9])/, "");
  fracPart = fracPart.replace(/0+$/, "");
  if (intPart === "0" && fracPart === "") return "0";
  return intPart + (fracPart ? "." + fracPart : "");
}

// Round the exact non-negative rational p/q (q > 0) half-up to an integer.
// p and q are BigInt; inputs here are all non-negative.
function roundToInt(p, q) {
  let quot = p / q;
  const rem = p % q;
  if (rem * 2n >= q) quot += 1n;
  return quot;
}

// A BigInt count of tenths as a JSON number with one decimal place.
function tenthsToNumber(t) {
  return Number(t) / 10;
}

// A BigInt count of thousandths as a JSON number with three decimal places.
function thousandthsToNumber(t) {
  return Number(t) / 1000;
}

function letterForHeight(heightTenths) {
  if (heightTenths < 1500n) return "XXS";
  if (heightTenths < 1600n) return "XS";
  if (heightTenths < 1680n) return "S";
  if (heightTenths < 1780n) return "M";
  if (heightTenths < 1850n) return "L";
  if (heightTenths < 1930n) return "XL";
  return "XXL";
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, exactly the three own data properties, all strings.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (
    keys.length !== 3 ||
    !keys.includes("heightCm") ||
    !keys.includes("inseamCm") ||
    !keys.includes("bikeType")
  ) {
    return fail("SCHEMA", null);
  }
  for (const key of ["heightCm", "inseamCm", "bikeType"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { heightCm, inseamCm, bikeType } = input;
  if (
    typeof heightCm !== "string" ||
    typeof inseamCm !== "string" ||
    typeof bikeType !== "string"
  ) {
    return fail("SCHEMA", null);
  }

  // heightCm first, then inseamCm, then bikeType; first error wins.
  const h = validateField(heightCm, "heightCm", 1200n, 2200n);
  if (h.error) return h.error;
  const s = validateField(inseamCm, "inseamCm", 500n, 1100n);
  if (s.error) return s.error;

  // bikeType: surrogate, empty, then enum. (No capacity rule: "mountain"
  // is 8 characters, so the 6-unit numeric capacity cannot apply here.)
  if (hasUnpairedSurrogate(bikeType)) return fail("UNICODE", "bikeType");
  if (bikeType === "") return fail("EMPTY", "bikeType");
  if (!BIKE_TYPES.includes(bikeType)) return fail("ENUM", "bikeType");

  // Cross-field: inseam must not exceed height.
  const H = h.value; // height in tenths of a cm
  const I = s.value; // inseam in tenths of a cm
  if (I > H) return fail("RANGE", "inseamCm");

  // Centre in units of 1e-4 cm (exact): road I*670, hybrid I*640,
  // mountain road - 11 cm = I*670 - 110000.
  let centre4;
  if (bikeType === "road") centre4 = I * 670n;
  else if (bikeType === "hybrid") centre4 = I * 640n;
  else centre4 = I * 670n - 110000n;

  // Rounded half-up to 1 decimal at output time only; the range endpoints
  // come from the unrounded centre +/- 1.0 cm.
  const centreCm = roundToInt(centre4, 1000n);
  const rangeLowCm = roundToInt(centre4 - 10000n, 1000n);
  const rangeHighCm = roundToInt(centre4 + 10000n, 1000n);
  // Inches: centreCm / 2.54, in tenths of an inch = centre4 / 2540.
  const centreIn = roundToInt(centre4, 2540n);
  const rangeLowIn = roundToInt(centre4 - 10000n, 2540n);
  const rangeHighIn = roundToInt(centre4 + 10000n, 2540n);
  // LeMond saddle height: inseam x 0.883; in tenths = I*883/1000.
  const saddleHeightCm = roundToInt(I * 883n, 1000n);

  // Ratio warning on the exact ratio: warn iff ratio < 0.40 (5I < 2H)
  // or ratio > 0.50 (2I > H). Endpoints included: no warning.
  let warning = null;
  if (5n * I < 2n * H || 2n * I > H) {
    warning = { code: "INSEAM_RATIO", ratio: thousandthsToNumber(roundToInt(I * 1000n, H)) };
  }

  return {
    ok: true,
    result: {
      bikeType,
      heightCm: tenthsToNumber(H),
      inseamCm: tenthsToNumber(I),
      centreCm: tenthsToNumber(centreCm),
      centreIn: tenthsToNumber(centreIn),
      rangeCm: { low: tenthsToNumber(rangeLowCm), high: tenthsToNumber(rangeHighCm) },
      rangeIn: { low: tenthsToNumber(rangeLowIn), high: tenthsToNumber(rangeHighIn) },
      letter: letterForHeight(H),
      saddleHeightCm: tenthsToNumber(saddleHeightCm),
      warning,
    },
  };
}

// --- Report serialization -------------------------------------------------
// Compact JSON, object own keys sorted ascending by UTF-16 code units
// recursively, array order preserved, one trailing LF, UTF-8 without BOM.
// Built from primitives only; never calls an input's toJSON.

function compareUtf16(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function stableStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort(compareUtf16);
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function buildReport(result) {
  const text = stableStringify(result) + "\n";
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
