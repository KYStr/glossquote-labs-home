// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-solar-payback-calculator-20261121, spec candidate commit
// 31b1fbf5174698ef9176a1687e1eb68ad5e8ae70, draft spec PR #403,
// SHA-256
// 76d1c9b6c9fcfb5e77d67680b293c88f3041ea28ae059cb55fa53dcf85ff850e).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned tariff table and formulas by hand, never
// from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { m2ToPing, run } from "../public/js/core/solar-payback.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-solar-payback-calculator-20261121");
assert.equal(coreCases.length, 12);

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

const BASE = {
  systemKwp: "9",
  roofAreaM2: "80",
  sunHours: "1250",
  installCost: "540000",
  fitRate: "5.6279",
  selfUsePct: "30",
  retailPrice: "3.00",
};

function withOverrides(overrides) {
  return { ...BASE, ...overrides };
}

test("tariff band boundaries: lower bound inclusive, upper exclusive", () => {
  // [kwp, expected rate, expected source]
  const cases = [
    ["9.99", 5.6279, "table"],
    ["10", 5.3819, "table"],
    ["19.99", 5.3819, "table"],
    ["20", 4.2505, "table"],
    ["49.99", 4.2505, "table"],
    ["50", 4.0459, "table"],
    ["99.99", 4.0459, "table"],
    ["100", 3.7152, "table"],
    ["499.99", 3.7152, "table"],
    ["500", 3.6236, "table"],
  ];
  for (const [kwp, rate, source] of cases) {
    const actual = run(withOverrides({ systemKwp: kwp, fitRate: String(rate) }));
    assert.equal(actual.ok, true, kwp);
    assert.equal(actual.result.fitRateApplied, rate, kwp);
    assert.equal(actual.result.fitSource, source, kwp);
  }
});

test("a rate that differs from the band table is an override", () => {
  const actual = run(withOverrides({ systemKwp: "9", fitRate: "5.00" }));
  assert.equal(actual.ok, true);
  assert.equal(actual.result.fitRateApplied, 5);
  assert.equal(actual.result.fitSource, "override");
  // The same numeric value written differently is still the table rate.
  const same = run(withOverrides({ systemKwp: "9", fitRate: "5.6279" }));
  assert.equal(same.result.fitSource, "table");
});

test("roof boundary: exactly enough area is no warning; a shortfall warns", () => {
  // 9 kWp needs exactly 72 m2.
  assert.equal(run(withOverrides({ roofAreaM2: "72" })).result.roofWarning, null);
  assert.equal(run(withOverrides({ roofAreaM2: "71.99" })).result.roofWarning, "ROOF_TIGHT");
  assert.equal(run(withOverrides({ roofAreaM2: "71.99" })).result.maxFeasibleKwp, 8.9);
  // Floor, not round: 50 m2 fits floor(50/8*10)/10 = 6.2, not 6.3.
  assert.equal(run(withOverrides({ roofAreaM2: "50" })).result.maxFeasibleKwp, 6.2);
  // 70 m2 fits floor(70/8*10)/10 = 8.7, not 8.8.
  assert.equal(run(withOverrides({ roofAreaM2: "70" })).result.maxFeasibleKwp, 8.7);
  assert.equal(run(withOverrides({ roofAreaM2: "80" })).result.maxFeasibleKwp, 10);
});

test("payback exactly 20.0 years is not beyond contract; just over is", () => {
  const exact = run({
    systemKwp: "1",
    roofAreaM2: "10",
    sunHours: "1000",
    installCost: "200000",
    fitRate: "10",
    selfUsePct: "0",
    retailPrice: "3.00",
  });
  assert.deepEqual(exact, {
    ok: true,
    result: {
      annualGenerationKwh: 1000,
      selfUsedKwh: 0,
      exportedKwh: 1000,
      fitRateApplied: 10,
      fitSource: "override",
      exportRevenueTwd: 10000,
      selfUseSavingTwd: 0,
      annualBenefitTwd: 10000,
      paybackYears: 20,
      total20BenefitTwd: 200000,
      net20Twd: 0,
      requiredRoofAreaM2: 8,
      roofWarning: null,
      maxFeasibleKwp: 1.2,
      beyondContract: false,
    },
  });
  const over = run({
    systemKwp: "1",
    roofAreaM2: "10",
    sunHours: "1000",
    installCost: "200001",
    fitRate: "10",
    selfUsePct: "0",
    retailPrice: "3.00",
  });
  assert.equal(over.ok, true);
  assert.equal(over.result.paybackYears, 20);
  assert.equal(over.result.beyondContract, true);
  assert.equal(over.result.net20Twd, -1);
});

test("exact decimal rounding: a .5 boundary is not flipped by binary floats", () => {
  // 50 kWh exported at a 1.15 tariff is exactly 57.5 in decimal
  // (57.49999999999999 in binary floats). Half away from zero gives
  // 58 for the revenue, the annual benefit, and the 20-year total.
  const actual = run({
    systemKwp: "0.1",
    roofAreaM2: "80",
    sunHours: "500",
    installCost: "100000",
    fitRate: "1.15",
    selfUsePct: "0",
    retailPrice: "3.00",
  });
  assert.deepEqual(actual, {
    ok: true,
    result: {
      annualGenerationKwh: 50,
      selfUsedKwh: 0,
      exportedKwh: 50,
      fitRateApplied: 1.15,
      fitSource: "override",
      exportRevenueTwd: 58,
      selfUseSavingTwd: 0,
      annualBenefitTwd: 58,
      paybackYears: 1739.1,
      total20BenefitTwd: 1150,
      net20Twd: -98850,
      requiredRoofAreaM2: 0.8,
      roofWarning: null,
      maxFeasibleKwp: 10,
      beyondContract: true,
    },
  });
});

test("a negative .5 net benefit rounds away from zero", () => {
  // Same unrounded benefit as the roof-too-small fixture (58341.625,
  // 20-year total 1166832.5) with a larger cost: net -833167.5 -> -833168.
  const actual = run({
    systemKwp: "10",
    roofAreaM2: "60",
    sunHours: "1250",
    installCost: "2000000",
    fitRate: "5.3819",
    selfUsePct: "30",
    retailPrice: "3.00",
  });
  assert.equal(actual.ok, true);
  assert.equal(actual.result.annualBenefitTwd, 58342);
  assert.equal(actual.result.total20BenefitTwd, 1166833);
  assert.equal(actual.result.net20Twd, -833168);
  assert.equal(actual.result.paybackYears, 34.3);
  assert.equal(actual.result.roofWarning, "ROOF_TIGHT");
  assert.equal(actual.result.beyondContract, true);
});

test("range endpoints are accepted; one step outside is RANGE in the offending field", () => {
  const endpoints = [
    { systemKwp: "0.1", roofAreaM2: "1", sunHours: "500", installCost: "1", fitRate: "0.0001", selfUsePct: "0", retailPrice: "0.01" },
    { systemKwp: "500", roofAreaM2: "100000", sunHours: "2000", installCost: "100000000", fitRate: "20", selfUsePct: "100", retailPrice: "20" },
  ];
  for (const input of endpoints) assert.equal(run(input).ok, true, JSON.stringify(input));
  const outside = [
    [{ systemKwp: "0.09" }, "systemKwp"],
    [{ systemKwp: "500.01" }, "systemKwp"],
    [{ roofAreaM2: "0.99" }, "roofAreaM2"],
    [{ roofAreaM2: "100000.01" }, "roofAreaM2"],
    [{ sunHours: "499.9" }, "sunHours"],
    [{ sunHours: "2000.1" }, "sunHours"],
    [{ installCost: "0" }, "installCost"],
    [{ installCost: "100000001" }, "installCost"],
    [{ fitRate: "0.0000" }, "fitRate"],
    [{ fitRate: "20.0001" }, "fitRate"],
    [{ selfUsePct: "-0.1" }, "selfUsePct"],
    [{ retailPrice: "0.00" }, "retailPrice"],
    [{ retailPrice: "20.01" }, "retailPrice"],
  ];
  for (const [overrides, field] of outside) {
    // "-0.1" fails grammar first (no sign allowed), so it is
    // DECIMAL_FORMAT, not RANGE; every other case here is RANGE.
    const expectedCode = field === "selfUsePct" && overrides.selfUsePct === "-0.1" ? "DECIMAL_FORMAT" : "RANGE";
    assert.deepEqual(run(withOverrides(overrides)), {
      ok: false,
      error: { code: expectedCode, field, row: null },
    });
  }
});

test("grammar: decimal strings only, no sign/space/exponent/commas, integer part 0 or non-zero-leading", () => {
  for (const bad of [".5", "5.", "+9", "-9", " 9", "9 ", "09", "00", "1e3", "1,000", "９", "9..5"]) {
    assert.deepEqual(run(withOverrides({ systemKwp: bad })), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "systemKwp", row: null },
    });
  }
  // "0" passes grammar but fails the range (systemKwp 0.1-500).
  assert.deepEqual(run(withOverrides({ systemKwp: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "systemKwp", row: null },
  });
});

test("too many decimal places are DECIMAL_FORMAT in the offending field", () => {
  const cases = [
    [{ systemKwp: "9.999" }, "systemKwp"],
    [{ roofAreaM2: "80.999" }, "roofAreaM2"],
    [{ sunHours: "1250.55" }, "sunHours"],
    [{ installCost: "540000.5" }, "installCost"],
    [{ fitRate: "5.62795" }, "fitRate"],
    [{ selfUsePct: "30.55" }, "selfUsePct"],
    [{ retailPrice: "3.005" }, "retailPrice"],
  ];
  for (const [overrides, field] of cases) {
    assert.deepEqual(run(withOverrides(overrides)), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field, row: null },
    });
  }
});

test("empty inputs are EMPTY in the offending field", () => {
  for (const field of ["systemKwp", "roofAreaM2", "sunHours", "installCost", "fitRate", "selfUsePct", "retailPrice"]) {
    assert.deepEqual(run(withOverrides({ [field]: "" })), {
      ok: false,
      error: { code: "EMPTY", field, row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // 17 units: capacity precedes grammar.
  assert.deepEqual(run(withOverrides({ systemKwp: "12345678901234567" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "systemKwp", row: null },
  });
  assert.deepEqual(run(withOverrides({ systemKwp: "9.999999999999999" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "systemKwp", row: null },
  });
  // Exactly 16 units: capacity passes, grammar/range decide.
  assert.deepEqual(run(withOverrides({ systemKwp: "1234567890123456" })), {
    ok: false,
    error: { code: "RANGE", field: "systemKwp", row: null },
  });
  // Five units including a lone surrogate: the limit still wins only
  // when the raw is over the limit; at exactly 16 units the grammar
  // fails first (the SPEC has no UNICODE code).
  assert.deepEqual(run(withOverrides({ systemKwp: "123456789012345\uD800" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "systemKwp", row: null },
  });
});

test("field order: earlier fields are fully validated before later ones", () => {
  assert.deepEqual(run(withOverrides({ systemKwp: "", roofAreaM2: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "systemKwp", row: null },
  });
  assert.deepEqual(run(withOverrides({ systemKwp: "9", roofAreaM2: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "roofAreaM2", row: null },
  });
  assert.deepEqual(run(withOverrides({ systemKwp: "501", sunHours: "99999" })), {
    ok: false,
    error: { code: "RANGE", field: "systemKwp", row: null },
  });
  assert.deepEqual(run(withOverrides({ fitRate: "5.62795", selfUsePct: "101" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "fitRate", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("9"), schema);
  assert.deepEqual(run({ systemKwp: "9" }), schema);
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  assert.deepEqual(run({ ...BASE, systemKwp: 9 }), schema);
  assert.deepEqual(run({ ...BASE, retailPrice: null }), schema);
  const withAccessor = { ...BASE };
  delete withAccessor.systemKwp;
  Object.defineProperty(withAccessor, "systemKwp", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("rounded outputs stay consistent within 1 unit", () => {
  // The SPEC's identities hold on unrounded values; after rounding
  // each leg to integers the sums can differ by at most 1.
  const inputs = [
    BASE,
    withOverrides({ systemKwp: "7.33", sunHours: "1333.3", selfUsePct: "33.3", fitRate: "4.1234", retailPrice: "2.99" }),
    withOverrides({ systemKwp: "123.45", sunHours: "987.6", selfUsePct: "66.6", fitRate: "3.7152", retailPrice: "5.55" }),
    withOverrides({ systemKwp: "0.5", sunHours: "2000", selfUsePct: "99.9", fitRate: "0.0001", retailPrice: "0.01" }),
  ];
  for (const input of inputs) {
    const outcome = run(input);
    assert.equal(outcome.ok, true, JSON.stringify(input));
    const r = outcome.result;
    assert.ok(Math.abs(r.exportedKwh + r.selfUsedKwh - r.annualGenerationKwh) <= 1);
    assert.ok(Math.abs(r.exportRevenueTwd + r.selfUseSavingTwd - r.annualBenefitTwd) <= 1);
  }
});

test("ping conversion is display-only, 1 ping = 400/121 m2, to 2 decimals", () => {
  assert.equal(m2ToPing("80"), "24.20");
  assert.equal(m2ToPing("72"), "21.78");
  assert.equal(m2ToPing("8"), "2.42");
  assert.equal(m2ToPing("100"), "30.25");
  assert.equal(m2ToPing("0"), "0.00");
  assert.equal(m2ToPing("1"), "0.30");
  assert.equal(m2ToPing("400"), "121.00");
  assert.equal(m2ToPing("80.55"), "24.37");
  assert.equal(m2ToPing("abc"), null);
  assert.equal(m2ToPing("5."), null);
  assert.equal(m2ToPing(""), null);
  assert.equal(m2ToPing(80), null);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/solar-payback.mjs", import.meta.url));
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
