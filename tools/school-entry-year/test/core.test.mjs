// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-school-entry-year-20261109, spec candidate commit
// 5719e8694bcb005721557ec5fb62ce5b0ef1acef). Every literal case is
// asserted with a full deep equal of the complete result or the
// complete error triple, so no field can hide behind a partial match.
// The hand-derived cases below are computed from the SPEC's rules by
// hand (cohort cutoff (9,1), ROC = CE - 1911, observed Feb-29
// birthday on Mar 1, school year Sep 1 to Aug 31), never from the
// implementation's output.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { run } from "../public/js/core/school-entry.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-school-entry-year-20261109");
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

test("range endpoints are accepted (SPEC: 1912-01-01 to 2199-12-31 inclusive)", () => {
  // Hand-derived: (1,1) <= (9,1), so E = 1912 + 6 = 1918, ROC 7,
  // A6 = 1918-01-01, full months to 1918-09-01 = 8. As-of 1912-01-01
  // belongs to school year 1911: g = 1911 - 1918 + 1 = -6.
  const min = run({ birthDate: "1912-01-01", asOfDate: "1912-01-01" });
  assert.equal(min.ok, true);
  assert.deepEqual(min.result.entry, {
    septemberYear: 1918,
    rocYear: 7,
    month: 9,
    ageYears: 6,
    ageMonths: 8,
  });
  assert.deepEqual(min.result.current, {
    schoolYearStartYear: 1911,
    schoolYearRoc: 0,
    gradeIndex: -6,
    ageAtStartYears: null,
    stage: "notEnrolled",
    stageGrade: null,
    band: null,
    nameZh: "未滿 2 歲（尚未入學）",
    nameEn: "Under 2 (Not Yet Enrolled)",
    aliasZh: null,
  });
  // Hand-derived: (12,31) > (9,1), so E = 2199 + 7 = 2206, ROC 295,
  // A6 = 2205-12-31, full months to 2206-09-01 = 8. As-of 2199-12-31
  // belongs to school year 2199: g = 2199 - 2206 + 1 = -6.
  const max = run({ birthDate: "2199-12-31", asOfDate: "2199-12-31" });
  assert.equal(max.ok, true);
  assert.deepEqual(max.result.entry, {
    septemberYear: 2206,
    rocYear: 295,
    month: 9,
    ageYears: 6,
    ageMonths: 8,
  });
  assert.equal(max.result.current.gradeIndex, -6);
});

test("one day outside the range is RANGE in the offending field", () => {
  assert.deepEqual(run({ birthDate: "1911-12-31", asOfDate: "2026-10-15" }), {
    ok: false,
    error: { code: "RANGE", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: "2019-09-01", asOfDate: "2200-01-01" }), {
    ok: false,
    error: { code: "RANGE", field: "asOfDate", row: null },
  });
});

test("gregorian validity follows the SPEC leap rule and real month lengths", () => {
  // 2000 is a leap year (divisible by 400); 2100 is not (divisible by
  // 100, not 400), per the SPEC's isLeapYear.
  assert.equal(run({ birthDate: "2000-02-29", asOfDate: "2026-10-15" }).ok, true);
  assert.deepEqual(run({ birthDate: "2100-02-29", asOfDate: "2199-12-31" }), {
    ok: false,
    error: { code: "DATE_INVALID", field: "birthDate", row: null },
  });
  // April has 30 days; month 00 and day 00 are not real dates.
  for (const bad of ["2020-04-31", "2020-00-10", "2020-01-00", "2019-02-29"]) {
    assert.deepEqual(run({ birthDate: bad, asOfDate: "2026-10-15" }), {
      ok: false,
      error: { code: "DATE_INVALID", field: "birthDate", row: null },
    });
  }
});

test("format requires exactly YYYY-MM-DD with ASCII digits and hyphens", () => {
  for (const bad of ["2019-9-01", "2019-09-0 ", "２０１９-０９-０１", "2019_09_01"]) {
    assert.deepEqual(run({ birthDate: bad, asOfDate: "2026-10-15" }), {
      ok: false,
      error: { code: "DATE_FORMAT", field: "birthDate", row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // Eleven characters: too long even though one of them is also a
  // lone surrogate (limit precedes the Unicode check in SPEC order).
  assert.deepEqual(run({ birthDate: "2019-09-011", asOfDate: "2026-10-15" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: "2019-09-01\uD800", asOfDate: "2026-10-15" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: " 2019-09-01", asOfDate: "2026-10-15" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "birthDate", row: null },
  });
});

test("lone surrogates are UNICODE at exactly ten units", () => {
  assert.deepEqual(run({ birthDate: "2019-09-0\uD800", asOfDate: "2026-10-15" }), {
    ok: false,
    error: { code: "UNICODE", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: "2019-09-01", asOfDate: "2026-10-1\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "asOfDate", row: null },
  });
});

test("EMPTY birth date is reported before the as-of date is examined", () => {
  assert.deepEqual(run({ birthDate: "", asOfDate: "not-a-date" }), {
    ok: false,
    error: { code: "EMPTY", field: "birthDate", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("2019-09-01"), schema);
  assert.deepEqual(run({ birthDate: "2019-09-01" }), schema);
  assert.deepEqual(
    run({ birthDate: "2019-09-01", asOfDate: "2026-10-15", extra: "x" }),
    schema,
  );
  assert.deepEqual(run({ birthDate: 20190901, asOfDate: "2026-10-15" }), schema);
  assert.deepEqual(run({ birthDate: "2019-09-01", asOfDate: null }), schema);
  const withAccessor = { asOfDate: "2026-10-15" };
  Object.defineProperty(withAccessor, "birthDate", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("equal birth and as-of dates are legal (DATE_ORDER is strict)", () => {
  const actual = run({ birthDate: "2026-08-10", asOfDate: "2026-08-10" });
  assert.equal(actual.ok, true);
  assert.equal(actual.result.current.schoolYearStartYear, 2025);
  assert.equal(actual.result.current.gradeIndex, -6);
  assert.equal(actual.result.current.ageAtStartYears, null);
});

test("school year boundary: Aug 31 and Sep 1 of the same calendar year", () => {
  // Hand-derived from the SPEC: an as-of date in September belongs to
  // the school year starting that year; in August, to the previous.
  const birth = "2019-09-01";
  const before = run({ birthDate: birth, asOfDate: "2026-08-31" });
  assert.deepEqual(before.result.current, {
    schoolYearStartYear: 2025,
    schoolYearRoc: 114,
    gradeIndex: 1,
    ageAtStartYears: 6,
    stage: "elementary",
    stageGrade: 1,
    band: null,
    nameZh: "國小一年級",
    nameEn: "Elementary School Grade 1",
    aliasZh: null,
  });
  const after = run({ birthDate: birth, asOfDate: "2026-09-01" });
  assert.deepEqual(after.result.current, {
    schoolYearStartYear: 2026,
    schoolYearRoc: 115,
    gradeIndex: 2,
    ageAtStartYears: 7,
    stage: "elementary",
    stageGrade: 2,
    band: null,
    nameZh: "國小二年級",
    nameEn: "Elementary School Grade 2",
    aliasZh: null,
  });
});

test("Feb-29 birth in a leap birth year: sixth birthday observed on Mar 1", () => {
  // Hand-derived: 2016 is a leap year but 2022 is not, so the sixth
  // birthday is observed on 2022-03-01; full months from 2022-03-01
  // to the 2022-09-01 entry are exactly 6. As-of 2022-09-01 is the
  // first day of school year 2022: g = 1, age at start 6.
  const actual = run({ birthDate: "2016-02-29", asOfDate: "2022-09-01" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result.entry, {
    septemberYear: 2022,
    rocYear: 111,
    month: 9,
    ageYears: 6,
    ageMonths: 6,
  });
  assert.deepEqual(actual.result.current, {
    schoolYearStartYear: 2022,
    schoolYearRoc: 111,
    gradeIndex: 1,
    ageAtStartYears: 6,
    stage: "elementary",
    stageGrade: 1,
    band: null,
    nameZh: "國小一年級",
    nameEn: "Elementary School Grade 1",
    aliasZh: null,
  });
});

test("month boundaries of the age-months rule (hand-derived)", () => {
  // (8,31) <= (9,1): E = 2025, A6 = 2025-08-31, full months to
  // 2025-09-01 = 0 (Sep day 1 < Aug day 31).
  const aug31 = run({ birthDate: "2019-08-31", asOfDate: "2026-10-15" });
  assert.deepEqual(aug31.result.entry, {
    septemberYear: 2025,
    rocYear: 114,
    month: 9,
    ageYears: 6,
    ageMonths: 0,
  });
  // (10,1) > (9,1): E = 2026, A6 = 2025-10-01, full months to
  // 2026-09-01 = 11.
  const oct1 = run({ birthDate: "2019-10-01", asOfDate: "2026-10-15" });
  assert.deepEqual(oct1.result.entry, {
    septemberYear: 2026,
    rocYear: 115,
    month: 9,
    ageYears: 6,
    ageMonths: 11,
  });
});

test("invariants across a birth-date sweep (SPEC properties)", () => {
  // For every birth date: entry age is exactly 6 years plus 0..11
  // months, kindergarten years are E-4..E-1, the projection is twelve
  // consecutive school years starting at the entry year, and the
  // current status is exactly the projection row whose span contains
  // the as-of date when 1 <= g <= 12.
  const births = [
    "2018-01-01", "2018-02-28", "2018-03-01", "2018-08-31", "2018-09-01",
    "2018-09-02", "2018-12-31", "2019-06-15", "2020-02-29", "2020-03-01",
    "2021-11-30", "2024-02-29",
  ];
  for (const birthDate of births) {
    const actual = run({ birthDate, asOfDate: "2026-11-09" });
    assert.equal(actual.ok, true, birthDate);
    const { entry, kindergarten, current, projection } = actual.result;
    assert.equal(entry.ageYears, 6, birthDate);
    assert.ok(entry.ageMonths >= 0 && entry.ageMonths <= 11, birthDate);
    assert.equal(entry.month, 9, birthDate);
    assert.equal(entry.rocYear, entry.septemberYear - 1911, birthDate);
    assert.deepEqual(
      kindergarten.map((row) => row.septemberYear),
      [entry.septemberYear - 4, entry.septemberYear - 3, entry.septemberYear - 2, entry.septemberYear - 1],
      birthDate,
    );
    assert.equal(projection.length, 12, birthDate);
    for (let i = 0; i < 12; i += 1) {
      assert.equal(projection[i].gradeIndex, i + 1, birthDate);
      assert.equal(projection[i].septemberYear, entry.septemberYear + i, birthDate);
      assert.equal(projection[i].spanStart, `${entry.septemberYear + i}-09-01`, birthDate);
      assert.equal(projection[i].spanEnd, `${entry.septemberYear + i + 1}-08-31`, birthDate);
    }
    if (current.gradeIndex >= 1 && current.gradeIndex <= 12) {
      const row = projection[current.gradeIndex - 1];
      assert.equal(current.stage, row.stage, birthDate);
      assert.equal(current.nameZh, row.nameZh, birthDate);
    }
    // ageAtStartYears is a = g + 5 whenever a >= 0, and null only
    // when a < 0 (the school year started before the birth).
    assert.equal(
      current.ageAtStartYears,
      current.gradeIndex + 5 >= 0 ? current.gradeIndex + 5 : null,
      birthDate,
    );
  }
});
