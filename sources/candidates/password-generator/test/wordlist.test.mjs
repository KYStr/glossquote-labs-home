import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { WORDS } from "../public/js/core/wordlist.mjs";

test("wordlist carries exactly 7,776 unique entries in source order", () => {
  assert.equal(WORDS.length, 7776);
  assert.equal(new Set(WORDS).size, 7776);
  assert.equal(WORDS[0], "abacus");
  assert.equal(WORDS[WORDS.length - 1], "zoom");
  for (const word of WORDS) {
    assert.equal(typeof word, "string");
    assert.ok(word.length > 0);
    assert.equal(word, word.toLowerCase());
  }
});

test("the four hyphenated EFF entries are shipped verbatim and documented", () => {
  const hyphenated = WORDS.filter((word) => word.includes("-"));
  assert.deepEqual(hyphenated, ["drop-down", "felt-tip", "t-shirt", "yo-yo"]);
});

test("provenance record carries the source URL and SHA-256", () => {
  const provenance = readFileSync(new URL("../WORDLIST-SOURCE.md", import.meta.url), "utf8");
  assert.ok(provenance.includes("https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt"));
  assert.ok(provenance.includes("addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e"));
  assert.ok(provenance.includes("Creative Commons Attribution"));
});
