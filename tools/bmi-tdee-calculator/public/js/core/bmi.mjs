// BMI / BMR / TDEE pure core — SPEC: docs/specs/bmi-tdee-calculator/SPEC.md §4.
// No DOM, network or storage access. All constants live here exactly once,
// as auditable data matching SPEC §4.

// --- Constants (SPEC §4, normative) ---
export const CM_PER_INCH = 2.54; // 1 inch = 2.54 cm exactly
export const KG_PER_LB = 0.45359237; // 1 lb = 0.45359237 kg exactly

export const RANGES = Object.freeze({
  ageYears: Object.freeze({ min: 10, max: 120 }),
  heightCm: Object.freeze({ min: 50, max: 272 }),
  weightKg: Object.freeze({ min: 10, max: 635 }),
});

// WHO bands, judged on the UNROUNDED BMI. Each band is [previous edge, edge):
// a BMI exactly on an edge belongs to the upper band (SPEC §4).
export const WHO_BANDS = Object.freeze([
  Object.freeze({ id: 'underweight', maxExclusive: 18.5 }),
  Object.freeze({ id: 'normal', maxExclusive: 25 }),
  Object.freeze({ id: 'overweight', maxExclusive: 30 }),
  Object.freeze({ id: 'obese-1', maxExclusive: 35 }),
  Object.freeze({ id: 'obese-2', maxExclusive: 40 }),
  Object.freeze({ id: 'obese-3', maxExclusive: Infinity }),
]);

// Mifflin-St Jeor: BMR = 10*w + 6.25*h - 5*a + constant (w kg, h cm, a years).
export const MIFFLIN = Object.freeze({
  weightCoeff: 10,
  heightCoeff: 6.25,
  ageCoeff: -5,
  constantBySex: Object.freeze({ male: 5, female: -161 }),
});

// The five activity multipliers (SPEC §4, normative). Labels/descriptions
// live in the page/app layer; the numbers live only here.
export const ACTIVITY_LEVELS = Object.freeze([
  Object.freeze({ id: 'sedentary', multiplier: 1.2 }),
  Object.freeze({ id: 'light', multiplier: 1.375 }),
  Object.freeze({ id: 'moderate', multiplier: 1.55 }),
  Object.freeze({ id: 'active', multiplier: 1.725 }),
  Object.freeze({ id: 'athlete', multiplier: 1.9 }),
]);

// Asia-Pacific public-health action points — information only, never a
// second category verdict (SPEC §2/§4).
export const ASIA_PACIFIC_ACTION_POINTS = Object.freeze([23.0, 27.5]);

export const HEALTHY_BMI_LOW = 18.5;
export const HEALTHY_BMI_HIGH_EXCLUSIVE = 25;

// --- Rounding: half away from zero (SPEC §4) ---
// A 1e-6 nudge after scaling absorbs binary representation error at exact
// mathematical ties (e.g. 1648.75 * 1.2 = 1978.4999999999998 in IEEE 754,
// which must still display 1979). Values computed here cannot legitimately
// fall within 1e-6 below a tie without being a tie.
export function roundHalfAwayFromZero(value, decimals = 0) {
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  return (Math.sign(value) * Math.round(scaled + 1e-6)) / factor;
}

export function formatDecimal(value, decimals) {
  return roundHalfAwayFromZero(value, decimals).toFixed(decimals);
}

// --- Field parsing / validation ---
// Results are { ok: true, value } or { ok: false, error } where error is one
// of: 'empty' | 'not-a-number' | 'not-integer' | 'out-of-range' |
// 'inches-too-large'. The app layer maps codes to localised messages.

export function parseNumber(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'not-a-number' };
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, error: 'not-a-number' };
  return { ok: true, value };
}

function checkRange(value, range) {
  if (value < range.min || value > range.max) {
    return { ok: false, error: 'out-of-range', min: range.min, max: range.max };
  }
  return { ok: true, value };
}

export function validateAge(raw) {
  const parsed = parseNumber(raw);
  if (!parsed.ok) return parsed;
  if (!Number.isInteger(parsed.value)) return { ok: false, error: 'not-integer' };
  return checkRange(parsed.value, RANGES.ageYears);
}

export function validateHeightMetric(raw) {
  const parsed = parseNumber(raw);
  if (!parsed.ok) return parsed;
  return checkRange(parsed.value, RANGES.heightCm);
}

export function validateWeightMetric(raw) {
  const parsed = parseNumber(raw);
  if (!parsed.ok) return parsed;
  return checkRange(parsed.value, RANGES.weightKg);
}

// Imperial height: total inches = 12 * feet + inches. Inches >= 12 is a
// field error (fold into feet) — never silently normalised (SPEC §4).
export function validateHeightImperial(feetRaw, inchesRaw) {
  const feet = parseNumber(feetRaw);
  if (!feet.ok) return { field: 'feet', ...feet };
  if (!Number.isInteger(feet.value) || feet.value < 0) {
    return { field: 'feet', ok: false, error: 'not-integer' };
  }
  const inches = parseNumber(inchesRaw);
  if (!inches.ok) return { field: 'inches', ...inches };
  if (inches.value >= 12) {
    return { field: 'inches', ok: false, error: 'inches-too-large' };
  }
  if (inches.value < 0) {
    return { field: 'inches', ok: false, error: 'out-of-range', min: 0, max: 11 };
  }
  const totalInches = 12 * feet.value + inches.value;
  const cm = totalInches * CM_PER_INCH;
  const ranged = checkRange(cm, RANGES.heightCm);
  if (!ranged.ok) return { field: 'height', ...ranged };
  return { ok: true, value: cm };
}

export function validateWeightImperial(raw) {
  const parsed = parseNumber(raw);
  if (!parsed.ok) return parsed;
  const kg = parsed.value * KG_PER_LB;
  return checkRange(kg, RANGES.weightKg);
}

// --- Display conversions (SPEC §4) ---
// Metric -> imperial height: total inches rounded to the nearest whole inch
// (half away from zero), then split into feet + inches.
export function heightToImperial(heightCm) {
  const totalInches = roundHalfAwayFromZero(heightCm / CM_PER_INCH, 0);
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: totalInches - 12 * feet, totalInches };
}

export function kgToLb(weightKg) {
  return weightKg / KG_PER_LB;
}

// --- Computation (SPEC §4); inputs are validated, unrounded metric ---
export function categoryForBmi(bmi) {
  for (const band of WHO_BANDS) {
    if (bmi < band.maxExclusive) return band.id;
  }
  return 'obese-3';
}

export function compute({ sex, ageYears, heightCm, weightKg }) {
  const heightM = heightCm / 100;
  const heightMSquared = heightM * heightM;
  const bmi = weightKg / heightMSquared;
  const healthyLowKg = HEALTHY_BMI_LOW * heightMSquared;
  const healthyHighKg = HEALTHY_BMI_HIGH_EXCLUSIVE * heightMSquared; // exclusive bound
  const bmr =
    MIFFLIN.weightCoeff * weightKg +
    MIFFLIN.heightCoeff * heightCm +
    MIFFLIN.ageCoeff * ageYears +
    MIFFLIN.constantBySex[sex];
  const tdee = ACTIVITY_LEVELS.map((level) => ({
    id: level.id,
    multiplier: level.multiplier,
    kcal: bmr * level.multiplier,
  }));
  return {
    bmi,
    bmiText: formatDecimal(bmi, 1),
    categoryId: categoryForBmi(bmi), // judged on the unrounded BMI
    healthyRangeKg: { low: healthyLowKg, highExclusive: healthyHighKg },
    healthyRangeLb: {
      low: kgToLb(healthyLowKg),
      highExclusive: kgToLb(healthyHighKg),
    },
    bmr,
    bmrText: formatDecimal(bmr, 0),
    tdee: tdee.map((row) => ({ ...row, kcalText: formatDecimal(row.kcal, 0) })),
    under18: ageYears < 18,
  };
}
