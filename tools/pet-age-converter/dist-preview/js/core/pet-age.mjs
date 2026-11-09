// Pure core for the Pet Age Converter: strict validation of the age
// draft and the pinned piecewise conversion model from the SPEC
// (spec-pet-age-converter-20261109). No DOM, network, or storage
// access; tests import this module directly.
//
// Model (pinned by the SPEC; months are the segment unit):
// - Segment 1, months 0-12: 15 human years per year.
// - Segment 2, months 12-24: 9 human years per year.
// - Segment 3, months past 24: r human years per year, where r is 4
//   for cats and 4/5/6/7 for small/medium/large/giant dogs.
// - All arithmetic is exact integer arithmetic in twelfths of a human
//   year: N12 = 15*min(m,12) + 9*clamp(m-12,0,12) + r*max(m-24,0).
//   Display values round half-up to one decimal with the integer
//   formula t = floor((10*N12part + 6) / 12), display = t / 10, each
//   segment rounded independently. The life stage compares the exact
//   N12 against 12 * the pinned thresholds, never the display value.

export const MAX_STRING_UNITS = 8;
export const MAX_YEARS = 38;
export const MAX_MONTHS = 11;
export const MAX_TOTAL_MONTHS = { dog: 360, cat: 456 };
export const CAT_RATE = 4;

// Dog sizes in pinned order: third-segment rate per year, bilingual
// labels, life-stage thresholds T1/T2 (exact human years), and the
// fixed breed examples (display copy only, never used in computation).
export const SIZES = [
  {
    id: "small",
    rate: 4,
    t1: 65,
    t2: 85,
    label: { "zh-Hant": "小型", en: "Small" },
    breeds: { "zh-Hant": "貴賓犬、吉娃娃", en: "Poodle, Chihuahua" },
  },
  {
    id: "medium",
    rate: 5,
    t1: 55,
    t2: 75,
    label: { "zh-Hant": "中型", en: "Medium" },
    breeds: { "zh-Hant": "米格魯、邊境牧羊犬", en: "Beagle, Border Collie" },
  },
  {
    id: "large",
    rate: 6,
    t1: 45,
    t2: 65,
    label: { "zh-Hant": "大型", en: "Large" },
    breeds: { "zh-Hant": "黃金獵犬、德國牧羊犬", en: "Golden Retriever, German Shepherd" },
  },
  {
    id: "giant",
    rate: 7,
    t1: 38,
    t2: 55,
    label: { "zh-Hant": "巨型", en: "Giant" },
    breeds: { "zh-Hant": "大丹犬、聖伯納犬", en: "Great Dane, Saint Bernard" },
  },
];

const SIZE_BY_ID = new Map(SIZES.map((size) => [size.id, size]));

// Cat life-stage thresholds (exact human years).
export const CAT_THRESHOLDS = { t1: 55, t2: 75 };

// Life-stage labels by key. The first-stage key differs by species
// (puppy for dogs, kitten for cats); the rest are shared.
export const STAGE_LABELS = {
  puppy: { "zh-Hant": "幼犬", en: "Puppy" },
  kitten: { "zh-Hant": "幼貓", en: "Kitten" },
  young: { "zh-Hant": "青年", en: "Young adult" },
  adult: { "zh-Hant": "成年", en: "Adult" },
  mature: { "zh-Hant": "熟齡", en: "Mature" },
  senior: { "zh-Hant": "高齡", en: "Senior" },
};

export const FIELD_LABELS = {
  species: { "zh-Hant": "物種", en: "Species" },
  size: { "zh-Hant": "體型", en: "Size" },
  years: { "zh-Hant": "歲", en: "Years" },
  months: { "zh-Hant": "月", en: "Months" },
};

// Error message templates pinned verbatim by the SPEC; "{field}" is
// replaced with the localized field name (INPUT_LIMIT, UNICODE, SCHEMA
// and INTERNAL messages carry no field placeholder in the SPEC).
export const ERROR_MESSAGES = {
  EMPTY: { "zh-Hant": "{field}不可空白。", en: "{field} must not be empty." },
  INTEGER_FORMAT: { "zh-Hant": "{field}必須是整數。", en: "{field} must be a whole number." },
  RANGE: { "zh-Hant": "{field}超出允許範圍。", en: "{field} is out of range." },
  ENUM: { "zh-Hant": "{field}不是可用的選項。", en: "{field} is not an available option." },
  INPUT_LIMIT: { "zh-Hant": "輸入太長。", en: "Input is too long." },
  UNICODE: { "zh-Hant": "輸入包含無效字元。", en: "Input contains invalid characters." },
  SCHEMA: { "zh-Hant": "輸入格式不正確。", en: "Input is malformed." },
  INTERNAL: { "zh-Hant": "發生未預期的錯誤，請重試。", en: "Something went wrong. Please try again." },
};

export const STATUS_MESSAGES = {
  dirty: { "zh-Hant": "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { "zh-Hant": "處理中", en: "Working" },
  cancelled: { "zh-Hant": "已取消，可重新執行", en: "Cancelled. You can run again." },
};

// The SPEC reset value.
export const DEFAULT_DRAFT = { species: "dog", size: "medium", years: "", months: "" };

// The first literal fixture case (medium dog, 3 years 6 months),
// offered as the "load example" draft.
export const EXAMPLE_INPUT = { species: "dog", size: "medium", years: "3", months: "6" };

const FIELDS = ["species", "size", "years", "months"];
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
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

// One-decimal display value from an exact twelfths amount, using the
// SPEC's integer round-half-up formula.
function displayTenths(n12Part) {
  return Math.floor((10 * n12Part + 6) / 12) / 10;
}

function stageFor(n12, species, thresholds) {
  if (n12 < 180) {
    return species === "dog" ? "puppy" : "kitten";
  }
  if (n12 < 288) return "young";
  if (n12 < 12 * thresholds.t1) return "adult";
  if (n12 < 12 * thresholds.t2) return "mature";
  return "senior";
}

function convertChecked(input) {
  // Step 1: overall shape. A non-object input and unknown fields fail
  // with field null; a missing field, a non-string value, or an
  // accessor fails with that field's name (SPEC inputsOutputs step 1).
  if (!isPlainObject(input)) return failure("SCHEMA", null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !FIELDS.includes(key)) {
      return failure("SCHEMA", null);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      return failure("SCHEMA", key);
    }
  }
  const values = {};
  for (const field of FIELDS) {
    const read = readOwnData(input, field);
    if (!read.found) return failure("SCHEMA", field);
    if (typeof read.value !== "string") return failure("SCHEMA", field);
    values[field] = read.value;
  }

  // Step 2: per-field capacity and characters, in field order.
  for (const field of FIELDS) {
    const text = values[field];
    if (text.length > MAX_STRING_UNITS) return failure("INPUT_LIMIT", field);
    if (hasUnpairedSurrogate(text)) return failure("UNICODE", field);
  }

  // Step 3: per-field semantics, in field order.
  const species = values.species;
  if (species === "") return failure("EMPTY", "species");
  if (species !== "dog" && species !== "cat") return failure("ENUM", "species");

  const size = values.size;
  if (species === "dog") {
    if (size === "") return failure("EMPTY", "size");
    if (!SIZE_BY_ID.has(size)) return failure("ENUM", "size");
  } else if (size !== "") {
    return failure("ENUM", "size");
  }

  if (values.years === "") return failure("EMPTY", "years");
  if (!INTEGER_PATTERN.test(values.years)) return failure("INTEGER_FORMAT", "years");
  const years = Number(values.years);
  if (years > MAX_YEARS) return failure("RANGE", "years");

  if (values.months === "") return failure("EMPTY", "months");
  if (!INTEGER_PATTERN.test(values.months)) return failure("INTEGER_FORMAT", "months");
  const months = Number(values.months);
  if (months > MAX_MONTHS) return failure("RANGE", "months");

  // Step 4: cross-field total-months cap; the years field carries the
  // error because it is the primary magnitude field.
  const totalMonths = 12 * years + months;
  if (totalMonths > MAX_TOTAL_MONTHS[species]) return failure("RANGE", "years");

  // Piecewise model in exact twelfths.
  const sizeInfo = species === "dog" ? SIZE_BY_ID.get(size) : null;
  const rate = species === "cat" ? CAT_RATE : sizeInfo.rate;
  const thresholds = species === "cat" ? CAT_THRESHOLDS : sizeInfo;
  const seg1 = 15 * Math.min(totalMonths, 12);
  const seg2 = 9 * Math.min(Math.max(totalMonths - 12, 0), 12);
  const seg3 = rate * Math.max(totalMonths - 24, 0);
  const n12 = seg1 + seg2 + seg3;
  const stageKey = stageFor(n12, species, thresholds);
  const stageLabel = STAGE_LABELS[stageKey];

  return {
    ok: true,
    result: {
      species,
      size: species === "dog" ? size : null,
      totalMonths,
      humanYears: displayTenths(n12),
      stageKey,
      stageZh: stageLabel["zh-Hant"],
      stageEn: stageLabel.en,
      breakdown: {
        segment1: displayTenths(seg1),
        segment2: displayTenths(seg2),
        segment3: displayTenths(seg3),
      },
      laterRatePerYear: rate,
    },
  };
}

export function convert(input) {
  try {
    return convertChecked(input);
  } catch {
    return failure("INTERNAL", null);
  }
}

// Formats a one-decimal display number with exactly one decimal place
// (for example 15 -> "15.0"), as the SPEC pins for age displays.
export function formatYears(value) {
  return value.toFixed(1);
}

// Renders a pinned error message template in the given language,
// substituting the localized field label where the template carries a
// "{field}" placeholder.
export function errorMessage(error, lang) {
  const entry = ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.INTERNAL;
  const template = entry[lang] ?? entry.en;
  if (error.field !== null && Object.hasOwn(FIELD_LABELS, error.field)) {
    return template.replace("{field}", FIELD_LABELS[error.field][lang]);
  }
  return template;
}
