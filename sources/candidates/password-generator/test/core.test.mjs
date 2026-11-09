import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPool,
  checkStrength,
  createSampler,
  formatBits,
  generatePassphrase,
  generatePassword,
} from "../public/js/core/password.mjs";

// Byte-stream sampler helper: serves the given bytes in order, then
// reports exhaustion; also counts how many bytes were consumed.
function streamSampler(bytes) {
  let offset = 0;
  const sampler = createSampler(() => {
    if (offset >= bytes.length) return null;
    const byte = bytes[offset];
    offset += 1;
    return byte;
  });
  return { sampler, consumed: () => offset };
}

function repeat(pattern, times) {
  const out = [];
  for (let i = 0; i < times; i += 1) out.push(...pattern);
  return out;
}

test("character sets and pool sizes match SPEC section 4 exactly", () => {
  const full = buildPool({});
  assert.equal(full.poolSize, 88);
  assert.deepEqual(full.sets.map((s) => [s.id, s.chars.length]), [
    ["lower", 26], ["upper", 26], ["digits", 10], ["symbols", 26],
  ]);
  assert.equal(full.sets[3].chars, "!@#$%^&*()-_=+[]{};:,.<>?/");
  const noAmb = buildPool({ excludeAmbiguous: true });
  assert.deepEqual(noAmb.sets.map((s) => s.chars.length), [25, 24, 8, 26]);
  assert.equal(noAmb.poolSize, 83);
  for (const ch of ["l", "I", "1", "O", "0"]) {
    assert.ok(!noAmb.pool.includes(ch), `${ch} must be excluded`);
  }
  assert.equal(buildPool({ symbols: false }).poolSize, 62);
  assert.equal(buildPool({ lower: false, upper: false, digits: false, symbols: false }).poolSize, 0);
});

test("sampler rejects bytes at or above the bound (pools 88, 26, 7776)", () => {
  // Pool 88: bound = floor(256/88)*88 = 176; 200 is discarded, 90 -> 2.
  const a = streamSampler([200, 90]);
  assert.equal(a.sampler.drawIndex(88), 2);
  assert.equal(a.consumed(), 2);
  // Pool 26: bound = 234; 250 and 255 are discarded, 10 -> 10.
  const b = streamSampler([250, 255, 10]);
  assert.equal(b.sampler.drawIndex(26), 10);
  assert.equal(b.consumed(), 3);
  // Pool 7776 (two-byte draws): bound = floor(65536/7776)*7776 = 62208;
  // 0xFFFF = 65535 is discarded, 0x002A = 42 -> 42.
  const c = streamSampler([0xff, 0xff, 0x00, 0x2a]);
  assert.equal(c.sampler.drawIndex(7776), 42);
  assert.equal(c.consumed(), 4);
});

test("sampler distribution sanity over a fixed pseudo-random fixture", async () => {
  // Deterministic byte fixture (a test fixture, never a runtime
  // randomness source): chained SHA-256 blocks over a fixed seed
  // string. 26,000 accepted draws over pool 26 should land within
  // +/-20% of 1,000 per index — loose chi-style bounds stated up
  // front, not tuned after the fact.
  const { createHash } = await import("node:crypto");
  const bytes = [];
  let block = createHash("sha256").update("glossquote-password-fixture").digest();
  while (bytes.length < 60000) {
    bytes.push(...block);
    block = createHash("sha256").update(block).digest();
  }
  const { sampler } = streamSampler(bytes);
  const counts = new Array(26).fill(0);
  for (let i = 0; i < 26000; i += 1) counts[sampler.drawIndex(26)] += 1;
  for (const count of counts) {
    assert.ok(count > 800 && count < 1200, `count ${count} outside stated bounds`);
  }
});

test("generated password from a known byte stream is exact", () => {
  // Pool 88, indices cycle a(0) A(26) 0(52) !(62): bytes equal indices
  // because every byte is below the 176 bound and index = byte mod 88.
  const { sampler } = streamSampler(repeat([0, 26, 52, 62], 5));
  const item = generatePassword({ length: 20 }, sampler);
  assert.equal(item.text, "aA0!aA0!aA0!aA0!aA0!");
  assert.equal(formatBits(item.entropy), "129.2");
  assert.equal(item.poolSize, 88);
});

test("a candidate missing an enabled set is discarded and fully redrawn", () => {
  // Pool = lower + digits (36), bound 252, index = byte mod 36.
  // First candidate: eight 0 bytes -> "aaaaaaaa" (no digit) -> redraw.
  // Second candidate: seven 0 bytes and byte 27 -> index 27 -> '1'.
  const { sampler, consumed } = streamSampler([
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 27,
  ]);
  const item = generatePassword({ length: 8, upper: false, symbols: false }, sampler);
  assert.equal(item.text, "aaaaaaa1");
  assert.equal(consumed(), 16);
});

test("redraw exhaustion reports the internal error after 100 attempts", () => {
  const { sampler } = streamSampler(new Array(1000).fill(0));
  assert.throws(
    () => generatePassword({ length: 8, upper: false, symbols: false }, sampler),
    (error) => error.code === "INTERNAL_REDRAW_EXHAUSTED",
  );
});

test("generation input validation", () => {
  const { sampler } = streamSampler(repeat([0], 64));
  assert.throws(() => generatePassword({ length: 7 }, sampler),
    (e) => e.code === "LENGTH_OUT_OF_RANGE");
  assert.throws(() => generatePassword({ length: 129 }, sampler),
    (e) => e.code === "LENGTH_OUT_OF_RANGE");
  assert.throws(
    () => generatePassword({ length: 20, lower: false, upper: false, digits: false, symbols: false }, sampler),
    (e) => e.code === "NO_SET_ENABLED");
});

test("passphrase generation, separators and entropy accounting", () => {
  const zero = () => streamSampler(repeat([0], 200)).sampler;
  const plain = generatePassphrase({ wordCount: 5 }, zero());
  assert.equal(plain.text, "abacus-abacus-abacus-abacus-abacus");
  assert.equal(formatBits(plain.entropy), "64.6");
  const capped = generatePassphrase({ wordCount: 5, capitalizeOne: true }, zero());
  assert.equal(capped.text, "Abacus-abacus-abacus-abacus-abacus");
  assert.equal(formatBits(capped.entropy), "66.9");
  const digited = generatePassphrase({ wordCount: 5, trailingDigit: true }, zero());
  assert.equal(digited.text, "abacus-abacus-abacus-abacus-abacus0");
  assert.equal(formatBits(digited.entropy), "67.9");
  const both = generatePassphrase(
    { wordCount: 5, capitalizeOne: true, trailingDigit: true, separator: "none" }, zero());
  assert.equal(both.text, "Abacusabacusabacusabacusabacus0");
  assert.equal(formatBits(both.entropy), "70.3");
  const three = generatePassphrase({ wordCount: 3, separator: "space" }, zero());
  assert.equal(three.text, "abacus abacus abacus");
  assert.equal(formatBits(three.entropy), "38.8");
  assert.throws(() => generatePassphrase({ wordCount: 2 }, zero()),
    (e) => e.code === "WORD_COUNT_OUT_OF_RANGE");
  assert.throws(() => generatePassphrase({ wordCount: 11 }, zero()),
    (e) => e.code === "WORD_COUNT_OUT_OF_RANGE");
});

function expectStrength(text, expected) {
  const result = checkStrength(text);
  assert.equal(result.basePool, expected.pool, `${text}: pool`);
  assert.equal(formatBits(result.baseBits), expected.base, `${text}: base`);
  assert.deepEqual(
    result.penalties.map((p) => [p.code, p.amount]),
    expected.penalties,
    `${text}: penalties`,
  );
  assert.equal(formatBits(result.finalBits), expected.final, `${text}: final`);
  assert.equal(result.band, expected.band, `${text}: band`);
  return result;
}

test("strength fixtures: the two normative worked examples", () => {
  expectStrength("password", {
    pool: 26, base: "37.6", penalties: [["DICTIONARY", 20]], final: "17.6", band: "VERY_WEAK",
  });
  expectStrength("Xq7!mZ2#", {
    pool: 88, base: "51.7", penalties: [], final: "51.7", band: "FAIR",
  });
});

test("strength fixtures: each penalty and the caps", () => {
  expectStrength("aaaBBB111", {
    pool: 62, base: "53.6", penalties: [["REPEAT_RUN", 10]], final: "43.6", band: "FAIR",
  });
  // "abcd" is both an ascending sequence and a keyboard-row walk
  // ("1234" too); each penalty applies at most once.
  expectStrength("abcd1234", {
    pool: 36, base: "41.4",
    penalties: [["SEQUENCE", 10], ["KEYBOARD_WALK", 10]],
    final: "21.4", band: "VERY_WEAK",
  });
  expectStrength("qwer", {
    pool: 26, base: "18.8",
    penalties: [["KEYBOARD_WALK", 10], ["SHORT_LENGTH", 10]],
    final: "0.0", band: "VERY_WEAK",
  });
  expectStrength("abc1999x", {
    pool: 36, base: "41.4",
    penalties: [["REPEAT_RUN", 10], ["YEAR", 8]],
    final: "23.4", band: "VERY_WEAK",
  });
  // Two distinct dictionary words: -40.
  expectStrength("passwordzoom", {
    pool: 26, base: "56.4", penalties: [["DICTIONARY", 40]], final: "16.4", band: "VERY_WEAK",
  });
  // Three distinct dictionary words are capped at two counted: -40.
  expectStrength("passwordzoomword", {
    pool: 26, base: "75.2", penalties: [["DICTIONARY", 40]], final: "35.2", band: "WEAK",
  });
});

test("strength fixtures: symbol outside the generator set counts 32; non-ASCII adds 20", () => {
  expectStrength("abc~def", {
    pool: 58, base: "41.0", penalties: [["SHORT_LENGTH", 10]], final: "31.0", band: "WEAK",
  });
  const result = expectStrength("pässword", {
    pool: 46, base: "44.2", penalties: [["DICTIONARY", 20]], final: "24.2", band: "VERY_WEAK",
  });
  assert.equal(result.nonAscii, true);
});

test("strength check length boundary: 1024 ok, 1025 is an error", () => {
  const ok = checkStrength("a".repeat(1024));
  assert.equal(ok.length, 1024);
  assert.throws(() => checkStrength("a".repeat(1025)),
    (e) => e.code === "CHECK_TOO_LONG");
});
