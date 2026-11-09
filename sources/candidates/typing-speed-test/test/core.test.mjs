import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AttemptSession,
  comparePositions,
  countCorrect,
  createPassageDeck,
  formatAccuracy,
  reviewMistakes,
  roundHalfAway,
  scoreAttempt,
  validatePassage,
} from "../public/js/core/typing.mjs";
import { PASSAGES } from "../public/js/passages.mjs";
import { FIXTURE_EN, FIXTURE_ZH } from "./fixtures/passages.mjs";

test("fixture passages have the SPEC lengths", () => {
  // The SPEC calls the English fixture 45 characters; the quoted
  // string itself has 44. See VERIFICATION.md (SPEC defect).
  assert.equal([...FIXTURE_EN.text].length, 44);
  assert.equal([...FIXTURE_ZH.text].length, 10);
});

test("fixture (1): exact pangram, 30 s expiry, 18/18 WPM at 100.0%", () => {
  // With the fixture string's true 44 characters, the formulas give
  // raw 17.6 WPM, which displays as the SPEC's stated 18/18 at 100.0%.
  const r = scoreAttempt({ passageLang: "en", typed: FIXTURE_EN.text, correct: 44, elapsedSeconds: 30 });
  assert.equal(r.gross, 17.6);
  assert.equal(r.grossDisplay, 18);
  assert.equal(r.netDisplay, 18);
  assert.equal(r.accuracyDisplay, "100.0%");
  assert.equal(r.unit, "WPM");
});

test("fixture (2) values: T=50 with 5 wrong in 60 s scores 10/9 at 90.0%", () => {
  // SPEC tension, recorded in VERIFICATION.md: fixture (2) states
  // T=50, which the 45-character fixture passage cannot produce
  // (input beyond the passage length is refused). The normative
  // content of the fixture is its numbers, so they are asserted here
  // through the scoring core against a longer synthetic passage.
  const passage = `${FIXTURE_EN.text} Pack my box with five dozen liquor jugs.`;
  const chars = [...passage];
  const typedChars = chars.slice(0, 50);
  for (const index of [5, 15, 25, 35, 45]) {
    typedChars[index] = typedChars[index] === "x" ? "z" : "x";
  }
  const typed = typedChars.join("");
  const correct = countCorrect(passage, typed);
  assert.equal(correct, 45);
  const r = scoreAttempt({ passageLang: "en", typed, correct, elapsedSeconds: 60 });
  assert.equal(r.grossDisplay, 10);
  assert.equal(r.netDisplay, 9);
  assert.equal(r.accuracyDisplay, "90.0%");
});

test("fixture (3): completion at 20.0 s, formula value 26.4 -> 26", () => {
  // The SPEC states net 27 WPM here, from its miscounted 45
  // characters; with the true 44 the formula gives (44/5)/(20/60) =
  // 26.4 -> 26. The formula governs; see VERIFICATION.md.
  let now = 1000;
  const session = new AttemptSession({ passage: FIXTURE_EN.text, durationSeconds: 30, now: () => now });
  session.setTyped("T");
  now = 21000;
  session.setTyped(FIXTURE_EN.text);
  assert.equal(session.state, "locked");
  assert.equal(session.endReason, "completion");
  const r = session.result();
  assert.equal(r.elapsedSeconds, 20.0);
  assert.equal(r.net, 26.400000000000002);
  assert.equal(r.netDisplay, 26);
  assert.equal(r.grossDisplay, 26);
});

test("fixture (4): Chinese, 8 of 10 correct in 30 s, CPM only", () => {
  const typedChars = [...FIXTURE_ZH.text];
  typedChars[2] = "蚊";
  typedChars[7] = "不";
  const typed = typedChars.join("");
  const correct = countCorrect(FIXTURE_ZH.text, typed);
  assert.equal(correct, 8);
  const r = scoreAttempt({ passageLang: "zh", typed, correct, elapsedSeconds: 30 });
  assert.equal(r.unit, "CPM");
  assert.equal(r.netDisplay, 16);
  assert.equal(r.grossDisplay, 20);
  assert.equal(r.accuracyDisplay, "80.0%");
});

test("display rounding: halves away from zero; accuracy to one decimal", () => {
  const r = scoreAttempt({ passageLang: "en", typed: "x".repeat(95), correct: 95, elapsedSeconds: 120 });
  assert.equal(r.net, 9.5);
  assert.equal(r.netDisplay, 10);
  assert.equal(roundHalfAway(2.5), 3);
  assert.equal(formatAccuracy(2, 3), "66.7%");
  assert.equal(formatAccuracy(45, 45), "100.0%");
});

test("positional rule: one early error poisons later positions until fixed", () => {
  const passage = "abcdef";
  assert.deepEqual(comparePositions(passage, "axcdef"), [true, false, true, true, true, true]);
  assert.deepEqual(comparePositions(passage, "xbcdef"), [false, true, true, true, true, true]);
  const session = new AttemptSession({ passage: "abcdefg", durationSeconds: 30, now: () => 0 });
  session.setTyped("xbcdef");
  assert.equal(countCorrect("abcdefg", session.typed), 5);
  session.setTyped("bcdef");
  session.setTyped("abcdef");
  assert.equal(countCorrect("abcdefg", session.typed), 6);
});

test("session timing: starts on first commit, expiry locks at the full duration", () => {
  let now = 5000;
  const session = new AttemptSession({ passage: FIXTURE_EN.text, durationSeconds: 30, now: () => now });
  assert.equal(session.state, "setup");
  session.setTyped("T");
  assert.equal(session.state, "running");
  now = 5000 + 29999;
  assert.equal(session.checkExpiry(), false);
  now = 5000 + 30000;
  assert.equal(session.checkExpiry(), true);
  assert.equal(session.endReason, "expiry");
  const r = session.result();
  assert.equal(r.elapsedSeconds, 30);
  assert.equal(r.total, 1);
  const refused = session.setTyped("More");
  assert.equal(refused.accepted, false);
  assert.equal(session.typed, "T");
});

test("characters beyond the passage length are refused", () => {
  const session = new AttemptSession({ passage: "abc", durationSeconds: 30, now: () => 0 });
  session.setTyped("abcd");
  assert.equal(session.typed, "abc");
});

test("T=0 at expiry yields the no-result state", () => {
  let now = 0;
  const session = new AttemptSession({ passage: FIXTURE_EN.text, durationSeconds: 30, now: () => now });
  session.setTyped("x");
  session.setTyped("");
  now = 30000;
  session.checkExpiry();
  assert.equal(session.result().noResult, true);
});

test("review grouping: English words listed once, untyped words ignored", () => {
  assert.deepEqual(reviewMistakes("hello world", "hallo warld").entries, [
    { expected: "hello", typed: "hallo" },
    { expected: "world", typed: "warld" },
  ]);
  assert.deepEqual(reviewMistakes("hello world", "hel").entries, []);
  // A mistyped space belongs to no word (SPEC: words are maximal runs
  // between spaces), so it lists nothing by itself.
  assert.deepEqual(reviewMistakes("ab cd", "abxcd").entries, []);
});

test("review grouping: Chinese characters with occurrence counts", () => {
  const review = reviewMistakes("天天向上天天", "大天向上大天");
  assert.deepEqual(review.entries, [{ expected: "天", typed: "大", count: 2 }]);
});

test("all shipped passages validate and PASSAGES.md lists each id", async () => {
  const doc = await readFile(new URL("../PASSAGES.md", import.meta.url), "utf8");
  for (const lang of ["en", "zh"]) {
    assert.ok(PASSAGES[lang].length >= 6);
    for (const passage of PASSAGES[lang]) {
      assert.deepEqual(validatePassage(passage.text, lang), [], passage.id);
      assert.ok(doc.includes(passage.id), passage.id);
    }
  }
});

test("validators catch the rule violations they name", () => {
  assert.ok(validatePassage("Too short.", "en").includes("LENGTH"));
  assert.ok(validatePassage(`Has  double ${"x".repeat(620)}`, "en").includes("DOUBLE_SPACE"));
  assert.ok(validatePassage("中文裡有 space 不行", "zh").includes("SPACE_IN_ZH"));
  assert.ok(validatePassage("これはテストです", "zh").includes("CHARSET"));
  assert.ok(validatePassage(`${"正".repeat(320)}😀`, "zh").includes("NON_BMP"));
});

test("deck draws without repetition until the set is exhausted", () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const deck = createPassageDeck(PASSAGES.en, random);
  const drawn = new Set();
  for (let i = 0; i < 6; i += 1) drawn.add(deck.next().id);
  assert.equal(drawn.size, 6);
});
