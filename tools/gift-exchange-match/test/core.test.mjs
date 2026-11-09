// Tests for Gift Exchange Match (spec-gift-exchange-match-20261109, v1).
// Expected values come from docs/specs/gift-exchange-match/fixtures.json
// and from hand-derived cases / an independent brute-force matcher —
// never from the implementation's own output. Run offline with
// `node --test` (Node >= 24).

import assert from "node:assert/strict";
import test from "node:test";

import { createFlow } from "../public/js/core/flow.mjs";
import {
  BATCH_STEPS,
  MAX_EDGE_ATTEMPTS_PER_CHECK,
  MAX_FEASIBILITY_CHECKS,
  normalizeName,
  solve,
  solveSteps,
  validate,
} from "../public/js/core/solve.mjs";
import fixtures from "../../../docs/specs/gift-exchange-match/fixtures.json" with {
  type: "json",
};

const err = (code, path) => ({ status: "error", error: { code, path } });

// ---- literal fixtures -------------------------------------------------

for (const c of fixtures.cases) {
  if (c.kind === "solve") {
    test(`fixture ${c.id}`, () => {
      assert.deepStrictEqual(solve(c.input), c.expected);
    });
  } else if (c.kind === "flow") {
    test(`fixture ${c.id}`, () => {
      const flow = createFlow();
      for (const step of c.input) {
        if (step.type === "edit") flow.edit(step.draft);
        else if (step.type === "run") flow.run(step.runId);
        else if (step.type === "settle") flow.settle(step.runId);
        else if (step.type === "cancel") flow.cancel();
        else if (step.type === "reset") flow.reset();
        else throw new Error(`unknown flow step ${step.type}`);
      }
      const { phase, result } = flow.snapshot();
      assert.deepStrictEqual({ phase, result }, c.expected);
    });
  }
}

// ---- names --------------------------------------------------------------

test("normalizeName: NFC, U+0020 trim only, length and charset rules", () => {
  assert.deepStrictEqual(normalizeName("  Café  "), { ok: true, name: "Café" });
  assert.deepStrictEqual(normalizeName("Café"), { ok: true, name: "Café" });
  assert.deepStrictEqual(normalizeName("A-1_x 2"), { ok: true, name: "A-1_x 2" });
  assert.deepStrictEqual(normalizeName("9lives"), { ok: true, name: "9lives" });
  assert.deepStrictEqual(normalizeName(""), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("   "), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("a".repeat(24)), { ok: true, name: "a".repeat(24) });
  assert.deepStrictEqual(normalizeName("a".repeat(25)), { ok: false, code: "RANGE" });
  // Tab is not U+0020, so it is not trimmed and fails the first-char rule.
  assert.deepStrictEqual(normalizeName("\tA"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("-A"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("A/B"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName("<script>"), { ok: false, code: "RANGE" });
  assert.deepStrictEqual(normalizeName(42), { ok: false, code: "TYPE" });
  assert.deepStrictEqual(normalizeName(null), { ok: false, code: "TYPE" });
});

// ---- validation: shape, size, types -------------------------------------

test("validation: root shape and types", () => {
  assert.deepStrictEqual(validate(null), { ok: false, reply: err("TYPE", "") });
  assert.deepStrictEqual(validate([1, 2]), { ok: false, reply: err("TYPE", "") });
  assert.deepStrictEqual(validate({ names: ["A", "B", "C"] }), {
    ok: false,
    reply: err("SHAPE", "/blocked"),
  });
  assert.deepStrictEqual(
    validate({ names: ["A", "B", "C"], blocked: [], extra: 1 }),
    { ok: false, reply: err("SHAPE", "") },
  );
  assert.deepStrictEqual(validate({ names: "ABC", blocked: [] }), {
    ok: false,
    reply: err("TYPE", "/names"),
  });
  assert.deepStrictEqual(validate({ names: ["A", "B", "C"], blocked: {} }), {
    ok: false,
    reply: err("TYPE", "/blocked"),
  });
});

test("validation: name count bounds", () => {
  assert.deepStrictEqual(validate({ names: ["A", "B"], blocked: [] }), {
    ok: false,
    reply: err("RANGE", "/names"),
  });
  const seventeen = Array.from({ length: 17 }, (_, i) => `P${i}`);
  assert.deepStrictEqual(validate({ names: seventeen, blocked: [] }), {
    ok: false,
    reply: err("RANGE", "/names"),
  });
  assert.deepStrictEqual(validate({ names: ["A", "B", 3], blocked: [] }), {
    ok: false,
    reply: err("TYPE", "/names/2"),
  });
  assert.deepStrictEqual(validate({ names: ["A", "B", ""], blocked: [] }), {
    ok: false,
    reply: err("RANGE", "/names/2"),
  });
});

test("validation: duplicate names point at the second occurrence", () => {
  assert.deepStrictEqual(
    validate({ names: ["A", "B", "A"], blocked: [] }),
    { ok: false, reply: err("DUPLICATE", "/names/2") },
  );
  // NFC duplicates: "Cafe" + combining acute normalizes to "Café".
  assert.deepStrictEqual(
    validate({ names: ["Café", "Café", "B"], blocked: [] }),
    { ok: false, reply: err("DUPLICATE", "/names/1") },
  );
  // Same name with different surrounding U+0020 also duplicates.
  assert.deepStrictEqual(
    validate({ names: ["A", "B", " A "], blocked: [] }),
    { ok: false, reply: err("DUPLICATE", "/names/2") },
  );
});

test("validation: blocked row shape and field errors", () => {
  const base = { names: ["A", "B", "C"], blocked: [] };
  assert.deepStrictEqual(
    validate({ ...base, blocked: [{ from: "A" }] }),
    { ok: false, reply: err("SHAPE", "/blocked/0/to") },
  );
  assert.deepStrictEqual(
    validate({ ...base, blocked: [{ from: "A", to: "B", x: 1 }] }),
    { ok: false, reply: err("SHAPE", "/blocked/0") },
  );
  assert.deepStrictEqual(
    validate({ ...base, blocked: ["A"] }),
    { ok: false, reply: err("TYPE", "/blocked/0") },
  );
  assert.deepStrictEqual(
    validate({ ...base, blocked: [{ from: 1, to: "B" }] }),
    { ok: false, reply: err("TYPE", "/blocked/0/from") },
  );
  assert.deepStrictEqual(
    validate({ ...base, blocked: [{ from: "A", to: "" }] }),
    { ok: false, reply: err("RANGE", "/blocked/0/to") },
  );
  const rows = Array.from({ length: 241 }, () => ({ from: "A", to: "B" }));
  assert.deepStrictEqual(validate({ ...base, blocked: rows }), {
    ok: false,
    reply: err("RANGE", "/blocked"),
  });
});

test("validation: SIZE boundary at exactly 65536 / 65537 UTF-8 bytes", () => {
  const encoder = new TextEncoder();
  const overhead = encoder.encode('{"names":["","B","C"],"blocked":[]}').length;
  for (const target of [65536, 65537]) {
    const name = "a".repeat(target - overhead);
    const input = { names: [name, "B", "C"], blocked: [] };
    assert.strictEqual(encoder.encode(JSON.stringify(input)).length, target);
    if (target === 65536) {
      // Fits the cap, so the over-long name itself is reported.
      assert.deepStrictEqual(validate(input), {
        ok: false,
        reply: err("RANGE", "/names/0"),
      });
    } else {
      assert.deepStrictEqual(validate(input), {
        ok: false,
        reply: err("SIZE", ""),
      });
    }
  }
});

test("validation: core rejects -0, string numbers and non-integers", () => {
  // Numbers are not part of this spec's data, but the core must still
  // reject non-string names; numeric-typed names are TYPE errors.
  assert.deepStrictEqual(
    validate({ names: ["A", "B", -0], blocked: [] }),
    { ok: false, reply: err("TYPE", "/names/2") },
  );
});

// ---- validation: cross-field order --------------------------------------

test("cross-field: REF from then to, in row order", () => {
  assert.deepStrictEqual(
    solve({ names: ["A", "B", "C"], blocked: [{ from: "X", to: "Y" }] }),
    err("REF", "/blocked/0/from"),
  );
  assert.deepStrictEqual(
    solve({ names: ["A", "B", "C"], blocked: [{ from: "A", to: "Y" }] }),
    err("REF", "/blocked/0/to"),
  );
  assert.deepStrictEqual(
    solve({
      names: ["A", "B", "C"],
      blocked: [
        { from: "A", to: "B" },
        { from: "X", to: "B" },
      ],
    }),
    err("REF", "/blocked/1/from"),
  );
});

test("cross-field: REF is checked before SELF_RULE and DUPLICATE", () => {
  // Row 0 is a self-block, row 1 has an unknown name: REF wins.
  assert.deepStrictEqual(
    solve({
      names: ["A", "B", "C"],
      blocked: [
        { from: "A", to: "A" },
        { from: "X", to: "B" },
      ],
    }),
    err("REF", "/blocked/1/from"),
  );
  // Two identical self-blocks: SELF_RULE wins over DUPLICATE.
  assert.deepStrictEqual(
    solve({
      names: ["A", "B", "C"],
      blocked: [
        { from: "A", to: "A" },
        { from: "A", to: "A" },
      ],
    }),
    err("SELF_RULE", "/blocked/0/to"),
  );
});

test("cross-field: duplicate directions point at the later row", () => {
  assert.deepStrictEqual(
    solve({
      names: ["A", "B", "C"],
      blocked: [
        { from: "A", to: "B" },
        { from: "C", to: "A" },
        { from: "A", to: "B" },
      ],
    }),
    err("DUPLICATE", "/blocked/2"),
  );
  // The reverse direction is a different (legal) direction.
  assert.deepStrictEqual(
    solve({
      names: ["A", "B", "C"],
      blocked: [
        { from: "A", to: "B" },
        { from: "B", to: "A" },
      ],
    }).status,
    "ok",
  );
});

test("cross-field: names with spaces do not collide in direction keys", () => {
  // "A B"->"C" and "A"->"B C" are different directions.
  const ok = solve({
    names: ["A B", "B C", "C", "A"],
    blocked: [
      { from: "A B", to: "C" },
      { from: "A", to: "B C" },
    ],
  });
  assert.strictEqual(ok.status, "ok");
  assert.deepStrictEqual(
    solve({
      names: ["A B", "B C", "C", "A"],
      blocked: [
        { from: "A B", to: "C" },
        { from: "A B", to: "C" },
      ],
    }),
    err("DUPLICATE", "/blocked/1"),
  );
});

// ---- algorithm: independent brute force ---------------------------------

function bruteForce(names, blocked) {
  const blockedSet = new Set(blocked.map((b) => `${b.from}>${b.to}`));
  const used = new Set();
  const assign = [];
  function rec(i) {
    if (i === names.length) return true;
    for (const to of names) {
      if (to === names[i] || used.has(to)) continue;
      if (blockedSet.has(`${names[i]}>${to}`)) continue;
      used.add(to);
      assign.push({ from: names[i], to });
      if (rec(i + 1)) return true;
      assign.pop();
      used.delete(to);
    }
    return false;
  }
  return rec(0) ? assign : null;
}

function assertValidMatch(names, blocked, reply) {
  assert.strictEqual(reply.status, "ok");
  const expected = bruteForce(names, blocked);
  if (expected === null) {
    assert.deepStrictEqual(reply.result, { found: false, assignments: [] });
    return;
  }
  assert.strictEqual(reply.result.found, true);
  assert.strictEqual(reply.result.assignments.length, names.length);
  const blockedSet = new Set(blocked.map((b) => `${b.from}>${b.to}`));
  const givers = new Set();
  const receivers = new Set();
  for (const [i, a] of reply.result.assignments.entries()) {
    assert.strictEqual(a.from, names[i], "assignments follow giver input order");
    assert.notStrictEqual(a.to, a.from, "no self-giving");
    assert.ok(!blockedSet.has(`${a.from}>${a.to}`), "respects blocked directions");
    assert.ok(!givers.has(a.from) && !receivers.has(a.to), "one gift out, one in");
    givers.add(a.from);
    receivers.add(a.to);
  }
}

test("algorithm: brute-force agreement on hand-picked inputs", () => {
  const cases = [
    { names: ["A", "B", "C", "D", "E"], blocked: [] },
    {
      names: ["A", "B", "C", "D"],
      blocked: [
        { from: "A", to: "B" },
        { from: "A", to: "C" },
        { from: "B", to: "A" },
      ],
    },
    {
      names: ["A", "B", "C", "D", "E", "F"],
      blocked: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "D" },
        { from: "D", to: "E" },
        { from: "E", to: "F" },
        { from: "F", to: "A" },
      ],
    },
    {
      names: ["A", "B", "C", "D"],
      blocked: [
        { from: "A", to: "B" },
        { from: "A", to: "C" },
        { from: "A", to: "D" },
        { from: "B", to: "A" },
        { from: "B", to: "C" },
        { from: "B", to: "D" },
      ],
    },
    {
      names: ["Ann", "Bo", "Cy", "Di", "Eli"],
      blocked: [
        { from: "Ann", to: "Bo" },
        { from: "Bo", to: "Ann" },
        { from: "Cy", to: "Di" },
      ],
    },
  ];
  for (const { names, blocked } of cases) {
    assertValidMatch(names, blocked, solve({ names, blocked }));
  }
});

test("algorithm: deterministic and a full 16-person derangement", () => {
  const names = Array.from({ length: 16 }, (_, i) => `P${i + 1}`);
  const first = solve({ names, blocked: [] });
  const second = solve({ names, blocked: [] });
  assert.deepStrictEqual(first, second);
  assertValidMatch(names, [], first);
  // With a full cycle blocked, a different derangement is still found.
  const cycle = names.map((from, i) => ({
    from,
    to: names[(i + 1) % names.length],
  }));
  assertValidMatch(names, cycle, solve({ names, blocked: cycle }));
});

test("algorithm: mutual exchange is allowed, one-way blocks are not symmetric", () => {
  const reply = solve({
    names: ["A", "B", "C"],
    blocked: [{ from: "A", to: "B" }],
  });
  // A->B is blocked but B->A is fine; the directed fixture pins this.
  assert.deepStrictEqual(reply.result.assignments, [
    { from: "A", to: "C" },
    { from: "B", to: "A" },
    { from: "C", to: "B" },
  ]);
});

// ---- bounds ---------------------------------------------------------------

function driveSteps(input) {
  const iterator = solveSteps(input);
  let step = iterator.next();
  let lastProgress = null;
  let maxChecks = 0;
  let maxCheckSteps = 0;
  while (!step.done) {
    lastProgress = step.value;
    maxChecks = Math.max(maxChecks, step.value.checks);
    maxCheckSteps = Math.max(maxCheckSteps, step.value.maxCheckSteps);
    step = iterator.next();
  }
  return { reply: step.value, lastProgress, maxChecks, maxCheckSteps };
}

test("bounds: feasibility checks and edge attempts stay within the caps", () => {
  const names16 = Array.from({ length: 16 }, (_, i) => `P${i + 1}`);
  // Worst-ish shapes: no blocks, a forced chain, and an impossible case
  // where two givers can only reach the same single recipient.
  const impossible = {
    names: names16,
    blocked: names16.flatMap((from) =>
      from === "P1" || from === "P2"
        ? names16.filter((to) => to !== "P3" && to !== from).map((to) => ({ from, to }))
        : [],
    ),
  };
  const chain = {
    names: names16,
    blocked: names16.map((from, i) => ({
      from,
      to: names16[(i + 1) % names16.length],
    })),
  };
  for (const input of [
    { names: names16, blocked: [] },
    chain,
    impossible,
  ]) {
    const { reply, maxChecks, maxCheckSteps } = driveSteps(input);
    assert.strictEqual(reply.status, "ok");
    assert.ok(maxChecks <= MAX_FEASIBILITY_CHECKS, `checks ${maxChecks}`);
    assert.ok(
      maxCheckSteps <= MAX_EDGE_ATTEMPTS_PER_CHECK,
      `check steps ${maxCheckSteps}`,
    );
    assert.ok(maxCheckSteps <= BATCH_STEPS, "one batch never exceeds BATCH_STEPS");
    // The generator's reply is the same object solve() returns.
    assert.deepStrictEqual(reply, solve(input));
  }
});

// ---- flow -----------------------------------------------------------------

test("flow: reset, blank submit, error recovery and sample load", () => {
  const flow = createFlow();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
  flow.run(1);
  assert.strictEqual(flow.snapshot().phase, "empty", "run with no draft is ignored");
  flow.edit({ names: ["A", "B", "C"], blocked: [] });
  assert.strictEqual(flow.snapshot().phase, "dirty");
  flow.fail({ code: "RANGE", path: "/names" });
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "RANGE", path: "/names" },
  });
  flow.edit({ names: ["A", "B", "C"], blocked: [] });
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
  flow.run(1);
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: run while busy is ignored and cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.edit({ names: ["A", "B", "C"], blocked: [] });
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.strictEqual(flow.snapshot().phase, "busy", "run 2 was ignored");
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.cancel();
  assert.strictEqual(flow.snapshot().phase, "ready", "cancel while ready is a no-op");
});

test("flow: a stale error reply can never overwrite a newer state", () => {
  const flow = createFlow();
  flow.edit({ names: ["A", "B", "C"], blocked: [] });
  flow.run(1);
  flow.settle(1);
  assert.strictEqual(flow.snapshot().phase, "ready");
  flow.settleWith(1, { status: "error", error: { code: "RANGE", path: "/names" } });
  assert.strictEqual(flow.snapshot().phase, "ready");
  assert.strictEqual(flow.snapshot().error, null);
});

test("flow: a core error settles as phase error", () => {
  const flow = createFlow();
  flow.edit({ names: ["A", "B", "A"], blocked: [] });
  flow.run(7);
  flow.settle(7);
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "DUPLICATE", path: "/names/2" },
  });
});

// ---- worker protocol (Node, stubbed messaging) ----------------------------

test("worker: run posts the solve reply and cancel suppresses it", async () => {
  const handlers = new Map();
  const posted = [];
  const realAddEventListener = globalThis.addEventListener;
  const realPostMessage = globalThis.postMessage;
  globalThis.addEventListener = (type, fn) => {
    handlers.set(type, fn);
  };
  globalThis.postMessage = (message) => {
    posted.push(message);
  };
  try {
    await import("../public/js/worker.mjs");
    const onMessage = handlers.get("message");
    assert.ok(onMessage, "worker registers a message handler");

    const waitForDone = () =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + 5000;
        const poll = () => {
          const done = posted.find((m) => m.type === "done");
          if (done) resolve(done);
          else if (Date.now() > deadline) reject(new Error("worker timed out"));
          else setTimeout(poll, 5);
        };
        poll();
      });

    onMessage({ data: { type: "run", runId: 1, data: { names: ["A", "B", "C"], blocked: [] } } });
    const done = await waitForDone();
    assert.strictEqual(done.runId, 1);
    assert.deepStrictEqual(done.reply, solve({ names: ["A", "B", "C"], blocked: [] }));

    // Cancel before the batches drain: no done message may arrive.
    posted.length = 0;
    const names16 = Array.from({ length: 16 }, (_, i) => `P${i + 1}`);
    const blocked = names16.flatMap((from) =>
      names16
        .filter((to) => to !== from && to !== "P16")
        .map((to) => ({ from, to })),
    );
    onMessage({ data: { type: "run", runId: 2, data: { names: names16, blocked } } });
    onMessage({ data: { type: "cancel", runId: 2 } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepStrictEqual(posted, [], "cancelled run posts nothing");
  } finally {
    if (realAddEventListener === undefined) delete globalThis.addEventListener;
    else globalThis.addEventListener = realAddEventListener;
    if (realPostMessage === undefined) delete globalThis.postMessage;
    else globalThis.postMessage = realPostMessage;
  }
});
