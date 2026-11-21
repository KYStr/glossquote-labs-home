// Pure core for the Tax-Included Converter.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-tax-included-converter-20261109)
// as far as the delivered spec text goes (see HANDOFF.md: the spec file on
// disk is truncated mid-sentence in inputsOutputs; the rules below follow
// the surviving SPEC text, fixtures.json, and AUTHOR-CHECK.md).
//
// Tax law pinned by the SPEC:
// - Rate 5% is the current levy under VAT Act §10 (range 5-10%, rate set
//   by the Executive Yuan) + MOF FAQ; §14 is the rounding rule, not the
//   rate source.
// - Tax is computed ONCE on the sales total and rounded half-up to the
//   nearest dollar (VAT Act §14); lines mode shows the per-line sum and
//   the difference against the total-based tax.
// - Gross-back conversion rounds the NET first (half-up) and takes
//   tax = gross - net, so net + tax = gross always holds.
// All arithmetic is exact BigInt rational arithmetic; the rate is parsed
// to integer hundredths of a percent P (at most two decimals), so there
// is no floating-point path anywhere.

export const FIELDS = ["mode", "ratePercent", "basis", "amount", "lines"];

// Maximum raw length per field, in UTF-16 code units. The SPEC pins 16
// for `mode`; the other limits are builder-pinned (see HANDOFF.md):
// amounts are at most 12 digits, the rate at most "100.00" (6 units).
export const RAW_LIMITS = {
  mode: 16,
  ratePercent: 8,
  basis: 16,
  amount: 16,
  lines: 16,
};

export const DEFAULTS = {
  mode: "single",
  basis: "net",
  amount: "10000",
  ratePercent: "5",
  lines: null,
};

// The example draft: the first fixture case (net-basic input).
export const EXAMPLE = {
  amount: "100000",
  basis: "net",
  lines: null,
  mode: "single",
  ratePercent: "5",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "tax-included-converter-report.json";
export const STORAGE_KEY = "gloss-tools:tax-included-converter:draft:v1";

// Pinned bounds (SPEC inputsOutputs + AUTHOR-CHECK.md).
export const AMOUNT_MAX = 999999999999n;
export const LINE_MAX = 20;
export const RATE_HUNDREDTHS_MAX = 10000n; // 100.00%

// Pinned status announcements (SPEC userFlow state table).
export const STATUS_TEXT = {
  empty: { zh: "請輸入或載入範例", en: "Enter an amount or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "換算完成", en: "Conversion complete" },
  error: { zh: "無法換算，請檢查輸入", en: "Cannot convert — check your input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const INTEGER_PATTERN = /^[0-9]+$/;
const RATE_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
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

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Read one own data property as a string; null when absent, an accessor,
// or not a string.
function readStringField(object, field) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(object, field);
  } catch {
    return null;
  }
  if (descriptor === undefined || !("value" in descriptor)) return null;
  if (typeof descriptor.value !== "string") return null;
  return descriptor.value;
}

// Schema gate only: the input must be a non-null plain object whose own
// enumerable properties are exactly the five fields, each an own data
// property; mode/ratePercent strings; basis/amount string-or-null; lines
// null-or-array whose elements are plain objects with exactly the key
// {amount} holding a string. Symbol keys are rejected. Returns the
// values, or null.
function readSchema(input) {
  if (!isPlainObject(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of ["mode", "ratePercent"]) {
    const value = readStringField(input, field);
    if (value === null) return null;
    values[field] = value;
  }
  for (const field of ["basis", "amount"]) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (descriptor.value !== null && typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  let linesDescriptor;
  try {
    linesDescriptor = Object.getOwnPropertyDescriptor(input, "lines");
  } catch {
    return null;
  }
  if (linesDescriptor === undefined || !("value" in linesDescriptor)) return null;
  const linesValue = linesDescriptor.value;
  if (linesValue !== null) {
    if (!Array.isArray(linesValue)) return null;
    const lines = [];
    for (const element of linesValue) {
      if (!isPlainObject(element)) return null;
      let elementKeys;
      try {
        elementKeys = Object.keys(element);
        if (Object.getOwnPropertySymbols(element).length !== 0) return null;
      } catch {
        return null;
      }
      if (elementKeys.length !== 1 || elementKeys[0] !== "amount") return null;
      const amount = readStringField(element, "amount");
      if (amount === null) return null;
      lines.push({ amount });
    }
    values.lines = lines;
  } else {
    values.lines = null;
  }
  return values;
}

// True when the value passes the schema gate only (used to decide
// whether a stored draft may be restored).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every string
// field, in the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate the rate string (non-empty): grammar (DECIMAL_FORMAT, at
// most two decimals), then range 0 < P <= 10000 hundredths (RANGE).
// Returns the integer hundredths P as a BigInt.
function parseRate(raw) {
  if (!RATE_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "ratePercent");
  const [whole, fraction = ""] = raw.split(".");
  const hundredths = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
  if (hundredths < 1n || hundredths > RATE_HUNDREDTHS_MAX) {
    return fieldError("RANGE", "ratePercent");
  }
  return { ok: true, value: hundredths };
}

// Canonical rate string for results: P hundredths rendered without
// trailing zeros ("5.50" -> "5.5", "5.00" -> "5", "0.01" -> "0.01").
export function formatRate(hundredths) {
  const whole = hundredths / 100n;
  const fraction = hundredths % 100n;
  if (fraction === 0n) return String(whole);
  if (fraction % 10n === 0n) return `${whole}.${fraction / 10n}`;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

// Validate an amount string (non-empty): integer grammar
// (INTEGER_FORMAT), then range 0..999,999,999,999 (RANGE). Returns the
// amount as a BigInt. `field`/`row` name the error position.
function parseAmount(raw, field, row = null) {
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field, row);
  const value = BigInt(raw);
  if (value > AMOUNT_MAX) return fieldError("RANGE", field, row);
  return { ok: true, value };
}

// Round half-up of a non-negative rational numerator/denominator,
// applied exactly once. (2n + d) / (2d) with BigInt floor division.
function roundHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Validate the whole input: schema first, then fields in the fixed
// order mode, ratePercent, basis, amount, lines; the first error wins.
// A field inactive in the current mode receives only its capacity and
// surrogate checks and its content is otherwise ignored.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("mode", values.mode);
  if (failure !== null) return failure;
  if (values.mode === "") return fieldError("EMPTY", "mode");
  if (values.mode !== "single" && values.mode !== "lines") {
    return fieldError("ENUM", "mode");
  }
  const mode = values.mode;

  failure = checkCapacityAndUnicode("ratePercent", values.ratePercent);
  if (failure !== null) return failure;
  if (values.ratePercent === "") return fieldError("EMPTY", "ratePercent");
  const parsedRate = parseRate(values.ratePercent);
  if (!parsedRate.ok) return parsedRate;
  const rateHundredths = parsedRate.value;

  // basis: capacity and surrogate checks in every mode; the remaining
  // checks only when single is active.
  if (values.basis !== null) {
    failure = checkCapacityAndUnicode("basis", values.basis);
    if (failure !== null) return failure;
  }
  let basis = null;
  if (mode === "single") {
    if (values.basis === null || values.basis === "") return fieldError("EMPTY", "basis");
    if (values.basis !== "net" && values.basis !== "gross") {
      return fieldError("ENUM", "basis");
    }
    basis = values.basis;
  }

  // amount: capacity and surrogate checks in every mode; the remaining
  // checks only when single is active.
  if (values.amount !== null) {
    failure = checkCapacityAndUnicode("amount", values.amount);
    if (failure !== null) return failure;
  }
  let amount = null;
  if (mode === "single") {
    if (values.amount === null || values.amount === "") return fieldError("EMPTY", "amount");
    const parsed = parseAmount(values.amount, "amount");
    if (!parsed.ok) return parsed;
    amount = parsed.value;
  }

  // lines: only when lines mode is active. A null or empty list is
  // EMPTY; more than 20 rows is ROW_LIMIT; each row is checked in
  // order with its 1-based row number; the subtotal shares the amount
  // cap (RANGE on lines).
  let lines = null;
  if (mode === "lines") {
    if (values.lines === null || values.lines.length === 0) {
      return fieldError("EMPTY", "lines");
    }
    if (values.lines.length > LINE_MAX) return fieldError("ROW_LIMIT", "lines");
    lines = [];
    let subtotal = 0n;
    for (let i = 0; i < values.lines.length; i += 1) {
      const raw = values.lines[i].amount;
      failure = checkCapacityAndUnicode("lines", raw);
      if (failure !== null) {
        return fieldError(failure.error.code, "amount", i + 1);
      }
      if (raw === "") return fieldError("EMPTY", "amount", i + 1);
      const parsed = parseAmount(raw, "amount", i + 1);
      if (!parsed.ok) return parsed;
      lines.push(parsed.value);
      subtotal += parsed.value;
    }
    if (subtotal > AMOUNT_MAX) return fieldError("RANGE", "lines");
  }

  return { ok: true, values: { mode, rateHundredths, basis, amount, lines } };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { mode, rateHundredths, basis, amount, lines } = validated.values;
  const ratePercent = formatRate(rateHundredths);

  if (mode === "single") {
    let net;
    let tax;
    let gross;
    if (basis === "net") {
      // tax = rHU(net * P / 10000); gross = net + tax.
      net = amount;
      tax = roundHalfUp(net * rateHundredths, 10000n);
      gross = net + tax;
    } else {
      // net = rHU(gross * 10000 / (10000 + P)); tax = gross - net, so
      // the single rounding is absorbed by the tax and the triple
      // always balances.
      gross = amount;
      net = roundHalfUp(gross * 10000n, 10000n + rateHundredths);
      tax = gross - net;
    }
    return {
      ok: true,
      result: {
        basis,
        gross: Number(gross),
        mode: "single",
        net: Number(net),
        ratePercent,
        tax: Number(tax),
      },
    };
  }

  // Lines mode: tax is computed ONCE on the subtotal (SPEC scope,
  // three-part invoice structure); the per-line sum is shown only for
  // comparison, and roundingDifference = tax - perLineTaxSum.
  const subtotalNet = lines.reduce((sum, value) => sum + value, 0n);
  const tax = roundHalfUp(subtotalNet * rateHundredths, 10000n);
  const gross = subtotalNet + tax;
  const perLineTaxSum = lines.reduce(
    (sum, value) => sum + roundHalfUp(value * rateHundredths, 10000n),
    0n,
  );
  return {
    ok: true,
    result: {
      gross: Number(gross),
      lines: lines.map((value, index) => ({ net: Number(value), row: index + 1 })),
      mode: "lines",
      perLineTaxSum: Number(perLineTaxSum),
      ratePercent,
      roundingDifference: Number(tax - perLineTaxSum),
      subtotalNet: Number(subtotalNet),
      tax: Number(tax),
    },
  };
}

// Amount display: thousands grouped with commas (display only, never
// feeds back into machine values).
export function formatAmount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
