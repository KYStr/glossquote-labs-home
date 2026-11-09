// Tests for Film Roll Frame Budget core. Literal expectations come from
// docs/specs/film-roll-budget/fixtures.json (imported, not copied) and from
// hand-derived cases; nothing is generated from the implementation.
// Run with: node --test

import test from "node:test";
import assert from "node:assert/strict";
import {
  solve,
  validate,
  normalizeName,
  MAX_JSON_BYTES,
  MAX_SCENES,
  MAX_FRAMES,
} from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";
import fixtures from "../../../docs/specs/film-roll-budget/fixtures.json" with {
  type: "json",
};

// ---- literal SPEC fixtures ------------------------------------------------

test("fixtures file: 8 cases with the pinned ids", () => {
  assert.equal(fixtures.specId, "spec-film-roll-budget-20261109");
  assert.equal(fixtures.cases.length, 8);
  assert.deepEqual(
    fixtures.cases.map((c) => c.id),
    [
      "film-roll-budget.priority-rounds",
      "film-roll-budget.reserve-and-spare",
      "film-roll-budget.exact-min",
      "film-roll-budget.min-short",
      "film-roll-budget.empty-roll",
      "film-roll-budget.inverted-target",
      "film-roll-budget.dirty-after-edit",
      "film-roll-budget.cancel-then-late",
    ],
  );
});

for (const c of fixtures.cases.filter((c) => c.kind === "solve")) {
  test(`solve fixture: ${c.id}`, () => {
    assert.deepEqual(solve(c.input), c.expected);
  });
}

function replayFlow(flowCase) {
  const flow = createFlow();
  for (const step of flowCase.input) {
    if (step.type === "edit") flow.edit(step.draft);
    else if (step.type === "run") flow.run(step.runId);
    else if (step.type === "settle") flow.settle(step.runId);
    else if (step.type === "cancel") flow.cancel();
    else throw new Error(`unknown flow step: ${step.type}`);
  }
  const { phase, result } = flow.snapshot();
  return { phase, result };
}

for (const c of fixtures.cases.filter((c) => c.kind === "flow")) {
  test(`flow fixture: ${c.id}`, () => {
    assert.deepEqual(replayFlow(c), c.expected);
  });
}

// ---- validation: SIZE -----------------------------------------------------

test("SIZE: input over 65536 UTF-8 bytes is refused at the root", () => {
  const huge = {
    remaining: 0,
    reserve: 0,
    scenes: [{ name: "x".repeat(70000), min: 0, wanted: 0, priority: 1 }],
  };
  assert.deepEqual(solve(huge), {
    status: "error",
    error: { code: "SIZE", path: "" },
  });
});

test("SIZE is checked before name validation (long but under-cap name)", () => {
  const longName = {
    remaining: 0,
    reserve: 0,
    scenes: [{ name: "x".repeat(1000), min: 0, wanted: 0, priority: 1 }],
  };
  assert.deepEqual(solve(longName), {
    status: "error",
    error: { code: "RANGE", path: "/scenes/0/name" },
  });
  assert.equal(MAX_JSON_BYTES, 65536);
});

// ---- validation: SHAPE ----------------------------------------------------

test("SHAPE: unknown root key, missing key, unknown/ missing scene key", () => {
  assert.deepEqual(
    solve({ remaining: 1, reserve: 0, scenes: [], extra: 1 }),
    { status: "error", error: { code: "SHAPE", path: "" } },
  );
  assert.deepEqual(
    solve({ remaining: 1, scenes: [] }),
    { status: "error", error: { code: "SHAPE", path: "/reserve" } },
  );
  assert.deepEqual(
    solve({
      remaining: 1,
      reserve: 0,
      scenes: [{ name: "A", min: 0, wanted: 0, priority: 1, extra: 1 }],
    }),
    { status: "error", error: { code: "SHAPE", path: "/scenes/0" } },
  );
  assert.deepEqual(
    solve({
      remaining: 1,
      reserve: 0,
      scenes: [{ name: "A", wanted: 0, priority: 1 }],
    }),
    { status: "error", error: { code: "SHAPE", path: "/scenes/0/min" } },
  );
});

// ---- validation: TYPE / RANGE ----------------------------------------------

test("TYPE: non-object root, string numbers, fractions, -0", () => {
  assert.deepEqual(solve([]), {
    status: "error",
    error: { code: "TYPE", path: "" },
  });
  assert.deepEqual(
    solve({
      remaining: "5",
      reserve: 0,
      scenes: [{ name: "A", min: 0, wanted: 0, priority: 1 }],
    }),
    { status: "error", error: { code: "TYPE", path: "/remaining" } },
  );
  assert.deepEqual(
    solve({
      remaining: 5,
      reserve: 0,
      scenes: [{ name: "A", min: 1.5, wanted: 0, priority: 1 }],
    }),
    { status: "error", error: { code: "TYPE", path: "/scenes/0/min" } },
  );
  assert.deepEqual(
    solve({
      remaining: -0,
      reserve: 0,
      scenes: [{ name: "A", min: 0, wanted: 0, priority: 1 }],
    }),
    { status: "error", error: { code: "TYPE", path: "/remaining" } },
  );
  assert.deepEqual(
    solve({ remaining: 5, reserve: 0, scenes: "A" }),
    { status: "error", error: { code: "TYPE", path: "/scenes" } },
  );
  assert.deepEqual(
    solve({
      remaining: 5,
      reserve: 0,
      scenes: [{ name: "A", min: 0, wanted: 0, priority: "3" }],
    }),
    { status: "error", error: { code: "TYPE", path: "/scenes/0/priority" } },
  );
});

test("RANGE: frame bounds, priority bounds, scene count bounds", () => {
  const base = (scenes) => ({ remaining: 200, reserve: 0, scenes });
  const one = (overrides) => ({
    name: "A",
    min: 0,
    wanted: 0,
    priority: 1,
    ...overrides,
  });
  assert.deepEqual(solve(base([one({ min: 0, wanted: 0, priority: 1 })])).status, "ok");
  assert.deepEqual(
    solve({ remaining: 201, reserve: 0, scenes: [one()] }),
    { status: "error", error: { code: "RANGE", path: "/remaining" } },
  );
  assert.deepEqual(
    solve({ remaining: 200, reserve: 201, scenes: [one()] }),
    { status: "error", error: { code: "RANGE", path: "/reserve" } },
  );
  assert.deepEqual(
    solve(base([one({ priority: 0 })])),
    { status: "error", error: { code: "RANGE", path: "/scenes/0/priority" } },
  );
  assert.deepEqual(
    solve(base([one({ priority: 4 })])),
    { status: "error", error: { code: "RANGE", path: "/scenes/0/priority" } },
  );
  assert.deepEqual(solve({ remaining: 0, reserve: 0, scenes: [] }), {
    status: "error",
    error: { code: "RANGE", path: "/scenes" },
  });
  const seventeen = Array.from({ length: 17 }, (_, i) => ({
    name: `S${i}`,
    min: 0,
    wanted: 0,
    priority: 1,
  }));
  assert.deepEqual(solve({ remaining: 200, reserve: 0, scenes: seventeen }), {
    status: "error",
    error: { code: "RANGE", path: "/scenes" },
  });
  assert.equal(MAX_SCENES, 16);
  assert.equal(MAX_FRAMES, 200);
});

test("RANGE: name length and character rules", () => {
  const withName = (name) => ({
    remaining: 1,
    reserve: 0,
    scenes: [{ name, min: 0, wanted: 0, priority: 1 }],
  });
  assert.deepEqual(solve(withName("")), {
    status: "error",
    error: { code: "RANGE", path: "/scenes/0/name" },
  });
  assert.deepEqual(solve(withName("x".repeat(25))), {
    status: "error",
    error: { code: "RANGE", path: "/scenes/0/name" },
  });
  assert.deepEqual(solve(withName("-abc")), {
    status: "error",
    error: { code: "RANGE", path: "/scenes/0/name" },
  });
  // Markup / injection in a name is refused, never rendered.
  assert.deepEqual(solve(withName("<script>alert(1)</script>")), {
    status: "error",
    error: { code: "RANGE", path: "/scenes/0/name" },
  });
  assert.deepEqual(solve(withName("A/B")), {
    status: "error",
    error: { code: "RANGE", path: "/scenes/0/name" },
  });
  // A leading digit and NFC normalization are accepted.
  assert.equal(validate(withName("9號")).ok, true);
  assert.equal(normalizeName("  Café ").name, "Café");
});

// ---- validation: DUPLICATE / ORDER ------------------------------------------

test("DUPLICATE: second occurrence, NFC-equivalent names", () => {
  const dup = {
    remaining: 10,
    reserve: 0,
    scenes: [
      { name: "A", min: 0, wanted: 1, priority: 1 },
      { name: "A", min: 0, wanted: 1, priority: 1 },
    ],
  };
  assert.deepEqual(solve(dup), {
    status: "error",
    error: { code: "DUPLICATE", path: "/scenes/1/name" },
  });
  const nfcDup = {
    remaining: 10,
    reserve: 0,
    scenes: [
      { name: "é", min: 0, wanted: 1, priority: 1 },
      { name: "é", min: 0, wanted: 1, priority: 1 },
    ],
  };
  assert.deepEqual(solve(nfcDup), {
    status: "error",
    error: { code: "DUPLICATE", path: "/scenes/1/name" },
  });
  // Case is significant: "A" and "a" are different scenes.
  const caseOk = {
    remaining: 2,
    reserve: 0,
    scenes: [
      { name: "A", min: 0, wanted: 1, priority: 1 },
      { name: "a", min: 0, wanted: 1, priority: 1 },
    ],
  };
  assert.equal(solve(caseOk).status, "ok");
});

test("ORDER: reserve over remaining, wanted below min, reserve first", () => {
  assert.deepEqual(
    solve({
      remaining: 3,
      reserve: 4,
      scenes: [{ name: "A", min: 0, wanted: 0, priority: 1 }],
    }),
    { status: "error", error: { code: "ORDER", path: "/reserve" } },
  );
  assert.deepEqual(
    solve({
      remaining: 4,
      reserve: 0,
      scenes: [{ name: "A", min: 2, wanted: 1, priority: 2 }],
    }),
    { status: "error", error: { code: "ORDER", path: "/scenes/0/wanted" } },
  );
  // Both violations present: the reserve ORDER is reported first.
  assert.deepEqual(
    solve({
      remaining: 3,
      reserve: 4,
      scenes: [{ name: "A", min: 2, wanted: 1, priority: 2 }],
    }),
    { status: "error", error: { code: "ORDER", path: "/reserve" } },
  );
});

// ---- allocation: hand-derived cases ------------------------------------------

test("round-robin: the last frame of a priority goes to the first scene in input order", () => {
  assert.deepEqual(
    solve({
      remaining: 1,
      reserve: 0,
      scenes: [
        { name: "A", min: 0, wanted: 1, priority: 3 },
        { name: "B", min: 0, wanted: 1, priority: 3 },
      ],
    }),
    {
      status: "ok",
      result: {
        available: 1,
        deficit: 0,
        spare: 0,
        rows: [
          { name: "A", planned: 1, unmet: 0 },
          { name: "B", planned: 0, unmet: 1 },
        ],
      },
    },
  );
});

test("priority order: lower priority gets nothing while a higher priority still needs frames", () => {
  assert.deepEqual(
    solve({
      remaining: 5,
      reserve: 0,
      scenes: [
        { name: "A", min: 0, wanted: 3, priority: 1 },
        { name: "B", min: 0, wanted: 3, priority: 3 },
      ],
    }),
    {
      status: "ok",
      result: {
        available: 5,
        deficit: 0,
        spare: 0,
        rows: [
          { name: "A", planned: 2, unmet: 1 },
          { name: "B", planned: 3, unmet: 0 },
        ],
      },
    },
  );
});

test("round-robin: equal needs split evenly across rounds", () => {
  const reply = solve({
    remaining: 10,
    reserve: 0,
    scenes: [
      { name: "A", min: 0, wanted: 5, priority: 3 },
      { name: "B", min: 0, wanted: 5, priority: 3 },
    ],
  });
  assert.deepEqual(reply.result.rows, [
    { name: "A", planned: 5, unmet: 0 },
    { name: "B", planned: 5, unmet: 0 },
  ]);
  assert.equal(reply.result.spare, 0);
});

test("conservation: planned + reserve + spare equals remaining", () => {
  const cases = [
    {
      remaining: 24,
      reserve: 4,
      scenes: [
        { name: "A", min: 3, wanted: 10, priority: 3 },
        { name: "B", min: 2, wanted: 8, priority: 3 },
        { name: "C", min: 4, wanted: 10, priority: 2 },
      ],
    },
    {
      remaining: 200,
      reserve: 0,
      scenes: Array.from({ length: 16 }, (_, i) => ({
        name: `S${i}`,
        min: 12,
        wanted: 13,
        priority: 3,
      })),
    },
    {
      remaining: 7,
      reserve: 2,
      scenes: [
        { name: "A", min: 1, wanted: 4, priority: 2 },
        { name: "B", min: 0, wanted: 2, priority: 1 },
      ],
    },
  ];
  for (const input of cases) {
    const reply = solve(input);
    assert.equal(reply.status, "ok");
    const planned = reply.result.rows.reduce((s, r) => s + r.planned, 0);
    assert.equal(planned + input.reserve + reply.result.spare, input.remaining);
    for (const row of reply.result.rows) {
      const scene = input.scenes.find((s) => s.name === row.name);
      assert.ok(row.planned >= scene.min);
      assert.ok(row.planned <= scene.wanted);
      assert.equal(row.unmet, scene.wanted - row.planned);
    }
  }
});

test("max case: 16 scenes at 200 frames, first 8 get the extra frame", () => {
  const reply = solve({
    remaining: 200,
    reserve: 0,
    scenes: Array.from({ length: 16 }, (_, i) => ({
      name: `S${i}`,
      min: 12,
      wanted: 13,
      priority: 3,
    })),
  });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.spare, 0);
  assert.deepEqual(
    reply.result.rows.map((r) => r.planned),
    [13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12],
  );
});

// ---- flow: extras ------------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  flow.edit({ remaining: 1, reserve: 0, scenes: [{ name: "A", min: 0, wanted: 1, priority: 1 }] });
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: blank submit error, then edit returns to dirty", () => {
  const flow = createFlow();
  flow.edit(null);
  flow.fail({ code: "SYNTAX", path: "/remaining" });
  assert.equal(flow.snapshot().phase, "error");
  assert.deepEqual(flow.snapshot().error, { code: "SYNTAX", path: "/remaining" });
  flow.edit({ remaining: 1, reserve: 0, scenes: [{ name: "A", min: 0, wanted: 1, priority: 1 }] });
  assert.deepEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: stale error reply cannot overwrite a newer ready state", () => {
  const flow = createFlow();
  const draft1 = {
    remaining: 24,
    reserve: 4,
    scenes: [
      { name: "A", min: 3, wanted: 10, priority: 3 },
      { name: "B", min: 2, wanted: 8, priority: 3 },
      { name: "C", min: 4, wanted: 10, priority: 2 },
    ],
  };
  const draft2 = {
    remaining: 20,
    reserve: 3,
    scenes: [
      { name: "A", min: 2, wanted: 4, priority: 3 },
      { name: "B", min: 1, wanted: 2, priority: 1 },
    ],
  };
  flow.edit(draft1);
  flow.run(1);
  flow.cancel();
  flow.edit(draft2);
  flow.run(2);
  // A late error reply from run 1 is discarded.
  flow.settleWith(1, { status: "error", error: { code: "ORDER", path: "/reserve" } });
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.spare, 11);
  // And a late reply after ready is also discarded.
  flow.settleWith(1, { status: "error", error: { code: "ORDER", path: "/reserve" } });
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow: run while busy is ignored; only the first runId settles", () => {
  const flow = createFlow();
  const draft = {
    remaining: 1,
    reserve: 0,
    scenes: [{ name: "A", min: 0, wanted: 1, priority: 1 }],
  };
  flow.edit(draft);
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.rows[0].planned, 1);
});

test("flow: cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.edit({ remaining: 1, reserve: 0, scenes: [{ name: "A", min: 0, wanted: 1, priority: 1 }] });
  flow.cancel();
  assert.deepEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});
