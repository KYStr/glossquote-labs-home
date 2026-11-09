// Report tests for the Cabin Baggage Checker. The canonical-bytes
// expectation below is the SPEC-fixed report format: one JSON text per
// result, top-level and nested keys ordered by UTF-16 code units,
// numbers kept as their formatted strings, UTF-8 without BOM, one
// trailing LF. The exact-fit literal was derived by hand from the
// fixture's expected result; the fits-five-of-six digest (SHA-256
// fde806a4…, 1697 bytes including the trailing LF) was computed from
// the fixture's expected result with an independent JSON canonicalizer
// (jq -c -S) at authoring time, not from this implementation's output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildReport, run } from "../public/js/core/baggage.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const caseById = new Map(
  fixtures.cases.filter((entry) => entry.kind === "core").map((entry) => [entry.id, entry]),
);

const EXACT_FIT_REPORT =
  '{"airlines":[{"dimensionsPass":true,"id":"eva","limitCm":["56.0","36.0","23.0"],"marginsCm":["0.0","0.0","0.0"],"pass":true,"personal":{"marginsCm":["0.0","0.0","0.0"],"status":"pass"},"weight":{"checkedKg":"7.0","limitKg":"7.0","marginKg":"0.0","mode":"main","pass":true}},{"dimensionsPass":true,"id":"china-airlines","limitCm":["56.0","36.0","23.0"],"marginsCm":["0.0","0.0","0.0"],"pass":true,"personal":{"marginsCm":["0.0","0.0","5.0"],"status":"pass"},"weight":{"checkedKg":"7.0","limitKg":"7.0","marginKg":"0.0","mode":"main","pass":true}}],"bagSortedCm":["56.0","36.0","23.0"],"personalSortedCm":["40.0","30.0","10.0"],"summary":{"compared":2,"fits":2,"overallPass":true}}\n';

test("the exact-fit report matches the fixed canonical bytes", () => {
  const outcome = run(caseById.get("exact-fit").input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "cabin-baggage-report.json");
  assert.equal(report.text, EXACT_FIT_REPORT);
  assert.equal(Buffer.byteLength(report.text, "utf8"), 680);
  assert.equal(
    createHash("sha256").update(report.text, "utf8").digest("hex"),
    "1cba4023d12a177a54737ce5e1d52968e145b98a555b47a3c45ac94f1cbe5d42",
  );
});

test("the fits-five-of-six report matches the independently derived digest", () => {
  const outcome = run(caseById.get("fits-five-of-six").input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(Buffer.byteLength(report.text, "utf8"), 1697);
  assert.equal(
    createHash("sha256").update(report.text, "utf8").digest("hex"),
    "fde806a40c935d64ce3d5fd885f989aedf1114425d77d3271e5c9a0e4169bb9a",
  );
});

test("the report is UTF-8 without BOM and ends with exactly one LF", () => {
  const outcome = run(caseById.get("unsorted-dimensions").input);
  const report = buildReport(outcome.result);
  const bytes = Buffer.from(report.text, "utf8");
  assert.notEqual(bytes[0], 0xef);
  assert.equal(report.text.endsWith("}\n"), true);
  assert.equal(report.text.endsWith("\n\n"), false);
});

test("buildReport refuses values it cannot serialize as a report", () => {
  for (const bad of [null, 42, "x", []]) {
    const report = buildReport(bad);
    assert.equal(report.ok, false, String(bad));
    assert.deepEqual(report.error, { code: "INTERNAL", field: null, row: null });
  }
});
