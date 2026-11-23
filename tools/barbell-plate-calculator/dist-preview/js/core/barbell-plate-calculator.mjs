// Pure core for the Barbell Plate Calculator
// (spec-barbell-plate-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. All
// weights are computed in integer units of 0.125 kg (1 unit =
// 0.125 kg), so there is no floating-point arithmetic anywhere in
// the derivation: targetKg and barKg are both pinned to multiples
// of 0.25 kg, hence (targetUnits - barUnits) / 2 is always an
// integer number of per-side units. The plate set is the SPEC's
// pinned IWF standard set (25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg =
// 200 / 160 / 120 / 80 / 40 / 20 / 10 units), loaded greedily from
// largest to smallest, capped by the available pairs per
// denomination. nextUpKg follows the SPEC's pinned definition: one
// more plate of the smallest denomination that still has a spare
// pair — explicitly NOT a proven global minimum achievable weight.
// The result shape follows fixtures.json exactly.

export const FIELDS = [
  "targetKg",
  "barKg",
  "pairs25",
  "pairs20",
  "pairs15",
  "pairs10",
  "pairs5",
  "pairs2_5",
  "pairs1_25",
];

export const DEFAULTS = {
  targetKg: "100",
  barKg: "20",
  pairs25: "2",
  pairs20: "2",
  pairs15: "2",
  pairs10: "2",
  pairs5: "2",
  pairs2_5: "2",
  pairs1_25: "2",
};

// The worked example is fixtures.json case 1 (exact-100kg) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { ...DEFAULTS };

export const MAX_RAW_UNITS = 12;

export const TARGET_MIN_KG = 0;
export const TARGET_MAX_KG = 500;
export const BAR_MIN_KG = 0;
export const BAR_MAX_KG = 50;
export const PAIRS_MIN = 0;
export const PAIRS_MAX = 10;

// Pinned IWF standard plate set, largest first. `units` are 0.125 kg
// units; `plateKg` is the exact JSON number for the denomination.
export const PLATES = [
  { field: "pairs25", plateKg: 25, units: 200 },
  { field: "pairs20", plateKg: 20, units: 160 },
  { field: "pairs15", plateKg: 15, units: 120 },
  { field: "pairs10", plateKg: 10, units: 80 },
  { field: "pairs5", plateKg: 5, units: 40 },
  { field: "pairs2_5", plateKg: 2.5, units: 20 },
  { field: "pairs1_25", plateKg: 1.25, units: 10 },
];

const NUMBER_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

// 1 kg = 100 centi-kg; 0.25 kg = 25 centi-kg; 1 unit (0.125 kg) =
// 12.5 centi-kg, so units = (centi / 25) * 2 once the 0.25 kg
// multiple check has passed.
const CENTI_PER_KG = 100;
const CENTI_PER_QUARTER_KG = 25;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the nine
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

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range, then (for the two kg fields)
// the 0.25 kg multiple check. Returns the parsed value in integer
// units (0.125 kg units for the kg fields, plain counts for pairs),
// or an { error } outcome.
function validateKgField(field, value, minKg, maxKg) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!NUMBER_PATTERN.test(value)) return { error: failure("NUMBER_FORMAT", field) };
  const dot = value.indexOf(".");
  const whole = dot === -1 ? value : value.slice(0, dot);
  const fraction = dot === -1 ? "" : value.slice(dot + 1);
  const centi =
    Number(whole) * CENTI_PER_KG + Number(fraction.padEnd(2, "0") || "0");
  if (centi < minKg * CENTI_PER_KG || centi > maxKg * CENTI_PER_KG) {
    return { error: failure("RANGE", field) };
  }
  if (centi % CENTI_PER_QUARTER_KG !== 0) {
    return { error: failure("NOT_MULTIPLE", field) };
  }
  return { value: (centi / CENTI_PER_QUARTER_KG) * 2 };
}

function validatePairsField(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < PAIRS_MIN || parsed > PAIRS_MAX) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

// Exact kg number for an integer count of 0.125 kg units. Every
// 0.125 kg multiple is exactly representable in binary, and
// multiplying a safe integer by 0.125 (2^-3) is exact.
export function unitsToKg(units) {
  return units * 0.125;
}

// Display formatting for a kg number that is a multiple of 0.125:
// at most 3 decimals, trailing zeros stripped (25, 2.5, 1.25,
// 0.125). Derived from the exact unit count, never from float
// formatting.
const FRACTION_TEXT = ["", ".125", ".25", ".375", ".5", ".625", ".75", ".875"];

export function formatKg(kg) {
  const units = Math.round(kg * 8);
  const whole = Math.floor(units / 8);
  return `${whole}${FRACTION_TEXT[units % 8]}`;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const target = validateKgField("targetKg", raw.targetKg, TARGET_MIN_KG, TARGET_MAX_KG);
  if (target.error) return target.error;
  const bar = validateKgField("barKg", raw.barKg, BAR_MIN_KG, BAR_MAX_KG);
  if (bar.error) return bar.error;
  const targetUnits = target.value;
  const barUnits = bar.value;

  const pairs = {};
  for (const plate of PLATES) {
    const outcome = validatePairsField(plate.field, raw[plate.field]);
    if (outcome.error) return outcome.error;
    pairs[plate.field] = outcome.value;
  }

  // Cross-field: the target must not be below the bar weight.
  if (targetUnits < barUnits) return failure("TARGET_BELOW_BAR", "targetKg");

  const perSideUnits = (targetUnits - barUnits) / 2;
  let remainingUnits = perSideUnits;
  const platesPerSide = [];
  let platesPerSideCount = 0;
  const sparePairs = {};
  for (const plate of PLATES) {
    const available = pairs[plate.field];
    const count = Math.min(available, Math.floor(remainingUnits / plate.units));
    remainingUnits -= count * plate.units;
    platesPerSideCount += count;
    sparePairs[plate.field] = available - count;
    if (count > 0) platesPerSide.push({ plateKg: plate.plateKg, count });
  }

  const loadedPerSideUnits = perSideUnits - remainingUnits;
  const remainderPerSideUnits = remainingUnits;
  const achievedUnits = barUnits + 2 * loadedPerSideUnits;
  const reachable = remainderPerSideUnits === 0;

  // nextUpKg (SPEC-pinned definition): reachable -> null; otherwise
  // one more plate of the smallest denomination that still has a
  // spare pair; no spare pair anywhere -> null. This is a
  // suggestion, not a proven global minimum.
  let nextUpKg = null;
  if (!reachable) {
    for (let index = PLATES.length - 1; index >= 0; index -= 1) {
      const plate = PLATES[index];
      if (sparePairs[plate.field] > 0) {
        nextUpKg = unitsToKg(achievedUnits + 2 * plate.units);
        break;
      }
    }
  }

  return {
    ok: true,
    result: {
      targetKg: unitsToKg(targetUnits),
      barKg: unitsToKg(barUnits),
      perSideKg: unitsToKg(perSideUnits),
      platesPerSide,
      platesPerSideCount,
      loadedPerSideKg: unitsToKg(loadedPerSideUnits),
      achievedKg: unitsToKg(achievedUnits),
      remainderPerSideKg: unitsToKg(remainderPerSideUnits),
      reachable,
      nextUpKg,
    },
  };
}

// Fixed report download: barbell-plate-calculator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is hand-written:
// it never calls a value's toJSON and accepts only the plain data
// shapes a result can hold (null, booleans, finite numbers, strings,
// arrays, plain objects).
export const REPORT_FILENAME = "barbell-plate-calculator-report.json";
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
