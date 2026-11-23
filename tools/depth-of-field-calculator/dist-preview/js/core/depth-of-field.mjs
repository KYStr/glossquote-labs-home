// Pure core for the Depth of Field Calculator
// (spec-depth-of-field-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. The
// formulas are the SPEC's pinned thin-lens rules (Wikipedia,
// Hyperfocal distance):
//   H  = f^2 / (N * c) + f
//   Dn = s * (H - f) / (H + s - 2f)
//   Df = s * (H - f) / (H - s); s >= H gives an infinite far limit
//   DoF = Df - Dn (from the unrounded values, then rounded once)
// All lengths are computed in mm, outputs are metres rounded
// half-up (away from zero at .5) to 3 decimals, once, at output.
// The result shape follows fixtures.json exactly:
// {focalLengthMm, aperture, focusDistanceM, sensor, cocMm,
//  hyperfocalM, nearLimitM, farLimitM, farLimitInfinite, totalDofM}.
// The CoC table is the SPEC's literal d/1500 table (Wikipedia,
// Circle of confusion), eight rows verbatim. The 44x33 digital
// medium format is NOT in that table and must use `custom`.

export const FIELDS = [
  "focalLengthMm",
  "aperture",
  "focusDistanceM",
  "sensor",
  "cocMm",
];

export const DEFAULTS = {
  focalLengthMm: "50",
  aperture: "8",
  focusDistanceM: "3",
  sensor: "full-frame",
  cocMm: "",
};

// The worked example is fixtures.json case 1
// (full-frame-50mm-f8-3m) input, vendored verbatim in
// test/fixtures.json. It happens to equal the SPEC defaults.
export const EXAMPLE = {
  focalLengthMm: "50",
  aperture: "8",
  focusDistanceM: "3",
  sensor: "full-frame",
  cocMm: "",
};

// Pinned CoC table (SPEC inputsOutputs, d/1500): sensor id,
// format size, CoC mm. Values are verbatim from the SPEC table.
export const COC_TABLE = {
  "1-inch": { labelZh: "1 吋", labelEn: "1-inch", sizeMm: "13.2 × 8.8", cocMm: 0.011 },
  "four-thirds": { labelZh: "四三系統", labelEn: "Four Thirds", sizeMm: "18 × 13.5", cocMm: 0.015 },
  "aps-c": { labelZh: "APS-C", labelEn: "APS-C", sizeMm: "22.5 × 15.0", cocMm: 0.018 },
  "aps-c-canon": { labelZh: "APS-C（Canon）", labelEn: "APS-C (Canon)", sizeMm: "22.2 × 14.8", cocMm: 0.018 },
  "aps-c-nikon": { labelZh: "APS-C（Nikon）", labelEn: "APS-C (Nikon)", sizeMm: "23.6 × 15.7", cocMm: 0.019 },
  "aps-h": { labelZh: "APS-H", labelEn: "APS-H", sizeMm: "28.7 × 19.0", cocMm: 0.023 },
  "full-frame": { labelZh: "全片幅", labelEn: "Full frame", sizeMm: "36 × 24", cocMm: 0.029 },
  "medium-645": { labelZh: "645", labelEn: "645", sizeMm: "56 × 42", cocMm: 0.047 },
};

export const SENSORS = [...Object.keys(COC_TABLE), "custom"];

// Per-field decimal rules from the SPEC: raw capacity in UTF-16
// units, maximum decimals, numeric range.
export const DECIMAL_RULES = {
  focalLengthMm: { maxRawUnits: 8, maxDecimals: 2, min: 1, max: 2000 },
  aperture: { maxRawUnits: 8, maxDecimals: 2, min: 0.5, max: 64 },
  focusDistanceM: { maxRawUnits: 10, maxDecimals: 3, min: 0.05, max: 10000 },
  cocMm: { maxRawUnits: 8, maxDecimals: 3, min: 0.001, max: 1 },
};

// Decimal grammar: no sign, no whitespace, no exponent; at most one
// decimal point; at least one digit in the integer part; digits on
// both sides of the point when a point is present.
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the five
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

// Per-field decimal validation in the SPEC's order: capacity,
// empty, grammar (including the decimal-places limit), range.
// Returns the parsed number or an { error } outcome.
function validateDecimal(field, value) {
  const rule = DECIMAL_RULES[field];
  if (value.length > rule.maxRawUnits) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const dot = value.indexOf(".");
  if (dot !== -1 && value.length - dot - 1 > rule.maxDecimals) {
    return { error: failure("DECIMAL_FORMAT", field) };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < rule.min || parsed > rule.max) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

// Exact integer thousandths of a validated decimal string (at most
// 3 decimals, so the scaled value is an exact integer). Used for the
// cross-field comparison and the focus distance in mm, so a boundary
// such as s == f or s == H is never decided by binary float noise.
function scaledThousandths(value) {
  const dot = value.indexOf(".");
  if (dot === -1) return Number(value) * 1000;
  const whole = value.slice(0, dot);
  const fraction = value.slice(dot + 1).padEnd(3, "0");
  return Number(whole) * 1000 + Number(fraction);
}

// Round half-up (away from zero at .5) to 3 decimals. All values
// rounded here are non-negative, so floor(x * 1000 + 0.5) / 1000 is
// the half-up rule.
function roundHalfUp3(value) {
  return Math.floor(value * 1000 + 0.5) / 1000;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of ["focalLengthMm", "aperture", "focusDistanceM"]) {
    const outcome = validateDecimal(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }

  // sensor is an enum string: anything outside the enum is SCHEMA
  // with field=sensor (this includes the empty string).
  if (!SENSORS.includes(raw.sensor)) return failure("SCHEMA", "sensor");
  checked.sensor = raw.sensor;

  // cocMm is validated only for `custom`; for a table sensor the
  // field is ignored entirely, even when filled.
  let cocMm;
  if (raw.sensor === "custom") {
    const outcome = validateDecimal("cocMm", raw.cocMm);
    if (outcome.error) return outcome.error;
    cocMm = outcome.value;
  } else {
    cocMm = COC_TABLE[raw.sensor].cocMm;
  }

  // Cross-field, last: focus distance must exceed the focal length
  // (same-unit comparison, in mm, exact integer thousandths:
  // focusMm is an exact integer number of mm, and the focal length
  // is rounded to integer thousandths of a mm first).
  const focusMm = scaledThousandths(raw.focusDistanceM);
  const focalMmThousandths = Math.round(checked.focalLengthMm * 1000);
  if (focusMm * 1000 <= focalMmThousandths) return failure("RANGE", "focusDistanceM");

  const f = checked.focalLengthMm;
  const n = checked.aperture;
  const s = focusMm;
  const c = cocMm;
  const hyperfocalMm = (f * f) / (n * c) + f;
  const nearMm = (s * (hyperfocalMm - f)) / (hyperfocalMm + s - 2 * f);
  const farInfinite = s >= hyperfocalMm;
  const farMm = farInfinite ? null : (s * (hyperfocalMm - f)) / (hyperfocalMm - s);
  const dofMm = farInfinite ? null : farMm - nearMm;

  return {
    ok: true,
    result: {
      focalLengthMm: checked.focalLengthMm,
      aperture: checked.aperture,
      focusDistanceM: checked.focusDistanceM,
      sensor: checked.sensor,
      cocMm,
      hyperfocalM: roundHalfUp3(hyperfocalMm / 1000),
      nearLimitM: roundHalfUp3(nearMm / 1000),
      farLimitM: farMm === null ? null : roundHalfUp3(farMm / 1000),
      farLimitInfinite: farInfinite,
      totalDofM: dofMm === null ? null : roundHalfUp3(dofMm / 1000),
    },
  };
}

// Fixed report download: depth-of-field-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, finite numbers in plain decimal form,
// strings, arrays, plain objects).
export const REPORT_FILENAME = "depth-of-field-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

const PLAIN_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    const text = String(value);
    if (!PLAIN_NUMBER_PATTERN.test(text)) {
      throw new Error("report numbers must serialize in plain decimal form");
    }
    return text;
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
