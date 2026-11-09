// Report serialization tests: bytes and SHA-256 are checked against
// literal expectations written from the SPEC (compact JSON, object
// keys sorted by UTF-16 code units, array order unchanged, one
// trailing LF, UTF-8 without BOM), not from the serializer. Numbers
// print as JSON numbers: a one-decimal display value like 0.0 prints
// as 0 and 100.0 as 100.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run } from "../public/js/core/moon.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const epochResult = fixtures.cases.find(
  (entry) => entry.id === "reference-epoch",
).expected.result;

const EPOCH_TEXT =
  '{"ageDays":29.4,"daysToNextFullMoon":14.9,"daysToNextNewMoon":0.1,' +
  '"illuminationPercent":0,"julianDay":2451550,' +
  '"nextFullMoonDate":"2000-01-21","nextFullMoonDateLocal":"2000-01-21",' +
  '"nextNewMoonDate":"2000-01-06","nextNewMoonDateLocal":"2000-01-06",' +
  '"phaseEn":"New Moon","phaseIndex":0,"phaseZh":"新月"}\n';

test("reference-epoch report bytes are the pinned compact JSON with sorted keys and one LF", () => {
  const report = buildReport(epochResult);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "moon-phase-report.json");
  assert.equal(report.text, EPOCH_TEXT);
  const expectedBytes = new TextEncoder().encode(EPOCH_TEXT);
  assert.equal(report.byteLength, expectedBytes.byteLength);
  assert.equal(
    createHash("sha256").update(new TextEncoder().encode(report.text)).digest("hex"),
    createHash("sha256").update(expectedBytes).digest("hex"),
  );
  assert.ok(!report.text.startsWith("﻿"), "no BOM");
});

test("the report of a live run matches the same literal bytes", () => {
  const outcome = run({ date: "2000-01-06", utcOffset: "+08:00" });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EPOCH_TEXT);
});

test("a full-moon report prints 100 for a whole illumination", () => {
  const fullResult = fixtures.cases.find(
    (entry) => entry.id === "model-first-full",
  ).expected.result;
  const report = buildReport(fullResult);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    '{"ageDays":14.9,"daysToNextFullMoon":29.4,"daysToNextNewMoon":14.6,' +
      '"illuminationPercent":100,"julianDay":2451565,' +
      '"nextFullMoonDate":"2000-02-19","nextFullMoonDateLocal":"2000-02-20",' +
      '"nextNewMoonDate":"2000-02-05","nextNewMoonDateLocal":"2000-02-05",' +
      '"phaseEn":"Full Moon","phaseIndex":4,"phaseZh":"滿月"}\n',
  );
});

test("non-plain results are refused instead of serialized", () => {
  assert.equal(buildReport(null).ok, false);
  assert.equal(buildReport([1, 2, 3]).ok, false);
  assert.equal(buildReport("result").ok, false);
});

test("a result carrying a toJSON function is refused, never invoked", () => {
  let invoked = false;
  const hostile = {
    ...epochResult,
    toJSON() {
      invoked = true;
      return {};
    },
  };
  const report = buildReport(hostile);
  assert.equal(report.ok, false);
  assert.equal(invoked, false);
});
