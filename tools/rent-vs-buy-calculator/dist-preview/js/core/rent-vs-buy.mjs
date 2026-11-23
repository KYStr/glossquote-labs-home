// Pure core for the Rent vs Buy Calculator
// (spec-rent-vs-buy-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// The arithmetic is exact rational arithmetic on BigInt, per the
// SPEC's pinned integer-yuan rules. Nothing here multiplies a binary
// floating-point approximation of the monthly rate and then rounds:
// the SPEC's implementation section forbids that (AUTHOR-CHECK.md
// records the taipei-typical month-195 case: balance 4,432,080,
// exact interest 9,233.5, which a float approximation rounds down
// to 9,233 instead of the correct 9,234). Every rounding below is
// half-up on an exact integer ratio, computed as
// (2 * numerator + denominator) / (2 * denominator) in integers.
//
// Model (SPEC inputsOutputs, amounts in integer yuan):
//   L = homePrice - downPayment; n = years * 12 months.
//   Monthly rate i = mortgageRate / 1200 (exact rational).
//   Monthly payment M = round-half-up(L * i / (1 - (1+i)^(-n))),
//   i = 0 gives round-half-up(L / n); L = 0 gives M = 0; otherwise
//   M = max(1, M). Computed as
//   L * p * (p+q)^n / (q * ((p+q)^n - q^n)) with i = p/q.
//   Monthly split: interest_m = round-half-up(B_{m-1} * i); the last
//   month pays B_{n-1} + interest_n (exact payoff); once the balance
//   reaches zero, later payments are 0.
//   rentYear(t) = round-half-up(12 * rent * (1+g_r)^(t-1));
//   homeValue(t) = round-half-up(price * (1+g_h)^t);
//   opportunityCost(t) = round-half-up(down * ((1+r)^t - 1));
//   equity(t) = homeValue(t) - balance(t);
//   buyCumulative(t) = down + mortgage paid so far
//     + opportunityCost(t) - equity(t);
//   difference(t) = rentCumulative(t) - buyCumulative(t); a positive
//   value means buying has been cheaper so far.
//   breakevenYear is the first t with difference(t) >= 0, else null.

export const FIELDS = [
  "monthlyRent",
  "homePrice",
  "downPayment",
  "mortgageRate",
  "years",
  "rentGrowthPct",
  "homeAppreciationPct",
  "opportunityCostPct",
];

// SPEC userFlow reset defaults (also the initial draft).
export const DEFAULTS = {
  monthlyRent: "20000",
  homePrice: "10000000",
  downPayment: "2000000",
  mortgageRate: "2",
  years: "30",
  rentGrowthPct: "2",
  homeAppreciationPct: "2",
  opportunityCostPct: "3",
};

// The worked example is fixtures.json case 1 (taipei-typical) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  monthlyRent: "20000",
  homePrice: "10000000",
  downPayment: "2000000",
  mortgageRate: "2.5",
  years: "30",
  rentGrowthPct: "2",
  homeAppreciationPct: "0",
  opportunityCostPct: "3",
};

export const MAX_RAW_LENGTH = 12;

// Bilingual field labels, used by the SPEC-pinned error messages.
export const FIELD_LABELS = {
  monthlyRent: { zh: "每月租金", en: "Monthly rent" },
  homePrice: { zh: "房價", en: "Home price" },
  downPayment: { zh: "頭期款", en: "Down payment" },
  mortgageRate: { zh: "房貸年利率", en: "Annual mortgage rate" },
  years: { zh: "比較年數", en: "Horizon (years)" },
  rentGrowthPct: { zh: "租金年漲幅", en: "Annual rent growth" },
  homeAppreciationPct: { zh: "房價年漲幅", en: "Annual home appreciation" },
  opportunityCostPct: { zh: "頭期款機會成本年利率", en: "Annual opportunity cost rate" },
};

// Range endpoints shown in the SPEC-pinned RANGE message.
const RANGE_BOUNDS = {
  monthlyRent: { min: "1", max: "1000000" },
  homePrice: { min: "1", max: "1000000000" },
  downPayment: { min: "0", max: "1000000000" },
  mortgageRate: { min: "0", max: "30" },
  years: { min: "1", max: "40" },
  rentGrowthPct: { min: "-10", max: "30" },
  homeAppreciationPct: { min: "-10", max: "30" },
  opportunityCostPct: { min: "0", max: "30" },
};

// Pinned trial statement (SPEC inputsOutputs), shown above the
// results on both pages, verbatim in both languages.
export const DISCLAIMER_ZH =
  "本工具僅依你輸入的假設試算，不含稅費、仲介費、裝修、維修、管理費與房貸成數限制，不是財務建議或銀行報價。";
export const DISCLAIMER_EN =
  "This tool estimates only from the assumptions you enter. It excludes taxes, agent fees, renovation, maintenance, management fees and loan-to-value limits, and is not financial advice or a bank quotation.";

// SPEC-pinned error messages (inputsOutputs). {label} is the field's
// bilingual label, {raw} the raw input, {min}/{max} the range ends.
export function formatError(error, lang, raw) {
  const other = lang === "en" ? "en" : "zh";
  const generic = {
    SCHEMA: { zh: "輸入格式不正確。", en: "The input format is invalid." },
    INTERNAL: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
    WORKER_ERROR: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
    OUTPUT_LIMIT: {
      zh: "報告超過大小上限，無法下載。",
      en: "The report exceeds the size limit and cannot be downloaded.",
    },
  };
  if (error.code === "DOWN_PAYMENT_EXCEEDS_PRICE") {
    const entered = raw !== null && typeof raw === "object" ? raw.downPayment : "";
    return other === "en"
      ? `The down payment must not exceed the home price; you entered ${entered}.`
      : `頭期款不可超過房價，你輸入的頭期款是 ${entered} 元。`;
  }
  if (error.field === null || error.field === undefined || !(error.field in FIELD_LABELS)) {
    return (generic[error.code] ?? generic.INTERNAL)[other];
  }
  const label = FIELD_LABELS[error.field][other];
  const entered = raw !== null && typeof raw === "object" ? raw[error.field] : "";
  switch (error.code) {
    case "INPUT_LIMIT":
      return other === "en" ? `${label} input is too long.` : `${label}輸入過長。`;
    case "EMPTY":
      return other === "en" ? `Enter ${label}.` : `請輸入${label}。`;
    case "INTEGER_FORMAT":
      return other === "en"
        ? `${label} must be an integer; you entered “${entered}”.`
        : `${label}須為整數，你輸入的是「${entered}」。`;
    case "DECIMAL_FORMAT":
      return other === "en"
        ? `${label} has an invalid format; you entered “${entered}”.`
        : `${label}格式不正確，你輸入的是「${entered}」。`;
    case "RANGE": {
      const bounds = RANGE_BOUNDS[error.field];
      return other === "en"
        ? `${label} must be between ${bounds.min} and ${bounds.max}; you entered “${entered}”.`
        : `${label}須介於 ${bounds.min} 至 ${bounds.max} 之間，你輸入的是「${entered}」。`;
    }
    default:
      return (generic[error.code] ?? generic.INTERNAL)[other];
  }
}

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw string map, or null when the shape is not exactly
// the eight fields.
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

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^(-)?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

// Half-up rounding of an exact non-negative ratio numerator /
// denominator, both BigInt, denominator > 0. Only ever called with a
// non-negative numerator in this module.
function roundHalfUpRatio(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

function powBigInt(base, exponent) {
  return base ** BigInt(exponent);
}

// Per-field validation in the SPEC's order: capacity, empty,
// grammar, range. Integer fields return the parsed safe integer;
// rate fields return the exact fraction { num, den } (num signed).
function validateIntegerField(field, value, min, max) {
  if (value.length > MAX_RAW_LENGTH) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

function validateRateField(field, value, { allowNegative, maxDecimals, min, max }) {
  if (value.length > MAX_RAW_LENGTH) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  const match = DECIMAL_PATTERN.exec(value);
  if (match === null) return { error: failure("DECIMAL_FORMAT", field) };
  const negative = match[1] === "-";
  if (negative && !allowNegative) return { error: failure("DECIMAL_FORMAT", field) };
  const intPart = match[2];
  const fracPart = match[3] === undefined ? "" : match[3].slice(1);
  if (fracPart.length > maxDecimals) return { error: failure("DECIMAL_FORMAT", field) };
  const den = 10n ** BigInt(fracPart.length);
  let num = BigInt(intPart) * den + (fracPart === "" ? 0n : BigInt(fracPart));
  if (negative) num = -num;
  // "-0" (and "-0.00") is 0 by the SPEC.
  if (num < BigInt(min) * den || num > BigInt(max) * den) {
    return { error: failure("RANGE", field) };
  }
  return { value: { num, den } };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Field order is the validation order (SPEC inputsOutputs).
  const checked = {};
  const integerSpecs = {
    monthlyRent: [1, 1000000],
    homePrice: [1, 1000000000],
    downPayment: [0, 1000000000],
    years: [1, 40],
  };
  for (const field of ["monthlyRent", "homePrice", "downPayment"]) {
    const [min, max] = integerSpecs[field];
    const outcome = validateIntegerField(field, raw[field], min, max);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }
  const rateSpecs = {
    mortgageRate: { allowNegative: false, maxDecimals: 4, min: 0, max: 30 },
  };
  {
    const outcome = validateRateField("mortgageRate", raw.mortgageRate, rateSpecs.mortgageRate);
    if (outcome.error) return outcome.error;
    checked.mortgageRate = outcome.value;
  }
  {
    const outcome = validateIntegerField("years", raw.years, 1, 40);
    if (outcome.error) return outcome.error;
    checked.years = outcome.value;
  }
  const growthSpecs = {
    rentGrowthPct: { allowNegative: true, maxDecimals: 2, min: -10, max: 30 },
    homeAppreciationPct: { allowNegative: true, maxDecimals: 2, min: -10, max: 30 },
    opportunityCostPct: { allowNegative: false, maxDecimals: 2, min: 0, max: 30 },
  };
  for (const field of ["rentGrowthPct", "homeAppreciationPct", "opportunityCostPct"]) {
    const outcome = validateRateField(field, raw[field], growthSpecs[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }

  // Cross-field check last: the down payment must not exceed the price.
  if (checked.downPayment > checked.homePrice) {
    return failure("DOWN_PAYMENT_EXCEEDS_PRICE", "downPayment");
  }

  const monthlyRent = BigInt(checked.monthlyRent);
  const homePrice = BigInt(checked.homePrice);
  const downPayment = BigInt(checked.downPayment);
  const years = checked.years;
  const loan = homePrice - downPayment;
  const months = years * 12;

  // Each growth rate as the exact fraction 1 + value/100, where
  // value is the percent number (an exact fraction { num, den }):
  // 1 + num/(100*den) = (100*den + num) / (100*den).
  // The numerator stays positive: the lowest legal rate is -10%.
  function growthBase(fraction) {
    return { n: 100n * fraction.den + fraction.num, d: 100n * fraction.den };
  }
  const rentBase = growthBase(checked.rentGrowthPct);
  const homeBase = growthBase(checked.homeAppreciationPct);
  const opportunityBase = growthBase(checked.opportunityCostPct);

  // Monthly rate i = mortgageRate / 1200, exact: p / q.
  const rateNum = checked.mortgageRate.num;
  const rateDen = checked.mortgageRate.den * 1200n;

  // Monthly payment M (integer yuan).
  let monthlyPayment;
  if (loan === 0n) {
    monthlyPayment = 0n;
  } else if (rateNum === 0n) {
    monthlyPayment = roundHalfUpRatio(loan, BigInt(months));
    if (monthlyPayment < 1n) monthlyPayment = 1n;
  } else {
    const p = rateNum;
    const q = rateDen;
    const base = p + q;
    const powBase = powBigInt(base, months);
    const powQ = powBigInt(q, months);
    monthlyPayment = roundHalfUpRatio(loan * p * powBase, q * (powBase - powQ));
    if (monthlyPayment < 1n) monthlyPayment = 1n;
  }

  // Monthly split (internal only; the monthly table is not shown).
  // balanceByYear[t] is the integer balance after month 12 * (t + 1);
  // mortgageByYear[t] is that year's total payment.
  const balanceByYear = new Array(years).fill(0n);
  const mortgageByYear = new Array(years).fill(0n);
  let balance = loan;
  for (let month = 1; month <= months; month += 1) {
    const yearIndex = Math.floor((month - 1) / 12);
    let interest = 0n;
    let payment = 0n;
    if (balance !== 0n) {
      interest = rateNum === 0n ? 0n : roundHalfUpRatio(balance * rateNum, rateDen);
      if (month === months) {
        payment = balance + interest;
      } else {
        payment = monthlyPayment;
      }
      let principal = payment - interest;
      // Defensive clamp (not pinned by the SPEC): rounding can only
      // make the balance smaller than one principal portion in the
      // final stretch; paying the balance off keeps the balance
      // non-negative and the final balance exactly zero. It never
      // triggers on the SPEC fixtures (verified by the deep-equal
      // fixture tests: every yearly balance matches).
      if (principal > balance) {
        payment = balance + interest;
        principal = balance;
      }
      balance -= principal;
    }
    mortgageByYear[yearIndex] += payment;
    if (month % 12 === 0) balanceByYear[yearIndex] = balance;
  }

  const yearly = [];
  let rentCumulative = 0n;
  let mortgageCumulative = 0n;
  let breakevenYear = null;
  for (let t = 1; t <= years; t += 1) {
    // rentYear(t) = round-half-up(12 * rent * (1+g_r)^(t-1)).
    const rentYear = roundHalfUpRatio(
      12n * monthlyRent * powBigInt(rentBase.n, t - 1),
      powBigInt(rentBase.d, t - 1),
    );
    rentCumulative += rentYear;
    mortgageCumulative += mortgageByYear[t - 1];
    // homeValue(t) = round-half-up(price * (1+g_h)^t).
    const homeValue = roundHalfUpRatio(
      homePrice * powBigInt(homeBase.n, t),
      powBigInt(homeBase.d, t),
    );
    const yearBalance = balanceByYear[t - 1];
    const equity = homeValue - yearBalance;
    // opportunityCost(t) = round-half-up(down * ((1+r)^t - 1)).
    const opportunityCost =
      downPayment === 0n
        ? 0n
        : roundHalfUpRatio(
            downPayment * (powBigInt(opportunityBase.n, t) - powBigInt(opportunityBase.d, t)),
            powBigInt(opportunityBase.d, t),
          );
    const buyCumulative = downPayment + mortgageCumulative + opportunityCost - equity;
    const difference = rentCumulative - buyCumulative;
    if (breakevenYear === null && difference >= 0n) breakevenYear = t;
    yearly.push({
      year: t,
      rentYear: Number(rentYear),
      rentCumulative: Number(rentCumulative),
      mortgageYear: Number(mortgageByYear[t - 1]),
      homeValue: Number(homeValue),
      balance: Number(yearBalance),
      equity: Number(equity),
      opportunityCost: Number(opportunityCost),
      buyCumulative: Number(buyCumulative),
      difference: Number(difference),
    });
  }

  const last = yearly[yearly.length - 1];
  const totalRentCost = last.rentCumulative;
  const totalBuyNetCost = last.buyCumulative;
  return {
    ok: true,
    result: {
      monthlyPayment: Number(monthlyPayment),
      breakevenYear,
      verdict: breakevenYear === null ? "rent" : "buy",
      totalRentCost,
      totalBuyNetCost,
      savingsAtHorizon: totalRentCost - totalBuyNetCost,
      yearly,
    },
  };
}

// Fixed report download: rent-vs-buy-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "rent-vs-buy-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
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
