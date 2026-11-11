// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product. Note the SPEC's rule that a
// one-decimal number such as 20.0 serializes as the JSON number 20.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/dew-point.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const saturatedCase = fixtures.cases.find((entry) => entry.id === "saturated-exact");

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"absoluteHumidityGm3":13.8,"comfortBand":"slightly-humid","dewPointC":16.7}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"absoluteHumidityGm3":13.8,"comfortBand":"slightly-humid","dewPointC":16.7}\n',
  );
});

test("a whole-number dew point serializes without a decimal point (20.0 as 20)", () => {
  const serialized = serializeReport(saturatedCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"absoluteHumidityGm3":17.3,"comfortBand":"humid","dewPointC":20}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    dewPointC: 16.7,
    comfortBand: "slightly-humid",
    absoluteHumidityGm3: 13.8,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"absoluteHumidityGm3":13.8,"comfortBand":"slightly-humid","dewPointC":16.7}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({
    dewPointC: 16.7,
    absoluteHumidityGm3: 13.8,
    comfortBand: "x".repeat(2097152),
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
