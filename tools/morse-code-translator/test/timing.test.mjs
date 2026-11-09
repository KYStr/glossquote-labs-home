// Timing expansion checks (REVISED SPEC b612c14d §4 timing model, §7d):
// interval lists sum to the stated units, no trailing gap, PARIS calibration.
import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeText } from "../public/js/core/encode.mjs";
import { decodeMorse } from "../public/js/core/decode.mjs";
import { expandTiming } from "../public/js/core/timing.mjs";
import { durationSeconds, unitMs } from "../public/js/core/table.mjs";

const sum = (intervals, on) =>
  intervals.filter((i) => i.on === on).reduce((s, i) => s + i.units, 0);

test("SOS intervals: on 15, off 12, total 27, and no trailing gap", () => {
  const { intervals, totalUnits } = expandTiming(encodeText("SOS").words);
  assert.equal(sum(intervals, true), 15);
  assert.equal(sum(intervals, false), 12);
  assert.equal(totalUnits, 27);
  assert.equal(intervals[intervals.length - 1].on, true); // ends on a signal, not a gap
});

test("a single dot is exactly 1 unit with a single on-interval", () => {
  const { intervals, totalUnits } = expandTiming(encodeText("E").words);
  assert.equal(totalUnits, 1);
  assert.deepEqual(intervals, [{ on: true, units: 1, item: 0 }]);
});

test("word gap is 7 units: E E totals 1 + 7 + 1 = 9", () => {
  const { totalUnits } = expandTiming(encodeText("E E").words);
  assert.equal(totalUnits, 9);
});

test("prosign internal letters use element gaps only (no 3-unit gaps inside)", () => {
  // <AR> = .-.-. run together: elements 1+3+1+3+1 = 9 on, 4 element gaps = 4 off -> 13
  const { intervals, totalUnits } = expandTiming(encodeText("<AR>").words);
  assert.equal(totalUnits, 13);
  assert.equal(sum(intervals, true), 9);
  assert.equal(sum(intervals, false), 4);
  assert.ok(intervals.filter((i) => !i.on).every((i) => i.units === 1));
});

test("PARIS calibration reproduced: 43 standalone, 50 with trailing word gap", () => {
  const { totalUnits } = expandTiming(encodeText("PARIS").words);
  assert.equal(totalUnits, 43);
  assert.equal(totalUnits + 7, 50);
});

test("unit maths: unit = 1200/WPM ms; seconds shown at 2-decimal precision", () => {
  assert.equal(unitMs(20), 60);
  assert.equal(unitMs(5), 240);
  assert.ok(Math.abs(durationSeconds(27, 20) - 1.62) < 1e-9);
  assert.ok(Math.abs(durationSeconds(43, 20) - 2.58) < 1e-9);
  assert.equal(durationSeconds(27, 20).toFixed(2), "1.62");
});

test("timing from a decoded signal matches the encoded signal", () => {
  const fromText = expandTiming(encodeText("HELLO").words).totalUnits;
  const fromMorse = expandTiming(decodeMorse(".... . .-.. .-.. ---").words).totalUnits;
  assert.equal(fromMorse, fromText);
});

test("empty signal expands to zero units and no intervals", () => {
  const { intervals, totalUnits, items } = expandTiming([]);
  assert.equal(totalUnits, 0);
  assert.deepEqual(intervals, []);
  assert.deepEqual(items, []);
});
