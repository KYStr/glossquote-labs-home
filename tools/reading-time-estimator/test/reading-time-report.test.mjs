// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/reading-time.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const zhBasic = fixtures.cases.find((entry) => entry.id === "zh-basic");
const mixed = fixtures.cases.find((entry) => entry.id === "mixed-sum-rounding");
const hours = fixtures.cases.find((entry) => entry.id === "hours-format");

// Hand-derived: keys sorted by UTF-16 code units:
// cjkChars < latinWords < silentDisplay < silentSeconds < speakDisplay
// < speakSeconds ("D" U+0044 sorts before "S" U+0053).
const EXPECTED_ZH_BASIC =
  '{"cjkChars":6,"latinWords":0,"silentDisplay":"0:01","silentSeconds":1,"speakDisplay":"0:02","speakSeconds":2}\n';
const EXPECTED_MIXED =
  '{"cjkChars":5,"latinWords":2,"silentDisplay":"0:01","silentSeconds":1,"speakDisplay":"0:02","speakSeconds":2}\n';
const EXPECTED_HOURS =
  '{"cjkChars":3000,"latinWords":0,"silentDisplay":"1:00:00","silentSeconds":3600,"speakDisplay":"12:30","speakSeconds":750}\n';

test("the zh-basic report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(zhBasic.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_ZH_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(zhBasic.expected.result).text, EXPECTED_ZH_BASIC);
  assert.equal(serializeReport(mixed.expected.result).text, EXPECTED_MIXED);
  assert.equal(serializeReport(hours.expected.result).text, EXPECTED_HOURS);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    speakSeconds: 2,
    silentDisplay: "0:01",
    cjkChars: 6,
    speakDisplay: "0:02",
    silentSeconds: 1,
    latinWords: 0,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_ZH_BASIC);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    cjkChars: 6,
    latinWords: 0,
    silentSeconds: 1,
    speakSeconds: 2,
    silentDisplay: "0:01",
    speakDisplay: "0:02",
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
