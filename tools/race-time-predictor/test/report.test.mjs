// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/race.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];

const EXPECTED_REPORT =
  '{"knownDistanceM":10000,"knownPaceSecPerKm":240,"knownTimeSeconds":2400,"predictions":[' +
  '{"distanceM":5000,"key":"5k","paceSecPerKm":230.2,"predictedSeconds":1151},' +
  '{"distanceM":10000,"key":"10k","paceSecPerKm":240,"predictedSeconds":2400},' +
  '{"distanceM":21097.5,"key":"half","paceSecPerKm":251,"predictedSeconds":5295},' +
  '{"distanceM":42195,"key":"marathon","paceSecPerKm":261.7,"predictedSeconds":11040}]}\n';

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
});

test("a custom row serializes last with its key and decimal distance intact", () => {
  const customCase = fixtures.cases.find((entry) => entry.id === "half-with-custom-target");
  const serialized = serializeReport(customCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"knownDistanceM":21097.5,"knownPaceSecPerKm":298.6,"knownTimeSeconds":6300,"predictions":[' +
      '{"distanceM":5000,"key":"5k","paceSecPerKm":273.9,"predictedSeconds":1370},' +
      '{"distanceM":10000,"key":"10k","paceSecPerKm":285.5,"predictedSeconds":2855},' +
      '{"distanceM":21097.5,"key":"half","paceSecPerKm":298.6,"predictedSeconds":6300},' +
      '{"distanceM":42195,"key":"marathon","paceSecPerKm":311.3,"predictedSeconds":13135},' +
      '{"distanceM":30000,"key":"custom","paceSecPerKm":305,"predictedSeconds":9150}]}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    predictions: [
      { predictedSeconds: 1151, paceSecPerKm: 230.2, key: "5k", distanceM: 5000 },
      { predictedSeconds: 2400, paceSecPerKm: 240, key: "10k", distanceM: 10000 },
      { predictedSeconds: 5295, paceSecPerKm: 251, key: "half", distanceM: 21097.5 },
      { predictedSeconds: 11040, paceSecPerKm: 261.7, key: "marathon", distanceM: 42195 },
    ],
    knownTimeSeconds: 2400,
    knownPaceSecPerKm: 240,
    knownDistanceM: 10000,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const predictions = [];
  for (let i = 0; i < 100000; i += 1) {
    predictions.push({ key: "custom", distanceM: 42195, predictedSeconds: 11040, paceSecPerKm: 261.7 });
  }
  const serialized = serializeReport({
    knownDistanceM: 10000,
    knownTimeSeconds: 2400,
    knownPaceSecPerKm: 240,
    predictions,
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
