// Core tests for the Sleep Cycle Calculator.
// Every expected value below is derived by hand from
// docs/specs/sleep-cycle-calculator/SPEC.md sections 4 and 7
// (fixtures S1, S2, S3 and the pinned boundary cases) — never from
// the implementation's own output.
import assert from "node:assert/strict";
import test from "node:test";

import {
  bedtimeRows,
  formatClock,
  formatDuration,
  modDay,
  parseLatency,
  parseTime,
  wakeTimeRows,
} from "../public/js/core/sleep-cycle.mjs";

function shape(rows) {
  return rows.map((row) => ({
    cycles: row.cycles,
    time: row.time,
    labelKey: row.labelKey,
    sleep: row.sleep,
    inBed: row.inBed,
    recommended: row.recommended,
    shortNight: row.shortNight,
  }));
}

test("S1: wake 07:00, latency 15 -> bedtimes 21:45 / 23:15 / 00:45 / 02:15", () => {
  assert.deepEqual(shape(bedtimeRows(parseTime("07:00"), 15)), [
    { cycles: 6, time: "21:45", labelKey: "previous-evening", sleep: "9:00", inBed: "9:15", recommended: true, shortNight: false },
    { cycles: 5, time: "23:15", labelKey: "previous-evening", sleep: "7:30", inBed: "7:45", recommended: true, shortNight: false },
    { cycles: 4, time: "00:45", labelKey: "same-morning", sleep: "6:00", inBed: "6:15", recommended: false, shortNight: false },
    { cycles: 3, time: "02:15", labelKey: "same-morning", sleep: "4:30", inBed: "4:45", recommended: false, shortNight: true },
  ]);
});

test("S2: bedtime 23:00, latency 15 -> wake times 03:45 / 05:15 / 06:45 / 08:15, all next morning", () => {
  assert.deepEqual(shape(wakeTimeRows(parseTime("23:00"), 15)), [
    { cycles: 3, time: "03:45", labelKey: "next-morning", sleep: "4:30", inBed: "4:45", recommended: false, shortNight: true },
    { cycles: 4, time: "05:15", labelKey: "next-morning", sleep: "6:00", inBed: "6:15", recommended: false, shortNight: false },
    { cycles: 5, time: "06:45", labelKey: "next-morning", sleep: "7:30", inBed: "7:45", recommended: true, shortNight: false },
    { cycles: 6, time: "08:15", labelKey: "next-morning", sleep: "9:00", inBed: "9:15", recommended: true, shortNight: false },
  ]);
});

test("S3: wake 06:30, latency 0 -> sleep equals time in bed, both shown", () => {
  const rows = bedtimeRows(parseTime("06:30"), 0);
  assert.deepEqual(shape(rows), [
    { cycles: 6, time: "21:30", labelKey: "previous-evening", sleep: "9:00", inBed: "9:00", recommended: true, shortNight: false },
    { cycles: 5, time: "23:00", labelKey: "previous-evening", sleep: "7:30", inBed: "7:30", recommended: true, shortNight: false },
    { cycles: 4, time: "00:30", labelKey: "same-morning", sleep: "6:00", inBed: "6:00", recommended: false, shortNight: false },
    { cycles: 3, time: "02:00", labelKey: "same-morning", sleep: "4:30", inBed: "4:30", recommended: false, shortNight: true },
  ]);
  for (const row of rows) assert.equal(row.sleep, row.inBed);
});

test("wrap arithmetic uses the mathematical modulo (-135 -> 1305)", () => {
  assert.equal(modDay(-135), 1305);
  assert.equal(modDay(-1), 1439);
  assert.equal(modDay(0), 0);
  assert.equal(modDay(1440), 0);
  assert.equal(modDay(2039), 599);
  const first = bedtimeRows(parseTime("07:00"), 15)[0];
  assert.equal(first.rawMinutes, -135);
  assert.equal(first.minutes, 1305);
});

test("raw exactly 0 in the wake direction is 00:00 same morning", () => {
  // 07:00 - 60 - 4*90 = 0 exactly.
  const row = bedtimeRows(parseTime("07:00"), 60).find((r) => r.cycles === 4);
  assert.equal(row.rawMinutes, 0);
  assert.equal(row.time, "00:00");
  assert.equal(row.labelKey, "same-morning");
});

test("raw exactly 1440 in the bed direction is 00:00 next morning", () => {
  // 19:30 + 0 + 3*90 = 1440 exactly.
  const row = wakeTimeRows(parseTime("19:30"), 0).find((r) => r.cycles === 3);
  assert.equal(row.rawMinutes, 1440);
  assert.equal(row.time, "00:00");
  assert.equal(row.labelKey, "next-morning");
});

test("latency extremes 0 and 60 are honoured in both directions", () => {
  // Wake 00:00 with latency 60: 6-cycle raw = -600 -> 14:00 previous evening.
  const bed = bedtimeRows(parseTime("00:00"), 60)[0];
  assert.equal(bed.time, "14:00");
  assert.equal(bed.labelKey, "previous-evening");
  assert.equal(bed.inBed, "10:00");
  // Bedtime 23:59 with latency 60: 6-cycle raw = 2039 -> 09:59 next morning.
  const wake = wakeTimeRows(parseTime("23:59"), 60).find((r) => r.cycles === 6);
  assert.equal(wake.rawMinutes, 2039);
  assert.equal(wake.time, "09:59");
  assert.equal(wake.labelKey, "next-morning");
});

test("extreme clock faces: wake 23:59 and bedtime 00:00 keep correct labels", () => {
  const bed = bedtimeRows(parseTime("23:59"), 0).find((r) => r.cycles === 3);
  assert.equal(bed.time, "19:29");
  assert.equal(bed.labelKey, "same-morning");
  const wake = wakeTimeRows(parseTime("00:00"), 0).find((r) => r.cycles === 3);
  assert.equal(wake.time, "04:30");
  assert.equal(wake.labelKey, "same-evening-night");
});

test("marks: 5 and 6 recommended, 3 short-night, 4 unmarked, both directions", () => {
  for (const rows of [bedtimeRows(420, 15), wakeTimeRows(1380, 15)]) {
    const byCycles = new Map(rows.map((r) => [r.cycles, r]));
    assert.equal(byCycles.get(6).recommended, true);
    assert.equal(byCycles.get(5).recommended, true);
    assert.equal(byCycles.get(4).recommended, false);
    assert.equal(byCycles.get(4).shortNight, false);
    assert.equal(byCycles.get(3).shortNight, true);
    assert.equal(byCycles.get(3).recommended, false);
  }
});

test("row orders are pinned: wake direction 6,5,4,3 and bed direction 3,4,5,6", () => {
  assert.deepEqual(bedtimeRows(420, 15).map((r) => r.cycles), [6, 5, 4, 3]);
  assert.deepEqual(wakeTimeRows(1380, 15).map((r) => r.cycles), [3, 4, 5, 6]);
});

test("parseTime accepts 00:00 and 23:59 and refuses malformed values", () => {
  assert.equal(parseTime("00:00"), 0);
  assert.equal(parseTime("23:59"), 1439);
  assert.equal(parseTime("07:00"), 420);
  for (const bad of ["24:00", "7:00", "", "12:60", "23:5", " 07:00", "07:00 ", "ab:cd", null, undefined, 700]) {
    assert.equal(parseTime(bad), null, `expected refusal for ${String(bad)}`);
  }
});

test("parseLatency accepts 0 and 60 and refuses 61, -1 and non-integers", () => {
  assert.equal(parseLatency(0), 0);
  assert.equal(parseLatency(60), 60);
  assert.equal(parseLatency("15"), 15);
  assert.equal(parseLatency(15), 15);
  for (const bad of [61, -1, 15.5, "15.5", "61", "", "abc", " 15", null, undefined, NaN]) {
    assert.equal(parseLatency(bad), null, `expected refusal for ${String(bad)}`);
  }
});

test("formatting: clocks are HH:MM and durations are H:MM", () => {
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(1305), "21:45");
  assert.equal(formatClock(599), "09:59");
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(450), "7:30");
  assert.equal(formatDuration(555), "9:15");
  assert.equal(formatDuration(600), "10:00");
});
