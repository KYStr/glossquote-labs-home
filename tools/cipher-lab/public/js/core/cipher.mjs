// Classical Cipher Lab — pure core.
// Implements SPEC section 4 exactly (docs/specs/cipher-lab/SPEC.md):
// only ASCII A-Z / a-z transform, case preserved per letter, every other
// character (digits, spaces, punctuation, all non-ASCII incl. CJK and
// astral characters) passes through unchanged at its original position.
// No DOM, network or storage access anywhere in this module.

// Auditable bounds (SPEC sections 4-5): each appears exactly once, here.
export const MAX_INPUT_LENGTH = 10000;
export const MIN_KEY_LENGTH = 1;
export const MAX_KEY_LENGTH = 64;
export const MIN_SHIFT = 0;
export const MAX_SHIFT = 25;

export class CipherError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CipherError";
    this.code = code;
  }
}

const UPPER_A = 65;
const UPPER_Z = 90;
const LOWER_A = 97;
const LOWER_Z = 122;
const ALPHABET_SIZE = 26;

function letterBase(codePoint) {
  if (codePoint >= UPPER_A && codePoint <= UPPER_Z) return UPPER_A;
  if (codePoint >= LOWER_A && codePoint <= LOWER_Z) return LOWER_A;
  return 0;
}

function mapLetters(text, shiftIndex) {
  let output = "";
  for (const char of text) {
    const base = letterBase(char.codePointAt(0));
    if (base === 0) {
      output += char;
    } else {
      output += String.fromCharCode(base + shiftIndex(char.codePointAt(0) - base));
    }
  }
  return output;
}

export function validateShift(shift) {
  if (!Number.isInteger(shift) || shift < MIN_SHIFT || shift > MAX_SHIFT) {
    throw new CipherError(
      "invalid_shift",
      `Shift must be an integer from ${MIN_SHIFT} to ${MAX_SHIFT}.`,
    );
  }
  return shift;
}

function validateDirection(direction) {
  if (direction !== "encrypt" && direction !== "decrypt") {
    throw new CipherError("invalid_direction", 'Direction must be "encrypt" or "decrypt".');
  }
  return direction;
}

// Caesar: encrypt maps x -> (x + s) mod 26; decrypt maps x -> (x - s) mod 26.
export function caesar(text, shift, direction) {
  validateShift(shift);
  validateDirection(direction);
  const effective = direction === "encrypt" ? shift : (ALPHABET_SIZE - shift) % ALPHABET_SIZE;
  return mapLetters(text, (x) => (x + effective) % ALPHABET_SIZE);
}

// Atbash: x -> 25 - x. An involution with no parameters.
export function atbash(text) {
  return mapLetters(text, (x) => ALPHABET_SIZE - 1 - x);
}

// The key is never stripped or truncated: any defect is a named refusal.
export function validateKey(key) {
  if (typeof key !== "string" || key.length === 0) {
    throw new CipherError("key_empty", "The key is empty; enter 1 to 64 letters.");
  }
  if ([...key].length > MAX_KEY_LENGTH) {
    throw new CipherError("key_too_long", `The key is longer than ${MAX_KEY_LENGTH} letters.`);
  }
  if (!/^[A-Za-z]+$/.test(key)) {
    throw new CipherError("key_non_letter", "The key may contain letters A-Z only.");
  }
  return key.toUpperCase();
}

// Vigenere: the key-position counter advances ONLY when a letter is
// transformed; passthrough characters never consume key material.
export function vigenere(text, key, direction) {
  const normalized = validateKey(key);
  validateDirection(direction);
  const keyShifts = [...normalized].map((char) => char.codePointAt(0) - UPPER_A);
  let position = 0;
  let output = "";
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    const base = letterBase(codePoint);
    if (base === 0) {
      output += char;
      continue;
    }
    const k = keyShifts[position % keyShifts.length];
    position += 1;
    const x = codePoint - base;
    const y =
      direction === "encrypt"
        ? (x + k) % ALPHABET_SIZE
        : (x - k + ALPHABET_SIZE) % ALPHABET_SIZE;
    output += String.fromCharCode(base + y);
  }
  return output;
}

// Brute-force table data: rows for shifts 1..25, in order, unranked.
// Row N is the Caesar decryption of the input at shift N.
export function bruteForceTable(text) {
  const rows = [];
  for (let shift = 1; shift <= MAX_SHIFT; shift += 1) {
    rows.push({ shift, text: caesar(text, shift, "decrypt") });
  }
  return rows;
}

// Single dispatch used by the page controller and the tests.
export function transform(options, text) {
  const { cipher, direction = "encrypt", shift = 3, key = "" } = options ?? {};
  switch (cipher) {
    case "caesar":
      return caesar(text, shift, direction);
    case "atbash":
      return atbash(text);
    case "vigenere":
      return vigenere(text, key, direction);
    default:
      throw new CipherError("invalid_cipher", `Unknown cipher: ${String(cipher)}`);
  }
}
