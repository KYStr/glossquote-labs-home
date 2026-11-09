// Core tests for the Time Zone Converter. Every expected value below is
// derived from SPEC section 4's printed fixtures (Z1-Z5) or hand-computed
// from published IANA rules (zone offsets and the 2026 transition dates for
// America/New_York and Australia/Sydney) -- never from the implementation's
// own output. The suite must pass under any host time zone: the core never
// consults local time, and these tests use Date.UTC expectations only.

import test from "node:test";
import assert from "node:assert/strict";

import {
  ZONES,
  MAX_TARGETS,
  checkAddTarget,
  convert,
  formatOffset,
  isKnownZone,
  offsetMinutesAt,
  readingAt,
  resolveSource,
  validateDate,
  validateTargets,
  validateTime,
} from "../public/js/core/convert.mjs";

// ---------------------------------------------------------------------------
// Zone list (SPEC section 4: exactly these 40 names, in this order)
// ---------------------------------------------------------------------------

test("zone list is exactly the 40 pinned names in order", () => {
  assert.equal(ZONES.length, 40);
  assert.equal(ZONES[0], "Pacific/Auckland");
  assert.equal(ZONES[9], "Asia/Taipei");
  assert.equal(ZONES[14], "Asia/Kathmandu");
  assert.equal(ZONES[33], "America/New_York");
  assert.equal(ZONES[39], "America/Santiago");
  assert.equal(new Set(ZONES).size, 40);
});

test("platform Intl accepts every pinned zone name", () => {
  for (const zone of ZONES) {
    assert.doesNotThrow(
      () => new Intl.DateTimeFormat("en-GB", { timeZone: zone }),
      zone,
    );
    assert.equal(isKnownZone(zone), true);
  }
  assert.equal(isKnownZone("UTC"), false);
  assert.equal(isKnownZone("Asia/Taipei "), false);
  assert.equal(isKnownZone(""), false);
});

// ---------------------------------------------------------------------------
// Offset formatting (SPEC sections 4 and 7f)
// ---------------------------------------------------------------------------

test("offset formatting is sign + HH:MM, never Z or an abbreviation", () => {
  assert.equal(formatOffset(345), "+05:45"); // Asia/Kathmandu
  assert.equal(formatOffset(-300), "-05:00"); // America/New_York winter
  assert.equal(formatOffset(0), "+00:00"); // Europe/London winter
  assert.equal(formatOffset(780), "+13:00"); // Pacific/Auckland summer
  assert.equal(formatOffset(-600), "-10:00"); // Pacific/Honolulu
  assert.equal(formatOffset(210), "+03:30"); // Asia/Tehran
  assert.equal(formatOffset(-30), "-00:30");
});

// ---------------------------------------------------------------------------
// Fixtures Z1-Z5 (SPEC section 4), every field of every row
// ---------------------------------------------------------------------------

test("Z1: 2026-01-15 09:00 Asia/Taipei, four default targets", () => {
  const result = convert({
    date: "2026-01-15",
    time: "09:00",
    zone: "Asia/Taipei",
    targets: [
      "America/New_York",
      "Europe/London",
      "Australia/Sydney",
      "Asia/Kathmandu",
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.instantMs, Date.UTC(2026, 0, 15, 1, 0));
  assert.deepEqual(result.utc, { date: "2026-01-15", time: "01:00" });
  assert.equal(result.kind, "ordinary");
  assert.deepEqual(result.resolvedReading, {
    date: "2026-01-15",
    time: "09:00",
    offsetMinutes: 480,
    offset: "+08:00",
  });
  assert.deepEqual(result.rows, [
    { zone: "America/New_York", date: "2026-01-14", time: "20:00", offsetMinutes: -300, offset: "-05:00", dayShift: -1 },
    { zone: "Europe/London", date: "2026-01-15", time: "01:00", offsetMinutes: 0, offset: "+00:00", dayShift: 0 },
    { zone: "Australia/Sydney", date: "2026-01-15", time: "12:00", offsetMinutes: 660, offset: "+11:00", dayShift: 0 },
    { zone: "Asia/Kathmandu", date: "2026-01-15", time: "06:45", offsetMinutes: 345, offset: "+05:45", dayShift: 0 },
  ]);
});

test("Z2: July reading shows New York on daylight time (-04:00)", () => {
  const result = convert({
    date: "2026-07-15",
    time: "09:00",
    zone: "Asia/Taipei",
    targets: ["America/New_York"],
  });
  assert.equal(result.ok, true);
  assert.equal(result.instantMs, Date.UTC(2026, 6, 15, 1, 0));
  assert.deepEqual(result.rows, [
    { zone: "America/New_York", date: "2026-07-14", time: "21:00", offsetMinutes: -240, offset: "-04:00", dayShift: -1 },
  ]);
});

test("Z3: spring-forward gap shifts forward by the jump and flags gap", () => {
  const result = convert({
    date: "2026-03-08",
    time: "02:30",
    zone: "America/New_York",
    targets: ["Asia/Taipei"],
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, "gap");
  assert.equal(result.jumpMinutes, 60);
  assert.equal(result.instantMs, Date.UTC(2026, 2, 8, 7, 30));
  assert.deepEqual(result.utc, { date: "2026-03-08", time: "07:30" });
  assert.deepEqual(result.resolvedReading, {
    date: "2026-03-08",
    time: "03:30",
    offsetMinutes: -240,
    offset: "-04:00",
  });
  assert.deepEqual(result.rows, [
    { zone: "Asia/Taipei", date: "2026-03-08", time: "15:30", offsetMinutes: 480, offset: "+08:00", dayShift: 0 },
  ]);
});

test("Z4: fall-back overlap uses the earlier (daylight) occurrence", () => {
  const result = convert({
    date: "2026-11-01",
    time: "01:30",
    zone: "America/New_York",
    targets: ["Asia/Taipei"],
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, "overlap");
  assert.equal(result.instantMs, Date.UTC(2026, 10, 1, 5, 30));
  assert.deepEqual(result.utc, { date: "2026-11-01", time: "05:30" });
  assert.deepEqual(result.resolvedReading, {
    date: "2026-11-01",
    time: "01:30",
    offsetMinutes: -240,
    offset: "-04:00",
  });
  assert.deepEqual(result.rows, [
    { zone: "Asia/Taipei", date: "2026-11-01", time: "13:30", offsetMinutes: 480, offset: "+08:00", dayShift: 0 },
  ]);
});

test("Z5: source zone as target in a gap shows the resolved reading", () => {
  const result = convert({
    date: "2026-03-08",
    time: "02:30",
    zone: "America/New_York",
    targets: ["America/New_York"],
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, "gap");
  assert.deepEqual(result.rows, [
    { zone: "America/New_York", date: "2026-03-08", time: "03:30", offsetMinutes: -240, offset: "-04:00", dayShift: 0 },
  ]);
});

// ---------------------------------------------------------------------------
// Southern-hemisphere transitions (SPEC section 7b): Sydney DST ends on
// 2026-04-05 (03:00 AEDT -> 02:00 AEST, so 02:00-03:00 occurs twice) and
// starts on 2026-10-04 (02:00 AEST -> 03:00 AEDT, so 02:00-03:00 never
// occurs). Expectations hand-derived from those published rules.
// ---------------------------------------------------------------------------

test("Sydney overlap 2026-04-05 02:30 uses the earlier +11:00 occurrence", () => {
  const result = resolveSource({
    date: "2026-04-05",
    time: "02:30",
    zone: "Australia/Sydney",
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, "overlap");
  assert.equal(result.instantMs, Date.UTC(2026, 3, 4, 15, 30));
  assert.deepEqual(result.resolvedReading, {
    date: "2026-04-05",
    time: "02:30",
    offsetMinutes: 660,
    offset: "+11:00",
  });
  // The later occurrence is exactly one hour after, at +10:00.
  assert.equal(
    offsetMinutesAt("Australia/Sydney", result.instantMs + 3_600_000),
    600,
  );
  assert.deepEqual(readingAt("Australia/Sydney", result.instantMs + 3_600_000), {
    date: "2026-04-05",
    time: "02:30",
    offsetMinutes: 600,
    offset: "+10:00",
  });
});

test("Sydney gap 2026-10-04 02:30 resolves to 03:30 at +11:00", () => {
  const result = resolveSource({
    date: "2026-10-04",
    time: "02:30",
    zone: "Australia/Sydney",
  });
  assert.equal(result.ok, true);
  assert.equal(result.kind, "gap");
  assert.equal(result.jumpMinutes, 60);
  assert.equal(result.instantMs, Date.UTC(2026, 9, 3, 16, 30));
  assert.deepEqual(result.resolvedReading, {
    date: "2026-10-04",
    time: "03:30",
    offsetMinutes: 660,
    offset: "+11:00",
  });
});

// ---------------------------------------------------------------------------
// Single-instant property (SPEC section 7c): every row, re-read in its own
// zone, is the same instant that the result displays in UTC.
// ---------------------------------------------------------------------------

test("single-instant property across a fixed spread of inputs", () => {
  const cases = [
    { date: "2026-01-15", time: "09:00", zone: "Asia/Taipei" },
    { date: "2026-07-15", time: "09:00", zone: "Asia/Taipei" },
    { date: "2026-03-08", time: "02:30", zone: "America/New_York" }, // gap
    { date: "2026-11-01", time: "01:30", zone: "America/New_York" }, // overlap
    { date: "2026-04-05", time: "02:30", zone: "Australia/Sydney" }, // overlap
    { date: "2026-10-04", time: "02:30", zone: "Australia/Sydney" }, // gap
    { date: "2031-06-30", time: "23:45", zone: "Asia/Kathmandu" },
    { date: "2040-02-29", time: "00:15", zone: "Europe/London" },
    { date: "2000-01-01", time: "00:00", zone: "Pacific/Auckland" },
    { date: "2099-12-31", time: "23:59", zone: "Pacific/Honolulu" },
  ];
  const targets = [
    "Pacific/Auckland",
    "Asia/Tokyo",
    "Asia/Kathmandu",
    "Europe/Paris",
    "America/Chicago",
    "Pacific/Honolulu",
  ];
  for (const input of cases) {
    const result = convert({ ...input, targets });
    assert.equal(result.ok, true, JSON.stringify(input));
    for (const row of result.rows) {
      // The row's reading, read back at its own displayed offset, is the
      // displayed instant exactly. Row dates may sit just outside the
      // 2000-2099 source-input range (the range limits what may be
      // ENTERED as a source, per SPEC section 2); for those rows the
      // check is arithmetic against the row's printed offset instead of
      // a re-resolution, which the range rule correctly refuses.
      if (row.date < "2000-01-01" || row.date > "2099-12-31") {
        const [y, m, d] = row.date.split("-").map(Number);
        const [hh, mm] = row.time.split(":").map(Number);
        assert.equal(
          Date.UTC(y, m - 1, d, hh, mm) - row.offsetMinutes * 60_000,
          result.instantMs,
          `${row.zone} ${JSON.stringify(input)}`,
        );
      } else {
        const back = resolveSource({ date: row.date, time: row.time, zone: row.zone });
        assert.equal(back.ok, true);
        if (back.kind !== "overlap") {
          assert.equal(back.instantMs, result.instantMs, `${row.zone} ${JSON.stringify(input)}`);
        } else {
          // An ambiguous row reading resolves to its earlier occurrence,
          // which is the displayed instant or one jump before it.
          assert.ok(back.instantMs <= result.instantMs);
          assert.ok(result.instantMs - back.instantMs <= 3_600_000);
        }
      }
      assert.equal(readingAt(row.zone, result.instantMs).date, row.date);
      assert.equal(readingAt(row.zone, result.instantMs).time, row.time);
      assert.ok(row.dayShift >= -1 && row.dayShift <= 1);
    }
  }
});

// ---------------------------------------------------------------------------
// Day shift across the date line in both directions (SPEC section 7d)
// ---------------------------------------------------------------------------

test("date line: Honolulu afternoon is the next day in Auckland", () => {
  const result = convert({
    date: "2026-01-14",
    time: "15:00",
    zone: "Pacific/Honolulu",
    targets: ["Pacific/Auckland"],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.utc, { date: "2026-01-15", time: "01:00" });
  assert.deepEqual(result.rows, [
    { zone: "Pacific/Auckland", date: "2026-01-15", time: "14:00", offsetMinutes: 780, offset: "+13:00", dayShift: 1 },
  ]);
});

test("date line: Auckland afternoon is the previous day in Honolulu", () => {
  const result = convert({
    date: "2026-01-15",
    time: "14:00",
    zone: "Pacific/Auckland",
    targets: ["Pacific/Honolulu"],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.rows, [
    { zone: "Pacific/Honolulu", date: "2026-01-14", time: "15:00", offsetMinutes: -600, offset: "-10:00", dayShift: -1 },
  ]);
});

// ---------------------------------------------------------------------------
// Bounds and refusals (SPEC sections 3, 4 and 7e)
// ---------------------------------------------------------------------------

test("date bounds: 2000-01-01 and 2099-12-31 accepted, outside refused", () => {
  assert.deepEqual(validateDate("2000-01-01"), { ok: true, value: "2000-01-01" });
  assert.deepEqual(validateDate("2099-12-31"), { ok: true, value: "2099-12-31" });
  assert.deepEqual(validateDate("1999-12-31"), { ok: false, error: "date-out-of-range" });
  assert.deepEqual(validateDate("2100-01-01"), { ok: false, error: "date-out-of-range" });
  assert.equal(
    resolveSource({ date: "2000-01-01", time: "00:00", zone: "Asia/Taipei" }).instantMs,
    Date.UTC(1999, 11, 31, 16, 0),
  );
  assert.equal(
    resolveSource({ date: "2099-12-31", time: "23:59", zone: "Pacific/Auckland" }).ok,
    true,
  );
});

test("invalid calendar dates and malformed values are refused", () => {
  assert.deepEqual(validateDate("2026-02-30"), { ok: false, error: "invalid-date" });
  assert.deepEqual(validateDate("2026-02-29"), { ok: false, error: "invalid-date" }); // 2026 not a leap year
  assert.deepEqual(validateDate("2028-02-29"), { ok: true, value: "2028-02-29" });
  assert.deepEqual(validateDate("2026-13-01"), { ok: false, error: "invalid-date" });
  assert.deepEqual(validateDate("2026-1-5"), { ok: false, error: "invalid-date" });
  assert.deepEqual(validateDate("15/01/2026"), { ok: false, error: "invalid-date" });
  assert.deepEqual(validateDate(""), { ok: false, error: "invalid-date" });
  assert.deepEqual(validateDate(undefined), { ok: false, error: "invalid-date" });
  assert.deepEqual(
    convert({ date: "2026-02-30", time: "09:00", zone: "Asia/Taipei", targets: [] }),
    { ok: false, error: "invalid-date" },
  );
});

test("time validation: minute precision, 24-hour only", () => {
  assert.deepEqual(validateTime("00:00"), { ok: true, value: "00:00" });
  assert.deepEqual(validateTime("23:59"), { ok: true, value: "23:59" });
  assert.deepEqual(validateTime("24:00"), { ok: false, error: "invalid-time" });
  assert.deepEqual(validateTime("09:60"), { ok: false, error: "invalid-time" });
  assert.deepEqual(validateTime("9:00"), { ok: false, error: "invalid-time" });
  assert.deepEqual(validateTime("09:00:00"), { ok: false, error: "invalid-time" });
  assert.deepEqual(validateTime(""), { ok: false, error: "invalid-time" });
});

test("unknown source zone is refused", () => {
  assert.deepEqual(
    resolveSource({ date: "2026-01-15", time: "09:00", zone: "Mars/Olympus" }),
    { ok: false, error: "unknown-zone" },
  );
});

test("target cap: 20 accepted, 21st refused; duplicates refused by name", () => {
  const twenty = ZONES.slice(0, MAX_TARGETS);
  assert.equal(validateTargets(twenty).ok, true);
  assert.equal(
    convert({ date: "2026-01-15", time: "09:00", zone: "Asia/Taipei", targets: twenty }).rows.length,
    20,
  );
  assert.deepEqual(validateTargets(ZONES.slice(0, 21)), {
    ok: false,
    error: "too-many-targets",
  });
  assert.deepEqual(validateTargets(["Asia/Tokyo", "Asia/Tokyo"]), {
    ok: false,
    error: "duplicate-target",
    zone: "Asia/Tokyo",
  });
  assert.deepEqual(validateTargets(["Asia/Tokyo", "Nowhere/Special"]), {
    ok: false,
    error: "unknown-zone",
    zone: "Nowhere/Special",
  });
  // add-target decisions used by the UI
  assert.deepEqual(checkAddTarget(twenty, "Africa/Cairo"), {
    ok: false,
    error: "too-many-targets",
    zone: "Africa/Cairo",
  });
  assert.deepEqual(checkAddTarget(["Asia/Tokyo"], "Asia/Tokyo"), {
    ok: false,
    error: "duplicate-target",
    zone: "Asia/Tokyo",
  });
  assert.deepEqual(checkAddTarget(["Asia/Tokyo"], "Asia/Seoul"), { ok: true });
});

test("empty target list converts with zero rows (the UI shows its prompt)", () => {
  const result = convert({
    date: "2026-01-15",
    time: "09:00",
    zone: "Asia/Taipei",
    targets: [],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.rows, []);
  assert.deepEqual(result.utc, { date: "2026-01-15", time: "01:00" });
});
