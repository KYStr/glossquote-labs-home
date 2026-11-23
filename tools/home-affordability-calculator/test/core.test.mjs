// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-home-affordability-calculator-20261121, spec candidate commit
// d0a79715f63df1ad1c9050a8642d8dad382fa7b8, draft spec PR #381,
// SHA-256
// f1ac0788edabcdc3146863509b193d41e9d3de8803f236d67d6b634362ac058e).
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

import { run } from "../public/js/core/home-affordability.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-home-affordability-calculator-20261121");
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

const BASE = {
  annualIncome: "1200000",
  backEndCapPct: "36",
  downPayment: "2000000",
  frontEndCapPct: "28",
  mortgageRate: "2",
  otherDebts: "0",
  years: "30",
};

// Independent re-derivation of the annuity, written separately from
// the implementation and in the opposite direction: given a loan,
// recompute its monthly payment as the exact rational
//   loan x i / (1 - (1+i)^(-n))
// with i = r / 12,000,000, then half-up round it. The SPEC's floor
// invariant (implementation section) requires that recomputed payment
// never exceed the maximum monthly payment; the AUTHOR-CHECK records
// that all 10 valid fixtures recompute to exactly the maximum.
function recomputedPaymentHalfUp(loan, rateScaled, months) {
  if (loan === 0) return 0;
  if (rateScaled === 0n) {
    // Half-up of the exact quotient loan/months.
    return Number(
      (2n * BigInt(loan) + BigInt(months)) / (2n * BigInt(months)),
    );
  }
  const bigD = 12000000n;
  const base = bigD + rateScaled;
  const powered = base ** BigInt(months);
  const numerator = BigInt(loan) * rateScaled * powered;
  const denominator = bigD * (powered - bigD ** BigInt(months));
  // Half-up of numerator/denominator.
  return Number((2n * numerator + denominator) / (2n * denominator));
}

function rateScaledOf(text) {
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0") || "0");
}

test("annuity floor invariant: recomputed payment of maxLoan equals maxMonthlyPayment", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const result = fixture.expected.result;
    const months = Number(fixture.input.years) * 12;
    const payment = recomputedPaymentHalfUp(
      result.maxLoanAmount,
      rateScaledOf(fixture.input.mortgageRate),
      months,
    );
    assert.equal(payment, result.maxMonthlyPayment, fixture.id);
    assert.equal(
      result.maxHomePrice,
      result.maxLoanAmount + Number(fixture.input.downPayment),
      fixture.id,
    );
    if (!result.affordable) {
      assert.equal(result.maxLoanAmount, 0, fixture.id);
      assert.equal(result.maxHomePrice, Number(fixture.input.downPayment), fixture.id);
    }
  }
});

test("range endpoints are accepted; one step outside is RANGE in the offending field", () => {
  const valid = (patch) => run({ ...BASE, ...patch });
  assert.equal(valid({ years: "1" }).ok, true);
  assert.equal(valid({ years: "40" }).ok, true);
  assert.deepEqual(valid({ years: "41" }), {
    ok: false,
    error: { code: "RANGE", field: "years", row: null },
  });
  assert.equal(valid({ mortgageRate: "30" }).ok, true);
  assert.equal(valid({ mortgageRate: "30.0000" }).ok, true);
  assert.deepEqual(valid({ mortgageRate: "30.0001" }), {
    ok: false,
    error: { code: "RANGE", field: "mortgageRate", row: null },
  });
  assert.equal(valid({ frontEndCapPct: "10" }).ok, true);
  // Front 50 needs a back cap at least as high, or CAP_ORDER (not
  // RANGE) fires on the cross-field check.
  assert.equal(valid({ frontEndCapPct: "50", backEndCapPct: "60" }).ok, true);
  assert.deepEqual(valid({ frontEndCapPct: "9.99" }), {
    ok: false,
    error: { code: "RANGE", field: "frontEndCapPct", row: null },
  });
  assert.deepEqual(valid({ frontEndCapPct: "50.01" }), {
    ok: false,
    error: { code: "RANGE", field: "frontEndCapPct", row: null },
  });
  // Back 20 needs a front cap no higher, or CAP_ORDER (not RANGE)
  // fires on the cross-field check.
  assert.equal(valid({ backEndCapPct: "20", frontEndCapPct: "10" }).ok, true);
  assert.equal(valid({ backEndCapPct: "60" }).ok, true);
  assert.deepEqual(valid({ backEndCapPct: "19.99" }), {
    ok: false,
    error: { code: "RANGE", field: "backEndCapPct", row: null },
  });
  assert.deepEqual(valid({ backEndCapPct: "60.01" }), {
    ok: false,
    error: { code: "RANGE", field: "backEndCapPct", row: null },
  });
  assert.equal(valid({ annualIncome: "1" }).ok, true);
  assert.equal(valid({ annualIncome: "1000000000" }).ok, true);
  assert.deepEqual(valid({ annualIncome: "1000000001" }), {
    ok: false,
    error: { code: "RANGE", field: "annualIncome", row: null },
  });
  assert.equal(valid({ downPayment: "0" }).ok, true);
  assert.equal(valid({ otherDebts: "1000000" }).ok, true);
  assert.deepEqual(valid({ otherDebts: "1000001" }), {
    ok: false,
    error: { code: "RANGE", field: "otherDebts", row: null },
  });
});

test("back-end cap equal to the front-end cap is legal; 0.01 below is CAP_ORDER", () => {
  assert.equal(run({ ...BASE, frontEndCapPct: "30", backEndCapPct: "30" }).ok, true);
  assert.deepEqual(run({ ...BASE, frontEndCapPct: "30", backEndCapPct: "29.99" }), {
    ok: false,
    error: { code: "CAP_ORDER", field: "backEndCapPct", row: null },
  });
  // The cross-field check runs last: an earlier field's own failure
  // wins over CAP_ORDER.
  assert.deepEqual(
    run({ ...BASE, mortgageRate: "31", frontEndCapPct: "30", backEndCapPct: "29.99" }),
    {
      ok: false,
      error: { code: "RANGE", field: "mortgageRate", row: null },
    },
  );
});

test("other debts exactly consuming the back-end limit leaves zero loan room", () => {
  // Back-end limit 36,000 minus debts 36,000 is exactly 0: the
  // maximum payment is 0, affordable is false, the price is the
  // down payment alone.
  const actual = run({ ...BASE, otherDebts: "36000" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result, {
    monthlyGrossIncome: 100000,
    frontEndLimit: 28000,
    backEndLimit: 0,
    maxMonthlyPayment: 0,
    bindingCap: "back",
    maxLoanAmount: 0,
    maxHomePrice: 2000000,
    frontEndPctAtMax: 0,
    backEndPctAtMax: 36,
    affordable: false,
  });
});

test("monotonicity: a higher rate never raises the price; a higher down payment raises it equally", () => {
  const low = run({ ...BASE, mortgageRate: "2" }).result;
  const high = run({ ...BASE, mortgageRate: "8" }).result;
  assert.ok(high.maxHomePrice <= low.maxHomePrice);
  assert.ok(high.maxLoanAmount <= low.maxLoanAmount);
  const moreDown = run({ ...BASE, downPayment: "3000000" }).result;
  assert.equal(moreDown.maxHomePrice, low.maxHomePrice + 1000000);
  assert.equal(moreDown.maxLoanAmount, low.maxLoanAmount);
});

test("integer grammar: ASCII decimal integers only, zero or non-zero leading", () => {
  for (const bad of ["12.5", "+120", "-120", " 120", "120 ", "0120", "00", "1e2", "１２０"]) {
    assert.deepEqual(run({ ...BASE, annualIncome: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "annualIncome", row: null },
    });
  }
  assert.deepEqual(run({ ...BASE, years: "30.0" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "years", row: null },
  });
});

test("ratio grammar: no sign, integer part required, fraction digits capped", () => {
  for (const bad of ["-1", "-0", ".5", "2.", "00.5", "+2", "2e1"]) {
    assert.deepEqual(run({ ...BASE, mortgageRate: bad }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "mortgageRate", row: null },
    });
  }
  // Too many decimal places is a grammar failure, not a range failure.
  assert.deepEqual(run({ ...BASE, mortgageRate: "2.00000" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "mortgageRate", row: null },
  });
  assert.deepEqual(run({ ...BASE, frontEndCapPct: "28.100" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "frontEndCapPct", row: null },
  });
  // Exactly at the cap is legal; trailing zeros do not add places.
  assert.equal(run({ ...BASE, mortgageRate: "2.0000" }).ok, true);
  assert.equal(run({ ...BASE, frontEndCapPct: "28.10" }).ok, true);
  assert.equal(run({ ...BASE, backEndCapPct: "36.00" }).ok, true);
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ ...BASE, annualIncome: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "annualIncome", row: null },
  });
  assert.deepEqual(run({ ...BASE, mortgageRate: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "mortgageRate", row: null },
  });
  assert.deepEqual(run({ ...BASE, backEndCapPct: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "backEndCapPct", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run({ ...BASE, annualIncome: "1234567890123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "annualIncome", row: null },
  });
  // A 13-unit decimal is too long even though it would also fail
  // the decimal-places rule.
  assert.deepEqual(run({ ...BASE, mortgageRate: "123456789.123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mortgageRate", row: null },
  });
});

test("lone surrogates fail the ASCII grammar, not a separate code", () => {
  // The SPEC defines no UNICODE code for this tool; a lone surrogate
  // is simply not an ASCII digit, so the grammar rule reports it.
  assert.deepEqual(run({ ...BASE, annualIncome: "120\uD800" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "annualIncome", row: null },
  });
  assert.deepEqual(run({ ...BASE, mortgageRate: "2.\uDC00" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "mortgageRate", row: null },
  });
});

test("field order: annualIncome is fully validated before later fields", () => {
  assert.deepEqual(run({ ...BASE, annualIncome: "", mortgageRate: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "annualIncome", row: null },
  });
  assert.deepEqual(run({ ...BASE, annualIncome: "1200000", downPayment: "x" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "downPayment", row: null },
  });
  assert.deepEqual(
    run({ ...BASE, mortgageRate: "2", years: "41", frontEndCapPct: "30", backEndCapPct: "29" }),
    {
      ok: false,
      error: { code: "RANGE", field: "years", row: null },
    },
  );
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("1200000"), schema);
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  const missing = { ...BASE };
  delete missing.years;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...BASE, annualIncome: 1200000 }), schema);
  assert.deepEqual(run({ ...BASE, mortgageRate: null }), schema);
  const withAccessor = { ...BASE };
  Object.defineProperty(withAccessor, "annualIncome", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("annualIncome 1–5: rounded monthly income is 0, ratios are reported 0.0", () => {
  // The SPEC does not define the 1-decimal ratios when the rounded
  // monthly income is 0 (division by zero); the implementation
  // reports 0.0 for both (errata candidate 1 in HANDOFF.md). The
  // result still succeeds: no loan room, price equals the down
  // payment.
  for (const income of ["1", "5"]) {
    const actual = run({ ...BASE, annualIncome: income, downPayment: "100" });
    assert.equal(actual.ok, true, income);
    assert.equal(actual.result.monthlyGrossIncome, 0, income);
    assert.equal(actual.result.maxMonthlyPayment, 0, income);
    assert.equal(actual.result.affordable, false, income);
    assert.equal(actual.result.maxLoanAmount, 0, income);
    assert.equal(actual.result.maxHomePrice, 100, income);
    assert.equal(actual.result.frontEndPctAtMax, 0, income);
    assert.equal(actual.result.backEndPctAtMax, 0, income);
  }
  assert.equal(run({ ...BASE, annualIncome: "6" }).result.monthlyGrossIncome, 1);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(
    new URL("../public/js/core/home-affordability.mjs", import.meta.url),
  );
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
