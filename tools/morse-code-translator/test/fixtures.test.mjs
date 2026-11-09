// REVISED SPEC b612c14d §4 worked fixtures 1–8, asserted exactly as printed
// (strings, unit counts, seconds, tagged round-trips, notes, refusals).
import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeText } from "../public/js/core/encode.mjs";
import { decodeMorse } from "../public/js/core/decode.mjs";
import { expandTiming } from "../public/js/core/timing.mjs";
import { durationSeconds } from "../public/js/core/table.mjs";

test("fixture 1: SOS -> ... --- ... ; 27 units = 1.62 s at 20 WPM", () => {
  const enc = encodeText("SOS");
  assert.equal(enc.ok, true);
  assert.equal(enc.morse, "... --- ...");
  const timing = expandTiming(enc.words);
  assert.equal(timing.totalUnits, 27);
  assert.ok(Math.abs(durationSeconds(27, 20) - 1.62) < 1e-9);
});

test("fixture 2: PARIS = 43 units standalone, 50 with trailing word gap", () => {
  const enc = encodeText("PARIS");
  assert.equal(enc.morse, ".--. .- .-. .. ...");
  const timing = expandTiming(enc.words);
  assert.equal(timing.totalUnits, 43);
  assert.equal(timing.totalUnits + 7, 50); // calibration definition of WPM
});

test("fixture 3: HELLO encodes and decodes back to HELLO", () => {
  const enc = encodeText("HELLO");
  assert.equal(enc.morse, ".... . .-.. .-.. ---");
  const dec = decodeMorse(".... . .-.. .-.. ---");
  assert.equal(dec.text, "HELLO");
  assert.deepEqual(dec.warnings, []);
  assert.deepEqual(dec.notes, []);
});

test("fixture 4: <SOS> tagged token, 23 units; bare run is unknown with prosign hint", () => {
  const enc = encodeText("<SOS>");
  assert.equal(enc.ok, true);
  assert.equal(enc.morse, "<...---...>");
  const timing = expandTiming(enc.words);
  assert.equal(timing.totalUnits, 23);
  const on = timing.intervals.filter((i) => i.on).reduce((s, i) => s + i.units, 0);
  const off = timing.intervals.filter((i) => !i.on).reduce((s, i) => s + i.units, 0);
  assert.equal(on, 15);
  assert.equal(off, 8);

  const decTagged = decodeMorse("<...---...>");
  assert.equal(decTagged.text, "<SOS>");
  assert.deepEqual(decTagged.warnings, []);

  const decBare = decodeMorse("...---...");
  assert.equal(decBare.text, "�");
  assert.equal(decBare.warnings.length, 1);
  assert.deepEqual(decBare.warnings[0], { index: 1, token: "...---..." });
  assert.equal(decBare.notes.length, 1);
  assert.equal(decBare.notes[0].type, "prosign-hint");
  assert.equal(decBare.notes[0].prosign, "SOS");
});

test("fixture 5: a run of 3 spaces is a word gap -> HE LLO", () => {
  const dec = decodeMorse(".... .   .-.. .-.. ---");
  assert.equal(dec.text, "HE LLO");
  assert.deepEqual(dec.warnings, []);
});

test("fixture 6: .--.-. is @ (whole table checked); ..-- is unknown at index 2", () => {
  const dec = decodeMorse("... .--.-. ...");
  assert.equal(dec.text, "S@S");
  assert.deepEqual(dec.warnings, []);
  assert.deepEqual(dec.notes, []);

  const unk = decodeMorse("... ..-- ...");
  assert.equal(unk.text, "S�S");
  assert.equal(unk.warnings.length, 1);
  assert.deepEqual(unk.warnings[0], { index: 2, token: "..--" });
  assert.deepEqual(unk.notes, []);
});

test("fixture 7: raw validation before normalisation — ß refused at its raw position", () => {
  const mixed = encodeText("AßB");
  assert.equal(mixed.ok, false);
  assert.equal(mixed.error.kind, "unsupported-char");
  assert.equal(mixed.error.char, "ß");
  assert.equal(mixed.error.position, 2);
  assert.equal(mixed.morse, undefined); // nothing is encoded, not even a valid prefix

  const alone = encodeText("ß");
  assert.equal(alone.ok, false);
  assert.equal(alone.error.position, 1);

  // ß inside a prosign group is likewise a character error at the ß position,
  // not an unknown-group error (SPEC §4 validation order).
  const inGroup = encodeText("<ß>");
  assert.equal(inGroup.ok, false);
  assert.equal(inGroup.error.kind, "unsupported-char");
  assert.equal(inGroup.error.char, "ß");
  assert.equal(inGroup.error.position, 2);
});

test("fixture 8: <AR> tagged round-trip; bare twin decodes to S+S with a note", () => {
  const enc = encodeText("<AR>");
  assert.equal(enc.morse, "<.-.-.>");
  const decTagged = decodeMorse("<.-.-.>");
  assert.equal(decTagged.text, "<AR>");
  assert.deepEqual(decTagged.notes, []);

  const bare = decodeMorse("... .-.-. ...");
  assert.equal(bare.text, "S+S");
  assert.equal(bare.notes.length, 1);
  assert.equal(bare.notes[0].type, "prosign-ambiguity");
  assert.equal(bare.notes[0].index, 2);
  assert.equal(bare.notes[0].prosign, "AR");
  assert.ok(!bare.text.includes("AR")); // the note is not part of the decoded string

  // same pattern for AS / KN twins
  assert.equal(encodeText("<AS>").morse, "<.-...>");
  const asBare = decodeMorse("... .-... ...");
  assert.equal(asBare.text, "S&S");
  assert.equal(asBare.notes[0].prosign, "AS");
  assert.equal(encodeText("<KN>").morse, "<-.--.>");
  const knBare = decodeMorse("... -.--. ...");
  assert.equal(knBare.text, "S(S");
  assert.equal(knBare.notes[0].prosign, "KN");
});
