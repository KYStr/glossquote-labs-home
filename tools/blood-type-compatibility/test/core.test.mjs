import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/blood.mjs";

// Vendored verbatim from the fixed spec source:
// docs/specs/blood-type-compatibility/fixtures.json at spec candidate
// 27343e5d448ef476ba11f09697a8c5f9b30a77e0 (spec PR #172). The spec PR is not
// merged into this candidate's base, so the fixtures travel with the tests.
// Expected values come from the fixtures and from the antigen rules stated
// in the spec's AUTHOR-CHECK — never from the implementation's own output.
const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const fixture of coreCases) {
  test(`core fixture: ${fixture.id}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

// Independent derivation, written from the antigen rules in AUTHOR-CHECK:
// RBC — the donor's antigen set (O empty, A {A}, B {B}, AB {A,B}, plus D if
// Rh positive) must be a subset of the recipient's. Plasma — the recipient's
// ABO antigen set must be a subset of the donor's; Rh is ignored.
const TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
function aboOf(type) {
  return type.slice(0, -1);
}
function antigensOf(type) {
  const set = new Set();
  if (aboOf(type).includes("A")) set.add("A");
  if (aboOf(type).includes("B")) set.add("B");
  if (type.endsWith("+")) set.add("D");
  return set;
}
function ruleRbc(donor, recipient) {
  const donorSet = antigensOf(donor);
  const recipientSet = antigensOf(recipient);
  return [...donorSet].every((antigen) => recipientSet.has(antigen));
}
function rulePlasma(donor, recipient) {
  const donorSet = antigensOf(donor);
  const recipientSet = antigensOf(recipient);
  donorSet.delete("D");
  recipientSet.delete("D");
  return [...recipientSet].every((antigen) => donorSet.has(antigen));
}

test("all 64 pair verdicts match the antigen rules", () => {
  for (const donor of TYPES) {
    for (const recipient of TYPES) {
      assert.deepEqual(
        run({ mode: "pair", donor, recipient }),
        {
          ok: true,
          result: {
            donor,
            mode: "pair",
            plasma: rulePlasma(donor, recipient),
            rbc: ruleRbc(donor, recipient),
            recipient,
          },
        },
        `${donor} -> ${recipient}`,
      );
    }
  }
});

test("all eight single results match the antigen rules, badges included", () => {
  for (const type of TYPES) {
    const rbcDonateTo = TYPES.filter((other) => ruleRbc(type, other));
    const rbcReceiveFrom = TYPES.filter((other) => ruleRbc(other, type));
    const plasmaDonateTo = TYPES.filter((other) => rulePlasma(type, other));
    const plasmaReceiveFrom = TYPES.filter((other) => rulePlasma(other, type));
    const badges = [];
    if (rbcDonateTo.length === 8) badges.push("rbc-universal-donor");
    if (rbcReceiveFrom.length === 8) badges.push("rbc-universal-recipient");
    if (plasmaDonateTo.length === 8) badges.push("plasma-universal-donor");
    if (plasmaReceiveFrom.length === 8) badges.push("plasma-universal-recipient");
    assert.deepEqual(run({ mode: "single", bloodType: type }), {
      ok: true,
      result: {
        badges,
        bloodType: type,
        mode: "single",
        plasmaDonateTo,
        plasmaReceiveFrom,
        rbcDonateTo,
        rbcReceiveFrom,
      },
    }, type);
  }
});

test("empty type fields report EMPTY on the failing field", () => {
  assert.deepEqual(run({ mode: "single", bloodType: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "bloodType", row: null },
  });
  assert.deepEqual(run({ mode: "pair", donor: "O-", recipient: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "recipient", row: null },
  });
});

test("a code over the 8-unit raw capacity reports INPUT_LIMIT", () => {
  assert.deepEqual(run({ mode: "single", bloodType: "ABCDEFGHI" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "bloodType", row: null },
  });
});

test("an unpaired surrogate reports UNICODE before ENUM", () => {
  assert.deepEqual(run({ mode: "single", bloodType: "O\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "bloodType", row: null },
  });
});

test("shape defects report SCHEMA with a null field", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run(["O-"]), schema);
  assert.deepEqual(run({ bloodType: "O-" }), schema);
  assert.deepEqual(run({ mode: "single" }), schema);
  assert.deepEqual(run({ mode: "single", bloodType: "O-", donor: "O-" }), schema);
  assert.deepEqual(run({ mode: "pair", donor: "O-", recipient: "A-", note: "x" }), schema);
  assert.deepEqual(run({ mode: "single", bloodType: 7 }), schema);
});

test("accessor properties are rejected without being invoked", () => {
  let invoked = false;
  const hostile = { mode: "single" };
  Object.defineProperty(hostile, "bloodType", {
    enumerable: true,
    get() {
      invoked = true;
      return "O-";
    },
  });
  assert.deepEqual(run(hostile), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.equal(invoked, false);
});

test("an unknown mode reports ENUM on mode; pair fields validate in order", () => {
  assert.deepEqual(run({ mode: "triple", bloodType: "O-" }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  assert.deepEqual(run({ mode: "pair", donor: "X+", recipient: "Y+" }), {
    ok: false,
    error: { code: "ENUM", field: "donor", row: null },
  });
});
