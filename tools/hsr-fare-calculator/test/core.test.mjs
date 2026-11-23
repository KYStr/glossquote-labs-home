// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-hsr-fare-calculator-20261121, draft spec PR #389, registry rev
// 1792 per the parent task, SHA-256
// c8890da6bd89bd1ce4f49775e0e220cbea80dc4cd3020ed3cb452a09903514a9).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned literal tables and the pinned discount rule
// (5 * floor(full fare * rate / 5)) by hand, never from the
// implementation's output. The three full-fare tables were also
// cross-checked cell by cell against the SPEC's markdown tables with
// an independent one-off parse (132 pairs x 3 cabins, 0 mismatches);
// the shipped structural tests below pin the tables' invariants
// (multiples, ordering, monotonicity, exactly three business
// not-sold pairs).

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { cabinFares, run } from "../public/js/core/hsr-fare.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-hsr-fare-calculator-20261121");
assert.equal(coreCases.length, 17);

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

const BASE = {
  cabin: "standard",
  destination: "ZUY",
  fareKind: "full",
  origin: "TPE",
  quantity: "1",
};

function expectFare(input, singleFare, totalFare) {
  const actual = run(input);
  assert.equal(actual.ok, true, JSON.stringify(input));
  assert.equal(actual.result.singleFare, singleFare, JSON.stringify(input));
  assert.equal(actual.result.totalFare, totalFare, JSON.stringify(input));
}

test("hand-derived discounts: every fare kind on pinned full fares", () => {
  // TPE-TAC standard full fare 700 (SPEC table).
  expectFare({ ...BASE, destination: "TAC", fareKind: "earlyBird80" }, 560, 560);
  expectFare({ ...BASE, destination: "TAC", fareKind: "earlyBird90" }, 630, 630);
  expectFare({ ...BASE, destination: "TAC", fareKind: "student50" }, 350, 350);
  expectFare({ ...BASE, destination: "TAC", fareKind: "student75" }, 525, 525);
  // NAG-ZUY standard full fare 1530: 1224 -> 1220, 1377 -> 1375,
  // 765 exact, 1147.5 -> 1145, 1346.4 -> 1345.
  expectFare({ ...BASE, origin: "NAG", fareKind: "earlyBird80" }, 1220, 1220);
  expectFare({ ...BASE, origin: "NAG", fareKind: "earlyBird90" }, 1375, 1375);
  expectFare({ ...BASE, origin: "NAG", fareKind: "student50" }, 765, 765);
  expectFare({ ...BASE, origin: "NAG", fareKind: "student75" }, 1145, 1145);
  expectFare({ ...BASE, origin: "NAG", fareKind: "student88" }, 1345, 1345);
  // SPEC's own worked example: a non-reserved full fare of 35 gives
  // a concession fare of 15, not 17.5 and not 20.
  expectFare(
    { ...BASE, origin: "NAG", destination: "TPE", cabin: "nonreserved", fareKind: "concession" },
    15,
    15,
  );
  // Non-reserved 1445 half is 722.5 -> 720.
  expectFare(
    { ...BASE, cabin: "nonreserved", fareKind: "concession" },
    720,
    720,
  );
  // Business 1250 half is 625, exact.
  expectFare(
    { ...BASE, destination: "TAC", cabin: "business", fareKind: "concession" },
    625,
    625,
  );
  // Quantity 10 multiplies the single fare.
  expectFare({ ...BASE, origin: "NAG", quantity: "10" }, 1530, 15300);
});

test("direction and distance: the SPEC's adjacent-station distances", () => {
  // Adjacent km gaps from the SPEC's station table, north to south.
  const gaps = [5.9, 7.2, 29.2, 29.9, 32.7, 60.8, 28.2, 24.6, 33.1, 62.3, 31.3];
  const codes = ["NAG", "TPE", "BAQ", "TAY", "HSC", "MIL", "TAC", "CHH", "YUL", "CHY", "TAN", "ZUY"];
  for (let index = 0; index < gaps.length; index += 1) {
    const south = run({ ...BASE, origin: codes[index], destination: codes[index + 1] });
    assert.equal(south.ok, true);
    assert.equal(south.result.direction, "southbound");
    assert.equal(south.result.distanceKm, gaps[index]);
    const north = run({ ...BASE, origin: codes[index + 1], destination: codes[index] });
    assert.equal(north.ok, true);
    assert.equal(north.result.direction, "northbound");
    assert.equal(north.result.distanceKm, gaps[index]);
    assert.equal(north.result.baseFare, south.result.baseFare);
  }
  const longest = run({ ...BASE, origin: "NAG", destination: "ZUY" });
  assert.equal(longest.result.distanceKm, 345.2);
  assert.equal(longest.result.direction, "southbound");
});

test("quantity endpoints: 1 and 10 pass; 0 and 11 are RANGE", () => {
  assert.equal(run({ ...BASE, quantity: "1" }).ok, true);
  assert.equal(run({ ...BASE, quantity: "10" }).ok, true);
  assert.deepEqual(run({ ...BASE, quantity: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "quantity", row: null },
  });
  assert.deepEqual(run({ ...BASE, quantity: "11" }), {
    ok: false,
    error: { code: "RANGE", field: "quantity", row: null },
  });
});

test("quantity grammar: ASCII decimal integers only, zero or non-zero leading", () => {
  for (const bad of ["1.0", "+1", "-1", " 1", "1 ", "01", "00", "1e1", "１"]) {
    assert.deepEqual(run({ ...BASE, quantity: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "quantity", row: null },
    });
  }
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // Quantity raw is at most 8 units (SPEC-pinned).
  assert.deepEqual(run({ ...BASE, quantity: "123456789" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "quantity", row: null },
  });
  // Eight units pass capacity, parse, then fail the 1-10 range.
  assert.deepEqual(run({ ...BASE, quantity: "12345678" }), {
    ok: false,
    error: { code: "RANGE", field: "quantity", row: null },
  });
  // A 17-unit enum value exceeds the shared enum capacity of 16.
  assert.deepEqual(run({ ...BASE, origin: "TPEXXXXXXXXXXXXXX" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "origin", row: null },
  });
});

test("lone surrogates are UNICODE", () => {
  assert.deepEqual(run({ ...BASE, quantity: "1\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "quantity", row: null },
  });
  assert.deepEqual(run({ ...BASE, origin: "TP\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "origin", row: null },
  });
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ ...BASE, origin: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "origin", row: null },
  });
  assert.deepEqual(run({ ...BASE, quantity: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "quantity", row: null },
  });
});

test("enum values are case-sensitive and reject names", () => {
  for (const bad of ["tpe", "台北", "Taipei", "XXX", ""]) {
    const expected =
      bad === ""
        ? { code: "EMPTY", field: "origin", row: null }
        : { code: "INVALID_VALUE", field: "origin", row: null };
    assert.deepEqual(run({ ...BASE, origin: bad }), { ok: false, error: expected });
  }
  assert.deepEqual(run({ ...BASE, cabin: "luxury" }), {
    ok: false,
    error: { code: "INVALID_VALUE", field: "cabin", row: null },
  });
  assert.deepEqual(run({ ...BASE, fareKind: "earlyBird70" }), {
    ok: false,
    error: { code: "INVALID_VALUE", field: "fareKind", row: null },
  });
});

test("field order: origin, destination, cabin, fareKind, quantity", () => {
  assert.deepEqual(run({ ...BASE, origin: "", destination: "XXX" }), {
    ok: false,
    error: { code: "EMPTY", field: "origin", row: null },
  });
  assert.deepEqual(run({ ...BASE, origin: "XXX", destination: "" }), {
    ok: false,
    error: { code: "INVALID_VALUE", field: "origin", row: null },
  });
  assert.deepEqual(run({ ...BASE, destination: "XXX", cabin: "luxury" }), {
    ok: false,
    error: { code: "INVALID_VALUE", field: "destination", row: null },
  });
  assert.deepEqual(run({ ...BASE, cabin: "luxury", fareKind: "nope" }), {
    ok: false,
    error: { code: "INVALID_VALUE", field: "cabin", row: null },
  });
  assert.deepEqual(run({ ...BASE, fareKind: "nope", quantity: "11" }), {
    ok: false,
    error: { code: "INVALID_VALUE", field: "fareKind", row: null },
  });
  // A per-field failure precedes every cross-field check.
  assert.deepEqual(run({ ...BASE, origin: "TPE", destination: "TPE", quantity: "11" }), {
    ok: false,
    error: { code: "RANGE", field: "quantity", row: null },
  });
});

test("cross-field order: SAME_STATION, then CABIN_NOT_SOLD, then FARE_CABIN_MISMATCH", () => {
  // Same station beats the business-not-sold rule on the same pair.
  assert.deepEqual(run({ ...BASE, origin: "TPE", destination: "TPE", cabin: "business" }), {
    ok: false,
    error: { code: "SAME_STATION", field: "destination", row: null },
  });
  // Business-not-sold beats the fare/cabin mismatch on the same pair.
  assert.deepEqual(
    run({ ...BASE, origin: "TPE", destination: "BAQ", cabin: "business", fareKind: "earlyBird65" }),
    {
      ok: false,
      error: { code: "CABIN_NOT_SOLD", field: "cabin", row: null },
    },
  );
  // All three short pairs refuse business class.
  for (const [origin, destination] of [
    ["NAG", "TPE"],
    ["NAG", "BAQ"],
    ["TPE", "BAQ"],
  ]) {
    assert.deepEqual(run({ ...BASE, origin, destination, cabin: "business" }), {
      ok: false,
      error: { code: "CABIN_NOT_SOLD", field: "cabin", row: null },
    });
  }
  // Early Bird and student discounts refuse business and non-reserved.
  for (const cabin of ["business", "nonreserved"]) {
    for (const fareKind of ["earlyBird65", "earlyBird80", "earlyBird90", "student50", "student75", "student88"]) {
      assert.deepEqual(run({ ...BASE, cabin, fareKind }), {
        ok: false,
        error: { code: "FARE_CABIN_MISMATCH", field: "fareKind", row: null },
      });
    }
  }
  // Concession is allowed on every cabin, including business.
  assert.equal(run({ ...BASE, cabin: "business", fareKind: "concession" }).ok, true);
  assert.equal(run({ ...BASE, cabin: "nonreserved", fareKind: "concession" }).ok, true);
});

test("fare-table invariants over all 66 pairs", () => {
  const codes = ["NAG", "TPE", "BAQ", "TAY", "HSC", "MIL", "TAC", "CHH", "YUL", "CHY", "TAN", "ZUY"];
  let notSold = 0;
  for (let i = 0; i < codes.length; i += 1) {
    // Fares from one origin strictly increase with distance.
    let previous = 0;
    for (let j = i + 1; j < codes.length; j += 1) {
      const fares = cabinFares(codes[i], codes[j]);
      assert.ok(fares.standard % 10 === 0, `${codes[i]}-${codes[j]} standard`);
      assert.ok(fares.nonreserved % 5 === 0, `${codes[i]}-${codes[j]} nonreserved`);
      assert.ok(fares.nonreserved < fares.standard, `${codes[i]}-${codes[j]} order`);
      assert.ok(fares.standard > previous, `${codes[i]}-${codes[j]} monotonic`);
      previous = fares.standard;
      if (fares.business === null) {
        notSold += 1;
      } else {
        assert.ok(fares.business % 10 === 0, `${codes[i]}-${codes[j]} business`);
        assert.ok(fares.business > fares.standard, `${codes[i]}-${codes[j]} business order`);
      }
    }
  }
  assert.equal(notSold, 3);
});

test("every discounted fare is a multiple of 5 and never above its full fare", () => {
  const codes = ["NAG", "TPE", "BAQ", "TAY", "HSC", "MIL", "TAC", "CHH", "YUL", "CHY", "TAN", "ZUY"];
  const discounted = ["concession", "earlyBird65", "earlyBird80", "earlyBird90", "student50", "student75", "student88"];
  for (let i = 0; i < codes.length; i += 1) {
    for (let j = i + 1; j < codes.length; j += 1) {
      for (const cabin of ["standard", "nonreserved"]) {
        const full = run({ ...BASE, origin: codes[i], destination: codes[j], cabin });
        assert.equal(full.ok, true);
        // Early Bird / student discounts are standard-only; only the
        // concession discount applies on non-reserved seats.
        const kinds =
          cabin === "standard" ? discounted : ["concession"];
        for (const fareKind of kinds) {
          const priced = run({ ...BASE, origin: codes[i], destination: codes[j], cabin, fareKind });
          assert.equal(priced.ok, true);
          assert.equal(priced.result.singleFare % 5, 0);
          assert.ok(priced.result.singleFare <= full.result.baseFare);
        }
      }
    }
  }
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("TPE"), schema);
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  const { quantity, ...missing } = BASE;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...BASE, quantity: 1 }), schema);
  assert.deepEqual(run({ ...BASE, origin: null }), schema);
  const withAccessor = { ...BASE };
  Object.defineProperty(withAccessor, "origin", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/hsr-fare.mjs", import.meta.url));
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
