// Pure core for the Image File Size Calculator
// (spec-image-file-size-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// SPEC rules (inputsOutputs §3), applied literally:
//   totalPixels = widthPx x heightPx (integer).
//   uncompressedBytes = ceil(widthPx x heightPx x bitDepth / 8).
//   effectiveBitDepth = min(bitDepth, 8) for gif, else bitDepth.
//   effectiveBytes = ceil(widthPx x heightPx x effectiveBitDepth / 8).
//   estimatedBytes = round_half_up(effectiveBytes x factor), with the
//     pinned factors below (all marked as estimates).
//   megapixels, sizeKB, sizeMB are half-up 2-decimal strings, exactly
//     2 decimals.
//   displaySize: estimatedBytes < 1024 -> "{n} B"; < 1048576 ->
//     "{sizeKB} KB"; otherwise "{sizeMB} MB".
//   1 KB = 1024 bytes, 1 MB = 1024 KB = 1048576 bytes.
// All arithmetic is BigInt integer arithmetic; binary floating point
// is never used for any intermediate computation or rounding.

export const FIELDS = ["widthPx", "heightPx", "bitDepth", "format"];

export const DEFAULTS = { widthPx: "", heightPx: "", bitDepth: "24", format: "jpeg" };

// The worked example is fixtures.json case 1 (jpeg-photo-12mp)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = { widthPx: "4000", heightPx: "3000", bitDepth: "24", format: "jpeg" };

export const MAX_RAW_UNITS = 8;

export const DIMENSION_MIN = 1;
export const DIMENSION_MAX = 100000;
export const MAX_TOTAL_PIXELS = 1000000000n;

export const BIT_DEPTHS = ["1", "8", "16", "24", "32", "48", "64"];

// Pinned format table (SPEC §inputsOutputs): factor as an exact
// rational [numerator, denominator], the typical compression ratio
// text, and both-language labels. Every factor is a typical estimate,
// not a measured guarantee; the pages must say so.
export const FORMATS = {
  uncompressed: {
    factor: [1n, 1n],
    factorText: "1.00",
    ratioZh: "1:1",
    ratioEn: "1:1",
    labelZh: "未壓縮",
    labelEn: "Uncompressed",
  },
  jpeg: {
    factor: [1n, 10n],
    factorText: "0.10",
    ratioZh: "約 10:1",
    ratioEn: "about 10:1",
    labelZh: "JPEG（有損）",
    labelEn: "JPEG (lossy)",
  },
  png: {
    factor: [2n, 5n],
    factorText: "0.40",
    ratioZh: "約 2.5:1",
    ratioEn: "about 2.5:1",
    labelZh: "PNG（無損）",
    labelEn: "PNG (lossless)",
  },
  "webp-lossy": {
    factor: [7n, 100n],
    factorText: "0.07",
    ratioZh: "約 14:1",
    ratioEn: "about 14:1",
    labelZh: "WebP（有損）",
    labelEn: "WebP (lossy)",
  },
  "webp-lossless": {
    factor: [3n, 10n],
    factorText: "0.30",
    ratioZh: "約 3.3:1",
    ratioEn: "about 3.3:1",
    labelZh: "WebP（無損）",
    labelEn: "WebP (lossless)",
  },
  gif: {
    factor: [1n, 4n],
    factorText: "0.25",
    ratioZh: "約 4:1",
    ratioEn: "about 4:1",
    labelZh: "GIF（索引色）",
    labelEn: "GIF (indexed colour)",
  },
  avif: {
    factor: [1n, 20n],
    factorText: "0.05",
    ratioZh: "約 20:1",
    ratioEn: "about 20:1",
    labelZh: "AVIF（有損）",
    labelEn: "AVIF (lossy)",
  },
};

export const FORMAT_IDS = Object.keys(FORMATS);

// Pinned estimate disclaimer (verbatim, both languages). Shown in
// the results area of both pages and next to the estimated size.
export const ESTIMATE_NOTE_ZH = "估算值，非實際檔案大小";
export const ESTIMATE_NOTE_EN = "Estimate, not the actual file size";

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
// the raw string map, or null when the shape is not exactly the four
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
// surrogate, empty, grammar, range/enum. Returns the parsed value or
// an { error } outcome. Dimension fields return a BigInt; bitDepth
// returns its string (membership is checked against BIT_DEPTHS);
// format returns its string (membership is checked against FORMATS).
function validateDimension(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = BigInt(value);
  if (parsed < BigInt(DIMENSION_MIN) || parsed > BigInt(DIMENSION_MAX)) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

function validateBitDepth(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  if (!BIT_DEPTHS.includes(value)) return { error: failure("ENUM", field) };
  return { value };
}

function validateFormat(field, value) {
  // The SPEC pins a raw capacity of 8 units only for widthPx,
  // heightPx and bitDepth. Format has no stated capacity (its legal
  // values run to 13 units: "webp-lossless"), so no INPUT_LIMIT
  // applies here: any non-empty string outside the enumeration is
  // ENUM. A lone surrogate is still UNICODE, per the SPEC's general
  // rule.
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!Object.hasOwn(FORMATS, value)) return { error: failure("ENUM", field) };
  return { value };
}

// Half-up rounding of a non-negative rational numerator/denominator
// to the nearest integer: floor((2n + d) / 2d). Integer arithmetic
// only.
function halfUpDiv(numerator, denominator) {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

// Ceiling division for non-negative BigInts.
function ceilDiv(numerator, denominator) {
  return (numerator + denominator - 1n) / denominator;
}

// Formats a hundredths value (BigInt) as an exactly-2-decimal string.
function formatTwoDecimals(hundredths) {
  const whole = hundredths / 100n;
  const fraction = hundredths % 100n;
  return `${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Validation order pinned by the SPEC: widthPx, heightPx, bitDepth,
  // format; cross-field total-pixels check only after every field
  // passes.
  const width = validateDimension("widthPx", raw.widthPx);
  if (width.error) return width.error;
  const height = validateDimension("heightPx", raw.heightPx);
  if (height.error) return height.error;
  const bitDepth = validateBitDepth("bitDepth", raw.bitDepth);
  if (bitDepth.error) return bitDepth.error;
  const format = validateFormat("format", raw.format);
  if (format.error) return format.error;

  const widthPx = width.value;
  const heightPx = height.value;
  const depth = BigInt(bitDepth.value);

  const totalPixels = widthPx * heightPx;
  if (totalPixels > MAX_TOTAL_PIXELS) return failure("RANGE", "heightPx");

  const uncompressedBytes = ceilDiv(totalPixels * depth, 8n);
  const effectiveBitDepth = format.value === "gif" ? (depth < 8n ? depth : 8n) : depth;
  const effectiveBytes = ceilDiv(totalPixels * effectiveBitDepth, 8n);
  const [factorNumerator, factorDenominator] = FORMATS[format.value].factor;
  const estimatedBytes = halfUpDiv(effectiveBytes * factorNumerator, factorDenominator);

  const megapixels = formatTwoDecimals(halfUpDiv(totalPixels * 100n, 1000000n));
  const sizeKB = formatTwoDecimals(halfUpDiv(estimatedBytes * 100n, 1024n));
  const sizeMB = formatTwoDecimals(halfUpDiv(estimatedBytes * 100n, 1048576n));

  let displaySize;
  if (estimatedBytes < 1024n) {
    displaySize = `${estimatedBytes.toString()} B`;
  } else if (estimatedBytes < 1048576n) {
    displaySize = `${sizeKB} KB`;
  } else {
    displaySize = `${sizeMB} MB`;
  }

  return {
    ok: true,
    result: {
      displaySize,
      effectiveBitDepth: effectiveBitDepth.toString(),
      estimatedBytes: Number(estimatedBytes),
      format: format.value,
      megapixels,
      sizeKB,
      sizeMB,
      totalPixels: Number(totalPixels),
      uncompressedBytes: Number(uncompressedBytes),
    },
  };
}

// Fixed report download: image-file-size-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "image-file-size-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
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
