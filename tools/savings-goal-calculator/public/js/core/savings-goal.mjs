// Pure core for the Savings Goal Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md
// (spec-savings-goal-calculator-20261109): a closed-form solver for
// the two inverse savings questions — monthly deposit for a fixed
// term (mode "payment"), or months to reach the goal for a fixed
// monthly deposit (mode "months") — using exact rational arithmetic
// (BigInt integer cents, integer basis points, exact powers of the
// monthly growth factor). Floating point is used only to seed the
// mode-B month estimate, which exact rational comparison then
// corrects; no float ever decides a digit of the result.

export const FIELDS = [
  "mode",
  "targetAmount",
  "initialAmount",
  "annualRate",
  "months",
  "monthlyPayment",
];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  mode: 16,
  targetAmount: 16,
  initialAmount: 16,
  annualRate: 8,
  months: 8,
  monthlyPayment: 16,
};

export const DEFAULTS = {
  mode: "payment",
  targetAmount: "100000",
  initialAmount: "10000",
  annualRate: "3",
  months: "60",
  monthlyPayment: "3000",
};

// The example draft: the first synthetic fixture case
// (payment-basic-zero-rate), per SPEC section 2.
export const EXAMPLE = {
  annualRate: "0",
  initialAmount: "10000",
  mode: "payment",
  monthlyPayment: "3000",
  months: "12",
  targetAmount: "100000",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "savings-goal-report.json";

// Pinned bounds (SPEC section 3): amounts in integer cents.
export const TARGET_MIN_CENTS = 1n;
export const AMOUNT_MAX_CENTS = 99999999999n; // 999,999,999.99
export const RATE_MAX_BP = 10000n; // 100.00%
export const MONTHS_MIN = 1;
export const MONTHS_MAX = 600;
export const HORIZON_MONTHS = 1200; // mode-B solving horizon

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "請輸入或載入範例", en: "Enter your inputs or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check your input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

// Pinned semantic-state sentences, bilingual verbatim
// (SPEC inputsOutputs point 8).
export const STATUS_SENTENCES = {
  "already-funded": {
    zh: "目前存款已達目標，不需再存。",
    en: "Your current savings already reach the goal; no deposit is needed.",
  },
  "growth-sufficient": {
    zh: "不需新增存款，目前存款單獨成長即可在期限內達標。",
    en: "No new deposits are needed; your current savings alone grow to the goal by the deadline.",
  },
  "unreachable-no-growth": {
    zh: "在目前條件下餘額永遠不會成長，達不到目標。",
    en: "Under these inputs the balance never grows, so the goal can never be reached.",
  },
  "unreachable-beyond-horizon": {
    zh: "以目前每月金額，達標需要超過 1200 個月（100 年），超出本工具範圍。",
    en: "At this monthly amount the goal takes over 1,200 months (100 years), beyond this tool's horizon.",
  },
};

// Pinned standing disclosure, bilingual verbatim
// (SPEC inputsOutputs point 7).
export const DISCLOSURE = {
  zh: "報酬率為假設值，試算結果不保證實際收益。",
  en: "The rate is an assumption; results do not guarantee actual returns.",
};

const MONEY_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^[0-9]+$/;
const RATE_DENOMINATOR = 120000n; // bp -> monthly rate: bp / 120000

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
// whose own enumerable properties are exactly the six fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the six string values, or null.
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

// Parse a money string (grammar already checked) to integer cents.
function parseMoneyCents(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return BigInt(raw) * 100n;
  const whole = raw.slice(0, dot);
  const fraction = raw.slice(dot + 1).padEnd(2, "0");
  return BigInt(whole) * 100n + BigInt(fraction);
}

// Parse a rate string (grammar already checked) to integer basis points.
function parseRateBp(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return BigInt(raw) * 100n;
  const whole = raw.slice(0, dot);
  const fraction = raw.slice(dot + 1).padEnd(2, "0");
  return BigInt(whole) * 100n + BigInt(fraction);
}

// Validate the whole input: schema first, then fields in the fixed
// order mode, targetAmount, initialAmount, annualRate, months,
// monthlyPayment; the first error wins. A field inactive in the
// current mode receives only its capacity check and its content is
// otherwise ignored.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("mode", values.mode);
  if (failure !== null) return failure;
  if (values.mode === "") return fieldError("EMPTY", "mode");
  if (values.mode !== "payment" && values.mode !== "months") {
    return fieldError("ENUM", "mode");
  }
  const mode = values.mode;

  failure = checkCapacityAndUnicode("targetAmount", values.targetAmount);
  if (failure !== null) return failure;
  if (values.targetAmount === "") return fieldError("EMPTY", "targetAmount");
  if (!MONEY_PATTERN.test(values.targetAmount)) {
    return fieldError("DECIMAL_FORMAT", "targetAmount");
  }
  const targetCents = parseMoneyCents(values.targetAmount);
  if (targetCents < TARGET_MIN_CENTS || targetCents > AMOUNT_MAX_CENTS) {
    return fieldError("RANGE", "targetAmount");
  }

  failure = checkCapacityAndUnicode("initialAmount", values.initialAmount);
  if (failure !== null) return failure;
  if (values.initialAmount === "") return fieldError("EMPTY", "initialAmount");
  if (!MONEY_PATTERN.test(values.initialAmount)) {
    return fieldError("DECIMAL_FORMAT", "initialAmount");
  }
  const initialCents = parseMoneyCents(values.initialAmount);
  if (initialCents < 0n || initialCents > AMOUNT_MAX_CENTS) {
    return fieldError("RANGE", "initialAmount");
  }

  failure = checkCapacityAndUnicode("annualRate", values.annualRate);
  if (failure !== null) return failure;
  if (values.annualRate === "") return fieldError("EMPTY", "annualRate");
  if (!MONEY_PATTERN.test(values.annualRate)) {
    return fieldError("DECIMAL_FORMAT", "annualRate");
  }
  const rateBp = parseRateBp(values.annualRate);
  if (rateBp < 0n || rateBp > RATE_MAX_BP) {
    return fieldError("RANGE", "annualRate");
  }

  // months: fully validated only in payment mode; in months mode only
  // the capacity check applies and the content is ignored.
  failure = checkCapacityAndUnicode("months", values.months);
  if (failure !== null) return failure;
  let months = null;
  if (mode === "payment") {
    if (values.months === "") return fieldError("EMPTY", "months");
    if (!INTEGER_PATTERN.test(values.months)) {
      return fieldError("INTEGER_FORMAT", "months");
    }
    months = Number(values.months);
    if (months < MONTHS_MIN || months > MONTHS_MAX) {
      return fieldError("RANGE", "months");
    }
  }

  // monthlyPayment: fully validated only in months mode; in payment
  // mode only the capacity check applies and the content is ignored.
  failure = checkCapacityAndUnicode("monthlyPayment", values.monthlyPayment);
  if (failure !== null) return failure;
  let monthlyPaymentCents = null;
  if (mode === "months") {
    if (values.monthlyPayment === "") return fieldError("EMPTY", "monthlyPayment");
    if (!MONEY_PATTERN.test(values.monthlyPayment)) {
      return fieldError("DECIMAL_FORMAT", "monthlyPayment");
    }
    monthlyPaymentCents = parseMoneyCents(values.monthlyPayment);
    if (monthlyPaymentCents < 0n || monthlyPaymentCents > AMOUNT_MAX_CENTS) {
      return fieldError("RANGE", "monthlyPayment");
    }
  }

  return {
    ok: true,
    values: {
      mode,
      targetCents,
      initialCents,
      rateBp,
      months,
      monthlyPaymentCents,
    },
  };
}

// --- Exact rational arithmetic (BigInt fractions, denominator > 0) ---

function frac(numerator, denominator) {
  return { n: numerator, d: denominator };
}

function addFrac(a, b) {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}

function subFrac(a, b) {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d);
}

function mulFrac(a, b) {
  return frac(a.n * b.n, a.d * b.d);
}

function divFrac(a, b) {
  const numerator = a.n * b.d;
  const denominator = a.d * b.n;
  return denominator < 0n ? frac(-numerator, -denominator) : frac(numerator, denominator);
}

function cmpFrac(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// Ceiling of a fraction to an integer (BigInt division truncates
// toward zero, which is the ceiling for a negative numerator).
function ceilFrac(value) {
  if (value.n >= 0n) return (value.n + value.d - 1n) / value.d;
  return value.n / value.d;
}

// Half-up of a non-negative fraction to an integer:
// floor(value + 1/2).
function halfUpFrac(value) {
  return (2n * value.n + value.d) / (2n * value.d);
}

// q^k exactly, where q = (120000 + bp) / 120000.
function qPow(bp, k) {
  const base = RATE_DENOMINATOR + bp;
  const exponent = BigInt(k);
  return frac(base ** exponent, RATE_DENOMINATOR ** exponent);
}

// B(k): the end-of-month balance after k months of end-of-month
// deposits of `pmtCents`, starting from `pvCents`. Exact rational.
function balanceAt(bp, pvCents, pmtCents, k) {
  if (bp === 0n) return frac(pvCents + pmtCents * BigInt(k), 1n);
  const qk = qPow(bp, k);
  const growth = mulFrac(frac(pvCents, 1n), qk);
  // (q^k - 1) / i with i = bp / 120000.
  const annuity = divFrac(
    subFrac(qk, frac(1n, 1n)),
    frac(bp, RATE_DENOMINATOR),
  );
  return addFrac(growth, mulFrac(frac(pmtCents, 1n), annuity));
}

// Integer cents -> "D.CC" display string (no grouping, no sign,
// no currency symbol; machine values never follow locale).
export function formatCents(cents) {
  const whole = cents / 100n;
  const fraction = cents % 100n;
  return `${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

// Display grouping for the page only (never feeds back into machine
// values): "7245.98" -> "7,245.98".
export function formatMoneyDisplay(text) {
  const [whole, fraction] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

function solvePayment({ targetCents, initialCents, rateBp, months }) {
  const fv = targetCents;
  const pv = initialCents;
  const bp = rateBp;
  const n = months;
  const qn = qPow(bp, n);
  const grownPv = mulFrac(frac(pv, 1n), qn);
  const zeroPayment = () => {
    const finalBalance = halfUpFrac(grownPv);
    return {
      monthlyPayment: "0.00",
      totalDeposits: "0.00",
      totalInterest: formatCents(finalBalance - pv),
      finalBalance: formatCents(finalBalance),
    };
  };
  if (pv >= fv) {
    return { mode: "payment", status: "already-funded", months: n, ...zeroPayment() };
  }
  if (bp > 0n && cmpFrac(grownPv, frac(fv, 1n)) >= 0) {
    return { mode: "payment", status: "growth-sufficient", months: n, ...zeroPayment() };
  }
  let pmtCents;
  let finalBalance;
  if (bp === 0n) {
    pmtCents = (fv - pv + BigInt(n) - 1n) / BigInt(n);
    finalBalance = pv + pmtCents * BigInt(n);
  } else {
    // PMT* = (FV - PV * q^n) * i / (q^n - 1), exact rational.
    const pmtStar = divFrac(
      mulFrac(
        subFrac(frac(fv, 1n), grownPv),
        frac(bp, RATE_DENOMINATOR),
      ),
      subFrac(qn, frac(1n, 1n)),
    );
    pmtCents = ceilFrac(pmtStar);
    finalBalance = halfUpFrac(balanceAt(bp, pv, pmtCents, n));
  }
  const totalDeposits = pmtCents * BigInt(n);
  return {
    mode: "payment",
    status: "ok",
    months: n,
    monthlyPayment: formatCents(pmtCents),
    totalDeposits: formatCents(totalDeposits),
    totalInterest: formatCents(finalBalance - pv - totalDeposits),
    finalBalance: formatCents(finalBalance),
  };
}

function solveMonths({ targetCents, initialCents, rateBp, monthlyPaymentCents }) {
  const fv = targetCents;
  const pv = initialCents;
  const bp = rateBp;
  const pmt = monthlyPaymentCents;
  const unreachable = (reason) => ({
    mode: "months",
    status: "unreachable",
    reason,
    monthsRequired: null,
    finalMonthPayment: null,
    balanceIfFullPayment: null,
    totalDeposits: null,
    totalInterest: null,
    finalBalance: null,
  });
  if (pv >= fv) {
    return {
      mode: "months",
      status: "already-funded",
      reason: null,
      monthsRequired: 0,
      finalMonthPayment: "0.00",
      balanceIfFullPayment: formatCents(pv),
      totalDeposits: "0.00",
      totalInterest: "0.00",
      finalBalance: formatCents(pv),
    };
  }
  if (pmt === 0n && (pv === 0n || bp === 0n)) return unreachable("no-growth");

  let k;
  if (bp === 0n) {
    // Exact integer ceiling division; k is exact, never k + 1.
    const exact = (fv - pv + pmt - 1n) / pmt;
    if (exact > BigInt(HORIZON_MONTHS)) return unreachable("beyond-horizon");
    k = Number(exact);
  } else {
    // Float logarithm only seeds the estimate; exact rational
    // comparison corrects it, so float error cannot change the result.
    const iNum = Number(bp) / 120000;
    const qNum = 1 + iNum;
    const numerator = Number(fv) * iNum + Number(pmt);
    const denominator = Number(pv) * iNum + Number(pmt);
    const estimate = Math.log(numerator / denominator) / Math.log(qNum);
    let start = Number.isFinite(estimate) ? Math.max(1, Math.floor(estimate)) : 1;
    if (start > HORIZON_MONTHS) {
      // Only the 1200-month boundary matters: check B(1200) exactly.
      if (cmpFrac(balanceAt(bp, pv, pmt, HORIZON_MONTHS), frac(fv, 1n)) < 0) {
        return unreachable("beyond-horizon");
      }
      start = HORIZON_MONTHS;
    }
    k = start;
    let guard = 0;
    while (k <= HORIZON_MONTHS && cmpFrac(balanceAt(bp, pv, pmt, k), frac(fv, 1n)) < 0) {
      k += 1;
      guard += 1;
      if (guard > 1300) {
        return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
      }
    }
    if (k > HORIZON_MONTHS) return unreachable("beyond-horizon");
    while (k >= 2 && cmpFrac(balanceAt(bp, pv, pmt, k - 1), frac(fv, 1n)) >= 0) {
      k -= 1;
      guard += 1;
      if (guard > 1300) {
        return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
      }
    }
  }

  // Final-month deposit: FV - B(k-1) * q (bp > 0) or FV - B(k-1)
  // (bp = 0); negative means the crossing happens on growth alone
  // during the last month, so the deposit is clamped to zero.
  // Displayed value is ceiled to the cent.
  let tail;
  if (bp === 0n) {
    tail = subFrac(frac(fv, 1n), balanceAt(bp, pv, pmt, k - 1));
  } else {
    const q = frac(RATE_DENOMINATOR + bp, RATE_DENOMINATOR);
    tail = subFrac(frac(fv, 1n), mulFrac(balanceAt(bp, pv, pmt, k - 1), q));
  }
  if (cmpFrac(tail, frac(0n, 1n)) < 0) tail = frac(0n, 1n);
  const finalMonthCents = ceilFrac(tail);
  const balanceIfFull = halfUpFrac(balanceAt(bp, pv, pmt, k));
  const totalDeposits = pmt * BigInt(k - 1) + finalMonthCents;
  return {
    mode: "months",
    status: "ok",
    reason: null,
    monthsRequired: k,
    finalMonthPayment: formatCents(finalMonthCents),
    balanceIfFullPayment: formatCents(balanceIfFull),
    totalDeposits: formatCents(totalDeposits),
    totalInterest: formatCents(fv - pv - totalDeposits),
    finalBalance: formatCents(fv),
  };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const result =
    validated.values.mode === "payment"
      ? solvePayment(validated.values)
      : solveMonths(validated.values);
  if (result.ok === false) return result;
  // Report cap backstop: a report over the cap is an OUTPUT_LIMIT
  // error instead of a success. With the pinned ranges a genuine
  // report is a few hundred bytes, so this never fires for a genuine
  // calculation.
  const serialized = serializeReport({ input, result });
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

// Serialize a report {input, result} for download: canonical compact
// JSON plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte
// report limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(report) {
  const text = `${canonicalJson(report)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
