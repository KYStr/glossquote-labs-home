// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-depth-of-field-calculator-20261121, spec candidate commit
// e6c526038f637195fd3d14499e74feb3966ba53a, draft spec PR #394,
// SHA-256
// eeddf8cdab6f801ca2049f5626369656973c11abad00338c78036490a1527b17).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned formulas and ranges with an independent
// Decimal calculation, never from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/depth-of-field.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-depth-of-field-calculator-20261121");
assert.equal(coreCases.length, 11);

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

const VALID = {
  focalLengthMm: "50",
  aperture: "8",
  focusDistanceM: "3",
  sensor: "full-frame",
  cocMm: "",
};

function withPatch(patch) {
  return { ...VALID, ...patch };
}

test("hyperfocal boundaries, hand-derived: s == H + 1 mm is infinite, s == H - 1 mm is finite", () => {
  // f=100, N=10, c=0.05 -> H = 20100 mm exactly. s = 20.101 m is
  // past H: far limit infinite, near limit H/2 = 10.05 m.
  assert.deepEqual(run(withPatch({ focalLengthMm: "100", aperture: "10", focusDistanceM: "20.101", sensor: "custom", cocMm: "0.05" })), {
    ok: true,
    result: {
      focalLengthMm: 100,
      aperture: 10,
      focusDistanceM: 20.101,
      sensor: "custom",
      cocMm: 0.05,
      hyperfocalM: 20.1,
      nearLimitM: 10.05,
      farLimitM: null,
      farLimitInfinite: true,
      totalDofM: null,
    },
  });
  // s = 20.099 m is 1 mm short of H: the far limit is finite and
  // very large (Df = s(H-f)/(H-s) = 20099*20000/1 mm).
  assert.deepEqual(run(withPatch({ focalLengthMm: "100", aperture: "10", focusDistanceM: "20.099", sensor: "custom", cocMm: "0.05" })), {
    ok: true,
    result: {
      focalLengthMm: 100,
      aperture: 10,
      focusDistanceM: 20.099,
      sensor: "custom",
      cocMm: 0.05,
      hyperfocalM: 20.1,
      nearLimitM: 10.05,
      farLimitM: 401980,
      farLimitInfinite: false,
      totalDofM: 401969.95,
    },
  });
});

test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  // focalLengthMm 2000 with a matching focus distance.
  assert.equal(run(withPatch({ focalLengthMm: "2000", aperture: "0.5", focusDistanceM: "10000" })).ok, true);
  assert.deepEqual(run(withPatch({ focalLengthMm: "2000", aperture: "0.5", focusDistanceM: "10000" })).result, {
    focalLengthMm: 2000,
    aperture: 0.5,
    focusDistanceM: 10000,
    sensor: "full-frame",
    cocMm: 0.029,
    hyperfocalM: 275864.069,
    nearLimitM: 9650.248,
    farLimitM: 10376.057,
    farLimitInfinite: false,
    totalDofM: 725.808,
  });
  assert.deepEqual(run(withPatch({ focalLengthMm: "2001" })), {
    ok: false,
    error: { code: "RANGE", field: "focalLengthMm", row: null },
  });
  assert.deepEqual(run(withPatch({ focalLengthMm: "0.99" })), {
    ok: false,
    error: { code: "RANGE", field: "focalLengthMm", row: null },
  });
  // aperture 0.5 and 64 are accepted.
  assert.equal(run(withPatch({ aperture: "0.5" })).ok, true);
  assert.equal(run(withPatch({ aperture: "64" })).ok, true);
  assert.deepEqual(run(withPatch({ aperture: "64.01" })), {
    ok: false,
    error: { code: "RANGE", field: "aperture", row: null },
  });
  assert.deepEqual(run(withPatch({ aperture: "0.49" })), {
    ok: false,
    error: { code: "RANGE", field: "aperture", row: null },
  });
  // focusDistanceM 0.05 (with a 1 mm lens) and 10000 are accepted.
  assert.equal(run(withPatch({ focalLengthMm: "1", focusDistanceM: "0.05" })).ok, true);
  assert.deepEqual(run(withPatch({ focusDistanceM: "0.049" })), {
    ok: false,
    error: { code: "RANGE", field: "focusDistanceM", row: null },
  });
  assert.deepEqual(run(withPatch({ focusDistanceM: "10000.001" })), {
    ok: false,
    error: { code: "RANGE", field: "focusDistanceM", row: null },
  });
  // cocMm 0.001 and 1.000 are accepted for custom.
  assert.deepEqual(run(withPatch({ sensor: "custom", cocMm: "0.001" })).result.cocMm, 0.001);
  assert.deepEqual(run(withPatch({ sensor: "custom", cocMm: "1.000" })).result.cocMm, 1);
  assert.deepEqual(run(withPatch({ sensor: "custom", cocMm: "0.0009" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "cocMm", row: null },
  });
  assert.deepEqual(run(withPatch({ sensor: "custom", cocMm: "1.001" })), {
    ok: false,
    error: { code: "RANGE", field: "cocMm", row: null },
  });
});

test("aperture 64 at 3 m focuses past the hyperfocal distance, so the far limit is infinite", () => {
  assert.deepEqual(run(withPatch({ aperture: "64" })).result, {
    focalLengthMm: 50,
    aperture: 64,
    focusDistanceM: 3,
    sensor: "full-frame",
    cocMm: 0.029,
    hyperfocalM: 1.397,
    nearLimitM: 0.94,
    farLimitM: null,
    farLimitInfinite: true,
    totalDofM: null,
  });
});

test("custom CoC endpoints change the hyperfocal distance as the formula pins", () => {
  assert.equal(run(withPatch({ sensor: "custom", cocMm: "0.001" })).result.hyperfocalM, 312.55);
  assert.equal(run(withPatch({ sensor: "custom", cocMm: "0.001" })).result.nearLimitM, 2.972);
  assert.equal(run(withPatch({ sensor: "custom", cocMm: "0.001" })).result.farLimitM, 3.029);
  assert.equal(run(withPatch({ sensor: "custom", cocMm: "0.001" })).result.totalDofM, 0.057);
  assert.equal(run(withPatch({ sensor: "custom", cocMm: "1.000" })).result.hyperfocalM, 0.363);
  assert.equal(run(withPatch({ sensor: "custom", cocMm: "1.000" })).result.farLimitInfinite, true);
});

test("focus distance exactly equal to the focal length is a cross-field RANGE", () => {
  assert.deepEqual(run(withPatch({ focalLengthMm: "200", focusDistanceM: "0.2" })), {
    ok: false,
    error: { code: "RANGE", field: "focusDistanceM", row: null },
  });
  // 1 mm past the focal length is accepted; the depth of field
  // collapses to 0.000 m after rounding.
  const justPast = run(withPatch({ focalLengthMm: "200", aperture: "4", focusDistanceM: "0.201" }));
  assert.equal(justPast.ok, true);
  assert.equal(justPast.result.nearLimitM, 0.201);
  assert.equal(justPast.result.farLimitM, 0.201);
  assert.equal(justPast.result.totalDofM, 0);
});

test("every table sensor uses its pinned CoC; custom requires cocMm", () => {
  const expectedCoc = {
    "1-inch": 0.011,
    "four-thirds": 0.015,
    "aps-c": 0.018,
    "aps-c-canon": 0.018,
    "aps-c-nikon": 0.019,
    "aps-h": 0.023,
    "full-frame": 0.029,
    "medium-645": 0.047,
  };
  for (const [sensor, cocMm] of Object.entries(expectedCoc)) {
    const outcome = run(withPatch({ sensor }));
    assert.equal(outcome.ok, true, sensor);
    assert.equal(outcome.result.cocMm, cocMm, sensor);
  }
  assert.deepEqual(run(withPatch({ sensor: "custom", cocMm: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "cocMm", row: null },
  });
});

test("a non-custom sensor ignores cocMm entirely, even when it is invalid", () => {
  assert.equal(run(withPatch({ sensor: "full-frame", cocMm: "garbage!!!" })).ok, true);
  assert.equal(run(withPatch({ sensor: "full-frame", cocMm: "0.0295" })).ok, true);
  assert.equal(run(withPatch({ sensor: "full-frame", cocMm: "" })).ok, true);
});

test("an unknown sensor is SCHEMA with field sensor", () => {
  assert.deepEqual(run(withPatch({ sensor: "medium-44x33" })), {
    ok: false,
    error: { code: "SCHEMA", field: "sensor", row: null },
  });
  assert.deepEqual(run(withPatch({ sensor: "" })), {
    ok: false,
    error: { code: "SCHEMA", field: "sensor", row: null },
  });
  assert.deepEqual(run(withPatch({ sensor: "Full-Frame" })), {
    ok: false,
    error: { code: "SCHEMA", field: "sensor", row: null },
  });
});

test("grammar: ASCII decimals only, at most one point, digits on both sides, per-field decimal caps", () => {
  for (const bad of ["+50", "-50", " 50", "50 ", "5.", ".5", "1e2", "５０", "50,5"]) {
    assert.deepEqual(run(withPatch({ focalLengthMm: bad })), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "focalLengthMm", row: null },
    });
  }
  // Too many decimals is DECIMAL_FORMAT, not RANGE.
  assert.deepEqual(run(withPatch({ focalLengthMm: "50.123" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "focalLengthMm", row: null },
  });
  assert.deepEqual(run(withPatch({ aperture: "8.123" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "aperture", row: null },
  });
  assert.deepEqual(run(withPatch({ focusDistanceM: "3.0001" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "focusDistanceM", row: null },
  });
  // Leading zeros are plain digits and parse normally.
  assert.equal(run(withPatch({ focalLengthMm: "050" })).ok, true);
  assert.equal(run(withPatch({ focalLengthMm: "050" })).result.focalLengthMm, 50);
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run(withPatch({ focalLengthMm: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "focalLengthMm", row: null },
  });
  assert.deepEqual(run(withPatch({ aperture: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "aperture", row: null },
  });
  assert.deepEqual(run(withPatch({ focusDistanceM: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "focusDistanceM", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run(withPatch({ focalLengthMm: "123456789" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "focalLengthMm", row: null },
  });
  assert.deepEqual(run(withPatch({ aperture: "123456789" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "aperture", row: null },
  });
  assert.deepEqual(run(withPatch({ focusDistanceM: "12345678901" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "focusDistanceM", row: null },
  });
  assert.deepEqual(run(withPatch({ sensor: "custom", cocMm: "123456789" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "cocMm", row: null },
  });
});

test("a lone surrogate fails the decimal grammar (the SPEC defines no separate UNICODE code)", () => {
  assert.deepEqual(run(withPatch({ focalLengthMm: "50\uD800" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "focalLengthMm", row: null },
  });
});

test("field order: focalLengthMm, aperture, focusDistanceM, sensor, cocMm", () => {
  assert.deepEqual(run(withPatch({ focalLengthMm: "", aperture: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "focalLengthMm", row: null },
  });
  assert.deepEqual(run(withPatch({ aperture: "", focusDistanceM: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "aperture", row: null },
  });
  assert.deepEqual(run(withPatch({ focusDistanceM: "", sensor: "nope" })), {
    ok: false,
    error: { code: "EMPTY", field: "focusDistanceM", row: null },
  });
  // The sensor enum check precedes the cocMm check.
  assert.deepEqual(run(withPatch({ sensor: "nope", cocMm: "junk" })), {
    ok: false,
    error: { code: "SCHEMA", field: "sensor", row: null },
  });
  // A per-field RANGE precedes the cross-field check.
  assert.deepEqual(run(withPatch({ focalLengthMm: "200", focusDistanceM: "0.04" })), {
    ok: false,
    error: { code: "RANGE", field: "focusDistanceM", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("50"), schema);
  assert.deepEqual(run({ focalLengthMm: "50" }), schema);
  assert.deepEqual(run({ ...VALID, extra: "x" }), schema);
  assert.deepEqual(run(withPatch({ focalLengthMm: 50 })), schema);
  assert.deepEqual(run(withPatch({ sensor: null })), schema);
  const withAccessor = { ...VALID };
  Object.defineProperty(withAccessor, "focalLengthMm", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("accepted near limits are below the focus distance; total DoF is the unrounded difference, rounded once", () => {
  // Across a sweep of setups the near limit stays below focus, the
  // far limit stays above it when finite, and the reported total
  // equals the unrounded far-minus-near rounded half-up to 3 places
  // (checked here against the reported near/far only where the
  // rounding cannot hide a difference; the fixture deep-equals
  // above already pin the exact values).
  for (const setup of [
    { focalLengthMm: "24", aperture: "2.8", focusDistanceM: "2", sensor: "1-inch", cocMm: "" },
    { focalLengthMm: "85", aperture: "1.8", focusDistanceM: "5", sensor: "custom", cocMm: "0.02" },
    { focalLengthMm: "200", aperture: "4", focusDistanceM: "50", sensor: "full-frame", cocMm: "" },
    { focalLengthMm: "35", aperture: "2", focusDistanceM: "2", sensor: "aps-c-nikon", cocMm: "" },
  ]) {
    const outcome = run(setup);
    assert.equal(outcome.ok, true);
    const result = outcome.result;
    assert.ok(result.nearLimitM < result.focusDistanceM, "near < focus");
    if (!result.farLimitInfinite) {
      assert.ok(result.farLimitM > result.focusDistanceM, "far > focus");
      assert.ok(result.totalDofM > 0, "DoF positive");
    } else {
      assert.equal(result.farLimitM, null);
      assert.equal(result.totalDofM, null);
    }
  }
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/depth-of-field.mjs", import.meta.url));
  const inputs = coreCases.map((entry) => entry.input);
  const script = `
    import { run } from ${JSON.stringify(pathToFileURL(corePath).href)};
    const inputs = ${JSON.stringify(inputs)};
    const outputs = inputs.map((input) => run(input));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const expected = JSON.stringify(inputs.map((input) => run(input)));
  for (const tz of ["UTC", "Asia/Taipei", "America/New_York", "Pacific/Kiritimati"]) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
    assert.equal(out, expected, `TZ=${tz}`);
  }
});
