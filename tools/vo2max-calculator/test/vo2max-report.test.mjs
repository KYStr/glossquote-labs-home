// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/vo2max.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const cooperBasic = fixtures.find((entry) => entry.id === "cooper-basic");
const classified = fixtures.find((entry) => entry.id === "cooper-classified-superior");
const mileTie = fixtures.find((entry) => entry.id === "mile-tie-half-up");

const EXPECTED_COOPER_BASIC =
  '{"classification":null,"distanceMeters":2400,"test":"cooper12","vo2max":42.4}\n';
const EXPECTED_CLASSIFIED =
  '{"classification":{"ageBand":"30-39","category":"superior","sex":"male"},' +
  '"distanceMeters":2800,"test":"cooper12","vo2max":51.3}\n';
const EXPECTED_MILE_TIE =
  '{"classification":null,"test":"mile15","timeSeconds":720,"vo2max":43.8}\n';

test("the cooper-basic report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(cooperBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_COOPER_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(cooperBasic.expected.result).text, EXPECTED_COOPER_BASIC);
  assert.equal(serializeReport(classified.expected.result).text, EXPECTED_CLASSIFIED);
  assert.equal(serializeReport(mileTie.expected.result).text, EXPECTED_MILE_TIE);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    vo2max: 42.4,
    test: "cooper12",
    distanceMeters: 2400,
    classification: null,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_COOPER_BASIC);
  const shuffledClassified = {
    vo2max: 51.3,
    classification: { category: "superior", sex: "male", ageBand: "30-39" },
    test: "cooper12",
    distanceMeters: 2800,
  };
  assert.equal(serializeReport(shuffledClassified).text, EXPECTED_CLASSIFIED);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    test: "cooper12",
    distanceMeters: 2400,
    vo2max: 42.4,
    classification: null,
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
