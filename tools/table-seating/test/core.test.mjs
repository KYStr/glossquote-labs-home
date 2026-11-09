// Tests for Party Table Seating core. Literal expectations come from
// docs/specs/table-seating/fixtures.json (imported, not copied) and from
// hand-derived cases; nothing is generated from the implementation.
// Run with: node --test

import test from "node:test";
import assert from "node:assert/strict";
import {
  solve,
  solveWithStats,
  search,
  normalizeName,
  MAX_JSON_BYTES,
  BATCH_STEPS,
} from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";
import fixtures from "../../../docs/specs/table-seating/fixtures.json" with {
  type: "json",
};

// ---- literal SPEC fixtures ------------------------------------------------

test("fixtures file: 8 cases with the pinned ids", () => {
  assert.equal(fixtures.specId, "spec-table-seating-20261109");
  assert.equal(fixtures.cases.length, 8);
  assert.deepEqual(
    fixtures.cases.map((c) => c.id),
    [
      "table-seating.backtrack",
      "table-seating.pinned",
      "table-seating.one-table",
      "table-seating.fragmented",
      "table-seating.locked-conflict",
      "table-seating.unknown-table",
      "table-seating.dirty-after-edit",
      "table-seating.cancel-then-late",
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

// ---- hand-derived search cases --------------------------------------------

test("parties at one table keep party input order", () => {
  assert.deepEqual(
    solve({
      tables: [{ name: "T", seats: 10, stepFree: false }],
      parties: [
        { name: "Z", size: 2, stepFree: false, pin: null },
        { name: "A", size: 3, stepFree: false, pin: null },
        { name: "M", size: 1, stepFree: false, pin: null },
      ],
    }),
    {
      status: "ok",
      result: {
        found: true,
        tables: [{ name: "T", parties: ["Z", "A", "M"], remaining: 4 }],
      },
    },
  );
});

test("pin and step-free combine: pinned party must also satisfy step-free", () => {
  assert.deepEqual(
    solve({
      tables: [
        { name: "T1", seats: 5, stepFree: false },
        { name: "T2", seats: 5, stepFree: true },
      ],
      parties: [
        { name: "A", size: 2, stepFree: true, pin: "T1" },
      ],
    }),
    { status: "ok", result: { found: false, tables: null } },
  );
});

test("eight parties across four tables all placed exactly once", () => {
  const input = {
    tables: [
      { name: "T1", seats: 5, stepFree: false },
      { name: "T2", seats: 5, stepFree: false },
      { name: "T3", seats: 5, stepFree: true },
      { name: "T4", seats: 5, stepFree: false },
    ],
    parties: Array.from({ length: 8 }, (_, i) => ({
      name: `P${i + 1}`,
      size: 2,
      stepFree: i === 6,
      pin: null,
    })),
  };
  const reply = solve(input);
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.found, true);
  const seated = reply.result.tables.flatMap((t) => t.parties);
  assert.equal(seated.length, 8);
  assert.equal(new Set(seated).size, 8);
  for (const table of reply.result.tables) {
    assert.ok(table.remaining >= 0);
  }
  // The step-free party P7 sits at the step-free table T3.
  const t3 = reply.result.tables.find((t) => t.name === "T3");
  assert.ok(t3.parties.includes("P7"));
});

// ---- search bounds ----------------------------------------------------------

test("worst case stays within the SPEC tree bounds (87381 nodes, 87380 placements)", () => {
  // Seven size-1 parties fit anywhere; the eighth needs a step-free
  // table but none exists, so every prefix is explored and the last
  // party fails at every leaf: placements hit the bound exactly.
  const parties = Array.from({ length: 7 }, (_, i) => ({
    name: `P${i + 1}`,
    size: 1,
    stepFree: false,
    pin: null,
  }));
  parties.push({ name: "P8", size: 20, stepFree: true, pin: null });
  const input = {
    tables: Array.from({ length: 4 }, (_, i) => ({
      name: `T${i + 1}`,
      seats: 20,
      stepFree: false,
    })),
    parties,
  };
  const { reply, nodes, placements } = solveWithStats(input);
  assert.deepEqual(reply, { status: "ok", result: { found: false, tables: null } });
  assert.equal(placements, 87380);
  assert.equal(nodes, 21845);
  assert.ok(nodes <= 87381);
  assert.ok(placements <= 87380);
});

test("search generator yields one progress object per 4096-step batch", () => {
  const parties = Array.from({ length: 7 }, (_, i) => ({
    name: `P${i + 1}`,
    size: 1,
    stepFree: false,
    pin: null,
  }));
  parties.push({ name: "P8", size: 20, stepFree: true, pin: null });
  const validated = {
    tables: Array.from({ length: 4 }, (_, i) => ({
      name: `T${i + 1}`,
      seats: 20,
      stepFree: false,
    })),
    parties,
  };
  const stats = { nodes: 0, placements: 0 };
  const gen = search(validated, stats);
  const yields = [];
  let step = gen.next();
  while (!step.done) {
    yields.push(step.value.steps);
    step = gen.next();
  }
  // 87380 steps / 4096 per batch = 21 full batches.
  assert.equal(yields.length, 21);
  assert.equal(yields[0], BATCH_STEPS);
  assert.equal(yields[20], 21 * BATCH_STEPS);
  assert.deepEqual(step.value, { found: false, tables: null });
});

// ---- validation: shape, type, range ----------------------------------------

test("root must be a plain object", () => {
  assert.deepEqual(solve(null), {
    status: "error",
    error: { code: "TYPE", path: "" },
  });
  assert.deepEqual(solve([]), {
    status: "error",
    error: { code: "TYPE", path: "" },
  });
  assert.deepEqual(solve("x"), {
    status: "error",
    error: { code: "TYPE", path: "" },
  });
});

test("unknown root key -> SHAPE at root; missing key -> SHAPE at the key path", () => {
  const base = {
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
  };
  assert.deepEqual(solve({ ...base, extra: 1 }), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const { tables, ...noTables } = base;
  void tables;
  assert.deepEqual(solve(noTables), {
    status: "error",
    error: { code: "SHAPE", path: "/tables" },
  });
});

test("unknown and missing row keys -> SHAPE at the row / field path", () => {
  const parties = [{ name: "A", size: 1, stepFree: false, pin: null }];
  assert.deepEqual(
    solve({
      tables: [{ name: "T", seats: 4, stepFree: false, extra: 1 }],
      parties,
    }),
    { status: "error", error: { code: "SHAPE", path: "/tables/0" } },
  );
  assert.deepEqual(
    solve({
      tables: [{ name: "T", stepFree: false }],
      parties,
    }),
    { status: "error", error: { code: "SHAPE", path: "/tables/0/seats" } },
  );
});

test("table and party counts are bounded (RANGE)", () => {
  const oneTable = [{ name: "T", seats: 4, stepFree: false }];
  const oneParty = [{ name: "A", size: 1, stepFree: false, pin: null }];
  assert.deepEqual(solve({ tables: [], parties: oneParty }), {
    status: "error",
    error: { code: "RANGE", path: "/tables" },
  });
  assert.deepEqual(
    solve({
      tables: Array.from({ length: 5 }, (_, i) => ({
        name: `T${i}`,
        seats: 4,
        stepFree: false,
      })),
      parties: oneParty,
    }),
    { status: "error", error: { code: "RANGE", path: "/tables" } },
  );
  assert.deepEqual(solve({ tables: oneTable, parties: [] }), {
    status: "error",
    error: { code: "RANGE", path: "/parties" },
  });
  assert.deepEqual(
    solve({
      tables: oneTable,
      parties: Array.from({ length: 9 }, (_, i) => ({
        name: `P${i}`,
        size: 1,
        stepFree: false,
        pin: null,
      })),
    }),
    { status: "error", error: { code: "RANGE", path: "/parties" } },
  );
});

test("type errors: string numbers, non-boolean stepFree, non-array lists", () => {
  const table = { name: "T", seats: 4, stepFree: false };
  const party = { name: "A", size: 1, stepFree: false, pin: null };
  assert.deepEqual(
    solve({ tables: [{ ...table, seats: "4" }], parties: [party] }),
    { status: "error", error: { code: "TYPE", path: "/tables/0/seats" } },
  );
  assert.deepEqual(
    solve({ tables: [{ ...table, stepFree: "yes" }], parties: [party] }),
    { status: "error", error: { code: "TYPE", path: "/tables/0/stepFree" } },
  );
  assert.deepEqual(solve({ tables: "x", parties: [party] }), {
    status: "error",
    error: { code: "TYPE", path: "/tables" },
  });
  assert.deepEqual(
    solve({ tables: [table], parties: [{ ...party, pin: 3 }] }),
    { status: "error", error: { code: "TYPE", path: "/parties/0/pin" } },
  );
});

test("integer rules: -0, fractions and out-of-range seats fail", () => {
  const party = { name: "A", size: 1, stepFree: false, pin: null };
  for (const seats of [-0, 1.5, 0, 21, Number.NaN, Infinity]) {
    const reply = solve({
      tables: [{ name: "T", seats, stepFree: false }],
      parties: [party],
    });
    assert.equal(reply.status, "error", `seats=${String(seats)}`);
    assert.equal(reply.error.path, "/tables/0/seats");
  }
  assert.deepEqual(
    solve({
      tables: [{ name: "T", seats: 4, stepFree: false }],
      parties: [{ ...party, size: 0 }],
    }),
    { status: "error", error: { code: "RANGE", path: "/parties/0/size" } },
  );
});

test("duplicate names point at the second occurrence", () => {
  assert.deepEqual(
    solve({
      tables: [
        { name: "T", seats: 4, stepFree: false },
        { name: "T", seats: 4, stepFree: false },
      ],
      parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
    }),
    { status: "error", error: { code: "DUPLICATE", path: "/tables/1/name" } },
  );
  assert.deepEqual(
    solve({
      tables: [{ name: "T", seats: 4, stepFree: false }],
      parties: [
        { name: "A", size: 1, stepFree: false, pin: null },
        { name: "A", size: 1, stepFree: false, pin: null },
      ],
    }),
    { status: "error", error: { code: "DUPLICATE", path: "/parties/1/name" } },
  );
});

test("unknown pin -> REF at the pin path; pin matching is case-sensitive", () => {
  assert.deepEqual(
    solve({
      tables: [{ name: "T1", seats: 4, stepFree: false }],
      parties: [{ name: "A", size: 1, stepFree: false, pin: "t1" }],
    }),
    { status: "error", error: { code: "REF", path: "/parties/0/pin" } },
  );
});

// ---- validation: names ------------------------------------------------------

test("name normalization: trim U+0020 and NFC, output uses the normal form", () => {
  const reply = solve({
    tables: [{ name: "  T1  ", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: "T1" }],
  });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.tables[0].name, "T1");
});

test("NFC duplicates: e + combining acute equals precomposed e-acute", () => {
  assert.deepEqual(normalizeName("é"), { ok: true, name: "é" });
  assert.deepEqual(
    solve({
      tables: [
        { name: "é", seats: 4, stepFree: false },
        { name: "é", seats: 4, stepFree: false },
      ],
      parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
    }),
    { status: "error", error: { code: "DUPLICATE", path: "/tables/1/name" } },
  );
});

test("name character and length rules", () => {
  const bad = ["", "   ", "-abc", "_abc", "a b!", "a😀b", "a".repeat(25)];
  for (const name of bad) {
    assert.deepEqual(normalizeName(name), { ok: false, code: "RANGE" }, name);
  }
  assert.deepEqual(normalizeName("9lives"), { ok: true, name: "9lives" });
  assert.deepEqual(normalizeName("a-b_c d"), { ok: true, name: "a-b_c d" });
  assert.deepEqual(normalizeName("a".repeat(24)), {
    ok: true,
    name: "a".repeat(24),
  });
  assert.deepEqual(normalizeName(42), { ok: false, code: "TYPE" });
});

// ---- validation: size cap ---------------------------------------------------

test("JSON size cap: exactly 65536 bytes passes SIZE, one more byte fails", () => {
  const base = {
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
  };
  const overhead = Buffer.byteLength(JSON.stringify({ ...base, pad: "" }), "utf8");
  const atCap = { ...base, pad: "x".repeat(MAX_JSON_BYTES - overhead) };
  assert.equal(
    Buffer.byteLength(JSON.stringify(atCap), "utf8"),
    MAX_JSON_BYTES,
  );
  // At the cap the SIZE check passes; the unknown "pad" key then fails SHAPE.
  assert.deepEqual(solve(atCap), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const overCap = { ...base, pad: "x".repeat(MAX_JSON_BYTES - overhead + 1) };
  assert.equal(
    Buffer.byteLength(JSON.stringify(overCap), "utf8"),
    MAX_JSON_BYTES + 1,
  );
  assert.deepEqual(solve(overCap), {
    status: "error",
    error: { code: "SIZE", path: "" },
  });
});

// ---- flow controller extras -------------------------------------------------

test("flow: run with no draft is a no-op; cancel from ready is a no-op", () => {
  const flow = createFlow();
  flow.run(1);
  assert.equal(flow.snapshot().phase, "empty");
  flow.edit({
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
  });
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.cancel();
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow: late settle with a stale runId is ignored", () => {
  const flow = createFlow();
  const draft = {
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
  };
  flow.edit(draft);
  flow.run(1);
  flow.cancel();
  assert.equal(flow.snapshot().phase, "dirty");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "dirty");
  assert.equal(flow.snapshot().result, null);
});

test("flow: an invalid draft settles as error; editing returns to dirty", () => {
  const flow = createFlow();
  flow.edit({
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: "T0" }],
  });
  flow.run(1);
  flow.settle(1);
  const snapshot = flow.snapshot();
  assert.equal(snapshot.phase, "error");
  assert.deepEqual(snapshot.error, { code: "REF", path: "/parties/0/pin" });
  flow.edit({
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
  });
  assert.equal(flow.snapshot().phase, "dirty");
  assert.equal(flow.snapshot().error, null);
});

test("flow: reset returns to empty and clears everything", () => {
  const flow = createFlow();
  flow.edit({
    tables: [{ name: "T", seats: 4, stepFree: false }],
    parties: [{ name: "A", size: 1, stepFree: false, pin: null }],
  });
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepEqual(flow.snapshot(), {
    phase: "empty",
    result: null,
    error: null,
  });
});
