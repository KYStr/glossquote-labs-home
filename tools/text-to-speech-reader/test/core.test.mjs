import assert from "node:assert/strict";
import test from "node:test";

import {
  ABBREVIATIONS,
  CHUNK_LIMIT,
  TEXT_LIMIT,
  buildChunks,
  chunkSentence,
  codePointLength,
  progressPercent,
  segmentText,
  spokenCharacters,
  totalCharacters,
} from "../public/js/core/tts.mjs";

// --- SPEC section 4 segmentation fixtures, verbatim ---

test("zh fixture segments into exactly 3 sentences", () => {
  assert.deepEqual(segmentText("你好嗎？我很好。今天天氣不錯。"), [
    "你好嗎？",
    "我很好。",
    "今天天氣不錯。",
  ]);
});

test("en fixture: abbreviation and decimal create no boundaries", () => {
  assert.deepEqual(segmentText("Dr. Lee paid 3.14 dollars. Then he left."), [
    "Dr. Lee paid 3.14 dollars.",
    "Then he left.",
  ]);
});

test("every bundled abbreviation blocks its dot", () => {
  assert.deepEqual(
    segmentText("Mr. Smith and Mrs. Lee met Dr. Ho. They talked."),
    ["Mr. Smith and Mrs. Lee met Dr. Ho.", "They talked."],
  );
  assert.deepEqual(
    segmentText("Pick a fruit, e.g. an apple, i.e. one fruit. Done."),
    ["Pick a fruit, e.g. an apple, i.e. one fruit.", "Done."],
  );
  assert.deepEqual(segmentText("Cats vs. dogs is old. Really."), [
    "Cats vs. dogs is old.",
    "Really.",
  ]);
  // The list is closed: etc. never ends a sentence mid-text (SPEC 4).
  assert.deepEqual(
    segmentText("We bought apples, etc. from the store. Then home."),
    ["We bought apples, etc. from the store.", "Then home."],
  );
  assert.equal(ABBREVIATIONS.length, 7);
});

test("decimals never split; digit or quote after space does", () => {
  assert.deepEqual(segmentText("Pi is 3.14 and e is 2.71. Done."), [
    "Pi is 3.14 and e is 2.71.",
    "Done.",
  ]);
  assert.deepEqual(segmentText("He scored 9 points. 3 were bonuses."), [
    "He scored 9 points.",
    "3 were bonuses.",
  ]);
  assert.deepEqual(segmentText('He left. "She stayed."'), [
    "He left.",
    '"She stayed."',
  ]);
});

test("CJK closing quotes and brackets attach to the sentence", () => {
  assert.deepEqual(segmentText("他說：「好。」然後離開。"), [
    "他說：「好。」",
    "然後離開。",
  ]);
  assert.deepEqual(segmentText("真的嗎？」她問。後來呢！"), [
    "真的嗎？」",
    "她問。",
    "後來呢！",
  ]);
});

test("newlines are separators, with and without terminators", () => {
  assert.deepEqual(segmentText("第一行\n第二行"), ["第一行", "第二行"]);
  assert.deepEqual(segmentText("Line one.\nLine two."), [
    "Line one.",
    "Line two.",
  ]);
  assert.deepEqual(segmentText("a\r\nb"), ["a", "b"]);
});

test("lowercase continuation after a period is not a boundary", () => {
  assert.deepEqual(segmentText("Use the file.txt format here. Ok."), [
    "Use the file.txt format here.",
    "Ok.",
  ]);
});

// --- SPEC section 4 validation ---

test("empty and whitespace-only inputs are the empty error", () => {
  for (const input of ["", "   ", " \n\t "]) {
    assert.throws(() => buildChunks(input), (error) => error.code === "EMPTY_TEXT");
  }
});

test("20,001 characters are the limit error; 20,000 are accepted", () => {
  assert.throws(
    () => buildChunks("字".repeat(TEXT_LIMIT + 1)),
    (error) => error.code === "TEXT_TOO_LONG" && error.params.limit === TEXT_LIMIT,
  );
  const { chunks } = buildChunks("字".repeat(TEXT_LIMIT));
  assert.equal(chunks.length, TEXT_LIMIT / CHUNK_LIMIT);
});

// --- SPEC section 4 chunking ---

test("450-character fixture chunks into 3 chunks that reproduce it", () => {
  const sentence = ("字".repeat(149) + "，").repeat(2) + "字".repeat(150);
  assert.equal(codePointLength(sentence), 450);
  const chunks = chunkSentence(sentence, 0, 0);
  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks.map((c) => codePointLength(c.text)), [150, 150, 150]);
  assert.equal(chunks.map((c) => c.text).join(""), sentence);
  assert.deepEqual(chunks.map((c) => c.sentenceIndex), [0, 0, 0]);
  assert.deepEqual(chunks.map((c) => c.ordinal), [0, 1, 2]);
});

test("clause separators are preferred over spaces and hard cuts", () => {
  const sentence = "a".repeat(100) + "，" + "b".repeat(49) + " " + "c".repeat(60);
  const chunks = chunkSentence(sentence, 0, 0);
  assert.equal(chunks[0].text, "a".repeat(100) + "，");
  // The space is the join: it is consumed, not spoken twice.
  const spaced = "x".repeat(150) + " " + "y".repeat(100);
  const spaceChunks = chunkSentence(spaced, 0, 0);
  assert.equal(spaceChunks[0].text, "x".repeat(150));
  assert.equal(spaceChunks[1].text, "y".repeat(100));
  // No separator at all: hard cut at the limit.
  const hard = chunkSentence("z".repeat(401), 0, 0);
  assert.deepEqual(hard.map((c) => codePointLength(c.text)), [200, 200, 1]);
});

test("a single 5,000-character sentence chunks at the limit", () => {
  const { chunks } = buildChunks("字".repeat(5000));
  assert.equal(chunks.length, 25);
  assert.ok(chunks.every((c) => codePointLength(c.text) === CHUNK_LIMIT));
});

test("chunk to sentence index mapping across sentences", () => {
  const long = "字".repeat(250);
  const { sentences, chunks } = buildChunks(`${long}。短句。${long}。`);
  assert.equal(sentences.length, 3);
  assert.deepEqual(
    chunks.map((c) => c.sentenceIndex),
    [0, 0, 1, 2, 2],
  );
  assert.deepEqual(chunks.map((c) => c.ordinal), [0, 1, 2, 3, 4]);
});

test("concatenation invariant over seeded random CJK inputs", () => {
  let seed = 42;
  const random = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let round = 0; round < 50; round += 1) {
    const length = 1 + Math.floor(random() * 600);
    let sentence = "";
    for (let k = 0; k < length; k += 1) {
      sentence += random() < 0.08 ? "，" : "字";
    }
    const chunks = chunkSentence(sentence, 3, 0);
    assert.ok(chunks.every((c) => codePointLength(c.text) <= CHUNK_LIMIT));
    assert.ok(chunks.every((c) => c.text.length > 0));
    assert.equal(chunks.map((c) => c.text).join(""), sentence);
    assert.ok(chunks.every((c) => c.sentenceIndex === 3));
  }
});

// --- SPEC section 4 progress arithmetic ---

test("progress derives from the chunk list and rounds down", () => {
  const chunks = [
    { text: "a".repeat(10), sentenceIndex: 0, ordinal: 0 },
    { text: "b".repeat(20), sentenceIndex: 0, ordinal: 1 },
    { text: "c".repeat(30), sentenceIndex: 1, ordinal: 2 },
  ];
  assert.equal(totalCharacters(chunks), 60);
  assert.equal(spokenCharacters(chunks, 0), 0);
  assert.equal(spokenCharacters(chunks, 1), 10);
  assert.equal(spokenCharacters(chunks, 99), 60);
  assert.equal(progressPercent(chunks, 0), 0);
  assert.equal(progressPercent(chunks, 1), 16);
  assert.equal(progressPercent(chunks, 3), 100);
  assert.equal(progressPercent([], 0), 0);
});
