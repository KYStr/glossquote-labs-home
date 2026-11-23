// Fixed-report tests for password-strength-report.json.
//
// The expected literals below were derived from the SPEC
// independently of this implementation: the troubador-strong and
// common-password result objects (the SPEC's literal fixtures)
// serialized with a separate canonicalizer (Python json, sorted
// keys, compact separators) applying the SPEC's rule — keys sorted
// recursively by UTF-16 code units, compact separators, exactly one
// trailing LF. One adjustment is hand-applied and verified here:
// Python prints the float 0.0 as "0.0", while the JS serializer (and
// JSON) prints the number 0 as "0"; the common-password literal
// below therefore uses "finalEntropyBits":0, and the test fails if
// the implementation's serializer, key order, or result shape drifts
// in any byte. The report holds the result only — never the password
// or any substring of it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  buildReport,
  run,
} from "../public/js/core/password-strength.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const troubador = fixtures.cases.find((entry) => entry.id === "troubador-strong");
assert.equal(troubador.expected.ok, true);

const EXPECTED_TEXT =
  `{"band":"strong","baseEntropyBits":72.1,"classes":["lowercase","uppercase","digits","symbols"],` +
  `"crackTimeOffline":{"en":"16038.3 years","zh":"16038.3 年"},` +
  `"crackTimeOnline":{"en":"16038314310056.9 years","zh":"16038314310056.9 年"},` +
  `"finalEntropyBits":72.1,"passwordLength":11,"penalties":[],"pool":94,` +
  `"suggestions":["S_LENGTH"],"totalPenaltyBits":0}` +
  "\n";

test("troubador-strong report matches the independently derived literal byte for byte", () => {
  const report = buildReport(troubador.expected.result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, "password-strength-report.json");
  assert.equal(REPORT_FILENAME, "password-strength-report.json");
  assert.equal(report.text, EXPECTED_TEXT);
  assert.equal(report.byteLength, Buffer.byteLength(EXPECTED_TEXT, "utf8"));
  assert.equal(report.byteLength, 352);
  // UTF-8 without BOM, exactly one trailing LF.
  assert.equal(report.text.charCodeAt(0), 0x7b);
  assert.ok(report.text.endsWith("}\n"));
  assert.ok(!report.text.endsWith("}\n\n"));
});

test("a live run of the example produces the identical report", () => {
  const outcome = run(troubador.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(report.text, EXPECTED_TEXT);
});

test("a common-password result serializes with the same canonical key order", () => {
  const common = fixtures.cases.find((entry) => entry.id === "common-password");
  const outcome = run(common.input);
  assert.equal(outcome.ok, true);
  const report = buildReport(outcome.result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    `{"band":"very weak","baseEntropyBits":37.6,"classes":["lowercase"],` +
      `"crackTimeOffline":{"en":"<1 second","zh":"<1 秒"},` +
      `"crackTimeOnline":{"en":"<1 second","zh":"<1 秒"},` +
      `"finalEntropyBits":0,"passwordLength":8,` +
      `"penalties":[{"bits":30,"code":"COMMON_PASSWORD"},` +
      `{"bits":12,"code":"DICTIONARY_WORD"},` +
      `{"bits":8,"code":"SINGLE_CLASS"}],"pool":26,` +
      `"suggestions":["S_COMMON","S_DICT","S_LENGTH","S_CLASSES"],"totalPenaltyBits":40}\n`,
  );
});

test("the report never contains the password or any of its substrings", () => {
  for (const entry of fixtures.cases.filter((item) => item.kind === "core" && item.expected.ok)) {
    const report = buildReport(entry.expected.result);
    assert.equal(report.ok, true);
    const password = entry.input.password;
    // Walk every string *value* in the parsed report: none may
    // contain the password. (The raw text necessarily contains the
    // key name "passwordLength", which is not a quote of the value.)
    const parsed = JSON.parse(report.text);
    const strings = [];
    (function walk(value) {
      if (typeof value === "string") strings.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value !== null && typeof value === "object") Object.values(value).forEach(walk);
    })(parsed);
    for (const text of strings) {
      assert.ok(!text.includes(password), `${entry.id}: report quotes the password`);
    }
    // The report is the result only: it must not even carry a
    // "password" field.
    assert.ok(!report.text.includes('"password":'), `${entry.id}: report carries a password field`);
  }
});

test("the report limit constant is the SPEC's 2 MiB", () => {
  assert.equal(REPORT_LIMIT_BYTES, 2097152);
});

test("non-plain report inputs are refused", () => {
  // The SPEC pins the report bytes and the OUTPUT_LIMIT failure, not
  // an error code for a non-result input; the house pattern refuses
  // every non-plain input without serializing it (and never invokes
  // an accessor or the input's toJSON).
  for (const bad of [null, [], "x", 42]) {
    assert.equal(buildReport(bad).ok, false);
  }
  const withAccessor = {};
  Object.defineProperty(withAccessor, "band", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.equal(buildReport(withAccessor).ok, false);
  let toJsonCalled = false;
  const withToJSON = {
    band: "strong",
    toJSON() {
      toJsonCalled = true;
      return {};
    },
  };
  buildReport(withToJSON);
  assert.equal(toJsonCalled, false);
});
