// Report tests: serializeReport produces the pinned canonical compact
// JSON (keys sorted by UTF-16 code units, one trailing LF) for single
// and lines results, reports exact byte counts, and enforces the
// 2,097,152-byte OUTPUT_LIMIT.

import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_BYTE_LIMIT, run, serializeReport } from "../public/js/core/tax-included.mjs";

test("single result serializes to canonical compact JSON with one trailing LF", () => {
  const { result } = run({
    mode: "single",
    basis: "net",
    amount: "100000",
    ratePercent: "5",
    lines: null,
  });
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"basis":"net","gross":105000,"mode":"single","net":100000,"ratePercent":"5","tax":5000}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("lines result serializes with rows in order and the pinned difference", () => {
  const { result } = run({
    mode: "lines",
    basis: null,
    amount: null,
    ratePercent: "5",
    lines: [{ amount: "10" }, { amount: "10" }, { amount: "10" }],
  });
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"gross":32,"lines":[{"net":10,"row":1},{"net":10,"row":2},{"net":10,"row":3}],"mode":"lines","perLineTaxSum":3,"ratePercent":"5","roundingDifference":-1,"subtotalNet":30,"tax":2}\n',
  );
});

test("report over the byte limit is OUTPUT_LIMIT and produces no artifact", () => {
  const huge = { mode: "single", note: "x".repeat(REPORT_BYTE_LIMIT) };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
  const justUnder = { mode: "single", note: "x".repeat(100) };
  const small = serializeReport(justUnder);
  assert.equal(small.ok, true);
  assert.equal(small.bytes, new TextEncoder().encode(small.text).length);
});
