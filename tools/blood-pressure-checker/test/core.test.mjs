// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-blood-pressure-checker-20261121, spec candidate commit
// f8a034e4c1bd81c3c21cb7fb221c0bb6fec8f683, draft spec PR #368,
// SHA-256
// 67dc8ed880c781d72cb2ff375ec9483aefb2a4f8ada80f491c676c8fd4f4e7a5).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §5 pinned table and §4 rules by hand, never from
// the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/blood-pressure.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-blood-pressure-checker-20261121");
assert.equal(coreCases.length, 17);

for (const fixture of coreCases) {
  // decimal-systolic is excluded from the verbatim loop: its input
  // "120.5" is five raw units, so the SPEC's own order ("先容量、再
  // surrogate、再該欄文法") gives INPUT_LIMIT, while the fixture
  // expects INTEGER_FORMAT. The SPEC text governs (see the dedicated
  // test below and errata candidate 4 in HANDOFF.md); the fixture
  // value should have been a four-unit decimal such as "12.5".
  if (fixture.id === "decimal-systolic") continue;
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

test("fixture decimal-systolic under the SPEC order: capacity precedes grammar", () => {
  // The fixture's stated purpose is "小數收縮壓不接受", but its
  // value "120.5" is five units and MAX_RAW_UNITS is four. The SPEC
  // pins the order capacity → surrogate → grammar, so INPUT_LIMIT
  // wins — the same order the run-5 house pattern pins (a too-long
  // decimal is INPUT_LIMIT, not INTEGER_FORMAT). A four-unit decimal
  // such as "12.5" does give INTEGER_FORMAT (see the grammar test).
  assert.deepEqual(run({ systolic: "120.5", diastolic: "80" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "systolic", row: null },
  });
});

// Independent re-derivation of the category, written separately from
// the implementation's classify(): the SPEC's table as five
// predicates, checked in the same first-match order.
function expectedCategory(systolic, diastolic) {
  if (systolic > 180 || diastolic > 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

test("every category boundary from the SPEC table, hand-derived", () => {
  const cases = [
    // [systolic, diastolic, category]
    [40, 20, "normal"], // range minimums
    [119, 79, "normal"],
    [120, 79, "elevated"],
    [129, 79, "elevated"],
    [119, 80, "stage1"], // diastolic alone lifts the category
    [120, 80, "stage1"], // the SPEC's "just over the line" case
    [129, 80, "stage1"],
    [130, 80, "stage1"],
    [139, 89, "stage1"],
    [139, 90, "stage2"], // diastolic alone lifts the category
    [140, 89, "stage2"],
    [140, 90, "stage2"],
    [180, 120, "stage2"], // strictly greater: not a crisis
    [181, 120, "crisis"],
    [180, 121, "crisis"],
    [300, 200, "crisis"], // range maximums
    [118, 85, "stage1"], // diastolic decides, "higher category"
    [150, 125, "crisis"], // diastolic decides
  ];
  for (const [systolic, diastolic, category] of cases) {
    const actual = run({ systolic: String(systolic), diastolic: String(diastolic) });
    assert.equal(actual.ok, true, `${systolic}/${diastolic}`);
    assert.equal(actual.result.category, expectedCategory(systolic, diastolic));
    assert.equal(actual.result.category, category, `${systolic}/${diastolic}`);
  }
});

test("range endpoints are accepted; one unit outside is RANGE in the offending field", () => {
  assert.equal(run({ systolic: "40", diastolic: "20" }).ok, true);
  assert.equal(run({ systolic: "300", diastolic: "200" }).ok, true);
  assert.deepEqual(run({ systolic: "39", diastolic: "20" }), {
    ok: false,
    error: { code: "RANGE", field: "systolic", row: null },
  });
  assert.deepEqual(run({ systolic: "301", diastolic: "80" }), {
    ok: false,
    error: { code: "RANGE", field: "systolic", row: null },
  });
  assert.deepEqual(run({ systolic: "120", diastolic: "19" }), {
    ok: false,
    error: { code: "RANGE", field: "diastolic", row: null },
  });
  assert.deepEqual(run({ systolic: "200", diastolic: "201" }), {
    ok: false,
    error: { code: "RANGE", field: "diastolic", row: null },
  });
});

test("diastolic equal to systolic is legal; one above is a cross-field RANGE", () => {
  assert.equal(run({ systolic: "120", diastolic: "120" }).ok, true);
  assert.equal(run({ systolic: "120", diastolic: "120" }).result.category, "stage2");
  assert.deepEqual(run({ systolic: "119", diastolic: "120" }), {
    ok: false,
    error: { code: "RANGE", field: "diastolic", row: null },
  });
});

test("grammar: ASCII decimal integers only, zero or non-zero leading", () => {
  for (const bad of ["12.5", "+120", "-120", " 120", "120 ", "0120", "00", "1e2", "１２０"]) {
    assert.deepEqual(run({ systolic: bad, diastolic: "80" }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "systolic", row: null },
    });
  }
  // "0" passes grammar but fails the range (systolic 40-300).
  assert.deepEqual(run({ systolic: "0", diastolic: "20" }), {
    ok: false,
    error: { code: "RANGE", field: "systolic", row: null },
  });
  assert.deepEqual(run({ systolic: "120", diastolic: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "diastolic", row: null },
  });
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ systolic: "", diastolic: "76" }), {
    ok: false,
    error: { code: "EMPTY", field: "systolic", row: null },
  });
  assert.deepEqual(run({ systolic: "118", diastolic: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "diastolic", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run({ systolic: "12345", diastolic: "80" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "systolic", row: null },
  });
  // "120.5" is five units: capacity precedes grammar, so a decimal
  // that is also too long is INPUT_LIMIT, not INTEGER_FORMAT.
  assert.deepEqual(run({ systolic: "120.5", diastolic: "80" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "systolic", row: null },
  });
  // Five units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ systolic: "1201\uD800", diastolic: "80" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "systolic", row: null },
  });
});

test("lone surrogates are UNICODE at exactly four units", () => {
  assert.deepEqual(run({ systolic: "120\uD800", diastolic: "80" }), {
    ok: false,
    error: { code: "UNICODE", field: "systolic", row: null },
  });
  assert.deepEqual(run({ systolic: "118", diastolic: "7\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "diastolic", row: null },
  });
});

test("field order: systolic is fully validated before diastolic", () => {
  assert.deepEqual(run({ systolic: "", diastolic: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "systolic", row: null },
  });
  assert.deepEqual(run({ systolic: "118", diastolic: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "diastolic", row: null },
  });
  // The diastolic field's own RANGE failure precedes the cross-field
  // check (validation is per-field first, cross-field last).
  assert.deepEqual(run({ systolic: "110", diastolic: "201" }), {
    ok: false,
    error: { code: "RANGE", field: "diastolic", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("118"), schema);
  assert.deepEqual(run({ systolic: "118" }), schema);
  assert.deepEqual(run({ systolic: "118", diastolic: "76", extra: "x" }), schema);
  assert.deepEqual(run({ systolic: 118, diastolic: "76" }), schema);
  assert.deepEqual(run({ systolic: "118", diastolic: null }), schema);
  const withAccessor = { diastolic: "76" };
  Object.defineProperty(withAccessor, "systolic", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/blood-pressure.mjs", import.meta.url));
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
