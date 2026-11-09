// Percentage Calculator — pure core.
// Exact decimal arithmetic on BigInt rationals only; no Number math on
// operands or results (string lengths and indexes excepted), per SPEC.
// run(input) is a synchronous pure data transform:
//   input  {mode, first, second} — all strings, exact own data properties.
//   output {ok:true, result:{mode, value, display, direction}}
//        | {ok:false, error:{code, field, row}} — row is always null here.

export const MODES = ["of", "share", "change"];
export const MAX_RAW_LENGTH = 24;
export const MAX_ABS = 999999999999n;
export const REPORT_FILENAME = "percentage-calculator-report.json";
export const MAX_REPORT_BYTES = 2097152;

const NUMBER_RE = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

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

// Parse a grammar-valid decimal string into an exact rational {n, d}, d > 0.
// Returns null when the grammar does not match.
function parseDecimal(raw) {
  if (!NUMBER_RE.test(raw)) return null;
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot + 1);
  let mantissa = BigInt(intPart + fracPart);
  if (mantissa === 0n) return { n: 0n, d: 1n };
  const scale = BigInt(fracPart.length);
  return { n: (negative ? -1n : 1n) * mantissa, d: 10n ** scale };
}

// Validate one operand field in the SPEC order. Returns {value:{n,d}} or {error}.
function validateField(raw, field) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", field) };
  if (raw === "") return { error: fail("EMPTY", field) };
  const value = parseDecimal(raw);
  if (value === null) return { error: fail("NUMBER_FORMAT", field) };
  const absN = value.n < 0n ? -value.n : value.n;
  if (absN > MAX_ABS * value.d) return { error: fail("RANGE", field) };
  return { value };
}

// Normalized echo of a grammar-valid input string: trailing fraction zeros
// trimmed, "-0" shown as "0". Returns null for grammar-invalid input.
export function normalizeEcho(raw) {
  if (typeof raw !== "string" || !NUMBER_RE.test(raw)) return null;
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  let fracPart = dot === -1 ? "" : body.slice(dot + 1);
  fracPart = fracPart.replace(/0+$/, "");
  const isZero = BigInt(intPart + (dot === -1 ? "" : body.slice(dot + 1))) === 0n;
  if (isZero) return "0";
  return (negative ? "-" : "") + intPart + (fracPart ? "." + fracPart : "");
}

// Round the exact rational p/q (q > 0) to `places` decimals, half away from
// zero, and format as a normalized string (no trailing zeros, no "+", zero
// is "0" without a sign).
function roundFormat(p, q, places) {
  const negative = p < 0n;
  const a = negative ? -p : p;
  const scaled = a * 10n ** BigInt(places);
  let quot = scaled / q;
  const rem = scaled % q;
  if (rem * 2n >= q) quot += 1n;
  if (quot === 0n) return "0";
  let digits = quot.toString();
  if (places === 0) return (negative ? "-" : "") + digits;
  digits = digits.padStart(places + 1, "0");
  const intPart = digits.slice(0, digits.length - places);
  const fracPart = digits.slice(digits.length - places).replace(/0+$/, "");
  return (negative ? "-" : "") + intPart + (fracPart ? "." + fracPart : "");
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, exactly the three own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (
    keys.length !== 3 ||
    !keys.includes("mode") ||
    !keys.includes("first") ||
    !keys.includes("second")
  ) {
    return fail("SCHEMA", null);
  }
  for (const key of ["mode", "first", "second"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { mode, first, second } = input;
  if (typeof mode !== "string" || typeof first !== "string" || typeof second !== "string") {
    return fail("SCHEMA", null);
  }
  if (!MODES.includes(mode)) return fail("MODE_INVALID", "mode");

  const f = validateField(first, "first");
  if (f.error) return f.error;
  const s = validateField(second, "second");
  if (s.error) return s.error;

  const a = f.value; // first as rational n/d
  const b = s.value; // second as rational n/d

  // Division by zero is judged on exact values ("-0" and "0.00" are zero).
  if (mode === "share" && b.n === 0n) return fail("DIVISION_BY_ZERO", "second");
  if (mode === "change" && a.n === 0n) return fail("DIVISION_BY_ZERO", "first");

  let p;
  let q;
  let direction = null;
  if (mode === "of") {
    p = a.n * b.n;
    q = a.d * b.d * 100n;
  } else if (mode === "share") {
    p = a.n * b.d * 100n;
    q = a.d * b.n;
  } else {
    // change: (second - first) / first * 100, applied literally.
    const diffN = b.n * a.d - a.n * b.d;
    const diffD = a.d * b.d;
    direction = diffN > 0n ? "increase" : diffN < 0n ? "decrease" : "none";
    p = diffN * a.d * 100n;
    q = diffD * a.n;
  }
  if (q < 0n) {
    p = -p;
    q = -q;
  }

  const result = {
    mode,
    value: roundFormat(p, q, 10),
    // display rounds the exact rational directly, never the rounded value.
    display: roundFormat(p, q, 2),
    direction,
  };
  return { ok: true, result };
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
