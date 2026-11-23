// Fixed-report tests for air-purifier-report.json.
//
// The expected literals below were derived from the SPEC independently
// of this implementation: the standard-bedroom result object (the
// SPEC's literal fixture) serialized with a separate canonicalizer
// (Python json, sorted keys, compact separators) applying the SPEC's
// rule — keys sorted recursively by UTF-16 code units, compact
// separators, exactly one trailing LF. The test fails if the
// implementation's serializer, key order, or result shape drifts in
// any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/air-purifier.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const standard = fixtures.cases.find((entry) => entry.id === "standard-bedroom");
assert.equal(standard.expected.ok, true);
const adequate = fixtures.cases.find((entry) => entry.id === "owned-adequate");
assert.equal(adequate.expected.ok, true);

const EXPECTED_TEXT =
  `{"ahamSuggestedRoomM2":17.9,"ahamSuggestedRoomSqft":192.2,"areaM2":15,"areaSqft":161.5,"ceilingFt":9.19,"owned":null,"requiredCadrCfm":124,"requiredCadrM3h":211,"targetAch":5,"volumeFt3":1483.2}` +
  "\n";

const EXPECTED_OWNED_TEXT =
  `{"ahamSuggestedRoomM2":17.9,"ahamSuggestedRoomSqft":192.2,"areaM2":15,"areaSqft":161.5,"ceilingFt":9.19,"owned":{"ach":8.1,"adequate":true,"ahamRoomM2":28.8,"ahamRoomSqft":310,"cadrCfm":200,"shortfallCfm":0},"requiredCadrCfm":124,"requiredCadrM3h":211,"targetAch":5,"volumeFt3":1483.2}` +
  "\n";

test("standard-bedroom report matches the independently derived literal byte for byte", () => {
  const report = buildReport(standard.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "air-purifier-report.json");
  assert.equal(REPORT_FILENAME, "air-purifier-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 195);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(standard.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("an owned-purifier result serializes with the same canonical key order", () => {
  const outcome = run(adequate.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_OWNED_TEXT);
  assert.equal(report.byteLength, 286);
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
  Object.defineProperty(withAccessor, "areaM2", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    areaM2: 15,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
