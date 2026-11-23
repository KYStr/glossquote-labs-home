// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from
// docs/specs/generator-size-calculator) plus cases derived by hand from
// the SPEC rules and checked against an independent exact-rational
// recomputation — never from the core's own output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PRESETS, run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

function one(name, runningWatts, startingWatts) {
  return { appliances: [{ name, runningWatts, startingWatts }] };
}

test("boundary: range endpoints are legal", () => {
  assert.deepEqual(run(one("A", "1", "1")), {
    ok: true,
    result: {
      rows: [{ name: "A", runningWatts: 1, startingWatts: 1, surgeExtraW: 0 }],
      totalRunningW: 1,
      maxSurgeExtraW: 0,
      peakW: 1,
      largestSurgeRow: null,
      requiredRunningW: 2,
      requiredKva: "0.1",
      peakKva: "0.1",
      recommendedKva: "0.1",
      recommendedSizeKva: "1.0",
      oversize: false,
    },
  });
  assert.deepEqual(run(one("A", "20000", "30000")), {
    ok: true,
    result: {
      rows: [{ name: "A", runningWatts: 20000, startingWatts: 30000, surgeExtraW: 10000 }],
      totalRunningW: 20000,
      maxSurgeExtraW: 10000,
      peakW: 30000,
      largestSurgeRow: "A",
      requiredRunningW: 25000,
      requiredKva: "31.3",
      peakKva: "37.5",
      recommendedKva: "37.5",
      recommendedSizeKva: "37.5",
      oversize: true,
    },
  });
});

test("boundary: just outside the range is RANGE on the right field", () => {
  assert.deepEqual(run(one("A", "20001", "30000")), {
    ok: false,
    error: { code: "RANGE", field: "runningWatts", row: 1 },
  });
  assert.deepEqual(run(one("A", "20000", "30001")), {
    ok: false,
    error: { code: "RANGE", field: "startingWatts", row: 1 },
  });
  // Starting 0 fails the starting range before any cross-field check.
  assert.deepEqual(run(one("A", "1", "0")), {
    ok: false,
    error: { code: "RANGE", field: "startingWatts", row: 1 },
  });
});

test("boundary: recommended kVA exactly 20.0 stays on the table", () => {
  // Total 12800 -> required 16000 -> ceil(16000/80) = 200 tenths = 20.0.
  assert.deepEqual(run(one("A", "12800", "12800")), {
    ok: true,
    result: {
      rows: [{ name: "A", runningWatts: 12800, startingWatts: 12800, surgeExtraW: 0 }],
      totalRunningW: 12800,
      maxSurgeExtraW: 0,
      peakW: 12800,
      largestSurgeRow: null,
      requiredRunningW: 16000,
      requiredKva: "20.0",
      peakKva: "16.0",
      recommendedKva: "20.0",
      recommendedSizeKva: "20.0",
      oversize: false,
    },
  });
});

test("boundary: 20.1 kVA is oversize and rounds up to a 0.5 step", () => {
  // Total 12801 -> required 16002 -> 201 tenths = 20.1 -> size 20.5.
  const { result } = run(one("A", "12801", "12801"));
  assert.equal(result.requiredKva, "20.1");
  assert.equal(result.peakKva, "16.1");
  assert.equal(result.recommendedKva, "20.1");
  assert.equal(result.recommendedSizeKva, "20.5");
  assert.equal(result.oversize, true);
  // 20.3 -> 20.5 as well (total 12992 -> required 16240 -> 203 tenths).
  const again = run(one("A", "12992", "12992")).result;
  assert.equal(again.recommendedKva, "20.3");
  assert.equal(again.recommendedSizeKva, "20.5");
  assert.equal(again.oversize, true);
});

test("boundary: exact tenth is not pushed up", () => {
  // Total 640 -> required 800 -> ceil(800/80) = 10 tenths exactly.
  const { result } = run(one("A", "640", "640"));
  assert.equal(result.requiredKva, "1.0");
  assert.equal(result.peakKva, "0.8");
  assert.equal(result.recommendedKva, "1.0");
  assert.equal(result.recommendedSizeKva, "1.0");
});

test("boundary: 12 rows are legal and add up", () => {
  const input = {
    appliances: Array.from({ length: 12 }, (_, i) => ({
      name: `L${i + 1}`,
      runningWatts: "100",
      startingWatts: "100",
    })),
  };
  const { result } = run(input);
  assert.equal(result.totalRunningW, 1200);
  assert.equal(result.maxSurgeExtraW, 0);
  assert.equal(result.peakW, 1200);
  assert.equal(result.largestSurgeRow, null);
  assert.equal(result.requiredRunningW, 1500);
  assert.equal(result.requiredKva, "1.9");
  assert.equal(result.peakKva, "1.5");
  assert.equal(result.recommendedKva, "1.9");
  assert.equal(result.recommendedSizeKva, "2.0");
  assert.equal(result.oversize, false);
  assert.equal(result.rows.length, 12);
});

test("grammar: valid and invalid integer shapes", () => {
  assert.equal(run(one("A", "100", "100")).ok, true);
  assert.equal(run(one("A", "0", "100")).ok, false); // grammar-valid 0, RANGE
  for (const bad of ["007", "00", " 100", "100 ", "100.0", "100.5", "+100", "-100", "1e3", "1,000", "10%", "0x10", "１２３"]) {
    assert.deepEqual(
      run(one("A", bad, "100")),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "runningWatts", row: 1 } },
      `expected INTEGER_FORMAT for ${JSON.stringify(bad)}`
    );
  }
});

test("capacity and empty: INPUT_LIMIT beats grammar and range", () => {
  assert.deepEqual(run(one("A", "123456789", "100")), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "runningWatts", row: 1 },
  });
  // Exactly 8 characters is legal capacity-wise (value still range-checked).
  assert.deepEqual(run(one("A", "20000000", "20000000")), {
    ok: false,
    error: { code: "RANGE", field: "runningWatts", row: 1 },
  });
  assert.deepEqual(run(one("A", "", "100")), {
    ok: false,
    error: { code: "EMPTY", field: "runningWatts", row: 1 },
  });
  assert.deepEqual(run(one("", "100", "100")), {
    ok: false,
    error: { code: "EMPTY", field: "name", row: 1 },
  });
  assert.deepEqual(run(one("   ", "100", "100")), {
    ok: false,
    error: { code: "EMPTY", field: "name", row: 1 },
  });
  // A 41-character name is INPUT_LIMIT, even when it is all spaces.
  assert.deepEqual(run(one(" ".repeat(41), "100", "100")), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "name", row: 1 },
  });
  // Exactly 40 characters is a legal name.
  assert.equal(run(one("a".repeat(40), "100", "100")).ok, true);
});

test("unicode: control chars and lone surrogates are UNICODE", () => {
  assert.deepEqual(run(one("a\u0007b", "100", "100")), {
    ok: false,
    error: { code: "UNICODE", field: "name", row: 1 },
  });
  assert.deepEqual(run(one("\uD800", "100", "100")), {
    ok: false,
    error: { code: "UNICODE", field: "name", row: 1 },
  });
  assert.deepEqual(run(one("A", "\uD800", "100")), {
    ok: false,
    error: { code: "UNICODE", field: "runningWatts", row: 1 },
  });
  // Capacity still beats surrogate: 9 units with a lone surrogate first.
  assert.deepEqual(run(one("A", "\uD800" + "12345678", "100")), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "runningWatts", row: 1 },
  });
  // A paired surrogate is a legal name character.
  assert.equal(run(one("A\uD83D\uDE00", "100", "100")).ok, true);
});

test("first error wins: row order, then field order within a row", () => {
  assert.deepEqual(
    run({
      appliances: [
        { name: "A", runningWatts: "100", startingWatts: "100" },
        { name: "B", runningWatts: "abc", startingWatts: "xyz" },
      ],
    }),
    { ok: false, error: { code: "INTEGER_FORMAT", field: "runningWatts", row: 2 } }
  );
  // Name is checked before the watts fields of the same row.
  assert.deepEqual(run(one("", "abc", "xyz")), {
    ok: false,
    error: { code: "EMPTY", field: "name", row: 1 },
  });
});

test("duplicates: later row is the error; comparison is exact and case-sensitive", () => {
  assert.deepEqual(
    run({
      appliances: [
        { name: "Lamp", runningWatts: "100", startingWatts: "100" },
        { name: "Lamp", runningWatts: "200", startingWatts: "200" },
      ],
    }),
    { ok: false, error: { code: "DUPLICATE_NAME", field: "name", row: 2 } }
  );
  // "Lamp" and "lamp" are different names; leading/trailing spaces count.
  assert.equal(
    run({
      appliances: [
        { name: "Lamp", runningWatts: "100", startingWatts: "100" },
        { name: "lamp", runningWatts: "100", startingWatts: "100" },
        { name: " Lamp", runningWatts: "100", startingWatts: "100" },
      ],
    }).ok,
    true
  );
  // Duplicate check (step 4) runs before the cross-field check (step 5).
  assert.deepEqual(
    run({
      appliances: [
        { name: "A", runningWatts: "100", startingWatts: "50" },
        { name: "A", runningWatts: "100", startingWatts: "50" },
      ],
    }),
    { ok: false, error: { code: "DUPLICATE_NAME", field: "name", row: 2 } }
  );
});

test("cross-field: starting below running is RANGE on the later row", () => {
  assert.deepEqual(
    run({
      appliances: [
        { name: "A", runningWatts: "100", startingWatts: "100" },
        { name: "B", runningWatts: "200", startingWatts: "150" },
      ],
    }),
    { ok: false, error: { code: "RANGE", field: "startingWatts", row: 2 } }
  );
});

test("schema: wrong types, missing/extra fields, accessors, non-object rows", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run("x"), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run({}), schema);
  assert.deepEqual(run({ appliances: "x" }), schema);
  assert.deepEqual(run({ appliances: [{ name: "A", runningWatts: "100" }] }), schema);
  assert.deepEqual(
    run({ appliances: [{ name: "A", runningWatts: "100", startingWatts: "100", extra: "1" }] }),
    schema
  );
  assert.deepEqual(run({ appliances: [{ name: "A", runningWatts: 100, startingWatts: "100" }] }), schema);
  assert.deepEqual(run({ appliances: [null] }), schema);
  assert.deepEqual(run({ appliances: ["A"] }), schema);
  assert.deepEqual(run({ appliances: [{ name: "A", runningWatts: "100", startingWatts: "100" }], extra: 1 }), schema);
  const withGetter = { appliances: [{ name: "A", runningWatts: "100", startingWatts: "100" }] };
  Object.defineProperty(withGetter, "appliances", {
    enumerable: true,
    get() {
      return [{ name: "A", runningWatts: "100", startingWatts: "100" }];
    },
  });
  assert.deepEqual(run(withGetter), schema);
  const rowGetter = {};
  Object.defineProperty(rowGetter, "name", { enumerable: true, get: () => "A" });
  rowGetter.runningWatts = "100";
  rowGetter.startingWatts = "100";
  assert.deepEqual(run({ appliances: [rowGetter] }), schema);
});

test("presets: exactly the 12 Honda values from the SPEC", () => {
  assert.equal(PRESETS.length, 12);
  const byId = new Map(PRESETS.map((p) => [p.id, p]));
  const expected = {
    refrigerator: ["192", "1200"],
    microwave: ["1500", "1500"],
    "furnace-fan": ["700", "1400"],
    "sump-pump-1-3": ["800", "1300"],
    "sump-pump-1-2": ["1050", "2150"],
    "window-ac": ["1500", "2200"],
    dryer: ["5400", "6750"],
    "water-heater": ["4500", "4500"],
    washer: ["1200", "1200"],
    tv: ["190", "190"],
    laptop: ["250", "250"],
    "coffee-maker": ["600", "600"],
  };
  for (const [id, [runningWatts, startingWatts]] of Object.entries(expected)) {
    assert.equal(byId.get(id).runningWatts, runningWatts, id);
    assert.equal(byId.get(id).startingWatts, startingWatts, id);
  }
});

test("invariants: kVA strings are one decimal, ceiled, and the size covers the recommendation", () => {
  const inputs = [
    one("A", "60", "60"),
    one("A", "482", "1490"),
    one("A", "1000", "2320"),
    one("A", "17292", "18642"),
    one("A", "12801", "12801"),
    {
      appliances: [
        { name: "Dryer", runningWatts: "5400", startingWatts: "6750" },
        { name: "Fridge", runningWatts: "192", startingWatts: "1200" },
      ],
    },
  ];
  const tenths = (s) => {
    const [a, b] = s.split(".");
    return Number(a) * 10 + Number(b);
  };
  for (const input of inputs) {
    const { result } = run(input);
    for (const key of ["requiredKva", "peakKva", "recommendedKva", "recommendedSizeKva"]) {
      assert.match(result[key], /^\d+\.\d$/, `${key} must be exactly one decimal`);
    }
    // Ceil property: (t-1)*80 < W <= t*80 for each kVA figure.
    assert.ok((tenths(result.requiredKva) - 1) * 80 < result.requiredRunningW);
    assert.ok(tenths(result.requiredKva) * 80 >= result.requiredRunningW);
    assert.ok((tenths(result.peakKva) - 1) * 80 < result.peakW);
    assert.ok(tenths(result.peakKva) * 80 >= result.peakW);
    // Size covers the recommendation; oversize sizes are 0.5 multiples.
    assert.ok(tenths(result.recommendedSizeKva) >= tenths(result.recommendedKva));
    if (result.oversize) {
      assert.equal(tenths(result.recommendedSizeKva) % 5, 0);
      assert.ok(tenths(result.recommendedKva) > 200);
    } else {
      assert.ok(tenths(result.recommendedKva) <= 200);
    }
    // Rows echo the input order and the surge is starting minus running.
    assert.equal(result.rows.length, input.appliances.length);
    result.rows.forEach((row, i) => {
      assert.equal(row.name, input.appliances[i].name);
      assert.equal(row.surgeExtraW, row.startingWatts - row.runningWatts);
    });
    assert.equal(result.peakW, result.totalRunningW + result.maxSurgeExtraW);
  }
});
