// Text -> Morse encoder (pure; no DOM/network/storage).
// Implements REVISED SPEC b612c14d §4 with the normative validation order:
// the RAW input is validated character by character BEFORE any normalisation.
// The only normalisation ever applied is mapping validated a–z to A–Z.
// `ß` is refused at its raw position and never expanded to `SS`.

import { CAPS, CHAR_TO_CODE, PROSIGN_BY_NAME } from "./table.mjs";

const ASCII_LETTER_OR_DIGIT = /^[A-Za-z0-9]$/;
const WHITESPACE = /^\s$/u;

// Raw-supported set (SPEC §4): ASCII letters, digits, the table's punctuation,
// whitespace, and < > solely as prosign tag delimiters.
function isRawSupported(cp) {
  if (ASCII_LETTER_OR_DIGIT.test(cp)) return true;
  if (CHAR_TO_CODE.has(cp)) return true; // table punctuation (letters/digits already covered)
  if (cp === "<" || cp === ">") return true;
  if (WHITESPACE.test(cp)) return true;
  return false;
}

// encodeText(raw) ->
//   { ok: true, morse, words }  words: [[{kind:'char',char,code} | {kind:'prosign',name,code}]]
//   { ok: false, error: { kind, char?, position?, group? } }
// On any error nothing is encoded (no valid prefix is returned).
export function encodeText(raw) {
  const chars = [...raw]; // code points; positions below are 1-based code-point indices

  if (chars.length > CAPS.text) {
    return { ok: false, error: { kind: "too-long", limit: CAPS.text, actual: chars.length } };
  }

  // Pass 1: raw validation of the WHOLE input before any normalisation.
  // This also validates the letters inside prosign groups, so `<ß>` fails
  // here as a character error at the ß position, not as an unknown group.
  for (let i = 0; i < chars.length; i += 1) {
    if (!isRawSupported(chars[i])) {
      return { ok: false, error: { kind: "unsupported-char", char: chars[i], position: i + 1 } };
    }
  }

  // Pass 2: parse into words of items. Whitespace runs collapse to one word
  // gap; leading/trailing whitespace is trimmed (empty words are dropped).
  const words = [];
  let word = [];
  const closeWord = () => {
    if (word.length > 0) {
      words.push(word);
      word = [];
    }
  };

  let i = 0;
  while (i < chars.length) {
    const cp = chars[i];
    if (WHITESPACE.test(cp)) {
      closeWord();
      i += 1;
      continue;
    }
    if (cp === "<") {
      // Scan the group: it ends at the next '>' before any whitespace.
      let j = i + 1;
      let content = "";
      let closed = false;
      while (j < chars.length) {
        if (chars[j] === ">") {
          closed = true;
          break;
        }
        if (WHITESPACE.test(chars[j])) break;
        content += chars[j];
        j += 1;
      }
      if (!closed) {
        return { ok: false, error: { kind: "unclosed-prosign", position: i + 1 } };
      }
      const group = `<${content}>`;
      const upper = content.toUpperCase(); // content is raw-validated ASCII letters/digits/punct only
      const prosign = /^[A-Z]+$/.test(upper) ? PROSIGN_BY_NAME.get(upper) : undefined;
      if (!prosign) {
        return { ok: false, error: { kind: "unknown-prosign", group, position: i + 1 } };
      }
      word.push({ kind: "prosign", name: prosign.name, code: prosign.run });
      i = j + 1;
      continue;
    }
    if (cp === ">") {
      return { ok: false, error: { kind: "stray-bracket", char: ">", position: i + 1 } };
    }
    const upper = cp >= "a" && cp <= "z" ? cp.toUpperCase() : cp;
    word.push({ kind: "char", char: upper, code: CHAR_TO_CODE.get(upper) });
    i += 1;
  }
  closeWord();

  const morse = words
    .map((w) => w.map((item) => (item.kind === "prosign" ? `<${item.code}>` : item.code)).join(" "))
    .join(" / ");

  return { ok: true, morse, words };
}
