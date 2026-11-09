// Report serialization tests: bytes and SHA-256 are checked against
// literal expectations written from the SPEC (compact JSON, object keys
// sorted by UTF-16 code units, array order unchanged, one trailing LF,
// UTF-8 without BOM), not from the serializer.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run } from "../public/js/core/protein.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const strengthResult = fixtures.cases.find(
  (entry) => entry.id === "strength-example",
).expected.result;

test("strength-example report bytes are the pinned compact JSON with sorted keys and one LF", () => {
  const report = buildReport(strengthResult);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "protein-intake-report.json");
  const expectedText =
    '{"dailyGrams":112,"factor":"1.6","highGrams":126,"lowGrams":98,"meals":4,"perMealGrams":[28,28,28,28]}\n';
  assert.equal(report.text, expectedText);
  const expectedBytes = new TextEncoder().encode(expectedText);
  assert.equal(report.byteLength, expectedBytes.byteLength);
  assert.equal(
    createHash("sha256").update(new TextEncoder().encode(report.text)).digest("hex"),
    createHash("sha256").update(expectedBytes).digest("hex"),
  );
  assert.ok(!report.text.startsWith("﻿"), "no BOM");
});

test("the report of a live run matches the same literal bytes", () => {
  const outcome = run({ weight: "70", goal: "strength-training", customFactor: "", meals: "4" });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    '{"dailyGrams":112,"factor":"1.6","highGrams":126,"lowGrams":98,"meals":4,"perMealGrams":[28,28,28,28]}\n',
  );
});

test("min-weight report keeps the array order and the one-decimal factor string", () => {
  const minResult = fixtures.cases.find(
    (entry) => entry.id === "min-weight-boundary",
  ).expected.result;
  const report = buildReport(minResult);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    '{"dailyGrams":20,"factor":"1.0","highGrams":24,"lowGrams":16,"meals":3,"perMealGrams":[7,7,6]}\n',
  );
});

test("non-plain results are refused instead of serialized", () => {
  assert.equal(buildReport(null).ok, false);
  assert.equal(buildReport([1, 2, 3]).ok, false);
  assert.equal(buildReport("result").ok, false);
});
