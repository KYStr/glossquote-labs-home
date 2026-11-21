// Download tests: the JSON report and the text list for the
// basic-count fixture result. The expected bytes below are written
// out literally (hand-derived from the SPEC's canonical-JSON and
// text-list rules), including the SHA-256 of the JSON report, and
// the OUTPUT_LIMIT backstop is exercised with a fabricated oversized
// result that the pinned input bounds can never produce.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  formatGroupsText,
  run,
  serializeGroupsText,
  serializeReport,
} from "../public/js/core/group-generator.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const basic = fixtures.cases.find((entry) => entry.id === "basic-count");
const { result } = run(basic.input);
assert.equal(result !== undefined, true);

test("report: basic-count canonical JSON bytes are exact, with one trailing LF", () => {
  const expected =
    '{"groupCount":3,"groups":[{"members":["黃小芬","劉小玉","吳阿國"],"number":1,"size":3},{"members":["王小明","李小華","陳小美"],"number":2,"size":3},{"members":["張阿宏","林阿哲"],"number":3,"size":2}],"mode":"count","seed":42,"totalNames":8}\n';
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, expected);
  assert.equal(
    serialized.bytes,
    new TextEncoder().encode(expected).length,
  );
  assert.equal(
    createHash("sha256").update(serialized.text, "utf8").digest("hex"),
    createHash("sha256").update(expected, "utf8").digest("hex"),
  );
});

test("report: key order is independent of the result object's own key order", () => {
  const reordered = {
    groups: result.groups,
    totalNames: result.totalNames,
    seed: result.seed,
    mode: result.mode,
    groupCount: result.groupCount,
  };
  assert.equal(serializeReport(reordered).text, serializeReport(result).text);
});

test("report: an oversized result is OUTPUT_LIMIT, not a truncated artifact", () => {
  const huge = {
    seed: 42,
    mode: "count",
    groupCount: 1,
    totalNames: 1,
    groups: [{ number: 1, size: 1, members: ["x".repeat(2097152)] }],
  };
  assert.deepEqual(serializeReport(huge), {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
  assert.deepEqual(serializeGroupsText(huge, "zh-Hant"), {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});

test("text list: zh-Hant basic-count bytes are exact, one blank line between groups, no trailing LF", () => {
  const expected =
    "第 1 組（3 人）\n黃小芬\n劉小玉\n吳阿國\n\n第 2 組（3 人）\n王小明\n李小華\n陳小美\n\n第 3 組（2 人）\n張阿宏\n林阿哲";
  const serialized = serializeGroupsText(result, "zh-Hant");
  assert.equal(serialized.ok, true);
  assert.equal(serialized.text, expected);
  assert.equal(formatGroupsText(result, "zh-Hant"), expected);
  assert.equal(serialized.text.endsWith("\n"), false);
});

test("text list: English headings use the singular member form for size 1", () => {
  const expected =
    "Group 1 (3 members)\n黃小芬\n劉小玉\n吳阿國\n\nGroup 2 (3 members)\n王小明\n李小華\n陳小美\n\nGroup 3 (2 members)\n張阿宏\n林阿哲";
  assert.equal(formatGroupsText(result, "en"), expected);
  const single = run({
    names: "獨自一人",
    mode: "count",
    groupCount: "1",
    groupSize: "",
    seed: "42",
  }).result;
  assert.equal(formatGroupsText(single, "en"), "Group 1 (1 member)\n獨自一人");
  assert.equal(formatGroupsText(single, "zh-Hant"), "第 1 組（1 人）\n獨自一人");
});

test("text list: both downloads come from the same result snapshot", () => {
  const again = run(basic.input).result;
  assert.deepEqual(again, result);
  assert.equal(serializeReport(again).text, serializeReport(result).text);
  assert.equal(
    serializeGroupsText(again, "en").text,
    serializeGroupsText(result, "en").text,
  );
});
