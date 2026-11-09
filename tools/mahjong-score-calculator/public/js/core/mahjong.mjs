// Pure core for the Mahjong Score Calculator
// (spec-mahjong-score-calculator-20261109). Synchronous data-in /
// data-out only: no DOM, no network, no storage. It implements ONE
// fixed rule set — Taiwan 16-tile mahjong, common family-game
// conventions v1 — exactly as the SPEC pins: the 30-code tai table,
// the validation order, the conflict order C1–C7, the interaction
// (exclusion) order E1–E8, the fixed line display order, the dealer
// rule, the cap applied to the total including dealer tai, and the
// payout formulas. All arithmetic is integer arithmetic; no floats,
// no rounding anywhere.

export const MAX_RAW_UNITS = 8;
export const REPORT_LIMIT_BYTES = 2097152;
export const REPORT_FILENAME = "mahjong-score-report.json";

// The 24 user-selectable codes (SPEC inputsOutputs).
export const SELECTABLE_CODES = [
  "ALL_HONORS",
  "BIG_DRAGONS",
  "SMALL_DRAGONS",
  "FULL_FLUSH",
  "HALF_FLUSH",
  "ALL_PUNGS",
  "PING_HU",
  "FIVE_SUITED",
  "ALL_FROM_ONE",
  "MENQING",
  "HEAVENLY_LISTEN",
  "EARTHLY_LISTEN",
  "KONG_WIN",
  "LAST_TILE_SELF",
  "LAST_TILE_DISCARD",
  "ROB_KONG",
  "SEAT_WIND_PONG",
  "ROUND_WIND_PONG",
  "DRAGON_RED",
  "DRAGON_GREEN",
  "DRAGON_WHITE",
  "FLOWER_KONG",
  "SEVEN_ROB_ONE",
  "ALL_FLOWERS",
];

// The 8 overridable codes, in the SPEC's pinned check order.
export const OVERRIDABLE_CODES = [
  "PING_HU",
  "FIVE_SUITED",
  "HEAVENLY_LISTEN",
  "EARTHLY_LISTEN",
  "FLOWER_KONG",
  "HONOR_FLOWER_EACH",
  "THREE_KONGS",
  "FOUR_KONGS",
];

// Fixed tai table (this rule set v1). MENQING_SELF_DRAW is a fixed 3
// and never takes an override; DEALER is 1 + dealerStreak.
export const DEFAULT_TAI = {
  ALL_HONORS: 16,
  BIG_DRAGONS: 8,
  SMALL_DRAGONS: 4,
  FULL_FLUSH: 8,
  HALF_FLUSH: 4,
  ALL_PUNGS: 4,
  PING_HU: 2,
  FIVE_SUITED: 1,
  ALL_FROM_ONE: 2,
  MENQING: 1,
  SELF_DRAW: 1,
  MENQING_SELF_DRAW: 3,
  HEAVENLY_LISTEN: 8,
  EARTHLY_LISTEN: 4,
  KONG_WIN: 1,
  LAST_TILE_SELF: 1,
  LAST_TILE_DISCARD: 1,
  ROB_KONG: 1,
  SEAT_WIND_PONG: 1,
  ROUND_WIND_PONG: 1,
  DRAGON_RED: 1,
  DRAGON_GREEN: 1,
  DRAGON_WHITE: 1,
  HONOR_FLOWER_EACH: 1,
  FLOWER_KONG: 1,
  SEVEN_ROB_ONE: 8,
  ALL_FLOWERS: 8,
  THREE_KONGS: 2,
  FOUR_KONGS: 5,
};

// Fixed display order of the scoring lines (SPEC: patterns, then
// situational, winds, dragon pungs, flowers, kongs, dealer).
export const LINE_ORDER = [
  "ALL_HONORS",
  "BIG_DRAGONS",
  "SMALL_DRAGONS",
  "FULL_FLUSH",
  "HALF_FLUSH",
  "ALL_PUNGS",
  "PING_HU",
  "FIVE_SUITED",
  "ALL_FROM_ONE",
  "MENQING_SELF_DRAW",
  "MENQING",
  "SELF_DRAW",
  "HEAVENLY_LISTEN",
  "EARTHLY_LISTEN",
  "KONG_WIN",
  "LAST_TILE_SELF",
  "LAST_TILE_DISCARD",
  "ROB_KONG",
  "SEAT_WIND_PONG",
  "ROUND_WIND_PONG",
  "DRAGON_RED",
  "DRAGON_GREEN",
  "DRAGON_WHITE",
  "HONOR_FLOWERS",
  "FLOWER_KONG",
  "SEVEN_ROB_ONE",
  "ALL_FLOWERS",
  "THREE_KONGS",
  "FOUR_KONGS",
  "DEALER",
];

export const ITEM_NAMES = {
  ALL_HONORS: { zh: "字一色", en: "All Honors" },
  BIG_DRAGONS: { zh: "大三元", en: "Big Three Dragons" },
  SMALL_DRAGONS: { zh: "小三元", en: "Small Three Dragons" },
  FULL_FLUSH: { zh: "清一色", en: "Full Flush" },
  HALF_FLUSH: { zh: "混一色", en: "Half Flush" },
  ALL_PUNGS: { zh: "碰碰胡", en: "All Pungs" },
  PING_HU: { zh: "平胡", en: "All Sequences" },
  FIVE_SUITED: { zh: "五門齊", en: "All Five Categories" },
  ALL_FROM_ONE: { zh: "全求人", en: "All Exposed" },
  MENQING: { zh: "門清", en: "Concealed Hand" },
  SELF_DRAW: { zh: "自摸", en: "Self Draw" },
  MENQING_SELF_DRAW: { zh: "門清自摸", en: "Concealed Self Draw" },
  HEAVENLY_LISTEN: { zh: "天聽", en: "Heavenly Ready" },
  EARTHLY_LISTEN: { zh: "地聽", en: "Earthly Ready" },
  KONG_WIN: { zh: "槓上開花", en: "Win on Kong Supplement" },
  LAST_TILE_SELF: { zh: "海底撈月", en: "Last Tile Self Draw" },
  LAST_TILE_DISCARD: { zh: "河底撈魚", en: "Last Tile Discard" },
  ROB_KONG: { zh: "搶槓", en: "Robbing the Kong" },
  SEAT_WIND_PONG: { zh: "門風刻", en: "Seat Wind Pung" },
  ROUND_WIND_PONG: { zh: "圈風刻", en: "Round Wind Pung" },
  DRAGON_RED: { zh: "紅中刻", en: "Red Dragon Pung" },
  DRAGON_GREEN: { zh: "發財刻", en: "Green Dragon Pung" },
  DRAGON_WHITE: { zh: "白板刻", en: "White Dragon Pung" },
  HONOR_FLOWERS: { zh: "正花", en: "Honor Flowers" },
  FLOWER_KONG: { zh: "花槓", en: "Flower Set" },
  SEVEN_ROB_ONE: { zh: "七搶一", en: "Seven Flowers Rob One" },
  ALL_FLOWERS: { zh: "八仙過海", en: "All Eight Flowers" },
  THREE_KONGS: { zh: "三槓子", en: "Three Kongs" },
  FOUR_KONGS: { zh: "四槓子", en: "Four Kongs" },
  DEALER: { zh: "莊家", en: "Dealer" },
};

export const REASON_NAMES = {
  SUPERSEDED: {
    zh: "被更高位階的同類項目取代",
    en: "Superseded by a higher-tier item of the same kind",
  },
  SUBSUMED: { zh: "已被大項內含", en: "Already included in a larger item" },
  METHOD_MISMATCH: { zh: "與胡牌方式不符", en: "Does not match the win method" },
  FLOWERS_SUBSUMED: {
    zh: "花台已被大項內含",
    en: "Flower tai already included in a larger item",
  },
};

export const DEFAULTS = {
  winMethod: "discard",
  winnerIsDealer: false,
  discarderIsDealer: false,
  dealerStreak: "0",
  base: "100",
  perTai: "50",
  cap: "none",
  selected: {},
  honorFlowers: "0",
  offFlowers: "0",
  kongCount: "0",
  overrides: {},
};

// The worked example is fixtures.json case 1 (menqing-self-draw)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  winMethod: "self-draw",
  winnerIsDealer: false,
  discarderIsDealer: false,
  dealerStreak: "0",
  base: "100",
  perTai: "50",
  cap: "none",
  selected: { MENQING: true },
  honorFlowers: "0",
  offFlowers: "0",
  kongCount: "0",
  overrides: {},
};

const TOP_LEVEL_FIELDS = [
  "winMethod",
  "winnerIsDealer",
  "discarderIsDealer",
  "dealerStreak",
  "base",
  "perTai",
  "cap",
  "selected",
  "honorFlowers",
  "offFlowers",
  "kongCount",
  "overrides",
];

// Numeric string fields in the SPEC's pinned check order, with ranges.
const NUMERIC_FIELDS = [
  ["base", 0, 100000],
  ["perTai", 0, 10000],
  ["dealerStreak", 0, 8],
  ["honorFlowers", 0, 8],
  ["offFlowers", 0, 8],
  ["kongCount", 0, 4],
];

const SELECTABLE_SET = new Set(SELECTABLE_CODES);
const OVERRIDABLE_SET = new Set(OVERRIDABLE_CODES);
const WIN_METHOD_SET = new Set(["self-draw", "discard"]);
const CAP_SET = new Set(["none", "8", "12", "16"]);

// ASCII integer strings only: "0" or a non-zero leading digit, no
// sign, no whitespace, no decimal point, no exponent. Non-ASCII
// digits (e.g. full-width digits) are never normalized; they fail
// the grammar.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads an own property without invoking accessors.
function ownData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined) return { present: false, accessor: false, value: undefined };
  if (!("value" in descriptor)) return { present: true, accessor: true, value: undefined };
  return { present: true, accessor: false, value: descriptor.value };
}

function parseInteger(raw, field, min, max) {
  if (raw === "") return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(raw)) return { error: failure("INTEGER_FORMAT", field) };
  const value = Number(raw);
  if (value < min || value > max) return { error: failure("RANGE", field) };
  return { value };
}

export function run(input) {
  // Stage 1 — capacity (INPUT_LIMIT). Only own data string values
  // are measured here; anything else is judged by later stages.
  if (isPlainObject(input)) {
    for (const [field] of NUMERIC_FIELDS) {
      const entry = ownData(input, field);
      if (entry.present && !entry.accessor && typeof entry.value === "string" && entry.value.length > MAX_RAW_UNITS) {
        return failure("INPUT_LIMIT", field);
      }
    }
    const overridesEntry = ownData(input, "overrides");
    if (overridesEntry.present && !overridesEntry.accessor && isPlainObject(overridesEntry.value)) {
      for (const code of OVERRIDABLE_CODES) {
        const entry = ownData(overridesEntry.value, code);
        if (entry.present && !entry.accessor && typeof entry.value === "string" && entry.value.length > MAX_RAW_UNITS) {
          return failure("INPUT_LIMIT", `overrides/${code}`);
        }
      }
    }
  }

  // Stage 2 — structure (SCHEMA).
  if (!isPlainObject(input)) return failure("SCHEMA", null);
  const values = {};
  for (const field of TOP_LEVEL_FIELDS) {
    const entry = ownData(input, field);
    if (entry.accessor) return failure("SCHEMA", field);
    if (!entry.present) {
      if (field === "overrides") {
        values.overrides = {};
        continue;
      }
      return failure("SCHEMA", field);
    }
    values[field] = entry.value;
  }
  for (const key of Object.keys(input)) {
    if (!TOP_LEVEL_FIELDS.includes(key)) return failure("SCHEMA", key);
  }
  if (typeof values.winMethod !== "string") return failure("SCHEMA", "winMethod");
  if (typeof values.winnerIsDealer !== "boolean") return failure("SCHEMA", "winnerIsDealer");
  if (typeof values.discarderIsDealer !== "boolean") return failure("SCHEMA", "discarderIsDealer");
  for (const [field] of NUMERIC_FIELDS) {
    if (typeof values[field] !== "string") return failure("SCHEMA", field);
  }
  if (typeof values.cap !== "string") return failure("SCHEMA", "cap");
  if (!isPlainObject(values.selected)) return failure("SCHEMA", "selected");
  for (const key of Object.keys(values.selected)) {
    if (!SELECTABLE_SET.has(key)) return failure("SCHEMA", `selected/${key}`);
    const entry = ownData(values.selected, key);
    if (entry.accessor || typeof entry.value !== "boolean") return failure("SCHEMA", `selected/${key}`);
  }
  if (!isPlainObject(values.overrides)) return failure("SCHEMA", "overrides");
  for (const key of Object.keys(values.overrides)) {
    if (!OVERRIDABLE_SET.has(key)) return failure("SCHEMA", `overrides/${key}`);
    const entry = ownData(values.overrides, key);
    if (entry.accessor || typeof entry.value !== "string") return failure("SCHEMA", `overrides/${key}`);
  }

  // Stage 3 — enumerations (ENUM).
  if (!WIN_METHOD_SET.has(values.winMethod)) return failure("ENUM", "winMethod");
  if (!CAP_SET.has(values.cap)) return failure("ENUM", "cap");

  // Stage 4 — numeric grammar and ranges, in pinned field order.
  const numbers = {};
  for (const [field, min, max] of NUMERIC_FIELDS) {
    const parsed = parseInteger(values[field], field, min, max);
    if (parsed.error) return parsed.error;
    numbers[field] = parsed.value;
  }
  const overrideTai = {};
  for (const code of OVERRIDABLE_CODES) {
    const entry = ownData(values.overrides, code);
    if (!entry.present) continue;
    const parsed = parseInteger(entry.value, `overrides/${code}`, 0, 99);
    if (parsed.error) return parsed.error;
    overrideTai[code] = parsed.value;
  }

  // Stage 5 — cross-field flower total.
  if (numbers.honorFlowers + numbers.offFlowers > 8) {
    return failure("FLOWER_LIMIT", "offFlowers");
  }

  // Stage 6 — logical conflicts C1–C7, first hit wins.
  const sel = (code) => values.selected[code] === true;
  if (sel("MENQING") && sel("ALL_FROM_ONE")) return failure("CONFLICT", "ALL_FROM_ONE");
  if (sel("PING_HU") && sel("ALL_PUNGS")) return failure("CONFLICT", "ALL_PUNGS");
  if (
    sel("PING_HU") &&
    (numbers.honorFlowers > 0 || numbers.offFlowers > 0 || sel("FLOWER_KONG") || sel("SEVEN_ROB_ONE") || sel("ALL_FLOWERS"))
  ) {
    return failure("CONFLICT", "PING_HU");
  }
  if (sel("PING_HU")) {
    for (const code of ["SEAT_WIND_PONG", "ROUND_WIND_PONG", "DRAGON_RED", "DRAGON_GREEN", "DRAGON_WHITE"]) {
      if (sel(code)) return failure("CONFLICT", code);
    }
    if (numbers.kongCount >= 1) return failure("CONFLICT", "kongCount");
  }
  if (sel("FIVE_SUITED")) {
    for (const code of ["ALL_HONORS", "FULL_FLUSH", "HALF_FLUSH"]) {
      if (sel(code)) return failure("CONFLICT", "FIVE_SUITED");
    }
  }
  if (sel("HEAVENLY_LISTEN") && sel("EARTHLY_LISTEN")) return failure("CONFLICT", "EARTHLY_LISTEN");

  // Interaction processing E1–E8, in pinned order.
  const taiOf = (code) => (code in overrideTai ? overrideTai[code] : DEFAULT_TAI[code]);
  const excluded = [];
  const excludedSet = new Set();
  const exclude = (code, reason) => {
    excluded.push({ code, reason });
    excludedSet.add(code);
  };

  // E1 / E2 — flushes.
  if (sel("ALL_HONORS")) {
    if (sel("HALF_FLUSH")) exclude("HALF_FLUSH", "SUPERSEDED");
    if (sel("FULL_FLUSH")) exclude("FULL_FLUSH", "SUPERSEDED");
    if (sel("ALL_PUNGS")) exclude("ALL_PUNGS", "SUBSUMED");
  } else if (sel("FULL_FLUSH")) {
    if (sel("HALF_FLUSH")) exclude("HALF_FLUSH", "SUPERSEDED");
  }
  // E3 / E4 — dragons.
  if (sel("BIG_DRAGONS")) {
    for (const code of ["DRAGON_RED", "DRAGON_GREEN", "DRAGON_WHITE"]) {
      if (sel(code)) exclude(code, "SUBSUMED");
    }
    if (sel("SMALL_DRAGONS")) exclude("SMALL_DRAGONS", "SUPERSEDED");
  } else if (sel("SMALL_DRAGONS")) {
    for (const code of ["DRAGON_RED", "DRAGON_GREEN", "DRAGON_WHITE"]) {
      if (sel(code)) exclude(code, "SUBSUMED");
    }
  }
  // E5 / E6 — flower sets.
  if (sel("ALL_FLOWERS")) {
    if (numbers.honorFlowers > 0) exclude("HONOR_FLOWERS", "FLOWERS_SUBSUMED");
    if (sel("FLOWER_KONG")) exclude("FLOWER_KONG", "SUBSUMED");
    if (sel("SEVEN_ROB_ONE")) exclude("SEVEN_ROB_ONE", "SUPERSEDED");
  } else if (sel("SEVEN_ROB_ONE")) {
    if (numbers.honorFlowers > 0) exclude("HONOR_FLOWERS", "FLOWERS_SUBSUMED");
    if (sel("FLOWER_KONG")) exclude("FLOWER_KONG", "SUBSUMED");
  }
  // E7 — win-method mismatches.
  const selfDraw = values.winMethod === "self-draw";
  if (!selfDraw) {
    if (sel("LAST_TILE_SELF")) exclude("LAST_TILE_SELF", "METHOD_MISMATCH");
    if (sel("KONG_WIN")) exclude("KONG_WIN", "METHOD_MISMATCH");
  } else {
    if (sel("LAST_TILE_DISCARD")) exclude("LAST_TILE_DISCARD", "METHOD_MISMATCH");
    if (sel("ROB_KONG")) exclude("ROB_KONG", "METHOD_MISMATCH");
    if (sel("SEVEN_ROB_ONE") && !excludedSet.has("SEVEN_ROB_ONE")) {
      exclude("SEVEN_ROB_ONE", "METHOD_MISMATCH");
    }
  }

  // Scoring lines in the fixed display order. E8 is applied where
  // MENQING_SELF_DRAW / MENQING / SELF_DRAW sit in that order.
  const menqing = sel("MENQING");
  let dealerTai = 0;
  if (values.winnerIsDealer) {
    dealerTai = 1 + numbers.dealerStreak;
  } else if (!selfDraw && values.discarderIsDealer) {
    dealerTai = 1 + numbers.dealerStreak;
  }

  const lines = [];
  for (const code of LINE_ORDER) {
    if (code === "MENQING_SELF_DRAW") {
      if (menqing && selfDraw) lines.push({ code, tai: DEFAULT_TAI.MENQING_SELF_DRAW });
      continue;
    }
    if (code === "MENQING") {
      if (menqing && !selfDraw) lines.push({ code, tai: DEFAULT_TAI.MENQING });
      continue;
    }
    if (code === "SELF_DRAW") {
      if (selfDraw && !menqing) lines.push({ code, tai: DEFAULT_TAI.SELF_DRAW });
      continue;
    }
    if (code === "HONOR_FLOWERS") {
      if (numbers.honorFlowers > 0 && !excludedSet.has("HONOR_FLOWERS")) {
        const tai = numbers.honorFlowers * taiOf("HONOR_FLOWER_EACH");
        if (tai > 0) lines.push({ code, count: numbers.honorFlowers, tai });
      }
      continue;
    }
    if (code === "THREE_KONGS") {
      if (numbers.kongCount === 3) {
        const tai = taiOf("THREE_KONGS");
        if (tai > 0) lines.push({ code, tai });
      }
      continue;
    }
    if (code === "FOUR_KONGS") {
      if (numbers.kongCount === 4) {
        const tai = taiOf("FOUR_KONGS");
        if (tai > 0) lines.push({ code, tai });
      }
      continue;
    }
    if (code === "DEALER") {
      if (dealerTai > 0) lines.push({ code, tai: dealerTai });
      continue;
    }
    if (sel(code) && !excludedSet.has(code)) {
      const tai = taiOf(code);
      if (tai > 0) lines.push({ code, tai });
    }
  }

  const handTai = lines.reduce((sum, line) => (line.code === "DEALER" ? sum : sum + line.tai), 0);
  const totalTai = handTai + dealerTai;
  let paidTai = totalTai;
  let capped = false;
  if (values.cap !== "none") {
    paidTai = Math.min(totalTai, Number(values.cap));
    capped = paidTai < totalTai;
  }
  const unitAmount = numbers.base + paidTai * numbers.perTai;
  const payout = selfDraw
    ? { winMethod: "self-draw", unitAmount, fromEachOpponent: unitAmount, totalReceived: 3 * unitAmount }
    : { winMethod: "discard", unitAmount, fromDiscarder: unitAmount, totalReceived: unitAmount };

  const result = {
    lines,
    excluded,
    flowers: { honor: numbers.honorFlowers, off: numbers.offFlowers },
    kongs: numbers.kongCount,
    handTai,
    dealerTai,
    totalTai,
    paidTai,
    capped,
    payout,
  };
  return { ok: true, result };
}

// Canonical report serialization: compact JSON, object own keys
// sorted ascending by UTF-16 code units recursively, array order
// unchanged, exactly one trailing LF. Built by hand so no input
// toJSON is ever invoked (the result graph is core-built data).
function serializeValue(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${serializeValue(value[key])}`).join(",")}}`;
}

export function serializeReport(result) {
  return `${serializeValue(result)}\n`;
}

export function buildReport(result) {
  const text = serializeReport(result);
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
