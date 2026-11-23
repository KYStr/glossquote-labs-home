// Pure core for the Password Strength Checker
// (spec-password-strength-checker-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Scoring model (SPEC inputsOutputs, pinned and frozen):
//   baseEntropyBits = passwordLength (code points) x log2(pool),
//     rounded half away from zero to 1 decimal place; every later
//     step uses that 1-decimal value.
//   penalties, in fixed order (each at most once, except
//     DICTIONARY_WORD which counts at most 2 distinct words):
//     COMMON_PASSWORD -30, DICTIONARY_WORD -12 each (max 2),
//     REPEAT_RUN -8, SEQUENCE -8, KEYBOARD_WALK -8, YEAR -6,
//     REPEATED_PATTERN -10, SHORT_LENGTH -10, SINGLE_CLASS -8.
//     totalPenaltyBits = min(40, sum).
//   finalEntropyBits = max(0, baseEntropyBits - totalPenaltyBits).
// Bands: <28 very weak, 28-35.9 weak, 36-59.9 fair, 60-79.9
// strong, >=80 very strong.
// Crack time uses guesses = 2^finalEntropyBits (the full count, not
// half; see the SPEC implementation note) divided by the two zxcvbn
// public attack rates the SPEC borrows: online unthrottled 10/s,
// offline fast hash 10^10/s. zxcvbn itself is NOT implemented.
// No leet decoding. The frozen tables (16 common passwords from
// NordPass 2024, 40 dictionary words, 4 QWERTY rows) never change.
// The result never contains the password or any substring of it:
// penalty entries carry only codes and bits, never the matched word.

export const FIELDS = ["password"];

export const DEFAULTS = { password: "" };

// The worked example is fixtures.json case 1 (troubador-strong)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { password: "Tr0ub4dor&3" };

export const MAX_CODE_POINTS = 128;

// Frozen common-password table (SPEC inputsOutputs step 4): 16
// entries from the NordPass "Top 200 most common passwords" 2024
// global personal list. Compared case-insensitively against the
// whole password.
export const COMMON_PASSWORDS = [
  "123456",
  "123456789",
  "12345678",
  "password",
  "qwerty123",
  "qwerty1",
  "111111",
  "12345",
  "secret",
  "123123",
  "qwerty",
  "abc123",
  "dragon",
  "monkey",
  "123123123",
  "qwertyuiop",
];

// Frozen dictionary table (SPEC inputsOutputs step 4): 40 words,
// matched as substrings of the lowercased password, in this order,
// at most the first 2 distinct words. No leet decoding.
export const DICTIONARY_WORDS = [
  "password",
  "admin",
  "welcome",
  "monkey",
  "dragon",
  "football",
  "sunshine",
  "master",
  "shadow",
  "superman",
  "qwerty",
  "letmein",
  "trustno1",
  "iloveyou",
  "princess",
  "summer",
  "winter",
  "hello",
  "secret",
  "freedom",
  "cheese",
  "cookie",
  "banana",
  "tiger",
  "soccer",
  "baseball",
  "charlie",
  "jordan",
  "michael",
  "correct",
  "horse",
  "battery",
  "staple",
  "autumn",
  "spring",
  "pepper",
  "orange",
  "apple",
  "hockey",
  "whatever",
];

// Frozen QWERTY rows (SPEC inputsOutputs step 4), checked in both
// directions.
export const KEYBOARD_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

// The 32 ASCII punctuation symbols (SPEC inputsOutputs step 2).
export const SYMBOL_CHARS = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

export const MAX_TOTAL_PENALTY_BITS = 40;
export const ONLINE_RATE_PER_SECOND = 10;
export const OFFLINE_RATE_PER_SECOND = 1e10;
export const SECONDS_PER_YEAR = 31557600;

export const BAND_LABELS = {
  "very weak": { zh: "非常弱", en: "Very weak" },
  weak: { zh: "弱", en: "Weak" },
  fair: { zh: "普通", en: "Fair" },
  strong: { zh: "強", en: "Strong" },
  "very strong": { zh: "非常強", en: "Very strong" },
};

// Bilingual penalty descriptions (feature only, never the matched
// text). The UI renders these; the result object carries codes only.
export const PENALTY_INFO = {
  COMMON_PASSWORD: {
    bits: 30,
    zh: "屬於常見密碼",
    en: "Is a common password",
  },
  DICTIONARY_WORD: {
    bits: 12,
    zh: "包含字典單字",
    en: "Contains a dictionary word",
  },
  REPEAT_RUN: {
    bits: 8,
    zh: "有 3 個以上相同字元連續出現",
    en: "Has 3 or more identical characters in a row",
  },
  SEQUENCE: {
    bits: 8,
    zh: "有連續遞增或遞減的字母或數字序列",
    en: "Has a sequential run of letters or digits",
  },
  KEYBOARD_WALK: {
    bits: 8,
    zh: "有鍵盤橫列上的連續字元",
    en: "Has a run along a keyboard row",
  },
  YEAR: {
    bits: 6,
    zh: "包含年份",
    en: "Contains a year",
  },
  REPEATED_PATTERN: {
    bits: 10,
    zh: "由較短片段重複組成",
    en: "Is a shorter segment repeated",
  },
  SHORT_LENGTH: {
    bits: 10,
    zh: "長度不到 8 個字元",
    en: "Shorter than 8 characters",
  },
  SINGLE_CLASS: {
    bits: 8,
    zh: "只使用一種字元類別",
    en: "Uses only one character class",
  },
};

// Bilingual suggestion texts, in the SPEC's fixed suggestion order.
export const SUGGESTION_TEXTS = {
  S_COMMON: { zh: "避免使用常見密碼", en: "Avoid common passwords" },
  S_DICT: { zh: "避免使用字典單字", en: "Avoid dictionary words" },
  S_REPEAT: {
    zh: "避免重複字元或重複片段",
    en: "Avoid repeated characters or repeated segments",
  },
  S_SEQ: {
    zh: "避免連續字母、數字或鍵盤序列",
    en: "Avoid sequential letters, digits, or keyboard runs",
  },
  S_YEAR: { zh: "避免使用年份", en: "Avoid using a year" },
  S_LENGTH: { zh: "使用至少 12 個字元", en: "Use at least 12 characters" },
  S_CLASSES: {
    zh: "混合大小寫字母、數字與符號",
    en: "Mix upper- and lowercase letters, digits, and symbols",
  },
};

// Pinned disclaimer (SPEC tests section), shown on both pages.
export const DISCLAIMER_ZH =
  "強度數字是模型估算，不是保證；再強的密碼也可能因外洩、釣魚或重複使用而失效。密碼絕不離開本頁、不儲存。";
export const DISCLAIMER_EN =
  "Strength figures are model estimates, not a guarantee — even a strong password can fail through leaks, phishing, or reuse. Your password never leaves this page and is never stored.";

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw string map, or null when the shape is not exactly
// the single password field.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Round half away from zero to 1 decimal place (SPEC steps 3 and 6).
function roundHalfAway1dp(value) {
  return Math.sign(value) * Math.round(Math.abs(value) * 10) / 10;
}

function classOf(codePoint) {
  const ch = String.fromCodePoint(codePoint);
  if (ch >= "a" && ch <= "z") return "lowercase";
  if (ch >= "A" && ch <= "Z") return "uppercase";
  if (ch >= "0" && ch <= "9") return "digits";
  if (SYMBOL_CHARS.includes(ch)) return "symbols";
  return "other";
}

function isDigitCodePoint(codePoint) {
  return codePoint >= 0x30 && codePoint <= 0x39;
}

function isLetterCodePoint(codePoint) {
  return (
    (codePoint >= 0x61 && codePoint <= 0x7a) || (codePoint >= 0x41 && codePoint <= 0x5a)
  );
}

// A length >= 4 run of consecutive increasing (+1) or decreasing
// (-1) code points, all digits or all letters (compared after
// lowercasing, so letter case never matters).
function hasSequence(codePoints) {
  for (let start = 0; start + 3 < codePoints.length; start += 1) {
    const quad = codePoints.slice(start, start + 4);
    const allDigits = quad.every(isDigitCodePoint);
    const allLetters = quad.every(isLetterCodePoint);
    if (!allDigits && !allLetters) continue;
    const diffs = [
      quad[1] - quad[0],
      quad[2] - quad[1],
      quad[3] - quad[2],
    ];
    if (diffs.every((diff) => diff === 1) || diffs.every((diff) => diff === -1)) return true;
  }
  return false;
}

// A length >= 4 substring found in a frozen QWERTY row or its
// reverse (compared after lowercasing).
function hasKeyboardWalk(lowerCodePoints) {
  const rows = [];
  for (const row of KEYBOARD_ROWS) {
    rows.push(row);
    rows.push([...row].reverse().join(""));
  }
  for (let start = 0; start + 3 < lowerCodePoints.length; start += 1) {
    const piece = String.fromCodePoint(...lowerCodePoints.slice(start, start + 4));
    if (rows.some((row) => row.includes(piece))) return true;
  }
  return false;
}

function hasYear(codePoints) {
  for (let start = 0; start + 3 < codePoints.length; start += 1) {
    const quad = codePoints.slice(start, start + 4);
    if (!quad.every(isDigitCodePoint)) continue;
    const value =
      (quad[0] - 0x30) * 1000 +
      (quad[1] - 0x30) * 100 +
      (quad[2] - 0x30) * 10 +
      (quad[3] - 0x30);
    if (value >= 1900 && value <= 2099) return true;
  }
  return false;
}

// The whole password is one shorter segment (length >= 2) repeated
// at least twice, exactly.
function hasRepeatedPattern(codePoints) {
  const length = codePoints.length;
  for (let unitLength = 2; unitLength <= Math.floor(length / 2); unitLength += 1) {
    if (length % unitLength !== 0) continue;
    const unit = codePoints.slice(0, unitLength);
    let repeated = true;
    for (let index = unitLength; index < length; index += 1) {
      if (codePoints[index] !== unit[index % unitLength]) {
        repeated = false;
        break;
      }
    }
    if (repeated) return true;
  }
  return false;
}

function bandOf(finalEntropyBits) {
  if (finalEntropyBits < 28) return "very weak";
  if (finalEntropyBits < 36) return "weak";
  if (finalEntropyBits < 60) return "fair";
  if (finalEntropyBits < 80) return "strong";
  return "very strong";
}

// Rounds the shortest round-trip decimal representation of
// `value` (the digits Python repr / Decimal(str(float)) would use)
// half away from zero to 1 decimal place, rendered in plain
// notation. This matches the SPEC fixtures: huge crack times render
// as full digit strings (never exponential notation), and the tail
// digits are the shortest-repr digits, not the exact binary
// expansion (e.g. 12745199425239998000.0, not 12745199425239998464.0
// — the exact binary expansion of the same double).
function formatOneDecimal(value) {
  const text = String(value);
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (match === null) throw new Error("unexpected number format");
  const intPart = match[1];
  const fracPart = match[2] ?? "";
  const exponent = match[3] === undefined ? 0 : Number(match[3]);
  const digits = `${intPart}${fracPart}`;
  let pointPos = intPart.length + exponent;
  const keep = pointPos + 1;
  let rounded;
  if (digits.length <= keep) {
    rounded = digits.padEnd(keep, "0");
  } else {
    const nextDigit = Number(digits[keep]);
    let head = digits.slice(0, keep);
    if (nextDigit >= 5) {
      const chars = head.split("");
      let index = chars.length - 1;
      let carry = 1;
      while (index >= 0 && carry > 0) {
        const sum = Number(chars[index]) + carry;
        chars[index] = String(sum % 10);
        carry = sum >= 10 ? 1 : 0;
        index -= 1;
      }
      head = (carry === 1 ? "1" : "") + chars.join("");
      if (head.length > keep) pointPos += 1;
    }
    rounded = head;
  }
  if (rounded.length <= pointPos) {
    return `${rounded.padEnd(pointPos, "0")}.0`;
  }
  return `${rounded.slice(0, pointPos)}.${rounded.slice(pointPos)}`;
}

// SPEC step 6: the unit is chosen from the unrounded seconds; the
// displayed value is rounded half away from zero to 1 decimal place.
// 1 year = 31,557,600 seconds. No thousands separators.
function formatCrackTime(seconds, lang) {
  const underOne = lang === "en" ? "<1 second" : "<1 秒";
  if (seconds < 1) return underOne;
  const units =
    lang === "en"
      ? [
          [60, 1, "seconds"],
          [3600, 60, "minutes"],
          [86400, 3600, "hours"],
          [SECONDS_PER_YEAR, 86400, "days"],
          [Infinity, SECONDS_PER_YEAR, "years"],
        ]
      : [
          [60, 1, "秒"],
          [3600, 60, "分鐘"],
          [86400, 3600, "小時"],
          [SECONDS_PER_YEAR, 86400, "天"],
          [Infinity, SECONDS_PER_YEAR, "年"],
        ];
  for (const [limit, divisor, label] of units) {
    if (seconds < limit) {
      return `${formatOneDecimal(seconds / divisor)} ${label}`;
    }
  }
  return underOne;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);
  const password = raw.password;

  // Validation order (SPEC inputsOutputs step 1): capacity, then
  // lone surrogate, then empty. Length counts Unicode code points.
  const codePoints = [...password];
  if (codePoints.length > MAX_CODE_POINTS) return failure("INPUT_LIMIT", "password");
  if (hasLoneSurrogate(password)) return failure("UNICODE", "password");
  if (codePoints.length === 0) return failure("EMPTY", "password");

  const points = codePoints.map((ch) => ch.codePointAt(0));
  const classes = [];
  const seen = new Set();
  let pool = 0;
  const POOL_SIZES = {
    lowercase: 26,
    uppercase: 26,
    digits: 10,
    symbols: 32,
    other: 32,
  };
  for (const point of points) {
    const cls = classOf(point);
    if (!seen.has(cls)) {
      seen.add(cls);
      classes.push(cls);
      pool += POOL_SIZES[cls];
    }
  }
  // classes must follow the SPEC's fixed order (lowercase,
  // uppercase, digits, symbols, other), not first-appearance order.
  const CLASS_ORDER = ["lowercase", "uppercase", "digits", "symbols", "other"];
  classes.sort((a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b));

  const passwordLength = codePoints.length;
  const baseEntropyBits = roundHalfAway1dp(passwordLength * Math.log2(pool));

  const lower = password.toLowerCase();
  const lowerPoints = [...lower].map((ch) => ch.codePointAt(0));

  const penalties = [];
  let penaltySum = 0;
  function addPenalty(code) {
    const bits = PENALTY_INFO[code].bits;
    penalties.push({ code, bits });
    penaltySum += bits;
  }

  if (COMMON_PASSWORDS.includes(lower)) addPenalty("COMMON_PASSWORD");

  let dictionaryCount = 0;
  for (const word of DICTIONARY_WORDS) {
    if (dictionaryCount >= 2) break;
    if (lower.includes(word)) {
      addPenalty("DICTIONARY_WORD");
      dictionaryCount += 1;
    }
  }

  let hasRepeatRun = false;
  for (let index = 0; index + 2 < points.length; index += 1) {
    if (points[index] === points[index + 1] && points[index] === points[index + 2]) {
      hasRepeatRun = true;
      break;
    }
  }
  if (hasRepeatRun) addPenalty("REPEAT_RUN");
  if (hasSequence(points)) addPenalty("SEQUENCE");
  if (hasKeyboardWalk(lowerPoints)) addPenalty("KEYBOARD_WALK");
  if (hasYear(points)) addPenalty("YEAR");
  if (hasRepeatedPattern(points)) addPenalty("REPEATED_PATTERN");
  if (passwordLength < 8) addPenalty("SHORT_LENGTH");
  if (classes.length === 1) addPenalty("SINGLE_CLASS");

  const totalPenaltyBits = Math.min(MAX_TOTAL_PENALTY_BITS, penaltySum);
  // Re-round after the subtraction: in binary floating point
  // 72.1 - 18 is 54.099999999999994, but the SPEC's model is decimal
  // (a 1-decimal base minus whole bits stays 1-decimal), and the
  // fixtures pin 54.1.
  const finalEntropyBits = Math.max(
    0,
    roundHalfAway1dp(baseEntropyBits - totalPenaltyBits),
  );
  const band = bandOf(finalEntropyBits);

  const guesses = 2 ** finalEntropyBits;
  const crackTimeOnline = {
    zh: formatCrackTime(guesses / ONLINE_RATE_PER_SECOND, "zh"),
    en: formatCrackTime(guesses / ONLINE_RATE_PER_SECOND, "en"),
  };
  const crackTimeOffline = {
    zh: formatCrackTime(guesses / OFFLINE_RATE_PER_SECOND, "zh"),
    en: formatCrackTime(guesses / OFFLINE_RATE_PER_SECOND, "en"),
  };

  const suggestions = [];
  if (penalties.some((entry) => entry.code === "COMMON_PASSWORD")) {
    suggestions.push("S_COMMON");
  }
  if (penalties.some((entry) => entry.code === "DICTIONARY_WORD")) {
    suggestions.push("S_DICT");
  }
  if (
    penalties.some(
      (entry) => entry.code === "REPEAT_RUN" || entry.code === "REPEATED_PATTERN",
    )
  ) {
    suggestions.push("S_REPEAT");
  }
  if (
    penalties.some(
      (entry) => entry.code === "SEQUENCE" || entry.code === "KEYBOARD_WALK",
    )
  ) {
    suggestions.push("S_SEQ");
  }
  if (penalties.some((entry) => entry.code === "YEAR")) suggestions.push("S_YEAR");
  if (passwordLength < 12) suggestions.push("S_LENGTH");
  if (classes.length < 3) suggestions.push("S_CLASSES");

  return {
    ok: true,
    result: {
      passwordLength,
      classes,
      pool,
      baseEntropyBits,
      penalties,
      totalPenaltyBits,
      finalEntropyBits,
      band,
      crackTimeOnline,
      crackTimeOffline,
      suggestions,
    },
  };
}

// Fixed report download: password-strength-report.json. The content
// is the result's compact JSON with object keys sorted recursively
// by UTF-16 code units, array order unchanged, exactly one trailing
// LF, UTF-8 without BOM. The serializer is hand-written: it never
// calls a value's toJSON and accepts only the plain data shapes a
// result can hold (null, booleans, finite numbers, strings, arrays,
// plain objects). The report holds the result only — never the
// password or any substring of it.
export const REPORT_FILENAME = "password-strength-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
