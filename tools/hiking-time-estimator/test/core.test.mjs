// Core tests: the sixteen literal core cases vendored verbatim in
// test/fixtures.json (fixed spec candidate, spec draft PR #371,
// registry rev 1702) are deep-compared against the core's run, plus
// boundary, grammar, schema, ordering, and property checks whose
// expectations are derived from the SPEC's stated rules (and
// cross-checked against an independent scratch implementation of the
// exact-rational model before this code existed) — never from the
// implementation's own output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  REPORT_FILENAME,
  run,
  serializeReport,
} from "../public/js/core/hiking.mjs";
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
  // Distance endpoints 0.1 and 200 km.
  assert.equal(run(base({ distanceKm: "0.1" })).ok, true);
  assert.equal(run(base({ distanceKm: "200" })).result.totalMinutes, 2400 + 60);
  // Ascent/descent endpoints 0 and 10000 m.
  assert.equal(run(base({ ascentM: "0", descentM: "0" })).ok, true);
  assert.equal(run(base({ ascentM: "10000", descentM: "10000", descentType: "steep" })).ok, true);
  // All three descent types, and the empty-string default.
  assert.equal(run(base({ descentType: "none" })).ok, true);
  assert.equal(run(base({ descentType: "gentle" })).ok, true);
  assert.equal(run(base({ descentType: "steep" })).ok, true);
  assert.equal(run(base({ descentType: "" })).ok, true);
  assert.equal(run(base({ descentM: "" })).ok, true);
  // Defaults equal the worked example.
  assert.deepEqual(DEFAULTS, EXAMPLE);
});

test("just-outside values fail with the pinned codes", () => {
  expectError(base({ distanceKm: "0.09" }), "RANGE", "distanceKm");
  expectError(base({ distanceKm: "200.01" }), "RANGE", "distanceKm");
  expectError(base({ distanceKm: "0" }), "RANGE", "distanceKm");
  expectError(base({ ascentM: "-1" }), "INTEGER_FORMAT", "ascentM");
  expectError(base({ ascentM: "10001" }), "RANGE", "ascentM");
  expectError(base({ descentM: "-1" }), "INTEGER_FORMAT", "descentM");
  expectError(base({ descentM: "10001" }), "RANGE", "descentM");
});

test("grammar failures carry their own codes", () => {
  expectError(base({ distanceKm: "12.555" }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ distanceKm: "12." }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ distanceKm: ".5" }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ distanceKm: "1,200" }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ distanceKm: "1e2" }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ distanceKm: " 12" }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ distanceKm: "12 " }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ ascentM: "100.5" }), "INTEGER_FORMAT", "ascentM");
  expectError(base({ ascentM: "1,000" }), "INTEGER_FORMAT", "ascentM");
  expectError(base({ descentM: "10.5" }), "INTEGER_FORMAT", "descentM");
  expectError(base({ descentType: "moderate" }), "ENUM", "descentType");
  expectError(base({ descentType: "Gentle" }), "ENUM", "descentType");
});

test("emptiness, enum, capacity, and surrogate checks", () => {
  expectError(base({ distanceKm: "" }), "EMPTY", "distanceKm");
  expectError(base({ ascentM: "" }), "EMPTY", "ascentM");
  // descentM / descentType empty means the SPEC default, not EMPTY.
  assert.equal(run(base({ descentM: "" })).ok, true);
  assert.equal(run(base({ descentType: "" })).ok, true);
  expectError(base({ distanceKm: "12345678901234567" }), "INPUT_LIMIT", "distanceKm");
  expectError(base({ ascentM: "12345678901234567" }), "INPUT_LIMIT", "ascentM");
  expectError(base({ descentType: "12345678901234567" }), "INPUT_LIMIT", "descentType");
  expectError(base({ distanceKm: "\uD800" }), "UNICODE", "distanceKm");
  expectError(base({ ascentM: "1\uDC000" }), "UNICODE", "ascentM");
});

test("first error wins in the SPEC's field order", () => {
  // An empty distance beats a malformed ascent.
  expectError(base({ distanceKm: "", ascentM: "abc" }), "EMPTY", "distanceKm");
  // A bad distance beats a malformed descent type.
  expectError(base({ distanceKm: "7.555", descentType: "moderate" }), "DECIMAL_FORMAT", "distanceKm");
  // A bad ascent beats a bad descent.
  expectError(base({ ascentM: "100.5", descentM: "x" }), "INTEGER_FORMAT", "ascentM");
  // A bad descent beats a bad descent type.
  expectError(base({ descentM: "10.5", descentType: "moderate" }), "INTEGER_FORMAT", "descentM");
  // Capacity is checked before grammar within a field.
  expectError(base({ distanceKm: "12345678901234567.5" }), "INPUT_LIMIT", "distanceKm");
});

test("half-up rounding at exact x.5 totals (hand-derived)", () => {
  // 5.25 km, 15 m ascent: exact total 64.5 -> 65 minutes, 1:05.
  const half = run(base({ distanceKm: "5.25", ascentM: "15" }));
  assert.equal(half.result.totalMinutes, 65);
  assert.equal(half.result.totalDisplay, "1:05");
  // Exact total x.5 the other way: 0.25 km, 45 m ascent: 3 + 4.5 = 7.5 -> 8.
  const half2 = run({ distanceKm: "0.25", ascentM: "45", descentM: "0", descentType: "none" });
  assert.equal(half2.result.totalMinutes, 8);
  assert.equal(half2.result.totalDisplay, "0:08");
  assert.equal(half2.result.paceMinPerKm, 30);
  // Exact total just below x.5 stays down: 0.25 km, 44 m: 3 + 4.4 = 7.4 -> 7.
  const below = run({ distanceKm: "0.25", ascentM: "44", descentM: "0", descentType: "none" });
  assert.equal(below.result.totalMinutes, 7);
});

test("gentle-descent floor at exactly zero", () => {
  // 1 km flat (12 min) with a gentle descent of 360 m (-12 min):
  // exact total 0, pace 0.0, display 0:00.
  const zero = run({ distanceKm: "1", ascentM: "0", descentM: "360", descentType: "gentle" });
  assert.deepEqual(zero.result, {
    flatMinutes: 12,
    ascentMinutes: 0,
    descentAdjustmentMinutes: -12,
    totalMinutes: 0,
    totalDisplay: "0:00",
    paceMinPerKm: 0,
    equivalentFlatKm: 1,
  });
});

test("descent type has no effect when descent is zero, and none ignores descent", () => {
  const none = run(base({ descentM: "600", descentType: "none" }));
  const gentle = run(base({ descentM: "0", descentType: "gentle" }));
  const steep = run(base({ descentM: "0", descentType: "steep" }));
  assert.equal(none.result.descentAdjustmentMinutes, 0);
  assert.equal(gentle.result.descentAdjustmentMinutes, 0);
  assert.equal(steep.result.descentAdjustmentMinutes, 0);
  assert.deepEqual(gentle.result, steep.result);
  // Removing the descent adjustment leaves the total unchanged.
  const withDescent = run(base({ descentM: "600", descentType: "gentle" }));
  assert.equal(withDescent.result.totalMinutes, 204 - 20);
  assert.equal(none.result.totalMinutes, 204);
});

test("missing optional fields default; missing required fields are SCHEMA", () => {
  const omitted = run({ distanceKm: "12", ascentM: "600" });
  assert.deepEqual(omitted, run(EXAMPLE));
  const noDistance = { ascentM: "600", descentM: "0", descentType: "none" };
  expectError(noDistance, "SCHEMA", null);
  const noAscent = { distanceKm: "12", descentM: "0", descentType: "none" };
  expectError(noAscent, "SCHEMA", null);
});

test("schema violations: shape, types, unknown and missing keys, accessors", () => {
  expectError(null, "SCHEMA", null);
  expectError("12", "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError({ ...EXAMPLE, extra: "" }, "SCHEMA", null);
  expectError({ ...EXAMPLE, distanceKm: 12 }, "SCHEMA", null);
  expectError({ ...EXAMPLE, descentType: null }, "SCHEMA", null);
  let invoked = false;
  const hostile = { ...EXAMPLE };
  Object.defineProperty(hostile, "ascentM", {
    enumerable: true,
    get() {
      invoked = true;
      return "600";
    },
  });
  expectError(hostile, "SCHEMA", null);
  assert.equal(invoked, false, "accessors must never be invoked");
});

test("hostile strings stay inert grammar failures", () => {
  expectError(base({ distanceKm: "12<script>" }), "DECIMAL_FORMAT", "distanceKm");
  expectError(base({ ascentM: "__proto__" }), "INTEGER_FORMAT", "ascentM");
  expectError(base({ descentType: "none; DROP TABLE" }), "ENUM", "descentType");
});

test("property: every successful total is >= 0 and the display matches the minutes", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { result } = run(fixture.input);
    assert.ok(result.totalMinutes >= 0, `${fixture.id} totalMinutes`);
    const hours = Math.floor(result.totalMinutes / 60);
    const minutes = String(result.totalMinutes % 60).padStart(2, "0");
    assert.equal(result.totalDisplay, `${hours}:${minutes}`, `${fixture.id} totalDisplay`);
    assert.ok(result.paceMinPerKm >= 0, `${fixture.id} pace`);
    assert.ok(result.equivalentFlatKm >= Number(fixture.input.distanceKm), `${fixture.id} equivalent`);
  }
});

test("report filename is the SPEC-fixed name", () => {
  assert.equal(REPORT_FILENAME, "hiking-time-estimate.json");
});

test("report bytes for the worked example are the pinned canonical serialization", () => {
  const { result } = run(EXAMPLE);
  const expected =
    '{"ascentMinutes":60,"descentAdjustmentMinutes":0,"equivalentFlatKm":16.75,' +
    '"flatMinutes":144,"paceMinPerKm":17,"totalDisplay":"3:24","totalMinutes":204}\n';
  const serialized = serializeReport(result);
  assert.equal(serialized, expected);
  assert.equal(
    createHash("sha256").update(serialized, "utf8").digest("hex"),
    "b2ef22911ab4c9b7d974afd864340efd31a69da218c74c6dd6db770a6b14c8ab",
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
  assert.ok(serialized.includes('"totalDisplay":"3:24"'));
});
