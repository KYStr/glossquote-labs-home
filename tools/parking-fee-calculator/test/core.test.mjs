// Core tests. The 12 literal core cases are vendored verbatim in
// test/fixtures.json from the fixed spec candidate
// 29b703e0a23ea6e5c56d702a746686467892d01f (spec-parking-fee-calculator-20261109);
// expected values come from that file, never from the implementation.
// Additional boundary expectations below were computed by hand from the
// pinned SPEC rules.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run } from "../public/js/core/parking.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);

for (const c of fixtures.cases) {
  if (c.kind !== "core") continue;
  test("fixture " + c.id, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

const BASE = {
  entry: "2026-11-09T09:00",
  exit: "2026-11-09T11:10",
  graceMinutes: "15",
  firstPeriodMinutes: "60",
  firstPrice: "40",
  nextPeriodMinutes: "30",
  nextPrice: "20",
  dailyCap: "200",
  lostTicketFee: "1000",
  lostTicket: false
};
const with_ = (patch) => ({ ...BASE, ...patch });

test("2028-02-29 is a real day (leap year)", () => {
  const out = run(with_({ entry: "2028-02-29T10:00", exit: "2028-02-29T11:00" }));
  assert.deepEqual(out, {
    ok: true,
    result: {
      lostTicketApplied: false,
      graceApplied: false,
      totalMinutes: 60,
      days: [
        { date: "2028-02-29", minutes: 60, firstPeriods: 1, nextPeriods: 0, rawFee: 40, capped: false, fee: 40 }
      ],
      totalFee: 40
    }
  });
});

test("2026-02-29 does not exist", () => {
  assert.deepEqual(run(with_({ entry: "2026-02-29T10:00" })), {
    ok: false,
    error: { code: "DATETIME_FORMAT", field: "entry", row: null }
  });
});

test("exactly 30 days (43200 minutes) is allowed and capped per day", () => {
  const out = run(with_({ entry: "2026-11-01T00:00", exit: "2026-12-01T00:00" }));
  assert.equal(out.ok, true);
  assert.equal(out.result.totalMinutes, 43200);
  assert.equal(out.result.days.length, 30);
  assert.equal(out.result.totalFee, 6000);
  assert.ok(out.result.days.every((d) => d.minutes === 1440 && d.fee === 200 && d.capped));
});

test("43201 minutes exceeds the 30-day limit", () => {
  assert.deepEqual(run(with_({ entry: "2026-11-01T00:00", exit: "2026-12-01T00:01" })), {
    ok: false,
    error: { code: "RANGE", field: "exit", row: null }
  });
});

test("rawFee exactly equal to the cap is not capped", () => {
  const out = run(with_({ exit: "2026-11-09T14:00" })); // 300 min -> rawFee 200
  assert.equal(out.ok, true);
  assert.equal(out.result.days[0].rawFee, 200);
  assert.equal(out.result.days[0].capped, false);
  assert.equal(out.result.totalFee, 200);
});

test("dailyCap 0 means no cap across days", () => {
  const out = run(with_({ dailyCap: "0", entry: "2026-11-09T08:00", exit: "2026-11-10T08:00" }));
  assert.deepEqual(out, {
    ok: true,
    result: {
      lostTicketApplied: false,
      graceApplied: false,
      totalMinutes: 1440,
      days: [
        { date: "2026-11-09", minutes: 960, firstPeriods: 1, nextPeriods: 30, rawFee: 640, capped: false, fee: 640 },
        { date: "2026-11-10", minutes: 480, firstPeriods: 1, nextPeriods: 14, rawFee: 320, capped: false, fee: 320 }
      ],
      totalFee: 960
    }
  });
});

test("graceMinutes 0 bills a one-minute stay", () => {
  const out = run(with_({ graceMinutes: "0", exit: "2026-11-09T09:01" }));
  assert.equal(out.ok, true);
  assert.equal(out.result.graceApplied, false);
  assert.equal(out.result.totalFee, 40);
});

test("zero prices produce zero fees without grace", () => {
  const out = run(with_({ firstPrice: "0", nextPrice: "0" }));
  assert.equal(out.ok, true);
  assert.equal(out.result.graceApplied, false);
  assert.equal(out.result.days[0].rawFee, 0);
  assert.equal(out.result.totalFee, 0);
});

test("lost ticket still enforces ORDER", () => {
  assert.deepEqual(
    run(with_({ lostTicket: true, entry: "2026-11-09T10:00", exit: "2026-11-09T09:00" })),
    { ok: false, error: { code: "ORDER", field: "exit", row: null } }
  );
});

test("exit equal to entry is ORDER", () => {
  assert.deepEqual(run(with_({ exit: "2026-11-09T09:00" })), {
    ok: false,
    error: { code: "ORDER", field: "exit", row: null }
  });
});

test("schema failures: extra, missing, wrong types, accessor, array, null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  const missing = { ...BASE };
  delete missing.dailyCap;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run(with_({ graceMinutes: 15 })), schema);
  assert.deepEqual(run(with_({ lostTicket: "true" })), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run(null), schema);
  const withGetter = { ...BASE };
  Object.defineProperty(withGetter, "entry", {
    enumerable: true,
    get() {
      return "2026-11-09T09:00";
    }
  });
  assert.deepEqual(run(withGetter), schema);
});

test("lone surrogate is UNICODE", () => {
  assert.deepEqual(run(with_({ entry: "2026-11-09T09:0\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "entry", row: null }
  });
  assert.deepEqual(run(with_({ graceMinutes: "1\uD800" })), {
    ok: false,
    error: { code: "UNICODE", field: "graceMinutes", row: null }
  });
});

test("numeric grammar, limit, empty and range order", () => {
  assert.deepEqual(run(with_({ graceMinutes: "123456789" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "graceMinutes", row: null }
  });
  assert.deepEqual(run(with_({ graceMinutes: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "graceMinutes", row: null }
  });
  for (const bad of ["007", " 15", "-5", "1.0", "+5"]) {
    assert.deepEqual(run(with_({ graceMinutes: bad })), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "graceMinutes", row: null }
    });
  }
  assert.deepEqual(run(with_({ graceMinutes: "1441" })), {
    ok: false,
    error: { code: "RANGE", field: "graceMinutes", row: null }
  });
  assert.deepEqual(run(with_({ firstPeriodMinutes: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "firstPeriodMinutes", row: null }
  });
  assert.deepEqual(run(with_({ firstPrice: "1000000" })), {
    ok: false,
    error: { code: "RANGE", field: "firstPrice", row: null }
  });
});

test("field order: entry error beats later fields; per-field beats ORDER", () => {
  assert.deepEqual(run(with_({ entry: "2026-02-30T10:00", nextPrice: "20.5" })), {
    ok: false,
    error: { code: "DATETIME_FORMAT", field: "entry", row: null }
  });
  assert.deepEqual(
    run(with_({ entry: "2026-11-09T10:00", exit: "2026-11-09T09:00", nextPrice: "20.5" })),
    { ok: false, error: { code: "INTEGER_FORMAT", field: "nextPrice", row: null } }
  );
});

test("year outside 2000-2100 is DATETIME_FORMAT", () => {
  assert.deepEqual(run(with_({ entry: "1999-12-31T23:00" })), {
    ok: false,
    error: { code: "DATETIME_FORMAT", field: "entry", row: null }
  });
});

test("day minutes and fees sum to totals in fixture success cases", () => {
  for (const c of fixtures.cases) {
    if (c.kind !== "core" || c.expected.ok !== true) continue;
    const r = c.expected.result;
    if (r.lostTicketApplied) continue;
    assert.equal(
      r.days.reduce((a, d) => a + d.minutes, 0),
      r.totalMinutes,
      c.id + " minutes sum"
    );
    assert.equal(
      r.days.reduce((a, d) => a + d.fee, 0),
      r.totalFee,
      c.id + " fee sum"
    );
  }
});
