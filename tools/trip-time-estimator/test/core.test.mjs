// Core tests: the eleven literal core cases vendored verbatim in
// test/fixtures.json (fixed spec candidate
// 8d2f3ec18de2885916da813361e4d19a68eac3da) are deep-compared against
// the core's run, plus boundary, grammar, schema, ordering, and
// property checks whose expectations are derived from the SPEC's
// stated rules (and cross-checked against an independent scratch
// implementation of the absolute-minutes model before this code
// existed) — never from the implementation's own output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  EXAMPLE,
  REPORT_FILENAME,
  civilFromDays,
  daysFromCivil,
  run,
  serializeReport,
} from "../public/js/core/trip.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

function base(overrides = {}) {
  return { ...EXAMPLE, ...overrides };
}

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test("legal endpoints succeed", () => {
  // Duration endpoints 0:01 and 48:00.
  assert.equal(run(base({ duration: "0:01" })).ok, true);
  assert.equal(run(base({ duration: "48:00" })).result.durationMinutes, 2880);
  // Date endpoints and a leap day.
  assert.equal(run(base({ departureDate: "2000-01-01" })).ok, true);
  assert.equal(run(base({ departureDate: "2099-12-31" })).ok, true);
  assert.equal(run(base({ departureDate: "2028-02-29" })).ok, true);
  // Offset endpoints -12:00 and +14:00 (also exercised by fixtures).
  assert.equal(run(base({ departureOffset: "-12:00", arrivalOffset: "+14:00" })).ok, true);
  // Quarter-hour offsets inside the range.
  assert.equal(run(base({ departureOffset: "+05:45", arrivalOffset: "-03:30" })).ok, true);
});

test("just-outside values fail with the pinned codes", () => {
  expectError(base({ duration: "48:01" }), "RANGE", "duration");
  expectError(base({ duration: "0:00" }), "RANGE", "duration");
  expectError(base({ departureDate: "1999-12-31" }), "RANGE", "departureDate");
  expectError(base({ departureDate: "2100-01-01" }), "RANGE", "departureDate");
  expectError(base({ departureTime: "24:00" }), "RANGE", "departureTime");
  expectError(base({ departureTime: "12:60" }), "RANGE", "departureTime");
  expectError(base({ departureOffset: "+14:15" }), "RANGE", "departureOffset");
  expectError(base({ arrivalOffset: "-12:15" }), "RANGE", "arrivalOffset");
});

test("grammar failures carry their own codes", () => {
  expectError(base({ departureDate: "2026/04/08" }), "DATE_FORMAT", "departureDate");
  expectError(base({ departureDate: "2026-4-8" }), "DATE_FORMAT", "departureDate");
  expectError(base({ departureDate: "2026-04-31" }), "DATE_INVALID", "departureDate");
  expectError(base({ departureDate: "2026-13-01" }), "DATE_INVALID", "departureDate");
  expectError(base({ departureDate: "2027-02-29" }), "DATE_INVALID", "departureDate");
  expectError(base({ departureTime: "8:00" }), "TIME_FORMAT", "departureTime");
  expectError(base({ departureOffset: "-00:00" }), "OFFSET_FORMAT", "departureOffset");
  expectError(base({ departureOffset: "+8:00" }), "OFFSET_FORMAT", "departureOffset");
  expectError(base({ arrivalOffset: "+09:20" }), "OFFSET_FORMAT", "arrivalOffset");
  expectError(base({ duration: "03:05" }), "DURATION_FORMAT", "duration");
  expectError(base({ duration: "3:5" }), "DURATION_FORMAT", "duration");
  expectError(base({ duration: "3:60" }), "DURATION_FORMAT", "duration");
  expectError(base({ duration: "-1:00" }), "DURATION_FORMAT", "duration");
});

test("emptiness, enum, capacity, and surrogate checks", () => {
  expectError(base({ mode: "" }), "EMPTY", "mode");
  expectError(base({ mode: "x" }), "ENUM", "mode");
  expectError(base({ departureDate: "" }), "EMPTY", "departureDate");
  expectError(base({ duration: "" }), "EMPTY", "duration");
  expectError(base({ mode: "a".repeat(17) }), "INPUT_LIMIT", "mode");
  expectError(base({ departureDate: "2026-04-08-toolong" }), "INPUT_LIMIT", "departureDate");
  expectError(base({ duration: "123456:00" }), "INPUT_LIMIT", "duration");
  expectError(base({ departureDate: "\uD800" }), "UNICODE", "departureDate");
  expectError(base({ duration: "3:0\uDC00" }), "UNICODE", "duration");
});

test("mode exclusivity is a shape rule decided before field validation", () => {
  expectError(base({ arrivalTime: "12:05" }), "SCHEMA", null);
  expectError(base({ arrivalNextDay: "false" }), "SCHEMA", null);
  // Even a malformed other-mode field is SCHEMA, not a grammar error.
  expectError(base({ arrivalTime: "not-a-time" }), "SCHEMA", null);
  expectError(
    base({ mode: "arrival", duration: "3:05", arrivalTime: "12:05", arrivalNextDay: "false" }),
    "SCHEMA",
    null,
  );
  // The mode itself is judged first: an unknown mode is ENUM even when
  // an arrival field is also filled.
  expectError(base({ mode: "sideways", arrivalTime: "12:05" }), "ENUM", "mode");
});

test("first error wins in the SPEC's field order", () => {
  // An empty departure date beats a malformed duration.
  expectError(base({ departureDate: "", duration: "abc" }), "EMPTY", "departureDate");
  // A bad departure offset beats a malformed duration.
  expectError(base({ departureOffset: "+08:10", duration: "abc" }), "OFFSET_FORMAT", "departureOffset");
  // Capacity is checked before grammar within a field.
  expectError(base({ duration: "123456:00" }), "INPUT_LIMIT", "duration");
  // In mode B, arrivalTime is judged before arrivalNextDay.
  expectError(
    base({ mode: "arrival", duration: "", arrivalTime: "25:00", arrivalNextDay: "yes" }),
    "RANGE",
    "arrivalTime",
  );
  expectError(
    base({ mode: "arrival", duration: "", arrivalTime: "12:05", arrivalNextDay: "" }),
    "EMPTY",
    "arrivalNextDay",
  );
  expectError(
    base({ mode: "arrival", duration: "", arrivalTime: "12:05", arrivalNextDay: "yes" }),
    "ENUM",
    "arrivalNextDay",
  );
});

test("mode B duration boundaries: zero, one minute, exactly 2880, 2881", () => {
  const modeB = {
    mode: "arrival",
    departureDate: "2026-09-03",
    departureTime: "21:30",
    departureOffset: "+08:00",
    arrivalOffset: "+09:00",
    duration: "",
    arrivalTime: "22:30",
    arrivalNextDay: "false",
  };
  // Exactly zero is not positive.
  expectError(modeB, "DURATION_NOT_POSITIVE", "arrivalTime");
  // One minute is the smallest legal mode-B duration.
  const one = run({ ...modeB, arrivalTime: "22:31" });
  assert.equal(one.ok, true);
  assert.equal(one.result.durationMinutes, 1);
  assert.equal(one.result.duration, "0:01");
  assert.deepEqual(one.result.arrivalLocal, {
    date: "2026-09-03",
    time: "22:31",
    offset: "+09:00",
    dayShift: 0,
  });
  // Exactly 2880 minutes is legal in mode B.
  const max = run({
    mode: "arrival",
    departureDate: "2026-09-03",
    departureTime: "00:00",
    departureOffset: "+14:00",
    arrivalOffset: "-12:00",
    duration: "",
    arrivalTime: "22:00",
    arrivalNextDay: "false",
  });
  assert.equal(max.ok, true);
  assert.equal(max.result.durationMinutes, 2880);
  assert.equal(max.result.duration, "48:00");
  // 2881 derived minutes is RANGE on arrivalTime.
  expectError(
    {
      mode: "arrival",
      departureDate: "2026-09-03",
      departureTime: "00:00",
      departureOffset: "+14:00",
      arrivalOffset: "-12:00",
      duration: "",
      arrivalTime: "22:01",
      arrivalNextDay: "false",
    },
    "RANGE",
    "arrivalTime",
  );
});

test("day-shift extremes -2 and +4 (hand-derived, scratch cross-checked)", () => {
  const minus2 = run({
    mode: "duration",
    departureDate: "2026-03-10",
    departureTime: "00:00",
    departureOffset: "+14:00",
    arrivalOffset: "-12:00",
    duration: "1:00",
    arrivalTime: "",
    arrivalNextDay: "",
  });
  assert.deepEqual(minus2, {
    ok: true,
    result: {
      mode: "duration",
      durationMinutes: 60,
      duration: "1:00",
      departureLocal: { date: "2026-03-10", time: "00:00", offset: "+14:00" },
      departureInArrivalZone: { date: "2026-03-08", time: "22:00", offset: "-12:00", dayShift: -2 },
      arrivalLocal: { date: "2026-03-08", time: "23:00", offset: "-12:00", dayShift: -2 },
      arrivalInDepartureZone: { date: "2026-03-10", time: "01:00", offset: "+14:00", dayShift: 0 },
    },
  });
  const plus4 = run({
    mode: "duration",
    departureDate: "2026-03-10",
    departureTime: "23:59",
    departureOffset: "-12:00",
    arrivalOffset: "+14:00",
    duration: "48:00",
    arrivalTime: "",
    arrivalNextDay: "",
  });
  assert.deepEqual(plus4, {
    ok: true,
    result: {
      mode: "duration",
      durationMinutes: 2880,
      duration: "48:00",
      departureLocal: { date: "2026-03-10", time: "23:59", offset: "-12:00" },
      departureInArrivalZone: { date: "2026-03-12", time: "01:59", offset: "+14:00", dayShift: 2 },
      arrivalLocal: { date: "2026-03-14", time: "01:59", offset: "+14:00", dayShift: 4 },
      arrivalInDepartureZone: { date: "2026-03-12", time: "23:59", offset: "-12:00", dayShift: 2 },
    },
  });
});

test("civil conversions are exact inverses over 1999-12-01..2101-02-01", () => {
  const start = daysFromCivil(1999, 12, 1);
  const end = daysFromCivil(2101, 2, 1);
  for (let day = start; day <= end; day += 1) {
    const { year, month, day: dom } = civilFromDays(day);
    assert.equal(daysFromCivil(year, month, dom), day);
  }
  assert.deepEqual(civilFromDays(daysFromCivil(1970, 1, 1)), { year: 1970, month: 1, day: 1 });
  assert.equal(daysFromCivil(1970, 1, 1), 0);
});

test("schema violations: shape, types, unknown and missing keys, accessors", () => {
  expectError(null, "SCHEMA", null);
  expectError("duration", "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError({ ...EXAMPLE, extra: "" }, "SCHEMA", null);
  const missing = { ...EXAMPLE };
  delete missing.duration;
  expectError(missing, "SCHEMA", null);
  expectError({ ...EXAMPLE, duration: 185 }, "SCHEMA", null);
  let invoked = false;
  const hostile = { ...EXAMPLE };
  Object.defineProperty(hostile, "duration", {
    enumerable: true,
    get() {
      invoked = true;
      return "3:05";
    },
  });
  expectError(hostile, "SCHEMA", null);
  assert.equal(invoked, false, "accessors must never be invoked");
});

test("property: successful readings are clock times with consistent day shifts", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { result } = run(fixture.input);
    const departureDay = daysFromCivil(
      Number(fixture.input.departureDate.slice(0, 4)),
      Number(fixture.input.departureDate.slice(5, 7)),
      Number(fixture.input.departureDate.slice(8, 10)),
    );
    for (const key of ["departureInArrivalZone", "arrivalLocal", "arrivalInDepartureZone"]) {
      const reading = result[key];
      assert.match(reading.time, /^([01]\d|2[0-3]):[0-5]\d$/, `${fixture.id}/${key} time`);
      const readingDay = daysFromCivil(
        Number(reading.date.slice(0, 4)),
        Number(reading.date.slice(5, 7)),
        Number(reading.date.slice(8, 10)),
      );
      assert.equal(reading.dayShift, readingDay - departureDay, `${fixture.id}/${key} dayShift`);
    }
  }
});

test("report filename is the SPEC-fixed name", () => {
  assert.equal(REPORT_FILENAME, "trip-time-report.json");
});

test("report bytes for the worked example are the pinned canonical serialization", () => {
  const { result } = run(EXAMPLE);
  const expected =
    '{"arrivalInDepartureZone":{"date":"2026-04-08","dayShift":0,"offset":"+08:00","time":"11:05"},' +
    '"arrivalLocal":{"date":"2026-04-08","dayShift":0,"offset":"+09:00","time":"12:05"},' +
    '"departureInArrivalZone":{"date":"2026-04-08","dayShift":0,"offset":"+09:00","time":"09:00"},' +
    '"departureLocal":{"date":"2026-04-08","offset":"+08:00","time":"08:00"},' +
    '"duration":"3:05","durationMinutes":185,"mode":"duration"}\n';
  const serialized = serializeReport(result);
  assert.equal(serialized, expected);
  assert.equal(
    createHash("sha256").update(serialized, "utf8").digest("hex"),
    "f86e9b426fd0245a585acde3164f03cb81b8664cbb9dbb8c4f5a00dc913e36ff",
  );
});

test("report serialization never invokes an input toJSON", () => {
  let invoked = false;
  const { result } = run(EXAMPLE);
  const hostile = { ...result };
  Object.defineProperty(hostile, "toJSON", {
    enumerable: false,
    value() {
      invoked = true;
      return {};
    },
  });
  const serialized = serializeReport(hostile);
  assert.equal(invoked, false);
  assert.equal(serialized, serializeReport(result));
  assert.ok(serialized.includes('"duration":"3:05"'));
});
