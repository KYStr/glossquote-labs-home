// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-grocery-budget-calculator-20261121, spec candidate commit
// 354c16abacab2d9d935667f032f401834f8ccf9f, draft spec PR #379,
// SHA-256
// 558e6d92bff162c49e04295d8e978e83b841f2d81f3a6ea8298c08cd936e9a4c).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned USDA tables and rules by hand, never from
// the implementation's output; the sweep test re-derives results
// with an independent BigInt rational implementation typed again
// from the SPEC.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/grocery-budget.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-grocery-budget-calculator-20261121");
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

const FIELDS = [
  "c1", "c2_3", "c4_5", "c6_8", "c9_11",
  "f12_13", "f14_19", "f20_50", "f51_70", "f71",
  "m12_13", "m14_19", "m20_50", "m51_70", "m71",
];

function blankInput(plan = "thrifty") {
  const input = { plan };
  for (const field of FIELDS) input[field] = "0";
  return input;
}

// Independent re-derivation with BigInt rationals, typed again from
// the SPEC's Tables A/B (integer cents) and size-factor rule. The
// implementation under test uses Number arithmetic; this one uses
// BigInt throughout, so a shared float slip cannot hide.
const TABLE_A = {
  c1: 2640n, c2_3: 3980n, c4_5: 4350n, c6_8: 4830n, c9_11: 5580n,
  f12_13: 5170n, f14_19: 6010n, f20_50: 5870n, f51_70: 5460n, f71: 6030n,
  m12_13: 5970n, m14_19: 7530n, m20_50: 7370n, m51_70: 6500n, m71: 6200n,
};
const TABLE_B = {
  c1: 3830n, c2_3: 4010n, c4_5: 4140n, c6_8: 6050n, c9_11: 6260n,
  f12_13: 6230n, f14_19: 6260n, f20_50: 6390n, f51_70: 6220n, f71: 6210n,
  m12_13: 7320n, m14_19: 7450n, m20_50: 7350n, m51_70: 6920n, m71: 6840n,
};

function halfUpBig(n, d) {
  return (2n * n + d) / (2n * d);
}

function expectedResult(input) {
  const table = input.plan === "thrifty" ? TABLE_A : TABLE_B;
  let size = 0n;
  let unadjusted = 0n;
  for (const field of FIELDS) {
    const count = BigInt(input[field]);
    size += count;
    unadjusted += count * table[field];
  }
  const factor =
    size === 1n ? [6n, 5n]
    : size === 2n ? [11n, 10n]
    : size === 3n ? [21n, 20n]
    : size === 4n ? [1n, 1n]
    : size === 5n || size === 6n ? [19n, 20n]
    : [9n, 10n];
  const weekly = halfUpBig(unadjusted * factor[0], factor[1] * 10n) * 10n;
  const monthly = halfUpBig(weekly * 4333n, 10000n) * 10n;
  const breakdown = [];
  for (const field of FIELDS) {
    const count = BigInt(input[field]);
    if (count === 0n) continue;
    const weeklyPerPerson = table[field];
    const weeklySubtotal = count * weeklyPerPerson;
    const monthlySubtotal = halfUpBig(weeklySubtotal * 4333n, 10000n) * 10n;
    breakdown.push({
      count: Number(count),
      group: field,
      monthlySubtotal: Number(monthlySubtotal) / 100,
      weeklyPerPerson: Number(weeklyPerPerson) / 100,
      weeklySubtotal: Number(weeklySubtotal) / 100,
    });
  }
  return {
    plan: input.plan,
    householdSize: Number(size),
    sizeFactor: Number(factor[0]) / Number(factor[1]),
    unadjustedWeekly: Number(unadjusted) / 100,
    sizeAdjustmentWeekly: Number(weekly - unadjusted) / 100,
    weeklyTotal: Number(weekly) / 100,
    monthlyTotal: Number(monthly) / 100,
    perPersonWeekly: Number(halfUpBig(weekly, size)) / 100,
    perPersonMonthly: Number(halfUpBig(monthly, size)) / 100,
    dailyAverage: Number(halfUpBig(weekly, 7n)) / 100,
    breakdown,
  };
}

test("independent BigInt re-derivation: every single group, both plans, counts 1 and 10", () => {
  for (const plan of ["thrifty", "low-cost"]) {
    for (const field of FIELDS) {
      for (const count of ["1", "10"]) {
        const input = blankInput(plan);
        input[field] = count;
        const actual = run(input);
        assert.equal(actual.ok, true, `${plan} ${field} x${count}`);
        assert.deepEqual(actual.result, expectedResult(input), `${plan} ${field} x${count}`);
      }
    }
  }
});

test("independent BigInt re-derivation: size-factor boundaries 1-7 and 20 people", () => {
  // Sizes built from m20_50 adults, one group at a time.
  for (const size of [1, 2, 3, 4, 5, 6, 7, 20]) {
    for (const plan of ["thrifty", "low-cost"]) {
      const input = blankInput(plan);
      input.m20_50 = String(Math.min(size, 10));
      if (size > 10) input.f20_50 = String(size - 10);
      const actual = run(input);
      assert.equal(actual.ok, true, `${plan} size ${size}`);
      assert.deepEqual(actual.result, expectedResult(input), `${plan} size ${size}`);
    }
  }
  // Size 5 must use the 0.95 factor, size 6 the same, size 7 the 0.90 factor.
  const five = run({ ...blankInput(), m20_50: "5" });
  assert.equal(five.result.sizeFactor, 0.95);
  const six = run({ ...blankInput(), m20_50: "6" });
  assert.equal(six.result.sizeFactor, 0.95);
  const seven = run({ ...blankInput(), m20_50: "7" });
  assert.equal(seven.result.sizeFactor, 0.9);
});

test("half-up at the exact $143.55 boundary rounds up to $143.60", () => {
  // Senior couple, Low-cost: 62.10 + 68.40 = 130.50; x1.10 = 143.55.
  const actual = run({
    ...blankInput("low-cost"),
    f71: "1",
    m71: "1",
  });
  assert.equal(actual.ok, true);
  assert.equal(actual.result.unadjustedWeekly, 130.5);
  assert.equal(actual.result.weeklyTotal, 143.6);
  assert.equal(actual.result.sizeAdjustmentWeekly, 13.1);
});

test("monthly total comes from the weekly total, not from the breakdown sum", () => {
  // Reference family: breakdown monthly subtotals sum to 1024.70,
  // the monthly total is 1024.80 — a disclosed $0.10 rounding gap.
  const actual = run(fixtures.cases[0].input);
  assert.equal(actual.ok, true);
  const subtotalSum = actual.result.breakdown.reduce(
    (sum, row) => sum + row.monthlySubtotal,
    0,
  );
  assert.equal(Math.round(subtotalSum * 100), 102470);
  assert.equal(actual.result.monthlyTotal, 1024.8);
});

test("count endpoints: 10 per group is legal, 11 is RANGE in that field", () => {
  const ok = blankInput();
  ok.m20_50 = "10";
  assert.equal(run(ok).ok, true);
  const over = blankInput();
  over.c1 = "11";
  assert.deepEqual(run(over), {
    ok: false,
    error: { code: "RANGE", field: "c1", row: null },
  });
});

test("household endpoints: 20 people legal, 21 is RANGE on household", () => {
  const twenty = blankInput();
  twenty.f20_50 = "10";
  twenty.m20_50 = "10";
  assert.equal(run(twenty).ok, true);
  assert.equal(run(twenty).result.householdSize, 20);
  const twentyOne = blankInput();
  twentyOne.f20_50 = "10";
  twentyOne.m20_50 = "10";
  twentyOne.c6_8 = "1";
  assert.deepEqual(run(twentyOne), {
    ok: false,
    error: { code: "RANGE", field: "household", row: null },
  });
});

test("grammar: ASCII decimal integers only, zero or non-zero leading", () => {
  for (const bad of ["1.5", "+1", "-1", " 1", "1 ", "01", "00", "1e1", "１"]) {
    const input = blankInput();
    input.c6_8 = bad;
    assert.deepEqual(run(input), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "c6_8", row: null },
    });
  }
  // "0" passes grammar and the range (0-10); a zero household is a
  // cross-field EMPTY, not a per-field failure.
  assert.deepEqual(run(blankInput()), {
    ok: false,
    error: { code: "EMPTY", field: "household", row: null },
  });
});

test("empty count fields are EMPTY in the offending field", () => {
  const input = blankInput();
  input.f20_50 = "";
  assert.deepEqual(run(input), {
    ok: false,
    error: { code: "EMPTY", field: "f20_50", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  const input = blankInput();
  input.m20_50 = "123456789";
  assert.deepEqual(run(input), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "m20_50", row: null },
  });
  // Nine units including a lone surrogate: capacity still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  const input2 = blankInput();
  input2.m20_50 = "12345678\uD800";
  assert.deepEqual(run(input2), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "m20_50", row: null },
  });
  // Eight units is within capacity: a too-large 8-digit count is
  // RANGE, and an 8-unit decimal is INTEGER_FORMAT.
  const input3 = blankInput();
  input3.m20_50 = "12345678";
  assert.deepEqual(run(input3), {
    ok: false,
    error: { code: "RANGE", field: "m20_50", row: null },
  });
  const input4 = blankInput();
  input4.m20_50 = "12345.67";
  assert.deepEqual(run(input4), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "m20_50", row: null },
  });
});

test("lone surrogates are UNICODE at eight units or fewer", () => {
  const input = blankInput();
  input.c6_8 = "1\uD800";
  assert.deepEqual(run(input), {
    ok: false,
    error: { code: "UNICODE", field: "c6_8", row: null },
  });
  const input2 = blankInput();
  input2.f20_50 = "1\uDC00";
  assert.deepEqual(run(input2), {
    ok: false,
    error: { code: "UNICODE", field: "f20_50", row: null },
  });
});

test("field order: plan is validated before the counts, counts in SPEC order", () => {
  const badPlan = blankInput("moderate");
  badPlan.c1 = "junk";
  assert.deepEqual(run(badPlan), {
    ok: false,
    error: { code: "RANGE", field: "plan", row: null },
  });
  const badFirst = blankInput();
  badFirst.c1 = "";
  badFirst.c2_3 = "junk";
  assert.deepEqual(run(badFirst), {
    ok: false,
    error: { code: "EMPTY", field: "c1", row: null },
  });
  const badLater = blankInput();
  badLater.c1 = "1";
  badLater.m71 = "11";
  assert.deepEqual(run(badLater), {
    ok: false,
    error: { code: "RANGE", field: "m71", row: null },
  });
});

test("plan: empty and unknown values are RANGE, a lone surrogate is UNICODE", () => {
  assert.deepEqual(run(blankInput("")), {
    ok: false,
    error: { code: "RANGE", field: "plan", row: null },
  });
  assert.deepEqual(run(blankInput("Moderate")), {
    ok: false,
    error: { code: "RANGE", field: "plan", row: null },
  });
  assert.deepEqual(run(blankInput("\uD800")), {
    ok: false,
    error: { code: "UNICODE", field: "plan", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("thrifty"), schema);
  const missing = blankInput();
  delete missing.m71;
  assert.deepEqual(run(missing), schema);
  const extra = { ...blankInput(), extra: "x" };
  assert.deepEqual(run(extra), schema);
  const wrongType = blankInput();
  wrongType.m20_50 = 1;
  assert.deepEqual(run(wrongType), schema);
  const wrongPlanType = blankInput();
  wrongPlanType.plan = 3;
  assert.deepEqual(run(wrongPlanType), schema);
  const withAccessor = blankInput();
  Object.defineProperty(withAccessor, "c1", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/grocery-budget.mjs", import.meta.url));
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
