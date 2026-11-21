// Pure core for the Battery Runtime Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-battery-runtime-calculator-20261109): four modes — runtime from
// mAh + voltage, runtime from Wh, solve for the capacity a target
// runtime requires, and series/parallel pack combination. Depth of
// discharge is the single ratio input (default 100%); a 0 W load is
// the "infinite" status, not an error.
//
// All arithmetic is exact BigInt rationals; no floating point anywhere
// in the core. Every decimal string is parsed to an integer number of
// micro-units (value x 1,000,000), and every derived quantity is kept
// as an exact rational {n, d} until the single half-up rounding at
// output. Display values are rounded half-up exactly once from the
// exact rational; all downstream computation uses the unrounded value.

export const MODES = ["runtime-mah", "runtime-wh", "solve", "pack"];

// Field order per mode, as pinned by the SPEC's validation order
// (depthOfDischargePercent is always last; it is optional in every
// mode and defaults to "100" when absent).
export const MODE_FIELDS = {
  "runtime-mah": ["capacityMah", "voltage", "loadWatts", "depthOfDischargePercent"],
  "runtime-wh": ["capacityWh", "loadWatts", "depthOfDischargePercent"],
  solve: ["targetRuntimeHours", "loadWatts", "voltage", "depthOfDischargePercent"],
  pack: [
    "cellCapacityMah",
    "cellVoltage",
    "seriesCount",
    "parallelCount",
    "loadWatts",
    "depthOfDischargePercent",
  ],
};

// Required fields per mode (depthOfDischargePercent excluded: optional).
export const REQUIRED_FIELDS = {
  "runtime-mah": ["capacityMah", "voltage", "loadWatts"],
  "runtime-wh": ["capacityWh", "loadWatts"],
  solve: ["targetRuntimeHours", "loadWatts", "voltage"],
  pack: ["cellCapacityMah", "cellVoltage", "seriesCount", "parallelCount", "loadWatts"],
};

// Maximum raw length per field, in UTF-16 code units (SPEC).
export const RAW_LIMITS = {
  capacityMah: 12,
  capacityWh: 10,
  voltage: 8,
  loadWatts: 11,
  targetRuntimeHours: 10,
  depthOfDischargePercent: 7,
  cellCapacityMah: 12,
  cellVoltage: 8,
  seriesCount: 3,
  parallelCount: 3,
};

export const DEFAULTS = {
  mode: "runtime-mah",
  capacityMah: "10000",
  voltage: "3.7",
  loadWatts: "10",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  mode: "runtime-mah",
  capacityMah: "10000",
  voltage: "3.7",
  loadWatts: "10",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "battery-runtime-report.json";

// Decimal grammar: ASCII digits, optionally one decimal point followed
// by 1-6 digits. Integer grammar: ASCII digits only. Neither accepts
// signs, whitespace, exponents, commas, or full-width digits. Leading
// zeros are allowed ("007" = 7, "00.50" = 0.5).
const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]{1,6})?$/;
const INTEGER_PATTERN = /^[0-9]+$/;

const MICRO = 1000000n;

// Ranges in micro-units (value x 1,000,000), except the two count
// fields, whose ranges are plain integers. `minExclusive` marks a
// lower bound that must be strictly exceeded.
const DECIMAL_RANGES = {
  capacityMah: { min: 0n, max: 10000000n * MICRO, minExclusive: true },
  capacityWh: { min: 0n, max: 100000n * MICRO, minExclusive: true },
  voltage: { min: 0n, max: 1000n * MICRO, minExclusive: true },
  loadWatts: { min: 0n, max: 1000000n * MICRO, minExclusive: false },
  targetRuntimeHours: { min: 0n, max: 100000n * MICRO, minExclusive: true },
  depthOfDischargePercent: { min: 0n, max: 100n * MICRO, minExclusive: true },
  cellCapacityMah: { min: 0n, max: 10000000n * MICRO, minExclusive: true },
  cellVoltage: { min: 0n, max: 1000n * MICRO, minExclusive: true },
};

const COUNT_RANGE = { min: 1n, max: 100n };

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
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

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Read one own string data property; null when absent, an accessor, or
// not a string. Any access failure is treated as a schema failure.
function readStringField(object, field) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(object, field);
  } catch {
    return null;
  }
  if (descriptor === undefined || !("value" in descriptor)) return null;
  return typeof descriptor.value === "string" ? descriptor.value : null;
}

// Validate the whole input in the SPEC's fixed order:
// 1. structure SCHEMA (non-plain object, any accessor, mode missing or
//    non-string), 2. mode ENUM, 3. field-set SCHEMA (unknown /
//    inapplicable / missing required field), 4. type SCHEMA (any present
//    value non-string), 5. per-field checks in the mode's field order:
//    INPUT_LIMIT -> UNICODE -> EMPTY -> DECIMAL_FORMAT / INTEGER_FORMAT
//    -> RANGE. The first failure wins, with row always null.
export function validateInput(input) {
  if (!isPlainObject(input)) return schemaError();
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return schemaError();
  }
  // Step 1: every own property must be a data property (no accessors).
  for (const key of keys) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, key);
    } catch {
      return schemaError();
    }
    if (descriptor === undefined || !("value" in descriptor)) return schemaError();
  }
  const mode = readStringField(input, "mode");
  if (mode === null) return schemaError();
  // Step 2: mode enum.
  if (!MODES.includes(mode)) {
    return { ok: false, error: { code: "ENUM", field: "mode", row: null } };
  }
  // Step 3: field set — exactly the mode's fields plus depth of
  // discharge (optional), no unknown or inapplicable fields, all
  // required fields present.
  const allowed = new Set(["mode", ...MODE_FIELDS[mode]]);
  for (const key of keys) {
    if (!allowed.has(key)) return schemaError();
  }
  for (const field of REQUIRED_FIELDS[mode]) {
    if (!keys.includes(field)) return schemaError();
  }
  // Step 4: every present field value must be a string.
  const raw = { mode };
  for (const field of MODE_FIELDS[mode]) {
    if (!keys.includes(field)) continue;
    const value = readStringField(input, field);
    if (value === null) return schemaError();
    raw[field] = value;
  }
  // Step 5: per-field checks in the mode's field order.
  const values = { mode };
  for (const field of MODE_FIELDS[mode]) {
    if (!(field in raw)) continue;
    const text = raw[field];
    if (text.length > RAW_LIMITS[field]) {
      return { ok: false, error: { code: "INPUT_LIMIT", field, row: null } };
    }
    if (hasUnpairedSurrogate(text)) {
      return { ok: false, error: { code: "UNICODE", field, row: null } };
    }
    if (text === "") {
      return { ok: false, error: { code: "EMPTY", field, row: null } };
    }
    if (field === "seriesCount" || field === "parallelCount") {
      if (!INTEGER_PATTERN.test(text)) {
        return { ok: false, error: { code: "INTEGER_FORMAT", field, row: null } };
      }
      const count = BigInt(text);
      if (count < COUNT_RANGE.min || count > COUNT_RANGE.max) {
        return { ok: false, error: { code: "RANGE", field, row: null } };
      }
      values[field] = count;
      continue;
    }
    if (!DECIMAL_PATTERN.test(text)) {
      return { ok: false, error: { code: "DECIMAL_FORMAT", field, row: null } };
    }
    const micro = parseDecimalMicro(text);
    const range = DECIMAL_RANGES[field];
    const belowMin = range.minExclusive ? micro <= range.min : micro < range.min;
    if (belowMin || micro > range.max) {
      return { ok: false, error: { code: "RANGE", field, row: null } };
    }
    values[field] = micro;
  }
  return { ok: true, values };
}

// Parse a grammar-valid decimal string into micro-units (value x
// 1,000,000). The grammar guarantees the shape.
function parseDecimalMicro(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return BigInt(raw) * MICRO;
  const frac = raw.slice(dot + 1);
  const padded = frac + "0".repeat(6 - frac.length);
  return BigInt(raw.slice(0, dot)) * MICRO + BigInt(padded);
}

// Exact rational helpers. A rational is {n, d} with d > 0, n >= 0 here.
function rat(n, d) {
  return { n, d };
}
function mul(a, b) {
  return { n: a.n * b.n, d: a.d * b.d };
}
function div(a, b) {
  return { n: a.n * b.d, d: a.d * b.n };
}

// roundHalfUp(n / d) for non-negative BigInts: quotient q, remainder r;
// if 2r >= d the result is q + 1, otherwise q. An exact half rounds up.
function roundHalfUp(n, d) {
  const q = n / d;
  const r = n - q * d;
  return 2n * r >= d ? q + 1n : q;
}

// Round the non-negative rational a to `places` decimals, half-up,
// returning the value as a JS number (exact for these bounded outputs).
function roundToPlaces(a, places) {
  const scale = 10n ** BigInt(places);
  const scaled = roundHalfUp(a.n * scale, a.d);
  return Number(scaled) / Number(scale);
}

// Exact rational to JS number (used only for exact pack voltage /
// capacity, which the SPEC pins as unrounded exact values).
function exactToNumber(a) {
  return Number(a.n) / Number(a.d);
}

// ceil(n / d) for non-negative BigInts.
function ceilDiv(n, d) {
  return (n + d - 1n) / d;
}

// The battery runtime estimate. All inputs are validated first; every
// step is exact BigInt rational arithmetic.
//   energy (runtime-mah) = capacityMah x voltage / 1000 (Wh)
//   energy (runtime-wh)  = capacityWh
//   pack: packVoltage = cellVoltage x seriesCount;
//         packCapacity = cellCapacityMah x parallelCount;
//         energy = packCapacity x packVoltage / 1000
//   usable = energy x depthOfDischargePercent / 100
//   runtime: load 0 -> status "infinite", runtime fields null;
//     else exactHours = usable / load; runtimeHours = rhu(exact, 1);
//     runtimeTotalMinutes = rhu(exact x 60, 0); hours/minutes parts
//     split from that single total, so minutes are always 0-59.
//   solve: requiredEnergyExact = load x target x 100 / dod;
//     requiredEnergyWh = rhu(requiredEnergyExact, 2);
//     requiredCapacityMah = ceil(requiredEnergyExact / voltage x 1000)
//     from the unrounded exact energy; load 0 -> 0 / 0.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const v = validated.values;
  const mode = v.mode;
  // Depth of discharge as a rational; absent means 100%.
  const dod = "depthOfDischargePercent" in v
    ? rat(v.depthOfDischargePercent, MICRO)
    : rat(100n, 1n);
  const load = rat(v.loadWatts, MICRO);

  if (mode === "solve") {
    const target = rat(v.targetRuntimeHours, MICRO);
    const voltage = rat(v.voltage, MICRO);
    if (load.n === 0n) {
      return {
        ok: true,
        result: { mode, status: "ok", requiredEnergyWh: 0, requiredCapacityMah: 0 },
      };
    }
    const requiredEnergyExact = div(mul(mul(load, target), rat(100n, 1n)), dod);
    const requiredEnergyWh = roundToPlaces(requiredEnergyExact, 2);
    const capacityRat = div(mul(requiredEnergyExact, rat(1000n, 1n)), voltage);
    const requiredCapacityMah = Number(ceilDiv(capacityRat.n, capacityRat.d));
    return {
      ok: true,
      result: { mode, status: "ok", requiredEnergyWh, requiredCapacityMah },
    };
  }

  let energy;
  let packVoltage = null;
  let packCapacity = null;
  if (mode === "runtime-mah") {
    energy = div(
      mul(rat(v.capacityMah, MICRO), rat(v.voltage, MICRO)),
      rat(1000n, 1n),
    );
  } else if (mode === "runtime-wh") {
    energy = rat(v.capacityWh, MICRO);
  } else {
    // pack
    packVoltage = mul(rat(v.cellVoltage, MICRO), rat(v.seriesCount, 1n));
    packCapacity = mul(rat(v.cellCapacityMah, MICRO), rat(v.parallelCount, 1n));
    energy = div(mul(packCapacity, packVoltage), rat(1000n, 1n));
  }
  const usable = div(mul(energy, dod), rat(100n, 1n));
  const energyWh = roundToPlaces(energy, 2);
  const usableWh = roundToPlaces(usable, 2);

  const base = { mode, energyWh, usableWh };
  if (mode === "pack") {
    base.packVoltageV = exactToNumber(packVoltage);
    base.packCapacityMah = exactToNumber(packCapacity);
  }
  if (load.n === 0n) {
    return {
      ok: true,
      result: {
        ...base,
        status: "infinite",
        runtimeHours: null,
        runtimeTotalMinutes: null,
        runtimeHoursPart: null,
        runtimeMinutesPart: null,
      },
    };
  }
  const exactHours = div(usable, load);
  const runtimeHours = roundToPlaces(exactHours, 1);
  const runtimeTotalMinutes = Number(roundHalfUp(exactHours.n * 60n, exactHours.d));
  const runtimeHoursPart = Math.floor(runtimeTotalMinutes / 60);
  const runtimeMinutesPart = runtimeTotalMinutes - 60 * runtimeHoursPart;
  return {
    ok: true,
    result: {
      ...base,
      status: "ok",
      runtimeHours,
      runtimeTotalMinutes,
      runtimeHoursPart,
      runtimeMinutesPart,
    },
  };
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): fixed decimals, a dot, no thousands separators.
export function formatNumber(value, places) {
  return value.toFixed(places);
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

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit
// the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
