// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-barbell-plate-calculator-20261121, spec candidate commit
// f7c0d421cc5047de101383f241f6e0faa4fbe638, draft spec PR #373,
// SHA-256
// 8c2ac601ad73b38f573fabdf99c3d18095b70674cda28e04bd6c74ed01d323fd).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §inputsOutputs rules by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { formatKg, run } from "../public/js/core/barbell-plate-calculator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-barbell-plate-calculator-20261121");
assert.equal(coreCases.length, 14);

const BASE = {
  targetKg: "100",
  barKg: "20",
  pairs25: "2",
  pairs20: "2",
  pairs15: "2",
  pairs10: "2",
  pairs5: "2",
  pairs2_5: "2",
  pairs1_25: "2",
};

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

// Independent re-derivation of the greedy result, written separately
// from the implementation: integer 0.125 kg units, plates largest
// first, capped by the pairs on hand.
const PLATE_UNITS = [200, 160, 120, 80, 40, 20, 10];
const PLATE_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

function expectedGreedy(targetKg, barKg, pairs) {
  const targetUnits = Math.round(targetKg * 8);
  const barUnits = Math.round(barKg * 8);
  const perSideUnits = (targetUnits - barUnits) / 2;
  let remaining = perSideUnits;
  const plates = [];
  let count = 0;
  const spare = [];
  for (let index = 0; index < PLATE_UNITS.length; index += 1) {
    const take = Math.min(pairs[index], Math.floor(remaining / PLATE_UNITS[index]));
    remaining -= take * PLATE_UNITS[index];
    count += take;
    spare.push(pairs[index] - take);
    if (take > 0) plates.push({ plateKg: PLATE_KG[index], count: take });
  }
  const loaded = perSideUnits - remaining;
  const achievedUnits = barUnits + 2 * loaded;
  let nextUpKg = null;
  if (remaining !== 0) {
    for (let index = PLATE_UNITS.length - 1; index >= 0; index -= 1) {
      if (spare[index] > 0) {
        nextUpKg = (achievedUnits + 2 * PLATE_UNITS[index]) * 0.125;
        break;
      }
    }
  }
  return {
    targetKg,
    barKg,
    perSideKg: perSideUnits * 0.125,
    platesPerSide: plates,
    platesPerSideCount: count,
    loadedPerSideKg: loaded * 0.125,
    achievedKg: achievedUnits * 0.125,
    remainderPerSideKg: remaining * 0.125,
    reachable: remaining === 0,
    nextUpKg,
  };
}

test("greedy re-derivation matches run() on a hand-built grid", () => {
  const targets = [0, 20, 25, 50, 60, 87.5, 100, 100.25, 101, 140, 500];
  const bars = [0, 15, 20];
  const pairSets = [
    [2, 2, 2, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0],
    [10, 10, 10, 10, 10, 10, 10],
    [0, 1, 0, 2, 0, 1, 0],
  ];
  for (const targetKg of targets) {
    for (const barKg of bars) {
      if (targetKg < barKg) continue;
      for (const pairs of pairSets) {
        const input = {
          targetKg: String(targetKg),
          barKg: String(barKg),
          pairs25: String(pairs[0]),
          pairs20: String(pairs[1]),
          pairs15: String(pairs[2]),
          pairs10: String(pairs[3]),
          pairs5: String(pairs[4]),
          pairs2_5: String(pairs[5]),
          pairs1_25: String(pairs[6]),
        };
        const actual = run(input);
        assert.equal(actual.ok, true, JSON.stringify(input));
        assert.deepEqual(actual.result, expectedGreedy(targetKg, barKg, pairs));
      }
    }
  }
});

test("SPEC boundary pins: target==bar, target==bar+2.5, bar==0, pairs all 0, pairs 10/11, target 500/500.25, 0.25 multiple edge", () => {
  // target == bar: zero plates, reachable at the bar weight.
  assert.deepEqual(run({ ...BASE, targetKg: "20" }), {
    ok: true,
    result: {
      targetKg: 20,
      barKg: 20,
      perSideKg: 0,
      platesPerSide: [],
      platesPerSideCount: 0,
      loadedPerSideKg: 0,
      achievedKg: 20,
      remainderPerSideKg: 0,
      reachable: true,
      nextUpKg: null,
    },
  });
  // target == bar + 2.5: one 1.25 kg plate per side.
  const barPlus2p5 = run({ ...BASE, targetKg: "22.5" });
  assert.equal(barPlus2p5.ok, true);
  assert.deepEqual(barPlus2p5.result.platesPerSide, [{ plateKg: 1.25, count: 1 }]);
  assert.equal(barPlus2p5.result.achievedKg, 22.5);
  // bar == 0: the whole target is plates.
  const zeroBar = run({ ...BASE, barKg: "0", targetKg: "50" });
  assert.equal(zeroBar.ok, true);
  assert.equal(zeroBar.result.achievedKg, 50);
  // pairs all 0: nothing loads, achieved is the bar alone, no next-up.
  const noPairs = run({
    ...BASE,
    pairs25: "0",
    pairs20: "0",
    pairs15: "0",
    pairs10: "0",
    pairs5: "0",
    pairs2_5: "0",
    pairs1_25: "0",
  });
  assert.equal(noPairs.ok, true);
  assert.equal(noPairs.result.achievedKg, 20);
  assert.equal(noPairs.result.remainderPerSideKg, 40);
  assert.equal(noPairs.result.nextUpKg, null);
  // pairs cap 10 is legal; 11 is RANGE.
  assert.equal(run({ ...BASE, pairs25: "10" }).ok, true);
  assert.deepEqual(run({ ...BASE, pairs25: "11" }), {
    ok: false,
    error: { code: "RANGE", field: "pairs25", row: null },
  });
  // target 500 is legal; 500.25 is RANGE (range precedes the multiple check).
  assert.equal(run({ ...BASE, targetKg: "500" }).ok, true);
  assert.deepEqual(run({ ...BASE, targetKg: "500.25" }), {
    ok: false,
    error: { code: "RANGE", field: "targetKg", row: null },
  });
  // 0.25 kg multiple edge: 100.25 is legal, 100.1 is NOT_MULTIPLE.
  assert.equal(run({ ...BASE, targetKg: "100.25" }).ok, true);
  assert.deepEqual(run({ ...BASE, targetKg: "100.1" }), {
    ok: false,
    error: { code: "NOT_MULTIPLE", field: "targetKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, barKg: "20.1" }), {
    ok: false,
    error: { code: "NOT_MULTIPLE", field: "barKg", row: null },
  });
});

test("accepted achievedKg never exceeds targetKg, and lifting any one pairs cap cannot overshoot the target", () => {
  // The SPEC's invariant, checked over the same grid as the
  // re-derivation test, plus the cap-lifting form: raising one
  // denomination's pairs to 10 still never passes the target.
  // Note what is NOT asserted: lifting a cap can make the greedy
  // load LIGHTER (e.g. target 140, bar 15, pairs 25:1/15:2/5:1/
  // 1.25:1 loads 137.5 kg, but with pairs25 lifted to 10 the greedy
  // takes two 25 kg plates and strands the remainder, loading only
  // 127.5 kg). That is the pinned greedy algorithm's known
  // suboptimality, not a defect — the SPEC pins greedy, and the
  // invariant that holds is achievedKg <= targetKg either way.
  const pairFields = ["pairs25", "pairs20", "pairs15", "pairs10", "pairs5", "pairs2_5", "pairs1_25"];
  const targets = [0, 20, 50, 100, 100.25, 101, 140, 500];
  const bars = [0, 15, 20];
  for (const targetKg of targets) {
    for (const barKg of bars) {
      if (targetKg < barKg) continue;
      const input = {
        targetKg: String(targetKg),
        barKg: String(barKg),
        pairs25: "1",
        pairs20: "0",
        pairs15: "2",
        pairs10: "0",
        pairs5: "1",
        pairs2_5: "0",
        pairs1_25: "1",
      };
      const actual = run(input);
      assert.equal(actual.ok, true, JSON.stringify(input));
      assert.ok(actual.result.achievedKg <= targetKg, JSON.stringify(input));
      assert.ok(actual.result.loadedPerSideKg <= actual.result.perSideKg, JSON.stringify(input));
      for (const field of pairFields) {
        const lifted = run({ ...input, [field]: "10" });
        assert.equal(lifted.ok, true, JSON.stringify(lifted));
        assert.ok(lifted.result.achievedKg <= targetKg, JSON.stringify(lifted));
      }
    }
  }
});

test("nextUpKg follows the SPEC definition: smallest spare denomination, not a global minimum", () => {
  // 101 kg with all pairs at 2: remainder 0.5 kg per side, smallest
  // spare denomination is 1.25 kg, so nextUp is 102.5 kg — even
  // though no 0.5 kg plate exists in this set.
  const half = run({ ...BASE, targetKg: "101" });
  assert.equal(half.result.nextUpKg, 102.5);
  // When only 25 kg plates are spare, nextUp jumps by 2 x 25 kg:
  // target 101, bar 20 loads one 25 kg plate per side (achieved
  // 70 kg), the second 25 kg pair is spare, so nextUp is 120 kg.
  const only25 = run({
    ...BASE,
    targetKg: "101",
    pairs25: "2",
    pairs20: "0",
    pairs15: "0",
    pairs10: "0",
    pairs5: "0",
    pairs2_5: "0",
    pairs1_25: "0",
  });
  assert.equal(only25.result.nextUpKg, 120);
  // Reachable targets have no nextUp.
  assert.equal(run(BASE).result.nextUpKg, null);
});

test("kg grammar: ASCII decimals only, integer part 0 or non-zero leading, 1-2 fraction digits", () => {
  for (const bad of ["100.123", "+100", "-100", " 100", "100 ", "0100", "00", ".5", "100.", "1e2", "１００"]) {
    assert.deepEqual(run({ ...BASE, targetKg: bad }), {
      ok: false,
      error: { code: "NUMBER_FORMAT", field: "targetKg", row: null },
    });
  }
  // "0.25" passes grammar, range, and the multiple check (bar 20 is
  // then above it, so the cross-field error surfaces).
  assert.deepEqual(run({ ...BASE, targetKg: "0.25" }), {
    ok: false,
    error: { code: "TARGET_BELOW_BAR", field: "targetKg", row: null },
  });
  // "0" passes grammar but the target is below the 20 kg bar.
  assert.deepEqual(run({ ...BASE, targetKg: "0" }), {
    ok: false,
    error: { code: "TARGET_BELOW_BAR", field: "targetKg", row: null },
  });
  assert.equal(run({ ...BASE, targetKg: "0", barKg: "0" }).ok, true);
});

test("pairs grammar: ASCII integers only, zero or non-zero leading", () => {
  for (const bad of ["1.5", "+2", "-1", " 2", "2 ", "02", "00", "1e1", "２"]) {
    assert.deepEqual(run({ ...BASE, pairs25: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "pairs25", row: null },
    });
  }
  assert.equal(run({ ...BASE, pairs25: "0" }).ok, true);
});

test("ranges: target 0-500, bar 0-50, pairs 0-10", () => {
  assert.deepEqual(run({ ...BASE, targetKg: "501" }), {
    ok: false,
    error: { code: "RANGE", field: "targetKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, barKg: "51" }), {
    ok: false,
    error: { code: "RANGE", field: "barKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, barKg: "50", targetKg: "50" }).ok, true);
  assert.deepEqual(run({ ...BASE, pairs1_25: "11" }), {
    ok: false,
    error: { code: "RANGE", field: "pairs1_25", row: null },
  });
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ ...BASE, targetKg: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "targetKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, pairs5: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "pairs5", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  // 13 units: over the 12-unit cap, even though the text is a valid
  // integer.
  assert.deepEqual(run({ ...BASE, targetKg: "1234567890123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, pairs25: "1234567890123" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "pairs25", row: null },
  });
  // 13 units including a lone surrogate: capacity still wins,
  // because capacity precedes the Unicode check in the SPEC order.
  assert.deepEqual(run({ ...BASE, targetKg: "123456789012\uD800" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "targetKg", row: null },
  });
  // Exactly 12 units is within capacity: "123456789012" is a valid
  // integer, so it reaches RANGE (target above 500).
  assert.deepEqual(run({ ...BASE, targetKg: "123456789012" }), {
    ok: false,
    error: { code: "RANGE", field: "targetKg", row: null },
  });
});

test("lone surrogates are UNICODE at or under the capacity", () => {
  assert.deepEqual(run({ ...BASE, targetKg: "100\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "targetKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, pairs5: "1\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "pairs5", row: null },
  });
});

test("field order: targetKg, barKg, then pairs largest to smallest; cross-field last", () => {
  assert.deepEqual(run({ ...BASE, targetKg: "", barKg: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "targetKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, barKg: "", pairs25: "junk" }), {
    ok: false,
    error: { code: "EMPTY", field: "barKg", row: null },
  });
  assert.deepEqual(run({ ...BASE, pairs25: "x", pairs20: "y" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "pairs25", row: null },
  });
  assert.deepEqual(run({ ...BASE, pairs20: "x", pairs15: "y" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "pairs20", row: null },
  });
  // A per-field failure precedes the cross-field check.
  assert.deepEqual(run({ ...BASE, targetKg: "15", barKg: "junk" }), {
    ok: false,
    error: { code: "NUMBER_FORMAT", field: "barKg", row: null },
  });
  // target below bar is only reported once every field is valid.
  assert.deepEqual(run({ ...BASE, targetKg: "15" }), {
    ok: false,
    error: { code: "TARGET_BELOW_BAR", field: "targetKg", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("100"), schema);
  assert.deepEqual(run({ ...BASE, extra: "x" }), schema);
  const missing = { ...BASE };
  delete missing.pairs1_25;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...BASE, targetKg: 100 }), schema);
  assert.deepEqual(run({ ...BASE, pairs25: null }), schema);
  const withAccessor = { ...BASE };
  Object.defineProperty(withAccessor, "targetKg", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("formatKg strips trailing zeros to at most 3 decimals", () => {
  assert.equal(formatKg(25), "25");
  assert.equal(formatKg(2.5), "2.5");
  assert.equal(formatKg(1.25), "1.25");
  assert.equal(formatKg(0.125), "0.125");
  assert.equal(formatKg(40.375), "40.375");
  assert.equal(formatKg(0), "0");
  assert.equal(formatKg(22.5), "22.5");
  assert.equal(formatKg(33.75), "33.75");
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/barbell-plate-calculator.mjs", import.meta.url));
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
