// Fixed-report tests for debt-payoff-plan.json.
//
// The expected literal below was derived from the SPEC independently
// of this implementation: the snowball-vs-avalanche result object
// (the SPEC's literal fixture) serialized with a separate
// canonicalizer (Python json, sorted keys, compact separators)
// applying the SPEC's rule — keys sorted recursively by UTF-16 code
// units, compact separators, exactly one trailing LF. The test fails
// if the implementation's serializer, key order, or result shape
// drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/debt-payoff-planner.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const showcase = fixtures.cases.find((entry) => entry.id === "snowball-vs-avalanche");
assert.equal(showcase.expected.ok, true);

const EXPECTED_TEXT =
  `{"comparison":{"fewerMonthsStrategy":"tie","interestDifferenceCents":440,"lowerInterestStrategy":"avalanche","monthsDifference":0},"extraMonthlyCents":10000,"strategies":{"avalanche":{"monthly":[{"interestCents":2250,"month":1,"paidCents":27500,"remainingCents":184750},{"interestCents":1896,"month":2,"paidCents":27500,"remainingCents":159146},{"interestCents":1536,"month":3,"paidCents":27500,"remainingCents":133182},{"interestCents":1169,"month":4,"paidCents":27500,"remainingCents":106851},{"interestCents":797,"month":5,"paidCents":27500,"remainingCents":80148},{"interestCents":477,"month":6,"paidCents":27500,"remainingCents":53125},{"interestCents":266,"month":7,"paidCents":27500,"remainingCents":25891},{"interestCents":129,"month":8,"paidCents":26020,"remainingCents":0}],"monthsSimulated":8,"monthsToDebtFree":8,"order":["Store Card","Credit Card","Personal Loan"],"payoffMonth":{"Credit Card":6,"Personal Loan":8,"Store Card":5},"payoffOrder":["Store Card","Credit Card","Personal Loan"],"status":"debt-free","totalInterestCents":8520,"totalPaidCents":218520},"snowball":{"monthly":[{"interestCents":2250,"month":1,"paidCents":27500,"remainingCents":184750},{"interestCents":1946,"month":2,"paidCents":27500,"remainingCents":159196},{"interestCents":1638,"month":3,"paidCents":27500,"remainingCents":133334},{"interestCents":1292,"month":4,"paidCents":27500,"remainingCents":107126},{"interestCents":911,"month":5,"paidCents":27500,"remainingCents":80537},{"interestCents":523,"month":6,"paidCents":27500,"remainingCents":53560},{"interestCents":268,"month":7,"paidCents":27500,"remainingCents":26328},{"interestCents":132,"month":8,"paidCents":26460,"remainingCents":0}],"monthsSimulated":8,"monthsToDebtFree":8,"order":["Credit Card","Store Card","Personal Loan"],"payoffMonth":{"Credit Card":3,"Personal Loan":8,"Store Card":6},"payoffOrder":["Credit Card","Store Card","Personal Loan"],"status":"debt-free","totalInterestCents":8960,"totalPaidCents":218960}},"totalInitialCents":210000}` +
  "\n";

test("showcase report matches the independently derived literal byte for byte", () => {
  const report = buildReport(showcase.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "debt-payoff-plan.json");
  assert.equal(REPORT_FILENAME, "debt-payoff-plan.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 2005);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(showcase.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a not-debt-free result serializes with null comparison fields", () => {
  const outcome = run({
    debts: [{ name: "Card", balance: "5000.00", apr: "12.00", minimum: "50.00" }],
    extraMonthly: "0.00",
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.ok(report.text.includes('"lowerInterestStrategy":null'));
  assert.ok(report.text.includes('"monthsToDebtFree":null'));
  assert.ok(report.text.includes('"status":"not-debt-free"'));
  assert.equal(report.text.slice(0, 1), "{");
  assert.ok(report.text.endsWith("}\n"));
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("non-plain report inputs are refused", () => {
  // The SPEC pins the report bytes and the OUTPUT_LIMIT failure, not
  // an error code for a non-result input; the house pattern refuses
  // every non-plain input without serializing it (and never invokes
  // an accessor or the input's toJSON).
  for (const bad of [null, [], "x", 42]) {
    assert.equal(buildReport(bad).ok, false);
  }
  const withAccessor = {};
  Object.defineProperty(withAccessor, "totalInitialCents", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    totalInitialCents: 210000,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
