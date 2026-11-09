// Due-date core tests. Every expected value is either a literal
// fixture from SPEC section 4 or hand-counted from the calendar
// (day-of-year arithmetic is spelled out in comments); none was
// taken from the implementation's output.

import assert from "node:assert/strict";
import test from "node:test";

import { parseCivilDate } from "../public/js/core/civil.mjs";
import {
  computeFromConception,
  computeFromLmp,
  computeFromUltrasound,
  eddFromConception,
  eddFromLmp,
  eddFromUltrasound,
} from "../public/js/core/due-date.mjs";

// SPEC section 4 fixes the reference "today" for its GA fixtures.
const REF_TODAY = parseCivilDate("2026-11-02");

// --- SPEC fixtures D1-D6 ------------------------------------------

test("D1: LMP 2026-01-01 cycle 28 -> EDD 2026-10-08 with all trimester dates", () => {
  const out = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, REF_TODAY);
  assert.equal(out.ok, true);
  assert.equal(out.result.edd, "2026-10-08");
  assert.deepEqual(
    out.result.trimesters.map((t) => [t.id, t.start, t.end]),
    [
      ["first", "2026-01-01", "2026-04-08"],
      ["second", "2026-04-09", "2026-07-15"],
      ["third", "2026-07-16", "2026-10-08"],
    ],
  );
});

test("D2: same LMP at cycle 35 shifts the EDD by exactly +7 days", () => {
  const out = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "35" }, REF_TODAY);
  assert.equal(out.ok, true);
  assert.equal(out.result.edd, "2026-10-15");
});

test("D3: conception 2026-01-15 gives the same EDD as D1 (cross-mode identity)", () => {
  const out = computeFromConception({ conceptionDate: "2026-01-15" }, REF_TODAY);
  assert.equal(out.ok, true);
  assert.equal(out.result.edd, "2026-10-08");
});

test("D4: ultrasound 2026-03-05 at 9w2d -> EDD 2026-10-06", () => {
  const out = computeFromUltrasound(
    { scanDate: "2026-03-05", scanWeeks: "9", scanDays: "2" },
    REF_TODAY,
  );
  assert.equal(out.ok, true);
  assert.equal(out.result.edd, "2026-10-06");
});

test("D5: LMP 2026-10-20, today 2026-11-02 -> GA 1w6d, first trimester, EDD 2027-07-27", () => {
  const out = computeFromLmp({ lmpDate: "2026-10-20", cycleLength: "28" }, REF_TODAY);
  assert.equal(out.ok, true);
  assert.equal(out.result.edd, "2027-07-27");
  assert.equal(out.result.gestationalAgeDays, 13);
  assert.equal(out.result.gestationalWeeks, 1);
  assert.equal(out.result.gestationalDays, 6);
  assert.equal(out.result.trimester, "first");
  assert.equal(out.result.beyondTerm, false);
});

test("D6: leap crossing, LMP 2027-11-15 -> EDD 2028-08-21 (crosses 2028-02-29)", () => {
  const out = computeFromLmp(
    { lmpDate: "2027-11-15", cycleLength: "28" },
    parseCivilDate("2027-11-15"),
  );
  assert.equal(out.ok, true);
  assert.equal(out.result.edd, "2028-08-21");
});

// --- Trimester boundaries from GA day counts (SPEC section 4) -----
// day zero is 2026-01-01 for LMP 2026-01-01 cycle 28. Hand counts:
// +97 -> day-of-year 98 -> 2026-04-08; +98 -> 2026-04-09;
// +195 -> day-of-year 196 -> 2026-07-15; +196 -> 2026-07-16.

test("trimester of GA day 97 is first, day 98 is second", () => {
  const at97 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, parseCivilDate("2026-04-08"));
  assert.equal(at97.result.gestationalAgeDays, 97);
  assert.equal(at97.result.trimester, "first");
  const at98 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, parseCivilDate("2026-04-09"));
  assert.equal(at98.result.gestationalAgeDays, 98);
  assert.equal(at98.result.trimester, "second");
});

test("trimester of GA day 195 is second, day 196 is third", () => {
  const at195 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, parseCivilDate("2026-07-15"));
  assert.equal(at195.result.gestationalAgeDays, 195);
  assert.equal(at195.result.trimester, "second");
  const at196 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, parseCivilDate("2026-07-16"));
  assert.equal(at196.result.gestationalAgeDays, 196);
  assert.equal(at196.result.trimester, "third");
});

// --- Beyond 42 weeks (SPEC sections 4 and 7e) ----------------------
// 2026-01-01 + 294 days -> day-of-year 295 -> 2026-10-22;
// +295 -> 2026-10-23. 295 days = 42 weeks + 1 day.

test("GA day 294 does not trigger the beyond-42-weeks note; day 295 does, unclamped", () => {
  const at294 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, parseCivilDate("2026-10-22"));
  assert.equal(at294.result.gestationalAgeDays, 294);
  assert.equal(at294.result.beyondTerm, false);
  assert.equal(at294.result.trimester, "third");
  const at295 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28" }, parseCivilDate("2026-10-23"));
  assert.equal(at295.result.gestationalAgeDays, 295);
  assert.equal(at295.result.beyondTerm, true);
  assert.equal(at295.result.gestationalWeeks, 42);
  assert.equal(at295.result.gestationalDays, 1);
});

// --- Input bounds (SPEC sections 2, 3 and 6) -----------------------
// Cycle 21: EDD = 2026-10-08 minus 7 = 2026-10-01 (day-of-year 274).
// Cycle 45: EDD = 2026-10-08 plus 17 = 2026-10-25 (day-of-year 298).

test("cycle lengths 21 and 45 are accepted with the exact EDD shift", () => {
  const c21 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "21" }, REF_TODAY);
  assert.equal(c21.ok, true);
  assert.equal(c21.result.edd, "2026-10-01");
  const c45 = computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "45" }, REF_TODAY);
  assert.equal(c45.ok, true);
  assert.equal(c45.result.edd, "2026-10-25");
});

test("cycle lengths 20, 46 and 28.5 are refused", () => {
  assert.equal(computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "20" }, REF_TODAY).errors.cycleLength, "range");
  assert.equal(computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "46" }, REF_TODAY).errors.cycleLength, "range");
  assert.equal(computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "28.5" }, REF_TODAY).errors.cycleLength, "not-whole");
  assert.equal(computeFromLmp({ lmpDate: "2026-01-01", cycleLength: "" }, REF_TODAY).errors.cycleLength, "required");
});

// Ultrasound bounds. Scan 2026-03-05 is day-of-year 64.
// 4w0d: GA 28 -> EDD = scan + 252 -> day-of-year 316 -> 2026-11-12.
// 42w6d: GA 300 -> EDD = scan - 20 -> day-of-year 44 -> 2026-02-13.

test("ultrasound GA 4w0d and 42w6d are accepted with exact EDDs", () => {
  const low = computeFromUltrasound({ scanDate: "2026-03-05", scanWeeks: "4", scanDays: "0" }, REF_TODAY);
  assert.equal(low.ok, true);
  assert.equal(low.result.edd, "2026-11-12");
  const high = computeFromUltrasound({ scanDate: "2026-03-05", scanWeeks: "42", scanDays: "6" }, REF_TODAY);
  assert.equal(high.ok, true);
  assert.equal(high.result.edd, "2026-02-13");
});

test("ultrasound GA 3w6d, 43w0d and a 7th day are refused", () => {
  assert.equal(
    computeFromUltrasound({ scanDate: "2026-03-05", scanWeeks: "3", scanDays: "6" }, REF_TODAY).errors.scanWeeks,
    "range",
  );
  assert.equal(
    computeFromUltrasound({ scanDate: "2026-03-05", scanWeeks: "43", scanDays: "0" }, REF_TODAY).errors.scanWeeks,
    "range",
  );
  assert.equal(
    computeFromUltrasound({ scanDate: "2026-03-05", scanWeeks: "9", scanDays: "7" }, REF_TODAY).errors.scanDays,
    "range",
  );
  assert.equal(
    computeFromUltrasound({ scanDate: "2026-03-05", scanWeeks: "9.5", scanDays: "0" }, REF_TODAY).errors.scanWeeks,
    "not-whole",
  );
});

// --- Date refusals (SPEC section 3) --------------------------------

test("a date one day in the future is refused in every mode", () => {
  assert.equal(computeFromLmp({ lmpDate: "2026-11-03", cycleLength: "28" }, REF_TODAY).errors.lmpDate, "future");
  assert.equal(computeFromConception({ conceptionDate: "2026-11-03" }, REF_TODAY).errors.conceptionDate, "future");
  assert.equal(
    computeFromUltrasound({ scanDate: "2026-11-03", scanWeeks: "9", scanDays: "0" }, REF_TODAY).errors.scanDate,
    "future",
  );
});

test("today itself is accepted; impossible and malformed dates are refused", () => {
  assert.equal(computeFromLmp({ lmpDate: "2026-11-02", cycleLength: "28" }, REF_TODAY).ok, true);
  assert.equal(computeFromLmp({ lmpDate: "2026-02-30", cycleLength: "28" }, REF_TODAY).errors.lmpDate, "invalid");
  assert.equal(computeFromConception({ conceptionDate: "2026/01/15" }, REF_TODAY).errors.conceptionDate, "invalid");
  assert.equal(computeFromConception({ conceptionDate: "" }, REF_TODAY).errors.conceptionDate, "required");
});

// --- Consistency properties (SPEC section 7c) ----------------------
// Deterministic PRNG (mulberry32, fixed seed) so the corpus is
// stable; the property itself is the SPEC's identity, not output
// copied from the implementation.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("conception = LMP + (cycle - 14) reproduces the LMP EDD for 200 pseudo-random pairs", () => {
  const rand = mulberry32(20261102);
  const base = parseCivilDate("2024-01-01");
  for (let i = 0; i < 200; i += 1) {
    const lmpDay = base + Math.floor(rand() * 1400);
    const cycle = 21 + Math.floor(rand() * 25); // 21..45
    const conceptionDay = lmpDay + (cycle - 14);
    assert.equal(eddFromConception(conceptionDay), eddFromLmp(lmpDay, cycle));
  }
});

test("ultrasound reduction with scan = LMP and GA = 0 reproduces the LMP EDD at core level", () => {
  const lmpDay = parseCivilDate("2026-01-01");
  assert.equal(eddFromUltrasound(lmpDay, 0), eddFromLmp(lmpDay, 28));
});
