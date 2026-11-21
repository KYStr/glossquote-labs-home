// Pure core for the Calories Burned Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-calories-burned-calculator-20261109): one exercise session's
// gross calories from body weight, duration and activities from the
// pinned 2024 Adult Compendium MET table, using the Compendium's own
// definition kcal = MET × weight (kg) × duration (hours).
//
// Exact integer arithmetic only (SPEC §2.5): for each activity,
//   numerator = metTenths × weightHundredths × minutesTenths
//   kcal = floor(numerator / 600000), plus 1 when
//          2 × (numerator mod 600000) >= 600000
// so a true tie (fractional part exactly one half) always rounds up:
// half away from zero, decided exactly, with no binary floating-point
// step anywhere in the core. The largest legal numerator is
// 98 × 50000 × 14400 = 70,560,000,000, far below
// Number.MAX_SAFE_INTEGER, so plain integer arithmetic is exact.

import { ACTIVITY_BY_ID, formatMet } from "./table.mjs";

export const FIELDS = ["weight", "durationMinutes", "activities"];

// Maximum raw length per field, in UTF-16 code units (SPEC §2.7).
export const RAW_LIMITS = { weight: 8, durationMinutes: 8, activityElement: 32 };

// Factory default input (SPEC §4.4); reset restores exactly this.
export const DEFAULTS = {
  weight: "60",
  durationMinutes: "30",
  activities: ["walking-moderate"],
};

export const MAX_ACTIVITIES = 3;
export const WEIGHT_MIN_HUNDREDTHS = 2000;
export const WEIGHT_MAX_HUNDREDTHS = 50000;
export const DURATION_MIN_TENTHS = 10;
export const DURATION_MAX_TENTHS = 14400;

const DIVISOR = 600000;

// Weight grammar (§2.2): INT ("." FRAC)?, INT "0" or [1-9][0-9]*,
// FRAC 1–2 digits. Duration grammar (§2.3) is the same shape with at
// most one fractional digit.
const WEIGHT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const DURATION_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
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
// exactly the three fields, each an own data property (no accessors)
// holding a value of the right JSON type — strings for weight and
// durationMinutes, an array for activities (a non-string element inside
// activities is also SCHEMA). Anything else is SCHEMA with field/row
// null.
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
    values[field] = descriptor.value;
  }
  if (typeof values.weight !== "string") return null;
  if (typeof values.durationMinutes !== "string") return null;
  if (!Array.isArray(values.activities)) return null;
  if (values.activities.some((element) => typeof element !== "string")) return null;
  return values;
}

// Parse a grammar-valid decimal string to an exact integer count of
// sub-units without binary floating point: the integer part is
// accumulated digit by digit and the fraction is right-padded with
// zeroes to the fixed scale. `fractionDigits` is the scale (2 for
// weight hundredths, 1 for duration tenths).
function parseDecimalToScaled(raw, fractionDigits) {
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  let scaled = 0;
  for (let i = 0; i < intPart.length; i += 1) {
    scaled = scaled * 10 + (intPart.charCodeAt(i) - 48);
  }
  scaled *= 10 ** fractionDigits;
  for (let i = 0; i < fractionDigits; i += 1) {
    const digit = i < fracPart.length ? fracPart.charCodeAt(i) - 48 : 0;
    scaled += digit * 10 ** (fractionDigits - 1 - i);
  }
  return scaled;
}

// Validate one decimal field in the SPEC's order: INPUT_LIMIT, then
// UNICODE, then EMPTY, then DECIMAL_FORMAT, then RANGE.
function validateDecimal(field, raw, pattern, fractionDigits, minScaled, maxScaled) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  if (raw === "") return fieldError("EMPTY", field);
  if (!pattern.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const scaled = parseDecimalToScaled(raw, fractionDigits);
  if (scaled < minScaled || scaled > maxScaled) return fieldError("RANGE", field);
  return { ok: true, scaled };
}

// Validate the whole input in the SPEC §2.7 order: schema first, then
// weight, then durationMinutes, then activities; the first failure wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  const weight = validateDecimal(
    "weight",
    values.weight,
    WEIGHT_PATTERN,
    2,
    WEIGHT_MIN_HUNDREDTHS,
    WEIGHT_MAX_HUNDREDTHS,
  );
  if (!weight.ok) return weight;

  const duration = validateDecimal(
    "durationMinutes",
    values.durationMinutes,
    DURATION_PATTERN,
    1,
    DURATION_MIN_TENTHS,
    DURATION_MAX_TENTHS,
  );
  if (!duration.ok) return duration;

  const activities = values.activities;
  if (activities.length === 0) return fieldError("EMPTY", "activities");
  if (activities.length > MAX_ACTIVITIES) {
    return fieldError("ROW_LIMIT", "activities", MAX_ACTIVITIES + 1);
  }
  for (let i = 0; i < activities.length; i += 1) {
    const row = i + 1;
    const element = activities[i];
    if (element.length > RAW_LIMITS.activityElement) {
      return fieldError("INPUT_LIMIT", "activities", row);
    }
    if (hasUnpairedSurrogate(element)) return fieldError("UNICODE", "activities", row);
    if (element === "") return fieldError("EMPTY", "activities", row);
    if (!ACTIVITY_BY_ID.has(element)) return fieldError("ENUM", "activities", row);
  }
  for (let i = 1; i < activities.length; i += 1) {
    if (activities.indexOf(activities[i]) !== i) {
      return fieldError("DUPLICATE", "activities", i + 1);
    }
  }

  return {
    ok: true,
    values: {
      weightHundredths: weight.scaled,
      minutesTenths: duration.scaled,
      activities: [...activities],
    },
  };
}

// One row's kcal by the exact integer rule of §2.5.
function rowKcal(metTenths, weightHundredths, minutesTenths) {
  const numerator = metTenths * weightHundredths * minutesTenths;
  const quotient = Math.floor(numerator / DIVISOR);
  const remainder = numerator - quotient * DIVISOR;
  return quotient + (2 * remainder >= DIVISOR ? 1 : 0);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { weightHundredths, minutesTenths, activities } = validated.values;

  const rows = activities.map((activityId) => {
    const activity = ACTIVITY_BY_ID.get(activityId);
    return {
      activityId,
      code: activity.code,
      met: formatMet(activity.metTenths),
      kcal: rowKcal(activity.metTenths, weightHundredths, minutesTenths),
    };
  });
  const totalKcal = rows.reduce((sum, row) => sum + row.kcal, 0);

  return { ok: true, result: { rows, totalKcal } };
}
