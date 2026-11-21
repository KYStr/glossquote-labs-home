// Pure core for the Group Generator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-group-generator-20261109):
// strict field-order validation, the mulberry32 generator pinned
// bit-for-bit with the lottery-number-picker core, a full forward
// Fisher-Yates shuffle (exactly one draw per position, including the
// last), and round-robin dealing into balanced groups. The core never
// invents a seed — an empty seed is an EMPTY error here; the app fills
// one in before calling, exactly as the SPEC pins.

export const FIELDS = ["names", "mode", "groupCount", "groupSize", "seed"];

export const DEFAULT_DRAFT = {
  names: "",
  mode: "count",
  groupCount: "3",
  groupSize: "4",
  seed: "",
};

// The first literal fixture case: Load example fills exactly this.
export const EXAMPLE_INPUT = {
  names: "王小明\n李小華\n陳小美\n林阿哲\n黃小芬\n吳阿國\n劉小玉\n張阿宏",
  mode: "count",
  groupCount: "3",
  groupSize: "",
  seed: "42",
};

export const MAX_RAW_UNITS = 32768;
export const MAX_NAMES = 500;
export const MAX_NAME_UNITS = 40;
export const MAX_COUNT_UNITS = 3;
export const MAX_SEED_UNITS = 10;
export const UINT32_MAX = 4294967295;
export const GROUP_MIN = 1;
export const GROUP_MAX = 500;
export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "group-generator-report.json";
export const TEXT_FILENAME = "group-generator-groups.txt";

// mulberry32 increment, the single definition in this tool; it must
// match the lottery-number-picker pinned constant bit for bit.
export const PRNG_INCREMENT = 0x6d2b79f5;

// Pinned status announcements (SPEC section 2, userFlow state table).
export const STATUS_MESSAGES = {
  empty: {
    "zh-Hant": "請輸入名單，或載入範例。",
    en: "Enter a name list, or load the example.",
  },
  dirty: {
    "zh-Hant": "輸入已變更，請重新執行",
    en: "Input changed. Run again.",
  },
  busy: { "zh-Hant": "處理中", en: "Working" },
  success: { "zh-Hant": "分組完成", en: "Groups generated" },
  error: {
    "zh-Hant": "無法分組，請檢查輸入",
    en: "Cannot generate groups — check the input",
  },
  cancelled: {
    "zh-Hant": "已取消，可重新執行",
    en: "Cancelled. You can run again.",
  },
};

// Error messages pinned by the SPEC. EMPTY, RANGE and the names form of
// INPUT_LIMIT vary by field (and by row for names); every other code
// has a single text.
export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確。", en: "Input is malformed." },
  INPUT_LIMIT: {
    namesRowNull: { "zh-Hant": "名單太長。", en: "The name list is too long." },
    namesRow: {
      "zh-Hant": "姓名太長（上限 40 字）。",
      en: "A name is too long (max 40 characters).",
    },
    other: { "zh-Hant": "輸入太長。", en: "Input is too long." },
  },
  UNICODE: {
    "zh-Hant": "姓名含有不完整的字元。",
    en: "A name contains an incomplete character.",
  },
  EMPTY: {
    names: { "zh-Hant": "請先輸入名單。", en: "Enter at least one name." },
    groupCount: { "zh-Hant": "組數不可空白。", en: "Number of groups must not be blank." },
    groupSize: {
      "zh-Hant": "每組人數不可空白。",
      en: "People per group must not be blank.",
    },
    seed: { "zh-Hant": "種子不可空白。", en: "Seed must not be blank." },
  },
  ROW_LIMIT: { "zh-Hant": "名單上限 500 人。", en: "At most 500 names." },
  ENUM: { "zh-Hant": "請選擇分組方式。", en: "Choose a grouping mode." },
  INTEGER_FORMAT: {
    "zh-Hant": "請輸入不含空白、符號或小數的十進位整數。",
    en: "Enter a decimal integer with no spaces, sign, decimals or exponent.",
  },
  RANGE: {
    groupCount: {
      "zh-Hant": "組數必須介於 1 到 500，且不可大於人數。",
      en: "Groups must be between 1 and 500 and no more than the number of names.",
    },
    groupSize: {
      "zh-Hant": "每組人數必須介於 1 到 500。",
      en: "People per group must be between 1 and 500.",
    },
    seed: {
      "zh-Hant": "種子必須介於 0 到 4294967295。",
      en: "Seed must be between 0 and 4294967295.",
    },
  },
  OUTPUT_LIMIT: {
    "zh-Hant": "報告太大，無法下載。",
    en: "The report is too large to download.",
  },
  INTERNAL: { "zh-Hant": "處理失敗，請重試。", en: "Something went wrong. Try again." },
  WORKER_ERROR: { "zh-Hant": "處理失敗，請重試。", en: "Something went wrong. Try again." },
};

export function errorMessage(error, lang) {
  if (error === null || typeof error !== "object") return ERROR_MESSAGES.INTERNAL[lang];
  const entry = ERROR_MESSAGES[error.code];
  if (!entry) return ERROR_MESSAGES.INTERNAL[lang];
  if (error.code === "EMPTY" || error.code === "RANGE") {
    const perField = entry[error.field];
    return perField ? perField[lang] : ERROR_MESSAGES.INTERNAL[lang];
  }
  if (error.code === "INPUT_LIMIT") {
    if (error.field === "names") {
      const perRow = error.row === null ? entry.namesRowNull : entry.namesRow;
      return perRow[lang];
    }
    return entry.other[lang];
  }
  return entry[lang] ?? ERROR_MESSAGES.INTERNAL[lang];
}

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
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

// Schema gate only: the input must be a non-null, non-array plain
// object whose own enumerable properties are exactly the five fields,
// each an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the five string values, or null.
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

// Trims exactly the SPEC's trim set (U+0020, U+0009, U+3000) from both
// ends. String.prototype.trim would remove a wider set, so it is not
// used here.
export function trimName(line) {
  return line.replace(/^[ \t\u3000]+/, "").replace(/[ \t\u3000]+$/, "");
}

// Parses the names field in the SPEC's pinned order: raw capacity,
// then per kept line (in original order) capacity then unpaired
// surrogate, then the kept-name count. Returns the kept names with
// their original 1-based row numbers, or the first failure.
function parseNames(raw) {
  if (raw.length > MAX_RAW_UNITS) return failure("INPUT_LIMIT", "names", null);
  const lines = raw.split("\n");
  const kept = [];
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = trimName(lines[index]);
    if (trimmed === "") continue;
    const row = index + 1;
    if (trimmed.length > MAX_NAME_UNITS) return failure("INPUT_LIMIT", "names", row);
    if (hasUnpairedSurrogate(trimmed)) return failure("UNICODE", "names", row);
    kept.push({ name: trimmed, row });
  }
  if (kept.length === 0) return failure("EMPTY", "names", null);
  if (kept.length > MAX_NAMES) return failure("ROW_LIMIT", "names", kept[MAX_NAMES].row);
  return { ok: true, names: kept.map((entry) => entry.name) };
}

// Shared per-field pipeline for the two count fields and the seed:
// capacity first (for both fields, active or not), then — for the
// active field only — EMPTY, INTEGER_FORMAT, RANGE, in the SPEC's
// pinned order. An inactive field is never examined beyond capacity.
function parseIntegerField(raw, maxUnits, min, max, field, active) {
  if (raw.length > maxUnits) return failure("INPUT_LIMIT", field, null);
  if (!active) return { ok: true, value: null };
  if (raw === "") return failure("EMPTY", field, null);
  if (!INTEGER_PATTERN.test(raw)) return failure("INTEGER_FORMAT", field, null);
  const value = Number(raw);
  if (value < min || value > max) return failure("RANGE", field, null);
  return { ok: true, value };
}

// mulberry32, exactly as pinned by the SPEC and by the
// lottery-number-picker product core: all arithmetic is 32-bit, and
// each call returns k / 2^32 in [0, 1).
export function createPrng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + PRNG_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Full forward Fisher-Yates shuffle in the lottery pinned form,
// extended to every position: exactly one draw per position, even
// when only one candidate remains (span 1, j is always i).
export function shuffleNames(names, seed) {
  const a = names.slice();
  const next = createPrng(seed);
  for (let i = 0; i < a.length; i += 1) {
    const r = next();
    const j = i + Math.floor(r * (a.length - i));
    const held = a[i];
    a[i] = a[j];
    a[j] = held;
  }
  return a;
}

// Round-robin dealing: shuffled position t (0-based) goes to group
// (t mod K) + 1, so group sizes differ by at most one and the larger
// groups are always the first ones.
function deal(shuffled, groupCount) {
  const groups = [];
  for (let number = 1; number <= groupCount; number += 1) {
    groups.push({ number, size: 0, members: [] });
  }
  for (let t = 0; t < shuffled.length; t += 1) {
    groups[t % groupCount].members.push(shuffled[t]);
  }
  for (const group of groups) group.size = group.members.length;
  return groups;
}

// Validates the whole input: schema first, then fields in the fixed
// order names, mode, groupCount, groupSize, seed, then the cross-field
// rule; the first error wins.
export function run(input) {
  const values = readSchema(input);
  if (values === null) return failure("SCHEMA", null, null);

  const parsedNames = parseNames(values.names);
  if (!parsedNames.ok) return parsedNames;
  const names = parsedNames.names;
  const totalNames = names.length;

  if (values.mode !== "count" && values.mode !== "size") {
    return failure("ENUM", "mode", null);
  }

  // Both count fields get their capacity check first, then the active
  // field's remaining checks, in field order.
  if (values.groupCount.length > MAX_COUNT_UNITS) {
    return failure("INPUT_LIMIT", "groupCount", null);
  }
  if (values.groupSize.length > MAX_COUNT_UNITS) {
    return failure("INPUT_LIMIT", "groupSize", null);
  }
  const activeCountField = values.mode === "count" ? "groupCount" : "groupSize";
  const countParsed = parseIntegerField(
    values[activeCountField],
    MAX_COUNT_UNITS,
    GROUP_MIN,
    GROUP_MAX,
    activeCountField,
    true,
  );
  if (!countParsed.ok) return countParsed;

  const seedParsed = parseIntegerField(
    values.seed,
    MAX_SEED_UNITS,
    0,
    UINT32_MAX,
    "seed",
    true,
  );
  if (!seedParsed.ok) return seedParsed;

  let groupCount;
  if (values.mode === "count") {
    groupCount = countParsed.value;
    if (groupCount > totalNames) return failure("RANGE", "groupCount", null);
  } else {
    groupCount = Math.ceil(totalNames / countParsed.value);
  }

  const shuffled = shuffleNames(names, seedParsed.value);
  const result = {
    seed: seedParsed.value,
    mode: values.mode,
    groupCount,
    totalNames,
    groups: deal(shuffled, groupCount),
  };

  // Report cap backstop (SPEC section 3): a result over the cap is an
  // OUTPUT_LIMIT error instead of a success. With the pinned bounds a
  // real result is a few tens of kilobytes, so this never fires for a
  // genuine run.
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

// Fixed plain-text rendering, per the SPEC: one heading line per group,
// then one line per member (the trimmed name, no prefix); exactly one
// blank line between groups; no trailing LF; UTF-8, no BOM.
export function formatGroupsText(result, lang) {
  const lines = [];
  for (const group of result.groups) {
    if (lines.length > 0) lines.push("");
    if (lang === "en") {
      lines.push(
        group.size === 1
          ? `Group ${group.number} (1 member)`
          : `Group ${group.number} (${group.size} members)`,
      );
    } else {
      lines.push(`第 ${group.number} 組（${group.size} 人）`);
    }
    for (const member of group.members) lines.push(member);
  }
  return lines.join("\n");
}

// Serialize the text list for download, with the same byte cap as the
// JSON report.
export function serializeGroupsText(result, lang) {
  const text = formatGroupsText(result, lang);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
