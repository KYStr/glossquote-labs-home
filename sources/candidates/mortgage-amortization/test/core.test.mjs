import assert from "node:assert/strict";
import test from "node:test";

import {
  MortgageError,
  annuityPaymentCents,
  buildCsv,
  buildSchedule,
  formatCents,
  formatRate,
  formatRawCents,
  graceLimit,
  makeCsvFilename,
  monthlyInterestCents,
  parseMoneyCents,
  parseRateScaled,
  principalPlan,
} from "../public/js/core/mortgage.mjs";

const loan = (overrides = {}) => ({
  principalCents: 12_000_000,
  rateScaled: 120_000, // 12%
  termMonths: 3,
  graceMonths: 0,
  method: "annuity",
  tranche: null,
  prepayments: [],
  ...overrides,
});

// NOTE on the SPEC section 4 worked fixture: the printed payment
// (40,803.45) and total interest (2,407.94) do not match the SPEC's own
// annuity formula — exact rational evaluation gives A = 40,802.65 and
// total interest 2,407.96 (the printed month interests 1,200.00 and
// 803.97 do match the formula; the printed A appears to be a
// hand-derivation slip, off by 80 cents). The formula is the contract
// (SPEC section 1: the ledger must be re-derivable from the formulas),
// so these tests assert the formula-exact values; the discrepancy is
// documented in VERIFICATION.md for the spec's bulk review.
test("worked example inputs reproduce the formula-exact schedule, cent for cent", () => {
  const s = buildSchedule(loan());
  assert.deepEqual(s.rows, [
    { month: 1, opening: 12000000, payment: 4080265, interest: 120000, principal: 3960265, closing: 8039735 },
    { month: 2, opening: 8039735, payment: 4080265, interest: 80397, principal: 3999868, closing: 4039867 },
    { month: 3, opening: 4039867, payment: 4080266, interest: 40399, principal: 4039867, closing: 0 },
  ]);
  assert.equal(s.totalInterest, 240796);
  assert.equal(s.totalPaid, 12240796);
});

test("SPEC fixture: zero-rate loan pays equal instalments and no interest", () => {
  const s = buildSchedule(loan({ principalCents: 1_000_000, rateScaled: 0, termMonths: 4 }));
  assert.deepEqual(s.rows.map((r) => r.payment), [250000, 250000, 250000, 250000]);
  assert.equal(s.totalInterest, 0);
});

test("12-month annuity schedule matches an independently derived frozen table", () => {
  // Derived at authoring time with exact rational arithmetic (Python
  // fractions) straight from SPEC section 4, independent of this code.
  const expected = [
    [1, 36000000, 3039143, 72000, 2967143, 33032857],
    [2, 33032857, 3039143, 66066, 2973077, 30059780],
    [3, 30059780, 3039143, 60120, 2979023, 27080757],
    [4, 27080757, 3039143, 54162, 2984981, 24095776],
    [5, 24095776, 3039143, 48192, 2990951, 21104825],
    [6, 21104825, 3039143, 42210, 2996933, 18107892],
    [7, 18107892, 3039143, 36216, 3002927, 15104965],
    [8, 15104965, 3039143, 30210, 3008933, 12096032],
    [9, 12096032, 3039143, 24192, 3014951, 9081081],
    [10, 9081081, 3039143, 18162, 3020981, 6060100],
    [11, 6060100, 3039143, 12120, 3027023, 3033077],
    [12, 3033077, 3039143, 6066, 3033077, 0],
  ];
  const s = buildSchedule(loan({ principalCents: 36_000_000, rateScaled: 24_000, termMonths: 12 }));
  assert.deepEqual(
    s.rows.map((r) => [r.month, r.opening, r.payment, r.interest, r.principal, r.closing]),
    expected,
  );
  assert.equal(s.totalInterest, 469716);
  assert.equal(s.yearly.length, 1);
  assert.equal(s.yearly[0].interest, 469716);
});

test("equal-principal remainder cents go one each to the earliest months", () => {
  assert.deepEqual(principalPlan(1_000_001, 3), [333334, 333334, 333333]);
  const s = buildSchedule(loan({
    principalCents: 1_000_001, rateScaled: 0, termMonths: 3, method: "principal",
  }));
  assert.deepEqual(s.rows.map((r) => r.principal), [333334, 333334, 333333]);
  assert.deepEqual(s.rows.map((r) => r.payment), [333334, 333334, 333333]);
});

test("grace months are interest-only; the segment then amortises the balance", () => {
  // Independently derived (exact rational arithmetic).
  const s = buildSchedule(loan({ termMonths: 6, graceMonths: 2 }));
  assert.deepEqual(s.rows, [
    { month: 1, opening: 12000000, payment: 120000, interest: 120000, principal: 0, closing: 12000000 },
    { month: 2, opening: 12000000, payment: 120000, interest: 120000, principal: 0, closing: 12000000 },
    { month: 3, opening: 12000000, payment: 3075373, interest: 120000, principal: 2955373, closing: 9044627 },
    { month: 4, opening: 9044627, payment: 3075373, interest: 90446, principal: 2984927, closing: 6059700 },
    { month: 5, opening: 6059700, payment: 3075373, interest: 60597, principal: 3014776, closing: 3044924 },
    { month: 6, opening: 3044924, payment: 3075373, interest: 30449, principal: 3044924, closing: 0 },
  ]);
});

test("grace cap is min(60, half the term) and exceeding it is an error", () => {
  assert.equal(graceLimit(480), 60);
  assert.equal(graceLimit(6), 3);
  assert.equal(graceLimit(3), 1);
  assert.doesNotThrow(() => buildSchedule(loan({ termMonths: 6, graceMonths: 3 })));
  assert.throws(
    () => buildSchedule(loan({ termMonths: 6, graceMonths: 4 })),
    (err) => err instanceof MortgageError && err.code === "GRACE_LIMIT_EXCEEDED" && err.params.limit === 3 && err.params.actual === 4,
  );
  assert.throws(
    () => buildSchedule(loan({ termMonths: 480, graceMonths: 61 })),
    (err) => err.code === "GRACE_LIMIT_EXCEEDED" && err.params.limit === 60,
  );
});

test("tranche switch: new rate from the switch month; annuity recomputed there", () => {
  // Independently derived (exact rational arithmetic).
  const s = buildSchedule(loan({ termMonths: 4, tranche: { rateScaled: 60_000, startMonth: 3 } }));
  assert.deepEqual(s.rows, [
    { month: 1, opening: 12000000, payment: 3075373, interest: 120000, principal: 2955373, closing: 9044627 },
    { month: 2, opening: 9044627, payment: 3075373, interest: 90446, principal: 2984927, closing: 6059700 },
    { month: 3, opening: 6059700, payment: 3052593, interest: 30299, principal: 3022294, closing: 3037406 },
    { month: 4, opening: 3037406, payment: 3052593, interest: 15187, principal: 3037406, closing: 0 },
  ]);
});

test("tranche switch does not recompute equal-principal parts", () => {
  const s = buildSchedule(loan({
    termMonths: 4, method: "principal", tranche: { rateScaled: 60_000, startMonth: 3 },
  }));
  assert.deepEqual(s.rows.map((r) => r.principal), [3000000, 3000000, 3000000, 3000000]);
  assert.deepEqual(s.rows.map((r) => r.interest), [120000, 90000, 30000, 15000]);
});

test("reduce-payment prepayment recomputes the payment over the remaining months", () => {
  // Independently derived (exact rational arithmetic).
  const s = buildSchedule(loan({
    termMonths: 4,
    prepayments: [{ month: 1, amountCents: 2_000_000, mode: "reduce-payment" }],
  }));
  assert.deepEqual(s.rows, [
    { month: 1, opening: 12000000, payment: 3075373, interest: 120000, principal: 2955373, closing: 9044627 },
    { month: 2, opening: 7044627, payment: 2395329, interest: 70446, principal: 2324883, closing: 4719744 },
    { month: 3, opening: 4719744, payment: 2395329, interest: 47197, principal: 2348132, closing: 2371612 },
    { month: 4, opening: 2371612, payment: 2395328, interest: 23716, principal: 2371612, closing: 0 },
  ]);
  assert.equal(s.totalInterest, 261359);
  assert.equal(s.baseline.totalInterest, 301492);
  assert.equal(s.interestSaved, 40133);
  assert.equal(s.totalPrepaid, 2000000);
  assert.equal(s.totalPaid, s.totalScheduled + 2000000);
});

test("reduce-term prepayment keeps the payment and shortens the schedule", () => {
  const s = buildSchedule(loan({
    termMonths: 4,
    prepayments: [{ month: 1, amountCents: 6_000_000, mode: "reduce-term" }],
  }));
  assert.equal(s.rows.length, 2);
  assert.equal(s.rows[0].payment, 3075373);
  assert.deepEqual(s.rows[1], { month: 2, opening: 3044627, payment: 3075073, interest: 30446, principal: 3044627, closing: 0 });
});

test("same-month events combine in entry order", () => {
  const s = buildSchedule(loan({
    termMonths: 4,
    prepayments: [
      { month: 1, amountCents: 1_000_000, mode: "reduce-term" },
      { month: 1, amountCents: 1_000_000, mode: "reduce-payment" },
    ],
  }));
  assert.equal(s.rows[1].opening, 7044627); // both events applied after month 1
  assert.equal(s.totalPrepaid, 2000000);
});

test("prepayment equal to the post-payment balance ends the schedule", () => {
  const s = buildSchedule(loan({
    termMonths: 4,
    prepayments: [{ month: 2, amountCents: 6_059_700, mode: "reduce-term" }],
  }));
  assert.equal(s.rows.length, 2);
  assert.equal(s.rows[1].closing, 6059700);
});

test("prepayment one cent above the balance is an error naming the maximum", () => {
  assert.throws(
    () => buildSchedule(loan({
      termMonths: 4,
      prepayments: [{ month: 2, amountCents: 6_059_701, mode: "reduce-term" }],
    })),
    (err) => err.code === "PREPAYMENT_EXCEEDS_BALANCE" && err.params.max === 6059700 && err.params.month === 2,
  );
});

test("an event dated after the loan already ended is an error", () => {
  assert.throws(
    () => buildSchedule(loan({
      termMonths: 4,
      prepayments: [
        { month: 1, amountCents: 9_044_627, mode: "reduce-term" },
        { month: 3, amountCents: 100, mode: "reduce-term" },
      ],
    })),
    (err) => err.code === "PREPAYMENT_AFTER_PAYOFF" && err.params.month === 3,
  );
});

test("prepayment during grace reduces the balance the segment starts from", () => {
  const s = buildSchedule(loan({
    termMonths: 6,
    graceMonths: 2,
    prepayments: [{ month: 1, amountCents: 2_000_000, mode: "reduce-term" }],
  }));
  assert.equal(s.rows[0].closing, 12000000);
  assert.equal(s.rows[1].opening, 10000000); // month 2 opens after the grace prepayment
  assert.equal(s.rows[1].interest, 100000);
  assert.equal(s.rows[2].opening, 10000000);
});

test("more than 12 events are refused", () => {
  const events = Array.from({ length: 13 }, (_, i) => ({ month: 1, amountCents: 100, mode: "reduce-term" }));
  assert.throws(
    () => buildSchedule(loan({ termMonths: 24, prepayments: events })),
    (err) => err.code === "PREPAYMENT_LIMIT" && err.params.limit === 12,
  );
});

test("interest rounding is round-half-up at exact half cents", () => {
  assert.equal(monthlyInterestCents(100, 60_000), 1); // exactly 0.5 cent -> up
  assert.equal(monthlyInterestCents(50, 60_000), 0); // 0.25 cent -> down
  assert.equal(monthlyInterestCents(150, 60_000), 1); // 0.75 cent -> up
  assert.equal(monthlyInterestCents(0, 120_000), 0);
  assert.equal(monthlyInterestCents(12_000_000, 120_000), 120_000);
});

test("annuity payment: zero rate uses ceil with the remainder in the final payment", () => {
  assert.equal(annuityPaymentCents(100, 0, 3), 34);
  assert.equal(annuityPaymentCents(12_000_000, 120_000, 3), 4080265);
});

test("strict parsers reject non-decimal input and accept the stated precision", () => {
  assert.equal(parseMoneyCents("120000.00"), 12000000);
  assert.equal(parseMoneyCents("0.1"), 10);
  assert.equal(parseMoneyCents("1,000"), null);
  assert.equal(parseMoneyCents("1e5"), null);
  assert.equal(parseMoneyCents("12.345"), null);
  assert.equal(parseMoneyCents(""), null);
  assert.equal(parseMoneyCents(" 42 "), 4200);
  assert.equal(parseRateScaled("2.095"), 20950);
  assert.equal(parseRateScaled("12"), 120000);
  assert.equal(parseRateScaled("0.0001"), 1);
  assert.equal(parseRateScaled("2.09555"), null);
  assert.equal(parseRateScaled("abc"), null);
});

test("validation ranges: principal, rate, term", () => {
  assert.throws(() => buildSchedule(loan({ principalCents: 0 })), (e) => e.code === "PRINCIPAL_OUT_OF_RANGE");
  assert.throws(() => buildSchedule(loan({ principalCents: 1_000_000_000_001 })), (e) => e.code === "PRINCIPAL_OUT_OF_RANGE");
  assert.throws(() => buildSchedule(loan({ rateScaled: 300_001 })), (e) => e.code === "RATE_OUT_OF_RANGE");
  assert.throws(() => buildSchedule(loan({ termMonths: 481 })), (e) => e.code === "TERM_OUT_OF_RANGE");
  assert.throws(() => buildSchedule(loan({ tranche: { rateScaled: 60_000, startMonth: 1 } })), (e) => e.code === "TRANCHE_MONTH_OUT_OF_RANGE");
});

test("formatting: grouped display values and raw CSV values", () => {
  assert.equal(formatCents(123456789), "1,234,567.89");
  assert.equal(formatCents(0), "0.00");
  assert.equal(formatCents(-105), "-1.05");
  assert.equal(formatRawCents(123456789), "1234567.89");
  assert.equal(formatRate(120000), "12");
  assert.equal(formatRate(20950), "2.095");
  assert.equal(formatRate(1), "0.0001");
  assert.equal(formatRate(0), "0");
});

test("CSV byte equality for the worked example (no prepayments, no comment lines)", () => {
  const s = buildSchedule(loan());
  const expected = "month,opening,payment,interest,principal,closing\n"
    + "1,120000.00,40802.65,1200.00,39602.65,80397.35\n"
    + "2,80397.35,40802.65,803.97,39998.68,40398.67\n"
    + "3,40398.67,40802.66,403.99,40398.67,0.00\n";
  assert.equal(buildCsv(s), expected);
  assert.equal(buildCsv(s), buildCsv(buildSchedule(loan()))); // deterministic
});

test("CSV with prepayments carries the baseline comment header", () => {
  const s = buildSchedule(loan({
    termMonths: 4,
    prepayments: [{ month: 1, amountCents: 2_000_000, mode: "reduce-payment" }],
  }));
  const csv = buildCsv(s);
  const lines = csv.split("\n");
  assert.equal(lines[0], "# baseline_total_paid: 123014.92");
  assert.equal(lines[1], "# baseline_total_interest: 3014.92");
  assert.equal(lines[2], "# interest_saved: 401.33");
  assert.equal(lines[3], "month,opening,payment,interest,principal,closing");
  assert.ok(csv.endsWith("\n") && !csv.endsWith("\n\n"));
});

test("CSV filename carries only the local date", () => {
  assert.equal(makeCsvFilename(new Date(2026, 10, 2)), "amortization-20261102.csv");
  assert.equal(makeCsvFilename(new Date(Number.NaN)), "amortization.csv");
});

test("40-year schedule computes 480 rows quickly and closes at zero", () => {
  const started = Date.now();
  const s = buildSchedule(loan({ termMonths: 480, rateScaled: 20_950 }));
  assert.equal(s.rows.length, 480);
  assert.equal(s.rows[479].closing, 0);
  assert.equal(s.yearly.length, 40);
  assert.ok(Date.now() - started < 50, "SPEC performance bound: 50 ms");
});
