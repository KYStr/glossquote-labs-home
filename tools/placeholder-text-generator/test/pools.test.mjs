import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { LATIN_WORDS, ZH_SENTENCES, OPENING_SENTENCE } from "../public/js/core/pools.mjs";

// Pool audits required by SPEC sections 4 and 7(f). The Latin count and
// checksum below were recorded when the pool was transcribed from the
// canonical passage; a transcription slip must fail here, loudly.
const LATIN_POOL_COUNT = 63;
const LATIN_POOL_SHA256 =
  "8d30bdc345fbcf258b2dc2c73747d2dc6f22e6964271ca1ddfaa5ebfa9ec4bc3";

test("Latin pool: no duplicates, recorded count and checksum match", () => {
  assert.equal(new Set(LATIN_WORDS).size, LATIN_WORDS.length, "duplicate words");
  assert.equal(LATIN_WORDS.length, LATIN_POOL_COUNT);
  const digest = createHash("sha256")
    .update(LATIN_WORDS.join("\n"), "utf8")
    .digest("hex");
  assert.equal(digest, LATIN_POOL_SHA256);
});

test("Latin pool: every word is lowercase ASCII letters only", () => {
  for (const word of LATIN_WORDS) assert.match(word, /^[a-z]+$/);
});

test("canonical opening sentence is exact", () => {
  assert.equal(
    OPENING_SENTENCE,
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  );
});

test("zh pool audit: >= 24 sentences, each ends with 。, no Latin letters or digits", () => {
  assert.ok(ZH_SENTENCES.length >= 24, `pool size ${ZH_SENTENCES.length}`);
  for (const sentence of ZH_SENTENCES) {
    assert.ok(sentence.endsWith("。"), `missing 。: ${sentence}`);
    assert.ok(!/[A-Za-z0-9]/.test(sentence), `Latin/digit found: ${sentence}`);
  }
  assert.equal(new Set(ZH_SENTENCES).size, ZH_SENTENCES.length, "duplicate sentences");
});
