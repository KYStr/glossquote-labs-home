// Pure core for the Feels-Like Temperature Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-feels-like-temperature-20261109): one input group (air temperature
// °C, wind speed km/h, relative humidity %) -> exactly one model chosen by
// its official domain -> feels-like temperature in °C at 1 decimal.
//
// Models (constants pinned by the SPEC from primary sources):
// - wind chill (Environment Canada / NWS 2001): T <= 10 °C and v > 4.8 km/h.
// - heat index (Rothfusz regression, NWS SR 90-23, plus the two standard
//   adjustments): this tool's domain is T >= 27 °C and RH >= 40 %. The
//   low-humidity adjustment (R < 13) can never fire inside that domain; it
//   is implemented anyway to stay faithful to the NWS definition. The NWS
//   Steadman simple-formula pre-check is omitted: inside the domain it
//   always selects the regression branch (proof in the SPEC's
//   AUTHOR-CHECK.md), so the omission changes no in-domain result.
// - otherwise the actual temperature itself, model "actual", no adjustment.
//
// Everything is IEEE-754 double arithmetic in the SPEC's pinned order, and
// the pinned rounding r(x) = floor(x * 10 + 0.5) / 10 is applied exactly
// once, at output. No clamping anywhere: near its lower corner the heat
// index regression legitimately reads slightly below the air temperature.

export const FIELDS = ["temperature", "windSpeed", "humidity"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  temperature: 6,
  windSpeed: 5,
  humidity: 5,
};

export const DEFAULTS = {
  temperature: "22",
  windSpeed: "10",
  humidity: "60",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  temperature: "-15",
  windSpeed: "20",
  humidity: "50",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "feels-like-report.json";

// Decimal grammar: temperature may carry a leading minus; wind speed and
// humidity may not. At most one decimal place; no "+", no ".5", no "5.",
// no whitespace, no exponent.
const TEMPERATURE_PATTERN = /^-?[0-9]+(\.[0-9])?$/;
const PLAIN_PATTERN = /^[0-9]+(\.[0-9])?$/;
const PATTERNS = {
  temperature: TEMPERATURE_PATTERN,
  windSpeed: PLAIN_PATTERN,
  humidity: PLAIN_PATTERN,
};

// Inclusive numeric ranges.
const RANGES = {
  temperature: [-60, 60],
  windSpeed: [0, 300],
  humidity: [0, 100],
};

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

// Schema gate: the input must be a plain object whose own properties are
// exactly the three fields, each an own data property (no accessors)
// holding a string. Anything else — unknown or missing keys, wrong types,
// getters, proxies that throw — is SCHEMA with field/row null.
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
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT), unpaired
// surrogate (UNICODE), missing content (EMPTY), grammar (DECIMAL_FORMAT),
// range (RANGE). Returns null when valid, otherwise the error.
function validateField(field, raw) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (!PATTERNS[field].test(raw)) {
    return { code: "DECIMAL_FORMAT", field, row: null };
  }
  const value = Number(raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input: schema first, then fields in the fixed order
// temperature, windSpeed, humidity; the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  const parsed = {};
  for (const field of FIELDS) parsed[field] = Number(values[field]);
  return { ok: true, values: parsed };
}

// The SPEC's pinned rounding: half-up (ties toward positive infinity) to
// one decimal, applied once at output.
function round1(x) {
  return Math.floor(x * 10 + 0.5) / 10;
}

// Wind chill, T in °C and v in km/h:
// WC = 13.12 + 0.6215*T - 11.37*v^0.16 + 0.3965*T*v^0.16
function windChillC(T, v) {
  const vp = Math.pow(v, 0.16);
  return 13.12 + 0.6215 * T - 11.37 * vp + 0.3965 * T * vp;
}

// Heat index: convert to °F in the pinned order (T * 9 / 5 + 32), run the
// Rothfusz regression with squares written as multiplications, apply at
// most one of the two NWS adjustments in order, convert back with
// (HI - 32) * 5 / 9.
function heatIndexC(T, R) {
  const TF = (T * 9) / 5 + 32;
  let HI =
    -42.379 +
    2.04901523 * TF +
    10.14333127 * R -
    0.22475541 * TF * R -
    0.00683783 * TF * TF -
    0.05481717 * R * R +
    0.00122874 * TF * TF * R +
    0.00085282 * TF * R * R -
    0.00000199 * TF * TF * R * R;
  // Low-humidity adjustment: unreachable inside this tool's domain
  // (R >= 40), kept so the formula matches the NWS text verbatim.
  if (R < 13 && TF >= 80 && TF <= 112) {
    HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(TF - 95)) / 17);
  }
  // High-humidity adjustment.
  if (R > 85 && TF >= 80 && TF <= 87) {
    HI += ((R - 85) / 10) * ((87 - TF) / 5);
  }
  return ((HI - 32) * 5) / 9;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { temperature: T, windSpeed: v, humidity: R } = validated.values;

  // Model selection, in the SPEC's pinned order; the two domains are
  // disjoint (T <= 10 vs T >= 27), so exactly one branch can apply.
  // Boundary semantics: wind chill takes T <= 10 and v strictly > 4.8;
  // heat index takes T >= 27 and RH >= 40.
  let model;
  let feelsRaw;
  if (T <= 10 && v > 4.8) {
    model = "wind-chill";
    feelsRaw = windChillC(T, v);
  } else if (T >= 27 && R >= 40) {
    model = "heat-index";
    feelsRaw = heatIndexC(T, R);
  } else {
    model = "actual";
    feelsRaw = T;
  }

  return {
    ok: true,
    result: {
      model,
      feelsLikeC: round1(feelsRaw),
      deltaC: round1(feelsRaw - T),
    },
  };
}

// Display formatting (never feeds back into machine values, and never
// changes with locale): feelsLikeC/deltaC already carry exactly one
// decimal of information; render them with exactly one decimal digit.
export function formatTemp(value) {
  return value.toFixed(1);
}

// Delta with an explicit sign for non-zero values: 5 -> "+5.0",
// -9.2 -> "-9.2", 0 -> "0.0".
export function formatDelta(value) {
  if (value > 0) return `+${value.toFixed(1)}`;
  return value.toFixed(1);
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON calls.
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
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit the
// result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
