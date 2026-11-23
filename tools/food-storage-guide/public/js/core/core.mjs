// Food Storage Guide — pure core.
//
// Implements the fixed contract of SPEC.md (spec-food-storage-guide-20261121):
// 30 pinned items x pantry/fridge/freezer, USDA FoodKeeper literal values
// (week = 7 days, month = 30 days, year = 365 days; ranges recorded as
// written, never averaged). Safe-until is always the range minimum
// (conservative); the maximum is the quality limit. Status: remaining < 0
// expired, 0-2 use-soon, >= 3 fresh. Milk in the fridge follows the package
// use-by date (PKG) instead of a day count.
//
// No DOM, network, storage, or environment access except the device clock
// for the omitted-todayDate default, which the SPEC requires. All date math
// is integer UTC calendar days; no floating point, no timezone conversion.

export const REPORT_FILENAME = 'food-storage-guide-report.json';
export const REPORT_LIMIT_BYTES = 2097152; // 2 MiB

export const DEFAULT_DRAFT = Object.freeze({
  item: 'eggs-in-shell',
  location: 'fridge',
  opened: false,
  startDate: '',
  todayDate: '',
});

export const PACKAGE_NOTE = '依包裝上的使用期限 / Follow the use-by date on the package.';

// Cell values: null = FoodKeeper has no data for this combination
// (NOT_APPLICABLE); 'PKG' = follow the package use-by date; 'NR' = FoodKeeper
// explicitly does not recommend it (NOT_RECOMMENDED); {min, max} = day range.
// An {unopened, opened} cell splits by the opened flag; anything else is
// shared between opened and unopened.
export const ITEMS = Object.freeze([
  { id: 'milk', zh: '牛奶', en: 'Milk', group: 'dairy', fk: 27, pantry: null, fridge: 'PKG', freezer: { min: 90, max: 90 } },
  { id: 'butter', zh: '奶油', en: 'Butter', group: 'dairy', fk: 1, pantry: null, fridge: { min: 30, max: 60 }, freezer: { min: 180, max: 270 } },
  { id: 'hard-cheese', zh: '硬質起司', en: 'Hard cheese', group: 'dairy', fk: 3, pantry: null, fridge: { unopened: { min: 180, max: 180 }, opened: { min: 21, max: 28 } }, freezer: { min: 180, max: 180 } },
  { id: 'soft-cheese', zh: '軟質起司', en: 'Soft cheese', group: 'dairy', fk: 7, pantry: null, fridge: { min: 7, max: 14 }, freezer: { min: 180, max: 180 } },
  { id: 'yogurt', zh: '優格', en: 'Yogurt', group: 'dairy', fk: 33, pantry: null, fridge: { min: 7, max: 14 }, freezer: { min: 30, max: 60 } },
  { id: 'eggs-in-shell', zh: '帶殼生雞蛋', en: 'Eggs in shell', group: 'dairy', fk: 21, pantry: null, fridge: { min: 21, max: 35 }, freezer: 'NR' },
  { id: 'hard-boiled-eggs', zh: '水煮蛋', en: 'Hard-boiled eggs', group: 'dairy', fk: 23, pantry: null, fridge: { min: 7, max: 7 }, freezer: 'NR' },
  { id: 'beef-steaks', zh: '牛排', en: 'Beef steaks', group: 'meat', fk: 40, pantry: null, fridge: { min: 3, max: 5 }, freezer: { min: 120, max: 365 } },
  { id: 'ground-beef', zh: '絞肉（牛）', en: 'Ground beef', group: 'meat', fk: 43, pantry: null, fridge: { min: 1, max: 2 }, freezer: { min: 90, max: 120 } },
  { id: 'pork-chops', zh: '豬排', en: 'Pork chops', group: 'meat', fk: 63, pantry: null, fridge: { min: 3, max: 5 }, freezer: { min: 120, max: 365 } },
  { id: 'whole-chicken', zh: '全雞', en: 'Whole chicken', group: 'meat', fk: 113, pantry: null, fridge: { min: 1, max: 2 }, freezer: { min: 365, max: 365 } },
  { id: 'chicken-breast', zh: '雞胸肉', en: 'Chicken breast', group: 'meat', fk: 117, pantry: null, fridge: { min: 1, max: 2 }, freezer: { min: 270, max: 270 } },
  { id: 'bacon', zh: '培根', en: 'Bacon', group: 'meat', fk: 79, pantry: null, fridge: { min: 7, max: 7 }, freezer: { min: 30, max: 30 } },
  { id: 'hot-dogs', zh: '熱狗', en: 'Hot dogs', group: 'meat', fk: 98, pantry: null, fridge: { unopened: { min: 14, max: 14 }, opened: { min: 7, max: 7 } }, freezer: { min: 30, max: 60 } },
  { id: 'rotisserie-chicken', zh: '烤雞（熟）', en: 'Rotisserie chicken', group: 'meat', fk: 141, pantry: null, fridge: { min: 3, max: 4 }, freezer: { min: 120, max: 120 } },
  { id: 'lean-fish', zh: '白肉魚', en: 'Lean fish', group: 'seafood', fk: 144, pantry: null, fridge: { min: 1, max: 2 }, freezer: { min: 180, max: 240 } },
  { id: 'fatty-fish', zh: '油脂魚', en: 'Fatty fish', group: 'seafood', fk: 146, pantry: null, fridge: { min: 1, max: 2 }, freezer: { min: 60, max: 90 } },
  { id: 'shrimp', zh: '蝦', en: 'Shrimp', group: 'seafood', fk: 151, pantry: null, fridge: { min: 1, max: 3 }, freezer: { min: 180, max: 540 } },
  { id: 'apples', zh: '蘋果', en: 'Apples', group: 'fruit', fk: 248, pantry: { min: 21, max: 21 }, fridge: { min: 28, max: 42 }, freezer: { min: 240, max: 240 } },
  { id: 'bananas', zh: '香蕉', en: 'Bananas', group: 'fruit', fk: 251, pantry: null, fridge: { min: 3, max: 3 }, freezer: { min: 60, max: 90 } },
  { id: 'blueberries', zh: '藍莓', en: 'Blueberries', group: 'fruit', fk: 254, pantry: null, fridge: { min: 7, max: 14 }, freezer: { min: 240, max: 365 } },
  { id: 'broccoli', zh: '花椰菜', en: 'Broccoli', group: 'vegetable', fk: 276, pantry: null, fridge: { min: 3, max: 5 }, freezer: { min: 300, max: 365 } },
  { id: 'carrots', zh: '胡蘿蔔', en: 'Carrots', group: 'vegetable', fk: 279, pantry: null, fridge: { min: 14, max: 21 }, freezer: { min: 300, max: 365 } },
  { id: 'onions', zh: '洋蔥', en: 'Onions', group: 'vegetable', fk: 294, pantry: { min: 30, max: 30 }, fridge: { min: 60, max: 60 }, freezer: { min: 300, max: 365 } },
  { id: 'potatoes', zh: '馬鈴薯', en: 'Potatoes', group: 'vegetable', fk: 297, pantry: { min: 30, max: 60 }, fridge: { min: 7, max: 14 }, freezer: { min: 300, max: 365 } },
  { id: 'bread', zh: '麵包', en: 'Bread', group: 'pantry', fk: 195, pantry: { min: 14, max: 18 }, fridge: { unopened: null, opened: { min: 14, max: 21 } }, freezer: { min: 90, max: 150 } },
  { id: 'white-rice', zh: '白米', en: 'White rice', group: 'pantry', fk: 338, pantry: { unopened: { min: 730, max: 730 }, opened: { min: 365, max: 365 } }, fridge: { unopened: null, opened: { min: 180, max: 180 } }, freezer: null },
  { id: 'canned-soup', zh: '罐頭湯', en: 'Canned soup', group: 'pantry', fk: 372, pantry: { min: 730, max: 1825 }, fridge: { unopened: null, opened: { min: 3, max: 4 } }, freezer: null },
  { id: 'leftovers-with-meat', zh: '剩菜（含肉）', en: 'Leftovers with meat', group: 'pantry', fk: 173, pantry: null, fridge: { min: 3, max: 4 }, freezer: { min: 60, max: 90 } },
  { id: 'ketchup', zh: '番茄醬', en: 'Ketchup', group: 'pantry', fk: 348, pantry: { min: 365, max: 365 }, fridge: { unopened: null, opened: { min: 180, max: 180 } }, freezer: null },
]);

const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
const LOCATIONS = ['pantry', 'fridge', 'freezer'];
const FIELDS = ['item', 'location', 'opened', 'startDate', 'todayDate', 'packageDate'];
const RAW_LIMIT = 64;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86400000;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

// Reads an own data property without invoking accessors. Returns
// { present: false } for missing keys and accessor properties.
function ownData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined || !('value' in descriptor)) return { present: false };
  return { present: true, value: descriptor.value };
}

function hasLoneSurrogate(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Resolves one table cell for the opened flag. Returns null (no data),
// 'PKG', 'NR', or { min, max }. Returns undefined for an unknown item or
// location; the caller validates those first.
export function cellFor(itemId, location, opened) {
  const item = ITEM_BY_ID.get(itemId);
  if (item === undefined || !LOCATIONS.includes(location)) return undefined;
  const cell = item[location];
  if (cell !== null && typeof cell === 'object' && ('unopened' in cell || 'opened' in cell)) {
    return opened === true ? cell.opened : cell.unopened;
  }
  return cell;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

// Device-local calendar date, YYYY-MM-DD. Used only when todayDate is
// omitted, as the SPEC requires.
export function localTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

// Validates one YYYY-MM-DD string field: capacity -> surrogate -> shape
// (DATE_FORMAT) -> real calendar date and year 2000-2100 (DATE_RANGE).
// Returns { ms } (UTC midnight) or { error }.
function dateField(input, field) {
  const slot = ownData(input, field);
  if (!slot.present || typeof slot.value !== 'string') return { error: failure('SCHEMA', field) };
  const raw = slot.value;
  if (raw.length > RAW_LIMIT) return { error: failure('INPUT_LIMIT', field) };
  if (hasLoneSurrogate(raw)) return { error: failure('UNICODE', field) };
  const match = DATE_PATTERN.exec(raw);
  if (match === null) return { error: failure('DATE_FORMAT', field) };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return { error: failure('DATE_RANGE', field) };
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return { error: failure('DATE_RANGE', field) };
  }
  return { ms };
}

function formatUtc(ms) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

// run(input) -> { ok: true, result } | { ok: false, error: { code, field, row } }
// Pure synchronous transform; never throws for malformed input.
// Validation follows the SPEC's pinned order: item, location, opened,
// startDate, todayDate, then the table lookup (PKG packageDate, then NR,
// then empty). Within a string field: capacity, then surrogate, then grammar.
export function run(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return failure('SCHEMA', null);
  }
  for (const key of Object.keys(input)) {
    if (!FIELDS.includes(key)) return failure('SCHEMA', key);
  }

  // 1. item / location / opened.
  const itemSlot = ownData(input, 'item');
  if (!itemSlot.present || typeof itemSlot.value !== 'string') return failure('SCHEMA', 'item');
  if (itemSlot.value.length > RAW_LIMIT) return failure('INPUT_LIMIT', 'item');
  if (hasLoneSurrogate(itemSlot.value)) return failure('UNICODE', 'item');
  if (!ITEM_BY_ID.has(itemSlot.value)) return failure('SCHEMA', 'item');
  const item = itemSlot.value;

  const locationSlot = ownData(input, 'location');
  if (!locationSlot.present || typeof locationSlot.value !== 'string') return failure('SCHEMA', 'location');
  if (locationSlot.value.length > RAW_LIMIT) return failure('INPUT_LIMIT', 'location');
  if (hasLoneSurrogate(locationSlot.value)) return failure('UNICODE', 'location');
  if (!LOCATIONS.includes(locationSlot.value)) return failure('SCHEMA', 'location');
  const location = locationSlot.value;

  const openedSlot = ownData(input, 'opened');
  let opened = false;
  if (openedSlot.present) {
    if (typeof openedSlot.value !== 'boolean') return failure('SCHEMA', 'opened');
    opened = openedSlot.value;
  }

  // 2. startDate, then todayDate when provided.
  const start = dateField(input, 'startDate');
  if (start.error) return start.error;
  let todayMs;
  if (ownData(input, 'todayDate').present) {
    const today = dateField(input, 'todayDate');
    if (today.error) return today.error;
    todayMs = today.ms;
  } else {
    const parts = localTodayDate().split('-').map(Number);
    todayMs = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  // 3-4. Table lookup.
  const cell = cellFor(item, location, opened);

  if (cell === 'PKG') {
    // packageDate is required here; an empty string counts as missing
    // (the UI shows this field only on the PKG path, empty = not provided).
    const packageSlot = ownData(input, 'packageDate');
    if (!packageSlot.present || packageSlot.value === '') {
      return failure('PACKAGE_DATE_REQUIRED', 'packageDate');
    }
    const packageDate = dateField(input, 'packageDate');
    if (packageDate.error) return packageDate.error;
    const safeUntil = formatUtc(packageDate.ms);
    const remainingDays = Math.round((packageDate.ms - todayMs) / DAY_MS);
    const status = remainingDays < 0 ? 'expired' : remainingDays <= 2 ? 'use-soon' : 'fresh';
    return {
      ok: true,
      result: {
        item,
        location,
        opened,
        startDate: formatUtc(start.ms),
        safeUntil,
        bestUntil: safeUntil,
        rangeDays: null,
        remainingDays,
        status,
        note: PACKAGE_NOTE,
      },
    };
  }

  if (cell === 'NR') return failure('NOT_RECOMMENDED', 'location');
  if (cell === null || cell === undefined) return failure('NOT_APPLICABLE', 'location');

  const safeMs = start.ms + cell.min * DAY_MS;
  const bestMs = start.ms + cell.max * DAY_MS;
  const remainingDays = Math.round((safeMs - todayMs) / DAY_MS);
  const status = remainingDays < 0 ? 'expired' : remainingDays <= 2 ? 'use-soon' : 'fresh';
  return {
    ok: true,
    result: {
      item,
      location,
      opened,
      startDate: formatUtc(start.ms),
      safeUntil: formatUtc(safeMs),
      bestUntil: formatUtc(bestMs),
      rangeDays: { min: cell.min, max: cell.max },
      remainingDays,
      status,
      note: null,
    },
  };
}

// Deterministic compact JSON: object own keys sorted ascending by UTF-16
// code units (recursively), array order preserved, strings escaped with the
// JSON literal rules. Never calls a value's toJSON and never reads accessors
// for serialization (own enumerable data only).
function serializeValue(value, out) {
  if (value === null) {
    out.push('null');
    return;
  }
  if (Array.isArray(value)) {
    out.push('[');
    for (let i = 0; i < value.length; i += 1) {
      if (i > 0) out.push(',');
      serializeValue(value[i], out);
    }
    out.push(']');
    return;
  }
  switch (typeof value) {
    case 'string':
      out.push(JSON.stringify(value));
      return;
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('non-finite number in report');
      out.push(JSON.stringify(value));
      return;
    case 'boolean':
      out.push(value ? 'true' : 'false');
      return;
    case 'object': {
      const keys = Object.keys(value).sort();
      out.push('{');
      let first = true;
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined || !('value' in descriptor)) {
          throw new TypeError('accessor property in report');
        }
        if (!first) out.push(',');
        first = false;
        out.push(JSON.stringify(key));
        out.push(':');
        serializeValue(descriptor.value, out);
      }
      out.push('}');
      return;
    }
    default:
      throw new TypeError('unsupported value in report');
  }
}

// serializeReport(result) -> { ok: true, text, bytes } | { ok: false, error }
// bytes is the UTF-8 (no BOM) encoding of text with exactly one trailing LF.
export function serializeReport(result) {
  const parts = [];
  try {
    serializeValue(result, parts);
  } catch {
    return failure('INTERNAL', null);
  }
  const text = parts.join('') + '\n';
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > REPORT_LIMIT_BYTES) return failure('OUTPUT_LIMIT', null);
  return { ok: true, text, bytes };
}
