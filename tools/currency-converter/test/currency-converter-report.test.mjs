// Report tests: the default-forward report bytes are asserted exactly
// (the expected string was written by hand from the fixture result, with
// object keys sorted by UTF-16 code units), key-order independence of the
// canonical serialization is checked, and the OUTPUT_LIMIT backstop is
// exercised with an oversized result.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/currency-converter.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const defaultForward = fixtures.cases.find((entry) => entry.id === "default-forward");
const result = run(defaultForward.input).result;

// Hand-written from the fixture result: keys sorted by UTF-16 code
// units (amountCents, convertedCents, direction, fromCode, inverseRate,
// quickTable, rateMicro, toCode), compact JSON, one trailing LF.
const EXPECTED_REPORT =
  '{"amountCents":10000,"convertedCents":315000,"direction":"a-to-b","fromCode":"USD","inverseRate":"0.031746","quickTable":[{"amountCents":100,"convertedCents":3150},{"amountCents":1000,"convertedCents":31500},{"amountCents":10000,"convertedCents":315000},{"amountCents":100000,"convertedCents":3150000}],"rateMicro":31500000,"toCode":"TWD"}\n';

test("the default-forward report bytes are exactly the canonical serialization", () => {
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(EXPECTED_REPORT).length);
  assert.equal(serialized.text.endsWith("\n"), true);
  assert.equal(serialized.text.endsWith("\n\n"), false);
});

test("serialization is independent of the result object's key order", () => {
  const shuffled = {
    toCode: result.toCode,
    rateMicro: result.rateMicro,
    quickTable: result.quickTable.map((row) => ({
      convertedCents: row.convertedCents,
      amountCents: row.amountCents,
    })),
    inverseRate: result.inverseRate,
    fromCode: result.fromCode,
    direction: result.direction,
    convertedCents: result.convertedCents,
    amountCents: result.amountCents,
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no artifact", () => {
  const oversized = { ...result, note: "x".repeat(2097152) };
  const serialized = serializeReport(oversized);
  assert.equal(serialized.ok, false);
  assert.deepEqual(serialized.error, { code: "OUTPUT_LIMIT", field: null, row: null });
  assert.equal("text" in serialized, false);
});

test("every successful fixture result serializes within the report limit", () => {
  for (const entry of fixtures.cases.filter((item) => item.kind === "core")) {
    if (entry.expected.ok !== true) continue;
    const serialized = serializeReport(entry.expected.result);
    assert.equal(serialized.ok, true, entry.id);
    assert.ok(serialized.bytes <= 2097152, entry.id);
  }
});
