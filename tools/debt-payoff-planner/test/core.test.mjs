// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-debt-payoff-planner-20261121, draft spec PR #376, SHA-256
// 5f35c9076a97e9d8e4292085c0d4ddcf3806902b9f492d39ed1e02516123d2dc).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The single exception is `treads-water`,
// whose fixture carries only a partial literal (summary +
// monthlyHead/monthlyTail) by the SPEC's own §7 rule; it is asserted
// on those literals plus the two pinned properties (the balance
// identity for all 600 months, and all 600 rows identical). The
// hand-derived cases below are computed from the SPEC's §4 rules by
// hand, never from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  monthlyInterestCents,
  run,
} from "../public/js/core/debt-payoff-planner.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-debt-payoff-planner-20261121");
assert.equal(coreCases.length, 14);

for (const fixture of coreCases) {
  if (fixture.id === "treads-water") continue;
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

test("fixture treads-water: partial literal plus the two pinned properties", () => {
  const fixture = coreCases.find((entry) => entry.id === "treads-water");
  const actual = run(fixture.input);
  assert.equal(actual.ok, true);
  const { result } = actual;
  const expected = fixture.expected.result;
  assert.equal(result.totalInitialCents, expected.totalInitialCents);
  assert.equal(result.extraMonthlyCents, expected.extraMonthlyCents);
  assert.deepEqual(result.comparison, expected.comparison);
  for (const key of ["snowball", "avalanche"]) {
    const strategy = result.strategies[key];
    const pinned = expected.strategies[key];
    assert.equal(strategy.status, pinned.status);
    assert.deepEqual(strategy.order, pinned.order);
    assert.deepEqual(strategy.payoffOrder, pinned.payoffOrder);
    assert.equal(strategy.monthsToDebtFree, pinned.monthsToDebtFree);
    assert.equal(strategy.monthsSimulated, pinned.monthsSimulated);
    assert.equal(strategy.totalInterestCents, pinned.totalInterestCents);
    assert.equal(strategy.totalPaidCents, pinned.totalPaidCents);
    assert.deepEqual(strategy.payoffMonth, pinned.payoffMonth);
    assert.equal(strategy.monthly.length, 600);
    assert.deepEqual(strategy.monthly.slice(0, 3), pinned.monthlyHead);
    assert.deepEqual(strategy.monthly.slice(599), pinned.monthlyTail);
    // (a) The balance identity holds for all 600 months.
    let remaining = expected.totalInitialCents;
    for (const row of strategy.monthly) {
      remaining = remaining + row.interestCents - row.paidCents;
      assert.equal(row.remainingCents, remaining, `${key} month ${row.month}`);
    }
    // (b) All 600 rows are identical.
    for (const row of strategy.monthly) {
      assert.deepEqual(row, { month: row.month, paidCents: 5000, interestCents: 5000, remainingCents: 500000 });
    }
  }
});

// Independent re-derivation of the simulation, written separately
// from the implementation: the same SPEC §4 rules, but the interest
// written in its algebraically equal half-up form
// floor((balance * aprHundredths + 60000) / 120000) with plain
// integer arithmetic, and the month loop structured differently
// (released minimums tracked as a running set rather than a
// payoff-month scan).
function expectedSimulation(debts, extraMonthlyCents, order) {
  const balances = debts.map((debt) => debt.balanceCents);
  const paidOffMonth = new Map();
  const payoffOrder = [];
  const monthly = [];
  let totalInterest = 0;
  let totalPaid = 0;
  for (let month = 1; month <= 600; month += 1) {
    let interest = 0;
    for (let i = 0; i < debts.length; i += 1) {
      if (balances[i] <= 0) continue;
      const due = Math.floor(
        (balances[i] * debts[i].aprHundredths + 60000) / 120000,
      );
      balances[i] += due;
      interest += due;
    }
    let paid = 0;
    let pool = extraMonthlyCents;
    for (const [index, freedMonth] of paidOffMonth) {
      if (freedMonth < month) pool += debts[index].minimumCents;
    }
    for (let i = 0; i < debts.length; i += 1) {
      if (balances[i] <= 0) continue;
      const pay = Math.min(debts[i].minimumCents, balances[i]);
      balances[i] -= pay;
      paid += pay;
      pool += debts[i].minimumCents - pay;
      if (balances[i] === 0) {
        paidOffMonth.set(i, month);
        payoffOrder.push(debts[i].name);
      }
    }
    for (const index of order) {
      if (pool <= 0) break;
      if (balances[index] <= 0) continue;
      const pay = Math.min(pool, balances[index]);
      balances[index] -= pay;
      paid += pay;
      pool -= pay;
      if (balances[index] === 0) {
        paidOffMonth.set(index, month);
        payoffOrder.push(debts[index].name);
      }
    }
    totalInterest += interest;
    totalPaid += paid;
    const remaining = balances.reduce((sum, balance) => sum + balance, 0);
    monthly.push({ month, paidCents: paid, interestCents: interest, remainingCents: remaining });
    if (remaining === 0) {
      return {
        status: "debt-free",
        monthsToDebtFree: month,
        monthsSimulated: month,
        totalInterestCents: totalInterest,
        totalPaidCents: totalPaid,
        payoffMonth: Object.fromEntries(
          [...paidOffMonth].map(([index, when]) => [debts[index].name, when]),
        ),
        payoffOrder,
        monthly,
      };
    }
  }
  return {
    status: "not-debt-free",
    monthsToDebtFree: null,
    monthsSimulated: 600,
    totalInterestCents: totalInterest,
    totalPaidCents: totalPaid,
    payoffMonth: Object.fromEntries(
      [...paidOffMonth].map(([index, when]) => [debts[index].name, when]),
    ),
    payoffOrder,
    monthly,
  };
}

test("independent re-derivation agrees with run() on the numeric fixtures", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok || fixture.id === "treads-water") continue;
    const outcome = run(fixture.input);
    assert.equal(outcome.ok, true, fixture.id);
    const debts = fixture.input.debts.map((debt) => ({
      name: debt.name,
      balanceCents: Math.round(Number(debt.balance) * 100),
      aprHundredths: Math.round(Number(debt.apr) * 100),
      minimumCents: Math.round(Number(debt.minimum) * 100),
    }));
    const extra = Math.round(Number(fixture.input.extraMonthly) * 100);
    const snowballOrder = outcome.result.strategies.snowball.order.map((name) =>
      debts.findIndex((debt) => debt.name === name),
    );
    const avalancheOrder = outcome.result.strategies.avalanche.order.map((name) =>
      debts.findIndex((debt) => debt.name === name),
    );
    assert.deepEqual(
      expectedSimulation(debts, extra, snowballOrder),
      {
        status: outcome.result.strategies.snowball.status,
        monthsToDebtFree: outcome.result.strategies.snowball.monthsToDebtFree,
        monthsSimulated: outcome.result.strategies.snowball.monthsSimulated,
        totalInterestCents: outcome.result.strategies.snowball.totalInterestCents,
        totalPaidCents: outcome.result.strategies.snowball.totalPaidCents,
        payoffMonth: outcome.result.strategies.snowball.payoffMonth,
        payoffOrder: outcome.result.strategies.snowball.payoffOrder,
        monthly: outcome.result.strategies.snowball.monthly,
      },
      `${fixture.id} snowball`,
    );
    assert.deepEqual(
      expectedSimulation(debts, extra, avalancheOrder),
      {
        status: outcome.result.strategies.avalanche.status,
        monthsToDebtFree: outcome.result.strategies.avalanche.monthsToDebtFree,
        monthsSimulated: outcome.result.strategies.avalanche.monthsSimulated,
        totalInterestCents: outcome.result.strategies.avalanche.totalInterestCents,
        totalPaidCents: outcome.result.strategies.avalanche.totalPaidCents,
        payoffMonth: outcome.result.strategies.avalanche.payoffMonth,
        payoffOrder: outcome.result.strategies.avalanche.payoffOrder,
        monthly: outcome.result.strategies.avalanche.monthly,
      },
      `${fixture.id} avalanche`,
    );
  }
});

test("monthly interest: the SPEC's half-up cases, computed by hand", () => {
  // 900 x 6% -> 4.5 -> 5; 405 x 6% -> 2.025 -> 2; 15250 x 12% ->
  // 152.5 -> 153; 500000 x 12% -> 5000 exactly; zero APR -> 0.
  assert.equal(monthlyInterestCents(900, 600), 5);
  assert.equal(monthlyInterestCents(405, 600), 2);
  assert.equal(monthlyInterestCents(15250, 1200), 153);
  assert.equal(monthlyInterestCents(500000, 1200), 5000);
  assert.equal(monthlyInterestCents(100000, 0), 0);
  assert.equal(monthlyInterestCents(60000, 1200), 600);
});

test("the balance identity and the fixed-outflow rule hold for every debt-free fixture", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok || fixture.id === "treads-water") continue;
    const outcome = run(fixture.input);
    assert.equal(outcome.ok, true, fixture.id);
    const { result } = outcome;
    const totalMinimum = fixture.input.debts.reduce(
      (sum, debt) => sum + Math.round(Number(debt.minimum) * 100),
      0,
    );
    const fixedOutflow = totalMinimum + result.extraMonthlyCents;
    for (const key of ["snowball", "avalanche"]) {
      const strategy = result.strategies[key];
      assert.equal(
        strategy.totalPaidCents,
        result.totalInitialCents + strategy.totalInterestCents,
        `${fixture.id} ${key} identity`,
      );
      let remaining = result.totalInitialCents;
      for (const row of strategy.monthly) {
        remaining = remaining + row.interestCents - row.paidCents;
        assert.equal(row.remainingCents, remaining, `${fixture.id} ${key} m${row.month}`);
      }
      for (let index = 0; index < strategy.monthly.length - 1; index += 1) {
        assert.equal(
          strategy.monthly[index].paidCents,
          fixedOutflow,
          `${fixture.id} ${key} m${index + 1} outflow`,
        );
      }
      assert.ok(
        strategy.monthly[strategy.monthly.length - 1].paidCents <= fixedOutflow,
        `${fixture.id} ${key} final month outflow`,
      );
    }
  }
});

test("range endpoints are accepted; one cent or one hundredth outside is RANGE", () => {
  const base = (balance, apr, minimum, extra) => ({
    debts: [{ name: "Card", balance, apr, minimum }],
    extraMonthly: extra,
  });
  assert.equal(run(base("10000000.00", "99.99", "0.00", "0.01")).ok, true);
  assert.deepEqual(run(base("10000000.01", "12.00", "10.00", "0.00")), {
    ok: false,
    error: { code: "RANGE", field: "balance", row: 1 },
  });
  assert.deepEqual(run(base("0.00", "12.00", "10.00", "0.00")), {
    ok: false,
    error: { code: "RANGE", field: "balance", row: 1 },
  });
  assert.deepEqual(run(base("100.00", "100.00", "10.00", "0.00")), {
    ok: false,
    error: { code: "RANGE", field: "apr", row: 1 },
  });
  assert.equal(run(base("100.00", "99.99", "10.00", "0.00")).ok, true);
  assert.deepEqual(run(base("100.00", "12.00", "1000000.01", "0.00")), {
    ok: false,
    error: { code: "RANGE", field: "minimum", row: 1 },
  });
  assert.deepEqual(run(base("100.00", "12.00", "10.00", "1000000.01")), {
    ok: false,
    error: { code: "RANGE", field: "extraMonthly", row: null },
  });
  // A zero minimum is legal as long as some payment flows in.
  assert.equal(run(base("100.00", "12.00", "0.00", "10.00")).ok, true);
});

test("12 debts are accepted; 13 are ROW_LIMIT", () => {
  const debts = Array.from({ length: 12 }, (_, index) => ({
    name: `D${index + 1}`,
    balance: "100.00",
    apr: "12.00",
    minimum: "10.00",
  }));
  assert.equal(run({ debts, extraMonthly: "0.00" }).ok, true);
  debts.push({ name: "D13", balance: "100.00", apr: "12.00", minimum: "10.00" });
  assert.deepEqual(run({ debts, extraMonthly: "0.00" }), {
    ok: false,
    error: { code: "ROW_LIMIT", field: "debts", row: null },
  });
  assert.deepEqual(run({ debts: [], extraMonthly: "0.00" }), {
    ok: false,
    error: { code: "EMPTY", field: "debts", row: null },
  });
});

test("grammar: money and APR accept integers and 1-2 decimals only", () => {
  const badMoney = ["100.", ".5", "100.005", "+100", "-100", " 100", "100 ", "1e2", "１００", "1,000", "00", "0100"];
  for (const value of badMoney) {
    assert.deepEqual(
      run({ debts: [{ name: "Card", balance: value, apr: "12.00", minimum: "10.00" }], extraMonthly: "0.00" }),
      { ok: false, error: { code: "MONEY_FORMAT", field: "balance", row: 1 } },
      value,
    );
  }
  for (const value of ["100", "100.5", "100.50"]) {
    const outcome = run({
      debts: [{ name: "Card", balance: value, apr: "12.00", minimum: "10.00" }],
      extraMonthly: "0.00",
    });
    assert.equal(outcome.ok, true, value);
  }
  // "0" and "0.00" pass money grammar (a zero minimum is legal).
  for (const value of ["0", "0.00"]) {
    const outcome = run({
      debts: [{ name: "Card", balance: "100.00", apr: "12.00", minimum: value }],
      extraMonthly: "10.00",
    });
    assert.equal(outcome.ok, true, value);
  }
  for (const value of ["12.345", "12.", ".5", "+12", "1e1"]) {
    assert.deepEqual(
      run({ debts: [{ name: "Card", balance: "100.00", apr: value, minimum: "10.00" }], extraMonthly: "0.00" }),
      { ok: false, error: { code: "APR_FORMAT", field: "apr", row: 1 } },
      value,
    );
  }
});

test("capacity precedes grammar: a 16-unit money string is INPUT_LIMIT", () => {
  assert.deepEqual(
    run({
      debts: [{ name: "Card", balance: "1234567890123456", apr: "12.00", minimum: "10.00" }],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "balance", row: 1 } },
  );
  assert.deepEqual(
    run({ debts: [{ name: "Card", balance: "100.00", apr: "12.00", minimum: "10.00" }], extraMonthly: "1234567890123456" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "extraMonthly", row: null } },
  );
  assert.deepEqual(
    run({
      debts: [{ name: "A".repeat(41), balance: "100.00", apr: "12.00", minimum: "10.00" }],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "name", row: 1 } },
  );
  assert.equal(
    run({
      debts: [{ name: "A".repeat(40), balance: "100.00", apr: "12.00", minimum: "10.00" }],
      extraMonthly: "0.00",
    }).ok,
    true,
  );
});

test("names: empty, all-whitespace, control characters, lone surrogates", () => {
  const withName = (name) => ({
    debts: [{ name, balance: "100.00", apr: "12.00", minimum: "10.00" }],
    extraMonthly: "0.00",
  });
  assert.deepEqual(run(withName("")), {
    ok: false,
    error: { code: "EMPTY", field: "name", row: 1 },
  });
  assert.deepEqual(run(withName("   ")), {
    ok: false,
    error: { code: "EMPTY", field: "name", row: 1 },
  });
  assert.deepEqual(run(withName("Card\u0001")), {
    ok: false,
    error: { code: "UNICODE", field: "name", row: 1 },
  });
  assert.deepEqual(run(withName("Card\uD800")), {
    ok: false,
    error: { code: "UNICODE", field: "name", row: 1 },
  });
  assert.deepEqual(
    run({
      debts: [{ name: "Card", balance: "10\uD800", apr: "12.00", minimum: "10.00" }],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "UNICODE", field: "balance", row: 1 } },
  );
  // A name with surrounding spaces is legal and compares untrimmed.
  assert.equal(run(withName(" Card ")).ok, true);
});

test("field order: name, then balance, then apr, then minimum; row 1 before row 2", () => {
  assert.deepEqual(
    run({
      debts: [{ name: "", balance: "junk", apr: "junk", minimum: "junk" }],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "EMPTY", field: "name", row: 1 } },
  );
  assert.deepEqual(
    run({
      debts: [
        { name: "A", balance: "100.00", apr: "12.00", minimum: "10.00" },
        { name: "B", balance: "bad", apr: "bad", minimum: "bad" },
      ],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "MONEY_FORMAT", field: "balance", row: 2 } },
  );
  // The duplicate-name scan runs only after every row validates.
  assert.deepEqual(
    run({
      debts: [
        { name: "Card", balance: "100.00", apr: "12.00", minimum: "10.00" },
        { name: "Card", balance: "bad", apr: "12.00", minimum: "10.00" },
      ],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "MONEY_FORMAT", field: "balance", row: 2 } },
  );
});

test("duplicate names are case-sensitive and untrimmed; the later row is blamed", () => {
  const outcome = run({
    debts: [
      { name: "Card", balance: "100.00", apr: "12.00", minimum: "10.00" },
      { name: "card", balance: "100.00", apr: "12.00", minimum: "10.00" },
      { name: " Card", balance: "100.00", apr: "12.00", minimum: "10.00" },
    ],
    extraMonthly: "0.00",
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(
    run({
      debts: [
        { name: "A", balance: "100.00", apr: "12.00", minimum: "10.00" },
        { name: "B", balance: "100.00", apr: "12.00", minimum: "10.00" },
        { name: "A", balance: "100.00", apr: "12.00", minimum: "10.00" },
      ],
      extraMonthly: "0.00",
    }),
    { ok: false, error: { code: "DUPLICATE_NAME", field: "name", row: 3 } },
  );
});

test("the 600-month cap: payoff exactly in month 600, and one cent short of it", () => {
  // Zero APR, 600000 cents at 1000 cents a month: exactly 600 months.
  const exact = run({
    debts: [{ name: "Loan", balance: "6000.00", apr: "0.00", minimum: "10.00" }],
    extraMonthly: "0.00",
  });
  assert.equal(exact.ok, true);
  assert.equal(exact.result.strategies.snowball.status, "debt-free");
  assert.equal(exact.result.strategies.snowball.monthsToDebtFree, 600);
  assert.equal(exact.result.strategies.snowball.monthsSimulated, 600);
  assert.equal(exact.result.strategies.snowball.totalInterestCents, 0);
  assert.equal(exact.result.strategies.snowball.totalPaidCents, 600000);
  assert.equal(exact.result.strategies.snowball.monthly.length, 600);
  assert.equal(exact.result.comparison.lowerInterestStrategy, "tie");

  // One cent more: 600 months are not enough, and the report is honest.
  const short = run({
    debts: [{ name: "Loan", balance: "6000.01", apr: "0.00", minimum: "10.00" }],
    extraMonthly: "0.00",
  });
  assert.equal(short.ok, true);
  assert.equal(short.result.strategies.snowball.status, "not-debt-free");
  assert.equal(short.result.strategies.snowball.monthsToDebtFree, null);
  assert.equal(short.result.strategies.snowball.monthsSimulated, 600);
  assert.equal(short.result.strategies.snowball.monthly[599].remainingCents, 1);
  assert.equal(short.result.comparison.lowerInterestStrategy, null);
  assert.equal(short.result.comparison.interestDifferenceCents, null);
  assert.equal(short.result.comparison.fewerMonthsStrategy, null);
  assert.equal(short.result.comparison.monthsDifference, null);
});

test("tie-breaks: same balance takes the higher APR first; same APR takes the smaller balance first", () => {
  const outcome = run({
    debts: [
      { name: "Low", balance: "100.00", apr: "6.00", minimum: "10.00" },
      { name: "High", balance: "100.00", apr: "24.00", minimum: "10.00" },
      { name: "Big", balance: "200.00", apr: "24.00", minimum: "10.00" },
      { name: "Small", balance: "50.00", apr: "24.00", minimum: "10.00" },
    ],
    extraMonthly: "0.00",
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.strategies.snowball.order, ["Small", "High", "Low", "Big"]);
  assert.deepEqual(outcome.result.strategies.avalanche.order, ["Small", "High", "Big", "Low"]);
  // Fully tied on balance and APR: name order in UTF-16 code units.
  const tied = run({
    debts: [
      { name: "b", balance: "100.00", apr: "12.00", minimum: "10.00" },
      { name: "A", balance: "100.00", apr: "12.00", minimum: "10.00" },
      { name: "a", balance: "100.00", apr: "12.00", minimum: "10.00" },
    ],
    extraMonthly: "0.00",
  });
  assert.deepEqual(tied.result.strategies.snowball.order, ["A", "a", "b"]);
  assert.deepEqual(tied.result.strategies.avalanche.order, ["A", "a", "b"]);
});

test("removing a debt preserves the relative strategy order of the rest", () => {
  const full = run({
    debts: [
      { name: "Store Card", balance: "600.00", apr: "24.00", minimum: "50.00" },
      { name: "Personal Loan", balance: "1200.00", apr: "6.00", minimum: "100.00" },
      { name: "Credit Card", balance: "300.00", apr: "18.00", minimum: "25.00" },
    ],
    extraMonthly: "100.00",
  });
  const reduced = run({
    debts: [
      { name: "Personal Loan", balance: "1200.00", apr: "6.00", minimum: "100.00" },
      { name: "Credit Card", balance: "300.00", apr: "18.00", minimum: "25.00" },
    ],
    extraMonthly: "100.00",
  });
  assert.equal(full.ok, true);
  assert.equal(reduced.ok, true);
  for (const key of ["snowball", "avalanche"]) {
    const remaining = full.result.strategies[key].order.filter((name) => name !== "Store Card");
    assert.deepEqual(reduced.result.strategies[key].order, remaining);
  }
});

test("schema violations are SCHEMA with field and row null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("x"), schema);
  assert.deepEqual(run({ debts: [] }), schema);
  assert.deepEqual(run({ extraMonthly: "0.00" }), schema);
  assert.deepEqual(run({ debts: "x", extraMonthly: "0.00" }), schema);
  assert.deepEqual(
    run({ debts: [{ name: "A", balance: "100.00", apr: "12.00", minimum: "10.00" }], extraMonthly: "0.00", extra: "x" }),
    schema,
  );
  assert.deepEqual(
    run({ debts: [{ name: "A", balance: 100, apr: "12.00", minimum: "10.00" }], extraMonthly: "0.00" }),
    schema,
  );
  assert.deepEqual(
    run({ debts: [{ name: "A", balance: "100.00", apr: "12.00" }], extraMonthly: "0.00" }),
    schema,
  );
  assert.deepEqual(
    run({ debts: ["not-an-object"], extraMonthly: "0.00" }),
    schema,
  );
  assert.deepEqual(
    run({ debts: [{ name: "A", balance: "100.00", apr: "12.00", minimum: "10.00", note: "x" }], extraMonthly: "0.00" }),
    schema,
  );
  const withAccessor = { extraMonthly: "0.00", debts: [] };
  Object.defineProperty(withAccessor, "debts", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/debt-payoff-planner.mjs", import.meta.url));
  const inputs = coreCases.map((entry) => entry.input);
  const script = `
    import { run } from ${JSON.stringify(pathToFileURL(corePath).href)};
    const inputs = ${JSON.stringify(inputs)};
    const outputs = inputs.map((input) => run(input));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const expected = JSON.stringify(inputs.map((input) => run(input)));
  for (const tz of ["UTC", "Asia/Taipei", "America/New_York", "Pacific/Kiritimati"]) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
    assert.equal(out, expected, `TZ=${tz}`);
  }
});
