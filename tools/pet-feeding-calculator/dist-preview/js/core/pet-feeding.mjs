// Pure core for the Pet Feeding Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md
// (spec-pet-feeding-calculator-20261109):
// RER = 70 x weight(kg)^0.75, DER = RER x life-stage multiplier, then
// grams per day from the food energy density and an integer per-meal
// split. All arithmetic is IEEE-754 double precision in the SPEC's
// pinned operation order, with rounding applied exactly where the SPEC
// pins it and nowhere else.

export const FIELDS = [
  "species",
  "lifeStage",
  "weightKg",
  "foodKcalPer100g",
  "foodKcalPerCup",
  "mealsPerDay",
];

// Maximum raw length per field, in UTF-16 code units (SPEC
// inputsOutputs). lifeStage is pinned at 32: its longest legal value,
// "puppy-4-months-to-adult", is 23 units, above the 8-unit convention
// of the numeric fields.
export const RAW_LIMITS = {
  species: 8,
  lifeStage: 32,
  weightKg: 8,
  foodKcalPer100g: 8,
  foodKcalPerCup: 8,
  mealsPerDay: 8,
};

export const DEFAULTS = {
  species: "dog",
  lifeStage: "adult-neutered",
  weightKg: "10",
  foodKcalPer100g: "360",
  foodKcalPerCup: "",
  mealsPerDay: "2",
};

// The example draft; identical to the default draft by design and to
// the dog-neutered-default fixture input (the first fixture case).
export const EXAMPLE = {
  species: "dog",
  lifeStage: "adult-neutered",
  weightKg: "10",
  foodKcalPer100g: "360",
  foodKcalPerCup: "",
  mealsPerDay: "2",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "pet-feeding-report.json";

// Life-stage multiplier table (SPEC inputsOutputs). Pinned literal
// data; source: MSD Veterinary Manual table "Daily Maintenance Energy
// Requirements for Dogs and Cats", verified 2026-11-09, cross-checked
// against OSU VMC, Pet Nutrition Alliance, and Small Animal Clinical
// Nutrition 5th ed. (see AUTHOR-CHECK.md). The cat weight-loss value
// is 0.8 (the concept note's 1.0 holds for dogs only); rows that the
// sources give only as ranges (weight gain, gestation, lactation,
// working, senior) are omitted, not invented.
export const MULTIPLIERS = {
  dog: {
    "puppy-under-4-months": 3.0,
    "puppy-4-months-to-adult": 2.0,
    "adult-intact": 1.8,
    "adult-neutered": 1.6,
    "adult-inactive": 1.4,
    "weight-loss": 1.0,
  },
  cat: {
    kitten: 2.5,
    "adult-intact": 1.4,
    "adult-neutered": 1.2,
    "adult-inactive": 1.0,
    "weight-loss": 0.8,
  },
};

export const LIFE_STAGE_LABELS = {
  dog: {
    "puppy-under-4-months": { zh: "幼犬（4 個月以下）", en: "Puppy (under 4 months)" },
    "puppy-4-months-to-adult": { zh: "幼犬（4 個月至成犬）", en: "Puppy (4 months to adult)" },
    "adult-intact": { zh: "成犬・未絕育", en: "Adult dog, intact" },
    "adult-neutered": { zh: "成犬・已絕育", en: "Adult dog, neutered" },
    "adult-inactive": { zh: "成犬・活動量低或易胖", en: "Adult dog, inactive or obesity-prone" },
    "weight-loss": { zh: "減重（以理想體重計）", en: "Weight loss (at ideal weight)" },
  },
  cat: {
    kitten: { zh: "幼貓", en: "Kitten" },
    "adult-intact": { zh: "成貓・未絕育", en: "Adult cat, intact" },
    "adult-neutered": { zh: "成貓・已絕育", en: "Adult cat, neutered" },
    "adult-inactive": { zh: "成貓・活動量低或易胖", en: "Adult cat, inactive or obesity-prone" },
    "weight-loss": { zh: "減重（以理想體重計）", en: "Weight loss (at ideal weight)" },
  },
};

export function lifeStageLabel(species, lifeStage, lang) {
  const entry = LIFE_STAGE_LABELS[species]?.[lifeStage];
  if (entry === undefined) return lifeStage;
  return entry[lang === "en" ? "en" : "zh"];
}

export const SPECIES_LABELS = {
  dog: { zh: "狗", en: "Dog" },
  cat: { zh: "貓", en: "Cat" },
};

// Pinned status announcements (SPEC userFlow; the dirty, busy and
// cancelled wordings are verbatim from the SPEC).
export const STATUS_TEXT = {
  empty: { zh: "尚未計算，請輸入資料或載入範例", en: "Not calculated yet — enter the details or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check your input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

export const WEIGHT_MIN = 0.5;
export const WEIGHT_MAX = { dog: 100, cat: 20 };
export const DENSITY_MIN = 20;
export const DENSITY_MAX = 900;
export const CUP_MIN = 50;
export const CUP_MAX = 1500;
export const MEALS_MIN = 1;
export const MEALS_MAX = 6;

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

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

// Schema gate only: the input must be a non-null, non-array plain
// object whose own enumerable properties are exactly the six fields,
// each an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the six string values, or null.
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

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate a required decimal field: EMPTY, then DECIMAL_FORMAT, then
// RANGE. The grammar guarantees Number() parses the value exactly as
// written.
function parseRequiredDecimal(raw, field, min, max) {
  if (raw === "") return fieldError("EMPTY", field);
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const value = Number(raw);
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order species, lifeStage, weightKg, foodKcalPer100g, foodKcalPerCup,
// mealsPerDay; within each field INPUT_LIMIT, UNICODE, EMPTY, grammar,
// RANGE. The first error wins. foodKcalPerCup is optional: an empty
// string skips its EMPTY / grammar / range checks (capacity and
// UNICODE still apply). lifeStage's ENUM members are the validated
// species' set, so a stage belonging only to the other species is
// ENUM on lifeStage.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("species", values.species);
  if (failure !== null) return failure;
  if (values.species === "") return fieldError("EMPTY", "species");
  if (values.species !== "dog" && values.species !== "cat") {
    return fieldError("ENUM", "species");
  }
  const species = values.species;
  const stages = MULTIPLIERS[species];

  failure = checkCapacityAndUnicode("lifeStage", values.lifeStage);
  if (failure !== null) return failure;
  if (values.lifeStage === "") return fieldError("EMPTY", "lifeStage");
  if (!Object.hasOwn(stages, values.lifeStage)) {
    return fieldError("ENUM", "lifeStage");
  }
  const lifeStage = values.lifeStage;

  failure = checkCapacityAndUnicode("weightKg", values.weightKg);
  if (failure !== null) return failure;
  const weight = parseRequiredDecimal(
    values.weightKg,
    "weightKg",
    WEIGHT_MIN,
    WEIGHT_MAX[species],
  );
  if (!weight.ok) return weight;

  failure = checkCapacityAndUnicode("foodKcalPer100g", values.foodKcalPer100g);
  if (failure !== null) return failure;
  const density = parseRequiredDecimal(
    values.foodKcalPer100g,
    "foodKcalPer100g",
    DENSITY_MIN,
    DENSITY_MAX,
  );
  if (!density.ok) return density;

  failure = checkCapacityAndUnicode("foodKcalPerCup", values.foodKcalPerCup);
  if (failure !== null) return failure;
  let cupDensity = null;
  if (values.foodKcalPerCup !== "") {
    const parsed = parseRequiredDecimal(
      values.foodKcalPerCup,
      "foodKcalPerCup",
      CUP_MIN,
      CUP_MAX,
    );
    if (!parsed.ok) return parsed;
    cupDensity = parsed.value;
  }

  failure = checkCapacityAndUnicode("mealsPerDay", values.mealsPerDay);
  if (failure !== null) return failure;
  if (values.mealsPerDay === "") return fieldError("EMPTY", "mealsPerDay");
  if (!INTEGER_PATTERN.test(values.mealsPerDay)) {
    return fieldError("INTEGER_FORMAT", "mealsPerDay");
  }
  const meals = Number(values.mealsPerDay);
  if (meals < MEALS_MIN || meals > MEALS_MAX) {
    return fieldError("RANGE", "mealsPerDay");
  }

  return {
    ok: true,
    values: {
      species,
      lifeStage,
      multiplier: stages[lifeStage],
      weightKg: weight.value,
      foodKcalPer100g: density.value,
      foodKcalPerCup: cupDensity,
      mealsPerDay: meals,
    },
  };
}

// Integer split: total T over n meals; base = floor(T / n),
// r = T - base * n; the first r meals get base + 1, the rest base.
// The per-meal integers always sum to T (SPEC step 6).
function splitInteger(total, count) {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(i < remainder ? base + 1 : base);
  return out;
}

// Round half up to an integer (SPEC steps 3-4: floor(raw + 0.5); all
// quantities are non-negative, so this is round-half-up).
function roundHalfUpInt(raw) {
  return Math.floor(raw + 0.5);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { species, lifeStage, multiplier, weightKg, foodKcalPer100g, foodKcalPerCup, mealsPerDay } =
    validated.values;

  // Pinned operation order (SPEC inputsOutputs, steps 1-6): pow first,
  // then multiply by 70; DER from the unrounded RER; grams from the
  // ROUNDED derKcal (multiply by 100, then divide by the density).
  const rerRaw = 70 * Math.pow(weightKg, 0.75);
  const derRaw = rerRaw * multiplier;
  const rerKcal = roundHalfUpInt(rerRaw);
  const derKcal = roundHalfUpInt(derRaw);
  const gramsRaw = (derKcal * 100) / foodKcalPer100g;
  const gramsPerDay = roundHalfUpInt(gramsRaw);

  let cupsPerDay = null;
  let perMealCups = null;
  if (foodKcalPerCup !== null) {
    const cupsRaw = derKcal / foodKcalPerCup;
    cupsPerDay = Math.floor(cupsRaw * 100 + 0.5) / 100;
    // Per-meal cups are rounded independently from cupsRaw / meals;
    // every meal gets the same value, and the displayed per-meal cups
    // may sum to up to 0.01 per meal away from cupsPerDay (pinned
    // behaviour; the page says so).
    const perMeal = Math.floor((cupsRaw / mealsPerDay) * 100 + 0.5) / 100;
    perMealCups = Array.from({ length: mealsPerDay }, () => perMeal);
  }

  const result = {
    species,
    lifeStage,
    multiplier,
    rerKcal,
    derKcal,
    gramsPerDay,
    cupsPerDay,
    mealsPerDay,
    perMealKcal: splitInteger(derKcal, mealsPerDay),
    perMealGrams: splitInteger(gramsPerDay, mealsPerDay),
    perMealCups,
  };

  // Report cap backstop (SPEC inputsOutputs): a result over the cap is
  // an OUTPUT_LIMIT error instead of a success. With the pinned ranges
  // a real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Cup display: exactly two decimal places (the value already carries
// two decimals of precision; toFixed only renders it).
export function formatCups(cups) {
  return cups.toFixed(2);
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
