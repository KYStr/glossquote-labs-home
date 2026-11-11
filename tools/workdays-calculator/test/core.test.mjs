import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  civilFromJdn,
  jdnFromCivil,
  run,
  serializeReport,
  weekdayFromJdn,
} from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`core fixture: ${entry.id}`, () => {
    assert.deepStrictEqual(run(structuredClone(entry.input)), entry.expected);
  });
}

test("JDN anchors: 2000-01-01 is JDN 2451545, a Saturday; round trip is exact", () => {
  assert.equal(jdnFromCivil(2000, 1, 1), 2451545);
  assert.equal(weekdayFromJdn(2451545), 6);
  assert.equal(weekdayFromJdn(jdnFromCivil(2026, 1, 2)), 5);
  for (const [y, m, d] of [
    [1900, 1, 1],
    [2000, 2, 29],
    [2026, 1, 2],
    [2028, 2, 29],
    [2040, 1, 16],
    [2100, 12, 31],
  ]) {
    assert.deepStrictEqual(civilFromJdn(jdnFromCivil(y, m, d)), { year: y, month: m, day: d });
  }
});

function holidaySetOf(text) {
  return new Set(text.split(/\r?\n/).filter((line) => line !== ""));
}

function isBusinessDayText(dateText, holidaysText) {
  const [y, m, d] = dateText.split("-").map(Number);
  const weekday = weekdayFromJdn(jdnFromCivil(y, m, d));
  return weekday >= 1 && weekday <= 5 && !holidaySetOf(holidaysText).has(dateText);
}

for (const entry of coreCases) {
  if (entry.input.mode !== "count" || !entry.expected.ok) continue;
  const { startDate, endDate, holidays } = entry.input;
  const { businessDays } = entry.expected.result;
  if (Math.abs(businessDays) > 3660 || !isBusinessDayText(endDate, holidays)) continue;
  if (startDate > endDate && !isBusinessDayText(startDate, holidays)) continue;
  test(`composition invariant: ${entry.id}`, () => {
    const shifted = run({
      mode: "shift",
      startDate,
      days: String(businessDays),
      holidays,
    });
    assert.equal(shifted.ok, true);
    assert.equal(shifted.result.resultDate, endDate);
  });
}

test("composition from a Sunday depends on the direction", () => {
  const startDate = "2026-01-11";
  const holidays = "";
  // Going back toward Thursday, (Thursday, Sunday] contains only Friday.
  const reversed = run({ mode: "count", startDate, endDate: "2026-01-08", holidays });
  assert.equal(reversed.result.businessDays, -1);
  const backward = run({ mode: "shift", startDate, days: "-1", holidays });
  assert.equal(backward.result.resultDate, "2026-01-09");

  // Going forward toward Tuesday counts Monday and Tuesday.
  const forward = run({ mode: "count", startDate, endDate: "2026-01-13", holidays });
  assert.equal(forward.result.businessDays, 2);
  const ahead = run({ mode: "shift", startDate, days: "2", holidays });
  assert.equal(ahead.result.resultDate, "2026-01-13");
});

test("count is additive over adjacent intervals and antisymmetric", () => {
  const holidays = "2026-01-07\n2026-01-19";
  const count = (startDate, endDate) =>
    run({ mode: "count", startDate, endDate, holidays }).result.businessDays;
  assert.equal(count("2026-01-02", "2026-01-09"), 4);
  assert.equal(count("2026-01-09", "2026-01-20"), 6);
  assert.equal(count("2026-01-02", "2026-01-20"), 10);
  assert.equal(count("2026-01-09", "2026-01-02"), -4);
});

test("shift by n then by -n returns to a business-day start", () => {
  const start = "2026-01-05";
  for (const n of [-3660, -10, -1, 0, 1, 10, 3660]) {
    const out = run({ mode: "shift", startDate: start, days: String(n), holidays: "" });
    assert.equal(out.ok, true);
    const back = run({
      mode: "shift",
      startDate: out.result.resultDate,
      days: String(-n),
      holidays: "",
    });
    assert.equal(back.result.resultDate, start);
  }
  const holidays = "2026-01-06";
  const out = run({ mode: "shift", startDate: start, days: "5", holidays });
  assert.equal(out.result.resultDate, "2026-01-13");
  const back = run({ mode: "shift", startDate: out.result.resultDate, days: "-5", holidays });
  assert.equal(back.result.resultDate, start);
});

test("shift -3660 is the exact mirror of the +3660 fixture (732 whole weeks)", () => {
  const outcome = run({ mode: "shift", startDate: "2026-01-05", days: "-3660", holidays: "" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.calendarDaysMoved, -5124);
  assert.equal(outcome.result.resultWeekday, 1);
  assert.equal(outcome.result.resultIsBusinessDay, true);
});

test("date range endpoints: 1900-01-01 and 2100-12-31 accepted, outside is RANGE", () => {
  const wide = run({ mode: "count", startDate: "1900-01-01", endDate: "2100-12-31", holidays: "" });
  assert.equal(wide.ok, true);
  assert.deepStrictEqual(
    run({ mode: "count", startDate: "2101-01-01", endDate: "2101-01-02", holidays: "" }),
    { ok: false, error: { code: "RANGE", field: "startDate", row: null } },
  );
  assert.deepStrictEqual(
    run({ mode: "count", startDate: "2026-01-05", endDate: "2101-01-01", holidays: "" }),
    { ok: false, error: { code: "RANGE", field: "endDate", row: null } },
  );
});

test("real leap days: 2000-02-29 (400 rule) and 2028-02-29 are valid", () => {
  const outcome = run({ mode: "count", startDate: "2000-02-28", endDate: "2000-03-01", holidays: "" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.calendarDays, 2);
  assert.equal(outcome.result.businessDays, 2);
});

test("schema: mode pre-checks, field set, types and accessors", () => {
  const countBase = { mode: "count", startDate: "2026-01-05", endDate: "2026-01-09", holidays: "" };
  for (const bad of [null, undefined, 42, "x", [], true]) {
    assert.deepStrictEqual(run(bad), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  }
  assert.deepStrictEqual(run({ startDate: "2026-01-05", endDate: "2026-01-09", holidays: "" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepStrictEqual(run({ ...countBase, mode: 3 }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  assert.deepStrictEqual(run({ ...countBase, days: "5" }), {
    ok: false,
    error: { code: "SCHEMA", field: "days", row: null },
  });
  assert.deepStrictEqual(
    run({ mode: "shift", startDate: "2026-01-05", days: "5", holidays: "", endDate: "2026-01-09" }),
    { ok: false, error: { code: "SCHEMA", field: "endDate", row: null } },
  );
  assert.deepStrictEqual(run({ mode: "count", startDate: "2026-01-05", endDate: "2026-01-09" }), {
    ok: false,
    error: { code: "SCHEMA", field: "holidays", row: null },
  });
  assert.deepStrictEqual(run({ ...countBase, startDate: 20260105 }), {
    ok: false,
    error: { code: "SCHEMA", field: "startDate", row: null },
  });
  const withAccessor = { mode: "count", endDate: "2026-01-09", holidays: "" };
  Object.defineProperty(withAccessor, "startDate", {
    enumerable: true,
    get() {
      return "2026-01-05";
    },
  });
  assert.deepStrictEqual(run(withAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: "startDate", row: null },
  });
});

test("capacity and unicode checks come before grammar", () => {
  const countBase = { mode: "count", startDate: "2026-01-05", endDate: "2026-01-09", holidays: "" };
  assert.deepStrictEqual(run({ ...countBase, startDate: "2026-01-055" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "startDate", row: null },
  });
  assert.deepStrictEqual(run({ ...countBase, startDate: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "startDate", row: null },
  });
  assert.deepStrictEqual(
    run({ mode: "shift", startDate: "2026-01-05", days: "123456", holidays: "" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "days", row: null } },
  );
});

test("days grammar: -0, leading zeros, signs and decimals are INTEGER_FORMAT", () => {
  for (const bad of ["-0", "007", "00", "+1", "1e2", " 1", "1 ", "1.0"]) {
    assert.deepStrictEqual(
      run({ mode: "shift", startDate: "2026-01-05", days: bad, holidays: "" }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "days", row: null } },
      `days=${JSON.stringify(bad)}`,
    );
  }
  assert.deepStrictEqual(run({ mode: "shift", startDate: "2026-01-05", days: "", holidays: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "days", row: null },
  });
  assert.deepStrictEqual(run({ mode: "shift", startDate: "2026-01-05", days: "-3661", holidays: "" }), {
    ok: false,
    error: { code: "RANGE", field: "days", row: null },
  });
});

test("holiday rows: blank CRLF lines count and a lone CR is DATE_FORMAT", () => {
  const base = { mode: "count", startDate: "2026-01-05", endDate: "2026-01-09" };
  assert.deepStrictEqual(run({ ...base, holidays: "\n2026-02-29" }), {
    ok: false,
    error: { code: "INVALID_DATE", field: "holidays", row: 2 },
  });
  assert.deepStrictEqual(run({ ...base, holidays: "2026-01-07\r\n\r\n2026-01-08\r" }), {
    ok: false,
    error: { code: "DATE_FORMAT", field: "holidays", row: 3 },
  });
  assert.deepStrictEqual(run({ ...base, holidays: "1899-12-31" }), {
    ok: false,
    error: { code: "RANGE", field: "holidays", row: 1 },
  });
});

test("LF and CRLF accept 400 holidays and report the 401st nonblank row", () => {
  const base = { mode: "count", startDate: "2026-01-05", endDate: "2026-01-09" };
  const lines = Array(400).fill("2026-01-07");
  for (const separator of ["\n", "\r\n"]) {
    const atLimit = run({ ...base, holidays: lines.join(separator) });
    assert.equal(atLimit.ok, true);
    assert.equal(atLimit.result.duplicateHolidayLines, 399);
    assert.equal(atLimit.result.holidaysSubtracted, 1);
    assert.equal(atLimit.result.businessDays, 3);
    const expected = { ok: false, error: { code: "ROW_LIMIT", field: "holidays", row: 402 } };
    for (const excess of ["2026-01-08", "x"]) {
      const holidays = [...lines, "", excess].join(separator);
      assert.deepStrictEqual(run({ ...base, holidays }), expected);
    }
  }
});

test("raw holiday capacity counts both CRLF units before row checks", () => {
  const base = { mode: "count", startDate: "2026-01-05", endDate: "2026-01-09" };
  const atCap = "2026-01-07" + "\r\n".repeat(4091);
  assert.equal(atCap.length, 8192);
  const outcome = run({ ...base, holidays: atCap });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.holidaysSubtracted, 1);
  assert.deepStrictEqual(run({ ...base, holidays: atCap + "\n" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "holidays", row: null },
  });
  const overBothCaps = "\n".repeat(3783) + Array(401).fill("2026-01-07").join("\n");
  assert.equal(overBothCaps.length, 8193);
  assert.deepStrictEqual(run({ ...base, holidays: overBothCaps }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "holidays", row: null },
  });
});

test("holidays unicode: a lone surrogate anywhere is UNICODE with row null", () => {
  const base = { mode: "count", startDate: "2026-01-05", endDate: "2026-01-09" };
  assert.deepStrictEqual(run({ ...base, holidays: "2026-01-07\n\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "holidays", row: null },
  });
});

test("hostile strings stay inert data", () => {
  assert.deepStrictEqual(
    run({ mode: "count", startDate: "<script>alert(1)</script>", endDate: "2026-01-09", holidays: "" }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "startDate", row: null } },
  );
  assert.deepStrictEqual(
    run({ mode: "count", startDate: "2026-01-05", endDate: "2026-01-09", holidays: "<b>x</b>" }),
    { ok: false, error: { code: "DATE_FORMAT", field: "holidays", row: 1 } },
  );
});

test("report serialization: canonical sorted compact JSON with one trailing LF", () => {
  const basic = coreCases.find((entry) => entry.id === "basic-week");
  const outcome = run(structuredClone(basic.input));
  assert.equal(outcome.ok, true);
  const text = serializeReport(outcome.result);
  assert.equal(
    text,
    '{"businessDays":5,"calendarDays":7,"duplicateHolidayLines":0,"endDate":"2026-01-09","endWeekday":5,"holidaysOnWeekends":0,"holidaysOutOfRange":0,"holidaysSubtracted":0,"mode":"count","startDate":"2026-01-02","startWeekday":5,"weekendDays":2}\n',
  );
  assert.ok(new TextEncoder().encode(text).length < 2097152);
  assert.equal(
    serializeReport({ b: { d: 1, c: 2 }, a: [{ z: 1, y: 2 }] }),
    '{"a":[{"y":2,"z":1}],"b":{"c":2,"d":1}}\n',
  );
});
