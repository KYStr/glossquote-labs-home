// Grammar sweep and boundary cases from REVISED SPEC b612c14d §4/§6:
// spacing tolerance, slash forms, malformed tags, caps, error positions.
import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeText } from "../public/js/core/encode.mjs";
import { decodeMorse } from "../public/js/core/decode.mjs";

test("decode: single spaces are letter gaps, 2+ spaces are word gaps", () => {
  assert.equal(decodeMorse("... --- ...").text, "SOS");
  assert.equal(decodeMorse("...  ---  ...").text, "S O S");
  assert.equal(decodeMorse("...   ---").text, "S O");
});

test("decode: slash token separates words with or without extra spacing", () => {
  assert.equal(decodeMorse("... / --- / ...").text, "S O S");
  assert.equal(decodeMorse("...  /  ---").text, "S O");
  assert.equal(decodeMorse("/ ... --- ... /").text, "SOS"); // no empty words
});

test("decode: a slash inside a token makes the whole token unknown", () => {
  const dec = decodeMorse(".../---");
  assert.equal(dec.text, "�");
  assert.deepEqual(dec.warnings, [{ index: 1, token: ".../---" }]);
});

test("decode: tabs and newlines act as whitespace separators", () => {
  assert.equal(decodeMorse("...\t---\n...").text, "SOS");
  assert.equal(decodeMorse("...\n\n---").text, "S O"); // 2-char run = word gap
  assert.equal(decodeMorse("  ... --- ...  ").text, "SOS"); // trim
});

test("decode: malformed tagged tokens are unknown and listed", () => {
  const notProsign = decodeMorse("<...>"); // well-formed tag, run is not a prosign
  assert.equal(notProsign.text, "�");
  assert.deepEqual(notProsign.warnings, [{ index: 1, token: "<...>" }]);

  const stray = decodeMorse("... ..< ...");
  assert.equal(stray.text, "S�S");
  assert.deepEqual(stray.warnings, [{ index: 2, token: "..<" }]);

  const emptyTag = decodeMorse("<>");
  assert.equal(emptyTag.text, "�");
  assert.equal(emptyTag.warnings.length, 1);
});

test("decode: untagged SK run is unknown with a prosign hint; tagged SK round-trips", () => {
  const bare = decodeMorse("...-.-");
  assert.equal(bare.text, "�");
  assert.equal(bare.notes.length, 1);
  assert.equal(bare.notes[0].type, "prosign-hint");
  assert.equal(bare.notes[0].prosign, "SK");
  assert.equal(encodeText("<SK>").morse, "<...-.->");
  assert.equal(decodeMorse("<...-.->").text, "<SK>");
});

test("decode: empty input decodes to empty with no warnings", () => {
  const dec = decodeMorse("");
  assert.equal(dec.ok, true);
  assert.equal(dec.text, "");
  assert.deepEqual(dec.warnings, []);
  assert.deepEqual(dec.notes, []);
  assert.equal(decodeMorse("   ").text, "");
});

test("encode: whitespace collapses to single word gaps; case normalises after validation", () => {
  assert.equal(encodeText("sos").morse, "... --- ...");
  assert.equal(
    encodeText("HELLO \n\t WORLD").morse,
    ".... . .-.. .-.. --- / .-- --- .-. .-.. -..",
  );
  assert.equal(encodeText("").morse, "");
  assert.equal(encodeText("   ").morse, "");
  assert.equal(encodeText("  SOS  ").morse, "... --- ...");
});

test("encode: a prosign group can sit inside a word next to letters", () => {
  const enc = encodeText("A<SOS>B");
  assert.equal(enc.ok, true);
  assert.equal(enc.morse, ".- <...---...> -...");
});

test("encode: unsupported characters are named with 1-based code-point positions", () => {
  const e1 = encodeText("É");
  assert.equal(e1.ok, false);
  assert.deepEqual(e1.error, { kind: "unsupported-char", char: "É", position: 1 });

  // mixed valid+unsupported ordering: the error wins, nothing is encoded
  const e2 = encodeText("ABÉ");
  assert.equal(e2.ok, false);
  assert.equal(e2.error.position, 3);
  assert.equal(e2.morse, undefined);

  // emoji counts as one code point
  const e3 = encodeText("A😀B");
  assert.equal(e3.ok, false);
  assert.equal(e3.error.char, "😀");
  assert.equal(e3.error.position, 2);

  // CJK is unsupported in this version
  const e4 = encodeText("中文");
  assert.equal(e4.ok, false);
  assert.equal(e4.error.position, 1);
});

test("encode: prosign group errors — unknown group named, unclosed and stray brackets refused", () => {
  const unknown = encodeText("<XYZ>");
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.kind, "unknown-prosign");
  assert.equal(unknown.error.group, "<XYZ>");

  const unclosed = encodeText("<SOS");
  assert.equal(unclosed.ok, false);
  assert.equal(unclosed.error.kind, "unclosed-prosign");

  const stray = encodeText("A>B");
  assert.equal(stray.ok, false);
  assert.equal(stray.error.kind, "stray-bracket");
  assert.equal(stray.error.position, 2);
});

test("caps: text 2000 chars passes, 2001 refused; Morse input capped at 20000", () => {
  assert.equal(encodeText("A".repeat(2000)).ok, true);
  const over = encodeText("A".repeat(2001));
  assert.equal(over.ok, false);
  assert.equal(over.error.kind, "too-long");

  assert.equal(decodeMorse("... ".repeat(5000)).ok, true); // exactly 20000 chars
  const overMorse = decodeMorse(".".repeat(20001));
  assert.equal(overMorse.ok, false);
  assert.equal(overMorse.error.kind, "too-long");
});

test("decode never invents letter boundaries inside an unspaced run", () => {
  const dec = decodeMorse("...---"); // not a table code, not a prosign run
  assert.equal(dec.text, "�");
  assert.deepEqual(dec.warnings, [{ index: 1, token: "...---" }]);
  assert.deepEqual(dec.notes, []); // ...--- is not SOS (...---...) — no hint
});
