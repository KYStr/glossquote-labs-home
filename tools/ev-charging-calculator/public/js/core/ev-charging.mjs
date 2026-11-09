// Pure core for the EV Charging Calculator.
// Implements spec-ev-charging-calculator-20261109 exactly: strict string
// schema, fixed validation order, exact BigInt rational arithmetic, and
// round-half-up applied once per output at the very end.

export const FIELD_ORDER = Object.freeze([
  "capacityKwh",
  "currentSoc",
  "targetSoc",
  "chargerPowerKw",
  "efficiencyPct",
  "pricePerKwh",
]);

export const DEFAULT_INPUT = Object.freeze({
  capacityKwh: "60",
  currentSoc: "20",
  targetSoc: "80",
  chargerPowerKw: "7",
  efficiencyPct: "90",
  pricePerKwh: "",
});

export const REPORT_FILENAME = "ev-charging-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

const MAX_RAW_LENGTH = 12;
const DECIMAL_RE = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;

// kind: "decimal" values are kept as integer hundredths (BigInt).
// min/max are expressed in the parsed unit (hundredths for decimals,
// plain integers for integers). minExclusive models a "> min" bound.
const FIELD_RULES = Object.freeze({
  capacityKwh: { kind: "decimal", min: 0n, minExclusive: true, max: 50000n },
  currentSoc: { kind: "integer", min: 0n, minExclusive: false, max: 100n },
  targetSoc: { kind: "integer", min: 0n, minExclusive: false, max: 100n },
  chargerPowerKw: { kind: "decimal", min: 0n, minExclusive: true, max: 100000n },
  efficiencyPct: { kind: "integer", min: 50n, minExclusive: false, max: 100n },
  pricePerKwh: { kind: "decimal", min: 0n, minExclusive: false, max: 10000n, optional: true },
});

function failure(code, field) {
  return { ok: false, error: { code, field: field ?? null, row: null } };
}

function hasLoneSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Reads only own data properties; accessors or non-string values are SCHEMA.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELD_ORDER.length) return null;
  const values = {};
  for (const field of FIELD_ORDER) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

function parseDecimalHundredths(text) {
  const dot = text.indexOf(".");
  if (dot === -1) return BigInt(text) * 100n;
  const whole = text.slice(0, dot);
  const fraction = (text.slice(dot + 1) + "0").slice(0, 2);
  return BigInt(whole) * 100n + BigInt(fraction);
}

// Round half-up of the non-negative rational numerator/denominator.
function roundHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Formats a non-negative rational kWh value as a string with exactly
// two decimal places, rounded half-up once from the exact value.
function formatKwh(numerator, denominator) {
  const hundredths = roundHalfUp(numerator * 100n, denominator);
  const whole = hundredths / 100n;
  const fraction = hundredths % 100n;
  return `${whole}.${fraction.toString().padStart(2, "0")}`;
}

export function run(input) {
  const values = readSchema(input);
  if (values === null) return failure("SCHEMA", null);

  const parsed = {};
  for (const field of FIELD_ORDER) {
    const rule = FIELD_RULES[field];
    const raw = values[field];
    if (raw.length > MAX_RAW_LENGTH) return failure("INPUT_LIMIT", field);
    if (hasLoneSurrogate(raw)) return failure("UNICODE", field);
    if (raw === "") {
      if (rule.optional) {
        parsed[field] = null;
        continue;
      }
      return failure("EMPTY", field);
    }
    if (rule.kind === "decimal") {
      if (!DECIMAL_RE.test(raw)) return failure("DECIMAL_FORMAT", field);
      parsed[field] = parseDecimalHundredths(raw);
    } else {
      if (!INTEGER_RE.test(raw)) return failure("INTEGER_FORMAT", field);
      parsed[field] = BigInt(raw);
    }
    const value = parsed[field];
    if ((rule.minExclusive ? value <= rule.min : value < rule.min) || value > rule.max) {
      return failure("RANGE", field);
    }
  }

  const currentSoc = Number(parsed.currentSoc);
  const targetSoc = Number(parsed.targetSoc);
  if (targetSoc < currentSoc) return failure("SOC_ORDER", "targetSoc");

  const delta = BigInt(targetSoc - currentSoc);
  const capacityHundredths = parsed.capacityKwh;
  const efficiency = parsed.efficiencyPct;
  const powerHundredths = parsed.chargerPowerKw;

  // batteryExact = capacityKwh * delta / 100
  // wallExact    = batteryExact * 100 / efficiencyPct
  //              = capacityHundredths * delta / (100 * efficiencyPct)
  const wallNumerator = capacityHundredths * delta;
  const wallDenominator = 100n * efficiency;

  const energyBatteryKwh = formatKwh(capacityHundredths * delta, 10000n);
  const energyWallKwh = formatKwh(wallNumerator, wallDenominator);

  // timeMinutesExact = wallExact / chargerPowerKw * 60
  //                  = capacityHundredths * delta * 60 / (efficiencyPct * powerHundredths)
  const timeMinutes = Number(
    roundHalfUp(capacityHundredths * delta * 60n, efficiency * powerHundredths),
  );

  let cost = null;
  if (parsed.pricePerKwh !== null) {
    // costExact = wallExact * pricePerKwh
    cost = Number(
      roundHalfUp(wallNumerator * parsed.pricePerKwh, wallDenominator * 100n),
    );
  }

  return {
    ok: true,
    result: {
      needsCharge: delta > 0n,
      energyBatteryKwh,
      energyWallKwh,
      timeMinutes,
      cost,
    },
  };
}

// "h 小時 rr 分" / "r 分" for zh-Hant; "h h rr min" / "r min" for en.
export function formatDuration(timeMinutes, locale) {
  const total = Number(timeMinutes);
  const hours = Math.floor(total / 60);
  const rest = total - hours * 60;
  const restPadded = String(rest).padStart(2, "0");
  if (locale === "en") {
    return hours > 0 ? `${hours} h ${restPadded} min` : `${rest} min`;
  }
  return hours > 0 ? `${hours} 小時 ${restPadded} 分` : `${rest} 分`;
}

// Recursively rebuilds a value with object keys sorted ascending by
// UTF-16 code units, without ever calling the input's toJSON.
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

// Fixed download: compact JSON, recursively sorted keys, one trailing LF,
// UTF-8 without BOM, capped at REPORT_LIMIT_BYTES.
export function buildReport(result) {
  const text = `${JSON.stringify(sortKeysDeep(result))}\n`;
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength: bytes.byteLength };
}
