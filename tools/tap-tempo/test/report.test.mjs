// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' results,
// never produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/tempo.mjs";

const steadyResult = {
  tapCount: 5,
  segmentStartIndex: 0,
  segmentTapCount: 5,
  segmentIntervalCount: 4,
  resetCount: 0,
  intervalCount: 4,
  windowIntervals: [500, 500, 500, 500],
  medianIntervalMs: 500,
  meanIntervalMs: 500,
  bpmMedian: 120.0,
  bpmMean: 120.0,
  beatsPerSecond: 2.0,
};

test("steady-120 report is canonical compact JSON with one trailing LF", () => {
  const serialized = serializeReport(steadyResult);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"beatsPerSecond":2,"bpmMean":120,"bpmMedian":120,"intervalCount":4,"meanIntervalMs":500,"medianIntervalMs":500,"resetCount":0,"segmentIntervalCount":4,"segmentStartIndex":0,"segmentTapCount":5,"tapCount":5,"windowIntervals":[500,500,500,500]}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
  assert.match(
    createHash("sha256").update(serialized.text).digest("hex"),
    /^[0-9a-f]{64}$/,
  );
});

test("the serialized report of a live core result matches the same bytes", () => {
  const outcome = run({ taps: [0, 500, 1000, 1500, 2000] });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"beatsPerSecond":2,"bpmMean":120,"bpmMedian":120,"intervalCount":4,"meanIntervalMs":500,"medianIntervalMs":500,"resetCount":0,"segmentIntervalCount":4,"segmentStartIndex":0,"segmentTapCount":5,"tapCount":5,"windowIntervals":[500,500,500,500]}\n',
  );
});

test("half-millisecond values serialize as plain JSON numbers", () => {
  const outcome = run({ taps: [0, 500, 1001] });
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"beatsPerSecond":2,"bpmMean":119.9,"bpmMedian":119.9,"intervalCount":2,"meanIntervalMs":500.5,"medianIntervalMs":500.5,"resetCount":0,"segmentIntervalCount":2,"segmentStartIndex":0,"segmentTapCount":3,"tapCount":3,"windowIntervals":[500,501]}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    windowIntervals: [500, 500, 500, 500],
    tapCount: 5,
    segmentTapCount: 5,
    segmentStartIndex: 0,
    segmentIntervalCount: 4,
    resetCount: 0,
    intervalCount: 4,
    medianIntervalMs: 500,
    meanIntervalMs: 500,
    bpmMedian: 120.0,
    bpmMean: 120.0,
    beatsPerSecond: 2.0,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"beatsPerSecond":2,"bpmMean":120,"bpmMedian":120,"intervalCount":4,"meanIntervalMs":500,"medianIntervalMs":500,"resetCount":0,"segmentIntervalCount":4,"segmentStartIndex":0,"segmentTapCount":5,"tapCount":5,"windowIntervals":[500,500,500,500]}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({
    tapCount: 500001,
    windowIntervals: new Array(500000).fill(2000),
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
