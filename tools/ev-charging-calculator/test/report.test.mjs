// Report serialization tests: bytes and SHA-256 are checked against
// literal expectations written from the SPEC, not from the serializer.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildReport } from "../public/js/core/ev-charging.mjs";

test("home-ac report bytes are the pinned compact JSON with sorted keys and one LF", () => {
  const report = buildReport({
    needsCharge: true,
    energyBatteryKwh: "36.00",
    energyWallKwh: "40.00",
    timeMinutes: 343,
    cost: null,
  });
  assert.equal(report.ok, true);
  assert.equal(report.filename, "ev-charging-report.json");
  const expectedText =
    '{"cost":null,"energyBatteryKwh":"36.00","energyWallKwh":"40.00","needsCharge":true,"timeMinutes":343}\n';
  assert.equal(report.text, expectedText);
  const expectedBytes = new TextEncoder().encode(expectedText);
  assert.equal(report.byteLength, expectedBytes.byteLength);
  assert.equal(
    createHash("sha256").update(expectedBytes).digest("hex"),
    createHash("sha256").update(new TextEncoder().encode(report.text)).digest("hex"),
  );
  assert.ok(!report.text.startsWith("﻿"), "no BOM");
});

test("zero-charge report keeps cost 0 when a price was given", () => {
  const report = buildReport({
    needsCharge: false,
    energyBatteryKwh: "0.00",
    energyWallKwh: "0.00",
    timeMinutes: 0,
    cost: 0,
  });
  assert.equal(report.ok, true);
  assert.equal(
    report.text,
    '{"cost":0,"energyBatteryKwh":"0.00","energyWallKwh":"0.00","needsCharge":false,"timeMinutes":0}\n',
  );
});
