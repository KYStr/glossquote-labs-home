import assert from "node:assert/strict";
import test from "node:test";

import {
  batchText,
  formatBytes,
  generateBatch,
  inspectUuid,
  validateCount,
  variantKind,
} from "../public/js/core/uuid.mjs";

// Deterministic injected byte source: bytes 0x00..0xFF repeating
// (SPEC section 7 construction fixtures).
function sequential(array) {
  for (let index = 0; index < array.length; index += 1) array[index] = index % 256;
}

test("construction: fixed bytes give the exact SPEC section 7 v4 fixture", () => {
  const result = generateBatch({ version: 4, count: 1, fillRandom: sequential, nowMs: () => 0 });
  assert.ok(result.ok);
  assert.equal(result.values[0], "00010203-0405-4607-8809-0a0b0c0d0e0f");
});

test("construction: fixed clock and bytes give the SPEC section 7 v7 prefix and masks", () => {
  const result = generateBatch({
    version: 7, count: 1, fillRandom: sequential, nowMs: () => 1735689600000,
  });
  assert.ok(result.ok);
  assert.ok(result.values[0].startsWith("01941f29-7c00-7"));
  assert.equal(result.values[0], "01941f29-7c00-7607-8809-0a0b0c0d0e0f");
});

test("formats: case and hyphen options combine over the same bytes", () => {
  const base = { version: 4, count: 1, fillRandom: sequential, nowMs: () => 0 };
  assert.equal(generateBatch({ ...base, uppercase: true }).values[0], "00010203-0405-4607-8809-0A0B0C0D0E0F");
  assert.equal(generateBatch({ ...base, hyphens: false }).values[0], "000102030405460788090a0b0c0d0e0f");
  assert.equal(
    generateBatch({ ...base, uppercase: true, hyphens: false }).values[0],
    "000102030405460788090A0B0C0D0E0F",
  );
  assert.equal(formatBytes(new Uint8Array(16).fill(0xab)), "abababab-abab-abab-abab-abababababab");
});

test("v7 batch in one millisecond shares the timestamp prefix", () => {
  const result = generateBatch({
    version: 7, count: 3, fillRandom: sequential, nowMs: () => 1735689600000,
  });
  assert.ok(result.ok);
  for (const value of result.values) assert.ok(value.startsWith("01941f29-7c00-"));
  assert.equal(new Set(result.values).size, 3);
});

test("count validation: 1 and 1000 pass; 0, 1001, fractions and text are refused", () => {
  assert.deepEqual(validateCount("1"), { ok: true, count: 1 });
  assert.deepEqual(validateCount(1000), { ok: true, count: 1000 });
  for (const bad of ["0", "-3", "1001", "2.5", "abc", "", "1e3"]) {
    const result = validateCount(bad);
    assert.equal(result.ok, false, `count ${JSON.stringify(bad)} must be refused`);
    assert.equal(result.code, "COUNT_INVALID");
  }
  const refused = generateBatch({ version: 4, count: 0, fillRandom: sequential, nowMs: () => 0 });
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "COUNT_INVALID");
});

test("batch text joins with LF and ends with a final LF", () => {
  assert.equal(batchText(["a", "b"]), "a\nb\n");
  assert.equal(batchText(["only"]), "only\n");
});

test("inspector fixture 1: v7 with the exact UTC millisecond", () => {
  const report = inspectUuid("01941f29-7c00-7abc-8123-456789abcdef");
  assert.ok(report.ok);
  assert.equal(report.versionNibble, 7);
  assert.equal(report.versionName, "unix-time");
  assert.equal(report.variant, "rfc9562");
  assert.equal(report.timestamp.kind, "unix-ms");
  assert.equal(report.timestamp.ms, 1735689600000);
  assert.equal(report.timestamp.iso, "2025-01-01T00:00:00.000Z");
  assert.equal(report.canonical, "01941f29-7c00-7abc-8123-456789abcdef");
});

test("inspector fixture 2: v1 Gregorian timestamp with the truncation rule", () => {
  const report = inspectUuid("f81d4fae-7dec-11d0-a765-00a0c91e6bf6");
  assert.ok(report.ok);
  assert.equal(report.versionNibble, 1);
  assert.equal(report.versionName, "time-based");
  assert.equal(report.variant, "rfc9562");
  assert.equal(report.timestamp.iso, "1997-02-03T17:43:12.216Z");
});

test("inspector fixtures 3 and 4: NIL and MAX are named", () => {
  const nil = inspectUuid("00000000-0000-0000-0000-000000000000");
  assert.ok(nil.ok && nil.isNil && !nil.isMax);
  const max = inspectUuid("ffffffff-ffff-ffff-ffff-ffffffffffff");
  assert.ok(max.ok && max.isMax && !max.isNil);
  assert.equal(max.canonical, "ffffffff-ffff-ffff-ffff-ffffffffffff");
});

test("inspector fixture 5: the 32-digit form parses to the same report", () => {
  const report = inspectUuid("01941f297c007abc8123456789abcdef");
  assert.ok(report.ok);
  assert.equal(report.canonical, "01941f29-7c00-7abc-8123-456789abcdef");
  assert.equal(report.timestamp.iso, "2025-01-01T00:00:00.000Z");
});

test("inspector fixture 6: non-hex at the final position", () => {
  const report = inspectUuid("01941f29-7c00-7abc-8123-456789abcdeg");
  assert.equal(report.ok, false);
  assert.equal(report.code, "NON_HEX");
  assert.equal(report.position, 36);
  assert.equal(report.char, "g");
});

test("parser sweep: error classes fire in the SPEC order with positions", () => {
  assert.deepEqual(inspectUuid(""), { ok: false, code: "EMPTY" });
  assert.deepEqual(inspectUuid("  \t\n "), { ok: false, code: "EMPTY" });
  const braces = inspectUuid("{01941f29-7c00-7abc-8123-456789abcdef}");
  assert.equal(braces.code, "WRONG_LENGTH");
  assert.equal(braces.length, 38);
  const urn = inspectUuid("urn:uuid:01941f29-7c00-7abc-8123-456789abcdef");
  assert.equal(urn.code, "WRONG_LENGTH");
  assert.equal(urn.length, 45);
  const short = inspectUuid("01941f29-7c00-7abc-8123-456789abcde");
  assert.equal(short.code, "WRONG_LENGTH");
  assert.equal(short.length, 35);
  // Length beats content: a short non-hex string reports length first.
  assert.equal(inspectUuid("zz").code, "WRONG_LENGTH");
  // Hyphen in a 32-character value is misplaced.
  const stray = inspectUuid("01941f29-7c007abc8123456789abcde");
  assert.equal(stray.code, "HYPHEN_MISPLACED");
  assert.equal(stray.position, 9);
  // A hex digit where a hyphen belongs is a misplaced hyphen.
  const shifted = inspectUuid("01941f29-7c00-7abc-8123456789abcdef0".slice(0, 36));
  assert.equal(shifted.code, "HYPHEN_MISPLACED");
  assert.equal(shifted.position, 24);
  // Hyphen errors beat non-hex errors at later positions.
  const both = inspectUuid("01941f29x7c00-7abc-8123-456789abcdeg");
  assert.equal(both.code, "HYPHEN_MISPLACED");
  assert.equal(both.position, 9);
});

test("parser accepts uppercase and surrounding whitespace", () => {
  const report = inspectUuid("  01941F29-7C00-7ABC-8123-456789ABCDEF\n");
  assert.ok(report.ok);
  assert.equal(report.canonical, "01941f29-7c00-7abc-8123-456789abcdef");
});

test("version naming covers nibbles 0-15", () => {
  const names = {
    0: "reserved-nil-range", 1: "time-based", 2: "dce-security", 3: "md5-name",
    4: "random", 5: "sha1-name", 6: "reordered-time", 7: "unix-time", 8: "custom",
  };
  for (let nibble = 0; nibble <= 15; nibble += 1) {
    const digit = nibble.toString(16);
    const report = inspectUuid(`00000000-0000-${digit}000-8000-000000000000`);
    assert.ok(report.ok);
    assert.equal(report.versionNibble, nibble);
    assert.equal(report.versionName, names[nibble] ?? "reserved-future");
  }
});

test("variant naming covers the first digit of group 4 from 0 to F", () => {
  const expected = [
    "ncs-legacy", "ncs-legacy", "ncs-legacy", "ncs-legacy",
    "ncs-legacy", "ncs-legacy", "ncs-legacy", "ncs-legacy",
    "rfc9562", "rfc9562", "rfc9562", "rfc9562",
    "microsoft-legacy", "microsoft-legacy", "reserved", "reserved",
  ];
  for (let value = 0; value <= 15; value += 1) {
    const digit = value.toString(16);
    assert.equal(variantKind(digit), expected[value]);
    const report = inspectUuid(`00000000-0000-4000-${digit}000-000000000000`);
    assert.equal(report.variant, expected[value]);
    assert.equal(report.versionCaveat, expected[value] !== "rfc9562");
  }
});

test("v6 is recognised but its timestamp is honestly not decoded", () => {
  const report = inspectUuid("1ec9414c-232a-6b00-b3c8-9f6bdeced846");
  assert.ok(report.ok);
  assert.equal(report.versionNibble, 6);
  assert.equal(report.timestamp.kind, "v6-not-decoded");
});

test("other versions report no embedded timestamp", () => {
  const report = inspectUuid("550e8400-e29b-41d4-a716-446655440000");
  assert.ok(report.ok);
  assert.equal(report.versionNibble, 4);
  assert.equal(report.timestamp.kind, "none");
});

// Smoke test only (SPEC section 7f): uniqueness and constant
// version/variant nibbles over 10,000 CSPRNG v4 values. This is not
// a randomness certification.
test("distribution smoke: 10,000 generated v4 values are unique and well-formed", () => {
  const result = generateBatch({
    version: 4,
    count: 1000,
    fillRandom: (array) => globalThis.crypto.getRandomValues(array),
    nowMs: () => Date.now(),
  });
  assert.ok(result.ok);
  const seen = new Set();
  for (let round = 0; round < 10; round += 1) {
    const batch = generateBatch({
      version: 4,
      count: 1000,
      fillRandom: (array) => globalThis.crypto.getRandomValues(array),
      nowMs: () => Date.now(),
    });
    for (const value of batch.values) {
      seen.add(value);
      const parsed = inspectUuid(value);
      assert.ok(parsed.ok);
      assert.equal(parsed.versionNibble, 4);
      assert.equal(parsed.variant, "rfc9562");
    }
  }
  assert.equal(seen.size, 10000);
});
