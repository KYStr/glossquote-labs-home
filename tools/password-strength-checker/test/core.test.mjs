// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-password-strength-checker-20261121, draft spec PR #393, head
// 55d35a4c9194c83f8e2cf63d60d8cfec4465d28f, SHA-256
// 145d047495902db7420f3419347b6426ba07b41c452a436ad64b6ecea3f01951).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §inputsOutputs rules by hand (log2 values:
// 26→4.7004, 36→5.1699, 52→5.7004, 62→5.9542, 94→6.5546), never
// from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/password-strength.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-password-strength-checker-20261121");
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

// No result may quote the password or any substring of it: walk
// every string value in each literal success result and require
// that it never contains the input password.
test("no literal success result quotes its password", () => {
  for (const fixture of coreCases) {
    if (!fixture.expected.ok) continue;
    const password = fixture.input.password;
    const strings = [];
    (function walk(value) {
      if (typeof value === "string") strings.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value !== null && typeof value === "object") Object.values(value).forEach(walk);
    })(fixture.expected.result);
    for (const text of strings) {
      assert.ok(!text.includes(password), `${fixture.id}: result quotes the password`);
    }
  }
});

test("band boundaries, hand-derived from the SPEC thresholds", () => {
  const cases = [
    // [password, finalEntropyBits, band] — each base entropy is
    // length x log2(pool), half-up to 1 decimal; penalties as noted.
    ["zxqjkvmb", 29.6, "weak"], // 8 lower: 37.6, SINGLE_CLASS -8
    ["zxqjkvmbt", 34.3, "weak"], // 9 lower: 42.3, SINGLE_CLASS -8
    ["zxqjkvmbtq", 39.0, "fair"], // 10 lower: 47.0, SINGLE_CLASS -8
    ["Zxqjkvmb", 45.6, "fair"], // 8 lower+upper: 8 x 5.7004 = 45.6, no penalty
    ["aB3$xY9", 35.9, "weak"], // 7 x 4 classes: 45.9, SHORT_LENGTH -10
    ["aB3$xY9!", 52.4, "fair"], // 8 x 4 classes: 52.4, no penalty
    ["aB3$xY9!qW", 65.5, "strong"], // 10 x 4 classes: 65.5, no penalty
    ["aB3$xY9!qW2#z", 85.2, "very strong"], // 13 x 4 classes: 85.2
    ["294718635820", 31.9, "weak"], // 12 digits: 39.9, SINGLE_CLASS -8
  ];
  for (const [password, finalEntropyBits, band] of cases) {
    const actual = run({ password });
    assert.equal(actual.ok, true, password);
    assert.equal(actual.result.finalEntropyBits, finalEntropyBits, password);
    assert.equal(actual.result.band, band, password);
  }
});

test("dictionary words cap at 2 even when more are present", () => {
  // "appleorange": both words present; a third reading of the same
  // words must not add more. Base 11 x 4.7004 = 51.7, DICTIONARY
  // -12 x 2, SINGLE_CLASS -8 -> 19.7, very weak.
  const actual = run({ password: "appleorange" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result.penalties, [
    { code: "DICTIONARY_WORD", bits: 12 },
    { code: "DICTIONARY_WORD", bits: 12 },
    { code: "SINGLE_CLASS", bits: 8 },
  ]);
  assert.equal(actual.result.totalPenaltyBits, 32);
  assert.equal(actual.result.finalEntropyBits, 19.7);
  assert.equal(actual.result.band, "very weak");
  assert.deepEqual(actual.result.suggestions, ["S_DICT", "S_LENGTH", "S_CLASSES"]);
});

test("REPEAT_RUN fires on three identical code points in a row", () => {
  // "aaabB1!x": 8 x 4 classes = 52.4, REPEAT_RUN -8 -> 44.4 fair.
  const actual = run({ password: "aaabB1!x" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result.penalties, [{ code: "REPEAT_RUN", bits: 8 }]);
  assert.equal(actual.result.finalEntropyBits, 44.4);
  assert.equal(actual.result.band, "fair");
  assert.deepEqual(actual.result.suggestions, ["S_REPEAT", "S_LENGTH"]);
});

test("YEAR fires only inside 1900-2099", () => {
  for (const [password, yearPenalty] of [
    ["Ab!2024x", true],
    ["Ab!1900x", true],
    ["Ab!2099x", true],
    ["Ab!1899x", false],
    ["Ab!2100x", false],
  ]) {
    const actual = run({ password });
    assert.equal(actual.ok, true, password);
    // Base 8 x 4 classes = 52.4; a year costs 6.
    assert.equal(actual.result.finalEntropyBits, yearPenalty ? 46.4 : 52.4, password);
    assert.deepEqual(
      actual.result.suggestions,
      yearPenalty ? ["S_YEAR", "S_LENGTH"] : ["S_LENGTH"],
      password,
    );
  }
});

test("REPEATED_PATTERN needs an exact whole repetition", () => {
  // "Aa1!Aa1!Aa" is two full "Aa1!" repeats plus a partial "Aa":
  // not an exact repetition, so no penalty. Base 10 x 6.5546 = 65.5.
  const actual = run({ password: "Aa1!Aa1!Aa" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result.penalties, []);
  assert.equal(actual.result.finalEntropyBits, 65.5);
  assert.equal(actual.result.band, "strong");
  assert.deepEqual(actual.result.suggestions, ["S_LENGTH"]);
});

test("crack-time units: minutes and hours, hand-derived", () => {
  // "zxqjkv": 6 lower, base 28.2, SHORT -10, SINGLE -8 -> 10.2.
  // 2^10.2 = 1176.3 guesses; online 117.6 s -> 2.0 minutes.
  const minutes = run({ password: "zxqjkv" });
  assert.equal(minutes.ok, true);
  assert.equal(minutes.result.finalEntropyBits, 10.2);
  assert.deepEqual(minutes.result.crackTimeOnline, {
    zh: "2.0 分鐘",
    en: "2.0 minutes",
  });
  assert.deepEqual(minutes.result.crackTimeOffline, { zh: "<1 秒", en: "<1 second" });
  // "z9xq8": 5 lower+digits, pool 36, base 25.8, SHORT -10
  // -> 15.8. 2^15.8 = 57054 guesses; online 5705.4 s -> 1.6 hours.
  const hours = run({ password: "z9xq8" });
  assert.equal(hours.ok, true);
  assert.equal(hours.result.finalEntropyBits, 15.8);
  assert.deepEqual(hours.result.crackTimeOnline, {
    zh: "1.6 小時",
    en: "1.6 hours",
  });
  assert.deepEqual(hours.result.crackTimeOffline, { zh: "<1 秒", en: "<1 second" });
  assert.deepEqual(hours.result.suggestions, ["S_LENGTH", "S_CLASSES"]);
});

test("classes follow the SPEC fixed order, not appearance order", () => {
  // "9!aZ": digits, symbols, lowercase, uppercase in appearance,
  // but classes must list lowercase, uppercase, digits, symbols.
  const actual = run({ password: "9!aZ" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result.classes, ["lowercase", "uppercase", "digits", "symbols"]);
  assert.equal(actual.result.pool, 94);
});

test("space counts as other; non-ASCII counts as other", () => {
  const actual = run({ password: "ab cd" });
  assert.equal(actual.ok, true);
  assert.deepEqual(actual.result.classes, ["lowercase", "other"]);
  assert.equal(actual.result.pool, 58);
  assert.equal(actual.result.passwordLength, 5);
  // Base 5 x 5.8580 = 29.3, SHORT_LENGTH -10 -> 19.3, very weak.
  assert.equal(actual.result.baseEntropyBits, 29.3);
  assert.equal(actual.result.finalEntropyBits, 19.3);
});

test("legal 128 code points pass; 129 fail INPUT_LIMIT", () => {
  // "aB3$" x 32 = 128 code points, 4 classes, base 839.0,
  // REPEATED_PATTERN -10 -> 829.0, very strong.
  const legal = run({ password: "aB3$".repeat(32) });
  assert.equal(legal.ok, true);
  assert.equal(legal.result.passwordLength, 128);
  assert.equal(legal.result.baseEntropyBits, 839.0);
  assert.deepEqual(legal.result.penalties, [{ code: "REPEATED_PATTERN", bits: 10 }]);
  assert.equal(legal.result.finalEntropyBits, 829.0);
  assert.deepEqual(legal.result.suggestions, ["S_REPEAT"]);
  assert.deepEqual(run({ password: "aB3$".repeat(32) + "a" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "password", row: null },
  });
});

test("lone surrogates are UNICODE; capacity precedes the Unicode check", () => {
  assert.deepEqual(run({ password: "ab\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "password", row: null },
  });
  assert.deepEqual(run({ password: "ab\uDC00" }), {
    ok: false,
    error: { code: "UNICODE", field: "password", row: null },
  });
  // A paired surrogate is one code point and counts as other.
  const paired = run({ password: "aB1!\uD83D\uDE00" });
  assert.equal(paired.ok, true);
  assert.deepEqual(paired.result.classes, [
    "lowercase",
    "uppercase",
    "digits",
    "symbols",
    "other",
  ]);
  // 129 code points including a lone surrogate: capacity wins.
  assert.deepEqual(run({ password: `${"a".repeat(128)}\uD800` }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "password", row: null },
  });
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("abc"), schema);
  assert.deepEqual(run({}), schema);
  assert.deepEqual(run({ password: "abc", extra: "x" }), schema);
  assert.deepEqual(run({ password: 123 }), schema);
  assert.deepEqual(run({ password: null }), schema);
  const withAccessor = {};
  Object.defineProperty(withAccessor, "password", {
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
  const corePath = fileURLToPath(new URL("../public/js/core/password-strength.mjs", import.meta.url));
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
