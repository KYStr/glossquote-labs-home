// Report serialization tests: canonical compact JSON (object keys
// sorted by UTF-16 code units, recursively; array order preserved), one
// trailing LF, exact bytes and SHA-256, and the 2,097,152-byte
// OUTPUT_LIMIT. Expected strings and hashes were written by hand from
// the SPEC's rule and the fixtures' literal results, never produced by
// the product.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/convert.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const byId = Object.fromEntries(fixtures.cases.map((entry) => [entry.id, entry]));

test("the example report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(byId["example-cup-flour-to-grams"].input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"fractionText":null,"gramsPerCup":120,"ingredient":"all-purpose-flour","unit":"g","value":120}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    "1b89c06e1595717e06645c6b10274a2cc6abfe9408490d96cdddcbbd577d1cd1",
  );
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(byId["example-cup-flour-to-grams"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"fractionText":null,"gramsPerCup":120,"ingredient":"all-purpose-flour","unit":"g","value":120}\n',
  );
});

test("a cup fraction result serializes its fraction text and hashes as pinned", () => {
  const serialized = serializeReport(byId["grams-flour-to-cup-fraction"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"fractionText":"7/8","gramsPerCup":120,"ingredient":"all-purpose-flour","unit":"cup","value":0.83}\n',
  );
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    "a2611ff6427891bcea79273ababb51893c35721d3db5692f8bd70e94357ba1cf",
  );
});

test("null table fields serialize as JSON null (max-amount fixture)", () => {
  const serialized = serializeReport(byId["max-amount-boundary"].expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"fractionText":"416 5/8","gramsPerCup":null,"ingredient":null,"unit":"cup","value":416.67}\n',
  );
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    "f52425d000fb7e30927a8d9ab4f4ebb323f71411b6714f45898b4c00f171e631",
  );
});

test("key order does not depend on insertion order", () => {
  const shuffled = {
    value: 120,
    unit: "g",
    ingredient: "all-purpose-flour",
    gramsPerCup: 120,
    fractionText: null,
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"fractionText":null,"gramsPerCup":120,"ingredient":"all-purpose-flour","unit":"g","value":120}\n',
  );
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({ value: "9".repeat(3000000) });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
