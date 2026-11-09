// Tests for Event Ticket Range Check core. Literal expectations come from
// docs/specs/event-ticket-ranges/fixtures.json (imported, not copied) and
// from hand-derived cases; nothing is generated from the implementation.
// Run with: node --test

import test from "node:test";
import assert from "node:assert/strict";
import {
  solve,
  normalizeName,
  MAX_JSON_BYTES,
  MAX_BUNDLES,
} from "../public/js/core/solve.mjs";
import { createFlow } from "../public/js/core/flow.mjs";
import fixtures from "../../../docs/specs/event-ticket-ranges/fixtures.json" with {
  type: "json",
};

// ---- literal SPEC fixtures ------------------------------------------------

test("fixtures file: 8 cases with the pinned ids", () => {
  assert.equal(fixtures.specId, "spec-event-ticket-ranges-20261109");
  assert.equal(fixtures.cases.length, 8);
  assert.deepEqual(
    fixtures.cases.map((c) => c.id),
    [
      "event-ticket-ranges.mixed",
      "event-ticket-ranges.two-edges",
      "event-ticket-ranges.upper-edge",
      "event-ticket-ranges.empty-bundles",
      "event-ticket-ranges.wrong-width",
      "event-ticket-ranges.backwards",
      "event-ticket-ranges.dirty-after-edit",
      "event-ticket-ranges.cancel-then-late",
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
  const snap = flow.snapshot();
  return { phase: snap.phase, result: snap.result };
}

for (const c of fixtures.cases.filter((c) => c.kind === "flow")) {
  test(`flow fixture: ${c.id}`, () => {
    assert.deepEqual(replayFlow(c), c.expected);
  });
}

// ---- hand-derived solve cases --------------------------------------------

const MIXED = {
  digits: 4,
  issued: { first: "0001", last: "0010" },
  bundles: [
    { name: "A", first: "0001", last: "0004" },
    { name: "B", first: "0004", last: "0006" },
    { name: "C", first: "0008", last: "0011" },
  ],
};

test("issued length equals uniqueCovered + missingCount", () => {
  const reply = solve(MIXED);
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.uniqueCovered + reply.result.missingCount, 10);
});

test("adjacent segments with the same bundle set merge", () => {
  // A covers 0001-0003, B covers 0004-0006, A+B overlap 0004 only in
  // another layout: here A 0001-0006 and B 0003-0004 overlap in one
  // merged segment 0003-0004 even though endpoints split at 0003/0004.
  const reply = solve({
    digits: 4,
    issued: { first: "0001", last: "0010" },
    bundles: [
      { name: "A", first: "0001", last: "0006" },
      { name: "B", first: "0003", last: "0004" },
    ],
  });
  assert.deepEqual(reply, {
    status: "ok",
    result: {
      uniqueCovered: 6,
      missingCount: 4,
      duplicateCopies: 2,
      outsideCopies: 0,
      missing: [{ first: "0007", last: "0010" }],
      overlaps: [{ first: "0003", last: "0004", bundles: ["A", "B"] }],
      outside: [],
    },
  });
});

test("three-way overlap counts two extra copies per ticket", () => {
  const reply = solve({
    digits: 2,
    issued: { first: "00", last: "09" },
    bundles: [
      { name: "A", first: "03", last: "05" },
      { name: "B", first: "04", last: "06" },
      { name: "C", first: "05", last: "07" },
    ],
  });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.uniqueCovered, 5);
  assert.equal(reply.result.duplicateCopies, 4); // 04: +1, 05: +2, 06: +1
  assert.deepEqual(reply.result.overlaps, [
    { first: "04", last: "04", bundles: ["A", "B"] },
    { first: "05", last: "05", bundles: ["A", "B", "C"] },
    { first: "06", last: "06", bundles: ["B", "C"] },
  ]);
});

test("outside segments keep bundle input order, lower before higher", () => {
  const reply = solve({
    digits: 3,
    issued: { first: "100", last: "199" },
    bundles: [
      { name: "Z", first: "050", last: "250" },
      { name: "Y", first: "090", last: "099" },
    ],
  });
  assert.deepEqual(reply.result.outside, [
    { bundle: "Z", first: "050", last: "099" },
    { bundle: "Z", first: "200", last: "250" },
    { bundle: "Y", first: "090", last: "099" },
  ]);
  assert.equal(reply.result.outsideCopies, 50 + 51 + 10);
});

test("a bundle fully outside still counts only as outside", () => {
  const reply = solve({
    digits: 2,
    issued: { first: "10", last: "19" },
    bundles: [{ name: "A", first: "20", last: "25" }],
  });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.uniqueCovered, 0);
  assert.equal(reply.result.missingCount, 10);
  assert.equal(reply.result.outsideCopies, 6);
  assert.deepEqual(reply.result.missing, [{ first: "10", last: "19" }]);
});

test("all-zero serials are allowed", () => {
  const reply = solve({
    digits: 3,
    issued: { first: "000", last: "000" },
    bundles: [{ name: "A", first: "000", last: "000" }],
  });
  assert.equal(reply.status, "ok");
  assert.equal(reply.result.uniqueCovered, 1);
});

// ---- validation: digits ----------------------------------------------------

test("digits: wrong types are TYPE", () => {
  for (const bad of ["4", 4.5, -0, Number.NaN, null, true]) {
    assert.deepEqual(solve({ digits: bad, issued: { first: "0", last: "9" }, bundles: [] }), {
      status: "error",
      error: { code: "TYPE", path: "/digits" },
    });
  }
});

test("digits: out of range is RANGE", () => {
  for (const bad of [0, 10, -3]) {
    assert.deepEqual(solve({ digits: bad, issued: { first: "0", last: "9" }, bundles: [] }), {
      status: "error",
      error: { code: "RANGE", path: "/digits" },
    });
  }
});

// ---- validation: shape -----------------------------------------------------

test("root must be an object", () => {
  for (const bad of [null, [], "x", 4]) {
    assert.deepEqual(solve(bad), {
      status: "error",
      error: { code: "TYPE", path: "" },
    });
  }
});

test("unknown root key is SHAPE at the root path", () => {
  assert.deepEqual(
    solve({ digits: 2, issued: { first: "00", last: "99" }, bundles: [], extra: 1 }),
    { status: "error", error: { code: "SHAPE", path: "" } },
  );
});

test("missing root key is SHAPE at that key path", () => {
  assert.deepEqual(
    solve({ digits: 2, issued: { first: "00", last: "99" } }),
    { status: "error", error: { code: "SHAPE", path: "/bundles" } },
  );
});

test("unknown issued key is SHAPE at /issued; missing serial key at its path", () => {
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "00", last: "99", note: "x" },
      bundles: [],
    }),
    { status: "error", error: { code: "SHAPE", path: "/issued" } },
  );
  assert.deepEqual(
    solve({ digits: 2, issued: { first: "00" }, bundles: [] }),
    { status: "error", error: { code: "SHAPE", path: "/issued/last" } },
  );
});

test("unknown bundle key is SHAPE at the row path; missing key at its path", () => {
  const base = {
    digits: 2,
    issued: { first: "00", last: "99" },
    bundles: [{ name: "A", first: "00", last: "01", x: 1 }],
  };
  assert.deepEqual(solve(base), {
    status: "error",
    error: { code: "SHAPE", path: "/bundles/0" },
  });
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "00", last: "99" },
      bundles: [{ name: "A", first: "00" }],
    }),
    { status: "error", error: { code: "SHAPE", path: "/bundles/0/last" } },
  );
});

test("bundles must be an array; more than 64 rows is RANGE", () => {
  assert.deepEqual(
    solve({ digits: 2, issued: { first: "00", last: "99" }, bundles: {} }),
    { status: "error", error: { code: "TYPE", path: "/bundles" } },
  );
  const many = Array.from({ length: MAX_BUNDLES + 1 }, (_, i) => ({
    name: `B${i}`,
    first: "00",
    last: "00",
  }));
  assert.deepEqual(
    solve({ digits: 2, issued: { first: "00", last: "99" }, bundles: many }),
    { status: "error", error: { code: "RANGE", path: "/bundles" } },
  );
  const exactly = Array.from({ length: MAX_BUNDLES }, (_, i) => ({
    name: `B${i}`,
    first: "00",
    last: "00",
  }));
  assert.equal(
    solve({ digits: 2, issued: { first: "00", last: "99" }, bundles: exactly }).status,
    "ok",
  );
});

// ---- validation: serials ---------------------------------------------------

test("serial: non-string is TYPE; wrong width or characters are SYNTAX", () => {
  const withFirst = (first) => ({
    digits: 2,
    issued: { first, last: "99" },
    bundles: [],
  });
  assert.deepEqual(solve(withFirst(5)), {
    status: "error",
    error: { code: "TYPE", path: "/issued/first" },
  });
  for (const bad of ["0", "000", "1a", " 1", "１２", "", "1.0", "-1"]) {
    assert.deepEqual(solve(withFirst(bad)), {
      status: "error",
      error: { code: "SYNTAX", path: "/issued/first" },
    });
  }
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "00", last: "99" },
      bundles: [{ name: "A", first: "00", last: "100" }],
    }),
    { status: "error", error: { code: "SYNTAX", path: "/bundles/0/last" } },
  );
});

// ---- validation: names -----------------------------------------------------

test("normalizeName trims U+0020 and NFC-normalizes", () => {
  assert.deepEqual(normalizeName("  A-1_x  "), { ok: true, name: "A-1_x" });
  assert.deepEqual(normalizeName("é"), { ok: true, name: "é" });
  assert.deepEqual(normalizeName("Ａ"), { ok: true, name: "Ａ" });
});

test("name: empty or over 24 code points is RANGE", () => {
  assert.deepEqual(normalizeName(""), { ok: false, code: "RANGE" });
  assert.deepEqual(normalizeName("   "), { ok: false, code: "RANGE" });
  assert.deepEqual(normalizeName("a".repeat(25)), { ok: false, code: "RANGE" });
  assert.deepEqual(normalizeName("a".repeat(24)), { ok: true, name: "a".repeat(24) });
});

test("name: bad first or rest characters are TYPE", () => {
  for (const bad of ["-A", "_A", "<script>", "A/B", "A\tB", "A\nB"]) {
    assert.deepEqual(normalizeName(bad), { ok: false, code: "TYPE" });
  }
  assert.deepEqual(normalizeName("A B"), { ok: true, name: "A B" });
  assert.deepEqual(normalizeName("1st"), { ok: true, name: "1st" });
});

test("duplicate normalized names report DUPLICATE at the second row", () => {
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "00", last: "99" },
      bundles: [
        { name: "é", first: "00", last: "01" },
        { name: "é", first: "02", last: "03" },
      ],
    }),
    { status: "error", error: { code: "DUPLICATE", path: "/bundles/1/name" } },
  );
  // Same name with different surrounding spaces is the same name.
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "00", last: "99" },
      bundles: [
        { name: "A", first: "00", last: "01" },
        { name: " A ", first: "02", last: "03" },
      ],
    }),
    { status: "error", error: { code: "DUPLICATE", path: "/bundles/1/name" } },
  );
  // Case is significant: A and a are different names.
  assert.equal(
    solve({
      digits: 2,
      issued: { first: "00", last: "99" },
      bundles: [
        { name: "A", first: "00", last: "01" },
        { name: "a", first: "02", last: "03" },
      ],
    }).status,
    "ok",
  );
});

// ---- validation: ORDER -----------------------------------------------------

test("issued backwards is ORDER at /issued/last", () => {
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "50", last: "49" },
      bundles: [],
    }),
    { status: "error", error: { code: "ORDER", path: "/issued/last" } },
  );
});

test("issued ORDER is checked before bundle ORDER", () => {
  assert.deepEqual(
    solve({
      digits: 2,
      issued: { first: "50", last: "49" },
      bundles: [{ name: "A", first: "42", last: "41" }],
    }),
    { status: "error", error: { code: "ORDER", path: "/issued/last" } },
  );
});

// ---- validation: SIZE ------------------------------------------------------

test("SIZE: input over 65536 UTF-8 bytes is rejected at the root", () => {
  const big = {
    digits: 2,
    issued: { first: "00", last: "99" },
    bundles: [{ name: "A".padEnd(24, "x"), first: "00", last: "99" }],
  };
  const json = JSON.stringify(big);
  assert.ok(Buffer.byteLength(json, "utf8") < MAX_JSON_BYTES);
  // Pad with an unknown key until just under and just over the cap.
  const under = { ...big, pad: "x".repeat(MAX_JSON_BYTES - Buffer.byteLength(json, "utf8") - 12) };
  assert.ok(Buffer.byteLength(JSON.stringify(under), "utf8") <= MAX_JSON_BYTES);
  assert.deepEqual(solve(under), {
    status: "error",
    error: { code: "SHAPE", path: "" },
  });
  const over = { ...big, pad: "x".repeat(MAX_JSON_BYTES) };
  assert.ok(Buffer.byteLength(JSON.stringify(over), "utf8") > MAX_JSON_BYTES);
  assert.deepEqual(solve(over), {
    status: "error",
    error: { code: "SIZE", path: "" },
  });
});

// ---- flow extras -----------------------------------------------------------

test("flow: reset returns to empty", () => {
  const flow = createFlow();
  flow.edit(MIXED);
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
  flow.reset();
  assert.deepEqual(flow.snapshot(), { phase: "empty", result: null, error: null });
});

test("flow: fail keeps the draft and enters error; a later edit returns to dirty", () => {
  const flow = createFlow();
  flow.edit(MIXED);
  flow.fail({ code: "SYNTAX", path: "/issued/first" });
  assert.equal(flow.snapshot().phase, "error");
  assert.deepEqual(flow.snapshot().error, { code: "SYNTAX", path: "/issued/first" });
  flow.edit(MIXED);
  assert.equal(flow.snapshot().phase, "dirty");
  assert.equal(flow.snapshot().error, null);
});

test("flow: a stale error reply cannot overwrite a newer state", () => {
  const flow = createFlow();
  flow.edit(MIXED);
  flow.run(1);
  flow.cancel();
  flow.edit({
    digits: 2,
    issued: { first: "10", last: "14" },
    bundles: [
      { name: "A", first: "08", last: "11" },
      { name: "B", first: "12", last: "16" },
    ],
  });
  flow.run(2);
  // The old run's error reply arrives after the new run started.
  flow.settleWith(1, { status: "error", error: { code: "ORDER", path: "/issued/last" } });
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "ready");
  assert.equal(flow.snapshot().result.uniqueCovered, 5);
});

test("flow: cancel while idle is a no-op; resubmit while busy is ignored", () => {
  const flow = createFlow();
  flow.cancel();
  assert.equal(flow.snapshot().phase, "empty");
  flow.edit(MIXED);
  flow.run(1);
  flow.run(2);
  flow.settle(2);
  assert.equal(flow.snapshot().phase, "busy");
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "ready");
});

test("flow: core error settles as error phase", () => {
  const flow = createFlow();
  flow.edit({
    digits: 2,
    issued: { first: "00", last: "99" },
    bundles: [{ name: "A", first: "42", last: "41" }],
  });
  flow.run(1);
  flow.settle(1);
  assert.equal(flow.snapshot().phase, "error");
  assert.deepEqual(flow.snapshot().error, { code: "ORDER", path: "/bundles/0/last" });
});
