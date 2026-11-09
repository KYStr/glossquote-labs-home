// Pure core for the HTML Entity Encoder and Decoder.
//
// Conversion is a pure text function over the input string (SPEC
// sections 4 and 5): no DOM access, no parsing of the input as
// markup, no ambient state. Positions in the change and unresolved
// lists are code-point indices into the input, never UTF-16 units.

import { NAMED_REFERENCES } from "./entities.mjs";
import { C1_REMAP } from "./entities-c1.mjs";

export const MAX_INPUT = 100000;

const MANDATORY = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
});

// Canonical name per code point (SPEC section 4): among the
// semicolon-form names that map to exactly this one code point, the
// shortest name wins; ties break lexicographically. Deterministic.
const CANONICAL_NAME = (() => {
  const map = new Map();
  for (const [key, characters] of Object.entries(NAMED_REFERENCES)) {
    if (!key.endsWith(";")) continue;
    const points = [...characters];
    if (points.length !== 1) continue;
    const cp = points[0].codePointAt(0);
    const name = key.slice(0, -1);
    const current = map.get(cp);
    if (
      current === undefined
      || name.length < current.length
      || (name.length === current.length && name < current)
    ) {
      map.set(cp, name);
    }
  }
  return map;
})();

export function canonicalNameFor(cp) {
  return CANONICAL_NAME.get(cp) ?? null;
}

export function codePointLabel(text) {
  return [...text]
    .map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`)
    .join(" ");
}

export function encodeText(input, { nonAscii = false, style = "named" } = {}) {
  const out = [];
  const changes = [];
  let index = 0;
  for (const char of input) {
    const cp = char.codePointAt(0);
    let emitted = null;
    if (Object.hasOwn(MANDATORY, char)) {
      emitted = MANDATORY[char];
    } else if (
      nonAscii
      && (cp > 0x7e || (cp < 0x20 && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d))
    ) {
      if (style === "decimal") {
        emitted = `&#${cp};`;
      } else if (style === "hex") {
        emitted = `&#x${cp.toString(16).toUpperCase()};`;
      } else {
        const name = CANONICAL_NAME.get(cp);
        emitted = name !== undefined ? `&${name};` : `&#${cp};`;
      }
    }
    if (emitted === null) {
      out.push(char);
    } else {
      out.push(emitted);
      changes.push({ index, source: char, output: emitted, notes: [] });
    }
    index += 1;
  }
  return { output: out.join(""), changes };
}

const REPLACEMENT = "�"; // U+FFFD, per the HTML Standard's rules

function isDigit(char, hex) {
  if (char >= "0" && char <= "9") return true;
  if (!hex) return false;
  return (char >= "a" && char <= "f") || (char >= "A" && char <= "F");
}

function isNameStart(char) {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}

function isNameChar(char) {
  return isNameStart(char) || (char >= "0" && char <= "9");
}

function isTokenChar(char) {
  return isNameChar(char) || char === "#";
}

function scanDecode(input) {
  const out = [];
  const changes = [];
  const unresolved = [];
  const length = input.length;
  let i = 0;
  let index = 0;

  while (i < length) {
    const char = input[i];
    if (char !== "&") {
      const cp = input.codePointAt(i);
      const text = String.fromCodePoint(cp);
      out.push(text);
      i += text.length;
      index += 1;
      continue;
    }

    // (1) Numeric reference.
    if (input[i + 1] === "#") {
      let j = i + 2;
      const hex = input[j] === "x" || input[j] === "X";
      if (hex) j += 1;
      const digitStart = j;
      while (j < length && isDigit(input[j], hex)) j += 1;
      if (j > digitStart) {
        const digits = input.slice(digitStart, j);
        const hasSemicolon = input[j] === ";";
        const end = hasSemicolon ? j + 1 : j;
        const value = Number.parseInt(digits, hex ? 16 : 10);
        const notes = [];
        let output;
        if (value === 0) {
          output = REPLACEMENT;
          notes.push("ZERO_REPLACEMENT");
        } else if (value >= 0xd800 && value <= 0xdfff) {
          output = REPLACEMENT;
          notes.push("SURROGATE_REPLACEMENT");
        } else if (value > 0x10ffff) {
          output = REPLACEMENT;
          notes.push("RANGE_REPLACEMENT");
        } else if (value >= 0x80 && value <= 0x9f) {
          output = String.fromCodePoint(C1_REMAP[value]);
          notes.push("C1_REMAP");
        } else {
          output = String.fromCodePoint(value);
        }
        if (!hasSemicolon) notes.push("MISSING_SEMICOLON");
        changes.push({ index, source: input.slice(i, end), output, notes });
        out.push(output);
        index += end - i;
        i = end;
        continue;
      }
    }

    // (2) Named reference, semicolon form only.
    if (isNameStart(input[i + 1] ?? "")) {
      let j = i + 2;
      while (j < length && isNameChar(input[j])) j += 1;
      if (input[j] === ";") {
        const name = input.slice(i + 1, j);
        const key = `${name};`;
        const token = input.slice(i, j + 1);
        if (Object.hasOwn(NAMED_REFERENCES, key)) {
          const output = NAMED_REFERENCES[key];
          changes.push({ index, source: token, output, notes: [] });
          out.push(output);
        } else {
          unresolved.push({ index, source: token, reason: "UNKNOWN_NAME" });
          out.push(token);
        }
        index += j + 1 - i;
        i = j + 1;
        continue;
      }
    }

    // (3) A token that looked like a reference but matched neither
    // shape: "&" + token characters + ";" within 32 characters.
    {
      let j = i + 1;
      while (j < length && j - i <= 32 && isTokenChar(input[j])) j += 1;
      if (input[j] === ";" && j > i + 1) {
        const token = input.slice(i, j + 1);
        const reason = token.includes("#") || /[0-9]/.test(token[1])
          ? "INVALID_NUMBER"
          : "UNKNOWN_NAME";
        unresolved.push({ index, source: token, reason });
        out.push(token);
        index += j + 1 - i;
        i = j + 1;
        continue;
      }
    }

    // A bare ampersand is ordinary text.
    out.push("&");
    i += 1;
    index += 1;
  }

  return { output: out.join(""), changes, unresolved };
}

export function decodeText(input) {
  const result = scanDecode(input);
  // The double-encoded hint (SPEC section 2): the decoded output
  // itself still contains a decodable reference. Never automatic —
  // the UI offers an explicit decode-again action.
  const doubleEncoded = scanDecode(result.output).changes.length > 0;
  return { ...result, doubleEncoded };
}

export function convertText(mode, input, options = {}) {
  const count = [...input].length;
  if (count > MAX_INPUT) {
    return { ok: false, code: "INPUT_TOO_LARGE", count };
  }
  if (mode === "encode") {
    return { ok: true, mode, ...encodeText(input, options) };
  }
  return { ok: true, mode, ...decodeText(input) };
}
