// Civil-date core tests. Expectations are known calendar facts and
// hand-counted day offsets, independent of the implementation.

import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  civilFromDays,
  daysFromCivil,
  diffDays,
  formatCivilDate,
  isLeapYear,
  isValidCivil,
  parseCivilDate,
} from "../public/js/core/civil.mjs";

test("epoch anchors are the known day counts", () => {
  assert.equal(daysFromCivil(1970, 1, 1), 0);
  assert.equal(daysFromCivil(2000, 1, 1), 10957);
  // 56 years from 1970 with 14 leap days: 56 * 365 + 14 = 20454.
  assert.equal(daysFromCivil(2026, 1, 1), 20454);
  assert.deepEqual(civilFromDays(0), { year: 1970, month: 1, day: 1 });
});

test("day counting is exclusive-of-start (SPEC section 4 example)", () => {
  const jan1 = parseCivilDate("2026-01-01");
  assert.equal(formatCivilDate(addDays(jan1, 1)), "2026-01-02");
  assert.equal(formatCivilDate(addDays(jan1, 0)), "2026-01-01");
  assert.equal(diffDays(parseCivilDate("2026-01-02"), jan1), 1);
});

test("leap years and century rules", () => {
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(2000), true); // divisible by 400
  assert.equal(isLeapYear(2100), false); // divisible by 100 only
  assert.equal(parseCivilDate("2028-02-29") !== null, true); // exists
  assert.equal(parseCivilDate("2026-02-29"), null); // does not exist
  assert.equal(parseCivilDate("2000-02-29") !== null, true);
  assert.equal(parseCivilDate("2100-02-29"), null);
});

test("February boundaries step correctly in leap and common years", () => {
  assert.equal(formatCivilDate(addDays(parseCivilDate("2028-02-28"), 1)), "2028-02-29");
  assert.equal(formatCivilDate(addDays(parseCivilDate("2028-02-29"), 1)), "2028-03-01");
  assert.equal(formatCivilDate(addDays(parseCivilDate("2026-02-28"), 1)), "2026-03-01");
});

test("year rollover and month lengths", () => {
  assert.equal(formatCivilDate(addDays(parseCivilDate("2026-12-31"), 1)), "2027-01-01");
  assert.equal(formatCivilDate(addDays(parseCivilDate("2026-01-31"), 1)), "2026-02-01");
  assert.equal(formatCivilDate(addDays(parseCivilDate("2026-04-30"), 1)), "2026-05-01");
});

test("impossible and malformed dates are refused by parsing", () => {
  assert.equal(parseCivilDate("2026-02-30"), null);
  assert.equal(parseCivilDate("2026-13-01"), null);
  assert.equal(parseCivilDate("2026-00-10"), null);
  assert.equal(parseCivilDate("2026-04-31"), null);
  assert.equal(parseCivilDate("2026/01/01"), null);
  assert.equal(parseCivilDate("2026-1-1"), null);
  assert.equal(parseCivilDate(""), null);
  assert.equal(parseCivilDate("not-a-date"), null);
  assert.equal(isValidCivil(2026, 2, 29), false);
  assert.equal(isValidCivil(2028, 2, 29), true);
});

test("round trips across a spread of dates including leap days", () => {
  const dates = [
    "1970-01-01", "1999-12-31", "2000-02-29", "2024-02-29",
    "2026-01-01", "2026-10-08", "2027-07-27", "2028-02-29",
    "2028-08-21", "2100-03-01", "1900-03-01",
  ];
  for (const iso of dates) {
    const dayCount = parseCivilDate(iso);
    assert.notEqual(dayCount, null, iso);
    assert.equal(formatCivilDate(dayCount), iso);
    const { year, month, day } = civilFromDays(dayCount);
    assert.equal(daysFromCivil(year, month, day), dayCount);
  }
});

test("a full 400-year cycle round-trips exactly (146097 days)", () => {
  const start = parseCivilDate("2000-01-01");
  assert.equal(formatCivilDate(addDays(start, 146097)), "2400-01-01");
  for (let offset = 0; offset < 146097; offset += 977) {
    const { year, month, day } = civilFromDays(start + offset);
    assert.equal(daysFromCivil(year, month, day), start + offset);
  }
});
