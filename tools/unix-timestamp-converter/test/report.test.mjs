// Report tests. The fixed download is unix-timestamp-report.json:
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The expected bytes below are hand-written from
// the SPEC's serialization rule and the epoch-zero fixture result —
// they are not produced by the implementation under test.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildReport, run } from "../public/js/core/unix-timestamp.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const epochResult = fixtures.cases.find(
  (entry) => entry.id === "epoch-zero",
).expected.result;

// Hand-written canonical serialization of the epoch-zero result:
// keys sorted recursively (ambiguousLocalTime, direction, displays,
// timestampMs, timestampSeconds, unitDetected; inside each display:
// custom, iso8601, rfc2822, zone), compact, one trailing LF.
const EXPECTED_EPOCH_REPORT =
  `{"ambiguousLocalTime":false,"direction":"timestamp-to-datetime","displays":[` +
  `{"custom":null,"iso8601":"1970-01-01T00:00:00.000Z","rfc2822":"Thu, 01 Jan 1970 00:00:00 +0000","zone":"UTC"},` +
  `{"custom":null,"iso8601":"1970-01-01T08:00:00.000+08:00","rfc2822":"Thu, 01 Jan 1970 08:00:00 +0800","zone":"Asia/Taipei"}],` +
  `"timestampMs":0,"timestampSeconds":0,"unitDetected":"seconds"}\n`;

test("the epoch-zero report is the hand-written canonical bytes", () => {
  const report = buildReport(epochResult);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "unix-timestamp-report.json");
  assert.equal(report.text, EXPECTED_EPOCH_REPORT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_EPOCH_REPORT, "utf8"));
  assert.equal(report.text.endsWith("\n"), true);
  assert.equal(report.text.endsWith("\n\n"), false);
});

test("the report matches the live core result for every core fixture", () => {
  for (const fixture of fixtures.cases.filter((entry) => entry.kind === "core")) {
    const outcome = run(fixture.input);
    if (!fixture.expected.ok) continue;
    assert.deepEqual(outcome, { ok: true, result: fixture.expected.result });
    const report = buildReport(outcome.result);
    assert.equal(report.ok, true);
    // Independent canonicalization: JSON round-trip with a
    // recursively key-sorted stringify written here in the test.
    const sorted = (value) => {
      if (value === null || typeof value !== "object") return JSON.stringify(value);
      if (Array.isArray(value)) return `[${value.map(sorted).join(",")}]`;
      const keys = Object.keys(value).sort();
      return `{${keys.map((key) => `${JSON.stringify(key)}:${sorted(value[key])}`).join(",")}}`;
    };
    assert.equal(report.text, `${sorted(outcome.result)}\n`);
  }
});

test("the serializer never calls a value's toJSON", () => {
  let called = false;
  const hostile = {
    direction: "timestamp-to-datetime",
    timestampSeconds: 0,
    timestampMs: 0,
    unitDetected: "seconds",
    ambiguousLocalTime: false,
    displays: [],
  };
  Object.defineProperty(hostile, "toJSON", {
    enumerable: true,
    value: () => {
      called = true;
      return "hijacked";
    },
  });
  // A function value is not a plain report shape, so the build fails
  // closed — but the toJSON must never have run.
  const report = buildReport(hostile);
  assert.equal(called, false);
  assert.equal(report.ok, false);
  assert.deepEqual(report.error, { code: "INTERNAL", field: null, row: null });
});

test("an oversized report is OUTPUT_LIMIT and a non-object is INTERNAL", () => {
  const huge = { ...epochResult, displays: [{ zone: "X".repeat(3000000) }] };
  const report = buildReport(huge);
  assert.equal(report.ok, false);
  assert.deepEqual(report.error, { code: "OUTPUT_LIMIT", field: null, row: null });
  assert.deepEqual(buildReport(null), {
    ok: false,
    error: { code: "INTERNAL", field: null, row: null },
  });
  assert.deepEqual(buildReport("not an object"), {
    ok: false,
    error: { code: "INTERNAL", field: null, row: null },
  });
});
