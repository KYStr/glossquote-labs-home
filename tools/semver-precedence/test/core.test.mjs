// Core tests for SemVer precedence. Every expected value comes from
// docs/specs/semver-precedence/fixtures.json, the official SemVer 2.0.0
// §11 precedence chain, or hand-derived boundary cases — never from the
// implementation's own output.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  LIMITS,
  canonicalJson,
  parseVersion,
  run,
  serializeReport,
} from "../public/js/core/semver.mjs";

const TOOL_ROOT = fileURLToPath(new URL("..", import.meta.url));
const fixtures = JSON.parse(
  await readFile(`${TOOL_ROOT}/../../docs/specs/semver-precedence/fixtures.json`, "utf8"),
);

const coreCases = fixtures.cases.filter((c) => c.kind === "core");

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}: ${fixture.purpose}`, () => {
    const actual = run(fixture.input);
    assert.deepEqual(actual, fixture.expected);
  });
}

test("official SemVer 2.0.0 section 11 precedence chain", () => {
  const chain = [
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-alpha.beta",
    "1.0.0-beta",
    "1.0.0-beta.2",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
  ];
  for (let i = 0; i < chain.length; i += 1) {
    for (let j = 0; j < chain.length; j += 1) {
      const actual = run({ left: chain[i], right: chain[j] });
      assert.equal(actual.ok, true, `${chain[i]} vs ${chain[j]}`);
      const expected = i < j ? "lt" : i > j ? "gt" : "eq";
      assert.equal(actual.result.relation, expected, `${chain[i]} vs ${chain[j]}`);
    }
  }
  // The chain is a total order: sorting by pairwise comparison reproduces it.
  const shuffled = [...chain].reverse();
  shuffled.sort((a, b) => {
    const outcome = run({ left: a, right: b });
    return outcome.result.relation === "lt" ? -1 : outcome.result.relation === "gt" ? 1 : 0;
  });
  assert.deepEqual(shuffled, chain);
});

test("comparison is antisymmetric and reflexive", () => {
  const pairs = [
    ["2.3.4", "2.3.5"],
    ["1.0.0-alpha", "1.0.0-alpha.1"],
    ["1.0.0-1", "1.0.0-a"],
    ["0.0.0", "0.0.0"],
    ["1.2.3+build.9", "1.2.3+build.1"],
  ];
  for (const [a, b] of pairs) {
    const forward = run({ left: a, right: b });
    const backward = run({ left: b, right: a });
    assert.equal(forward.ok, true);
    assert.equal(backward.ok, true);
    const flipped =
      forward.result.relation === "lt"
        ? "gt"
        : forward.result.relation === "gt"
          ? "lt"
          : "eq";
    assert.equal(backward.result.relation, flipped, `${a} vs ${b}`);
    const self = run({ left: a, right: a });
    assert.deepEqual(self, {
      ok: true,
      result: { relation: "eq", reason: { kind: "equal", index: null } },
    });
  }
});

test("comparison is transitive over a mixed set", () => {
  const versions = [
    "0.9.9",
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
    "1.0.1",
    "1.2.0",
    "2.0.0-0",
    "2.0.0",
  ];
  for (let i = 0; i < versions.length; i += 1) {
    for (let j = i + 1; j < versions.length; j += 1) {
      for (let k = j + 1; k < versions.length; k += 1) {
        const ab = run({ left: versions[i], right: versions[j] });
        const bc = run({ left: versions[j], right: versions[k] });
        const ac = run({ left: versions[i], right: versions[k] });
        assert.equal(ab.result.relation, "lt", `${versions[i]} < ${versions[j]}`);
        assert.equal(bc.result.relation, "lt", `${versions[j]} < ${versions[k]}`);
        assert.equal(ac.result.relation, "lt", `${versions[i]} < ${versions[k]}`);
      }
    }
  }
});

test("reason kinds and indices for core and prerelease differences", () => {
  assert.deepEqual(run({ left: "2.0.0", right: "1.9.9" }).result, {
    relation: "gt",
    reason: { kind: "major", index: null },
  });
  assert.deepEqual(run({ left: "1.2.0", right: "1.3.0" }).result, {
    relation: "lt",
    reason: { kind: "minor", index: null },
  });
  assert.deepEqual(run({ left: "1.0.9", right: "1.0.10" }).result, {
    relation: "lt",
    reason: { kind: "patch", index: null },
  });
  assert.deepEqual(run({ left: "1.0.0", right: "1.0.0-alpha" }).result, {
    relation: "gt",
    reason: { kind: "release", index: null },
  });
  assert.deepEqual(run({ left: "1.0.0-alpha", right: "1.0.0" }).result, {
    relation: "lt",
    reason: { kind: "release", index: null },
  });
  assert.deepEqual(run({ left: "1.0.0-a.2", right: "1.0.0-a.10" }).result, {
    relation: "lt",
    reason: { kind: "prerelease-number", index: 2 },
  });
  assert.deepEqual(run({ left: "1.0.0-a.1", right: "1.0.0-a.b" }).result, {
    relation: "lt",
    reason: { kind: "prerelease-type", index: 2 },
  });
  assert.deepEqual(run({ left: "1.0.0-a.b", right: "1.0.0-a.1" }).result, {
    relation: "gt",
    reason: { kind: "prerelease-type", index: 2 },
  });
  assert.deepEqual(run({ left: "1.0.0-beta", right: "1.0.0-alpha" }).result, {
    relation: "gt",
    reason: { kind: "prerelease-text", index: 1 },
  });
  assert.deepEqual(run({ left: "1.0.0-a.b", right: "1.0.0-a" }).result, {
    relation: "gt",
    reason: { kind: "prerelease-length", index: null },
  });
});

test("build metadata never affects precedence, including leading zeros", () => {
  assert.deepEqual(run({ left: "1.0.0+001", right: "1.0.0+002" }).result, {
    relation: "eq",
    reason: { kind: "equal", index: null },
  });
  assert.deepEqual(run({ left: "1.0.0-alpha+exp", right: "1.0.0-alpha+001" }).result, {
    relation: "eq",
    reason: { kind: "equal", index: null },
  });
  assert.deepEqual(run({ left: "1.0.0-alpha.1+build", right: "1.0.0-alpha.2" }).result, {
    relation: "lt",
    reason: { kind: "prerelease-number", index: 2 },
  });
});

test("large exact numbers beyond Number.MAX_SAFE_INTEGER", () => {
  assert.equal(
    run({ left: "9007199254740992.0.0", right: "9007199254740993.0.0" }).result.relation,
    "lt",
  );
  assert.equal(
    run({ left: "1.0.0-9007199254740993", right: "1.0.0-9007199254740992" }).result.relation,
    "gt",
  );
  assert.deepEqual(run({ left: "1.0.0-9007199254740993", right: "1.0.0-9007199254740993" }).result, {
    relation: "eq",
    reason: { kind: "equal", index: null },
  });
  // 32-digit core fields are the pinned maximum and still compare exactly.
  const a = `${"9".repeat(32)}.0.0`;
  const b = `${"1".repeat(32)}.0.0`;
  assert.equal(run({ left: a, right: b }).result.relation, "gt");
  assert.equal(run({ left: a, right: a }).result.relation, "eq");
});

test("grammar rejections: shape, v prefix, trim, empty segments", () => {
  const invalid = [
    "v1.0.0",
    "1.0",
    "1.0.0.0",
    "1.0.0-",
    "1.0.0+",
    "1.0.0-alpha..1",
    "1.0.0-.1",
    "1.0.0-alpha_beta",
    "1.0.0 alpha",
    " 1.0.0",
    "1.0.0 ",
    "01.0.0",
    "1.02.0",
    "1.0.003",
    "1.0.0-01",
    "1.0.0-00",
    "1.0.0-alpha.01",
    "1.0.0-\u4e2d\u6587",
    "1.0.0-\u00e9",
    "",
    "1.0.0\n",
    "1.0.0\r\n",
    "\n1.0.0",
    "1.0.0-alpha\n",
    "1.0.0+build\n",
    "1..0",
    "1.0.x",
    "-1.0.0",
    "1.0.0++1",
    "1.0.0+build+more",
  ];
  for (const raw of invalid) {
    const actual = run({ left: raw, right: "1.0.0" });
    assert.deepEqual(
      actual,
      { ok: false, error: { code: raw === "" ? "EMPTY" : "SEMVER_SYNTAX", field: "left", row: null } },
      JSON.stringify(raw),
    );
  }
});

test("a lone hyphen is a valid prerelease identifier per the grammar", () => {
  // The official grammar allows [0-9A-Za-z-]+ identifiers, so "-" alone
  // is a legal prerelease identifier; only a release outranks it.
  assert.deepEqual(run({ left: "1.0.0--", right: "1.0.0" }), {
    ok: true,
    result: { relation: "lt", reason: { kind: "release", index: null } },
  });
  assert.deepEqual(parseVersion("1.0.0--").value.prerelease, ["-"]);
});

test("left is fully validated before right", () => {
  assert.deepEqual(run({ left: "bad", right: "also-bad" }), {
    ok: false,
    error: { code: "SEMVER_SYNTAX", field: "left", row: null },
  });
  assert.deepEqual(run({ left: "1.0.0", right: "also-bad" }), {
    ok: false,
    error: { code: "SEMVER_SYNTAX", field: "right", row: null },
  });
  assert.deepEqual(run({ left: "", right: "bad" }), {
    ok: false,
    error: { code: "EMPTY", field: "left", row: null },
  });
  assert.deepEqual(run({ left: "1.0.0", right: "" }), {
    ok: false,
    error: { code: "EMPTY", field: "right", row: null },
  });
});

test("capacity, surrogate, and identifier limits in pinned order", () => {
  // 257 UTF-16 units beats a grammar error: capacity is checked first.
  const tooLong = `1.0.0-${"a".repeat(251)}`;
  assert.equal(tooLong.length, 257);
  assert.deepEqual(run({ left: tooLong, right: "1.0.0" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "left", row: null },
  });
  // Exactly 256 UTF-16 units passes the capacity check (grammar decides).
  const atLimit = `1.0.0-${"a".repeat(250)}`;
  assert.equal(atLimit.length, 256);
  assert.equal(run({ left: atLimit, right: "1.0.0" }).ok, false);
  assert.equal(run({ left: atLimit, right: "1.0.0" }).error.code, "IDENTIFIER_LIMIT");

  // Unpaired surrogate beats a grammar error.
  assert.deepEqual(run({ left: "1.0.0-\ud800", right: "1.0.0" }), {
    ok: false,
    error: { code: "UNICODE", field: "left", row: null },
  });
  assert.deepEqual(run({ left: "1.0.0-\udc00", right: "1.0.0" }), {
    ok: false,
    error: { code: "UNICODE", field: "left", row: null },
  });
  // A paired surrogate is still a grammar error, not UNICODE.
  assert.deepEqual(run({ left: "1.0.0-\ud83d\ude00", right: "1.0.0" }), {
    ok: false,
    error: { code: "SEMVER_SYNTAX", field: "left", row: null },
  });

  // Core field of 33 digits: grammar passes, identifier limit fires.
  assert.deepEqual(run({ left: `${"1".repeat(33)}.0.0`, right: "1.0.0" }), {
    ok: false,
    error: { code: "IDENTIFIER_LIMIT", field: "left", row: null },
  });
  // 17 prerelease identifiers.
  const seventeen = `1.0.0-${Array.from({ length: 17 }, () => "a").join(".")}`;
  assert.deepEqual(run({ left: seventeen, right: "1.0.0" }), {
    ok: false,
    error: { code: "IDENTIFIER_LIMIT", field: "left", row: null },
  });
  // 16 prerelease identifiers is the pinned maximum and is valid.
  const sixteen = `1.0.0-${Array.from({ length: 16 }, () => "a").join(".")}`;
  assert.equal(run({ left: sixteen, right: "1.0.0" }).ok, true);
  // One 33-character identifier.
  assert.deepEqual(run({ left: `1.0.0-${"a".repeat(33)}`, right: "1.0.0" }), {
    ok: false,
    error: { code: "IDENTIFIER_LIMIT", field: "left", row: null },
  });
  // A 32-character identifier is valid.
  assert.equal(run({ left: `1.0.0-${"a".repeat(32)}`, right: "1.0.0" }).ok, true);
  // Build limits mirror prerelease limits.
  const buildSeventeen = `1.0.0+${Array.from({ length: 17 }, () => "b").join(".")}`;
  assert.deepEqual(run({ left: buildSeventeen, right: "1.0.0" }), {
    ok: false,
    error: { code: "IDENTIFIER_LIMIT", field: "left", row: null },
  });
});

test("schema errors: unknown, missing, wrong type, accessor", () => {
  const schemaCases = [
    null,
    undefined,
    42,
    "1.0.0",
    ["1.0.0", "1.0.0"],
    { left: "1.0.0" },
    { right: "1.0.0" },
    {},
    { left: "1.0.0", right: "1.0.0", extra: "x" },
    { left: 1, right: "1.0.0" },
    { left: "1.0.0", right: null },
  ];
  for (const input of schemaCases) {
    assert.deepEqual(run(input), {
      ok: false,
      error: { code: "SCHEMA", field: null, row: null },
    });
  }
  const withGetter = {};
  Object.defineProperty(withGetter, "left", { get: () => "1.0.0", enumerable: true });
  Object.defineProperty(withGetter, "right", { value: "1.0.0", enumerable: true });
  assert.deepEqual(run(withGetter), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  // Frozen plain objects with the exact fields are still accepted.
  const frozen = Object.freeze({ left: "1.0.0", right: "2.0.0" });
  assert.equal(run(frozen).ok, true);
});

test("parseVersion exposes components for display", () => {
  assert.deepEqual(parseVersion("1.2.3-rc.1+build.5"), {
    ok: true,
    value: {
      major: "1",
      minor: "2",
      patch: "3",
      prerelease: ["rc", "1"],
      build: ["build", "5"],
    },
  });
  assert.deepEqual(parseVersion("1.0.0"), {
    ok: true,
    value: { major: "1", minor: "0", patch: "0", prerelease: null, build: null },
  });
  assert.equal(parseVersion("not-a-version").ok, false);
  assert.equal(parseVersion("1.0.0-01").error.code, "SEMVER_SYNTAX");
});

test("canonical JSON: recursive key sort, compact, no locale dependence", () => {
  assert.equal(
    canonicalJson({ relation: "gt", reason: { kind: "prerelease-number", index: 2 } }),
    '{"reason":{"index":2,"kind":"prerelease-number"},"relation":"gt"}',
  );
  assert.equal(canonicalJson({ b: 1, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":1}');
  assert.equal(canonicalJson({ list: [3, 2, 1] }), '{"list":[3,2,1]}');
  assert.equal(canonicalJson("a\nb\"c"), '"a\\nb\\"c"');
  // UTF-16 code-unit order: "Z" (0x5A) sorts before "a" (0x61).
  assert.equal(canonicalJson({ a: 1, Z: 2 }), '{"Z":2,"a":1}');
});

test("serializeReport: one trailing LF, UTF-8, OUTPUT_LIMIT guard", () => {
  const serialized = serializeReport({
    relation: "gt",
    reason: { kind: "prerelease-number", index: 2 },
  });
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"reason":{"index":2,"kind":"prerelease-number"},"relation":"gt"}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
  assert.equal(serialized.text.endsWith("\n"), true);
  assert.equal(serialized.text.endsWith("\n\n"), false);

  const oversized = serializeReport({
    relation: "eq",
    reason: { kind: "equal", index: null },
    pad: "x".repeat(LIMITS.REPORT_MAX_BYTES),
  });
  assert.deepEqual(oversized, {
    ok: false,
    error: { code: "OUTPUT_LIMIT", field: null, row: null },
  });
});
