// Pure core for the Dice Roller.
// No DOM, network, storage, clock, or randomness of its own: the same
// input always produces the same output, bit for bit. Implements
// SPEC.md (spec-dice-roller-20261109): a single NdM notation with an
// optional +K / -K modifier, rolled with the pinned mulberry32 PRNG
// (the same bit-level definition as tools/lottery-number-picker's
// createPrng and the group-generator spec), exactly one PRNG draw per
// die, in roll order. The core never invents a seed — an empty seed is
// an EMPTY error here; the app fills one in before calling, exactly as
// the SPEC pins.

export const FIELDS = ["notation", "seed"];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = { notation: 32, seed: 10 };

export const DEFAULTS = { notation: "2d6", seed: "" };

// The first literal fixture case: Load example fills exactly this.
export const EXAMPLE = { notation: "2d6", seed: "42" };

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "dice-roller-report.json";

export const COUNT_MIN = 1;
export const COUNT_MAX = 100;
export const SIDES_MIN = 2;
export const SIDES_MAX = 1000;
export const MODIFIER_LIMIT = 10000;
export const SEED_MAX = 4294967295;

// Pinned mulberry32 constants (SPEC inputsOutputs, bit-level pin).
export const PRNG_INCREMENT = 0x6d2b79f5;

// Pinned status announcements (SPEC inputsOutputs table; the empty and
// success wordings are the tool's own neutral status text, since the
// SPEC pins only dirty / busy / cancelled verbatim).
export const STATUS_TEXT = {
  empty: { "zh-Hant": "準備就緒", en: "Ready" },
  dirty: { "zh-Hant": "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { "zh-Hant": "處理中", en: "Working" },
  success: { "zh-Hant": "擲骰完成", en: "Roll complete" },
  error: { "zh-Hant": "無法擲骰，請檢查輸入", en: "Cannot roll — check your input" },
  cancelled: { "zh-Hant": "已取消，可重新執行", en: "Cancelled. You can run again." },
};

// Pinned bilingual error messages (SPEC inputsOutputs table). NOTATION
// carries {n} = position + 1 (1-based character number); RANGE varies
// by component, so it is stored per component.
export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確。", en: "Input is malformed." },
  INPUT_LIMIT: { "zh-Hant": "輸入太長。", en: "Input is too long." },
  UNICODE: { "zh-Hant": "輸入含有不完整的字元。", en: "Input contains an incomplete character." },
  EMPTY: {
    notation: { "zh-Hant": "請輸入骰式。", en: "Enter dice notation." },
    seed: { "zh-Hant": "種子不可空白。", en: "Seed must not be blank." },
  },
  NOTATION: {
    "zh-Hant": "骰式格式不正確，請檢查第 {n} 個字元。",
    en: "Dice notation is invalid. Check character {n}.",
  },
  RANGE: {
    count: { "zh-Hant": "骰子數量必須介於 1 到 100。", en: "Dice count must be between 1 and 100." },
    sides: { "zh-Hant": "骰子面數必須介於 2 到 1000。", en: "Sides per die must be between 2 and 1000." },
    modifier: {
      "zh-Hant": "修正值必須介於 -10000 到 10000。",
      en: "Modifier must be between -10000 and 10000.",
    },
    seed: { "zh-Hant": "種子必須介於 0 到 4294967295。", en: "Seed must be between 0 and 4294967295." },
  },
  INTEGER_FORMAT: {
    "zh-Hant": "請輸入不含空白、符號或小數的十進位整數。",
    en: "Enter a decimal integer with no spaces, sign, decimals or exponent.",
  },
  OUTPUT_LIMIT: { "zh-Hant": "報告太大，無法下載。", en: "The report is too large to download." },
  INTERNAL: { "zh-Hant": "處理失敗，請重試。", en: "Something went wrong. Try again." },
  WORKER_ERROR: { "zh-Hant": "處理失敗，請重試。", en: "Something went wrong. Try again." },
};

// Localize one core error object. `lang` is "zh-Hant" or "en".
export function formatErrorMessage(error, lang) {
  const key = lang === "en" ? "en" : "zh-Hant";
  if (error === null || typeof error !== "object") return ERROR_MESSAGES.INTERNAL[key];
  if (error.code === "EMPTY" && (error.field === "notation" || error.field === "seed")) {
    return ERROR_MESSAGES.EMPTY[error.field][key];
  }
  if (error.code === "NOTATION" && typeof error.position === "number") {
    return ERROR_MESSAGES.NOTATION[key].replace("{n}", String(error.position + 1));
  }
  if (error.code === "RANGE" && error.field === "notation" && typeof error.component === "string") {
    const message = ERROR_MESSAGES.RANGE[error.component];
    if (message !== undefined) return message[key];
  }
  if (error.code === "RANGE" && error.field === "seed") {
    return ERROR_MESSAGES.RANGE.seed[key];
  }
  const message = ERROR_MESSAGES[error.code];
  if (message !== undefined && typeof message === "object" && message[key] !== undefined) {
    return message[key];
  }
  return ERROR_MESSAGES.INTERNAL[key];
}

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable properties are exactly the two fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the two string values, or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

// True when the value passes the schema gate only.
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

function isDigit(unit) {
  return unit >= 48 && unit <= 57;
}

// Parse one notation string, following the SPEC's scan order exactly:
// capacity, unpaired surrogate, empty, grammar scan (positions are
// 0-based UTF-16 indices, no trimming, no whitespace anywhere), then
// component ranges in count -> sides -> modifier order. A component
// whose digit run is longer than 10 digits is RANGE directly, without
// conversion. Returns { ok: true, count, sides, modifier } or a
// failure object.
function parseNotation(raw) {
  if (raw.length > RAW_LIMITS.notation) return fieldError("INPUT_LIMIT", "notation");
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", "notation");
  if (raw === "") return fieldError("EMPTY", "notation");

  let index = 0;
  const countStart = index;
  while (index < raw.length && isDigit(raw.charCodeAt(index))) index += 1;
  const countDigits = raw.slice(countStart, index);

  if (index >= raw.length || (raw[index] !== "d" && raw[index] !== "D")) {
    return {
      ok: false,
      error: { code: "NOTATION", field: "notation", row: null, position: index },
    };
  }
  index += 1;

  const sidesStart = index;
  while (index < raw.length && isDigit(raw.charCodeAt(index))) index += 1;
  const sidesDigits = raw.slice(sidesStart, index);
  if (sidesDigits === "") {
    return {
      ok: false,
      error: { code: "NOTATION", field: "notation", row: null, position: index },
    };
  }

  let modifierDigits = null;
  let modifierSign = 1;
  if (index < raw.length) {
    if (raw[index] !== "+" && raw[index] !== "-") {
      return {
        ok: false,
        error: { code: "NOTATION", field: "notation", row: null, position: index },
      };
    }
    modifierSign = raw[index] === "-" ? -1 : 1;
    index += 1;
    const modifierStart = index;
    while (index < raw.length && isDigit(raw.charCodeAt(index))) index += 1;
    modifierDigits = raw.slice(modifierStart, index);
    if (modifierDigits === "") {
      return {
        ok: false,
        error: { code: "NOTATION", field: "notation", row: null, position: index },
      };
    }
  }
  if (index !== raw.length) {
    return {
      ok: false,
      error: { code: "NOTATION", field: "notation", row: null, position: index },
    };
  }

  const rangeError = (component) => ({
    ok: false,
    error: { code: "RANGE", field: "notation", row: null, component },
  });
  if (countDigits.length > 10) return rangeError("count");
  const count = countDigits === "" ? 1 : Number(countDigits);
  if (count < COUNT_MIN || count > COUNT_MAX) return rangeError("count");
  if (sidesDigits.length > 10) return rangeError("sides");
  const sides = Number(sidesDigits);
  if (sides < SIDES_MIN || sides > SIDES_MAX) return rangeError("sides");
  let modifier = 0;
  if (modifierDigits !== null) {
    if (modifierDigits.length > 10) return rangeError("modifier");
    modifier = modifierSign * Number(modifierDigits);
    if (Math.abs(modifier) > MODIFIER_LIMIT) return rangeError("modifier");
  }
  return { ok: true, count, sides, modifier };
}

// Validate the seed string, in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar ^(0|[1-9][0-9]*)$, then range 0-4294967295.
function parseSeed(raw) {
  if (raw.length > RAW_LIMITS.seed) return fieldError("INPUT_LIMIT", "seed");
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", "seed");
  if (raw === "") return fieldError("EMPTY", "seed");
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) return fieldError("INTEGER_FORMAT", "seed");
  const value = Number(raw);
  if (value < 0 || value > SEED_MAX) return fieldError("RANGE", "seed");
  return { ok: true, value };
}

// mulberry32, bit-level pinned (SPEC inputsOutputs; identical to
// tools/lottery-number-picker's createPrng). Returns the next numerator
// k (a uint32); the caller converts it with the exact integer formula
// 1 + floor(k * M / 2^32).
export function createPrng(seed) {
  let state = seed >>> 0;
  return function nextUint32() {
    state = (state + PRNG_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

// Validate the whole input: schema first, then notation, then seed;
// the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  const notation = parseNotation(values.notation);
  if (!notation.ok) return notation;
  const seed = parseSeed(values.seed);
  if (!seed.ok) return seed;
  return { ok: true, values: { ...notation, seed: seed.value } };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { count, sides, modifier, seed } = validated.values;

  const nextUint32 = createPrng(seed);
  const rolls = [];
  for (let i = 0; i < count; i += 1) {
    const k = nextUint32();
    // k * sides <= (2^32 - 1) * 1000 < 2^42, an exact integer in
    // double precision, so floor is unambiguous (SPEC inputsOutputs).
    rolls.push(1 + Math.floor((k * sides) / 4294967296));
  }
  const sum = rolls.reduce((total, roll) => total + roll, 0);
  const total = sum + modifier;

  let expression = `${count}d${sides}`;
  if (modifier > 0) expression += `+${modifier}`;
  else if (modifier < 0) expression += `-${-modifier}`;

  const result = { expression, count, sides, modifier, seed, rolls, sum, total };

  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
