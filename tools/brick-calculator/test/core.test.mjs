// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-brick-calculator-20261121, spec candidate commit
// f3a6e9d8b1047c2ad8aca895911bdc5eaa70bdbc, draft spec PR #384,
// registry rev 1767, SHA-256
// bdc037d46a01788bf347235722248f1fe8fc974dc03849caeda9b66102307596).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned formulas by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/brick-calculator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-brick-calculator-20261121");
assert.equal(coreCases.length, 11);

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
  brickPreset: "taiwan-red",
  jointMm: "10",
  openings: [],
  wallHeightM: "2.5",
  wallLengthM: "4",
  wastePct: "5",
};

test("range endpoints are accepted; one step outside is RANGE in the offending field", () => {
  // Wall 0.01 m and 100 m are the endpoints.
  assert.equal(run({ ...BASE, wallLengthM: "0.01", wallHeightM: "0.01" }).ok, true);
  assert.equal(run({ ...BASE, wallLengthM: "100", wallHeightM: "100" }).ok, true);
  assert.deepEqual(run({ ...BASE, wallLengthM: "0.009" }), {
    ok: false,
    error: { code: "RANGE", field: "wallLengthM", row: null },
  });
  assert.deepEqual(run({ ...BASE, wallLengthM: "100.001" }), {
    ok: false,
    error: { code: "RANGE", field: "wallLengthM", row: null },
  });
  // Joint 0 and 20 mm are the endpoints (0 is the zero-joint fixture).
  assert.equal(run({ ...BASE, jointMm: "0" }).ok, true);
  assert.equal(run({ ...BASE, jointMm: "20" }).ok, true);
  assert.deepEqual(run({ ...BASE, jointMm: "20.1" }), {
    ok: false,
    error: { code: "RANGE", field: "jointMm", row: null },
  });
  // Waste 0% and 50% are the endpoints (50 is the max-waste fixture).
  assert.equal(run({ ...BASE, wastePct: "0" }).ok, true);
  assert.equal(run({ ...BASE, wastePct: "50" }).ok, true);
  assert.deepEqual(run({ ...BASE, wastePct: "50.01" }), {
    ok: false,
    error: { code: "RANGE", field: "wastePct", row: null },
  });
});

test("opening area equal to the wall area is RANGE; just below it is accepted", () => {
  const wall = { ...BASE, wallLengthM: "2", wallHeightM: "2" };
  assert.deepEqual(run({ ...wall, openings: [{ widthM: "2", heightM: "2" }] }), {
    ok: false,
    error: { code: "RANGE", field: "openings", row: null },
  });
  // 1.999 x 2 = 3.998 < 4: accepted, net area 0.002 m2.
  const justBelow = run({ ...wall, openings: [{ widthM: "1.999", heightM: "2" }] });
  assert.equal(justBelow.ok, true);
  assert.equal(justBelow.result.netAreaM2, 0);
  assert.equal(justBelow.result.bricksNet, 1);
});

test("ten openings are accepted; the eleventh is ROW_LIMIT", () => {
  const ten = Array.from({ length: 10 }, () => ({ widthM: "0.1", heightM: "0.1" }));
  assert.equal(run({ ...BASE, openings: ten }).ok, true);
  const eleven = [...ten, { widthM: "0.1", heightM: "0.1" }];
  assert.deepEqual(run({ ...BASE, openings: eleven }), {
    ok: false,
    error: { code: "ROW_LIMIT", field: "openings", row: null },
  });
});

test("opening row errors carry the 1-based row number", () => {
  const rows = [
    { widthM: "0.5", heightM: "0.5" },
    { widthM: "4.5.2", heightM: "0.5" },
  ];
  assert.deepEqual(run({ ...BASE, openings: rows }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "widthM", row: 2 },
  });
  const badRow = [{ widthM: "0.5", heightM: "0.5", extra: "x" }];
  assert.deepEqual(run({ ...BASE, openings: badRow }), {
    ok: false,
    error: { code: "SCHEMA", field: "openings", row: 1 },
  });
  assert.deepEqual(run({ ...BASE, openings: "not-an-array" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("custom brick requires all three dimensions; a preset carrying them is SCHEMA naming the column", () => {
  assert.deepEqual(run({ ...BASE, brickPreset: "custom" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepEqual(
    run({ ...BASE, brickPreset: "custom", brickLengthMm: "200", brickHeightMm: "60" }),
    { ok: false, error: { code: "SCHEMA", field: null, row: null } },
  );
  for (const field of ["brickLengthMm", "brickHeightMm", "brickWidthMm"]) {
    assert.deepEqual(run({ ...BASE, [field]: "200" }), {
      ok: false,
      error: { code: "SCHEMA", field, row: null },
    });
  }
  // Custom dimensions validate in length, height, width order.
  assert.deepEqual(
    run({
      ...BASE,
      brickPreset: "custom",
      brickLengthMm: "19",
      brickHeightMm: "60",
      brickWidthMm: "100",
    }),
    { ok: false, error: { code: "RANGE", field: "brickLengthMm", row: null } },
  );
  assert.deepEqual(
    run({
      ...BASE,
      brickPreset: "custom",
      brickLengthMm: "200.5",
      brickHeightMm: "60",
      brickWidthMm: "100",
    }),
    { ok: false, error: { code: "INTEGER_FORMAT", field: "brickLengthMm", row: null } },
  );
});

test("grammar: ASCII decimals only, with the per-field decimal cap", () => {
  for (const bad of ["4.5.2", "+4", "-4", " 4", "4 ", "4.", ".5", "1e1", "４"]) {
    assert.deepEqual(run({ ...BASE, wallLengthM: bad }), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "wallLengthM", row: null },
    });
  }
  // Four fractional digits on a 3-decimal field.
  assert.deepEqual(run({ ...BASE, wallLengthM: "4.0001" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "wallLengthM", row: null },
  });
  // Joint allows 1 decimal; waste allows 2.
  assert.deepEqual(run({ ...BASE, jointMm: "10.05" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "jointMm", row: null },
  });
  assert.deepEqual(run({ ...BASE, wastePct: "5.001" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "wastePct", row: null },
  });
  assert.equal(run({ ...BASE, jointMm: "10.5" }).ok, true);
  assert.equal(run({ ...BASE, wastePct: "5.25" }).ok, true);
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ ...BASE, wallLengthM: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "wallLengthM", row: null },
  });
  assert.deepEqual(run({ ...BASE, wastePct: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "wastePct", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run({ ...BASE, wallLengthM: "1234567890123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "wallLengthM", row: null },
  });
  // Thirteen units including a second decimal point: capacity wins.
  assert.deepEqual(run({ ...BASE, wallLengthM: "12345678901.2" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "wallLengthM", row: null },
  });
});

test("lone surrogates are UNICODE at or under the capacity", () => {
  assert.deepEqual(run({ ...BASE, wallLengthM: "4\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "wallLengthM", row: null },
  });
  assert.deepEqual(run({ ...BASE, wastePct: "5\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "wastePct", row: null },
  });
});

test("field order: wall length, then height, then openings, then preset, then dims, then joint, then waste", () => {
  assert.deepEqual(run({ ...BASE, wallLengthM: "", wallHeightM: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "wallLengthM", row: null },
  });
  assert.deepEqual(run({ ...BASE, wallHeightM: "", openings: [{ widthM: "junk", heightM: "1" }] }), {
    ok: false,
    error: { code: "EMPTY", field: "wallHeightM", row: null },
  });
  assert.deepEqual(
    run({ ...BASE, openings: [{ widthM: "junk", heightM: "1" }], brickPreset: "nope" }),
    { ok: false, error: { code: "DECIMAL_FORMAT", field: "widthM", row: 1 } },
  );
  assert.deepEqual(run({ ...BASE, brickPreset: "nope", wastePct: "99" }), {
    ok: false,
    error: { code: "SCHEMA", field: "brickPreset", row: null },
  });
  assert.deepEqual(run({ ...BASE, jointMm: "21", wastePct: "99" }), {
    ok: false,
    error: { code: "RANGE", field: "jointMm", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("4"), schema);
  assert.deepEqual(run({ wallHeightM: "2.5" }), schema);
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  assert.deepEqual(run({ ...BASE, wallLengthM: 4 }), schema);
  assert.deepEqual(run({ ...BASE, wallHeightM: null }), schema);
  const withAccessor = { ...BASE };
  Object.defineProperty(withAccessor, "wallLengthM", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("defaults apply when optional fields are omitted", () => {
  const minimal = { wallLengthM: "4", wallHeightM: "2.5" };
  const full = run(BASE);
  assert.deepEqual(run(minimal), full);
});

test("SPEC invariants: buy at least net; waste never reduces buy; a bigger joint never raises bricks per m2", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const result = fixture.expected.result;
    assert.ok(result.bricksToBuy >= result.bricksNet, fixture.id);
  }
  const noWaste = run({ ...BASE, wastePct: "0" }).result;
  const withWaste = run({ ...BASE, wastePct: "5" }).result;
  assert.ok(withWaste.bricksToBuy >= noWaste.bricksToBuy);
  assert.equal(noWaste.bricksNet, withWaste.bricksNet);
  const thin = run({ ...BASE, jointMm: "0" }).result;
  const thick = run({ ...BASE, jointMm: "20" }).result;
  assert.ok(thick.bricksPerM2 <= thin.bricksPerM2);
  assert.ok(thick.mortarVolumeM3 >= thin.mortarVolumeM3);
});

test("half-up rounding: exact-count stays exact and mortar zero is exactly zero", () => {
  const exact = run({
    brickPreset: "taiwan-red",
    jointMm: "10",
    openings: [],
    wallHeightM: "1.2",
    wallLengthM: "1.4",
    wastePct: "0",
  });
  assert.equal(exact.ok, true);
  assert.equal(exact.result.bricksNet, 100);
  assert.equal(exact.result.bricksToBuy, 100);
  const zero = run({ ...BASE, jointMm: "0", wallLengthM: "3", wallHeightM: "2" });
  assert.equal(zero.ok, true);
  assert.equal(zero.result.mortarVolumeM3, 0);
  assert.equal(zero.result.mortarVolumeL, 0);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/brick-calculator.mjs", import.meta.url));
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
