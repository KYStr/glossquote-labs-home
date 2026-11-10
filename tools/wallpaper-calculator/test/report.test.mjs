// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/wallpaper.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const BASIC_REPORT =
  '{"grossWallAreaM2":"30.00","netWallAreaM2":"30.00","openingsAreaM2":"0.00","rolls":8,"strips":23,"stripsWithWaste":23,"walls":[{"dropsPerRoll":3,"effectiveWidthCm":1200,"index":1,"openingsWidthCm":0,"rolls":8,"stripLengthCm":260,"strips":23,"stripsWithWaste":23,"widthCm":1200}]}\n';

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, BASIC_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, BASIC_REPORT);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    rolls: 8,
    walls: [
      {
        rolls: 8,
        widthCm: 1200,
        strips: 23,
        index: 1,
        stripLengthCm: 260,
        openingsWidthCm: 0,
        effectiveWidthCm: 1200,
        dropsPerRoll: 3,
        stripsWithWaste: 23,
      },
    ],
    netWallAreaM2: "30.00",
    strips: 23,
    grossWallAreaM2: "30.00",
    stripsWithWaste: 23,
    openingsAreaM2: "0.00",
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, BASIC_REPORT);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const walls = [];
  for (let i = 0; i < 100000; i += 1) {
    walls.push({
      index: i + 1,
      widthCm: 1200,
      openingsWidthCm: 0,
      effectiveWidthCm: 1200,
      strips: 23,
      stripLengthCm: 260,
      dropsPerRoll: 3,
      stripsWithWaste: 23,
      rolls: 8,
    });
  }
  const serialized = serializeReport({
    walls,
    strips: 23,
    stripsWithWaste: 23,
    rolls: 8,
    grossWallAreaM2: "30.00",
    openingsAreaM2: "0.00",
    netWallAreaM2: "30.00",
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
