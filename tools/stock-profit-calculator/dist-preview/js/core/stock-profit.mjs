// Pure core for the Stock Profit Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-stock-profit-calculator-
// 20261109): a single Taiwan-stock buy/sell with brokerage fees
// (rate x discount, per-order minimum applied after discount and
// rounding), securities transaction tax on the sell side only, an
// optional cash day-trade rate of 0.15%, pro-rata cost basis for a
// partial sell, and a breakeven sell price defined as the smallest
// price (in cents) whose sell net reaches the sold cost basis under
// the same fee model.
//
// All money arithmetic is exact BigInt rational arithmetic: prices
// are integer cents, rates/discounts are exact decimal fractions,
// and rounding is half-up, floor(x + 1/2), applied exactly where the
// SPEC pins it. IEEE-754 doubles are never used to accumulate money;
// they appear only at the boundary, converting an already-rounded
// integer-cent / integer-hundredth value into a JSON number.

export const FIELDS = [
  "buyPrice",
  "buyQty",
  "buyUnit",
  "sellPrice",
  "sellQty",
  "sellUnit",
  "feeRatePct",
  "feeDiscount",
  "minFeeTwd",
  "taxMode",
  "taxRatePct",
];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  buyPrice: 9,
  buyQty: 6,
  buyUnit: 8,
  sellPrice: 9,
  sellQty: 6,
  sellUnit: 8,
  feeRatePct: 8,
  feeDiscount: 5,
  minFeeTwd: 5,
  taxMode: 8,
  taxRatePct: 8,
};

export const DEFAULTS = {
  buyPrice: "100",
  buyQty: "1000",
  buyUnit: "share",
  sellPrice: "110",
  sellQty: "1000",
  sellUnit: "share",
  feeRatePct: "0.1425",
  feeDiscount: "1",
  minFeeTwd: "20",
  taxMode: "standard",
  taxRatePct: "0.3",
};

// The example draft; identical to the default draft by design and to
// the round-lot-profit fixture input (SPEC userFlow).
export const EXAMPLE = { ...DEFAULTS };

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "stock-profit-report.json";

// Cash day-trade transaction tax rate, percent (SPEC scope: Securities
// Transaction Tax Act Art. 2-2, in force through 2027-12-31). The rate
// is a page disclosure only; it never depends on the system date.
export const DAY_TAX_RATE_PCT = "0.15";

// Result fields serialized with exactly two decimal places.
export const TWO_DECIMAL_FIELDS = [
  "breakevenPrice",
  "buyGross",
  "buyTotal",
  "costBasisSold",
  "returnPct",
  "sellGross",
  "sellNet",
];

// Result fields serialized as integers.
export const INTEGER_FIELDS = [
  "buyFee",
  "buyShares",
  "netProfitLoss",
  "remainingShares",
  "sellFee",
  "sellShares",
  "sellTax",
];

// Pinned status announcements (SPEC userFlow state table).
export const STATUS_TEXT = {
  empty: { zh: "請輸入資料或載入範例", en: "Enter your trade or load the example" },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]+)?$/;
const INTEGER_PATTERN = /^[0-9]+$/;

// Per-field validation rules, in the SPEC's fixed field order.
const FIELD_RULES = {
  buyPrice: { kind: "decimal", maxDecimals: 2, minCents: 1n, maxCents: 99999999n },
  buyQty: { kind: "integer", min: 1n, max: 999999n },
  buyUnit: { kind: "enum", values: ["share", "lot"] },
  sellPrice: { kind: "decimal", maxDecimals: 2, minCents: 1n, maxCents: 99999999n },
  sellQty: { kind: "integer", min: 1n, max: 999999n },
  sellUnit: { kind: "enum", values: ["share", "lot"] },
  feeRatePct: { kind: "decimal", maxDecimals: 4, minInclusive: true, minNum: 0n, maxNum: 1n },
  feeDiscount: { kind: "decimal", maxDecimals: 3, minInclusive: false, minNum: 0n, maxNum: 1n },
  minFeeTwd: { kind: "integer", min: 0n, max: 99999n },
  taxMode: { kind: "enum", values: ["standard", "day"] },
  taxRatePct: { kind: "decimal", maxDecimals: 4, minInclusive: true, minNum: 0n, maxNum: 1n },
};

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

// Schema gate only: the input must be a non-null, non-array plain
// object whose own enumerable properties are exactly the eleven
// fields, each an own data property (no accessors) holding a primitive
// string. Symbol keys are rejected.
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

// Parse an ASCII decimal string into an exact fraction { num, den }
// with value num/den, den a power of 10. Callers guarantee the
// grammar (DECIMAL_PATTERN) already passed.
function parseDecimalFraction(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return { num: BigInt(raw), den: 1n };
  const whole = raw.slice(0, dot);
  const frac = raw.slice(dot + 1);
  return {
    num: BigInt(whole + frac),
    den: 10n ** BigInt(frac.length),
  };
}

// Floor division for BigInt with a positive divisor (JS BigInt `/`
// truncates toward zero; this floors, which is what rhu needs for
// negative numerators).
function floorDiv(a, b) {
  const q = a / b;
  if (a % b !== 0n && a < 0n) return q - 1n;
  return q;
}

// Ceiling division for non-negative BigInt values with a positive divisor.
function ceilDiv(a, b) {
  return (a + b - 1n) / b;
}

// Round half-up to an integer: floor(x + 1/2) for the exact rational
// x = num/den (den > 0). Negative values round the same way
// (SPEC inputsOutputs: -6.5 -> -6).
function rhu(num, den) {
  return floorDiv(2n * num + den, 2n * den);
}

// Validate one field in the SPEC's order: INPUT_LIMIT, UNICODE,
// EMPTY, grammar (DECIMAL_FORMAT / INTEGER_FORMAT / ENUM), RANGE.
// Returns a parsed value object, or a field error result.
function validateField(field, raw) {
  const rule = FIELD_RULES[field];
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  if (raw === "") return fieldError("EMPTY", field);
  if (rule.kind === "enum") {
    if (!rule.values.includes(raw)) return fieldError("ENUM", field);
    return { ok: true, value: raw };
  }
  if (rule.kind === "integer") {
    if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
    const value = BigInt(raw);
    if (value < rule.min || value > rule.max) return fieldError("RANGE", field);
    return { ok: true, value };
  }
  // Decimal.
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const dot = raw.indexOf(".");
  if (dot !== -1 && raw.length - dot - 1 > rule.maxDecimals) {
    return fieldError("DECIMAL_FORMAT", field);
  }
  const frac = parseDecimalFraction(raw);
  if (rule.minCents !== undefined) {
    // A price: convert to integer cents (at most 2 decimals, exact).
    const cents = (frac.num * 100n) / frac.den;
    if (cents < rule.minCents || cents > rule.maxCents) {
      return fieldError("RANGE", field);
    }
    return { ok: true, value: cents, fraction: frac };
  }
  // A percent rate in [min, max] (feeDiscount is (0, 1]).
  const scaled = frac.num * rule.maxNum;
  const bound = frac.den * rule.maxNum;
  if (rule.minInclusive) {
    if (frac.num < 0n || scaled > bound) return fieldError("RANGE", field);
  } else {
    if (frac.num <= 0n || scaled > bound) return fieldError("RANGE", field);
  }
  return { ok: true, value: frac.num, fraction: frac };
}

// Validate the whole input: schema first, then fields in the fixed
// order; the first error wins. After all per-field checks, the
// cross-field check runs: effective sell shares > effective buy
// shares is SELL_EXCEEDS_BUY on sellQty.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  const parsed = {};
  for (const field of FIELDS) {
    const checked = validateField(field, values[field]);
    if (!checked.ok) return checked;
    parsed[field] = checked;
  }
  const buyShares =
    parsed.buyQty.value * (parsed.buyUnit.value === "lot" ? 1000n : 1n);
  const sellShares =
    parsed.sellQty.value * (parsed.sellUnit.value === "lot" ? 1000n : 1n);
  if (sellShares > buyShares) return fieldError("SELL_EXCEEDS_BUY", "sellQty");
  return {
    ok: true,
    values: {
      buyPriceCents: parsed.buyPrice.value,
      buyShares,
      sellPriceCents: parsed.sellPrice.value,
      sellShares,
      feeRate: parsed.feeRatePct.fraction,
      feeDiscount: parsed.feeDiscount.fraction,
      minFeeTwd: parsed.minFeeTwd.value,
      taxMode: parsed.taxMode.value,
      taxRate: parsed.taxRatePct.fraction,
      taxRateText: values.taxRatePct,
    },
  };
}

// Brokerage fee in whole dollars (integer): max(rhu(grossCents/100
// dollars x ratePct/100 x discount), minFee). The minimum applies
// after the discount and after rounding (SPEC step 1).
function feeFor(grossCents, rate, discount, minFee) {
  // fee dollars = grossCents/100 * rate.num/(rate.den*100)
  //               * discount.num/discount.den
  const num = grossCents * rate.num * discount.num;
  const den = 10000n * rate.den * discount.den;
  const rounded = rhu(num, den);
  return rounded > minFee ? rounded : minFee;
}

// Transaction tax in whole dollars (integer): rhu(grossCents/100
// dollars x taxPct/100). No minimum, no discount (SPEC step 3).
function taxFor(grossCents, tax) {
  const num = grossCents * tax.num;
  const den = 10000n * tax.den;
  return rhu(num, den);
}

// Sell net (integer cents) for a sell price of priceCents and
// sellShares shares under the given fee/tax parameters. Exported so
// tests can plug the breakeven price back into the fee model.
export function sellNetAt(priceCents, sellShares, rate, discount, minFee, tax) {
  const grossCents = priceCents * sellShares;
  const fee = feeFor(grossCents, rate, discount, minFee);
  const taxAmount = taxFor(grossCents, tax);
  return {
    sellGrossCents: grossCents,
    sellFee: fee,
    sellTax: taxAmount,
    sellNetCents: grossCents - fee * 100n - taxAmount * 100n,
  };
}

// Breakeven price in integer cents: the smallest positive integer
// cents P such that sellNetAt(P) >= costBasisSoldExact (SPEC step 5).
// The search never assumes monotonicity: it starts at the proven
// lower bound ceil(costBasis / sellShares) (below it the gross alone
// is under the cost basis, so the net cannot reach it) and jumps
// forward by ceil(deficit / sellShares) cents at a time, which is
// safe because fees and tax are non-decreasing in P, so the net can
// rise by at most sellShares cents per cent of price. The loop is
// capped by a proven upper bound: P_hi is the first price whose
// lower envelope P*S*(1-f-t) - 100*minFee - 100 reaches the cost
// basis, and the true net is never below that envelope.
function breakevenCents(costNum, costDen, sellShares, rate, discount, minFee, tax) {
  // Combined fee fraction f = rate/100 * discount and tax fraction
  // t = tax/100, as exact rationals (both <= 0.01, so 1 - f - t > 0).
  const fNum = rate.num * discount.num;
  const fDen = rate.den * discount.den * 100n;
  const tNum = tax.num;
  const tDen = tax.den * 100n;
  // 1 - f - t = (fDen*tDen - fNum*tDen - tNum*fDen) / (fDen*tDen).
  const oneNum = fDen * tDen - fNum * tDen - tNum * fDen;
  const oneDen = fDen * tDen;
  // P_hi: ceil((costBasis + 100*minFee + 100) / (sellShares*(1-f-t))).
  const hiNum = (costNum + (100n * minFee + 100n) * costDen) * oneDen;
  const hiDen = costDen * sellShares * oneNum;
  const pHi = ceilDiv(hiNum, hiDen);
  // P_start: ceil(costBasis / sellShares), at least 1.
  let price = ceilDiv(costNum, costDen * sellShares);
  if (price < 1n) price = 1n;
  while (price <= pHi) {
    const { sellNetCents } = sellNetAt(price, sellShares, rate, discount, minFee, tax);
    // net >= costBasis  <=>  sellNetCents * costDen >= costNum.
    if (sellNetCents * costDen >= costNum) return price;
    // Deficit in cents: costBasis - net > 0. Jump ceil(deficit /
    // sellShares) cents; no price before the jump can satisfy.
    const deficitNum = costNum - sellNetCents * costDen;
    const jump = ceilDiv(deficitNum, costDen * sellShares);
    price += jump < 1n ? 1n : jump;
  }
  // Unreachable by the envelope proof; the SPEC guarantees existence.
  throw new Error("breakeven price not found within the proven bound");
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const v = validated.values;

  const effectiveTax =
    v.taxMode === "day" ? parseDecimalFraction(DAY_TAX_RATE_PCT) : v.taxRate;
  const effectiveTaxText = v.taxMode === "day" ? DAY_TAX_RATE_PCT : v.taxRateText;

  const buyGrossCents = v.buyPriceCents * v.buyShares;
  const buyFee = feeFor(buyGrossCents, v.feeRate, v.feeDiscount, v.minFeeTwd);
  const buyTotalCents = buyGrossCents + buyFee * 100n;

  const sell = sellNetAt(
    v.sellPriceCents,
    v.sellShares,
    v.feeRate,
    v.feeDiscount,
    v.minFeeTwd,
    effectiveTax,
  );

  // Cost basis of the sold shares, exact rational cents:
  // buyTotalCents * sellShares / buyShares.
  const costNum = buyTotalCents * v.sellShares;
  const costDen = v.buyShares;
  const costBasisSoldCents = rhu(costNum, costDen);

  // Net profit/loss, exact rational cents: sellNet - cost basis.
  const netNum = sell.sellNetCents * costDen - costNum;
  const netDen = costDen;
  // Integer dollars: rhu(netExactCents / 100).
  const netProfitLoss = rhu(netNum, netDen * 100n);

  // Return %: netExact / costBasis * 100, to 2 decimals, half-up.
  // hundredths = rhu(netNum/netDen / (costNum/costDen) * 100 * 100)
  //           = rhu(netNum * costDen * 10000 / (netDen * costNum)).
  const retNum = netNum * costDen * 10000n;
  const retDen = netDen * costNum;
  const returnHundredths = rhu(retNum, retDen);

  const breakeven = breakevenCents(
    costNum,
    costDen,
    v.sellShares,
    v.feeRate,
    v.feeDiscount,
    v.minFeeTwd,
    effectiveTax,
  );

  const centsToNumber = (cents) => Number(cents) / 100;
  const result = {
    breakevenPrice: centsToNumber(breakeven),
    buyFee: Number(buyFee),
    buyGross: centsToNumber(buyGrossCents),
    buyShares: Number(v.buyShares),
    buyTotal: centsToNumber(buyTotalCents),
    costBasisSold: centsToNumber(costBasisSoldCents),
    effectiveTaxRatePct: Number(effectiveTaxText),
    netProfitLoss: Number(netProfitLoss),
    remainingShares: Number(v.buyShares - v.sellShares),
    returnPct: Number(returnHundredths) / 100,
    sellFee: Number(sell.sellFee),
    sellGross: centsToNumber(sell.sellGrossCents),
    sellNet: centsToNumber(sell.sellNetCents),
    sellShares: Number(v.sellShares),
    sellTax: Number(sell.sellTax),
  };

  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;
  return { ok: true, result };
}

// Amount display: exactly two decimal places, trailing zeros kept.
export function formatMoney2(value) {
  return value.toFixed(2);
}

// Integer-amount display: no decimals.
export function formatMoneyInt(value) {
  return String(value);
}

// Return display: exactly two decimal places plus the percent sign.
export function formatReturnPct(value) {
  return `${value.toFixed(2)}%`;
}

// Canonical compact JSON for a report value: object own keys sorted
// by UTF-16 code units, recursively; array order preserved; strings
// JSON-escaped. Two-decimal result fields are written with exactly
// two decimal places, integer fields as integers, and
// effectiveTaxRatePct as a plain JSON number (its value is the input
// rate text or 0.15, at most four decimals, which round-trips through
// Number exactly). No toJSON calls.
function canonicalJson(value, twoDecimalContext) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item, false)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], key)}`)
      .join(",")}}`;
  }
  if (typeof value === "number") {
    if (twoDecimalContext !== false && TWO_DECIMAL_FIELDS.includes(twoDecimalContext)) {
      if (!Number.isFinite(value)) throw new Error("non-finite two-decimal value");
      return value.toFixed(2);
    }
    if (twoDecimalContext !== false && INTEGER_FIELDS.includes(twoDecimalContext)) {
      if (!Number.isInteger(value)) throw new Error("non-integer integer field");
      return String(value);
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  let text;
  try {
    text = `${canonicalJson(result, false)}\n`;
  } catch {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
