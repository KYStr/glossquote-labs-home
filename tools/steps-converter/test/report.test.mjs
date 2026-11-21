// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, the SPEC-pinned SHA-256 for the height-basic report,
// and the 2,097,152-byte OUTPUT_LIMIT. Expected strings were written by
// hand from the SPEC's rule and the fixtures' literal results, never
// produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/steps.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];

// Pinned by the SPEC's tests section: 74 bytes, SHA-256
// 4489db044b31e62ef7cd6ee2748de127590b4788d0f641feb2ad3c274939fdcd.
const EXPECTED_REPORT = '{"caloriesKcal":null,"distanceKm":7.04,"stepsPerKm":1421,"strideCm":70.4}\n';
const EXPECTED_REPORT_SHA256 =
  "4489db044b31e62ef7cd6ee2748de127590b4788d0f641feb2ad3c274939fdcd";

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
  assert.equal(serialized.bytes, 74);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    EXPECTED_REPORT_SHA256,
  );
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
});

test("a calorie result serializes with its integer calories and no trailing zeros", () => {
  const caloriesCase = fixtures.cases.find((entry) => entry.id === "calories-from-height");
  const serialized = serializeReport(caloriesCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"caloriesKcal":246,"distanceKm":5.46,"stepsPerKm":1464,"strideCm":68.3}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    strideCm: 70.4,
    stepsPerKm: 1421,
    distanceKm: 7.04,
    caloriesKcal: null,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({
    caloriesKcal: null,
    distanceKm: 7.04,
    stepsPerKm: 1421,
    strideCm: 70.4,
    note: "x".repeat(3000000),
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
