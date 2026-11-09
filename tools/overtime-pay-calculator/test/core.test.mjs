import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/overtime.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const error = (code, field = null, row = null) => ({ ok: false, error: { code, field, row } });
const date = (day, month = "2024-02") => month + "-" + String(day).padStart(2, "0");
const entry = (day, kind, hours, month) => ({ date: date(day, month), kind, hours });
const draft = (entries, month = "2024-02") => ({ monthlySalary: "36000", month, entries });

for (const fixture of coreCases) {
  test("fixture " + fixture.id, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test("monthly total sums daily pay and rounded category subtotals", () => {
  for (const fixture of coreCases.filter((fixture) => fixture.expected.ok)) {
    const { categories, days, totalPayTwd } = run(fixture.input).result;
    assert.equal(totalPayTwd, Object.values(categories).reduce((sum, category) => sum + category.payTwd, 0));
    assert.equal(totalPayTwd, days.reduce((sum, day) => sum + day.payTwd, 0));
    assert.ok(days.every(({ payTwd }) => Number.isInteger(payTwd) && payTwd >= 0));
  }
});

test("salary, zero hours, and upper daily hour limits", () => {
  const zero = run({ ...draft([entry(1, "holiday", "0")]), monthlySalary: "1" });
  assert.equal(zero.result.hourlyRateTwd, "0.00");
  assert.equal(zero.result.dailyWageTwd, "0.03");
  assert.equal(zero.result.totalPayTwd, 0);
  assert.equal(zero.result.days[0].dayPayApplied, false);
  assert.equal(run({ ...EXAMPLE, monthlySalary: "99999999" }).ok, true);
  assert.deepEqual(run({ ...EXAMPLE, monthlySalary: "100000000" }), error("INPUT_LIMIT", "monthlySalary"));

  const maximum = run(draft([entry(1,"weekday","4"), entry(2,"restDay","12"), entry(3,"holiday","12")]));
  assert.equal(maximum.result.countedOtHours, 20);
  assert.equal(maximum.result.totalPayTwd, 6500);
  for (const kind of ["restDay", "holiday"]) {
    assert.deepEqual(run(draft([entry(1,kind,"12.5")])), error("RANGE", "hours", 0));
    assert.deepEqual(run(draft([entry(1,kind,"12.55")])), error("INPUT_LIMIT", "hours", 0));
  }
});

test("validation keeps exact salary and hours syntax and rejects hostile text", () => {
  for (const text of ["<script>", "１２３", "36000\n", "+36000", "036000"]) {
    assert.deepEqual(run({ ...EXAMPLE, monthlySalary: text }), error("INTEGER_FORMAT", "monthlySalary"));
  }
  for (const text of ["2.25", "\uD800", "1\n", "-1", "1e0", "01"]) {
    assert.deepEqual(run(draft([entry(1,"restDay",text)])), error("DECIMAL_FORMAT", "hours", 0));
  }
  assert.deepEqual(run(draft([entry(1,"restDay","2.3")])), error("HOURS_STEP", "hours", 0));
  assert.deepEqual(run(draft([entry(1,"restDay","")])), error("EMPTY", "hours", 0));
  assert.deepEqual(run(DEFAULTS), error("EMPTY", "monthlySalary"));
  assert.deepEqual(run({ ...DEFAULTS, monthlySalary: "36000" }), error("EMPTY", "month"));
  assert.deepEqual(run({ ...DEFAULTS, monthlySalary: "36000", month: "2024-02" }), error("EMPTY", "date", 0));
  assert.deepEqual(run(draft([entry(1,"unknown","1")])), error("KIND", "kind", 0));
});

test("month, leap-day, date bounds, duplicate dates, and user-selected day type", () => {
  for (const month of ["1900-02", "2023-02", "2100-02"]) {
    assert.deepEqual(run(draft([entry(29,"weekday","1",month)], month)), error("DATE_FORMAT", "date", 0));
  }
  for (const month of ["2000-02", "2024-02"]) {
    assert.equal(run(draft([entry(29,"weekday","1",month)], month)).result.totalPayTwd, 200);
  }
  for (const month of ["1899-12", "2101-01"]) {
    assert.deepEqual(run({ ...EXAMPLE, month }), error("RANGE", "month"));
  }
  for (const month of ["2024-2", "2024-00", "2024-13", "2024-02\n"]) {
    assert.deepEqual(run({ ...EXAMPLE, month }), error("MONTH_FORMAT", "month"));
  }
  for (const invalidDate of ["2024-02-00", "2024-02-30", "2024-02-01\n", "2024-02-1"]) {
    assert.deepEqual(run(draft([{ ...entry(1,"weekday","1"), date: invalidDate }])), error("DATE_FORMAT", "date", 0));
  }
  assert.deepEqual(run(draft([entry(31,"weekday","1","2024-04")], "2024-04")), error("DATE_FORMAT", "date", 0));
  assert.deepEqual(run(draft([entry(1,"weekday","1","2024-03")])), error("DATE_MONTH", "date", 0));
  assert.deepEqual(run(draft([entry(1,"weekday","1"), entry(1,"holiday","1")])), error("DUPLICATE_DATE", "date", 1));
  assert.equal(run(draft([entry(4,"weekday","1")])).result.totalPayTwd, 200, "Sunday can be a weekday under the schedule");
});

test("first content error follows salary, month, and row order", () => {
  const badRows = [entry(1,"weekday","9"), entry(2,"restDay","2.3")];
  assert.deepEqual(run({ ...draft(badRows, "2024-13"), monthlySalary: "36,000" }), error("INTEGER_FORMAT", "monthlySalary"));
  assert.deepEqual(run(draft(badRows, "2024-13")), error("MONTH_FORMAT", "month"));
  assert.deepEqual(run(draft(badRows)), error("RANGE", "hours", 0));
});

test("bounded rows and reachable monthly warning thresholds", () => {
  const rows = Array.from({ length: 31 }, (_, index) => entry(index + 1,"weekday","0","2024-01"));
  assert.equal(run(draft(rows, "2024-01")).result.days.length, 31);
  assert.deepEqual(run(draft([...rows, rows[0]], "2024-01")), error("ENTRY_COUNT", "entries"));
  assert.deepEqual(run(draft([])), error("ENTRY_COUNT", "entries"));

  const elevenDays = Array.from({ length: 11 }, (_, index) => entry(index + 1,"weekday","4"));
  for (const [last, countedOtHours, capNote] of [["2",46,false], ["2.5",46.5,true], ["4",48,true]]) {
    const result = run(draft([...elevenDays, entry(12,"weekday",last), entry(13,"holiday","8")])).result;
    assert.equal(result.countedOtHours, countedOtHours);
    assert.equal(result.capNote, capNote);
  }
});

test("rejects legacy aggregates, extra/symbol keys, sparse arrays and unexpected prototypes", () => {
  const legacy = { monthlySalary: "36000", weekdayOtHours: "3", restDayHours: "0", holidayHours: "0" };
  for (const input of [null, "36000", legacy, { monthlySalary: "36000" }, { ...EXAMPLE, extra: 1 }, { ...EXAMPLE, [Symbol()]: 1 }, Object.assign(Object.create(null), EXAMPLE)]) {
    assert.deepEqual(run(input), error("SCHEMA"));
  }
  assert.deepEqual(run({ ...EXAMPLE, monthlySalary: 36000 }), error("SCHEMA", "monthlySalary"));
  assert.deepEqual(run(draft(Array(1))), error("SCHEMA", "entries", 0));
  assert.deepEqual(run(draft(Object.assign([entry(1,"weekday","1")], { [Symbol()]: 1 }))), error("SCHEMA", "entries"));
  assert.deepEqual(run(draft(Object.assign([entry(1,"weekday","1")], { extra: 1 }))), error("SCHEMA", "entries"));
  assert.deepEqual(run(draft(Object.setPrototypeOf([], {}))), error("SCHEMA", "entries"));
  assert.deepEqual(run(draft([{ ...entry(1,"weekday","1"), [Symbol()]: 1 }])), error("SCHEMA", "entries", 0));
  assert.deepEqual(run(draft([Object.setPrototypeOf(entry(1,"weekday","1"), {})])), error("SCHEMA", "entries", 0));
  assert.deepEqual(run(draft([entry(1,"weekday",1)])), error("SCHEMA", "hours", 0));
});

test("own-data validation rejects getters and setters without invoking them", () => {
  let getterCalls = 0;
  let setterCalls = 0;
  const accessor = (value) => ({
    get() { getterCalls += 1; return value; },
    set() { setterCalls += 1; },
  });
  const top = Object.defineProperty({ ...EXAMPLE }, "monthlySalary", accessor("36000"));
  const arrayProperty = Object.defineProperty({ ...EXAMPLE }, "entries", accessor(EXAMPLE.entries));
  const arraySlot = Object.defineProperty([entry(1,"weekday","1")], "0", accessor(EXAMPLE.entries[0]));
  const field = Object.defineProperty(entry(2,"weekday","1"), "hours", accessor("1"));
  const setterOnly = Object.defineProperty(entry(1,"weekday","1"), "date", { set: accessor("").set });
  const unknown = Object.defineProperty([EXAMPLE.entries[0]], "unknown", accessor("irrelevant"));
  assert.deepEqual(run(top), error("SCHEMA", "monthlySalary"));
  assert.deepEqual(run(arrayProperty), error("SCHEMA", "entries"));
  assert.deepEqual(run(draft(arraySlot)), error("SCHEMA", "entries", 0));
  assert.deepEqual(run(draft([EXAMPLE.entries[0], field])), error("SCHEMA", "hours", 1));
  assert.deepEqual(run(draft([setterOnly])), error("SCHEMA", "date", 0));
  assert.deepEqual(run(draft(unknown)), error("SCHEMA", "entries"));
  assert.equal(getterCalls, 0);
  assert.equal(setterCalls, 0);
});

