// Report tests: the fixed download artifact download-time-report.json
// is the result's canonical compact JSON — object own keys sorted
// ascending by UTF-16 code units recursively, array order unchanged,
// exactly one trailing LF, UTF-8 without BOM. The expected bytes below
// are a hand-written literal (the basic-gb fixture result with its keys
// in canonical order), and the expected SHA-256 is computed in this
// test from that literal — never from the implementation's output.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { serializeReport } from "../public/js/core/download.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const basicResult = fixtures.cases.find((entry) => entry.id === "basic-gb").expected.result;

// Hand-written canonical form of the basic-gb result: top-level keys
// durationParts < durationSeconds < durationText < finishDayOffset <
// finishText < finishTime < sizeBytes; nested keys hours < minutes <
// seconds; one trailing LF.
const EXPECTED_TEXT =
  '{"durationParts":{"hours":0,"minutes":6,"seconds":16},' +
  '"durationSeconds":376,"durationText":"6:16","finishDayOffset":0,' +
  '"finishText":"21:36","finishTime":"21:36","sizeBytes":"4700000000"}\n';

test("the report bytes equal the hand-written canonical literal", () => {
  assert.equal(serializeReport(basicResult), EXPECTED_TEXT);
});

test("the report SHA-256 matches the literal's hash", () => {
  const expectedHash = createHash("sha256").update(EXPECTED_TEXT, "utf8").digest("hex");
  const actualHash = createHash("sha256").update(serializeReport(basicResult), "utf8").digest("hex");
  assert.equal(actualHash, expectedHash);
});

test("key insertion order does not change the report bytes", () => {
  const scrambled = {
    sizeBytes: "4700000000",
    finishTime: "21:36",
    finishText: "21:36",
    finishDayOffset: 0,
    durationText: "6:16",
    durationSeconds: 376,
    durationParts: { seconds: 16, minutes: 6, hours: 0 },
  };
  assert.equal(serializeReport(scrambled), EXPECTED_TEXT);
});

test("the report is UTF-8 without BOM and ends with exactly one LF", () => {
  const bytes = new TextEncoder().encode(serializeReport(basicResult));
  assert.notEqual(bytes[0], 0xef);
  assert.equal(bytes[bytes.length - 1], 0x0a);
  assert.notEqual(bytes[bytes.length - 2], 0x0a);
});

test("serialization never calls an input toJSON", () => {
  const hostile = JSON.parse(EXPECTED_TEXT);
  Object.defineProperty(hostile, "toJSON", {
    enumerable: false,
    value() {
      throw new Error("toJSON must not be called");
    },
  });
  assert.equal(serializeReport(hostile), EXPECTED_TEXT);
});
