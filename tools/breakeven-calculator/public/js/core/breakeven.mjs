// Pure core for the Breakeven Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-breakeven-calculator-20261109):
// single-product breakeven analysis with integer-cents (BigInt) arithmetic
// and rational rounding. All amounts are parsed to integer cents; every
// displayed rounding uses R(q, d) = floor(q * 10^d + 1/2) / 10^d exactly
// once, from the unrounded rational value. Breakeven volume is always
// rounded up (ceil): selling one unit fewer still loses money.

export const FIELDS = ["fixedCost", "price", "variableCost", "expectedUnits"];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  fixedCost: 12,
  price: 12,
  variableCost: 12,
  expectedUnits: 9,
};

export const DEFAULTS = {
  fixedCost: "100000",
  price: "400",
  variableCost: "150",
  expectedUnits: "",
};

// The example draft: the first fixture case (ceil-rounds-up).
export const EXAMPLE = {
  fixedCost: "123456",
  price: "400",
  variableCost: "150",
  expectedUnits: "",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "breakeven-report.json";

// Amount limits in integer cents (999,999,999.99).
export const AMOUNT_CENTS_MAX = 99999999999n;
export const PRICE_CENTS_MIN = 1n;
export const EXPECTED_UNITS_MAX = 100000000;

// Pinned status announcements (SPEC userFlow).
export const STATUS_TEXT = {
  empty: {
    zh: "請輸入固定成本、單位售價與單位變動成本，或載入範例。",
    en: "Enter fixed costs, price per unit and variable cost per unit, or load the example.",
  },
  dirty: {
    zh: "輸入已變更，請重新執行",
    en: "Input changed. Run again.",
  },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  example: {
    zh: "已載入範例，請按「計算損益平衡」執行。",
    en: "Example loaded. Run “Calculate breakeven” to compute it.",
  },
  reset: { zh: "已重設", en: "Reset" },
};

// Pinned NO_MARGIN semantic explanation (SPEC userFlow, verbatim).
export const NO_MARGIN_TEXT = {
  zh: "單位變動成本必須低於單位售價，否則賣得越多虧得越多，沒有損益平衡點。",
  en: "Variable cost per unit must be below the price per unit; otherwise every sale loses money and no breakeven point exists.",
};

const MONEY_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
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
// whose own enumerable properties are exactly the four fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the four string values, or null.
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

// True when the value passes the schema gate only (used to decide
// whether a draft may be restored).
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

// Parse a money string that already passed DECIMAL_FORMAT into integer
// cents (BigInt). The grammar guarantees the shape, so no Number
// floating point is involved.
function moneyToCents(raw) {
  const dot = raw.indexOf(".");
  const whole = dot === -1 ? raw : raw.slice(0, dot);
  const fraction = dot === -1 ? "" : raw.slice(dot + 1);
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
}

// Validate one money field: capacity/surrogate, then EMPTY, then
// DECIMAL_FORMAT, then RANGE (in integer cents).
function parseMoneyField(field, raw, minCents) {
  const failure = checkCapacityAndUnicode(field, raw);
  if (failure !== null) return failure;
  if (raw === "") return fieldError("EMPTY", field);
  if (!MONEY_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const cents = moneyToCents(raw);
  if (cents < minCents || cents > AMOUNT_CENTS_MAX) {
    return fieldError("RANGE", field);
  }
  return { ok: true, cents };
}

// Validate the whole input: schema first, then fields in the fixed
// order fixedCost, price, variableCost, expectedUnits; the first error
// wins. expectedUnits blank means "not provided" and skips its other
// checks. After all per-field checks, the semantic NO_MARGIN check
// runs (variableCost cents >= price cents).
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  const fixed = parseMoneyField("fixedCost", values.fixedCost, 0n);
  if (!fixed.ok) return fixed;
  const price = parseMoneyField("price", values.price, PRICE_CENTS_MIN);
  if (!price.ok) return price;
  const variable = parseMoneyField("variableCost", values.variableCost, 0n);
  if (!variable.ok) return variable;

  let expectedUnits = null;
  const unitsFailure = checkCapacityAndUnicode("expectedUnits", values.expectedUnits);
  if (unitsFailure !== null) return unitsFailure;
  if (values.expectedUnits !== "") {
    if (!INTEGER_PATTERN.test(values.expectedUnits)) {
      return fieldError("INTEGER_FORMAT", "expectedUnits");
    }
    const units = BigInt(values.expectedUnits);
    if (units > BigInt(EXPECTED_UNITS_MAX)) {
      return fieldError("RANGE", "expectedUnits");
    }
    expectedUnits = units;
  }

  if (variable.cents >= price.cents) {
    return { ok: false, error: { code: "NO_MARGIN", field: null, row: null } };
  }

  return {
    ok: true,
    values: {
      fixedCents: fixed.cents,
      priceCents: price.cents,
      variableCents: variable.cents,
      expectedUnits,
    },
  };
}

// BigInt floor division (BigInt `/` truncates toward zero; this floors
// toward -infinity, which R(q, d) requires for negative rationals).
function floorDiv(a, b) {
  // b is always positive in every call site here.
  const q = a / b;
  const r = a % b;
  return r === 0n || a >= 0n ? q : q - 1n;
}

// R(q, d) for a rational q = numerator / denominator, returned as the
// scaled integer floor(q * 10^d + 1/2) (a BigInt with d decimal places).
// Half-up: an exact tie rounds toward +infinity, for negative q too.
function roundHalfUpScaled(numerator, denominator, decimals) {
  const scale = 10n ** BigInt(decimals);
  return floorDiv(2n * numerator * scale + denominator, 2n * denominator);
}

// Format an integer-cents BigInt as a money string: optional minus,
// integer part, ".", two digits. Zero is always "0.00" (no negative zero).
export function formatMoney(cents) {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const whole = abs / 100n;
  const fraction = abs % 100n;
  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

// Format a scaled integer (value * 10^decimals) with exactly `decimals`
// decimal places, with sign handling and no negative zero.
export function formatFixedScaled(scaled, decimals) {
  const sign = scaled < 0n ? "-" : "";
  const abs = scaled < 0n ? -scaled : scaled;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const fraction = abs % scale;
  return `${sign}${whole.toString()}.${fraction.toString().padStart(decimals, "0")}`;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { fixedCents: F, priceCents: P, variableCents: V, expectedUnits: E } = validated.values;
  const M = P - V; // > 0 by the NO_MARGIN check.

  const contributionMarginPerUnit = formatMoney(M);
  // q = M * 100 / P, R(q, 2).
  const contributionMarginRatioPercent = formatFixedScaled(
    roundHalfUpScaled(M * 100n, P, 2),
    2,
  );
  // q = F / M, R(q, 4) — theoretical (exact) volume, reference only.
  const breakevenUnitsExact = formatFixedScaled(roundHalfUpScaled(F, M, 4), 4);
  // Whole units: F = 0 -> 0, else ceil(F / M).
  const breakevenUnitsBig = F === 0n ? 0n : (F + M - 1n) / M;
  const breakevenUnits = Number(breakevenUnitsBig);
  // Theoretical revenue F * P / M cents, floor(x + 1/2) to whole cents.
  const breakevenRevenueExactCents = floorDiv(2n * F * P + M, 2n * M);
  const breakevenRevenueExact = formatMoney(breakevenRevenueExactCents);
  // Whole-unit revenue: U * P cents, exact.
  const breakevenRevenue = formatMoney(breakevenUnitsBig * P);

  let marginOfSafety = null;
  if (E !== null) {
    const units = E - breakevenUnitsBig;
    const percent =
      E === 0n
        ? null
        : formatFixedScaled(roundHalfUpScaled(units * 100n, E, 2), 2);
    marginOfSafety = {
      expectedUnits: Number(E),
      units: Number(units),
      percent,
      expectedProfit: formatMoney(E * M - F),
      belowBreakeven: E < breakevenUnitsBig,
    };
  }

  const result = {
    contributionMarginPerUnit,
    contributionMarginRatioPercent,
    breakevenUnitsExact,
    breakevenUnits,
    breakevenRevenueExact,
    breakevenRevenue,
    marginOfSafety,
  };

  // Report cap backstop (SPEC inputsOutputs): a result over the cap is
  // an OUTPUT_LIMIT error instead of a success. With the pinned ranges
  // a real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
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
