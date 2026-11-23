// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-life-insurance-calculator-20261121, spec candidate commit
// 5b7ffce437d5f3dc16f2d75b3a0d03e2c5d0a8d9, draft spec PR #401,
// SHA-256
// 59a18a7ba9ec28d89c8c96cde1bfaf9256199605d2a9aaff1f093d8b9a7ba811).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's inputsOutputs §2–§4 rules by hand (and cross-checked
// with an independent Python recomputation), never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { DEFAULTS, run } from "../public/js/core/life-insurance.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-life-insurance-calculator-20261121");
assert.equal(coreCases.length, 15);

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

// Independent re-derivation of the needs approach, written separately
// from the implementation: plain integer arithmetic over the same
// SPEC formula.
function expectedResult(input) {
  const incomeReplacement = input.annualIncome * input.supportYears;
  const educationTotal = input.educationPerChild * input.dependents;
  const needsTotal =
    incomeReplacement +
    input.mortgageBalance +
    input.otherDebts +
    input.finalExpenses +
    educationTotal;
  const totalOffsets = input.existingCoverage + input.liquidAssets;
  const recommendedCoverage = Math.max(0, needsTotal - totalOffsets);
  const multipleBenchmark = input.annualIncome * 10;
  return {
    breakdown: {
      incomeReplacement,
      mortgageBalance: input.mortgageBalance,
      otherDebts: input.otherDebts,
      finalExpenses: input.finalExpenses,
      educationTotal,
    },
    needsTotal,
    offsets: {
      existingCoverage: input.existingCoverage,
      liquidAssets: input.liquidAssets,
      totalOffsets,
    },
    recommendedCoverage,
    multipleBenchmark,
    differenceVsBenchmark: recommendedCoverage - multipleBenchmark,
    status: recommendedCoverage === 0 ? "covered" : "shortfall",
  };
}

function draft(overrides) {
  return {
    annualIncome: "1200000",
    supportYears: "10",
    dependents: "2",
    educationPerChild: "500000",
    mortgageBalance: "3000000",
    otherDebts: "200000",
    finalExpenses: "350000",
    existingCoverage: "1000000",
    liquidAssets: "500000",
    ...overrides,
  };
}

function numbers(input) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, Number(value)]),
  );
}

test("all fields at their maxima: hand-derived totals", () => {
  const input = {
    annualIncome: "99999999",
    supportYears: "40",
    dependents: "10",
    educationPerChild: "9999999",
    mortgageBalance: "99999999",
    otherDebts: "99999999",
    finalExpenses: "9999999",
    existingCoverage: "99999999",
    liquidAssets: "99999999",
  };
  // incomeReplacement 99,999,999 x 40 = 3,999,999,960; education
  // 9,999,999 x 10 = 99,999,990; needsTotal 4,309,999,947; offsets
  // 199,999,998; recommended 4,109,999,949; benchmark 999,999,990;
  // difference 3,109,999,959.
  const actual = run(input);
  assert.deepEqual(actual, { ok: true, result: expectedResult(numbers(input)) });
  assert.equal(actual.result.needsTotal, 4309999947);
  assert.equal(actual.result.recommendedCoverage, 4109999949);
  assert.equal(actual.result.differenceVsBenchmark, 3109999959);
  assert.equal(actual.result.status, "shortfall");
});

test("needsTotal exactly equal to totalOffsets gives 0 and covered; one more gives 1", () => {
  const base = {
    annualIncome: "1000000",
    supportYears: "10",
    dependents: "0",
    educationPerChild: "0",
    mortgageBalance: "0",
    otherDebts: "0",
    finalExpenses: "0",
    existingCoverage: "10000000",
    liquidAssets: "0",
  };
  const exact = run(base);
  assert.equal(exact.ok, true);
  assert.equal(exact.result.needsTotal, 10000000);
  assert.equal(exact.result.recommendedCoverage, 0);
  assert.equal(exact.result.status, "covered");
  assert.equal(exact.result.differenceVsBenchmark, -10000000);

  const oneMore = run({ ...base, existingCoverage: "9999999" });
  assert.equal(oneMore.ok, true);
  assert.equal(oneMore.result.recommendedCoverage, 1);
  assert.equal(oneMore.result.status, "shortfall");
  assert.equal(oneMore.result.differenceVsBenchmark, -9999999);
});

test("supportYears 0 and dependents 0 make educationTotal 0 whatever educationPerChild is", () => {
  const actual = run(draft({ supportYears: "0", dependents: "0", educationPerChild: "9999999" }));
  assert.equal(actual.ok, true);
  assert.equal(actual.result.breakdown.incomeReplacement, 0);
  assert.equal(actual.result.breakdown.educationTotal, 0);
  assert.deepEqual(actual, { ok: true, result: expectedResult(numbers(draft({
    supportYears: "0",
    dependents: "0",
    educationPerChild: "9999999",
  }))) });
});

test("the 10x benchmark never feeds the recommendation", () => {
  // High income, one year, no other need: the benchmark dwarfs the
  // need, but the recommendation follows the needs total.
  const actual = run(draft({
    annualIncome: "99999999",
    supportYears: "1",
    dependents: "0",
    educationPerChild: "0",
    mortgageBalance: "0",
    otherDebts: "0",
    finalExpenses: "0",
    existingCoverage: "0",
    liquidAssets: "0",
  }));
  assert.equal(actual.ok, true);
  assert.equal(actual.result.recommendedCoverage, 99999999);
  assert.equal(actual.result.multipleBenchmark, 999999990);
  assert.equal(actual.result.differenceVsBenchmark, -899999991);
});

test("removing either offset never shrinks the recommendation", () => {
  const base = run(draft());
  assert.equal(base.ok, true);
  const noCoverage = run(draft({ existingCoverage: "0" }));
  assert.equal(noCoverage.ok, true);
  assert.ok(noCoverage.result.recommendedCoverage >= base.result.recommendedCoverage);
  assert.equal(noCoverage.result.recommendedCoverage, 16050000);
  const noAssets = run(draft({ liquidAssets: "0" }));
  assert.equal(noAssets.ok, true);
  assert.ok(noAssets.result.recommendedCoverage >= base.result.recommendedCoverage);
  assert.equal(noAssets.result.recommendedCoverage, 15550000);
});

test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  const limits = [
    ["annualIncome", "99999999"],
    ["supportYears", "40"],
    ["dependents", "10"],
    ["educationPerChild", "9999999"],
    ["mortgageBalance", "99999999"],
    ["otherDebts", "99999999"],
    ["finalExpenses", "9999999"],
    ["existingCoverage", "99999999"],
    ["liquidAssets", "99999999"],
  ];
  const zeros = draft({
    annualIncome: "0",
    supportYears: "0",
    dependents: "0",
    educationPerChild: "0",
    mortgageBalance: "0",
    otherDebts: "0",
    finalExpenses: "0",
    existingCoverage: "0",
    liquidAssets: "0",
  });
  assert.equal(run(zeros).ok, true);
  for (const [field, max] of limits) {
    assert.equal(run(draft({ [field]: max })).ok, true, `${field} max`);
  }
  // For the four fields whose max+1 still fits in 8 raw units,
  // one unit outside the range is RANGE in the offending field.
  for (const [field, over] of [
    ["supportYears", "41"],
    ["dependents", "11"],
    ["educationPerChild", "10000000"],
    ["finalExpenses", "10000000"],
  ]) {
    assert.deepEqual(run(draft({ [field]: over })), {
      ok: false,
      error: { code: "RANGE", field, row: null },
    });
  }
  // For the five fields whose max is already 8 digits, max+1 is a
  // 9-unit raw string, so capacity (INPUT_LIMIT) precedes range.
  for (const field of [
    "annualIncome",
    "mortgageBalance",
    "otherDebts",
    "existingCoverage",
    "liquidAssets",
  ]) {
    assert.deepEqual(run(draft({ [field]: "100000000" })), {
      ok: false,
      error: { code: "INPUT_LIMIT", field, row: null },
    });
  }
});

test("grammar: ASCII decimal integers only, 0 or non-zero leading", () => {
  for (const bad of [
    "120000.5",
    "+1200000",
    "-1200000",
    " 1200000",
    "1200000 ",
    "01200000",
    "00",
    "1e6",
    "１２０００００",
    "1,200",
  ]) {
    assert.deepEqual(run(draft({ annualIncome: bad })), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "annualIncome", row: null },
    });
  }
  assert.equal(run(draft({ annualIncome: "0" })).ok, true);
});

test("empty inputs are EMPTY in the offending field", () => {
  for (const field of Object.keys(DEFAULTS)) {
    assert.deepEqual(run(draft({ [field]: "" })), {
      ok: false,
      error: { code: "EMPTY", field, row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run(draft({ annualIncome: "100000000" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "annualIncome", row: null },
  });
  // A nine-unit decimal is INPUT_LIMIT, not INTEGER_FORMAT.
  assert.deepEqual(run(draft({ annualIncome: "1200000.5" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "annualIncome", row: null },
  });
  // Nine units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run(draft({ annualIncome: "12000000\uD800" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "annualIncome", row: null },
  });
});

test("lone surrogates are UNICODE at exactly eight units", () => {
  assert.deepEqual(run(draft({ annualIncome: "1200000\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "annualIncome", row: null },
  });
  assert.deepEqual(run(draft({ supportYears: "1\uDC00" })), {
    ok: false,
    error: { code: "UNICODE", field: "supportYears", row: null },
  });
});

test("field order: earlier fields are fully validated before later ones", () => {
  assert.deepEqual(run(draft({ annualIncome: "", supportYears: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "annualIncome", row: null },
  });
  assert.deepEqual(run(draft({ annualIncome: "1200000", supportYears: "", dependents: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "supportYears", row: null },
  });
  assert.deepEqual(run(draft({ liquidAssets: "999999999" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "liquidAssets", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("1200000"), schema);
  assert.deepEqual(run(draft({ extra: "x" })), schema);
  const missing = draft();
  delete missing.liquidAssets;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run(draft({ annualIncome: 1200000 })), schema);
  assert.deepEqual(run(draft({ annualIncome: null })), schema);
  const withAccessor = draft();
  Object.defineProperty(withAccessor, "annualIncome", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/life-insurance.mjs", import.meta.url));
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
