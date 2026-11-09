// Pure core for the Salary Converter.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-salary-converter-20261109): one salary amount entered under one of
// four bases (monthly / daily / hourly / annual) plus a year-end bonus in
// months, converted to all six figures under the disclosed Taiwan
// conventions — daily = monthly / 30, hourly = monthly / 240 (30 days x
// 8 hours), annual = monthly x (12 + bonus months). These are conventions,
// not Labor Standards Act definitions. All arithmetic is exact rational
// arithmetic on BigInt: the amount is parsed to hundredths, the bonus to
// tenths, the normalized monthly figure M stays an unrounded fraction,
// and each output is rounded half-up exactly once. No floating point.

export const FIELDS = ["sourceBasis", "amount", "bonusMonths"];

export const BASES = ["monthly", "daily", "hourly", "annual"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  sourceBasis: 7,
  amount: 12,
  bonusMonths: 4,
};

export const DEFAULTS = {
  sourceBasis: "monthly",
  amount: "40000",
  bonusMonths: "1",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  sourceBasis: "monthly",
  amount: "40000",
  bonusMonths: "2",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "salary-converter-report.json";

// Amount: integer part "0" or non-zero-led, no spaces/sign/exponent/group
// separators, optional fraction of 1-2 digits. Bonus months: same integer
// part, optional fraction of exactly 1 digit.
const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const BONUS_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;

// Per-basis amount caps, in hundredths of NT$ (the amount must be > 0):
// monthly 99,999,999 / daily 9,999,999 / hourly 999,999 /
// annual 999,999,999. The caps are input guardrails, not salary guidance.
const AMOUNT_CAPS_HUNDREDTHS = {
  monthly: 9999999900n,
  daily: 999999900n,
  hourly: 99999900n,
  annual: 99999999900n,
};

// Bonus range in tenths of a month, inclusive: 0 to 24.
const BONUS_MIN_TENTHS = 0n;
const BONUS_MAX_TENTHS = 240n;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
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

// Schema gate: the input must be a plain object whose own properties are
// exactly the three fields, each an own data property (no accessors)
// holding a string. Anything else is SCHEMA with field/row null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
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

// Parse a grammar-valid amount string into hundredths (BigInt, exact).
function parseHundredths(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(frac2);
}

// Parse a grammar-valid bonus string into tenths of a month (BigInt).
function parseTenths(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracDigit = dot === -1 ? "0" : raw.slice(dot + 1);
  return BigInt(intPart) * 10n + BigInt(fracDigit);
}

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT), unpaired
// surrogate (UNICODE), missing content (EMPTY), grammar (ENUM for
// sourceBasis, DECIMAL_FORMAT for the numeric fields), range (RANGE). The
// amount's range uses the already-validated basis to select its cap.
// Returns null when valid, otherwise the error object.
function validateField(field, raw, basis) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (field === "sourceBasis") {
    if (!BASES.includes(raw)) return { code: "ENUM", field, row: null };
    return null;
  }
  if (field === "amount") {
    if (!AMOUNT_PATTERN.test(raw)) return { code: "DECIMAL_FORMAT", field, row: null };
    const hundredths = parseHundredths(raw);
    if (hundredths <= 0n || hundredths > AMOUNT_CAPS_HUNDREDTHS[basis]) {
      return { code: "RANGE", field, row: null };
    }
    return null;
  }
  if (!BONUS_PATTERN.test(raw)) return { code: "DECIMAL_FORMAT", field, row: null };
  const tenths = parseTenths(raw);
  if (tenths < BONUS_MIN_TENTHS || tenths > BONUS_MAX_TENTHS) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input: schema first, then fields in the fixed order
// sourceBasis, amount, bonusMonths; the first error wins (a bad basis is
// reported before any amount error, since the amount cap depends on it).
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field], values.sourceBasis);
    if (error !== null) return { ok: false, error };
  }
  return {
    ok: true,
    values: {
      sourceBasis: values.sourceBasis,
      amountHundredths: parseHundredths(values.amount),
      bonusTenths: parseTenths(values.bonusMonths),
    },
  };
}

// roundHalfUp(p / q) for non-negative BigInts, per the SPEC:
// floor((2p + q) / (2q)). Exactly .5 rounds up.
function roundHalfUp(p, q) {
  return (2n * p + q) / (2n * q);
}

// Outputs are bounded by the input caps (the largest possible annualTotal
// is 10,799,998,920, the daily cap x 30 x 36), far below 2^53, so every
// BigInt result converts to an exact safe integer.
function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new Error("Result outside the safe-integer range");
  }
  return num;
}

// The conversion. The normalized monthly figure M is kept as the exact
// fraction num/den; all six outputs are derived from the unrounded M and
// rounded half-up once, so the displayed figures can differ by NT$1 from
// each other (annualTotal is multiplied back from M directly, never the
// sum of the rounded annualBase and bonusAmount).
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { sourceBasis, amountHundredths: a, bonusTenths: b } = validated.values;

  let num;
  let den;
  if (sourceBasis === "monthly") {
    num = a;
    den = 100n;
  } else if (sourceBasis === "daily") {
    num = a * 30n;
    den = 100n;
  } else if (sourceBasis === "hourly") {
    num = a * 240n;
    den = 100n;
  } else {
    // annual: M = A / (12 + B) with A in NT$ and B in months.
    num = a * 10n;
    den = 100n * (120n + b);
  }

  const result = {
    monthly: toSafeNumber(roundHalfUp(num, den)),
    daily: toSafeNumber(roundHalfUp(num, den * 30n)),
    hourly: toSafeNumber(roundHalfUp(num, den * 240n)),
    annualBase: toSafeNumber(roundHalfUp(num * 12n, den)),
    bonusAmount: toSafeNumber(roundHalfUp(num * b, den * 10n)),
    annualTotal: toSafeNumber(roundHalfUp(num * (120n + b), den * 10n)),
  };
  return { ok: true, result };
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): whole NT$ with thousands grouped by ",".
export function formatAmount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit the
// result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
