// Fixed-report tests for cocktail-abv-report.json.
//
// The expected literal below was derived from the SPEC independently
// of this implementation: the classic-margarita result object (the
// SPEC's literal fixture) serialized with the SPEC's rule — keys
// sorted recursively by UTF-16 code units, compact separators,
// exactly one trailing LF — using JavaScript's JSON number
// formatting, in which an integral value renders without a decimal
// point (18, not 18.0; JSON numbers 18 and 18.0 denote the same
// value). The test fails if the implementation's serializer, key
// order, or result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/cocktail-abv.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const margarita = fixtures.cases.find((entry) => entry.id === "classic-margarita");
assert.equal(margarita.expected.ok, true);

const EXPECTED_TEXT =
  `{"rows":[{"abvPct":40,"alcoholG":14.2,"alcoholMl":18,"name":"龍舌蘭","row":1,"volumeMl":45},{"abvPct":40,"alcoholG":4.7,"alcoholMl":6,"name":"橙酒","row":2,"volumeMl":15},{"abvPct":0,"alcoholG":0,"alcoholMl":0,"name":"萊姆汁","row":3,"volumeMl":30}],"standardDrinks":1.9,"totalAbvPct":26.7,"totalAlcoholG":18.9,"totalAlcoholMl":24,"totalVolumeMl":90}` +
  "\n";

test("classic-margarita report matches the independently derived literal byte for byte", () => {
  const report = buildReport(margarita.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "cocktail-abv-report.json");
  assert.equal(REPORT_FILENAME, "cocktail-abv-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 359);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(margarita.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a negroni result serializes with the same canonical key order", () => {
  const outcome = run({
    ingredients: [
      { name: "琴酒", volumeMl: "30", abvPct: "40" },
      { name: "金巴利", volumeMl: "30", abvPct: "25" },
      { name: "甜苦艾酒", volumeMl: "30", abvPct: "16" },
    ],
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"rows":[{"abvPct":40,"alcoholG":9.5,"alcoholMl":12,"name":"琴酒","row":1,"volumeMl":30},{"abvPct":25,"alcoholG":5.9,"alcoholMl":7.5,"name":"金巴利","row":2,"volumeMl":30},{"abvPct":16,"alcoholG":3.8,"alcoholMl":4.8,"name":"甜苦艾酒","row":3,"volumeMl":30}],"standardDrinks":1.9,"totalAbvPct":27,"totalAlcoholG":19.2,"totalAlcoholMl":24.3,"totalVolumeMl":90}\n`,
  );
  assert.equal(report.byteLength, 368);
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
  Object.defineProperty(withAccessor, "rows", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    rows: [],
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
