// Report tests: the fixed download 50-30-20-budget-report.json is the
// result's compact JSON with object keys sorted ascending by UTF-16 code
// units (recursively), array order preserved, one trailing LF, UTF-8 no
// BOM. The expected byte strings below are hand-written literals derived
// from the fixture results and the SPEC's serialization rule, not produced
// by the product; their SHA-256 is computed from the literals in-test.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { run, serializeReport } from "../public/js/core/budget.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const defaultSplitExpected = fixtures.cases.find((entry) => entry.id === "default-split").expected;
const onTrackExpected = fixtures.cases.find((entry) => entry.id === "actuals-on-track").expected;

const DEFAULT_SPLIT_REPORT =
  '{"actuals":null,"income":60000,"percentages":{"needs":50,"savings":20,"wants":30},' +
  '"targets":{"monthly":{"needs":30000,"savings":12000,"wants":18000},' +
  '"yearly":{"needs":360000,"savings":144000,"wants":216000}},"totals":null,"variance":null}\n';

const ON_TRACK_REPORT =
  '{"actuals":{"needs":24000,"savings":11000,"wants":14000},"income":50000,' +
  '"percentages":{"needs":50,"savings":20,"wants":30},' +
  '"targets":{"monthly":{"needs":25000,"savings":10000,"wants":15000},' +
  '"yearly":{"needs":300000,"savings":120000,"wants":180000}},' +
  '"totals":{"actual":49000,"income":50000,"status":"under","unallocated":1000},' +
  '"variance":{"needs":{"actual":24000,"actualPercent":48,"difference":-1000,"status":"under","target":25000,"targetPercent":50},' +
  '"savings":{"actual":11000,"actualPercent":22,"difference":1000,"status":"over","target":10000,"targetPercent":20},' +
  '"wants":{"actual":14000,"actualPercent":28,"difference":-1000,"status":"under","target":15000,"targetPercent":30}}}\n';

test("default-split report bytes match the hand-written canonical literal", () => {
  const text = serializeReport(defaultSplitExpected.result);
  assert.equal(text, DEFAULT_SPLIT_REPORT);
  const digest = createHash("sha256").update(DEFAULT_SPLIT_REPORT, "utf8").digest("hex");
  assert.equal(createHash("sha256").update(text, "utf8").digest("hex"), digest);
  assert.ok(text.endsWith("}\n"));
  assert.ok(!text.includes(" "));
});

test("actuals-on-track report bytes match the hand-written canonical literal", () => {
  assert.equal(serializeReport(onTrackExpected.result), ON_TRACK_REPORT);
});

test("serialization is independent of the result's own key insertion order", () => {
  const result = run({
    income: "60000",
    needsPct: "50",
    wantsPct: "30",
    savingsPct: "20",
    actualNeeds: "",
    actualWants: "",
    actualSavings: "",
  }).result;
  const scrambled = {
    variance: null,
    totals: null,
    targets: {
      yearly: { wants: 216000, savings: 144000, needs: 360000 },
      monthly: { wants: 18000, savings: 12000, needs: 30000 },
    },
    percentages: { wants: 30, savings: 20, needs: 50 },
    income: result.income,
    actuals: null,
  };
  assert.equal(serializeReport(scrambled), DEFAULT_SPLIT_REPORT);
});

test("serialization never calls an input's toJSON", () => {
  const evil = {
    ...defaultSplitExpected.result,
    toJSON() {
      throw new Error("toJSON must not be called");
    },
  };
  assert.equal(serializeReport(evil), DEFAULT_SPLIT_REPORT);
});

test("a report over the 2,097,152-byte limit raises RangeError (OUTPUT_LIMIT)", () => {
  const oversized = { note: "x".repeat(2097152) };
  assert.throws(() => serializeReport(oversized), RangeError);
});
