// Pure core for the Caffeine Half-Life Calculator: strict validation of
// the intake draft and the single-half-life exponential decay model from
// the SPEC (spec-caffeine-half-life-20261109). No DOM, network, or
// storage access; tests import this module directly.
//
// Model (single-day clock semantics, pinned by the SPEC):
// - Each entry contributes mg * 2^(-elapsed / halfLifeMin) from its
//   intake minute on; before its intake minute it contributes 0 and is
//   flagged notYet (no wrap to the previous day).
// - The series evaluates Q + 60k for k = 1..6; instants may pass 1439
//   and are flagged nextDay, displayed as X mod 1440.
// - Bedtime uses "tonight" semantics: instant = B >= Q ? B : B + 1440.
// - Every milligram output is a one-decimal string rounded once from the
//   unrounded double total: r = floor(x * 10 + 0.5) / 10.

export const MAX_ENTRIES = 8;
export const MAX_STRING_UNITS = 8;
export const MAX_MG = 1000;
export const MIN_HALF_LIFE_TENTHS = 30;
export const MAX_HALF_LIFE_TENTHS = 80;

// Fixed drink preset table (id, bilingual labels, caffeine mg), pinned
// by the SPEC.
export const PRESETS = [
  { id: "espresso", mg: 63, label: { "zh-Hant": "義式濃縮（30 ml）", en: "Espresso (30 ml)" } },
  { id: "brewed-coffee", mg: 95, label: { "zh-Hant": "濾泡咖啡（240 ml）", en: "Brewed coffee (240 ml)" } },
  { id: "black-tea", mg: 47, label: { "zh-Hant": "紅茶（240 ml）", en: "Black tea (240 ml)" } },
  { id: "green-tea", mg: 28, label: { "zh-Hant": "綠茶（240 ml）", en: "Green tea (240 ml)" } },
  { id: "cola", mg: 34, label: { "zh-Hant": "可樂（355 ml）", en: "Cola (355 ml)" } },
  { id: "energy-drink", mg: 80, label: { "zh-Hant": "能量飲料（250 ml）", en: "Energy drink (250 ml)" } },
];

const PRESET_MG = new Map(PRESETS.map((preset) => [preset.id, preset.mg]));

export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確", en: "The input shape is invalid." },
  INPUT_LIMIT: { "zh-Hant": "輸入太長", en: "An input is too long." },
  UNICODE: { "zh-Hant": "輸入含有不完整的字元", en: "An input contains an incomplete character." },
  EMPTY: { "zh-Hant": "此欄位必填", en: "This field is required." },
  ROW_LIMIT: { "zh-Hant": "最多 8 筆攝取紀錄", en: "At most 8 intake entries are allowed." },
  TIME_FORMAT: { "zh-Hant": "時間必須是 HH:MM（00:00–23:59）", en: "Time must be HH:MM (00:00-23:59)." },
  PRESET_UNKNOWN: { "zh-Hant": "未知的飲品預設", en: "Unknown drink preset." },
  CONFLICT: { "zh-Hant": "預設飲品與自訂毫克只能擇一", en: "Choose either a preset or a custom mg, not both." },
  INTEGER_FORMAT: { "zh-Hant": "毫克必須是整數", en: "Milligrams must be a whole number." },
  DECIMAL_FORMAT: {
    "zh-Hant": "半衰期必須是整數或一位小數",
    en: "Half-life must be a whole number or one decimal place.",
  },
  RANGE: { "zh-Hant": "數值超出允許範圍", en: "A value is out of range." },
  INTERNAL: { "zh-Hant": "處理失敗，請重試", en: "Something went wrong. Try again." },
};

export const STATUS_MESSAGES = {
  dirty: { "zh-Hant": "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { "zh-Hant": "處理中", en: "Working" },
  cancelled: { "zh-Hant": "已取消，可重新執行", en: "Cancelled. You can run again." },
};

export const DEFAULT_DRAFT = {
  entries: [{ time: "", preset: null, mg: "" }],
  halfLifeHours: "5",
  queryTime: "",
  bedtime: "",
};

// The first literal fixture case, offered as the "load example" draft.
export const EXAMPLE_INPUT = {
  entries: [{ time: "08:00", preset: null, mg: "100" }],
  halfLifeHours: "5",
  queryTime: "13:00",
  bedtime: "",
};

const TOP_LEVEL_KEYS = ["entries", "halfLifeHours", "queryTime", "bedtime"];
const ENTRY_KEYS = ["time", "preset", "mg"];
const TIME_PATTERN = /^[0-9]{2}:[0-9]{2}$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const HALF_LIFE_PATTERN = /^(0|[1-9][0-9]?)(\.[0-9])?$/;

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

// Reads an own data property without ever invoking a getter: returns
// { found, value } where found is false for missing keys and for
// accessor properties (both are schema violations for this contract).
function readOwnData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    return { found: false, value: undefined };
  }
  return { found: true, value: descriptor.value };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Exact key set, and every own property (string or symbol keyed) must be
// a data property — accessors anywhere are a schema violation.
function hasExactDataKeys(value, expectedKeys) {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expectedKeys.length) return false;
  for (const key of keys) {
    if (typeof key !== "string" || !expectedKeys.includes(key)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return false;
  }
  return true;
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Shared per-string pipeline: capacity, then unpaired surrogates, then
// the field-specific grammar step supplied by the caller.
function checkStringBasics(text) {
  if (text.length > MAX_STRING_UNITS) return "INPUT_LIMIT";
  if (hasUnpairedSurrogate(text)) return "UNICODE";
  return null;
}

function parseTimeMin(text) {
  if (!TIME_PATTERN.test(text)) return null;
  const hours = Number(text.slice(0, 2));
  const minutes = Number(text.slice(3, 5));
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Returns { timeMin } or { error } for a required time field.
function validateTimeField(text, field, row) {
  const basic = checkStringBasics(text);
  if (basic !== null) return { error: failure(basic, field, row) };
  if (text === "") return { error: failure("EMPTY", field, row) };
  const timeMin = parseTimeMin(text);
  if (timeMin === null) return { error: failure("TIME_FORMAT", field, row) };
  return { timeMin };
}

// Validates one entry in the SPEC's pinned order and returns its
// effective { timeMin, mg }, or the first failure.
function validateEntry(entry, row) {
  if (!isPlainObject(entry) || !hasExactDataKeys(entry, ENTRY_KEYS)) {
    return { error: failure("SCHEMA", "entries", row) };
  }
  const time = readOwnData(entry, "time").value;
  const preset = readOwnData(entry, "preset").value;
  const mg = readOwnData(entry, "mg").value;
  if (typeof time !== "string") return { error: failure("SCHEMA", "entries", row) };
  if (preset !== null && typeof preset !== "string") {
    return { error: failure("SCHEMA", "entries", row) };
  }
  if (mg !== null && typeof mg !== "string") {
    return { error: failure("SCHEMA", "entries", row) };
  }

  const timeCheck = validateTimeField(time, "entries", row);
  if (timeCheck.error) return timeCheck;

  if (preset !== null && !PRESET_MG.has(preset)) {
    return { error: failure("PRESET_UNKNOWN", "entries", row) };
  }
  if (preset !== null) {
    if (mg !== null) return { error: failure("CONFLICT", "entries", row) };
    return { timeMin: timeCheck.timeMin, mg: PRESET_MG.get(preset) };
  }

  if (mg === null) return { error: failure("EMPTY", "entries", row) };
  const basic = checkStringBasics(mg);
  if (basic !== null) return { error: failure(basic, "entries", row) };
  if (mg === "") return { error: failure("EMPTY", "entries", row) };
  if (!INTEGER_PATTERN.test(mg)) return { error: failure("INTEGER_FORMAT", "entries", row) };
  const mgValue = Number(mg);
  if (mgValue < 1 || mgValue > MAX_MG) return { error: failure("RANGE", "entries", row) };
  return { timeMin: timeCheck.timeMin, mg: mgValue };
}

function formatMg(value) {
  const rounded = Math.floor(value * 10 + 0.5) / 10;
  return rounded.toFixed(1);
}

function contribution(mg, intakeMin, halfLifeMin, atMin) {
  const elapsed = atMin - intakeMin;
  if (elapsed < 0) return 0;
  return mg * Math.pow(2, -elapsed / halfLifeMin);
}

function totalAt(entries, halfLifeMin, atMin) {
  let total = 0;
  for (const entry of entries) {
    total += contribution(entry.mg, entry.timeMin, halfLifeMin, atMin);
  }
  return total;
}

function runChecked(input) {
  // Step 1: overall shape.
  if (!isPlainObject(input)) return failure("SCHEMA", null, null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !TOP_LEVEL_KEYS.includes(key)) {
      return failure("SCHEMA", typeof key === "string" ? key : null, null);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      return failure("SCHEMA", key, null);
    }
  }
  for (const key of TOP_LEVEL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      return failure("SCHEMA", key, null);
    }
  }
  const entriesRaw = readOwnData(input, "entries").value;
  const halfLifeRaw = readOwnData(input, "halfLifeHours").value;
  const queryRaw = readOwnData(input, "queryTime").value;
  const bedtimeRaw = readOwnData(input, "bedtime").value;
  if (!Array.isArray(entriesRaw)) return failure("SCHEMA", "entries", null);
  if (typeof halfLifeRaw !== "string") return failure("SCHEMA", "halfLifeHours", null);
  if (typeof queryRaw !== "string") return failure("SCHEMA", "queryTime", null);
  if (typeof bedtimeRaw !== "string") return failure("SCHEMA", "bedtime", null);

  // Step 2: entry count.
  if (entriesRaw.length === 0) return failure("EMPTY", "entries", null);
  if (entriesRaw.length > MAX_ENTRIES) return failure("ROW_LIMIT", "entries", null);

  // Step 3: per-entry validation, in input order.
  const entries = [];
  for (let index = 0; index < entriesRaw.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(entriesRaw, String(index));
    if (descriptor === undefined || !("value" in descriptor)) {
      return failure("SCHEMA", "entries", index + 1);
    }
    const checked = validateEntry(descriptor.value, index + 1);
    if (checked.error) return checked.error;
    entries.push({ row: index + 1, timeMin: checked.timeMin, mg: checked.mg });
  }

  // Step 4: half-life.
  const halfBasic = checkStringBasics(halfLifeRaw);
  if (halfBasic !== null) return failure(halfBasic, "halfLifeHours", null);
  if (halfLifeRaw === "") return failure("EMPTY", "halfLifeHours", null);
  if (!HALF_LIFE_PATTERN.test(halfLifeRaw)) {
    return failure("DECIMAL_FORMAT", "halfLifeHours", null);
  }
  const dotIndex = halfLifeRaw.indexOf(".");
  const halfTenths =
    dotIndex === -1
      ? Number(halfLifeRaw) * 10
      : Number(halfLifeRaw.slice(0, dotIndex)) * 10 + Number(halfLifeRaw.slice(dotIndex + 1));
  if (halfTenths < MIN_HALF_LIFE_TENTHS || halfTenths > MAX_HALF_LIFE_TENTHS) {
    return failure("RANGE", "halfLifeHours", null);
  }
  const halfLifeMin = halfTenths * 6;

  // Step 5: query time (required).
  const queryCheck = validateTimeField(queryRaw, "queryTime", null);
  if (queryCheck.error) return queryCheck.error;
  const queryMin = queryCheck.timeMin;

  // Step 6: bedtime (optional).
  let bedtimeMin = null;
  if (bedtimeRaw !== "") {
    const bedBasic = checkStringBasics(bedtimeRaw);
    if (bedBasic !== null) return failure(bedBasic, "bedtime", null);
    bedtimeMin = parseTimeMin(bedtimeRaw);
    if (bedtimeMin === null) return failure("TIME_FORMAT", "bedtime", null);
  }

  // Decay model.
  const perEntry = entries.map((entry) => {
    const elapsed = queryMin - entry.timeMin;
    if (elapsed < 0) {
      return {
        row: entry.row,
        timeMin: entry.timeMin,
        mg: entry.mg,
        elapsedMin: null,
        remainingMg: "0.0",
      };
    }
    return {
      row: entry.row,
      timeMin: entry.timeMin,
      mg: entry.mg,
      elapsedMin: elapsed,
      remainingMg: formatMg(contribution(entry.mg, entry.timeMin, halfLifeMin, queryMin)),
    };
  });
  const notYetCount = perEntry.filter((entry) => entry.elapsedMin === null).length;

  const series = [];
  for (let k = 1; k <= 6; k += 1) {
    const instant = queryMin + 60 * k;
    series.push({
      offsetMin: 60 * k,
      timeMin: instant % 1440,
      nextDay: instant >= 1440,
      totalMg: formatMg(totalAt(entries, halfLifeMin, instant)),
    });
  }

  let atBedtime = null;
  if (bedtimeMin !== null) {
    const instant = bedtimeMin >= queryMin ? bedtimeMin : bedtimeMin + 1440;
    atBedtime = {
      timeMin: bedtimeMin,
      instantMin: instant,
      afterMidnight: instant >= 1440,
      minutesFromQuery: instant - queryMin,
      totalMg: formatMg(totalAt(entries, halfLifeMin, instant)),
    };
  }

  return {
    ok: true,
    result: {
      halfLifeMin,
      query: {
        timeMin: queryMin,
        totalMg: formatMg(totalAt(entries, halfLifeMin, queryMin)),
        notYetCount,
        perEntry,
      },
      series,
      atBedtime,
    },
  };
}

export function run(input) {
  try {
    return runChecked(input);
  } catch {
    return failure("INTERNAL", null, null);
  }
}

// Formats an integer minute-of-day as HH:MM for display.
export function formatClock(timeMin) {
  const hours = Math.floor(timeMin / 60);
  const minutes = timeMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
