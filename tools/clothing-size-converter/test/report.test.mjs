// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/clothing.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const byId = Object.fromEntries(fixtures.cases.map((entry) => [entry.id, entry]));

test("the women-measure-mid report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(byId["women-measure-mid"].input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"garment":"women","measurementCm":88,"mode":"measurement","onBoundary":false,"row":{"cmHigh":89,"cmLow":84,"euNumeric":"34","jpLetter":"S","jpNumeric":"7","row":3,"ukNumeric":"8","usLetter":"S","usNumeric":"4"},"status":"in-range"}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(byId["women-measure-mid"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"garment":"women","measurementCm":88,"mode":"measurement","onBoundary":false,"row":{"cmHigh":89,"cmLow":84,"euNumeric":"34","jpLetter":"S","jpNumeric":"7","row":3,"ukNumeric":"8","usLetter":"S","usNumeric":"4"},"status":"in-range"}\n',
  );
});

test("a null cell serializes as JSON null (women-measure-chart-min fixture)", () => {
  const serialized = serializeReport(byId["women-measure-chart-min"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"garment":"women","measurementCm":74,"mode":"measurement","onBoundary":true,"row":{"cmHigh":79,"cmLow":74,"euNumeric":"30","jpLetter":null,"jpNumeric":"3","row":1,"ukNumeric":"4","usLetter":"XXS","usNumeric":"0"},"status":"in-range"}\n',
  );
});

test("a size-mode result serializes with its keys sorted too", () => {
  const serialized = serializeReport(byId["women-size-jp-letter"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"fromSystem":"jp","garment":"women","matchedBy":"letter","mode":"size","row":{"cmHigh":104,"cmLow":99,"euNumeric":"40","jpLetter":"LL","jpNumeric":"13","row":6,"ukNumeric":"14","usLetter":"XL","usNumeric":"10"},"sizeToken":"LL"}\n',
  );
});

test("a one-decimal measurement serializes as a plain JSON number", () => {
  const serialized = serializeReport(byId["women-measure-decimal"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"garment":"women","measurementCm":88.5,"mode":"measurement","onBoundary":false,"row":{"cmHigh":89,"cmLow":84,"euNumeric":"34","jpLetter":"S","jpNumeric":"7","row":3,"ukNumeric":"8","usLetter":"S","usNumeric":"4"},"status":"in-range"}\n',
  );
});

test("an out-of-chart result has a null row in the report", () => {
  const serialized = serializeReport(byId["women-measure-above"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"garment":"women","measurementCm":116,"mode":"measurement","onBoundary":false,"row":null,"status":"above-range"}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    status: "in-range",
    row: {
      usNumeric: "4",
      ukNumeric: "8",
      row: 3,
      jpNumeric: "7",
      jpLetter: "S",
      euNumeric: "34",
      cmLow: 84,
      cmHigh: 89,
      usLetter: "S",
    },
    onBoundary: false,
    mode: "measurement",
    measurementCm: 88,
    garment: "women",
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"garment":"women","measurementCm":88,"mode":"measurement","onBoundary":false,"row":{"cmHigh":89,"cmLow":84,"euNumeric":"34","jpLetter":"S","jpNumeric":"7","row":3,"ukNumeric":"8","usLetter":"S","usNumeric":"4"},"status":"in-range"}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({ garment: "x".repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
