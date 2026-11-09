import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addMonths, anniv, run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`core fixture: ${entry.id}`, () => {
    assert.deepStrictEqual(run(structuredClone(entry.input)), entry.expected);
  });
}

test("missing usedDays and null usedDays are treated as 0", () => {
  const base = { startDate: "2023-11-09", referenceDate: "2026-11-09" };
  const missing = run({ ...base });
  assert.equal(missing.ok, true);
  assert.equal(missing.result.usedDays, 0);
  const nulled = run({ ...base, usedDays: null });
  assert.deepStrictEqual(nulled, missing);
  const empty = run({ ...base, usedDays: "" });
  assert.deepStrictEqual(empty, missing);
});

test("schema: non-object, array, null inputs fail with field null", () => {
  for (const bad of [null, undefined, 42, "x", [], true]) {
    assert.deepStrictEqual(run(bad), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  }
});

test("schema: unknown field, wrong type, missing field, accessor", () => {
  const base = { startDate: "2021-06-15", referenceDate: "2026-11-09" };
  assert.deepStrictEqual(run({ ...base, extra: "1" }), {
    ok: false,
    error: { code: "SCHEMA", field: "extra", row: null },
  });
  assert.deepStrictEqual(run({ ...base, startDate: 20210615 }), {
    ok: false,
    error: { code: "SCHEMA", field: "startDate", row: null },
  });
  assert.deepStrictEqual(run({ referenceDate: "2026-11-09" }), {
    ok: false,
    error: { code: "SCHEMA", field: "startDate", row: null },
  });
  assert.deepStrictEqual(run({ ...base, usedDays: 4 }), {
    ok: false,
    error: { code: "SCHEMA", field: "usedDays", row: null },
  });
  const withAccessor = { referenceDate: "2026-11-09" };
  Object.defineProperty(withAccessor, "startDate", {
    enumerable: true,
    get() {
      return "2021-06-15";
    },
  });
  assert.deepStrictEqual(run(withAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: "startDate", row: null },
  });
});

test("capacity and unicode checks come before grammar", () => {
  const base = { startDate: "2021-06-15", referenceDate: "2026-11-09" };
  assert.deepStrictEqual(run({ ...base, startDate: "x".repeat(65) }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "startDate", row: null },
  });
  assert.deepStrictEqual(run({ ...base, usedDays: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "usedDays", row: null },
  });
  assert.deepStrictEqual(run({ ...base, startDate: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "startDate", row: null },
  });
  assert.deepStrictEqual(run({ ...base, startDate: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "startDate", row: null },
  });
});

test("year range boundaries: 1899 and 2101 fail, 1900 and 2100 pass", () => {
  const base = { referenceDate: "2026-11-09" };
  assert.deepStrictEqual(run({ ...base, startDate: "1899-06-15" }), {
    ok: false,
    error: { code: "RANGE", field: "startDate", row: null },
  });
  assert.deepStrictEqual(run({ startDate: "2021-06-15", referenceDate: "2101-01-01" }), {
    ok: false,
    error: { code: "RANGE", field: "referenceDate", row: null },
  });
  assert.equal(run({ startDate: "1900-01-01", referenceDate: "1900-01-01" }).ok, true);
  assert.equal(run({ startDate: "2099-06-15", referenceDate: "2100-06-15" }).ok, true);
});

test("usedDays grammar: leading zero, sign, decimal, spaces are INTEGER_FORMAT", () => {
  const base = { startDate: "2021-06-15", referenceDate: "2026-11-09" };
  for (const bad of ["03", "00", "-1", "+1", "1.5", " 1", "1 ", "1e2", "１２"]) {
    assert.deepStrictEqual(
      run({ ...base, usedDays: bad }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "usedDays", row: null } },
      `usedDays=${JSON.stringify(bad)}`,
    );
  }
});

test("usedDays boundaries: 30 accepted, 31 is RANGE", () => {
  const senior = { startDate: "1998-04-01", referenceDate: "2026-11-09" };
  const atCap = run({ ...senior, usedDays: "30" });
  assert.equal(atCap.ok, true);
  assert.equal(atCap.result.remainingDays, 0);
  assert.deepStrictEqual(run({ ...senior, usedDays: "31" }), {
    ok: false,
    error: { code: "RANGE", field: "usedDays", row: null },
  });
});

test("validation order: DATE_ORDER beats the used-days cross-check", () => {
  assert.deepStrictEqual(
    run({ startDate: "2026-11-10", referenceDate: "2026-11-09", usedDays: "20" }),
    { ok: false, error: { code: "DATE_ORDER", field: "referenceDate", row: null } },
  );
});

test("validation order: field errors beat cross-field errors", () => {
  assert.deepStrictEqual(
    run({ startDate: "2023-02-29", referenceDate: "2020-01-01", usedDays: "0" }),
    { ok: false, error: { code: "INVALID_DATE", field: "startDate", row: null } },
  );
});

test("addMonths clamps to the end of a shorter month", () => {
  assert.equal(addMonths("2026-08-31", 6), "2027-02-28");
  assert.equal(addMonths("2023-08-31", 6), "2024-02-29");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  // The six-month point of an Aug 31 start is Feb 28 of the next year.
  const outcome = run({ startDate: "2026-08-31", referenceDate: "2027-02-28" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.stage, "first-3-days");
  assert.equal(outcome.result.periodStart, "2027-02-28");
});

test("anniv returns to Feb 29 in leap years", () => {
  assert.equal(anniv("2020-02-29", 1), "2021-02-28");
  assert.equal(anniv("2020-02-29", 4), "2024-02-29");
  const outcome = run({ startDate: "2020-02-29", referenceDate: "2024-02-29" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.completedYears, 4);
  assert.equal(outcome.result.periodStart, "2024-02-29");
});

test("period always contains the reference date (standard stage)", () => {
  const outcome = run({ startDate: "2019-03-10", referenceDate: "2026-11-09", usedDays: "2" });
  assert.equal(outcome.ok, true);
  assert.ok(outcome.result.periodStart <= "2026-11-09");
  assert.ok("2026-11-09" <= outcome.result.periodEnd);
  assert.ok(outcome.result.remainingDays >= 0);
});

test("usedDays above a zero entitlement is RANGE (under six months)", () => {
  assert.deepStrictEqual(
    run({ startDate: "2026-08-20", referenceDate: "2026-11-09", usedDays: "1" }),
    { ok: false, error: { code: "RANGE", field: "usedDays", row: null } },
  );
});

test("hostile strings stay inert data", () => {
  const outcome = run({
    startDate: "<script>alert(1)</script>",
    referenceDate: "2026-11-09",
  });
  assert.deepStrictEqual(outcome, {
    ok: false,
    error: { code: "DATE_FORMAT", field: "startDate", row: null },
  });
});
