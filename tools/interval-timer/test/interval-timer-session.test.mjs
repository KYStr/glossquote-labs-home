// Session state-machine tests for the Interval Timer: every session
// fixture from test/fixtures.json is replayed step by step (initial
// snapshot, then each event's cues and snapshot), plus hand-derived
// checks for invalid events and session immutability. Expected values
// come from the SPEC fixtures, never from the implementation's output.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  applyEvent,
  run,
  snapshot,
  startSession,
} from "../public/js/core/interval-timer.mjs";

const fixtures = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fixtures.json"), "utf8"),
);
const sessionCases = fixtures.cases.filter((entry) => entry.kind === "session");

function resultFromProgram(program) {
  const input = {
    prepareSeconds: String(program.prepareSeconds),
    workSeconds: String(program.workSeconds),
    restSeconds: String(program.restSeconds),
    rounds: String(program.rounds),
    finalRest: program.finalRest,
  };
  const outcome = run(input);
  assert.equal(outcome.ok, true, `fixture program must run: ${JSON.stringify(input)}`);
  return outcome.result;
}

describe("session: SPEC fixtures, replayed step by step", () => {
  for (const entry of sessionCases) {
    it(entry.id, () => {
      let session = startSession(resultFromProgram(entry.input.program));
      assert.deepEqual(snapshot(session), entry.expected.initial);
      entry.input.steps.forEach((step, i) => {
        const outcome = applyEvent(session, step.event);
        assert.deepEqual(outcome.cues, entry.expected.steps[i].cues, `${entry.id} step ${i} cues`);
        assert.deepEqual(
          snapshot(outcome.session),
          entry.expected.steps[i].snapshot,
          `${entry.id} step ${i} snapshot`,
        );
        session = outcome.session;
      });
    });
  }
});

describe("session: hand-derived invalid events and immutability", () => {
  const result = resultFromProgram({
    prepareSeconds: 5,
    workSeconds: 10,
    restSeconds: 0,
    rounds: 1,
    finalRest: "skip",
  });

  it("unknown types and malformed events are ignored whole", () => {
    const session = startSession(result);
    for (const bad of [
      null,
      42,
      "start",
      [],
      {},
      { type: 1 },
      { type: "jump" },
      { type: "tick" },
      { type: "tick", elapsedMs: "1000" },
      { type: "tick", elapsedMs: 1.5 },
      { type: "tick", elapsedMs: -1 },
      { type: "tick", elapsedMs: Number.MAX_SAFE_INTEGER + 1 },
      { type: "pause", elapsedMs: Number.NaN },
      { type: "pause", elapsedMs: Infinity },
    ]) {
      const outcome = applyEvent(session, bad);
      assert.deepEqual(outcome.cues, []);
      assert.equal(outcome.session, session);
      assert.deepEqual(snapshot(outcome.session), snapshot(session));
    }
  });

  it("applyEvent never mutates the input session", () => {
    const before = startSession(result);
    const beforeSnapshot = snapshot(before);
    const outcome = applyEvent(before, { type: "start" });
    assert.notEqual(outcome.session, before);
    assert.deepEqual(snapshot(before), beforeSnapshot);
    assert.equal(before.phase, "ready");
    assert.equal(before.activeElapsedMs, 0);
  });

  it("tick while paused is ignored (unlisted phase/event pair)", () => {
    let session = startSession(result);
    session = applyEvent(session, { type: "start" }).session;
    session = applyEvent(session, { type: "pause", elapsedMs: 2000 }).session;
    const outcome = applyEvent(session, { type: "tick", elapsedMs: 4000 });
    assert.deepEqual(outcome.cues, []);
    assert.equal(outcome.session, session);
    assert.deepEqual(snapshot(outcome.session).phase, "paused");
    assert.equal(snapshot(outcome.session).activeElapsedMs, 2000);
  });

  it("start while finished is ignored; reset returns to ready", () => {
    let session = startSession(result);
    session = applyEvent(session, { type: "start" }).session;
    session = applyEvent(session, { type: "tick", elapsedMs: 15000 }).session;
    assert.equal(snapshot(session).phase, "finished");
    const ignored = applyEvent(session, { type: "start" });
    assert.equal(ignored.session, session);
    const reset = applyEvent(session, { type: "reset" });
    assert.deepEqual(snapshot(reset.session), {
      phase: "ready",
      segmentIndex: null,
      kind: null,
      round: null,
      segmentRemainingSeconds: null,
      totalRemainingSeconds: 15,
      activeElapsedMs: 0,
    });
  });

  it("startSession rejects a non-result value", () => {
    assert.throws(() => startSession(null), TypeError);
    assert.throws(() => startSession({ ok: false }), TypeError);
    assert.throws(() => startSession({ segments: [], totalSeconds: 0 }), TypeError);
  });

  it("a tick exactly on a boundary lands in the next segment with full remaining", () => {
    let session = startSession(result);
    session = applyEvent(session, { type: "start" }).session;
    // prepare 0–5 s, work 5–15 s. A tick at exactly 5000 ms is work.
    const outcome = applyEvent(session, { type: "tick", elapsedMs: 5000 });
    assert.deepEqual(outcome.cues, [
      { type: "segmentStart", segmentIndex: 1, kind: "work", round: 1 },
    ]);
    assert.deepEqual(snapshot(outcome.session), {
      phase: "running",
      segmentIndex: 1,
      kind: "work",
      round: 1,
      segmentRemainingSeconds: 10,
      totalRemainingSeconds: 10,
      activeElapsedMs: 5000,
    });
  });
});
