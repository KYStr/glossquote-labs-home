// Tests for Game Night Scorecard core (solve + flow).
// All expected values are derived independently from SPEC.md and
// fixtures.json — never generated from the implementation's output.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve, validate } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../../../docs/specs/game-night-scorecard/fixtures.json", import.meta.url),
    "utf8",
  ),
);

function valid(overrides = {}) {
  return {
    players: ["A", "B"],
    mode: "high",
    drop: 0,
    rounds: [{ name: "R1", scores: [0, 0] }],
    ...overrides,
  };
}

function errorCase(input, code, path) {
  assert.deepStrictEqual(solve(input), {
    status: "error",
    error: { code, path },
  });
}

// ---- literal SPEC fixtures ----------------------------------------------

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "solve") continue;
  test(`fixture ${fixture.id}`, () => {
    assert.deepStrictEqual(solve(fixture.input), fixture.expected);
  });
}

// ---- flow fixture driver -------------------------------------------------

function runFlowSteps(flow, steps) {
  for (const step of steps) {
    if (step.type === "edit") flow.edit(step.draft);
    else if (step.type === "run") flow.run(step.runId);
    else if (step.type === "settle") flow.settle(step.runId);
    else if (step.type === "settleWith") flow.settleWith(step.runId, step.reply);
    else if (step.type === "cancel") flow.cancel();
    else if (step.type === "reset") flow.reset();
    else if (step.type === "fail") flow.fail(step.error);
    else throw new Error(`unknown step type: ${step.type}`);
  }
  const { phase, result } = flow.snapshot();
  return { phase, result };
}

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "flow") continue;
  test(`fixture ${fixture.id}`, () => {
    const flow = createFlow();
    assert.deepStrictEqual(runFlowSteps(flow, fixture.input), fixture.expected);
  });
}

// ---- validation: shape and types -----------------------------------------

test("unknown root key -> SHAPE at root", () => {
  errorCase(valid({ extra: 1 }), "SHAPE", "");
});

test("missing drop -> SHAPE at /drop", () => {
  const input = valid();
  delete input.drop;
  errorCase(input, "SHAPE", "/drop");
});

test("missing players -> SHAPE at /players", () => {
  const input = valid();
  delete input.players;
  errorCase(input, "SHAPE", "/players");
});

test("unknown round key -> SHAPE at the round", () => {
  errorCase(
    valid({ rounds: [{ name: "R1", scores: [0, 0], note: "x" }] }),
    "SHAPE",
    "/rounds/0",
  );
});

test("missing round scores -> SHAPE at /rounds/0/scores", () => {
  errorCase(valid({ rounds: [{ name: "R1" }] }), "SHAPE", "/rounds/0/scores");
});

test("root array -> TYPE at root", () => {
  errorCase([], "TYPE", "");
});

test("root null -> TYPE at root", () => {
  errorCase(null, "TYPE", "");
});

test("players not an array -> TYPE /players", () => {
  errorCase(valid({ players: "A" }), "TYPE", "/players");
});

test("1 player -> RANGE /players", () => {
  errorCase(valid({ players: ["A"] }), "RANGE", "/players");
});

test("13 players -> RANGE /players", () => {
  const names = Array.from({ length: 13 }, (_, i) => `P${i}`);
  errorCase(valid({ players: names }), "RANGE", "/players");
});

test("non-string player -> TYPE /players/0", () => {
  errorCase(valid({ players: [7, "B"] }), "TYPE", "/players/0");
});

test("empty player name -> RANGE /players/0", () => {
  errorCase(valid({ players: ["", "B"] }), "RANGE", "/players/0");
});

test("spaces-only player name -> RANGE /players/0", () => {
  errorCase(valid({ players: ["   ", "B"] }), "RANGE", "/players/0");
});

test("player name starting with a hyphen -> RANGE /players/0", () => {
  errorCase(valid({ players: ["-A", "B"] }), "RANGE", "/players/0");
});

test("player name with a slash (text injection) -> RANGE /players/0", () => {
  errorCase(valid({ players: ["A/B", "B"] }), "RANGE", "/players/0");
});

test("player name with markup -> RANGE /players/0", () => {
  errorCase(valid({ players: ["<script>", "B"] }), "RANGE", "/players/0");
});

test("player name over 24 code points -> RANGE /players/0", () => {
  errorCase(valid({ players: ["x".repeat(25), "B"] }), "RANGE", "/players/0");
});

test("duplicate player name -> DUPLICATE at the second occurrence", () => {
  errorCase(valid({ players: ["A", "A"] }), "DUPLICATE", "/players/1");
});

test("NFC duplicate player name -> DUPLICATE at the second occurrence", () => {
  errorCase(
    valid({ players: ["é", "é"] }),
    "DUPLICATE",
    "/players/1",
  );
});

test("unknown mode -> ENUM /mode", () => {
  errorCase(valid({ mode: "middle" }), "ENUM", "/mode");
});

test("non-string mode -> ENUM /mode", () => {
  errorCase(valid({ mode: 5 }), "ENUM", "/mode");
});

test("drop 4 -> RANGE /drop", () => {
  errorCase(valid({ drop: 4 }), "RANGE", "/drop");
});

test("drop -1 -> RANGE /drop", () => {
  errorCase(valid({ drop: -1 }), "RANGE", "/drop");
});

test("drop 1.5 -> TYPE /drop", () => {
  errorCase(valid({ drop: 1.5 }), "TYPE", "/drop");
});

test("drop as a string -> TYPE /drop", () => {
  errorCase(valid({ drop: "1" }), "TYPE", "/drop");
});

test("rounds not an array -> TYPE /rounds", () => {
  errorCase(valid({ rounds: "R1" }), "TYPE", "/rounds");
});

test("no rounds -> RANGE /rounds", () => {
  errorCase(valid({ rounds: [] }), "RANGE", "/rounds");
});

test("31 rounds -> RANGE /rounds", () => {
  const rounds = Array.from({ length: 31 }, (_, i) => ({
    name: `R${i + 1}`,
    scores: [0, 0],
  }));
  errorCase(valid({ rounds }), "RANGE", "/rounds");
});

test("round not an object -> TYPE /rounds/0", () => {
  errorCase(valid({ rounds: ["R1"] }), "TYPE", "/rounds/0");
});

test("duplicate round name -> DUPLICATE at /rounds/1/name", () => {
  errorCase(
    valid({
      rounds: [
        { name: "R1", scores: [0, 0] },
        { name: "R1", scores: [1, 1] },
      ],
    }),
    "DUPLICATE",
    "/rounds/1/name",
  );
});

test("empty round name -> RANGE /rounds/0/name", () => {
  errorCase(valid({ rounds: [{ name: "", scores: [0, 0] }] }), "RANGE", "/rounds/0/name");
});

test("scores not an array -> TYPE /rounds/0/scores", () => {
  errorCase(valid({ rounds: [{ name: "R1", scores: 0 }] }), "TYPE", "/rounds/0/scores");
});

test("string score -> TYPE at the element", () => {
  errorCase(
    valid({ rounds: [{ name: "R1", scores: [0, "5"] }] }),
    "TYPE",
    "/rounds/0/scores/1",
  );
});

test("score 1000 -> RANGE at the element", () => {
  errorCase(
    valid({ rounds: [{ name: "R1", scores: [1000, 0] }] }),
    "RANGE",
    "/rounds/0/scores/0",
  );
});

test("score -1000 -> RANGE at the element", () => {
  errorCase(
    valid({ rounds: [{ name: "R1", scores: [-1000, 0] }] }),
    "RANGE",
    "/rounds/0/scores/0",
  );
});

test("fractional score -> TYPE at the element", () => {
  errorCase(
    valid({ rounds: [{ name: "R1", scores: [1.5, 0] }] }),
    "TYPE",
    "/rounds/0/scores/0",
  );
});

test("-0 score -> TYPE at the element", () => {
  errorCase(
    valid({ rounds: [{ name: "R1", scores: [-0, 0] }] }),
    "TYPE",
    "/rounds/0/scores/0",
  );
});

test("scores row length is checked before drop (RANGE wins over ORDER)", () => {
  // One round only, drop 1 would also be ORDER, but the short scores
  // row must be reported first per the SPEC's cross-field order.
  errorCase(
    valid({
      drop: 1,
      rounds: [{ name: "R1", scores: [0] }],
    }),
    "RANGE",
    "/rounds/0/scores",
  );
});

test("short scores row in the second round -> RANGE /rounds/1/scores", () => {
  errorCase(
    valid({
      rounds: [
        { name: "R1", scores: [0, 0] },
        { name: "R2", scores: [0] },
      ],
    }),
    "RANGE",
    "/rounds/1/scores",
  );
});

// ---- SIZE boundary ---------------------------------------------------------

test("input over 65536 bytes -> SIZE at root", () => {
  const input = valid({ players: ["x".repeat(70000), "B"] });
  errorCase(input, "SIZE", "");
});

test("input at exactly 65536 bytes passes SIZE (fails later on the name)", () => {
  const base = valid();
  const baseBytes = Buffer.byteLength(JSON.stringify(base), "utf8");
  // Replace "A" (1 byte) with n x's so the total is exactly 65536.
  const n = 65536 - baseBytes + 1;
  const input = valid({ players: ["x".repeat(n), "B"] });
  assert.strictEqual(Buffer.byteLength(JSON.stringify(input), "utf8"), 65536);
  errorCase(input, "RANGE", "/players/0");
});

test("input at 65537 bytes -> SIZE at root", () => {
  const base = valid();
  const baseBytes = Buffer.byteLength(JSON.stringify(base), "utf8");
  const n = 65537 - baseBytes + 1;
  const input = valid({ players: ["x".repeat(n), "B"] });
  assert.strictEqual(Buffer.byteLength(JSON.stringify(input), "utf8"), 65537);
  errorCase(input, "SIZE", "");
});

// ---- algorithm: hand-derived ----------------------------------------------

test("drop 3 of 4 rounds keeps only the best round", () => {
  const result = solve(
    valid({
      drop: 3,
      rounds: [
        { name: "R1", scores: [1, 0] },
        { name: "R2", scores: [2, 0] },
        { name: "R3", scores: [3, 0] },
        { name: "R4", scores: [4, 0] },
      ],
    }),
  );
  assert.deepStrictEqual(result, {
    status: "ok",
    result: {
      standings: [
        { name: "A", rank: 1, total: 4, best: 4, dropped: ["R1", "R2", "R3"] },
        { name: "B", rank: 2, total: 0, best: 0, dropped: ["R1", "R2", "R3"] },
      ],
    },
  });
});

test("dropped rounds are listed in round input order, not drop order", () => {
  // Worst-first order is R3 (0), R1 (1); the dropped list is R1, R3.
  const result = solve(
    valid({
      drop: 2,
      rounds: [
        { name: "R1", scores: [1, 0] },
        { name: "R2", scores: [3, 0] },
        { name: "R3", scores: [0, 0] },
      ],
    }),
  );
  assert.deepStrictEqual(result.result.standings[0], {
    name: "A",
    rank: 1,
    total: 3,
    best: 3,
    dropped: ["R1", "R3"],
  });
});

test("low mode drops the earliest tied worst round", () => {
  const result = solve(
    valid({
      mode: "low",
      drop: 1,
      rounds: [
        { name: "R1", scores: [5, 0] },
        { name: "R2", scores: [5, 0] },
      ],
    }),
  );
  assert.deepStrictEqual(result.result.standings, [
    { name: "B", rank: 1, total: 0, best: 0, dropped: ["R1"] },
    { name: "A", rank: 2, total: 5, best: 5, dropped: ["R1"] },
  ]);
});

test("low mode best is the smallest kept round", () => {
  const result = solve(
    valid({
      mode: "low",
      drop: 0,
      rounds: [{ name: "R1", scores: [3, 9] }],
    }),
  );
  assert.deepStrictEqual(result.result.standings[0], {
    name: "A",
    rank: 1,
    total: 3,
    best: 3,
    dropped: [],
  });
});

test("maximum kept total is 29,970 (30 rounds x 999)", () => {
  const rounds = Array.from({ length: 30 }, (_, i) => ({
    name: `R${i + 1}`,
    scores: [999, 999],
  }));
  const result = solve(valid({ drop: 0, rounds }));
  assert.deepStrictEqual(result.result.standings, [
    { name: "A", rank: 1, total: 29970, best: 999, dropped: [] },
    { name: "B", rank: 1, total: 29970, best: 999, dropped: [] },
  ]);
});

test("minimum kept total is -29,970 (30 rounds x -999)", () => {
  const rounds = Array.from({ length: 30 }, (_, i) => ({
    name: `R${i + 1}`,
    scores: [-999, -999],
  }));
  const result = solve(valid({ drop: 0, rounds }));
  assert.deepStrictEqual(result.result.standings, [
    { name: "A", rank: 1, total: -29970, best: -999, dropped: [] },
    { name: "B", rank: 1, total: -29970, best: -999, dropped: [] },
  ]);
});

test("four players can share ranks 1, 1, 3, 3", () => {
  const result = solve(
    valid({
      players: ["A", "B", "C", "D"],
      drop: 0,
      rounds: [
        { name: "R1", scores: [5, 5, 4, 4] },
        { name: "R2", scores: [5, 5, 6, 6] },
      ],
    }),
  );
  assert.deepStrictEqual(result.result.standings, [
    { name: "C", rank: 1, total: 10, best: 6, dropped: [] },
    { name: "D", rank: 1, total: 10, best: 6, dropped: [] },
    { name: "A", rank: 3, total: 10, best: 5, dropped: [] },
    { name: "B", rank: 3, total: 10, best: 5, dropped: [] },
  ]);
});

test("0 is a real score, not a missing value", () => {
  const result = solve(valid({ drop: 0 }));
  assert.deepStrictEqual(result.result.standings, [
    { name: "A", rank: 1, total: 0, best: 0, dropped: [] },
    { name: "B", rank: 1, total: 0, best: 0, dropped: [] },
  ]);
});

test("all-negative totals order by the same comparison", () => {
  const result = solve(
    valid({
      drop: 0,
      rounds: [
        { name: "R1", scores: [-5, -1] },
        { name: "R2", scores: [-3, -2] },
      ],
    }),
  );
  assert.deepStrictEqual(result.result.standings, [
    { name: "B", rank: 1, total: -3, best: -1, dropped: [] },
    { name: "A", rank: 2, total: -8, best: -3, dropped: [] },
  ]);
});

test("validate returns normalized names (trims U+0020, NFC)", () => {
  const checked = validate(
    valid({ players: ["  A ", "B"], rounds: [{ name: " R1 ", scores: [1, 2] }] }),
  );
  assert.strictEqual(checked.ok, true);
  assert.deepStrictEqual(checked.data.players, ["A", "B"]);
  assert.strictEqual(checked.data.rounds[0].name, "R1");
});

// ---- flow extras ------------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  const draft = fixtures.cases.find(
    (c) => c.id === "game-night-scorecard.high-tiebreak",
  ).input;
  flow.edit(draft);
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: fail then edit returns to dirty with the error cleared", () => {
  const flow = createFlow();
  flow.fail({ code: "SYNTAX", path: "/rounds/0/scores/1" });
  assert.strictEqual(flow.snapshot().phase, "error");
  flow.edit(valid());
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: a stale error reply cannot overwrite a newer run", () => {
  const flow = createFlow();
  const high = fixtures.cases.find(
    (c) => c.id === "game-night-scorecard.high-tiebreak",
  ).input;
  const low = fixtures.cases.find(
    (c) => c.id === "game-night-scorecard.low-tiebreak",
  ).input;
  runFlowSteps(flow, [
    { type: "edit", draft: high },
    { type: "run", runId: 1 },
    { type: "cancel" },
    { type: "edit", draft: low },
    { type: "run", runId: 2 },
    {
      type: "settleWith",
      runId: 1,
      reply: { status: "error", error: { code: "ORDER", path: "/drop" } },
    },
  ]);
  // Still busy on run 2; the stale error was discarded.
  assert.deepStrictEqual(flow.snapshot(), { phase: "busy", result: null, error: null });
  const done = runFlowSteps(flow, [{ type: "settle", runId: 2 }]);
  assert.deepStrictEqual(done, {
    phase: "ready",
    result: {
      standings: [
        { name: "B", rank: 1, total: 4, best: 1, dropped: ["R3"] },
        { name: "A", rank: 2, total: 4, best: 2, dropped: ["R3"] },
      ],
    },
  });
});

test("flow: a second run while busy is ignored", () => {
  const flow = createFlow();
  const draft = fixtures.cases.find(
    (c) => c.id === "game-night-scorecard.high-tiebreak",
  ).input;
  flow.edit(draft);
  flow.run(1);
  flow.run(99);
  // Settling the ignored runId does nothing; the real run still settles.
  flow.settle(99);
  assert.strictEqual(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
});

test("flow: loading the sample draft then running shows the high-tiebreak standings", () => {
  const flow = createFlow();
  const draft = fixtures.cases.find(
    (c) => c.id === "game-night-scorecard.high-tiebreak",
  ).input;
  const done = runFlowSteps(flow, [
    { type: "edit", draft },
    { type: "run", runId: 1 },
    { type: "settle", runId: 1 },
  ]);
  assert.deepStrictEqual(done, {
    phase: "ready",
    result: {
      standings: [
        { name: "A", rank: 1, total: 16, best: 10, dropped: ["R2"] },
        { name: "B", rank: 2, total: 16, best: 8, dropped: ["R3"] },
        { name: "C", rank: 3, total: 14, best: 7, dropped: ["R2"] },
      ],
    },
  });
});
