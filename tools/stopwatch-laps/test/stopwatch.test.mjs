import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_LAPS,
  createStopwatch,
  currentLapMs,
  elapsedAt,
  getLaps,
  getStats,
  lap,
  pause,
  reset,
  resume,
  start,
  toCsv,
} from "../public/js/core/stopwatch.mjs";
import { formatDuration } from "../public/js/core/format.mjs";

// SPEC section 4, fixture L1: splits at elapsed 30,000 / 75,450 /
// 120,000 ms. The clock origin is deliberately non-zero (1,000) to
// prove only deltas of the injected monotonic readings matter.
test("L1 laps, statistics and sum invariant", () => {
  const sw = createStopwatch();
  assert.deepEqual(start(sw, 1000), { ok: true });
  assert.equal(lap(sw, 31000).ok, true);
  assert.equal(lap(sw, 76450).ok, true);
  assert.equal(lap(sw, 121000).ok, true);
  const laps = getLaps(sw);
  assert.deepEqual(
    laps.map((l) => l.durationMs),
    [30000, 45450, 44550],
  );
  assert.deepEqual(
    laps.map((l) => l.splitMs),
    [30000, 75450, 120000],
  );
  assert.equal(
    laps.reduce((sum, l) => sum + l.durationMs, 0),
    120000,
  );
  const stats = getStats(sw);
  assert.equal(stats.fastest.number, 1);
  assert.equal(stats.fastest.durationMs, 30000);
  assert.equal(stats.slowest.number, 2);
  assert.equal(stats.slowest.durationMs, 45450);
  assert.equal(stats.averageMs, 40000);
  assert.equal(formatDuration(stats.averageMs), "00:40.00");
});

// SPEC section 4, fixture L5: L1's laps export byte-exactly.
test("L5 CSV is byte-exact", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 30000);
  lap(sw, 75450);
  lap(sw, 120000);
  assert.equal(
    toCsv(sw),
    "Lap,Lap Time (s),Split Time (s)\n" +
      "1,30.000,30.000\n" +
      "2,45.450,75.450\n" +
      "3,44.550,120.000\n",
  );
});

test("CSV with no laps is the header line only", () => {
  const sw = createStopwatch();
  assert.equal(toCsv(sw), "Lap,Lap Time (s),Split Time (s)\n");
});

// SPEC section 4, fixture L3: run 10,000 ms, pause across a 60,000 ms
// clock advance, resume and run 5,000 ms -> elapsed 15,000 ms.
test("L3 pause interval never counts", () => {
  const sw = createStopwatch();
  start(sw, 0);
  pause(sw, 10000);
  assert.equal(elapsedAt(sw, 69999), 10000); // frozen while paused
  resume(sw, 70000);
  assert.equal(elapsedAt(sw, 75000), 15000);
  const result = lap(sw, 75000);
  assert.equal(result.ok, true);
  assert.equal(result.lap.splitMs, 15000);
});

// SPEC section 4, fixture L4: two laps of exactly 20,000 ms each ->
// fastest and slowest both go to the earliest lap.
test("L4 ties go to the earliest lap", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 20000);
  lap(sw, 40000);
  const stats = getStats(sw);
  assert.equal(stats.fastest.number, 1);
  assert.equal(stats.slowest.number, 1);
  assert.equal(stats.averageMs, 20000);
});

test("ties among later laps also pick the earliest holder", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 30000); // 30,000
  lap(sw, 40000); // 10,000
  lap(sw, 50000); // 10,000 (tied fastest -> lap 2)
  lap(sw, 80000); // 30,000 (tied slowest -> lap 1)
  const stats = getStats(sw);
  assert.equal(stats.fastest.number, 2);
  assert.equal(stats.slowest.number, 1);
});

// A zero-millisecond lap is legal, listed, and can be the fastest.
test("zero lap is listed and can be fastest", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 5000);
  const second = lap(sw, 5000); // same reading -> d = 0
  assert.equal(second.ok, true);
  assert.equal(second.lap.durationMs, 0);
  const stats = getStats(sw);
  assert.equal(stats.fastest.number, 2);
  assert.equal(stats.fastest.durationMs, 0);
  assert.equal(stats.slowest.number, 1);
});

// Sum invariant as a property test over scripted pseudo-random split
// sequences (deterministic PRNG), including repeated splits.
test("sum invariant holds over random split sequences", () => {
  let seed = 0x2f6e2b1;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let trial = 0; trial < 200; trial++) {
    const sw = createStopwatch();
    start(sw, 0);
    let now = 0;
    const count = 1 + Math.floor(rand() * 40);
    for (let i = 0; i < count; i++) {
      now += Math.floor(rand() * 3) * Math.floor(rand() * 5000); // may repeat
      assert.equal(lap(sw, now).ok, true);
    }
    const laps = getLaps(sw);
    const sum = laps.reduce((s, l) => s + l.durationMs, 0);
    assert.equal(sum, laps[laps.length - 1].splitMs);
    for (const l of laps) assert.ok(l.durationMs >= 0);
  }
});

// State machine refusals: lap in idle and paused states is refused by
// state; invalid transitions change nothing.
test("invalid transitions are refused without side effects", () => {
  const sw = createStopwatch();
  assert.equal(lap(sw, 0).ok, false); // idle
  assert.equal(pause(sw, 0).ok, false);
  assert.equal(resume(sw, 0).ok, false);
  start(sw, 0);
  assert.equal(start(sw, 10).ok, false); // already running
  assert.equal(resume(sw, 10).ok, false);
  pause(sw, 10000);
  const refused = lap(sw, 11000); // paused: a frozen lap is refused
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "not-running");
  assert.equal(sw.splits.length, 0);
  assert.equal(elapsedAt(sw, 99999), 10000);
});

// Multiple running segments sum exactly; pause spanning a huge fake
// interval contributes nothing.
test("multiple segments sum exactly across a huge pause", () => {
  const sw = createStopwatch();
  start(sw, 0);
  pause(sw, 3000); // +3,000
  resume(sw, 10000);
  pause(sw, 13500); // +3,500
  resume(sw, 10000000);
  assert.equal(elapsedAt(sw, 10001500), 8000);
});

// Reset works from every state and returns to the initial state;
// reset while running stops the clock.
test("reset from running and from paused", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 5000);
  reset(sw);
  assert.equal(sw.status, "idle");
  assert.equal(elapsedAt(sw, 60000), 0);
  assert.deepEqual(getLaps(sw), []);
  assert.equal(getStats(sw), null);

  start(sw, 100000);
  pause(sw, 105000);
  reset(sw);
  assert.equal(sw.status, "idle");
  assert.equal(elapsedAt(sw, 200000), 0);
  assert.deepEqual(start(sw, 200000), { ok: true }); // usable again
});

// With one lap, fastest = slowest = average = that lap.
test("single lap statistics", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 12345);
  const stats = getStats(sw);
  assert.equal(stats.fastest.number, 1);
  assert.equal(stats.slowest.number, 1);
  assert.equal(stats.averageMs, 12345);
});

// Average is the exact rational split_n / n; its display floors.
test("average is exact rational, display truncates", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 100); // d = 100
  lap(sw, 201); // d = 101, split 201
  const stats = getStats(sw);
  assert.equal(stats.averageMs, 100.5);
  assert.equal(formatDuration(stats.averageMs), "00:00.10");
});

// The in-progress lap is never part of the statistics, and the
// current-lap readout is elapsed minus the last split.
test("in-progress lap is excluded from statistics", () => {
  const sw = createStopwatch();
  start(sw, 0);
  lap(sw, 10000);
  lap(sw, 30000);
  assert.equal(currentLapMs(sw, 47500), 17500);
  const stats = getStats(sw);
  assert.equal(stats.count, 2);
  assert.equal(stats.averageMs, 15000);
  pause(sw, 50000);
  assert.equal(currentLapMs(sw, 999999), 20000); // frozen with the clock
});

// Split readings are whole milliseconds by truncation of the exact
// elapsed value at the press instant.
test("splits truncate fractional elapsed", () => {
  const sw = createStopwatch();
  start(sw, 0);
  const result = lap(sw, 12345.678);
  assert.equal(result.lap.splitMs, 12345);
  assert.equal(elapsedAt(sw, 12345.678), 12345.678); // exact internally
});

// Elapsed crossing one hour: display switches at exactly 3,600,000 ms.
test("elapsed at the hour boundary", () => {
  const sw = createStopwatch();
  start(sw, 0);
  assert.equal(formatDuration(elapsedAt(sw, 3599999)), "59:59.99");
  assert.equal(formatDuration(elapsedAt(sw, 3600000)), "1:00:00.00");
});

// SPEC sections 2/3: 500 laps accepted; the 501st press is refused
// with the lap-limit reason while the stopwatch keeps running and all
// laps remain exportable.
test("500-lap bound and 501st refusal", () => {
  const sw = createStopwatch();
  start(sw, 0);
  for (let i = 1; i <= MAX_LAPS; i++) {
    assert.equal(lap(sw, i * 1000).ok, true, `lap ${i}`);
  }
  assert.equal(sw.splits.length, 500);
  const refused = lap(sw, 501000);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "lap-limit");
  assert.equal(sw.status, "running");
  assert.equal(sw.splits.length, 500);
  assert.equal(elapsedAt(sw, 502000), 502000); // still running
  const csvLines = toCsv(sw).split("\n");
  assert.equal(csvLines.length, 502); // header + 500 rows + trailing ""
  assert.equal(csvLines[501], "");
});
