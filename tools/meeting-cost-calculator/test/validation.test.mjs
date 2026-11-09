// Boundary and refusal tests: every SPEC section 4 limit at and beyond the
// edge (sections 6 boundaries / 7e). Expected error codes are from the
// core's documented vocabulary; the accept/refuse decisions are the SPEC's.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDuration,
  parseHeadcount,
  parseRate,
  validateRoster,
} from "../public/js/core/calculator.mjs";

test("headcount: 1 and 100 accepted; 0, 101 and 2.5 refused", () => {
  assert.deepEqual(parseHeadcount("1"), { ok: true, value: 1 });
  assert.deepEqual(parseHeadcount("100"), { ok: true, value: 100 });
  assert.equal(parseHeadcount("0").error, "out-of-range");
  assert.equal(parseHeadcount("101").error, "out-of-range");
  assert.equal(parseHeadcount("2.5").error, "not-whole");
  assert.equal(parseHeadcount("").error, "required");
  assert.equal(parseHeadcount("five").error, "not-a-number");
});

test("rate: 0 and 100,000 accepted; negative, 100,000.01 and 3 decimals refused", () => {
  assert.deepEqual(parseRate("0"), { ok: true, value: 0 });
  assert.deepEqual(parseRate("40.00"), { ok: true, value: 4000 });
  assert.deepEqual(parseRate("100000"), { ok: true, value: 10000000 });
  assert.deepEqual(parseRate("100000.00"), { ok: true, value: 10000000 });
  assert.equal(parseRate("-1").error, "out-of-range");
  assert.equal(parseRate("-0.01").error, "out-of-range");
  assert.equal(parseRate("100000.01").error, "out-of-range");
  assert.equal(parseRate("1.234").error, "too-many-decimals");
  assert.equal(parseRate("").error, "required");
  assert.equal(parseRate("abc").error, "not-a-number");
});

test("duration: 1 and 1,440 minutes accepted; 0 and 1,441 refused", () => {
  assert.deepEqual(parseDuration("0", "1"), { ok: true, value: 1 });
  assert.deepEqual(parseDuration("1", "0"), { ok: true, value: 60 });
  assert.deepEqual(parseDuration("24", "0"), { ok: true, value: 1440 });
  // 24 h with minutes > 0 exceeds the 1,440 cap.
  assert.equal(parseDuration("24", "1").errors.duration, "duration-out-of-range");
  assert.equal(parseDuration("0", "0").errors.duration, "duration-out-of-range");
  assert.equal(parseDuration("25", "0").errors.hours, "out-of-range");
  assert.equal(parseDuration("0", "60").errors.minutes, "out-of-range");
  assert.equal(parseDuration("1.5", "0").errors.hours, "not-whole");
  assert.equal(parseDuration("", "0").errors.hours, "required");
});

test("roster: one and five groups work; zero and a sixth are refused", () => {
  const one = validateRoster([{ headcount: "5", rate: "40.00" }]);
  assert.equal(one.ok, true);
  const five = validateRoster(
    Array.from({ length: 5 }, () => ({ headcount: "2", rate: "10" })),
  );
  assert.equal(five.ok, true);
  assert.equal(validateRoster([]).errors.roster, "group-count");
  const six = validateRoster(
    Array.from({ length: 6 }, () => ({ headcount: "2", rate: "10" })),
  );
  assert.equal(six.errors.roster, "group-count");
});

test("roster: a blank rate is an error state for that group until filled or removed", () => {
  const roster = validateRoster([
    { headcount: "3", rate: "60.00" },
    { headcount: "2", rate: "" },
  ]);
  assert.equal(roster.ok, false);
  assert.equal(roster.errors.fields[1].rate, "required");
  assert.equal(roster.errors.fields[0].rate, undefined);
});

test("roster: parsed groups carry exact integer cents", () => {
  const roster = validateRoster([{ headcount: "3", rate: "60.00" }]);
  assert.deepEqual(roster.groups, [{ headcount: 3, rateCents: 6000 }]);
});
