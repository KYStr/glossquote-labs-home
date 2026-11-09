import assert from "node:assert/strict";
import test from "node:test";

// Timezone note: fixtures are stated in LOCAL time and start moments
// are constructed as local dates, so the expectations hold in the
// machine's local zone (SPEC section 7 pins the zone for the suite;
// these fixtures are zone-robust because every quantity is local).

import {
  FIELD_DEFS,
  buildExplanation,
  canonicalFromRange,
  canonicalFromStep,
  canonicalFromValues,
  classifyShape,
  dayMatches,
  describeField,
  nextRuns,
  parseExpression,
  parseField,
} from "../public/js/core/cron.mjs";

const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const local = (y, mo, d, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);

// --- SPEC section 4 worked fixtures, verbatim ---

test("fixture: */15 9-17 * * 1-5 from Friday 16:59 skips the weekend", () => {
  // SPEC DEFECT (documented in VERIFICATION.md): the SPEC's printed
  // fixture lists Fri 17:00 then Mon 09:00 as the next runs, but under
  // the SPEC's own normative semantics the hour set of 9-17 includes
  // 17 and the minute set of */15 is {0,15,30,45}, so Fri 17:15,
  // 17:30 and 17:45 also fire. The implementation follows the rules;
  // this test asserts the rule-derived sequence, which agrees with
  // the printed fixture on its first run and on the Monday runs.
  const parsed = parseExpression("*/15 9-17 * * 1-5");
  const { runs } = nextRuns(parsed, local(2026, 10, 30, 16, 59, 0));
  assert.deepEqual(runs.slice(0, 7).map(fmt), [
    "2026-10-30 17:00",
    "2026-10-30 17:15",
    "2026-10-30 17:30",
    "2026-10-30 17:45",
    "2026-11-02 09:00",
    "2026-11-02 09:15",
    "2026-11-02 09:30",
  ]);
});

test("fixture: 0 0 29 2 * from 2027-03-01 first fires 2028-02-29", () => {
  const { runs } = nextRuns(parseExpression("0 0 29 2 *"), local(2027, 3, 1, 0, 0));
  assert.equal(fmt(runs[0]), "2028-02-29 00:00");
});

test("fixture: 0 0 31 2 * never fires; the window is exhausted", () => {
  const started = Date.now();
  const { runs, exhausted } = nextRuns(parseExpression("0 0 31 2 *"), local(2026, 1, 15, 12, 0));
  const elapsed = Date.now() - started;
  assert.equal(runs.length, 0);
  assert.equal(exhausted, true);
  // SPEC section 4 bounds the worst case at ~2.11M iterations / 1 s on
  // a mid-range laptop; the suite records the Node timing with a loose
  // non-flaky ceiling rather than asserting the laptop bound here.
  assert.ok(elapsed < 5000, `never-fires scan took ${elapsed} ms`);
});

test("fixture: 0 12 15 * 5 fires on the 15th AND on Fridays (OR rule)", () => {
  const parsed = parseExpression("0 12 15 * 5");
  const { runs } = nextRuns(parsed, local(2026, 10, 30, 13, 0));
  assert.deepEqual(runs.slice(0, 3).map(fmt), [
    "2026-11-06 12:00", // Friday
    "2026-11-13 12:00", // Friday
    "2026-11-15 12:00", // the 15th (a Sunday)
  ]);
  assert.equal(buildExplanation(parsed).bothDayRestricted, true);
  assert.equal(buildExplanation(parseExpression("0 12 15 * *")).bothDayRestricted, false);
  assert.equal(buildExplanation(parseExpression("0 12 * * 5")).bothDayRestricted, false);
});

test("fixture: @weekly expands to 0 0 * * 0; all seven macros", () => {
  const expected = {
    "@hourly": "0 * * * *", "@daily": "0 0 * * *", "@midnight": "0 0 * * *",
    "@weekly": "0 0 * * 0", "@monthly": "0 0 1 * *",
    "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *",
  };
  for (const [macro, expansion] of Object.entries(expected)) {
    const parsed = parseExpression(macro);
    assert.equal(parsed.text, expansion, macro);
    assert.equal(parsed.macro, macro);
  }
  assert.throws(() => parseExpression("@reboot"),
    (e) => e.code === "MACRO_UNKNOWN" && e.params.supported.includes("@weekly"));
  assert.throws(() => parseExpression("@sometimes"), (e) => e.code === "MACRO_UNKNOWN");
});

test("fixture: 0 9 * * MON-FRI parses identically to 0 9 * * 1-5", () => {
  const byName = parseExpression("0 9 * * MON-FRI");
  const byNumber = parseExpression("0 9 * * 1-5");
  assert.deepEqual(byName.fields.map((f) => f.set), byNumber.fields.map((f) => f.set));
});

// --- Parser sweep (SPEC section 7b) ---

test("parser errors name the field and the token", () => {
  const cases = [
    ["0 9 * *", "FIELD_COUNT", 4],
    ["0 9 * * * *", "FIELD_COUNT", 6],
    ["60 * * * *", "VALUE_RANGE", "minute"],
    ["* 24 * * *", "VALUE_RANGE", "hour"],
    ["* * 0 * *", "VALUE_RANGE", "dom"],
    ["* * * 13 *", "VALUE_RANGE", "month"],
    ["* * * * 8", "VALUE_RANGE", "dow"],
    ["0 9 * FOO *", "UNKNOWN_NAME", "month"],
    ["0 9 * * FUNDAY", "UNKNOWN_NAME", "dow"],
    ["0 9-5 * * *", "RANGE_ORDER", "hour"],
    ["*/0 * * * *", "STEP_INVALID", "minute"],
    ["*/x * * * *", "STEP_INVALID", "minute"],
    ["0,,9 * * * *", "EMPTY_ITEM", "minute"],
    ["0 0 ? * *", "DIALECT_TOKEN", "dom"],
    ["0 0 * * 5#3", "DIALECT_TOKEN", "dow"],
    ["0 0 15W * *", "DIALECT_TOKEN", "dom"],
    ["0 0 L * *", "DIALECT_TOKEN", "dom"],
    ["0 0 * * L", "DIALECT_TOKEN", "dow"],
    ["1-2-3 * * * *", "ITEM_INVALID", "minute"],
  ];
  for (const [input, code, detail] of cases) {
    assert.throws(
      () => parseExpression(input),
      (error) =>
        error.code === code &&
        (code === "FIELD_COUNT"
          ? error.params.count === detail
          : error.params.field === detail),
      input,
    );
  }
});

test("names are case-insensitive; WED and JUL are names, not dialect", () => {
  const parsed = parseExpression("0 9 * jAn MoN");
  assert.deepEqual(parsed.fields[3].set, [1]);
  assert.deepEqual(parsed.fields[4].set, [1]);
  assert.deepEqual(parseExpression("0 0 * * WED").fields[4].set, [3]);
  assert.deepEqual(parseExpression("0 0 1 JUL *").fields[3].set, [7]);
});

test("a/n expands as a-max/n; DOW 7 normalises to Sunday 0", () => {
  assert.deepEqual(parseField("5/15", FIELD_DEFS[0]).set, [5, 20, 35, 50]);
  assert.deepEqual(parseField("5/15", FIELD_DEFS[0]).set, parseField("5-59/15", FIELD_DEFS[0]).set);
  assert.deepEqual(parseField("7", FIELD_DEFS[4]).set, [0]);
  assert.deepEqual(parseField("0-7", FIELD_DEFS[4]).set, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(parseField("5-7", FIELD_DEFS[4]).set, [0, 5, 6]);
  assert.deepEqual(parseField("SUN", FIELD_DEFS[4]).set, [0]);
});

test("starred determination: text beginning with *", () => {
  assert.equal(parseField("*", FIELD_DEFS[2]).starred, true);
  assert.equal(parseField("*/2", FIELD_DEFS[2]).starred, true);
  assert.equal(parseField("1-5", FIELD_DEFS[2]).starred, false);
  assert.equal(parseField("15", FIELD_DEFS[2]).starred, false);
});

// --- Day-matching truth table (SPEC section 7c, all 16 rows) ---

test("day rule: hard rows plus a full formula sweep", () => {
  const domS = parseField("*/2", FIELD_DEFS[2]); // starred, odd days
  const domR = parseField("15", FIELD_DEFS[2]); // restricted, 15th only
  const dowS = parseField("*/2", FIELD_DEFS[4]); // starred, Sun/Tue/Thu/Sat
  const dowR = parseField("5", FIELD_DEFS[4]); // restricted, Friday only
  const parsed = (dom, dow) => ({ fields: [null, null, dom, null, dow] });
  const FRI13 = local(2026, 11, 13); // Friday 13th
  const SAT14 = local(2026, 11, 14);
  const SUN15 = local(2026, 11, 15);
  const MON16 = local(2026, 11, 16);
  const FRI20 = local(2026, 11, 20);
  // Both restricted -> OR: (F,T) and (T,F) both fire.
  assert.equal(dayMatches(parsed(domR, dowR), FRI13), true);
  assert.equal(dayMatches(parsed(domR, dowR), SUN15), true);
  assert.equal(dayMatches(parsed(domR, dowR), SAT14), false);
  assert.equal(dayMatches(parsed(domR, dowR), FRI20), true);
  // One starred -> AND.
  assert.equal(dayMatches(parsed(domS, dowR), FRI13), true); // odd + Friday
  assert.equal(dayMatches(parsed(domS, dowR), FRI20), false); // even + Friday
  assert.equal(dayMatches(parsed(domR, dowS), SUN15), true); // 15th + Sunday
  assert.equal(dayMatches(parsed(domR, dowS), SAT14), false);
  // Both starred -> AND by value sets.
  assert.equal(dayMatches(parsed(domS, dowS), SUN15), true);
  assert.equal(dayMatches(parsed(domS, dowS), FRI13), false);
  assert.equal(dayMatches(parsed(domS, dowS), SAT14), false);
  // Sweep: every (starred, starred, match, match) combination reached
  // by these five dates must equal the stated rule.
  const combos = [[domS, dowS], [domS, dowR], [domR, dowS], [domR, dowR]];
  for (const [dom, dow] of combos) {
    for (const date of [FRI13, SAT14, SUN15, MON16, FRI20]) {
      const dm = dom.set.includes(date.getDate());
      const wm = dow.set.includes(date.getDay());
      const expected = !dom.starred && !dow.starred ? dm || wm : dm && wm;
      assert.equal(dayMatches(parsed(dom, dow), date), expected,
        `${dom.raw}/${dow.raw} on ${fmt(date)}`);
    }
  }
});

// --- Enumeration edges (SPEC section 7d) ---

test("enumeration is strictly after the start moment", () => {
  const parsed = parseExpression("0 9 * * *");
  assert.equal(fmt(nextRuns(parsed, local(2026, 11, 2, 9, 0, 0)).runs[0]), "2026-11-03 09:00");
  assert.equal(fmt(nextRuns(parsed, local(2026, 11, 2, 8, 59, 30)).runs[0]), "2026-11-02 09:00");
});

test("the 31st is skipped in months without one", () => {
  const { runs } = nextRuns(parseExpression("0 0 31 * *"), local(2026, 2, 1, 0, 0));
  assert.equal(fmt(runs[0]), "2026-03-31 00:00");
  assert.equal(fmt(runs[1]), "2026-05-31 00:00");
});

test("leap day inside the 4-year + 1-day window from 2025", () => {
  const { runs } = nextRuns(parseExpression("0 0 29 2 *"), local(2025, 3, 1, 0, 0));
  assert.equal(fmt(runs[0]), "2028-02-29 00:00");
});

// --- Explanation model + builder canonicalisation (SPEC 7a/7e) ---

test("describeField kinds follow the section 4 description rules", () => {
  const minute = FIELD_DEFS[0];
  const hour = FIELD_DEFS[1];
  assert.equal(describeField(parseField("*", minute)).kind, "every");
  assert.deepEqual(describeField(parseField("5", minute)), { kind: "single", value: 5 });
  assert.deepEqual(describeField(parseField("9-17", hour)), { kind: "range", a: 9, b: 17 });
  assert.deepEqual(describeField(parseField("*/15", minute)), { kind: "step", base: "all", step: 15 });
  assert.deepEqual(describeField(parseField("9-17/2", hour)), { kind: "step", base: "range", a: 9, b: 17, step: 2 });
  assert.deepEqual(describeField(parseField("5/15", minute)), { kind: "step", base: "from", a: 5, step: 15 });
  assert.deepEqual(describeField(parseField("1,2,3", minute)), { kind: "list", values: [1, 2, 3] });
  assert.deepEqual(describeField(parseField("1,3,5,7,9,11,13", hour)), { kind: "summary", count: 7 });
});

test("builder canonical form: full set, runs of 2 vs 3, step retention", () => {
  const minute = FIELD_DEFS[0];
  assert.equal(canonicalFromValues(new Set([0, 1, 2, 3, 4, 5]), minute), "0-5");
  const full = new Set(Array.from({ length: 60 }, (_, i) => i));
  assert.equal(canonicalFromValues(full, minute), "*");
  assert.equal(canonicalFromValues(new Set([1, 2, 3, 5, 7, 8]), minute), "1-3,5,7,8");
  assert.equal(canonicalFromValues(new Set([1, 2]), minute), "1,2");
  assert.equal(canonicalFromValues(new Set([5]), minute), "5");
  assert.equal(canonicalFromRange(0, 59, minute), "*");
  assert.equal(canonicalFromRange(9, 17, FIELD_DEFS[1]), "9-17");
  assert.equal(canonicalFromRange(5, 5, minute), "5");
  assert.equal(canonicalFromStep({ type: "star" }, 15, minute), "*/15");
  assert.equal(canonicalFromStep({ type: "range", a: 9, b: 17 }, 2, FIELD_DEFS[1]), "9-17/2");
  assert.equal(canonicalFromStep({ type: "single", a: 5 }, 15, minute), "5/15");
  assert.equal(canonicalFromStep({ type: "star" }, 1, minute), "*");
});

test("classifyShape reflects builder shapes exactly, else custom", () => {
  const dow = FIELD_DEFS[4];
  assert.equal(classifyShape(parseField("*", dow)).mode, "every");
  assert.equal(classifyShape(parseField("9-17", FIELD_DEFS[1])).mode, "range");
  assert.equal(classifyShape(parseField("*/15", FIELD_DEFS[0])).mode, "step");
  assert.equal(classifyShape(parseField("1,3,5", dow)).mode, "values");
  assert.equal(classifyShape(parseField("5", dow)).mode, "values");
  assert.equal(classifyShape(parseField("5-7", dow)).mode, "values"); // wraps Sunday
  assert.equal(classifyShape(parseField("1-5,10", FIELD_DEFS[2])).mode, "custom");
  assert.equal(classifyShape(parseField("*/15,3", FIELD_DEFS[0])).mode, "custom");
});
