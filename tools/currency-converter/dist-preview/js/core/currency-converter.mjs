// Pure core for the Currency Converter.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-currency-converter-20261109):
// the user enters one rate (rate = units of the to currency per 1 unit of
// the from currency); from -> to multiplies by the rate, to -> from divides
// by the rate exactly, with the inverse rate shown at 6 significant digits
// and a fixed 1 / 10 / 100 / 1000 quick table. All arithmetic is exact
// BigInt rational arithmetic; rounding is half-up, applied exactly once
// per output value, at the pinned positions only.

export const FIELDS = ["fromCode", "toCode", "rate", "amount", "direction"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  fromCode: 8,
  toCode: 8,
  rate: 14,
  amount: 12,
  direction: 8,
};

export const DEFAULTS = {
  fromCode: "USD",
  toCode: "TWD",
  rate: "31.5",
  amount: "100",
  direction: "a-to-b",
};

// The example draft; identical to the default draft by design (SPEC
// section 2) and to the default-forward fixture input.
export const EXAMPLE = {
  fromCode: "USD",
  toCode: "TWD",
  rate: "31.5",
  amount: "100",
  direction: "a-to-b",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "currency-converter-report.json";

// Pinned bounds (SPEC section 3): rateMicro is the rate x 10^6 and must
// be 1..1,000,000,000,000; amountCents is the amount x 100 and must be
// 0..999,999,999.
export const RATE_MICRO_MIN = 1n;
export const RATE_MICRO_MAX = 1000000000000n;
export const AMOUNT_CENTS_MAX = 999999999n;

// Fixed quick-table steps, in source-currency cents (1, 10, 100, 1000
// units). Each row is rounded independently from its exact product.
export const QUICK_TABLE_CENTS = [100, 1000, 10000, 100000];

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "請輸入匯率與金額，或載入範例。", en: "Enter a rate and amount, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "換算完成", en: "Conversion complete" },
  error: { zh: "無法換算，請檢查輸入", en: "Cannot convert — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const CODE_PATTERN = /^[A-Za-z]{3}$/;
const RATE_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/;
const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

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
// whose own enumerable properties are exactly the five fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the five string values, or null.
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
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate a currency code (non-empty): exactly 3 ASCII letters
// (CODE_FORMAT), then normalize to upper case (ASCII case folding only).
// Codes are NOT checked against the ISO 4217 list (SPEC section 3).
function parseCode(raw, field) {
  if (!CODE_PATTERN.test(raw)) return fieldError("CODE_FORMAT", field);
  return { ok: true, value: raw.toUpperCase() };
}

// Parse an exact decimal string into a scaled BigInt: the integer part
// times 10^scale plus the fraction part right-padded with zeros to
// `scale` digits. The caller has already established the grammar, so
// every character here is an ASCII digit or the single decimal point.
function parseScaled(raw, scale) {
  const dot = raw.indexOf(".");
  const whole = dot === -1 ? raw : raw.slice(0, dot);
  const fraction = dot === -1 ? "" : raw.slice(dot + 1);
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
}

// Validate the rate (non-empty): grammar (DECIMAL_FORMAT), then range
// rateMicro 1..1,000,000,000,000 (RANGE). "0" is grammatically valid
// but out of range.
function parseRate(raw) {
  if (!RATE_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "rate");
  const rateMicro = parseScaled(raw, 6);
  if (rateMicro < RATE_MICRO_MIN || rateMicro > RATE_MICRO_MAX) {
    return fieldError("RANGE", "rate");
  }
  return { ok: true, value: rateMicro };
}

// Validate the amount (non-empty): grammar (DECIMAL_FORMAT), then range
// amountCents 0..999,999,999 (RANGE). 0 is legal.
function parseAmount(raw) {
  if (!AMOUNT_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "amount");
  const amountCents = parseScaled(raw, 2);
  if (amountCents < 0n || amountCents > AMOUNT_CENTS_MAX) {
    return fieldError("RANGE", "amount");
  }
  return { ok: true, value: amountCents };
}

// Validate the whole input: schema first, then fields in the fixed
// order fromCode, toCode, rate, amount, direction; the first error wins.
// Per field, in order: INPUT_LIMIT, UNICODE, EMPTY, format
// (CODE_FORMAT / DECIMAL_FORMAT / ENUM), RANGE (rate and amount only).
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("fromCode", values.fromCode);
  if (failure !== null) return failure;
  if (values.fromCode === "") return fieldError("EMPTY", "fromCode");
  const from = parseCode(values.fromCode, "fromCode");
  if (!from.ok) return from;

  failure = checkCapacityAndUnicode("toCode", values.toCode);
  if (failure !== null) return failure;
  if (values.toCode === "") return fieldError("EMPTY", "toCode");
  const to = parseCode(values.toCode, "toCode");
  if (!to.ok) return to;

  failure = checkCapacityAndUnicode("rate", values.rate);
  if (failure !== null) return failure;
  if (values.rate === "") return fieldError("EMPTY", "rate");
  const rate = parseRate(values.rate);
  if (!rate.ok) return rate;

  failure = checkCapacityAndUnicode("amount", values.amount);
  if (failure !== null) return failure;
  if (values.amount === "") return fieldError("EMPTY", "amount");
  const amount = parseAmount(values.amount);
  if (!amount.ok) return amount;

  failure = checkCapacityAndUnicode("direction", values.direction);
  if (failure !== null) return failure;
  if (values.direction === "") return fieldError("EMPTY", "direction");
  if (values.direction !== "a-to-b" && values.direction !== "b-to-a") {
    return fieldError("ENUM", "direction");
  }

  return {
    ok: true,
    values: {
      fromCode: from.value,
      toCode: to.value,
      rateMicro: rate.value,
      amountCents: amount.value,
      direction: values.direction,
    },
  };
}

// Pinned rounding (SPEC section 3, step 4): roundHalfUpDiv(n, d) for
// n >= 0, d > 0 — integer quotient q and remainder r; q + 1 when
// 2r >= d (exactly half rounds up), else q. All quantities here are
// non-negative, so there is no negative rounding branch.
export function roundHalfUpDiv(n, d) {
  const q = n / d;
  const r = n % d;
  return 2n * r >= d ? q + 1n : q;
}

// The inverse rate for display only, at 6 significant digits (SPEC
// section 3, step 7) — NOT 6 decimal places. The exact value is the
// rational numerator / denominator (10^6 / rateMicro for the tool).
// (a) Find integer p with 10^p <= inv < 10^(p+1), by integer/rational
// comparison only, never floating-point log. (b) m = roundHalfUp of
// inv x 10^(5-p), a 6-digit integer; if m = 1000000 (carry overflow),
// use m = 100000 and p = p + 1. (c) Write the 6 digits of m with the
// decimal point at p, stripping trailing zeros in the fraction and a
// lone decimal point. Examples: 10^6/31500000 -> "0.031746";
// 10^6/6600 -> "151.515"; 10^6/2500000 -> "0.4"; 10^6/1 -> "1000000".
export function formatSixSignificant(numerator, denominator) {
  // Find p. q = floor(inv); when q >= 1, p = digits(q) - 1. When q is 0
  // (inv < 1), p is negative: the smallest k >= 1 with
  // numerator x 10^k >= denominator gives p = -k.
  const q = numerator / denominator;
  let p;
  if (q >= 1n) {
    p = q.toString().length - 1;
  } else {
    let k = 1;
    let scaled = numerator * 10n;
    while (scaled < denominator) {
      scaled *= 10n;
      k += 1;
    }
    p = -k;
  }
  // m = roundHalfUp(inv x 10^(5-p)).
  const shift = 5 - p;
  const mRaw =
    shift >= 0
      ? roundHalfUpDiv(numerator * 10n ** BigInt(shift), denominator)
      : roundHalfUpDiv(numerator, denominator * 10n ** BigInt(-shift));
  let m = mRaw;
  if (m === 1000000n) {
    m = 100000n;
    p += 1;
  }
  const digits = m.toString();
  // digits has exactly 6 characters: inv x 10^(5-p) lies in
  // [10^5, 10^6), so its half-up rounding lies in [100000, 1000000],
  // and the overflow case above is the only way to reach 1000000.
  let text;
  if (p >= 5) {
    text = digits + "0".repeat(p - 5);
  } else if (p >= 0) {
    text = `${digits.slice(0, p + 1)}.${digits.slice(p + 1)}`;
  } else {
    text = `0.${"0".repeat(-p - 1)}${digits}`;
  }
  if (text.includes(".")) {
    text = text.replace(/0+$/, "").replace(/\.$/, "");
  }
  return text;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { fromCode, toCode, rateMicro, amountCents, direction } = validated.values;

  // Pinned conversion (SPEC section 3, steps 5-6). Forward multiplies
  // by the rate; reverse divides by the entered rate exactly — never by
  // the rounded display inverse rate. Each value is rounded half-up
  // exactly once, from its exact product or quotient.
  let convertedCents;
  if (direction === "a-to-b") {
    convertedCents = roundHalfUpDiv(amountCents * rateMicro, 1000000n);
  } else {
    convertedCents = roundHalfUpDiv(amountCents * 1000000n, rateMicro);
  }

  // Quick table: always from -> to, each row rounded independently
  // from its exact product, never derived by scaling another row.
  const quickTable = QUICK_TABLE_CENTS.map((stepCents) => ({
    amountCents: stepCents,
    convertedCents: Number(roundHalfUpDiv(BigInt(stepCents) * rateMicro, 1000000n)),
  }));

  const inverseRate = formatSixSignificant(1000000n, rateMicro);

  const result = {
    fromCode,
    toCode,
    direction,
    amountCents: Number(amountCents),
    rateMicro: Number(rateMicro),
    convertedCents: Number(convertedCents),
    inverseRate,
    quickTable,
  };

  // Report cap backstop (SPEC section 3): a result over the cap is an
  // OUTPUT_LIMIT error instead of a success. With the pinned ranges a
  // real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Display: a cents value as "integer.two digits" (315000 -> "3150.00").
// No thousands separators, no currency symbols (SPEC section 3, step 9).
export function formatCents(cents) {
  const text = String(cents);
  if (text.length <= 2) return `0.${text.padStart(2, "0")}`;
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}

// Display: a rateMicro value with trailing fractional zeros stripped
// (31500000 -> "31.5"; 6600 -> "0.0066"; 1000000 -> "1").
export function formatRate(rateMicro) {
  const whole = Math.floor(rateMicro / 1000000);
  const fraction = String(rateMicro % 1000000).padStart(6, "0").replace(/0+$/, "");
  return fraction === "" ? String(whole) : `${whole}.${fraction}`;
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
