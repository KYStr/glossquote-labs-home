// Report tests: the downloaded report for the rect-single-depth
// fixture is asserted byte-for-byte (canonical compact JSON, keys
// sorted by UTF-16 code units, one trailing LF), including key-order
// independence and the OUTPUT_LIMIT backstop.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/pool-volume.mjs";

test("report bytes for rect-single-depth are exact", () => {
  const outcome = run({
    shape: "rectangular",
    depthMode: "single",
    lengthM: "8",
    widthM: "4",
    diameterM: "5",
    depthM: "1.5",
    shallowDepthM: "1",
    deepDepthM: "2",
    flowRateLMin: "40",
  });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"avgDepthM":1.5,"depthMode":"single","fillHours":20,"fillMinutes":0,"fillTotalMinutes":1200,"flowRateLMin":40,"shape":"rectangular","volumeGallonsUs":12680,"volumeLitres":48000,"volumeM3":48}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("report bytes for a no-flow result carry null fill fields", () => {
  const outcome = run({
    shape: "rectangular",
    depthMode: "sloped",
    lengthM: "10",
    widthM: "5",
    diameterM: "5",
    depthM: "1.5",
    shallowDepthM: "1.2",
    deepDepthM: "1.8",
    flowRateLMin: "",
  });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"avgDepthM":1.5,"depthMode":"sloped","fillHours":null,"fillMinutes":null,"fillTotalMinutes":null,"flowRateLMin":null,"shape":"rectangular","volumeGallonsUs":19813,"volumeLitres":75000,"volumeM3":75}\n',
  );
});

test("serialization is independent of key order in the result object", () => {
  const outcome = run({
    shape: "rectangular",
    depthMode: "single",
    lengthM: "8",
    widthM: "4",
    diameterM: "5",
    depthM: "1.5",
    shallowDepthM: "1",
    deepDepthM: "2",
    flowRateLMin: "40",
  });
  assert.equal(outcome.ok, true);
  const reordered = {
    volumeM3: outcome.result.volumeM3,
    shape: outcome.result.shape,
    volumeLitres: outcome.result.volumeLitres,
    flowRateLMin: outcome.result.flowRateLMin,
    avgDepthM: outcome.result.avgDepthM,
    volumeGallonsUs: outcome.result.volumeGallonsUs,
    depthMode: outcome.result.depthMode,
    fillTotalMinutes: outcome.result.fillTotalMinutes,
    fillHours: outcome.result.fillHours,
    fillMinutes: outcome.result.fillMinutes,
  };
  assert.equal(serializeReport(reordered).text, serializeReport(outcome.result).text);
});

test("OUTPUT_LIMIT fires only past 2,097,152 bytes", () => {
  // A genuine result is a few hundred bytes; force the cap with a
  // padded string value in an otherwise well-formed result object.
  const big = {
    shape: "rectangular",
    depthMode: "single",
    avgDepthM: 1.5,
    volumeM3: 48,
    volumeLitres: 48000,
    volumeGallonsUs: 12680,
    flowRateLMin: 40,
    fillTotalMinutes: 1200,
    fillHours: 20,
    fillMinutes: 0,
    note: "x".repeat(2097152),
  };
  const serialized = serializeReport(big);
  assert.equal(serialized.ok, false);
  assert.deepEqual(serialized.error, { code: "OUTPUT_LIMIT", field: null, row: null });
  const small = { ...big, note: "x" };
  assert.equal(serializeReport(small).ok, true);
});
