// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-age-calculator-20261109, spec candidate commit
// 249be6c1a19368b7de4bee8f75016307ef825552, SHA-256
// 19451dc10db3bafbd4bfd9c3f6f562057a30b84970a14150dc091315107e8e06).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's rules and known calendar facts by hand, never from
// the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/age.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-age-calculator-20261109");
assert.equal(coreCases.length, 14);

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

// Independent ordinal (days-from-civil, Howard Hinnant's algorithm) —
// deliberately a different formula from the SPEC's Fliegel & Van
// Flandern JDN, so total-days agreement is a real cross-check.
function daysFromCivil(year, month, day) {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = month > 2 ? month - 3 : month + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe;
}

function parseParts(text) {
  return [Number(text.slice(0, 4)), Number(text.slice(5, 7)), Number(text.slice(8, 10))];
}

function ordinalOf(text) {
  const [y, m, d] = parseParts(text);
  return daysFromCivil(y, m, d);
}

function isLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function monthLength(year, month) {
  return month === 2 && isLeap(year) ? 29 : MONTH_LENGTHS[month - 1];
}

function observedParts(birth, year) {
  return birth[1] === 2 && birth[2] === 29 && !isLeap(year)
    ? [year, 3, 1]
    : [year, birth[1], birth[2]];
}

function formatParts([y, m, d]) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

test("range endpoints are accepted (SPEC: 1900-01-01 to 2100-12-31 inclusive)", () => {
  // 1900-01-01 was a Monday (weekday index 1). Birth day equals the
  // reference day: all zeros, the day itself is the 0th birthday.
  const min = run({ birthDate: "1900-01-01", referenceDate: "1900-01-01" });
  assert.deepEqual(min, {
    ok: true,
    result: {
      ageYears: 0, ageMonths: 0, ageDays: 0, totalDays: 0,
      birthWeekdayIndex: 1, birthWeekdayZh: "星期一", birthWeekdayEn: "Monday",
      isBirthdayToday: true, nextBirthday: "1900-01-01",
      daysUntilNextBirthday: 0, turningAge: 0,
    },
  });
  const max = run({ birthDate: "2100-12-31", referenceDate: "2100-12-31" });
  assert.equal(max.ok, true);
  assert.equal(max.result.totalDays, 0);
  assert.equal(max.result.nextBirthday, "2100-12-31");
  assert.equal(max.result.turningAge, 0);
});

test("the next birthday may fall in 2101, outside the input range", () => {
  // Hand-derived: 2100 is not a leap year, so 2100-01-01 to
  // 2100-12-31 is 364 days; the age is 0y 11m 30d (December borrows
  // November's 30 days: 31 - 1 = 30). 2100-01-01 was a Friday
  // (2000-01-01 Saturday + 36,525 days, 36,525 mod 7 = 6).
  const actual = run({ birthDate: "2100-01-01", referenceDate: "2100-12-31" });
  assert.deepEqual(actual, {
    ok: true,
    result: {
      ageYears: 0, ageMonths: 11, ageDays: 30, totalDays: 364,
      birthWeekdayIndex: 5, birthWeekdayZh: "星期五", birthWeekdayEn: "Friday",
      isBirthdayToday: false, nextBirthday: "2101-01-01",
      daysUntilNextBirthday: 1, turningAge: 1,
    },
  });
});

test("one day outside the range is RANGE in the offending field", () => {
  assert.deepEqual(run({ birthDate: "1899-12-31", referenceDate: "2026-01-01" }), {
    ok: false,
    error: { code: "RANGE", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: "2026-01-01", referenceDate: "2101-01-01" }), {
    ok: false,
    error: { code: "RANGE", field: "referenceDate", row: null },
  });
});

test("gregorian validity follows the SPEC leap rule (century years)", () => {
  // 2000 is a leap year (divisible by 400); 1900 is not (divisible
  // by 100, not 400); 2023-02-29 is the literal fixture already.
  assert.equal(run({ birthDate: "2000-02-29", referenceDate: "2026-01-01" }).ok, true);
  assert.deepEqual(run({ birthDate: "1900-02-29", referenceDate: "2026-01-01" }), {
    ok: false,
    error: { code: "INVALID_DATE", field: "birthDate", row: null },
  });
  for (const bad of ["2020-04-31", "2020-00-10", "2020-01-00", "2021-02-29"]) {
    assert.deepEqual(run({ birthDate: bad, referenceDate: "2026-01-01" }), {
      ok: false,
      error: { code: "INVALID_DATE", field: "birthDate", row: null },
    });
  }
});

test("format requires exactly YYYY-MM-DD with ASCII digits and hyphens", () => {
  for (const bad of ["19900515", "1990-5-15", "１９９０-０５-１５", "1990_05_15"]) {
    assert.deepEqual(run({ birthDate: bad, referenceDate: "2026-11-09" }), {
      ok: false,
      error: { code: "DATE_FORMAT", field: "birthDate", row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run({ birthDate: "1990-05-155", referenceDate: "2026-11-09" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "birthDate", row: null },
  });
  // Eleven units including a lone surrogate: the limit still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ birthDate: "1990-05-15\uD800", referenceDate: "2026-11-09" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: " 1990-05-15", referenceDate: "2026-11-09" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "birthDate", row: null },
  });
});

test("lone surrogates are UNICODE at exactly ten units", () => {
  assert.deepEqual(run({ birthDate: "1990-05-1\uD800", referenceDate: "2026-11-09" }), {
    ok: false,
    error: { code: "UNICODE", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: "1990-05-15", referenceDate: "2026-11-0\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "referenceDate", row: null },
  });
});

test("field order: birthDate is fully validated before referenceDate", () => {
  assert.deepEqual(run({ birthDate: "", referenceDate: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "birthDate", row: null },
  });
  assert.deepEqual(run({ birthDate: "1990-05-15", referenceDate: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "referenceDate", row: null },
  });
  // The reference field's own RANGE failure precedes the cross-field
  // order check (validation is per-field first, cross-field last).
  assert.deepEqual(run({ birthDate: "2026-06-01", referenceDate: "1899-01-01" }), {
    ok: false,
    error: { code: "RANGE", field: "referenceDate", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("1990-05-15"), schema);
  assert.deepEqual(run({ birthDate: "1990-05-15" }), schema);
  assert.deepEqual(
    run({ birthDate: "1990-05-15", referenceDate: "2026-11-09", extra: "x" }),
    schema,
  );
  assert.deepEqual(run({ birthDate: 19900515, referenceDate: "2026-11-09" }), schema);
  assert.deepEqual(run({ birthDate: "1990-05-15", referenceDate: null }), schema);
  const withAccessor = { referenceDate: "2026-11-09" };
  Object.defineProperty(withAccessor, "birthDate", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("weekday spot checks against known calendar facts", () => {
  // 2000-01-01 was a Saturday; 2024-02-29 was a Thursday.
  const y2k = run({ birthDate: "2000-01-01", referenceDate: "2000-01-01" });
  assert.equal(y2k.result.birthWeekdayIndex, 6);
  assert.equal(y2k.result.birthWeekdayEn, "Saturday");
  assert.equal(y2k.result.birthWeekdayZh, "星期六");
  const leapDay = run({ birthDate: "2024-02-29", referenceDate: "2024-02-29" });
  assert.equal(leapDay.result.birthWeekdayIndex, 4);
  assert.equal(leapDay.result.birthWeekdayEn, "Thursday");
});

test("equal birth and reference days are legal (DATE_ORDER is strict)", () => {
  const actual = run({ birthDate: "2026-01-10", referenceDate: "2026-01-10" });
  assert.equal(actual.ok, true);
  assert.equal(actual.result.totalDays, 0);
  assert.equal(actual.result.turningAge, 0);
});

test("the short-February second borrow keeps every count non-negative", () => {
  // Hand-derived under the SPEC's invariants (see the errata note in
  // HANDOFF.md): born 2000-01-31, reference 2023-03-01. The raw split
  // is 23y 2m -30d; borrowing February 2023 (28) leaves -2, so the
  // borrow repeats into January 2023 (31): 23y 0m 29d. 2000-01-31
  // was a Monday (2000-01-01 was a Saturday). The next birthday is
  // 2024-01-31, 336 days after 2023-03-01 (the span includes
  // 2024-02-29 only after the endpoint; 2023-03-01 to 2024-03-01 is
  // 366 days, minus the 30 days from 2024-01-31 to 2024-03-01).
  const actual = run({ birthDate: "2000-01-31", referenceDate: "2023-03-01" });
  assert.deepEqual(actual, {
    ok: true,
    result: {
      ageYears: 23, ageMonths: 0, ageDays: 29,
      totalDays: ordinalOf("2023-03-01") - ordinalOf("2000-01-31"),
      birthWeekdayIndex: 1, birthWeekdayZh: "星期一", birthWeekdayEn: "Monday",
      isBirthdayToday: false, nextBirthday: "2024-01-31",
      daysUntilNextBirthday: 336, turningAge: 24,
    },
  });
});

test("borrow and birthday invariants across a sweep (SPEC properties)", () => {
  const births = [
    "1990-05-15", "2000-01-31", "2000-02-29", "2020-02-29", "2023-01-31",
    "2023-03-31", "2024-12-31", "1999-12-25", "2001-06-30", "2019-10-31",
  ];
  const refs = ["2023-02-28", "2023-03-01", "2024-02-29", "2026-01-30", "2026-11-09", "2100-12-31"];
  for (const birthDate of births) {
    for (const referenceDate of refs) {
      if (ordinalOf(referenceDate) < ordinalOf(birthDate)) continue;
      const actual = run({ birthDate, referenceDate });
      assert.equal(actual.ok, true, `${birthDate} -> ${referenceDate}`);
      const r = actual.result;
      const birth = parseParts(birthDate);
      const ref = parseParts(referenceDate);
      // Total days agree with the independent ordinal formula.
      assert.equal(r.totalDays, ordinalOf(referenceDate) - ordinalOf(birthDate), birthDate);
      // Borrow invariants from the SPEC.
      assert.ok(r.ageYears >= 0, birthDate);
      assert.ok(r.ageMonths >= 0 && r.ageMonths <= 11, birthDate);
      assert.ok(r.ageDays >= 0, birthDate);
      if (ref[2] < birth[2]) {
        // Replay the borrow sequence independently (stepping one
        // month further back per borrow until the day count is
        // non-negative): the replayed day count must equal the
        // result's, and it stays below the final borrowed month's
        // length, as the SPEC's invariant pins.
        let replayedDays = ref[2] - birth[2];
        let borrowedYear = ref[0];
        let borrowedMonth = ref[1];
        while (replayedDays < 0) {
          borrowedMonth -= 1;
          if (borrowedMonth === 0) {
            borrowedMonth = 12;
            borrowedYear -= 1;
          }
          replayedDays += monthLength(borrowedYear, borrowedMonth);
        }
        assert.equal(r.ageDays, replayedDays, birthDate);
        assert.ok(r.ageDays < monthLength(borrowedYear, borrowedMonth), birthDate);
      }
      // Reconstruction: the observed birthday in year
      // birth + ageYears is the last one on or before the reference
      // day, and the reported next birthday is the first observed
      // birthday on or after it.
      const lastParts = observedParts(birth, birth[0] + r.ageYears);
      assert.ok(daysFromCivil(...lastParts) <= ordinalOf(referenceDate), birthDate);
      const afterParts = observedParts(birth, birth[0] + r.ageYears + 1);
      assert.ok(daysFromCivil(...afterParts) > ordinalOf(referenceDate), birthDate);
      const expectedNext =
        daysFromCivil(...observedParts(birth, ref[0])) >= ordinalOf(referenceDate)
          ? observedParts(birth, ref[0])
          : observedParts(birth, ref[0] + 1);
      assert.equal(r.nextBirthday, formatParts(expectedNext), birthDate);
      assert.equal(
        r.daysUntilNextBirthday,
        ordinalOf(r.nextBirthday) - ordinalOf(referenceDate),
        birthDate,
      );
      assert.equal(r.turningAge, expectedNext[0] - birth[0], birthDate);
      assert.equal(r.isBirthdayToday, r.nextBirthday === referenceDate, birthDate);
      assert.equal(r.totalDays + r.daysUntilNextBirthday, ordinalOf(r.nextBirthday) - ordinalOf(birthDate), birthDate);
    }
  }
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/age.mjs", import.meta.url));
  const inputs = coreCases.map((entry) => entry.input);
  const script = `
    import { run } from ${JSON.stringify(pathToFileURL(corePath).href)};
    const inputs = ${JSON.stringify(inputs)};
    const outputs = inputs.map((input) => run(input));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const expected = JSON.stringify(inputs.map((input) => run(input)));
  for (const tz of ["UTC", "Asia/Taipei", "America/New_York", "Pacific/Kiritimati"]) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
    assert.equal(out, expected, `TZ=${tz}`);
  }
});
