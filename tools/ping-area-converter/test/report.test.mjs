// Fixed-report tests for ping-area-report.json.
//
// The expected literal below is the SPEC's own pinned report bytes
// (SPEC tests section): the example-thirty-ping {input, result}
// serialized canonically — keys sorted recursively by UTF-16 code
// units, compact separators, exactly one trailing LF — 99 bytes,
// SHA-256 2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20.
// The test fails if the implementation's serializer, key order, or
// number formatting drifts in any byte.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/ping-area.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const example = fixtures.cases.find((entry) => entry.id === "example-thirty-ping");
assert.equal(example.expected.ok, true);

const EXPECTED_TEXT =
  `{"input":{"amount":"30","unit":"ping"},"result":{"ft2":1067.5,"m2":99.17,"ping":30,"tatami":61.2}}` +
  "\n";
const EXPECTED_SHA256 = "2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20";

test("example report matches the SPEC-pinned literal byte for byte", () => {
  const report = buildReport(example.input, example.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "ping-area-report.json");
  assert.equal(REPORT_FILENAME, "ping-area-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 99);
  assert.equal(
    createHash("sha256").update(EXPECTED_TEXT, "utf8").digest("hex"),
    EXPECTED_SHA256,
  );
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(example.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(example.input, outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("the report carries the raw input strings of the snapshot", () => {
  const outcome = run({ amount: "0.5", unit: "ping" });
  assert.equal(outcome.ok, true);
  const report = buildReport({ amount: "0.5", unit: "ping" }, outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"input":{"amount":"0.5","unit":"ping"},"result":{"ft2":17.79,"m2":1.65,"ping":0.5,"tatami":1}}\n`,
  );
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("non-plain report inputs are refused", () => {
  const result = example.expected.result;
  for (const badInput of [null, [], "x", 42, { amount: "30" }, { amount: "30", unit: "ping", extra: 1 }]) {
    assert.equal(buildReport(badInput, result).ok, false);
  }
  for (const badResult of [null, [], "x", 42]) {
    assert.equal(buildReport(example.input, badResult).ok, false);
  }
  const withAccessor = {};
  Object.defineProperty(withAccessor, "ping", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(example.input, withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    ping: 30,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(example.input, withToJSON);
  assert.equal(toJsonCalled, false);
});
