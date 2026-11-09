// Tests for Bead String Pattern core. Literal expectations come from
// docs/specs/bead-string-pattern/fixtures.json (imported, not copied) and
// from hand-derived cases; nothing is generated from the implementation.
// Run with: node --test

import test from "node:test";
import assert from "node:assert/strict";
import {
  solve,
  validate,
  expand,
  normalizeName,
  MAX_JSON_BYTES,
} from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";
import fixtures from "../../../docs/specs/bead-string-pattern/fixtures.json" with {
  type: "json",
};

// ---- literal SPEC fixtures ------------------------------------------------

test("fixtures file: 8 cases with the pinned ids", () => {
  assert.equal(fixtures.specId, "spec-bead-string-pattern-20261109");
  assert.equal(fixtures.cases.length, 8);
  assert.deepEqual(
    fixtures.cases.map((c) => c.id),
    [
      "bead-string-pattern.mirrored",
      "bead-string-pattern.straight",
      "bead-string-pattern.single-bead",
      "bead-string-pattern.empty-stock",
      "bead-string-pattern.unknown-end",
      "bead-string-pattern.zero-groups",
      "bead-string-pattern.dirty-after-edit",
      "bead-string-pattern.cancel-then-late",
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
  return flow.snapshot();
}

for (const c of fixtures.cases.filter((c) => c.kind === "flow")) {
  test(`flow fixture: ${c.id}`, () => {
    const snapshot = replayFlow(c);
    assert.deepEqual(
      { phase: snapshot.phase, result: snapshot.result },
      c.expected,
    );
  });
}

// ---- hand-derived solve cases --------------------------------------------

const BASE = {
  colors: [{ name: "A", stock: 2 }],
  motif: ["A"],
  repeats: 1,
  mode: "repeat",
  head: null,
  tail: null,
};

function withBase(patch) {
  return { ...BASE, ...patch };
}

test("non-object roots are TYPE at the root", () => {
  for (const bad of [null, "x", 3, [], true]) {
    assert.deepEqual(solve(bad), {
      status: "error",
      error: { code: "TYPE", path: "" },
    });
  }
});

test("SIZE: exactly 65536 bytes passes the cap (next error is SHAPE)", () => {
  const probe = { ...BASE, extra: "" };
  const baseBytes = new TextEncoder().encode(JSON.stringify(probe)).length;
  const pad = MAX_JSON_BYTES - baseBytes;
  assert.ok(pad > 0);
  assert.deepEqual(solve({ ...BASE, extra: "x".repeat(pad) }), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  assert.deepEqual(solve({ ...BASE, extra: "x".repeat(pad + 1) }), {
    status: "error",
    error: { code: "SIZE", path: "" },
  });
});

test("unknown root key is SHAPE at the root; missing key is SHAPE at the key path", () => {
  assert.deepEqual(solve({ ...BASE, extra: 1 }), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const { tail, ...noTail } = BASE;
  void tail;
  assert.deepEqual(solve(noTail), {
    status: "error",
    error: { code: "SHAPE", path: "/tail" },
  });
});

test("unknown key in a colour row is SHAPE at that row", () => {
  assert.deepEqual(
    solve(withBase({ colors: [{ name: "A", stock: 1, shade: "red" }] })),
    { status: "error", error: { code: "SHAPE", path: "/colors/0" } },
  );
});

test("colour count bounds: 0 and 13 colours are RANGE", () => {
  assert.deepEqual(solve(withBase({ colors: [] })), {
    status: "error",
    error: { code: "RANGE", path: "/colors" },
  });
  assert.deepEqual(
    solve(
      withBase({
        colors: Array.from({ length: 13 }, (_, i) => ({
          name: `C${i}`,
          stock: 1,
        })),
      }),
    ),
    { status: "error", error: { code: "RANGE", path: "/colors" } },
  );
});

test("motif bounds: 0 and 17 beads are RANGE", () => {
  assert.deepEqual(solve(withBase({ motif: [] })), {
    status: "error",
    error: { code: "RANGE", path: "/motif" },
  });
  assert.deepEqual(
    solve(withBase({ motif: Array.from({ length: 17 }, () => "A") })),
    { status: "error", error: { code: "RANGE", path: "/motif" } },
  );
});

test("integer fields: strings, fractions and -0 are TYPE; out of range is RANGE", () => {
  assert.deepEqual(solve(withBase({ colors: [{ name: "A", stock: "3" }] })), {
    status: "error",
    error: { code: "TYPE", path: "/colors/0/stock" },
  });
  assert.deepEqual(solve(withBase({ colors: [{ name: "A", stock: 2.5 }] })), {
    status: "error",
    error: { code: "TYPE", path: "/colors/0/stock" },
  });
  assert.deepEqual(solve(withBase({ colors: [{ name: "A", stock: -0 }] })), {
    status: "error",
    error: { code: "TYPE", path: "/colors/0/stock" },
  });
  assert.deepEqual(solve(withBase({ colors: [{ name: "A", stock: 1001 }] })), {
    status: "error",
    error: { code: "RANGE", path: "/colors/0/stock" },
  });
  assert.deepEqual(solve(withBase({ colors: [{ name: "A", stock: -1 }] })), {
    status: "error",
    error: { code: "RANGE", path: "/colors/0/stock" },
  });
  assert.deepEqual(solve(withBase({ repeats: "2" })), {
    status: "error",
    error: { code: "TYPE", path: "/repeats" },
  });
  assert.deepEqual(solve(withBase({ repeats: 33 })), {
    status: "error",
    error: { code: "RANGE", path: "/repeats" },
  });
});

test("mode: non-string is TYPE, other string is ENUM", () => {
  assert.deepEqual(solve(withBase({ mode: 1 })), {
    status: "error",
    error: { code: "TYPE", path: "/mode" },
  });
  assert.deepEqual(solve(withBase({ mode: "reverse" })), {
    status: "error",
    error: { code: "ENUM", path: "/mode" },
  });
});

test("name rules: NFC duplicate is DUPLICATE at the second row", () => {
  assert.deepEqual(
    solve(
      withBase({
        colors: [
          { name: "é", stock: 1 },
          { name: "é", stock: 1 },
        ],
      }),
    ),
    { status: "error", error: { code: "DUPLICATE", path: "/colors/1/name" } },
  );
});

test("name rules: NFC form in motif matches the stored name", () => {
  const reply = solve(
    withBase({
      colors: [{ name: "é", stock: 2 }],
      motif: ["é"],
      repeats: 1,
    }),
  );
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.positions[0].name, "é");
});

test("name rules: leading symbol, markup and over-long names are RANGE", () => {
  assert.deepEqual(normalizeName("-A"), { ok: false, code: "RANGE" });
  assert.deepEqual(normalizeName("<script>alert(1)</script>"), {
    ok: false,
    code: "RANGE",
  });
  assert.deepEqual(normalizeName("A<B"), { ok: false, code: "RANGE" });
  assert.deepEqual(normalizeName("A".repeat(25)), { ok: false, code: "RANGE" });
  assert.deepEqual(normalizeName("  A B-1_x  "), { ok: true, name: "A B-1_x" });
});

test("REF order: motif before head, head before tail", () => {
  assert.deepEqual(
    solve(withBase({ motif: ["Z"], head: "Y", tail: "X" })),
    { status: "error", error: { code: "REF", path: "/motif/0" } },
  );
  assert.deepEqual(
    solve(withBase({ motif: ["A"], head: "Y", tail: "X" })),
    { status: "error", error: { code: "REF", path: "/head" } },
  );
  assert.deepEqual(
    solve(withBase({ motif: ["A"], head: "A", tail: "X" })),
    { status: "error", error: { code: "REF", path: "/tail" } },
  );
});

test("alternate boundary keeps two equal beads side by side", () => {
  assert.deepEqual(
    solve({
      colors: [
        { name: "A", stock: 5 },
        { name: "B", stock: 5 },
      ],
      motif: ["A", "B"],
      repeats: 2,
      mode: "alternate",
      head: null,
      tail: null,
    }),
    {
      status: "ok",
      result: {
        positions: [
          { index: 1, name: "A", available: true },
          { index: 2, name: "B", available: true },
          { index: 3, name: "B", available: true },
          { index: 4, name: "A", available: true },
        ],
        colors: [
          { name: "A", needed: 2, missing: 0, remaining: 3 },
          { name: "B", needed: 2, missing: 0, remaining: 3 },
        ],
        firstMissing: null,
      },
    },
  );
});

test("expand: head, alternating reversal, tail", () => {
  assert.deepEqual(
    expand({ motif: ["A", "B"], repeats: 3, mode: "alternate", head: "H", tail: "T" }),
    ["H", "A", "B", "B", "A", "A", "B", "T"],
  );
  assert.deepEqual(
    expand({ motif: ["A", "B"], repeats: 3, mode: "repeat", head: null, tail: null }),
    ["A", "B", "A", "B", "A", "B"],
  );
});

test("maximum expansion is 514 positions and stays linear", () => {
  // 12 distinct colours (the cap), a 16-bead motif reusing them, 32
  // groups, plus one head and one tail bead: 512 + 2 = 514.
  const names = Array.from({ length: 12 }, (_, i) => `C${i + 1}`);
  const motif = [...names, "C1", "C2", "C3", "C4"];
  const colors = names.map((name) => ({ name, stock: 1000 }));
  const reply = solve({
    colors,
    motif,
    repeats: 32,
    mode: "alternate",
    head: "C1",
    tail: "C12",
  });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.positions.length, 514);
  assert.equal(reply.result.firstMissing, null);
  assert.equal(
    reply.result.positions.reduce((sum, p) => sum + (p.available ? 1 : 0), 0),
    514,
  );
});

test("stock conservation: needed equals used plus missing per colour", () => {
  const reply = solve({
    colors: [
      { name: "A", stock: 1 },
      { name: "B", stock: 0 },
      { name: "C", stock: 5 },
    ],
    motif: ["A", "B", "C"],
    repeats: 2,
    mode: "repeat",
    head: "B",
    tail: null,
  });
  assert.equal(reply.status, "ok");
  const totalNeeded = reply.result.colors.reduce((s, c) => s + c.needed, 0);
  assert.equal(totalNeeded, reply.result.positions.length);
  for (const row of reply.result.colors) {
    const stock = { A: 1, B: 0, C: 5 }[row.name];
    assert.equal(row.needed, stock - row.remaining + row.missing);
  }
  assert.equal(reply.result.firstMissing, 1);
});

// ---- flow extras ----------------------------------------------------------

test("flow: reset returns to empty and clears the result", () => {
  const flow = createFlow();
  flow.edit(BASE);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: blank submit is a RANGE error; fixing it recovers to ready", () => {
  const flow = createFlow();
  const blank = withBase({ colors: [] });
  assert.deepEqual(solve(blank), {
    status: "error",
    error: { code: "RANGE", path: "/colors" },
  });
  flow.edit(blank);
  flow.fail({ code: "RANGE", path: "/colors" });
  assert.equal(flow.snapshot().phase, "error");
  flow.edit(BASE);
  assert.equal(flow.snapshot().phase, "dirty");
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.positions.length, 1);
});

test("flow: a stale error reply cannot overwrite a newer ready state", () => {
  const flow = createFlow();
  flow.edit(BASE);
  flow.run(1);
  flow.cancel();
  flow.edit(withBase({ repeats: 2 }));
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
  const readyResult = flow.snapshot().result;
  flow.settleWith(1, {
    status: "error",
    error: { code: "RANGE", path: "/repeats" },
  });
  assert.equal(flow.snapshot().phase, "ready");
  assert.deepEqual(flow.snapshot().result, readyResult);
});

test("flow: run while busy is ignored; cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.cancel();
  assert.equal(flow.snapshot().phase, "empty");
  flow.edit(BASE);
  flow.run(1);
  flow.run(2);
  flow.settle(2); // ignored: active run is still 1
  assert.equal(flow.snapshot().phase, "busy");
  assert.equal(flow.snapshot().result, null);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow: fail keeps the draft and clears the result", () => {
  const flow = createFlow();
  flow.edit(BASE);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.edit(withBase({ repeats: 2 }));
  flow.fail({ code: "RANGE", path: "/repeats" });
  assert.deepEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "RANGE", path: "/repeats" },
  });
});
