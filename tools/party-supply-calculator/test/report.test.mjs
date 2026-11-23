// Report tests. The canonical report bytes are checked against an
// independently written expectation (hand-sorted keys, one trailing LF) —
// never against the core's own serializer output for the same input.

import assert from "node:assert/strict";
import test from "node:test";

import { buildReport, run, stableStringify, REPORT_FILENAME } from "../public/js/core/core.mjs";

test("report filename is fixed", () => {
  assert.equal(REPORT_FILENAME, "party-supply-report.json");
});

test("report bytes are canonical JSON with sorted keys and one trailing LF", () => {
  const { result } = run({ guests: "20", durationHours: "3", mealType: "full" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  // Hand-written canonical form: keys sorted by UTF-16 code units.
  const expectedText =
    '{"durationFactor":1.2,"durationHours":3,"mealType":"full",' +
    '"perPerson":{"cups":2,"drinksMl":1400,"foodG":600,"iceKg":0.6,"plates":2},' +
    '"totals":{"cups":40,"drinksBottles2L":14,"drinksMl":28000,"foodG":12000,"iceKg":12,"plates":48}}\n';
  assert.equal(report.text, expectedText);
  assert.deepEqual(report.bytes, new TextEncoder().encode(expectedText));
  assert.equal(stableStringify(result), expectedText.slice(0, -1));
});

test("stableStringify sorts keys recursively and keeps array order", () => {
  assert.equal(stableStringify({ b: 1, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":1}');
  assert.equal(stableStringify({ z: [3, 1, 2], a: "x" }), '{"a":"x","z":[3,1,2]}');
  assert.equal(stableStringify(null), "null");
  assert.equal(stableStringify("a\nb"), '"a\\nb"');
});

test("largest legal result is far under the report byte limit", () => {
  const { result } = run({ guests: "500", durationHours: "12", mealType: "full" });
  const report = buildReport(result);
  assert.equal(report.ok, true);
  assert.ok(report.bytes.length < 2097152);
});
