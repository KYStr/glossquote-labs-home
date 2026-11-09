// EAN-13 / UPC-A digit patterns, as pinned by SPEC section 4.
// L patterns are the normative data ('1' = bar). R(d) is the bitwise
// complement of L(d); G(d) is the reverse of R(d) — derived here by rule,
// exactly as the SPEC defines, not stored as a second hand-typed table.
export const EAN_L_PATTERNS = Object.freeze([
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
]);

// Parity pattern of the six left digits, selected by the EAN-13 first digit.
export const EAN_FIRST_DIGIT_PARITY = Object.freeze([
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
]);

export function eanRPattern(digit) {
  let out = "";
  for (const bit of EAN_L_PATTERNS[digit]) out += bit === "1" ? "0" : "1";
  return out;
}

export function eanGPattern(digit) {
  return [...eanRPattern(digit)].reverse().join("");
}
