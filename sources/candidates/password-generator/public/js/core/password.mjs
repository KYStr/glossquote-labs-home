// Pure core for the Password Generator and Strength Checker.
//
// Implements SPEC section 4 exactly: the four character sets, the
// ambiguous-exclusion set, rejection sampling over an injectable byte
// source (crypto.getRandomValues in the page, a fixed stream in tests),
// whole-candidate redraw when an enabled set is unrepresented, the
// passphrase entropy accounting, and the itemised strength model.
//
// Sampling generalisation (documented, fixture-preserving): for a pool
// of size p the sampler draws k bytes, where k is the smallest value
// with 256^k >= p, reads them big-endian as v, accepts v only when
// v < floor(256^k / p) * p and returns v mod p. For p <= 256 this is
// exactly the SPEC formula with bound floor(256/p) * p; for the 7,776
// word list (p > 256) two bytes are drawn, which is the same rejection
// rule on the smallest sufficient byte block.
//
// Dictionary scan (documented interpretation): the checker scans the
// lowercased input left to right; at each position it takes the LONGEST
// bundled word of length >= 4 matching there, counts distinct words
// (cap 2 penalties), and continues after the matched word. This is the
// reading under which the normative fixture holds: "password" yields
// exactly one counted dictionary word (-20), not three overlapping
// ones. The breakdown never quotes the input or any substring of it.

import { WORDS } from "./wordlist.mjs";

export const LOWER = "abcdefghijklmnopqrstuvwxyz";
export const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const DIGITS = "0123456789";
export const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/";
export const AMBIGUOUS = Object.freeze(["l", "I", "1", "O", "0"]);
export const WORDLIST_SIZE = 7776;

const SET_DEFS = Object.freeze([
  Object.freeze({ id: "lower", chars: LOWER }),
  Object.freeze({ id: "upper", chars: UPPER }),
  Object.freeze({ id: "digits", chars: DIGITS }),
  Object.freeze({ id: "symbols", chars: SYMBOLS }),
]);

export function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

export function buildPool(options = {}) {
  const enabled = {
    lower: options.lower !== false,
    upper: options.upper !== false,
    digits: options.digits !== false,
    symbols: options.symbols !== false,
  };
  const exclude = options.excludeAmbiguous === true;
  const sets = [];
  for (const def of SET_DEFS) {
    if (!enabled[def.id]) continue;
    const chars = exclude
      ? [...def.chars].filter((ch) => !AMBIGUOUS.includes(ch)).join("")
      : def.chars;
    sets.push(Object.freeze({ id: def.id, chars }));
  }
  const pool = sets.map((set) => set.chars).join("");
  return Object.freeze({ sets: Object.freeze(sets), pool, poolSize: pool.length });
}

// nextByte() must return an integer 0..255, or null/undefined when the
// stream is exhausted (tests only; the page source never exhausts).
export function createSampler(nextByte) {
  function drawIndex(p) {
    if (!Number.isInteger(p) || p < 2) fail("INVALID_POOL_SIZE");
    let space = 256;
    let byteCount = 1;
    while (space < p) {
      space *= 256;
      byteCount += 1;
    }
    const bound = Math.floor(space / p) * p;
    for (;;) {
      let value = 0;
      for (let i = 0; i < byteCount; i += 1) {
        const byte = nextByte();
        if (byte === null || byte === undefined) fail("BYTE_SOURCE_EXHAUSTED");
        value = value * 256 + byte;
      }
      if (value < bound) return value % p;
    }
  }
  return Object.freeze({ drawIndex });
}

// Production byte source: blocks of crypto.getRandomValues output.
export function cryptoByteSource(cryptoObject) {
  let block = null;
  let offset = 0;
  return function nextByte() {
    if (block === null || offset >= block.length) {
      block = new Uint8Array(64);
      cryptoObject.getRandomValues(block);
      offset = 0;
    }
    const byte = block[offset];
    offset += 1;
    return byte;
  };
}

export function hasCryptoRandom(cryptoObject) {
  return Boolean(cryptoObject) && typeof cryptoObject.getRandomValues === "function";
}

export function generatePassword(options, sampler) {
  const length = options.length;
  if (!Number.isInteger(length) || length < 8 || length > 128) {
    fail("LENGTH_OUT_OF_RANGE");
  }
  const { sets, pool, poolSize } = buildPool(options);
  if (sets.length === 0) fail("NO_SET_ENABLED");
  if (length < sets.length) fail("LENGTH_BELOW_SET_COUNT");
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let candidate = "";
    for (let i = 0; i < length; i += 1) {
      candidate += pool[sampler.drawIndex(poolSize)];
    }
    const complete = sets.every((set) =>
      [...candidate].some((ch) => set.chars.includes(ch)));
    if (complete) {
      return Object.freeze({
        text: candidate,
        entropy: length * Math.log2(poolSize),
        poolSize,
      });
    }
  }
  fail("INTERNAL_REDRAW_EXHAUSTED");
}

export const SEPARATORS = Object.freeze({
  hyphen: "-",
  space: " ",
  underscore: "_",
  dot: ".",
  none: "",
});

export function generatePassphrase(options, sampler, words = WORDS) {
  const wordCount = options.wordCount;
  if (!Number.isInteger(wordCount) || wordCount < 3 || wordCount > 10) {
    fail("WORD_COUNT_OUT_OF_RANGE");
  }
  const separator = SEPARATORS[options.separator ?? "hyphen"];
  if (separator === undefined) fail("INVALID_SEPARATOR");
  const chosen = [];
  for (let i = 0; i < wordCount; i += 1) {
    chosen.push(words[sampler.drawIndex(words.length)]);
  }
  let entropy = wordCount * Math.log2(words.length);
  if (options.capitalizeOne === true) {
    const at = sampler.drawIndex(wordCount);
    chosen[at] = chosen[at][0].toUpperCase() + chosen[at].slice(1);
    entropy += Math.log2(wordCount);
  }
  let text = chosen.join(separator);
  if (options.trailingDigit === true) {
    text += String(sampler.drawIndex(10));
    entropy += Math.log2(10);
  }
  return Object.freeze({ text, entropy });
}

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function formatBits(value) {
  return round1(value).toFixed(1);
}

// --- Strength model ---

const ASCII_PUNCT = new Set([..."!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"]);
const KEYBOARD_ROWS = Object.freeze([
  "1234567890",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
]);

const wordsByFirstChar = new Map();
for (const word of WORDS) {
  if (word.length < 4) continue;
  const key = word[0];
  if (!wordsByFirstChar.has(key)) wordsByFirstChar.set(key, []);
  wordsByFirstChar.get(key).push(word);
}
for (const list of wordsByFirstChar.values()) {
  list.sort((a, b) => b.length - a.length);
}

function dictionaryPenalty(lowerText) {
  const found = [];
  let i = 0;
  while (i < lowerText.length) {
    const candidates = wordsByFirstChar.get(lowerText[i]);
    let matched = null;
    if (candidates) {
      for (const word of candidates) {
        if (lowerText.startsWith(word, i)) {
          matched = word;
          break;
        }
      }
    }
    if (matched) {
      if (!found.includes(matched)) found.push(matched);
      i += matched.length;
    } else {
      i += 1;
    }
  }
  const counted = Math.min(found.length, 2);
  return { counted, amount: counted * 20 };
}

function hasRepeatRun(chars) {
  let run = 1;
  for (let i = 1; i < chars.length; i += 1) {
    run = chars[i] === chars[i - 1] ? run + 1 : 1;
    if (run >= 3) return true;
  }
  return false;
}

function classOf(ch) {
  if (ch >= "0" && ch <= "9") return "digit";
  if (ch >= "a" && ch <= "z") return "letter";
  return null;
}

function hasSequence(chars) {
  let ascending = 1;
  let descending = 1;
  for (let i = 1; i < chars.length; i += 1) {
    const prev = chars[i - 1];
    const curr = chars[i];
    const cls = classOf(curr);
    if (cls === null || cls !== classOf(prev)) {
      ascending = 1;
      descending = 1;
      continue;
    }
    const diff = curr.charCodeAt(0) - prev.charCodeAt(0);
    ascending = diff === 1 ? ascending + 1 : 1;
    descending = diff === -1 ? descending + 1 : 1;
    if (ascending >= 4 || descending >= 4) return true;
  }
  return false;
}

function hasKeyboardWalk(lowerText) {
  for (let i = 0; i + 4 <= lowerText.length; i += 1) {
    const slice = lowerText.slice(i, i + 4);
    for (const row of KEYBOARD_ROWS) {
      if (row.includes(slice) || [...row].reverse().join("").includes(slice)) {
        return true;
      }
    }
  }
  return false;
}

function hasYear(chars) {
  const text = chars.join("");
  for (let i = 0; i + 4 <= text.length; i += 1) {
    const slice = text.slice(i, i + 4);
    if (/^\d{4}$/.test(slice)) {
      const value = Number(slice);
      if (value >= 1900 && value <= 2099) return true;
    }
  }
  return false;
}

export function bandOf(bits) {
  if (bits < 28) return "VERY_WEAK";
  if (bits < 36) return "WEAK";
  if (bits < 60) return "FAIR";
  if (bits < 80) return "STRONG";
  return "VERY_STRONG";
}

export function checkStrength(text, words = WORDS) {
  const chars = [...text];
  const length = chars.length;
  if (length > 1024) fail("CHECK_TOO_LONG");
  const lowerText = text.toLowerCase();
  const lowerChars = [...lowerText];

  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let symbolInSet = false;
  let symbolOutsideSet = false;
  let nonAscii = false;
  for (const ch of chars) {
    if (ch >= "a" && ch <= "z") hasLower = true;
    else if (ch >= "A" && ch <= "Z") hasUpper = true;
    else if (ch >= "0" && ch <= "9") hasDigit = true;
    else if (SYMBOLS.includes(ch)) symbolInSet = true;
    else if (ASCII_PUNCT.has(ch)) symbolOutsideSet = true;
    if (ch.codePointAt(0) > 127) nonAscii = true;
  }
  let basePool = 0;
  if (hasLower) basePool += 26;
  if (hasUpper) basePool += 26;
  if (hasDigit) basePool += 10;
  if (symbolOutsideSet) basePool += 32;
  else if (symbolInSet) basePool += 26;
  if (nonAscii) basePool += 20;

  const baseBits = basePool > 1 ? length * Math.log2(basePool) : 0;
  const penalties = [];
  const dict = dictionaryPenalty(lowerText);
  if (dict.counted > 0) {
    penalties.push(Object.freeze({ code: "DICTIONARY", amount: dict.amount, count: dict.counted }));
  }
  if (hasRepeatRun(chars)) {
    penalties.push(Object.freeze({ code: "REPEAT_RUN", amount: 10, count: 1 }));
  }
  if (hasSequence(lowerChars)) {
    penalties.push(Object.freeze({ code: "SEQUENCE", amount: 10, count: 1 }));
  }
  if (hasKeyboardWalk(lowerText)) {
    penalties.push(Object.freeze({ code: "KEYBOARD_WALK", amount: 10, count: 1 }));
  }
  if (hasYear(chars)) {
    penalties.push(Object.freeze({ code: "YEAR", amount: 8, count: 1 }));
  }
  if (length > 0 && length < 8) {
    penalties.push(Object.freeze({ code: "SHORT_LENGTH", amount: 10, count: 1 }));
  }
  const totalPenalty = penalties.reduce((sum, p) => sum + p.amount, 0);
  const finalBits = Math.max(0, baseBits - totalPenalty);
  return Object.freeze({
    length,
    basePool,
    nonAscii,
    baseBits,
    penalties: Object.freeze(penalties),
    totalPenalty,
    finalBits,
    band: bandOf(finalBits),
  });
}
