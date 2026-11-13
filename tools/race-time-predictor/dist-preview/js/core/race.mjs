// Pure core for the Race Time Predictor.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-race-time-predictor-20261109): one known race result (distance +
// finish time) predicts finish times for 5K, 10K, the half marathon and
// the marathon, plus one optional custom target distance, using the
// Riegel formula T2 = T1 * (D2 / D1) ^ 1.06. The precision strategy is
// pinned by the SPEC and followed literally: IEEE-754 doubles, ratio ->
// Math.pow(ratio, 1.06) -> multiply by T1, intermediates never rounded;
// predictedSeconds rounds the raw seconds half-up to a whole second once,
// and each pace is derived from the UNROUNDED raw seconds (never from
// predictedSeconds), rounded half-up to 0.1 s once.

export const FIELDS = ["knownPreset", "knownCustomM", "knownTime", "targetCustomM"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  knownPreset: 8,
  knownCustomM: 12,
  knownTime: 10,
  targetCustomM: 12,
};

export const DEFAULTS = {
  knownPreset: "10k",
  knownCustomM: "",
  knownTime: "",
  targetCustomM: "",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  knownPreset: "10k",
  knownCustomM: "",
  knownTime: "40:00",
  targetCustomM: "",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "race-time-predictor-report.json";

export const RIEGEL_EXPONENT = 1.06;

// Standard distances in metres, pinned as literal constants by the SPEC.
export const PRESET_DISTANCES = {
  "5k": 5000,
  "10k": 10000,
  half: 21097.5,
  marathon: 42195,
};

const PRESET_KEYS = ["5k", "10k", "half", "marathon", "custom"];
const TARGET_KEYS = ["5k", "10k", "half", "marathon"];

// Custom distances (known or target): ASCII decimal, integer part of one
// or more digits, optional fraction of 1-2 digits. No spaces, signs,
// exponents, or grouping separators.
const DISTANCE_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;
// Finish time: M:SS or H:MM:SS. The first segment is 1-3 digits; every
// later segment is exactly two digits.
const TIME_PATTERN = /^[0-9]{1,3}(:[0-9]{2}){1,2}$/;

const DISTANCE_MIN = 400;
const DISTANCE_MAX = 42195;
const TIME_TOTAL_MIN = 10;
const TIME_TOTAL_MAX = 359999;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
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
// exactly the four fields, each an own data property (no accessors)
// holding a string. Anything else is SCHEMA with field/row null.
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

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate a custom distance string that is known to be non-empty:
// grammar (DECIMAL_FORMAT), then range 400-42,195 m (RANGE). The grammar
// guarantees Number() parses the value exactly as written.
function parseDistance(field, raw) {
  if (!DISTANCE_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const value = Number(raw);
  if (value < DISTANCE_MIN || value > DISTANCE_MAX) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the finish-time string (non-empty, grammar already the gate
// here): TIME_FORMAT, then RANGE when a trailing component exceeds 59 or
// the total seconds fall outside 10-359,999.
function parseTime(raw) {
  if (!TIME_PATTERN.test(raw)) return fieldError("TIME_FORMAT", "knownTime");
  const parts = raw.split(":").map(Number);
  const components = parts.slice(1);
  if (components.some((component) => component > 59)) {
    return fieldError("RANGE", "knownTime");
  }
  const total =
    parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (total < TIME_TOTAL_MIN || total > TIME_TOTAL_MAX) {
    return fieldError("RANGE", "knownTime");
  }
  return { ok: true, value: total };
}

// Validate the whole input: schema first, then fields in the fixed order
// knownPreset, knownCustomM, knownTime, targetCustomM; the first error
// wins. knownCustomM is only capacity-checked while its preset is not
// "custom" (its content is then ignored entirely). targetCustomM may be
// empty, which simply means no custom prediction row.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("knownPreset", values.knownPreset);
  if (failure !== null) return failure;
  if (values.knownPreset === "") return fieldError("EMPTY", "knownPreset");
  if (!PRESET_KEYS.includes(values.knownPreset)) return fieldError("ENUM", "knownPreset");
  const preset = values.knownPreset;

  // knownCustomM: capacity is checked in every mode; while another
  // preset is selected all remaining checks are skipped and the content
  // is ignored entirely.
  if (values.knownCustomM.length > RAW_LIMITS.knownCustomM) {
    return fieldError("INPUT_LIMIT", "knownCustomM");
  }
  let knownCustomValue = null;
  if (preset === "custom") {
    if (hasUnpairedSurrogate(values.knownCustomM)) {
      return fieldError("UNICODE", "knownCustomM");
    }
    if (values.knownCustomM === "") return fieldError("EMPTY", "knownCustomM");
    const parsed = parseDistance("knownCustomM", values.knownCustomM);
    if (!parsed.ok) return parsed;
    knownCustomValue = parsed.value;
  }

  failure = checkCapacityAndUnicode("knownTime", values.knownTime);
  if (failure !== null) return failure;
  if (values.knownTime === "") return fieldError("EMPTY", "knownTime");
  const time = parseTime(values.knownTime);
  if (!time.ok) return time;

  failure = checkCapacityAndUnicode("targetCustomM", values.targetCustomM);
  if (failure !== null) return failure;
  let targetCustomValue = null;
  if (values.targetCustomM !== "") {
    const parsed = parseDistance("targetCustomM", values.targetCustomM);
    if (!parsed.ok) return parsed;
    targetCustomValue = parsed.value;
  }

  return {
    ok: true,
    values: {
      knownDistanceM: preset === "custom" ? knownCustomValue : PRESET_DISTANCES[preset],
      knownTimeSeconds: time.value,
      targetCustomM: targetCustomValue,
    },
  };
}

// One prediction row, following the SPEC's pinned operation order:
// ratio = Dt / D1, factor = Math.pow(ratio, 1.06), rawSeconds = T1 *
// factor. predictedSeconds rounds rawSeconds half-up once; the pace
// divides the UNROUNDED rawSeconds by the distance in kilometres and
// rounds half-up to 0.1 s once.
function predictRow(key, distanceM, knownDistanceM, knownTimeSeconds) {
  const ratio = distanceM / knownDistanceM;
  const factor = Math.pow(ratio, RIEGEL_EXPONENT);
  const rawSeconds = knownTimeSeconds * factor;
  return {
    key,
    distanceM,
    predictedSeconds: Math.floor(rawSeconds + 0.5),
    paceSecPerKm: Math.floor((rawSeconds / (distanceM / 1000)) * 10 + 0.5) / 10,
  };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { knownDistanceM, knownTimeSeconds, targetCustomM } = validated.values;

  const predictions = TARGET_KEYS.map((key) =>
    predictRow(key, PRESET_DISTANCES[key], knownDistanceM, knownTimeSeconds),
  );
  if (targetCustomM !== null) {
    predictions.push(predictRow("custom", targetCustomM, knownDistanceM, knownTimeSeconds));
  }

  return {
    ok: true,
    result: {
      knownDistanceM,
      knownTimeSeconds,
      knownPaceSecPerKm:
        Math.floor((knownTimeSeconds / (knownDistanceM / 1000)) * 10 + 0.5) / 10,
      predictions,
    },
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Predicted-time display (app layer, pinned by the SPEC; never feeds back
// into machine values): H:MM:SS at or above one hour, otherwise M:SS.
export function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const rest = seconds - hours * 3600;
    return `${hours}:${pad2(Math.floor(rest / 60))}:${pad2(rest % 60)}`;
  }
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
}

// Pace display: the pace in seconds per kilometre is rounded half-up to a
// whole second once more, then shown as M:SS (minutes are not carried
// into hours for a pace).
export function formatPace(paceSecPerKm) {
  const total = Math.floor(paceSecPerKm + 0.5);
  return `${Math.floor(total / 60)}:${pad2(total % 60)}`;
}

// Distance display for the table: thousands grouped, the half marathon's
// single decimal kept, integers without a fraction.
export function formatDistanceM(distanceM) {
  const text = String(distanceM);
  const [whole, fraction] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
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
