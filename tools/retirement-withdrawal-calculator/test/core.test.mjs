// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from
// docs/specs/retirement-withdrawal-calculator) plus cases derived by hand
// from the SPEC rules and cross-checked with an independent Python Decimal
// calculation — never from the core's own output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { formatHundredths, normalizeEcho, run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

const DEPLETION = (overrides) => ({
  mode: "depletion",
  portfolioValue: "1000000",
  annualWithdrawal: "50000",
  returnRatePct: "5",
  inflationRatePct: "2",
  ...overrides,
});

test("boundary: money exactly 999,999,999.99 depletes in one full year", () => {
  assert.deepEqual(
    run(DEPLETION({ portfolioValue: "999999999.99", annualWithdrawal: "999999999.99", returnRatePct: "0", inflationRatePct: "0" })),
    {
      ok: true,
      result: {
        mode: "depletion",
        depletionStatus: "depleted",
        yearsUntilDepletion: "1.00",
        fullYears: 1,
        partialYearFraction: "0.00",
        finalPartialWithdrawal: "0.00",
        yearlyTable: [
          { year: 1, startBalance: "999999999.99", withdrawal: "999999999.99", returnAmount: "0.00", endBalance: "0.00", partial: false },
        ],
      },
    }
  );
});

test("boundary: money above 999,999,999.99 is RANGE; 17 raw characters is INPUT_LIMIT", () => {
  assert.deepEqual(run(DEPLETION({ portfolioValue: "1000000000" })), {
    ok: false,
    error: { code: "RANGE", field: "portfolioValue", row: null },
  });
  assert.deepEqual(run(DEPLETION({ portfolioValue: "10000000000000000" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "portfolioValue", row: null },
  });
});

test("boundary: return -50 and 100 are legal; 100.01 and -50.01 are RANGE", () => {
  const never = (returnRatePct) => ({
    ok: true,
    result: {
      mode: "depletion",
      depletionStatus: "never",
      yearsUntilDepletion: null,
      fullYears: 0,
      partialYearFraction: "0.00",
      finalPartialWithdrawal: "0.00",
      yearlyTable: [],
    },
  });
  assert.deepEqual(run(DEPLETION({ annualWithdrawal: "0", returnRatePct: "-50" })), never("-50"));
  assert.deepEqual(run(DEPLETION({ annualWithdrawal: "0", returnRatePct: "100" })), never("100"));
  assert.deepEqual(run(DEPLETION({ returnRatePct: "100.01" })), {
    ok: false,
    error: { code: "RANGE", field: "returnRatePct", row: null },
  });
  assert.deepEqual(run(DEPLETION({ returnRatePct: "-50.01" })), {
    ok: false,
    error: { code: "RANGE", field: "returnRatePct", row: null },
  });
});

test("boundary: inflation 0 and 100 are legal; -1 and 100.01 are RANGE", () => {
  assert.equal(run(DEPLETION({ annualWithdrawal: "0", inflationRatePct: "0" })).ok, true);
  assert.equal(run(DEPLETION({ annualWithdrawal: "0", inflationRatePct: "100" })).ok, true);
  assert.deepEqual(run(DEPLETION({ inflationRatePct: "-1" })), {
    ok: false,
    error: { code: "RANGE", field: "inflationRatePct", row: null },
  });
  assert.deepEqual(run(DEPLETION({ inflationRatePct: "100.01" })), {
    ok: false,
    error: { code: "RANGE", field: "inflationRatePct", row: null },
  });
});

test("boundary: 1 per year at 0% never depletes within the 100-year cap", () => {
  const outcome = run(DEPLETION({ annualWithdrawal: "1", returnRatePct: "0", inflationRatePct: "0" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.depletionStatus, "beyond-horizon");
  assert.equal(outcome.result.yearsUntilDepletion, null);
  assert.equal(outcome.result.fullYears, 100);
  assert.equal(outcome.result.yearlyTable.length, 100);
  assert.deepEqual(outcome.result.yearlyTable[99], {
    year: 100,
    startBalance: "999901.00",
    withdrawal: "1.00",
    returnAmount: "0.00",
    endBalance: "999900.00",
    partial: false,
  });
});

test("rounding: partial-year fraction exactly .005 rounds half up to .01", () => {
  const outcome = run(DEPLETION({ portfolioValue: "5", annualWithdrawal: "1000", returnRatePct: "0", inflationRatePct: "0" }));
  assert.equal(outcome.result.yearsUntilDepletion, "0.01");
  assert.equal(outcome.result.partialYearFraction, "0.01");
  assert.equal(outcome.result.finalPartialWithdrawal, "5.00");
  const below = run(DEPLETION({ portfolioValue: "499", annualWithdrawal: "100000", returnRatePct: "0", inflationRatePct: "0" }));
  assert.equal(below.result.partialYearFraction, "0.00");
  assert.equal(below.result.yearsUntilDepletion, "0.00");
});

test("rounding: negative return tie rounds half away from zero", () => {
  // (100000.10 - 50000) * -5% = -2500.005 exactly -> -2500.01.
  const outcome = run(DEPLETION({ portfolioValue: "100000.10", annualWithdrawal: "50000", returnRatePct: "-5", inflationRatePct: "0" }));
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.yearlyTable[0], {
    year: 1,
    startBalance: "100000.10",
    withdrawal: "50000.00",
    returnAmount: "-2500.01",
    endBalance: "47500.09",
    partial: false,
  });
});

test("rounding: inflation-grown withdrawal tie rounds up (100.05 * 1.10 = 110.055 -> 110.06)", () => {
  const outcome = run(DEPLETION({ portfolioValue: "200.10", annualWithdrawal: "100.05", returnRatePct: "0", inflationRatePct: "10" }));
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result, {
    mode: "depletion",
    depletionStatus: "depleted",
    yearsUntilDepletion: "1.91",
    fullYears: 1,
    partialYearFraction: "0.91",
    finalPartialWithdrawal: "100.05",
    yearlyTable: [
      { year: 1, startBalance: "200.10", withdrawal: "100.05", returnAmount: "0.00", endBalance: "100.05", partial: false },
      { year: 2, startBalance: "100.05", withdrawal: "100.05", returnAmount: "0.00", endBalance: "0.00", partial: true },
    ],
  });
});

test("inflation growth: 10% inflation erodes 100000 at 10000 a year in 7 full years + 0.26", () => {
  const outcome = run(DEPLETION({ portfolioValue: "100000", annualWithdrawal: "10000", returnRatePct: "0", inflationRatePct: "10" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.yearsUntilDepletion, "7.26");
  assert.equal(outcome.result.fullYears, 7);
  assert.equal(outcome.result.finalPartialWithdrawal, "5128.29");
  assert.deepEqual(outcome.result.yearlyTable[5], {
    year: 6,
    startBalance: "38949.00",
    withdrawal: "16105.10",
    returnAmount: "0.00",
    endBalance: "22843.90",
    partial: false,
  });
  assert.deepEqual(outcome.result.yearlyTable[7], {
    year: 8,
    startBalance: "5128.29",
    withdrawal: "5128.29",
    returnAmount: "0.00",
    endBalance: "0.00",
    partial: true,
  });
});

test("four-percent: negative shortfall and implied 3.33% meets the rule", () => {
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "100000", currentPortfolio: "3000000" }), {
    ok: true,
    result: {
      mode: "four-percent",
      annualSpending: "100000.00",
      targetPortfolio: "2500000.00",
      currentPortfolio: "3000000.00",
      impliedWithdrawalRatePct: "3.33",
      shortfall: "-500000.00",
      meetsRule: true,
    },
  });
});

test("four-percent: implied 4.01% misses the rule; smallest spending gives target 0.25", () => {
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "401", currentPortfolio: "10000" }), {
    ok: true,
    result: {
      mode: "four-percent",
      annualSpending: "401.00",
      targetPortfolio: "10025.00",
      currentPortfolio: "10000.00",
      impliedWithdrawalRatePct: "4.01",
      shortfall: "25.00",
      meetsRule: false,
    },
  });
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "0.01", currentPortfolio: "" }), {
    ok: true,
    result: {
      mode: "four-percent",
      annualSpending: "0.01",
      targetPortfolio: "0.25",
      currentPortfolio: null,
      impliedWithdrawalRatePct: null,
      shortfall: null,
      meetsRule: null,
    },
  });
});

test("four-percent: current portfolio 0 is RANGE; spending 0 is RANGE", () => {
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "600000", currentPortfolio: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "currentPortfolio", row: null },
  });
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "0", currentPortfolio: "" }), {
    ok: false,
    error: { code: "RANGE", field: "annualSpending", row: null },
  });
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run(DEPLETION({ portfolioValue: "0.5" })).ok, true);
  for (const bad of [".5", "5.", "007", "+5", "1e3", " 5", "5 ", "50%", "1,000", "--5", "0x10", "5-", "00.5"]) {
    assert.deepEqual(
      run(DEPLETION({ portfolioValue: bad })),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "portfolioValue", row: null } },
      `expected DECIMAL_FORMAT for ${JSON.stringify(bad)}`
    );
  }
  // A minus in the correct position is grammar-valid; the value is out of range.
  assert.deepEqual(run(DEPLETION({ portfolioValue: "-5" })), {
    ok: false,
    error: { code: "RANGE", field: "portfolioValue", row: null },
  });
  assert.deepEqual(run(DEPLETION({ returnRatePct: "5.123" })), {
    ok: false,
    error: { code: "DECIMAL_PLACES", field: "returnRatePct", row: null },
  });
});

test("zero judged on exact value: -0 is zero; empty is EMPTY", () => {
  assert.deepEqual(
    run(DEPLETION({ portfolioValue: "-0", annualWithdrawal: "50000", returnRatePct: "5", inflationRatePct: "2" })).result.yearsUntilDepletion,
    "0.00"
  );
  assert.deepEqual(run(DEPLETION({ portfolioValue: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "portfolioValue", row: null },
  });
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "", currentPortfolio: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "annualSpending", row: null },
  });
});

test("schema: wrong mode, missing/extra fields, wrong types, accessors", () => {
  const schemaNull = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schemaNull);
  assert.deepEqual(run("depletion"), schemaNull);
  assert.deepEqual(run({ mode: "depletion", portfolioValue: "1" }), schemaNull);
  assert.deepEqual(run({ ...DEPLETION(), annualSpending: "1" }), schemaNull);
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "600000" }), schemaNull);
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "600000", currentPortfolio: "1", extra: "1" }), schemaNull);
  assert.deepEqual(run(DEPLETION({ portfolioValue: 1 })), schemaNull);
  assert.deepEqual(run({ mode: 1, annualSpending: "1", currentPortfolio: "" }), schemaNull);
  // Unknown mode value is SCHEMA on the mode field.
  assert.deepEqual(run({ mode: "x", annualSpending: "1", currentPortfolio: "" }), {
    ok: false,
    error: { code: "SCHEMA", field: "mode", row: null },
  });
  assert.deepEqual(run({ annualSpending: "1", currentPortfolio: "" }), schemaNull);
  const withGetter = { mode: "depletion", annualWithdrawal: "1", returnRatePct: "1", inflationRatePct: "1" };
  Object.defineProperty(withGetter, "portfolioValue", {
    enumerable: true,
    get() {
      return "1";
    },
  });
  assert.deepEqual(run(withGetter), schemaNull);
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run(DEPLETION({ portfolioValue: "\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "portfolioValue", row: null },
  });
  assert.deepEqual(run(DEPLETION({ portfolioValue: "1\uDC00" })), {
    ok: false,
    error: { code: "UNICODE", field: "portfolioValue", row: null },
  });
  assert.deepEqual(run(DEPLETION({ portfolioValue: "1".repeat(16) + "\uD800" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "portfolioValue", row: null },
  });
});

test("field order: first error wins in SPEC field order", () => {
  // portfolioValue is checked before returnRatePct.
  assert.deepEqual(run(DEPLETION({ portfolioValue: "", returnRatePct: "101" })), {
    ok: false,
    error: { code: "EMPTY", field: "portfolioValue", row: null },
  });
  // In four-percent mode annualSpending is checked before currentPortfolio.
  assert.deepEqual(run({ mode: "four-percent", annualSpending: "0", currentPortfolio: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "annualSpending", row: null },
  });
});

test("invariants across fixtures: no negative end balance; withdrawals never decrease", () => {
  for (const c of coreCases) {
    if (!c.expected.ok) continue;
    const table = c.expected.result.yearlyTable;
    if (!table) continue;
    for (const row of table) {
      assert.ok(!row.endBalance.startsWith("-"), `${c.id} year ${row.year} negative end balance`);
    }
    for (let i = 1; i < table.length; i += 1) {
      assert.ok(
        Number(table[i].withdrawal) >= Number(table[i - 1].withdrawal) || table[i].partial,
        `${c.id} year ${table[i].year} withdrawal decreased`
      );
    }
  }
  // Removing inflation never shortens the depletion (same P/W/r, i=3 vs i=0).
  const withInflation = run(DEPLETION({ returnRatePct: "5", inflationRatePct: "3" }));
  const withoutInflation = run(DEPLETION({ returnRatePct: "5", inflationRatePct: "0" }));
  assert.ok(withInflation.result.yearsUntilDepletion < withoutInflation.result.yearsUntilDepletion);
});

test("formatHundredths and normalizeEcho", () => {
  assert.equal(formatHundredths(0n), "0.00");
  assert.equal(formatHundredths(-5n), "-0.05");
  assert.equal(formatHundredths(100n), "1.00");
  assert.equal(formatHundredths(99999999999n), "999999999.99");
  assert.equal(normalizeEcho("1000000"), "1000000");
  assert.equal(normalizeEcho("50000.50"), "50000.5");
  assert.equal(normalizeEcho("-0"), "0");
  assert.equal(normalizeEcho("-0.00"), "0");
  assert.equal(normalizeEcho("0.5"), "0.5");
  assert.equal(normalizeEcho("007"), null);
  assert.equal(normalizeEcho("abc"), null);
});
