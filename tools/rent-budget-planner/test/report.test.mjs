// Report serialization tests. The expected byte string below is written out
// by hand from the spec rule (compact JSON, keys sorted recursively by UTF-16
// code units, one trailing LF) applied to the standard-p30 fixture result —
// it is not produced by the implementation under test.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { run, serializeReport } from "../public/js/core/rent-budget.mjs";

const fixtures = JSON.parse(
  await readFile(new URL("./fixtures.json", import.meta.url), "utf8"),
);
const standard = fixtures.cases.find((c) => c.id === "standard-p30");

const EXPECTED_REPORT =
  '{"candidate":{"overByNt":0,"rentNt":12000,"sharePercent":26.7,"withinBudget":true},' +
  '"maxRentNt":13500,"monthlyRemainderNt":33000,' +
  '"moveIn":{"agencyFeeNt":6000,"depositNt":24000,"firstMonthNt":12000,"totalNt":42000}}\n';

test("standard-p30 report matches the pinned bytes and SHA-256", () => {
  const out = run(standard.input);
  assert.equal(out.ok, true);
  const text = serializeReport(out.result);
  assert.equal(text, EXPECTED_REPORT);
  const bytes = new TextEncoder().encode(text);
  assert.equal(bytes[0], 0x7b); // '{' — no BOM
  assert.equal(bytes[bytes.length - 1], 0x0a); // single trailing LF
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    createHash("sha256").update(new TextEncoder().encode(EXPECTED_REPORT)).digest("hex"),
  );
});

test("serialization sorts keys recursively and preserves array order", () => {
  const text = serializeReport({ b: [{ d: 1, a: 2 }, 3], a: null });
  assert.equal(text, '{"a":null,"b":[{"a":2,"d":1},3]}\n');
});

test("serialization never calls an input toJSON", () => {
  const hostile = { z: 1 };
  Object.defineProperty(hostile, "toJSON", {
    value() {
      throw new Error("toJSON must not be called");
    },
  });
  assert.equal(serializeReport(hostile), '{"z":1}\n');
});
