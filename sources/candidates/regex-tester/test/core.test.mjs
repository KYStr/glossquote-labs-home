import assert from "node:assert/strict";
import test from "node:test";

import {
  assembleFlags,
  buildCodePointIndex,
  countCodePoints,
  expandReplacement,
  namedGroupsOf,
  presetById,
  runMatch,
  runReplace,
} from "../public/js/core/regex.mjs";

const G = { g: true };

test("flag assembly uses the fixed gimsuy order regardless of toggle order", () => {
  assert.equal(assembleFlags({ y: true, g: true, i: true }), "giy");
  assert.equal(assembleFlags({ u: true, s: true }), "su");
  assert.equal(assembleFlags({}), "");
  assert.equal(assembleFlags({ g: true, i: true, m: true, s: true, u: true, y: true }), "gimsuy");
});

test("SPEC fixture: date pattern, two matches, indices and groups", () => {
  const outcome = runMatch({
    pattern: String.raw`(\d{4})-(\d{2})-(\d{2})`,
    flags: G,
    text: "due 2026-11-02, was 2025-01-30",
  });
  assert.equal(outcome.flagString, "g");
  assert.equal(outcome.capped, false);
  assert.equal(outcome.matches.length, 2);
  const [first, second] = outcome.matches;
  assert.equal(first.number, 1);
  assert.equal(first.text, "2026-11-02");
  assert.equal(first.startUnit, 4);
  assert.equal(first.endUnit, 14);
  assert.equal(first.startCp, 4);
  assert.equal(first.endCp, 14);
  assert.deepEqual(first.groups.map((g) => g.value), ["2026", "11", "02"]);
  assert.equal(second.startUnit, 20);
  assert.equal(second.endUnit, 30);
  assert.deepEqual(second.groups.map((g) => g.value), ["2025", "01", "30"]);
});

test("SPEC fixture: named group reported by name and number", () => {
  const outcome = runMatch({ pattern: String.raw`(?<word>[a-z]+)`, flags: {}, text: "ab cd" });
  assert.equal(outcome.matches.length, 1);
  assert.equal(outcome.matches[0].text, "ab");
  assert.deepEqual(outcome.matches[0].groups, [{ number: 1, name: "word", value: "ab" }]);
});

test("SPEC fixture: zero-width lookahead matches at units 1 and 3", () => {
  const outcome = runMatch({ pattern: "(?=b)", flags: G, text: "ab b" });
  assert.deepEqual(
    outcome.matches.map((m) => [m.startUnit, m.endUnit, m.zeroWidth]),
    [[1, 1, true], [3, 3, true]],
  );
});

test("SPEC fixture: replace with $1 produces the exact result and count", () => {
  const outcome = runReplace({
    pattern: String.raw`(\w+)@example\.com`,
    flags: {},
    text: "write to sam@example.com",
    replacement: "$1 [at] example.com",
  });
  assert.equal(outcome.result, "write to sam [at] example.com");
  assert.equal(outcome.count, 1);
});

test("SPEC fixture: a{2,1} is the engine error state, never no-matches", () => {
  assert.throws(
    () => runMatch({ pattern: "a{2,1}", flags: G, text: "aaa" }),
    SyntaxError,
  );
});

test("zero-width advance: (?=a) over a run of a's, including the end position", () => {
  const outcome = runMatch({ pattern: "(?=a)", flags: G, text: "aaa" });
  assert.deepEqual(outcome.matches.map((m) => m.startUnit), [0, 1, 2]);
  const star = runMatch({ pattern: "a*", flags: G, text: "b" });
  assert.deepEqual(
    star.matches.map((m) => [m.startUnit, m.zeroWidth]),
    [[0, true], [1, true]],
  );
});

test("empty pattern is valid and matches everywhere under g", () => {
  const outcome = runMatch({ pattern: "", flags: G, text: "ab" });
  assert.deepEqual(outcome.matches.map((m) => m.startUnit), [0, 1, 2]);
  const single = runMatch({ pattern: "", flags: {}, text: "ab" });
  assert.equal(single.matches.length, 1);
  assert.equal(single.matches[0].startUnit, 0);
});

test("sticky flag stops enumeration at the first failure", () => {
  const stickyOnly = runMatch({ pattern: String.raw`\d`, flags: { y: true }, text: "1a2" });
  assert.equal(stickyOnly.matches.length, 1);
  const stickyGlobal = runMatch({ pattern: String.raw`\d`, flags: { g: true, y: true }, text: "12a3" });
  assert.deepEqual(stickyGlobal.matches.map((m) => m.text), ["1", "2"]);
});

test("without g or y exactly one search runs from index 0", () => {
  const outcome = runMatch({ pattern: String.raw`\d+`, flags: {}, text: "a12b34" });
  assert.equal(outcome.matches.length, 1);
  assert.equal(outcome.matches[0].text, "12");
  assert.equal(outcome.matches[0].startUnit, 1);
  assert.equal(outcome.matches[0].endUnit, 3);
});

test("the 1,000-match cap stops iteration and labels the list partial", () => {
  const capped = runMatch({ pattern: String.raw`\d`, flags: G, text: "1".repeat(1500) });
  assert.equal(capped.matches.length, 1000);
  assert.equal(capped.capped, true);
  const exact = runMatch({ pattern: String.raw`\d`, flags: G, text: "1".repeat(1000) });
  assert.equal(exact.matches.length, 1000);
  assert.equal(exact.capped, false);
});

test("replace with a capped list refuses to fabricate a result", () => {
  assert.throws(
    () => runReplace({ pattern: String.raw`\d`, flags: G, text: "1".repeat(1500), replacement: "x" }),
    (error) => error.code === "MATCH_LIMIT_REACHED",
  );
});

test("astral characters: indices in units and in code points", () => {
  const outcome = runMatch({ pattern: "b", flags: G, text: "😀b" });
  assert.equal(outcome.matches.length, 1);
  const [match] = outcome.matches;
  assert.deepEqual([match.startUnit, match.endUnit, match.startCp, match.endCp], [2, 3, 1, 2]);
});

test("code-point index follows the slice definition inside a surrogate pair", () => {
  // Without u, "." matches each surrogate half on its own. The SPEC
  // defines code-point index as the code points of the slice before
  // the index, and a lone surrogate iterates as one code point.
  const outcome = runMatch({ pattern: ".", flags: G, text: "😀" });
  assert.equal(outcome.matches.length, 2);
  assert.deepEqual(
    outcome.matches.map((m) => [m.startUnit, m.endUnit, m.startCp, m.endCp]),
    [[0, 1, 0, 1], [1, 2, 1, 1]],
  );
  const table = buildCodePointIndex("😀b");
  assert.deepEqual([...table], [0, 1, 1, 2]);
  assert.equal(countCodePoints("😀b"), 2);
});

test("each flag's isolated effect", () => {
  assert.equal(runMatch({ pattern: "abc", flags: { i: true }, text: "ABC" }).matches.length, 1);
  assert.equal(runMatch({ pattern: "abc", flags: {}, text: "ABC" }).matches.length, 0);
  assert.equal(runMatch({ pattern: "^b", flags: { g: true, m: true }, text: "a\nb" }).matches.length, 1);
  assert.equal(runMatch({ pattern: "^b", flags: G, text: "a\nb" }).matches.length, 0);
  assert.equal(runMatch({ pattern: "a.b", flags: { s: true }, text: "a\nb" }).matches.length, 1);
  assert.equal(runMatch({ pattern: "a.b", flags: {}, text: "a\nb" }).matches.length, 0);
  const uni = runMatch({ pattern: ".", flags: { u: true }, text: "😀" });
  assert.equal(uni.matches.length, 1);
  assert.deepEqual([uni.matches[0].startUnit, uni.matches[0].endUnit], [0, 2]);
});

test("non-participating groups are null; participating empty groups are empty strings", () => {
  const left = runMatch({ pattern: "(a)|(b*)", flags: {}, text: "ac" });
  assert.deepEqual(left.matches[0].groups.map((g) => g.value), ["a", null]);
  const right = runMatch({ pattern: "(a)|(b*)", flags: {}, text: "c" });
  assert.equal(right.matches[0].text, "");
  assert.deepEqual(right.matches[0].groups.map((g) => g.value), [null, ""]);
});

test("named group scanner ignores classes, escapes and lookbehind", () => {
  assert.deepEqual(
    namedGroupsOf(String.raw`(?<y>\d{4})-(?<m>\d{2})`),
    [{ number: 1, name: "y" }, { number: 2, name: "m" }],
  );
  assert.deepEqual(namedGroupsOf("[(](?<a>x)"), [{ number: 1, name: "a" }]);
  assert.deepEqual(namedGroupsOf(String.raw`\((?<b>y)`), [{ number: 1, name: "b" }]);
  assert.deepEqual(namedGroupsOf("(?<=a)(?<c>b)"), [{ number: 1, name: "c" }]);
  assert.deepEqual(namedGroupsOf("(?:x)(y)"), []);
});

test("substitution: $$, $&, $` and $' follow GetSubstitution", () => {
  const dollar = runReplace({ pattern: "a", flags: {}, text: "a", replacement: "$$" });
  assert.equal(dollar.result, "$");
  const whole = runReplace({ pattern: "b", flags: {}, text: "ab", replacement: "<$&>" });
  assert.equal(whole.result, "a<b>");
  const around = runReplace({ pattern: "b", flags: {}, text: "abc", replacement: "[$`|$']" });
  assert.equal(around.result, "a[a|c]c");
});

test("substitution: two-digit group references resolve exactly as the engine does", () => {
  const ten = runReplace({
    pattern: "(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)",
    flags: {},
    text: "abcdefghij",
    replacement: "$10",
  });
  assert.equal(ten.result, "j");
  const oneOnly = runReplace({ pattern: "(a)", flags: {}, text: "a", replacement: "$10" });
  assert.equal(oneOnly.result, "a0");
  const fallback = runReplace({ pattern: "(a)(b)", flags: {}, text: "ab", replacement: "$12-$21" });
  assert.equal(fallback.result, "a2-b1");
  const literal = runReplace({ pattern: "(a)", flags: {}, text: "a", replacement: "$99/$0" });
  assert.equal(literal.result, "$99/$0");
});

test("substitution: named groups, unknown names, non-participating groups", () => {
  const named = runReplace({ pattern: String.raw`(?<w>a)`, flags: {}, text: "a", replacement: "$<w>$<w>" });
  assert.equal(named.result, "aa");
  assert.throws(
    () => runReplace({ pattern: "(a)", flags: {}, text: "a", replacement: "$<nope>" }),
    (error) => error.code === "UNKNOWN_GROUP" && error.params.name === "nope",
  );
  const missing = runReplace({ pattern: "(a)|(b)", flags: {}, text: "b", replacement: "[$1][$2]" });
  assert.equal(missing.result, "[][b]");
});

test("substitution: $` in a multi-match replace uses each match's own prefix", () => {
  const outcome = runReplace({ pattern: String.raw`\d`, flags: G, text: "1 2", replacement: "($`)" });
  assert.equal(outcome.result, "() (1 )");
  assert.equal(outcome.count, 2);
});

test("replace honours g off (first only) and g on (all)", () => {
  const first = runReplace({ pattern: "a", flags: {}, text: "aaa", replacement: "b" });
  assert.deepEqual([first.result, first.count], ["baa", 1]);
  const all = runReplace({ pattern: "a", flags: G, text: "aaa", replacement: "b" });
  assert.deepEqual([all.result, all.count], ["bbb", 3]);
});

test("expandReplacement is exercised directly for the trailing-dollar case", () => {
  const raw = ["a"];
  raw.index = 0;
  assert.equal(expandReplacement("x$", raw, "a", null), "x$");
  assert.equal(expandReplacement("$x", raw, "a", null), "$x");
});

test("limits are named coded errors, counted in code points", () => {
  assert.throws(
    () => runMatch({ pattern: "a".repeat(501), flags: G, text: "" }),
    (error) => error.code === "PATTERN_TOO_LONG",
  );
  assert.throws(
    () => runMatch({ pattern: "a", flags: G, text: "x".repeat(50001) }),
    (error) => error.code === "TEXT_TOO_LONG",
  );
  assert.throws(
    () => runReplace({ pattern: "a", flags: G, text: "a", replacement: "x".repeat(1001) }),
    (error) => error.code === "REPLACEMENT_TOO_LONG",
  );
  // 250 astral characters = 250 code points (500 code units): allowed.
  const outcome = runMatch({ pattern: "😀".repeat(250), flags: {}, text: "" });
  assert.equal(outcome.matches.length, 0);
  // Exactly at each limit is allowed.
  assert.equal(runMatch({ pattern: "a".repeat(500), flags: {}, text: "" }).matches.length, 0);
  assert.equal(runMatch({ pattern: "z", flags: {}, text: "x".repeat(50000) }).matches.length, 0);
});

test("timing is measured and rounded to whole milliseconds", () => {
  const readings = [100, 175];
  const outcome = runMatch(
    { pattern: "a", flags: G, text: "a" },
    { now: () => readings.shift() },
  );
  assert.equal(outcome.elapsedMs, 75);
});

test("presets ship the documented pattern and text pairs", () => {
  const date = presetById("date");
  assert.equal(date.pattern, String.raw`(\d{4})-(\d{2})-(\d{2})`);
  assert.equal(date.text, "due 2026-11-02, was 2025-01-30");
  const email = presetById("email");
  const found = runMatch({ pattern: email.pattern, flags: G, text: email.text });
  assert.deepEqual(found.matches.map((m) => m.text), ["sam@example.com", "lee@sample.org"]);
  const order = presetById("order");
  const orders = runMatch({ pattern: order.pattern, flags: G, text: order.text });
  assert.equal(orders.matches.length, 2);
  const log = presetById("log");
  const logs = runMatch({ pattern: log.pattern, flags: G, text: log.text });
  assert.equal(logs.matches.length, 2);
  assert.equal(presetById("nope"), null);
});
