// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/ring.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const byId = Object.fromEntries(fixtures.cases.map((entry) => [entry.id, entry]));

test("the circ-exact-row report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(byId["circ-exact-row"].input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjacentRow":null,"circumferenceMm":"51.9","deltaMm":"0.0","diameterMm":"16.5","euSize":52,"fit":"exact","jpSize":12,"nearestRow":{"circumferenceMm":"51.9","ukSize":"L½","usSize":"6"}}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(byId["circ-exact-row"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjacentRow":null,"circumferenceMm":"51.9","deltaMm":"0.0","diameterMm":"16.5","euSize":52,"fit":"exact","jpSize":12,"nearestRow":{"circumferenceMm":"51.9","ukSize":"L½","usSize":"6"}}\n',
  );
});

test("a null JP size serializes as JSON null (circ-min-boundary fixture)", () => {
  const serialized = serializeReport(byId["circ-min-boundary"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjacentRow":null,"circumferenceMm":"40.0","deltaMm":"4.2","diameterMm":"12.7","euSize":40,"fit":"between","jpSize":null,"nearestRow":{"circumferenceMm":"44.2","ukSize":"F½","usSize":"3"}}\n',
  );
});

test("a nested adjacent row serializes with its keys sorted too", () => {
  const serialized = serializeReport(byId["circ-between-sizes"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjacentRow":{"circumferenceMm":"51.9","ukSize":"L½","usSize":"6"},"circumferenceMm":"52.6","deltaMm":"0.5","diameterMm":"16.7","euSize":53,"fit":"between","jpSize":12,"nearestRow":{"circumferenceMm":"53.1","ukSize":"M½","usSize":"6.5"}}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    nearestRow: { usSize: "6", circumferenceMm: "51.9", ukSize: "L½" },
    jpSize: 12,
    fit: "exact",
    euSize: 52,
    diameterMm: "16.5",
    deltaMm: "0.0",
    circumferenceMm: "51.9",
    adjacentRow: null,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"adjacentRow":null,"circumferenceMm":"51.9","deltaMm":"0.0","diameterMm":"16.5","euSize":52,"fit":"exact","jpSize":12,"nearestRow":{"circumferenceMm":"51.9","ukSize":"L½","usSize":"6"}}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({ circumferenceMm: "9".repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
