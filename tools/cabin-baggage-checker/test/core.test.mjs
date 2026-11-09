// Core tests for the Cabin Baggage Checker. Every fixture expectation
// below comes from test/fixtures.json, vendored verbatim from the fixed
// spec package spec-cabin-baggage-checker-20261109 (spec candidate
// commit 92a5d5d91e84796517238b33f189365bf98c3853) — never from the
// implementation's own output. The additional boundary and validation
// cases are derived by hand from the SPEC's decimal grammar, ranges,
// validation order and tenths arithmetic (56 cm vs a 55 cm limit fails;
// 54 cm passes with a 1.0 cm margin; starlux total 7.0 kg at the limit
// passes while 7.1 kg fails by 0.1 kg; a 200 cm / 100 kg endpoint is in
// range while 200.1 / 100.1 are RANGE).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AIRLINE_IDS,
  DEFAULTS,
  EXAMPLE,
  RULES,
  RULES_AS_OF,
  buildReport,
  run,
} from "../public/js/core/baggage.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(coreCases.length, 9);
assert.equal(fixtures.specId, "spec-cabin-baggage-checker-20261109");

for (const fixtureCase of coreCases) {
  test(`fixture ${fixtureCase.id}`, () => {
    assert.deepEqual(run(fixtureCase.input), fixtureCase.expected);
  });
}

test("fixture set covers every airline and both weight modes", () => {
  assert.deepEqual(
    RULES.map((rule) => rule.id),
    AIRLINE_IDS,
  );
  assert.equal(RULES_AS_OF, "2026-11-09");
  const byId = new Map(RULES.map((rule) => [rule.id, rule]));
  assert.equal(byId.get("eva").weightMode, "main");
  assert.equal(byId.get("china-airlines").weightMode, "main");
  assert.equal(byId.get("starlux").weightMode, "total");
  assert.equal(byId.get("starlux").weightLimitTenths, 70);
  assert.equal(byId.get("tigerair-taiwan").personalTenths, null);
  assert.equal(byId.get("jal").personalTenths, null);
  assert.equal(byId.get("ana").weightLimitTenths, 100);
});

test("defaults are empty strings with all six airlines selected", () => {
  assert.deepEqual(DEFAULTS, {
    bagLength: "",
    bagWidth: "",
    bagHeight: "",
    bagWeightKg: "",
    personalLength: "",
    personalWidth: "",
    personalHeight: "",
    personalWeightKg: "",
    airlines: ["eva", "china-airlines", "starlux", "tigerair-taiwan", "ana", "jal"],
  });
});

test("the example equals the first fixture case input", () => {
  assert.deepEqual(EXAMPLE, coreCases[0].input);
});

const BASE = {
  bagLength: "50",
  bagWidth: "30",
  bagHeight: "20",
  bagWeightKg: "5",
  personalLength: "",
  personalWidth: "",
  personalHeight: "",
  personalWeightKg: "",
  airlines: ["eva"],
};

test("schema rejects an accessor property without invoking it", () => {
  let invoked = false;
  const input = { ...BASE };
  Object.defineProperty(input, "bagLength", {
    enumerable: true,
    get() {
      invoked = true;
      return "50";
    },
  });
  assert.deepEqual(run(input), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.equal(invoked, false);
});

test("schema rejects an extra field", () => {
  assert.deepEqual(run({ ...BASE, extra: "1" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("schema rejects a missing field", () => {
  const { bagHeight, ...rest } = BASE;
  assert.equal(bagHeight, "20");
  assert.deepEqual(run(rest), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
});

test("schema rejects null and non-object input", () => {
  for (const bad of [null, 42, "x", []]) {
    assert.deepEqual(run(bad), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  }
});

test("schema rejects a non-array airlines value", () => {
  assert.deepEqual(run({ ...BASE, airlines: "eva" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("airlines with more than six entries is INPUT_LIMIT before membership checks", () => {
  assert.deepEqual(
    run({ ...BASE, airlines: ["eva", "eva", "eva", "eva", "eva", "eva", "eva"] }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "airlines", row: null } },
  );
});

test("a non-string airline member is SCHEMA with field and row null", () => {
  // SPEC: shape errors are SCHEMA with field,row=null; only ENUM and
  // DUPLICATE carry the airlines field and a 1-based row.
  assert.deepEqual(run({ ...BASE, airlines: ["eva", 3] }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("a repeated airline is DUPLICATE with the second occurrence row", () => {
  assert.deepEqual(run({ ...BASE, airlines: ["ana", "jal", "ana"] }), {
    ok: false,
    error: { code: "DUPLICATE", field: "airlines", row: 3 },
  });
});

test("an input over eight UTF-16 units is INPUT_LIMIT", () => {
  assert.deepEqual(run({ ...BASE, bagLength: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "bagLength", row: null },
  });
});

test("an unpaired surrogate is UNICODE", () => {
  assert.deepEqual(run({ ...BASE, bagWeightKg: "5\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "bagWeightKg", row: null },
  });
});

test("malformed decimals are DECIMAL_FORMAT", () => {
  for (const value of ["05", "5.", ".5", "5.55", "+5", " 5", "5 ", "１２", "1,000", "-5"]) {
    assert.deepEqual(
      run({ ...BASE, bagLength: value }),
      { ok: false, error: { code: "DECIMAL_FORMAT", field: "bagLength", row: null } },
      value,
    );
  }
});

test("the 200 cm and 100 kg endpoints are in range", () => {
  const outcome = run({
    ...BASE,
    bagLength: "200",
    bagWidth: "200",
    bagHeight: "200",
    bagWeightKg: "100",
    airlines: ["jal"],
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.airlines[0].marginsCm, ["-145.0", "-160.0", "-175.0"]);
});

test("just over the endpoints is RANGE", () => {
  assert.deepEqual(run({ ...BASE, bagLength: "200.1" }), {
    ok: false,
    error: { code: "RANGE", field: "bagLength", row: null },
  });
  assert.deepEqual(run({ ...BASE, bagWeightKg: "100.1" }), {
    ok: false,
    error: { code: "RANGE", field: "bagWeightKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, bagLength: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "bagLength", row: null },
  });
  assert.deepEqual(run({ ...BASE, bagLength: "0.0" }), {
    ok: false,
    error: { code: "RANGE", field: "bagLength", row: null },
  });
});

test("a personal block with only the weight filled needs personalLength first", () => {
  assert.deepEqual(run({ ...BASE, personalWeightKg: "1.5" }), {
    ok: false,
    error: { code: "EMPTY", field: "personalLength", row: null },
  });
});

test("a personal block with only dimensions filled needs personalWeightKg", () => {
  assert.deepEqual(
    run({ ...BASE, personalLength: "40", personalWidth: "30", personalHeight: "10" }),
    { ok: false, error: { code: "EMPTY", field: "personalWeightKg", row: null } },
  );
});

test("bag-block errors precede personal-block errors", () => {
  assert.deepEqual(run({ ...BASE, bagWeightKg: "5.55", personalLength: "40" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "bagWeightKg", row: null },
  });
});

test("airline errors precede bag-field errors", () => {
  assert.deepEqual(run({ ...BASE, airlines: [], bagLength: "xx" }), {
    ok: false,
    error: { code: "EMPTY", field: "airlines", row: null },
  });
});

test("starlux total weight exactly at the limit passes, 0.1 kg over fails", () => {
  const atLimit = run({
    ...BASE,
    bagWeightKg: "6.5",
    personalLength: "40",
    personalWidth: "30",
    personalHeight: "10",
    personalWeightKg: "0.5",
    airlines: ["starlux"],
  });
  assert.equal(atLimit.ok, true);
  assert.equal(atLimit.result.airlines[0].weight.checkedKg, "7.0");
  assert.equal(atLimit.result.airlines[0].weight.marginKg, "0.0");
  assert.equal(atLimit.result.airlines[0].pass, true);
  const over = run({
    ...BASE,
    bagWeightKg: "6.6",
    personalLength: "40",
    personalWidth: "30",
    personalHeight: "10",
    personalWeightKg: "0.5",
    airlines: ["starlux"],
  });
  assert.equal(over.result.airlines[0].weight.marginKg, "-0.1");
  assert.equal(over.result.airlines[0].pass, false);
});

test("a personal item over an unpublished limit never fails the airline", () => {
  const outcome = run({
    ...BASE,
    personalLength: "50",
    personalWidth: "40",
    personalHeight: "30",
    personalWeightKg: "1",
    airlines: ["jal"],
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.airlines[0].personal, {
    status: "notSpecified",
    marginsCm: null,
  });
  assert.equal(outcome.result.airlines[0].pass, true);
});

test("exactly at every limit passes with zero margins and no negative zero", () => {
  const outcome = run({
    ...BASE,
    bagLength: "56",
    bagWidth: "36",
    bagHeight: "23",
    bagWeightKg: "7",
    airlines: ["eva"],
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result.airlines[0].marginsCm, ["0.0", "0.0", "0.0"]);
  assert.equal(outcome.result.airlines[0].weight.marginKg, "0.0");
  assert.equal(outcome.result.summary.overallPass, true);
});

test("report refuses a non-object result argument", () => {
  assert.deepEqual(buildReport(null), {
    ok: false,
    error: { code: "INTERNAL", field: null, row: null },
  });
  assert.deepEqual(buildReport(42), {
    ok: false,
    error: { code: "INTERNAL", field: null, row: null },
  });
});
