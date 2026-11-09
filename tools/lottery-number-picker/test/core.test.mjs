// Core tests: all 12 literal core fixtures from fixtures.json (vendored
// verbatim from spec candidate 038d3f8b114b20fbcf31949c912d18713fc470ec,
// task labs-lottery-number-picker-spec-20261109) deep-compared against
// the core's run(), plus hand-derived cases from the SPEC text: the
// integer grammar (leading zeros, signs), SCHEMA classes, token
// trimming rules (U+0020 only), the duplicate pass running only after
// every token passes grammar/range, validation order between fields,
// determinism, and per-zone invariants. Expected values come from the
// fixtures or from the SPEC's stated rules — never from the product.

import assert from "node:assert/strict";
import test from "node:test";
import { createPrng, formatPicksText, run } from "../public/js/core/lottery.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");

for (const entry of coreCases) {
  test(`fixture ${entry.id}`, () => {
    assert.deepEqual(run(entry.input), entry.expected);
  });
}

test("determinism: the same input twice gives bit-identical output", () => {
  const input = { game: "power638", seed: "20261109", setCount: "10", exclude: "3, 7, 38" };
  assert.deepEqual(run(input), run(input));
});

test("the PRNG stream is one instance per run: set 2 continues set 1", () => {
  const one = run({ game: "lotto649", seed: "42", setCount: "1", exclude: "" });
  const three = run({ game: "lotto649", seed: "42", setCount: "3", exclude: "" });
  assert.deepEqual(three.result.sets[0], one.result.sets[0]);
  assert.equal(three.result.sets.length, 3);
});

test("createPrng returns k/2^32 values in [0, 1)", () => {
  const next = createPrng(0);
  for (let i = 0; i < 200; i += 1) {
    const value = next();
    assert.ok(value >= 0 && value < 1, `value ${value} out of range`);
    assert.ok(Number.isInteger(value * 4294967296), "value must be k/2^32");
  }
});

test("every zone is ascending, duplicate-free and within its range", () => {
  for (const game of ["lotto649", "power638", "daily539"]) {
    const outcome = run({ game, seed: "987654321", setCount: "10", exclude: "" });
    assert.equal(outcome.ok, true);
    const [max1, pick1] = game === "lotto649" ? [49, 6] : game === "power638" ? [38, 6] : [39, 5];
    for (const set of outcome.result.sets) {
      assert.equal(set.zone1.length, pick1);
      assert.deepEqual(set.zone1, [...set.zone1].sort((a, b) => a - b));
      assert.equal(new Set(set.zone1).size, pick1);
      for (const n of set.zone1) assert.ok(n >= 1 && n <= max1);
      if (game === "power638") {
        assert.equal(set.zone2.length, 1);
        assert.ok(set.zone2[0] >= 1 && set.zone2[0] <= 8);
      } else {
        assert.equal(set.zone2, null);
      }
    }
  }
});

test("excluded numbers never appear in Zone 1, but Zone 2 is untouched", () => {
  const outcome = run({ game: "power638", seed: "5", setCount: "10", exclude: "1,2,3,4,5,6,7,8" });
  assert.equal(outcome.ok, true);
  for (const set of outcome.result.sets) {
    for (const n of set.zone1) assert.ok(n > 8);
    assert.ok(set.zone2[0] >= 1 && set.zone2[0] <= 8);
  }
});

test("grammar: leading zeros, signs, decimals and exponents are INTEGER_FORMAT", () => {
  for (const seed of ["042", "+42", "-1", "4.2", "1e3", " 42", "42 ", "0x2A"]) {
    assert.deepEqual(
      run({ game: "lotto649", seed, setCount: "1", exclude: "" }),
      { ok: false, error: { code: "INTEGER_FORMAT", field: "seed", row: null } },
      `seed ${JSON.stringify(seed)}`,
    );
  }
});

test("limits: raw length is checked before emptiness and grammar", () => {
  assert.deepEqual(
    run({ game: "lotto649", seed: "99999999999", setCount: "1", exclude: "" }).error,
    { code: "INPUT_LIMIT", field: "seed", row: null },
  );
  assert.deepEqual(
    run({ game: "lotto649", seed: "42", setCount: "100", exclude: "" }).error,
    { code: "INPUT_LIMIT", field: "setCount", row: null },
  );
  assert.deepEqual(
    run({ game: "lotto649", seed: "42", setCount: "1", exclude: "1".repeat(257) }).error,
    { code: "INPUT_LIMIT", field: "exclude", row: null },
  );
});

test("EMPTY is reported per field; setCount 0 is RANGE not EMPTY", () => {
  assert.deepEqual(run({ game: "lotto649", seed: "", setCount: "1", exclude: "" }).error, {
    code: "EMPTY",
    field: "seed",
    row: null,
  });
  assert.deepEqual(run({ game: "lotto649", seed: "1", setCount: "", exclude: "" }).error, {
    code: "EMPTY",
    field: "setCount",
    row: null,
  });
  assert.deepEqual(run({ game: "lotto649", seed: "1", setCount: "0", exclude: "" }).error, {
    code: "RANGE",
    field: "setCount",
    row: null,
  });
});

test("field order: game ENUM beats seed errors; seed beats setCount; setCount beats exclude", () => {
  assert.deepEqual(run({ game: "big", seed: "", setCount: "", exclude: "x" }).error, {
    code: "ENUM",
    field: "game",
    row: null,
  });
  assert.deepEqual(run({ game: "lotto649", seed: "", setCount: "99", exclude: "x" }).error, {
    code: "EMPTY",
    field: "seed",
    row: null,
  });
  assert.deepEqual(run({ game: "lotto649", seed: "1", setCount: "11", exclude: "x" }).error, {
    code: "RANGE",
    field: "setCount",
    row: null,
  });
});

test("exclude tokens: only U+0020 is trimmed; tabs and inner spaces fail grammar", () => {
  for (const exclude of ["1,\t2", "1,2 3", "1,,2", "1,2,", " "]) {
    const outcome = run({ game: "lotto649", seed: "1", setCount: "1", exclude });
    assert.equal(outcome.ok, false, JSON.stringify(exclude));
    assert.equal(outcome.error.code, "INTEGER_FORMAT", JSON.stringify(exclude));
    assert.equal(outcome.error.field, "exclude");
  }
  // " " is one empty token at row 1; "1,,2" fails at row 2.
  assert.equal(run({ game: "lotto649", seed: "1", setCount: "1", exclude: " " }).error.row, 1);
  assert.equal(run({ game: "lotto649", seed: "1", setCount: "1", exclude: "1,,2" }).error.row, 2);
  // Spaces around tokens are fine.
  assert.equal(run({ game: "lotto649", seed: "1", setCount: "1", exclude: " 7 , 8 " }).ok, true);
});

test("exclude RANGE uses the selected game's Zone 1 range and the token row", () => {
  assert.deepEqual(run({ game: "daily539", seed: "1", setCount: "1", exclude: "39,40" }).error, {
    code: "RANGE",
    field: "exclude",
    row: 2,
  });
  assert.deepEqual(run({ game: "power638", seed: "1", setCount: "1", exclude: "0" }).error, {
    code: "RANGE",
    field: "exclude",
    row: 1,
  });
  // 40 is legal for lotto649 but not for power638.
  assert.equal(run({ game: "lotto649", seed: "1", setCount: "1", exclude: "40" }).ok, true);
  assert.equal(run({ game: "power638", seed: "1", setCount: "1", exclude: "40" }).error.code, "RANGE");
});

test("duplicates are checked only after every token passes grammar and range", () => {
  // Token 3 is out of range for daily539, so RANGE row 3 wins over the
  // duplicate at row 2.
  assert.deepEqual(run({ game: "daily539", seed: "1", setCount: "1", exclude: "5,5,40" }).error, {
    code: "RANGE",
    field: "exclude",
    row: 3,
  });
  assert.deepEqual(run({ game: "lotto649", seed: "1", setCount: "1", exclude: "9,3,9,3" }).error, {
    code: "DUPLICATE",
    field: "exclude",
    row: 3,
  });
});

test("pool boundary: exactly enough remaining is legal, one fewer is POOL_TOO_SMALL", () => {
  // daily539: exclude 33 of 39 leaves 6 >= 5 — legal.
  const exclude33 = Array.from({ length: 33 }, (_, i) => i + 1).join(",");
  assert.equal(run({ game: "daily539", seed: "1", setCount: "1", exclude: exclude33 }).ok, true);
  // Exclude 35 leaves 4 < 5.
  const exclude35 = Array.from({ length: 35 }, (_, i) => i + 1).join(",");
  assert.deepEqual(run({ game: "daily539", seed: "1", setCount: "1", exclude: exclude35 }).error, {
    code: "POOL_TOO_SMALL",
    field: "exclude",
    row: null,
  });
});

test("SCHEMA: missing, extra, wrong-type and accessor fields are all rejected", () => {
  const schema = { code: "SCHEMA", field: null, row: null };
  assert.deepEqual(run(null).error, schema);
  assert.deepEqual(run("lotto649").error, schema);
  assert.deepEqual(run(["lotto649", "42", "3", ""]).error, schema);
  assert.deepEqual(run({ game: "lotto649", seed: "42", setCount: "3" }).error, schema);
  assert.deepEqual(
    run({ game: "lotto649", seed: "42", setCount: "3", exclude: "", extra: "x" }).error,
    schema,
  );
  assert.deepEqual(run({ game: "lotto649", seed: 42, setCount: "3", exclude: "" }).error, schema);
  const accessor = { game: "lotto649", setCount: "3", exclude: "" };
  Object.defineProperty(accessor, "seed", { enumerable: true, get: () => "42" });
  assert.deepEqual(run(accessor).error, schema);
});

test("run does not mutate its input", () => {
  const input = { game: "lotto649", seed: "42", setCount: "3", exclude: "1, 2" };
  const before = JSON.stringify(input);
  run(input);
  assert.equal(JSON.stringify(input), before);
});

test("copy text: fixed format per game, LF-joined, no trailing LF", () => {
  const power = run({ game: "power638", seed: "20261109", setCount: "2", exclude: "" });
  assert.equal(
    formatPicksText(power.result),
    "10 14 18 22 29 30 + 1\n11 16 17 27 30 37 + 1",
  );
  const lotto = run({ game: "lotto649", seed: "42", setCount: "3", exclude: "" });
  const text = formatPicksText(lotto.result);
  assert.equal(text, "12 23 29 30 34 43\n14 16 25 31 43 44\n12 16 27 32 35 37");
  assert.ok(!text.endsWith("\n"));
  // Download bytes are the same text as UTF-8 without BOM.
  const bytes = new TextEncoder().encode(text);
  assert.equal(new TextDecoder().decode(bytes), text);
  assert.notEqual(bytes[0], 0xef);
});
