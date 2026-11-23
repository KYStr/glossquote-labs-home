// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-cocktail-abv-calculator-20261121, draft spec PR #386,
// SHA-256
// 8d12f9c130377314ec3153f42f35da30d8b0c4a402f4386246d1219adb1fe0b8).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §4 formulas by hand (and cross-checked with an
// independent Python Decimal recomputation), never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/cocktail-abv.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-cocktail-abv-calculator-20261121");
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

function twoRows(a, b) {
  return { ingredients: [a, b] };
}

test("range endpoints are accepted; just outside is RANGE in the offending field", () => {
  // volume 0.1 and 2000, abv 0 and 100 are the legal endpoints.
  assert.equal(run(twoRows({ volumeMl: "0.1", abvPct: "0" }, { volumeMl: "2000", abvPct: "100" })).ok, true);
  assert.deepEqual(run(twoRows({ volumeMl: "0", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "volumeMl", row: 1 },
  });
  assert.deepEqual(run(twoRows({ volumeMl: "2000.1", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "volumeMl", row: 1 },
  });
  assert.deepEqual(run(twoRows({ volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "100.1" })), {
    ok: false,
    error: { code: "RANGE", field: "abvPct", row: 2 },
  });
  assert.deepEqual(run(twoRows({ volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "-1" })), {
    ok: false,
    error: { code: "NUMBER_FORMAT", field: "abvPct", row: 2 },
  });
});

test("grammar: ASCII decimals with at most 1 decimal place; leading zeros accepted", () => {
  for (const bad of ["12.34", "+45", "-45", " 45", "45 ", "4.5.6", ".5", "45.", "1e2", "４５", "45%"]) {
    assert.deepEqual(run(twoRows({ volumeMl: bad, abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
      ok: false,
      error: { code: "NUMBER_FORMAT", field: "volumeMl", row: 1 },
    });
  }
  // "045" is a leading zero and reads as 45.
  const leading = run(twoRows({ volumeMl: "045", abvPct: "40" }, { volumeMl: "30", abvPct: "0" }));
  assert.equal(leading.ok, true);
  assert.equal(leading.result.rows[0].volumeMl, 45);
  assert.equal(leading.result.totalAbvPct, 24);
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run(twoRows({ volumeMl: "", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "EMPTY", field: "volumeMl", row: 1 },
  });
  assert.deepEqual(run(twoRows({ volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "abvPct", row: 2 },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // 9 units: too long even though it would also fail the grammar.
  assert.deepEqual(run(twoRows({ volumeMl: "123456789", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "volumeMl", row: 1 },
  });
  // 8 units is the capacity; "2000.001" is 8 units and fails grammar, not capacity.
  assert.deepEqual(run(twoRows({ volumeMl: "2000.001", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "NUMBER_FORMAT", field: "volumeMl", row: 1 },
  });
});

test("names: omitted or empty means the default display name; overlong is INPUT_LIMIT; lone surrogate is UNICODE", () => {
  const omitted = run(twoRows({ volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "0" }));
  assert.equal(omitted.ok, true);
  assert.equal(omitted.result.rows[0].name, "材料 1");
  assert.equal(omitted.result.rows[1].name, "材料 2");
  const empty = run(twoRows({ name: "", volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "0" }));
  assert.equal(empty.ok, true);
  assert.equal(empty.result.rows[0].name, "材料 1");
  const longName = "龍".repeat(41);
  assert.deepEqual(run(twoRows({ name: longName, volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "name", row: 1 },
  });
  const forty = run(twoRows({ name: "龍".repeat(40), volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "0" }));
  assert.equal(forty.ok, true);
  assert.deepEqual(run(twoRows({ name: "龍\uD800", volumeMl: "30", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "UNICODE", field: "name", row: 1 },
  });
});

test("first error wins: row order, then name, volumeMl, abvPct within a row", () => {
  // Row 1 volume error precedes row 2 abv error.
  assert.deepEqual(
    run(twoRows({ volumeMl: "12.34", abvPct: "40" }, { volumeMl: "30", abvPct: "101" })),
    { ok: false, error: { code: "NUMBER_FORMAT", field: "volumeMl", row: 1 } },
  );
  // Within row 1, a bad name precedes a bad volume.
  assert.deepEqual(
    run(twoRows({ name: "龍".repeat(41), volumeMl: "12.34", abvPct: "40" }, { volumeMl: "30", abvPct: "0" })),
    { ok: false, error: { code: "INPUT_LIMIT", field: "name", row: 1 } },
  );
  // Within row 1, a bad volume precedes a bad abv.
  assert.deepEqual(
    run(twoRows({ volumeMl: "12.34", abvPct: "101" }, { volumeMl: "30", abvPct: "0" })),
    { ok: false, error: { code: "NUMBER_FORMAT", field: "volumeMl", row: 1 } },
  );
});

test("shape errors precede the row-count check, per the SPEC order", () => {
  // 7 rows would be ROW_LIMIT, but a row with an unknown field is a
  // shape error and shape comes first.
  const seven = Array.from({ length: 7 }, () => ({ volumeMl: "15", abvPct: "40" }));
  seven[3].surprise = "x";
  assert.deepEqual(run({ ingredients: seven }), {
    ok: false,
    error: { code: "SCHEMA", field: "surprise", row: 4 },
  });
  // 1 row would be ROW_COUNT, but a non-object row is a shape error.
  assert.deepEqual(run({ ingredients: ["nope"] }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: 1 },
  });
});

test("half-up, not half-even: a second exact .x5 boundary rounds up", () => {
  // 25 ml at 50% + 175 ml at 0%: 12.5 ml alcohol in 200 ml = 6.25%
  // exactly; half-up gives 6.3%, half-even would give 6.2%.
  const outcome = run(twoRows({ volumeMl: "25", abvPct: "50" }, { volumeMl: "175", abvPct: "0" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.totalAbvPct, 6.3);
  assert.equal(outcome.result.totalAlcoholMl, 12.5);
  assert.equal(outcome.result.totalAlcoholG, 9.9);
  assert.equal(outcome.result.standardDrinks, 1);
});

test("totals come from unrounded sums, never from rounded rows", () => {
  // Each row holds 0.05 ml of pure alcohol, which rounds half-up to
  // 0.1 ml per row; the unrounded total is 0.10 ml, which rounds to
  // 0.1 ml — not the 0.2 ml the rounded rows would sum to.
  const outcome = run(twoRows({ volumeMl: "0.5", abvPct: "10" }, { volumeMl: "0.5", abvPct: "10" }));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.rows[0].alcoholMl, 0.1);
  assert.equal(outcome.result.rows[1].alcoholMl, 0.1);
  assert.equal(outcome.result.totalAlcoholMl, 0.1);
  assert.equal(outcome.result.totalVolumeMl, 1);
  assert.equal(outcome.result.totalAbvPct, 10);
  assert.equal(outcome.result.totalAlcoholG, 0.1);
  assert.equal(outcome.result.standardDrinks, 0);
});

test("six rows is the limit and all-zero ABV is legal", () => {
  const six = Array.from({ length: 6 }, (_, i) => ({
    volumeMl: "10",
    abvPct: "0",
    name: `材料${i + 1}`,
  }));
  const outcome = run({ ingredients: six });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.totalVolumeMl, 60);
  assert.equal(outcome.result.totalAbvPct, 0);
  assert.equal(outcome.result.standardDrinks, 0);
});

test("schema violations are SCHEMA with the offending field and row", () => {
  assert.deepEqual(run(null), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run([]), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run("x"), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run({}), { ok: false, error: { code: "SCHEMA", field: "ingredients", row: null } });
  assert.deepEqual(run({ ingredients: "x" }), {
    ok: false,
    error: { code: "SCHEMA", field: "ingredients", row: null },
  });
  assert.deepEqual(run({ ingredients: [], extra: 1 }), {
    ok: false,
    error: { code: "SCHEMA", field: "extra", row: null },
  });
  assert.deepEqual(run(twoRows({ volumeMl: 45, abvPct: "40" }, { volumeMl: "30", abvPct: "0" })), {
    ok: false,
    error: { code: "SCHEMA", field: "volumeMl", row: 1 },
  });
  assert.deepEqual(run({ ingredients: [{ abvPct: "40" }, { volumeMl: "30", abvPct: "0" }] }), {
    ok: false,
    error: { code: "SCHEMA", field: "volumeMl", row: 1 },
  });
  const withAccessor = { ingredients: [{ volumeMl: "30", abvPct: "0" }] };
  Object.defineProperty(withAccessor.ingredients, "1", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: 2 },
  });
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/cocktail-abv.mjs", import.meta.url));
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
