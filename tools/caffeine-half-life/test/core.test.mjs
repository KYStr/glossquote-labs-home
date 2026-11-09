// Core tests: the 9 literal core fixtures vendored verbatim from the
// fixed spec candidate (spec-caffeine-half-life-20261109, candidate
// commit 73e25fc7bcc49e56f8d07bd7280b8aab987539fb, spec PR #153) are
// deep-compared, plus hand-derived boundary and validation-order cases
// taken from the SPEC text. Expected values are never produced by the
// implementation under test.

import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../public/js/core/caffeine.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

test("fixtures: identity of the vendored spec candidate", () => {
  assert.equal(fixtures.specId, "spec-caffeine-half-life-20261109");
  assert.equal(fixtures.slug, "caffeine-half-life");
  assert.equal(coreCases.length, 9);
});

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

function baseInput() {
  return {
    entries: [{ time: "08:00", preset: null, mg: "100" }],
    halfLifeHours: "5",
    queryTime: "13:00",
    bedtime: "",
  };
}

function expectError(input, code, field, row) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row } });
}

test("boundary: half-life 3.0 and 8.0 accepted, 2.9 and 8.1 rejected as RANGE", () => {
  const low = baseInput();
  low.halfLifeHours = "3";
  assert.equal(run(low).ok, true);
  assert.equal(run(low).result.halfLifeMin, 180);
  const high = baseInput();
  high.halfLifeHours = "8.0";
  assert.equal(run(high).ok, true);
  assert.equal(run(high).result.halfLifeMin, 480);
  const below = baseInput();
  below.halfLifeHours = "2.9";
  expectError(below, "RANGE", "halfLifeHours", null);
  const above = baseInput();
  above.halfLifeHours = "8.1";
  expectError(above, "RANGE", "halfLifeHours", null);
});

test("boundary: half-life grammar — two decimals and plain text are DECIMAL_FORMAT", () => {
  const twoDecimals = baseInput();
  twoDecimals.halfLifeHours = "5.55";
  expectError(twoDecimals, "DECIMAL_FORMAT", "halfLifeHours", null);
  const text = baseInput();
  text.halfLifeHours = "five";
  expectError(text, "DECIMAL_FORMAT", "halfLifeHours", null);
  const empty = baseInput();
  empty.halfLifeHours = "";
  expectError(empty, "EMPTY", "halfLifeHours", null);
  const fractional = baseInput();
  fractional.halfLifeHours = "5.5";
  assert.equal(run(fractional).result.halfLifeMin, 330);
});

test("boundary: mg 1 and 1000 accepted, 0 and 1001 rejected as RANGE", () => {
  const one = baseInput();
  one.entries[0].mg = "1";
  assert.equal(run(one).result.query.perEntry[0].mg, 1);
  const max = baseInput();
  max.entries[0].mg = "1000";
  assert.equal(run(max).result.query.perEntry[0].mg, 1000);
  const zero = baseInput();
  zero.entries[0].mg = "0";
  expectError(zero, "RANGE", "entries", 1);
  const over = baseInput();
  over.entries[0].mg = "1001";
  expectError(over, "RANGE", "entries", 1);
});

test("boundary: mg grammar — leading zeros, decimals, signs are INTEGER_FORMAT", () => {
  for (const bad of ["007", "10.5", "+10", " 10", "1e2"]) {
    const input = baseInput();
    input.entries[0].mg = bad;
    expectError(input, "INTEGER_FORMAT", "entries", 1);
  }
  const emptyMg = baseInput();
  emptyMg.entries[0].mg = "";
  expectError(emptyMg, "EMPTY", "entries", 1);
  const nullMg = baseInput();
  nullMg.entries[0].mg = null;
  expectError(nullMg, "EMPTY", "entries", 1);
});

test("boundary: 8 entries accepted, 0 entries is EMPTY on entries", () => {
  const eight = baseInput();
  eight.entries = Array.from({ length: 8 }, () => ({ time: "08:00", preset: "cola", mg: null }));
  assert.equal(run(eight).ok, true);
  const none = baseInput();
  none.entries = [];
  expectError(none, "EMPTY", "entries", null);
});

test("boundary: elapsed exactly 0 counts the full amount", () => {
  const input = baseInput();
  input.queryTime = "08:00";
  const outcome = run(input);
  assert.equal(outcome.result.query.perEntry[0].elapsedMin, 0);
  assert.equal(outcome.result.query.perEntry[0].remainingMg, "100.0");
  assert.equal(outcome.result.query.totalMg, "100.0");
});

test("boundary: query time equal to bedtime gives instant = bedtime, 0 minutes away", () => {
  const input = baseInput();
  input.bedtime = "13:00";
  const outcome = run(input);
  assert.equal(outcome.result.atBedtime.instantMin, 780);
  assert.equal(outcome.result.atBedtime.minutesFromQuery, 0);
  assert.equal(outcome.result.atBedtime.afterMidnight, false);
  assert.equal(outcome.result.atBedtime.totalMg, "50.0");
});

test("boundary: series crossing midnight flags nextDay and wraps the clock", () => {
  const input = baseInput();
  input.entries = [{ time: "21:00", preset: "cola", mg: null }];
  input.halfLifeHours = "6";
  input.queryTime = "23:00";
  const outcome = run(input);
  assert.deepEqual(
    outcome.result.series.map((point) => [point.timeMin, point.nextDay]),
    [
      [0, true],
      [60, true],
      [120, true],
      [180, true],
      [240, true],
      [300, true],
    ],
  );
});

test("validation order: entry errors precede half-life errors, which precede query errors", () => {
  const entryFirst = baseInput();
  entryFirst.entries[0].time = "24:00";
  entryFirst.halfLifeHours = "9";
  entryFirst.queryTime = "25:00";
  expectError(entryFirst, "TIME_FORMAT", "entries", 1);
  const halfSecond = baseInput();
  halfSecond.halfLifeHours = "9";
  halfSecond.queryTime = "25:00";
  expectError(halfSecond, "RANGE", "halfLifeHours", null);
  const rowTwo = baseInput();
  rowTwo.entries = [
    { time: "08:00", preset: "cola", mg: null },
    { time: "08:00", preset: "mystery", mg: null },
  ];
  expectError(rowTwo, "PRESET_UNKNOWN", "entries", 2);
});

test("validation: bedtime grammar and clock range", () => {
  const bad = baseInput();
  bad.bedtime = "24:00";
  expectError(bad, "TIME_FORMAT", "bedtime", null);
  const malformed = baseInput();
  malformed.bedtime = "1:00";
  expectError(malformed, "TIME_FORMAT", "bedtime", null);
});

test("schema: unknown, missing, wrong-type, and accessor inputs are SCHEMA", () => {
  expectError(null, "SCHEMA", null, null);
  expectError([], "SCHEMA", null, null);
  expectError("draft", "SCHEMA", null, null);
  const extra = baseInput();
  extra.note = "x";
  expectError(extra, "SCHEMA", "note", null);
  const missing = baseInput();
  delete missing.bedtime;
  expectError(missing, "SCHEMA", "bedtime", null);
  const wrongType = baseInput();
  wrongType.halfLifeHours = 5;
  expectError(wrongType, "SCHEMA", "halfLifeHours", null);
  const entriesNotArray = baseInput();
  entriesNotArray.entries = {};
  expectError(entriesNotArray, "SCHEMA", "entries", null);
  const accessor = baseInput();
  Object.defineProperty(accessor, "queryTime", {
    enumerable: true,
    get() {
      return "13:00";
    },
  });
  expectError(accessor, "SCHEMA", "queryTime", null);
  const entryExtra = baseInput();
  entryExtra.entries = [{ time: "08:00", preset: null, mg: "100", note: 1 }];
  expectError(entryExtra, "SCHEMA", "entries", 1);
  const entryWrongType = baseInput();
  entryWrongType.entries = [{ time: "08:00", preset: null, mg: 100 }];
  expectError(entryWrongType, "SCHEMA", "entries", 1);
});

test("string limits: over 8 code units is INPUT_LIMIT, lone surrogate is UNICODE", () => {
  const longTime = baseInput();
  longTime.queryTime = "013:00:00";
  expectError(longTime, "INPUT_LIMIT", "queryTime", null);
  const longMg = baseInput();
  longMg.entries[0].mg = "123456789";
  expectError(longMg, "INPUT_LIMIT", "entries", 1);
  const surrogate = baseInput();
  surrogate.queryTime = "\uD800";
  expectError(surrogate, "UNICODE", "queryTime", null);
  const surrogateHalf = baseInput();
  surrogateHalf.halfLifeHours = "5\uDC00";
  expectError(surrogateHalf, "UNICODE", "halfLifeHours", null);
});

test("robustness: hostile strings stay inert data and never throw", () => {
  const hostile = baseInput();
  hostile.entries[0].time = "<script>";
  expectError(hostile, "TIME_FORMAT", "entries", 1);
  const prototypeKeys = JSON.parse(
    '{"entries":[{"time":"08:00","preset":null,"mg":"100"}],"halfLifeHours":"5","queryTime":"13:00","bedtime":"","__proto__":{}}',
  );
  expectError(prototypeKeys, "SCHEMA", "__proto__", null);
});
