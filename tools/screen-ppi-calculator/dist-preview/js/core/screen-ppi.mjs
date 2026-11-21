// Pure core for the Screen PPI Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-screen-ppi-calculator-20261109):
// ppi = sqrt(w^2 + h^2) / d, physical width/height and dot pitch derived
// from the UNROUNDED ppi, megapixels = w*h/1e6, aspect ratio by integer
// gcd in width:height order. All arithmetic is IEEE-754 double precision
// in the SPEC's pinned operation order; every output is rounded half-up
// exactly once, at the output step only.

export const FIELDS = ["diagonalIn", "widthPx", "heightPx"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  diagonalIn: 8,
  widthPx: 8,
  heightPx: 8,
};

export const DEFAULTS = {
  diagonalIn: "27",
  widthPx: "2560",
  heightPx: "1440",
};

// The example draft: the first fixture case (fhd-24).
export const EXAMPLE = {
  diagonalIn: "24",
  widthPx: "1920",
  heightPx: "1080",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "screen-ppi-report.json";

// Pinned constants (SPEC section 3): 1 inch = 2.54 cm exactly.
export const INCH_CM = 2.54;
export const MM_PER_INCH = 25.4;

export const DIAGONAL_MIN = 0.1;
export const DIAGONAL_MAX = 200;
export const PX_MIN = 1;
export const PX_MAX = 16384;

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "請輸入或載入範例", en: "Enter values or load the example" },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const DIAGONAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable properties are exactly the three fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the three string values, or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: capacity first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate the whole input: schema first, then fields in the fixed
// order diagonalIn, widthPx, heightPx; within each field the order is
// capacity, UNICODE, EMPTY, grammar, RANGE. The first failure fails
// the whole input.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("diagonalIn", values.diagonalIn);
  if (failure !== null) return failure;
  if (values.diagonalIn === "") return fieldError("EMPTY", "diagonalIn");
  if (!DIAGONAL_PATTERN.test(values.diagonalIn)) {
    return fieldError("DECIMAL_FORMAT", "diagonalIn");
  }
  const diagonal = Number(values.diagonalIn);
  if (diagonal < DIAGONAL_MIN || diagonal > DIAGONAL_MAX) {
    return fieldError("RANGE", "diagonalIn");
  }

  const pixels = {};
  for (const field of ["widthPx", "heightPx"]) {
    failure = checkCapacityAndUnicode(field, values[field]);
    if (failure !== null) return failure;
    if (values[field] === "") return fieldError("EMPTY", field);
    if (!INTEGER_PATTERN.test(values[field])) {
      return fieldError("INTEGER_FORMAT", field);
    }
    const value = Number(values[field]);
    if (value < PX_MIN || value > PX_MAX) return fieldError("RANGE", field);
    pixels[field] = value;
  }

  return { ok: true, values: { diagonalIn: diagonal, widthPx: pixels.widthPx, heightPx: pixels.heightPx } };
}

// Integer Euclid gcd (SPEC section 3, step 6).
export function gcd(a, b) {
  let x = a;
  let y = b;
  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
}

// Round half up to k decimals, applied exactly once (SPEC section 3):
// R(x,k) = floor(x * 10^k + 0.5) / 10^k, on the double value.
export function roundHalfUp(value, decimals) {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + 0.5) / factor;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { diagonalIn: d, widthPx: w, heightPx: h } = validated.values;

  // Pinned operation order (SPEC section 3, steps 1-6).
  const diagPx = Math.sqrt(w * w + h * h);
  const ppiRaw = diagPx / d;
  // Physical sizes derive from the UNROUNDED ppiRaw, never from the
  // displayed (rounded) ppi.
  const widthCmRaw = (w / ppiRaw) * INCH_CM;
  const heightCmRaw = (h / ppiRaw) * INCH_CM;
  const dotPitchRaw = MM_PER_INCH / ppiRaw;
  const megapixelsRaw = (w * h) / 1000000;
  const divisor = gcd(w, h);
  const aspectRatio = `${w / divisor}:${h / divisor}`;

  const result = {
    aspectRatio,
    diagonalIn: d,
    dotPitchMm: roundHalfUp(dotPitchRaw, 3),
    heightCm: roundHalfUp(heightCmRaw, 1),
    heightPx: h,
    megapixels: roundHalfUp(megapixelsRaw, 2),
    ppi: roundHalfUp(ppiRaw, 1),
    widthCm: roundHalfUp(widthCmRaw, 1),
    widthPx: w,
  };

  // Report cap backstop (SPEC section 3): a result over the cap is an
  // OUTPUT_LIMIT error instead of a success. With the pinned ranges a
  // real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Display formatting: fixed decimal places, "." separator, zero-padded
// (SPEC section 3). The values already carry the pinned precision;
// toFixed only renders them.
export function formatPpi(ppi) {
  return ppi.toFixed(1);
}

export function formatCm(cm) {
  return cm.toFixed(1);
}

export function formatDotPitchMm(dotPitchMm) {
  return dotPitchMm.toFixed(3);
}

export function formatMegapixels(megapixels) {
  return megapixels.toFixed(2);
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
