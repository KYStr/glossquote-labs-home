// Pure core for the Word and Character Frequency Counter.
//
// Tokenisation, folding and counting follow SPEC section 4 exactly.
// Zero DOM access; the fold table and stopword lists are data
// modules. The fold is Unicode simple case folding as SPEC section
// 4 defines it (the status C and S entries of CaseFolding.txt,
// shipped in casefold.mjs — see PROVENANCE.md for the noted wording
// conflict in the SPEC's parenthetical) — never a locale casing
// operation: under this fold Σ and ς both become σ, which no
// lowercase operation reproduces.

import { CASE_FOLD } from "./casefold.mjs";

export const MAX_INPUT = 200000;

const WORD_CHAR = /^[\p{L}\p{N}]$/u;
const LETTER = /^\p{L}$/u;

export function foldText(text) {
  let out = "";
  for (const char of text) {
    const cp = char.codePointAt(0);
    const key = cp.toString(16).toUpperCase().padStart(4, "0");
    out += Object.hasOwn(CASE_FOLD, key) ? CASE_FOLD[key] : char;
  }
  return out;
}

export function classify(cp, char) {
  if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)) return "han";
  if (cp >= 0x3040 && cp <= 0x30ff) return "kana";
  if (cp >= 0xac00 && cp <= 0xd7af) return "hangul";
  if (cp === 0x0027 || cp === 0x2019) return "apos";
  if (WORD_CHAR.test(char)) return "word";
  return "sep";
}

function percentOf(count, total) {
  if (total === 0) return 0;
  return Math.round((count * 1000) / total) / 10;
}

function buildTable(entries, total) {
  const rows = [...entries.values()]
    .sort((a, b) => b.count - a.count || a.firstPos - b.firstPos)
    .map((entry, index) => ({
      rank: index + 1,
      item: entry.item,
      key: entry.key,
      count: entry.count,
      percent: percentOf(entry.count, total),
    }));
  return { total, unique: entries.size, rows };
}

export function analyze(input, options = {}) {
  const {
    stopwordsOn = false,
    stopwordWords = new Set(),
    stopwordChars = new Set(),
    minCount = 1,
    minLength = 1,
    includeNumbers = true,
  } = options;

  const chars = [...input];
  if (chars.length > MAX_INPUT) {
    return { ok: false, code: "INPUT_TOO_LARGE", count: chars.length };
  }
  const classes = chars.map((char) => classify(char.codePointAt(0), char));

  // Token streams (SPEC section 4).
  const wordTokens = [];
  let current = null;
  const flush = () => {
    if (current !== null) wordTokens.push(current.join(""));
    current = null;
  };
  for (let index = 0; index < chars.length; index += 1) {
    const cls = classes[index];
    if (cls === "word") {
      if (current === null) current = [];
      current.push(chars[index]);
    } else if (cls === "apos") {
      if (current !== null && index + 1 < chars.length && classes[index + 1] === "word") {
        current.push(chars[index]);
      } else {
        flush();
      }
    } else {
      flush();
    }
  }
  flush();

  const charTokens = [];
  const bigramTokens = [];
  let hanRun = [];
  const flushHan = () => {
    for (let index = 0; index + 1 < hanRun.length; index += 1) {
      bigramTokens.push(hanRun[index] + hanRun[index + 1]);
    }
    hanRun = [];
  };
  for (let index = 0; index < chars.length; index += 1) {
    const cls = classes[index];
    if (cls === "han" || cls === "kana" || cls === "hangul") {
      charTokens.push(chars[index]);
    }
    if (cls === "han") {
      hanRun.push(chars[index]);
    } else {
      flushHan();
    }
  }
  flushHan();

  // Words table: token-level filters (stopwords, numbers, minimum
  // length) exclude tokens before counting, so totals shrink;
  // minimum count is a row-level threshold applied after counting.
  const wordEntries = new Map();
  let wordTotal = 0;
  for (const form of wordTokens) {
    const key = foldText(form);
    if (stopwordsOn && stopwordWords.has(key)) continue;
    if (!includeNumbers && ![...form].some((char) => LETTER.test(char))) continue;
    if ([...key].length < minLength) continue;
    const pos = wordTotal;
    wordTotal += 1;
    let entry = wordEntries.get(key);
    if (entry === undefined) {
      entry = { count: 0, firstPos: pos, forms: new Map() };
      wordEntries.set(key, entry);
    }
    entry.count += 1;
    let formEntry = entry.forms.get(form);
    if (formEntry === undefined) {
      formEntry = { count: 0, firstPos: pos };
      entry.forms.set(form, formEntry);
    }
    formEntry.count += 1;
  }
  const wordRows = new Map();
  for (const [key, entry] of wordEntries) {
    let display = null;
    for (const [form, formEntry] of entry.forms) {
      if (
        display === null
        || formEntry.count > display.count
        || (formEntry.count === display.count && formEntry.firstPos < display.firstPos)
      ) {
        display = { item: form, count: formEntry.count, firstPos: formEntry.firstPos };
      }
    }
    wordRows.set(key, {
      item: display.item,
      key,
      count: entry.count,
      firstPos: entry.firstPos,
    });
  }

  const countSimple = (tokens, excluded) => {
    const entries = new Map();
    let total = 0;
    for (const token of tokens) {
      if (excluded(token)) continue;
      const pos = total;
      total += 1;
      let entry = entries.get(token);
      if (entry === undefined) {
        entry = { item: token, key: token, count: 0, firstPos: pos };
        entries.set(token, entry);
      }
      entry.count += 1;
    }
    return { entries, total };
  };

  const charCounted = countSimple(
    charTokens,
    (char) => stopwordsOn && stopwordChars.has(char),
  );
  const bigramCounted = countSimple(
    bigramTokens,
    (pair) => stopwordsOn && (stopwordChars.has(pair[0]) || stopwordChars.has(pair[1])),
  );

  const finish = (entries, total) => {
    const table = buildTable(entries, total);
    return {
      total: table.total,
      unique: table.unique,
      rows: table.rows.filter((row) => row.count >= minCount),
      allRows: table.rows,
    };
  };

  return {
    ok: true,
    inputChars: chars.length,
    words: finish(wordRows, wordTotal),
    characters: finish(charCounted.entries, charCounted.total),
    bigrams: finish(bigramCounted.entries, bigramCounted.total),
  };
}

function csvField(item) {
  if (/[",\n\r]/.test(item)) return `"${item.replaceAll('"', '""')}"`;
  return item;
}

// CSV of a table's full filtered rows (SPEC section 4): header
// item,count,percent; one-decimal plain percent; LF endings with a
// final LF; RFC 4180 quoting only when a field needs it.
export function toCsv(rows) {
  const lines = ["item,count,percent"];
  for (const row of rows) {
    lines.push(`${csvField(row.item)},${row.count},${row.percent.toFixed(1)}`);
  }
  return lines.join("\n") + "\n";
}
