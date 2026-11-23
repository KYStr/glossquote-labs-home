// Pure core for the Cocktail ABV Calculator
// (spec-cocktail-abv-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Pinned constants (SPEC implementation section):
// - Ethanol density 0.789 g/ml at 20 °C (OIML R 22 alcoholometric
//   table). Pure-alcohol grams = volume ml x ABV% / 100 x 0.789.
// - Taiwan 1 standard drink = 10 g pure alcohol (MOHW 2023-07-14
//   "每日飲酒酒精標準量": 1 unit = 10 g pure alcohol; men at most
//   2 units/day, women at most 1). Standard drinks = grams / 10.
// - Total ABV = sum(volume x ABV%) / total volume. Volumes are
//   summed additively; mixing contraction is NOT deducted (the
//   results area discloses this in fixed text).
// - Rounding is half-up (0.5 away from zero; all values here are
//   non-negative) to 1 decimal place, applied ONCE at output.
//   Totals are computed from the unrounded sums, never from rounded
//   per-row values.
//
// Exact decimal arithmetic: inputs carry at most 1 decimal place,
// so every quantity is an exact rational over integers. All
// arithmetic below uses BigInt, so no binary floating point ever
// takes part in a calculation. A value rounded half-up to 1 decimal
// is floor(value * 10 + 1/2) tenths, computed on exact integers.

export const MIN_ROWS = 2;
export const MAX_ROWS = 6;
export const MAX_RAW_UNITS = 8;
export const NAME_MAX_SCALARS = 40;
export const VOLUME_MIN_TENTHS = 1; // 0.1 ml
export const VOLUME_MAX_TENTHS = 20000; // 2000.0 ml
export const ABV_MIN_TENTHS = 0; // 0%
export const ABV_MAX_TENTHS = 1000; // 100%

// Ethanol density 0.789 g/ml = 789/1000.
export const DENSITY_NUM = 789n;
export const DENSITY_DEN = 1000n;
export const STANDARD_DRINK_GRAMS = 10;

export const DEFAULTS = {
  ingredients: [
    { volumeMl: "45", abvPct: "40" },
    { volumeMl: "30", abvPct: "0" },
  ],
};

// The worked example is fixtures.json case 1 (classic-margarita)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  ingredients: [
    { name: "龍舌蘭", volumeMl: "45", abvPct: "40" },
    { name: "橙酒", volumeMl: "15", abvPct: "40" },
    { name: "萊姆汁", volumeMl: "30", abvPct: "0" },
  ],
};

// Fixed MOHW guidance line, shown in the results area (information
// only, never a pass/fail judgement).
export const GUIDANCE_ZH =
  "衛福部建議：男性每日不超過 2 單位、女性不超過 1 單位（1 單位＝10 g 純酒精）；不喝最健康。";
export const GUIDANCE_EN =
  "MOHW guidance: no more than 2 units per day for men and 1 for women (1 unit = 10 g pure alcohol); not drinking is healthiest.";

// Fixed volume-contraction disclosure, shown in the results area.
export const CONTRACTION_ZH = "體積以加法合計，未扣除混合體積收縮。";
export const CONTRACTION_EN =
  "Volumes are summed additively; mixing contraction is not deducted.";

// Fixed disclaimer, shown verbatim in the results area.
export const DISCLAIMER_ZH =
  "本結果為估算值，僅供參考，不構成醫療或法律建議；不估算血液酒精濃度。";
export const DISCLAIMER_EN =
  "This result is an estimate for reference only and is not medical or legal advice; it does not estimate blood alcohol concentration.";

const ROW_FIELDS = ["name", "volumeMl", "abvPct"];
const DECIMAL_PATTERN = /^\d+(\.\d)?$/;

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

// Counts Unicode scalar values. A lone surrogate counts as one
// element under iteration, so it is counted here and rejected
// separately by the UNICODE check that follows the length check.
function scalarLength(value) {
  return [...value].length;
}

// Reads one ingredient row's own data properties without invoking
// accessors. Returns the raw string map, or an { error } outcome.
function readRow(rawRow, rowNumber) {
  if (!isPlainObject(rawRow)) {
    return { error: failure("SCHEMA", null, rowNumber) };
  }
  const keys = Object.keys(rawRow);
  for (const key of keys) {
    if (!ROW_FIELDS.includes(key)) {
      return { error: failure("SCHEMA", key, rowNumber) };
    }
  }
  const raw = {};
  for (const field of ["volumeMl", "abvPct"]) {
    if (!keys.includes(field)) {
      return { error: failure("SCHEMA", field, rowNumber) };
    }
  }
  for (const field of ROW_FIELDS) {
    if (!keys.includes(field)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(rawRow, field);
    if (descriptor === undefined || !("value" in descriptor)) {
      return { error: failure("SCHEMA", field, rowNumber) };
    }
    if (typeof descriptor.value !== "string") {
      return { error: failure("SCHEMA", field, rowNumber) };
    }
    raw[field] = descriptor.value;
  }
  return { raw };
}

// Parses an ASCII decimal string with at most 1 decimal place into
// integer tenths. Returns { tenths } (BigInt) or an { error }.
function parseTenths(field, value, minTenths, maxTenths, rowNumber) {
  if (value.length > MAX_RAW_UNITS) {
    return { error: failure("INPUT_LIMIT", field, rowNumber) };
  }
  if (value.length === 0) {
    return { error: failure("EMPTY", field, rowNumber) };
  }
  if (!DECIMAL_PATTERN.test(value)) {
    return { error: failure("NUMBER_FORMAT", field, rowNumber) };
  }
  const dot = value.indexOf(".");
  const tenths =
    dot === -1
      ? BigInt(value) * 10n
      : BigInt(value.slice(0, dot)) * 10n + BigInt(value.slice(dot + 1));
  if (tenths < BigInt(minTenths) || tenths > BigInt(maxTenths)) {
    return { error: failure("RANGE", field, rowNumber) };
  }
  return { tenths };
}

// Rounds an exact non-negative rational numerator/denominator
// half-up to 1 decimal place, returned as integer tenths:
// floor(value * 10 + 1/2) = floor((20n + d) / (2d)).
function roundTenths(numerator, denominator) {
  return (20n * numerator + denominator) / (2n * denominator);
}

function tenthsToNumber(tenths) {
  return Number(tenths) / 10;
}

export function run(input) {
  if (!isPlainObject(input)) return failure("SCHEMA", null, null);
  const keys = Object.keys(input);
  if (!keys.includes("ingredients")) return failure("SCHEMA", "ingredients", null);
  for (const key of keys) {
    if (key !== "ingredients") return failure("SCHEMA", key, null);
  }
  const ingredientsDescriptor = Object.getOwnPropertyDescriptor(input, "ingredients");
  if (ingredientsDescriptor === undefined || !("value" in ingredientsDescriptor)) {
    return failure("SCHEMA", "ingredients", null);
  }
  const ingredients = ingredientsDescriptor.value;
  if (!Array.isArray(ingredients)) return failure("SCHEMA", "ingredients", null);

  // SPEC order: shape first (every row), then row count, then
  // per-row value validation in row order.
  const rawRows = [];
  for (let index = 0; index < ingredients.length; index += 1) {
    // Read the element through its descriptor so an accessor (or a
    // hole) never gets invoked; it is a shape error instead.
    const descriptor = Object.getOwnPropertyDescriptor(ingredients, String(index));
    if (descriptor === undefined || !("value" in descriptor)) {
      return failure("SCHEMA", null, index + 1);
    }
    const outcome = readRow(descriptor.value, index + 1);
    if (outcome.error) return outcome.error;
    rawRows.push(outcome.raw);
  }

  if (ingredients.length < MIN_ROWS) return failure("ROW_COUNT", null, null);
  if (ingredients.length > MAX_ROWS) return failure("ROW_LIMIT", null, null);

  const parsed = [];
  for (let index = 0; index < rawRows.length; index += 1) {
    const rowNumber = index + 1;
    const raw = rawRows[index];

    let name = `材料 ${rowNumber}`;
    if (raw.name !== undefined && raw.name !== "") {
      if (scalarLength(raw.name) > NAME_MAX_SCALARS) {
        return failure("INPUT_LIMIT", "name", rowNumber);
      }
      if (hasLoneSurrogate(raw.name)) {
        return failure("UNICODE", "name", rowNumber);
      }
      name = raw.name;
    }

    const volume = parseTenths(
      "volumeMl",
      raw.volumeMl,
      VOLUME_MIN_TENTHS,
      VOLUME_MAX_TENTHS,
      rowNumber,
    );
    if (volume.error) return volume.error;
    const abv = parseTenths("abvPct", raw.abvPct, ABV_MIN_TENTHS, ABV_MAX_TENTHS, rowNumber);
    if (abv.error) return abv.error;

    parsed.push({ row: rowNumber, name, volumeTenths: volume.tenths, abvTenths: abv.tenths });
  }

  // Exact sums. Per row, alcoholMl = volumeMl x abvPct / 100, so
  // with V and A in tenths, V*A is the pure-alcohol volume in
  // 1/10000 ml units.
  let sumVolumeTenths = 0n;
  let sumVolumeAbv = 0n;
  const rows = parsed.map((entry) => {
    const va = entry.volumeTenths * entry.abvTenths;
    sumVolumeTenths += entry.volumeTenths;
    sumVolumeAbv += va;
    return {
      row: entry.row,
      name: entry.name,
      volumeMl: tenthsToNumber(entry.volumeTenths),
      abvPct: tenthsToNumber(entry.abvTenths),
      // alcoholMl: VA/10000 ml -> tenths = floor((VA + 500) / 1000).
      alcoholMl: tenthsToNumber((va + 500n) / 1000n),
      // alcoholG: VA x 789 / 10^7 g -> tenths.
      alcoholG: tenthsToNumber((va * DENSITY_NUM + 500000n) / 1000000n),
    };
  });

  // Totals from the unrounded sums, never from rounded rows.
  // totalVolumeMl is the exact sum of 1-decimal inputs.
  // totalAlcoholMl: sumVA/10000 ml -> tenths.
  // totalAlcoholG: sumVA x 789 / 10^7 g -> tenths.
  // totalAbvPct: sumVA / (10 x sumVolumeTenths) percent -> tenths,
  //   half-up via roundTenths.
  // standardDrinks: totalAlcoholG / 10 -> tenths.
  const result = {
    rows,
    totalVolumeMl: tenthsToNumber(sumVolumeTenths),
    totalAlcoholMl: tenthsToNumber((sumVolumeAbv + 500n) / 1000n),
    totalAlcoholG: tenthsToNumber((sumVolumeAbv * DENSITY_NUM + 500000n) / 1000000n),
    totalAbvPct: tenthsToNumber(roundTenths(sumVolumeAbv, 10n * sumVolumeTenths)),
    standardDrinks: tenthsToNumber(
      (sumVolumeAbv * DENSITY_NUM + 5000000n) / 10000000n,
    ),
  };
  return { ok: true, result };
}

// Fixed report download: cocktail-abv-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, finite numbers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "cocktail-abv-report.json";
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
