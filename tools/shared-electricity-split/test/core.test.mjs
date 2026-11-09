// Core tests: the nine literal core fixtures vendored in
// test/fixtures.mjs (spec-shared-electricity-split-20261109, candidate
// 4b1c5422b3f8eef2a1b45c14d9997b53be13f799), deep-compared, plus boundary,
// error-order, and invariant cases derived from the SPEC text. Expected
// values are never produced by the implementation under test.

import assert from "node:assert/strict";
import test from "node:test";
import { run, validateInput } from "../public/js/core/split.mjs";
import fixtures from "./fixtures.mjs";

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(structuredClone(fixture.input)), fixture.expected);
  });
}

function rooms(count, fill = { name: "房", start: "0", end: "10" }) {
  return Array.from({ length: count }, (unused, i) => ({
    name: `${fill.name}${i + 1}`,
    start: fill.start,
    end: fill.end,
  }));
}

test("bill at the legal maximum is accepted; one dollar over is RANGE", () => {
  const ok = run({ totalBill: "99999999", totalDelta: "", rooms: rooms(2) });
  assert.equal(ok.ok, true);
  assert.equal(ok.result.totalAmountTwd, 99999999);
  assert.deepEqual(run({ totalBill: "100000000", totalDelta: "", rooms: rooms(2) }), {
    ok: false,
    error: { code: "RANGE", field: "totalBill", row: null },
  });
});

test("reading at the legal maximum is accepted; 1,000,000.0 is RANGE", () => {
  const ok = run({
    totalBill: "10",
    totalDelta: "",
    rooms: [
      { name: "A", start: "0", end: "999999.9" },
      { name: "B", start: "0", end: "0" },
    ],
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(
    run({
      totalBill: "10",
      totalDelta: "",
      rooms: [
        { name: "A", start: "0", end: "1000000.0" },
        { name: "B", start: "0", end: "0" },
      ],
    }),
    { ok: false, error: { code: "RANGE", field: "end", row: 1 } },
  );
});

test("ten rooms are accepted; eleven rooms are ROOM_COUNT", () => {
  assert.equal(run({ totalBill: "100", totalDelta: "", rooms: rooms(10) }).ok, true);
  assert.deepEqual(run({ totalBill: "100", totalDelta: "", rooms: rooms(11) }), {
    ok: false,
    error: { code: "ROOM_COUNT", field: "rooms", row: null },
  });
});

test("a missing totalDelta key behaves like an empty totalDelta", () => {
  const input = { totalBill: "100", rooms: rooms(2) };
  const got = run(input);
  assert.equal(got.ok, true);
  assert.equal(got.result.totalDeltaTenths, null);
  assert.equal(got.result.commonTenths, null);
});

test("duplicate names after normalization blame the second room", () => {
  assert.deepEqual(
    run({
      totalBill: "100",
      totalDelta: "",
      rooms: [
        { name: " 101房 ", start: "0", end: "10" },
        { name: "101房", start: "0", end: "10" },
      ],
    }),
    { ok: false, error: { code: "DUPLICATE", field: "name", row: 2 } },
  );
});

test("end equal to start is a legal zero-usage room", () => {
  const got = run({
    totalBill: "100",
    totalDelta: "",
    rooms: [
      { name: "A", start: "42.5", end: "42.5" },
      { name: "B", start: "0", end: "10" },
    ],
  });
  assert.equal(got.ok, true);
  assert.equal(got.result.rooms[0].usageTenths, 0);
  assert.equal(got.result.rooms[0].amountTwd, 0);
  assert.equal(got.result.rooms[1].amountTwd, 100);
});

test("a lone surrogate in a name is UNICODE", () => {
  assert.deepEqual(
    run({
      totalBill: "100",
      totalDelta: "",
      rooms: [
        { name: "A\uD800", start: "0", end: "10" },
        { name: "B", start: "0", end: "10" },
      ],
    }),
    { ok: false, error: { code: "UNICODE", field: "name", row: 1 } },
  );
});

test("schema failures: unknown key, missing field, accessor, non-string", () => {
  assert.deepEqual(run({ totalBill: "1", totalDelta: "", rooms: rooms(2), extra: "x" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run({ totalDelta: "", rooms: rooms(2) }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  const withAccessor = { totalDelta: "", rooms: rooms(2) };
  Object.defineProperty(withAccessor, "totalBill", {
    enumerable: true,
    get() {
      throw new Error("nope");
    },
  });
  assert.deepEqual(run(withAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(run({ totalBill: 5, totalDelta: "", rooms: rooms(2) }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(
    run({
      totalBill: "1",
      totalDelta: "",
      rooms: [{ name: "A", start: "0" }, { name: "B", start: "0", end: "1" }],
    }),
    { ok: false, error: { code: "SCHEMA", field: null, row: 1 } },
  );
});

test("first-error order: totalBill beats room errors, name beats start", () => {
  assert.deepEqual(
    run({
      totalBill: "",
      totalDelta: "",
      rooms: [
        { name: "", start: "x", end: "y" },
        { name: "B", start: "0", end: "1" },
      ],
    }),
    { ok: false, error: { code: "EMPTY", field: "totalBill", row: null } },
  );
  assert.deepEqual(
    run({
      totalBill: "100",
      totalDelta: "",
      rooms: [
        { name: "A!", start: "x", end: "1" },
        { name: "B", start: "0", end: "1" },
      ],
    }),
    { ok: false, error: { code: "NAME_CHARS", field: "name", row: 1 } },
  );
});

test("a hostile name is inert data, echoed only as a normalized string", () => {
  const got = run({
    totalBill: "100",
    totalDelta: "",
    rooms: [
      { name: "<script>", start: "0", end: "10" },
      { name: "B", start: "0", end: "10" },
    ],
  });
  assert.deepEqual(got, {
    ok: false,
    error: { code: "NAME_CHARS", field: "name", row: 1 },
  });
});

test("zero bill with usage allocates zero to every room", () => {
  const got = run({ totalBill: "0", totalDelta: "", rooms: rooms(3) });
  assert.equal(got.ok, true);
  assert.deepEqual(
    got.result.rooms.map((room) => room.amountTwd),
    [0, 0, 0],
  );
  assert.equal(got.result.equalSplitFallback, false);
});

test("invariant: amounts always sum exactly to the bill", () => {
  const cases = [
    { totalBill: "1", totalDelta: "", rooms: rooms(10) },
    { totalBill: "7", totalDelta: "35", rooms: rooms(3, { name: "房", start: "0", end: "10" }) },
    {
      totalBill: "99999999",
      totalDelta: "999999.9",
      rooms: [
        { name: "A", start: "0.0", end: "333333.3" },
        { name: "B", start: "0", end: "333333.3" },
        { name: "C", start: "0", end: "333333.3" },
      ],
    },
    {
      totalBill: "101",
      totalDelta: "0",
      rooms: [
        { name: "A", start: "5", end: "5" },
        { name: "B", start: "5", end: "5" },
      ],
    },
  ];
  for (const input of cases) {
    const got = run(input);
    assert.equal(got.ok, true, JSON.stringify(input));
    const sum = got.result.rooms.reduce((total, room) => total + room.amountTwd, 0);
    assert.equal(sum, Number(input.totalBill));
  }
});

test("validateInput agrees with run on the error cases", () => {
  for (const fixture of coreCases) {
    const validated = validateInput(structuredClone(fixture.input));
    assert.equal(validated.ok, fixture.expected.ok, fixture.id);
    if (!fixture.expected.ok) assert.deepEqual(validated.error, fixture.expected.error);
  }
});
