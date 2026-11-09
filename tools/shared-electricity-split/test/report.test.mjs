// Report serialization tests: canonical compact JSON (object keys
// sorted by UTF-16 code units, recursively; array order preserved), one
// trailing LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. The
// expected strings below were written by hand from the SPEC's rule and
// the vendored fixture result, never produced by the product code.

import assert from "node:assert/strict";
import test from "node:test";
import { serializeReport } from "../public/js/core/split.mjs";
import fixtures from "./fixtures.mjs";

const basicResult = fixtures.cases.find((entry) => entry.id === "proportional-basic").expected
  .result;

const EXPECTED_BASIC =
  '{"commonTenths":null,"equalSplitFallback":false,"rooms":[' +
  '{"amountTwd":1800,"billableTenths":1200,"commonShareTenths":null,"name":"101房","sharePercentTenths":600,"usageTenths":1200},' +
  '{"amountTwd":900,"billableTenths":600,"commonShareTenths":null,"name":"102房","sharePercentTenths":300,"usageTenths":600},' +
  '{"amountTwd":300,"billableTenths":200,"commonShareTenths":null,"name":"103房","sharePercentTenths":100,"usageTenths":200}' +
  '],"totalAmountTwd":3000,"totalDeltaTenths":null,"totalUsageTenths":2000}\n';

test("proportional-basic report is canonical compact JSON with one trailing LF", () => {
  const serialized = serializeReport(basicResult);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_BASIC);
  assert.equal(serialized.bytes, new TextEncoder().encode(EXPECTED_BASIC).length);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    totalUsageTenths: 2000,
    totalDeltaTenths: null,
    totalAmountTwd: 3000,
    equalSplitFallback: false,
    commonTenths: null,
    rooms: basicResult.rooms.map((room) => ({
      usageTenths: room.usageTenths,
      sharePercentTenths: room.sharePercentTenths,
      name: room.name,
      commonShareTenths: room.commonShareTenths,
      billableTenths: room.billableTenths,
      amountTwd: room.amountTwd,
    })),
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_BASIC);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const rooms = [];
  for (let i = 0; i < 30000; i += 1) {
    rooms.push({
      name: `房${"x".repeat(96)}${i}`,
      usageTenths: 1,
      commonShareTenths: null,
      billableTenths: 1,
      sharePercentTenths: 0,
      amountTwd: 0,
    });
  }
  const serialized = serializeReport({
    rooms,
    totalUsageTenths: 30000,
    commonTenths: null,
    totalDeltaTenths: null,
    totalAmountTwd: 0,
    equalSplitFallback: false,
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
