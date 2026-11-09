// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule and the fixtures' literal
// results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/red-envelope.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.cases[0];
const EXPECTED_TEXT =
  '{"ageBand":null,"attendeeCount":1,"attending":true,"currency":"TWD","giverStage":null,"notes":["customs-vary"],"occasion":"wedding","rangeHigh":2000,"rangeLow":1200,"recommended":1600,"relationship":"colleague","tier":"restaurant","unit":"per-envelope"}\n';

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.expected.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
});

test("key order does not depend on insertion order; array order is preserved", () => {
  const shuffled = {
    unit: "per-envelope",
    tier: "restaurant",
    recommended: 1600,
    rangeLow: 1200,
    rangeHigh: 2000,
    occasion: "wedding",
    notes: ["customs-vary"],
    giverStage: null,
    currency: "TWD",
    attending: true,
    attendeeCount: 1,
    ageBand: null,
    relationship: "colleague",
  };
  const serialized = serializeReport(shuffled);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_TEXT);
  const withNotes = serializeReport({
    ...shuffled,
    notes: ["customs-vary", "extra-attendees"],
    attendeeCount: 3,
  });
  assert.equal(withNotes.ok, true);
  assert.ok(withNotes.text.includes('"notes":["customs-vary","extra-attendees"]'));
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const serialized = serializeReport({
    occasion: "wedding",
    relationship: "colleague",
    tier: "restaurant",
    giverStage: null,
    ageBand: null,
    attending: true,
    attendeeCount: 1,
    rangeLow: 1200,
    rangeHigh: 2000,
    recommended: 1600,
    currency: "TWD",
    unit: "per-envelope",
    notes: Array.from({ length: 200000 }, () => "customs-vary"),
  });
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
