// Core tests: the 12 literal core fixtures vendored verbatim from the
// fixed spec candidate (spec-pet-age-converter-20261109, candidate
// commit 6d76d1b14832f3c8488ca7090c7916e4576096b4, spec PR #157) are
// deep-compared, plus boundary and validation-order cases whose
// expected values were derived by hand from the SPEC's stated rules
// (integer twelfths, N12 = 15*min(m,12) + 9*clamp(m-12,0,12) +
// r*max(m-24,0); display t = floor((10*N12part + 6) / 12) / 10; stages
// compare exact N12 with 12 * thresholds). Expected values are never
// produced by the implementation under test.

import assert from "node:assert/strict";
import test from "node:test";
import { convert, errorMessage } from "../public/js/core/pet-age.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

test("fixtures: identity of the vendored spec candidate", () => {
  assert.equal(fixtures.specId, "spec-pet-age-converter-20261109");
  assert.equal(fixtures.slug, "pet-age-converter");
  assert.equal(coreCases.length, 12);
});

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(convert(entry.input), entry.expected);
  });
}

function baseInput() {
  return { species: "dog", size: "medium", years: "3", months: "6" };
}

function expectError(input, code, field) {
  assert.deepEqual(convert(input), { ok: false, error: { code, field, row: null } });
}

function expectResult(input, result) {
  assert.deepEqual(convert(input), { ok: true, result });
}

test("boundary: m=12 fills segment 1 exactly (H = 15, young)", () => {
  expectResult(
    { species: "dog", size: "medium", years: "1", months: "0" },
    {
      species: "dog",
      size: "medium",
      totalMonths: 12,
      humanYears: 15.0,
      stageKey: "young",
      stageZh: "青年",
      stageEn: "Young adult",
      breakdown: { segment1: 15.0, segment2: 0.0, segment3: 0.0 },
      laterRatePerYear: 5,
    },
  );
});

test("boundary: m=13 is the first month of segment 2", () => {
  // N12 = 180 + 9 = 189; total display floor((1890+6)/12)/10 = 15.8;
  // segment 2 display floor((90+6)/12)/10 = 0.8.
  expectResult(
    { species: "dog", size: "medium", years: "1", months: "1" },
    {
      species: "dog",
      size: "medium",
      totalMonths: 13,
      humanYears: 15.8,
      stageKey: "young",
      stageZh: "青年",
      stageEn: "Young adult",
      breakdown: { segment1: 15.0, segment2: 0.8, segment3: 0.0 },
      laterRatePerYear: 5,
    },
  );
});

test("boundary: m=24 fills segment 2 exactly (H = 24, adult)", () => {
  expectResult(
    { species: "dog", size: "medium", years: "2", months: "0" },
    {
      species: "dog",
      size: "medium",
      totalMonths: 24,
      humanYears: 24.0,
      stageKey: "adult",
      stageZh: "成年",
      stageEn: "Adult",
      breakdown: { segment1: 15.0, segment2: 9.0, segment3: 0.0 },
      laterRatePerYear: 5,
    },
  );
});

test("boundary: m=25 is the first month of segment 3", () => {
  // N12 = 288 + 5 = 293; total floor((2930+6)/12)/10 = 24.4;
  // segment 3 floor((50+6)/12)/10 = 0.4.
  expectResult(
    { species: "dog", size: "medium", years: "2", months: "1" },
    {
      species: "dog",
      size: "medium",
      totalMonths: 25,
      humanYears: 24.4,
      stageKey: "adult",
      stageZh: "成年",
      stageEn: "Adult",
      breakdown: { segment1: 15.0, segment2: 9.0, segment3: 0.4 },
      laterRatePerYear: 5,
    },
  );
});

test("boundary: cat total months 456 is allowed, 457 is RANGE on years", () => {
  // N12 = 180 + 108 + 4*432 = 2016; total floor((20160+6)/12)/10 = 168.0;
  // segment 3 floor((17280+6)/12)/10 = 144.0.
  expectResult(
    { species: "cat", size: "", years: "38", months: "0" },
    {
      species: "cat",
      size: null,
      totalMonths: 456,
      humanYears: 168.0,
      stageKey: "senior",
      stageZh: "高齡",
      stageEn: "Senior",
      breakdown: { segment1: 15.0, segment2: 9.0, segment3: 144.0 },
      laterRatePerYear: 4,
    },
  );
  expectError({ species: "cat", size: "", years: "38", months: "1" }, "RANGE", "years");
});

test("boundary: stage thresholds use the exact value (giant T1 = 38)", () => {
  // Giant rate 7: N12 = 288 + 7*(m-24). m=48 gives N12 = 456 = 12*38,
  // exactly at the mature threshold (lower bound included).
  expectResult(
    { species: "dog", size: "giant", years: "4", months: "0" },
    {
      species: "dog",
      size: "giant",
      totalMonths: 48,
      humanYears: 38.0,
      stageKey: "mature",
      stageZh: "熟齡",
      stageEn: "Mature",
      breakdown: { segment1: 15.0, segment2: 9.0, segment3: 14.0 },
      laterRatePerYear: 7,
    },
  );
  // m=47 gives N12 = 449 < 456, still adult; display 37.4.
  expectResult(
    { species: "dog", size: "giant", years: "3", months: "11" },
    {
      species: "dog",
      size: "giant",
      totalMonths: 47,
      humanYears: 37.4,
      stageKey: "adult",
      stageZh: "成年",
      stageEn: "Adult",
      breakdown: { segment1: 15.0, segment2: 9.0, segment3: 13.4 },
      laterRatePerYear: 7,
    },
  );
});

test("boundary: one month below the large-dog T1 threshold stays adult", () => {
  // Large rate 6, T1 = 45 (N12 threshold 540). m=65: N12 = 288 + 246 = 534.
  expectResult(
    { species: "dog", size: "large", years: "5", months: "5" },
    {
      species: "dog",
      size: "large",
      totalMonths: 65,
      humanYears: 44.5,
      stageKey: "adult",
      stageZh: "成年",
      stageEn: "Adult",
      breakdown: { segment1: 15.0, segment2: 9.0, segment3: 20.5 },
      laterRatePerYear: 6,
    },
  );
});

test("grammar: leading zeros, spaces, signs, decimals are INTEGER_FORMAT", () => {
  for (const bad of ["01", " 1", "1 ", "+1", "-1", "1.0", "1e1", "１２"]) {
    const input = baseInput();
    input.years = bad;
    expectError(input, "INTEGER_FORMAT", "years");
  }
  const badMonths = baseInput();
  badMonths.months = "06";
  expectError(badMonths, "INTEGER_FORMAT", "months");
});

test("field semantics: EMPTY, ENUM and per-field RANGE", () => {
  const noSpecies = baseInput();
  noSpecies.species = "";
  expectError(noSpecies, "EMPTY", "species");
  const fish = baseInput();
  fish.species = "fish";
  expectError(fish, "ENUM", "species");
  const huge = baseInput();
  huge.size = "huge";
  expectError(huge, "ENUM", "size");
  const noYears = baseInput();
  noYears.years = "";
  expectError(noYears, "EMPTY", "years");
  const years39 = baseInput();
  years39.years = "39";
  expectError(years39, "RANGE", "years");
  const noMonths = baseInput();
  noMonths.months = "";
  expectError(noMonths, "EMPTY", "months");
  const months12 = baseInput();
  months12.months = "12";
  expectError(months12, "RANGE", "months");
});

test("validation order: capacity pass precedes all semantics", () => {
  // size "" would be EMPTY at the semantic step, but the years field
  // exceeding the 8-unit capacity is caught in the earlier capacity
  // pass, so INPUT_LIMIT on years wins.
  const input = { species: "dog", size: "", years: "123456789", months: "0" };
  expectError(input, "INPUT_LIMIT", "years");
});

test("validation order: species before size before years before months", () => {
  const input = { species: "fish", size: "", years: "x", months: "99" };
  expectError(input, "ENUM", "species");
  const sizeFirst = { species: "dog", size: "", years: "x", months: "99" };
  expectError(sizeFirst, "EMPTY", "size");
  const yearsFirst = { species: "dog", size: "small", years: "x", months: "99" };
  expectError(yearsFirst, "INTEGER_FORMAT", "years");
});

test("schema: unknown, missing, wrong-type, and accessor inputs are SCHEMA", () => {
  expectError(null, "SCHEMA", null);
  expectError([], "SCHEMA", null);
  expectError("draft", "SCHEMA", null);
  expectError(42, "SCHEMA", null);
  // Unknown fields report field null, per the SPEC.
  const extra = baseInput();
  extra.note = "x";
  expectError(extra, "SCHEMA", null);
  const missing = baseInput();
  delete missing.months;
  expectError(missing, "SCHEMA", "months");
  const wrongType = baseInput();
  wrongType.years = 3;
  expectError(wrongType, "SCHEMA", "years");
  const accessor = baseInput();
  Object.defineProperty(accessor, "size", {
    enumerable: true,
    get() {
      return "medium";
    },
  });
  expectError(accessor, "SCHEMA", "size");
});

test("string limits: over 8 code units is INPUT_LIMIT, lone surrogate is UNICODE", () => {
  const longSpecies = baseInput();
  longSpecies.species = "dogdogdog";
  expectError(longSpecies, "INPUT_LIMIT", "species");
  const surrogate = baseInput();
  surrogate.months = "\uD800";
  expectError(surrogate, "UNICODE", "months");
  const surrogateYears = baseInput();
  surrogateYears.years = "3\uDC00";
  expectError(surrogateYears, "UNICODE", "years");
});

test("robustness: hostile strings stay inert data and never throw", () => {
  const hostile = baseInput();
  hostile.species = "<script>";
  expectError(hostile, "ENUM", "species");
  const prototypeKeys = JSON.parse(
    '{"species":"dog","size":"medium","years":"3","months":"6","__proto__":{}}',
  );
  expectError(prototypeKeys, "SCHEMA", null);
});

test("error messages: pinned bilingual templates with field substitution", () => {
  assert.equal(
    errorMessage({ code: "EMPTY", field: "years", row: null }, "zh-Hant"),
    "歲不可空白。",
  );
  assert.equal(
    errorMessage({ code: "EMPTY", field: "years", row: null }, "en"),
    "Years must not be empty.",
  );
  assert.equal(
    errorMessage({ code: "INTEGER_FORMAT", field: "months", row: null }, "zh-Hant"),
    "月必須是整數。",
  );
  assert.equal(
    errorMessage({ code: "RANGE", field: "size", row: null }, "en"),
    "Size is out of range.",
  );
  assert.equal(
    errorMessage({ code: "ENUM", field: "species", row: null }, "zh-Hant"),
    "物種不是可用的選項。",
  );
  assert.equal(
    errorMessage({ code: "INPUT_LIMIT", field: "years", row: null }, "zh-Hant"),
    "輸入太長。",
  );
  assert.equal(
    errorMessage({ code: "UNICODE", field: "months", row: null }, "en"),
    "Input contains invalid characters.",
  );
  assert.equal(
    errorMessage({ code: "SCHEMA", field: null, row: null }, "zh-Hant"),
    "輸入格式不正確。",
  );
  assert.equal(
    errorMessage({ code: "INTERNAL", field: null, row: null }, "en"),
    "Something went wrong. Please try again.",
  );
});
