// Tests for Pickup Window Route. Every expected value is taken from
// docs/specs/pickup-window-route/fixtures.json or hand-derived from the
// SPEC's own rules — never generated from the implementation's output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFlow } from "../public/js/core/flow.mjs";
import {
  BATCH_STEPS,
  MAX_NODES,
  MAX_ORDERS,
  search,
  solve,
  validate,
} from "../public/js/core/solve.mjs";

const fixtures = JSON.parse(
  await readFile(
    new URL(
      "../../../docs/specs/pickup-window-route/fixtures.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function baseInput() {
  return {
    start: 480,
    deadline: 600,
    stops: [
      { name: "A", open: 500, close: 540, service: 10 },
      { name: "B", open: 480, close: 520, service: 5 },
    ],
    travel: [
      [0, 20, 10],
      [15, 0, 15],
      [20, 10, 0],
    ],
  };
}

// ---- literal SPEC fixtures ---------------------------------------------

for (const c of fixtures.cases.filter((x) => x.kind === "solve")) {
  test(`solve fixture ${c.id}`, () => {
    assert.deepEqual(solve(c.input), c.expected);
  });
}

for (const c of fixtures.cases.filter((x) => x.kind === "flow")) {
  test(`flow fixture ${c.id}`, () => {
    const flow = createFlow();
    for (const step of c.input) {
      if (step.type === "edit") flow.edit(step.draft);
      else if (step.type === "run") flow.run(step.runId);
      else if (step.type === "settle") flow.settle(step.runId);
      else if (step.type === "cancel") flow.cancel();
      else if (step.type === "reset") flow.reset();
      else throw new Error(`unknown flow step ${step.type}`);
    }
    const snap = flow.snapshot();
    assert.deepEqual({ phase: snap.phase, result: snap.result }, c.expected);
  });
}

// ---- SIZE boundary ------------------------------------------------------

test("SIZE: 65,537 UTF-8 bytes reports SIZE at the root before shape", () => {
  const data = baseInput();
  // Pad with an unknown key so the shape would also be wrong; SIZE wins.
  // Adding ,"x":"<pad>" grows the JSON by pad + 7 bytes.
  const json = JSON.stringify(data);
  const pad = 65537 - Buffer.byteLength(json, "utf8") - 7;
  data.x = "x".repeat(Math.max(0, pad));
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  assert.equal(size, 65537, `test setup: size is ${size}`);
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "SIZE", path: "" },
  });
});

test("SIZE: exactly 65,536 bytes passes the size check and reports SHAPE", () => {
  const data = baseInput();
  const json = JSON.stringify(data);
  const pad = 65536 - Buffer.byteLength(json, "utf8") - 7;
  data.x = "x".repeat(Math.max(0, pad));
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  assert.equal(size, 65536, `test setup: size is ${size}`);
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
});

// ---- fixed error paths ---------------------------------------------------

test("shape: unknown root key reports SHAPE at the root", () => {
  const data = baseInput();
  data.extra = 1;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
});

test("shape: missing root key reports SHAPE at the missing key", () => {
  const data = baseInput();
  delete data.deadline;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "SHAPE", path: "/deadline" },
  });
});

test("shape: unknown stop key reports SHAPE at the stop object", () => {
  const data = baseInput();
  data.stops[0].extra = 1;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "SHAPE", path: "/stops/0" },
  });
});

test("shape: missing stop key reports SHAPE at the missing key", () => {
  const data = baseInput();
  delete data.stops[0].name;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "SHAPE", path: "/stops/0/name" },
  });
});

test("shape: non-object root reports TYPE at the root", () => {
  assert.deepEqual(solve([1, 2]), {
    status: "error",
    error: { code: "TYPE", path: "" },
  });
});

test("matrix: wrong outer length reports RANGE at /travel", () => {
  const data = baseInput();
  data.travel = data.travel.slice(0, 2);
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "RANGE", path: "/travel" },
  });
});

test("matrix: wrong row length reports RANGE at the row", () => {
  const data = baseInput();
  data.travel[1] = data.travel[1].slice(0, 2);
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "RANGE", path: "/travel/1" },
  });
});

test("matrix: null diagonal reports DIAGONAL at the cell", () => {
  const data = baseInput();
  data.travel[0][0] = null;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "DIAGONAL", path: "/travel/0/0" },
  });
});

test("matrix: non-array travel reports TYPE at /travel", () => {
  const data = baseInput();
  data.travel = 5;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "TYPE", path: "/travel" },
  });
});

test("matrix: string cell reports TYPE at the cell", () => {
  const data = baseInput();
  data.travel[0][1] = "20";
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "TYPE", path: "/travel/0/1" },
  });
});

test("matrix: cell above 1440 reports RANGE at the cell", () => {
  const data = baseInput();
  data.travel[0][1] = 1441;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "RANGE", path: "/travel/0/1" },
  });
});

test("order: deadline equal to start reports ORDER at /deadline", () => {
  const data = baseInput();
  data.start = 600;
  data.deadline = 600;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "ORDER", path: "/deadline" },
  });
});

test("order: close equal to open reports ORDER at the close field", () => {
  const data = baseInput();
  data.stops[0].close = data.stops[0].open;
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "ORDER", path: "/stops/0/close" },
  });
});

test("duplicate: second stop with the same name reports DUPLICATE", () => {
  const data = baseInput();
  data.stops[1].name = "A";
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "DUPLICATE", path: "/stops/1/name" },
  });
});

test("duplicate: NFC-equivalent names count as duplicates", () => {
  const data = baseInput();
  data.stops[0].name = "é"; // U+00E9
  data.stops[1].name = "é"; // U+0065 U+0301
  assert.deepEqual(solve(data), {
    status: "error",
    error: { code: "DUPLICATE", path: "/stops/1/name" },
  });
});

test("numbers: string, float and -0 are TYPE, not values", () => {
  for (const bad of ["480", 480.5, -0]) {
    const data = baseInput();
    data.start = bad;
    assert.deepEqual(solve(data), {
      status: "error",
      error: { code: "TYPE", path: "/start" },
    });
  }
});

test("numbers: start 1440 and service 0 / 241 are RANGE", () => {
  const a = baseInput();
  a.start = 1440;
  assert.deepEqual(solve(a), {
    status: "error",
    error: { code: "RANGE", path: "/start" },
  });
  for (const badService of [0, 241]) {
    const data = baseInput();
    data.stops[0].service = badService;
    assert.deepEqual(solve(data), {
      status: "error",
      error: { code: "RANGE", path: "/stops/0/service" },
    });
  }
});

test("stops: zero stops and nine stops are RANGE at /stops", () => {
  const empty = baseInput();
  empty.stops = [];
  empty.travel = [[0]];
  assert.deepEqual(solve(empty), {
    status: "error",
    error: { code: "RANGE", path: "/stops" },
  });
  const many = baseInput();
  many.stops = Array.from({ length: 9 }, (_, i) => ({
    name: `S${i}`,
    open: 0,
    close: 1440,
    service: 1,
  }));
  many.travel = Array.from({ length: 10 }, (_, i) =>
    Array.from({ length: 10 }, (_, j) => (i === j ? 0 : 1)),
  );
  assert.deepEqual(solve(many), {
    status: "error",
    error: { code: "RANGE", path: "/stops" },
  });
});

// ---- name rules -----------------------------------------------------------

test("names: leading/trailing U+0020 trims and NFC normalizes", () => {
  const data = {
    start: 0,
    deadline: 10,
    stops: [{ name: " A ", open: 0, close: 5, service: 5 }],
    travel: [
      [0, 0],
      [0, 0],
    ],
  };
  const reply = solve(data);
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.visits[0].name, "A");
});

test("names: bad characters, bad first character and empties", () => {
  const badNames = [
    ["A/B", "TYPE"],
    ["-A", "TYPE"],
    ["", "RANGE"],
    ["   ", "RANGE"],
    ["A".repeat(25), "RANGE"],
  ];
  for (const [name, code] of badNames) {
    const data = baseInput();
    data.stops[0].name = name;
    assert.deepEqual(solve(data), {
      status: "error",
      error: { code, path: "/stops/0/name" },
    });
  }
});

// ---- search semantics ------------------------------------------------------

test("search: a one-way missing leg forces the only feasible order", () => {
  // B -> A is missing, so B first can never complete; A first returns 40.
  const data = {
    start: 0,
    deadline: 100,
    stops: [
      { name: "A", open: 0, close: 100, service: 5 },
      { name: "B", open: 0, close: 100, service: 5 },
    ],
    travel: [
      [0, 10, 10],
      [10, 0, 10],
      [10, null, 0],
    ],
  };
  assert.deepEqual(solve(data), {
    status: "ok",
    result: {
      found: true,
      returnAt: 40,
      visits: [
        { name: "A", arrive: 10, serveStart: 10, leave: 15 },
        { name: "B", arrive: 25, serveStart: 25, leave: 30 },
      ],
    },
  });
});

test("search: 8-stop worst case stays inside the SPEC bounds", () => {
  const stops = Array.from({ length: 8 }, (_, i) => ({
    name: `S${i + 1}`,
    open: 0,
    close: 1440,
    service: 1,
  }));
  const travel = Array.from({ length: 9 }, (_, i) =>
    Array.from({ length: 9 }, (_, j) => (i === j ? 0 : 1)),
  );
  const data = { start: 0, deadline: 1440, stops, travel };
  const checked = validate(data);
  assert.equal(checked.ok, true);
  const stats = { nodes: 0, orders: 0 };
  const gen = search(checked.data, stats);
  let next = gen.next();
  while (!next.done) next = gen.next();
  // Every leg is 1 and every service is 1: 8 legs out + 8 services +
  // 1 leg home = 17. All orders tie, so the input order is kept.
  assert.deepEqual(next.value, {
    found: true,
    returnAt: 17,
    visits: stops.map((s, k) => ({
      name: s.name,
      arrive: 2 * k + 1,
      serveStart: 2 * k + 1,
      leave: 2 * k + 2,
    })),
  });
  assert.equal(stats.nodes, MAX_NODES);
  assert.equal(stats.orders, MAX_ORDERS);
  assert.ok(BATCH_STEPS === 4096);
});

test("search: waiting is allowed and counted separately from service", () => {
  const data = {
    start: 0,
    deadline: 100,
    stops: [{ name: "A", open: 50, close: 90, service: 10 }],
    travel: [
      [0, 5],
      [5, 0],
    ],
  };
  assert.deepEqual(solve(data), {
    status: "ok",
    result: {
      found: true,
      returnAt: 65,
      visits: [{ name: "A", arrive: 5, serveStart: 50, leave: 60 }],
    },
  });
});

test("solve does not mutate a frozen input", () => {
  const data = deepFreeze(baseInput());
  const reply = solve(data);
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.returnAt, 530);
  assert.deepEqual(data, baseInput());
});

// ---- flow extras ------------------------------------------------------------

test("flow: reset returns to empty and clears result and error", () => {
  const flow = createFlow();
  flow.edit(baseInput());
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: fail then edit returns to dirty and clears the error", () => {
  const flow = createFlow();
  flow.edit(baseInput());
  flow.fail({ code: "SYNTAX", path: "/start" });
  assert.deepEqual(flow.snapshot(), {
    phase: "error",
    result: null,
    error: { code: "SYNTAX", path: "/start" },
  });
  flow.edit(baseInput());
  assert.deepEqual(flow.snapshot(), { phase: "dirty", result: null, error: null });
});

test("flow: run while busy is ignored and its settle is dropped", () => {
  const flow = createFlow();
  flow.edit(baseInput());
  flow.run(1);
  flow.run(2); // ignored: still busy on run 1
  flow.settle(2); // ignored: not the active run
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.returnAt, 530);
});

test("flow: a stale error reply cannot overwrite a newer run", () => {
  const flow = createFlow();
  flow.edit(baseInput());
  flow.run(1);
  flow.cancel();
  const second = {
    start: 0,
    deadline: 60,
    stops: [
      { name: "A", open: 20, close: 40, service: 5 },
      { name: "B", open: 0, close: 60, service: 5 },
    ],
    travel: [
      [0, 5, 10],
      [8, 0, 3],
      [5, 10, 0],
    ],
  };
  flow.edit(second);
  flow.run(2);
  // The cancelled run 1 now reports an error: it must be discarded.
  flow.settleWith(1, { status: "error", error: { code: "TYPE", path: "" } });
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.returnAt, 38);
});

test("flow: cancel while idle is a no-op", () => {
  const flow = createFlow();
  flow.cancel();
  assert.equal(flow.snapshot().phase, "empty");
  flow.edit(baseInput());
  flow.cancel();
  assert.equal(flow.snapshot().phase, "dirty");
});

// ---- worker protocol (Node stub) ---------------------------------------------

test("worker: run posts one done reply; cancel before drain posts nothing", async () => {
  const posted = [];
  const listeners = {};
  globalThis.self = {
    addEventListener(type, fn) {
      (listeners[type] ??= []).push(fn);
    },
    postMessage(message) {
      posted.push(message);
    },
  };
  try {
    await import("../public/js/worker.mjs");
    const dispatch = (data) => {
      for (const fn of listeners.message ?? []) fn({ data });
    };

    dispatch({ type: "run", runId: 7, data: baseInput() });
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, "done");
    assert.equal(posted[0].runId, 7);
    assert.deepEqual(posted[0].reply, {
      status: "ok",
      result: {
        found: true,
        returnAt: 530,
        visits: [
          { name: "B", arrive: 490, serveStart: 490, leave: 495 },
          { name: "A", arrive: 505, serveStart: 505, leave: 515 },
        ],
      },
    });

    // A large search cancelled immediately: no done reply may follow.
    posted.length = 0;
    const stops = Array.from({ length: 8 }, (_, i) => ({
      name: `S${i + 1}`,
      open: 0,
      close: 1440,
      service: 1,
    }));
    const travel = Array.from({ length: 9 }, (_, i) =>
      Array.from({ length: 9 }, (_, j) => (i === j ? 0 : 1)),
    );
    dispatch({
      type: "run",
      runId: 8,
      data: { start: 0, deadline: 1440, stops, travel },
    });
    dispatch({ type: "cancel", runId: 8 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.deepEqual(
      posted.map((m) => m.type),
      ["cancelled"],
    );
    assert.equal(posted[0].runId, 8);
  } finally {
    delete globalThis.self;
  }
});
