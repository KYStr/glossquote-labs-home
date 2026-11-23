// Retirement Withdrawal Calculator — pure core.
// Exact decimal arithmetic on BigInt cents / hundredths only; no Number math
// on operands or results (string lengths and indexes excepted), per SPEC.
// run(input) is a synchronous pure data transform:
//   input  depletion:    {mode, portfolioValue, annualWithdrawal, returnRatePct, inflationRatePct}
//          four-percent: {mode, annualSpending, currentPortfolio}
//   output {ok:true, result} | {ok:false, error:{code, field, row}} — row is always null here.
//
// Pinned rules (SPEC inputsOutputs):
// - Depletion: withdrawal at the start of the year, the remaining balance
//   earns that year's return, withdrawal grows with inflation from year 2,
//   every yearly amount rounded to cents ROUND_HALF_UP (half away from zero
//   on ties), 100-year cap. W_n = ROUND_HALF_UP(W_1 * (1+i)^(n-1)) computed
//   from the exact power once, never iteratively re-rounded.
// - 4% rule: target = annualSpending * 25; implied rate and shortfall only
//   when a current portfolio is given; meetsRule is implied <= "4.00".

export const MODES = ["depletion", "four-percent"];
export const MAX_RAW_LENGTH = 16;
export const MAX_MONEY_CENTS = 99999999999n; // 999,999,999.99
export const REPORT_FILENAME = "retirement-withdrawal-report.json";
export const MAX_REPORT_BYTES = 2097152;

const DECIMAL_RE = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Parse a grammar-valid decimal string into {sign, intPart, fracPart}.
// Returns null when the grammar does not match. "-0" parses to zero.
function parseDecimal(raw) {
  if (!DECIMAL_RE.test(raw)) return null;
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const dot = body.indexOf(".");
  return {
    sign: negative ? -1n : 1n,
    intPart: dot === -1 ? body : body.slice(0, dot),
    fracPart: dot === -1 ? "" : body.slice(dot + 1),
  };
}

// Exact value of a grammar-valid decimal in hundredths of its unit
// (cents for money, hundredths of a percent for rates).
function toHundredths(parsed) {
  const frac = (parsed.fracPart + "00").slice(0, 2);
  return parsed.sign * (BigInt(parsed.intPart) * 100n + BigInt(frac));
}

// Round the exact rational num/den (den > 0) to an integer, HALF_UP
// (half away from zero on ties, matching Decimal ROUND_HALF_UP).
function roundDiv(num, den) {
  const negative = num < 0n;
  const a = negative ? -num : num;
  let q = a / den;
  const r = a % den;
  if (r * 2n >= den) q += 1n;
  return negative ? -q : q;
}

// Format an integer number of hundredths as a 2-decimal string, e.g.
// 50000n -> "500.00", -5n -> "-0.05", 0n -> "0.00". Never "-0.00".
export function formatHundredths(value) {
  const negative = value < 0n;
  const a = negative ? -value : value;
  const intPart = (a / 100n).toString();
  const fracPart = (a % 100n).toString().padStart(2, "0");
  return (negative ? "-" : "") + intPart + "." + fracPart;
}

// Normalized echo of a grammar-valid input string: trailing fraction zeros
// trimmed, "-0" shown as "0". Returns null for grammar-invalid input.
export function normalizeEcho(raw) {
  if (typeof raw !== "string") return null;
  const parsed = parseDecimal(raw);
  if (parsed === null) return null;
  let fracPart = parsed.fracPart.replace(/0+$/, "");
  const isZero = BigInt(parsed.intPart + parsed.fracPart) === 0n;
  if (isZero) return "0";
  return (parsed.sign < 0n ? "-" : "") + parsed.intPart + (fracPart ? "." + fracPart : "");
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

function ownString(input, key) {
  const desc = Object.getOwnPropertyDescriptor(input, key);
  if (!desc || !("value" in desc)) return null;
  if (typeof desc.value !== "string") return null;
  return desc.value;
}

// Validate one field in the SPEC order: INPUT_LIMIT, EMPTY, UNICODE,
// DECIMAL_FORMAT, DECIMAL_PLACES, RANGE. `range` is {min, max} in
// hundredths, inclusive. When `optionalEmpty` is true, "" means "not
// provided" and returns {value: null} instead of EMPTY.
function validateField(raw, field, range, optionalEmpty) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", field) };
  if (raw === "") {
    if (optionalEmpty) return { value: null };
    return { error: fail("EMPTY", field) };
  }
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", field) };
  const parsed = parseDecimal(raw);
  if (parsed === null) return { error: fail("DECIMAL_FORMAT", field) };
  if (parsed.fracPart.length > 2) return { error: fail("DECIMAL_PLACES", field) };
  const value = toHundredths(parsed);
  if (value < range.min || value > range.max) return { error: fail("RANGE", field) };
  return { value };
}

const MONEY_RANGE = { min: 0n, max: MAX_MONEY_CENTS };
const SPENDING_RANGE = { min: 1n, max: MAX_MONEY_CENTS };
const CURRENT_RANGE = { min: 1n, max: MAX_MONEY_CENTS };
const RETURN_RANGE = { min: -5000n, max: 10000n }; // -50.00% .. 100.00%
const INFLATION_RANGE = { min: 0n, max: 10000n }; // 0 .. 100.00%

function simulateDepletion(portfolioCents, withdrawalCents, returnHundredths, inflationHundredths) {
  if (withdrawalCents === 0n) {
    return {
      mode: "depletion",
      depletionStatus: "never",
      yearsUntilDepletion: null,
      fullYears: 0,
      partialYearFraction: "0.00",
      finalPartialWithdrawal: "0.00",
      yearlyTable: [],
    };
  }
  const table = [];
  let balance = portfolioCents;
  // Exact (1 + i)^(n-1) as a rational, advanced once per full year.
  let growthNum = 1n;
  let growthDen = 1n;
  const growthBase = 10000n + inflationHundredths;
  let fullYears = 0;
  for (let year = 1; year <= 100; year += 1) {
    const withdrawal = roundDiv(withdrawalCents * growthNum, growthDen);
    if (balance < withdrawal) {
      const fractionHundredths = roundDiv(balance * 100n, withdrawal);
      const yearsHundredths = BigInt(fullYears) * 100n + fractionHundredths;
      table.push({
        year,
        startBalance: formatHundredths(balance),
        withdrawal: formatHundredths(balance),
        returnAmount: "0.00",
        endBalance: "0.00",
        partial: true,
      });
      return {
        mode: "depletion",
        depletionStatus: "depleted",
        yearsUntilDepletion: formatHundredths(yearsHundredths),
        fullYears,
        partialYearFraction: formatHundredths(fractionHundredths),
        finalPartialWithdrawal: formatHundredths(balance),
        yearlyTable: table,
      };
    }
    const returnAmount = roundDiv((balance - withdrawal) * returnHundredths, 10000n);
    const endBalance = balance - withdrawal + returnAmount;
    table.push({
      year,
      startBalance: formatHundredths(balance),
      withdrawal: formatHundredths(withdrawal),
      returnAmount: formatHundredths(returnAmount),
      endBalance: formatHundredths(endBalance),
      partial: false,
    });
    if (endBalance === 0n) {
      return {
        mode: "depletion",
        depletionStatus: "depleted",
        yearsUntilDepletion: formatHundredths(BigInt(year) * 100n),
        fullYears: year,
        partialYearFraction: "0.00",
        finalPartialWithdrawal: "0.00",
        yearlyTable: table,
      };
    }
    balance = endBalance;
    fullYears = year;
    growthNum *= growthBase;
    growthDen *= 10000n;
  }
  return {
    mode: "depletion",
    depletionStatus: "beyond-horizon",
    yearsUntilDepletion: null,
    fullYears: 100,
    partialYearFraction: "0.00",
    finalPartialWithdrawal: "0.00",
    yearlyTable: table,
  };
}

function runFourPercent(spendingCents, currentCents) {
  const targetCents = spendingCents * 25n;
  if (currentCents === null) {
    return {
      mode: "four-percent",
      annualSpending: formatHundredths(spendingCents),
      targetPortfolio: formatHundredths(targetCents),
      currentPortfolio: null,
      impliedWithdrawalRatePct: null,
      shortfall: null,
      meetsRule: null,
    };
  }
  const impliedHundredths = roundDiv(spendingCents * 10000n, currentCents);
  return {
    mode: "four-percent",
    annualSpending: formatHundredths(spendingCents),
    targetPortfolio: formatHundredths(targetCents),
    currentPortfolio: formatHundredths(currentCents),
    impliedWithdrawalRatePct: formatHundredths(impliedHundredths),
    shortfall: formatHundredths(targetCents - currentCents),
    meetsRule: impliedHundredths <= 400n,
  };
}

const DEPLETION_FIELDS = ["portfolioValue", "annualWithdrawal", "returnRatePct", "inflationRatePct"];
const FOUR_PERCENT_FIELDS = ["annualSpending", "currentPortfolio"];

export function run(input) {
  // SCHEMA: plain object; mode must be an own string property first.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const modeDesc = Object.getOwnPropertyDescriptor(input, "mode");
  if (!modeDesc || !("value" in modeDesc) || typeof modeDesc.value !== "string") {
    return fail("SCHEMA", null);
  }
  const mode = modeDesc.value;
  if (!MODES.includes(mode)) return fail("SCHEMA", "mode");
  const fields = mode === "depletion" ? DEPLETION_FIELDS : FOUR_PERCENT_FIELDS;
  const keys = Object.keys(input);
  if (keys.length !== fields.length + 1 || !keys.every((k) => k === "mode" || fields.includes(k))) {
    return fail("SCHEMA", null);
  }
  const raw = {};
  for (const field of fields) {
    const value = ownString(input, field);
    if (value === null) return fail("SCHEMA", null);
    raw[field] = value;
  }

  if (mode === "depletion") {
    const portfolio = validateField(raw.portfolioValue, "portfolioValue", MONEY_RANGE, false);
    if (portfolio.error) return portfolio.error;
    const withdrawal = validateField(raw.annualWithdrawal, "annualWithdrawal", MONEY_RANGE, false);
    if (withdrawal.error) return withdrawal.error;
    const returnRate = validateField(raw.returnRatePct, "returnRatePct", RETURN_RANGE, false);
    if (returnRate.error) return returnRate.error;
    const inflation = validateField(raw.inflationRatePct, "inflationRatePct", INFLATION_RANGE, false);
    if (inflation.error) return inflation.error;
    return {
      ok: true,
      result: simulateDepletion(portfolio.value, withdrawal.value, returnRate.value, inflation.value),
    };
  }

  const spending = validateField(raw.annualSpending, "annualSpending", SPENDING_RANGE, false);
  if (spending.error) return spending.error;
  const current = validateField(raw.currentPortfolio, "currentPortfolio", CURRENT_RANGE, true);
  if (current.error) return current.error;
  return { ok: true, result: runFourPercent(spending.value, current.value) };
}

// --- Report serialization -------------------------------------------------
// Compact JSON, object own keys sorted ascending by UTF-16 code units
// recursively, array order preserved, one trailing LF, UTF-8 without BOM.
// Built from primitives only; never calls an input's toJSON.

function compareUtf16(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function stableStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort(compareUtf16);
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function buildReport(result) {
  const text = stableStringify(result) + "\n";
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
