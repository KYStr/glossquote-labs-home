// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/child-height-predictor)
// plus cases derived by hand from the SPEC rules — never from the core's
// own output. Success fixtures were also re-derived independently with
// exact Fraction arithmetic before writing the core.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test("boundary: 100.0 and 230.0 are legal, 99.9 and 230.1 are RANGE", () => {
  const ok = (input) => assert.equal(run(input).ok, true, JSON.stringify(input));
  const range = (input, field) =>
    assert.deepEqual(run(input), {
      ok: false,
      error: { code: "RANGE", field, row: null },
    });
  ok({ childSex: "boy", fatherHeightCm: "100.0", motherHeightCm: "230.0" });
  ok({ childSex: "girl", fatherHeightCm: "230.0", motherHeightCm: "100.0" });
  range({ childSex: "boy", fatherHeightCm: "99.9", motherHeightCm: "165" }, "fatherHeightCm");
  range({ childSex: "boy", fatherHeightCm: "178", motherHeightCm: "230.1" }, "motherHeightCm");
  // Grammar-valid but below the range: "0" parses, then fails RANGE.
  range({ childSex: "boy", fatherHeightCm: "0", motherHeightCm: "165" }, "fatherHeightCm");
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run({ childSex: "boy", fatherHeightCm: "178", motherHeightCm: "165" }).ok, true);
  assert.equal(run({ childSex: "girl", fatherHeightCm: "172.5", motherHeightCm: "160.0" }).ok, true);
  for (const bad of [".5", "5.", "0175", "007", "178.55", "+178", "-178", "1e3", " 178", "178 ", "178,5", "178..5", ""]) {
    const outcome = run({ childSex: "boy", fatherHeightCm: bad, motherHeightCm: "165" });
    // "" is EMPTY, the rest are DECIMAL_FORMAT.
    const expected = bad === "" ? "EMPTY" : "DECIMAL_FORMAT";
    assert.deepEqual(
      outcome,
      { ok: false, error: { code: expected, field: "fatherHeightCm", row: null } },
      `expected ${expected} for ${JSON.stringify(bad)}`
    );
  }
});

test("half-up tie: unrounded .25 and .75 round up, never from the rounded value", () => {
  // Father 170.0, mother 160.5, boy: S = 1700 + 1605 + 130 = 3435 twentieths.
  // Estimate 3435/20 = 171.75 -> 171.8; low 3265/20 = 163.25 -> 163.3;
  // high 3605/20 = 180.25 -> 180.3. Hand-computed.
  assert.deepEqual(run({ childSex: "boy", fatherHeightCm: "170.0", motherHeightCm: "160.5" }), {
    ok: true,
    result: { childSex: "boy", targetCm: 171.8, rangeLowCm: 163.3, rangeHighCm: 180.3 },
  });
});

test("invariants: boy-girl gap is exactly 13.0, rounded range width is exactly 17.0", () => {
  for (const [f, m] of [["178", "165"], ["172.5", "160"], ["100.0", "230.0"], ["199.5", "155.5"]]) {
    const boy = run({ childSex: "boy", fatherHeightCm: f, motherHeightCm: m }).result;
    const girl = run({ childSex: "girl", fatherHeightCm: f, motherHeightCm: m }).result;
    assert.equal(boy.targetCm - girl.targetCm, 13.0);
    assert.equal(boy.rangeHighCm - boy.rangeLowCm, 17.0);
    assert.equal(girl.rangeHighCm - girl.rangeLowCm, 17.0);
    assert.equal(boy.rangeLowCm - girl.rangeLowCm, 13.0);
  }
});

test("schema: wrong types, missing/extra fields, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  const good = { childSex: "boy", fatherHeightCm: "178", motherHeightCm: "165" };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("boy"), schema);
  assert.deepEqual(run([good]), schema);
  assert.deepEqual(run({ fatherHeightCm: "178", motherHeightCm: "165" }), schema);
  assert.deepEqual(run({ ...good, extra: "x" }), schema);
  assert.deepEqual(run({ ...good, fatherHeightCm: 178 }), schema);
  assert.deepEqual(run({ ...good, childSex: null }), schema);
  const withGetter = { childSex: "boy", motherHeightCm: "165" };
  Object.defineProperty(withGetter, "fatherHeightCm", {
    enumerable: true,
    get() {
      return "178";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("validation order: INPUT_LIMIT before grammar, UNICODE after limit, first error wins", () => {
  // 9 characters: INPUT_LIMIT even though the grammar would also fail.
  assert.deepEqual(run({ childSex: "boy", fatherHeightCm: "123456789", motherHeightCm: "165" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "fatherHeightCm", row: null },
  });
  // Lone surrogate is UNICODE.
  assert.deepEqual(run({ childSex: "boy", fatherHeightCm: "\uD800", motherHeightCm: "165" }), {
    ok: false,
    error: { code: "UNICODE", field: "fatherHeightCm", row: null },
  });
  assert.deepEqual(run({ childSex: "boy", fatherHeightCm: "178", motherHeightCm: "1\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "motherHeightCm", row: null },
  });
  // A long raw value containing a lone surrogate is INPUT_LIMIT, not UNICODE.
  assert.deepEqual(run({ childSex: "boy", fatherHeightCm: "\uD80012345678", motherHeightCm: "165" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "fatherHeightCm", row: null },
  });
  // Father is checked before mother: father's RANGE wins over mother's bad grammar.
  assert.deepEqual(run({ childSex: "boy", fatherHeightCm: "99.9", motherHeightCm: "abc" }), {
    ok: false,
    error: { code: "RANGE", field: "fatherHeightCm", row: null },
  });
  // ENUM is checked after both height fields.
  assert.deepEqual(run({ childSex: "other", fatherHeightCm: "99.9", motherHeightCm: "165" }), {
    ok: false,
    error: { code: "RANGE", field: "fatherHeightCm", row: null },
  });
});
