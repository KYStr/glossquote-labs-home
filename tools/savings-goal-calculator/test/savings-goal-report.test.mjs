// Report tests: serializeReport produces the exact canonical bytes
// for a fixture report (keys sorted recursively by UTF-16 code units,
// one trailing LF, no BOM), is independent of key order, and refuses
// an over-limit report with OUTPUT_LIMIT.

import assert from "node:assert/strict";
import test from "node:test";
import { serializeReport } from "../public/js/core/savings-goal.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const basic = fixtures.cases.find((entry) => entry.id === "payment-basic-zero-rate");

test("report bytes for payment-basic-zero-rate are exact", () => {
  const report = { input: basic.input, result: basic.expected.result };
  const serialized = serializeReport(report);
  assert.equal(serialized.ok, true);
  const expectedText =
    '{"input":{"annualRate":"0","initialAmount":"10000","mode":"payment","monthlyPayment":"3000","months":"12","targetAmount":"100000"},"result":{"finalBalance":"100000.00","mode":"payment","monthlyPayment":"7500.00","months":12,"status":"ok","totalDeposits":"90000.00","totalInterest":"0.00"}}\n';
  assert.equal(serialized.text, expectedText);
  assert.equal(serialized.bytes, new TextEncoder().encode(expectedText).length);
  assert.equal(serialized.text.endsWith("\n"), true);
  assert.equal(serialized.text.endsWith("\n\n"), false);
});

test("report serialization is independent of key order", () => {
  const shuffled = {
    result: {
      totalInterest: "0.00",
      totalDeposits: "90000.00",
      status: "ok",
      months: 12,
      monthlyPayment: "7500.00",
      mode: "payment",
      finalBalance: "100000.00",
    },
    input: {
      targetAmount: "100000",
      months: "12",
      monthlyPayment: "3000",
      mode: "payment",
      initialAmount: "10000",
      annualRate: "0",
    },
  };
  const a = serializeReport({ input: basic.input, result: basic.expected.result });
  const b = serializeReport(shuffled);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(b.text, a.text);
});

test("report serialization keeps nulls and nested key order", () => {
  const unreachable = fixtures.cases.find(
    (entry) => entry.id === "months-unreachable-no-growth",
  );
  const serialized = serializeReport({
    input: unreachable.input,
    result: unreachable.expected.result,
  });
  assert.equal(serialized.ok, true);
  const expectedText =
    '{"input":{"annualRate":"5","initialAmount":"0","mode":"months","monthlyPayment":"0","months":"60","targetAmount":"10000"},"result":{"balanceIfFullPayment":null,"finalBalance":null,"finalMonthPayment":null,"mode":"months","monthsRequired":null,"reason":"no-growth","status":"unreachable","totalDeposits":null,"totalInterest":null}}\n';
  assert.equal(serialized.text, expectedText);
});

test("an over-limit report is OUTPUT_LIMIT and produces no text", () => {
  const huge = "x".repeat(2097152);
  const serialized = serializeReport({
    input: { note: huge },
    result: basic.expected.result,
  });
  assert.equal(serialized.ok, false);
  assert.deepEqual(serialized.error, { code: "OUTPUT_LIMIT", field: null, row: null });
  assert.equal(serialized.text, undefined);
});

test("a report just under the limit serializes", () => {
  const almost = "x".repeat(2097152 - 400);
  const serialized = serializeReport({
    input: { note: almost },
    result: basic.expected.result,
  });
  assert.equal(serialized.ok, true);
  assert.ok(serialized.bytes <= 2097152);
});
