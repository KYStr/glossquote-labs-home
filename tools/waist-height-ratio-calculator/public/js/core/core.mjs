// Waist-to-Height Ratio Calculator — pure core.
// Exact integer arithmetic on hundredths of a centimetre (BigInt); no
// floating-point math on operands or results (string lengths and indexes
// excepted), per SPEC. run(input) is a synchronous pure data transform:
//   input  {waistCm, heightCm} — decimal strings, exact own data properties.
//   output {ok:true, result:{whtr, category, healthyWaistMinCm,
//            healthyWaistMaxCm, waistToLoseCm}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
// The category is judged on the exact unrounded ratio, by integer
// comparison; the displayed ratio is rounded half-up to 2 decimals.

export const WAIST_MIN_CM = 20;
export const WAIST_MAX_CM = 300;
export const HEIGHT_MIN_CM = 50;
export const HEIGHT_MAX_CM = 300;
export const MAX_RAW_LENGTH = 16;
export const REPORT_FILENAME = "waist-height-ratio-calculator-report.json";
export const MAX_REPORT_BYTES = 2097152;

// Grammar: at least one integer digit, optional fraction of 1-2 digits.
// Leading zeros are allowed. ".5", "5.", "+5", "1e3", "1,000" are rejected.
const DECIMAL_RE = /^[0-9]+(\.[0-9]{1,2})?$/;

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

// Parse a grammar-valid decimal string into hundredths of a centimetre
// (BigInt). Returns null when the grammar does not match.
function parseHundredths(raw) {
  if (!DECIMAL_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  return BigInt(intPart + fracPart.padEnd(2, "0"));
}

// Validate one field in the SPEC order: capacity, surrogate, empty,
// grammar, range. Returns {value: hundredths} or {error}.
function validateField(raw, field, minHundredths, maxHundredths) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", field) };
  if (raw === "") return { error: fail("EMPTY", field) };
  const value = parseHundredths(raw);
  if (value === null) return { error: fail("DECIMAL_FORMAT", field) };
  if (value < minHundredths || value > maxHundredths) {
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

// Format an integer number of hundredths as a 2-decimal string ("0.50").
function formatHundredths(q) {
  return (q / 100n).toString() + "." + (q % 100n).toString().padStart(2, "0");
}

// Format an integer number of tenths as a 1-decimal string ("68.0").
function formatTenths(t) {
  return (t / 10n).toString() + "." + (t % 10n).toString();
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, exactly the two own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (keys.length !== 2 || !keys.includes("waistCm") || !keys.includes("heightCm")) {
    return fail("SCHEMA", null);
  }
  for (const key of ["waistCm", "heightCm"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { waistCm, heightCm } = input;
  if (typeof waistCm !== "string" || typeof heightCm !== "string") {
    return fail("SCHEMA", null);
  }

  // waistCm first, then heightCm; first error wins.
  const w = validateField(waistCm, "waistCm", 2000n, 30000n);
  if (w.error) return w.error;
  const h = validateField(heightCm, "heightCm", 5000n, 30000n);
  if (h.error) return h.error;

  const W = w.value; // waist in hundredths of a cm
  const H = h.value; // height in hundredths of a cm

  // Displayed ratio: WHtR x 100 rounded half-up to 2 decimals, as a string.
  // whtr in hundredths is roundToInt(W * 100 / H).
  const whtr = formatHundredths(roundToInt(W * 100n, H));

  // Category on the exact unrounded ratio, by integer comparison.
  // below-healthy: WHtR < 0.40  <=> 5W < 2H
  // healthy:       0.40 <= WHtR < 0.50 <=> 2W < H
  // increased:     0.50 <= WHtR < 0.60 <=> 5W < 3H
  // high:          WHtR >= 0.60
  let category;
  if (5n * W < 2n * H) category = "below-healthy";
  else if (2n * W < H) category = "healthy";
  else if (5n * W < 3n * H) category = "increased";
  else category = "high";

  // Healthy waist range: 0.40 x height and 0.50 x height, half-up to
  // 1 decimal. In tenths of a cm: min = H/25, max = H/20 (H in hundredths).
  const healthyWaistMinCm = formatTenths(roundToInt(H, 25n));
  const healthyWaistMaxCm = formatTenths(roundToInt(H, 20n));

  // Distance to target: only when the exact ratio is >= 0.50, waist minus
  // 0.50 x height, half-up to 1 decimal. In tenths of a cm the value is
  // (2W - H) / 20; the numerator is >= 0 exactly when 2W >= H.
  let waistToLoseCm = null;
  if (2n * W >= H) {
    waistToLoseCm = formatTenths(roundToInt(2n * W - H, 20n));
  }

  return {
    ok: true,
    result: { whtr, category, healthyWaistMinCm, healthyWaistMaxCm, waistToLoseCm },
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
