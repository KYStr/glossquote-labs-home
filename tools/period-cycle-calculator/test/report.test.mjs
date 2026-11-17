// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/period.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const EXPECTED_TEXT =
  '{"cycles":[' +
  '{"fertileEnd":"2026-11-10","fertileStart":"2026-11-04","index":0,"ovulation":"2026-11-09","periodEnd":"2026-10-30","start":"2026-10-26"},' +
  '{"fertileEnd":"2026-12-08","fertileStart":"2026-12-02","index":1,"ovulation":"2026-12-07","periodEnd":"2026-11-27","start":"2026-11-23"},' +
  '{"fertileEnd":"2027-01-05","fertileStart":"2026-12-30","index":2,"ovulation":"2027-01-04","periodEnd":"2026-12-25","start":"2026-12-21"},' +
  '{"fertileEnd":"2027-02-02","fertileStart":"2027-01-27","index":3,"ovulation":"2027-02-01","periodEnd":"2027-01-22","start":"2027-01-18"}' +
  "]}\n";

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    cycles: firstCase.expected.result.cycles.map((cycle) => ({
      start: cycle.start,
      periodEnd: cycle.periodEnd,
      ovulation: cycle.ovulation,
      fertileStart: cycle.fertileStart,
      fertileEnd: cycle.fertileEnd,
      index: cycle.index,
    })),
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
});

test("the report has no BOM and ends with exactly one LF", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.ok(serialized.text.endsWith("}\n"));
  assert.ok(!serialized.text.endsWith("\n\n"));
  assert.notEqual(serialized.text.charCodeAt(0), 0xfeff);
});

test("an oversized result is OUTPUT_LIMIT and produces no artifact", () => {
  const big = { cycles: [], note: "x".repeat(2097152) };
  const serialized = serializeReport(big);
  assert.equal(serialized.ok, false);
  assert.deepEqual(serialized.error, { code: "OUTPUT_LIMIT", field: null, row: null });
  assert.equal(serialized.text, undefined);
});
