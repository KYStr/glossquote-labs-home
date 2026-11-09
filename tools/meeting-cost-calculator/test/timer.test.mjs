// Timer tests on an injected fake monotonic clock (SPEC sections 4 and 7):
// fixtures M3 and M5, the state machine, exact multi-interval accumulation,
// reset while running, the one-hour crossing, and the drift property — the
// displayed cost after irregular refreshes always equals the exact formula
// from total elapsed, which a per-tick rounded-increment implementation
// cannot reproduce.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeForElapsedMs,
  createTimerState,
  formatElapsed,
  timerElapsedMs,
  timerIsRunning,
  timerPause,
  timerReset,
  timerStart,
} from "../public/js/core/calculator.mjs";

const M1 = [
  { headcount: 3, rateCents: 6000 },
  { headcount: 2, rateCents: 4500 },
];

test("M3: timer readings at M1's burn (600 s, 90 s, pause, resume)", () => {
  const state = createTimerState();
  timerStart(state, 1000);
  // 600 s elapsed.
  assert.equal(timerElapsedMs(state, 601000), 600000);
  assert.equal(computeForElapsedMs(M1, 600000, "US$").totalText, "US$45.00");
  // 90 s elapsed.
  assert.equal(computeForElapsedMs(M1, 90000, "US$").totalText, "US$6.75");
  // Pause at 90 s; the fake clock jumps to 10,090 s; nothing is added.
  timerPause(state, 91000);
  assert.equal(timerElapsedMs(state, 10090000), 90000);
  // Resume and advance 10 s: elapsed 100 s.
  timerStart(state, 10090000);
  assert.equal(timerElapsedMs(state, 10100000), 100000);
  assert.equal(computeForElapsedMs(M1, 100000, "US$").totalText, "US$7.50");
});

test("M5: one person at 100.00, elapsed 100 s displays $2.78 (single rounding)", () => {
  const result = computeForElapsedMs([{ headcount: 1, rateCents: 10000 }], 100000, "US$");
  assert.equal(result.totalText, "US$2.78");
});

test("drift property: irregular refreshes always price from total elapsed", () => {
  // Expected values hand-computed from burn 100.00/h: cents = 10000 x ms / 3,600,000.
  const groups = [{ headcount: 1, rateCents: 10000 }];
  const checkpoints = [
    [1300, "US$0.04"], // 3.6111 cents
    [2900, "US$0.08"], // 8.0555 cents
    [4700, "US$0.13"], // 13.0555 cents
    [7900, "US$0.22"], // 21.9444 cents
    [12300, "US$0.34"], // 34.1666 cents
    [100000, "US$2.78"], // 277.7777 cents
  ];
  for (const [ms, expected] of checkpoints) {
    assert.equal(computeForElapsedMs(groups, ms, "US$").totalText, expected, `at ${ms} ms`);
  }
  // The forbidden implementation: adding the per-second rounded increment
  // (round(10000 x 1000 / 3,600,000) = 3 cents) 100 times gives $3.00,
  // which differs from the exact $2.78 — the drift this design excludes.
  const naivePerSecond = Math.round((10000 * 1000) / 3600000);
  assert.equal(naivePerSecond * 100, 300);
  assert.notEqual(naivePerSecond * 100, 278);
});

test("elapsed accumulates exactly across several running intervals", () => {
  const state = createTimerState();
  timerStart(state, 0);
  timerPause(state, 1500);
  timerStart(state, 5000);
  timerPause(state, 6500);
  timerStart(state, 10000);
  assert.equal(timerElapsedMs(state, 11500), 4500);
  assert.equal(timerIsRunning(state), true);
});

test("pause freezes elapsed exactly; the frozen value does not creep", () => {
  const state = createTimerState();
  timerStart(state, 2000);
  timerPause(state, 3500);
  assert.equal(timerElapsedMs(state, 999999), 1500);
  assert.equal(timerIsRunning(state), false);
});

test("reset while running returns elapsed to zero and stops the clock", () => {
  const state = createTimerState();
  timerStart(state, 0);
  timerReset(state);
  assert.equal(timerIsRunning(state), false);
  assert.equal(timerElapsedMs(state, 9000), 0);
});

test("starting twice does not restart the current interval", () => {
  const state = createTimerState();
  timerStart(state, 1000);
  timerStart(state, 5000);
  assert.equal(timerElapsedMs(state, 6000), 5000);
});

test("elapsed crossing one hour displays and prices correctly", () => {
  assert.equal(formatElapsed(3600000), "01:00:00");
  assert.equal(computeForElapsedMs(M1, 3600000, "US$").totalText, "US$270.00");
});

test("formatElapsed: H:MM:SS with unbounded hours", () => {
  assert.equal(formatElapsed(0), "00:00:00");
  assert.equal(formatElapsed(59999), "00:00:59");
  assert.equal(formatElapsed(3661000), "01:01:01");
  assert.equal(formatElapsed(360000000), "100:00:00");
});
