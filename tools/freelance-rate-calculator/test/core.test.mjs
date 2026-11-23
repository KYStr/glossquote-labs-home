// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-freelance-rate-calculator-20261121, spec candidate commit
// 468c6cd604644154701002a52c3d6949c3f726a0, draft spec PR #374,
// SHA-256
// 74d66bc65236d693cb1f0827d728417c5b86ccddfc97926ded242634ddd1a1c9).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §4 formulas by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/freelance-rate.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-freelance-rate-calculator-20261121");
assert.equal(coreCases.length, 14);

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
// implementation's rational arithmetic: scaled-integer arithmetic
// (every decimal input parsed to integer tenths, all divisions done
// as integer half-up on scaled numerators), checked against every
// literal success fixture.
function parseTenths(value) {
  const dot = value.indexOf(".");
  if (dot === -1) return BigInt(value) * 10n;
  return BigInt(value.slice(0, dot)) * 10n + BigInt(value.slice(dot + 1));
}

function halfUpDiv(num, den) {
  // Half-up rounding of non-negative num/den to a whole number.
  return (2n * num + den) / (2n * den);
}

function expectedResult(input) {
  const target = BigInt(input.targetAnnualIncome);
  const days = BigInt(input.workingDaysPerYear);
  const hours10 = parseTenths(input.hoursPerDay);
  const util10 = parseTenths(input.billableUtilizationPercent);
  const overhead10 = parseTenths(input.overheadPercent);
  // gross = target x (1000 + overhead10) / 1000
  const grossNum = target * (1000n + overhead10);
  const grossDen = 1000n;
  // billableDays = days x util10 / 1000
  const bdNum = days * util10;
  const bdDen = 1000n;
  // billableHours = billableDays x hours10 / 10
  const bhNum = bdNum * hours10;
  const bhDen = bdDen * 10n;
  const dayNum = grossNum * bdDen;
  const dayDen = grossDen * bdNum;
  const hourNum = grossNum * bhDen;
  const hourDen = grossDen * bhNum;
  const grossTarget = Number(halfUpDiv(grossNum, grossDen));
  const billableDays = Number(halfUpDiv(bdNum * 10n, bdDen)) / 10;
  const billableHours = Number(halfUpDiv(bhNum * 10n, bhDen)) / 10;
  const dayRate = Number(halfUpDiv(dayNum, dayDen));
  const hourlyRate = Number(halfUpDiv(hourNum, hourDen));
  const monthlyTarget = Number(halfUpDiv(target, 12n));
  return { grossTarget, billableDays, billableHours, dayRate, hourlyRate, monthlyTarget };
}

test("independent scaled-integer re-derivation matches every success fixture", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    assert.deepEqual(expectedResult(fixture.input), fixture.expected.result, fixture.id);
  }
});

test("rates are computed from unrounded exact values, not rounded intermediates", () => {
  // days 201, utilization 62.5% -> billableDays exact 125.625,
  // displayed 125.6. gross 1,000,000. dayRate from the exact value:
  // 1,000,000 / 125.625 = 7960.199... -> 7960. From the rounded
  // 125.6 it would be 7961.78... -> 7962.
  assert.deepEqual(
    run({
      targetAnnualIncome: "1000000",
      workingDaysPerYear: "201",
      hoursPerDay: "8",
      billableUtilizationPercent: "62.5",
      overheadPercent: "0",
    }),
    {
      ok: true,
      result: {
        grossTarget: 1000000,
        billableDays: 125.6,
        billableHours: 1005,
        dayRate: 7960,
        hourlyRate: 995,
        monthlyTarget: 83333,
      },
    },
  );
});

test("half-up boundaries: 0.5 rounds up, 0.49 rounds down", () => {
  // dayRate 1.5 -> 2, monthlyTarget 12.5 -> 13 (both exactly .5).
  assert.deepEqual(
    run({
      targetAnnualIncome: "150",
      workingDaysPerYear: "200",
      hoursPerDay: "8",
      billableUtilizationPercent: "50",
      overheadPercent: "0",
    }),
    {
      ok: true,
      result: {
        grossTarget: 150,
        billableDays: 100,
        billableHours: 800,
        dayRate: 2,
        hourlyRate: 0,
        monthlyTarget: 13,
      },
    },
  );
  // dayRate 1.49 -> 1 (gross 149, billableDays 100).
  const below = run({
    targetAnnualIncome: "149",
    workingDaysPerYear: "200",
    hoursPerDay: "8",
    billableUtilizationPercent: "50",
    overheadPercent: "0",
  });
  assert.equal(below.ok, true);
  assert.equal(below.result.dayRate, 1);
  // billableDays 0.05 (1 day x 5%) -> 0.1 at one decimal (half-up on
  // the 0.5-tenths boundary); 0.01 (1 day x 1%) -> 0.0.
  const tinyUp = run({
    targetAnnualIncome: "100000",
    workingDaysPerYear: "1",
    hoursPerDay: "8",
    billableUtilizationPercent: "5",
    overheadPercent: "0",
  });
  assert.equal(tinyUp.ok, true);
  assert.equal(tinyUp.result.billableDays, 0.1);
  assert.equal(tinyUp.result.billableHours, 0.4);
  assert.equal(tinyUp.result.dayRate, 2000000);
  assert.equal(tinyUp.result.hourlyRate, 250000);
  assert.equal(tinyUp.result.monthlyTarget, 8333);
});

test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  assert.equal(run({ ...base, targetAnnualIncome: "1" }).ok, true);
  assert.equal(run({ ...base, targetAnnualIncome: "100000000" }).ok, true);
  assert.equal(run({ ...base, workingDaysPerYear: "1" }).ok, true);
  assert.equal(run({ ...base, workingDaysPerYear: "365" }).ok, true);
  assert.equal(run({ ...base, hoursPerDay: "0.5" }).ok, true);
  assert.equal(run({ ...base, hoursPerDay: "24" }).ok, true);
  assert.equal(run({ ...base, billableUtilizationPercent: "1" }).ok, true);
  assert.equal(run({ ...base, billableUtilizationPercent: "100" }).ok, true);
  assert.equal(run({ ...base, overheadPercent: "0" }).ok, true);
  assert.equal(run({ ...base, overheadPercent: "100" }).ok, true);
  assert.deepEqual(run({ ...base, targetAnnualIncome: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "targetAnnualIncome", row: null },
  });
  assert.deepEqual(run({ ...base, targetAnnualIncome: "100000001" }), {
    ok: false,
    error: { code: "RANGE", field: "targetAnnualIncome", row: null },
  });
  assert.deepEqual(run({ ...base, workingDaysPerYear: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "workingDaysPerYear", row: null },
  });
  assert.deepEqual(run({ ...base, hoursPerDay: "0.4" }), {
    ok: false,
    error: { code: "RANGE", field: "hoursPerDay", row: null },
  });
  assert.deepEqual(run({ ...base, hoursPerDay: "24.1" }), {
    ok: false,
    error: { code: "RANGE", field: "hoursPerDay", row: null },
  });
  assert.deepEqual(run({ ...base, billableUtilizationPercent: "0.9" }), {
    ok: false,
    error: { code: "RANGE", field: "billableUtilizationPercent", row: null },
  });
  assert.deepEqual(run({ ...base, billableUtilizationPercent: "100.1" }), {
    ok: false,
    error: { code: "RANGE", field: "billableUtilizationPercent", row: null },
  });
  assert.deepEqual(run({ ...base, overheadPercent: "100.1" }), {
    ok: false,
    error: { code: "RANGE", field: "overheadPercent", row: null },
  });
});

test("integer grammar: ASCII decimal integers only, zero or non-zero leading", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  for (const bad of ["12.5", "+120", "-120", " 120", "120 ", "0120", "00", "1e2", "１２０", "12,000"]) {
    assert.deepEqual(run({ ...base, targetAnnualIncome: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "targetAnnualIncome", row: null },
    });
  }
  for (const bad of ["22.5", "0220", "+220"]) {
    assert.deepEqual(run({ ...base, workingDaysPerYear: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "workingDaysPerYear", row: null },
    });
  }
  // "0" passes grammar but fails the range.
  assert.deepEqual(run({ ...base, targetAnnualIncome: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "targetAnnualIncome", row: null },
  });
});

test("decimal grammar: at most one fractional digit, no sign or space", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  for (const bad of ["8.25", "8.250", "+8", "-8", " 8", "8 ", "08", "8.", ".5", "8e0", "８"]) {
    assert.deepEqual(run({ ...base, hoursPerDay: bad }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "hoursPerDay", row: null },
    });
  }
  for (const bad of ["70.25", "070", "70."]) {
    assert.deepEqual(run({ ...base, billableUtilizationPercent: bad }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "billableUtilizationPercent", row: null },
    });
  }
  assert.deepEqual(run({ ...base, overheadPercent: "20.55" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "overheadPercent", row: null },
  });
  // One fractional digit is legal, including a trailing zero.
  assert.equal(run({ ...base, hoursPerDay: "8.0" }).ok, true);
  assert.equal(run({ ...base, billableUtilizationPercent: "70.0" }).ok, true);
});

test("empty inputs are EMPTY in the offending field", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  for (const field of Object.keys(base)) {
    assert.deepEqual(run({ ...base, [field]: "" }), {
      ok: false,
      error: { code: "EMPTY", field, row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  // 13 units: capacity precedes grammar, so a too-long decimal is
  // INPUT_LIMIT, not INTEGER_FORMAT or DECIMAL_FORMAT.
  assert.deepEqual(run({ ...base, targetAnnualIncome: "1234567890123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetAnnualIncome", row: null },
  });
  assert.deepEqual(run({ ...base, targetAnnualIncome: "1200000.12345" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetAnnualIncome", row: null },
  });
  assert.deepEqual(run({ ...base, hoursPerDay: "12345678901.5" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "hoursPerDay", row: null },
  });
  // 12 units is within capacity: grammar is reached instead.
  assert.deepEqual(run({ ...base, targetAnnualIncome: "12345678901.5".slice(0, 12) }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "targetAnnualIncome", row: null },
  });
  // Thirteen units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ ...base, targetAnnualIncome: "123456789012\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetAnnualIncome", row: null },
  });
});

test("lone surrogates are UNICODE at exactly twelve units", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  assert.deepEqual(run({ ...base, targetAnnualIncome: "12345678901\uD800".slice(0, 12) }), {
    ok: false,
    error: { code: "UNICODE", field: "targetAnnualIncome", row: null },
  });
  assert.deepEqual(run({ ...base, hoursPerDay: "8\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "hoursPerDay", row: null },
  });
});

test("field order: earlier fields are fully validated before later ones", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  assert.deepEqual(run({ ...base, targetAnnualIncome: "", workingDaysPerYear: "999" }), {
    ok: false,
    error: { code: "EMPTY", field: "targetAnnualIncome", row: null },
  });
  assert.deepEqual(run({ ...base, workingDaysPerYear: "", hoursPerDay: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "workingDaysPerYear", row: null },
  });
  assert.deepEqual(run({ ...base, hoursPerDay: "8.25", billableUtilizationPercent: "0" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "hoursPerDay", row: null },
  });
  assert.deepEqual(
    run({ ...base, billableUtilizationPercent: "0", overheadPercent: "101" }),
    {
      ok: false,
      error: { code: "RANGE", field: "billableUtilizationPercent", row: null },
    },
  );
});

test("schema violations are SCHEMA with field null", () => {
  const base = {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  };
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("1200000"), schema);
  assert.deepEqual(run({ targetAnnualIncome: "1200000" }), schema);
  assert.deepEqual(run({ ...base, extra: "x" }), schema);
  assert.deepEqual(run({ ...base, targetAnnualIncome: 1200000 }), schema);
  assert.deepEqual(run({ ...base, hoursPerDay: null }), schema);
  const withAccessor = { ...base };
  delete withAccessor.targetAnnualIncome;
  Object.defineProperty(withAccessor, "targetAnnualIncome", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/freelance-rate.mjs", import.meta.url));
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
