// Pure core for the Macro Split Calculator (spec-macro-split-calculator-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
// All arithmetic is exact integer math (the SPEC forbids float-decided
// results):
//   grams g = floor((2*T*pct + 100*f) / (200*f))     (roundHalfUp of T*pct/(100*f))
//   targetKcal = floor((2*T*pct + 100) / 200)        (display only)
//   residual R = T - sum(f*g); the largest macro (max T*pct, ties broken
//   protein -> carbs -> fat) absorbs deltaG = floor(R/f_L + 1/2), computed
//   with mathematical floor so negative residuals follow the same rule.
//   Meals split each adjusted gram count independently: base = floor(g/N),
//   the first r = g - base*N meals get one extra gram.

export const FIELDS = ["calories", "preset", "proteinPct", "carbsPct", "fatPct", "meals"];

export const DEFAULTS = {
  calories: "2000",
  preset: "balanced",
  proteinPct: "",
  carbsPct: "",
  fatPct: "",
  meals: "",
};

// The worked example is fixtures.json case 1 (balanced-2000) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  calories: "2000",
  preset: "balanced",
  proteinPct: "",
  carbsPct: "",
  fatPct: "",
  meals: "",
};

export const MAX_RAW_UNITS = 8;

export const CALORIES_RANGE = [800, 10000];
export const PCT_RANGE = [0, 100];
export const MEALS_RANGE = [1, 6];

export const PRESET_IDS = ["balanced", "high-protein", "low-carb", "keto", "custom"];

// Effective percentages { protein, carbs, fat } for the named presets.
export const PRESETS = {
  balanced: { protein: 30, carbs: 40, fat: 30 },
  "high-protein": { protein: 40, carbs: 30, fat: 30 },
  "low-carb": { protein: 35, carbs: 25, fat: 40 },
  keto: { protein: 20, carbs: 5, fat: 75 },
};

export const MACRO_IDS = ["protein", "carbs", "fat"];

// Atwater factors (kcal per gram), pinned by the SPEC.
export const ENERGY_FACTORS = { protein: 4, carbs: 4, fat: 9 };

export const REPORT_FILENAME = "macro-split-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns the
// raw string map, or null when the shape is not exactly the six fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

// Integer-string field validation in the SPEC's order: capacity
// INPUT_LIMIT (only where the SPEC pins a raw capacity: calories and the
// three pct fields, 8 units), EMPTY, INTEGER_FORMAT grammar, RANGE.
// Returns { value } or { error }.
function validateIntegerField(field, value, range, { capacity = false, emptyCode = true } = {}) {
  if (capacity && value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) {
    return emptyCode ? { error: failure("EMPTY", field) } : { value: null };
  }
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (parsed < range[0] || parsed > range[1]) return { error: failure("RANGE", field) };
  return { value: parsed };
}

// Mathematical floor division for a possibly negative numerator and a
// positive denominator (JS Math.floor on the exact quotient; all values
// here are tiny, so the division is exact).
function floorDiv(numerator, denominator) {
  return Math.floor(numerator / denominator);
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const caloriesResult = validateIntegerField("calories", raw.calories, CALORIES_RANGE, {
    capacity: true,
  });
  if (caloriesResult.error) return caloriesResult.error;
  const T = caloriesResult.value;

  // preset: the SPEC pins no raw capacity for this field (its longest
  // pinned value, "high-protein", is 12 units — longer than the numeric
  // fields' 8), so only EMPTY then ENUM apply, in the SPEC's order.
  if (raw.preset.length === 0) return failure("EMPTY", "preset");
  if (!PRESET_IDS.includes(raw.preset)) return failure("ENUM", "preset");

  let ratios;
  if (raw.preset === "custom") {
    const pct = {};
    for (const field of ["proteinPct", "carbsPct", "fatPct"]) {
      const result = validateIntegerField(field, raw[field], PCT_RANGE, { capacity: true });
      if (result.error) return result.error;
      pct[field] = result.value;
    }
    if (pct.proteinPct + pct.carbsPct + pct.fatPct !== 100) {
      return failure("RATIO_SUM", null);
    }
    ratios = { protein: pct.proteinPct, carbs: pct.carbsPct, fat: pct.fatPct };
  } else {
    // Named preset: the three pct fields are completely ignored — not
    // validated, not read for values.
    ratios = { ...PRESETS[raw.preset] };
  }

  let mealCount = null;
  if (raw.meals.length !== 0) {
    const mealsResult = validateIntegerField("meals", raw.meals, MEALS_RANGE);
    if (mealsResult.error) return mealsResult.error;
    mealCount = mealsResult.value;
  }

  // Step 1: grams by exact roundHalfUp of T*pct/(100*f).
  const grams = {};
  for (const id of MACRO_IDS) {
    const f = ENERGY_FACTORS[id];
    grams[id] = floorDiv(2 * T * ratios[id] + 100 * f, 200 * f);
  }

  // Step 2: residual against the unadjusted implied total.
  let implied0 = 0;
  for (const id of MACRO_IDS) implied0 += ENERGY_FACTORS[id] * grams[id];
  const residual = T - implied0;

  // Step 3: the largest macro (max T*pct; ties in protein, carbs, fat
  // order) absorbs deltaG = floor(R/f_L + 1/2) = floor((2R + f_L)/(2*f_L)).
  let largest = MACRO_IDS[0];
  for (const id of MACRO_IDS.slice(1)) {
    if (T * ratios[id] > T * ratios[largest]) largest = id;
  }
  const fL = ENERGY_FACTORS[largest];
  const deltaG = floorDiv(2 * residual + fL, 2 * fL);
  let adjustedMacro = null;
  if (deltaG !== 0) {
    grams[largest] += deltaG;
    adjustedMacro = largest;
  }

  // Steps 4-5: final implied total and display-only target kcal.
  let impliedKcal = 0;
  const macros = MACRO_IDS.map((id) => {
    const kcal = ENERGY_FACTORS[id] * grams[id];
    impliedKcal += kcal;
    return {
      id,
      pct: ratios[id],
      targetKcal: floorDiv(2 * T * ratios[id] + 100, 200),
      grams: grams[id],
      kcal,
    };
  });

  // Step 6: per-meal split of the adjusted grams, remainder to the
  // earliest meals, independently per macro.
  let meals = null;
  if (mealCount !== null) {
    const items = [];
    for (let index = 0; index < mealCount; index += 1) {
      const item = { index: index + 1 };
      for (const id of MACRO_IDS) {
        const base = Math.floor(grams[id] / mealCount);
        const remainder = grams[id] - base * mealCount;
        item[id] = base + (index < remainder ? 1 : 0);
      }
      item.kcal =
        ENERGY_FACTORS.protein * item.protein +
        ENERGY_FACTORS.carbs * item.carbs +
        ENERGY_FACTORS.fat * item.fat;
      items.push(item);
    }
    meals = { count: mealCount, items };
  }

  return {
    ok: true,
    result: {
      calories: T,
      ratios,
      macros,
      adjustedMacro,
      impliedKcal,
      deltaKcal: impliedKcal - T,
      meals,
    },
  };
}

// Canonical report serialization (SPEC): compact JSON of the result with
// object own keys sorted ascending by UTF-16 code units recursively,
// array order preserved, string escaping done by the JSON literal rules
// without ever calling an input's toJSON, one trailing LF, UTF-8 no BOM.
// Throws RangeError when the encoded report exceeds the pinned limit.
export function serializeReport(result) {
  const canonical = (value) => {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === "function" || typeof item === "undefined" || typeof item === "symbol"
          ? null
          : canonical(item),
      );
    }
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      // Skip non-data values instead of copying them: a copied function
      // property named toJSON would otherwise be invoked by stringify.
      if (typeof item === "function" || typeof item === "undefined" || typeof item === "symbol") {
        continue;
      }
      sorted[key] = canonical(item);
    }
    return sorted;
  };
  const text = `${JSON.stringify(canonical(result))}\n`;
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > REPORT_LIMIT_BYTES) {
    throw new RangeError(`Report exceeds ${REPORT_LIMIT_BYTES} bytes`);
  }
  return text;
}
