// Fixed-report tests for school-entry-year-report.json.
//
// The expected literal below was derived from the SPEC independently
// of this implementation: the sep1-exact result object (the SPEC's
// literal fixture) serialized with a separate canonicalizer applying
// the SPEC's rule — keys sorted recursively by UTF-16 code units,
// arrays in order, compact separators, exactly one trailing LF. The
// test fails if the implementation's serializer, key order, or result
// shape drifts in any byte.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/school-entry.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const sep1 = fixtures.cases.find((entry) => entry.id === "sep1-exact");
assert.equal(sep1.expected.ok, true);

const EXPECTED_TEXT = `{"asOfDate":"2026-10-15","birthDate":"2019-09-01","current":{"ageAtStartYears":7,"aliasZh":null,"band":null,"gradeIndex":2,"nameEn":"Elementary School Grade 2","nameZh":"國小二年級","schoolYearRoc":115,"schoolYearStartYear":2026,"stage":"elementary","stageGrade":2},"entry":{"ageMonths":0,"ageYears":6,"month":9,"rocYear":114,"septemberYear":2025},"kindergarten":[{"band":"toddler","nameEn":"Toddler Class","nameZh":"幼幼班","rocYear":110,"septemberYear":2021},{"band":"junior","nameEn":"Kindergarten Junior Class","nameZh":"小班","rocYear":111,"septemberYear":2022},{"band":"middle","nameEn":"Kindergarten Middle Class","nameZh":"中班","rocYear":112,"septemberYear":2023},{"band":"senior","nameEn":"Kindergarten Senior Class","nameZh":"大班","rocYear":113,"septemberYear":2024}],"projection":[{"aliasZh":null,"gradeIndex":1,"nameEn":"Elementary School Grade 1","nameZh":"國小一年級","rocYear":114,"septemberYear":2025,"spanEnd":"2026-08-31","spanStart":"2025-09-01","stage":"elementary","stageGrade":1},{"aliasZh":null,"gradeIndex":2,"nameEn":"Elementary School Grade 2","nameZh":"國小二年級","rocYear":115,"septemberYear":2026,"spanEnd":"2027-08-31","spanStart":"2026-09-01","stage":"elementary","stageGrade":2},{"aliasZh":null,"gradeIndex":3,"nameEn":"Elementary School Grade 3","nameZh":"國小三年級","rocYear":116,"septemberYear":2027,"spanEnd":"2028-08-31","spanStart":"2027-09-01","stage":"elementary","stageGrade":3},{"aliasZh":null,"gradeIndex":4,"nameEn":"Elementary School Grade 4","nameZh":"國小四年級","rocYear":117,"septemberYear":2028,"spanEnd":"2029-08-31","spanStart":"2028-09-01","stage":"elementary","stageGrade":4},{"aliasZh":null,"gradeIndex":5,"nameEn":"Elementary School Grade 5","nameZh":"國小五年級","rocYear":118,"septemberYear":2029,"spanEnd":"2030-08-31","spanStart":"2029-09-01","stage":"elementary","stageGrade":5},{"aliasZh":null,"gradeIndex":6,"nameEn":"Elementary School Grade 6","nameZh":"國小六年級","rocYear":119,"septemberYear":2030,"spanEnd":"2031-08-31","spanStart":"2030-09-01","stage":"elementary","stageGrade":6},{"aliasZh":"國一","gradeIndex":7,"nameEn":"Junior High School Grade 1","nameZh":"國中一年級","rocYear":120,"septemberYear":2031,"spanEnd":"2032-08-31","spanStart":"2031-09-01","stage":"juniorHigh","stageGrade":1},{"aliasZh":"國二","gradeIndex":8,"nameEn":"Junior High School Grade 2","nameZh":"國中二年級","rocYear":121,"septemberYear":2032,"spanEnd":"2033-08-31","spanStart":"2032-09-01","stage":"juniorHigh","stageGrade":2},{"aliasZh":"國三","gradeIndex":9,"nameEn":"Junior High School Grade 3","nameZh":"國中三年級","rocYear":122,"septemberYear":2033,"spanEnd":"2034-08-31","spanStart":"2033-09-01","stage":"juniorHigh","stageGrade":3},{"aliasZh":"高一","gradeIndex":10,"nameEn":"Senior High School Grade 1","nameZh":"高中一年級","rocYear":123,"septemberYear":2034,"spanEnd":"2035-08-31","spanStart":"2034-09-01","stage":"seniorHigh","stageGrade":1},{"aliasZh":"高二","gradeIndex":11,"nameEn":"Senior High School Grade 2","nameZh":"高中二年級","rocYear":124,"septemberYear":2035,"spanEnd":"2036-08-31","spanStart":"2035-09-01","stage":"seniorHigh","stageGrade":2},{"aliasZh":"高三","gradeIndex":12,"nameEn":"Senior High School Grade 3","nameZh":"高中三年級","rocYear":125,"septemberYear":2036,"spanEnd":"2037-08-31","spanStart":"2036-09-01","stage":"seniorHigh","stageGrade":3}]}` + "\n";

test("sep1-exact report matches the independently derived literal byte for byte", () => {
  const report = buildReport(sep1.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "school-entry-year-report.json");
  assert.equal(REPORT_FILENAME, "school-entry-year-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 3423);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(sep1.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
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
  Object.defineProperty(withAccessor, "entry", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    entry: 1,
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
