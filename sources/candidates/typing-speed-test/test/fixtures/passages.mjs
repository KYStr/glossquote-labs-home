// Test-only fixture passages (SPEC section 4): short, fixed, and kept
// in a file distinct from the shipped product passages.

export const FIXTURE_EN = Object.freeze({
  id: "fixture-en-pangram",
  title: "Fixture: pangram",
  // SPEC section 4 calls this string 45 characters, but the quoted
  // string itself has 44 (counted code point by code point) — a SPEC
  // defect documented in VERIFICATION.md; the string is kept verbatim.
  text: "The quick brown fox jumps over the lazy dog.",
});

export const FIXTURE_ZH = Object.freeze({
  id: "fixture-zh-ten",
  title: "Fixture: ten characters",
  // Exactly 10 characters (SPEC section 4, fixture 4).
  text: "打字練習真的需要耐心",
});
