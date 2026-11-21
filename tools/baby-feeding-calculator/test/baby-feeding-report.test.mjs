// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/baby-feeding.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const typical = fixtures.cases.find((entry) => entry.id === "typical-4kg-8feeds");
const tie = fixtures.cases.find((entry) => entry.id === "remainder-split-half-up-tie");
const newborn = fixtures.cases.find((entry) => entry.id === "age-newborn-notice");

const EXPECTED_TYPICAL =
  '{"ageMonths":null,"dailyTotalMl":600,"factorMlPerKgDay":150,"feedsPerDay":8,"notices":[],"perFeedAverageMl":75,"perFeedMl":[75,75,75,75,75,75,75,75],"weightKg":4}\n';
const EXPECTED_TIE =
  '{"ageMonths":null,"dailyTotalMl":683,"factorMlPerKgDay":150,"feedsPerDay":7,"notices":[],"perFeedAverageMl":97.6,"perFeedMl":[98,98,98,98,97,97,97],"weightKg":4.55}\n';
const EXPECTED_NEWBORN =
  '{"ageMonths":0,"dailyTotalMl":525,"factorMlPerKgDay":150,"feedsPerDay":8,"notices":["early-newborn-amounts-differ"],"perFeedAverageMl":65.6,"perFeedMl":[66,66,66,66,66,65,65,65],"weightKg":3.5}\n';

test("the typical-4kg-8feeds report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(typical.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TYPICAL);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(typical.expected.result).text, EXPECTED_TYPICAL);
  assert.equal(serializeReport(tie.expected.result).text, EXPECTED_TIE);
  assert.equal(serializeReport(newborn.expected.result).text, EXPECTED_NEWBORN);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    weightKg: 4,
    perFeedMl: [75, 75, 75, 75, 75, 75, 75, 75],
    notices: [],
    dailyTotalMl: 600,
    perFeedAverageMl: 75,
    feedsPerDay: 8,
    factorMlPerKgDay: 150,
    ageMonths: null,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_TYPICAL);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    ...typical.expected.result,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
