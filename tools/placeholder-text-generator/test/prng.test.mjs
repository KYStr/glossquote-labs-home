import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, drawIndex, incrementSeed } from "../public/js/core/prng.mjs";
import { generate } from "../public/js/core/generate.mjs";

// Independent re-implementation of the SPEC section 4 formula, written from
// the document text (not copied from the core module), used to cross-check
// the core PRNG draw for draw.
function specMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) % 4294967296;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    const inner = (t + Math.imul(t ^ (t >>> 7), t | 61)) % 4294967296;
    t = (t ^ inner) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("fixture 1: mulberry32 seed 42 first eight draws", () => {
  // SPEC section 4 prints the draws truncated to 6 decimals:
  // 0.601104, 0.448291, 0.852466, 0.669734, 0.174814, 0.526593, 0.273228, 0.624745
  const printed = [
    0.601104, 0.448291, 0.852466, 0.669734,
    0.174814, 0.526593, 0.273228, 0.624745,
  ];
  // Full-precision values, hand-derived from the section 4 formula.
  const fullPrecision = [
    0.60110375192016363, 0.44829055899754167, 0.85246579349040985,
  ];
  const next = mulberry32(42);
  for (let i = 0; i < 8; i += 1) {
    const draw = next();
    // The printed values agree with the true draws rounded to 6 decimals
    // (e.g. 0.60110375... prints as 0.601104), so each draw must sit within
    // half a unit of the printed value; the first three are also pinned at
    // full precision. (See VERIFICATION.md: the SPEC says "truncated for
    // display", but its numbers match rounding in all eight cases.)
    assert.ok(
      Math.abs(draw - printed[i]) < 1e-6,
      `draw ${i}: ${draw} vs printed ${printed[i]}`,
    );
    if (i < fullPrecision.length) assert.equal(draw, fullPrecision[i]);
  }
});

test("core PRNG matches the independent spec implementation draw for draw", () => {
  for (const seed of [0, 1, 42, 4294967295, 123456789]) {
    const core = mulberry32(seed);
    const spec = specMulberry32(seed);
    for (let i = 0; i < 200; i += 1) assert.equal(core(), spec());
  }
});

test("PRNG draws stay in [0, 1)", () => {
  const next = mulberry32(7);
  for (let i = 0; i < 1000; i += 1) {
    const v = next();
    assert.ok(v >= 0 && v < 1, `draw ${i} out of range: ${v}`);
  }
});

test("drawIndex floors value * n", () => {
  assert.equal(drawIndex(() => 0, 4), 0);
  assert.equal(drawIndex(() => 0.999999, 4), 3);
  assert.equal(drawIndex(() => 0.44829055899754167, 4), 1);
});

test("incrementSeed increments and wraps at the uint32 max", () => {
  assert.equal(incrementSeed(42), 43);
  assert.equal(incrementSeed(4294967295), 0);
  assert.equal(incrementSeed(0), 1);
});

test("fixture 2 (micro pool): length draw and first five picks, seed 42, opening off", () => {
  // SPEC section 4 micro-fixture: pool [alpha, beta, gamma, delta], Latin
  // sentence model -> L = 11 words; first picks beta, delta, gamma, alpha,
  // gamma; first sentence begins "Beta delta gamma alpha gamma ...".
  const microPool = ["alpha", "beta", "gamma", "delta"];
  const out = generate(
    { contentLang: "latin", unit: "sentences", count: 1, seed: 42, opening: false },
    { latin: microPool },
  );
  const sentence = out.paragraphs[0];
  const words = sentence.slice(0, -1).split(" ");
  assert.equal(words.length, 11);
  assert.deepEqual(words.slice(0, 5), ["Beta", "delta", "gamma", "alpha", "gamma"]);
  assert.ok(sentence.startsWith("Beta delta gamma alpha gamma "));
  assert.ok(sentence.endsWith("."));
});
