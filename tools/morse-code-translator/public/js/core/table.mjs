// Morse Code Translator — auditable data table (pure data, no DOM/network/storage).
// Source: REVISED SPEC b612c14d §4 (ITU character table, closed prosign list, timing model).
// The on-page reference table is generated from this data, so what the user
// reads is what the code does.

// [character, code] pairs in SPEC §4 order: A–Z, 0–9, then punctuation.
export const CHAR_TABLE = Object.freeze([
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
]);

export const CHAR_TO_CODE = new Map(CHAR_TABLE);
export const CODE_TO_CHAR = new Map(CHAR_TABLE.map(([ch, code]) => [code, ch]));

// Closed prosign list (SPEC §2/§4). `run` is the letters' codes run together
// with element gaps only; it is written out literally here for auditability
// and a test asserts it equals the concatenation of the letters' codes.
export const PROSIGNS = Object.freeze([
  Object.freeze({ name: "SOS", letters: "SOS", run: "...---..." }),
  Object.freeze({ name: "AR", letters: "AR", run: ".-.-." }),
  Object.freeze({ name: "AS", letters: "AS", run: ".-..." }),
  Object.freeze({ name: "KN", letters: "KN", run: "-.--." }),
  Object.freeze({ name: "SK", letters: "SK", run: "...-.-" }),
]);

export const PROSIGN_BY_NAME = new Map(PROSIGNS.map((p) => [p.name, p]));
export const PROSIGN_BY_RUN = new Map(PROSIGNS.map((p) => [p.run, p]));

// Bare runs that are BOTH a character code and a prosign run (SPEC §4):
// they decode to the character, with a prosign ambiguity note.
export const COLLIDING_RUNS = new Map([
  [".-.-.", "AR"], // = +
  [".-...", "AS"], // = &
  ["-.--.", "KN"], // = (
]);

// Timing model (SPEC §4), in units.
export const TIMING = Object.freeze({
  dot: 1,
  dash: 3,
  elementGap: 1, // between elements inside a character / prosign
  letterGap: 3, // between characters
  wordGap: 7, // between words
});

// PARIS calibration: unit duration = 1200 / WPM milliseconds.
export function unitMs(wpm) {
  return 1200 / wpm;
}

export function durationSeconds(units, wpm) {
  return (units * 1200) / wpm / 1000;
}

export const CAPS = Object.freeze({ text: 2000, morse: 20000 });
export const REPLACEMENT = "�";
