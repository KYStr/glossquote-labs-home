// Fixed-report tests for aqi-interpreter-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the aqi-direct-good and
// pm25-tw-20 results (the SPEC's literal fixtures) serialized with
// a separate canonicalizer (Python json, sorted keys, compact
// separators) applying the SPEC's rule — keys sorted recursively by
// UTF-16 code units, compact separators, exactly one trailing LF.
// The test fails if the implementation's serializer, key order, or
// result shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/aqi-interpreter.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const directGood = fixtures.cases.find((entry) => entry.id === "aqi-direct-good");
assert.equal(directGood.expected.ok, true);
const pm25Tw20 = fixtures.cases.find((entry) => entry.id === "pm25-tw-20");
assert.equal(pm25Tw20.expected.ok, true);

const EXPECTED_DIRECT_GOOD =
  `{"adviceGeneral":"正常戶外活動。","adviceSensitive":"正常戶外活動。","aqi":35,"color":"green","colorZh":"綠","dominantPollutant":null,"healthImpact":"空氣品質為良好，污染程度低或無污染。","hex":"#00E400","level":"good","levelEn":"Good","levelZh":"良好","mode":"aqi","notices":[],"subIndices":[],"system":"TW"}` +
  "\n";

const EXPECTED_PM25_TW_20 =
  `{"adviceGeneral":"正常戶外活動。","adviceSensitive":"極特殊敏感族群建議注意可能產生的咳嗽或呼吸急促症狀，但仍可正常戶外活動。","aqi":72,"color":"yellow","colorZh":"黃","dominantPollutant":"PM2.5","healthImpact":"空氣品質普通；但對非常少數之極敏感族群產生輕微影響。","hex":"#FFFF00","level":"moderate","levelEn":"Moderate","levelZh":"普通","mode":"concentration","notices":[],"subIndices":[{"concentration":20,"level":"moderate","pollutant":"PM2.5","subIndex":72}],"system":"TW"}` +
  "\n";

test("aqi-direct-good report matches the independently derived literal byte for byte", () => {
  const report = buildReport(directGood.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "aqi-interpreter-report.json");
  assert.equal(REPORT_FILENAME, "aqi-interpreter-report.json");
  assert.equal(report.text, EXPECTED_DIRECT_GOOD);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_DIRECT_GOOD, "utf8"));
  assert.equal(report.byteLength, 345);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(directGood.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_DIRECT_GOOD);
});

test("pm25-tw-20 report matches the independently derived literal byte for byte", () => {
  const report = buildReport(pm25Tw20.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_PM25_TW_20);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_PM25_TW_20, "utf8"));
  // 551, not the Python canonicalizer's 553: Python prints the
  // concentration as 20.0 while the JS serializer prints 20.
  assert.equal(report.byteLength, 551);
});

test("a live run of pm25-tw-20 produces the identical report", () => {
  const outcome = run(pm25Tw20.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_PM25_TW_20);
});

test("a hazardous result with notices serializes with the same canonical key order", () => {
  const outcome = run({
    mode: "concentration",
    system: "TW",
    aqi: "",
    rows: [{ pollutant: "PM2.5", value: "600" }],
  });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"adviceGeneral":"1.一般民眾應避免戶外活動，室內應緊閉門窗，必要外出應配戴口罩等防護用具。2.學生應立即停止戶外活動，並將課程調整於室內進行。","adviceSensitive":"1.有心臟、呼吸道及心血管疾病患者、孩童及老年人應留在室內並避免體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人應增加使用吸入劑的頻率。","aqi":500,"color":"maroon","colorZh":"褐紅","dominantPollutant":"PM2.5","healthImpact":"健康威脅達到緊急，所有人都可能受到影響。","hex":"#7E0023","level":"hazardous","levelEn":"Hazardous","levelZh":"危害","mode":"concentration","notices":[{"code":"ABOVE_TABLE_TOP","pollutant":"PM2.5"}],"subIndices":[{"concentration":600,"level":"hazardous","pollutant":"PM2.5","subIndex":500}],"system":"TW"}\n`,
  );
  assert.equal(report.byteLength, 839);
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("non-plain report inputs are refused", () => {
  // The SPEC pins the report bytes and the OUTPUT_LIMIT failure, not
  // an error code for a non-result input; the house pattern refuses
  // every non-plain input without serializing it (and never invokes
  // an accessor or the input's toJSON).
  for (const bad of [null, [], "x", 42]) {
    assert.equal(buildReport(bad).ok, false);
  }
  const withAccessor = {};
  Object.defineProperty(withAccessor, "aqi", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    aqi: 35,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
