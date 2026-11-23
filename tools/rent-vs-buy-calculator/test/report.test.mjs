// Fixed-report tests for rent-vs-buy-report.json.
//
// The expected literal below was derived from the SPEC independently
// of this implementation: the zero-rate-zero-growth result object
// (the SPEC's literal fixture, hand-verified in AUTHOR-CHECK.md)
// serialized with a separate canonicalizer applying the SPEC's rule
// — keys sorted recursively by UTF-16 code units, compact
// separators, exactly one trailing LF. The test fails if the
// implementation's serializer, key order, or result shape drifts in
// any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/rent-vs-buy.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const zeroRate = fixtures.cases.find((entry) => entry.id === "zero-rate-zero-growth");
assert.equal(zeroRate.expected.ok, true);

const EXPECTED_TEXT =
  `{"breakevenYear":1,"monthlyPayment":26667,"savingsAtHorizon":360000,"totalBuyNetCost":0,"totalRentCost":360000,"verdict":"buy","yearly":[` +
  `{"balance":639996,"buyCumulative":0,"difference":120000,"equity":560004,"homeValue":1200000,"mortgageYear":320004,"opportunityCost":0,"rentCumulative":120000,"rentYear":120000,"year":1},` +
  `{"balance":319992,"buyCumulative":0,"difference":240000,"equity":880008,"homeValue":1200000,"mortgageYear":320004,"opportunityCost":0,"rentCumulative":240000,"rentYear":120000,"year":2},` +
  `{"balance":0,"buyCumulative":0,"difference":360000,"equity":1200000,"homeValue":1200000,"mortgageYear":319992,"opportunityCost":0,"rentCumulative":360000,"rentYear":120000,"year":3}]}` +
  "\n";

test("zero-rate-zero-growth report matches the independently derived literal byte for byte", () => {
  const report = buildReport(zeroRate.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "rent-vs-buy-report.json");
  assert.equal(REPORT_FILENAME, "rent-vs-buy-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(zeroRate.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a rent-wins result serializes with the same canonical key order", () => {
  const outcome = run({
    monthlyRent: "20000",
    homePrice: "12000000",
    downPayment: "2400000",
    mortgageRate: "5",
    years: "1",
    rentGrowthPct: "1",
    homeAppreciationPct: "0",
    opportunityCostPct: "5",
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.ok(report.text.startsWith('{"breakevenYear":null,'));
  assert.ok(report.text.includes('"verdict":"rent"'));
  assert.ok(report.text.endsWith("}\n"));
  // Keys are sorted recursively: breakevenYear first, yearly last.
  assert.ok(report.text.indexOf('"breakevenYear"') < report.text.indexOf('"monthlyPayment"'));
  assert.ok(report.text.indexOf('"verdict"') < report.text.indexOf('"yearly"'));
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
  Object.defineProperty(withAccessor, "monthlyPayment", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    monthlyPayment: 26667,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
