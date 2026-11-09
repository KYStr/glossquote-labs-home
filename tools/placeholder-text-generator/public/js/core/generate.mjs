// Pure generation + validation core for the Placeholder Text Generator.
// Implements SPEC.md section 4 exactly: draw order is part of the contract.
// No DOM, network or storage access anywhere in this module.
import { mulberry32, drawIndex } from "./prng.mjs";
import { LATIN_WORDS, ZH_SENTENCES, OPENING_SENTENCE } from "./pools.mjs";

export const CONTENT_LANGS = Object.freeze(["latin", "zh"]);
export const UNITS = Object.freeze(["paragraphs", "sentences", "words", "characters"]);

// Count ranges per unit (SPEC section 2c). The zh words unit does not exist:
// Chinese has no word spaces, so a word count would be fabricated.
export const COUNT_RANGES = Object.freeze({
  paragraphs: Object.freeze({ min: 1, max: 50 }),
  sentences: Object.freeze({ min: 1, max: 200 }),
  words: Object.freeze({ min: 10, max: 5000 }),
  characters: Object.freeze({ min: 10, max: 20000 }),
});

export const SEED_MIN = 0;
export const SEED_MAX = 4294967295;

export const DEFAULT_SETTINGS = Object.freeze({
  contentLang: "latin",
  unit: "paragraphs",
  count: 3,
  seed: 42,
  opening: true,
});

// Validate raw settings. Returns { ok: true, value } with normalised values,
// or { ok: false, errors } where errors maps field -> machine-readable code:
//   count: "not_integer" | "below_min" | "above_max"
//   seed: "not_uint32"
//   unit: "unit_unavailable" (zh + words) | "invalid_value"
//   contentLang: "invalid_value"
//   opening: "invalid_value"
export function validateSettings(input) {
  const errors = {};
  const src = input && typeof input === "object" ? input : {};

  const contentLang = src.contentLang;
  if (!CONTENT_LANGS.includes(contentLang)) errors.contentLang = "invalid_value";

  const unit = src.unit;
  if (!UNITS.includes(unit)) errors.unit = "invalid_value";
  else if (contentLang === "zh" && unit === "words") errors.unit = "unit_unavailable";

  let count;
  if (UNITS.includes(unit)) {
    count = src.count;
    if (typeof count !== "number" || !Number.isInteger(count)) {
      errors.count = "not_integer";
    } else {
      const range = COUNT_RANGES[unit];
      if (count < range.min) errors.count = "below_min";
      else if (count > range.max) errors.count = "above_max";
    }
  }

  const seed = src.seed;
  if (
    typeof seed !== "number" ||
    !Number.isInteger(seed) ||
    seed < SEED_MIN ||
    seed > SEED_MAX
  ) {
    errors.seed = "not_uint32";
  }

  if (typeof src.opening !== "boolean") errors.opening = "invalid_value";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { contentLang, unit, count, seed, opening: src.opening },
  };
}

function capitalise(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// One Latin sentence by the pinned model: length draw first
// (L = 6 + floor(draw * 9), so 6-14), then L word draws with replacement.
function drawLatinSentence(next, pool) {
  const length = 6 + Math.floor(next() * 9);
  const words = [];
  for (let i = 0; i < length; i += 1) {
    words.push(pool[drawIndex(next, pool.length)]);
  }
  return capitalise(words.join(" ")) + ".";
}

// One Latin paragraph: the sentence-count draw (3 + floor(draw * 4), so 3-6)
// happens first, before any sentence draws. When the classic opening is
// pending it occupies the first sentence slot and consumes no draws.
function drawLatinParagraph(next, pool, openingPending) {
  const sentenceCount = 3 + Math.floor(next() * 4);
  const sentences = [];
  if (openingPending) sentences.push(OPENING_SENTENCE);
  while (sentences.length < sentenceCount) {
    sentences.push(drawLatinSentence(next, pool));
  }
  return sentences;
}

// One zh paragraph: sentence count drawn first (2 + floor(draw * 3), so
// 2-4), then that many single draws from the sentence pool (with
// replacement; repeats are expected and stated in the SPEC).
function drawZhParagraph(next, pool) {
  const sentenceCount = 2 + Math.floor(next() * 3);
  const sentences = [];
  for (let i = 0; i < sentenceCount; i += 1) {
    sentences.push(pool[drawIndex(next, pool.length)]);
  }
  return sentences;
}

function joinParagraph(sentences, contentLang) {
  return contentLang === "zh" ? sentences.join("") : sentences.join(" ");
}

// Generate by the paragraph model until cumulative plain-text length (code
// points, paragraphs joined by a blank line) reaches `target`, for the
// characters unit. Returns the paragraph sentence-lists drawn.
function drawParagraphsUntilLength(settings, next, pools, target) {
  const paragraphs = [];
  let openingPending = settings.contentLang === "latin" && settings.opening;
  let length = 0;
  while (length < target) {
    const sentences =
      settings.contentLang === "latin"
        ? drawLatinParagraph(next, pools.latin, openingPending)
        : drawZhParagraph(next, pools.zh);
    openingPending = false;
    const text = joinParagraph(sentences, settings.contentLang);
    length += [...text].length + (paragraphs.length > 0 ? 2 : 0);
    paragraphs.push(sentences);
  }
  return paragraphs;
}

// Words unit (Latin only): sentences by the same model until the cumulative
// word count reaches the request, then the final sentence is cut to land on
// exactly the requested number of words and terminated by "." The canonical
// opening, when on, is the first sentence and its words count.
function generateLatinWords(settings, next, pool) {
  const target = settings.count;
  const sentences = [];
  let total = 0;
  if (settings.opening) {
    sentences.push(OPENING_SENTENCE);
    total += OPENING_SENTENCE.slice(0, -1).split(" ").length;
  }
  while (total < target) {
    const sentence = drawLatinSentence(next, pool);
    sentences.push(sentence);
    total += sentence.slice(0, -1).split(" ").length;
  }
  if (total > target) {
    const lastWords = sentences[sentences.length - 1].slice(0, -1).split(" ");
    const keep = lastWords.length - (total - target);
    sentences[sentences.length - 1] =
      capitalise(lastWords.slice(0, keep).join(" ")) + ".";
  }
  return [sentences];
}

// Serialisers (SPEC section 2f). Plain text joins paragraphs by a blank
// line. HTML wraps each paragraph in <p>...</p> after escaping &, <, >.
export function toPlainText(paragraphTexts) {
  return paragraphTexts.join("\n\n");
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function toHtml(paragraphTexts) {
  return paragraphTexts.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
}

// Facts are counted from the final output string, so they always describe
// what is actually shown (SPEC section 2g). Counts are Unicode code points,
// never UTF-16 units.
export function countFacts(paragraphTexts, contentLang) {
  const plain = toPlainText(paragraphTexts);
  const sentences = [...plain].filter(
    (ch) => ch === "." || ch === "。",
  ).length;
  return {
    paragraphs: paragraphTexts.length,
    sentences,
    words:
      contentLang === "latin"
        ? plain.split(/\s+/).filter((w) => w.length > 0).length
        : null,
    codePoints: [...plain].length,
  };
}

// Generate output for already-validated settings. `poolOverrides` exists for
// tests only (micro pools, hostile pools); production callers pass nothing.
// Returns { paragraphs: string[], plainText, htmlText, facts, truncated }.
export function generate(settings, poolOverrides) {
  const pools = {
    latin: poolOverrides?.latin ?? LATIN_WORDS,
    zh: poolOverrides?.zh ?? ZH_SENTENCES,
  };
  const next = mulberry32(settings.seed);
  let paragraphSentences;
  let truncated = false;

  if (settings.unit === "paragraphs") {
    paragraphSentences = [];
    let openingPending = settings.contentLang === "latin" && settings.opening;
    for (let i = 0; i < settings.count; i += 1) {
      paragraphSentences.push(
        settings.contentLang === "latin"
          ? drawLatinParagraph(next, pools.latin, openingPending)
          : drawZhParagraph(next, pools.zh),
      );
      openingPending = false;
    }
  } else if (settings.unit === "sentences") {
    // Sentence mode yields one block of exactly `count` sentences; the
    // opening, when on, is the first sentence and consumes no draws.
    const sentences = [];
    if (settings.contentLang === "latin" && settings.opening) {
      sentences.push(OPENING_SENTENCE);
    }
    while (sentences.length < settings.count) {
      sentences.push(
        settings.contentLang === "latin"
          ? drawLatinSentence(next, pools.latin)
          : pools.zh[drawIndex(next, pools.zh.length)],
      );
    }
    paragraphSentences = [sentences];
  } else if (settings.unit === "words") {
    paragraphSentences = generateLatinWords(settings, next, pools.latin);
  } else {
    // characters: paragraph model until the plain text reaches N code
    // points, then truncate the plain-text form to exactly N code points
    // (the cut may span the paragraph join or land mid-sentence).
    const drawn = drawParagraphsUntilLength(
      settings,
      next,
      pools,
      settings.count,
    );
    const full = toPlainText(
      drawn.map((s) => joinParagraph(s, settings.contentLang)),
    );
    const cut = [...full].slice(0, settings.count).join("");
    truncated = [...full].length > settings.count;
    const paragraphTexts = cut.split("\n\n");
    return {
      paragraphs: paragraphTexts,
      plainText: cut,
      htmlText: toHtml(paragraphTexts),
      facts: countFacts(paragraphTexts, settings.contentLang),
      truncated,
    };
  }

  const paragraphTexts = paragraphSentences.map((s) =>
    joinParagraph(s, settings.contentLang),
  );
  return {
    paragraphs: paragraphTexts,
    plainText: toPlainText(paragraphTexts),
    htmlText: toHtml(paragraphTexts),
    facts: countFacts(paragraphTexts, settings.contentLang),
    truncated,
  };
}
