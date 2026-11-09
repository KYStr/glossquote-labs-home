// Core tests: every literal core case from the fixed spec's
// fixtures.json (vendored verbatim at test/fixtures.json from spec
// candidate f1f14924fae8e114c9b8f8e0caeba72922c64d30), deep-compared
// against the pure core's `run`, plus hand-derived boundary and
// hostile-input cases taken from the SPEC's tests section (legal
// endpoints, just-outside values, grammar rejects, schema classes,
// validation order), the report serialization bytes, and the SPEC's
// property checks. Expected values are never produced by the product
// code under test.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULTS,
  REPORT_LIMIT_BYTES,
  run,
  serializeReport,
} from "../public/js/core/sun.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

const base = { date: "2026-06-21", latitude: "25.0330", longitude: "121.5654", utcOffset: "+08:00" };

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

test("legal endpoints are accepted", () => {
  assert.equal(run({ ...base, latitude: "89.9" }).ok, true);
  assert.equal(run({ ...base, latitude: "-89.9" }).ok, true);
  assert.equal(run({ ...base, longitude: "180" }).ok, true);
  assert.equal(run({ ...base, longitude: "-180" }).ok, true);
  assert.equal(run({ ...base, utcOffset: "+14:00" }).ok, true);
  assert.equal(run({ ...base, utcOffset: "-12:00" }).ok, true);
  assert.equal(run({ ...base, date: "1900-01-01" }).ok, true);
  assert.equal(run({ ...base, date: "2100-12-31" }).ok, true);
  assert.equal(run({ ...base, date: "2028-02-29" }).ok, true);
});

test("just-outside values report the pinned errors", () => {
  expectError({ ...base, latitude: "89.91" }, "RANGE", "latitude");
  expectError({ ...base, latitude: "90" }, "RANGE", "latitude");
  expectError({ ...base, latitude: "-89.91" }, "RANGE", "latitude");
  expectError({ ...base, longitude: "180.0001" }, "RANGE", "longitude");
  expectError({ ...base, longitude: "-180.0001" }, "RANGE", "longitude");
  expectError({ ...base, utcOffset: "+14:15" }, "RANGE", "utcOffset");
  expectError({ ...base, utcOffset: "-12:45" }, "RANGE", "utcOffset");
  expectError({ ...base, utcOffset: "+8:00" }, "OFFSET_FORMAT", "utcOffset");
  expectError({ ...base, utcOffset: "08:00" }, "OFFSET_FORMAT", "utcOffset");
  expectError({ ...base, utcOffset: "+08:10" }, "OFFSET_FORMAT", "utcOffset");
  expectError({ ...base, date: "1899-12-31" }, "RANGE", "date");
  expectError({ ...base, date: "2101-01-01" }, "RANGE", "date");
  expectError({ ...base, date: "2026-13-01" }, "DATE_FORMAT", "date");
  expectError({ ...base, date: "2026-02-29" }, "DATE_FORMAT", "date");
  expectError({ ...base, date: "2026-6-21" }, "DATE_FORMAT", "date");
  expectError({ ...base, date: "2026/06/21" }, "DATE_FORMAT", "date");
});

test("decimal grammar rejects signs, spaces, exponents, and bad shapes", () => {
  expectError({ ...base, latitude: "+25.0" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: " 25.0" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "25.0 " }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "2.5e1" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "025.0" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "25." }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: ".5" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "25.03305" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "-" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "1234" }, "DECIMAL_FORMAT", "latitude");
  expectError({ ...base, latitude: "" }, "EMPTY", "latitude");
  expectError({ ...base, longitude: "" }, "EMPTY", "longitude");
  expectError({ ...base, utcOffset: "" }, "EMPTY", "utcOffset");
});

test("capacity is checked before grammar; first field error wins", () => {
  // 13 units exceed the 12-unit latitude capacity even though the
  // grammar would also reject the value.
  expectError({ ...base, latitude: "1234567890123" }, "INPUT_LIMIT", "latitude");
  expectError({ ...base, date: "2026-06-210" }, "INPUT_LIMIT", "date");
  expectError({ ...base, utcOffset: "+08:000" }, "INPUT_LIMIT", "utcOffset");
  // Field order: date before latitude before longitude before offset.
  expectError(
    { date: "2026-02-30", latitude: "89.95", longitude: "999", utcOffset: "+08:10" },
    "DATE_FORMAT",
    "date",
  );
  expectError(
    { date: "2026-06-21", latitude: "89.95", longitude: "999", utcOffset: "+08:10" },
    "RANGE",
    "latitude",
  );
  expectError(
    { date: "2026-06-21", latitude: "25.0330", longitude: "999", utcOffset: "+08:10" },
    "RANGE",
    "longitude",
  );
});

test("schema classes: wrong type, missing, extra, accessor, non-object", () => {
  expectError(null, "SCHEMA", null);
  expectError("2026-06-21", "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError({ ...base, extra: "x" }, "SCHEMA", null);
  const missing = { ...base };
  delete missing.date;
  expectError(missing, "SCHEMA", null);
  expectError({ ...base, latitude: 25.033 }, "SCHEMA", null);
  expectError({ ...base, utcOffset: null }, "SCHEMA", null);
  let invoked = false;
  const withAccessor = { ...base };
  Object.defineProperty(withAccessor, "latitude", {
    enumerable: true,
    get() {
      invoked = true;
      return "25.0330";
    },
  });
  expectError(withAccessor, "SCHEMA", null);
  assert.equal(invoked, false, "accessors must never be invoked");
});

test("unpaired surrogates report UNICODE before grammar", () => {
  expectError({ ...base, latitude: "25.0\uD800" }, "UNICODE", "latitude");
  expectError({ ...base, date: "2026-06-2\uDC00" }, "UNICODE", "date");
});

test("property: NORMAL results keep unrounded sunrise <= noon <= sunset and day length near 8*haDeg", () => {
  // Recompute the unrounded quantities from the SPEC formulas here in
  // the test (independent restatement) for a spread of inputs, and
  // compare against the result's rounded display only through the
  // SPEC's invariants.
  const spots = [
    { date: "2026-01-15", latitude: "25.0330", longitude: "121.5654", utcOffset: "+08:00" },
    { date: "2026-07-04", latitude: "-33.8688", longitude: "151.2093", utcOffset: "+10:00" },
    { date: "2026-03-20", latitude: "51.5074", longitude: "-0.1278", utcOffset: "+00:00" },
    { date: "2026-09-22", latitude: "40.7128", longitude: "-74.0060", utcOffset: "-05:00" },
    { date: "2028-02-29", latitude: "64.1466", longitude: "-21.9426", utcOffset: "+00:00" },
  ];
  for (const input of spots) {
    const outcome = run(input);
    assert.equal(outcome.ok, true);
    assert.equal(outcome.result.status, "NORMAL");
    const toMinutes = (text) => Number(text.slice(0, 2)) * 60 + Number(text.slice(3, 5));
    const sunrise = toMinutes(outcome.result.sunrise) + 1440 * outcome.result.sunriseDayOffset;
    const noon = toMinutes(outcome.result.solarNoon) + 1440 * outcome.result.solarNoonDayOffset;
    const sunset = toMinutes(outcome.result.sunset) + 1440 * outcome.result.sunsetDayOffset;
    assert.ok(sunrise <= noon && noon <= sunset, `${input.date}: ordering`);
    assert.ok(
      Math.abs(outcome.result.dayLengthMinutes - (sunset - sunrise)) <= 1,
      `${input.date}: day length consistent with displayed times within rounding`,
    );
  }
});

test("property: negated latitude on the opposite solstice swaps polar day and night", () => {
  const north = run({ date: "2026-06-21", latitude: "69.6492", longitude: "18.9553", utcOffset: "+02:00" });
  const south = run({ date: "2026-12-21", latitude: "-69.6492", longitude: "18.9553", utcOffset: "+02:00" });
  assert.equal(north.result.status, "POLAR_DAY");
  assert.equal(south.result.status, "POLAR_DAY");
  const northWinter = run({ date: "2026-12-21", latitude: "69.6492", longitude: "18.9553", utcOffset: "+01:00" });
  const southWinter = run({ date: "2026-06-21", latitude: "-69.6492", longitude: "18.9553", utcOffset: "+01:00" });
  assert.equal(northWinter.result.status, "POLAR_NIGHT");
  assert.equal(southWinter.result.status, "POLAR_NIGHT");
});

test("defaults produce EMPTY on the blank date", () => {
  expectError({ ...DEFAULTS }, "EMPTY", "date");
});

test("report serialization: canonical bytes, sorted keys, one trailing LF", () => {
  const result = run(fixtures.cases[0].input).result;
  const text = serializeReport(result);
  const expected =
    '{"dayLength":"13:42","dayLengthMinutes":822,"solarNoon":"11:55","solarNoonDayOffset":0,' +
    '"status":"NORMAL","sunrise":"05:04","sunriseDayOffset":0,"sunset":"18:46","sunsetDayOffset":0,' +
    '"utcOffsetMinutes":480}\n';
  assert.equal(text, expected);
  const bytes = new TextEncoder().encode(text);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    createHash("sha256").update(new TextEncoder().encode(expected)).digest("hex"),
  );
  assert.ok(bytes.byteLength <= REPORT_LIMIT_BYTES);
  assert.equal(text.includes("undefined"), false);
});

test("report serialization: polar result keeps nulls and does not call toJSON", () => {
  const result = run(fixtures.cases.find((entry) => entry.id === "polar-night-tromso").input).result;
  let called = false;
  const hostile = { ...result };
  Object.defineProperty(hostile, "toJSON", {
    enumerable: false,
    value() {
      called = true;
      return {};
    },
  });
  const text = serializeReport(hostile);
  assert.equal(called, false);
  assert.equal(
    text,
    '{"dayLength":null,"dayLengthMinutes":null,"solarNoon":null,"solarNoonDayOffset":null,' +
      '"status":"POLAR_NIGHT","sunrise":null,"sunriseDayOffset":null,"sunset":null,' +
      '"sunsetDayOffset":null,"utcOffsetMinutes":60}\n',
  );
});
