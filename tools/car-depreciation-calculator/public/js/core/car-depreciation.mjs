// Pure core for the Car Depreciation Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-car-depreciation-calculator-20261109): three depreciation models
// (declining balance, straight line, year-by-year rate table), a salvage
// floor that applies to all three, and a year-by-year schedule whose
// length equals the years field. All money is integer NT$, all percentages
// are hundredths of a percent (ph); every step uses BigInt arithmetic
// only, with the SPEC's roundHalfUp. No floating point and no parseFloat
// anywhere: a float would move the .5 half-up boundaries. The yearly
// chain is pinned: each year's end value is computed from the previous
// year's already-rounded end value, never from a closed form.

export const FIELDS = ["method", "price", "years", "salvagePercent", "rate", "usefulLife", "tableRates"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  method: 9,
  price: 9,
  years: 2,
  salvagePercent: 5,
  rate: 5,
  usefulLife: 2,
  tableRates: 256,
};

export const DEFAULTS = {
  method: "declining",
  price: "880000",
  years: "5",
  salvagePercent: "10",
  rate: "15",
  usefulLife: "10",
  tableRates: "20\n18\n15\n12\n10\n8\n8\n6\n6\n5",
};

// The first fixture in fixtures.json (declining-basic) applied over the
// defaults; "Load example" fills this draft in.
export const EXAMPLE = {
  ...DEFAULTS,
  price: "1000000",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "car-depreciation-report.json";

const UNION_FIELDS = new Set([
  "method",
  "price",
  "years",
  "salvagePercent",
  "rate",
  "usefulLife",
  "tableRates",
]);
const COMMON_FIELDS = ["method", "price", "years", "salvagePercent"];
const METHOD_FIELDS = { declining: "rate", straight: "usefulLife", table: "tableRates" };
const METHODS = ["declining", "straight", "table"];

// Integer: "0" or a non-zero-leading digit string. Decimal: same integer
// part, optionally "." plus 1-2 fraction digits. ASCII digits only.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

// Inclusive ranges. Integers are plain units; decimals are hundredths of
// a percent (ph): 15 -> 1500, 15.25 -> 1525.
const RANGES = {
  price: [1n, 999999999n],
  years: [0n, 30n],
  salvagePercent: [0n, 5000n],
  rate: [0n, 9000n],
  usefulLife: [1n, 30n],
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

// Schema gate (SPEC step 1): the input must be a plain object whose own
// keys are all inside the union {method, price, years, salvagePercent,
// rate, usefulLife, tableRates}, every present value an own data property
// holding a string, and the four common fields present. Anything else is
// SCHEMA with field/row null. Which method-specific field is required is
// decided later, after the method itself validates.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return null;
  }
  for (const key of keys) {
    if (!UNION_FIELDS.has(key)) return null;
  }
  const values = {};
  for (const key of keys) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, key);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[key] = descriptor.value;
  }
  for (const field of COMMON_FIELDS) {
    if (!(field in values)) return null;
  }
  return values;
}

// Parse a grammar-valid decimal string into hundredths of a percent (ph):
// integer part x 100 plus the fraction padded to two digits. Exact BigInt
// arithmetic; the grammar guarantees the shape.
function parseHundredths(raw) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  const frac2 = (fracPart + "00").slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(frac2);
}

// Validate one scalar field in the SPEC's order: capacity (INPUT_LIMIT),
// unpaired surrogate (UNICODE), missing content (EMPTY), grammar
// (ENUM / INTEGER_FORMAT / DECIMAL_FORMAT), range (RANGE). Returns null
// when valid, otherwise the error. `kind` is "method", "integer" or
// "decimal".
function validateScalar(field, raw, kind) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (kind === "method") {
    if (!METHODS.includes(raw)) return { code: "ENUM", field, row: null };
    return null;
  }
  const pattern = kind === "integer" ? INTEGER_PATTERN : DECIMAL_PATTERN;
  const formatCode = kind === "integer" ? "INTEGER_FORMAT" : "DECIMAL_FORMAT";
  if (!pattern.test(raw)) {
    return { code: formatCode, field, row: null };
  }
  const value = kind === "integer" ? BigInt(raw) : parseHundredths(raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the rate table: capacity, surrogate, empty on the whole raw
// string, then ROW_LIMIT on the row count (a single trailing LF does not
// create an extra row), then grammar (DECIMAL_FORMAT) for every row, then
// range (RANGE) for every row. Row errors carry the 1-based row number.
function validateTableRates(raw) {
  const field = "tableRates";
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  const rows = raw.split("\n");
  if (rows.length > 1 && rows[rows.length - 1] === "") rows.pop();
  if (rows.length > 30) {
    return { code: "ROW_LIMIT", field, row: null };
  }
  for (let i = 0; i < rows.length; i += 1) {
    if (!DECIMAL_PATTERN.test(rows[i])) {
      return { code: "DECIMAL_FORMAT", field, row: i + 1 };
    }
  }
  for (let i = 0; i < rows.length; i += 1) {
    const ph = parseHundredths(rows[i]);
    if (ph < 0n || ph > 9000n) {
      return { code: "RANGE", field, row: i + 1 };
    }
  }
  return null;
}

// Split a grammar-valid tableRates value into its per-row ph values. A
// single trailing LF does not create an extra row.
function parseTableRates(raw) {
  const rows = raw.split("\n");
  if (rows.length > 1 && rows[rows.length - 1] === "") rows.pop();
  return rows.map((row) => parseHundredths(row));
}

// Validate the whole input in the SPEC's fixed order: schema, then
// method, price, years, salvagePercent, then the method-specific field
// (presence is SCHEMA, checked only after the method validates, then
// grammar/range). The first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  let error = validateScalar("method", values.method, "method");
  if (error !== null) return { ok: false, error };
  error = validateScalar("price", values.price, "integer");
  if (error !== null) return { ok: false, error };
  error = validateScalar("years", values.years, "integer");
  if (error !== null) return { ok: false, error };
  error = validateScalar("salvagePercent", values.salvagePercent, "decimal");
  if (error !== null) return { ok: false, error };
  const methodField = METHOD_FIELDS[values.method];
  const keys = Object.keys(values);
  const expectedKeys = [...COMMON_FIELDS, methodField];
  if (keys.length !== expectedKeys.length || !expectedKeys.every((key) => key in values)) {
    return schemaError();
  }
  if (methodField === "tableRates") {
    error = validateTableRates(values.tableRates);
  } else if (methodField === "usefulLife") {
    error = validateScalar("usefulLife", values.usefulLife, "integer");
  } else {
    error = validateScalar("rate", values.rate, "decimal");
  }
  if (error !== null) return { ok: false, error };
  const parsed = {
    method: values.method,
    price: BigInt(values.price),
    years: Number(values.years),
    salvagePh: parseHundredths(values.salvagePercent),
  };
  if (methodField === "rate") parsed.ratePh = parseHundredths(values.rate);
  if (methodField === "usefulLife") parsed.usefulLife = Number(values.usefulLife);
  if (methodField === "tableRates") parsed.tablePh = parseTableRates(values.tableRates);
  return { ok: true, values: parsed };
}

// roundHalfUp(a / b) for non-negative BigInts, per the SPEC:
// floor((2a + b) / (2b)).
function roundHalfUp(a, b) {
  return (2n * a + b) / (2n * b);
}

// Outputs are bounded by the input ranges (values stay far below 2^53),
// so every BigInt result converts to an exact safe integer.
function toSafeNumber(value) {
  const num = Number(value);
  if (!Number.isSafeInteger(num)) {
    throw new Error("Result outside the safe-integer range");
  }
  return num;
}

// Hundredths of a percent as a string with exactly two decimals:
// 1500 -> "15.00", 5 -> "0.05".
function formatHundredths(hundredths) {
  const whole = hundredths / 100n;
  const frac = hundredths % 100n;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

// The depreciation chain (SPEC steps 4-6). The salvage floor is computed
// once; the straight-line annual amount is computed once; every year's
// end value is computed from the previous year's already-rounded end
// value (the pinned rounding chain). floored is true only when the
// unclamped raw value is strictly below the floor, so a year that lands
// exactly on the floor is not marked floored.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { method, price, years, salvagePh } = validated.values;

  const floorValue = roundHalfUp(price * salvagePh, 10000n);
  let annualDep = null;
  if (method === "straight") {
    annualDep = roundHalfUp(price - floorValue, BigInt(validated.values.usefulLife));
  }

  const schedule = [];
  let current = price;
  let floorReachedYear = null;
  for (let year = 1; year <= years; year += 1) {
    let ratePh = null;
    let raw;
    if (method === "declining") {
      ratePh = validated.values.ratePh;
      raw = roundHalfUp(current * (10000n - ratePh), 10000n);
    } else if (method === "table") {
      const rows = validated.values.tablePh;
      ratePh = rows[Math.min(year, rows.length) - 1];
      raw = roundHalfUp(current * (10000n - ratePh), 10000n);
    } else {
      raw = current - annualDep;
    }
    const floored = raw < floorValue;
    const endValue = floored ? floorValue : raw;
    const depreciation = current - endValue;
    if (floorReachedYear === null && endValue === floorValue) floorReachedYear = year;
    schedule.push({
      year,
      ratePercent: ratePh === null ? null : formatHundredths(ratePh),
      depreciation: toSafeNumber(depreciation),
      endValue: toSafeNumber(endValue),
      floored,
    });
    current = endValue;
  }

  const currentValue = current;
  const totalDepreciation = price - currentValue;
  const totalPh = roundHalfUp(totalDepreciation * 10000n, price);

  return {
    ok: true,
    result: {
      method,
      floorValue: toSafeNumber(floorValue),
      currentValue: toSafeNumber(currentValue),
      totalDepreciation: toSafeNumber(totalDepreciation),
      totalDepreciationPercent: formatHundredths(totalPh),
      floorReachedYear,
      schedule,
    },
  };
}

// Build the exact five-field core input for the draft's current method
// from the controller's seven-field draft. Fields for other methods are
// kept in the draft but never sent to the core.
export function buildCoreInput(draft) {
  const input = {
    method: draft.method,
    price: draft.price,
    years: draft.years,
    salvagePercent: draft.salvagePercent,
  };
  const field = METHOD_FIELDS[draft.method];
  if (field !== undefined) input[field] = draft[field];
  return input;
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): integer NT$ grouped with "," and no decimals.
export function formatMoney(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
