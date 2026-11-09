import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildReport, REPORT_FILENAME } from "../public/js/core/blood.mjs";

// Expected report bytes are hand-written canonical JSON (keys sorted in
// UTF-16 code-unit order, compact separators, one trailing LF) for fixture
// results — not captured from the implementation's output.
const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const coreById = new Map(
  fixtures.cases.filter((entry) => entry.kind === "core").map((entry) => [entry.id, entry]),
);

test("single-mode report is the canonical serialization of the fixture result", () => {
  const result = coreById.get("single-o-negative-universal-donor").expected.result;
  const expectedText = "{\"badges\":[\"rbc-universal-donor\",\"plasma-universal-recipient\"],"
    + "\"bloodType\":\"O-\",\"mode\":\"single\","
    + "\"plasmaDonateTo\":[\"O-\",\"O+\"],"
    + "\"plasmaReceiveFrom\":[\"O-\",\"O+\",\"A-\",\"A+\",\"B-\",\"B+\",\"AB-\",\"AB+\"],"
    + "\"rbcDonateTo\":[\"O-\",\"O+\",\"A-\",\"A+\",\"B-\",\"B+\",\"AB-\",\"AB+\"],"
    + "\"rbcReceiveFrom\":[\"O-\"]}\n";
  const report = buildReport(result);
  assert.equal(report.ok, true);
  assert.equal(report.filename, REPORT_FILENAME);
  assert.equal(report.filename, "blood-type-compatibility-report.json");
  assert.equal(report.text, expectedText);
  assert.equal(report.byteLength, new TextEncoder().encode(expectedText).byteLength);
  assert.equal(
    createHash("sha256").update(expectedText).digest("hex"),
    createHash("sha256").update(report.text).digest("hex"),
  );
});

test("pair-mode report is the canonical serialization of the fixture result", () => {
  const result = coreById.get("pair-both-compatible").expected.result;
  const report = buildReport(result);
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    "{\"donor\":\"O+\",\"mode\":\"pair\",\"plasma\":true,\"rbc\":true,\"recipient\":\"O+\"}\n",
  );
});

test("a toJSON property is never invoked and refuses the report", () => {
  let invoked = false;
  const hostile = {
    mode: "single",
    toJSON() {
      invoked = true;
      return {};
    },
  };
  const report = buildReport(hostile);
  assert.equal(report.ok, false);
  assert.equal(report.error.code, "INTERNAL");
  assert.equal(invoked, false);
});

test("non-plain results are refused", () => {
  assert.equal(buildReport(null).ok, false);
  assert.equal(buildReport([1, 2]).ok, false);
  assert.equal(buildReport("x").ok, false);
});
