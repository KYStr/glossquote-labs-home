// Pure core for the Text-to-Speech Reader: input validation, sentence
// segmentation, chunking and progress arithmetic (SPEC section 4).
// Zero DOM access and zero speech-API access; every function here is a
// deterministic function of its input, so it is unit-testable in Node.

export const TEXT_LIMIT = 20000;
export const CHUNK_LIMIT = 200;

// SPEC section 4: the abbreviation list is closed and shipped as data.
// A trailing dot that completes one of these tokens never creates a
// sentence boundary. The list is matched case-sensitively, as written.
export const ABBREVIATIONS = Object.freeze([
  "Mr.", "Mrs.", "Dr.", "e.g.", "i.e.", "etc.", "vs.",
]);

const ABBREVIATION_SET = new Set(ABBREVIATIONS);
const CJK_TERMINATORS = new Set(["。", "！", "？"]);
const LATIN_TERMINATORS = new Set([".", "!", "?"]);
const CLOSING_MARKS = new Set(["」", "』", "”", "’", "）", "】"]);
const OPENING_QUOTES = new Set(["“", "‘", "「", "『", "\"", "'"]);
const CLAUSE_SEPARATORS = new Set(["，", "、", "；", "：", ","]);

function fail(code, params) {
  const error = new Error(code);
  error.code = code;
  if (params) error.params = params;
  throw error;
}

export function codePointLength(text) {
  return Array.from(text).length;
}

function isSeparatorSpace(ch) {
  return ch === " " || ch === "\t" || ch === "　";
}

function isUppercaseLetter(ch) {
  return /\p{Lu}/u.test(ch);
}

function isDigit(ch) {
  return /\p{Nd}/u.test(ch);
}

// The token ending at chars[dotIndex] (inclusive), walking back over
// ASCII letters and dots: "Dr" + "." -> "Dr.", "e.g" + "." -> "e.g.".
function tokenEndingAt(chars, dotIndex) {
  let start = dotIndex;
  while (start > 0 && /[A-Za-z.]/.test(chars[start - 1])) start -= 1;
  return chars.slice(start, dotIndex + 1).join("");
}

// SPEC section 4 segmentation (normative): scan left to right.
// (a) a boundary follows 。！？, attaching immediately following
//     closing quotes/brackets 」』”’）】;
// (b) a boundary follows . ! ? when followed by whitespace and then an
//     uppercase letter, digit or opening quote, or by end of text (the
//     whitespace is consumed as separator, not spoken);
// (c) every newline is a separator.
// Abbreviations and decimal points never create boundaries: a decimal
// point is followed directly by a digit with no whitespace, so rule
// (b) already excludes it, and abbreviation dots are excluded first.
export function segmentText(text) {
  const chars = Array.from(typeof text === "string" ? text : "");
  const sentences = [];
  let current = [];
  const endSentence = () => {
    let start = 0;
    let end = current.length;
    while (start < end && isSeparatorSpace(current[start])) start += 1;
    while (end > start && isSeparatorSpace(current[end - 1])) end -= 1;
    if (end > start) sentences.push(current.slice(start, end).join(""));
    current = [];
  };
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (ch === "\n" || ch === "\r") {
      endSentence();
      i += ch === "\r" && chars[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    current.push(ch);
    if (CJK_TERMINATORS.has(ch)) {
      let j = i + 1;
      while (j < chars.length && CLOSING_MARKS.has(chars[j])) {
        current.push(chars[j]);
        j += 1;
      }
      endSentence();
      i = j;
      continue;
    }
    if (LATIN_TERMINATORS.has(ch)) {
      if (ch === "." && ABBREVIATION_SET.has(tokenEndingAt(chars, i))) {
        i += 1;
        continue;
      }
      let j = i + 1;
      while (j < chars.length && (chars[j] === " " || chars[j] === "\t")) j += 1;
      if (j >= chars.length) {
        endSentence();
        i = j;
        continue;
      }
      // Rule (b) requires actual whitespace before the uppercase letter,
      // digit or opening quote: a decimal point (3.14) is followed
      // directly by a digit with no whitespace and never splits.
      const next = chars[j];
      if (j > i + 1 &&
          (isUppercaseLetter(next) || isDigit(next) || OPENING_QUOTES.has(next))) {
        endSentence();
        i = j;
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  endSentence();
  return sentences;
}

// SPEC section 4 chunking (normative): a sentence longer than
// CHUNK_LIMIT characters is split at the last clause separator
// ，、；：, within the limit (the separator stays at the end of the
// chunk, so the chunks of a sentence partition the sentence exactly);
// failing that, at the last space within the limit (the space is the
// join and is consumed); failing that, a hard cut at the limit.
export function chunkSentence(sentence, sentenceIndex, firstOrdinal) {
  const chars = Array.from(sentence);
  const chunks = [];
  let start = 0;
  let ordinal = firstOrdinal;
  while (chars.length - start > CHUNK_LIMIT) {
    const limit = start + CHUNK_LIMIT;
    let cut = -1;
    let consume = 0;
    for (let p = limit - 1; p > start; p -= 1) {
      if (CLAUSE_SEPARATORS.has(chars[p])) {
        cut = p + 1;
        break;
      }
    }
    if (cut === -1) {
      for (let p = limit - 1; p > start; p -= 1) {
        if (chars[p] === " " || chars[p] === "　") {
          cut = p;
          consume = 1;
          break;
        }
      }
    }
    if (cut === -1) cut = limit;
    chunks.push({
      text: chars.slice(start, cut).join(""),
      sentenceIndex,
      ordinal,
    });
    ordinal += 1;
    start = cut + consume;
  }
  chunks.push({
    text: chars.slice(start).join(""),
    sentenceIndex,
    ordinal,
  });
  return chunks;
}

// Validate the input (SPEC section 4: over-limit input is a named
// error, never a truncation; whitespace-only counts as empty), then
// segment and chunk. The full ordered chunk list is a deterministic
// function of the text alone.
export function buildChunks(text) {
  if (typeof text !== "string" || text.trim() === "") fail("EMPTY_TEXT");
  if (codePointLength(text) > TEXT_LIMIT) {
    fail("TEXT_TOO_LONG", { limit: TEXT_LIMIT });
  }
  const sentences = segmentText(text);
  if (sentences.length === 0) fail("EMPTY_TEXT");
  const chunks = [];
  sentences.forEach((sentence, sentenceIndex) => {
    for (const chunk of chunkSentence(sentence, sentenceIndex, chunks.length)) {
      chunks.push(chunk);
    }
  });
  return { sentences, chunks };
}

// SPEC section 4 progress arithmetic: both figures derive from the
// chunk list, never from boundary events, so they are identical
// across browsers for the same text.
export function totalCharacters(chunks) {
  return chunks.reduce((sum, chunk) => sum + codePointLength(chunk.text), 0);
}

export function spokenCharacters(chunks, completedCount) {
  let sum = 0;
  const count = Math.min(completedCount, chunks.length);
  for (let k = 0; k < count; k += 1) sum += codePointLength(chunks[k].text);
  return sum;
}

export function progressPercent(chunks, completedCount) {
  const total = totalCharacters(chunks);
  if (total === 0) return 0;
  return Math.floor((spokenCharacters(chunks, completedCount) / total) * 100);
}
