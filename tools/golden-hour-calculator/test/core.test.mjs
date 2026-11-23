// Core tests: the sixteen literal core cases vendored verbatim in
// test/fixtures.json (fixed spec candidate, spec draft PR #396,
// registry rev 1827) are deep-compared against the core's run, plus
// boundary, grammar, schema, ordering, and property checks whose
// expectations are derived from the SPEC's stated rules — never from
// the implementation's own output. The SPEC's symmetry sentence
// ("negate the latitude and take the date half a year away, polar day
// and polar night swap") is checked here in its correct form: each
// operation alone swaps the polar status, while both together leave
// it unchanged, because cosHa is invariant under (phi -> -phi,
// decl -> -decl). See HANDOFF.md errata candidate 1.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  REPORT_FILENAME,
  run,
  serializeReport,
} from "../public/js/core/golden-hour.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

function base(overrides = {}) {
  return { ...EXAMPLE, ...overrides };
}

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

// Day-offset-aware minute value for comparing clock readings across
// the input-date boundary.
function absoluteMinutes(time, dayOffset) {
  const [hours, minutes] = time.split(":").map(Number);
  return dayOffset * 1440 + hours * 60 + minutes;
}

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test("legal endpoints succeed", () => {
  assert.equal(run(base({ latitude: "89.9" })).ok, true);
  assert.equal(run(base({ latitude: "-89.9" })).ok, true);
  assert.equal(run(base({ longitude: "180" })).ok, true);
  assert.equal(run(base({ longitude: "-180" })).ok, true);
  assert.equal(run(base({ utcOffset: "+14:00" })).ok, true);
  assert.equal(run(base({ utcOffset: "-12:00" })).ok, true);
  assert.equal(run(base({ date: "1900-01-01" })).ok, true);
  assert.equal(run(base({ date: "2100-12-31" })).ok, true);
  assert.equal(run(base({ date: "2028-02-29" })).ok, true);
  assert.deepEqual(DEFAULTS, {
    date: "",
    latitude: "25.0330",
    longitude: "121.5654",
    utcOffset: "+08:00",
  });
});

test("just-outside values fail with the pinned codes", () => {
  expectError(base({ latitude: "89.91" }), "RANGE", "latitude");
  expectError(base({ latitude: "90" }), "RANGE", "latitude");
  expectError(base({ latitude: "-89.91" }), "RANGE", "latitude");
  expectError(base({ longitude: "180.0001" }), "RANGE", "longitude");
  expectError(base({ longitude: "-180.0001" }), "RANGE", "longitude");
  expectError(base({ utcOffset: "+14:15" }), "RANGE", "utcOffset");
  expectError(base({ utcOffset: "-12:45" }), "RANGE", "utcOffset");
  expectError(base({ utcOffset: "+8:00" }), "OFFSET_FORMAT", "utcOffset");
  expectError(base({ date: "1899-12-31" }), "RANGE", "date");
  expectError(base({ date: "2111-01-01" }), "RANGE", "date");
  expectError(base({ date: "2026-13-01" }), "DATE_FORMAT", "date");
  expectError(base({ date: "2026-02-29" }), "DATE_FORMAT", "date");
  expectError(base({ date: "2026-02-30" }), "DATE_FORMAT", "date");
  expectError(base({ date: "2026-04-31" }), "DATE_FORMAT", "date");
  expectError(base({ date: "2026-00-10" }), "DATE_FORMAT", "date");
  expectError(base({ date: "2026-06-00" }), "DATE_FORMAT", "date");
  expectError(base({ date: "1900-02-29" }), "DATE_FORMAT", "date");
  assert.equal(run(base({ date: "2000-02-29" })).ok, true);
});

test("grammar failures carry their own codes", () => {
  expectError(base({ latitude: "+25.0330" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "25.03300" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "25." }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: ".5" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "25 " }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: " 25" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "1e2" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "007" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "00" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ latitude: "1234" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ longitude: "121.56545" }), "DECIMAL_FORMAT", "longitude");
  expectError(base({ utcOffset: "+08:10" }), "OFFSET_FORMAT", "utcOffset");
  expectError(base({ utcOffset: "08:00" }), "OFFSET_FORMAT", "utcOffset");
  expectError(base({ utcOffset: "+8:00" }), "OFFSET_FORMAT", "utcOffset");
  expectError(base({ utcOffset: "+08:0" }), "OFFSET_FORMAT", "utcOffset");
  expectError(base({ utcOffset: "+08:60" }), "OFFSET_FORMAT", "utcOffset");
  expectError(base({ date: "2026/06/21" }), "DATE_FORMAT", "date");
  expectError(base({ date: "2026-6-21" }), "DATE_FORMAT", "date");
  expectError(base({ date: "26-06-21" }), "DATE_FORMAT", "date");
});

test("emptiness, capacity, and surrogate checks", () => {
  expectError(base({ date: "" }), "EMPTY", "date");
  expectError(base({ latitude: "" }), "EMPTY", "latitude");
  expectError(base({ longitude: "" }), "EMPTY", "longitude");
  expectError(base({ utcOffset: "" }), "EMPTY", "utcOffset");
  expectError(base({ date: "2026-06-211" }), "INPUT_LIMIT", "date");
  expectError(base({ latitude: "1234567890123" }), "INPUT_LIMIT", "latitude");
  expectError(base({ longitude: "1234567890123" }), "INPUT_LIMIT", "longitude");
  expectError(base({ utcOffset: "+08:000" }), "INPUT_LIMIT", "utcOffset");
  expectError(base({ date: "2026-06-\uD800" }), "UNICODE", "date");
  expectError(base({ latitude: "\uD800" }), "UNICODE", "latitude");
  expectError(base({ utcOffset: "+08:\uD800" }), "UNICODE", "utcOffset");
});

test("first error wins in the SPEC's field order", () => {
  // An empty date beats a malformed latitude.
  expectError(base({ date: "", latitude: "abc" }), "EMPTY", "date");
  // A bad date beats a bad longitude.
  expectError(base({ date: "2026-02-30", longitude: "x" }), "DATE_FORMAT", "date");
  // A bad latitude beats a bad offset.
  expectError(base({ latitude: "89.95", utcOffset: "+08:10" }), "RANGE", "latitude");
  // A bad longitude beats a bad offset.
  expectError(base({ longitude: "181", utcOffset: "+08:10" }), "RANGE", "longitude");
  // Capacity is checked before grammar within a field.
  expectError(base({ latitude: "1234567890123.5" }), "INPUT_LIMIT", "latitude");
  // Grammar is checked before range within a field.
  expectError(base({ latitude: "+89.95" }), "DECIMAL_FORMAT", "latitude");
});

test("schema violations: shape, types, unknown and missing keys, accessors", () => {
  expectError(null, "SCHEMA", null);
  expectError("2026-06-21", "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError({ ...EXAMPLE, extra: "" }, "SCHEMA", null);
  expectError({ ...EXAMPLE, latitude: 25.033 }, "SCHEMA", null);
  expectError({ ...EXAMPLE, utcOffset: null }, "SCHEMA", null);
  const missingDate = { latitude: "25.0330", longitude: "121.5654", utcOffset: "+08:00" };
  expectError(missingDate, "SCHEMA", null);
  const missingLatitude = { date: "2026-06-21", longitude: "121.5654", utcOffset: "+08:00" };
  expectError(missingLatitude, "SCHEMA", null);
  let invoked = false;
  const hostile = { ...EXAMPLE };
  Object.defineProperty(hostile, "latitude", {
    enumerable: true,
    get() {
      invoked = true;
      return "25.0330";
    },
  });
  expectError(hostile, "SCHEMA", null);
  assert.equal(invoked, false, "accessors must never be invoked");
});

test("hostile strings stay inert grammar failures", () => {
  expectError(base({ date: "2026-06-21<script>" }), "INPUT_LIMIT", "date");
  expectError(base({ latitude: "25<script>" }), "DECIMAL_FORMAT", "latitude");
  expectError(base({ longitude: "__proto__" }), "DECIMAL_FORMAT", "longitude");
  expectError(base({ utcOffset: "+08:00; DROP TABLE" }), "INPUT_LIMIT", "utcOffset");
});

test("property: NORMAL day length display matches its minutes", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { result } = run(fixture.input);
    if (result.status !== "NORMAL") continue;
    const hours = Math.floor(result.dayLengthMinutes / 60);
    const minutes = String(result.dayLengthMinutes % 60).padStart(2, "0");
    assert.equal(result.dayLength, `${hours}:${minutes}`, `${fixture.id} dayLength`);
  }
});

test("property: morning and evening windows of the same name share a duration", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { result } = run(fixture.input);
    if (result.status !== "NORMAL") continue;
    for (const [morning, evening] of [
      ["goldenMorning", "goldenEvening"],
      ["blueMorning", "blueEvening"],
    ]) {
      assert.equal(
        result[morning] === null,
        result[evening] === null,
        `${fixture.id} ${morning}/${evening} null-ness`,
      );
      if (result[morning] !== null) {
        assert.equal(
          result[morning].durationMinutes,
          result[evening].durationMinutes,
          `${fixture.id} ${morning}/${evening} duration`,
        );
      }
    }
  }
});

test("property: golden windows contain sunrise/sunset; blue meets golden at the shared bound", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { result } = run(fixture.input);
    if (result.status !== "NORMAL") continue;
    if (result.goldenMorning !== null) {
      const start = absoluteMinutes(result.goldenMorning.start, result.goldenMorning.startDayOffset);
      const end = absoluteMinutes(result.goldenMorning.end, result.goldenMorning.endDayOffset);
      const sunrise = absoluteMinutes(result.sunrise, result.sunriseDayOffset);
      assert.ok(start <= sunrise && sunrise <= end, `${fixture.id} golden morning contains sunrise`);
      assert.deepEqual(
        [result.blueMorning.end, result.blueMorning.endDayOffset],
        [result.goldenMorning.start, result.goldenMorning.startDayOffset],
        `${fixture.id} blue morning ends where golden morning starts`,
      );
    }
    if (result.goldenEvening !== null) {
      const start = absoluteMinutes(result.goldenEvening.start, result.goldenEvening.startDayOffset);
      const end = absoluteMinutes(result.goldenEvening.end, result.goldenEvening.endDayOffset);
      const sunset = absoluteMinutes(result.sunset, result.sunsetDayOffset);
      assert.ok(start <= sunset && sunset <= end, `${fixture.id} golden evening contains sunset`);
      assert.deepEqual(
        [result.blueEvening.start, result.blueEvening.startDayOffset],
        [result.goldenEvening.end, result.goldenEvening.endDayOffset],
        `${fixture.id} blue evening starts where golden evening ends`,
      );
    }
  }
});

test("property: polar states return null times but still return noon elevation", () => {
  const night = run({ date: "2026-12-21", latitude: "69.6492", longitude: "18.9553", utcOffset: "+01:00" });
  assert.equal(night.result.status, "POLAR_NIGHT");
  assert.equal(night.result.sunrise, null);
  assert.equal(night.result.solarNoon, null);
  assert.equal(night.result.sunset, null);
  assert.equal(night.result.dayLengthMinutes, null);
  assert.equal(night.result.dayLength, null);
  assert.equal(night.result.noonElevation, -3.1);
  assert.deepEqual(night.result.windowStatus, {
    goldenMorning: "SUN_NEVER_HIGH",
    goldenEvening: "SUN_NEVER_HIGH",
    blueMorning: "SUN_NEVER_HIGH",
    blueEvening: "SUN_NEVER_HIGH",
  });
  const day = run({ date: "2026-06-21", latitude: "69.6492", longitude: "18.9553", utcOffset: "+02:00" });
  assert.equal(day.result.status, "POLAR_DAY");
  assert.equal(day.result.noonElevation, 43.8);
  assert.deepEqual(day.result.windowStatus, {
    goldenMorning: "SUN_NEVER_LOW",
    goldenEvening: "SUN_NEVER_LOW",
    blueMorning: "SUN_NEVER_LOW",
    blueEvening: "SUN_NEVER_LOW",
  });
});

test("property: each polar swap alone flips the status; both together preserve it", () => {
  const summer = { date: "2026-06-21", latitude: "69.6492", longitude: "18.9553", utcOffset: "+02:00" };
  assert.equal(run(summer).result.status, "POLAR_DAY");
  assert.equal(run({ ...summer, latitude: "-69.6492" }).result.status, "POLAR_NIGHT");
  assert.equal(
    run({ ...summer, date: "2026-12-21", utcOffset: "+01:00" }).result.status,
    "POLAR_NIGHT",
  );
  assert.equal(
    run({ ...summer, date: "2026-12-21", latitude: "-69.6492", utcOffset: "+01:00" }).result.status,
    "POLAR_DAY",
  );
});

test("report filename is the SPEC-fixed name", () => {
  assert.equal(REPORT_FILENAME, "golden-hour-report.json");
});

test("report bytes for the worked example are the pinned canonical serialization", () => {
  const { result } = run(EXAMPLE);
  const serialized = serializeReport(result);
  assert.equal(
    serialized,
    '{"blueEvening":{"durationMinutes":10,"end":"19:12","endDayOffset":0,"start":"19:02","startDayOffset":0},' +
      '"blueMorning":{"durationMinutes":10,"end":"04:48","endDayOffset":0,"start":"04:38","startDayOffset":0},' +
      '"dayLength":"13:42","dayLengthMinutes":822,' +
      '"goldenEvening":{"durationMinutes":49,"end":"19:02","endDayOffset":0,"start":"18:13","startDayOffset":0},' +
      '"goldenMorning":{"durationMinutes":49,"end":"05:37","endDayOffset":0,"start":"04:48","startDayOffset":0},' +
      '"noonElevation":88.4,"solarNoon":"11:55","solarNoonDayOffset":0,"status":"NORMAL",' +
      '"sunrise":"05:04","sunriseDayOffset":0,"sunset":"18:46","sunsetDayOffset":0,"utcOffsetMinutes":480,' +
      '"windowStatus":{"blueEvening":"OK","blueMorning":"OK","goldenEvening":"OK","goldenMorning":"OK"}}\n',
  );
  assert.equal(
    createHash("sha256").update(serialized, "utf8").digest("hex"),
    "2be281d1f9c64ded806eb5c45ab17f93a572740410e181a3bb61be8e34ae8daf",
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
  assert.ok(serialized.includes('"status":"NORMAL"'));
});
