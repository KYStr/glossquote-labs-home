// Report serialization tests. Expected canonical bytes are written out
// literally here (keys sorted by UTF-16 code units, compact, one trailing
// LF) from the fixture results of the fixed spec candidate — not produced
// by the implementation under test.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport, serializeReport } from "../public/js/core/parking.mjs";

const SAME_DAY_RESULT = {
  lostTicketApplied: false,
  graceApplied: false,
  totalMinutes: 130,
  days: [
    { date: "2026-11-09", minutes: 130, firstPeriods: 1, nextPeriods: 3, rawFee: 100, capped: false, fee: 100 }
  ],
  totalFee: 100
};
const SAME_DAY_TEXT =
  '{"days":[{"capped":false,"date":"2026-11-09","fee":100,"firstPeriods":1,"minutes":130,"nextPeriods":3,"rawFee":100}],"graceApplied":false,"lostTicketApplied":false,"totalFee":100,"totalMinutes":130}\n';

const LOST_TICKET_RESULT = {
  lostTicketApplied: true,
  graceApplied: false,
  totalMinutes: 540,
  days: [],
  totalFee: 1000
};
const LOST_TICKET_TEXT =
  '{"days":[],"graceApplied":false,"lostTicketApplied":true,"totalFee":1000,"totalMinutes":540}\n';

test("canonical text for same-day-basic", () => {
  assert.equal(serializeReport(SAME_DAY_RESULT), SAME_DAY_TEXT);
});

test("canonical text for lost-ticket", () => {
  assert.equal(serializeReport(LOST_TICKET_RESULT), LOST_TICKET_TEXT);
});

test("report bytes: UTF-8, no BOM, sha256 of the literal expectation", () => {
  const report = buildReport(SAME_DAY_RESULT);
  assert.equal(report.ok, true);
  assert.equal(new TextDecoder().decode(report.bytes), SAME_DAY_TEXT);
  assert.equal(report.bytes[0], 0x7b); // '{' — no BOM
  const digest = createHash("sha256").update(report.bytes).digest("hex");
  const expectedDigest = createHash("sha256").update(SAME_DAY_TEXT, "utf8").digest("hex");
  assert.equal(digest, expectedDigest);
});

test("key order in input does not change the bytes", () => {
  const shuffled = {
    totalFee: 100,
    days: [
      { fee: 100, capped: false, rawFee: 100, nextPeriods: 3, minutes: 130, firstPeriods: 1, date: "2026-11-09" }
    ],
    totalMinutes: 130,
    graceApplied: false,
    lostTicketApplied: false
  };
  assert.equal(serializeReport(shuffled), SAME_DAY_TEXT);
});
