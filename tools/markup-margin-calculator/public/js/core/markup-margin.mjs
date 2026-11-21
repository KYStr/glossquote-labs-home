// Pure core for the Markup & Margin Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-markup-margin-calculator-20261109):
// markup = profit / cost, margin = profit / price, with money in exact
// integer cents and percentages in exact integer milli-percent, all
// arithmetic in BigInt. Percentages are reported in hundredths of a
// percent (25.00% -> 2500). Rounding is pinned: roundHalfUpDiv rounds a
// non-negative quotient half-up; roundRatio rounds away from zero on an
// exact half, so negative rates below cost round symmetrically.

export const FIELDS = ["mode", "cost", "price", "markupPercent", "marginPercent"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  mode: 12,
  cost: 10,
  price: 10,
  markupPercent: 9,
  marginPercent: 9,
};

export const MODES = ["report", "solve-markup", "solve-margin"];

export const DEFAULTS = {
  mode: "report",
  cost: "80.00",
  price: "100.00",
  markupPercent: null,
  marginPercent: null,
};

// The example draft; identical to the default draft by design (SPEC
// section 3) and to the report-basic fixture input.
export const EXAMPLE = {
  mode: "report",
  cost: "80.00",
  price: "100.00",
  markupPercent: null,
  marginPercent: null,
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "markup-margin-report.json";

// Pinned bounds (SPEC section 3, steps 4-5, 10-11), in cents /
// milli-percent / hundredths as noted.
export const COST_CENTS_MIN = 1;
export const COST_CENTS_MAX = 99999999;
export const PRICE_CENTS_MIN = 0;
export const PRICE_CENTS_MAX = 99999999;
export const PERCENT_MILLI_MIN = 0;
export const PERCENT_MILLI_MAX = 99999999;
// A target margin at or above this milli value (100%) has no finite price.
export const NO_SOLUTION_MILLI = 100000;

// Static reference table (SPEC section 2): margin % -> markup
// hundredths, each row derived from markup = margin / (100 - margin)
// and rounded to two decimals. 0% -> 0, 10% -> 1111, 20% -> 2500,
// 25% -> 3333, 30% -> 4286, 40% -> 6667, 50% -> 10000, 60% -> 15000,
// 70% -> 23333, 75% -> 30000, 80% -> 40000, 90% -> 90000, 95% -> 190000.
export const REFERENCE_TABLE = [
  { marginPercent: 0, markupHundredths: 0 },
  { marginPercent: 10, markupHundredths: 1111 },
  { marginPercent: 20, markupHundredths: 2500 },
  { marginPercent: 25, markupHundredths: 3333 },
  { marginPercent: 30, markupHundredths: 4286 },
  { marginPercent: 40, markupHundredths: 6667 },
  { marginPercent: 50, markupHundredths: 10000 },
  { marginPercent: 60, markupHundredths: 15000 },
  { marginPercent: 70, markupHundredths: 23333 },
  { marginPercent: 75, markupHundredths: 30000 },
  { marginPercent: 80, markupHundredths: 40000 },
  { marginPercent: 90, markupHundredths: 90000 },
  { marginPercent: 95, markupHundredths: 190000 },
];

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "請輸入成本與售價，或載入範例", en: "Enter cost and price, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const MONEY_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const PERCENT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$/;

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
// own data property (no accessors); mode and cost hold strings, the
// other three hold a string or null. Symbol keys are rejected. Returns
// the five values, or null.
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
    const value = descriptor.value;
    if (field === "mode" || field === "cost") {
      if (typeof value !== "string") return null;
    } else if (value !== null && typeof value !== "string") {
      return null;
    }
    values[field] = value;
  }
  return values;
}

// True when the value passes the schema gate only.
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Exact parse of a money string that already passed MONEY_PATTERN:
// cents = integer part * 100 + fractional part (right-padded to 2).
function parseMoneyCents(raw) {
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

// Exact parse of a percent string that already passed PERCENT_PATTERN:
// milli = integer part * 1000 + fractional part (right-padded to 3).
function parsePercentMilli(raw) {
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
}

// Validate a money field (non-null string): capacity, surrogate, EMPTY,
// grammar, then range in cents.
function parseMoneyField(field, raw, minCents, maxCents) {
  const failure = checkCapacityAndUnicode(field, raw);
  if (failure !== null) return failure;
  if (raw === "") return fieldError("EMPTY", field);
  if (!MONEY_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const cents = parseMoneyCents(raw);
  if (cents < BigInt(minCents) || cents > BigInt(maxCents)) {
    return fieldError("RANGE", field);
  }
  return { ok: true, cents };
}

// Validate a percent field (non-null string): capacity, surrogate,
// EMPTY, grammar, then range in milli-percent.
function parsePercentField(field, raw) {
  const failure = checkCapacityAndUnicode(field, raw);
  if (failure !== null) return failure;
  if (raw === "") return fieldError("EMPTY", field);
  if (!PERCENT_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const milli = parsePercentMilli(raw);
  if (milli < BigInt(PERCENT_MILLI_MIN) || milli > BigInt(PERCENT_MILLI_MAX)) {
    return fieldError("RANGE", field);
  }
  return { ok: true, milli };
}

// Validate the whole input in the SPEC's fixed order: schema, mode,
// mode consistency, cost, then the active field, then the solve-margin
// NO_SOLUTION semantic check. The first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  // Step 2: mode.
  let failure = checkCapacityAndUnicode("mode", values.mode);
  if (failure !== null) return failure;
  if (values.mode === "") return fieldError("EMPTY", "mode");
  if (!MODES.includes(values.mode)) return fieldError("ENUM", "mode");
  const mode = values.mode;

  // Step 3: mode consistency — the three nullable fields must match the
  // mode's null pattern exactly.
  const expectedNull = {
    report: { price: false, markupPercent: true, marginPercent: true },
    "solve-markup": { price: true, markupPercent: false, marginPercent: true },
    "solve-margin": { price: true, markupPercent: true, marginPercent: false },
  }[mode];
  for (const field of ["price", "markupPercent", "marginPercent"]) {
    if ((values[field] === null) !== expectedNull[field]) return schemaError();
  }

  // Step 4: cost.
  const costParsed = parseMoneyField("cost", values.cost, COST_CENTS_MIN, COST_CENTS_MAX);
  if (!costParsed.ok) return costParsed;
  const costCents = costParsed.cents;

  // Step 5: the active field for this mode.
  let priceCents = null;
  let markupMilli = null;
  let marginMilli = null;
  if (mode === "report") {
    const parsed = parseMoneyField("price", values.price, PRICE_CENTS_MIN, PRICE_CENTS_MAX);
    if (!parsed.ok) return parsed;
    priceCents = parsed.cents;
  } else if (mode === "solve-markup") {
    const parsed = parsePercentField("markupPercent", values.markupPercent);
    if (!parsed.ok) return parsed;
    markupMilli = parsed.milli;
  } else {
    const parsed = parsePercentField("marginPercent", values.marginPercent);
    if (!parsed.ok) return parsed;
    marginMilli = parsed.milli;
  }

  // Step 6: solve-margin semantic check — a target margin at or above
  // 100% has no finite price. This is NO_SOLUTION, not RANGE: the
  // string grammar and value range are both legal.
  if (mode === "solve-margin" && marginMilli >= BigInt(NO_SOLUTION_MILLI)) {
    return fieldError("NO_SOLUTION", "marginPercent");
  }

  return { ok: true, values: { mode, costCents, priceCents, markupMilli, marginMilli } };
}

// Pinned rounding (SPEC section 3, step 8): roundHalfUpDiv(n, d) for
// n >= 0, d > 0, by integer division; 2r >= d rounds the quotient up.
export function roundHalfUpDiv(n, d) {
  const q = n / d;
  const r = n % d;
  return 2n * r >= d ? q + 1n : q;
}

// roundRatio(n, d) for d > 0 and n possibly negative: 0 stays 0,
// otherwise sign(n) * roundHalfUpDiv(|n|, d) — an exact half rounds
// away from zero.
export function roundRatio(n, d) {
  if (n === 0n) return 0n;
  if (n < 0n) return -roundHalfUpDiv(-n, d);
  return roundHalfUpDiv(n, d);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { mode, costCents, priceCents, markupMilli, marginMilli } = validated.values;

  if (mode === "report") {
    const profitCents = priceCents - costCents;
    const markupHundredths = roundRatio(profitCents * 10000n, costCents);
    const marginHundredths =
      priceCents === 0n ? null : roundRatio(profitCents * 10000n, priceCents);
    return {
      ok: true,
      result: {
        mode,
        costCents: Number(costCents),
        priceCents: Number(priceCents),
        profitCents: Number(profitCents),
        markupHundredths: Number(markupHundredths),
        marginHundredths: marginHundredths === null ? null : Number(marginHundredths),
        belowCost: profitCents < 0n,
      },
    };
  }

  if (mode === "solve-markup") {
    // price = roundHalfUp(cost * (100000 + markupMilli) / 100000),
    // rounded exactly once; over the cap is RANGE on markupPercent.
    const solvedPrice = roundHalfUpDiv(costCents * (100000n + markupMilli), 100000n);
    if (solvedPrice > BigInt(PRICE_CENTS_MAX)) {
      return fieldError("RANGE", "markupPercent");
    }
    const profitCents = solvedPrice - costCents;
    const marginHundredths = roundRatio(profitCents * 10000n, solvedPrice);
    return {
      ok: true,
      result: {
        mode,
        costCents: Number(costCents),
        markupPercentMilli: Number(markupMilli),
        priceCents: Number(solvedPrice),
        profitCents: Number(profitCents),
        marginHundredths: Number(marginHundredths),
      },
    };
  }

  // solve-margin: price = roundHalfUp(cost * 100000 / (100000 - marginMilli)),
  // rounded exactly once; over the cap is RANGE on marginPercent.
  const solvedPrice = roundHalfUpDiv(costCents * 100000n, 100000n - marginMilli);
  if (solvedPrice > BigInt(PRICE_CENTS_MAX)) {
    return fieldError("RANGE", "marginPercent");
  }
  const profitCents = solvedPrice - costCents;
  const markupHundredths = roundRatio(profitCents * 10000n, costCents);
  return {
    ok: true,
    result: {
      mode,
      costCents: Number(costCents),
      marginPercentMilli: Number(marginMilli),
      priceCents: Number(solvedPrice),
      profitCents: Number(profitCents),
      markupHundredths: Number(markupHundredths),
    },
  };
}

// Money display: "integer part.two decimals", negative values carry a
// leading minus sign; no thousands separators, no currency symbol
// (SPEC section 3, step 12).
export function formatMoney(cents) {
  const n = BigInt(cents);
  const sign = n < 0n ? "-" : "";
  const abs = n < 0n ? -n : n;
  const whole = abs / 100n;
  const fraction = abs % 100n;
  return `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}

// Percent display: hundredths of a percent rendered as
// "integer part.two decimals%", e.g. 2500 -> "25.00%".
// Returns null for a null (undefined) margin.
export function formatPercent(hundredths) {
  if (hundredths === null || hundredths === undefined) return null;
  const n = BigInt(hundredths);
  const sign = n < 0n ? "-" : "";
  const abs = n < 0n ? -n : n;
  const whole = abs / 100n;
  const fraction = abs % 100n;
  return `${sign}${whole}.${String(fraction).padStart(2, "0")}%`;
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
