// Core tests for the Mahjong Score Calculator. The 10 literal core
// fixtures from the SPEC (vendored verbatim in test/fixtures.json,
// spec candidate 1afe86cfee8dc968298e8ec767b56fb4cd15f738) are
// deep-compared against the product `run`. All other expectations
// below are hand-derived from the SPEC's stated rules (tai table,
// validation order, conflicts C1–C7, interactions E1–E8, line order,
// dealer rule, cap, payout), never from implementation output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULTS,
  EXAMPLE,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
  serializeReport,
} from "../public/js/core/mahjong.mjs";

const fixtures = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}: ${entry.purpose}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

function baseInput(patch = {}) {
  return {
    winMethod: "discard",
    winnerIsDealer: false,
    discarderIsDealer: false,
    dealerStreak: "0",
    base: "100",
    perTai: "50",
    cap: "none",
    selected: {},
    honorFlowers: "0",
    offFlowers: "0",
    kongCount: "0",
    overrides: {},
    ...patch,
  };
}

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

test("EXAMPLE is fixtures case 1 input; DEFAULTS match the SPEC reset object", () => {
  assert.deepEqual(EXAMPLE, coreCases[0].input);
  assert.deepEqual(DEFAULTS, {
    winMethod: "discard",
    winnerIsDealer: false,
    discarderIsDealer: false,
    dealerStreak: "0",
    base: "100",
    perTai: "50",
    cap: "none",
    selected: {},
    honorFlowers: "0",
    offFlowers: "0",
    kongCount: "0",
    overrides: {},
  });
});

test("zero scoring items still pays out the base only", () => {
  const outcome = run(baseInput());
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.lines, []);
  assert.equal(outcome.result.handTai, 0);
  assert.equal(outcome.result.totalTai, 0);
  assert.deepEqual(outcome.result.payout, {
    winMethod: "discard",
    unitAmount: 100,
    fromDiscarder: 100,
    totalReceived: 100,
  });
});

test("base and perTai of 0 make the unit 0", () => {
  const outcome = run(baseInput({ base: "0", perTai: "0", selected: { ALL_PUNGS: true } }));
  assert.equal(outcome.result.payout.unitAmount, 0);
  assert.equal(outcome.result.payout.totalReceived, 0);
});

test("cap equal to totalTai is not capped", () => {
  const outcome = run(baseInput({ cap: "8", selected: { BIG_DRAGONS: true } }));
  assert.equal(outcome.result.totalTai, 8);
  assert.equal(outcome.result.paidTai, 8);
  assert.equal(outcome.result.capped, false);
});

test("E1: All Honors supersedes both flushes and subsumes All Pungs", () => {
  const outcome = run(
    baseInput({ selected: { ALL_HONORS: true, FULL_FLUSH: true, HALF_FLUSH: true, ALL_PUNGS: true } }),
  );
  assert.deepEqual(outcome.result.excluded, [
    { code: "HALF_FLUSH", reason: "SUPERSEDED" },
    { code: "FULL_FLUSH", reason: "SUPERSEDED" },
    { code: "ALL_PUNGS", reason: "SUBSUMED" },
  ]);
  assert.deepEqual(outcome.result.lines, [{ code: "ALL_HONORS", tai: 16 }]);
  assert.equal(outcome.result.payout.unitAmount, 900);
});

test("E5: All Eight Flowers subsumes per-flower tai and the flower set, supersedes Seven Rob One", () => {
  const outcome = run(
    baseInput({
      honorFlowers: "3",
      selected: { ALL_FLOWERS: true, SEVEN_ROB_ONE: true, FLOWER_KONG: true },
    }),
  );
  assert.deepEqual(outcome.result.excluded, [
    { code: "HONOR_FLOWERS", reason: "FLOWERS_SUBSUMED" },
    { code: "FLOWER_KONG", reason: "SUBSUMED" },
    { code: "SEVEN_ROB_ONE", reason: "SUPERSEDED" },
  ]);
  assert.deepEqual(outcome.result.lines, [{ code: "ALL_FLOWERS", tai: 8 }]);
  assert.deepEqual(outcome.result.flowers, { honor: 3, off: 0 });
});

test("E7: Seven Rob One on a self-draw win is a method mismatch; self draw still counts", () => {
  const outcome = run(baseInput({ winMethod: "self-draw", selected: { SEVEN_ROB_ONE: true } }));
  assert.deepEqual(outcome.result.excluded, [{ code: "SEVEN_ROB_ONE", reason: "METHOD_MISMATCH" }]);
  assert.deepEqual(outcome.result.lines, [{ code: "SELF_DRAW", tai: 1 }]);
  assert.equal(outcome.result.payout.totalReceived, 450);
});

test("double wind: seat and round wind pungs coexist as two lines", () => {
  const outcome = run(baseInput({ selected: { SEAT_WIND_PONG: true, ROUND_WIND_PONG: true } }));
  assert.deepEqual(outcome.result.lines, [
    { code: "SEAT_WIND_PONG", tai: 1 },
    { code: "ROUND_WIND_PONG", tai: 1 },
  ]);
  assert.equal(outcome.result.handTai, 2);
});

test("four kongs derives the Four Kongs line; kongCount echoes in the result", () => {
  const outcome = run(baseInput({ kongCount: "4" }));
  assert.deepEqual(outcome.result.lines, [{ code: "FOUR_KONGS", tai: 5 }]);
  assert.equal(outcome.result.kongs, 4);
});

test("dealer tai: winner dealer with a streak of 3 counts 4 on a self draw", () => {
  const outcome = run(baseInput({ winMethod: "self-draw", winnerIsDealer: true, dealerStreak: "3" }));
  assert.deepEqual(outcome.result.lines, [
    { code: "SELF_DRAW", tai: 1 },
    { code: "DEALER", tai: 4 },
  ]);
  assert.equal(outcome.result.handTai, 1);
  assert.equal(outcome.result.dealerTai, 4);
  assert.equal(outcome.result.payout.unitAmount, 350);
  assert.equal(outcome.result.payout.totalReceived, 1050);
});

test("discarderIsDealer is fully ignored on a self-draw win", () => {
  const outcome = run(baseInput({ winMethod: "self-draw", discarderIsDealer: true, dealerStreak: "2" }));
  assert.deepEqual(outcome.result.lines, [{ code: "SELF_DRAW", tai: 1 }]);
  assert.equal(outcome.result.dealerTai, 0);
});

test("overrides recompute: PING_HU set to 0 drops the line; per-flower override scales honor flowers", () => {
  const zeroed = run(baseInput({ selected: { PING_HU: true }, overrides: { PING_HU: "0" } }));
  assert.deepEqual(zeroed.result.lines, []);
  assert.equal(zeroed.result.handTai, 0);
  const scaled = run(baseInput({ honorFlowers: "3", overrides: { HONOR_FLOWER_EACH: "2" } }));
  assert.deepEqual(scaled.result.lines, [{ code: "HONOR_FLOWERS", count: 3, tai: 6 }]);
});

test("legal maxima together: base 100000, perTai 10000, streak 8, 8 honor flowers, 4 kongs", () => {
  const outcome = run(
    baseInput({
      base: "100000",
      perTai: "10000",
      dealerStreak: "8",
      honorFlowers: "8",
      kongCount: "4",
      winnerIsDealer: true,
    }),
  );
  assert.deepEqual(outcome.result.lines, [
    { code: "HONOR_FLOWERS", count: 8, tai: 8 },
    { code: "FOUR_KONGS", tai: 5 },
    { code: "DEALER", tai: 9 },
  ]);
  assert.equal(outcome.result.handTai, 13);
  assert.equal(outcome.result.totalTai, 22);
  assert.equal(outcome.result.payout.unitAmount, 320000);
});

test("conflict priority: C1 beats C2; C2 beats C3; first C4 code wins; C6 beats C7", () => {
  expectError(
    baseInput({ selected: { MENQING: true, ALL_FROM_ONE: true, PING_HU: true, ALL_PUNGS: true } }),
    "CONFLICT",
    "ALL_FROM_ONE",
  );
  expectError(
    baseInput({ selected: { PING_HU: true, ALL_PUNGS: true }, honorFlowers: "1" }),
    "CONFLICT",
    "ALL_PUNGS",
  );
  expectError(baseInput({ selected: { PING_HU: true }, honorFlowers: "1" }), "CONFLICT", "PING_HU");
  expectError(
    baseInput({ selected: { PING_HU: true, DRAGON_GREEN: true, SEAT_WIND_PONG: true } }),
    "CONFLICT",
    "SEAT_WIND_PONG",
  );
  expectError(baseInput({ selected: { PING_HU: true }, kongCount: "2" }), "CONFLICT", "kongCount");
  expectError(
    baseInput({
      selected: { FIVE_SUITED: true, FULL_FLUSH: true, HEAVENLY_LISTEN: true, EARTHLY_LISTEN: true },
    }),
    "CONFLICT",
    "FIVE_SUITED",
  );
  expectError(
    baseInput({ selected: { HEAVENLY_LISTEN: true, EARTHLY_LISTEN: true } }),
    "CONFLICT",
    "EARTHLY_LISTEN",
  );
});

test("capacity: 9-character strings fail INPUT_LIMIT before any other stage", () => {
  expectError(baseInput({ base: "123456789" }), "INPUT_LIMIT", "base");
  expectError(baseInput({ overrides: { PING_HU: "123456789" } }), "INPUT_LIMIT", "overrides/PING_HU");
  // Capacity is reported even when a later stage would also fail.
  expectError(baseInput({ base: "123456789", winMethod: "bogus" }), "INPUT_LIMIT", "base");
});

test("schema: shape, unknown keys, wrong types, unknown codes, accessors", () => {
  expectError(null, "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError(baseInput({ extra: "1" }), "SCHEMA", "extra");
  const missing = baseInput();
  delete missing.base;
  expectError(missing, "SCHEMA", "base");
  expectError(baseInput({ winnerIsDealer: "true" }), "SCHEMA", "winnerIsDealer");
  expectError(baseInput({ base: 100 }), "SCHEMA", "base");
  expectError(baseInput({ selected: { NOPE: true } }), "SCHEMA", "selected/NOPE");
  expectError(baseInput({ selected: { MENQING: "yes" } }), "SCHEMA", "selected/MENQING");
  expectError(baseInput({ selected: [] }), "SCHEMA", "selected");
  expectError(baseInput({ overrides: { MENQING: "2" } }), "SCHEMA", "overrides/MENQING");
  expectError(baseInput({ overrides: { PING_HU: 2 } }), "SCHEMA", "overrides/PING_HU");
  const accessorInput = baseInput();
  Object.defineProperty(accessorInput, "base", {
    enumerable: true,
    get() {
      return "100";
    },
  });
  expectError(accessorInput, "SCHEMA", "base");
});

test("enum, empty, grammar, and range failures in field order", () => {
  expectError(baseInput({ winMethod: "draw" }), "ENUM", "winMethod");
  expectError(baseInput({ cap: "10" }), "ENUM", "cap");
  expectError(baseInput({ base: "" }), "EMPTY", "base");
  expectError(baseInput({ perTai: "12.5" }), "INTEGER_FORMAT", "perTai");
  expectError(baseInput({ perTai: "１２" }), "INTEGER_FORMAT", "perTai");
  expectError(baseInput({ dealerStreak: "01" }), "INTEGER_FORMAT", "dealerStreak");
  expectError(baseInput({ base: "100001" }), "RANGE", "base");
  expectError(baseInput({ dealerStreak: "9" }), "RANGE", "dealerStreak");
  expectError(baseInput({ kongCount: "5" }), "RANGE", "kongCount");
  expectError(baseInput({ overrides: { PING_HU: "100" } }), "RANGE", "overrides/PING_HU");
  // winMethod ENUM precedes numeric failures.
  expectError(baseInput({ winMethod: "draw", base: "" }), "ENUM", "winMethod");
});

test("report: canonical bytes for the menqing-self-draw result, pinned as a literal", () => {
  const { result } = run(coreCases[0].input);
  const expectedText =
    '{"capped":false,"dealerTai":0,"excluded":[],"flowers":{"honor":0,"off":0},"handTai":3,"kongs":0,' +
    '"lines":[{"code":"MENQING_SELF_DRAW","tai":3}],"paidTai":3,' +
    '"payout":{"fromEachOpponent":250,"totalReceived":750,"unitAmount":250,"winMethod":"self-draw"},"totalTai":3}\n';
  assert.equal(serializeReport(result), expectedText);
  const report = buildReport(result);
  assert.equal(report.ok, true);
  assert.equal(report.text, expectedText);
  assert.equal(
    createHash("sha256").update(report.bytes).digest("hex"),
    createHash("sha256").update(expectedText, "utf8").digest("hex"),
  );
  assert.ok(report.bytes.length <= REPORT_LIMIT_BYTES);
});
