// Pure core for the Cooking Measurement Converter.
// No DOM, network, or storage access. Implements the fixed contract in
// docs/specs/cooking-measurement-converter/SPEC.md
// (spec-cooking-measurement-converter-20261109, fixed at candidate commit
// 213af9991a1a2d0a07f9acfe3e173d57184d9dec):
//
// - Volume basis (pinned, FDA household measures, exact integers):
//   1 cup = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml. The exact US customary
//   values (236.588 / 14.787 / 4.929 ml) are deliberately NOT used.
// - Weight<->volume goes only through the one pinned density table below
//   (grams per cup, King Arthur Baking Ingredient Weight Chart, checked
//   2026-11-09; dry goods spooned & levelled, brown sugar packed). Honey
//   is 336 (the chart's 21 g/tbsp x 16), not the 340 of secondary tables;
//   water and milk stay at the chart's 227 even though 240 ml of water
//   weighs about 240 g — one source for the whole table wins.
// - The whole pipeline is exact BigInt rational arithmetic. The displayed
//   value is rounded half-up to 2 decimals exactly once, and the cup
//   fraction is computed from the UNROUNDED exact value.

export const FIELDS = ["amount", "fromUnit", "toUnit", "ingredient"];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = { amount: 12, fromUnit: 4, toUnit: 4, ingredient: 32 };

export const UNITS = ["ml", "tsp", "tbsp", "cup", "g"];

// Millilitres per volume unit, as exact BigInts (the pinned basis).
export const ML_PER_UNIT = { ml: 1n, tsp: 5n, tbsp: 15n, cup: 240n };

// The pinned density table: grams per cup, one source (King Arthur
// Baking Ingredient Weight Chart). Order is the SPEC table order and is
// also the order of the ingredient select and the printed table.
export const DENSITY = [
  { id: "water", zh: "水", en: "Water", gramsPerCup: 227 },
  { id: "all-purpose-flour", zh: "中筋麵粉", en: "All-Purpose Flour", gramsPerCup: 120 },
  { id: "granulated-sugar", zh: "細砂糖", en: "Granulated Sugar", gramsPerCup: 198 },
  { id: "brown-sugar", zh: "紅糖（壓實）", en: "Brown Sugar (packed)", gramsPerCup: 213 },
  { id: "powdered-sugar", zh: "糖粉", en: "Powdered Sugar", gramsPerCup: 113 },
  { id: "butter", zh: "奶油", en: "Butter", gramsPerCup: 227 },
  { id: "vegetable-oil", zh: "植物油", en: "Vegetable Oil", gramsPerCup: 198 },
  { id: "honey", zh: "蜂蜜", en: "Honey", gramsPerCup: 336 },
  { id: "cocoa-powder", zh: "可可粉（無糖）", en: "Cocoa Powder (unsweetened)", gramsPerCup: 84 },
  { id: "milk", zh: "牛奶", en: "Milk", gramsPerCup: 227 },
  { id: "long-grain-rice", zh: "長米（生）", en: "Long-Grain Rice (uncooked)", gramsPerCup: 198 },
  { id: "rolled-oats", zh: "燕麥片", en: "Rolled Oats", gramsPerCup: 89 },
];

const DENSITY_BY_ID = new Map(DENSITY.map((row) => [row.id, row.gramsPerCup]));
export const INGREDIENTS = [...DENSITY.map((row) => row.id), "none"];

export const DEFAULTS = {
  amount: "",
  fromUnit: "cup",
  toUnit: "g",
  ingredient: "all-purpose-flour",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  amount: "1",
  fromUnit: "cup",
  toUnit: "g",
  ingredient: "all-purpose-flour",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "cooking-measurement-report.json";

const AMOUNT_PATTERN = /^[0-9]+(\.[0-9]+)?$/;
const MAX_AMOUNT = 100000n;

function fail(code, field) {
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

// Schema gate: the input must be a plain object whose own properties are
// exactly the four fields, each an own data property (no accessors)
// holding a string. Anything else is SCHEMA with field/row null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
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

// Parse a grammar-valid amount string into an exact rational { n, d } of
// BigInts, d > 0. Leading zeros are allowed ("007" = 7).
function parseAmount(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return { n: BigInt(raw), d: 1n };
  const intPart = raw.slice(0, dot);
  const fracPart = raw.slice(dot + 1);
  const d = 10n ** BigInt(fracPart.length);
  return { n: BigInt(intPart) * d + BigInt(fracPart), d };
}

// Round the non-negative rational n/d half-up to an integer:
// floor((2n + d) / (2d)).
function roundHalfUp(n, d) {
  return (2n * n + d) / (2n * d);
}

function gcd(a, b) {
  let x = a;
  let y = b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

// The nearest-eighth fraction text for the exact value n/d, per SPEC:
// eighths = floor(value * 8 + 1/2); whole = eighths div 8, rem = eighths
// mod 8; rem 0 -> "whole"; whole 0 -> reduced "n/d"; else "whole n/d"
// with rem/8 reduced.
function fractionText(n, d) {
  const eighths = (16n * n + d) / (2n * d);
  const whole = eighths / 8n;
  const rem = eighths % 8n;
  if (rem === 0n) return whole.toString();
  const g = gcd(rem, 8n);
  const frac = `${rem / g}/${8n / g}`;
  return whole === 0n ? frac : `${whole} ${frac}`;
}

function runChecked(input) {
  const values = readSchema(input);
  if (values === null) return fail("SCHEMA", null);

  // Per-field validation in the fixed field order; the first failure
  // ends the whole run. Per field: INPUT_LIMIT, UNICODE, EMPTY, then
  // grammar/enum, then RANGE.
  for (const field of FIELDS) {
    const raw = values[field];
    if (raw.length > RAW_LIMITS[field]) return fail("INPUT_LIMIT", field);
    if (hasUnpairedSurrogate(raw)) return fail("UNICODE", field);
    if (raw === "") return fail("EMPTY", field);
    if (field === "amount") {
      if (!AMOUNT_PATTERN.test(raw)) return fail("DECIMAL_FORMAT", field);
      const amount = parseAmount(raw);
      if (amount.n <= 0n || amount.n > MAX_AMOUNT * amount.d) {
        return fail("RANGE", field);
      }
    } else if (field === "ingredient") {
      if (!INGREDIENTS.includes(raw)) return fail("ENUM", field);
    } else if (!UNITS.includes(raw)) {
      return fail("ENUM", field);
    }
  }

  const { fromUnit, toUnit, ingredient } = values;
  const fromIsG = fromUnit === "g";
  const toIsG = toUnit === "g";

  // Cross-field: exactly one side is grams (the other a volume unit) and
  // no ingredient chosen -> INGREDIENT_REQUIRED. g->g needs none.
  if (fromIsG !== toIsG && ingredient === "none") {
    return fail("INGREDIENT_REQUIRED", "ingredient");
  }

  const amount = parseAmount(values.amount);
  let n = amount.n;
  let d = amount.d;
  let usedIngredient = null;
  let usedGramsPerCup = null;

  if (fromIsG && toIsG) {
    // Identity: no table lookup.
  } else if (!fromIsG && !toIsG) {
    // Volume -> volume: value = amount * M(from) / M(to). No table lookup
    // even when an ingredient is selected.
    n *= ML_PER_UNIT[fromUnit];
    d *= ML_PER_UNIT[toUnit];
  } else if (!fromIsG && toIsG) {
    // Volume -> grams: value = amount * M(from) * D / 240.
    usedIngredient = ingredient;
    usedGramsPerCup = DENSITY_BY_ID.get(ingredient);
    n *= ML_PER_UNIT[fromUnit] * BigInt(usedGramsPerCup);
    d *= 240n;
  } else {
    // Grams -> volume: value = amount * 240 / (D * M(to)).
    usedIngredient = ingredient;
    usedGramsPerCup = DENSITY_BY_ID.get(ingredient);
    n *= 240n;
    d *= BigInt(usedGramsPerCup) * ML_PER_UNIT[toUnit];
  }

  // Round half-up to 2 decimals exactly once; outputs are bounded by the
  // input range and the table, so the scaled integer is always safe.
  const scaled = roundHalfUp(n * 100n, d);
  const value = Number(scaled) / 100;

  return {
    ok: true,
    result: {
      value,
      unit: toUnit,
      fractionText: toUnit === "cup" ? fractionText(n, d) : null,
      ingredient: usedIngredient,
      gramsPerCup: usedGramsPerCup,
    },
  };
}

export function run(input) {
  try {
    return runChecked(input);
  } catch {
    return fail("INTERNAL", null);
  }
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit the
// result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
