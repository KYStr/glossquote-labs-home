// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/baking-pan-converter.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const upscale = fixtures.cases.find((entry) => entry.id === "table-upscale-round");
const noQuantity = fixtures.cases.find((entry) => entry.id === "no-quantity-round-span");
const bundt = fixtures.cases.find((entry) => entry.id === "bundt-nominal-to-round");

const EXPECTED_UPSCALE =
  '{"depthRelation":"same","factor":"1.27","percent":"126.6",' +
  '"scaledQuantity":{"unit":"g","value":"633.0"},' +
  '"source":{"basis":"geometric","depthCm":"5.08","kind":"table","pan":"round-8","shape":null,"volumeMl":1647},' +
  '"target":{"basis":"geometric","depthCm":"5.08","kind":"table","pan":"round-9","shape":null,"volumeMl":2085}}\n';
const EXPECTED_NO_QUANTITY =
  '{"depthRelation":"same","factor":"2.78","percent":"277.7","scaledQuantity":null,' +
  '"source":{"basis":"geometric","depthCm":"5.08","kind":"table","pan":"round-6","shape":null,"volumeMl":927},' +
  '"target":{"basis":"geometric","depthCm":"5.08","kind":"table","pan":"round-10","shape":null,"volumeMl":2574}}\n';
const EXPECTED_BUNDT =
  '{"depthRelation":"unknown","factor":"0.58","percent":"57.9",' +
  '"scaledQuantity":{"unit":"ml","value":"521.2"},' +
  '"source":{"basis":"nominal","depthCm":null,"kind":"table","pan":"bundt-10","shape":null,"volumeMl":2844},' +
  '"target":{"basis":"geometric","depthCm":"5.08","kind":"table","pan":"round-8","shape":null,"volumeMl":1647}}\n';

test("the table-upscale-round report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(upscale.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_UPSCALE);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixtures' literal result objects gives the same bytes", () => {
  assert.equal(serializeReport(upscale.expected.result).text, EXPECTED_UPSCALE);
  assert.equal(serializeReport(noQuantity.expected.result).text, EXPECTED_NO_QUANTITY);
  assert.equal(serializeReport(bundt.expected.result).text, EXPECTED_BUNDT);
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    depthRelation: "same",
    target: {
      volumeMl: 2085,
      shape: null,
      pan: "round-9",
      kind: "table",
      depthCm: "5.08",
      basis: "geometric",
    },
    source: {
      volumeMl: 1647,
      shape: null,
      pan: "round-8",
      kind: "table",
      depthCm: "5.08",
      basis: "geometric",
    },
    scaledQuantity: { value: "633.0", unit: "g" },
    percent: "126.6",
    factor: "1.27",
  };
  assert.equal(serializeReport(shuffled).text, EXPECTED_UPSCALE);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const huge = {
    depthRelation: "same",
    factor: "1.27",
    percent: "126.6",
    scaledQuantity: null,
    source: { basis: "geometric", depthCm: "5.08", kind: "table", pan: "round-8", shape: null, volumeMl: 1647 },
    target: { basis: "geometric", depthCm: "5.08", kind: "table", pan: "round-9", shape: null, volumeMl: 2085 },
    padding: "x".repeat(2097152),
  };
  const serialized = serializeReport(huge);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
