// Character-table integrity: the expected table below is transcribed
// literally from REVISED SPEC b612c14d §4 — it is NOT derived from the
// implementation. The bijection runs over the shipped data so a table
// typo in either copy fails.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CHAR_TABLE, PROSIGNS, CHAR_TO_CODE } from "../public/js/core/table.mjs";
import { encodeText } from "../public/js/core/encode.mjs";
import { decodeMorse } from "../public/js/core/decode.mjs";

const EXPECTED_TABLE = [
  ["A", ".-"], ["B", "-..."], ["C", "-.-."], ["D", "-.."], ["E", "."],
  ["F", "..-."], ["G", "--."], ["H", "...."], ["I", ".."], ["J", ".---"],
  ["K", "-.-"], ["L", ".-.."], ["M", "--"], ["N", "-."], ["O", "---"],
  ["P", ".--."], ["Q", "--.-"], ["R", ".-."], ["S", "..."], ["T", "-"],
  ["U", "..-"], ["V", "...-"], ["W", ".--"], ["X", "-..-"], ["Y", "-.--"],
  ["Z", "--.."],
  ["1", ".----"], ["2", "..---"], ["3", "...--"], ["4", "....-"], ["5", "....."],
  ["6", "-...."], ["7", "--..."], ["8", "---.."], ["9", "----."], ["0", "-----"],
  [".", ".-.-.-"], [",", "--..--"], ["?", "..--.."], ["'", ".----."],
  ["!", "-.-.--"], ["/", "-..-."], ["(", "-.--."], [")", "-.--.-"],
  ["&", ".-..."], [":", "---..."], [";", "-.-.-."], ["=", "-...-"],
  ["+", ".-.-."], ["-", "-....-"], ["_", "..--.-"], ['"', ".-..-."],
  ["$", "...-..-"], ["@", ".--.-."],
];

test("shipped table equals the SPEC §4 table exactly (chars, codes, order)", () => {
  assert.deepEqual(CHAR_TABLE.map(([c, code]) => [c, code]), EXPECTED_TABLE);
});

test("the table is collision-free as data (no two chars share a code)", () => {
  const codes = CHAR_TABLE.map(([, code]) => code);
  assert.equal(new Set(codes).size, codes.length);
});

test("bijection: every character encodes to its listed code and decodes back", () => {
  for (const [ch, code] of EXPECTED_TABLE) {
    const enc = encodeText(ch);
    assert.equal(enc.ok, true, `encode ${JSON.stringify(ch)}`);
    assert.equal(enc.morse, code, `encode ${JSON.stringify(ch)}`);
    const dec = decodeMorse(code);
    assert.equal(dec.text, ch, `decode ${code}`);
    assert.deepEqual(dec.warnings, [], `decode ${code} warnings`);
  }
});

test("lowercase letters encode as their uppercase codes", () => {
  for (const [ch, code] of EXPECTED_TABLE.slice(0, 26)) {
    assert.equal(encodeText(ch.toLowerCase()).morse, code);
  }
});

test("prosign runs are written literally and equal their letters run together", () => {
  const expected = { SOS: "...---...", AR: ".-.-.", AS: ".-...", KN: "-.--.", SK: "...-.-" };
  assert.deepEqual(PROSIGNS.map((p) => p.name), ["SOS", "AR", "AS", "KN", "SK"]);
  for (const p of PROSIGNS) {
    assert.equal(p.run, expected[p.name], `${p.name} run literal`);
    const derived = [...p.letters].map((l) => CHAR_TO_CODE.get(l)).join("");
    assert.equal(p.run, derived, `${p.name} run = letters run together`);
  }
});

test("all five prosigns round-trip in tagged form", () => {
  for (const p of PROSIGNS) {
    const enc = encodeText(`<${p.name}>`);
    assert.equal(enc.ok, true);
    assert.equal(enc.morse, `<${p.run}>`);
    const dec = decodeMorse(enc.morse);
    assert.equal(dec.text, `<${p.name}>`);
    assert.deepEqual(dec.warnings, []);
    assert.deepEqual(dec.notes, []);
  }
});

test("the three colliding bare runs decode to punctuation, never to prosigns", () => {
  const cases = [
    [".-.-.", "+", "AR"],
    [".-...", "&", "AS"],
    ["-.--.", "(", "KN"],
  ];
  for (const [run, ch, name] of cases) {
    const dec = decodeMorse(run);
    assert.equal(dec.text, ch);
    assert.deepEqual(dec.warnings, []);
    assert.equal(dec.notes.length, 1);
    assert.equal(dec.notes[0].type, "prosign-ambiguity");
    assert.equal(dec.notes[0].prosign, name);
    assert.equal(dec.notes[0].index, 1);
  }
});
