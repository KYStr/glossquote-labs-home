// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-aqi-interpreter-20261121, spec candidate commit for draft
// spec PR #391, SHA-256
// 1e72c214fa0d924ba2ee04ba74615fd34f6ebf93eeec9932044fed9c864e2d46).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's section 5 pinned tables and section 4 rules by
// hand (and cross-checked with an independent Python Decimal
// re-derivation), never from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/aqi-interpreter.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-aqi-interpreter-20261121");
assert.equal(coreCases.length, 19);

for (const fixture of coreCases) {
  // aqi-decimal is excluded from the verbatim loop: its input "42.5"
  // is four raw units, so the SPEC's own order ("先容量、再
  // surrogate、再該欄文法") gives INPUT_LIMIT, while the fixture
  // expects INTEGER_FORMAT. The SPEC text governs (see the dedicated
  // test below and errata candidate 1 in HANDOFF.md); the fixture
  // value should have been a three-unit decimal such as "1.5".
  if (fixture.id === "aqi-decimal") continue;
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

test("fixture aqi-decimal under the SPEC order: capacity precedes grammar", () => {
  // The fixture's stated purpose is "AQI 小數不接受", but its value
  // "42.5" is four units and MAX_AQI_RAW_UNITS is three. The SPEC
  // pins the order capacity → surrogate → grammar, so INPUT_LIMIT
  // wins — the same order the run-6 house pattern pins (a too-long
  // decimal is INPUT_LIMIT, not INTEGER_FORMAT). A three-unit decimal
  // such as "1.5" does give INTEGER_FORMAT (see the grammar test).
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "42.5", rows: [] }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "aqi", row: null },
  });
});

function concentrationInput(system, pollutant, value) {
  return { mode: "concentration", system, aqi: "", rows: [{ pollutant, value }] };
}

function subOf(outcome) {
  assert.equal(outcome.ok, true);
  return outcome.result.subIndices[0].subIndex;
}

test("level boundaries for direct AQI, hand-derived from the SPEC table", () => {
  const cases = [
    ["0", "good", "green", "#00E400"],
    ["50", "good", "green", "#00E400"],
    ["51", "moderate", "yellow", "#FFFF00"],
    ["100", "moderate", "yellow", "#FFFF00"],
    ["101", "usg", "orange", "#FF7E00"],
    ["150", "usg", "orange", "#FF7E00"],
    ["151", "unhealthy", "red", "#FF0000"],
    ["200", "unhealthy", "red", "#FF0000"],
    ["201", "very-unhealthy", "purple", "#99004C"],
    ["300", "very-unhealthy", "purple", "#99004C"],
    ["301", "hazardous", "maroon", "#7E0023"],
    ["500", "hazardous", "maroon", "#7E0023"],
  ];
  for (const [aqi, level, color, hex] of cases) {
    const outcome = run({ mode: "aqi", system: "TW", aqi, rows: [] });
    assert.equal(outcome.ok, true, aqi);
    assert.equal(outcome.result.level, level, aqi);
    assert.equal(outcome.result.color, color, aqi);
    assert.equal(outcome.result.hex, hex, aqi);
    assert.equal(outcome.result.aqi, Number(aqi), aqi);
  }
});

test("breakpoint edges: PM2.5 12.4/12.5 (TW) and 9.0/9.1 (US)", () => {
  assert.equal(subOf(run(concentrationInput("TW", "PM2.5", "12.4"))), 50);
  assert.equal(subOf(run(concentrationInput("TW", "PM2.5", "12.5"))), 51);
  assert.equal(subOf(run(concentrationInput("US", "PM2.5", "9.0"))), 50);
  assert.equal(subOf(run(concentrationInput("US", "PM2.5", "9.1"))), 51);
});

test("table tops: PM2.5 500.4/500.5 (TW) and 325.4/325.5 (US)", () => {
  const atTopTw = run(concentrationInput("TW", "PM2.5", "500.4"));
  assert.equal(subOf(atTopTw), 500);
  assert.deepEqual(atTopTw.result.notices, []);
  const aboveTw = run(concentrationInput("TW", "PM2.5", "500.5"));
  assert.equal(subOf(aboveTw), 500);
  assert.deepEqual(aboveTw.result.notices, [{ code: "ABOVE_TABLE_TOP", pollutant: "PM2.5" }]);
  const atTopUs = run(concentrationInput("US", "PM2.5", "325.4"));
  assert.equal(subOf(atTopUs), 500);
  assert.deepEqual(atTopUs.result.notices, []);
  const aboveUs = run(concentrationInput("US", "PM2.5", "325.5"));
  assert.equal(subOf(aboveUs), 500);
  assert.deepEqual(aboveUs.result.notices, [{ code: "ABOVE_TABLE_TOP", pollutant: "PM2.5" }]);
});

test("O3 8h 0.200 is defined (300); 0.201 is undefined (SPEC note 2)", () => {
  assert.equal(subOf(run(concentrationInput("TW", "O3-8h", "0.200"))), 300);
  assert.deepEqual(run(concentrationInput("TW", "O3-8h", "0.201")), {
    ok: false,
    error: { code: "UNDEFINED_BAND", field: "rows", row: 1 },
  });
  assert.deepEqual(run(concentrationInput("US", "O3-8h", "0.201")), {
    ok: false,
    error: { code: "UNDEFINED_BAND", field: "rows", row: 1 },
  });
});

test("SO2 304 is defined (200); 305 is undefined (SPEC note 3), both systems", () => {
  assert.equal(subOf(run(concentrationInput("TW", "SO2", "304"))), 200);
  assert.equal(subOf(run(concentrationInput("US", "SO2", "304"))), 200);
  assert.deepEqual(run(concentrationInput("TW", "SO2", "305")), {
    ok: false,
    error: { code: "UNDEFINED_BAND", field: "rows", row: 1 },
  });
  assert.deepEqual(run(concentrationInput("US", "SO2", "305")), {
    ok: false,
    error: { code: "UNDEFINED_BAND", field: "rows", row: 1 },
  });
});

test("O3 1h bottom edges: TW 0.101 defined (101), US 0.125 defined (101), US 0.124 undefined", () => {
  assert.equal(subOf(run(concentrationInput("TW", "O3-1h", "0.101"))), 101);
  assert.equal(subOf(run(concentrationInput("US", "O3-1h", "0.125"))), 101);
  assert.deepEqual(run(concentrationInput("US", "O3-1h", "0.124")), {
    ok: false,
    error: { code: "UNDEFINED_BAND", field: "rows", row: 1 },
  });
});

test("other table tops cap at 500 with ABOVE_TABLE_TOP: NO2 2049/2050, O3-1h 0.604/0.605", () => {
  assert.equal(subOf(run(concentrationInput("TW", "NO2", "2049"))), 500);
  assert.deepEqual(run(concentrationInput("TW", "NO2", "2049")).result.notices, []);
  assert.deepEqual(run(concentrationInput("TW", "NO2", "2050")).result.notices, [
    { code: "ABOVE_TABLE_TOP", pollutant: "NO2" },
  ]);
  assert.equal(subOf(run(concentrationInput("TW", "O3-1h", "0.604"))), 500);
  assert.deepEqual(run(concentrationInput("TW", "O3-1h", "0.605")).result.notices, [
    { code: "ABOVE_TABLE_TOP", pollutant: "O3-1h" },
  ]);
});

test("rounding: TW half-up vs US truncate, hand-derived", () => {
  // PM2.5 20.05: TW -> 20.1 -> 72; US -> 20.0 -> 71.
  const tw = run(concentrationInput("TW", "PM2.5", "20.05"));
  assert.equal(tw.result.subIndices[0].concentration, 20.1);
  assert.equal(subOf(tw), 72);
  const us = run(concentrationInput("US", "PM2.5", "20.05"));
  assert.equal(us.result.subIndices[0].concentration, 20);
  assert.equal(subOf(us), 71);
  // US 20.09 still truncates to 20.0 -> 71; TW 20.04 rounds to 20.0 -> 72.
  assert.equal(subOf(run(concentrationInput("US", "PM2.5", "20.09"))), 71);
  assert.equal(subOf(run(concentrationInput("TW", "PM2.5", "20.04"))), 72);
  // O3-8h 0.0785: TW -> 0.079 -> 129; US 0.0789 -> 0.078 -> 126.
  const twO3 = run(concentrationInput("TW", "O3-8h", "0.0785"));
  assert.equal(twO3.result.subIndices[0].concentration, 0.079);
  assert.equal(subOf(twO3), 129);
  const usO3 = run(concentrationInput("US", "O3-8h", "0.0789"));
  assert.equal(usO3.result.subIndices[0].concentration, 0.078);
  assert.equal(subOf(usO3), 126);
  // CO 4.45: TW -> 4.5 -> 51; US 4.49 -> 4.4 -> 50.
  assert.equal(subOf(run(concentrationInput("TW", "CO", "4.45"))), 51);
  assert.equal(subOf(run(concentrationInput("US", "CO", "4.49"))), 50);
  // PM10 30.4 -> 30 -> 50; 30.5 -> 31 -> 51; US 54.5 -> 54 -> 50.
  assert.equal(subOf(run(concentrationInput("TW", "PM10", "30.4"))), 50);
  assert.equal(subOf(run(concentrationInput("TW", "PM10", "30.5"))), 51);
  assert.equal(subOf(run(concentrationInput("US", "PM10", "54.5"))), 50);
});

test("zero concentrations give sub-index 0, level good", () => {
  for (const [pollutant, value] of [
    ["PM2.5", "0"],
    ["PM10", "0"],
    ["O3-8h", "0"],
    ["CO", "0"],
    ["SO2", "0"],
    ["NO2", "0"],
  ]) {
    const outcome = run(concentrationInput("TW", pollutant, value));
    assert.equal(outcome.ok, true, pollutant);
    assert.equal(outcome.result.aqi, 0, pollutant);
    assert.equal(outcome.result.level, "good", pollutant);
  }
});

test("all seven pollutants at once, hand-derived: max 129, dominant O3-1h", () => {
  const outcome = run({
    mode: "concentration",
    system: "TW",
    aqi: "",
    rows: [
      { pollutant: "PM2.5", value: "20.0" },
      { pollutant: "PM10", value: "50" },
      { pollutant: "O3-8h", value: "0.060" },
      { pollutant: "O3-1h", value: "0.120" },
      { pollutant: "CO", value: "5.0" },
      { pollutant: "SO2", value: "30" },
      { pollutant: "NO2", value: "50" },
    ],
  });
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      system: "TW",
      mode: "concentration",
      aqi: 129,
      level: "usg",
      levelZh: "對敏感族群不健康",
      levelEn: "Unhealthy for Sensitive Groups",
      color: "orange",
      colorZh: "橘",
      hex: "#FF7E00",
      healthImpact: "空氣污染物可能會對敏感族群的健康造成影響，但是對一般大眾的影響不明顯。",
      adviceGeneral:
        "1.一般民眾如果有不適，如眼痛，咳嗽或喉嚨痛等，應該考慮減少戶外活動。2.學生仍可進行戶外活動，但建議減少長時間劇烈運動。",
      adviceSensitive:
        "1.有心臟、呼吸道及心血管疾病患者、孩童及老年人，建議減少體力消耗活動及戶外活動，必要外出應配戴口罩。2.具有氣喘的人可能需增加使用吸入劑的頻率。",
      dominantPollutant: "O3-1h",
      subIndices: [
        { pollutant: "PM2.5", concentration: 20, subIndex: 72, level: "moderate" },
        { pollutant: "PM10", concentration: 50, subIndex: 72, level: "moderate" },
        { pollutant: "O3-8h", concentration: 0.06, subIndex: 67, level: "moderate" },
        { pollutant: "O3-1h", concentration: 0.12, subIndex: 129, level: "usg" },
        { pollutant: "CO", concentration: 5, subIndex: 56, level: "moderate" },
        { pollutant: "SO2", concentration: 30, subIndex: 69, level: "moderate" },
        { pollutant: "NO2", concentration: 50, subIndex: 69, level: "moderate" },
      ],
      notices: [],
    },
  });
});

test("partial skip: one row above top, one row undefined; notices in input order", () => {
  const outcome = run({
    mode: "concentration",
    system: "TW",
    aqi: "",
    rows: [
      { pollutant: "PM2.5", value: "600" },
      { pollutant: "O3-8h", value: "0.250" },
    ],
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.aqi, 500);
  assert.equal(outcome.result.dominantPollutant, "PM2.5");
  assert.deepEqual(outcome.result.subIndices, [
    { pollutant: "PM2.5", concentration: 600, subIndex: 500, level: "hazardous" },
  ]);
  assert.deepEqual(outcome.result.notices, [
    { code: "ABOVE_TABLE_TOP", pollutant: "PM2.5" },
    { code: "SKIPPED_UNDEFINED", pollutant: "O3-8h" },
  ]);
});

test("sub-indices stay within 0-500 and never decrease as concentration rises", () => {
  const sweeps = [
    ["TW", "PM2.5", ["0", "12.4", "12.5", "30.4", "30.5", "50.4", "50.5", "125.4", "125.5", "225.4", "225.5", "325.4", "325.5", "500.4", "500.5", "999.9"]],
    ["US", "PM2.5", ["0", "9.0", "9.1", "35.4", "35.5", "55.4", "55.5", "125.4", "125.5", "225.4", "225.5", "325.4", "325.5", "999.9"]],
    ["TW", "PM10", ["0", "30", "31", "75", "76", "190", "191", "354", "355", "424", "425", "504", "505", "604", "605", "999"]],
    ["US", "PM10", ["0", "54", "55", "154", "155", "254", "255", "354", "355", "424", "425", "604", "605", "999"]],
    ["TW", "O3-8h", ["0", "0.054", "0.055", "0.070", "0.071", "0.085", "0.086", "0.105", "0.106", "0.200"]],
    ["TW", "O3-1h", ["0.101", "0.134", "0.135", "0.204", "0.205", "0.404", "0.405", "0.504", "0.505", "0.604", "0.605"]],
    ["US", "O3-1h", ["0.125", "0.164", "0.165", "0.204", "0.205", "0.404", "0.405", "0.604", "0.605"]],
    ["TW", "CO", ["0", "4.4", "4.5", "9.4", "9.5", "12.4", "12.5", "15.4", "15.5", "30.4", "30.5", "40.4", "40.5", "50.4", "50.5", "99.9"]],
    ["US", "CO", ["0", "4.4", "4.5", "9.4", "9.5", "12.4", "12.5", "15.4", "15.5", "30.4", "30.5", "50.4", "50.5", "99.9"]],
    ["TW", "SO2", ["0", "8", "9", "65", "66", "160", "161", "304"]],
    ["US", "SO2", ["0", "35", "36", "75", "76", "185", "186", "304"]],
    ["TW", "NO2", ["0", "21", "22", "100", "101", "360", "361", "649", "650", "1249", "1250", "1649", "1650", "2049", "2050", "9999"]],
    ["US", "NO2", ["0", "53", "54", "100", "101", "360", "361", "649", "650", "1249", "1250", "2049", "2050", "9999"]],
  ];
  for (const [system, pollutant, values] of sweeps) {
    let previous = -1;
    for (const value of values) {
      const outcome = run(concentrationInput(system, pollutant, value));
      assert.equal(outcome.ok, true, `${system} ${pollutant} ${value}`);
      const sub = outcome.result.subIndices[0].subIndex;
      assert.ok(sub >= 0 && sub <= 500, `${system} ${pollutant} ${value} -> ${sub}`);
      assert.ok(sub >= previous, `${system} ${pollutant} ${value}: ${sub} < ${previous}`);
      previous = sub;
    }
  }
});

test("grammar: AQI integers only, no leading zeros, no signs, spaces, or decimals", () => {
  for (const bad of ["1.5", "+35", "-35", " 35", "35 ", "035", "00", "1e2", "３５"]) {
    assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: bad, rows: [] }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "aqi", row: null },
    });
  }
  assert.equal(run({ mode: "aqi", system: "TW", aqi: "0", rows: [] }).ok, true);
});

test("grammar: concentrations are plain decimals, at most 6 fractional digits", () => {
  for (const bad of ["1.", ".5", "1.1234567", "007", "00.5", " 0.5", "0.5 ", "1e2", "-0.5", "+0.5", "１.5"]) {
    assert.deepEqual(run(concentrationInput("TW", "PM2.5", bad)), {
      ok: false,
      error: { code: "DECIMAL_FORMAT", field: "rows", row: 1 },
    });
  }
  // Six fractional digits are accepted; O3-8h 0.123456 -> 0.123, which
  // falls in the 201-300 band (0.106-0.200): 99/0.094 x 0.017 + 201
  // = 218.904... -> 219.
  const outcome = run(concentrationInput("TW", "O3-8h", "0.123456"));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.subIndices[0].concentration, 0.123);
  assert.equal(outcome.result.subIndices[0].subIndex, 219);
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "", rows: [] }), {
    ok: false,
    error: { code: "EMPTY", field: "aqi", row: null },
  });
  assert.deepEqual(run(concentrationInput("TW", "PM2.5", "")), {
    ok: false,
    error: { code: "EMPTY", field: "rows", row: 1 },
  });
  assert.deepEqual(run({ mode: "concentration", system: "TW", aqi: "", rows: [] }), {
    ok: false,
    error: { code: "EMPTY", field: "rows", row: null },
  });
});

test("INPUT_LIMIT is decided on the raw string before format checks", () => {
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "1234", rows: [] }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "aqi", row: null },
  });
  assert.deepEqual(run(concentrationInput("TW", "PM2.5", "12345678901")), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "rows", row: 1 },
  });
  // "35.0" is four units: capacity precedes grammar, so a decimal
  // that is also too long is INPUT_LIMIT, not INTEGER_FORMAT.
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "35.0", rows: [] }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "aqi", row: null },
  });
});

test("lone surrogates are UNICODE within the capacity", () => {
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "12\uD800", rows: [] }), {
    ok: false,
    error: { code: "UNICODE", field: "aqi", row: null },
  });
  assert.deepEqual(run(concentrationInput("TW", "PM2.5", "1\uD800")), {
    ok: false,
    error: { code: "UNICODE", field: "rows", row: 1 },
  });
});

test("ENUM for mode, system, and pollutant, in validation order", () => {
  assert.deepEqual(run({ mode: "foo", system: "TW", aqi: "35", rows: [] }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  assert.deepEqual(run({ mode: "aqi", system: "JP", aqi: "35", rows: [] }), {
    ok: false,
    error: { code: "ENUM", field: "system", row: null },
  });
  // Mode is validated before system.
  assert.deepEqual(run({ mode: "foo", system: "JP", aqi: "35", rows: [] }), {
    ok: false,
    error: { code: "ENUM", field: "mode", row: null },
  });
  assert.deepEqual(run(concentrationInput("TW", "PM1", "20.0")), {
    ok: false,
    error: { code: "ENUM", field: "rows", row: 1 },
  });
});

test("absolute ranges are RANGE, checked on the raw value", () => {
  // US truncation must not hide an over-cap raw value: 999.95 would
  // truncate to 999.9, but the raw value exceeds the 999.9 cap.
  assert.deepEqual(run(concentrationInput("US", "PM2.5", "999.95")), {
    ok: false,
    error: { code: "RANGE", field: "rows", row: 1 },
  });
  assert.deepEqual(run(concentrationInput("TW", "O3-8h", "1.001")), {
    ok: false,
    error: { code: "RANGE", field: "rows", row: 1 },
  });
  assert.deepEqual(run(concentrationInput("TW", "CO", "100")), {
    ok: false,
    error: { code: "RANGE", field: "rows", row: 1 },
  });
  assert.deepEqual(run(concentrationInput("TW", "SO2", "10000")), {
    ok: false,
    error: { code: "RANGE", field: "rows", row: 1 },
  });
  // Exactly at the cap is accepted (then capped at 500 above top).
  assert.equal(run(concentrationInput("TW", "PM2.5", "999.9")).ok, true);
  assert.equal(run(concentrationInput("TW", "O3-8h", "1.000")).ok, false); // 1.000 > 0.200: undefined
});

test("row count: 8 rows are ROW_LIMIT, checked before per-row errors", () => {
  const eight = {
    mode: "concentration",
    system: "TW",
    aqi: "",
    rows: [
      { pollutant: "PM2.5", value: "20.0" },
      { pollutant: "PM10", value: "50" },
      { pollutant: "O3-8h", value: "0.060" },
      { pollutant: "O3-1h", value: "0.120" },
      { pollutant: "CO", value: "5.0" },
      { pollutant: "SO2", value: "30" },
      { pollutant: "NO2", value: "50" },
      { pollutant: "PM2.5", value: "20.0" },
    ],
  };
  assert.deepEqual(run(eight), {
    ok: false,
    error: { code: "ROW_LIMIT", field: "rows", row: null },
  });
});

test("duplicate pollutants are DUPLICATE at the later row, after per-row validation", () => {
  assert.deepEqual(
    run({
      mode: "concentration",
      system: "TW",
      aqi: "",
      rows: [
        { pollutant: "PM2.5", value: "20.0" },
        { pollutant: "PM2.5", value: "30.0" },
      ],
    }),
    { ok: false, error: { code: "DUPLICATE", field: "rows", row: 2 } },
  );
  // A per-row error in row 2 beats a duplicate at row 3.
  assert.deepEqual(
    run({
      mode: "concentration",
      system: "TW",
      aqi: "",
      rows: [
        { pollutant: "PM2.5", value: "20.0" },
        { pollutant: "PM10", value: "bad" },
        { pollutant: "PM2.5", value: "30.0" },
      ],
    }),
    { ok: false, error: { code: "DECIMAL_FORMAT", field: "rows", row: 2 } },
  );
});

test("schema violations are SCHEMA with field and row null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("35"), schema);
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "35" }), schema);
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "35", rows: [], extra: "x" }), schema);
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: 35, rows: [] }), schema);
  assert.deepEqual(run({ mode: 1, system: "TW", aqi: "35", rows: [] }), schema);
  // Direct mode needs rows [].
  assert.deepEqual(
    run({ mode: "aqi", system: "TW", aqi: "35", rows: [{ pollutant: "PM2.5", value: "20.0" }] }),
    schema,
  );
  assert.deepEqual(run({ mode: "aqi", system: "TW", aqi: "35", rows: "x" }), schema);
  // Concentration mode needs aqi "".
  assert.deepEqual(
    run({
      mode: "concentration",
      system: "TW",
      aqi: "35",
      rows: [{ pollutant: "PM2.5", value: "20.0" }],
    }),
    schema,
  );
  assert.deepEqual(
    run({ mode: "concentration", system: "TW", aqi: "", rows: "x" }),
    schema,
  );
  // Row shape violations.
  assert.deepEqual(
    run({
      mode: "concentration",
      system: "TW",
      aqi: "",
      rows: [{ pollutant: "PM2.5" }],
    }),
    schema,
  );
  assert.deepEqual(
    run({
      mode: "concentration",
      system: "TW",
      aqi: "",
      rows: [{ pollutant: "PM2.5", value: "20.0", extra: 1 }],
    }),
    schema,
  );
  assert.deepEqual(
    run({
      mode: "concentration",
      system: "TW",
      aqi: "",
      rows: [{ pollutant: "PM2.5", value: 20 }],
    }),
    schema,
  );
  assert.deepEqual(
    run({ mode: "concentration", system: "TW", aqi: "", rows: ["PM2.5"] }),
    schema,
  );
  const withAccessor = { mode: "aqi", system: "TW", rows: [] };
  Object.defineProperty(withAccessor, "aqi", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
  const rowAccessor = {
    mode: "concentration",
    system: "TW",
    aqi: "",
    rows: [{ pollutant: "PM2.5", value: "20.0" }],
  };
  Object.defineProperty(rowAccessor.rows[0], "value", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(rowAccessor), schema);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/aqi-interpreter.mjs", import.meta.url));
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
