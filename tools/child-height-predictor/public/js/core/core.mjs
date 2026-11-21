// Child Height Predictor — pure core.
// Tanner mid-parental height: boy (F + M + 13) / 2, girl (F + M - 13) / 2,
// target range = estimate ± 8.5 cm. All arithmetic is exact integer math
// in twentieths of a centimetre; no floating point decides a rounding.
// run(input) is a synchronous pure data transform:
//   input  {fatherHeightCm, motherHeightCm, childSex} — all strings.
//   output {ok:true, result:{childSex, targetCm, rangeLowCm, rangeHighCm}}
//        | {ok:false, error:{code, field, row}} — row is always null here.

export const MAX_RAW_LENGTH = 8;
export const MIN_TENTHS = 1000; // 100.0 cm
export const MAX_TENTHS = 2300; // 230.0 cm
export const REPORT_FILENAME = "child-height-report.json";
export const MAX_REPORT_BYTES = 2097152;

// Grammar: integer part "0" or 1–3 digits with a non-zero first digit,
// optionally "." plus exactly one fractional digit. No sign, space,
// exponent, thousands separator, or leading/trailing decimal point.
const HEIGHT_RE = /^(0|[1-9][0-9]{0,2})(\.[0-9])?$/;

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

// Parse a grammar-valid height string into integer tenths of a centimetre.
function parseTenths(raw) {
  if (!HEIGHT_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  if (dot === -1) return Number(raw) * 10;
  return Number(raw.slice(0, dot)) * 10 + Number(raw.slice(dot + 1));
}

// Validate one height field in the SPEC order. Returns {tenths} or {error}.
function validateHeight(raw, field) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", field) };
  if (raw === "") return { error: fail("EMPTY", field) };
  const tenths = parseTenths(raw);
  if (tenths === null) return { error: fail("DECIMAL_FORMAT", field) };
  if (tenths < MIN_TENTHS || tenths > MAX_TENTHS) {
    return { error: fail("RANGE", field) };
  }
  return { tenths };
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

// Round a twentieths value to tenths with round-half-up:
// tenths(x20) = floor((x20 + 1) / 2). All accepted inputs keep x20 > 0,
// so no negative-rounding branch exists.
function roundToTenths(x20) {
  return Math.floor((x20 + 1) / 2) / 10;
}

export function run(input) {
  // SCHEMA: plain object, exactly the three own data properties, all strings.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (
    keys.length !== 3 ||
    !keys.includes("fatherHeightCm") ||
    !keys.includes("motherHeightCm") ||
    !keys.includes("childSex")
  ) {
    return fail("SCHEMA", null);
  }
  for (const key of ["fatherHeightCm", "motherHeightCm", "childSex"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { fatherHeightCm, motherHeightCm, childSex } = input;
  if (
    typeof fatherHeightCm !== "string" ||
    typeof motherHeightCm !== "string" ||
    typeof childSex !== "string"
  ) {
    return fail("SCHEMA", null);
  }

  // Field order: fatherHeightCm, motherHeightCm, childSex.
  const f = validateHeight(fatherHeightCm, "fatherHeightCm");
  if (f.error) return f.error;
  const m = validateHeight(motherHeightCm, "motherHeightCm");
  if (m.error) return m.error;
  if (childSex !== "boy" && childSex !== "girl") {
    return fail("ENUM", "childSex");
  }

  // S is the unrounded estimate in twentieths of a centimetre:
  // (F + M ± 13) / 2 cm = (fT + mT ± 130) / 20 cm.
  const adjustment = childSex === "boy" ? 130 : -130;
  const s20 = f.tenths + m.tenths + adjustment;
  const result = {
    childSex,
    targetCm: roundToTenths(s20),
    rangeLowCm: roundToTenths(s20 - 170),
    rangeHighCm: roundToTenths(s20 + 170),
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
