// Report tests: the fixed dice-roller-report.json serialization.
// Expected bytes are literal strings (never produced by the product
// code under test); the SHA-256 is computed with node:crypto over the
// literal text.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { REPORT_FILENAME, run, serializeReport } from "../public/js/core/dice-roller.mjs";

test("report filename is fixed", () => {
  assert.equal(REPORT_FILENAME, "dice-roller-report.json");
});

test("example report: canonical key order, compact JSON, one trailing LF", () => {
  const outcome = run({ notation: "2d6", seed: "42" });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  const expectedText =
    '{"count":2,"expression":"2d6","modifier":0,"rolls":[4,3],"seed":42,"sides":6,"sum":7,"total":7}\n';
  assert.equal(serialized.text, expectedText);
  assert.equal(serialized.bytes, Buffer.byteLength(expectedText, "utf8"));
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    createHash("sha256").update(expectedText, "utf8").digest("hex"),
  );
});

test("report with a modifier keeps the same canonical order", () => {
  const outcome = run({ notation: "2d6+3", seed: "42" });
  const serialized = serializeReport(outcome.result);
  assert.equal(
    serialized.text,
    '{"count":2,"expression":"2d6+3","modifier":3,"rolls":[4,3],"seed":42,"sides":6,"sum":7,"total":10}\n',
  );
});

test("report round-trips: parsing the bytes gives back the result", () => {
  const outcome = run({ notation: "100d1000+10000", seed: "4294967295" });
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.deepEqual(JSON.parse(serialized.text), outcome.result);
  assert.equal(serialized.bytes < 2097152, true);
});

test("oversized report is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    expression: "100d1000",
    count: 100,
    sides: 1000,
    modifier: 0,
    seed: 1,
    rolls: Array.from({ length: 500000 }, () => 1000),
    sum: 500000000,
    total: 500000000,
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
