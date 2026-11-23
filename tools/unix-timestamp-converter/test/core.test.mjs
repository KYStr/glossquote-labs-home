// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-unix-timestamp-converter-20261121, draft spec PR #392,
// registry rev 1807, SHA-256
// 390c38ed95bcc6f28ee32c385b229cf170d220ebded8e032ef4491aea19b59b3).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// independently from the SPEC's pinned rules with Python
// datetime/zoneinfo (a second implementation, not the product code):
// every timestamp, display string, and weekday below was derived
// that way before the test was written.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { DEFAULTS, run } from "../public/js/core/unix-timestamp.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-unix-timestamp-converter-20261121");
assert.equal(coreCases.length, 14);

function baseInput(overrides) {
  return {
    customPattern: "YYYY-MM-DD HH:mm:ss",
    date: "",
    direction: "timestamp-to-datetime",
    format: "iso8601",
    milliseconds: "000",
    time: "",
    timestamp: "",
    timezone: "Asia/Taipei",
    unit: "auto",
    ...overrides,
  };
}

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

test("auto-detect boundaries: 10^11-1 seconds, 10^11 and 10^12-1 ambiguous, 10^12 milliseconds", () => {
  // 99,999,999,999 s = 5138-11-16 09:46:39Z (Python zoneinfo).
  const justBelow = run(baseInput({ timestamp: "99999999999" }));
  assert.equal(justBelow.ok, true);
  assert.equal(justBelow.result.unitDetected, "seconds");
  assert.equal(justBelow.result.timestampSeconds, 99999999999);
  assert.equal(justBelow.result.timestampMs, 99999999999000);
  assert.deepEqual(justBelow.result.displays[0], {
    zone: "UTC",
    iso8601: "5138-11-16T09:46:39.000Z",
    rfc2822: "Wed, 16 Nov 5138 09:46:39 +0000",
    custom: null,
  });
  assert.deepEqual(justBelow.result.displays[1], {
    zone: "Asia/Taipei",
    iso8601: "5138-11-16T17:46:39.000+08:00",
    rfc2822: "Wed, 16 Nov 5138 17:46:39 +0800",
    custom: null,
  });
  for (const value of ["100000000000", "999999999999"]) {
    assert.deepEqual(run(baseInput({ timestamp: value })), {
      ok: false,
      error: { code: "AMBIGUOUS_UNIT", field: "timestamp", row: null },
    });
  }
  const atTrillion = run(baseInput({ timestamp: "1000000000000" }));
  assert.equal(atTrillion.ok, true);
  assert.equal(atTrillion.result.unitDetected, "milliseconds");
  assert.equal(atTrillion.result.timestampSeconds, 1000000000);
  assert.equal(atTrillion.result.timestampMs, 1000000000000);
  // An explicit unit resolves the ambiguous band.
  assert.equal(
    run(baseInput({ timestamp: "100000000000", unit: "seconds" })).ok,
    true,
  );
  assert.equal(
    run(baseInput({ timestamp: "100000000000", unit: "milliseconds" })).ok,
    true,
  );
});

test("seconds range endpoints are accepted; one second outside is RANGE", () => {
  const max = run(baseInput({ timestamp: "253402300799", unit: "seconds" }));
  assert.equal(max.ok, true);
  assert.equal(max.result.timestampMs, 253402300799000);
  assert.equal(max.result.displays[0].iso8601, "9999-12-31T23:59:59.000Z");
  assert.equal(max.result.displays[0].rfc2822, "Fri, 31 Dec 9999 23:59:59 +0000");
  const min = run(baseInput({ timestamp: "-62135596800", unit: "seconds" }));
  assert.equal(min.ok, true);
  assert.equal(min.result.timestampMs, -62135596800000);
  assert.equal(min.result.displays[0].iso8601, "0001-01-01T00:00:00.000Z");
  assert.equal(min.result.displays[0].rfc2822, "Mon, 01 Jan 0001 00:00:00 +0000");
  // Taipei at the lower bound is the LMT offset +08:06 (Python
  // zoneinfo), not the SPEC's "fixed +08:00" shorthand — see
  // HANDOFF.md errata candidate 1. The wall clock is exact.
  assert.deepEqual(min.result.displays[1], {
    zone: "Asia/Taipei",
    iso8601: "0001-01-01T08:06:00.000+08:06",
    rfc2822: "Mon, 01 Jan 0001 08:06:00 +0806",
    custom: null,
  });
  assert.deepEqual(run(baseInput({ timestamp: "253402300800", unit: "seconds" })), {
    ok: false,
    error: { code: "RANGE", field: "timestamp", row: null },
  });
  assert.deepEqual(run(baseInput({ timestamp: "-62135596801", unit: "seconds" })), {
    ok: false,
    error: { code: "RANGE", field: "timestamp", row: null },
  });
  // Millisecond endpoints: one millisecond outside is RANGE.
  assert.equal(run(baseInput({ timestamp: "253402300799999", unit: "milliseconds" })).ok, true);
  assert.equal(run(baseInput({ timestamp: "-62135596800000", unit: "milliseconds" })).ok, true);
  assert.deepEqual(run(baseInput({ timestamp: "253402300800000", unit: "milliseconds" })), {
    ok: false,
    error: { code: "RANGE", field: "timestamp", row: null },
  });
});

test("negative fractions floor toward -infinity (SPEC rule)", () => {
  const minusHalf = run(baseInput({ timestamp: "-1.5", unit: "seconds" }));
  assert.equal(minusHalf.ok, true);
  assert.equal(minusHalf.result.timestampMs, -1500);
  assert.equal(minusHalf.result.timestampSeconds, -2);
  const minusMilli = run(baseInput({ timestamp: "-0.001", unit: "seconds" }));
  assert.equal(minusMilli.ok, true);
  assert.equal(minusMilli.result.timestampMs, -1);
  assert.equal(minusMilli.result.timestampSeconds, -1);
  const plusMilli = run(baseInput({ timestamp: "0.001", unit: "seconds" }));
  assert.equal(plusMilli.ok, true);
  assert.equal(plusMilli.result.timestampMs, 1);
  assert.equal(plusMilli.result.timestampSeconds, 0);
  const threeDecimals = run(baseInput({ timestamp: "1700000000.123", unit: "seconds" }));
  assert.equal(threeDecimals.ok, true);
  assert.equal(threeDecimals.result.timestampMs, 1700000000123);
});

test("milliseconds mode accepts integers only; a fraction is INTEGER_FORMAT", () => {
  assert.deepEqual(run(baseInput({ timestamp: "1700000000000.5", unit: "milliseconds" })), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "timestamp", row: null },
  });
  assert.deepEqual(run(baseInput({ timestamp: "1000000000000.5", unit: "auto" })), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "timestamp", row: null },
  });
  const negativeMs = run(baseInput({ timestamp: "-1700000000000", unit: "milliseconds" }));
  assert.equal(negativeMs.ok, true);
  assert.equal(negativeMs.result.timestampSeconds, -1700000000);
  assert.equal(negativeMs.result.timestampMs, -1700000000000);
});

test("timestamp grammar: ASCII decimals only, no spaces, signs, exponents, or commas", () => {
  for (const bad of [
    "+1700000000",
    "1700000000 ",
    " 1700000000",
    "1,700,000,000",
    "1.7e9",
    "1700000000.",
    ".5",
    "1700000000.1234",
    "-",
    "１７００００００００",
    "1700000000..5",
    "1700000000.5.5",
  ]) {
    assert.deepEqual(run(baseInput({ timestamp: bad })), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "timestamp", row: null },
    });
  }
  // Leading zeros are not forbidden by the grammar.
  assert.equal(run(baseInput({ timestamp: "007" })).ok, true);
});

test("empty timestamp is EMPTY; a 17-unit raw timestamp is INPUT_LIMIT", () => {
  assert.deepEqual(run(baseInput({ timestamp: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "timestamp", row: null },
  });
  assert.deepEqual(run(baseInput({ timestamp: "12345678901234567" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "timestamp", row: null },
  });
  // Exactly 16 units is within capacity; 1,234,567,890,123,456 is
  // >= 10^12, so it is detected as milliseconds and is out of range.
  assert.deepEqual(run(baseInput({ timestamp: "1234567890123456" })), {
    ok: false,
    error: { code: "RANGE", field: "timestamp", row: null },
  });
});

test("lone surrogates are UNICODE in the offending field", () => {
  assert.deepEqual(run(baseInput({ timestamp: "1700\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "timestamp", row: null },
  });
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "2026-11-21",
        time: "00:00:00",
        milliseconds: "0\uDC00",
      }),
    ),
    { ok: false, error: { code: "UNICODE", field: "milliseconds", row: null } },
  );
});

test("leap-year rule: 2000 is a leap year, 1900 is not, 2024 is", () => {
  // 2000-02-29 12:00 UTC = 951,825,600,000 ms (Python zoneinfo).
  const leap2000 = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "2000-02-29",
      time: "12:00:00",
      timezone: "UTC",
    }),
  );
  assert.equal(leap2000.ok, true);
  assert.equal(leap2000.result.timestampMs, 951825600000);
  assert.equal(leap2000.result.displays[0].iso8601, "2000-02-29T12:00:00.000Z");
  assert.equal(leap2000.result.displays[0].rfc2822, "Tue, 29 Feb 2000 12:00:00 +0000");
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "1900-02-29",
        time: "12:00:00",
        timezone: "UTC",
      }),
    ),
    { ok: false, error: { code: "INVALID_DATE", field: "date", row: null } },
  );
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "2026-04-31",
        time: "12:00:00",
        timezone: "UTC",
      }),
    ),
    { ok: false, error: { code: "INVALID_DATE", field: "date", row: null } },
  );
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "2026-13-01",
        time: "12:00:00",
        timezone: "UTC",
      }),
    ),
    { ok: false, error: { code: "INVALID_DATE", field: "date", row: null } },
  );
});

test("datetime direction: empty fields, grammar, and the leap-second refusal", () => {
  const dt = (overrides) =>
    baseInput({ direction: "datetime-to-timestamp", date: "2026-11-21", time: "00:00:00", ...overrides });
  assert.deepEqual(run(dt({ date: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "date", row: null },
  });
  assert.deepEqual(run(dt({ time: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "time", row: null },
  });
  assert.deepEqual(run(dt({ milliseconds: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "milliseconds", row: null },
  });
  for (const bad of ["2026/11/21", "26-11-21", "2026-11-2", "2026-1-21"]) {
    assert.deepEqual(run(dt({ date: bad })), {
      ok: false,
      error: { code: "DATETIME_FORMAT", field: "date", row: null },
    });
  }
  for (const bad of ["24:00:00", "00:60:00", "00:00:61", "0:00:00", "00:00:0"]) {
    assert.deepEqual(run(dt({ time: bad })), {
      ok: false,
      error: { code: "DATETIME_FORMAT", field: "time", row: null },
    });
  }
  assert.deepEqual(run(dt({ time: "23:59:60" })), {
    ok: false,
    error: { code: "LEAP_SECOND_UNSUPPORTED", field: "time", row: null },
  });
  // Milliseconds: "5" is 5 ms, not 500 ms; four digits exceed capacity.
  const five = run(dt({ milliseconds: "5" }));
  assert.equal(five.ok, true);
  assert.equal(five.result.timestampMs, 1795190400005);
  assert.deepEqual(run(dt({ milliseconds: "1234" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "milliseconds", row: null },
  });
  assert.deepEqual(run(dt({ milliseconds: "12a" })), {
    ok: false,
    error: { code: "DATETIME_FORMAT", field: "milliseconds", row: null },
  });
  // A date longer than the fixed YYYY-MM-DD shape exceeds capacity.
  assert.deepEqual(run(dt({ date: "2026-11-210" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "date", row: null },
  });
});

test("datetime direction range: the 0001 and 9999 endpoints, and a zone shift past the top", () => {
  const min = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "0001-01-01",
      time: "00:00:00",
      timezone: "UTC",
    }),
  );
  assert.equal(min.ok, true);
  assert.equal(min.result.timestampMs, -62135596800000);
  const max = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "9999-12-31",
      time: "23:59:59",
      timezone: "UTC",
    }),
  );
  assert.equal(max.ok, true);
  assert.equal(max.result.timestampMs, 253402300799000);
  // 9999-12-31 23:59:59 in New York is 10000-01-01 04:59:59Z: past
  // the top of the range.
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "9999-12-31",
        time: "23:59:59",
        timezone: "America/New_York",
      }),
    ),
    { ok: false, error: { code: "RANGE", field: "date", row: null } },
  );
});

test("DST overlap in Sydney and Paris takes the earlier occurrence and flags it", () => {
  // 2026-04-05 02:30 Sydney occurs twice; the earlier is AEDT (+11),
  // 1,775,316,600,000 ms = 2026-04-04 15:30:00Z (Python zoneinfo).
  const sydney = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "2026-04-05",
      time: "02:30:00",
      timezone: "Australia/Sydney",
    }),
  );
  assert.equal(sydney.ok, true);
  assert.equal(sydney.result.timestampMs, 1775316600000);
  assert.equal(sydney.result.timestampSeconds, 1775316600);
  assert.equal(sydney.result.ambiguousLocalTime, true);
  assert.equal(sydney.result.displays[0].iso8601, "2026-04-04T15:30:00.000Z");
  assert.equal(sydney.result.displays[2].iso8601, "2026-04-05T02:30:00.000+11:00");
  assert.equal(sydney.result.displays[2].rfc2822, "Sun, 05 Apr 2026 02:30:00 +1100");
  // 2026-10-25 02:30 Paris occurs twice; the earlier is CEST (+02),
  // 1,792,888,200,000 ms (Python zoneinfo).
  const paris = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "2026-10-25",
      time: "02:30:00",
      timezone: "Europe/Paris",
    }),
  );
  assert.equal(paris.ok, true);
  assert.equal(paris.result.timestampMs, 1792888200000);
  assert.equal(paris.result.ambiguousLocalTime, true);
  assert.equal(paris.result.displays[2].iso8601, "2026-10-25T02:30:00.000+02:00");
});

test("DST gap in London is NONEXISTENT_LOCAL_TIME", () => {
  // 2026-03-29 01:30 London does not exist (clocks jump 01:00 GMT to
  // 02:00 BST; Python zoneinfo round-trips it to 02:30).
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "2026-03-29",
        time: "01:30:00",
        timezone: "Europe/London",
      }),
    ),
    { ok: false, error: { code: "NONEXISTENT_LOCAL_TIME", field: "time", row: null } },
  );
  // Los Angeles overlap: 2026-11-01 01:30 occurs twice; the earlier
  // is PDT (-07), 1,793,521,800,000 ms (Python zoneinfo).
  const la = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "2026-11-01",
      time: "01:30:00",
      timezone: "America/Los_Angeles",
    }),
  );
  assert.equal(la.ok, true);
  assert.equal(la.result.timestampMs, 1793521800000);
  assert.equal(la.result.ambiguousLocalTime, true);
  assert.equal(la.result.displays[2].iso8601, "2026-11-01T01:30:00.000-07:00");
});

test("Tokyo midnight converts with the fixed +09:00 offset", () => {
  // 2026-11-21 00:00 Tokyo = 1,795,186,800 s (Python zoneinfo).
  const tokyo = run(
    baseInput({
      direction: "datetime-to-timestamp",
      date: "2026-11-21",
      time: "00:00:00",
      timezone: "Asia/Tokyo",
    }),
  );
  assert.equal(tokyo.ok, true);
  assert.equal(tokyo.result.timestampSeconds, 1795186800);
  assert.equal(tokyo.result.displays[2].iso8601, "2026-11-21T00:00:00.000+09:00");
});

test("custom format: tokens substitute, literals pass through, unknown runs fail", () => {
  const custom = run(
    baseInput({
      timestamp: "0",
      format: "custom",
      customPattern: "YYYY年MM月DD日 HH時mm分ss秒SSS",
    }),
  );
  assert.equal(custom.ok, true);
  assert.equal(custom.result.displays[0].custom, "1970年01月01日 00時00分00秒000");
  assert.equal(custom.result.displays[1].custom, "1970年01月01日 08時00分00秒000");
  for (const bad of ["YY", "YYYYMMDD", "YYYY-MM-DD HH:mm:ss X", "MMM", "SS", "yyyy", "YYYYY"]) {
    assert.deepEqual(run(baseInput({ timestamp: "0", format: "custom", customPattern: bad })), {
      ok: false,
      error: { code: "CUSTOM_FORMAT", field: "customPattern", row: null },
    });
  }
  // A 65-unit pattern exceeds capacity before any token is read.
  assert.deepEqual(
    run(baseInput({ timestamp: "0", format: "custom", customPattern: "Y".repeat(65) })),
    { ok: false, error: { code: "INPUT_LIMIT", field: "customPattern", row: null } },
  );
  // customPattern is ignored entirely unless format is custom.
  assert.equal(
    run(baseInput({ timestamp: "0", format: "iso8601", customPattern: "nonsense!!!" })).ok,
    true,
  );
});

test("validation order: direction, then source fields, then zone/unit/format, then DST", () => {
  // Direction grammar beats a bad timestamp.
  assert.deepEqual(run(baseInput({ direction: "sideways", timestamp: "junk" })), {
    ok: false,
    error: { code: "SCHEMA", field: "direction", row: null },
  });
  // The source field beats an unsupported zone.
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "2026-02-29",
        time: "12:00:00",
        timezone: "Mars/Olympus",
      }),
    ),
    { ok: false, error: { code: "INVALID_DATE", field: "date", row: null } },
  );
  // An unsupported zone beats the DST cross-field check.
  assert.deepEqual(
    run(
      baseInput({
        direction: "datetime-to-timestamp",
        date: "2026-03-08",
        time: "02:30:00",
        timezone: "Mars/Olympus",
      }),
    ),
    { ok: false, error: { code: "UNSUPPORTED_ZONE", field: "timezone", row: null } },
  );
  // A bad unit beats a bad format; a bad format beats a bad pattern.
  assert.deepEqual(run(baseInput({ timestamp: "0", unit: "parsecs", format: "yaml" })), {
    ok: false,
    error: { code: "SCHEMA", field: "unit", row: null },
  });
  assert.deepEqual(
    run(baseInput({ timestamp: "0", format: "yaml", customPattern: "YY" })),
    { ok: false, error: { code: "SCHEMA", field: "format", row: null } },
  );
  assert.deepEqual(run(baseInput({ timestamp: "0", timezone: "Asia/Seoul" })), {
    ok: false,
    error: { code: "UNSUPPORTED_ZONE", field: "timezone", row: null },
  });
  // Timestamp grammar beats an invalid unit.
  assert.deepEqual(run(baseInput({ timestamp: "junk", unit: "parsecs" })), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "timestamp", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("0"), schema);
  assert.deepEqual(run(baseInput({ timestamp: 0 })), schema);
  assert.deepEqual(run({ ...baseInput({ timestamp: "0" }), extra: "x" }), schema);
  const missing = baseInput({ timestamp: "0" });
  delete missing.unit;
  assert.deepEqual(run(missing), schema);
  const withAccessor = baseInput({ timestamp: "0" });
  Object.defineProperty(withAccessor, "timestamp", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("the selected zone is not duplicated when it repeats UTC or Taipei", () => {
  const utcSelected = run(baseInput({ timestamp: "0", timezone: "UTC" }));
  assert.equal(utcSelected.ok, true);
  assert.deepEqual(
    utcSelected.result.displays.map((entry) => entry.zone),
    ["UTC", "Asia/Taipei"],
  );
  const taipeiSelected = run(baseInput({ timestamp: "0", timezone: "Asia/Taipei" }));
  assert.deepEqual(
    taipeiSelected.result.displays.map((entry) => entry.zone),
    ["UTC", "Asia/Taipei"],
  );
  const tokyoSelected = run(baseInput({ timestamp: "0", timezone: "Asia/Tokyo" }));
  assert.deepEqual(
    tokyoSelected.result.displays.map((entry) => entry.zone),
    ["UTC", "Asia/Taipei", "Asia/Tokyo"],
  );
});

test("every accepted result points at one absolute instant across its displays", () => {
  // The three displays of the DST-overlap fixture must all describe
  // the same instant. This test re-derives each display's instant
  // from its ISO wall clock and offset with an independently written
  // days-from-civil routine (not the implementation's), and requires
  // all three to equal the result's timestampMs.
  function daysFromCivil(year, month, day) {
    const y = month <= 2 ? year - 1 : year;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }
  const fixture = coreCases.find((entry) => entry.id === "dst-overlap-earlier");
  const actual = run(fixture.input);
  assert.equal(actual.ok, true);
  assert.equal(actual.result.timestampMs, 1793511000000);
  for (const entry of actual.result.displays) {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})(Z|[+-]\d{2}:\d{2})$/.exec(
        entry.iso8601,
      );
    assert.ok(match, entry.iso8601);
    const [, y, mo, d, h, mi, s, ms, suffix] = match;
    const wallMs =
      daysFromCivil(Number(y), Number(mo), Number(d)) * 86400000 +
      ((Number(h) * 60 + Number(mi)) * 60 + Number(s)) * 1000 +
      Number(ms);
    let offsetMs = 0;
    if (suffix !== "Z") {
      const sign = suffix[0] === "-" ? -1 : 1;
      const [oh, om] = suffix.slice(1).split(":").map(Number);
      offsetMs = sign * (oh * 60 + om) * 60000;
    }
    assert.equal(wallMs - offsetMs, actual.result.timestampMs, entry.zone);
  }
});

test("core output is byte-identical under other host timezones", () => {
  // Zone offsets come only from Intl with an explicit timeZone, so
  // the host TZ must not change any result.
  const corePath = fileURLToPath(new URL("../public/js/core/unix-timestamp.mjs", import.meta.url));
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

test("DEFAULTS match the SPEC reset value", () => {
  assert.deepEqual(DEFAULTS, {
    direction: "timestamp-to-datetime",
    timestamp: "",
    unit: "auto",
    date: "",
    time: "",
    milliseconds: "000",
    timezone: "Asia/Taipei",
    format: "iso8601",
    customPattern: "YYYY-MM-DD HH:mm:ss",
  });
});
