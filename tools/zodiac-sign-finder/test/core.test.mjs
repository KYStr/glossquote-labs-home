// Core tests for the Zodiac Sign Finder. Every expected value comes
// from the fixed spec fixtures (vendored verbatim in fixtures.mjs) or
// from hand-derived boundary cases written against the SPEC's table
// and rules — never from the implementation's own output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  LIMITS,
  canonicalJson,
  run,
  serializeReport,
} from "../public/js/core/zodiac.mjs";
import { FIXTURES } from "./fixtures.mjs";

const coreCases = FIXTURES.cases.filter((c) => c.kind === "core");

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}: ${fixture.purpose}`, () => {
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

// The SPEC's fixed table, transcribed independently into this test:
// [sign, symbol, element, modality, startMonth, startDay, endMonth, endDay].
const TABLE = [
  ["aries", "♈", "fire", "cardinal", 3, 21, 4, 19],
  ["taurus", "♉", "earth", "fixed", 4, 20, 5, 20],
  ["gemini", "♊", "air", "mutable", 5, 21, 6, 20],
  ["cancer", "♋", "water", "cardinal", 6, 21, 7, 22],
  ["leo", "♌", "fire", "fixed", 7, 23, 8, 22],
  ["virgo", "♍", "earth", "mutable", 8, 23, 9, 22],
  ["libra", "♎", "air", "cardinal", 9, 23, 10, 22],
  ["scorpio", "♏", "water", "fixed", 10, 23, 11, 21],
  ["sagittarius", "♐", "fire", "mutable", 11, 22, 12, 21],
  ["capricorn", "♑", "earth", "cardinal", 12, 22, 1, 19],
  ["aquarius", "♒", "air", "fixed", 1, 20, 2, 18],
  ["pisces", "♓", "water", "mutable", 2, 19, 3, 20],
];
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // no year: Feb has 29

function rowFor(md) {
  for (let i = 0; i < TABLE.length; i += 1) {
    const [, , , , sm, sd, em, ed] = TABLE[i];
    const start = sm * 100 + sd;
    const end = em * 100 + ed;
    const hit = start <= end ? md >= start && md <= end : md >= start || md <= end;
    if (hit) return i;
  }
  return -1;
}

test("coverage audit: all 366 valid (month, day) pairs hit exactly the SPEC row", () => {
  let count = 0;
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= DAYS[month - 1]; day += 1) {
      count += 1;
      const md = month * 100 + day;
      const i = rowFor(md);
      assert.notEqual(i, -1, `no row for ${month}/${day}`);
      const [sign, symbol, element, modality, sm, sd, em, ed] = TABLE[i];
      const atStart = md === sm * 100 + sd;
      const atEnd = md === em * 100 + ed;
      const expected = {
        ok: true,
        result: {
          sign,
          symbol,
          element,
          modality,
          rangeStart: { month: sm, day: sd },
          rangeEnd: { month: em, day: ed },
          cusp: atStart || atEnd,
          cuspNeighbor: atStart
            ? TABLE[(i + TABLE.length - 1) % TABLE.length][0]
            : atEnd
              ? TABLE[(i + 1) % TABLE.length][0]
              : null,
        },
      };
      assert.deepEqual(
        run({ month: String(month), day: String(day), year: "" }),
        expected,
        `${month}/${day}`,
      );
    }
  }
  assert.equal(count, 366);
});

test("leap-year rule: 1900 not leap, 2000 leap, 2100 not leap (Feb 29)", () => {
  const invalid = {
    ok: false,
    error: { code: "DATE_INVALID", field: "day", row: null },
  };
  assert.deepEqual(run({ month: "2", day: "29", year: "1900" }), invalid);
  assert.deepEqual(run({ month: "2", day: "29", year: "2100" }), invalid);
  const leap = run({ month: "2", day: "29", year: "2000" });
  assert.equal(leap.ok, true);
  assert.equal(leap.result.sign, "pisces");
});

test("date existence: Feb 30 and Jun 31 never exist", () => {
  const invalid = {
    ok: false,
    error: { code: "DATE_INVALID", field: "day", row: null },
  };
  assert.deepEqual(run({ month: "2", day: "30", year: "" }), invalid);
  assert.deepEqual(run({ month: "2", day: "30", year: "2024" }), invalid);
  assert.deepEqual(run({ month: "6", day: "31", year: "" }), invalid);
});

test("schema failures: shape, extra/missing fields, wrong types, accessors", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("12/25"), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run({}), schema);
  assert.deepEqual(run({ month: "12", day: "25" }), schema);
  assert.deepEqual(run({ month: "12", day: "25", year: "", extra: "1" }), schema);
  assert.deepEqual(run({ month: 12, day: "25", year: "" }), schema);
  assert.deepEqual(run({ month: "12", day: "25", year: null }), schema);
  const withGetter = { day: "25", year: "" };
  Object.defineProperty(withGetter, "month", {
    enumerable: true,
    get() {
      return "12";
    },
  });
  assert.deepEqual(run(withGetter), schema);
});

test("per-field order: INPUT_LIMIT, UNICODE, EMPTY, INTEGER_FORMAT, RANGE", () => {
  const err = (code, field) => ({ ok: false, error: { code, field, row: null } });
  // 9 characters exceed the 8-unit field cap before any other check.
  assert.deepEqual(run({ month: "123456789", day: "1", year: "" }), err("INPUT_LIMIT", "month"));
  assert.deepEqual(run({ month: "1", day: "1", year: "123456789" }), err("INPUT_LIMIT", "year"));
  // Lone surrogate.
  assert.deepEqual(run({ month: "\uD800", day: "1", year: "" }), err("UNICODE", "month"));
  assert.deepEqual(run({ month: "1", day: "\uDC00", year: "" }), err("UNICODE", "day"));
  // Grammar: leading zeros, signs, spaces, decimals are not integers.
  assert.deepEqual(run({ month: "01", day: "1", year: "" }), err("INTEGER_FORMAT", "month"));
  assert.deepEqual(run({ month: " 1", day: "1", year: "" }), err("INTEGER_FORMAT", "month"));
  assert.deepEqual(run({ month: "+1", day: "1", year: "" }), err("INTEGER_FORMAT", "month"));
  assert.deepEqual(run({ month: "1", day: "1", year: "20a4" }), err("INTEGER_FORMAT", "year"));
  // Range edges: 0 parses but is below range; year 10000 above range.
  assert.deepEqual(run({ month: "0", day: "1", year: "" }), err("RANGE", "month"));
  assert.deepEqual(run({ month: "1", day: "0", year: "" }), err("RANGE", "day"));
  assert.deepEqual(run({ month: "1", day: "32", year: "" }), err("RANGE", "day"));
  assert.deepEqual(run({ month: "1", day: "1", year: "0" }), err("RANGE", "year"));
  assert.deepEqual(run({ month: "1", day: "1", year: "10000" }), err("RANGE", "year"));
  // Empty year is fine; empty month/day report EMPTY in field order.
  assert.deepEqual(run({ month: "", day: "", year: "" }), err("EMPTY", "month"));
  assert.deepEqual(run({ month: "5", day: "", year: "" }), err("EMPTY", "day"));
});

test("validation order: month errors win over day errors", () => {
  assert.deepEqual(run({ month: "13", day: "99", year: "" }), {
    ok: false,
    error: { code: "RANGE", field: "month", row: null },
  });
  assert.deepEqual(run({ month: "x", day: "99", year: "" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "month", row: null },
  });
});

test("year never changes the sign; year 9999 and 1 are accepted", () => {
  const plain = run({ month: "8", day: "10", year: "" });
  for (const year of ["1", "1900", "2024", "9999"]) {
    assert.deepEqual(run({ month: "8", day: "10", year }), plain);
  }
});

test("report bytes: canonical JSON, sorted keys, one trailing LF", () => {
  const outcome = run({ month: "12", day: "25", year: "" });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  // Hand-written expectation: keys sorted by UTF-16 code unit
  // (cusp, cuspNeighbor, element, modality, rangeEnd, rangeStart,
  // sign, symbol), compact, one trailing LF.
  const expectedText =
    '{"cusp":false,"cuspNeighbor":null,"element":"earth","modality":"cardinal",' +
    '"rangeEnd":{"day":19,"month":1},"rangeStart":{"day":22,"month":12},' +
    '"sign":"capricorn","symbol":"♑"}\n';
  assert.equal(serialized.text, expectedText);
  assert.equal(serialized.bytes, new TextEncoder().encode(expectedText).length);
  assert.equal(
    createHash("sha256").update(expectedText, "utf8").digest("hex"),
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
  );
});

test("canonicalJson sorts keys recursively and keeps array order", () => {
  assert.equal(
    canonicalJson({ b: [{ d: 1, a: 2 }, 3], a: "x" }),
    '{"a":"x","b":[{"a":2,"d":1},3]}',
  );
  assert.equal(LIMITS.REPORT_MAX_BYTES, 2097152);
});
