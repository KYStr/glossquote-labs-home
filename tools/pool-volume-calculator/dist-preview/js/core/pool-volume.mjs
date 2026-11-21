// Pure core for the Pool Volume Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-pool-volume-calculator-
// 20261109): ideal rectangular / circular / oval pools, single or
// sloped (averaged) depth, volume in m^3, litres and US gallons, and
// fill time from a single rounded total-minutes split. All arithmetic
// is IEEE-754 double precision in the SPEC's pinned operation order:
// rectangular V = (length * width) * avg; circular r = diameter / 2,
// V = ((Math.PI * r) * r) * avg; oval a = length / 2, b = width / 2,
// V = ((Math.PI * a) * b) * avg. Every output is rounded half-up
// exactly once from the unrounded volume, never from a displayed value.

export const FIELDS = [
  "shape",
  "depthMode",
  "lengthM",
  "widthM",
  "diameterM",
  "depthM",
  "shallowDepthM",
  "deepDepthM",
  "flowRateLMin",
];

// Maximum raw length per field, in UTF-16 code units (SPEC
// inputsOutputs). shape allows 12 (longest legal value
// "rectangular" is 11, plus 1 headroom); depthMode allows 8
// (longest legal value "sloped" is 6); every numeric field allows 8
// ("10000.00" is exactly 8).
export const RAW_LIMITS = {
  shape: 12,
  depthMode: 8,
  lengthM: 8,
  widthM: 8,
  diameterM: 8,
  depthM: 8,
  shallowDepthM: 8,
  deepDepthM: 8,
  flowRateLMin: 8,
};

export const DEFAULTS = {
  shape: "rectangular",
  depthMode: "single",
  lengthM: "8",
  widthM: "4",
  diameterM: "5",
  depthM: "1.5",
  shallowDepthM: "1",
  deepDepthM: "2",
  flowRateLMin: "40",
};

// The example draft; identical to the default draft by design (SPEC
// userFlow: reset restores the same defaults) and to the
// rect-single-depth fixture input.
export const EXAMPLE = { ...DEFAULTS };

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "pool-volume-report.json";

// 1 US liquid gallon = 3.785411784 L by definition (1959
// international yard and pound agreement); a definitionally exact
// constant, parsed to the nearest double.
export const LITRES_PER_GALLON_US = 3.785411784;
export const LITRES_PER_M3 = 1000;

export const DIMENSION_MIN = 0.1;
export const DIMENSION_MAX = 100;
export const DEPTH_MIN = 0.1;
export const DEPTH_MAX = 10;
export const FLOW_MIN = 0.1;
export const FLOW_MAX = 10000;

// Pinned status announcements (SPEC userFlow state table).
export const STATUS_TEXT = {
  empty: { zh: "請輸入泳池尺寸，或載入範例。", en: "Enter the pool dimensions, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

export const ERROR_MESSAGES = {
  SCHEMA: { zh: "輸入格式不正確。", en: "The input is malformed." },
  INPUT_LIMIT: { zh: "輸入太長。", en: "The input is too long." },
  UNICODE: { zh: "輸入含有不完整的字元。", en: "The input contains an incomplete character." },
  EMPTY: { zh: "此欄必填。", en: "This field is required." },
  ENUM: { zh: "請選擇有效的選項。", en: "Choose a valid option." },
  DECIMAL_FORMAT: { zh: "請輸入最多兩位小數的數字。", en: "Enter a number with at most two decimal places." },
  RANGE: { zh: "數值超出允許範圍。", en: "The value is outside the allowed range." },
  DEPTH_ORDER: { zh: "淺端深度不可大於深端深度。", en: "Shallow-end depth must not exceed deep-end depth." },
  OUTPUT_LIMIT: { zh: "報告超過大小上限。", en: "The report exceeds the size limit." },
  INTERNAL: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
  WORKER_ERROR: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
};

const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

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

// Schema gate only: the input must be a non-null, non-array plain
// object whose own enumerable properties are exactly the nine fields,
// each an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the nine string values, or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
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

// True when the value passes the schema gate only.
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity check shared by every field, in the SPEC's order:
// INPUT_LIMIT first. An inactive field is checked for capacity only:
// the SPEC's per-field rule says an inactive field "is skipped after
// the capacity check" and the tests section pins that a lone surrogate
// in an inactive field "is only capacity-checked, and should pass".
// See HANDOFF.md for the one conflicting sentence (the numbered
// validation order lists UNICODE before the enabled check).
function checkCapacity(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  return null;
}

// Validate one active decimal field: unpaired surrogate (UNICODE),
// then empty (EMPTY), then grammar (DECIMAL_FORMAT), then range
// (RANGE). Returns { ok: true, value } or a field error.
function parseDecimal(raw, field, min, max) {
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  if (raw === "") return fieldError("EMPTY", field);
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const value = Number(raw);
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order shape, depthMode, lengthM, widthM, diameterM, depthM,
// shallowDepthM, deepDepthM, flowRateLMin; the first error wins. An
// inactive field receives only its capacity check and its content is
// otherwise ignored. After all per-field checks, the sloped-depth
// order rule runs before any computation.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacity("shape", values.shape);
  if (failure !== null) return failure;
  if (hasUnpairedSurrogate(values.shape)) return fieldError("UNICODE", "shape");
  if (values.shape === "") return fieldError("EMPTY", "shape");
  if (
    values.shape !== "rectangular" &&
    values.shape !== "circular" &&
    values.shape !== "oval"
  ) {
    return fieldError("ENUM", "shape");
  }
  const shape = values.shape;

  failure = checkCapacity("depthMode", values.depthMode);
  if (failure !== null) return failure;
  if (hasUnpairedSurrogate(values.depthMode)) return fieldError("UNICODE", "depthMode");
  if (values.depthMode === "") return fieldError("EMPTY", "depthMode");
  if (values.depthMode !== "single" && values.depthMode !== "sloped") {
    return fieldError("ENUM", "depthMode");
  }
  const depthMode = values.depthMode;

  const lengthActive = shape === "rectangular" || shape === "oval";
  const widthActive = shape === "rectangular" || shape === "oval";
  const diameterActive = shape === "circular";
  const depthActive = depthMode === "single";
  const slopedActive = depthMode === "sloped";

  let lengthValue = null;
  failure = checkCapacity("lengthM", values.lengthM);
  if (failure !== null) return failure;
  if (lengthActive) {
    const parsed = parseDecimal(values.lengthM, "lengthM", DIMENSION_MIN, DIMENSION_MAX);
    if (!parsed.ok) return parsed;
    lengthValue = parsed.value;
  }

  let widthValue = null;
  failure = checkCapacity("widthM", values.widthM);
  if (failure !== null) return failure;
  if (widthActive) {
    const parsed = parseDecimal(values.widthM, "widthM", DIMENSION_MIN, DIMENSION_MAX);
    if (!parsed.ok) return parsed;
    widthValue = parsed.value;
  }

  let diameterValue = null;
  failure = checkCapacity("diameterM", values.diameterM);
  if (failure !== null) return failure;
  if (diameterActive) {
    const parsed = parseDecimal(values.diameterM, "diameterM", DIMENSION_MIN, DIMENSION_MAX);
    if (!parsed.ok) return parsed;
    diameterValue = parsed.value;
  }

  let depthValue = null;
  failure = checkCapacity("depthM", values.depthM);
  if (failure !== null) return failure;
  if (depthActive) {
    const parsed = parseDecimal(values.depthM, "depthM", DEPTH_MIN, DEPTH_MAX);
    if (!parsed.ok) return parsed;
    depthValue = parsed.value;
  }

  let shallowValue = null;
  failure = checkCapacity("shallowDepthM", values.shallowDepthM);
  if (failure !== null) return failure;
  if (slopedActive) {
    const parsed = parseDecimal(values.shallowDepthM, "shallowDepthM", DEPTH_MIN, DEPTH_MAX);
    if (!parsed.ok) return parsed;
    shallowValue = parsed.value;
  }

  let deepValue = null;
  failure = checkCapacity("deepDepthM", values.deepDepthM);
  if (failure !== null) return failure;
  if (slopedActive) {
    const parsed = parseDecimal(values.deepDepthM, "deepDepthM", DEPTH_MIN, DEPTH_MAX);
    if (!parsed.ok) return parsed;
    deepValue = parsed.value;
  }

  // flowRateLMin is always enabled but optional: an empty string means
  // "not provided" and is legal, skipping the remaining checks.
  let flowValue = null;
  failure = checkCapacity("flowRateLMin", values.flowRateLMin);
  if (failure !== null) return failure;
  if (values.flowRateLMin !== "") {
    const parsed = parseDecimal(values.flowRateLMin, "flowRateLMin", FLOW_MIN, FLOW_MAX);
    if (!parsed.ok) return parsed;
    flowValue = parsed.value;
  }

  // Cross-field check, after all per-field checks: on a sloped floor
  // the shallow end must not exceed the deep end. Equal ends are
  // legal (equivalent to a single depth).
  if (slopedActive && shallowValue > deepValue) {
    return fieldError("DEPTH_ORDER", "deepDepthM");
  }

  return {
    ok: true,
    values: {
      shape,
      depthMode,
      lengthM: lengthValue,
      widthM: widthValue,
      diameterM: diameterValue,
      depthM: depthValue,
      shallowDepthM: shallowValue,
      deepDepthM: deepValue,
      flowRateLMin: flowValue,
    },
  };
}

// Round half-up to d decimal places, applied exactly once to an
// unrounded value (SPEC inputsOutputs step 3). All quantities here
// are > 0, so floor(x * 10^d + 0.5) / 10^d is half-up.
function roundHalfUp(x, d) {
  return Math.floor(x * 10 ** d + 0.5) / 10 ** d;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { shape, depthMode } = validated.values;

  // Average depth: single -> the depth itself; sloped -> add first,
  // then divide by 2, unrounded.
  const avgDepthM =
    depthMode === "single"
      ? validated.values.depthM
      : (validated.values.shallowDepthM + validated.values.deepDepthM) / 2;

  // Unrounded volume V (m^3), pinned operation order, left
  // associative, no regrouping.
  let volume;
  if (shape === "rectangular") {
    volume = (validated.values.lengthM * validated.values.widthM) * avgDepthM;
  } else if (shape === "circular") {
    const r = validated.values.diameterM / 2;
    volume = ((Math.PI * r) * r) * avgDepthM;
  } else {
    const a = validated.values.lengthM / 2;
    const b = validated.values.widthM / 2;
    volume = ((Math.PI * a) * b) * avgDepthM;
  }

  // Each output is rounded exactly once from the unrounded volume.
  // Litres and gallons come from the unrounded litres, never from the
  // displayed m^3 value.
  const volumeM3 = roundHalfUp(volume, 2);
  const litresRaw = volume * LITRES_PER_M3;
  const volumeLitres = roundHalfUp(litresRaw, 0);
  const volumeGallonsUs = roundHalfUp(litresRaw / LITRES_PER_GALLON_US, 0);

  // Fill time, from the unrounded litres and the parsed flow rate:
  // one rounded total-minutes value, split once into hours/minutes,
  // so the minutes part is always 0-59. Empty flow rate -> all four
  // fill fields null.
  const flowRateLMin = validated.values.flowRateLMin;
  let fillTotalMinutes = null;
  let fillHours = null;
  let fillMinutes = null;
  if (flowRateLMin !== null) {
    fillTotalMinutes = roundHalfUp(litresRaw / flowRateLMin, 0);
    fillHours = Math.floor(fillTotalMinutes / 60);
    fillMinutes = fillTotalMinutes - 60 * fillHours;
  }

  const result = {
    shape,
    depthMode,
    avgDepthM,
    volumeM3,
    volumeLitres,
    volumeGallonsUs,
    flowRateLMin,
    fillTotalMinutes,
    fillHours,
    fillMinutes,
  };

  // Report cap backstop (SPEC inputsOutputs): a result over the cap
  // is an OUTPUT_LIMIT error instead of a success. With the pinned
  // ranges a real result is a few hundred bytes, so this never fires
  // for a genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Group an integer's digits with commas (deterministic, locale-free
// display formatting; never feeds back into machine values).
export function formatInteger(value) {
  const text = String(value);
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Display a machine number as written (m^3 / average depth).
export function formatDecimal(value) {
  return String(value);
}

// Fill duration display: "H:MM" from the single rounded total.
export function formatFillDuration(fillHours, fillMinutes) {
  return `${fillHours}:${String(fillMinutes).padStart(2, "0")}`;
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

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
