// Pure core for the Heart Rate Zones Calculator
// (spec-heart-rate-zones-20261109). Synchronous data-in / data-out only:
// no DOM, no network, no storage. All arithmetic is integer tenths
// arithmetic exactly as the SPEC pins; every rounding is half-up:
//   fox    = 220 - age                              (age given)
//   tanaka = floor((2080 - 7*age + 5) / 10)         (age given)
//   %HRmax boundary b(p10) = floor((p10*used + 5) / 10)
//   Karvonen boundary t(p10) = resting + floor((p10*reserve + 5) / 10)
// Zone k (1-5): pctLow = (k+4)*10, pctHigh = (k+5)*10; lowBpm is the
// 50% boundary for k=1 and the previous boundary + 1 otherwise (the
// shared-boundary +1 rule), highBpm is the zone's upper boundary, so the
// five zones are continuous with no gaps or overlaps and Z5 ends at used.

export const FIELDS = ["age", "measuredMaxHr", "restingHr"];

export const DEFAULTS = { age: "", measuredMaxHr: "", restingHr: "" };

// The worked example is fixtures.json case 1 (tanaka-fractional) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { age: "35", measuredMaxHr: "", restingHr: "" };

export const MAX_RAW_UNITS = 8;

// Field ranges in bpm / years, used by the static project check.
export const FIELD_RANGES = { age: [10, 100], measuredMaxHr: [100, 230], restingHr: [30, 120] };

// ASCII integer strings only: "0" or a non-zero leading digit, no sign,
// no whitespace, no decimal point, no exponent. Non-ASCII digits (e.g.
// full-width digits) are never normalized; they fail the grammar.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the three
// fields.
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

// Per-field validation in the SPEC's order: capacity first (even for an
// empty/unfilled field), then grammar and range for filled fields only.
// An empty string means "not provided" and skips grammar and range.
// Returns { provided: false } or { provided: true, value } or { error }.
function validateField(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { provided: false };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const numeric = Number(value);
  const range = FIELD_RANGES[field];
  if (numeric < range[0] || numeric > range[1]) return { error: failure("RANGE", field) };
  return { provided: true, value: numeric };
}

// Builds the five zones for a boundary function boundary(p10) -> bpm.
function buildZones(boundary) {
  const zones = [];
  for (let zone = 1; zone <= 5; zone += 1) {
    zones.push({
      zone,
      pctLow: (zone + 4) * 10,
      pctHigh: (zone + 5) * 10,
      lowBpm: zone === 1 ? boundary(5) : boundary(zone + 4) + 1,
      highBpm: boundary(zone + 5),
    });
  }
  return zones;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Per-field validation in the fixed field order age, measuredMaxHr,
  // restingHr. A filled-but-invalid field reports its error even when it
  // would not be used (e.g. an invalid age beside a measured maximum).
  const checked = {};
  for (const field of FIELDS) {
    const outcome = validateField(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome;
  }
  const age = checked.age;
  const measured = checked.measuredMaxHr;
  const resting = checked.restingHr;

  // Cross-field one: a maximum heart rate source is required.
  if (!age.provided && !measured.provided) return failure("EMPTY", "age");

  const fox = age.provided ? 220 - age.value : null;
  const tanaka = age.provided ? Math.floor((2080 - 7 * age.value + 5) / 10) : null;
  const used = measured.provided ? measured.value : tanaka;
  const source = measured.provided ? "measured" : "tanaka";

  let karvonen = null;
  if (resting.provided) {
    // Cross-field two: resting heart rate must be below the used maximum.
    if (resting.value >= used) return failure("RESTING_NOT_BELOW_MAX", "restingHr");
    const reserve = used - resting.value;
    karvonen = {
      restingHr: resting.value,
      reserve,
      zones: buildZones((p10) => resting.value + Math.floor((p10 * reserve + 5) / 10)),
    };
  }

  return {
    ok: true,
    result: {
      maxHr: { fox, tanaka, used, source },
      zones: buildZones((p10) => Math.floor((p10 * used + 5) / 10)),
      karvonen,
    },
  };
}
