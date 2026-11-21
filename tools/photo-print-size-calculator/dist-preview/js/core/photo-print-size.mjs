// Pure core for the Photo Print Size Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-photo-print-size-calculator-20261109):
// three modes (max / need / check) over one pinned table of nine
// standard print sizes, all arithmetic in exact rational numbers
// (BigInt numerator/denominator) so ceiling and half-up rounding at
// exact-half values match the rational result exactly. Double-precision
// shortcuts are not used anywhere in the computation path.

export const FIELDS = ["mode", "pixelsW", "pixelsH", "dpi", "sizeId"];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  mode: 8,
  pixelsW: 8,
  pixelsH: 8,
  dpi: 8,
  sizeId: 8,
};

export const DEFAULTS = {
  dpi: "300",
  mode: "max",
  pixelsH: "4000",
  pixelsW: "6000",
  sizeId: "4x6",
};

// The example draft; identical to the default draft by design (SPEC
// userFlow) and to the max-24mp-300 fixture input.
export const EXAMPLE = {
  dpi: "300",
  mode: "max",
  pixelsH: "4000",
  pixelsW: "6000",
  sizeId: "4x6",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "photo-print-size-report.json";

export const PIXELS_MIN = 1;
export const PIXELS_MAX = 200000;
export const DPI_MIN = 1;
export const DPI_MAX = 1200;

export const MODES = ["max", "need", "check"];

// Pinned standard size table (SPEC inputsOutputs). Millimetre values
// are the pinned table data: photo sizes are nominal inches converted
// at exactly 127/5 mm per inch; A sizes are the ISO 216 nominal
// millimetres. Table order is the pinned output order.
export const SIZE_IDS = ["3x5", "4x6", "5x7", "6x8", "8x10", "10x12", "A5", "A4", "A3"];

export const SIZE_LABELS = {
  "3x5": { zh: "3×5 相片", en: "3×5 photo" },
  "4x6": { zh: "4×6 相片", en: "4×6 photo" },
  "5x7": { zh: "5×7 相片", en: "5×7 photo" },
  "6x8": { zh: "6×8 相片", en: "6×8 photo" },
  "8x10": { zh: "8×10 相片", en: "8×10 photo" },
  "10x12": { zh: "10×12 相片", en: "10×12 photo" },
  A5: { zh: "A5", en: "A5" },
  A4: { zh: "A4", en: "A4" },
  A3: { zh: "A3", en: "A3" },
};

export const QUALITY_LABELS = {
  excellent: { zh: "極佳", en: "Excellent" },
  good: { zh: "良好", en: "Good" },
  acceptable: { zh: "可接受", en: "Acceptable" },
  poor: { zh: "不足", en: "Poor" },
};

// Pinned status announcements (SPEC userFlow state table).
export const STATUS_TEXT = {
  empty: { zh: "請輸入像素與目標 DPI，或載入範例。", en: "Enter pixel dimensions and a target DPI, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  example: { zh: "已載入範例", en: "Example loaded" },
  reset: { zh: "已重設", en: "Reset" },
};

// ---------------------------------------------------------------------------
// Exact rational arithmetic (BigInt numerator / denominator, d > 0).
// ---------------------------------------------------------------------------

function bigintGcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function makeRat(n, d = 1n) {
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bigintGcd(n, d);
  return { n: n / g, d: d / g };
}

function mulRat(a, b) {
  return makeRat(a.n * b.n, a.d * b.d);
}

function divRat(a, b) {
  return makeRat(a.n * b.d, a.d * b.n);
}

function cmpRat(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// R(x, k) = floor(x * 10^k + 1/2) / 10^k, executed on the exact
// rational x (SPEC inputsOutputs). Returns the scaled integer and the
// JavaScript number of the rounded value. All values here are
// non-negative, so the BigInt division is a floor.
function roundScaled(x, k) {
  const scale = 10n ** BigInt(k);
  const scaled = (2n * x.n * scale + x.d) / (2n * x.d);
  return { scaled, value: Number(scaled) / Number(scale) };
}

// Ceiling of a non-negative rational to an integer (BigInt).
function ceilRat(x) {
  return (x.n + x.d - 1n) / x.d;
}

// 1 inch = 127/5 mm (exact); 1 inch = 127/50 cm (exact).
const MM_PER_INCH = makeRat(127n, 5n);
const INCH_PER_MM = makeRat(5n, 127n);

// The size table, millimetres as exact rationals.
const SIZES = [
  { sizeId: "3x5", longMm: makeRat(127n), shortMm: makeRat(381n, 5n) },
  { sizeId: "4x6", longMm: makeRat(762n, 5n), shortMm: makeRat(508n, 5n) },
  { sizeId: "5x7", longMm: makeRat(889n, 5n), shortMm: makeRat(127n) },
  { sizeId: "6x8", longMm: makeRat(1016n, 5n), shortMm: makeRat(762n, 5n) },
  { sizeId: "8x10", longMm: makeRat(254n), shortMm: makeRat(1016n, 5n) },
  { sizeId: "10x12", longMm: makeRat(1524n, 5n), shortMm: makeRat(254n) },
  { sizeId: "A5", longMm: makeRat(210n), shortMm: makeRat(148n) },
  { sizeId: "A4", longMm: makeRat(297n), shortMm: makeRat(210n) },
  { sizeId: "A3", longMm: makeRat(420n), shortMm: makeRat(297n) },
];

const SIZE_BY_ID = new Map(SIZES.map((size) => [size.sizeId, size]));

function longInOf(size) {
  return mulRat(size.longMm, INCH_PER_MM);
}

function shortInOf(size) {
  return mulRat(size.shortMm, INCH_PER_MM);
}

// Quality from the ROUNDED effective DPI (SPEC: quality is decided by
// the rounded value; thresholds inclusive). `tenths` is the effective
// DPI rounded to one decimal, scaled by 10.
function qualityForTenths(tenths) {
  if (tenths >= 3000n) return "excellent";
  if (tenths >= 2000n) return "good";
  if (tenths >= 1500n) return "acceptable";
  return "poor";
}

// Shared per-size derivation (SPEC inputsOutputs): required pixels
// (ceiling, only when a target DPI is given), per-side DPI, effective
// DPI (min first, then round once), quality (from the rounded
// effective DPI), and the fits verdict in its authoritative integer
// form. In check mode dpi is null (the field is inactive) and no
// required-pixel or fits values are produced.
function deriveSize(size, imgLong, imgShort, dpi) {
  const longIn = longInOf(size);
  const shortIn = shortInOf(size);
  const requiredLongPx = dpi === null ? null : ceilRat(mulRat(longIn, dpi));
  const requiredShortPx = dpi === null ? null : ceilRat(mulRat(shortIn, dpi));
  const dpiLong = divRat(makeRat(imgLong), longIn);
  const dpiShort = divRat(makeRat(imgShort), shortIn);
  const effective = cmpRat(dpiLong, dpiShort) <= 0 ? dpiLong : dpiShort;
  const dpiLongRounded = roundScaled(dpiLong, 1);
  const dpiShortRounded = roundScaled(dpiShort, 1);
  const effectiveRounded = roundScaled(effective, 1);
  const fits =
    dpi === null
      ? null
      : requiredLongPx <= imgLong && requiredShortPx <= imgShort;
  return {
    sizeId: size.sizeId,
    dpiLong: dpiLongRounded.value,
    dpiShort: dpiShortRounded.value,
    effectiveDpi: effectiveRounded.value,
    fits,
    quality: qualityForTenths(effectiveRounded.scaled),
    requiredLongPx: requiredLongPx === null ? null : Number(requiredLongPx),
    requiredShortPx: requiredShortPx === null ? null : Number(requiredShortPx),
  };
}

// ---------------------------------------------------------------------------
// Validation (SPEC inputsOutputs validation order; first failure wins).
// ---------------------------------------------------------------------------

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
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

// Schema gate only: the input must be a non-null, non-array plain
// object whose own enumerable properties are exactly the five fields,
// each an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the five string values, or null.
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
// whether a stored draft may be restored).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity check shared by every field (SPEC: every field is
// capacity-checked, active or not). An inactive field stops here.
function checkCapacity(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  return null;
}

// The unpaired-surrogate check, only for active fields (SPEC: an
// inactive field receives no further checks after capacity).
function checkUnicode(field, raw) {
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate an active pixel string (non-empty): grammar
// (INTEGER_FORMAT), then range 1-200,000 (RANGE). The grammar
// guarantees BigInt() parses the value exactly as written.
function parsePixels(field, raw) {
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
  const value = BigInt(raw);
  if (value < BigInt(PIXELS_MIN) || value > BigInt(PIXELS_MAX)) {
    return fieldError("RANGE", field);
  }
  return { ok: true, value };
}

// Validate an active DPI string (non-empty): grammar
// (DECIMAL_FORMAT), then range 1-1200 (RANGE). Returns the exact
// rational value.
function parseDpi(raw) {
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", "dpi");
  const dot = raw.indexOf(".");
  let value;
  if (dot === -1) {
    value = makeRat(BigInt(raw), 1n);
  } else {
    const intPart = raw.slice(0, dot);
    const fracPart = raw.slice(dot + 1);
    const scale = 10n ** BigInt(fracPart.length);
    value = makeRat(BigInt(intPart) * scale + BigInt(fracPart), scale);
  }
  if (cmpRat(value, makeRat(BigInt(DPI_MIN))) < 0 || cmpRat(value, makeRat(BigInt(DPI_MAX))) > 0) {
    return fieldError("RANGE", "dpi");
  }
  return { ok: true, value };
}

// Validate the whole input: schema first, then mode (capacity ->
// UNICODE -> EMPTY -> ENUM), then pixelsW -> pixelsH -> dpi -> sizeId
// in that fixed order. Every field is capacity-checked; an inactive
// field stops after its capacity check and its content is otherwise
// ignored. The first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacity("mode", values.mode);
  if (failure !== null) return failure;
  failure = checkUnicode("mode", values.mode);
  if (failure !== null) return failure;
  if (values.mode === "") return fieldError("EMPTY", "mode");
  if (!MODES.includes(values.mode)) return fieldError("ENUM", "mode");
  const mode = values.mode;

  const active = {
    pixelsW: mode === "max" || mode === "check",
    pixelsH: mode === "max" || mode === "check",
    dpi: mode === "max" || mode === "need",
    sizeId: mode === "need" || mode === "check",
  };

  // pixelsW
  failure = checkCapacity("pixelsW", values.pixelsW);
  if (failure !== null) return failure;
  let pixelsW = null;
  if (active.pixelsW) {
    failure = checkUnicode("pixelsW", values.pixelsW);
    if (failure !== null) return failure;
    if (values.pixelsW === "") return fieldError("EMPTY", "pixelsW");
    const parsed = parsePixels("pixelsW", values.pixelsW);
    if (!parsed.ok) return parsed;
    pixelsW = parsed.value;
  }

  // pixelsH
  failure = checkCapacity("pixelsH", values.pixelsH);
  if (failure !== null) return failure;
  let pixelsH = null;
  if (active.pixelsH) {
    failure = checkUnicode("pixelsH", values.pixelsH);
    if (failure !== null) return failure;
    if (values.pixelsH === "") return fieldError("EMPTY", "pixelsH");
    const parsed = parsePixels("pixelsH", values.pixelsH);
    if (!parsed.ok) return parsed;
    pixelsH = parsed.value;
  }

  // dpi
  failure = checkCapacity("dpi", values.dpi);
  if (failure !== null) return failure;
  let dpi = null;
  if (active.dpi) {
    failure = checkUnicode("dpi", values.dpi);
    if (failure !== null) return failure;
    if (values.dpi === "") return fieldError("EMPTY", "dpi");
    const parsed = parseDpi(values.dpi);
    if (!parsed.ok) return parsed;
    dpi = parsed.value;
  }

  // sizeId
  failure = checkCapacity("sizeId", values.sizeId);
  if (failure !== null) return failure;
  let size = null;
  if (active.sizeId) {
    failure = checkUnicode("sizeId", values.sizeId);
    if (failure !== null) return failure;
    if (values.sizeId === "") return fieldError("EMPTY", "sizeId");
    if (!SIZE_BY_ID.has(values.sizeId)) return fieldError("ENUM", "sizeId");
    size = SIZE_BY_ID.get(values.sizeId);
  }

  return {
    ok: true,
    values: { mode, pixelsW, pixelsH, dpi, size },
  };
}

// Echo a parsed DPI rational as a JavaScript number ("300" -> 300,
// "299.5" -> 299.5, "240.50" -> 240.5).
function dpiEcho(dpi) {
  return Number(dpi.n) / Number(dpi.d);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { mode, pixelsW, pixelsH, dpi, size } = validated.values;

  let result;
  if (mode === "max") {
    const imgLong = pixelsW > pixelsH ? pixelsW : pixelsH;
    const imgShort = pixelsW > pixelsH ? pixelsH : pixelsW;
    const sizes = SIZES.map((entry) => {
      const derived = deriveSize(entry, imgLong, imgShort, dpi);
      return {
        sizeId: derived.sizeId,
        dpiLong: derived.dpiLong,
        dpiShort: derived.dpiShort,
        effectiveDpi: derived.effectiveDpi,
        fits: derived.fits,
        quality: derived.quality,
      };
    });
    // Largest printable size, in the image's original W/H orientation,
    // derived from the exact pixel values (never from a rounded value).
    const maxWidthIn = roundScaled(divRat(makeRat(pixelsW), dpi), 2).value;
    const maxHeightIn = roundScaled(divRat(makeRat(pixelsH), dpi), 2).value;
    const maxWidthCm = roundScaled(
      makeRat(pixelsW * 127n * dpi.d, 50n * dpi.n),
      1,
    ).value;
    const maxHeightCm = roundScaled(
      makeRat(pixelsH * 127n * dpi.d, 50n * dpi.n),
      1,
    ).value;
    // Best fit: the fits row with the largest exact area
    // (longMm x shortMm); ties go to the earlier table row.
    let bestFitSizeId = null;
    let bestArea = null;
    for (let i = 0; i < SIZES.length; i += 1) {
      if (!sizes[i].fits) continue;
      const area = mulRat(SIZES[i].longMm, SIZES[i].shortMm);
      if (bestArea === null || cmpRat(area, bestArea) > 0) {
        bestArea = area;
        bestFitSizeId = SIZES[i].sizeId;
      }
    }
    result = {
      mode,
      pixelsW: Number(pixelsW),
      pixelsH: Number(pixelsH),
      dpi: dpiEcho(dpi),
      maxWidthIn,
      maxHeightIn,
      maxWidthCm,
      maxHeightCm,
      bestFitSizeId,
      sizes,
    };
  } else if (mode === "need") {
    const longIn = longInOf(size);
    const shortIn = shortInOf(size);
    const requiredLongPx = ceilRat(mulRat(longIn, dpi));
    const requiredShortPx = ceilRat(mulRat(shortIn, dpi));
    result = {
      mode,
      sizeId: size.sizeId,
      dpi: dpiEcho(dpi),
      sizeLongIn: roundScaled(longIn, 2).value,
      sizeShortIn: roundScaled(shortIn, 2).value,
      sizeLongCm: roundScaled(divRat(size.longMm, makeRat(10n)), 1).value,
      sizeShortCm: roundScaled(divRat(size.shortMm, makeRat(10n)), 1).value,
      requiredLongPx: Number(requiredLongPx),
      requiredShortPx: Number(requiredShortPx),
      megapixels: roundScaled(
        makeRat(requiredLongPx * requiredShortPx, 1000000n),
        2,
      ).value,
    };
  } else {
    const imgLong = pixelsW > pixelsH ? pixelsW : pixelsH;
    const imgShort = pixelsW > pixelsH ? pixelsH : pixelsW;
    // Check mode has no target DPI (the field is inactive), so the
    // shared derivation runs with dpi null and produces no required
    // pixels or fits verdict.
    const derived = deriveSize(size, imgLong, imgShort, null);
    result = {
      mode,
      pixelsW: Number(pixelsW),
      pixelsH: Number(pixelsH),
      sizeId: size.sizeId,
      dpiLong: derived.dpiLong,
      dpiShort: derived.dpiShort,
      effectiveDpi: derived.effectiveDpi,
      quality: derived.quality,
    };
  }

  // Report cap backstop (SPEC inputsOutputs): a result over the cap is
  // an OUTPUT_LIMIT error instead of a success. With the pinned ranges
  // a real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Display formatting (app layer, never feeds back into machine
// values): inches 2 decimals, centimetres 1 decimal, DPI 1 decimal,
// megapixels 2 decimals, zero-padded.
export function formatInches(value) {
  return value.toFixed(2);
}

export function formatCm(value) {
  return value.toFixed(1);
}

export function formatDpi(value) {
  return value.toFixed(1);
}

export function formatMegapixels(value) {
  return value.toFixed(2);
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
