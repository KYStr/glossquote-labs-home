// Pure core for the Baking Pan Converter.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-baking-pan-converter-20261109):
// the factor between two pans is the ratio of their capacities
// (target volume ÷ source volume), computed from the unrounded volumes
// and rounded half-up exactly once per displayed value. Table volumes
// are pinned integer constants; custom round volumes use IEEE-754
// double precision with pi = Math.PI and the pinned operation order
// ((pi x r) x r) x depth, r = diameter / 2; custom rectangular volumes
// are (length x width) x depth. Bundt and tube rows are nominal
// capacities (12 / 16 cups at the chart's own 1 cup = 237 ml), not
// geometric values.

export const FIELDS = [
  "sourceKind",
  "sourcePan",
  "sourceShape",
  "sourceD1",
  "sourceD2",
  "sourceDepth",
  "targetKind",
  "targetPan",
  "targetShape",
  "targetD1",
  "targetD2",
  "targetDepth",
  "quantity",
  "quantityUnit",
];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  sourceKind: 8,
  sourcePan: 12,
  sourceShape: 8,
  sourceD1: 8,
  sourceD2: 8,
  sourceDepth: 8,
  targetKind: 8,
  targetPan: 12,
  targetShape: 8,
  targetD1: 8,
  targetD2: 8,
  targetDepth: 8,
  quantity: 10,
  quantityUnit: 4,
};

export const DEFAULTS = {
  sourceKind: "table",
  sourcePan: "round-8",
  sourceShape: "round",
  sourceD1: "",
  sourceD2: "",
  sourceDepth: "",
  targetKind: "table",
  targetPan: "round-9",
  targetShape: "round",
  targetD1: "",
  targetD2: "",
  targetDepth: "",
  quantity: "",
  quantityUnit: "g",
};

// The example draft: the first fixture case's input.
export const EXAMPLE = {
  sourceKind: "table",
  sourcePan: "round-8",
  sourceShape: "round",
  sourceD1: "",
  sourceD2: "",
  sourceDepth: "",
  targetKind: "table",
  targetPan: "round-9",
  targetShape: "round",
  targetD1: "",
  targetD2: "",
  targetDepth: "",
  quantity: "500",
  quantityUnit: "g",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "baking-pan-report.json";

// Pinned pan table (SPEC inputsOutputs). Dimensions are the nominal
// inch values converted at exactly 1 inch = 2.54 cm; geometric volumes
// are the pinned integer millilitres derived from those dimensions
// (see AUTHOR-CHECK); nominal rows use the standard conversion chart's
// labelled capacity at its own 1 cup = 237 ml (12 cups = 2844 ml,
// 16 cups = 3792 ml) and have no comparable depth.
export const PAN_TABLE = [
  {
    id: "round-6",
    nameZh: "圓形 6 吋",
    nameEn: "6-inch round",
    sizeIn: "⌀6 × 2",
    sizeCm: "⌀15.24 × 5.08",
    depthCm: 5.08,
    volumeMl: 927,
    basis: "geometric",
  },
  {
    id: "round-7",
    nameZh: "圓形 7 吋",
    nameEn: "7-inch round",
    sizeIn: "⌀7 × 2",
    sizeCm: "⌀17.78 × 5.08",
    depthCm: 5.08,
    volumeMl: 1261,
    basis: "geometric",
  },
  {
    id: "round-8",
    nameZh: "圓形 8 吋",
    nameEn: "8-inch round",
    sizeIn: "⌀8 × 2",
    sizeCm: "⌀20.32 × 5.08",
    depthCm: 5.08,
    volumeMl: 1647,
    basis: "geometric",
  },
  {
    id: "round-9",
    nameZh: "圓形 9 吋",
    nameEn: "9-inch round",
    sizeIn: "⌀9 × 2",
    sizeCm: "⌀22.86 × 5.08",
    depthCm: 5.08,
    volumeMl: 2085,
    basis: "geometric",
  },
  {
    id: "round-10",
    nameZh: "圓形 10 吋",
    nameEn: "10-inch round",
    sizeIn: "⌀10 × 2",
    sizeCm: "⌀25.40 × 5.08",
    depthCm: 5.08,
    volumeMl: 2574,
    basis: "geometric",
  },
  {
    id: "square-8",
    nameZh: "方形 8×8 吋",
    nameEn: "8×8-inch square",
    sizeIn: "8×8 × 2",
    sizeCm: "20.32×20.32 × 5.08",
    depthCm: 5.08,
    volumeMl: 2098,
    basis: "geometric",
  },
  {
    id: "square-9",
    nameZh: "方形 9×9 吋",
    nameEn: "9×9-inch square",
    sizeIn: "9×9 × 2",
    sizeCm: "22.86×22.86 × 5.08",
    depthCm: 5.08,
    volumeMl: 2655,
    basis: "geometric",
  },
  {
    id: "rect-9x13",
    nameZh: "長方形 9×13 吋",
    nameEn: "9×13-inch rectangular",
    sizeIn: "9×13 × 2",
    sizeCm: "22.86×33.02 × 5.08",
    depthCm: 5.08,
    volumeMl: 3835,
    basis: "geometric",
  },
  {
    id: "loaf-9x5",
    nameZh: "吐司／磅蛋糕模 9×5 吋",
    nameEn: "9×5-inch loaf",
    sizeIn: "9×5 × 2.5",
    sizeCm: "22.86×12.70 × 6.35",
    depthCm: 6.35,
    volumeMl: 1844,
    basis: "geometric",
  },
  {
    id: "bundt-10",
    nameZh: "Bundt 模 10 吋（標稱 12 杯）",
    nameEn: "10-inch Bundt (nominal 12 cups)",
    sizeIn: "10 × 3.5",
    sizeCm: "—",
    depthCm: null,
    volumeMl: 2844,
    basis: "nominal",
  },
  {
    id: "tube-10",
    nameZh: "中空蛋糕模 10 吋（標稱 16 杯）",
    nameEn: "10-inch tube (nominal 16 cups)",
    sizeIn: "10 × 4",
    sizeCm: "—",
    depthCm: null,
    volumeMl: 3792,
    basis: "nominal",
  },
];

export const PAN_IDS = PAN_TABLE.map((row) => row.id);

export const PAN_BY_ID = Object.fromEntries(PAN_TABLE.map((row) => [row.id, row]));

export const BASIS_LABELS = {
  geometric: { zh: "幾何計算", en: "Geometric" },
  nominal: { zh: "標稱容量", en: "Nominal" },
};

export const DEPTH_RELATION_LABELS = {
  shallower: { zh: "較淺", en: "Shallower" },
  deeper: { zh: "較深", en: "Deeper" },
  same: { zh: "相同", en: "Same depth" },
  unknown: { zh: "未知", en: "Unknown" },
};

// Pinned status announcements (SPEC userFlow).
export const STATUS_TEXT = {
  empty: { zh: "請輸入來源與目標烤盤，或載入範例。", en: "Enter a source and a target pan, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "換算完成", en: "Conversion complete" },
  error: { zh: "無法換算，請檢查輸入", en: "Cannot convert — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

export const DIMENSION_MIN_CM = 5;
export const DIMENSION_MAX_CM = 60;
export const DEPTH_MIN_CM = 1;
export const DEPTH_MAX_CM = 15;
export const QUANTITY_MAX = 100000;

// ASCII decimal grammar (SPEC inputsOutputs): integer part `0` or a
// non-zero-leading digit string, optionally `.` plus 1-2 digits. No
// sign, spaces, thousands separators, or exponents.
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

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

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable properties are exactly the fourteen fields, each
// an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the fourteen string values, or null.
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

// True when the value passes the schema gate only (used to decide
// whether a draft may be restored).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity check every field receives, active or not (SPEC: an
// inactive field is checked for INPUT_LIMIT only; all other checks are
// skipped even for garbage content).
function checkCapacity(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  return null;
}

// Validate an active decimal field (non-empty already established by
// the caller): grammar (DECIMAL_FORMAT), then range (RANGE).
function parseDecimal(raw, field, min, max) {
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const value = Number(raw);
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate one side ("source" or "target") in the SPEC's fixed field
// order: kind, pan, shape, D1, D2, depth. Returns the first error, or
// the side's parsed values.
function validateSide(values, prefix) {
  const kindField = `${prefix}Kind`;
  const panField = `${prefix}Pan`;
  const shapeField = `${prefix}Shape`;
  const d1Field = `${prefix}D1`;
  const d2Field = `${prefix}D2`;
  const depthField = `${prefix}Depth`;

  let failure = checkCapacity(kindField, values[kindField]);
  if (failure !== null) return failure;
  if (hasUnpairedSurrogate(values[kindField])) return fieldError("UNICODE", kindField);
  if (values[kindField] === "") return fieldError("EMPTY", kindField);
  if (values[kindField] !== "table" && values[kindField] !== "custom") {
    return fieldError("ENUM", kindField);
  }
  const kind = values[kindField];

  failure = checkCapacity(panField, values[panField]);
  if (failure !== null) return failure;
  if (kind === "table") {
    if (hasUnpairedSurrogate(values[panField])) return fieldError("UNICODE", panField);
    if (values[panField] === "") return fieldError("EMPTY", panField);
    if (!PAN_IDS.includes(values[panField])) return fieldError("ENUM", panField);
  }

  failure = checkCapacity(shapeField, values[shapeField]);
  if (failure !== null) return failure;
  let shape = null;
  if (kind === "custom") {
    if (hasUnpairedSurrogate(values[shapeField])) return fieldError("UNICODE", shapeField);
    if (values[shapeField] === "") return fieldError("EMPTY", shapeField);
    if (values[shapeField] !== "round" && values[shapeField] !== "rect") {
      return fieldError("ENUM", shapeField);
    }
    shape = values[shapeField];
  }

  failure = checkCapacity(d1Field, values[d1Field]);
  if (failure !== null) return failure;
  let d1 = null;
  if (kind === "custom") {
    if (hasUnpairedSurrogate(values[d1Field])) return fieldError("UNICODE", d1Field);
    if (values[d1Field] === "") return fieldError("EMPTY", d1Field);
    const parsed = parseDecimal(values[d1Field], d1Field, DIMENSION_MIN_CM, DIMENSION_MAX_CM);
    if (!parsed.ok) return parsed;
    d1 = parsed.value;
  }

  failure = checkCapacity(d2Field, values[d2Field]);
  if (failure !== null) return failure;
  let d2 = null;
  if (kind === "custom" && shape === "rect") {
    if (hasUnpairedSurrogate(values[d2Field])) return fieldError("UNICODE", d2Field);
    if (values[d2Field] === "") return fieldError("EMPTY", d2Field);
    const parsed = parseDecimal(values[d2Field], d2Field, DIMENSION_MIN_CM, DIMENSION_MAX_CM);
    if (!parsed.ok) return parsed;
    d2 = parsed.value;
  }

  failure = checkCapacity(depthField, values[depthField]);
  if (failure !== null) return failure;
  let depth = null;
  if (kind === "custom") {
    if (hasUnpairedSurrogate(values[depthField])) return fieldError("UNICODE", depthField);
    if (values[depthField] === "") return fieldError("EMPTY", depthField);
    const parsed = parseDecimal(values[depthField], depthField, DEPTH_MIN_CM, DEPTH_MAX_CM);
    if (!parsed.ok) return parsed;
    depth = parsed.value;
  }

  return { ok: true, values: { kind, pan: kind === "table" ? values[panField] : null, shape, d1, d2, depth } };
}

// Validate the whole input: schema first, then the source side, the
// target side, quantity, and quantityUnit in the SPEC's fixed field
// order; the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  const source = validateSide(values, "source");
  if (!source.ok) return source;
  const target = validateSide(values, "target");
  if (!target.ok) return target;

  let failure = checkCapacity("quantity", values.quantity);
  if (failure !== null) return failure;
  let quantityValue = null;
  if (values.quantity !== "") {
    if (hasUnpairedSurrogate(values.quantity)) return fieldError("UNICODE", "quantity");
    if (!DECIMAL_PATTERN.test(values.quantity)) {
      return fieldError("DECIMAL_FORMAT", "quantity");
    }
    quantityValue = Number(values.quantity);
    if (!(quantityValue > 0) || quantityValue > QUANTITY_MAX) {
      return fieldError("RANGE", "quantity");
    }
  }

  failure = checkCapacity("quantityUnit", values.quantityUnit);
  if (failure !== null) return failure;
  if (values.quantity !== "") {
    if (hasUnpairedSurrogate(values.quantityUnit)) {
      return fieldError("UNICODE", "quantityUnit");
    }
    if (values.quantityUnit === "") return fieldError("EMPTY", "quantityUnit");
    if (values.quantityUnit !== "g" && values.quantityUnit !== "ml") {
      return fieldError("ENUM", "quantityUnit");
    }
  }

  return {
    ok: true,
    values: {
      source: source.values,
      target: target.values,
      quantity: quantityValue,
      quantityUnit: values.quantity === "" ? null : values.quantityUnit,
    },
  };
}

// Round half up to p decimal places, applied exactly once per displayed
// value (SPEC implementation).
export function roundHalfUp(value, places) {
  const scale = 10 ** places;
  return Math.floor(value * scale + 0.5) / scale;
}

// Format a rounded value with exactly `places` decimal digits.
export function formatFixed(value, places) {
  return roundHalfUp(value, places).toFixed(places);
}

// Display-only conversion: centimetres to inches (cm / 2.54, rounded
// half-up to 2 places). Never feeds back into a core result.
export function cmToInchesDisplay(cm) {
  return formatFixed(cm / 2.54, 2);
}

// Exact (unrounded) volume in millilitres for one validated side, and
// its display depth in centimetres (null for nominal rows).
function sideVolume(side) {
  if (side.kind === "table") {
    const row = PAN_BY_ID[side.pan];
    return { exact: row.volumeMl, depthCm: row.depthCm, basis: row.basis };
  }
  let exact;
  if (side.shape === "round") {
    const r = side.d1 / 2;
    exact = ((Math.PI * r) * r) * side.depth;
  } else {
    exact = (side.d1 * side.d2) * side.depth;
  }
  return { exact, depthCm: side.depth, basis: "geometric" };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { source, target, quantity, quantityUnit } = validated.values;

  const sourceVolume = sideVolume(source);
  const targetVolume = sideVolume(target);

  // Factor and percent derive from the unrounded volumes, each rounded
  // once; scaledQuantity derives from the unrounded factor, never from
  // the rounded factor or the rounded display volumes.
  const factor = targetVolume.exact / sourceVolume.exact;
  const percent = factor * 100;

  const sourceOut = {
    basis: sourceVolume.basis,
    depthCm: sourceVolume.depthCm === null ? null : sourceVolume.depthCm.toFixed(2),
    kind: source.kind,
    pan: source.pan,
    shape: source.shape,
    volumeMl: roundHalfUp(sourceVolume.exact, 0),
  };
  const targetOut = {
    basis: targetVolume.basis,
    depthCm: targetVolume.depthCm === null ? null : targetVolume.depthCm.toFixed(2),
    kind: target.kind,
    pan: target.pan,
    shape: target.shape,
    volumeMl: roundHalfUp(targetVolume.exact, 0),
  };

  let depthRelation;
  if (sourceVolume.depthCm === null || targetVolume.depthCm === null) {
    depthRelation = "unknown";
  } else if (targetVolume.depthCm < sourceVolume.depthCm) {
    depthRelation = "shallower";
  } else if (targetVolume.depthCm > sourceVolume.depthCm) {
    depthRelation = "deeper";
  } else {
    depthRelation = "same";
  }

  const result = {
    source: sourceOut,
    target: targetOut,
    factor: formatFixed(factor, 2),
    percent: formatFixed(percent, 1),
    scaledQuantity:
      quantity === null
        ? null
        : { unit: quantityUnit, value: formatFixed(quantity * factor, 1) },
    depthRelation,
  };

  // Report cap backstop (SPEC inputsOutputs): a result over the cap is
  // an OUTPUT_LIMIT error instead of a success. With the pinned ranges
  // a real result is a few hundred bytes, so this never fires for a
  // genuine conversion.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
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
