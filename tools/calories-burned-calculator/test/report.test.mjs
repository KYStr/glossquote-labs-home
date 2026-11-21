// Report serialization tests: canonical compact JSON (object keys sorted
// by UTF-16 code units, recursively; array order preserved), one trailing
// LF, exact bytes, and the 2,097,152-byte OUTPUT_LIMIT. Expected strings
// were written by hand from the SPEC's rule (§3.3) and the fixtures'
// literal results, never produced by the product.

import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_BYTE_LIMIT, REPORT_FILENAME, serializeReport } from "../public/js/core/report.mjs";
import { run } from "../public/js/core/calculate.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const firstCase = fixtures.find((entry) => entry.id === "single-walking-moderate");
const compareCase = fixtures.find((entry) => entry.id === "compare-three");
const fractionalCase = fixtures.find((entry) => entry.id === "fractional-inputs");

const EXPECTED_FIRST_REPORT =
  '{"activities":["walking-moderate"],"durationMinutes":"30","rows":[{"activityId":"walking-moderate","code":"17190","kcal":114,"met":"3.8"}],"tool":"calories-burned-calculator","totalKcal":114,"version":1,"weight":"60"}\n';

const EXPECTED_COMPARE_REPORT =
  '{"activities":["walking-brisk","jogging-general","bicycling-moderate"],"durationMinutes":"60","rows":[' +
  '{"activityId":"walking-brisk","code":"17200","kcal":336,"met":"4.8"},' +
  '{"activityId":"jogging-general","code":"12020","kcal":525,"met":"7.5"},' +
  '{"activityId":"bicycling-moderate","code":"01030","kcal":560,"met":"8.0"}],' +
  '"tool":"calories-burned-calculator","totalKcal":1421,"version":1,"weight":"70"}\n';

test("the first fixture's report is canonical compact JSON with one trailing LF", () => {
  const outcome = run(firstCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(firstCase.input, outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_FIRST_REPORT);
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
  assert.ok(serialized.text.endsWith("}\n"));
  assert.equal(serialized.text.endsWith("}\n\n"), false);
});

test("serializing the fixture's literal result object gives the same bytes", () => {
  const serialized = serializeReport(firstCase.input, firstCase.expected);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_FIRST_REPORT);
});

test("the compare fixture's report keeps activity order and the summed total", () => {
  const outcome = run(compareCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(compareCase.input, outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_COMPARE_REPORT);
});

test("accepted raw strings are preserved verbatim (no number coercion)", () => {
  const outcome = run(fractionalCase.input);
  assert.equal(outcome.ok, true);
  const serialized = serializeReport(fractionalCase.input, outcome.result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"activities":["swimming-laps-slow"],"durationMinutes":"45.5","rows":[{"activityId":"swimming-laps-slow","code":"18240","kcal":275,"met":"5.8"}],"tool":"calories-burned-calculator","totalKcal":275,"version":1,"weight":"62.5"}\n',
  );
});

test("key order does not depend on insertion order", () => {
  const shuffledInput = { activities: ["walking-moderate"], durationMinutes: "30", weight: "60" };
  const shuffledResult = {
    totalKcal: 114,
    rows: [{ kcal: 114, met: "3.8", code: "17190", activityId: "walking-moderate" }],
  };
  const serialized = serializeReport(shuffledInput, shuffledResult);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, EXPECTED_FIRST_REPORT);
});

test("serializing twice gives identical bytes", () => {
  const outcome = run(compareCase.input);
  assert.equal(outcome.ok, true);
  const first = serializeReport(compareCase.input, outcome.result);
  const second = serializeReport(compareCase.input, outcome.result);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.text, second.text);
  assert.equal(first.bytes, second.bytes);
});

test("report constants: filename and 2 MiB limit", () => {
  assert.equal(REPORT_FILENAME, "calories-burned-report.json");
  assert.equal(REPORT_BYTE_LIMIT, 2097152);
});

test("an oversized result is OUTPUT_LIMIT and produces no text", () => {
  const rows = [];
  for (let i = 0; i < 100000; i += 1) {
    rows.push({ activityId: "walking-moderate", code: "17190", met: "3.8", kcal: 114 });
  }
  const serialized = serializeReport(
    { weight: "60", durationMinutes: "30", activities: ["walking-moderate"] },
    { rows, totalKcal: 11400000 },
  );
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
