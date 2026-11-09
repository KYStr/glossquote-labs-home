import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  validateSettings,
  toHtml,
  escapeHtml,
  COUNT_RANGES,
} from "../public/js/core/generate.mjs";
import { LATIN_WORDS, OPENING_SENTENCE } from "../public/js/core/pools.mjs";
import { incrementSeed } from "../public/js/core/prng.mjs";

const latin = (over) => ({
  contentLang: "latin",
  unit: "paragraphs",
  count: 3,
  seed: 42,
  opening: true,
  ...over,
});
const zh = (over) => ({
  contentLang: "zh",
  unit: "paragraphs",
  count: 3,
  seed: 42,
  opening: false,
  ...over,
});

test("validation: valid defaults pass and normalise", () => {
  const r = validateSettings(latin({}));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, latin({}));
});

test("validation: every unit refuses one below min and one above max", () => {
  for (const [unit, range] of Object.entries(COUNT_RANGES)) {
    const lang = unit === "words" ? "latin" : "latin";
    const base = { contentLang: lang, unit, seed: 42, opening: false };
    assert.equal(
      validateSettings({ ...base, count: range.min - 1 }).errors.count,
      "below_min",
      `${unit} min`,
    );
    assert.equal(
      validateSettings({ ...base, count: range.max + 1 }).errors.count,
      "above_max",
      `${unit} max`,
    );
    assert.equal(validateSettings({ ...base, count: range.min }).ok, true);
    assert.equal(validateSettings({ ...base, count: range.max }).ok, true);
    assert.equal(
      validateSettings({ ...base, count: range.min + 0.5 }).errors.count,
      "not_integer",
    );
  }
});

test("validation: seed must be a uint32", () => {
  const base = { contentLang: "latin", unit: "paragraphs", count: 3, opening: true };
  assert.equal(validateSettings({ ...base, seed: 0 }).ok, true);
  assert.equal(validateSettings({ ...base, seed: 4294967295 }).ok, true);
  assert.equal(validateSettings({ ...base, seed: -1 }).errors.seed, "not_uint32");
  assert.equal(validateSettings({ ...base, seed: 4294967296 }).errors.seed, "not_uint32");
  assert.equal(validateSettings({ ...base, seed: 1.5 }).errors.seed, "not_uint32");
  assert.equal(validateSettings({ ...base, seed: NaN }).errors.seed, "not_uint32");
});

test("validation: zh words unit is refused as unavailable", () => {
  const r = validateSettings(zh({ unit: "words", count: 100 }));
  assert.equal(r.ok, false);
  assert.equal(r.errors.unit, "unit_unavailable");
});

test("paragraphs: requested count, classic opening heads the output when on", () => {
  const out = generate(latin({ count: 3 }));
  assert.equal(out.paragraphs.length, 3);
  assert.equal(out.facts.paragraphs, 3);
  assert.ok(out.plainText.startsWith(OPENING_SENTENCE));
  const off = generate(latin({ count: 3, opening: false }));
  assert.ok(!off.plainText.startsWith(OPENING_SENTENCE));
});

test("paragraph sentence counts stay in range (Latin 3-6, zh 2-4)", () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const l = generate(latin({ count: 5, seed, opening: false }));
    for (const p of l.paragraphs) {
      const n = p.split(". ").length;
      assert.ok(n >= 3 && n <= 6, `latin paragraph sentences ${n}`);
    }
    const z = generate(zh({ count: 5, seed }));
    for (const p of z.paragraphs) {
      const n = [...p].filter((c) => c === "。").length;
      assert.ok(n >= 2 && n <= 4, `zh paragraph sentences ${n}`);
    }
  }
});

test("Latin sentence word counts stay within 6-14", () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const out = generate(latin({ unit: "sentences", count: 20, seed, opening: false }));
    const sentences = out.paragraphs[0].split(". ").map((s) => s.replace(/\.$/, ""));
    assert.equal(sentences.length, 20);
    for (const s of sentences) {
      const n = s.split(" ").length;
      assert.ok(n >= 6 && n <= 14, `sentence words ${n}`);
    }
  }
});

test("Latin sentences use only pool words (plus capitalisation)", () => {
  const pool = new Set(LATIN_WORDS);
  const out = generate(latin({ unit: "sentences", count: 30, seed: 99, opening: false }));
  for (const w of out.plainText.replace(/\./g, "").split(/\s+/)) {
    assert.ok(pool.has(w.toLowerCase()), `word not in pool: ${w}`);
  }
});

test("sentences mode: exact count, opening is the first sentence when on", () => {
  const out = generate(latin({ unit: "sentences", count: 7 }));
  assert.equal(out.facts.sentences, 7);
  assert.ok(out.plainText.startsWith(OPENING_SENTENCE + " "));
  const z = generate(zh({ unit: "sentences", count: 9 }));
  assert.equal(z.facts.sentences, 9);
});

test("words mode lands on exactly N words (10, 100, 5000)", () => {
  for (const n of [10, 100, 5000]) {
    const out = generate(latin({ unit: "words", count: n, opening: false }));
    assert.equal(out.facts.words, n, `words ${n}`);
    assert.ok(out.plainText.endsWith("."));
  }
  // With the opening on, its 8 words count toward the total.
  const withOpening = generate(latin({ unit: "words", count: 10 }));
  assert.equal(withOpening.facts.words, 10);
  assert.ok(withOpening.plainText.startsWith("Lorem ipsum"));
});

test("fixture 4: 10 Latin characters with opening on yields 'Lorem ipsu'", () => {
  const out = generate(latin({ unit: "characters", count: 10 }));
  assert.equal(out.plainText, "Lorem ipsu");
  assert.equal(out.facts.codePoints, 10);
  assert.equal(out.truncated, true);
});

test("characters mode: exactly N code points, including across a paragraph join", () => {
  for (const n of [10, 500, 20000]) {
    const out = generate(latin({ unit: "characters", count: n }));
    assert.equal(out.facts.codePoints, n, `latin chars ${n}`);
    const z = generate(zh({ unit: "characters", count: n }));
    assert.equal(z.facts.codePoints, n, `zh chars ${n}`);
  }
  // Find a case where the cut spans the "\n\n" paragraph join, then verify
  // the join survives inside the truncated output at the same position.
  const wide = generate(latin({ unit: "characters", count: 20000, opening: false }));
  const joinAt = wide.plainText.indexOf("\n\n");
  assert.ok(joinAt > 0, "expected multiple paragraphs");
  const n = joinAt + 5;
  const cut = generate(latin({ unit: "characters", count: n, opening: false }));
  assert.equal(cut.facts.codePoints, n);
  assert.equal(cut.plainText.slice(joinAt, joinAt + 2), "\n\n");
});

test("determinism: identical settings reproduce byte-identically; re-seeding too", () => {
  const settings = latin({ count: 4, seed: 1234 });
  const a = generate(settings);
  const b = generate(settings);
  assert.equal(a.plainText, b.plainText);
  assert.equal(a.htmlText, b.htmlText);
  generate(latin({ seed: 5 })); // unrelated run in between
  const c = generate(settings);
  assert.equal(c.plainText, a.plainText);
});

test("seed increment changes the output (fixture corpus settings)", () => {
  const base = latin({ seed: 42 });
  const bumped = latin({ seed: incrementSeed(42) });
  assert.notEqual(generate(base).plainText, generate(bumped).plainText);
});

test("serialisers: plain joins with a blank line; HTML wraps and escapes", () => {
  const out = generate(latin({ count: 2 }));
  assert.equal(out.plainText, out.paragraphs.join("\n\n"));
  assert.equal(
    out.htmlText,
    out.paragraphs.map((p) => `<p>${p}</p>`).join("\n"),
  );
  assert.equal(escapeHtml(`a<b>&"c"`), `a&lt;b&gt;&amp;"c"`);
  assert.equal(
    toHtml(["<script>alert(1)</script> & done"]),
    "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; done</p>",
  );
});

test("generation with a hostile micro pool still escapes in HTML output", () => {
  const hostile = ["<b>", "&amp;", "x>y", "plain"];
  const out = generate(
    { contentLang: "latin", unit: "sentences", count: 3, seed: 42, opening: false },
    { latin: hostile },
  );
  assert.ok(!out.htmlText.includes("<b>"), "raw markup leaked into HTML");
  assert.ok(out.htmlText.includes("&lt;b&gt;"));
});
