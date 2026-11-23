// Core tests. Expected values come from the fixed SPEC fixtures
// (test/fixtures.json, copied verbatim from docs/specs/uv-index-guide)
// plus cases derived by hand from the SPEC rules — never from the core's
// own output. Hand derivations use MED / (1.5 x UVI), half-up rounding,
// and floor(UVI + 0.5) for the category.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeEcho, run } from "../public/js/core/core.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8")
);
const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const c of coreCases) {
  test(`fixture ${c.id}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

const DISCLAIMER_ZH =
  "本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。";
const DISCLAIMER_EN =
  "This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance.";

test("boundary: range endpoints are legal", () => {
  assert.deepEqual(run({ uvIndex: "0", skinType: "I" }), {
    ok: true,
    result: {
      uvIndex: 0,
      uvIndexRounded: 0,
      category: { code: "low", zh: "低量級", en: "Low", color: "green", pms: "PMS 375" },
      protectionRequired: false,
      avoidMidday: false,
      spfMinimum: 15,
      reapplyMinutes: null,
      cwaBurnTimeMinutes: null,
      burnEstimate: { skinType: "I", medJPerM2: 200, minutesToRedness: null, capped: false },
      adviceZh: "可安心待在戶外；晴天戴太陽眼鏡，容易曬傷者可擦廣效性 SPF 15+ 防曬乳。",
      adviceEn:
        "You can safely stay outside; wear sunglasses on bright days. If you burn easily, use broad-spectrum SPF 15+ sunscreen.",
      skinNoteZh: "總是曬傷、從不曬黑。",
      skinNoteEn: "Always burns, never tans.",
      disclaimerZh: DISCLAIMER_ZH,
      disclaimerEn: DISCLAIMER_EN,
    },
  });
  assert.deepEqual(run({ uvIndex: "20", skinType: "VI" }), {
    ok: true,
    result: {
      uvIndex: 20,
      uvIndexRounded: 20,
      category: { code: "extreme", zh: "危險級", en: "Extreme", color: "purple", pms: "PMS 265" },
      protectionRequired: true,
      avoidMidday: true,
      spfMinimum: 50,
      reapplyMinutes: 120,
      cwaBurnTimeMinutes: 15,
      burnEstimate: { skinType: "VI", medJPerM2: 1000, minutesToRedness: 33, capped: false },
      adviceZh: "盡量避免中午待在戶外；遮蔭、衣物、防曬乳、帽子缺一不可。",
      adviceEn:
        "Try to avoid the sun during midday hours; shade, clothing, sunscreen and a hat are a must.",
      skinNoteZh: "幾乎不曬傷。",
      skinNoteEn: "Almost never burns.",
      disclaimerZh: DISCLAIMER_ZH,
      disclaimerEn: DISCLAIMER_EN,
    },
  });
});

test("boundary: just outside the range is RANGE on uvIndex", () => {
  for (const bad of ["20.1", "20.5", "99"]) {
    assert.deepEqual(run({ uvIndex: bad, skinType: "III" }), {
      ok: false,
      error: { code: "RANGE", field: "uvIndex", row: null },
    });
  }
  // 19.9 is legal and rounds to 20 (extreme); burn uses the raw 19.9.
  const { result } = run({ uvIndex: "19.9", skinType: "III" });
  assert.equal(result.uvIndexRounded, 20);
  assert.equal(result.category.code, "extreme");
  assert.equal(result.burnEstimate.minutesToRedness, 10); // 300 / (1.5 x 19.9) = 10.05 -> 10
});

test("grammar: valid and invalid shapes", () => {
  assert.equal(run({ uvIndex: "0.5", skinType: "III" }).ok, true);
  assert.equal(run({ uvIndex: "8", skinType: "III" }).ok, true);
  assert.equal(run({ uvIndex: "8.5", skinType: "III" }).ok, true);
  for (const bad of [".5", "5.", "+5", "-1", "1e1", " 5", "5 ", "50%", "1,000", "--5", "0x10", "08", "8.55", "12.34"]) {
    assert.deepEqual(
      run({ uvIndex: bad, skinType: "III" }),
      { ok: false, error: { code: "FORMAT", field: "uvIndex", row: null } },
      `expected FORMAT for ${JSON.stringify(bad)}`
    );
  }
});

test("rounding: half-up boundaries flip the category", () => {
  assert.equal(run({ uvIndex: "2.4", skinType: "III" }).result.uvIndexRounded, 2);
  assert.equal(run({ uvIndex: "2.4", skinType: "III" }).result.category.code, "low");
  assert.equal(run({ uvIndex: "2.5", skinType: "III" }).result.uvIndexRounded, 3);
  assert.equal(run({ uvIndex: "2.5", skinType: "III" }).result.category.code, "moderate");
  assert.equal(run({ uvIndex: "7.5", skinType: "III" }).result.uvIndexRounded, 8);
  assert.equal(run({ uvIndex: "7.5", skinType: "III" }).result.category.code, "very-high");
  assert.equal(run({ uvIndex: "10.4", skinType: "III" }).result.uvIndexRounded, 10);
  assert.equal(run({ uvIndex: "10.4", skinType: "III" }).result.category.code, "very-high");
  assert.equal(run({ uvIndex: "0.5", skinType: "III" }).result.uvIndexRounded, 1);
  assert.equal(run({ uvIndex: "0.4", skinType: "III" }).result.uvIndexRounded, 0);
});

test("burn estimate uses the unrounded index, not the rounded one", () => {
  // 6.5 rounds to 7, but the estimate uses 6.5: 200 / 9.75 = 20.51 -> 21.
  // Using the rounded 7 would give 200 / 10.5 = 19.05 -> 19.
  assert.equal(run({ uvIndex: "6.5", skinType: "I" }).result.burnEstimate.minutesToRedness, 21);
  assert.equal(run({ uvIndex: "7", skinType: "I" }).result.burnEstimate.minutesToRedness, 19);
  // 10.5 rounds to 11, but the estimate uses 10.5: 300 / 15.75 = 19.05 -> 19.
  // Using the rounded 11 would give 300 / 16.5 = 18.18 -> 18.
  assert.equal(run({ uvIndex: "10.5", skinType: "III" }).result.burnEstimate.minutesToRedness, 19);
  assert.equal(run({ uvIndex: "11", skinType: "III" }).result.burnEstimate.minutesToRedness, 18);
});

test("burn rounding is half-up on exact values", () => {
  // 600 / (1.5 x 6.4) = 600 / 9.6 = 62.5 exactly -> 63.
  assert.deepEqual(run({ uvIndex: "6.4", skinType: "V" }).result.burnEstimate, {
    skinType: "V",
    medJPerM2: 600,
    minutesToRedness: 63,
    capped: false,
  });
});

test("cap: long estimates are capped at 180, short ones are not", () => {
  // 200 / (1.5 x 0.7) = 190.48 -> 190, capped.
  assert.deepEqual(run({ uvIndex: "0.7", skinType: "I" }).result.burnEstimate, {
    skinType: "I",
    medJPerM2: 200,
    minutesToRedness: 180,
    capped: true,
  });
  // 200 / (1.5 x 0.8) = 166.67 -> 167, not capped.
  assert.deepEqual(run({ uvIndex: "0.8", skinType: "I" }).result.burnEstimate, {
    skinType: "I",
    medJPerM2: 200,
    minutesToRedness: 167,
    capped: false,
  });
  // 300 / (1.5 x 1.1) = 181.82 -> 182, capped.
  assert.deepEqual(run({ uvIndex: "1.1", skinType: "III" }).result.burnEstimate, {
    skinType: "III",
    medJPerM2: 300,
    minutesToRedness: 180,
    capped: true,
  });
  // 300 / (1.5 x 1.2) = 166.67 -> 167, not capped.
  assert.deepEqual(run({ uvIndex: "1.2", skinType: "III" }).result.burnEstimate, {
    skinType: "III",
    medJPerM2: 300,
    minutesToRedness: 167,
    capped: false,
  });
});

test("category table: every band and its SPF / CWA values", () => {
  const rows = [
    ["2", "low", 15, null, null, false],
    ["5", "moderate", 30, 120, null, false],
    ["7", "high", 30, 120, 30, false],
    ["10", "very-high", 50, 120, 20, true],
    ["11", "extreme", 50, 120, 15, true],
  ];
  for (const [uvIndex, code, spf, reapply, cwa, avoidMidday] of rows) {
    const { result } = run({ uvIndex, skinType: "III" });
    assert.equal(result.category.code, code, uvIndex);
    assert.equal(result.spfMinimum, spf, uvIndex);
    assert.equal(result.reapplyMinutes, reapply, uvIndex);
    assert.equal(result.cwaBurnTimeMinutes, cwa, uvIndex);
    assert.equal(result.avoidMidday, avoidMidday, uvIndex);
    assert.equal(result.protectionRequired, code !== "low", uvIndex);
  }
});

test("capacity and empty: INPUT_LIMIT beats everything, EMPTY on blank or missing", () => {
  assert.deepEqual(run({ uvIndex: "1".repeat(9), skinType: "III" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "uvIndex", row: null },
  });
  assert.deepEqual(run({ uvIndex: "", skinType: "III" }), {
    ok: false,
    error: { code: "EMPTY", field: "uvIndex", row: null },
  });
  // Missing uvIndex is EMPTY, not SCHEMA (SPEC §1).
  assert.deepEqual(run({ skinType: "III" }), {
    ok: false,
    error: { code: "EMPTY", field: "uvIndex", row: null },
  });
  // Exactly 8 characters is legal capacity-wise (value still range-checked).
  assert.equal(run({ uvIndex: "12345678", skinType: "III" }).error.code, "RANGE");
});

test("first error wins, uvIndex before skinType", () => {
  assert.deepEqual(run({ uvIndex: "abc", skinType: "VII" }), {
    ok: false,
    error: { code: "FORMAT", field: "uvIndex", row: null },
  });
  assert.deepEqual(run({ uvIndex: "5", skinType: "VII" }), {
    ok: false,
    error: { code: "SCHEMA", field: "skinType", row: null },
  });
});

test("schema: wrong types, missing/extra fields, accessors, bad skin types", () => {
  const schemaNull = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schemaNull);
  assert.deepEqual(run("5"), schemaNull);
  assert.deepEqual(run({ uvIndex: "5", skinType: "III", extra: "1" }), schemaNull);
  assert.deepEqual(run({ uvIndex: 5, skinType: "III" }), {
    ok: false,
    error: { code: "SCHEMA", field: "uvIndex", row: null },
  });
  assert.deepEqual(run({ uvIndex: "5", skinType: 3 }), {
    ok: false,
    error: { code: "SCHEMA", field: "skinType", row: null },
  });
  const withGetter = { skinType: "III" };
  Object.defineProperty(withGetter, "uvIndex", {
    enumerable: true,
    get() {
      return "5";
    },
  });
  assert.deepEqual(run(withGetter), schemaNull);
  for (const bad of ["", "VII", "iii", "0", "1", " III", "III "]) {
    assert.deepEqual(
      run({ uvIndex: "5", skinType: bad }),
      { ok: false, error: { code: "SCHEMA", field: "skinType", row: null } },
      `expected SCHEMA for skinType ${JSON.stringify(bad)}`
    );
  }
});

test("unicode: lone surrogate is UNICODE, after INPUT_LIMIT order", () => {
  assert.deepEqual(run({ uvIndex: "\uD800", skinType: "III" }), {
    ok: false,
    error: { code: "UNICODE", field: "uvIndex", row: null },
  });
  assert.deepEqual(run({ uvIndex: "5\uDC00", skinType: "III" }), {
    ok: false,
    error: { code: "UNICODE", field: "uvIndex", row: null },
  });
  assert.deepEqual(run({ uvIndex: "5", skinType: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "skinType", row: null },
  });
  assert.deepEqual(run({ uvIndex: "\uD800" + "1".repeat(8), skinType: "III" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "uvIndex", row: null },
  });
});

test("invariants: minutesToRedness is an integer or null, capped implies 180", () => {
  for (const [uvIndex, skinType] of [
    ["0", "I"], ["0.1", "VI"], ["0.5", "III"], ["1", "VI"], ["2", "III"],
    ["5", "V"], ["6.4", "V"], ["6.5", "I"], ["7.4", "IV"], ["8", "II"],
    ["10.5", "III"], ["11", "VI"], ["19.9", "III"], ["20", "VI"],
  ]) {
    const { result } = run({ uvIndex, skinType });
    const m = result.burnEstimate.minutesToRedness;
    assert.ok(m === null || Number.isInteger(m), `${uvIndex}/${skinType}`);
    assert.ok(!result.burnEstimate.capped || m === 180, `${uvIndex}/${skinType}`);
    assert.ok(m === null || (m >= 1 && m <= 180), `${uvIndex}/${skinType}`);
  }
});

test("normalizeEcho trims a trailing .0 and rejects bad grammar", () => {
  assert.equal(normalizeEcho("5"), "5");
  assert.equal(normalizeEcho("5.0"), "5");
  assert.equal(normalizeEcho("0.5"), "0.5");
  assert.equal(normalizeEcho("20.0"), "20");
  assert.equal(normalizeEcho("0.0"), "0");
  assert.equal(normalizeEcho("08"), null);
  assert.equal(normalizeEcho("8.55"), null);
  assert.equal(normalizeEcho("abc"), null);
  assert.equal(normalizeEcho(".5"), null);
});
