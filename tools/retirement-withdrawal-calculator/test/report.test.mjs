// Report serialization: byte-exact expectations written literally here
// (sorted keys, compact JSON, one trailing LF), hashed independently.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run, stableStringify } from "../public/js/core/core.mjs";

test("report bytes for the four-percent no-current case are exact", () => {
  const { result } = run({ mode: "four-percent", annualSpending: "480000", currentPortfolio: "" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  const expectedText =
    '{"annualSpending":"480000.00","currentPortfolio":null,"impliedWithdrawalRatePct":null,"meetsRule":null,"mode":"four-percent","shortfall":null,"targetPortfolio":"12000000.00"}\n';
  assert.equal(report.text, expectedText);
  const expectedHash = createHash("sha256").update(expectedText, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(report.bytes).digest("hex");
  assert.equal(actualHash, expectedHash);
  // UTF-8 without BOM: first byte is '{'.
  assert.equal(report.bytes[0], 0x7b);
});

test("report bytes for the never-depletes case are exact", () => {
  const { result } = run({
    mode: "depletion",
    portfolioValue: "1000000",
    annualWithdrawal: "0",
    returnRatePct: "5",
    inflationRatePct: "2",
  });
  const report = buildReport(result);
  assert.equal(
    report.text,
    '{"depletionStatus":"never","finalPartialWithdrawal":"0.00","fullYears":0,"mode":"depletion","partialYearFraction":"0.00","yearlyTable":[],"yearsUntilDepletion":null}\n'
  );
});

test("report sorts keys recursively and preserves array order", () => {
  const text = stableStringify({ b: [{ d: 1, a: 2 }, { c: 3 }], a: "x" });
  assert.equal(text, '{"a":"x","b":[{"a":2,"d":1},{"c":3}]}');
});
