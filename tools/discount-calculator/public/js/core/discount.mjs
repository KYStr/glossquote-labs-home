// Pure core for the Discount Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-discount-calculator-20261109): one item, two stacked percentage
// discounts, a fixed-amount coupon, tax applied after discounts, quantity.
// All money is integer cents and all percentages are basis points; every
// step rounds half-up using BigInt arithmetic only. No floating point and
// no parseFloat anywhere: a float would move the .5 half-up boundaries.

export const FIELDS = ["price", "discount1", "discount2", "coupon", "taxRate", "quantity"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  price: 12,
  discount1: 8,
  discount2: 8,
  coupon: 12,
  taxRate: 8,
  quantity: 4,
};

export const DEFAULTS = {
  price: "1000",
  discount1: "20",
  discount2: "10",
  coupon: "0",
  taxRate: "5",
  quantity: "1",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  price: "1000",
  discount1: "20",
  discount2: "10",
  coupon: "0",
  taxRate: "5",
  quantity: "1",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "discount-calculator-report.json";

// Money: integer part 1-7 digits, no leading zero unless the part is "0"
// itself, optional fraction of 1-2 digits. Percent: same with 1-3 integer
// digits. Quantity: plain ASCII integer, no leading zero unless "0".
const MONEY_PATTERN = /^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$/;
const PERCENT_PATTERN = /^(0|[1-9][0-9]{0,2})(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

const FIELD_KIND = {
  price: "money",
  discount1: "percent",
  discount2: "percent",
  coupon: "money",
  taxRate: "percent",
  quantity: "integer",
};
const PATTERNS = { money: MONEY_PATTERN, percent: PERCENT_PATTERN, integer: INTEGER_PATTERN };
const FORMAT_CODES = { money: "MONEY_FORMAT", percent: "PERCENT_FORMAT", integer: "INTEGER_FORMAT" };
// Inclusive ranges, in cents for money, basis points for percents, and
// plain units for quantity. Stored as BigInt so comparisons are exact.
const RANGES = {
  price: [1n, 999999999n],
  discount1: [0n, 10000n],
  discount2: [0n, 10000n],
  coupon: [0n, 999999999n],
  taxRate: [0n, 10000n],
  quantity: [1n, 999n],
};

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
// exactly the six fields, each an own data property (no accessors) holding
// a string. Anything else — unknown or missing keys, wrong types, getters,
// proxies that throw — is SCHEMA with field/row null.
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

// Parse a grammar-valid decimal string into hundredths (cents for money,
// basis points for percents): integer part x 100 plus the fraction padded
// to two digits. Exact BigInt arithmetic; the grammar guarantees the shape.
function parseHundredths(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(frac2);
}

function parseFieldValue(field, raw) {
  if (FIELD_KIND[field] === "integer") return BigInt(raw);
  return parseHundredths(raw);
}

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT), unpaired
// surrogate (UNICODE), missing content (EMPTY), grammar (the kind's FORMAT
// code), range (RANGE). Returns null when valid, otherwise the error.
function validateField(field, raw) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (!PATTERNS[FIELD_KIND[field]].test(raw)) {
    return { code: FORMAT_CODES[FIELD_KIND[field]], field, row: null };
  }
  const value = parseFieldValue(field, raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input: schema first, then fields in the fixed order
// price, discount1, discount2, coupon, taxRate, quantity; the first error
// wins. There are no cross-field errors.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  const parsed = {};
  for (const field of FIELDS) parsed[field] = parseFieldValue(field, values[field]);
  return { ok: true, values: parsed };
}

// roundHalfUp(a / b) for non-negative BigInts, per the SPEC:
// floor((2a + b) / (2b)).
function roundHalfUp(a, b) {
  return (2n * a + b) / (2n * b);
}

// One discount step: p * keep / 10000 rounded half-up, as
// floor((p * keep + 5000) / 10000).
function applyPercentOff(cents, offBp) {
  const keep = 10000n - offBp;
  return (cents * keep + 5000n) / 10000n;
}

// Outputs are bounded by the input ranges (totals stay far below 2^53),
// so every BigInt result converts to an exact safe integer.
function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new Error("Result outside the safe-integer range");
  }
  return num;
}

function formatHundredths(hundredths) {
  const whole = hundredths / 100n;
  const frac = hundredths % 100n;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

// The price chain. Discounts multiply (never add). The coupon applies
// after both discounts and only up to the discounted price; tax applies
// only to the after-coupon price. Savings, the effective percent off and
// the zhe figure are all measured on the pre-tax discounted price p3:
// tax is not a discount.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { price, discount1, discount2, coupon, taxRate, quantity } = validated.values;

  const p0 = price;
  const p1 = applyPercentOff(p0, discount1);
  const saved1 = p0 - p1;
  const p2 = applyPercentOff(p1, discount2);
  const saved2 = p1 - p2;
  const appliedCoupon = coupon < p2 ? coupon : p2;
  const p3 = p2 - appliedCoupon;
  const tax = (p3 * taxRate + 5000n) / 10000n;
  const p4 = p3 + tax;

  const totalCents = p4 * quantity;
  const listTotalCents = p0 * quantity;
  const totalSavedCents = (p0 - p3) * quantity;
  // p0 >= 1 by range, so neither division can divide by zero.
  const effectiveHundredths = roundHalfUp((p0 - p3) * 10000n, p0);
  const zheTenths = roundHalfUp(p3 * 100n, p0);

  return {
    ok: true,
    result: {
      steps: [
        { kind: "list", priceCents: toSafeNumber(p0) },
        {
          kind: "discount1",
          offBp: toSafeNumber(discount1),
          savedCents: toSafeNumber(saved1),
          priceCents: toSafeNumber(p1),
        },
        {
          kind: "discount2",
          offBp: toSafeNumber(discount2),
          savedCents: toSafeNumber(saved2),
          priceCents: toSafeNumber(p2),
        },
        { kind: "coupon", appliedCents: toSafeNumber(appliedCoupon), priceCents: toSafeNumber(p3) },
        {
          kind: "tax",
          rateBp: toSafeNumber(taxRate),
          taxCents: toSafeNumber(tax),
          priceCents: toSafeNumber(p4),
        },
      ],
      unitFinalCents: toSafeNumber(p4),
      totalCents: toSafeNumber(totalCents),
      listTotalCents: toSafeNumber(listTotalCents),
      totalSavedCents: toSafeNumber(totalSavedCents),
      effectiveOffPercent: formatHundredths(effectiveHundredths),
      zhe: `${zheTenths / 10n}.${zheTenths % 10n}`,
    },
  };
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): amounts group thousands with "," and always show
// exactly two decimals.
export function formatMoney(cents) {
  const frac = cents % 100;
  const whole = (cents - frac) / 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${String(frac).padStart(2, "0")}`;
}

// Basis points as a percent figure with trailing zeros trimmed:
// 2000 -> "20", 1250 -> "12.5", 50 -> "0.5", 5 -> "0.05".
export function formatPercentBp(bp) {
  const whole = Math.floor(bp / 100);
  const frac = bp % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

// The zhe display drops a trailing ".0": "8.0" -> "8", "7.2" -> "7.2".
export function formatZheDisplay(zhe) {
  return zhe.endsWith(".0") ? zhe.slice(0, -2) : zhe;
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
