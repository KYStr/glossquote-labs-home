// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-carbon-footprint-calculator-20261121, spec candidate commit
// 5ce91f2f044624b42522398aa51b90d90fcecf10, draft spec PR #402,
// SHA-256
// dd84d4401036eac5313242675b3cc2eedfd545f3f0a5e539159cfab27452b0d5).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned factor table and rounding rules by hand,
// never from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/carbon-footprint.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-carbon-footprint-calculator-20261121");
assert.equal(coreCases.length, 12);

const DEFAULT_INPUT = {
  electricityKwhPerMonth: "300",
  carKmPerYear: "0",
  carFuelLPer100Km: "8",
  carFuelType: "gasoline",
  busKmPerYear: "0",
  railKmPerYear: "0",
  flightShortKmPerYear: "0",
  flightLongKmPerYear: "0",
  dietBeefKgPerWeek: "0",
  dietPorkKgPerWeek: "0",
  dietPoultryKgPerWeek: "0",
  dietFishKgPerWeek: "0",
  dietEggsKgPerWeek: "0",
  dietRiceKgPerWeek: "0",
};

function withOverrides(overrides) {
  return { ...DEFAULT_INPUT, ...overrides };
}

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

test("total is the unrounded sum rounded, not the sum of rounded categories", () => {
  // Hand-derived: bus 25 km x 0.102 = 2.55 -> 2.6; rail 25 km x 0.035
  // = 0.875 -> 0.9. Rounded categories sum to 3.5, but the unrounded
  // total is 3.425 -> 3.4. Shares: 2.55/3.425 = 74.45% -> 74.5;
  // 0.875/3.425 = 25.55% -> 25.5.
  assert.deepEqual(
    run(withOverrides({ electricityKwhPerMonth: "0", busKmPerYear: "25", railKmPerYear: "25" })),
    {
      ok: true,
      result: {
        categories: {
          electricity: { kgCo2e: 0, sharePct: 0 },
          car: { kgCo2e: 0, sharePct: 0 },
          bus: { kgCo2e: 2.6, sharePct: 74.5 },
          rail: { kgCo2e: 0.9, sharePct: 25.5 },
          flights: { kgCo2e: 0, sharePct: 0 },
          diet: { kgCo2e: 0, sharePct: 0 },
        },
        totalKgCo2e: 3.4,
        totalTonnesCo2e: 0,
      },
    },
  );
});

test("each factor independently, hand-derived", () => {
  // Electricity 100 kWh/month: 100 x 12 x 0.471 = 565.2.
  assert.equal(
    run(withOverrides({ electricityKwhPerMonth: "100" })).result.categories.electricity.kgCo2e,
    565.2,
  );
  // Diesel 10000 km at 5 L/100 km: 500 L x 2.68 = 1340.0.
  assert.equal(
    run(
      withOverrides({
        electricityKwhPerMonth: "0",
        carKmPerYear: "10000",
        carFuelLPer100Km: "5",
        carFuelType: "diesel",
      }),
    ).result.categories.car.kgCo2e,
    1340,
  );
  // Beef 1 kg/week: 52 x 99.5 = 5174.0.
  assert.equal(
    run(withOverrides({ electricityKwhPerMonth: "0", dietBeefKgPerWeek: "1" })).result
      .categories.diet.kgCo2e,
    5174,
  );
  // Rice 2 kg/week: 104 x 4.5 = 468.0.
  assert.equal(
    run(withOverrides({ electricityKwhPerMonth: "0", dietRiceKgPerWeek: "2" })).result.categories
      .diet.kgCo2e,
    468,
  );
});

test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  assert.equal(run(withOverrides({ electricityKwhPerMonth: "100000" })).ok, true);
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: "100001" })), {
    ok: false,
    error: { code: "RANGE", field: "electricityKwhPerMonth", row: null },
  });
  assert.equal(run(withOverrides({ carKmPerYear: "500000" })).ok, true);
  assert.deepEqual(run(withOverrides({ carKmPerYear: "500001" })), {
    ok: false,
    error: { code: "RANGE", field: "carKmPerYear", row: null },
  });
  // Fuel use 0 is accepted (zero distance means zero emissions).
  assert.equal(
    run(withOverrides({ electricityKwhPerMonth: "0", carFuelLPer100Km: "0" })).ok,
    true,
  );
  assert.equal(run(withOverrides({ carFuelLPer100Km: "100" })).ok, true);
  assert.deepEqual(run(withOverrides({ carFuelLPer100Km: "100.01" })), {
    ok: false,
    error: { code: "RANGE", field: "carFuelLPer100Km", row: null },
  });
  assert.equal(run(withOverrides({ busKmPerYear: "1000000" })).ok, true);
  assert.deepEqual(run(withOverrides({ busKmPerYear: "1000001" })), {
    ok: false,
    error: { code: "RANGE", field: "busKmPerYear", row: null },
  });
  assert.equal(run(withOverrides({ dietRiceKgPerWeek: "100" })).ok, true);
  assert.deepEqual(run(withOverrides({ dietRiceKgPerWeek: "101" })), {
    ok: false,
    error: { code: "RANGE", field: "dietRiceKgPerWeek", row: null },
  });
});

test("grammar: ASCII decimals with at most 2 places, zero or non-zero leading", () => {
  for (const bad of [
    "12.345",
    "+300",
    "-300",
    " 300",
    "300 ",
    "0300",
    "00",
    "1e2",
    ".5",
    "5.",
    "３００",
    "1,000",
  ]) {
    assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: bad })), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "electricityKwhPerMonth", row: null },
    });
  }
  // "0" and "0.5" pass grammar (and the range, since the minimum is 0).
  assert.equal(run(withOverrides({ electricityKwhPerMonth: "0" })).ok, true);
  assert.equal(run(withOverrides({ electricityKwhPerMonth: "0.5" })).ok, true);
  assert.equal(run(withOverrides({ electricityKwhPerMonth: "300.00" })).ok, true);
});

test("fuel type: only gasoline or diesel, case-sensitive", () => {
  assert.deepEqual(run(withOverrides({ carFuelType: "electric" })), {
    ok: false,
    error: { code: "SCHEMA", field: "carFuelType", row: null },
  });
  assert.deepEqual(run(withOverrides({ carFuelType: "GASOLINE" })), {
    ok: false,
    error: { code: "SCHEMA", field: "carFuelType", row: null },
  });
  assert.deepEqual(run(withOverrides({ carFuelType: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "carFuelType", row: null },
  });
  assert.equal(run(withOverrides({ carFuelType: "diesel" })).ok, true);
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "electricityKwhPerMonth", row: null },
  });
  assert.deepEqual(run(withOverrides({ dietRiceKgPerWeek: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "dietRiceKgPerWeek", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // 13 units: over the 12-unit cap even though the value is numeric.
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "electricityKwhPerMonth", row: null },
  });
  // Exactly 12 units passes capacity, then fails the range.
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: "123456789012" })), {
    ok: false,
    error: { code: "RANGE", field: "electricityKwhPerMonth", row: null },
  });
  // 13 units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: "123456789012\uD800" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "electricityKwhPerMonth", row: null },
  });
  // A 13-unit fuel type is INPUT_LIMIT, not SCHEMA.
  assert.deepEqual(run(withOverrides({ carFuelType: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "carFuelType", row: null },
  });
});

test("lone surrogates are UNICODE at or under the limit", () => {
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: "30\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "electricityKwhPerMonth", row: null },
  });
  assert.deepEqual(run(withOverrides({ dietRiceKgPerWeek: "2\uDC00" })), {
    ok: false,
    error: { code: "UNICODE", field: "dietRiceKgPerWeek", row: null },
  });
});

test("field order: earlier fields are fully validated before later ones", () => {
  assert.deepEqual(
    run(withOverrides({ electricityKwhPerMonth: "", carKmPerYear: "junk" })),
    {
      ok: false,
      error: { code: "EMPTY", field: "electricityKwhPerMonth", row: null },
    },
  );
  assert.deepEqual(
    run(withOverrides({ carKmPerYear: "", carFuelType: "electric" })),
    {
      ok: false,
      error: { code: "EMPTY", field: "carKmPerYear", row: null },
    },
  );
  assert.deepEqual(
    run(withOverrides({ carFuelType: "electric", busKmPerYear: "junk" })),
    {
      ok: false,
      error: { code: "SCHEMA", field: "carFuelType", row: null },
    },
  );
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("300"), schema);
  assert.deepEqual(run({ electricityKwhPerMonth: "300" }), schema);
  assert.deepEqual(run(withOverrides({ extra: "x" })), schema);
  assert.deepEqual(run(withOverrides({ electricityKwhPerMonth: 300 })), schema);
  assert.deepEqual(run(withOverrides({ dietRiceKgPerWeek: null })), schema);
  const withAccessor = withOverrides({});
  delete withAccessor.electricityKwhPerMonth;
  Object.defineProperty(withAccessor, "electricityKwhPerMonth", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/carbon-footprint.mjs", import.meta.url));
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
