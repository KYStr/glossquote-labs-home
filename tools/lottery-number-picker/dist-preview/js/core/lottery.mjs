// Pure core for the Lottery Number Picker: strict validation of the
// four string fields and the SPEC-pinned deterministic generator
// (mulberry32 + partial Fisher–Yates). No DOM, no network, no storage,
// and no nondeterministic or cryptographic randomness: the same input always
// produces the same output, bit for bit. The core never invents a seed
// — an empty seed is an EMPTY error here; the app fills one in before
// calling, exactly as the SPEC pins.

export const UINT32_MAX = 4294967295;
export const SEED_MAX_UNITS = 10;
export const SET_COUNT_MAX_UNITS = 2;
export const EXCLUDE_MAX_UNITS = 256;
export const MAX_SETS = 10;

export const GAMES = [
  {
    id: "lotto649",
    name: { "zh-Hant": "大樂透", en: "Lotto 6/49" },
    zone1Max: 49,
    zone1Pick: 6,
    zone2Max: 0,
    zone2Pick: 0,
  },
  {
    id: "power638",
    name: { "zh-Hant": "威力彩", en: "Super Lotto 638" },
    zone1Max: 38,
    zone1Pick: 6,
    zone2Max: 8,
    zone2Pick: 1,
  },
  {
    id: "daily539",
    name: { "zh-Hant": "今彩539", en: "Daily Cash 539" },
    zone1Max: 39,
    zone1Pick: 5,
    zone2Max: 0,
    zone2Pick: 0,
  },
];

const GAME_BY_ID = new Map(GAMES.map((game) => [game.id, game]));

export const DEFAULT_DRAFT = { game: "lotto649", seed: "", setCount: "3", exclude: "" };

// The first literal fixture case: Load example fills exactly this.
export const EXAMPLE_INPUT = { game: "lotto649", seed: "42", setCount: "3", exclude: "" };

export const HONEST_NOTE = {
  "zh-Hant":
    "每種號碼組合出現的機率完全相等；本工具不能預測開獎結果，任何號碼組合的中獎機率都相同。",
  en: "Every combination is equally likely. This tool cannot predict draw results; no combination has a better chance of winning than any other.",
};

export const SEED_HELP = {
  "zh-Hant": "留空時會自動產生一個種子並顯示出來，之後可用同一種子重現。",
  en: "Leave blank to have a seed generated and shown; reuse it to reproduce the same numbers.",
};

export const EXCLUDE_HELP = {
  "zh-Hant": "只套用到第一區；威力彩第二區不排除。",
  en: "Applies to Zone 1 only; the Super Lotto Zone 2 is never excluded.",
};

// Error messages pinned by the SPEC. EMPTY and RANGE vary by field, so
// they are stored per field; every other code has a single text.
export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確。", en: "Input is malformed." },
  EMPTY: {
    seed: { "zh-Hant": "種子不可空白。", en: "Seed must not be blank." },
    setCount: { "zh-Hant": "組數不可空白。", en: "Sets must not be blank." },
  },
  INPUT_LIMIT: { "zh-Hant": "輸入太長。", en: "Input is too long." },
  INTEGER_FORMAT: {
    "zh-Hant": "請輸入不含空白、符號或小數的十進位整數。",
    en: "Enter a decimal integer with no spaces, sign, decimals or exponent.",
  },
  RANGE: {
    seed: {
      "zh-Hant": "種子必須介於 0 到 4294967295。",
      en: "Seed must be between 0 and 4294967295.",
    },
    setCount: { "zh-Hant": "組數必須介於 1 到 10。", en: "Sets must be between 1 and 10." },
    exclude: {
      "zh-Hant": "排除號碼必須在該遊戲第一區的號碼範圍內。",
      en: "Excluded numbers must be within the game's Zone 1 range.",
    },
  },
  ENUM: { "zh-Hant": "請選擇一種遊戲。", en: "Choose a game." },
  DUPLICATE: { "zh-Hant": "排除號碼重複。", en: "Excluded numbers must not repeat." },
  POOL_TOO_SMALL: {
    "zh-Hant": "排除後剩下的號碼不足以選出一組。",
    en: "Too many numbers excluded — not enough remain to form a set.",
  },
  INTERNAL: { "zh-Hant": "處理失敗，請重試。", en: "Something went wrong. Try again." },
};

export const STATUS_MESSAGES = {
  dirty: { "zh-Hant": "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { "zh-Hant": "處理中", en: "Working" },
  cancelled: { "zh-Hant": "已取消，可重新執行", en: "Cancelled. You can run again." },
};

export function errorMessage(error, lang) {
  if (error === null || typeof error !== "object") return ERROR_MESSAGES.INTERNAL[lang];
  const entry = ERROR_MESSAGES[error.code];
  if (!entry) return ERROR_MESSAGES.INTERNAL[lang];
  if (error.code === "EMPTY" || error.code === "RANGE") {
    const perField = entry[error.field];
    return perField ? perField[lang] : ERROR_MESSAGES.INTERNAL[lang];
  }
  return entry[lang] ?? ERROR_MESSAGES.INTERNAL[lang];
}

const FIELDS = ["game", "seed", "setCount", "exclude"];
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

// Reads the exact four own data properties; unknown or missing fields,
// wrong types and accessors are all SCHEMA failures.
function readInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  if (Object.keys(input).length !== FIELDS.length) return null;
  const snapshot = {};
  for (const field of FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      return null;
    }
    snapshot[field] = descriptor.value;
  }
  return snapshot;
}

// Shared per-field pipeline for seed/setCount: INPUT_LIMIT, EMPTY,
// INTEGER_FORMAT, RANGE, in the SPEC's pinned order.
function parseIntegerField(raw, maxUnits, min, max, field) {
  if (raw.length > maxUnits) return failure("INPUT_LIMIT", field, null);
  if (raw === "") return failure("EMPTY", field, null);
  if (!INTEGER_PATTERN.test(raw)) return failure("INTEGER_FORMAT", field, null);
  const value = Number(raw);
  if (value < min || value > max) return failure("RANGE", field, null);
  return { ok: true, value };
}

// Parses the exclude list. Tokens are split on "," and trimmed of
// U+0020 spaces only; a string of only spaces is not the empty string
// and yields one empty token. Grammar/range are checked token by
// token, then duplicates, in the SPEC's pinned order.
function parseExclude(raw, game) {
  if (raw.length > EXCLUDE_MAX_UNITS) return failure("INPUT_LIMIT", "exclude", null);
  if (raw === "") return { ok: true, values: [] };
  const tokens = raw.split(",");
  const values = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const row = index + 1;
    const token = tokens[index].replace(/^ +/, "").replace(/ +$/, "");
    if (!INTEGER_PATTERN.test(token)) return failure("INTEGER_FORMAT", "exclude", row);
    const value = Number(token);
    if (value < 1 || value > game.zone1Max) return failure("RANGE", "exclude", row);
    values.push(value);
  }
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    if (seen.has(values[index])) return failure("DUPLICATE", "exclude", index + 1);
    seen.add(values[index]);
  }
  return { ok: true, values };
}

// mulberry32, exactly as pinned by the SPEC: all arithmetic is 32-bit,
// and each call returns k/2^32 in [0, 1).
export function createPrng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Partial Fisher–Yates: exactly one next() call per drawn position,
// even when only one candidate remains.
function draw(next, pool, count) {
  const a = pool.slice();
  for (let i = 0; i < count; i += 1) {
    const r = next();
    const j = i + Math.floor(r * (a.length - i));
    const held = a[i];
    a[i] = a[j];
    a[j] = held;
  }
  return a.slice(0, count).sort((x, y) => x - y);
}

function rangeOf(max) {
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function run(input) {
  const snapshot = readInput(input);
  if (snapshot === null) return failure("SCHEMA", null, null);

  const game = GAME_BY_ID.get(snapshot.game);
  if (!game) return failure("ENUM", "game", null);

  const seed = parseIntegerField(snapshot.seed, SEED_MAX_UNITS, 0, UINT32_MAX, "seed");
  if (!seed.ok) return seed;

  const setCount = parseIntegerField(
    snapshot.setCount,
    SET_COUNT_MAX_UNITS,
    1,
    MAX_SETS,
    "setCount",
  );
  if (!setCount.ok) return setCount;

  const exclude = parseExclude(snapshot.exclude, game);
  if (!exclude.ok) return exclude;

  const excluded = new Set(exclude.values);
  const pool = rangeOf(game.zone1Max).filter((n) => !excluded.has(n));
  if (pool.length < game.zone1Pick) return failure("POOL_TOO_SMALL", "exclude", null);

  const next = createPrng(seed.value);
  const sets = [];
  for (let s = 0; s < setCount.value; s += 1) {
    const zone1 = draw(next, pool, game.zone1Pick);
    const zone2 =
      game.zone2Pick > 0 ? draw(next, rangeOf(game.zone2Max), game.zone2Pick) : null;
    sets.push({ zone1, zone2 });
  }
  return { ok: true, result: { game: game.id, seed: seed.value, sets } };
}

// Fixed plain-text rendering shared by copy and download: one set per
// line, Zone 1 numbers joined with single spaces, Super Lotto sets get
// " + " and the Zone 2 number; lines joined with LF, no trailing LF.
export function formatPicksText(result) {
  return result.sets
    .map((set) =>
      set.zone2 === null
        ? set.zone1.join(" ")
        : `${set.zone1.join(" ")} + ${set.zone2.join(" ")}`,
    )
    .join("\n");
}
