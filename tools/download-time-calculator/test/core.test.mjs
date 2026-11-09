// Core tests: the twelve literal core fixtures from the fixed spec's
// fixtures.json (vendored verbatim at test/fixtures.json from spec
// candidate 9d865432902652718d572d3f162518e640ae6268), deep-compared
// against the product core, plus the SPEC tests-section boundaries:
// legal endpoints and just-outside values, validation order, SCHEMA
// classes, unpaired surrogates, the duration-format switch points at
// exactly 60 and 3600 seconds, a finish clock landing exactly on
// midnight, and exact sizeBytes decimal formatting. Expected values
// are the fixtures' own or hand-derived from the SPEC's stated rules,
// never from the implementation's output.

import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../public/js/core/download.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

const base = {
  sizeValue: "4.7",
  sizeUnit: "GB",
  speedValue: "100",
  speedUnit: "Mbps",
  efficiency: "100",
  startTime: "21:30",
};

function expectError(patch, code, field) {
  const outcome = run({ ...base, ...patch });
  assert.deepEqual(outcome, { ok: false, error: { code, field, row: null } });
}

test("legal maximum size 9999.999 computes exactly", () => {
  const outcome = run({ ...base, sizeValue: "9999.999", startTime: "00:00" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.sizeBytes, "9999999000000");
  assert.equal(outcome.result.durationSeconds, 800000);
  assert.deepEqual(outcome.result.durationParts, { hours: 222, minutes: 13, seconds: 20 });
  assert.equal(outcome.result.durationText, "222:13:20");
  assert.equal(outcome.result.finishDayOffset, 9);
  assert.equal(outcome.result.finishText, "06:13 +9d");
});

test("size 10000 is grammatical but out of range", () => {
  expectError({ sizeValue: "10000" }, "RANGE", "sizeValue");
});

test("raw capacity is checked before grammar", () => {
  expectError({ sizeValue: "99999.99999" }, "INPUT_LIMIT", "sizeValue");
  expectError({ efficiency: "1000" }, "INPUT_LIMIT", "efficiency");
  expectError({ startTime: "123:45" }, "INPUT_LIMIT", "startTime");
});

test("speed endpoints: 0.01 legal, 0.009 grammatical but below range, 0 out of range", () => {
  const outcome = run({ ...base, sizeValue: "1", sizeUnit: "B", speedValue: "0.01", startTime: "00:00" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.durationSeconds, 0);
  // SPEC errata candidate (see VERIFICATION.md): the tests-section
  // prose calls 0.009 "outside the grammar", but the normative
  // grammar (same regex as sizeValue, at most 3 decimals) accepts it
  // and the pinned validation order then yields RANGE. The RULE wins.
  expectError({ speedValue: "0.009" }, "RANGE", "speedValue");
  expectError({ speedValue: "0.0009" }, "DECIMAL_FORMAT", "speedValue");
  expectError({ speedValue: "0" }, "RANGE", "speedValue");
});

test("efficiency endpoints and grammar", () => {
  assert.equal(run({ ...base, efficiency: "1" }).ok, true);
  assert.equal(run({ ...base, efficiency: "100" }).ok, true);
  expectError({ efficiency: "101" }, "RANGE", "efficiency");
  expectError({ efficiency: "9.5" }, "INTEGER_FORMAT", "efficiency");
  expectError({ efficiency: "" }, "EMPTY", "efficiency");
});

test("start time endpoints and grammar", () => {
  assert.equal(run({ ...base, startTime: "23:59" }).ok, true);
  expectError({ startTime: "24:00" }, "RANGE", "startTime");
  expectError({ startTime: "12:60" }, "RANGE", "startTime");
  expectError({ startTime: "7:30" }, "TIME_FORMAT", "startTime");
  // The core only ever receives a concrete HH:MM; a blank draft value
  // reaching the core is EMPTY (the controller resolves blanks first).
  expectError({ startTime: "" }, "EMPTY", "startTime");
});

test("empty and enum and decimal grammar per field", () => {
  expectError({ sizeValue: "" }, "EMPTY", "sizeValue");
  expectError({ sizeUnit: "" }, "EMPTY", "sizeUnit");
  expectError({ sizeUnit: "gb" }, "ENUM", "sizeUnit");
  expectError({ speedUnit: "Gbps" }, "ENUM", "speedUnit");
  expectError({ sizeValue: "4.7 " }, "DECIMAL_FORMAT", "sizeValue");
  expectError({ sizeValue: "４.７" }, "DECIMAL_FORMAT", "sizeValue");
  expectError({ sizeValue: ".5" }, "DECIMAL_FORMAT", "sizeValue");
  expectError({ sizeValue: "04.7" }, "DECIMAL_FORMAT", "sizeValue");
});

test("the first field in the fixed order reports the first error", () => {
  expectError({ sizeValue: "1.2345", efficiency: "0" }, "DECIMAL_FORMAT", "sizeValue");
  expectError({ sizeUnit: "PB", speedValue: "0" }, "ENUM", "sizeUnit");
  expectError({ speedValue: "0", efficiency: "0" }, "RANGE", "speedValue");
});

test("unpaired surrogates are UNICODE, before grammar", () => {
  expectError({ sizeValue: "1\uD800" }, "UNICODE", "sizeValue");
  expectError({ startTime: "21:3\uDC00" }, "UNICODE", "startTime");
});

test("SCHEMA: extra, missing, wrong type, null, array, accessor", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run({ ...base, extra: "x" }), schema);
  const missing = { ...base };
  delete missing.efficiency;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...base, sizeValue: 4.7 }), schema);
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run(["4.7"]), schema);
  assert.deepEqual(run("4.7"), schema);
  let getterCalled = false;
  const hostile = { ...base };
  Object.defineProperty(hostile, "sizeValue", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "4.7";
    },
  });
  assert.deepEqual(run(hostile), schema);
  assert.equal(getterCalled, false);
});

test("duration text switches format at exactly 60 and exactly 3600 seconds", () => {
  const at60 = run({
    sizeValue: "7.5",
    sizeUnit: "MB",
    speedValue: "1",
    speedUnit: "Mbps",
    efficiency: "100",
    startTime: "00:00",
  });
  assert.equal(at60.result.durationSeconds, 60);
  assert.equal(at60.result.durationText, "1:00");
  assert.deepEqual(at60.result.durationParts, { hours: 0, minutes: 1, seconds: 0 });
  const at3600 = run({
    sizeValue: "450",
    sizeUnit: "MB",
    speedValue: "1",
    speedUnit: "Mbps",
    efficiency: "100",
    startTime: "00:00",
  });
  assert.equal(at3600.result.durationSeconds, 3600);
  assert.equal(at3600.result.durationText, "1:00:00");
  assert.deepEqual(at3600.result.durationParts, { hours: 1, minutes: 0, seconds: 0 });
});

test("a finish landing exactly on midnight increments the day offset", () => {
  const outcome = run({
    sizeValue: "7.5",
    sizeUnit: "MB",
    speedValue: "1",
    speedUnit: "Mbps",
    efficiency: "100",
    startTime: "23:59",
  });
  assert.equal(outcome.result.finishTime, "00:00");
  assert.equal(outcome.result.finishDayOffset, 1);
  assert.equal(outcome.result.finishText, "00:00 +1d");
});

test("sizeBytes is an exact decimal string with trimmed fraction zeros", () => {
  const milli = run({ ...base, sizeValue: "0.001", sizeUnit: "B", speedValue: "1000", startTime: "00:00" });
  assert.equal(milli.result.sizeBytes, "0.001");
  const whole = run({ ...base, sizeValue: "1.5", sizeUnit: "KB", startTime: "00:00" });
  assert.equal(whole.result.sizeBytes, "1500");
  const frac = run({ ...base, sizeValue: "1.234", sizeUnit: "KB", startTime: "00:00" });
  assert.equal(frac.result.sizeBytes, "1234");
  const fracKept = run({ ...base, sizeValue: "1.001", sizeUnit: "KB", startTime: "00:00" });
  assert.equal(fracKept.result.sizeBytes, "1001");
  const tenth = run({ ...base, sizeValue: "0.1", sizeUnit: "B", speedValue: "1000", startTime: "00:00" });
  assert.equal(tenth.result.sizeBytes, "0.1");
});

test("result objects carry exactly the seven pinned keys", () => {
  const outcome = run(base);
  assert.deepEqual(Object.keys(outcome.result).sort(), [
    "durationParts",
    "durationSeconds",
    "durationText",
    "finishDayOffset",
    "finishText",
    "finishTime",
    "sizeBytes",
  ]);
});
