// Morse -> text decoder (pure; no DOM/network/storage).
// Implements REVISED SPEC b612c14d §4 decoding grammar:
//  - word groups split on a `/` token or on any run of 2+ whitespace chars;
//    letters split on single whitespace (tabs/newlines count as whitespace).
//  - a token is tagged (<...> wrapping the whole token) or bare.
//  - a tagged token decodes to a prosign only if its run equals a listed
//    prosign's run-together form; otherwise it is an unknown token.
//  - a bare token decodes via the character table; the three colliding runs
//    decode to the punctuation character (+, &, () and carry a prosign note.
//  - an unknown bare token equal to a non-colliding prosign run (SOS, SK)
//    decodes to `�`, is listed as a warning, and carries a prosign-hint note.
//  - notes are never part of the decoded string.
// Token index: 1-based across the whole input, counting every
// whitespace-delimited token including `/` separators (SPEC calls `/`
// "a `/` token"); the SPEC does not pin this edge beyond its fixtures,
// which contain no `/` next to a warning — see VERIFICATION.md.

import { CAPS, CODE_TO_CHAR, COLLIDING_RUNS, PROSIGN_BY_RUN, REPLACEMENT } from "./table.mjs";

const TAGGED = /^<([.-]+)>$/;

// decodeMorse(raw) ->
//   { ok: true, text, warnings, notes, words }
//     warnings: [{ index, token }]            unknown tokens, in order
//     notes:    [{ type: 'prosign-ambiguity' | 'prosign-hint', index, token, prosign }]
//     words:    [[unit]]  unit: { index, token, kind: 'char'|'prosign'|'unknown',
//                                 char?, name?, code? }  (code = signal run for timing;
//                                 unknown units have code: null)
//   { ok: false, error: { kind: 'too-long', limit, actual } }
export function decodeMorse(raw) {
  const chars = [...raw];
  if (chars.length > CAPS.morse) {
    return { ok: false, error: { kind: "too-long", limit: CAPS.morse, actual: chars.length } };
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, text: "", warnings: [], notes: [], words: [] };
  }

  // Split keeping separators: parts alternate token, separator, token, ...
  const parts = trimmed.split(/(\s+)/u);
  const tokens = []; // { text, wordGapBefore }
  for (let p = 0; p < parts.length; p += 2) {
    const sep = p === 0 ? "" : parts[p - 1];
    tokens.push({ text: parts[p], wordGapBefore: [...sep].length >= 2 });
  }

  const warnings = [];
  const notes = [];
  const words = [];
  let word = [];
  const closeWord = () => {
    if (word.length > 0) {
      words.push(word);
      word = [];
    }
  };

  tokens.forEach(({ text: token, wordGapBefore }, idx) => {
    const index = idx + 1; // 1-based across the whole input
    if (token === "/") {
      closeWord();
      return;
    }
    if (wordGapBefore) closeWord();

    const tagged = TAGGED.exec(token);
    if (tagged) {
      const prosign = PROSIGN_BY_RUN.get(tagged[1]);
      if (prosign) {
        word.push({ index, token, kind: "prosign", name: prosign.name, code: prosign.run });
      } else {
        word.push({ index, token, kind: "unknown", code: null });
        warnings.push({ index, token });
      }
      return;
    }
    if (token.includes("<") || token.includes(">") || token.includes("/")) {
      // Stray bracket or slash inside a token: the whole token is unknown.
      word.push({ index, token, kind: "unknown", code: null });
      warnings.push({ index, token });
      return;
    }
    const ch = CODE_TO_CHAR.get(token);
    if (ch !== undefined) {
      word.push({ index, token, kind: "char", char: ch, code: token });
      const colliding = COLLIDING_RUNS.get(token);
      if (colliding) {
        notes.push({ type: "prosign-ambiguity", index, token, prosign: colliding });
      }
      return;
    }
    // Unknown bare token.
    word.push({ index, token, kind: "unknown", code: null });
    warnings.push({ index, token });
    const hint = PROSIGN_BY_RUN.get(token);
    if (hint) {
      notes.push({ type: "prosign-hint", index, token, prosign: hint.name });
    }
  });
  closeWord();

  const text = words
    .map((w) =>
      w
        .map((u) => (u.kind === "char" ? u.char : u.kind === "prosign" ? `<${u.name}>` : REPLACEMENT))
        .join(""),
    )
    .join(" ");

  return { ok: true, text, warnings, notes, words };
}
