// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/lighting-lumen.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const livingBasic = fixtures.cases.find((entry) => entry.id === "living-dimensions-basic");
const studyPing = fixtures.cases.find((entry) => entry.id === "study-ping-area");
const corridorPingMin = fixtures.cases.find((entry) => entry.id === "corridor-ping-min");

const EXPECTED_LIVING_BASIC =
  '{"achievedLux":114.3,"areaM2":14,"bulbCount":2,"installedLumens":1600,"targetLux":100,"totalLumens":1400}\n';
const EXPECTED_STUDY_PING =
  '{"achievedLux":322.7,"areaM2":19.83,"bulbCount":4,"installedLumens":6400,"targetLux":300,"totalLumens":5950}\n';
const EXPECTED_CORRIDOR_PING_MIN =
  '{"achievedLux":3025,"areaM2":0.26,"bulbCount":1,"installedLumens":800,"targetLux":100,"totalLumens":26}\n';

test("the living-dimensions-basic report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(livingBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_LIVING_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(livingBasic.expected.result).text, EXPECTED_LIVING_BASIC);
  assert.equal(serializeReport(studyPing.expected.result).text, EXPECTED_STUDY_PING);
  assert.equal(serializeReport(corridorPingMin.expected.result).text, EXPECTED_CORRIDOR_PING_MIN);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    totalLumens: 1400,
    targetLux: 100,
    installedLumens: 1600,
    bulbCount: 2,
    areaM2: 14,
    achievedLux: 114.3,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_LIVING_BASIC);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    areaM2: 14,
    targetLux: 100,
    totalLumens: 1400,
    bulbCount: 2,
    installedLumens: 1600,
    achievedLux: 114.3,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
