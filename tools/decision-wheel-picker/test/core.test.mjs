import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_ENTRIES,
  MAX_ENTRY_CHARS,
  createCryptoSource,
  drawIndex,
  drawLimit,
  isCryptoAvailable,
  parseEntries,
  validateCount,
} from "../public/js/core/wheel.mjs";

// A deterministic uint32 source scripted by the test; throws when the
// script runs out so a draw can never silently read past the script.
function scripted(values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("scripted source exhausted");
    const v = values[i];
    i += 1;
    return v;
  };
}

describe("parsing (SPEC section 4)", () => {
  it("reproduces fixture W1 exactly, duplicate kept", () => {
    const { entries, errors } = parseEntries(" 壽司 \n\n拉麵\n  \n火鍋 \n壽司");
    assert.deepEqual(entries, ["壽司", "拉麵", "火鍋", "壽司"]);
    assert.deepEqual(errors, []);
  });

  it("trims full-width spaces and drops whitespace-only lines", () => {
    const { entries } = parseEntries("　壽司　\n　\n拉麵");
    assert.deepEqual(entries, ["壽司", "拉麵"]);
  });

  it("handles CRLF line endings", () => {
    const { entries } = parseEntries("A\r\nB\r\nC");
    assert.deepEqual(entries, ["A", "B", "C"]);
  });

  it("accepts an entry of exactly 60 code points", () => {
    const exact = "あ".repeat(MAX_ENTRY_CHARS);
    const { entries, errors } = parseEntries(`${exact}\nB`);
    assert.deepEqual(errors, []);
    assert.deepEqual(entries, [exact, "B"]);
  });

  it("refuses a 61-code-point entry and names its 1-based line", () => {
    const tooLong = "あ".repeat(MAX_ENTRY_CHARS + 1);
    const { entries, errors } = parseEntries(`A\n\n${tooLong}\nB`);
    assert.deepEqual(errors, [{ code: "entry_too_long", line: 3 }]);
    assert.deepEqual(entries, ["A", "B"]);
  });
});

describe("entry count bounds (SPEC sections 3-4)", () => {
  it("requires 2..50 entries", () => {
    assert.deepEqual(validateCount(0), { code: "too_few", count: 0 });
    assert.deepEqual(validateCount(1), { code: "too_few", count: 1 });
    assert.equal(validateCount(2), null);
    assert.equal(validateCount(MAX_ENTRIES), null);
    assert.deepEqual(validateCount(51), { code: "too_many", count: 51 });
  });

  it("parses exactly 50 entries and reports 51 as over the cap", () => {
    const lines = (n) => Array.from({ length: n }, (_, i) => `opt${i}`).join("\n");
    assert.equal(parseEntries(lines(50)).entries.length, 50);
    const over = parseEntries(lines(51)).entries.length;
    assert.equal(over, 51);
    assert.deepEqual(validateCount(over), { code: "too_many", count: 51 });
  });
});

describe("the draw rule (SPEC section 4)", () => {
  it("computes limit = floor(2^32 / n) * n for every n in 2..50", () => {
    for (let n = 2; n <= 50; n += 1) {
      const expected = Number((2n ** 32n / BigInt(n)) * BigInt(n));
      assert.equal(drawLimit(n), expected, `n=${n}`);
    }
  });

  it("reproduces fixture W2 (n = 3): top value rejected, next maps to 2", () => {
    const result = drawIndex(3, scripted([4294967295, 4294967294]));
    assert.deepEqual(result, { index: 2, rejected: 1 });
  });

  it("reproduces fixture W3 (n = 6): two rejections, then index 5", () => {
    const result = drawIndex(6, scripted([4294967292, 4294967295, 4294967291]));
    assert.deepEqual(result, { index: 5, rejected: 2 });
  });

  it("never rejects at n = 2 because the limit is 2^32 itself", () => {
    assert.deepEqual(drawIndex(2, scripted([4294967295])), { index: 1, rejected: 0 });
    assert.deepEqual(drawIndex(2, scripted([0])), { index: 0, rejected: 0 });
  });

  it("maps a scripted uniform cycle for n = 3 to exactly equal residue counts", () => {
    const counts = [0, 0, 0];
    const cycle = Array.from({ length: 3000 }, (_, i) => i);
    const source = scripted(cycle);
    for (let k = 0; k < 3000; k += 1) {
      const { index, rejected } = drawIndex(3, source);
      assert.equal(rejected, 0);
      counts[index] += 1;
    }
    assert.deepEqual(counts, [1000, 1000, 1000]);
  });

  it("rejects source values outside the uint32 range", () => {
    assert.throws(() => drawIndex(3, scripted([4294967296])), RangeError);
    assert.throws(() => drawIndex(3, scripted([-1])), RangeError);
    assert.throws(() => drawIndex(3, scripted([1.5])), RangeError);
  });
});

describe("crypto source", () => {
  it("is available under Node 24 and yields uint32 values", () => {
    assert.equal(isCryptoAvailable(), true);
    const source = createCryptoSource();
    for (let i = 0; i < 100; i += 1) {
      const v = source();
      assert.ok(Number.isInteger(v) && v >= 0 && v < 4294967296);
    }
  });
});
