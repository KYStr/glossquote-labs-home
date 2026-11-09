import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSession } from "../public/js/core/wheel.mjs";

function scripted(values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("scripted source exhausted");
    const v = values[i];
    i += 1;
    return v;
  };
}

describe("elimination state machine (SPEC sections 2-4)", () => {
  it("reproduces fixture W4: picks C, A, D and final remaining B", () => {
    const session = createSession({ elimination: true });
    session.setEntries(["A", "B", "C", "D"]);
    const source = scripted([2, 0, 1]);

    const first = session.spin(source);
    assert.equal(first.text, "C");
    assert.equal(first.pick, 1);
    assert.equal(first.finalRemaining, null);
    assert.deepEqual(session.getState().active, ["A", "B", "D"]);

    const second = session.spin(source);
    assert.equal(second.text, "A");
    assert.equal(second.pick, 2);
    assert.deepEqual(session.getState().active, ["B", "D"]);

    const third = session.spin(source);
    assert.equal(third.text, "D");
    assert.equal(third.pick, 3);
    assert.equal(third.finalRemaining, "B");

    const state = session.getState();
    assert.deepEqual(state.history, [
      { text: "C", pick: 1 },
      { text: "A", pick: 2 },
      { text: "D", pick: 3 },
    ]);
    assert.equal(state.finalRemaining, "B");
    assert.equal(state.finished, true);
    assert.equal(state.canSpin, false);
    // The final remaining entry is never drawn, so a fourth spin refuses.
    assert.throws(() => session.spin(scripted([0])));
  });

  it("removes only the drawn occurrence when duplicates exist", () => {
    const session = createSession({ elimination: true });
    session.setEntries(["X", "X", "Y"]);
    const outcome = session.spin(scripted([0]));
    assert.equal(outcome.text, "X");
    assert.deepEqual(session.getState().active, ["X", "Y"]);
    assert.equal(session.getState().finalRemaining, null);
  });

  it("locks during an elimination run and unlocks on reset", () => {
    const session = createSession({ elimination: true });
    session.setEntries(["A", "B", "C"]);
    assert.equal(session.getState().locked, false);
    session.spin(scripted([1]));
    assert.equal(session.getState().locked, true);
    session.reset();
    const state = session.getState();
    assert.equal(state.locked, false);
    assert.deepEqual(state.active, ["A", "B", "C"]);
    assert.deepEqual(state.history, []);
    assert.equal(state.finalRemaining, null);
    assert.equal(state.canSpin, true);
  });

  it("setEntries restores the full list and clears history", () => {
    const session = createSession({ elimination: true });
    session.setEntries(["A", "B", "C"]);
    session.spin(scripted([0]));
    session.setEntries(["D", "E"]);
    const state = session.getState();
    assert.deepEqual(state.active, ["D", "E"]);
    assert.deepEqual(state.history, []);
    assert.equal(state.locked, false);
  });
});

describe("plain (non-elimination) mode", () => {
  it("keeps every entry on the wheel and records ordered picks", () => {
    const session = createSession({ elimination: false });
    session.setEntries(["A", "B", "C"]);
    const source = scripted([2, 2, 0]);
    assert.equal(session.spin(source).text, "C");
    assert.equal(session.spin(source).text, "C");
    assert.equal(session.spin(source).text, "A");
    const state = session.getState();
    assert.deepEqual(state.active, ["A", "B", "C"]);
    assert.deepEqual(state.history, [
      { text: "C", pick: 1 },
      { text: "C", pick: 2 },
      { text: "A", pick: 3 },
    ]);
    assert.equal(state.finalRemaining, null);
    assert.equal(state.locked, false);
    assert.equal(state.canSpin, true);
  });

  it("refuses to spin with fewer than 2 active entries", () => {
    const session = createSession();
    session.setEntries(["only"]);
    assert.throws(() => session.spin(scripted([0])));
  });
});
