// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { serializeReport } from "../public/js/core/retry.mjs";

const boundedResult = {
  attempts: [
    { number: 1, delayMs: 0, startMs: 0, endMs: 1000 },
    { number: 2, delayMs: 500, startMs: 1500, endMs: 2500 },
    { number: 3, delayMs: 1000, startMs: 3500, endMs: 4500 },
  ],
  unspentMs: 1000,
  nextRejected: { number: 4, startMs: 5700, endMs: 6700 },
};

test("bounded-exponential report is canonical compact JSON with one trailing LF", () => {
  const serialized = serializeReport(boundedResult);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"attempts":[{"delayMs":0,"endMs":1000,"number":1,"startMs":0},{"delayMs":500,"endMs":2500,"number":2,"startMs":1500},{"delayMs":1000,"endMs":4500,"number":3,"startMs":3500}],"nextRejected":{"endMs":6700,"number":4,"startMs":5700},"unspentMs":1000}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("exact-budget report keeps nextRejected null and the same key order", () => {
  const serialized = serializeReport({
    attempts: [
      { number: 1, delayMs: 0, startMs: 0, endMs: 5 },
      { number: 2, delayMs: 2, startMs: 7, endMs: 12 },
    ],
    unspentMs: 0,
    nextRejected: null,
  });
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"attempts":[{"delayMs":0,"endMs":5,"number":1,"startMs":0},{"delayMs":2,"endMs":12,"number":2,"startMs":7}],"nextRejected":null,"unspentMs":0}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const attempts = [];
  for (let i = 1; i <= 40000; i += 1) {
    attempts.push({ number: i, delayMs: 0, startMs: i - 1, endMs: i });
  }
  const serialized = serializeReport({ attempts, unspentMs: 0, nextRejected: null });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    nextRejected: { endMs: 6700, startMs: 5700, number: 4 },
    unspentMs: 1000,
    attempts: [{ endMs: 1000, startMs: 0, number: 1, delayMs: 0 }],
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"attempts":[{"delayMs":0,"endMs":1000,"number":1,"startMs":0}],"nextRejected":{"endMs":6700,"number":4,"startMs":5700},"unspentMs":1000}\n',
  );
});
