// Pure core for the Credit Card Payoff Calculator.
//
// Implements the fixed contract of SPEC
// spec-credit-card-payoff-calculator-20261109: strict five-field input
// validation, monthly interest on the opening balance with integer
// half-up rounding, the exact BigInt annuity formula for target-months
// mode, and the shared monthly simulation (at most 600 months).
// All money paths use BigInt integer arithmetic; no floating point
// participates in any amount. This module never touches the DOM,
// network or storage, and `run` is a synchronous pure transform.

const FIELD_ORDER = ["balance", "aprPercent", "mode", "monthlyPayment", "targetMonths"];
const FIELD_SET = new Set(FIELD_ORDER);

const MONEY_GRAMMAR = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$/;
const PERCENT_GRAMMAR = /^(0|[1-9][0-9]{0,2})(\.[0-9]{1,2})?$/;
const INTEGER_GRAMMAR = /^(0|[1-9][0-9]{0,2})$/;

const RAW_LIMITS = Object.freeze({
  balance: 12,
  aprPercent: 6,
  mode: 16,
  monthlyPayment: 12,
  targetMonths: 3,
});

const MAX_BALANCE_CENTS = 99999999999n; // 999,999,999.99
const MAX_APR_BP = 9999;
const MAX_MONTHS = 600;
const RATE_DENOMINATOR = 120000n; // aprBp / 120000 = monthly rate
const REPORT_LIMIT_BYTES = 2097152;

export const DEFAULT_DRAFT = Object.freeze({
  balance: "50000.00",
  aprPercent: "15",
  mode: "payment",
  monthlyPayment: "3000.00",
  targetMonths: "24",
});

export const EXAMPLE_DRAFT = Object.freeze({
  balance: "1200.00",
  aprPercent: "12",
  mode: "payment",
  monthlyPayment: "110.00",
  targetMonths: "24",
});

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasLoneSurrogate(value) {
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Shared per-field string checks, in the SPEC order: capacity, then
// unpaired surrogates, then emptiness. Returns an error object or null.
function checkStringBasics(value, field) {
  if (value.length > RAW_LIMITS[field]) return fail("INPUT_LIMIT", field);
  if (hasLoneSurrogate(value)) return fail("UNICODE", field);
  if (value === "") return fail("EMPTY", field);
  return null;
}

// Parses a grammar-validated decimal string into integer hundredths
// (cents for money, basis points for percents) as a BigInt.
function parseHundredths(value) {
  const dot = value.indexOf(".");
  const intPart = dot === -1 ? value : value.slice(0, dot);
  const fracPart = dot === -1 ? "" : value.slice(dot + 1);
  const fracPadded = (fracPart + "00").slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(fracPadded);
}

function validateMoney(value, field) {
  const basics = checkStringBasics(value, field);
  if (basics) return basics;
  if (!MONEY_GRAMMAR.test(value)) return fail("MONEY_FORMAT", field);
  const cents = parseHundredths(value);
  if (cents < 1n || cents > MAX_BALANCE_CENTS) return fail("RANGE", field);
  return { ok: true, cents };
}

function validatePercent(value) {
  const field = "aprPercent";
  const basics = checkStringBasics(value, field);
  if (basics) return basics;
  if (!PERCENT_GRAMMAR.test(value)) return fail("PERCENT_FORMAT", field);
  const bp = Number(parseHundredths(value));
  if (bp < 0 || bp > MAX_APR_BP) return fail("RANGE", field);
  return { ok: true, bp };
}

function validateTargetMonths(value) {
  const field = "targetMonths";
  const basics = checkStringBasics(value, field);
  if (basics) return basics;
  if (!INTEGER_GRAMMAR.test(value)) return fail("INTEGER_FORMAT", field);
  const months = Number(value);
  if (months < 1 || months > MAX_MONTHS) return fail("RANGE", field);
  return { ok: true, months };
}

// Monthly interest on the opening balance, rounded half-up to the cent:
// I = (B * aprBp + 60000) div 120000, exact BigInt arithmetic.
function monthlyInterestCents(balanceCents, aprBp) {
  if (aprBp === 0) return 0n;
  return (balanceCents * BigInt(aprBp) + 60000n) / RATE_DENOMINATOR;
}

// Exact annuity payment (cents, BigInt), always rounded up so the
// simulation is guaranteed to finish within the target months.
function annuityPaymentCents(balanceCents, aprBp, months) {
  const n = BigInt(months);
  if (aprBp === 0) return (balanceCents + n - 1n) / n;
  const a = BigInt(aprBp);
  const d = RATE_DENOMINATOR;
  const grown = (d + a) ** n;
  const base = d ** n;
  const numerator = balanceCents * a * grown;
  const denominator = d * (grown - base);
  return (numerator + denominator - 1n) / denominator;
}

function simulate(balanceCents, aprBp, paymentCents, activeField) {
  let balance = balanceCents;
  let totalInterest = 0n;
  let totalPaid = 0n;
  const rows = [];
  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    const interest = monthlyInterestCents(balance, aprBp);
    const due = balance + interest;
    const pay = paymentCents < due ? paymentCents : due;
    const principal = pay - interest;
    balance = due - pay;
    totalInterest += interest;
    totalPaid += pay;
    rows.push({
      month,
      paymentCents: Number(pay),
      interestCents: Number(interest),
      principalCents: Number(principal),
      balanceCents: Number(balance),
    });
    if (balance === 0n) {
      return {
        ok: true,
        months: month,
        totalInterestCents: Number(totalInterest),
        totalPaidCents: Number(totalPaid),
        finalPaymentCents: Number(pay),
        rows,
      };
    }
  }
  return fail("PAYOFF_TOO_LONG", activeField);
}

export function run(input) {
  // 1. Structure: a plain object with exactly the five own data fields.
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("SCHEMA", null);
  }
  // A plain object has either no prototype or a prototype that is
  // some realm's Object.prototype (whose own prototype is null). The
  // realm-tolerant form matters because inputs cross a Worker boundary
  // via structured clone and are rebuilt in the worker's realm.
  const proto = Object.getPrototypeOf(input);
  if (proto !== null && Object.getPrototypeOf(proto) !== null) return fail("SCHEMA", null);
  const values = {};
  for (const field of FIELD_ORDER) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !("value" in descriptor)) return fail("SCHEMA", field);
    values[field] = descriptor.value;
  }
  for (const key of Object.keys(input)) {
    if (!FIELD_SET.has(key)) return fail("SCHEMA", key);
  }
  if (typeof values.balance !== "string") return fail("SCHEMA", "balance");
  if (typeof values.aprPercent !== "string") return fail("SCHEMA", "aprPercent");
  if (typeof values.mode !== "string") return fail("SCHEMA", "mode");
  if (values.monthlyPayment !== null && typeof values.monthlyPayment !== "string") {
    return fail("SCHEMA", "monthlyPayment");
  }
  if (values.targetMonths !== null && typeof values.targetMonths !== "string") {
    return fail("SCHEMA", "targetMonths");
  }

  // 2. balance, aprPercent, mode, in that order.
  const balanceCheck = validateMoney(values.balance, "balance");
  if (!balanceCheck.ok) return balanceCheck;
  const aprCheck = validatePercent(values.aprPercent);
  if (!aprCheck.ok) return aprCheck;
  const modeBasics = checkStringBasics(values.mode, "mode");
  if (modeBasics) return modeBasics;
  if (values.mode !== "payment" && values.mode !== "months") {
    return fail("ENUM", "mode");
  }

  const balanceCents = balanceCheck.cents;
  const aprBp = aprCheck.bp;
  const firstInterest = monthlyInterestCents(balanceCents, aprBp);

  // 3. Conditional consistency, then the active field.
  if (values.mode === "payment") {
    if (values.targetMonths !== null) return fail("SCHEMA", "targetMonths");
    if (typeof values.monthlyPayment !== "string") return fail("SCHEMA", "monthlyPayment");
    const paymentCheck = validateMoney(values.monthlyPayment, "monthlyPayment");
    if (!paymentCheck.ok) return paymentCheck;
    // 5. Fixed payment: the first month's interest decides never-payoff,
    // because interest only shrinks as the balance falls.
    if (paymentCheck.cents <= firstInterest) return fail("NEVER_PAYOFF", "monthlyPayment");
    const outcome = simulate(balanceCents, aprBp, paymentCheck.cents, "monthlyPayment");
    if (!outcome.ok) return outcome;
    return {
      ok: true,
      result: {
        mode: "payment",
        months: outcome.months,
        totalInterestCents: outcome.totalInterestCents,
        totalPaidCents: outcome.totalPaidCents,
        finalPaymentCents: outcome.finalPaymentCents,
        rows: outcome.rows,
      },
    };
  }

  if (values.monthlyPayment !== null) return fail("SCHEMA", "monthlyPayment");
  if (typeof values.targetMonths !== "string") return fail("SCHEMA", "targetMonths");
  const monthsCheck = validateTargetMonths(values.targetMonths);
  if (!monthsCheck.ok) return monthsCheck;
  // 6. Target months: exact annuity payment, with the floor rule that
  // guarantees progress through the shared simulation.
  let required = annuityPaymentCents(balanceCents, aprBp, monthsCheck.months);
  if (required <= firstInterest) required = firstInterest + 1n;
  const outcome = simulate(balanceCents, aprBp, required, "targetMonths");
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    result: {
      mode: "months",
      targetMonths: monthsCheck.months,
      requiredPaymentCents: Number(required),
      months: outcome.months,
      totalInterestCents: outcome.totalInterestCents,
      totalPaidCents: outcome.totalPaidCents,
      finalPaymentCents: outcome.finalPaymentCents,
      rows: outcome.rows,
    },
  };
}

// Converts a five-string form draft into the core input shape by
// nulling the field that the selected mode does not use.
export function draftToInput(draft) {
  return {
    balance: draft.balance,
    aprPercent: draft.aprPercent,
    mode: draft.mode,
    monthlyPayment: draft.mode === "payment" ? draft.monthlyPayment : null,
    targetMonths: draft.mode === "months" ? draft.targetMonths : null,
  };
}

// Display formatting: thousands separators plus exactly two decimals,
// identical in both languages, with no currency symbol. Machine values
// never depend on the locale.
export function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const intPart = Math.floor(absolute / 100);
  const fracPart = absolute % 100;
  const grouped = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}.${String(fracPart).padStart(2, "0")}`;
}

// The fixed report: compact JSON of the result with object keys sorted
// ascending by UTF-16 code units at every depth, array order kept, one
// trailing LF, UTF-8 without BOM. Serialised manually so an input's
// toJSON is never invoked.
function stableStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new Error("Report values must be safe integers.");
      }
      return String(value);
    case "object": {
      const keys = Object.keys(value).sort();
      const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
      return `{${parts.join(",")}}`;
    }
    default:
      throw new Error("Report value has an unsupported type.");
  }
}

export function buildReport(result) {
  let text;
  try {
    text = `${stableStringify(result)}\n`;
  } catch {
    return fail("INTERNAL", null);
  }
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > REPORT_LIMIT_BYTES) return fail("OUTPUT_LIMIT", null);
  return { ok: true, text, bytes };
}
