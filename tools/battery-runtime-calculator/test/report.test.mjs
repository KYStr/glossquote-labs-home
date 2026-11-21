// Report serialization tests: canonical compact JSON (object keys
// sorted by UTF-16 code units, recursively; array order preserved), one
// trailing LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT.
// Expected strings were written by hand from the SPEC's rule and the
// fixtures' literal results, never produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/battery-runtime-calculator.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const FIRST_REPORT =
  '{"energyWh":37,"mode":"runtime-mah","runtimeHours":3.7,"runtimeHoursPart":3,"runtimeMinutesPart":42,"runtimeTotalMinutes":222,"status":"ok","usableWh":37}\n';

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    createHash("sha256").update(FIRST_REPORT, "utf8").digest("hex"),
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    usableWh: 37,
    status: "ok",
    runtimeTotalMinutes: 222,
    runtimeMinutesPart: 42,
    runtimeHoursPart: 3,
    runtimeHours: 3.7,
    mode: "runtime-mah",
    energyWh: 37,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, FIRST_REPORT);
});

test("a solve report serializes with its own key set", () => {
  const solveCase = fixtures.cases.find((entry) => entry.id === "solve-phone");
  const serialized = serializeReport(solveCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"mode":"solve","requiredCapacityMah":13514,"requiredEnergyWh":50,"status":"ok"}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  // No battery result can legitimately reach the limit (at most 10
  // scalar fields), so the limit is exercised with a synthetic
  // oversized payload that still passes through the same serializer
  // path.
  const huge = "x".repeat(2097152);
  const serialized = serializeReport({ ...firstCase.expected.result, mode: huge });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
