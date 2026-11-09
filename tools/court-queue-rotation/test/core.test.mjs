// Tests for Drop-In Court Queue (spec-court-queue-rotation-20261109).
// Expected values come from docs/specs/court-queue-rotation/fixtures.json
// and from hand-derived cases; none are generated from the implementation.
// Run offline with: node --test (Node >= 24).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { solve, parseAsciiInteger } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";

const FIXTURES = JSON.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../docs/specs/court-queue-rotation/fixtures.json",
    ),
    "utf8",
  ),
);

const solveCases = FIXTURES.cases.filter((c) => c.kind === "solve");
const flowCases = FIXTURES.cases.filter((c) => c.kind === "flow");

for (const c of solveCases) {
  test(`solve fixture ${c.id}`, () => {
    assert.deepStrictEqual(solve(c.input), c.expected);
  });
}

for (const c of flowCases) {
  test(`flow fixture ${c.id}`, () => {
    const flow = createFlow();
    for (const step of c.input) {
      if (step.type === "edit") flow.edit(step.draft);
      else if (step.type === "run") flow.run(step.runId);
      else if (step.type === "settle") flow.settle(step.runId);
      else if (step.type === "cancel") flow.cancel();
      else throw new Error(`unknown flow step ${step.type}`);
    }
    assert.deepStrictEqual(flow.snapshot(), c.expected);
  });
}

const BASE = { teams: ["A", "B"], initialQueue: ["A", "B"], maxConsecutive: 2, events: [] };

test("SIZE: exactly 65536 bytes passes the size gate, 65537 fails with SIZE", () => {
  const encoder = new TextEncoder();
  const baseJson = JSON.stringify(BASE);
  // Replace the first team name with a long ASCII name to reach exact sizes.
  for (const target of [65536, 65537]) {
    const pad = target - baseJson.length + 1; // "A" (1 char) -> pad chars, teams only
    const input = {
      ...BASE,
      teams: ["A".repeat(pad), "B"],
    };
    assert.strictEqual(encoder.encode(JSON.stringify(input)).length, target);
    const reply = solve(input);
    if (target === 65537) {
      assert.deepStrictEqual(reply, {
        status: "error",
        error: { code: "SIZE", path: "" },
      });
    } else {
      // At the cap the size gate passes; the over-long name then fails RANGE.
      assert.deepStrictEqual(reply, {
        status: "error",
        error: { code: "RANGE", path: "/teams/0" },
      });
    }
  }
});

test("root shape and type", () => {
  assert.deepStrictEqual(solve(null), { status: "error", error: { code: "TYPE", path: "" } });
  assert.deepStrictEqual(solve([]), { status: "error", error: { code: "TYPE", path: "" } });
  assert.deepStrictEqual(solve({ ...BASE, extra: 1 }), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const { events, ...missing } = BASE;
  assert.deepStrictEqual(solve(missing), {
    status: "error",
    error: { code: "SHAPE", path: "/events" },
  });
});

test("teams bounds and names", () => {
  assert.deepStrictEqual(solve({ ...BASE, teams: ["A"] }), {
    status: "error",
    error: { code: "RANGE", path: "/teams" },
  });
  assert.deepStrictEqual(
    solve({ ...BASE, teams: Array.from({ length: 13 }, (_, i) => `T${i}`) }),
    { status: "error", error: { code: "RANGE", path: "/teams" } },
  );
  assert.deepStrictEqual(solve({ ...BASE, teams: "AB" }), {
    status: "error",
    error: { code: "TYPE", path: "/teams" },
  });
  assert.deepStrictEqual(solve({ ...BASE, teams: ["A", 2] }), {
    status: "error",
    error: { code: "TYPE", path: "/teams/1" },
  });
  assert.deepStrictEqual(solve({ ...BASE, teams: ["A", "A"] }), {
    status: "error",
    error: { code: "DUPLICATE", path: "/teams/1" },
  });
  // NFC duplicates: e + combining acute and precomposed e-acute are one name.
  assert.deepStrictEqual(solve({ ...BASE, teams: ["é", "é"] }), {
    status: "error",
    error: { code: "DUPLICATE", path: "/teams/1" },
  });
  // Case matters: A and a are different teams.
  assert.strictEqual(
    solve({ ...BASE, teams: ["A", "a"], initialQueue: ["A", "a"] }).status,
    "ok",
  );
  assert.deepStrictEqual(solve({ ...BASE, teams: ["", "B"] }), {
    status: "error",
    error: { code: "RANGE", path: "/teams/0" },
  });
  assert.deepStrictEqual(solve({ ...BASE, teams: ["A".repeat(25), "B"] }), {
    status: "error",
    error: { code: "RANGE", path: "/teams/0" },
  });
  assert.deepStrictEqual(solve({ ...BASE, teams: ["-A", "B"] }), {
    status: "error",
    error: { code: "RANGE", path: "/teams/0" },
  });
  assert.deepStrictEqual(solve({ ...BASE, teams: ["A!", "B"] }), {
    status: "error",
    error: { code: "RANGE", path: "/teams/0" },
  });
  // Names are trimmed (U+0020) and NFC-normalized on output.
  const trimmed = solve({
    teams: ["  A  ", "B"],
    initialQueue: ["  A  "],
    maxConsecutive: 2,
    events: [],
  });
  assert.deepStrictEqual(trimmed, {
    status: "ok",
    result: { played: 0, queue: ["A"], holder: null, active: null, next: null },
  });
});

test("initialQueue bounds, refs and duplicates", () => {
  assert.deepStrictEqual(
    solve({ ...BASE, initialQueue: Array.from({ length: 13 }, () => "A") }),
    { status: "error", error: { code: "RANGE", path: "/initialQueue" } },
  );
  assert.deepStrictEqual(solve({ ...BASE, initialQueue: ["Z"] }), {
    status: "error",
    error: { code: "REF", path: "/initialQueue/0" },
  });
  assert.deepStrictEqual(solve({ ...BASE, initialQueue: ["A", "A"] }), {
    status: "error",
    error: { code: "DUPLICATE", path: "/initialQueue/1" },
  });
});

test("maxConsecutive integer rules", () => {
  for (const bad of [0, 4, -1]) {
    assert.deepStrictEqual(solve({ ...BASE, maxConsecutive: bad }), {
      status: "error",
      error: { code: "RANGE", path: "/maxConsecutive" },
    });
  }
  for (const bad of ["2", 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepStrictEqual(solve({ ...BASE, maxConsecutive: bad }), {
      status: "error",
      error: { code: "TYPE", path: "/maxConsecutive" },
    });
  }
  assert.deepStrictEqual(solve({ ...BASE, maxConsecutive: -0 }), {
    status: "error",
    error: { code: "RANGE", path: "/maxConsecutive" },
  });
});

test("events bounds and exact union shapes", () => {
  assert.deepStrictEqual(
    solve({ ...BASE, events: Array.from({ length: 121 }, () => ({ type: "start" })) }),
    { status: "error", error: { code: "RANGE", path: "/events" } },
  );
  assert.deepStrictEqual(solve({ ...BASE, events: [42] }), {
    status: "error",
    error: { code: "TYPE", path: "/events/0" },
  });
  assert.deepStrictEqual(solve({ ...BASE, events: [{ team: "A" }] }), {
    status: "error",
    error: { code: "SHAPE", path: "/events/0/type" },
  });
  assert.deepStrictEqual(solve({ ...BASE, events: [{ type: "play" }] }), {
    status: "error",
    error: { code: "ENUM", path: "/events/0/type" },
  });
  assert.deepStrictEqual(solve({ ...BASE, events: [{ type: "join" }] }), {
    status: "error",
    error: { code: "SHAPE", path: "/events/0/team" },
  });
  assert.deepStrictEqual(
    solve({ ...BASE, events: [{ type: "join", team: "A", extra: 1 }] }),
    { status: "error", error: { code: "SHAPE", path: "/events/0" } },
  );
  assert.deepStrictEqual(
    solve({ ...BASE, events: [{ type: "start", team: "A" }] }),
    { status: "error", error: { code: "SHAPE", path: "/events/0" } },
  );
  assert.deepStrictEqual(solve({ ...BASE, events: [{ type: "finish" }] }), {
    status: "error",
    error: { code: "SHAPE", path: "/events/0/winner" },
  });
  assert.deepStrictEqual(
    solve({ ...BASE, events: [{ type: "finish", winner: 123 }] }),
    { status: "error", error: { code: "TYPE", path: "/events/0/winner" } },
  );
});

test("event refs", () => {
  assert.deepStrictEqual(solve({ ...BASE, events: [{ type: "join", team: "Z" }] }), {
    status: "error",
    error: { code: "REF", path: "/events/0/team" },
  });
  assert.deepStrictEqual(
    solve({
      ...BASE,
      events: [{ type: "start" }, { type: "finish", winner: "Z" }],
    }),
    { status: "error", error: { code: "REF", path: "/events/1/winner" } },
  );
});

test("STATE errors during replay", () => {
  // Join a team that is already waiting.
  assert.deepStrictEqual(solve({ ...BASE, events: [{ type: "join", team: "A" }] }), {
    status: "error",
    error: { code: "STATE", path: "/events/0" },
  });
  // Leave a team that is not waiting or staying.
  assert.deepStrictEqual(
    solve({ ...BASE, initialQueue: [], events: [{ type: "leave", team: "A" }] }),
    { status: "error", error: { code: "STATE", path: "/events/0" } },
  );
  // Leave a team that is on court.
  assert.deepStrictEqual(
    solve({
      ...BASE,
      events: [{ type: "start" }, { type: "leave", team: "A" }],
    }),
    { status: "error", error: { code: "STATE", path: "/events/1" } },
  );
  // Start while a game is on.
  assert.deepStrictEqual(
    solve({ ...BASE, events: [{ type: "start" }, { type: "start" }] }),
    { status: "error", error: { code: "STATE", path: "/events/1" } },
  );
  // Finish with no game on.
  assert.deepStrictEqual(
    solve({ ...BASE, events: [{ type: "finish", winner: null }] }),
    { status: "error", error: { code: "STATE", path: "/events/0" } },
  );
  // Join a team that is on court.
  assert.deepStrictEqual(
    solve({
      teams: ["A", "B", "C"],
      initialQueue: ["A", "B"],
      maxConsecutive: 2,
      events: [{ type: "start" }, { type: "join", team: "A" }],
    }),
    { status: "error", error: { code: "STATE", path: "/events/1" } },
  );
});

test("NEED_TEAMS when the holder has nobody to play", () => {
  // A wins once and stays as holder; B (the loser, back in the queue)
  // leaves, so the queue is empty and no next game can start.
  assert.deepStrictEqual(
    solve({
      ...BASE,
      events: [
        { type: "start" },
        { type: "finish", winner: "A" },
        { type: "leave", team: "B" },
        { type: "start" },
      ],
    }),
    { status: "error", error: { code: "NEED_TEAMS", path: "/events/3" } },
  );
});

test("draw returns both teams to the tail in court order", () => {
  assert.deepStrictEqual(
    solve({
      teams: ["A", "B", "C", "D"],
      initialQueue: ["A", "B", "C", "D"],
      maxConsecutive: 2,
      events: [{ type: "start" }, { type: "finish", winner: null }],
    }),
    {
      status: "ok",
      result: {
        played: 1,
        queue: ["C", "D", "A", "B"],
        holder: null,
        active: null,
        next: ["C", "D"],
      },
    },
  );
});

test("holder streak grows to the cap, then both return to the tail", () => {
  assert.deepStrictEqual(
    solve({
      teams: ["A", "B", "C"],
      initialQueue: ["A", "B", "C"],
      maxConsecutive: 3,
      events: [
        { type: "start" },
        { type: "finish", winner: "A" },
        { type: "start" },
        { type: "finish", winner: "A" },
        { type: "start" },
        { type: "finish", winner: "A" },
      ],
    }),
    {
      status: "ok",
      result: {
        played: 3,
        queue: ["C", "A", "B"],
        holder: null,
        active: null,
        next: ["C", "A"],
      },
    },
  );
});

test("next preview with a holder and waiting teams", () => {
  // After one win the loser B is back in the queue and A stays as holder,
  // so the preview is holder A with queue head B.
  assert.deepStrictEqual(
    solve({
      ...BASE,
      events: [{ type: "start" }, { type: "finish", winner: "A" }],
    }),
    {
      status: "ok",
      result: {
        played: 1,
        queue: ["B"],
        holder: { team: "A", streak: 1 },
        active: null,
        next: ["A", "B"],
      },
    },
  );
  // A late team C joins behind B; the preview is still A with B.
  assert.deepStrictEqual(
    solve({
      teams: ["A", "B", "C"],
      initialQueue: ["A", "B"],
      maxConsecutive: 2,
      events: [
        { type: "start" },
        { type: "finish", winner: "A" },
        { type: "join", team: "C" },
      ],
    }),
    {
      status: "ok",
      result: {
        played: 1,
        queue: ["B", "C"],
        holder: { team: "A", streak: 1 },
        active: null,
        next: ["A", "B"],
      },
    },
  );
});

test("120 events replay exactly (60 games, cap 1, two teams)", () => {
  const events = [];
  for (let i = 0; i < 60; i += 1) {
    events.push({ type: "start" }, { type: "finish", winner: "A" });
  }
  assert.strictEqual(events.length, 120);
  assert.deepStrictEqual(
    solve({ ...BASE, maxConsecutive: 1, events }),
    {
      status: "ok",
      result: {
        played: 60,
        queue: ["A", "B"],
        holder: null,
        active: null,
        next: ["A", "B"],
      },
    },
  );
});

test("parseAsciiInteger follows the SPEC integer syntax", () => {
  assert.deepStrictEqual(parseAsciiInteger("0"), { ok: true, value: 0 });
  assert.deepStrictEqual(parseAsciiInteger("12"), { ok: true, value: 12 });
  assert.deepStrictEqual(parseAsciiInteger("-3", true), { ok: true, value: -3 });
  for (const bad of ["007", " 2", "2 ", "+2", "2.0", "２", "-0", "", "1e3", "0x2"]) {
    assert.deepStrictEqual(parseAsciiInteger(bad), { ok: false });
  }
  assert.deepStrictEqual(parseAsciiInteger("-3"), { ok: false });
});

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  flow.edit(BASE);
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null });
});

test("flow: blank submit is an error, then a fixed draft recovers", () => {
  const flow = createFlow();
  flow.edit({ teams: [], initialQueue: [], maxConsecutive: 2, events: [] });
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), { phase: "error", result: null });
  assert.deepStrictEqual(flow.getError(), { code: "RANGE", path: "/teams" });
  flow.edit(BASE);
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null });
  flow.run(2);
  flow.settle(2);
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "ready",
    result: { played: 0, queue: ["A", "B"], holder: null, active: null, next: ["A", "B"] },
  });
});

test("flow: a stale error reply cannot overwrite a newer ready state", () => {
  const flow = createFlow();
  flow.edit({ teams: [], initialQueue: [], maxConsecutive: 2, events: [] });
  flow.run(1);
  flow.edit(BASE);
  flow.run(2);
  flow.settle(2);
  assert.strictEqual(flow.snapshot().phase, "ready");
  const result = flow.snapshot().result;
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), { phase: "ready", result });
});

test("flow: run while busy is ignored; cancel when idle is a no-op", () => {
  const flow = createFlow();
  flow.edit(BASE);
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.strictEqual(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.cancel();
  assert.strictEqual(flow.snapshot().phase, "ready");
});

test("flow: loadSample stays dirty and reportFormError keeps the draft", () => {
  const flow = createFlow();
  const sample = solveCases[0].input;
  flow.loadSample(sample);
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null });
  flow.reportFormError({ code: "SYNTAX", path: "/maxConsecutive" });
  assert.deepStrictEqual(flow.snapshot(), { phase: "error", result: null });
  assert.deepStrictEqual(flow.getError(), { code: "SYNTAX", path: "/maxConsecutive" });
  assert.deepStrictEqual(flow.getDraft(), sample);
  flow.edit(sample);
  assert.strictEqual(flow.snapshot().phase, "dirty");
});
