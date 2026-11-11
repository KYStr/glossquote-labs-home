// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { REPORT_FILENAME, run, serializeReport } from "../public/js/core/wallpaper.mjs";
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

// Literal canonical reports from the fixed PR #299 specification.
const openingReports = [
  {
    id: "openings-list-deduction",
    text: '{"grossWallAreaM2":"30.00","netWallAreaM2":"26.31","openingsAreaM2":"3.69","rolls":8,"strips":23,"stripsWithWaste":23,"walls":[{"dropsPerRoll":3,"effectiveWidthCm":1200,"index":1,"openingsWidthCm":240,"rolls":8,"stripLengthCm":260,"strips":23,"stripsWithWaste":23,"widthCm":1200}]}\n',
    bytes: 282,
    sha256: "3facdec2e1314b5bd4272078dec67888a1e859dfa20e599bf15213b58d020131",
  },
  {
    id: "partial-height-opening-full-strips",
    text: '{"grossWallAreaM2":"7.95","netWallAreaM2":"6.04","openingsAreaM2":"1.91","rolls":2,"strips":6,"stripsWithWaste":6,"walls":[{"dropsPerRoll":3,"effectiveWidthCm":318,"index":1,"openingsWidthCm":159,"rolls":2,"stripLengthCm":260,"strips":6,"stripsWithWaste":6,"widthCm":318}]}\n',
    bytes: 274,
    sha256: "0d1185f13fcc13cf89e3f96e35fd6485ad062d88f112a1a0a04ffee6a8a73d8f",
  },
];
for (const expected of openingReports) {
  test("canonical opening report: " + expected.id, () => {
    const fixture = fixtures.cases.find((entry) => entry.id === expected.id);
    const outcome = run(fixture.input);
    assert.equal(outcome.ok, true);
    const report = serializeReport(outcome.result);
    assert.equal(REPORT_FILENAME, "wallpaper-report.json");
    assert.equal(report.ok, true);
    assert.equal(report.text, expected.text);
    assert.equal(report.bytes, expected.bytes);
    assert.equal(createHash("sha256").update(report.text, "utf8").digest("hex"), expected.sha256);
  });
}

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
