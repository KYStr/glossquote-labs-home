// Pure stopwatch state machine (SPEC sections 3 and 4).
//
// One monotonic time base, injected by the caller as millisecond
// readings (`now` arguments). This module never reads a clock itself:
// no wall clock, no monotonic clock, no DOM, no network, no storage.
// Elapsed time comes only from accumulatedMs plus the current running segment, so a
// wall-clock change can never alter a reading.
//
// Every lap duration is derived from the single stored split list, so
// the lap durations always sum exactly to the last split.

import { formatSeconds3 } from "./format.mjs";

// SPEC section 2/3: at most 500 laps; the 501st press is refused.
export const MAX_LAPS = 500;

export function createStopwatch() {
  return {
    status: "idle", // "idle" | "running" | "paused"
    accumulatedMs: 0, // exact sum of completed running segments
    segmentStart: null, // clock reading at the last start/resume
    splits: [], // whole-millisecond elapsed readings, in press order
  };
}

export function elapsedAt(sw, now) {
  if (sw.status === "running") {
    return sw.accumulatedMs + (now - sw.segmentStart);
  }
  return sw.accumulatedMs;
}

export function start(sw, now) {
  if (sw.status !== "idle") return { ok: false, reason: "not-idle" };
  sw.status = "running";
  sw.segmentStart = now;
  return { ok: true };
}

export function pause(sw, now) {
  if (sw.status !== "running") return { ok: false, reason: "not-running" };
  sw.accumulatedMs += now - sw.segmentStart;
  sw.segmentStart = null;
  sw.status = "paused";
  return { ok: true };
}

export function resume(sw, now) {
  if (sw.status !== "paused") return { ok: false, reason: "not-paused" };
  sw.segmentStart = now;
  sw.status = "running";
  return { ok: true };
}

// A lap is accepted only while running. The split is the elapsed value
// at the press instant, stored as whole milliseconds by truncation.
// At the 500-lap bound the press is refused with reason "lap-limit"
// and the stopwatch keeps running with all laps intact.
export function lap(sw, now) {
  if (sw.status !== "running") return { ok: false, reason: "not-running" };
  if (sw.splits.length >= MAX_LAPS) return { ok: false, reason: "lap-limit" };
  const splitMs = Math.floor(elapsedAt(sw, now));
  const prev = sw.splits.length === 0 ? 0 : sw.splits[sw.splits.length - 1];
  sw.splits.push(splitMs);
  return {
    ok: true,
    lap: { number: sw.splits.length, durationMs: splitMs - prev, splitMs },
  };
}

// Reset is available in every state and returns to the initial state;
// resetting while running stops the clock.
export function reset(sw) {
  sw.status = "idle";
  sw.accumulatedMs = 0;
  sw.segmentStart = null;
  sw.splits = [];
  return { ok: true };
}

// Lap rows in press order: duration d_n = split_n - split_(n-1),
// split_0 = 0, so the durations sum exactly to the last split.
export function getLaps(sw) {
  return sw.splits.map((splitMs, i) => ({
    number: i + 1,
    durationMs: splitMs - (i === 0 ? 0 : sw.splits[i - 1]),
    splitMs,
  }));
}

// Statistics over completed laps only; the in-progress lap is never
// included. Ties for fastest/slowest go to the earliest lap number
// (strict comparisons keep the first holder). Average is the exact
// rational split_n / n.
export function getStats(sw) {
  const laps = getLaps(sw);
  if (laps.length === 0) return null;
  let fastest = laps[0];
  let slowest = laps[0];
  for (const entry of laps) {
    if (entry.durationMs < fastest.durationMs) fastest = entry;
    if (entry.durationMs > slowest.durationMs) slowest = entry;
  }
  const lastSplit = sw.splits[sw.splits.length - 1];
  return {
    count: laps.length,
    fastest: { number: fastest.number, durationMs: fastest.durationMs },
    slowest: { number: slowest.number, durationMs: slowest.durationMs },
    averageMs: lastSplit / laps.length,
  };
}

// Time since the last split (the in-progress lap), or the full elapsed
// time when no lap has been recorded yet.
export function currentLapMs(sw, now) {
  const lastSplit = sw.splits.length === 0 ? 0 : sw.splits[sw.splits.length - 1];
  return elapsedAt(sw, now) - lastSplit;
}

// CSV export (SPEC section 4): UTF-8, LF endings, fixed header, one
// row per lap with seconds at exactly three decimals derived from the
// integer milliseconds, trailing newline after the last row.
export function toCsv(sw) {
  const lines = ["Lap,Lap Time (s),Split Time (s)"];
  for (const entry of getLaps(sw)) {
    lines.push(
      `${entry.number},${formatSeconds3(entry.durationMs)},${formatSeconds3(entry.splitMs)}`,
    );
  }
  return lines.join("\n") + "\n";
}
