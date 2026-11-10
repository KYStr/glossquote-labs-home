// Pure core for the Bill Split Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-bill-split-calculator-20261109): one bill split equally — tax on
// the bill amount, a tip on a chosen pre-tax or post-tax base, and the
// total divided so the shares sum exactly, with the remainder cents going
// to the earliest payers one each. All money is integer cents and all
// percentages are milli-percent (percent x 1000); tax and tip each round
// half-up exactly once using BigInt arithmetic only. No floating point
// anywhere: a float would move the exact-half boundaries.

export const FIELDS = ["bill", "taxPercent", "tipPercent", "tipBase", "people"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  bill: 9,
  taxPercent: 7,
  tipPercent: 7,
  tipBase: 8,
  people: 3,
};

export const DEFAULTS = {
  bill: "100.00",
  taxPercent: "10",
  tipPercent: "15",
  tipBase: "pre-tax",
  people: "3",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  bill: "100.00",
  taxPercent: "10",
  tipPercent: "15",
  tipBase: "pre-tax",
  people: "3",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "bill-split-report.json";

// Bill: integer part with no leading zero unless the part is "0" itself,
// optional fraction of 1-2 digits. Percent: same integer shape, fraction
// of 1-3 digits. People: plain ASCII integer, no leading zero unless "0".
const BILL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const PERCENT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$/;
const PEOPLE_PATTERN = /^(0|[1-9][0-9]*)$/;

const FIELD_KIND = {
  bill: "money",
  taxPercent: "percent",
  tipPercent: "percent",
  tipBase: "enum",
  people: "integer",
};
const PATTERNS = { money: BILL_PATTERN, percent: PERCENT_PATTERN, integer: PEOPLE_PATTERN };
const FORMAT_CODES = { money: "DECIMAL_FORMAT", percent: "DECIMAL_FORMAT", integer: "INTEGER_FORMAT" };
const TIP_BASES = ["pre-tax", "post-tax"];
// Inclusive ranges, in cents for the bill, milli-percent for percents,
// and plain people for the count. Stored as BigInt so comparisons are
// exact.
const RANGES = {
  bill: [0n, 99999999n],
  taxPercent: [0n, 100000n],
  tipPercent: [0n, 100000n],
  people: [1n, 100n],
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
// exactly the five fields, each an own data property (no accessors)
// holding a string. Anything else — unknown or missing keys, wrong types,
// getters, proxies that throw — is SCHEMA with field/row null.
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

// Parse a grammar-valid bill string into cents: integer part x 100 plus
// the fraction padded to two digits. Exact BigInt arithmetic; the grammar
// guarantees the shape.
function parseBillCents(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(frac2);
}

// Parse a grammar-valid percent string into milli-percent (percent x
// 1000): integer part x 1000 plus the fraction padded to three digits.
function parsePercentMilli(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac3 = (fracPart + "000").slice(0, 3);
  return BigInt(intPart) * 1000n + BigInt(frac3);
}

function parseFieldValue(field, raw) {
  const kind = FIELD_KIND[field];
  if (kind === "money") return parseBillCents(raw);
  if (kind === "percent") return parsePercentMilli(raw);
  if (kind === "integer") return BigInt(raw);
  return null; // tipBase is an enum; it has no numeric value.
}

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT),
// unpaired surrogate (UNICODE), missing content (EMPTY), grammar or enum
// (DECIMAL_FORMAT / INTEGER_FORMAT / ENUM), range (RANGE). Returns null
// when valid, otherwise the error.
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
  if (FIELD_KIND[field] === "enum") {
    if (!TIP_BASES.includes(raw)) {
      return { code: "ENUM", field, row: null };
    }
    return null;
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
// bill, taxPercent, tipPercent, tipBase, people; the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  return {
    ok: true,
    values: {
      billCents: parseFieldValue("bill", values.bill),
      taxMilli: parseFieldValue("taxPercent", values.taxPercent),
      tipMilli: parseFieldValue("tipPercent", values.tipPercent),
      tipBase: values.tipBase,
      people: parseFieldValue("people", values.people),
    },
  };
}

// roundHalfUp(n / d) for non-negative BigInts, per the SPEC: take the
// quotient q and remainder r of n / d; if 2r >= d the result is q + 1,
// otherwise q. An exact half rounds up.
function roundHalfUp(n, d) {
  const q = n / d;
  const r = n - q * d;
  return 2n * r >= d ? q + 1n : q;
}

// Outputs are bounded by the input ranges (the total stays below 2^31),
// so every BigInt result converts to an exact safe integer.
function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new Error("Result outside the safe-integer range");
  }
  return num;
}

// The split. Tax is computed on the bill and rounded once; the tip base
// is the bill alone (pre-tax) or the bill plus the already-rounded tax
// (post-tax), and the tip rounds once; the total is never rounded again.
// The total is then divided evenly: with q = floor(total / people) and
// r = total - q * people, the first r people pay q + 1 and the rest pay
// q, so the shares always sum to the total and differ by at most one
// cent.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { billCents, taxMilli, tipMilli, tipBase, people } = validated.values;

  const taxCents = roundHalfUp(billCents * taxMilli, 100000n);
  const tipBaseCents = tipBase === "post-tax" ? billCents + taxCents : billCents;
  const tipCents = roundHalfUp(tipBaseCents * tipMilli, 100000n);
  const totalCents = billCents + taxCents + tipCents;

  const q = totalCents / people;
  const r = totalCents - q * people;
  const sharesCents = [];
  for (let i = 0n; i < people; i += 1n) {
    sharesCents.push(toSafeNumber(i < r ? q + 1n : q));
  }

  return {
    ok: true,
    result: {
      billCents: toSafeNumber(billCents),
      taxCents: toSafeNumber(taxCents),
      tipBaseCents: toSafeNumber(tipBaseCents),
      tipCents: toSafeNumber(tipCents),
      totalCents: toSafeNumber(totalCents),
      sharesCents,
    },
  };
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): integer part, a dot, and exactly two decimals —
// no thousands separators and no currency symbol, per the SPEC.
export function formatMoney(cents) {
  const frac = cents % 100;
  const whole = (cents - frac) / 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
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

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit
// the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
