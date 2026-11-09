// Report tests: the fixed download serialization (canonical compact JSON,
// keys sorted by UTF-16 code units recursively, one trailing LF, UTF-8 no
// BOM) verified against an independently written literal, plus the
// OUTPUT_LIMIT branch. The weekday-basic result comes from the SPEC's
// fixtures.json (vendored verbatim at test/fixtures.json).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport, REPORT_FILENAME } from "../public/js/core/overtime.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const weekdayBasic = fixtures.cases.find((entry) => entry.id === "weekday-basic");

// Hand-written canonical form of the weekday-basic result: keys sorted
// (capNote, countedOtHours, dailyWageTwd, holiday, hourlyRateTwd, restDay,
// totalPayTwd, weekday), nested keys sorted the same way, one trailing LF.
const EXPECTED_TEXT =
  '{"capNote":false,"countedOtHours":3,"dailyWageTwd":"1200.00",' +
  '"holiday":{"bands":[],"dayPayApplied":false,"extraHours":0,"hours":0,"payTwd":0},' +
  '"hourlyRateTwd":"150.00","restDay":{"bands":[],"hours":0,"payTwd":0},' +
  '"totalPayTwd":650,"weekday":{"bands":[{"hours":2,"multiplier":"4/3"},' +
  '{"hours":1,"multiplier":"5/3"}],"hours":3,"payTwd":650}}\n';

test("report filename is the SPEC-pinned fixed name", () => {
  assert.equal(REPORT_FILENAME, "overtime-pay-report.json");
});

test("weekday-basic report matches the canonical literal byte for byte", () => {
  const outcome = run(weekdayBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
  assert.equal(serialized.bytes, new TextEncoder().encode(EXPECTED_TEXT).length);
  assert.equal(
    createHash("sha256").update(EXPECTED_TEXT, "utf8").digest("hex"),
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
  );
  assert.ok(!serialized.text.startsWith("﻿"), "no BOM");
  assert.ok(serialized.text.endsWith("}\n") && !serialized.text.endsWith("\n\n"), "exactly one trailing LF");
});

test("every successful fixture result serializes under the limit", () => {
  for (const entry of fixtures.cases) {
    if (entry.kind !== "core" || !entry.expected.ok) continue;
    const serialized = serializeReport(entry.expected.result);
    assert.equal(serialized.ok, true, entry.id);
    assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length, entry.id);
  }
});

test("an over-limit payload is OUTPUT_LIMIT and produces no artifact", () => {
  const huge = { note: "x".repeat(2_100_000) };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
