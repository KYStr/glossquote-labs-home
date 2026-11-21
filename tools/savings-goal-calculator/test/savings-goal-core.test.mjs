// Core tests: all 18 literal core fixtures from fixtures.json, plus
// boundary cases whose expected values were independently recomputed
// with Python's Fraction type (see VERIFICATION.md), validation
// cases, and property checks (ceiling minimality, first crossing,
// the display identity, zero-rate integer cross-checks). Expected
// values are never taken from the implementation's own output.

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  formatCents,
  formatMoneyDisplay,
  run,
  validateInput,
} from "../public/js/core/savings-goal.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

// Boundary cases, expected values recomputed independently with
// Python Fraction (exact rational arithmetic, separate code path).
const BOUNDARY = [
  {
    input: {
      mode: "payment",
      targetAmount: "1000000",
      initialAmount: "0",
      annualRate: "100",
      months: "600",
      monthlyPayment: "3000",
    },
    expected: {
      ok: true,
      result: {
        finalBalance: "86386325536353520503.21",
        mode: "payment",
        monthlyPayment: "0.01",
        months: 600,
        status: "ok",
        totalDeposits: "6.00",
        totalInterest: "86386325536353520497.21",
      },
    },
  },
  {
    input: {
      mode: "payment",
      targetAmount: "5000",
      initialAmount: "100",
      annualRate: "100",
      months: "1",
      monthlyPayment: "3000",
    },
    expected: {
      ok: true,
      result: {
        finalBalance: "5000.00",
        mode: "payment",
        monthlyPayment: "4891.67",
        months: 1,
        status: "ok",
        totalDeposits: "4891.67",
        totalInterest: "8.33",
      },
    },
  },
  {
    input: {
      mode: "payment",
      targetAmount: "999999999.99",
      initialAmount: "999999999.98",
      annualRate: "0",
      months: "600",
      monthlyPayment: "3000",
    },
    expected: {
      ok: true,
      result: {
        finalBalance: "1000000005.98",
        mode: "payment",
        monthlyPayment: "0.01",
        months: 600,
        status: "ok",
        totalDeposits: "6.00",
        totalInterest: "0.00",
      },
    },
  },
  {
    input: {
      mode: "months",
      targetAmount: "100000",
      initialAmount: "1000",
      annualRate: "100",
      months: "60",
      monthlyPayment: "100",
    },
    expected: {
      ok: true,
      result: {
        balanceIfFullPayment: "101366.09",
        finalBalance: "100000.00",
        finalMonthPayment: "0.00",
        mode: "months",
        monthsRequired: 48,
        reason: null,
        status: "ok",
        totalDeposits: "4700.00",
        totalInterest: "94300.00",
      },
    },
  },
  {
    input: {
      mode: "months",
      targetAmount: "12000",
      initialAmount: "0",
      annualRate: "0",
      months: "60",
      monthlyPayment: "10",
    },
    expected: {
      ok: true,
      result: {
        balanceIfFullPayment: "12000.00",
        finalBalance: "12000.00",
        finalMonthPayment: "10.00",
        mode: "months",
        monthsRequired: 1200,
        reason: null,
        status: "ok",
        totalDeposits: "12000.00",
        totalInterest: "0.00",
      },
    },
  },
  {
    input: {
      mode: "months",
      targetAmount: "12010",
      initialAmount: "0",
      annualRate: "0",
      months: "60",
      monthlyPayment: "10",
    },
    expected: {
      ok: true,
      result: {
        balanceIfFullPayment: null,
        finalBalance: null,
        finalMonthPayment: null,
        mode: "months",
        monthsRequired: null,
        reason: "beyond-horizon",
        status: "unreachable",
        totalDeposits: null,
        totalInterest: null,
      },
    },
  },
  {
    input: {
      mode: "months",
      targetAmount: "10100",
      initialAmount: "10000",
      annualRate: "12",
      months: "60",
      monthlyPayment: "0",
    },
    expected: {
      ok: true,
      result: {
        balanceIfFullPayment: "10100.00",
        finalBalance: "10100.00",
        finalMonthPayment: "0.00",
        mode: "months",
        monthsRequired: 1,
        reason: null,
        status: "ok",
        totalDeposits: "0.00",
        totalInterest: "100.00",
      },
    },
  },
  {
    input: {
      mode: "payment",
      targetAmount: "50000",
      initialAmount: "5000",
      annualRate: "3.5",
      months: "60",
      monthlyPayment: "3000",
    },
    expected: {
      ok: true,
      result: {
        finalBalance: "50000.31",
        mode: "payment",
        monthlyPayment: "672.80",
        months: 60,
        status: "ok",
        totalDeposits: "40368.00",
        totalInterest: "4632.31",
      },
    },
  },
  {
    input: {
      mode: "payment",
      targetAmount: "10000",
      initialAmount: "10000",
      annualRate: "0",
      months: "12",
      monthlyPayment: "3000",
    },
    expected: {
      ok: true,
      result: {
        finalBalance: "10000.00",
        mode: "payment",
        monthlyPayment: "0.00",
        months: 12,
        status: "already-funded",
        totalDeposits: "0.00",
        totalInterest: "0.00",
      },
    },
  },
  {
    input: {
      mode: "months",
      targetAmount: "9999.99",
      initialAmount: "10000",
      annualRate: "5",
      months: "60",
      monthlyPayment: "1",
    },
    expected: {
      ok: true,
      result: {
        balanceIfFullPayment: "10000.00",
        finalBalance: "10000.00",
        finalMonthPayment: "0.00",
        mode: "months",
        monthsRequired: 0,
        reason: null,
        status: "already-funded",
        totalDeposits: "0.00",
        totalInterest: "0.00",
      },
    },
  },
];

for (const { input, expected } of BOUNDARY) {
  test(`boundary ${input.mode} ${input.targetAmount} @ ${input.annualRate}%`, () => {
    assert.deepEqual(run(input), expected);
  });
}

test("defaults and example are the pinned drafts", () => {
  assert.deepEqual(DEFAULTS, {
    mode: "payment",
    targetAmount: "100000",
    initialAmount: "10000",
    annualRate: "3",
    months: "60",
    monthlyPayment: "3000",
  });
  assert.deepEqual(EXAMPLE, {
    annualRate: "0",
    initialAmount: "10000",
    mode: "payment",
    monthlyPayment: "3000",
    months: "12",
    targetAmount: "100000",
  });
});

// --- Validation ---

function expectError(input, code, field) {
  const outcome = run(input);
  assert.equal(outcome.ok, false);
  assert.deepEqual(outcome.error, { code, field, row: null });
}

const BASE = { ...DEFAULTS };

test("schema: non-object, array, missing, extra, non-string, accessor, symbol", () => {
  assert.deepEqual(run(null), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run([]), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run("x"), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  const missing = { ...BASE };
  delete missing.months;
  assert.deepEqual(run(missing), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run({ ...BASE, extra: "1" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run({ ...BASE, months: 60 }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  const accessor = { ...BASE };
  Object.defineProperty(accessor, "months", {
    enumerable: true,
    get: () => "60",
  });
  assert.deepEqual(run(accessor), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  const symbolled = { ...BASE, [Symbol("s")]: "1" };
  assert.deepEqual(run(symbolled), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("capacity: raw length over the limit is INPUT_LIMIT", () => {
  expectError({ ...BASE, targetAmount: "12345678901234567" }, "INPUT_LIMIT", "targetAmount");
  expectError({ ...BASE, annualRate: "123456789" }, "INPUT_LIMIT", "annualRate");
  expectError({ ...BASE, mode: "paymentpaymentpaym" }, "INPUT_LIMIT", "mode");
});

test("unicode: an unpaired surrogate is UNICODE", () => {
  expectError({ ...BASE, targetAmount: "100\ud800" }, "UNICODE", "targetAmount");
  expectError({ ...BASE, annualRate: "\udc00" }, "UNICODE", "annualRate");
});

test("empty: blank fields are EMPTY", () => {
  expectError({ ...BASE, mode: "" }, "EMPTY", "mode");
  expectError({ ...BASE, targetAmount: "" }, "EMPTY", "targetAmount");
  expectError({ ...BASE, initialAmount: "" }, "EMPTY", "initialAmount");
  expectError({ ...BASE, annualRate: "" }, "EMPTY", "annualRate");
  expectError({ ...BASE, months: "" }, "EMPTY", "months");
  expectError(
    { ...BASE, mode: "months", monthlyPayment: "" },
    "EMPTY",
    "monthlyPayment",
  );
});

test("grammar: money, rate and integer formats", () => {
  expectError({ ...BASE, targetAmount: "100,000" }, "DECIMAL_FORMAT", "targetAmount");
  expectError({ ...BASE, targetAmount: "100.005" }, "DECIMAL_FORMAT", "targetAmount");
  expectError({ ...BASE, targetAmount: "-5" }, "DECIMAL_FORMAT", "targetAmount");
  expectError({ ...BASE, targetAmount: "1e3" }, "DECIMAL_FORMAT", "targetAmount");
  expectError({ ...BASE, targetAmount: " 100" }, "DECIMAL_FORMAT", "targetAmount");
  expectError({ ...BASE, annualRate: "3.005" }, "DECIMAL_FORMAT", "annualRate");
  expectError({ ...BASE, months: "12.5" }, "INTEGER_FORMAT", "months");
  expectError({ ...BASE, months: "1e2" }, "INTEGER_FORMAT", "months");
  expectError({ ...BASE, mode: "weekly" }, "ENUM", "mode");
});

test("range: endpoints are accepted, one step past is RANGE", () => {
  expectError({ ...BASE, months: "0" }, "RANGE", "months");
  expectError({ ...BASE, months: "601" }, "RANGE", "months");
  assert.equal(run({ ...BASE, months: "1" }).ok, true);
  assert.equal(run({ ...BASE, months: "600" }).ok, true);
  expectError({ ...BASE, annualRate: "100.01" }, "RANGE", "annualRate");
  assert.equal(run({ ...BASE, annualRate: "100" }).ok, true);
  assert.equal(run({ ...BASE, annualRate: "0" }).ok, true);
  expectError({ ...BASE, targetAmount: "0" }, "RANGE", "targetAmount");
  expectError({ ...BASE, targetAmount: "1000000000" }, "RANGE", "targetAmount");
  assert.equal(run({ ...BASE, targetAmount: "999999999.99" }).ok, true);
  expectError({ ...BASE, initialAmount: "1000000000" }, "RANGE", "initialAmount");
  expectError(
    { ...BASE, mode: "months", monthlyPayment: "1000000000" },
    "RANGE",
    "monthlyPayment",
  );
  // Leading zeros are allowed by the grammar.
  assert.equal(run({ ...BASE, targetAmount: "007.50" }).ok, true);
});

test("inactive fields: only the capacity check applies, content ignored", () => {
  // months mode: months content is ignored entirely.
  assert.equal(
    run({ ...BASE, mode: "months", months: "garbage!" }).ok,
    true,
  );
  expectError(
    { ...BASE, mode: "months", months: "123456789" },
    "INPUT_LIMIT",
    "months",
  );
  // payment mode: monthlyPayment content is ignored entirely.
  assert.equal(
    run({ ...BASE, mode: "payment", monthlyPayment: "notmoney" }).ok,
    true,
  );
  expectError(
    { ...BASE, mode: "payment", monthlyPayment: "12345678901234567" },
    "INPUT_LIMIT",
    "monthlyPayment",
  );
});

test("validation order: the first field error wins", () => {
  expectError(
    { ...BASE, targetAmount: "x", months: "0" },
    "DECIMAL_FORMAT",
    "targetAmount",
  );
  expectError({ ...BASE, mode: "weekly", targetAmount: "x" }, "ENUM", "mode");
  expectError(
    { ...BASE, annualRate: "100.01", months: "0" },
    "RANGE",
    "annualRate",
  );
});

test("validateInput parses to exact integers", () => {
  const outcome = validateInput({
    mode: "payment",
    targetAmount: "007.50",
    initialAmount: "0",
    annualRate: "3.5",
    months: "60",
    monthlyPayment: "3000",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.values.targetCents, 750n);
  assert.equal(outcome.values.rateBp, 350n);
  assert.equal(outcome.values.months, 60);
});

// --- Independent property checks ---
//
// balance() below recomputes B(k) by the month-by-month recurrence
// B <- B * q + PMT with exact rational steps — a different code path
// from the core's closed form — so these checks are independent of
// the implementation under test.

function rat(n, d) {
  return { n, d };
}
function ratMul(a, b) {
  return rat(a.n * b.n, a.d * b.d);
}
function ratAdd(a, b) {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d);
}
function ratCmp(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left < right ? -1 : left > right ? 1 : 0;
}
function parseCents(text) {
  const [whole, fraction = "00"] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function parseBp(text) {
  const [whole, fraction = "00"] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function balance(bp, pvCents, pmtCents, k) {
  if (bp === 0n) return rat(pvCents + pmtCents * BigInt(k), 1n);
  const q = rat(120000n + bp, 120000n);
  let current = rat(pvCents, 1n);
  for (let j = 0; j < k; j += 1) {
    current = ratAdd(ratMul(current, q), rat(pmtCents, 1n));
  }
  return current;
}

const SUCCESS_INPUTS = [
  ...coreCases.filter((c) => c.expected.ok).map((c) => c.input),
  ...BOUNDARY.filter((c) => c.expected.ok).map((c) => c.input),
  // Fixed sweep: varied rates, terms and deposits.
  { mode: "payment", targetAmount: "250000", initialAmount: "30000", annualRate: "2.25", months: "48", monthlyPayment: "3000" },
  { mode: "payment", targetAmount: "80000", initialAmount: "0", annualRate: "7.75", months: "120", monthlyPayment: "3000" },
  { mode: "payment", targetAmount: "123456.78", initialAmount: "1234.56", annualRate: "4.4", months: "37", monthlyPayment: "3000" },
  { mode: "months", targetAmount: "80000", initialAmount: "5000", annualRate: "4", months: "60", monthlyPayment: "1500" },
  { mode: "months", targetAmount: "500000", initialAmount: "100000", annualRate: "8.5", months: "60", monthlyPayment: "2500" },
  { mode: "months", targetAmount: "30000", initialAmount: "29999.99", annualRate: "0.5", months: "60", monthlyPayment: "0.01" },
  { mode: "months", targetAmount: "99999", initialAmount: "1", annualRate: "0.01", months: "60", monthlyPayment: "999" },
];

test("property: every success result satisfies the display identity and non-negative interest", () => {
  for (const input of SUCCESS_INPUTS) {
    const outcome = run(input);
    assert.equal(outcome.ok, true, JSON.stringify(input));
    const result = outcome.result;
    if (result.status === "unreachable") continue;
    const pv = parseCents(input.initialAmount);
    const fb = parseCents(result.finalBalance);
    const td = parseCents(result.totalDeposits);
    const ti = parseCents(result.totalInterest);
    assert.equal(fb, pv + td + ti, `identity for ${JSON.stringify(input)}`);
    assert.ok(ti >= 0n, `interest non-negative for ${JSON.stringify(input)}`);
    assert.ok(fb >= 0n);
  }
});

test("property: mode A displayed payment is the ceiling-minimal one", () => {
  for (const input of SUCCESS_INPUTS) {
    if (input.mode !== "payment") continue;
    const outcome = run(input);
    const result = outcome.result;
    if (result.status !== "ok") continue;
    const fv = parseCents(input.targetAmount);
    const pv = parseCents(input.initialAmount);
    const bp = parseBp(input.annualRate);
    const pmt = parseCents(result.monthlyPayment);
    const n = result.months;
    assert.ok(
      ratCmp(balance(bp, pv, pmt, n), rat(fv, 1n)) >= 0,
      `B(n) >= FV for ${JSON.stringify(input)}`,
    );
    assert.ok(
      ratCmp(balance(bp, pv, pmt - 1n, n), rat(fv, 1n)) < 0,
      `B(n) with one cent less < FV for ${JSON.stringify(input)}`,
    );
  }
});

test("property: mode B month count is the first crossing month", () => {
  for (const input of SUCCESS_INPUTS) {
    if (input.mode !== "months") continue;
    const outcome = run(input);
    const result = outcome.result;
    if (result.status !== "ok") continue;
    const fv = parseCents(input.targetAmount);
    const pv = parseCents(input.initialAmount);
    const bp = parseBp(input.annualRate);
    const pmt = parseCents(input.monthlyPayment);
    const k = result.monthsRequired;
    assert.ok(k >= 1);
    assert.ok(
      ratCmp(balance(bp, pv, pmt, k), rat(fv, 1n)) >= 0,
      `B(k) >= FV for ${JSON.stringify(input)}`,
    );
    assert.ok(
      ratCmp(balance(bp, pv, pmt, k - 1), rat(fv, 1n)) < 0,
      `B(k-1) < FV for ${JSON.stringify(input)}`,
    );
    // The displayed final-month deposit is the ceiling of the exact
    // tail (or zero when growth alone crosses during the last month).
    const before = balance(bp, pv, pmt, k - 1);
    const grown =
      bp === 0n ? before : ratMul(before, rat(120000n + bp, 120000n));
    const tailFrac = rat(fv * grown.d - grown.n, grown.d);
    const fmp = parseCents(result.finalMonthPayment);
    if (ratCmp(tailFrac, rat(0n, 1n)) <= 0) {
      assert.equal(fmp, 0n, `growth-only crossing for ${JSON.stringify(input)}`);
    } else {
      // ceil(tail) == fmp: fmp - 1 < tail <= fmp (in cents).
      assert.ok(
        ratCmp(tailFrac, rat(fmp, 1n)) <= 0 &&
          ratCmp(tailFrac, rat(fmp - 1n, 1n)) > 0,
        `final-month payment is the ceiling for ${JSON.stringify(input)}`,
      );
    }
  }
});

test("property: zero-rate cases match plain integer arithmetic", () => {
  for (const input of SUCCESS_INPUTS) {
    if (input.annualRate !== "0") continue;
    const outcome = run(input);
    const result = outcome.result;
    if (result.status === "unreachable") continue;
    const fv = parseCents(input.targetAmount);
    const pv = parseCents(input.initialAmount);
    if (input.mode === "payment" && result.status === "ok") {
      const n = BigInt(result.months);
      const pmt = (fv - pv + n - 1n) / n;
      assert.equal(parseCents(result.monthlyPayment), pmt);
      assert.equal(parseCents(result.finalBalance), pv + pmt * n);
    }
    if (input.mode === "months" && result.status === "ok") {
      const pmt = parseCents(input.monthlyPayment);
      const k = BigInt(result.monthsRequired);
      assert.equal(k, (fv - pv + pmt - 1n) / pmt);
    }
  }
});

test("formatCents and formatMoneyDisplay", () => {
  assert.equal(formatCents(0n), "0.00");
  assert.equal(formatCents(5n), "0.05");
  assert.equal(formatCents(724598n), "7245.98");
  assert.equal(formatMoneyDisplay("7245.98"), "7,245.98");
  assert.equal(formatMoneyDisplay("100000.00"), "100,000.00");
  assert.equal(formatMoneyDisplay("0.01"), "0.01");
});
