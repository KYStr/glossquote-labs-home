// Pure core for the Debt Payoff Planner
// (spec-debt-payoff-planner-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. Money is
// integer cents throughout; APRs are integer hundredths of a percent
// (19.99% -> 1999). Monthly interest is the SPEC's pinned exact
// formula, computed with BigInt so no binary float ever decides a
// cent: interest = floor((2 * balance * aprHundredths + 120000) /
// 240000). The strategy order is fixed once at plan start (with the
// SPEC's tie-breaks) and never re-sorted. A paid-off debt's minimum
// joins the extra pool from the next month; a minimum that exceeds
// the balance rolls its unused part into the same month's extra pool.
// The 600-month cap is honest: a plan that is not debt-free by then
// reports status "not-debt-free" with the remaining balance, never a
// fabricated payoff date.

export const DEBT_FIELDS = ["name", "balance", "apr", "minimum"];

export const MAX_DEBTS = 12;
export const MAX_NAME_UNITS = 40;
export const MAX_RAW_UNITS = 15;
export const BALANCE_MAX_CENTS = 1000000000;
export const PAYMENT_MAX_CENTS = 100000000;
export const APR_MAX_HUNDREDTHS = 9999;
export const MAX_MONTHS = 600;

// The SPEC's pinned defaults (userFlow): three debts and an extra
// monthly payment of 200.00.
export const DEFAULTS = {
  debts: [
    { name: "Credit Card", balance: "5000.00", apr: "19.99", minimum: "150.00" },
    { name: "Personal Loan", balance: "8000.00", apr: "9.50", minimum: "200.00" },
    { name: "Store Card", balance: "1200.00", apr: "24.99", minimum: "50.00" },
  ],
  extraMonthly: "200.00",
};

// The worked example is fixtures.json case 1
// (snowball-vs-avalanche) input, vendored verbatim in
// test/fixtures.json.
export const EXAMPLE = {
  debts: [
    { name: "Store Card", balance: "600.00", apr: "24.00", minimum: "50.00" },
    { name: "Personal Loan", balance: "1200.00", apr: "6.00", minimum: "100.00" },
    { name: "Credit Card", balance: "300.00", apr: "18.00", minimum: "25.00" },
  ],
  extraMonthly: "100.00",
};

// Pinned disclaimer (verbatim, both languages). Shown in the results
// area of both pages.
export const DISCLAIMER_ZH =
  "本工具以你輸入的固定年利率與固定月還款做推算，實際利率、最低還款與費用會隨銀行規定改變，結果僅供規劃參考，不是理財建議。";
export const DISCLAIMER_EN =
  "This tool projects from the fixed APRs and fixed monthly payments you enter. Real rates, minimum payments and fees change with each lender; results are for planning only, not financial advice.";

const MONEY_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads one own data property as a string. Accessors are never
// invoked; a missing, accessor, or non-string property reads as null.
function readOwnString(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined || !("value" in descriptor)) return null;
  if (typeof descriptor.value !== "string") return null;
  return descriptor.value;
}

function readOwnValue(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined || !("value" in descriptor)) return null;
  return descriptor.value;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function hasControlCharacter(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if ((unit >= 0x0000 && unit <= 0x001f) || unit === 0x007f) return true;
  }
  return false;
}

// Exact decimal-string to integer-cents conversion. The caller has
// already matched MONEY_PATTERN, so the split is exact and no float
// is involved.
function moneyToCents(value) {
  const dot = value.indexOf(".");
  const whole = dot === -1 ? value : value.slice(0, dot);
  const fraction = dot === -1 ? "" : value.slice(dot + 1);
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function aprToHundredths(value) {
  const dot = value.indexOf(".");
  const whole = dot === -1 ? value : value.slice(0, dot);
  const fraction = dot === -1 ? "" : value.slice(dot + 1);
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range. Returns the parsed value or an
// { error } outcome. `kind` is "name", "money", or "apr".
function validateField(kind, field, value, row) {
  const limit = kind === "name" ? MAX_NAME_UNITS : MAX_RAW_UNITS;
  if (value.length > limit) return { error: failure("INPUT_LIMIT", field, row) };
  if (kind === "name" && hasControlCharacter(value)) {
    return { error: failure("UNICODE", field, row) };
  }
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field, row) };
  if (kind === "name") {
    if (value.length === 0 || value.trim().length === 0) {
      return { error: failure("EMPTY", field, row) };
    }
    return { value };
  }
  if (value.length === 0) return { error: failure("EMPTY", field, row) };
  if (!MONEY_PATTERN.test(value)) {
    return { error: failure(kind === "apr" ? "APR_FORMAT" : "MONEY_FORMAT", field, row) };
  }
  if (kind === "apr") {
    const parsed = aprToHundredths(value);
    if (parsed < 0 || parsed > APR_MAX_HUNDREDTHS) {
      return { error: failure("RANGE", field, row) };
    }
    return { value: parsed };
  }
  const parsed = moneyToCents(value);
  if (field === "balance") {
    if (parsed <= 0 || parsed > BALANCE_MAX_CENTS) {
      return { error: failure("RANGE", field, row) };
    }
  } else if (parsed < 0 || parsed > PAYMENT_MAX_CENTS) {
    return { error: failure("RANGE", field, row) };
  }
  return { value: parsed };
}

// Monthly interest in cents, exact: floor((2 * balance *
// aprHundredths + 120000) / 240000). BigInt throughout; the product
// is about 1e13 at the legal maximums, so no float is ever trusted
// with the rounding decision.
export function monthlyInterestCents(balanceCents, aprHundredths) {
  const numerator =
    2n * BigInt(balanceCents) * BigInt(aprHundredths) + 120000n;
  return Number(numerator / 240000n);
}

// Strategy orders, fixed once at plan start from the initial
// balances/APRs. Comparisons of names use the default string order,
// which compares UTF-16 code units, as the SPEC pins.
function snowballOrder(debts) {
  return debts
    .map((debt, index) => index)
    .sort((a, b) => {
      if (debts[a].balanceCents !== debts[b].balanceCents) {
        return debts[a].balanceCents - debts[b].balanceCents;
      }
      if (debts[a].aprHundredths !== debts[b].aprHundredths) {
        return debts[b].aprHundredths - debts[a].aprHundredths;
      }
      if (debts[a].name !== debts[b].name) {
        return debts[a].name < debts[b].name ? -1 : 1;
      }
      return a - b;
    });
}

function avalancheOrder(debts) {
  return debts
    .map((debt, index) => index)
    .sort((a, b) => {
      if (debts[a].aprHundredths !== debts[b].aprHundredths) {
        return debts[b].aprHundredths - debts[a].aprHundredths;
      }
      if (debts[a].balanceCents !== debts[b].balanceCents) {
        return debts[a].balanceCents - debts[b].balanceCents;
      }
      if (debts[a].name !== debts[b].name) {
        return debts[a].name < debts[b].name ? -1 : 1;
      }
      return a - b;
    });
}

function simulate(debts, extraMonthlyCents, orderIndices) {
  const balances = debts.map((debt) => debt.balanceCents);
  const payoffMonth = {};
  const payoffOrder = [];
  const monthly = [];
  let totalInterestCents = 0;
  let totalPaidCents = 0;

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    // (a) Interest on the opening balance of every unpaid debt.
    let interestCents = 0;
    for (let index = 0; index < debts.length; index += 1) {
      if (balances[index] <= 0) continue;
      const interest = monthlyInterestCents(balances[index], debts[index].aprHundredths);
      balances[index] += interest;
      interestCents += interest;
    }

    // (b) Minimum payments in input order. Any unused part of a
    // minimum (balance smaller than the minimum) rolls into this
    // month's extra pool.
    let paidCents = 0;
    let pool = 0;
    for (let index = 0; index < debts.length; index += 1) {
      if (balances[index] <= 0) continue;
      const paid = Math.min(debts[index].minimumCents, balances[index]);
      balances[index] -= paid;
      paidCents += paid;
      pool += debts[index].minimumCents - paid;
      if (balances[index] === 0) {
        payoffMonth[debts[index].name] = month;
        payoffOrder.push(debts[index].name);
      }
    }

    // Released minimums: debts paid off in an earlier month
    // contribute their minimum from the next month on.
    for (let index = 0; index < debts.length; index += 1) {
      const paidOff = payoffMonth[debts[index].name];
      if (paidOff !== undefined && paidOff < month) {
        pool += debts[index].minimumCents;
      }
    }
    pool += extraMonthlyCents;

    // (c) The extra pool, in strategy order, rolling on to the next
    // debt when one is cleared.
    for (const index of orderIndices) {
      if (pool <= 0) break;
      if (balances[index] <= 0) continue;
      const paid = Math.min(pool, balances[index]);
      balances[index] -= paid;
      paidCents += paid;
      pool -= paid;
      if (balances[index] === 0) {
        payoffMonth[debts[index].name] = month;
        payoffOrder.push(debts[index].name);
      }
    }

    totalInterestCents += interestCents;
    totalPaidCents += paidCents;
    const remainingCents = balances.reduce((sum, balance) => sum + balance, 0);
    monthly.push({ month, paidCents, interestCents, remainingCents });
    if (remainingCents === 0) {
      return {
        status: "debt-free",
        monthsToDebtFree: month,
        monthsSimulated: month,
        totalInterestCents,
        totalPaidCents,
        payoffMonth,
        payoffOrder,
        monthly,
      };
    }
  }

  return {
    status: "not-debt-free",
    monthsToDebtFree: null,
    monthsSimulated: MAX_MONTHS,
    totalInterestCents,
    totalPaidCents,
    payoffMonth,
    payoffOrder,
    monthly,
  };
}

export function run(input) {
  // Top-level shape: exactly {debts, extraMonthly}, own data only.
  if (!isPlainObject(input)) return failure("SCHEMA", null, null);
  const keys = Object.keys(input);
  if (keys.length !== 2 || !keys.includes("debts") || !keys.includes("extraMonthly")) {
    return failure("SCHEMA", null, null);
  }
  const debtsRaw = readOwnValue(input, "debts");
  if (!Array.isArray(debtsRaw)) return failure("SCHEMA", null, null);
  const extraRaw = readOwnString(input, "extraMonthly");
  if (extraRaw === null) return failure("SCHEMA", null, null);

  if (debtsRaw.length === 0) return failure("EMPTY", "debts", null);
  if (debtsRaw.length > MAX_DEBTS) return failure("ROW_LIMIT", "debts", null);

  const debts = [];
  for (let index = 0; index < debtsRaw.length; index += 1) {
    const rowNumber = index + 1;
    const row = debtsRaw[index];
    if (!isPlainObject(row)) return failure("SCHEMA", null, null);
    const rowKeys = Object.keys(row);
    if (
      rowKeys.length !== DEBT_FIELDS.length ||
      !DEBT_FIELDS.every((field) => rowKeys.includes(field))
    ) {
      return failure("SCHEMA", null, null);
    }
    const parsed = {};
    for (const field of DEBT_FIELDS) {
      const raw = readOwnString(row, field);
      if (raw === null) return failure("SCHEMA", null, null);
      const kind = field === "name" ? "name" : field === "apr" ? "apr" : "money";
      const outcome = validateField(kind, field, raw, rowNumber);
      if (outcome.error) return outcome.error;
      parsed[field] = outcome.value;
    }
    debts.push({
      name: parsed.name,
      balanceCents: parsed.balance,
      aprHundredths: parsed.apr,
      minimumCents: parsed.minimum,
    });
  }

  // Duplicate names, compared exactly as entered (case-sensitive,
  // untrimmed); the later row is the offender.
  for (let index = 0; index < debts.length; index += 1) {
    for (let earlier = 0; earlier < index; earlier += 1) {
      if (debts[earlier].name === debts[index].name) {
        return failure("DUPLICATE_NAME", "name", index + 1);
      }
    }
  }

  const extraOutcome = validateField("money", "extraMonthly", extraRaw, null);
  if (extraOutcome.error) return extraOutcome.error;
  const extraMonthlyCents = extraOutcome.value;

  const totalMinimumCents = debts.reduce((sum, debt) => sum + debt.minimumCents, 0);
  if (totalMinimumCents + extraMonthlyCents === 0) {
    return failure("INSUFFICIENT_PAYMENT", null, null);
  }

  const totalInitialCents = debts.reduce((sum, debt) => sum + debt.balanceCents, 0);
  const snowballIndices = snowballOrder(debts);
  const avalancheIndices = avalancheOrder(debts);
  const snowball = simulate(debts, extraMonthlyCents, snowballIndices);
  const avalanche = simulate(debts, extraMonthlyCents, avalancheIndices);

  const bothFree = snowball.status === "debt-free" && avalanche.status === "debt-free";
  const comparison = bothFree
    ? {
        lowerInterestStrategy:
          snowball.totalInterestCents === avalanche.totalInterestCents
            ? "tie"
            : snowball.totalInterestCents < avalanche.totalInterestCents
              ? "snowball"
              : "avalanche",
        interestDifferenceCents: Math.abs(
          snowball.totalInterestCents - avalanche.totalInterestCents,
        ),
        fewerMonthsStrategy:
          snowball.monthsToDebtFree === avalanche.monthsToDebtFree
            ? "tie"
            : snowball.monthsToDebtFree < avalanche.monthsToDebtFree
              ? "snowball"
              : "avalanche",
        monthsDifference: Math.abs(snowball.monthsToDebtFree - avalanche.monthsToDebtFree),
      }
    : {
        lowerInterestStrategy: null,
        interestDifferenceCents: null,
        fewerMonthsStrategy: null,
        monthsDifference: null,
      };

  return {
    ok: true,
    result: {
      totalInitialCents,
      extraMonthlyCents,
      strategies: {
        snowball: {
          status: snowball.status,
          order: snowballIndices.map((index) => debts[index].name),
          payoffOrder: snowball.payoffOrder,
          monthsToDebtFree: snowball.monthsToDebtFree,
          monthsSimulated: snowball.monthsSimulated,
          totalInterestCents: snowball.totalInterestCents,
          totalPaidCents: snowball.totalPaidCents,
          payoffMonth: snowball.payoffMonth,
          monthly: snowball.monthly,
        },
        avalanche: {
          status: avalanche.status,
          order: avalancheIndices.map((index) => debts[index].name),
          payoffOrder: avalanche.payoffOrder,
          monthsToDebtFree: avalanche.monthsToDebtFree,
          monthsSimulated: avalanche.monthsSimulated,
          totalInterestCents: avalanche.totalInterestCents,
          totalPaidCents: avalanche.totalPaidCents,
          payoffMonth: avalanche.payoffMonth,
          monthly: avalanche.monthly,
        },
      },
      comparison,
    },
  };
}

// Display formatting (machine values never depend on locale): money
// as thousands-grouped with exactly two decimals, APR with exactly
// two decimals. Both are pure string operations over the integer
// values, never floating point.
export function formatMoneyCents(cents) {
  const whole = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction}`;
}

export function formatAprHundredths(hundredths) {
  const whole = Math.trunc(hundredths / 100);
  const fraction = String(hundredths % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

// Fixed report download: debt-payoff-plan.json. The content is the
// result's compact JSON with object keys sorted recursively by UTF-16
// code units, array order unchanged, exactly one trailing LF, UTF-8
// without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "debt-payoff-plan.json";
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
