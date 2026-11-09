// Report serialization tests: bytes and SHA-256 are checked against
// literal expectations written from the SPEC (compact JSON, object
// keys sorted by UTF-16 code units, array order unchanged, one
// trailing LF, UTF-8 without BOM), not from the serializer. Nulls
// print as null; numbers print as JSON numbers.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, run } from "../public/js/core/zodiac.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const preCnyResult = fixtures.cases.find(
  (entry) => entry.id === "pre-cny-2025",
).expected.result;

const PRE_CNY_TEXT =
  '{"animalEn":"Dragon","animalIndex":4,"animalZh":"龍",' +
  '"asOfZodiacYear":null,"beforeCny":true,"branchZh":"辰",' +
  '"cnyOfBirthYear":"2025-01-29","elementEn":"Wood","elementZh":"木",' +
  '"ganzhiZh":"甲辰","isBenMingNian":null,"nextBenMingNianStart":null,' +
  '"nextBenMingNianYear":null,"spanEnd":"2025-01-28",' +
  '"spanStart":"2024-02-10","stemZh":"甲","zodiacYear":2024}\n';

test("pre-cny-2025 report bytes are the pinned compact JSON with sorted keys and one LF", () => {
  const report = buildReport(preCnyResult);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "chinese-zodiac-report.json");
  assert.equal(report.text, PRE_CNY_TEXT);
  const expectedBytes = new TextEncoder().encode(PRE_CNY_TEXT);
  assert.equal(report.byteLength, expectedBytes.byteLength);
  assert.equal(
    createHash("sha256").update(new TextEncoder().encode(report.text)).digest("hex"),
    createHash("sha256").update(expectedBytes).digest("hex"),
  );
  assert.ok(!report.text.startsWith("﻿"), "no BOM");
});

test("the report of a live run matches the same literal bytes", () => {
  const outcome = run({ birthDate: "2025-01-15", asOfDate: "" });
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, PRE_CNY_TEXT);
});

test("a Ben Ming Nian report prints the next start date inside the table", () => {
  const benMingResult = fixtures.cases.find(
    (entry) => entry.id === "benmingnian-2024",
  ).expected.result;
  const report = buildReport(benMingResult);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    '{"animalEn":"Dragon","animalIndex":4,"animalZh":"龍",' +
      '"asOfZodiacYear":2024,"beforeCny":false,"branchZh":"辰",' +
      '"cnyOfBirthYear":"2000-02-05","elementEn":"Metal","elementZh":"金",' +
      '"ganzhiZh":"庚辰","isBenMingNian":true,' +
      '"nextBenMingNianStart":"2036-01-28","nextBenMingNianYear":2036,' +
      '"spanEnd":"2001-01-23","spanStart":"2000-02-05","stemZh":"庚",' +
      '"zodiacYear":2000}\n',
  );
});

test("non-plain results are refused instead of serialized", () => {
  assert.equal(buildReport(null).ok, false);
  assert.equal(buildReport([1, 2, 3]).ok, false);
  assert.equal(buildReport("result").ok, false);
});

test("a result carrying a toJSON function is refused, never invoked", () => {
  let invoked = false;
  const hostile = {
    ...preCnyResult,
    toJSON() {
      invoked = true;
      return {};
    },
  };
  const report = buildReport(hostile);
  assert.equal(report.ok, false);
  assert.equal(invoked, false);
});
