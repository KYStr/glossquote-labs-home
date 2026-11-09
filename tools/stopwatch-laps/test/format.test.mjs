import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, formatSeconds3 } from "../public/js/core/format.mjs";

// SPEC section 4, fixture L2 (independently derived in the SPEC).
test("L2 format fixtures", () => {
  assert.equal(formatDuration(0), "00:00.00");
  assert.equal(formatDuration(61234), "01:01.23");
  assert.equal(formatDuration(59999), "00:59.99");
  assert.equal(formatDuration(60000), "01:00.00");
  assert.equal(formatDuration(3723456), "1:02:03.45");
});

// SPEC section 6/7: the hour boundary switches format exactly at
// 3,600,000 ms.
test("hour boundary formats", () => {
  assert.equal(formatDuration(3599999), "59:59.99");
  assert.equal(formatDuration(3600000), "1:00:00.00");
  assert.equal(formatDuration(36000000), "10:00:00.00");
});

// Truncation is normative: a fractional reading floors, never rounds.
test("truncation never rounds up", () => {
  assert.equal(formatDuration(59999.9), "00:59.99");
  assert.equal(formatDuration(60999.99), "01:00.99");
  assert.equal(formatDuration(999.99), "00:00.99");
});

// CSV seconds: exactly three decimals from integer milliseconds.
test("formatSeconds3", () => {
  assert.equal(formatSeconds3(0), "0.000");
  assert.equal(formatSeconds3(999), "0.999");
  assert.equal(formatSeconds3(1000), "1.000");
  assert.equal(formatSeconds3(45450), "45.450");
  assert.equal(formatSeconds3(120000), "120.000");
  assert.equal(formatSeconds3(3723456), "3723.456");
});
