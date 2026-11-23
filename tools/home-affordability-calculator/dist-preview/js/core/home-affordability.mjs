// Pure core for the Home Affordability Calculator
// (spec-home-affordability-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Model (SPEC inputsOutputs, all amounts integer NTD, ratios exact
// rationals, rounding half-up unless stated otherwise):
//   monthlyGrossIncome = round-half-up(annualIncome / 12)
//   frontEndLimit = round-half-up(annualIncome x frontEndCapPct / 1200)
//     (exact rational, one rounding — never monthly income first)
//   backEndLimit = round-half-up(annualIncome x backEndCapPct / 1200)
//     - otherDebts (round first, then subtract; may be negative)
//   maxMonthlyPayment = max(0, min(frontEndLimit, backEndLimit))
//   bindingCap: "front" | "back" | "equal" (decided on the limits
//     even when the maximum payment is 0)
//   n = years x 12; i = mortgageRate / 1200 (rate in percent)
//   maxLoanAmount: 0 when the payment is 0; payment x n when i = 0;
//     otherwise floor(payment x (1 - (1+i)^(-n)) / i) — conservative,
//     the loan never exceeds what the payment can support
//   maxHomePrice = maxLoanAmount + downPayment
//   affordable = maxMonthlyPayment > 0 (false still succeeds, with
//     loan 0 and price equal to the down payment)
//   frontEndPctAtMax / backEndPctAtMax: 1-decimal percentages,
//     half-up, denominator always the rounded monthlyGrossIncome.
//
// Exactness: every rational is carried as BigInt integers. The
// annuity factor is evaluated as the exact rational
//   D x ((D+r)^n - D^n) / (r x (D+r)^n)
// with D = 12,000,000 and r = mortgageRate in ten-thousandths of a
// percent, then floored by integer division — no floating point
// anywhere in the derivation, so the result is the exact floor the
// SPEC pins, not a 50-digit approximation of it.

export const FIELDS = [
  "annualIncome",
  "downPayment",
  "mortgageRate",
  "years",
  "otherDebts",
  "frontEndCapPct",
  "backEndCapPct",
];

// SPEC preset defaults (also the reset target in userFlow). They
// coincide with the worked example (fixtures.json case 1,
// typical-taipei).
export const DEFAULTS = {
  annualIncome: "1200000",
  downPayment: "2000000",
  mortgageRate: "2",
  years: "30",
  otherDebts: "0",
  frontEndCapPct: "28",
  backEndCapPct: "36",
};

// The worked example is fixtures.json case 1 (typical-taipei)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  annualIncome: "1200000",
  backEndCapPct: "36",
  downPayment: "2000000",
  frontEndCapPct: "28",
  mortgageRate: "2",
  otherDebts: "0",
  years: "30",
};

export const MAX_RAW_UNITS = 12;

export const ANNUAL_INCOME_MIN = 1;
export const ANNUAL_INCOME_MAX = 1000000000;
export const DOWN_PAYMENT_MIN = 0;
export const DOWN_PAYMENT_MAX = 1000000000;
export const YEARS_MIN = 1;
export const YEARS_MAX = 40;
export const OTHER_DEBTS_MIN = 0;
export const OTHER_DEBTS_MAX = 1000000;
// mortgageRate: 0–30%, at most 4 decimal places.
export const MORTGAGE_RATE_MIN = 0;
export const MORTGAGE_RATE_MAX = 30;
export const MORTGAGE_RATE_MAX_DECIMALS = 4;
// frontEndCapPct: 10–50%, at most 2 decimal places.
export const FRONT_END_CAP_MIN = 10;
export const FRONT_END_CAP_MAX = 50;
export const FRONT_END_CAP_MAX_DECIMALS = 2;
// backEndCapPct: 20–60%, at most 2 decimal places.
export const BACK_END_CAP_MIN = 20;
export const BACK_END_CAP_MAX = 60;
export const BACK_END_CAP_MAX_DECIMALS = 2;

// Pinned §inputsOutputs disclaimer (verbatim, both languages).
// Shown fixed above the results area of both pages.
export const DISCLAIMER_ZH =
  "本工具僅依你輸入的假設與 28/36 負擔比率試算；月付只計房貸本金加利息，不含稅金、保險、管理費與房貸成數限制，不是財務建議、銀行報價或核貸保證。";
export const DISCLAIMER_EN =
  "This tool estimates only from the assumptions you enter and the 28/36 debt-to-income guideline. The monthly payment counts mortgage principal and interest only, excluding taxes, insurance, management fees and loan-to-value limits, and is not financial advice, a bank quotation or a loan approval guarantee.";

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the seven
// fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

// Half-up rounding of a non-negative exact rational num/den to an
// integer, in BigInt arithmetic: (2*num + den) / (2*den), floored.
function roundHalfUp(num, den) {
  return (2n * num + den) / (2n * den);
}

// Validates one integer field in the SPEC order: capacity, empty,
// grammar, range. Returns the parsed integer or an { error } outcome.
function validateIntegerField(field, value, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

// Validates one ratio field in the SPEC order: capacity, empty,
// grammar, range. A leading minus (including "-0") is DECIMAL_FORMAT
// by the grammar pattern. Returns the value scaled to an integer:
// mortgageRate in ten-thousandths of a percent, caps in hundredths
// of a percent. Decimal places are counted from the raw text, so
// "28.10" (2 places) passes while "28.100" (3 places) fails even
// though both equal 28.1 numerically.
function validateRatioField(field, value, minScaled, maxScaled, scale, maxDecimals) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  const match = DECIMAL_PATTERN.exec(value);
  if (match === null) return { error: failure("DECIMAL_FORMAT", field) };
  const fraction = match[2] === undefined ? "" : match[2].slice(1);
  if (fraction.length > maxDecimals) return { error: failure("DECIMAL_FORMAT", field) };
  const scaled =
    BigInt(match[1]) * BigInt(scale) +
    BigInt(fraction.padEnd(maxDecimals, "0") || "0") *
      BigInt(scale / 10 ** maxDecimals);
  if (scaled < BigInt(minScaled) || scaled > BigInt(maxScaled)) {
    return { error: failure("RANGE", field) };
  }
  return { value: scaled };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Field order is the validation order: annualIncome, downPayment,
  // mortgageRate, years, otherDebts, frontEndCapPct, backEndCapPct.
  const annualIncome = validateIntegerField(
    "annualIncome",
    raw.annualIncome,
    ANNUAL_INCOME_MIN,
    ANNUAL_INCOME_MAX,
  );
  if (annualIncome.error) return annualIncome.error;
  const downPayment = validateIntegerField(
    "downPayment",
    raw.downPayment,
    DOWN_PAYMENT_MIN,
    DOWN_PAYMENT_MAX,
  );
  if (downPayment.error) return downPayment.error;
  const mortgageRate = validateRatioField(
    "mortgageRate",
    raw.mortgageRate,
    MORTGAGE_RATE_MIN * 10000,
    MORTGAGE_RATE_MAX * 10000,
    10000,
    MORTGAGE_RATE_MAX_DECIMALS,
  );
  if (mortgageRate.error) return mortgageRate.error;
  const years = validateIntegerField("years", raw.years, YEARS_MIN, YEARS_MAX);
  if (years.error) return years.error;
  const otherDebts = validateIntegerField(
    "otherDebts",
    raw.otherDebts,
    OTHER_DEBTS_MIN,
    OTHER_DEBTS_MAX,
  );
  if (otherDebts.error) return otherDebts.error;
  const frontEndCap = validateRatioField(
    "frontEndCapPct",
    raw.frontEndCapPct,
    FRONT_END_CAP_MIN * 100,
    FRONT_END_CAP_MAX * 100,
    100,
    FRONT_END_CAP_MAX_DECIMALS,
  );
  if (frontEndCap.error) return frontEndCap.error;
  const backEndCap = validateRatioField(
    "backEndCapPct",
    raw.backEndCapPct,
    BACK_END_CAP_MIN * 100,
    BACK_END_CAP_MAX * 100,
    100,
    BACK_END_CAP_MAX_DECIMALS,
  );
  if (backEndCap.error) return backEndCap.error;

  // Cross-field check, last: the back-end cap must not be lower than
  // the front-end cap. Equal is legal.
  if (backEndCap.value < frontEndCap.value) {
    return failure("CAP_ORDER", "backEndCapPct");
  }

  const income = BigInt(annualIncome.value);
  const debts = BigInt(otherDebts.value);

  const monthlyGrossIncome = Number(roundHalfUp(income, 12n));
  // Exact rational, one rounding: income x cap-hundredths / 120000.
  const frontEndLimit = Number(
    roundHalfUp(income * frontEndCap.value, 120000n),
  );
  const backEndLimit = Number(
    roundHalfUp(income * backEndCap.value, 120000n) - debts,
  );

  const maxMonthlyPayment = Math.max(0, Math.min(frontEndLimit, backEndLimit));
  const bindingCap =
    frontEndLimit < backEndLimit
      ? "front"
      : backEndLimit < frontEndLimit
        ? "back"
        : "equal";

  const months = years.value * 12;
  // i = mortgageRate / 1200; mortgageRate in ten-thousandths, so
  // i = r / 12,000,000 with D = 12,000,000 as the exact denominator.
  const rateScaled = mortgageRate.value;
  let maxLoanAmount;
  if (maxMonthlyPayment === 0) {
    maxLoanAmount = 0;
  } else if (rateScaled === 0n) {
    maxLoanAmount = maxMonthlyPayment * months;
  } else {
    const bigD = 12000000n;
    const base = bigD + rateScaled;
    const powered = base ** BigInt(months);
    const numerator =
      BigInt(maxMonthlyPayment) * bigD * (powered - bigD ** BigInt(months));
    const denominator = rateScaled * powered;
    maxLoanAmount = Number(numerator / denominator);
  }
  const maxHomePrice = maxLoanAmount + downPayment.value;

  // One-decimal percentages, half-up, denominator always the rounded
  // monthly gross income. monthlyGrossIncome is 0 only for
  // annualIncome 1–5 (round-half-up of income/12); the SPEC does not
  // define the ratio there, so the implementation reports 0.0 for
  // both (recorded as spec-errata candidate 1 in HANDOFF.md).
  let frontEndPctAtMax;
  let backEndPctAtMax;
  if (monthlyGrossIncome === 0) {
    frontEndPctAtMax = 0;
    backEndPctAtMax = 0;
  } else {
    const monthly = BigInt(monthlyGrossIncome);
    frontEndPctAtMax =
      Number(roundHalfUp(BigInt(maxMonthlyPayment) * 1000n, monthly)) / 10;
    backEndPctAtMax =
      Number(roundHalfUp(BigInt(maxMonthlyPayment + otherDebts.value) * 1000n, monthly)) /
      10;
  }

  return {
    ok: true,
    result: {
      monthlyGrossIncome,
      frontEndLimit,
      backEndLimit,
      maxMonthlyPayment,
      bindingCap,
      maxLoanAmount,
      maxHomePrice,
      frontEndPctAtMax,
      backEndPctAtMax,
      affordable: maxMonthlyPayment > 0,
    },
  };
}

// Fixed report download: home-affordability-report.json. The content
// is the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, finite numbers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "home-affordability-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    // JSON.stringify gives the shortest round-trip decimal: integers
    // stay integers (28, not 28.0) and the 1-decimal percentages keep
    // exactly one decimal (34.7).
    return JSON.stringify(value);
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
