// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-room-heater-calculator-20261121, spec candidate commit
// d1aa3f2a79444eac5104b66dba2b7ceec2c592df, draft spec PR #380,
// SHA-256
// 6dc7bd747914a4830407d4f4107d90f8e346e975559351b5d415ed93f8290e6c).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §inputsOutputs rules by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/room-heater.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-room-heater-calculator-20261121");
assert.equal(coreCases.length, 14);

for (const fixture of coreCases) {
  // error-insulation-enum is excluded from the verbatim loop: its
  // input "excellent" is nine raw units, so the SPEC's own order
  // ("先容量、再 surrogate、再該欄文法") gives INPUT_LIMIT, while
  // the fixture expects ENUM. The SPEC text governs (see the
  // dedicated test below and errata candidate 1 in HANDOFF.md); the
  // fixture value should have been a short invalid value such as
  // "great".
  if (fixture.id === "error-insulation-enum") continue;
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

test("fixture error-insulation-enum under the SPEC order: capacity precedes grammar", () => {
  // The fixture's stated purpose is "隔熱等級非法值", but its value
  // "excellent" is nine units and MAX_RAW_UNITS is eight. The SPEC
  // pins the order capacity → surrogate → grammar, so INPUT_LIMIT
  // wins — the same order the run-6 house pattern pins (a too-long
  // value is INPUT_LIMIT, not the grammar error). A short invalid
  // value such as "great" does give ENUM (see the enum test).
  assert.deepEqual(
    run({ area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "excellent" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "insulation", row: null } },
  );
});

// Independent re-derivation of the recommendation, written
// separately from the implementation: the SPEC's standard sizes and
// the 3000 W / 2000 W multi-unit rule, applied to a required wattage.
function expectedRecommendation(requiredWatts) {
  const sizes = [400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000];
  if (requiredWatts <= 3000) {
    return { recommendedWatts: sizes.find((size) => size >= requiredWatts), units: 1 };
  }
  const units = Math.ceil(requiredWatts / 2000);
  return { recommendedWatts: units * 2000, units };
}

test("every fixture success case satisfies the SPEC invariants", () => {
  for (const fixture of coreCases.filter((entry) => entry.expected.ok)) {
    const { result } = fixture.expected;
    // requiredWatts is a multiple of 10 and >= the unrounded raw value.
    assert.equal(result.requiredWatts % 10, 0, fixture.id);
    assert.ok(result.requiredWatts >= Number(result.rawWatts), fixture.id);
    // recommendedWatts >= requiredWatts, and the multi-unit rule holds.
    assert.ok(result.recommendedWatts >= result.requiredWatts, fixture.id);
    assert.deepEqual(
      {
        recommendedWatts: result.recommendedWatts,
        units: result.units,
      },
      expectedRecommendation(result.requiredWatts),
      fixture.id,
    );
    if (result.units > 1) {
      assert.equal(result.recommendedWatts, result.units * 2000, fixture.id);
    }
  }
});

test("ping conversion boundaries, hand-derived from 1 坪 = 400/121 m²", () => {
  // 60.5 坪 = 60.5 x 400/121 = 24200/121 = 200 m² exactly: the upper
  // endpoint is accepted.
  assert.deepEqual(
    run({ area: "60.5", areaUnit: "ping", ceilingHeight: "2.4", insulation: "average" }),
    {
      ok: true,
      result: {
        areaM2: "200.00",
        volumeM3: "480.00",
        wPerM2: 80,
        rawWatts: "16000.0",
        requiredWatts: 16000,
        recommendedWatts: 16000,
        units: 8,
      },
    },
  );
  // 60.51 坪 = 200.0330… m²: just over the upper endpoint.
  assert.deepEqual(
    run({ area: "60.51", areaUnit: "ping", ceilingHeight: "2.4", insulation: "average" }),
    { ok: false, error: { code: "RANGE", field: "area", row: null } },
  );
  // 0.15 坪 = 60/121 = 0.4958… m²: just under the lower endpoint.
  assert.deepEqual(
    run({ area: "0.15", areaUnit: "ping", ceilingHeight: "2.4", insulation: "average" }),
    { ok: false, error: { code: "RANGE", field: "area", row: null } },
  );
  // 0.16 坪 = 64/121 = 0.5289256… m²: accepted; volume
  // 64/121 x 2.4 = 1.269421… → 1.27; raw 64/121 x 80 = 42.314049…
  // → 42.3; required 50; recommended 400.
  assert.deepEqual(
    run({ area: "0.16", areaUnit: "ping", ceilingHeight: "2.4", insulation: "average" }),
    {
      ok: true,
      result: {
        areaM2: "0.53",
        volumeM3: "1.27",
        wPerM2: 80,
        rawWatts: "42.3",
        requiredWatts: 50,
        recommendedWatts: 400,
        units: 1,
      },
    },
  );
});

test("area range endpoints in m², hand-derived", () => {
  // 0.5 m², good insulation, 2.4 m: raw 0.5 x 60 = 30.0 → 30 → 400.
  assert.deepEqual(
    run({ area: "0.5", areaUnit: "m2", ceilingHeight: "2.4", insulation: "good" }),
    {
      ok: true,
      result: {
        areaM2: "0.50",
        volumeM3: "1.20",
        wPerM2: 60,
        rawWatts: "30.0",
        requiredWatts: 30,
        recommendedWatts: 400,
        units: 1,
      },
    },
  );
  assert.deepEqual(
    run({ area: "0.49", areaUnit: "m2", ceilingHeight: "2.4", insulation: "good" }),
    { ok: false, error: { code: "RANGE", field: "area", row: null } },
  );
  assert.deepEqual(
    run({ area: "200.01", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" }),
    { ok: false, error: { code: "RANGE", field: "area", row: null } },
  );
});

test("ceiling-height range endpoints, hand-derived", () => {
  assert.deepEqual(
    run({ area: "10", areaUnit: "m2", ceilingHeight: "2.0", insulation: "average" }),
    {
      ok: true,
      result: {
        areaM2: "10.00",
        volumeM3: "20.00",
        wPerM2: 80,
        rawWatts: "666.7",
        requiredWatts: 670,
        recommendedWatts: 800,
        units: 1,
      },
    },
  );
  assert.deepEqual(
    run({ area: "10", areaUnit: "m2", ceilingHeight: "1.99", insulation: "average" }),
    { ok: false, error: { code: "RANGE", field: "ceilingHeight", row: null } },
  );
  assert.deepEqual(
    run({ area: "10", areaUnit: "m2", ceilingHeight: "4.01", insulation: "average" }),
    { ok: false, error: { code: "RANGE", field: "ceilingHeight", row: null } },
  );
});

test("multi-unit threshold: exactly 3000 W stays single, 3010 W splits", () => {
  // 37.5 x 80 = 3000.0 exactly: still one unit, recommended 3000.
  assert.deepEqual(
    run({ area: "37.5", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" }),
    {
      ok: true,
      result: {
        areaM2: "37.50",
        volumeM3: "90.00",
        wPerM2: 80,
        rawWatts: "3000.0",
        requiredWatts: 3000,
        recommendedWatts: 3000,
        units: 1,
      },
    },
  );
  // 37.51 x 80 = 3000.8 → required 3010 → 2 units, recommended 4000.
  assert.deepEqual(
    run({ area: "37.51", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" }),
    {
      ok: true,
      result: {
        areaM2: "37.51",
        volumeM3: "90.02",
        wPerM2: 80,
        rawWatts: "3000.8",
        requiredWatts: 3010,
        recommendedWatts: 4000,
        units: 2,
      },
    },
  );
});

test("requiredWatts rounds up from the unrounded raw value, not the displayed one", () => {
  // 10.01 x 80 = 800.8 → displayed 800.8, required 810.
  assert.equal(
    run({ area: "10.01", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" }).result
      .requiredWatts,
    810,
  );
  // 6.25 x 60 = 375.0 → required 380 (rounds up to the next 10).
  assert.equal(
    run({ area: "6.25", areaUnit: "m2", ceilingHeight: "2.4", insulation: "good" }).result
      .requiredWatts,
    380,
  );
});

test("each insulation level uses its pinned W/m²", () => {
  const base = { area: "10", areaUnit: "m2", ceilingHeight: "2.4" };
  assert.equal(run({ ...base, insulation: "good" }).result.wPerM2, 60);
  assert.equal(run({ ...base, insulation: "good" }).result.rawWatts, "600.0");
  assert.equal(run({ ...base, insulation: "average" }).result.wPerM2, 80);
  assert.equal(run({ ...base, insulation: "poor" }).result.wPerM2, 130);
  assert.equal(run({ ...base, insulation: "poor" }).result.rawWatts, "1300.0");
});

test("grammar: decimal strings with at most 2 fraction digits, no signs or spaces", () => {
  const base = { areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  for (const bad of ["10.", ".5", "+10", "-10", " 10", "10 ", "1e1", "１０", "10.005"]) {
    assert.deepEqual(run({ ...base, area: bad }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "area", row: null },
    });
  }
  for (const bad of ["2.4.0", "2,4", "2..4"]) {
    assert.deepEqual(run({ area: "10", areaUnit: "m2", ceilingHeight: bad, insulation: "average" }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "ceilingHeight", row: null },
    });
  }
  // "00.5" and "01" fail the leading-zero grammar, like the house
  // integer pattern.
  assert.deepEqual(run({ ...base, area: "00.5" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "area", row: null },
  });
  assert.deepEqual(run({ ...base, area: "01" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "area", row: null },
  });
});

test("short invalid enum values are ENUM in the offending field", () => {
  assert.deepEqual(
    run({ area: "10", areaUnit: "sqm", ceilingHeight: "2.4", insulation: "average" }),
    { ok: false, error: { code: "ENUM", field: "areaUnit", row: null } },
  );
  assert.deepEqual(
    run({ area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "great" }),
    { ok: false, error: { code: "ENUM", field: "insulation", row: null } },
  );
});

test("empty inputs are EMPTY in the offending field", () => {
  const good = { area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  for (const field of ["area", "areaUnit", "ceilingHeight", "insulation"]) {
    assert.deepEqual(run({ ...good, [field]: "" }), {
      ok: false,
      error: { code: "EMPTY", field, row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  const good = { area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  // Nine raw units: over the eight-unit cap.
  assert.deepEqual(run({ ...good, area: "123456.78" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "area", row: null },
  });
  assert.deepEqual(run({ ...good, ceilingHeight: "123456.78" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "ceilingHeight", row: null },
  });
  // Nine units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ ...good, area: "12345678\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "area", row: null },
  });
});

test("lone surrogates are UNICODE within the capacity", () => {
  const good = { area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  assert.deepEqual(run({ ...good, area: "10\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "area", row: null },
  });
  assert.deepEqual(run({ ...good, areaUnit: "m\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "areaUnit", row: null },
  });
});

test("field order: area grammar, then areaUnit, then converted-area range, then height, then insulation", () => {
  const good = { area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  // Area grammar beats a bad areaUnit.
  assert.deepEqual(run({ ...good, area: "12.345", areaUnit: "sqm" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "area", row: null },
  });
  // A bad areaUnit beats an out-of-range area (the range needs the
  // conversion, so it is checked after the unit is known).
  assert.deepEqual(run({ ...good, area: "0", areaUnit: "sqm" }), {
    ok: false,
    error: { code: "ENUM", field: "areaUnit", row: null },
  });
  // The converted-area range beats a bad ceiling height.
  assert.deepEqual(run({ ...good, area: "0", ceilingHeight: "9" }), {
    ok: false,
    error: { code: "RANGE", field: "area", row: null },
  });
  // A bad ceiling height beats a bad insulation value.
  assert.deepEqual(run({ ...good, ceilingHeight: "9", insulation: "great" }), {
    ok: false,
    error: { code: "RANGE", field: "ceilingHeight", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  const good = { area: "10", areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("10"), schema);
  assert.deepEqual(run({ area: "10", areaUnit: "m2", ceilingHeight: "2.4" }), schema);
  assert.deepEqual(run({ ...good, extra: "x" }), schema);
  assert.deepEqual(run({ ...good, area: 10 }), schema);
  assert.deepEqual(run({ ...good, insulation: null }), schema);
  const withAccessor = { areaUnit: "m2", ceilingHeight: "2.4", insulation: "average" };
  Object.defineProperty(withAccessor, "area", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/room-heater.mjs", import.meta.url));
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
