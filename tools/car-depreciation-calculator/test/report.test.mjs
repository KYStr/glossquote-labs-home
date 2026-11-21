// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/car-depreciation.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"currentValue":443705,"floorReachedYear":null,"floorValue":100000,"method":"declining","schedule":[{"depreciation":150000,"endValue":850000,"floored":false,"ratePercent":"15.00","year":1},{"depreciation":127500,"endValue":722500,"floored":false,"ratePercent":"15.00","year":2},{"depreciation":108375,"endValue":614125,"floored":false,"ratePercent":"15.00","year":3},{"depreciation":92119,"endValue":522006,"floored":false,"ratePercent":"15.00","year":4},{"depreciation":78301,"endValue":443705,"floored":false,"ratePercent":"15.00","year":5}],"totalDepreciation":556295,"totalDepreciationPercent":"55.63"}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"currentValue":443705,"floorReachedYear":null,"floorValue":100000,"method":"declining","schedule":[{"depreciation":150000,"endValue":850000,"floored":false,"ratePercent":"15.00","year":1},{"depreciation":127500,"endValue":722500,"floored":false,"ratePercent":"15.00","year":2},{"depreciation":108375,"endValue":614125,"floored":false,"ratePercent":"15.00","year":3},{"depreciation":92119,"endValue":522006,"floored":false,"ratePercent":"15.00","year":4},{"depreciation":78301,"endValue":443705,"floored":false,"ratePercent":"15.00","year":5}],"totalDepreciation":556295,"totalDepreciationPercent":"55.63"}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    totalDepreciationPercent: "55.63",
    totalDepreciation: 556295,
    schedule: [
      { year: 1, floored: false, endValue: 850000, depreciation: 150000, ratePercent: "15.00" },
      { year: 2, floored: false, endValue: 722500, depreciation: 127500, ratePercent: "15.00" },
      { year: 3, floored: false, endValue: 614125, depreciation: 108375, ratePercent: "15.00" },
      { year: 4, floored: false, endValue: 522006, depreciation: 92119, ratePercent: "15.00" },
      { year: 5, floored: false, endValue: 443705, depreciation: 78301, ratePercent: "15.00" },
    ],
    method: "declining",
    floorValue: 100000,
    floorReachedYear: null,
    currentValue: 443705,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"currentValue":443705,"floorReachedYear":null,"floorValue":100000,"method":"declining","schedule":[{"depreciation":150000,"endValue":850000,"floored":false,"ratePercent":"15.00","year":1},{"depreciation":127500,"endValue":722500,"floored":false,"ratePercent":"15.00","year":2},{"depreciation":108375,"endValue":614125,"floored":false,"ratePercent":"15.00","year":3},{"depreciation":92119,"endValue":522006,"floored":false,"ratePercent":"15.00","year":4},{"depreciation":78301,"endValue":443705,"floored":false,"ratePercent":"15.00","year":5}],"totalDepreciation":556295,"totalDepreciationPercent":"55.63"}\n',
  );
});

test("a straight-line result serializes with a null ratePercent", () => {
  const outcome = run({
    method: "straight",
    price: "900000",
    years: "1",
    salvagePercent: "10",
    usefulLife: "10",
  });
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"currentValue":819000,"floorReachedYear":null,"floorValue":90000,"method":"straight","schedule":[{"depreciation":81000,"endValue":819000,"floored":false,"ratePercent":null,"year":1}],"totalDepreciation":81000,"totalDepreciationPercent":"9.00"}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const schedule = [];
  for (let i = 0; i < 30000; i += 1) {
    schedule.push({ year: 1, ratePercent: "15.00", depreciation: 150000, endValue: 850000, floored: false });
  }
  const serialized = serializeReport({
    method: "declining",
    floorValue: 100000,
    currentValue: 443705,
    totalDepreciation: 556295,
    totalDepreciationPercent: "55.63",
    floorReachedYear: null,
    schedule,
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
