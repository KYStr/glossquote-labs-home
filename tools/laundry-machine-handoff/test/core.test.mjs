// Tests for Laundry Machine Handoff core (solve + flow).
// All expected values are derived independently from SPEC.md and
// fixtures.json — never generated from the implementation's output.
// The brute-force cross-check below re-derives the scheduling rule
// directly from the SPEC text (busy-list scans, no prefix tables).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve } from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../../../docs/specs/laundry-machine-handoff/fixtures.json", import.meta.url),
    "utf8",
  ),
);

function valid(overrides = {}) {
  return {
    start: 0,
    end: 100,
    washerBusy: [],
    dryerBusy: [],
    loads: [{ name: "A", washMin: 20, dryMin: 30, maxWaitMin: 0 }],
    ...overrides,
  };
}

function errorCase(input, code, path) {
  assert.deepStrictEqual(solve(input), {
    status: "error",
    error: { code, path },
  });
}

function runFlowSteps(steps) {
  const flow = createFlow();
  for (const step of steps) {
    if (step.type === "edit") flow.edit(step.draft);
    else if (step.type === "run") flow.run(step.runId);
    else if (step.type === "settle") flow.settle(step.runId);
    else if (step.type === "settleWith") flow.settleWith(step.runId, step.reply);
    else if (step.type === "cancel") flow.cancel();
    else if (step.type === "reset") flow.reset();
    else throw new Error(`unknown step ${step.type}`);
  }
  const { phase, result } = flow.snapshot();
  return { phase, result };
}

// ---- literal SPEC fixtures ----------------------------------------------

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "solve") continue;
  test(`fixture ${fixture.id}`, () => {
    assert.deepStrictEqual(solve(fixture.input), fixture.expected);
  });
}

for (const fixture of fixtures.cases) {
  if (fixture.kind !== "flow") continue;
  test(`fixture ${fixture.id}`, () => {
    assert.deepStrictEqual(runFlowSteps(fixture.input), fixture.expected);
  });
}

// ---- SIZE boundary ------------------------------------------------------

test("SIZE: exactly 65536 UTF-8 bytes passes the size gate (then fails name length)", () => {
  const base = valid();
  const baseBytes = new TextEncoder().encode(JSON.stringify(base)).length;
  const nameLength = 65536 - baseBytes + 1; // "A" (1 char) replaced by nameLength chars
  const input = valid({ loads: [{ name: "x".repeat(nameLength), washMin: 20, dryMin: 30, maxWaitMin: 0 }] });
  assert.equal(new TextEncoder().encode(JSON.stringify(input)).length, 65536);
  errorCase(input, "RANGE", "/loads/0/name");
});

test("SIZE: 65537 UTF-8 bytes is rejected before name validation", () => {
  const base = valid();
  const baseBytes = new TextEncoder().encode(JSON.stringify(base)).length;
  const nameLength = 65537 - baseBytes + 1;
  const input = valid({ loads: [{ name: "x".repeat(nameLength), washMin: 20, dryMin: 30, maxWaitMin: 0 }] });
  assert.equal(new TextEncoder().encode(JSON.stringify(input)).length, 65537);
  errorCase(input, "SIZE", "");
});

test("SIZE: multi-byte characters count as UTF-8 bytes, not characters", () => {
  const input = valid({ loads: [{ name: "洗".repeat(22000), washMin: 20, dryMin: 30, maxWaitMin: 0 }] });
  assert.ok(new TextEncoder().encode(JSON.stringify(input)).length > 65536);
  errorCase(input, "SIZE", "");
});

// ---- SHAPE ---------------------------------------------------------------

test("SHAPE: unknown root key reports the root path", () => {
  errorCase(valid({ extra: 1 }), "SHAPE", "");
});

test("SHAPE: missing root key reports that key's path", () => {
  const input = valid();
  delete input.loads;
  errorCase(input, "SHAPE", "/loads");
});

test("SHAPE: non-object root", () => {
  assert.deepStrictEqual(solve(null), { status: "error", error: { code: "SHAPE", path: "" } });
  assert.deepStrictEqual(solve([]), { status: "error", error: { code: "SHAPE", path: "" } });
  assert.deepStrictEqual(solve("x"), { status: "error", error: { code: "SHAPE", path: "" } });
});

test("SHAPE: unknown key in a busy row reports the row path", () => {
  errorCase(valid({ washerBusy: [{ start: 0, end: 10, extra: 1 }] }), "SHAPE", "/washerBusy/0");
});

test("SHAPE: missing key in a busy row reports that key's path", () => {
  errorCase(valid({ washerBusy: [{ start: 0 }] }), "SHAPE", "/washerBusy/0/end");
});

test("SHAPE: unknown key in a load row reports the row path", () => {
  errorCase(
    valid({ loads: [{ name: "A", washMin: 20, dryMin: 30, maxWaitMin: 0, x: 1 }] }),
    "SHAPE",
    "/loads/0",
  );
});

test("SHAPE: missing key in a load row reports that key's path", () => {
  errorCase(
    valid({ loads: [{ name: "A", washMin: 20, dryMin: 30 }] }),
    "SHAPE",
    "/loads/0/maxWaitMin",
  );
});

// ---- TYPE / RANGE --------------------------------------------------------

test("TYPE: numeric strings, fractions and -0 are rejected", () => {
  errorCase(valid({ start: "0" }), "TYPE", "/start");
  errorCase(valid({ start: 1.5 }), "TYPE", "/start");
  errorCase(valid({ start: -0 }), "TYPE", "/start");
  errorCase(valid({ loads: [{ name: "A", washMin: "20", dryMin: 30, maxWaitMin: 0 }] }), "TYPE", "/loads/0/washMin");
});

test("RANGE: window and minute bounds", () => {
  errorCase(valid({ start: 1440 }), "RANGE", "/start");
  errorCase(valid({ start: -1 }), "RANGE", "/start");
  errorCase(valid({ end: 0 }), "RANGE", "/end");
  errorCase(valid({ end: 1441 }), "RANGE", "/end");
  errorCase(valid({ loads: [{ name: "A", washMin: 0, dryMin: 30, maxWaitMin: 0 }] }), "RANGE", "/loads/0/washMin");
  errorCase(valid({ loads: [{ name: "A", washMin: 241, dryMin: 30, maxWaitMin: 0 }] }), "RANGE", "/loads/0/washMin");
  errorCase(valid({ loads: [{ name: "A", washMin: 20, dryMin: 0, maxWaitMin: 0 }] }), "RANGE", "/loads/0/dryMin");
  errorCase(valid({ loads: [{ name: "A", washMin: 20, dryMin: 30, maxWaitMin: 241 }] }), "RANGE", "/loads/0/maxWaitMin");
  errorCase(valid({ loads: [{ name: "A", washMin: 20, dryMin: 30, maxWaitMin: -1 }] }), "RANGE", "/loads/0/maxWaitMin");
});

test("RANGE: array caps", () => {
  errorCase(valid({ loads: [] }), "RANGE", "/loads");
  errorCase(
    valid({ loads: Array.from({ length: 9 }, (_, i) => ({ name: `L${i}`, washMin: 1, dryMin: 1, maxWaitMin: 0 })) }),
    "RANGE",
    "/loads",
  );
  errorCase(
    valid({ washerBusy: Array.from({ length: 17 }, () => ({ start: 0, end: 1 })) }),
    "RANGE",
    "/washerBusy",
  );
  errorCase(valid({ washerBusy: "nope" }), "TYPE", "/washerBusy");
  errorCase(valid({ loads: "nope" }), "TYPE", "/loads");
  errorCase(valid({ washerBusy: [null] }), "TYPE", "/washerBusy/0");
  errorCase(valid({ loads: [null] }), "TYPE", "/loads/0");
});

// ---- names ---------------------------------------------------------------

test("names: trim + NFC normalisation, first char, allowed rest chars", () => {
  const out = solve(valid({ loads: [{ name: " A ", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }));
  assert.equal(out.result.rows[0].name, "A");
  assert.equal(solve(valid({ loads: [{ name: "1A", washMin: 20, dryMin: 30, maxWaitMin: 0 }] })).status, "ok");
  assert.equal(solve(valid({ loads: [{ name: "A B", washMin: 20, dryMin: 30, maxWaitMin: 0 }] })).status, "ok");
  assert.equal(solve(valid({ loads: [{ name: "A_B-C", washMin: 20, dryMin: 30, maxWaitMin: 0 }] })).status, "ok");
  errorCase(valid({ loads: [{ name: "-A", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }), "TYPE", "/loads/0/name");
  errorCase(valid({ loads: [{ name: "A/B", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }), "TYPE", "/loads/0/name");
  errorCase(valid({ loads: [{ name: 42, washMin: 20, dryMin: 30, maxWaitMin: 0 }] }), "TYPE", "/loads/0/name");
});

test("names: injection text is rejected by the character rule", () => {
  errorCase(
    valid({ loads: [{ name: "<b>x</b>", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }),
    "TYPE",
    "/loads/0/name",
  );
  errorCase(
    valid({ loads: [{ name: "A\"; DROP TABLE", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }),
    "TYPE",
    "/loads/0/name",
  );
});

test("names: empty or over-long names are RANGE", () => {
  errorCase(valid({ loads: [{ name: "", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }), "RANGE", "/loads/0/name");
  errorCase(valid({ loads: [{ name: "   ", washMin: 20, dryMin: 30, maxWaitMin: 0 }] }), "RANGE", "/loads/0/name");
  errorCase(valid({ loads: [{ name: "x".repeat(25), washMin: 20, dryMin: 30, maxWaitMin: 0 }] }), "RANGE", "/loads/0/name");
  assert.equal(solve(valid({ loads: [{ name: "x".repeat(24), washMin: 20, dryMin: 30, maxWaitMin: 0 }] })).status, "ok");
});

test("DUPLICATE: second occurrence, NFC-equal names, case-sensitive", () => {
  errorCase(
    valid({ loads: [
      { name: "A", washMin: 20, dryMin: 30, maxWaitMin: 0 },
      { name: "A", washMin: 20, dryMin: 30, maxWaitMin: 0 },
    ] }),
    "DUPLICATE",
    "/loads/1/name",
  );
  errorCase(
    valid({ loads: [
      { name: "é", washMin: 20, dryMin: 30, maxWaitMin: 0 },
      { name: "é", washMin: 20, dryMin: 30, maxWaitMin: 0 },
    ] }),
    "DUPLICATE",
    "/loads/1/name",
  );
  assert.equal(
    solve(valid({ loads: [
      { name: "A", washMin: 20, dryMin: 30, maxWaitMin: 0 },
      { name: "a", washMin: 20, dryMin: 30, maxWaitMin: 0 },
    ] })).status,
    "ok",
  );
});

// ---- ORDER ---------------------------------------------------------------

test("ORDER: window, then washerBusy, then dryerBusy", () => {
  errorCase(valid({ start: 100, end: 100 }), "ORDER", "/end");
  errorCase(valid({ start: 200, end: 100 }), "ORDER", "/end");
  errorCase(valid({ washerBusy: [{ start: 50, end: 50 }] }), "ORDER", "/washerBusy/0/end");
  errorCase(valid({ dryerBusy: [{ start: 30, end: 20 }] }), "ORDER", "/dryerBusy/0/end");
  // Window ORDER wins over busy ORDER.
  errorCase(
    valid({ start: 100, end: 100, washerBusy: [{ start: 50, end: 50 }] }),
    "ORDER",
    "/end",
  );
  // Washer ORDER wins over dryer ORDER.
  errorCase(
    valid({ washerBusy: [{ start: 50, end: 50 }], dryerBusy: [{ start: 30, end: 20 }] }),
    "ORDER",
    "/washerBusy/0/end",
  );
});

// ---- scheduling, hand-derived --------------------------------------------

test("schedule: first load blocked when the window is too small", () => {
  assert.deepStrictEqual(solve(valid({ start: 0, end: 30 })), {
    status: "ok",
    result: { rows: [], blockedAt: "A" },
  });
});

test("schedule: overlapping busy intervals merge into one block", () => {
  const out = solve(valid({
    start: 0,
    end: 200,
    washerBusy: [{ start: 0, end: 30 }, { start: 20, end: 50 }],
    loads: [{ name: "A", washMin: 10, dryMin: 10, maxWaitMin: 0 }],
  }));
  assert.deepStrictEqual(out.result.rows, [
    { name: "A", washStart: 50, washEnd: 60, dryStart: 60, dryEnd: 70, waitMin: 0 },
  ]);
});

test("schedule: busy intervals before the window do not delay the wash", () => {
  const out = solve(valid({
    start: 480,
    end: 720,
    washerBusy: [{ start: 0, end: 60 }],
    dryerBusy: [{ start: 0, end: 60 }],
    loads: [{ name: "A", washMin: 20, dryMin: 30, maxWaitMin: 0 }],
  }));
  assert.deepStrictEqual(out.result.rows, [
    { name: "A", washStart: 480, washEnd: 500, dryStart: 500, dryEnd: 530, waitMin: 0 },
  ]);
});

test("schedule: dryer busy pushes the dry start, wait exactly at the limit", () => {
  const out = solve(valid({
    start: 0,
    end: 100,
    dryerBusy: [{ start: 10, end: 40 }],
    loads: [{ name: "A", washMin: 10, dryMin: 10, maxWaitMin: 30 }],
  }));
  assert.deepStrictEqual(out.result.rows, [
    { name: "A", washStart: 0, washEnd: 10, dryStart: 40, dryEnd: 50, waitMin: 30 },
  ]);
});

test("schedule: a later wash is chosen when the wait limit forbids the earliest", () => {
  const out = solve(valid({
    start: 0,
    end: 100,
    dryerBusy: [{ start: 10, end: 30 }],
    loads: [{ name: "A", washMin: 10, dryMin: 10, maxWaitMin: 0 }],
  }));
  assert.deepStrictEqual(out.result.rows, [
    { name: "A", washStart: 20, washEnd: 30, dryStart: 30, dryEnd: 40, waitMin: 0 },
  ]);
});

test("schedule: second load dryer cannot start before the first dryEnd", () => {
  const out = solve(valid({
    start: 0,
    end: 200,
    loads: [
      { name: "A", washMin: 10, dryMin: 50, maxWaitMin: 0 },
      { name: "B", washMin: 10, dryMin: 10, maxWaitMin: 100 },
    ],
  }));
  assert.deepStrictEqual(out.result.rows, [
    { name: "A", washStart: 0, washEnd: 10, dryStart: 10, dryEnd: 60, waitMin: 0 },
    { name: "B", washStart: 10, washEnd: 20, dryStart: 60, dryEnd: 70, waitMin: 40 },
  ]);
});

test("schedule: second load waits for the dryer when maxWait is 0", () => {
  const out = solve(valid({
    start: 0,
    end: 60,
    loads: [
      { name: "A", washMin: 20, dryMin: 20, maxWaitMin: 0 },
      { name: "B", washMin: 10, dryMin: 10, maxWaitMin: 0 },
    ],
  }));
  assert.deepStrictEqual(out.result.rows, [
    { name: "A", washStart: 0, washEnd: 20, dryStart: 20, dryEnd: 40, waitMin: 0 },
    { name: "B", washStart: 30, washEnd: 40, dryStart: 40, dryEnd: 50, waitMin: 0 },
  ]);
});

test("schedule: maximum data — eight 240-minute loads fill the day to the fifth", () => {
  const loads = ["A", "B", "C", "D", "E", "F", "G", "H"].map((name) => ({
    name, washMin: 240, dryMin: 240, maxWaitMin: 240,
  }));
  const out = solve(valid({ start: 0, end: 1440, loads }));
  assert.deepStrictEqual(out, {
    status: "ok",
    result: {
      rows: [
        { name: "A", washStart: 0, washEnd: 240, dryStart: 240, dryEnd: 480, waitMin: 0 },
        { name: "B", washStart: 240, washEnd: 480, dryStart: 480, dryEnd: 720, waitMin: 0 },
        { name: "C", washStart: 480, washEnd: 720, dryStart: 720, dryEnd: 960, waitMin: 0 },
        { name: "D", washStart: 720, washEnd: 960, dryStart: 960, dryEnd: 1200, waitMin: 0 },
        { name: "E", washStart: 960, washEnd: 1200, dryStart: 1200, dryEnd: 1440, waitMin: 0 },
      ],
      blockedAt: "F",
    },
  });
});

test("schedule: input is not mutated", () => {
  const input = valid({
    washerBusy: [{ start: 10, end: 20 }],
    loads: [{ name: "A", washMin: 20, dryMin: 30, maxWaitMin: 5 }],
  });
  const frozen = JSON.parse(JSON.stringify(input));
  Object.freeze(input);
  Object.freeze(input.washerBusy);
  Object.freeze(input.washerBusy[0]);
  Object.freeze(input.loads);
  Object.freeze(input.loads[0]);
  assert.deepStrictEqual(solve(input).result.rows[0].washStart, 20);
  assert.deepStrictEqual(input, frozen);
});

// ---- independent brute-force cross-check ----------------------------------

// Direct re-derivation from the SPEC text: scan wash minutes upward,
// check freeness by scanning the busy lists, find the dryer start by
// scanning dryer minutes upward. No prefix tables, no shared code.
function naiveSolve(data) {
  const free = (busy, a, b) => busy.every((r) => b <= r.start || a >= r.end);
  const rows = [];
  let prevWashEnd = data.start;
  let prevDryEnd = data.start;
  for (const load of data.loads) {
    let placed = null;
    for (let w = prevWashEnd; w + load.washMin <= data.end; w += 1) {
      if (!free(data.washerBusy, w, w + load.washMin)) continue;
      const washEnd = w + load.washMin;
      let d = Math.max(washEnd, prevDryEnd);
      while (d + load.dryMin <= data.end && !free(data.dryerBusy, d, d + load.dryMin)) d += 1;
      if (d + load.dryMin > data.end) break;
      if (d - washEnd > load.maxWaitMin) continue;
      placed = { name: load.name, washStart: w, washEnd, dryStart: d, dryEnd: d + load.dryMin, waitMin: d - washEnd };
      break;
    }
    if (placed === null) return { status: "ok", result: { rows, blockedAt: load.name } };
    rows.push(placed);
    prevWashEnd = placed.washEnd;
    prevDryEnd = placed.dryEnd;
  }
  return { status: "ok", result: { rows, blockedAt: null } };
}

const CROSS_INPUTS = [
  valid(),
  valid({ start: 480, end: 720, washerBusy: [{ start: 480, end: 500 }], dryerBusy: [{ start: 520, end: 550 }],
    loads: [
      { name: "A", washMin: 30, dryMin: 40, maxWaitMin: 10 },
      { name: "B", washMin: 20, dryMin: 30, maxWaitMin: 0 },
    ] }),
  valid({ start: 0, end: 1440, washerBusy: [{ start: 100, end: 300 }, { start: 250, end: 400 }, { start: 900, end: 901 }],
    dryerBusy: [{ start: 0, end: 60 }, { start: 500, end: 700 }],
    loads: [
      { name: "X", washMin: 240, dryMin: 60, maxWaitMin: 15 },
      { name: "Y", washMin: 45, dryMin: 240, maxWaitMin: 240 },
      { name: "Z", washMin: 1, dryMin: 1, maxWaitMin: 0 },
    ] }),
  valid({ start: 1380, end: 1440, loads: [{ name: "A", washMin: 30, dryMin: 30, maxWaitMin: 0 }] }),
  valid({ start: 0, end: 90, washerBusy: [{ start: 0, end: 89 }], loads: [{ name: "A", washMin: 1, dryMin: 1, maxWaitMin: 0 }] }),
  valid({ start: 60, end: 600, washerBusy: [{ start: 300, end: 360 }], dryerBusy: [{ start: 120, end: 180 }, { start: 400, end: 420 }],
    loads: [
      { name: "M1", washMin: 90, dryMin: 90, maxWaitMin: 5 },
      { name: "M2", washMin: 60, dryMin: 30, maxWaitMin: 60 },
      { name: "M3", washMin: 120, dryMin: 45, maxWaitMin: 0 },
    ] }),
];

for (const [i, input] of CROSS_INPUTS.entries()) {
  test(`cross-check ${i}: solve matches the independent brute force`, () => {
    assert.deepStrictEqual(solve(input), naiveSolve(input));
  });
}

// ---- flow extras ----------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.reset();
  assert.deepStrictEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: core error settles as error, edit returns to dirty", () => {
  const flow = createFlow();
  flow.edit(valid({ start: 100, end: 100 }));
  flow.run(1);
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "ORDER", path: "/end" },
  });
  flow.edit(valid());
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: stale error reply cannot overwrite a newer run", () => {
  const flow = createFlow();
  flow.edit(valid({ start: 100, end: 100 }));
  flow.run(1);
  flow.cancel();
  flow.edit(valid());
  flow.run(2);
  flow.settleWith(1, { status: "error", error: { code: "ORDER", path: "/end" } });
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
  assert.deepStrictEqual(flow.snapshot().result, {
    rows: [{ name: "A", washStart: 0, washEnd: 20, dryStart: 20, dryEnd: 50, waitMin: 0 }],
    blockedAt: null,
  });
});

test("flow: run while busy is ignored; settle after ready is ignored", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  const result = flow.snapshot().result;
  flow.settle(1);
  assert.deepStrictEqual(flow.snapshot(), { phase: "ready", result, error: null });
});

test("flow: cancel while not busy is a no-op", () => {
  const flow = createFlow();
  flow.edit(valid());
  flow.cancel();
  assert.deepStrictEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});
