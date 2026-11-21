// Report tests: the downloaded report for the default fixture is
// asserted byte-for-byte, key order is independent of the result
// object's insertion order, and the report cap backstop fires instead
// of producing an over-limit artifact. Expected bytes were derived
// from the literal fixture values, not from the implementation.

import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_BYTE_LIMIT, run, serializeReport } from "../public/js/core/pet-feeding.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const defaultCase = fixtures.cases.find((entry) => entry.id === "dog-neutered-default");

test("report bytes for dog-neutered-default are exact", () => {
  const outcome = run(defaultCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"cupsPerDay":null,"derKcal":630,"gramsPerDay":175,"lifeStage":"adult-neutered","mealsPerDay":2,"multiplier":1.6,"perMealCups":null,"perMealGrams":[88,87],"perMealKcal":[315,315],"rerKcal":394,"species":"dog"}\n',
  );
  assert.equal(serialized.bytes, Buffer.byteLength(serialized.text, "utf8"));
});

test("report bytes for a cups case are exact", () => {
  const cupCase = fixtures.cases.find((entry) => entry.id === "dog-intact-cups");
  const outcome = run(cupCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(
    serialized.text,
    '{"cupsPerDay":2.84,"derKcal":1192,"gramsPerDay":314,"lifeStage":"adult-intact","mealsPerDay":2,"multiplier":1.8,"perMealCups":[1.42,1.42],"perMealGrams":[157,157],"perMealKcal":[596,596],"rerKcal":662,"species":"dog"}\n',
  );
});

test("serialization is independent of the result object's key order", () => {
  const outcome = run(defaultCase.input);
  const reordered = {
    species: outcome.result.species,
    rerKcal: outcome.result.rerKcal,
    perMealKcal: outcome.result.perMealKcal,
    multiplier: outcome.result.multiplier,
    mealsPerDay: outcome.result.mealsPerDay,
    lifeStage: outcome.result.lifeStage,
    gramsPerDay: outcome.result.gramsPerDay,
    derKcal: outcome.result.derKcal,
    cupsPerDay: outcome.result.cupsPerDay,
    perMealCups: outcome.result.perMealCups,
    perMealGrams: outcome.result.perMealGrams,
  };
  assert.equal(
    serializeReport(reordered).text,
    serializeReport(outcome.result).text,
  );
});

test("an over-limit report is OUTPUT_LIMIT, not a success", () => {
  const oversized = { ...run(defaultCase.input).result, species: "x".repeat(REPORT_BYTE_LIMIT) };
  const serialized = serializeReport(oversized);
  assert.equal(serialized.ok, false);
  assert.deepEqual(serialized.error, { code: "OUTPUT_LIMIT", field: null, row: null });
  assert.equal(serialized.text, undefined);
});
