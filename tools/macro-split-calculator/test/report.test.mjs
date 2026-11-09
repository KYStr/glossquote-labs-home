// Report tests: the fixed download macro-split-report.json is the result's
// compact JSON with object keys sorted ascending by UTF-16 code units
// (recursively), array order preserved, one trailing LF, UTF-8 no BOM.
// The expected byte strings below are hand-written literals derived from
// the fixture results and the SPEC's serialization rule, not produced by
// the product; their SHA-256 is computed from the literals in-test.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/macro.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const balancedExpected = fixtures.cases.find((entry) => entry.id === "balanced-2000").expected;
const mealsExpected = fixtures.cases.find((entry) => entry.id === "meals-three-split").expected;

const BALANCED_REPORT =
  '{"adjustedMacro":"carbs","calories":2000,"deltaKcal":-1,"impliedKcal":1999,' +
  '"macros":[{"grams":150,"id":"protein","kcal":600,"pct":30,"targetKcal":600},' +
  '{"grams":199,"id":"carbs","kcal":796,"pct":40,"targetKcal":800},' +
  '{"grams":67,"id":"fat","kcal":603,"pct":30,"targetKcal":600}],' +
  '"meals":null,"ratios":{"carbs":40,"fat":30,"protein":30}}\n';

const MEALS_REPORT =
  '{"adjustedMacro":null,"calories":2400,"deltaKcal":0,"impliedKcal":2400,' +
  '"macros":[{"grams":180,"id":"protein","kcal":720,"pct":30,"targetKcal":720},' +
  '{"grams":240,"id":"carbs","kcal":960,"pct":40,"targetKcal":960},' +
  '{"grams":80,"id":"fat","kcal":720,"pct":30,"targetKcal":720}],' +
  '"meals":{"count":3,"items":[' +
  '{"carbs":80,"fat":27,"index":1,"kcal":803,"protein":60},' +
  '{"carbs":80,"fat":27,"index":2,"kcal":803,"protein":60},' +
  '{"carbs":80,"fat":26,"index":3,"kcal":794,"protein":60}]},' +
  '"ratios":{"carbs":40,"fat":30,"protein":30}}\n';

test("balanced-2000 report bytes match the hand-written canonical literal", () => {
  const text = serializeReport(balancedExpected.result);
  assert.equal(text, BALANCED_REPORT);
  const digest = createHash("sha256").update(BALANCED_REPORT, "utf8").digest("hex");
  assert.equal(createHash("sha256").update(text, "utf8").digest("hex"), digest);
  assert.ok(text.endsWith("}\n"));
  assert.ok(!text.includes(" "));
});

test("meals-three-split report bytes match the hand-written canonical literal", () => {
  assert.equal(serializeReport(mealsExpected.result), MEALS_REPORT);
});

test("serialization is independent of the result's own key insertion order", () => {
  const result = run({
    calories: "2000",
    preset: "balanced",
    proteinPct: "",
    carbsPct: "",
    fatPct: "",
    meals: "",
  }).result;
  const scrambled = {
    ratios: { fat: 30, protein: 30, carbs: 40 },
    meals: null,
    macros: result.macros.map((macro) => ({
      targetKcal: macro.targetKcal,
      pct: macro.pct,
      kcal: macro.kcal,
      id: macro.id,
      grams: macro.grams,
    })),
    impliedKcal: result.impliedKcal,
    deltaKcal: result.deltaKcal,
    calories: result.calories,
    adjustedMacro: result.adjustedMacro,
  };
  assert.equal(serializeReport(scrambled), BALANCED_REPORT);
});

test("serialization never calls an input's toJSON", () => {
  const evil = {
    ...balancedExpected.result,
    toJSON() {
      throw new Error("toJSON must not be called");
    },
  };
  assert.equal(serializeReport(evil), BALANCED_REPORT);
});

test("a report over the 2,097,152-byte limit raises RangeError (OUTPUT_LIMIT)", () => {
  const oversized = { note: "x".repeat(2097152) };
  assert.throws(() => serializeReport(oversized), RangeError);
});
