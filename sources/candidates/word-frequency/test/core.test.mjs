import assert from "node:assert/strict";
import test from "node:test";

import {
  analyze,
  foldText,
  toCsv,
} from "../public/js/core/frequency.mjs";
import { STOPWORDS_EN } from "../public/js/core/stopwords-en.mjs";
import { STOPWORDS_CJK } from "../public/js/core/stopwords-cjk.mjs";

const rows = (table) => table.rows.map((r) => [r.item, r.count, r.percent]);

test("fixture 1: English words, ordering, display form, percentages", () => {
  const result = analyze("The cat sat. The cat ran, and the dog ran.", {});
  assert.equal(result.words.total, 10);
  assert.equal(result.words.unique, 6);
  assert.deepEqual(rows(result.words), [
    ["The", 3, 30.0], ["cat", 2, 20.0], ["ran", 2, 20.0],
    ["sat", 1, 10.0], ["and", 1, 10.0], ["dog", 1, 10.0],
  ]);
  assert.deepEqual(result.words.rows.map((r) => r.rank), [1, 2, 3, 4, 5, 6]);
});

test("fixture 2: Han characters and bigrams with the run break", () => {
  const result = analyze("我喜歡台灣，台灣喜歡我。", {});
  assert.equal(result.characters.total, 10);
  assert.equal(result.characters.unique, 5);
  assert.deepEqual(rows(result.characters), [
    ["我", 2, 20.0], ["喜", 2, 20.0], ["歡", 2, 20.0], ["台", 2, 20.0], ["灣", 2, 20.0],
  ]);
  assert.equal(result.bigrams.total, 8);
  assert.deepEqual(rows(result.bigrams), [
    ["喜歡", 2, 25.0], ["台灣", 2, 25.0],
    ["我喜", 1, 12.5], ["歡台", 1, 12.5], ["灣喜", 1, 12.5], ["歡我", 1, 12.5],
  ]);
  assert.ok(!result.bigrams.rows.some((r) => r.item === "灣台"));
});

test("fixture 3: apostrophes join, one key, majority display form", () => {
  const result = analyze("don't don't DON'T", {});
  assert.equal(result.words.unique, 1);
  assert.deepEqual(rows(result.words), [["don't", 3, 100.0]]);
});

test("fixture 4: the sigma discriminator a lowercase build cannot pass", () => {
  const result = analyze("Σ ς σ ΣΣ", {});
  assert.equal(result.words.total, 4);
  assert.equal(result.words.unique, 2);
  // The fixture lists folded keys: key σ has count 3. Its display
  // form follows the section 4 rule — the three casings tie at one
  // occurrence each, so the first occurrence (Σ) displays.
  assert.deepEqual(
    result.words.rows.map((r) => [r.key, r.item, r.count, r.percent]),
    [["σ", "Σ", 3, 75.0], ["σσ", "ΣΣ", 1, 25.0]],
  );
  // Sanity: the non-conforming lowercase result really is different.
  assert.notDeepEqual(
    rows(result.words),
    [["σ", 2, 50.0], ["ς", 1, 25.0], ["σσ", 1, 25.0]],
  );
});

test("fixture 5: Greek casing tie goes to the first occurrence", () => {
  const result = analyze("ΑΒΓ αβγ Αβγ", {});
  assert.equal(result.words.unique, 1);
  assert.deepEqual(rows(result.words), [["ΑΒΓ", 3, 100.0]]);
});

test("fixtures 6 and 7: Greek and Cyrillic land in the Words table", () => {
  // The fixtures name the folded keys (ω, ж); the display forms are
  // the majority casings (Ω twice, Ж twice).
  const greek = analyze("Ω ω Ω", {});
  assert.deepEqual(
    greek.words.rows.map((r) => [r.key, r.item, r.count, r.percent]),
    [["ω", "Ω", 3, 100.0]],
  );
  const cyrillic = analyze("Ж ж Ж", {});
  assert.deepEqual(
    cyrillic.words.rows.map((r) => [r.key, r.item, r.count, r.percent]),
    [["ж", "Ж", 3, 100.0]],
  );
});

test("fold: simple case folding per the shipped C and F entries", () => {
  assert.equal(foldText("Σ"), "σ");
  assert.equal(foldText("ς"), "σ");
  assert.equal(foldText("İ"), "İ"); // no C/F entry: unchanged
  assert.equal(foldText("I"), "i"); // no Turkish special case
  assert.equal(foldText("ß"), "ß"); // no C/S entry: unchanged under simple case folding
  assert.equal(foldText("ABC"), "abc");
});

test("tokeniser sweep: apostrophe edges, hyphens, digits, mixed scripts", () => {
  assert.deepEqual(rows(analyze("'tis", {}).words), [["tis", 1, 100.0]]);
  assert.deepEqual(
    rows(analyze("rock 'n' roll", {}).words).map((r) => r[0]),
    ["rock", "n", "roll"],
  );
  assert.deepEqual(
    rows(analyze("well-known", {}).words).map((r) => r[0]),
    ["well", "known"],
  );
  assert.deepEqual(
    rows(analyze("trailing'", {}).words),
    [["trailing", 1, 100.0]],
  );
  const digitsOn = analyze("abc 123 45x", {});
  assert.deepEqual(rows(digitsOn.words).map((r) => r[0]), ["abc", "123", "45x"]);
  const digitsOff = analyze("abc 123 45x", { includeNumbers: false });
  assert.deepEqual(rows(digitsOff.words).map((r) => r[0]), ["abc", "45x"]);
  const mixed = analyze("abc中文def", {});
  assert.deepEqual(rows(mixed.words).map((r) => r[0]), ["abc", "def"]);
  assert.deepEqual(rows(mixed.characters).map((r) => r[0]), ["中", "文"]);
  assert.deepEqual(rows(analyze("カタカナ", {}).characters).map((r) => r[0]), ["カ", "タ", "ナ"]);
  assert.deepEqual(rows(analyze("한국", {}).characters).map((r) => r[0]), ["한", "국"]);
  assert.equal(analyze("カタカナ", {}).bigrams.total, 0);
});

test("filters: stopwords shrink totals; bigram either-character rule; minimums", () => {
  const stop = analyze("The cat and the dog", {
    stopwordsOn: true,
    stopwordWords: new Set(STOPWORDS_EN.map((w) => foldText(w))),
    stopwordChars: new Set(STOPWORDS_CJK),
  });
  assert.equal(stop.words.total, 2);
  assert.deepEqual(rows(stop.words).map((r) => r[0]), ["cat", "dog"]);

  const cjk = analyze("我的貓", {
    stopwordsOn: true,
    stopwordWords: new Set(),
    stopwordChars: new Set(STOPWORDS_CJK),
  });
  assert.deepEqual(rows(cjk.characters), [["貓", 1, 100.0]]);
  assert.equal(cjk.bigrams.total, 0); // 我的 and 的貓 both touch a stopword character

  const length = analyze("a bb ccc", { minLength: 2 });
  assert.equal(length.words.total, 2);
  assert.deepEqual(rows(length.words).map((r) => r[0]), ["bb", "ccc"]);

  const minCount = analyze("The cat sat. The cat ran, and the dog ran.", { minCount: 2 });
  assert.deepEqual(minCount.words.rows.map((r) => r.item), ["The", "cat", "ran"]);
  assert.equal(minCount.words.total, 10); // row threshold does not shrink the counted total
});

test("tie-breaking: equal counts order by first occurrence", () => {
  const result = analyze("b a b a c", {});
  assert.deepEqual(rows(result.words).map((r) => r[0]), ["b", "a", "c"]);
});

test("CSV: header, one-decimal percent, apostrophe unquoted, final LF", () => {
  const result = analyze("don't don't DON'T", {});
  assert.equal(toCsv(result.words.rows), "item,count,percent\ndon't,3,100.0\n");
  // The serialiser still quotes per RFC 4180 when a field needs it
  // (unreachable from real tokens, which cannot contain commas).
  assert.equal(
    toCsv([{ item: 'a,"b"', count: 1, percent: 100 }]),
    'item,count,percent\n"a,""b""",1,100.0\n',
  );
});

test("boundaries: empty and separator-only input, single Han character, cap", () => {
  const empty = analyze("", {});
  assert.equal(empty.words.total, 0);
  assert.deepEqual(empty.words.rows, []);
  assert.equal(analyze("，。！ ", {}).characters.total, 0);
  const single = analyze("漢", {});
  assert.equal(single.characters.total, 1);
  assert.equal(single.bigrams.total, 0);
  const atCap = analyze("a".repeat(200000), {});
  assert.equal(atCap.ok, true);
  const over = analyze("a".repeat(200001), {});
  assert.equal(over.ok, false);
  assert.equal(over.code, "INPUT_TOO_LARGE");
  assert.equal(over.count, 200001);
});
