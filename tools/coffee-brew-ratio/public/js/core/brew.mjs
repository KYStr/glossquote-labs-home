// Pure core for the Coffee Brew Ratio Calculator (spec-coffee-brew-ratio-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
// All arithmetic is integer math in tenths (0.1 g / 0.1 ml / 0.1 ratio /
// 0.1 multiplier); every rounding is half-up exactly as the SPEC pins:
//   dose mode:  W = floor((D * R + 5) / 10)
//   water mode: D = floor((20 * W + R) / (2 * R))
//   bloom:      B = floor((D * M + 5) / 10)   (from the rounded dose)
// The remaining water S = W - B is split into three pours by the largest
// remainder method; leftover 0.1 units go to the earlier pours, so the
// fourth step's cumulativeMl always equals totalWaterMl by construction.

export const FIELDS = ["mode", "amount", "ratio", "bloomMultiplier"];

export const DEFAULTS = { mode: "dose", amount: "20", ratio: "15", bloomMultiplier: "2" };

// The worked example is fixtures.json case 1 (dose-preset-15) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { mode: "dose", amount: "20", ratio: "15", bloomMultiplier: "2" };

export const MAX_RAW_UNITS = 8;

export const RATIO_PRESETS = [12, 13, 14, 15, 16, 17, 18];

// Ranges in display units, used by the static project check.
export const AMOUNT_RANGES = { dose: [1.0, 200.0], water: [10.0, 4000.0] };
export const RATIO_RANGE = [10.0, 20.0];
export const BLOOM_RANGE = [0.0, 5.0];

// The same ranges in integer tenths, used by the validator.
const AMOUNT_TENTHS = { dose: [10, 2000], water: [100, 40000] };
const RATIO_TENTHS = [100, 200];
const BLOOM_TENTHS = [0, 50];

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;
const UNPAIRED_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns the
// raw string map, or null when the shape is not exactly the four fields.
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

// Per-field validation in the SPEC's order: capacity, unpaired surrogate,
// empty, grammar, range. Returns { tenths } for numeric fields, { mode }
// for the mode field, or { error } for the first failure.
function validateField(field, value, mode) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (UNPAIRED_SURROGATE.test(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (field === "mode") {
    if (value !== "dose" && value !== "water") return { error: failure("ENUM", field) };
    return { mode: value };
  }
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const dot = value.indexOf(".");
  const tenths =
    dot === -1
      ? Number(value) * 10
      : Number(value.slice(0, dot)) * 10 + Number(value.slice(dot + 1));
  const range =
    field === "amount" ? AMOUNT_TENTHS[mode] : field === "ratio" ? RATIO_TENTHS : BLOOM_TENTHS;
  if (tenths < range[0] || tenths > range[1]) return { error: failure("RANGE", field) };
  return { tenths };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const modeResult = validateField("mode", raw.mode, null);
  if (modeResult.error) return modeResult.error;
  const mode = modeResult.mode;

  const amountResult = validateField("amount", raw.amount, mode);
  if (amountResult.error) return amountResult.error;
  const ratioResult = validateField("ratio", raw.ratio, mode);
  if (ratioResult.error) return ratioResult.error;
  const bloomResult = validateField("bloomMultiplier", raw.bloomMultiplier, mode);
  if (bloomResult.error) return bloomResult.error;

  const R = ratioResult.tenths;
  const M = bloomResult.tenths;
  let D;
  let W;
  if (mode === "dose") {
    D = amountResult.tenths;
    W = Math.floor((D * R + 5) / 10);
  } else {
    W = amountResult.tenths;
    D = Math.floor((20 * W + R) / (2 * R));
  }
  const B = Math.floor((D * M + 5) / 10);
  const S = W - B;
  const base = Math.floor(S / 3);
  const remainder = S - 3 * base;
  const pours = [0, 1, 2].map((index) => base + (index < remainder ? 1 : 0));

  let cumulative = B;
  const steps = [{ step: 1, kind: "bloom", addMl: B / 10, cumulativeMl: B / 10 }];
  for (let index = 0; index < 3; index += 1) {
    cumulative += pours[index];
    steps.push({
      step: index + 2,
      kind: "pour",
      addMl: pours[index] / 10,
      cumulativeMl: cumulative / 10,
    });
  }

  return {
    ok: true,
    result: {
      mode,
      doseGrams: D / 10,
      totalWaterMl: W / 10,
      ratio: R / 10,
      bloomMultiplier: M / 10,
      bloomWaterMl: B / 10,
      steps,
    },
  };
}

// Display formatting (SPEC: grams and millilitres always show exactly one
// decimal place; the ratio label drops a trailing ".0"). Values reaching
// these helpers are exact tenths by construction.
export function formatAmount(value) {
  const tenths = Math.round(value * 10);
  const sign = tenths < 0 ? "-" : "";
  const absolute = Math.abs(tenths);
  return `${sign}${Math.floor(absolute / 10)}.${absolute % 10}`;
}

export function formatRatioLabel(ratio) {
  const tenths = Math.round(ratio * 10);
  const whole = Math.floor(tenths / 10);
  const fraction = tenths % 10;
  return fraction === 0 ? `1:${whole}` : `1:${whole}.${fraction}`;
}
