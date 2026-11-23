// Core tests: the fourteen literal core cases and three literal error
// cases vendored verbatim in test/fixtures.json (fixed spec candidate,
// spec draft PR #388, registry rev 1787) are deep-compared against the
// core's run, plus boundary, grammar, schema, ordering, and property
// checks whose expectations are derived from the SPEC's stated rules
// (and cross-checked against an independent Decimal scratch
// implementation before this code existed) — never from the
// implementation's own output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULTS,
  EXAMPLE,
  INTERCHANGES,
  RATES,
  REPORT_FILENAME,
  run,
  serializeReport,
} from "../public/js/core/toll.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const errorCases = fixtures.cases.filter((entry) => entry.kind === "error");

function base(overrides = {}) {
  return {
    mode: "distance",
    vehicleType: "small",
    entry: null,
    exit: null,
    distanceKm: "100",
    priorKm: "0",
    etag: "false",
    ...overrides,
  };
}

function expectError(input, code, field) {
  assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
}

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

for (const fixture of errorCases) {
  test(`fixture ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test("defaults are the SPEC reset values and the example is case 1", () => {
  assert.deepEqual(DEFAULTS, {
    mode: "distance",
    vehicleType: "small",
    distanceKm: "100",
    priorKm: "0",
    etag: "false",
    entry: null,
    exit: null,
  });
  assert.deepEqual(EXAMPLE, fixtures.cases[0].input);
  assert.equal(INTERCHANGES.length, 14);
  assert.deepEqual(RATES, {
    small: { rateStandard: 1.2, rateLong: 0.9 },
    large: { rateStandard: 1.5, rateLong: 1.12 },
    trailer: { rateStandard: 1.8, rateLong: 1.35 },
  });
});

test("legal endpoints succeed", () => {
  assert.equal(run(base({ distanceKm: "0.1" })).ok, true);
  assert.equal(run(base({ distanceKm: "999.9" })).ok, true);
  assert.equal(run(base({ priorKm: "0" })).ok, true);
  assert.equal(run(base({ priorKm: "999.9" })).ok, true);
  // All three vehicle types and both etag values.
  for (const vehicleType of ["small", "large", "trailer"]) {
    assert.equal(run(base({ vehicleType })).ok, true);
  }
  assert.equal(run(base({ etag: "true" })).ok, true);
  assert.equal(run(base({ etag: "false" })).ok, true);
  // Missing optional fields default: mode, vehicleType, etag, priorKm.
  const omitted = run({ distanceKm: "100" });
  assert.deepEqual(omitted, run(base()));
  // Empty priorKm means 0 (optional field).
  assert.deepEqual(run(base({ priorKm: "" })), run(base()));
});

test("just-outside values fail with the pinned codes", () => {
  expectError(base({ distanceKm: "0" }), "RANGE", "distanceKm");
  expectError(base({ distanceKm: "0.0" }), "RANGE", "distanceKm");
  expectError(base({ distanceKm: "1000" }), "RANGE", "distanceKm");
  expectError(base({ distanceKm: "1000.0" }), "RANGE", "distanceKm");
  expectError(base({ priorKm: "1000" }), "RANGE", "priorKm");
  expectError(base({ priorKm: "-1" }), "FORMAT", "priorKm");
  expectError(base({ distanceKm: "-1" }), "FORMAT", "distanceKm");
});

test("grammar failures carry their own codes", () => {
  expectError(base({ distanceKm: "100.55" }), "FORMAT", "distanceKm");
  expectError(base({ distanceKm: "100." }), "FORMAT", "distanceKm");
  expectError(base({ distanceKm: ".5" }), "FORMAT", "distanceKm");
  expectError(base({ distanceKm: "1,200" }), "FORMAT", "distanceKm");
  expectError(base({ distanceKm: "1e2" }), "FORMAT", "distanceKm");
  expectError(base({ distanceKm: " 100" }), "FORMAT", "distanceKm");
  expectError(base({ distanceKm: "100 " }), "FORMAT", "distanceKm");
  expectError(base({ priorKm: "10.55" }), "FORMAT", "priorKm");
  expectError(base({ mode: "roundtrip" }), "FORMAT", "mode");
  expectError(base({ mode: "Distance" }), "FORMAT", "mode");
  expectError(base({ vehicleType: "medium" }), "FORMAT", "vehicleType");
  expectError(base({ vehicleType: "SMALL" }), "FORMAT", "vehicleType");
  expectError(base({ etag: "yes" }), "FORMAT", "etag");
  expectError(base({ etag: "TRUE" }), "FORMAT", "etag");
});

test("emptiness, capacity, and surrogate checks", () => {
  expectError(base({ distanceKm: "" }), "EMPTY", "distanceKm");
  expectError(base({ mode: "" }), "EMPTY", "mode");
  expectError(base({ distanceKm: "12345678901234567" }), "INPUT_LIMIT", "distanceKm");
  expectError(base({ priorKm: "12345678901234567" }), "INPUT_LIMIT", "priorKm");
  expectError(base({ mode: "12345678901234567" }), "INPUT_LIMIT", "mode");
  expectError(base({ vehicleType: "12345678901234567" }), "INPUT_LIMIT", "vehicleType");
  expectError(base({ etag: "12345678901234567" }), "INPUT_LIMIT", "etag");
  expectError(base({ distanceKm: "\uD800" }), "UNICODE", "distanceKm");
  expectError(base({ priorKm: "1\uDC000" }), "UNICODE", "priorKm");
});

test("first error wins in the SPEC's field order", () => {
  // A bad mode beats a bad vehicle type.
  expectError(base({ mode: "x", vehicleType: "y" }), "FORMAT", "mode");
  // A bad vehicle type beats an unknown entry.
  expectError(
    base({ vehicleType: "y", mode: "pair", entry: "nowhere", exit: "taipei" }),
    "FORMAT",
    "vehicleType",
  );
  // An unknown entry beats an unknown exit.
  expectError(
    base({ mode: "pair", entry: "nowhere", exit: "alsono" }),
    "UNKNOWN_INTERCHANGE",
    "entry",
  );
  // An unknown exit beats a bad distance (distance is not even read in pair mode).
  expectError(
    base({ mode: "pair", entry: "taipei", exit: "alsono", distanceKm: "abc" }),
    "UNKNOWN_INTERCHANGE",
    "exit",
  );
  // A same-interchange error is checked after both ids are valid.
  expectError(
    base({ mode: "pair", entry: "taipei", exit: "taipei" }),
    "SAME_INTERCHANGE",
    "exit",
  );
  // A bad distance beats a bad priorKm.
  expectError(base({ distanceKm: "abc", priorKm: "xyz" }), "FORMAT", "distanceKm");
  // A bad priorKm beats a bad etag.
  expectError(base({ priorKm: "xyz", etag: "yes" }), "FORMAT", "priorKm");
  // Capacity is checked before grammar within a field.
  expectError(base({ distanceKm: "12345678901234567.5" }), "INPUT_LIMIT", "distanceKm");
});

test("pair-mode shape rules", () => {
  // distanceKm must be null in pair mode.
  expectError(
    base({ mode: "pair", entry: "taipei", exit: "taichung", distanceKm: "100" }),
    "FORMAT",
    "distanceKm",
  );
  // entry / exit are required in pair mode.
  expectError(base({ mode: "pair", exit: "taichung" }), "EMPTY", "entry");
  expectError(base({ mode: "pair", entry: "taipei" }), "EMPTY", "exit");
  expectError(base({ mode: "pair", entry: "", exit: "taichung" }), "EMPTY", "entry");
  // entry / exit must be null in distance mode.
  expectError(base({ entry: "taipei" }), "FORMAT", "entry");
  expectError(base({ exit: "taichung" }), "FORMAT", "exit");
  // Missing distanceKm in distance mode is SCHEMA.
  const noDistance = base();
  delete noDistance.distanceKm;
  expectError(noDistance, "SCHEMA", null);
});

test("half-up rounding at exact .5 and near the boundary (hand-derived)", () => {
  // trailer-long-250 (391.5 -> 392) is a fixture; here the near cases:
  // small 20.4 km: gross 0.4 x 1.2 = 0.48 -> 0.
  assert.equal(run(base({ distanceKm: "20.4" })).result.amountNt, 0);
  // small 20.5 km: gross 0.5 x 1.2 = 0.6 -> 1.
  assert.equal(run(base({ distanceKm: "20.5" })).result.amountNt, 1);
  // large 20.4 km: gross 0.4 x 1.5 = 0.6 -> 1; 20.3 km: 0.3 x 1.5 = 0.45 -> 0.
  assert.equal(run(base({ vehicleType: "large", distanceKm: "20.4" })).result.amountNt, 1);
  assert.equal(run(base({ vehicleType: "large", distanceKm: "20.3" })).result.amountNt, 0);
});

test("daily settlement: prior kilometres move the 200 km threshold (hand-derived)", () => {
  // prior 190 + trip 20 = 210: gross(210) = 216 + 10 x 0.9 = 225;
  // gross(190) = 170 x 1.2 = 204; trip charge 21.
  const crossed = run(base({ priorKm: "190", distanceKm: "20" }));
  assert.equal(crossed.result.grossTotalNt, 225);
  assert.equal(crossed.result.grossPriorNt, 204);
  assert.equal(crossed.result.grossNt, 21);
  assert.equal(crossed.result.amountNt, 21);
  // prior 199.9 + trip 0.1 = exactly 200: no discounted kilometres yet.
  const boundary = run(base({ priorKm: "199.9", distanceKm: "0.1" }));
  assert.equal(boundary.result.totalKm, 200);
  assert.equal(boundary.result.discountedKm, 0);
  assert.equal(boundary.result.grossTotalNt, 216);
  // prior 199.9 + trip 0.2 = 200.1: 0.1 discounted km at 0.9.
  const over = run(base({ priorKm: "199.9", distanceKm: "0.2" }));
  assert.equal(over.result.discountedKm, 0.1);
  assert.equal(over.result.grossTotalNt, 216.09);
});

test("pair trips are direction-independent", () => {
  const forward = run({
    mode: "pair",
    vehicleType: "small",
    entry: "keelung",
    exit: "kaohsiung_end",
    distanceKm: null,
    priorKm: "0",
    etag: "false",
  });
  const reverse = run({
    mode: "pair",
    vehicleType: "small",
    entry: "kaohsiung_end",
    exit: "keelung",
    distanceKm: null,
    priorKm: "0",
    etag: "false",
  });
  assert.equal(reverse.result.distanceKm, forward.result.distanceKm);
  assert.equal(reverse.result.amountNt, forward.result.amountNt);
  assert.deepEqual(reverse.result, { ...forward.result, entry: "kaohsiung_end", exit: "keelung" });
});

test("etag applies before the final rounding", () => {
  const plain = run(base({ distanceKm: "100" }));
  const tagged = run(base({ distanceKm: "100", etag: "true" }));
  // 96 x 0.9 = 86.4 -> 86.
  assert.equal(tagged.result.grossNt, 96);
  assert.equal(tagged.result.amountNt, 86);
  assert.equal(tagged.result.etagApplied, true);
  assert.equal(tagged.result.etagFactor, 0.9);
  assert.equal(plain.result.etagApplied, false);
  assert.equal(plain.result.etagFactor, 1);
});

test("schema violations: shape, types, unknown and missing keys, accessors", () => {
  expectError(null, "SCHEMA", null);
  expectError("100", "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError({ ...base(), extra: "" }, "SCHEMA", null);
  expectError(base({ distanceKm: 100 }), "SCHEMA", null);
  expectError(base({ priorKm: 0 }), "SCHEMA", null);
  expectError(base({ entry: 5 }), "SCHEMA", null);
  expectError(base({ mode: null }), "SCHEMA", null);
  expectError(base({ etag: true }), "SCHEMA", null);
  let invoked = false;
  const hostile = { ...base() };
  Object.defineProperty(hostile, "distanceKm", {
    enumerable: true,
    get() {
      invoked = true;
      return "100";
    },
  });
  expectError(hostile, "SCHEMA", null);
  assert.equal(invoked, false, "accessors must never be invoked");
});

test("hostile strings stay inert grammar failures", () => {
  expectError(base({ distanceKm: "100<script>" }), "FORMAT", "distanceKm");
  expectError(base({ priorKm: "__proto__" }), "FORMAT", "priorKm");
  expectError(
    base({ mode: "pair", entry: "__proto__", exit: "taichung" }),
    "UNKNOWN_INTERCHANGE",
    "entry",
  );
  expectError(base({ etag: "true; DROP TABLE" }), "FORMAT", "etag");
});

test("property: successful results are internally consistent", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const { result } = run(fixture.input);
    assert.ok(result.amountNt >= 0, `${fixture.id} amountNt`);
    assert.ok(result.grossNt >= 0, `${fixture.id} grossNt`);
    assert.equal(
      Math.round(result.totalKm * 10),
      Math.round(result.priorKm * 10) + Math.round(result.distanceKm * 10),
      `${fixture.id} totalKm`,
    );
    assert.equal(
      Math.round((result.freeKm + result.standardKm + result.discountedKm) * 10),
      Math.round(result.totalKm * 10),
      `${fixture.id} segment split`,
    );
    assert.equal(
      Math.round((result.grossTotalNt - result.grossPriorNt) * 1000),
      Math.round(result.grossNt * 1000),
      `${fixture.id} gross split`,
    );
  }
});

test("report filename is the SPEC-fixed name", () => {
  assert.equal(REPORT_FILENAME, "highway-toll-calculator-report.json");
});

test("report bytes for the worked example are the pinned canonical serialization", () => {
  const { result } = run(EXAMPLE);
  const expected =
    '{"amountNt":160,"discountedKm":0,"distanceKm":153.5,"entry":"taipei",' +
    '"etagApplied":false,"etagFactor":1,"exit":"taichung","freeKm":20,"grossNt":160.2,' +
    '"grossPriorNt":0,"grossTotalNt":160.2,"mode":"pair","priorKm":0,"rateLong":0.9,' +
    '"rateStandard":1.2,"standardKm":133.5,"totalKm":153.5,"vehicleType":"small"}\n';
  const serialized = serializeReport(result);
  assert.equal(serialized, expected);
  assert.equal(
    createHash("sha256").update(serialized, "utf8").digest("hex"),
    "aafd63954bc51cb7f2c4ccc55bd83fb9c56e8f475d6ed5711bd7d973db75ae42",
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
  assert.ok(serialized.includes('"amountNt":160'));
});
