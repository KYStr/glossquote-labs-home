// Mortgage Amortization — pure core (no DOM access).
//
// Implements the normative arithmetic of SPEC section 4. All money is
// integer cents. Monthly interest uses exact integer arithmetic
// (BigInt): round-half-up(balanceCents * rateScaled / 12,000,000), where
// rateScaled = annualRatePercent * 10^4. Binary floating point appears
// only inside the annuity factor, before its single specified rounding.

export class MortgageError extends Error {
  constructor(code, params = {}) {
    super(code);
    this.name = "MortgageError";
    this.code = code;
    this.params = params;
  }
}

function fail(code, params) {
  throw new MortgageError(code, params);
}

export const MAX_PRINCIPAL_CENTS = 1_000_000_000_000; // 10^12 cents
export const MAX_RATE_SCALED = 300_000; // 30.0000 %
export const MAX_TERM_MONTHS = 480;
export const MAX_GRACE_MONTHS = 60;
export const MAX_PREPAYMENTS = 12;
export const RATE_SCALE_DIVISOR = 12_000_000; // 10^4 * 100 * 12

// ---- Parsing (strict decimals; no implicit string arithmetic) ----

export function parseMoneyCents(text) {
  if (typeof text !== "string") return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0") || 0);
  return match[1] === "-" ? -cents : cents;
}

export function parseRateScaled(text) {
  if (typeof text !== "string") return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,4}))?$/.exec(text.trim());
  if (!match) return null;
  const scaled = Number(match[2]) * 10_000 + Number((match[3] ?? "").padEnd(4, "0") || 0);
  return match[1] === "-" ? -scaled : scaled;
}

// ---- Arithmetic ----

export function monthlyInterestCents(balanceCents, rateScaled) {
  const numerator = BigInt(balanceCents) * BigInt(rateScaled);
  const divisor = BigInt(RATE_SCALE_DIVISOR);
  return Number((2n * numerator + divisor) / (2n * divisor));
}

export function annuityPaymentCents(balanceCents, rateScaled, months) {
  if (months <= 0) return balanceCents;
  if (rateScaled === 0) return Math.ceil(balanceCents / months);
  const i = rateScaled / RATE_SCALE_DIVISOR;
  const a = (balanceCents * i) / (1 - Math.pow(1 + i, -months));
  return Math.floor(a + 0.5);
}

export function principalPlan(balanceCents, months) {
  const base = Math.floor(balanceCents / months);
  const remainder = balanceCents - base * months;
  return Array.from({ length: months }, (_, k) => base + (k < remainder ? 1 : 0));
}

export function graceLimit(termMonths) {
  return Math.min(MAX_GRACE_MONTHS, Math.floor(termMonths / 2));
}

// ---- Schedule engine ----

function validateInput(input) {
  const {
    principalCents, rateScaled, termMonths, graceMonths, method, tranche, prepayments,
  } = input;
  if (!Number.isInteger(principalCents) || principalCents <= 0 || principalCents > MAX_PRINCIPAL_CENTS) {
    fail("PRINCIPAL_OUT_OF_RANGE", { limit: MAX_PRINCIPAL_CENTS, actual: principalCents });
  }
  if (!Number.isInteger(rateScaled) || rateScaled < 0 || rateScaled > MAX_RATE_SCALED) {
    fail("RATE_OUT_OF_RANGE", { limit: MAX_RATE_SCALED, actual: rateScaled });
  }
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > MAX_TERM_MONTHS) {
    fail("TERM_OUT_OF_RANGE", { limit: MAX_TERM_MONTHS, actual: termMonths });
  }
  const gLimit = graceLimit(termMonths);
  if (!Number.isInteger(graceMonths) || graceMonths < 0 || graceMonths > gLimit) {
    fail("GRACE_LIMIT_EXCEEDED", { limit: gLimit, actual: graceMonths });
  }
  if (method !== "annuity" && method !== "principal") {
    fail("METHOD_INVALID", { actual: method });
  }
  if (tranche !== null && tranche !== undefined) {
    if (!Number.isInteger(tranche.rateScaled) || tranche.rateScaled < 0 || tranche.rateScaled > MAX_RATE_SCALED) {
      fail("RATE_OUT_OF_RANGE", { limit: MAX_RATE_SCALED, actual: tranche.rateScaled });
    }
    if (!Number.isInteger(tranche.startMonth) || tranche.startMonth < 2 || tranche.startMonth > termMonths) {
      fail("TRANCHE_MONTH_OUT_OF_RANGE", { limit: termMonths, actual: tranche.startMonth });
    }
  }
  if (!Array.isArray(prepayments) || prepayments.length > MAX_PREPAYMENTS) {
    fail("PREPAYMENT_LIMIT", { limit: MAX_PREPAYMENTS, actual: Array.isArray(prepayments) ? prepayments.length : -1 });
  }
  for (const event of prepayments) {
    if (!Number.isInteger(event.month) || event.month < 1 || event.month > termMonths) {
      fail("PREPAYMENT_MONTH_OUT_OF_RANGE", { limit: termMonths, actual: event.month });
    }
    if (!Number.isInteger(event.amountCents) || event.amountCents <= 0) {
      fail("PREPAYMENT_AMOUNT_INVALID", { actual: event.amountCents });
    }
    if (event.mode !== "reduce-term" && event.mode !== "reduce-payment") {
      fail("PREPAYMENT_MODE_INVALID", { actual: event.mode });
    }
  }
}

function runSchedule(input) {
  const { principalCents, rateScaled, termMonths, graceMonths, method, tranche } = input;
  const prepayments = input.prepayments ?? [];
  const eventsByMonth = new Map();
  for (const event of prepayments) {
    if (!eventsByMonth.has(event.month)) eventsByMonth.set(event.month, []);
    eventsByMonth.get(event.month).push(event);
  }
  const amortStart = graceMonths + 1;
  const rows = [];
  let balance = principalCents;
  let currentRate = rateScaled;
  let annuity = null;
  let plan = null;
  let planIndex = 0;
  let totalPrepaid = 0;
  let ended = false;

  for (let month = 1; month <= termMonths && !ended; month += 1) {
    if (tranche && month === tranche.startMonth) {
      currentRate = tranche.rateScaled;
      if (method === "annuity" && month >= amortStart) {
        annuity = annuityPaymentCents(balance, currentRate, termMonths - month + 1);
      }
    }
    if (month === amortStart) {
      const n = termMonths - graceMonths;
      if (method === "annuity") annuity = annuityPaymentCents(balance, currentRate, n);
      else {
        plan = principalPlan(balance, n);
        planIndex = 0;
      }
    }
    const interest = monthlyInterestCents(balance, currentRate);
    let principalPart;
    let payment;
    if (month <= graceMonths) {
      principalPart = 0;
      payment = interest;
    } else if (method === "annuity") {
      principalPart = annuity - interest;
      if (month === termMonths || principalPart >= balance) principalPart = balance;
      payment = interest + principalPart;
    } else {
      principalPart = plan[planIndex];
      planIndex += 1;
      if (month === termMonths || principalPart >= balance) principalPart = balance;
      payment = interest + principalPart;
    }
    const closing = balance - principalPart;
    rows.push({ month, opening: balance, payment, interest, principal: principalPart, closing });
    balance = closing;

    for (const event of eventsByMonth.get(month) ?? []) {
      if (event.amountCents > balance) {
        fail("PREPAYMENT_EXCEEDS_BALANCE", { month, max: balance, actual: event.amountCents });
      }
      balance -= event.amountCents;
      totalPrepaid += event.amountCents;
      if (balance === 0) {
        ended = true;
        break;
      }
      if (event.mode === "reduce-payment" && month >= amortStart) {
        const remaining = termMonths - month;
        if (method === "annuity") annuity = annuityPaymentCents(balance, currentRate, remaining);
        else {
          plan = principalPlan(balance, remaining);
          planIndex = 0;
        }
      }
    }
    if (balance === 0) ended = true;
  }

  const lastMonth = rows.length === 0 ? 0 : rows[rows.length - 1].month;
  for (const event of prepayments) {
    if (event.month > lastMonth) {
      fail("PREPAYMENT_AFTER_PAYOFF", { month: event.month });
    }
  }

  const yearly = [];
  for (const row of rows) {
    const year = Math.floor((row.month - 1) / 12) + 1;
    let bucket = yearly[yearly.length - 1];
    if (!bucket || bucket.year !== year) {
      bucket = { year, months: 0, payment: 0, interest: 0, principal: 0, closing: 0 };
      yearly.push(bucket);
    }
    bucket.months += 1;
    bucket.payment += row.payment;
    bucket.interest += row.interest;
    bucket.principal += row.principal;
    bucket.closing = row.closing;
  }
  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0);
  const totalScheduled = rows.reduce((sum, row) => sum + row.payment, 0);
  return {
    rows,
    yearly,
    totalInterest,
    totalScheduled,
    totalPrepaid,
    totalPaid: totalScheduled + totalPrepaid,
  };
}

// Builds the scenario schedule; when prepayments exist, also builds the
// untouched baseline (same inputs, empty event list) for comparison.
export function buildSchedule(input) {
  validateInput(input);
  const scenario = runSchedule(input);
  const prepayments = input.prepayments ?? [];
  let baseline = null;
  let interestSaved = null;
  if (prepayments.length > 0) {
    baseline = runSchedule({ ...input, prepayments: [] });
    interestSaved = baseline.totalInterest - scenario.totalInterest;
  }
  return { ...scenario, hadPrepayments: prepayments.length > 0, baseline, interestSaved };
}

// ---- Formatting and CSV ----

export function formatCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}.${String(remainder).padStart(2, "0")}`;
}

// Formats a scaled rate (percent * 10^4) back to a plain percent string,
// trimming trailing fraction zeros: 120000 -> "12", 20950 -> "2.095".
export function formatRate(rateScaled) {
  const sign = rateScaled < 0 ? "-" : "";
  const abs = Math.abs(rateScaled);
  const whole = Math.floor(abs / 10_000);
  const frac = String(abs % 10_000).padStart(4, "0").replace(/0+$/, "");
  return frac === "" ? `${sign}${whole}` : `${sign}${whole}.${frac}`;
}

export function formatRawCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function buildCsv(schedule) {
  const lines = [];
  if (schedule.hadPrepayments && schedule.baseline) {
    lines.push(`# baseline_total_paid: ${formatRawCents(schedule.baseline.totalPaid)}`);
    lines.push(`# baseline_total_interest: ${formatRawCents(schedule.baseline.totalInterest)}`);
    lines.push(`# interest_saved: ${formatRawCents(schedule.interestSaved)}`);
  }
  lines.push("month,opening,payment,interest,principal,closing");
  for (const row of schedule.rows) {
    lines.push([
      row.month,
      formatRawCents(row.opening),
      formatRawCents(row.payment),
      formatRawCents(row.interest),
      formatRawCents(row.principal),
      formatRawCents(row.closing),
    ].join(","));
  }
  return lines.join("\n") + "\n";
}

export function makeCsvFilename(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "amortization.csv";
  const pad = (n) => String(n).padStart(2, "0");
  return `amortization-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.csv`;
}
