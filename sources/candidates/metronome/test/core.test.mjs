import assert from "node:assert/strict";
import test from "node:test";

import {
  CLICK,
  Scheduler,
  TapTempoTracker,
  clampBpm,
  gainFor,
} from "../public/js/core/metronome.mjs";

// Fake-clock harness: the scheduler is driven by manual ticks over a
// manual audio clock, exactly as SPEC section 7 requires. The 25 ms
// timer only triggers scheduling; event times must come from the
// audio-clock arithmetic alone.

function harness({ bpm = 120, startAt = 5 } = {}) {
  const state = { now: startAt, events: [], silences: 0 };
  const scheduler = new Scheduler({
    now: () => state.now,
    emit: (event) => state.events.push(event),
    silence: () => {
      state.silences += 1;
    },
  });
  scheduler.setBpm(bpm);
  return { state, scheduler };
}

function drive(state, scheduler, until, stepMs = 25) {
  while (state.now < until) {
    scheduler.tick();
    state.now += stepMs / 1000;
  }
  scheduler.tick();
}

test("grid: at 120 BPM the first 20 beat times are exactly start + 0.06 + k x 0.5", () => {
  const { state, scheduler } = harness({ bpm: 120, startAt: 5 });
  scheduler.start();
  drive(state, scheduler, 5 + 21 * 0.5);
  assert.ok(state.events.length >= 20);
  for (let k = 0; k < 20; k += 1) {
    assert.equal(state.events[k].time, 5.06 + k * 0.5);
  }
  assert.deepEqual(
    state.events.slice(0, 5).map((e) => e.kind),
    ["accent", "beat", "beat", "beat", "accent"],
  );
  assert.deepEqual(
    state.events.slice(0, 4).map((e) => [e.bar, e.beat]),
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  );
});

test("spacing: 30 BPM with subdivision 4 gives 0.5 s spacing and sub kinds", () => {
  const { state, scheduler } = harness({ bpm: 30, startAt: 0 });
  scheduler.setSubdivisions(4);
  scheduler.start();
  drive(state, scheduler, 3.2);
  const times = state.events.map((e) => e.time);
  for (let i = 1; i < times.length; i += 1) {
    assert.equal(times[i] - times[i - 1], 0.5);
  }
  assert.deepEqual(
    state.events.slice(0, 5).map((e) => e.kind),
    ["accent", "sub", "sub", "sub", "beat"],
  );
  assert.equal(CLICK.accent.frequency, 1568);
  assert.equal(CLICK.beat.frequency, 1046);
  assert.equal(CLICK.sub.frequency, 784);
});

test("timer jitter never enters event times", () => {
  const regular = harness({ bpm: 120, startAt: 5 });
  regular.scheduler.start();
  drive(regular.state, regular.scheduler, 12);
  const jittered = harness({ bpm: 120, startAt: 5 });
  jittered.scheduler.start();
  const steps = [7, 43, 13, 61, 3, 29, 55, 17];
  let i = 0;
  while (jittered.state.now < 12) {
    jittered.scheduler.tick();
    jittered.state.now += steps[i % steps.length] / 1000;
    i += 1;
  }
  jittered.scheduler.tick();
  assert.deepEqual(
    jittered.state.events.map((e) => e.time),
    regular.state.events.map((e) => e.time),
  );
});

test("change rules: a BPM change alters only events scheduled after it", () => {
  const { state, scheduler } = harness({ bpm: 120, startAt: 0 });
  scheduler.start();
  drive(state, scheduler, 0.5);
  const before = state.events.map((e) => e.time);
  assert.ok(before.length >= 2);
  scheduler.setBpm(60);
  drive(state, scheduler, 4.5);
  const times = state.events.map((e) => e.time);
  // Events inside the horizon at the change kept their 0.5 s grid;
  // from the first advance computed after the change, spacing is 1 s.
  const firstWide = times.findIndex((t, i) => i > 0 && Math.abs(times[i] - times[i - 1] - 1) < 1e-9);
  assert.ok(firstWide > 0);
  for (let i = firstWide; i < times.length; i += 1) {
    assert.ok(Math.abs(times[i] - times[i - 1] - 1) < 1e-9);
  }
});

test("signature change to a shorter bar restarts at beat 1 at the next event", () => {
  const { state, scheduler } = harness({ bpm: 240, startAt: 0 });
  scheduler.start();
  drive(state, scheduler, 0.3);
  scheduler.setSignature(2, 4);
  drive(state, scheduler, 2.2);
  const positions = state.events.map((e) => [e.bar, e.beat]);
  // After the change, no event may carry beat >= 2, and bars advance
  // in steps of two beats.
  const changeIndex = positions.findIndex(([bar, beat]) => bar >= 2);
  assert.ok(changeIndex > 0);
  for (const [bar, beat] of positions.slice(changeIndex)) {
    assert.ok(beat < 2, `bar ${bar} beat ${beat}`);
  }
});

test("tap tempo: reference intervals, run restart, last-6 window, clamps", () => {
  const t1 = new TapTempoTracker();
  assert.equal(t1.tap(0), null);
  t1.tap(500);
  t1.tap(1000);
  assert.equal(t1.tap(1500), 120);

  const t2 = new TapTempoTracker();
  t2.tap(0);
  t2.tap(500);
  assert.equal(t2.tap(2600), null);
  assert.equal(t2.tap(3100), 120);

  const t3 = new TapTempoTracker();
  t3.tap(0);
  assert.equal(t3.tap(2000), 30);

  const t4 = new TapTempoTracker();
  let bpm = null;
  for (const at of [0, 1000, 1500, 2000, 2500, 3000, 3500, 4000]) bpm = t4.tap(at);
  assert.equal(bpm, 120);

  const t5 = new TapTempoTracker();
  t5.tap(0);
  assert.equal(t5.tap(100), 240);
});

test("stop silences and resets; a later start begins again at bar 1 beat 1", () => {
  const { state, scheduler } = harness({ bpm: 120, startAt: 0 });
  scheduler.start();
  drive(state, scheduler, 1.2);
  const countAtStop = state.events.length;
  assert.ok(countAtStop > 0);
  scheduler.stop();
  assert.equal(state.silences, 1);
  drive(state, scheduler, 3);
  assert.equal(state.events.length, countAtStop);
  state.now = 100;
  scheduler.start();
  scheduler.tick();
  const first = state.events[state.events.length - 1];
  assert.equal(first.bar, 1);
  assert.equal(first.beat, 0);
  assert.equal(first.time, 100.06);
  assert.equal(first.kind, "accent");
});

test("hidden return: past events are skipped with no catch-up burst, counter in phase", () => {
  const { state, scheduler } = harness({ bpm: 120, startAt: 0 });
  scheduler.start();
  drive(state, scheduler, 2.0);
  const emittedBefore = state.events.length;
  state.now = 62;
  const beforeTick = state.events.length;
  scheduler.tick();
  const emittedInReturnTick = state.events.length - beforeTick;
  assert.ok(emittedBefore >= 4);
  assert.ok(emittedInReturnTick <= 1, `emitted ${emittedInReturnTick}`);
  assert.equal(scheduler.bar, 32);
  assert.equal(scheduler.beat, 1);
});

test("gain mapping table and BPM clamping", () => {
  assert.equal(gainFor("accent", 0.8), 0.8);
  assert.ok(Math.abs(gainFor("beat", 0.8) - 0.56) < 1e-9);
  assert.ok(Math.abs(gainFor("sub", 0.8) - 0.32) < 1e-9);
  assert.equal(gainFor("accent", 0), 0);
  assert.equal(clampBpm(10), 30);
  assert.equal(clampBpm(999), 240);
  assert.equal(clampBpm(100.4), 100);
  assert.equal(clampBpm("abc"), 100);
});

test("positionAt returns the latest event at or before the given time", () => {
  const { state, scheduler } = harness({ bpm: 120, startAt: 0 });
  scheduler.start();
  drive(state, scheduler, 1.2);
  assert.equal(scheduler.positionAt(0.05), null);
  assert.equal(scheduler.positionAt(0.06).beat, 0);
  assert.equal(scheduler.positionAt(1.2).beat, 2);
});
