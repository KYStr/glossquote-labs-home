// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-rent-vs-buy-calculator-20261121, spec candidate commit
// 46b55199bc39d221bb6ff529cdcb04778fe1e7b4, draft spec PR #378,
// SHA-256
// cf0ef0ab1d4733258065059da6a2e42c4b8b48a605787726917f3649adef515f).
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

import { run } from "../public/js/core/rent-vs-buy.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-rent-vs-buy-calculator-20261121");
assert.equal(coreCases.length, 13);

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
  monthlyRent: "20000",
  homePrice: "10000000",
  downPayment: "2000000",
  mortgageRate: "2.5",
  years: "30",
  rentGrowthPct: "2",
  homeAppreciationPct: "0",
  opportunityCostPct: "3",
};

function withPatch(patch) {
  return { ...BASE, ...patch };
}

// The SPEC's pinned float trap (AUTHOR-CHECK.md): taipei-typical
// month 195 has balance 4,432,080 and exact interest 9,233.5, which
// a binary float approximation rounds down to 9,233 instead of the
// correct 9,234. The fixture deep-equal above already pins every
// yearly balance; this test names the trap explicitly: year 17
// (months 193-204) must show balance 4,206,204, which is only
// reachable when month 195 rounds up.
test("float trap: taipei-typical month 195 interest 9,233.5 rounds up to 9,234", () => {
  const outcome = run(BASE);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.yearly[16].balance, 4206204);
  assert.equal(outcome.result.yearly[16].mortgageYear, 379320);
});

// Hand-derived from the SPEC: zero-rate-zero-growth, month by month.
// L = 960,000, n = 36, M = 960,000 / 36 = 26,666.67 -> 26,667.
// Year 3 pays 11 x 26,667 + 26,655 (exact payoff) = 319,992.
test("one-year-horizon: the last month pays the balance off exactly", () => {
  const outcome = run({
    monthlyRent: "18000",
    homePrice: "9000000",
    downPayment: "1800000",
    mortgageRate: "2",
    years: "1",
    rentGrowthPct: "3",
    homeAppreciationPct: "3",
    opportunityCostPct: "3",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.monthlyPayment, 606520);
  assert.equal(outcome.result.yearly[0].mortgageYear, 7278239);
  assert.equal(outcome.result.yearly[0].balance, 0);
});

// Tiny loan with the M = max(1, M) floor: L = 1, n = 480, zero rate,
// so the unclamped payment rounds to 0 and the floor makes M = 1.
// The balance is paid off in month 1 and every later payment is 0.
test("monthly payment floor: a 1-yuan loan pays off in month 1, later months pay 0", () => {
  const outcome = run({
    monthlyRent: "100",
    homePrice: "100",
    downPayment: "99",
    mortgageRate: "0",
    years: "40",
    rentGrowthPct: "0",
    homeAppreciationPct: "0",
    opportunityCostPct: "0",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.monthlyPayment, 1);
  assert.equal(outcome.result.yearly[0].mortgageYear, 1);
  assert.equal(outcome.result.yearly[0].balance, 0);
  assert.equal(outcome.result.yearly[1].mortgageYear, 0);
  assert.equal(outcome.result.yearly[39].mortgageYear, 0);
  assert.equal(outcome.result.yearly[39].balance, 0);
});

test("every accepted case ends with a zero balance", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const outcome = run(fixture.input);
    assert.equal(outcome.ok, true, fixture.id);
    const last = outcome.result.yearly[outcome.result.yearly.length - 1];
    assert.equal(last.balance, 0, fixture.id);
    assert.equal(outcome.result.yearly.length, Number(fixture.input.years), fixture.id);
  }
});

test("removing home appreciation never lowers the buy net cost", () => {
  const high = run(withPatch({ homeAppreciationPct: "5" }));
  const flat = run(withPatch({ homeAppreciationPct: "0" }));
  assert.equal(high.ok, true);
  assert.equal(flat.ok, true);
  for (let index = 0; index < high.result.yearly.length; index += 1) {
    assert.ok(
      flat.result.yearly[index].buyCumulative >= high.result.yearly[index].buyCumulative,
      `year ${index + 1}`,
    );
  }
});

test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  assert.equal(run(withPatch({ years: "1" })).ok, true);
  assert.equal(run(withPatch({ years: "40" })).ok, true);
  assert.deepEqual(run(withPatch({ years: "41" })), {
    ok: false,
    error: { code: "RANGE", field: "years", row: null },
  });
  assert.equal(run(withPatch({ mortgageRate: "30" })).ok, true);
  assert.deepEqual(run(withPatch({ mortgageRate: "30.0001" })), {
    ok: false,
    error: { code: "RANGE", field: "mortgageRate", row: null },
  });
  assert.equal(run(withPatch({ rentGrowthPct: "-10" })).ok, true);
  assert.equal(run(withPatch({ rentGrowthPct: "30" })).ok, true);
  assert.deepEqual(run(withPatch({ rentGrowthPct: "-10.01" })), {
    ok: false,
    error: { code: "RANGE", field: "rentGrowthPct", row: null },
  });
  assert.deepEqual(run(withPatch({ rentGrowthPct: "30.01" })), {
    ok: false,
    error: { code: "RANGE", field: "rentGrowthPct", row: null },
  });
  assert.equal(run(withPatch({ monthlyRent: "1" })).ok, true);
  assert.equal(run(withPatch({ monthlyRent: "1000000" })).ok, true);
  assert.equal(run(withPatch({ downPayment: "0" })).ok, true);
});

test("down payment equal to the price is a full-cash purchase; one yuan more fails", () => {
  const cash = run(withPatch({ downPayment: "10000000" }));
  assert.equal(cash.ok, true);
  assert.equal(cash.result.monthlyPayment, 0);
  assert.deepEqual(run(withPatch({ downPayment: "10000001" })), {
    ok: false,
    error: { code: "DOWN_PAYMENT_EXCEEDS_PRICE", field: "downPayment", row: null },
  });
});

test("decimal grammar: places, signs, and -0", () => {
  // Mortgage rate allows 4 decimals; the 5th is a format error.
  assert.equal(run(withPatch({ mortgageRate: "2.5555" })).ok, true);
  assert.deepEqual(run(withPatch({ mortgageRate: "2.55555" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "mortgageRate", row: null },
  });
  // Growth rates allow 2 decimals; the 3rd is a format error.
  assert.equal(run(withPatch({ rentGrowthPct: "2.55" })).ok, true);
  assert.deepEqual(run(withPatch({ rentGrowthPct: "2.555" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "rentGrowthPct", row: null },
  });
  assert.deepEqual(run(withPatch({ homeAppreciationPct: "-2.555" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "homeAppreciationPct", row: null },
  });
  // A minus sign is only legal on the two growth fields.
  assert.deepEqual(run(withPatch({ mortgageRate: "-1" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "mortgageRate", row: null },
  });
  assert.deepEqual(run(withPatch({ opportunityCostPct: "-1" })), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "opportunityCostPct", row: null },
  });
  // "-0" counts as 0: identical results to "0".
  assert.deepEqual(
    run(withPatch({ rentGrowthPct: "-0" })),
    run(withPatch({ rentGrowthPct: "0" })),
  );
  assert.deepEqual(
    run(withPatch({ homeAppreciationPct: "-0.00" })),
    run(withPatch({ homeAppreciationPct: "0" })),
  );
  // Other malformed decimals.
  for (const bad of [".5", "5.", "+2", " 2", "2 ", "1e2", "２"]) {
    assert.deepEqual(run(withPatch({ mortgageRate: bad })), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "mortgageRate", row: null },
    });
  }
});

test("integer grammar: ASCII decimal integers only, zero or non-zero leading", () => {
  for (const bad of ["01", "00", "+20000", "-20000", " 20000", "20000 ", "20.0", "2e4", "２００００"]) {
    assert.deepEqual(run(withPatch({ monthlyRent: bad })), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "monthlyRent", row: null },
    });
  }
  // "0" passes grammar but fails the range (monthlyRent 1-1,000,000).
  assert.deepEqual(run(withPatch({ monthlyRent: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "monthlyRent", row: null },
  });
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run(withPatch({ monthlyRent: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "monthlyRent", row: null },
  });
  assert.deepEqual(run(withPatch({ years: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "years", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // 13 units: over the 12-unit limit even though the value is numeric.
  assert.deepEqual(run(withPatch({ monthlyRent: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "monthlyRent", row: null },
  });
  // 12 units: within the limit, so the value reaches the range check.
  assert.deepEqual(run(withPatch({ monthlyRent: "123456789012" })), {
    ok: false,
    error: { code: "RANGE", field: "monthlyRent", row: null },
  });
  // A too-long decimal is INPUT_LIMIT, not DECIMAL_FORMAT.
  assert.deepEqual(run(withPatch({ mortgageRate: "1234567890123" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "mortgageRate", row: null },
  });
});

test("field order: earlier fields are fully validated before later ones", () => {
  assert.deepEqual(run(withPatch({ monthlyRent: "", homePrice: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "monthlyRent", row: null },
  });
  assert.deepEqual(run(withPatch({ monthlyRent: "20000", homePrice: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "homePrice", row: null },
  });
  // A per-field failure beats the cross-field check: the bad rate is
  // reported even though the down payment also exceeds the price.
  assert.deepEqual(
    run(withPatch({ downPayment: "10000001", mortgageRate: "31" })),
    {
      ok: false,
      error: { code: "RANGE", field: "mortgageRate", row: null },
    },
  );
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("20000"), schema);
  const missing = { ...BASE };
  delete missing.years;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  assert.deepEqual(run(withPatch({ monthlyRent: 20000 })), schema);
  assert.deepEqual(run(withPatch({ years: null })), schema);
  const withAccessor = { ...BASE };
  Object.defineProperty(withAccessor, "monthlyRent", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/rent-vs-buy.mjs", import.meta.url));
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
