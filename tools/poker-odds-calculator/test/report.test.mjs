// Fixed-report tests for poker-odds-calculator-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the flush-draw-flop and river-equity-call
// result objects (the SPEC's literal fixtures) serialized with a
// separate canonicalizer (Python json, sorted keys, compact
// separators) applying the SPEC's rule — keys sorted recursively by
// UTF-16 code units, compact separators, exactly one trailing LF.
// The test fails if the implementation's serializer, key order, or
// result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/poker-odds.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const flushDraw = fixtures.cases.find((entry) => entry.id === "flush-draw-flop");
assert.equal(flushDraw.expected.ok, true);
const riverCall = fixtures.cases.find((entry) => entry.id === "river-equity-call");
assert.equal(riverCall.expected.ok, true);

const EXPECTED_FLUSH_DRAW_TEXT =
  `{"approxNextPct":18,"approxTwoCardPct":36,"breakEvenPct":null,"cardsToCome":2,"currentCategory":"high-card","currentCategoryRank":1,"equityPct":"72.68","finalHandDistribution":{"flush":"34.88","four-of-a-kind":"0.00","full-house":"0.00","high-card":"22.48","pair":"33.30","straight":"0.83","straight-flush":"0.09","three-of-a-kind":"1.20","two-pair":"7.22"},"hint":null,"hitNextPct":"19.15","hitTwoCardPct":"34.97","lossPct":"26.96","losses":288487,"method":"exact","outs":9,"potOddsRatio":null,"remainingCards":47,"scenarios":1070190,"tiePct":"0.72","ties":7714,"winPct":"72.32","wins":773989}` +
  "\n";

const EXPECTED_RIVER_CALL_TEXT =
  `{"approxNextPct":null,"approxTwoCardPct":null,"breakEvenPct":"25.00","cardsToCome":0,"currentCategory":"pair","currentCategoryRank":2,"equityPct":"89.34","finalHandDistribution":{"flush":"0.00","four-of-a-kind":"0.00","full-house":"0.00","high-card":"0.00","pair":"100.00","straight":"0.00","straight-flush":"0.00","three-of-a-kind":"0.00","two-pair":"0.00"},"hint":"call","hitNextPct":null,"hitTwoCardPct":null,"lossPct":"10.61","losses":105,"method":"exact","outs":0,"potOddsRatio":"3:1","remainingCards":45,"scenarios":990,"tiePct":"0.10","ties":1,"winPct":"89.29","wins":884}` +
  "\n";

test("flush-draw-flop report matches the independently derived literal byte for byte", () => {
  const report = buildReport(flushDraw.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "poker-odds-calculator-report.json");
  assert.equal(REPORT_FILENAME, "poker-odds-calculator-report.json");
  assert.equal(report.text, EXPECTED_FLUSH_DRAW_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_FLUSH_DRAW_TEXT, "utf8"));
  assert.equal(report.byteLength, 595);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(flushDraw.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_FLUSH_DRAW_TEXT);
});

test("a river call result serializes with the same canonical key order", () => {
  const report = buildReport(riverCall.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_RIVER_CALL_TEXT);
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
  Object.defineProperty(withAccessor, "wins", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    wins: 884,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
