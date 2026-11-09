// Core tests: the literal core cases from fixtures.json, plus hand-derived
// table, snapping, validation-order, and property cases from the SPEC.
//
// IMPORTANT — spec-errata candidate (see VERIFICATION.md): five fixture
// expectations treat NT$4,200 / NT$4,600 as valid amounts, but the SPEC's
// normative validity predicate (inputsOutputs rule 2: the decimal string
// must not contain the digit 4) makes every 4xxx amount invalid. No single
// reading satisfies both (a hundreds-digit-only reading would make 4,000
// and 4,800 valid, contradicting the wedding-avoid-four fixture purpose).
// Per the build rule, the implementation follows the SPEC's stated rule;
// the four agreeing success fixtures and all four error fixtures are
// deep-compared verbatim below, and the five conflicting cases are asserted
// against rule-derived values in a dedicated block.

import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAmount,
  isValidAmount,
  run,
  snapDownRational,
  snapNearestRational,
  snapUpRational,
} from "../public/js/core/red-envelope.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = Object.fromEntries(
  fixtures.cases.filter((entry) => entry.kind === "core").map((entry) => [entry.id, entry]),
);

// Fixtures whose expectations agree with the SPEC's stated predicate.
const VERBATIM_IDS = [
  "wedding-basic",
  "new-year-junior-elementary",
  "new-year-elder-established",
  "new-year-elder-student",
  "error-wedding-missing-tier",
  "error-full-month-tier-set",
  "error-count-range",
  "error-funeral-enum",
];
for (const id of VERBATIM_IDS) {
  test(`fixture ${id}: ${coreCases[id].purpose}`, () => {
    assert.deepEqual(run(coreCases[id].input), coreCases[id].expected);
  });
}

function expectedResult(input, rangeLow, rangeHigh, recommended, notes) {
  return {
    ok: true,
    result: {
      occasion: input.occasion,
      relationship: input.relationship,
      tier: input.tier,
      giverStage: input.giverStage,
      ageBand: input.ageBand,
      attending: input.attending,
      attendeeCount: Number(input.attendeeCount),
      rangeLow,
      rangeHigh,
      recommended,
      currency: "TWD",
      unit: "per-envelope",
      notes,
    },
  };
}

// The five conflicting fixtures, asserted against the values the SPEC's
// stated predicate produces (hand-derived; see VERIFICATION.md errata):
// every 4xxx amount is invalid, so snapping steps over the whole band.
const ERRATA_CASES = [
  // fixture rangeHigh 4200; rule: snapDown(4200) steps over 41xx-40xx to 3800
  ["wedding-midpoint-tie", 3200, 3800, 3800, ["customs-vary"]],
  // fixture 3200-4600 / 4200; rule: snapDown(4800) = 3800, mid 4000 -> 3800
  ["wedding-avoid-four", 3200, 3800, 3800, ["customs-vary"]],
  // fixture rangeHigh 4200; rule: snapDown(4320) = 3800
  ["wedding-not-attending", 2000, 3800, 3200, ["customs-vary", "not-attending-discount"]],
  // fixture rangeLow 4600; rule: snapUp(4600) = 5000
  ["wedding-extra-attendees", 5000, 5600, 5200, ["customs-vary", "extra-attendees"]],
  // fixture recommended 4600; rule: mid 4600 -> snapNearest = 5000
  ["full-month-relative", 2600, 6600, 5000, ["customs-vary"]],
];
for (const [id, rangeLow, rangeHigh, recommended, notes] of ERRATA_CASES) {
  test(`errata case ${id}: rule-derived values (fixture conflicts with SPEC predicate)`, () => {
    const input = coreCases[id].input;
    assert.deepEqual(run(input), expectedResult(input, rangeLow, rangeHigh, recommended, notes));
  });
}

const wedding = (relationship, tier, extra = {}) => ({
  occasion: "wedding",
  relationship,
  tier,
  giverStage: null,
  ageBand: null,
  attending: true,
  attendeeCount: "1",
  ...extra,
});
const byRelationship = (occasion, relationship) => ({
  occasion,
  relationship,
  tier: null,
  giverStage: null,
  ageBand: null,
  attending: true,
  attendeeCount: "1",
});

// Every wedding table cell, count 1, attending. Expected values derived by
// hand from the SPEC table plus the stated predicate (see errata note for
// the friend/hotel and senior/five-star cells).
const WEDDING_CELLS = [
  ["colleague", "restaurant", 1200, 2000, 1600],
  ["colleague", "hotel", 1800, 2600, 2200],
  ["colleague", "five-star", 2600, 3200, 2800],
  ["friend", "restaurant", 2600, 3600, 3200],
  ["friend", "hotel", 3200, 3800, 3800],
  ["friend", "five-star", 3800, 3800, 3800],
  ["relative", "restaurant", 2600, 6600, 5000],
  ["relative", "hotel", 3200, 7200, 5200],
  ["relative", "five-star", 3800, 7800, 5800],
  ["senior", "restaurant", 2000, 3600, 2800],
  ["senior", "hotel", 2600, 3800, 3600],
  ["senior", "five-star", 3200, 3800, 3800],
];
for (const [relationship, tier, rangeLow, rangeHigh, recommended] of WEDDING_CELLS) {
  test(`wedding table ${relationship}/${tier}`, () => {
    const input = wedding(relationship, tier);
    assert.deepEqual(run(input), expectedResult(input, rangeLow, rangeHigh, recommended, ["customs-vary"]));
  });
}

const SIMPLE_CELLS = [
  // [occasion, key field, key value, rangeLow, rangeHigh, recommended, notes]
  ["full-month", "relationship", "colleague", 1200, 2000, 1600, ["customs-vary"]],
  ["full-month", "relationship", "friend", 2000, 3600, 2800, ["customs-vary"]],
  ["full-month", "relationship", "relative", 2600, 6600, 5000, ["customs-vary"]],
  ["full-month", "relationship", "senior", 2000, 3600, 2800, ["customs-vary"]],
  ["housewarming", "relationship", "colleague", 1200, 2000, 1600, ["customs-vary", "gift-alternative"]],
  ["housewarming", "relationship", "friend", 2000, 3600, 2800, ["customs-vary", "gift-alternative"]],
  ["housewarming", "relationship", "relative", 2600, 3600, 3200, ["customs-vary", "gift-alternative"]],
  ["housewarming", "relationship", "senior", 2000, 3600, 2800, ["customs-vary", "gift-alternative"]],
  ["new-year-elder", "giverStage", "student", 600, 2000, 1200, ["customs-vary"]],
  ["new-year-elder", "giverStage", "early-career", 2000, 3600, 2800, ["customs-vary"]],
  ["new-year-elder", "giverStage", "established", 3600, 6600, 5200, ["customs-vary"]],
  ["new-year-junior", "ageBand", "preschool", 200, 600, 600, ["customs-vary"]],
  ["new-year-junior", "ageBand", "elementary", 600, 1200, 1000, ["customs-vary"]],
  ["new-year-junior", "ageBand", "junior-high", 800, 1600, 1200, ["customs-vary"]],
  ["new-year-junior", "ageBand", "senior-high", 1200, 3600, 2600, ["customs-vary"]],
  ["new-year-junior", "ageBand", "university", 1200, 3600, 2600, ["customs-vary"]],
];
for (const [occasion, field, value, rangeLow, rangeHigh, recommended, notes] of SIMPLE_CELLS) {
  test(`table ${occasion}/${value}`, () => {
    const input =
      field === "relationship"
        ? byRelationship(occasion, value)
        : {
            occasion,
            relationship: null,
            tier: null,
            giverStage: field === "giverStage" ? value : null,
            ageBand: field === "ageBand" ? value : null,
            attending: true,
            attendeeCount: "1",
          };
    assert.deepEqual(run(input), expectedResult(input, rangeLow, rangeHigh, recommended, notes));
  });
}

test("wedding extra attendees: increments land on both ends (hand-derived)", () => {
  const two = wedding("friend", "restaurant", { attendeeCount: "2" });
  assert.deepEqual(run(two), expectedResult(two, 3600, 3800, 3800, ["customs-vary", "extra-attendees"]));
  const six = wedding("colleague", "restaurant", { attendeeCount: "6" });
  assert.deepEqual(run(six), expectedResult(six, 6200, 7000, 6600, ["customs-vary", "extra-attendees"]));
  const hotelTwo = wedding("relative", "hotel", { attendeeCount: "2" });
  assert.deepEqual(run(hotelTwo), expectedResult(hotelTwo, 5000, 8200, 6600, ["customs-vary", "extra-attendees"]));
});

test("wedding not attending: 60% integer scaling then snap (hand-derived)", () => {
  const colleague = wedding("colleague", "restaurant", { attending: false });
  assert.deepEqual(
    run(colleague),
    expectedResult(colleague, 800, 1200, 1000, ["customs-vary", "not-attending-discount"]),
  );
  const senior = wedding("senior", "five-star", { attending: false });
  assert.deepEqual(
    run(senior),
    expectedResult(senior, 2000, 2800, 2600, ["customs-vary", "not-attending-discount"]),
  );
});

test("validity predicate literals, including the >= 10000 thousands rule", () => {
  const cases = [
    [0, false], [199, false], [200, true], [250, false], [300, false], [400, false],
    [600, true], [800, true], [1000, true], [1400, false], [4200, false], [4600, false],
    [5000, true], [9900, false], [10000, true], [10200, true], [12000, true],
    [14000, false], [20000, true], [44000, false], [46000, false], [62000, true],
    [100000, true], [240000, false],
  ];
  for (const [amount, expected] of cases) {
    assert.equal(isValidAmount(amount), expected, `isValidAmount(${amount})`);
  }
});

test("snap functions at the SPEC's boundary points", () => {
  assert.equal(snapUpRational(200, 1), 200);
  assert.equal(snapDownRational(200, 1), 200);
  assert.equal(snapUpRational(9900, 1), 10000);
  assert.equal(snapDownRational(9900, 1), 9800);
  assert.equal(snapUpRational(10000, 1), 10000);
  assert.equal(snapDownRational(12000, 1), 12000);
  assert.equal(snapUpRational(14000, 1), 16000);
  assert.equal(snapDownRational(14000, 1), 12900);
  assert.equal(snapUpRational(44000, 1), 50000);
  assert.equal(snapDownRational(44000, 1), 38900);
  // Ties go up; a .5 midpoint is compared exactly on the doubled scale.
  assert.equal(snapNearestRational(3700, 1), 3800);
  assert.equal(snapNearestRational(900, 1), 1000);
  assert.equal(snapNearestRational(1300, 1), 1200);
  assert.equal(snapNearestRational(3120, 1), 3200);
  assert.equal(snapNearestRational(10201, 2), 5200); // y = 5100.5
  // Below the 200 floor, snapping down falls back to the snapped-up value.
  assert.equal(snapDownRational(150, 1), 200);
  assert.equal(snapNearestRational(1, 2), 200);
});

function errorOf(input) {
  const outcome = run(input);
  assert.equal(outcome.ok, false);
  return outcome.error;
}
const validWedding = wedding("colleague", "restaurant");

test("SCHEMA: missing key, extra key, array, null, and accessor property", () => {
  const missing = { ...validWedding };
  delete missing.tier;
  assert.deepEqual(errorOf(missing), { code: "SCHEMA", field: null, row: null });
  assert.deepEqual(errorOf({ ...validWedding, extra: "x" }), { code: "SCHEMA", field: null, row: null });
  assert.deepEqual(errorOf(["wedding"]), { code: "SCHEMA", field: null, row: null });
  assert.deepEqual(errorOf(null), { code: "SCHEMA", field: null, row: null });
  const withAccessor = { ...validWedding };
  Object.defineProperty(withAccessor, "tier", { get: () => "restaurant", enumerable: true });
  assert.deepEqual(errorOf(withAccessor), { code: "SCHEMA", field: null, row: null });
});

test("TYPE precedes per-field content checks", () => {
  assert.deepEqual(errorOf({ ...validWedding, occasion: null }), { code: "TYPE", field: "occasion", row: null });
  assert.deepEqual(errorOf({ ...validWedding, relationship: 42 }), { code: "TYPE", field: "relationship", row: null });
  assert.deepEqual(errorOf({ ...validWedding, attending: "yes" }), { code: "TYPE", field: "attending", row: null });
  assert.deepEqual(errorOf({ ...validWedding, attendeeCount: 2 }), { code: "TYPE", field: "attendeeCount", row: null });
});

test("INPUT_LIMIT at 33 UTF-16 units, checked before ENUM", () => {
  assert.deepEqual(errorOf({ ...validWedding, tier: "x".repeat(33) }), {
    code: "INPUT_LIMIT",
    field: "tier",
    row: null,
  });
  assert.deepEqual(errorOf({ ...validWedding, relationship: "z".repeat(32) }), {
    code: "ENUM",
    field: "relationship",
    row: null,
  });
});

test("UNICODE for a lone surrogate, checked before ENUM", () => {
  assert.deepEqual(errorOf({ ...validWedding, relationship: "fr\uD800iend" }), {
    code: "UNICODE",
    field: "relationship",
    row: null,
  });
  assert.deepEqual(errorOf({ ...validWedding, tier: "\uDC00" }), {
    code: "UNICODE",
    field: "tier",
    row: null,
  });
});

test("attendeeCount grammar and range", () => {
  for (const bad of ["", "01", "1.0", " 1", "1 ", "+1", "６", "1e3"]) {
    assert.deepEqual(
      errorOf({ ...validWedding, attendeeCount: bad }),
      { code: "INTEGER_FORMAT", field: "attendeeCount", row: null },
      `attendeeCount ${JSON.stringify(bad)}`,
    );
  }
  assert.deepEqual(errorOf({ ...validWedding, attendeeCount: "0" }), {
    code: "RANGE",
    field: "attendeeCount",
    row: null,
  });
});

test("applicability: EMPTY and NOT_APPLICABLE in the fixed field order", () => {
  assert.deepEqual(errorOf({ ...validWedding, relationship: null }), {
    code: "EMPTY",
    field: "relationship",
    row: null,
  });
  assert.deepEqual(errorOf(wedding("colleague", "restaurant", { giverStage: "student", ageBand: "preschool" })), {
    code: "NOT_APPLICABLE",
    field: "giverStage",
    row: null,
  });
  const elderBase = {
    occasion: "new-year-elder",
    relationship: null,
    tier: null,
    giverStage: null,
    ageBand: null,
    attending: true,
    attendeeCount: "1",
  };
  assert.deepEqual(errorOf(elderBase), { code: "EMPTY", field: "giverStage", row: null });
  assert.deepEqual(errorOf({ ...elderBase, giverStage: "student", relationship: "friend" }), {
    code: "NOT_APPLICABLE",
    field: "relationship",
    row: null,
  });
  const juniorBase = { ...elderBase, occasion: "new-year-junior" };
  assert.deepEqual(errorOf(juniorBase), { code: "EMPTY", field: "ageBand", row: null });
  const fullMonth = byRelationship("full-month", "friend");
  assert.deepEqual(errorOf({ ...fullMonth, attending: false }), {
    code: "NOT_APPLICABLE",
    field: "attending",
    row: null,
  });
  assert.deepEqual(errorOf({ ...fullMonth, attendeeCount: "2" }), {
    code: "NOT_APPLICABLE",
    field: "attendeeCount",
    row: null,
  });
  // tier precedes giverStage in the applicability order
  assert.deepEqual(errorOf({ ...fullMonth, tier: "hotel", giverStage: "student" }), {
    code: "NOT_APPLICABLE",
    field: "tier",
    row: null,
  });
});

test("per-field errors beat applicability; wedding consistency is last", () => {
  // ENUM on relationship (step 1) wins over EMPTY tier (step 2)
  assert.deepEqual(errorOf({ ...validWedding, relationship: "pal", tier: null }), {
    code: "ENUM",
    field: "relationship",
    row: null,
  });
  // not attending with companions -> RANGE on attendeeCount (step 3)
  assert.deepEqual(errorOf({ ...validWedding, attending: false, attendeeCount: "3" }), {
    code: "RANGE",
    field: "attendeeCount",
    row: null,
  });
});

test("invariant sweep: every reachable input yields valid, ordered amounts", () => {
  const inputs = [];
  for (const relationship of ["colleague", "friend", "relative", "senior"]) {
    for (const tier of ["restaurant", "hotel", "five-star"]) {
      for (let count = 1; count <= 6; count += 1) {
        inputs.push(wedding(relationship, tier, { attendeeCount: String(count) }));
      }
      inputs.push(wedding(relationship, tier, { attending: false }));
    }
    inputs.push(byRelationship("full-month", relationship));
    inputs.push(byRelationship("housewarming", relationship));
  }
  for (const giverStage of ["student", "early-career", "established"]) {
    inputs.push({
      occasion: "new-year-elder",
      relationship: null,
      tier: null,
      giverStage,
      ageBand: null,
      attending: true,
      attendeeCount: "1",
    });
  }
  for (const ageBand of ["preschool", "elementary", "junior-high", "senior-high", "university"]) {
    inputs.push({
      occasion: "new-year-junior",
      relationship: null,
      tier: null,
      giverStage: null,
      ageBand,
      attending: true,
      attendeeCount: "1",
    });
  }
  assert.equal(inputs.length, 100);
  for (const input of inputs) {
    const outcome = run(input);
    assert.equal(outcome.ok, true, JSON.stringify(input));
    const { rangeLow, rangeHigh, recommended, notes } = outcome.result;
    assert.ok(isValidAmount(rangeLow), `rangeLow ${rangeLow}`);
    assert.ok(isValidAmount(rangeHigh), `rangeHigh ${rangeHigh}`);
    assert.ok(isValidAmount(recommended), `recommended ${recommended}`);
    assert.ok(rangeLow <= recommended && recommended <= rangeHigh, JSON.stringify(outcome.result));
    assert.equal(notes[0], "customs-vary");
  }
});

test("formatAmount groups thousands with the NT$ prefix", () => {
  assert.equal(formatAmount(200), "NT$200");
  assert.equal(formatAmount(1200), "NT$1,200");
  assert.equal(formatAmount(10000), "NT$10,000");
  assert.equal(formatAmount(1234567), "NT$1,234,567");
});
