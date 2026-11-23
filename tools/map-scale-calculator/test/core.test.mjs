// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-map-scale-calculator-20261121, spec candidate commit
// 91540b9ccad4b01dc72aed0419f44b5661e1416c, draft spec PR #398,
// SHA-256
// 1b5e53d7286b97b667bfee2e7bde9299ee4f3309507290c158c462fd5b8701bd).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned rules by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { COMMON_SCALES, run } from "../public/js/core/map-scale.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-map-scale-calculator-20261121");
assert.equal(coreCases.length, 16);

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

// Independent re-derivation, written separately from the
// implementation: parse to milli-units, then round with an explicit
// quotient/remainder half-up rule (2*remainder >= divisor rounds
// up), instead of the implementation's (2n+d)/(2d) formulation.
function parseMilli(value) {
  const dot = value.indexOf(".");
  const intPart = dot === -1 ? value : value.slice(0, dot);
  const fracPart = dot === -1 ? "" : value.slice(dot + 1);
  return BigInt(intPart) * 1000n + BigInt(fracPart.padEnd(3, "0") || "0");
}

function roundHalfUp(numerator, denominator) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return 2n * remainder >= denominator ? quotient + 1n : quotient;
}

function formatScaled(scaled, places) {
  const unit = 10n ** BigInt(places);
  const whole = scaled / unit;
  let frac = (scaled % unit).toString().padStart(places, "0");
  while (frac.endsWith("0")) frac = frac.slice(0, -1);
  return frac === "" ? whole.toString() : `${whole}.${frac}`;
}

function expectedForward(mapCm, scale) {
  const milli = parseMilli(mapCm);
  const n = BigInt(scale);
  return {
    mode: "map-to-real",
    scale: Number(n),
    mapCentimeters: formatScaled(milli, 3),
    realMeters: formatScaled(roundHalfUp(milli * n, 1000n), 2),
    realKilometers: formatScaled(roundHalfUp(milli * n, 100000n), 3),
    primaryUnit: milli * n < 100000000n ? "m" : "km",
  };
}

function expectedReverse(realValue, realUnit, scale) {
  const milli = parseMilli(realValue);
  const n = BigInt(scale);
  let metersHundredths;
  let kmThousandths;
  let mapHundredths;
  if (realUnit === "m") {
    metersHundredths = roundHalfUp(milli, 10n);
    kmThousandths = roundHalfUp(milli, 1000n);
    mapHundredths = roundHalfUp(milli * 10n, n);
  } else {
    metersHundredths = milli * 100n;
    kmThousandths = milli;
    mapHundredths = roundHalfUp(milli * 10000n, n);
  }
  return {
    mode: "real-to-map",
    scale: Number(n),
    mapCentimeters: formatScaled(mapHundredths, 2),
    realMeters: formatScaled(metersHundredths, 2),
    realKilometers: formatScaled(kmThousandths, 3),
    primaryUnit: "cm",
  };
}

test("independent re-derivation of forward cases matches run()", () => {
  const cases = [
    ["4", "25000"],
    ["2.5", "50000"],
    ["0.8", "10000"],
    ["12.4", "5000"],
    ["7.35", "100000"],
    ["1.234", "25000"],
    ["0.01", "1"],
    ["10000", "10000000"],
    ["999.996", "100"],
    ["3.333", "333"],
    ["0.01", "10000000"],
  ];
  for (const [mapCm, scale] of cases) {
    const actual = run({ mapCm, mode: "map-to-real", scale });
    assert.deepEqual(actual, { ok: true, result: expectedForward(mapCm, scale) }, `${mapCm} @ 1:${scale}`);
  }
});

test("independent re-derivation of reverse cases matches run()", () => {
  const cases = [
    ["3.5", "km", "25000"],
    ["750", "m", "50000"],
    ["125", "m", "10000"],
    ["12", "km", "200000"],
    ["333", "m", "25000"],
    ["0.01", "m", "1"],
    ["1000000", "m", "10000000"],
    ["1000", "km", "1000"],
    ["12.345", "m", "25000"],
    ["0.333", "km", "777"],
  ];
  for (const [realValue, realUnit, scale] of cases) {
    const actual = run({ mode: "real-to-map", realUnit, realValue, scale });
    assert.deepEqual(
      actual,
      { ok: true, result: expectedReverse(realValue, realUnit, scale) },
      `${realValue} ${realUnit} @ 1:${scale}`,
    );
  }
});

test("primary unit switches on the exact value, not the rounded display", () => {
  // Exact 999.996 m: the rounded display is 1000 m, but the primary
  // unit stays "m" (the SPEC's pinned boundary case).
  const justUnder = run({ mapCm: "999.996", mode: "map-to-real", scale: "100" });
  assert.deepEqual(justUnder, {
    ok: true,
    result: {
      mapCentimeters: "999.996",
      mode: "map-to-real",
      primaryUnit: "m",
      realKilometers: "1",
      realMeters: "1000",
      scale: 100,
    },
  });
  // Exact 1000 m is "km".
  const exact = run({ mapCm: "4", mode: "map-to-real", scale: "25000" });
  assert.equal(exact.result.primaryUnit, "km");
});

test("reverse 3-decimal metre input follows the SPEC point-3 output rounding", () => {
  // 12.345 m @ 1:25000: realMeters 12.345 -> 2 dp half-up "12.35",
  // realKilometers 0.012345 -> 3 dp half-up "0.012", map cm
  // 0.04938 -> 2 dp half-up "0.05". See the errata note in HANDOFF.md
  // for the tension with the point-4 "正規化值" wording.
  assert.deepEqual(run({ mode: "real-to-map", realUnit: "m", realValue: "12.345", scale: "25000" }), {
    ok: true,
    result: {
      mapCentimeters: "0.05",
      mode: "real-to-map",
      primaryUnit: "cm",
      realKilometers: "0.012",
      realMeters: "12.35",
      scale: 25000,
    },
  });
});

test("scale endpoints are accepted; one unit outside is RANGE", () => {
  assert.equal(run({ mapCm: "1", mode: "map-to-real", scale: "1" }).ok, true);
  assert.equal(run({ mapCm: "1", mode: "map-to-real", scale: "10000000" }).ok, true);
  assert.deepEqual(run({ mapCm: "1", mode: "map-to-real", scale: "10000001" }), {
    ok: false,
    error: { code: "RANGE", field: "scale", row: null },
  });
  assert.deepEqual(run({ mapCm: "1", mode: "map-to-real", scale: "100000000" }), {
    ok: false,
    error: { code: "RANGE", field: "scale", row: null },
  });
  // 13 units: capacity is decided before the range check.
  assert.deepEqual(run({ mapCm: "1", mode: "map-to-real", scale: "1000000000000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "scale", row: null },
  });
});

test("mapCm endpoints are accepted; just outside is RANGE", () => {
  assert.equal(run({ mapCm: "0.01", mode: "map-to-real", scale: "25000" }).ok, true);
  assert.equal(run({ mapCm: "10000", mode: "map-to-real", scale: "25000" }).ok, true);
  assert.deepEqual(run({ mapCm: "10000.001", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "mapCm", row: null },
  });
  assert.deepEqual(run({ mapCm: "0.009", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "mapCm", row: null },
  });
  assert.deepEqual(run({ mapCm: "0", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "mapCm", row: null },
  });
  assert.deepEqual(run({ mapCm: "0.000", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "mapCm", row: null },
  });
});

test("realValue endpoints differ by unit", () => {
  assert.equal(run({ mode: "real-to-map", realUnit: "m", realValue: "0.01", scale: "25000" }).ok, true);
  assert.equal(run({ mode: "real-to-map", realUnit: "m", realValue: "1000000", scale: "25000" }).ok, true);
  assert.deepEqual(run({ mode: "real-to-map", realUnit: "m", realValue: "1000000.001", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "realValue", row: null },
  });
  assert.equal(run({ mode: "real-to-map", realUnit: "km", realValue: "0.01", scale: "25000" }).ok, true);
  assert.equal(run({ mode: "real-to-map", realUnit: "km", realValue: "1000", scale: "25000" }).ok, true);
  assert.deepEqual(run({ mode: "real-to-map", realUnit: "km", realValue: "1000.001", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "realValue", row: null },
  });
  // 1001 km is in range as metres would be, but not as kilometres.
  assert.deepEqual(run({ mode: "real-to-map", realUnit: "km", realValue: "1001", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "realValue", row: null },
  });
});

test("scale grammar: ASCII integers, non-zero leading, no decimals", () => {
  for (const bad of ["25000.5", "+25000", "-25000", " 25000", "25000 ", "025000", "00", "1e5", "２５０００"]) {
    assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "scale", row: null },
    });
  }
  // "0" passes grammar but fails the range (scale 1-10,000,000).
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "scale", row: null },
  });
});

test("distance grammar: digits, one point, 1-3 decimals, no sign", () => {
  for (const bad of ["-4", "+4", " 4", "4 ", ".5", "4.", "1.2345", "1e2", "４", "4..5", "4.5.6"]) {
    assert.deepEqual(run({ mapCm: bad, mode: "map-to-real", scale: "25000" }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "mapCm", row: null },
    });
  }
  // Leading zeros are allowed for distances: the SPEC pins the
  // non-zero-leading rule for scale only, not for distances.
  assert.deepEqual(run({ mapCm: "007", mode: "map-to-real", scale: "1000" }), {
    ok: true,
    result: {
      mapCentimeters: "7",
      mode: "map-to-real",
      primaryUnit: "m",
      realKilometers: "0.07",
      realMeters: "70",
      scale: 1000,
    },
  });
  // Trailing zeros in the input are trimmed in the echo.
  assert.equal(run({ mapCm: "4.000", mode: "map-to-real", scale: "25000" }).result.mapCentimeters, "4");
  assert.equal(run({ mapCm: "0.010", mode: "map-to-real", scale: "25000" }).result.mapCentimeters, "0.01");
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ mapCm: "", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "EMPTY", field: "mapCm", row: null },
  });
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "scale", row: null },
  });
  assert.deepEqual(run({ mode: "real-to-map", realUnit: "km", realValue: "", scale: "25000" }), {
    ok: false,
    error: { code: "EMPTY", field: "realValue", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // 13 units: too long even though the grammar would also fail.
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: "25000.5000000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "scale", row: null },
  });
  assert.deepEqual(run({ mapCm: "1234567890123", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mapCm", row: null },
  });
  // 13 units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ mapCm: "123456789012\uD800", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mapCm", row: null },
  });
  // Exactly 12 units is within capacity and reaches the grammar.
  assert.deepEqual(run({ mapCm: "123456789012", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "RANGE", field: "mapCm", row: null },
  });
});

test("lone surrogates are UNICODE at exactly twelve units", () => {
  assert.deepEqual(run({ mapCm: "12345678901\uD800", mode: "map-to-real", scale: "25000" }), {
    ok: false,
    error: { code: "UNICODE", field: "mapCm", row: null },
  });
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: "1234567890\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "scale", row: null },
  });
});

test("validation order: mode, scale, realUnit, then the distance field", () => {
  assert.deepEqual(run({ mapCm: "-4", mode: "bogus", scale: "0" }), {
    ok: false,
    error: { code: "SCHEMA", field: "mode", row: null },
  });
  assert.deepEqual(run({ mapCm: "-4", mode: "map-to-real", scale: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "scale", row: null },
  });
  assert.deepEqual(
    run({ mode: "real-to-map", realUnit: "mi", realValue: "", scale: "0" }),
    {
      ok: false,
      error: { code: "RANGE", field: "scale", row: null },
    },
  );
  assert.deepEqual(
    run({ mode: "real-to-map", realUnit: "mi", realValue: "", scale: "25000" }),
    {
      ok: false,
      error: { code: "SCHEMA", field: "realUnit", row: null },
    },
  );
  assert.deepEqual(run({ mapCm: "", mode: "map-to-real", scale: "junk" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "scale", row: null },
  });
});

test("fields the current mode does not read are kept, unvalidated", () => {
  // Forward ignores realValue / realUnit entirely, even when their
  // values could never pass validation.
  assert.equal(
    run({ mapCm: "4", mode: "map-to-real", realUnit: "mi", realValue: "junk", scale: "25000" }).ok,
    true,
  );
  // Reverse ignores mapCm entirely.
  assert.equal(
    run({ mapCm: "junk", mode: "real-to-map", realUnit: "km", realValue: "3.5", scale: "25000" }).ok,
    true,
  );
});

test("schema violations are SCHEMA", () => {
  const schemaNull = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schemaNull);
  assert.deepEqual(run([]), schemaNull);
  assert.deepEqual(run("4"), schemaNull);
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real" }), schemaNull);
  assert.deepEqual(run({ mapCm: "4", scale: "25000" }), {
    ok: false,
    error: { code: "SCHEMA", field: "mode", row: null },
  });
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: "25000", extra: "x" }), schemaNull);
  assert.deepEqual(run({ mapCm: 4, mode: "map-to-real", scale: "25000" }), schemaNull);
  assert.deepEqual(run({ mapCm: "4", mode: "map-to-real", scale: 25000 }), schemaNull);
  assert.deepEqual(run({ mode: "real-to-map", realValue: "3.5", scale: "25000" }), {
    ok: false,
    error: { code: "SCHEMA", field: "realUnit", row: null },
  });
  assert.deepEqual(run({ mapCm: "4", mode: 7, scale: "25000" }), {
    ok: false,
    error: { code: "SCHEMA", field: "mode", row: null },
  });
  const withAccessor = { mode: "map-to-real", scale: "25000" };
  Object.defineProperty(withAccessor, "mapCm", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schemaNull);
  // An accessor on an unread field is also refused: unread fields
  // must still be own data.
  const withUnreadAccessor = { mapCm: "4", mode: "map-to-real", scale: "25000" };
  Object.defineProperty(withUnreadAccessor, "realValue", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withUnreadAccessor), schemaNull);
});

test("common-scales table is derived from the 1:N definition", () => {
  assert.equal(COMMON_SCALES.length, 7);
  for (const row of COMMON_SCALES) {
    assert.equal(Number(row.metersPerCm), row.scale / 100);
    assert.equal(Number(row.cmPerKm), 100000 / row.scale);
  }
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/map-scale.mjs", import.meta.url));
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
