// Pure core for the Video File Size Calculator
// (spec-video-file-size-calculator-20261109).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
//
// All arithmetic is exact BigInt rational arithmetic — no floating
// point and no intermediate rounding anywhere in the pipeline:
//   videoBps  = rateH * 10,000 * factorNumerator / factorDenominator
//               (rateH is the base rate in hundredths of a Mbps; 10,000
//               is divisible by every factor denominator, so videoBps
//               is always an integer — an invariant asserted below)
//   totalBps  = videoBps + audioKbps * 1000
//   size mode:      bytes = roundHalfUp(totalBps * durationSec / 8);
//                   the four display strings are each computed from the
//                   UNROUNDED exact byte fraction and rounded half-up
//                   to exactly two decimals.
//   duration mode:  maxDurationSec = floor(targetBytesExact * 8 / totalBps)
//                   usedBytes = roundHalfUp(totalBps * maxDurationSec / 8)
//                   headroomBytes = targetBytes - usedBytes (>= 0)
// Preset bitrates and codec factors are rules of thumb (heuristics),
// disclosed as such next to every result; they are not any device's
// specification values.

export const FIELDS = [
  "mode",
  "duration",
  "bitrateSource",
  "preset",
  "customBitrateMbps",
  "codec",
  "audioKbps",
  "targetSize",
  "targetUnit",
];

// Raw capacity per field in UTF-16 code units, pinned by the SPEC.
export const RAW_LIMITS = {
  mode: 8,
  duration: 9,
  bitrateSource: 6,
  preset: 8,
  customBitrateMbps: 8,
  codec: 10,
  audioKbps: 3,
  targetSize: 12,
  targetUnit: 3,
};

export const MODES = ["size", "duration"];
export const BITRATE_SOURCES = ["preset", "custom"];

// Fixed preset table: base video bitrate in hundredths of a Mbps
// (45 Mbps -> 4500). Labelled "typical H.264 values" — heuristics.
export const PRESET_RATE_H = {
  "2160p60": 4500,
  "2160p30": 3500,
  "1080p60": 1200,
  "1080p30": 800,
  "720p30": 500,
  "480p30": 250,
};
export const PRESET_CODES = Object.keys(PRESET_RATE_H);

// Fixed codec factors as exact fractions, applied to the video bitrate
// only (presets and custom rates are both H.264 baselines). Heuristics.
export const CODEC_FACTORS = {
  h264: [1, 1],
  h265: [11, 20],
  av1: [9, 20],
  prores422: [15, 1],
};
export const CODEC_CODES = Object.keys(CODEC_FACTORS);

export const AUDIO_KBPS = ["0", "128", "192", "256", "320"];

export const TARGET_UNITS = ["MB", "GB", "MiB", "GiB"];
// Exact bytes per target unit.
export const UNIT_BYTES = {
  MB: 1000000n,
  GB: 1000000000n,
  MiB: 1048576n,
  GiB: 1073741824n,
};

export const CUSTOM_RANGE_MBPS = ["0.1", "1000"];
// targetSize must convert to 1 .. 2^53-1 exact bytes.
export const MAX_TARGET_BYTES = 9007199254740991n;

export const DEFAULTS = {
  mode: "size",
  duration: "0:10:00",
  bitrateSource: "preset",
  preset: "1080p30",
  customBitrateMbps: "10",
  codec: "h264",
  audioKbps: "192",
  targetSize: "64",
  targetUnit: "GiB",
};

// The worked example is fixtures.json case 1 (preset-1080p30-basic)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  mode: "size",
  duration: "0:10:00",
  bitrateSource: "preset",
  preset: "1080p30",
  customBitrateMbps: "10",
  codec: "h264",
  audioKbps: "192",
  targetSize: "64",
  targetUnit: "GiB",
};

const DURATION_PATTERN = /^\d{1,3}:[0-5]\d:[0-5]\d$/;
const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
const UNPAIRED_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

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
// string fields.
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

// Per-field checks that apply to EVERY field, active or not, in the
// SPEC's pinned order: raw capacity, then unpaired surrogate.
function checkCapacityAndUnicode(field, value) {
  if (value.length > RAW_LIMITS[field]) return failure("INPUT_LIMIT", field);
  if (UNPAIRED_SURROGATE.test(value)) return failure("UNICODE", field);
  return null;
}

// Parses a grammar-valid decimal string into hundredths as a BigInt
// ("12.34" -> 1234n, "10" -> 1000n, "0.1" -> 10n).
function parseHundredths(value) {
  const dot = value.indexOf(".");
  if (dot === -1) return BigInt(value) * 100n;
  const whole = BigInt(value.slice(0, dot));
  const fraction = value.slice(dot + 1);
  return whole * 100n + BigInt(fraction.length === 1 ? `${fraction}0` : fraction);
}

// Round half-up of the non-negative rational numerator/denominator.
function roundHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Formats the non-negative rational numerator/denominator with exactly
// two decimals, rounded half-up, no trailing-zero trimming, no
// thousands separators.
function formatTwoDecimals(numerator, denominator) {
  const cents = roundHalfUp(numerator * 100n, denominator);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

// H:MM:SS — hours as a plain decimal (may exceed 999 in duration mode),
// minutes and seconds zero-padded to two digits.
function formatDurationText(totalSeconds) {
  const hours = totalSeconds / 3600n;
  const rest = totalSeconds % 3600n;
  const minutes = rest / 60n;
  const seconds = rest % 60n;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // mode (always active)
  let error = checkCapacityAndUnicode("mode", raw.mode);
  if (error) return error;
  if (raw.mode.length === 0) return failure("EMPTY", "mode");
  if (!MODES.includes(raw.mode)) return failure("ENUM", "mode");
  const mode = raw.mode;

  // duration (active only in size mode)
  error = checkCapacityAndUnicode("duration", raw.duration);
  if (error) return error;
  let durationSec = null;
  if (mode === "size") {
    if (raw.duration.length === 0) return failure("EMPTY", "duration");
    if (!DURATION_PATTERN.test(raw.duration)) return failure("DURATION_FORMAT", "duration");
    const [hours, minutes, seconds] = raw.duration.split(":").map((part) => BigInt(part));
    durationSec = hours * 3600n + minutes * 60n + seconds;
    if (durationSec < 1n) return failure("RANGE", "duration");
  }

  // bitrateSource (always active)
  error = checkCapacityAndUnicode("bitrateSource", raw.bitrateSource);
  if (error) return error;
  if (raw.bitrateSource.length === 0) return failure("EMPTY", "bitrateSource");
  if (!BITRATE_SOURCES.includes(raw.bitrateSource)) return failure("ENUM", "bitrateSource");
  const bitrateSource = raw.bitrateSource;

  // preset (active only for the preset source)
  error = checkCapacityAndUnicode("preset", raw.preset);
  if (error) return error;
  if (bitrateSource === "preset") {
    if (raw.preset.length === 0) return failure("EMPTY", "preset");
    if (!PRESET_CODES.includes(raw.preset)) return failure("ENUM", "preset");
  }

  // customBitrateMbps (active only for the custom source)
  error = checkCapacityAndUnicode("customBitrateMbps", raw.customBitrateMbps);
  if (error) return error;
  let customHundredths = null;
  if (bitrateSource === "custom") {
    if (raw.customBitrateMbps.length === 0) return failure("EMPTY", "customBitrateMbps");
    if (!DECIMAL_PATTERN.test(raw.customBitrateMbps)) {
      return failure("DECIMAL_FORMAT", "customBitrateMbps");
    }
    customHundredths = parseHundredths(raw.customBitrateMbps);
    if (customHundredths < 10n || customHundredths > 100000n) {
      return failure("RANGE", "customBitrateMbps");
    }
  }

  // codec (always active)
  error = checkCapacityAndUnicode("codec", raw.codec);
  if (error) return error;
  if (raw.codec.length === 0) return failure("EMPTY", "codec");
  if (!CODEC_CODES.includes(raw.codec)) return failure("ENUM", "codec");

  // audioKbps (always active)
  error = checkCapacityAndUnicode("audioKbps", raw.audioKbps);
  if (error) return error;
  if (raw.audioKbps.length === 0) return failure("EMPTY", "audioKbps");
  if (!AUDIO_KBPS.includes(raw.audioKbps)) return failure("ENUM", "audioKbps");

  // targetSize (active only in duration mode)
  error = checkCapacityAndUnicode("targetSize", raw.targetSize);
  if (error) return error;
  let targetHundredths = null;
  if (mode === "duration") {
    if (raw.targetSize.length === 0) return failure("EMPTY", "targetSize");
    if (!DECIMAL_PATTERN.test(raw.targetSize)) return failure("DECIMAL_FORMAT", "targetSize");
    targetHundredths = parseHundredths(raw.targetSize);
  }

  // targetUnit (active only in duration mode)
  error = checkCapacityAndUnicode("targetUnit", raw.targetUnit);
  if (error) return error;
  if (mode === "duration") {
    if (raw.targetUnit.length === 0) return failure("EMPTY", "targetUnit");
    if (!TARGET_UNITS.includes(raw.targetUnit)) return failure("ENUM", "targetUnit");
  }

  const rateH =
    bitrateSource === "preset" ? BigInt(PRESET_RATE_H[raw.preset]) : customHundredths;
  const [factorNum, factorDen] = CODEC_FACTORS[raw.codec].map((part) => BigInt(part));
  const videoBpsTimesDen = rateH * 10000n * factorNum;
  if (videoBpsTimesDen % factorDen !== 0n) {
    // Unreachable by the SPEC's divisibility invariant; a guard, not a
    // rounding step.
    return failure("INTERNAL", null);
  }
  const videoBps = videoBpsTimesDen / factorDen;
  const audioBps = BigInt(raw.audioKbps) * 1000n;
  const totalBps = videoBps + audioBps;

  if (mode === "size") {
    const exactNumerator = totalBps * durationSec; // exact bytes = /8
    return {
      ok: true,
      result: {
        mode,
        durationSec: Number(durationSec),
        durationText: formatDurationText(durationSec),
        videoBps: Number(videoBps),
        audioBps: Number(audioBps),
        totalBps: Number(totalBps),
        bytes: Number(roundHalfUp(exactNumerator, 8n)),
        sizeMB: formatTwoDecimals(exactNumerator, 8n * 1000000n),
        sizeGB: formatTwoDecimals(exactNumerator, 8n * 1000000000n),
        sizeMiB: formatTwoDecimals(exactNumerator, 8n * 1048576n),
        sizeGiB: formatTwoDecimals(exactNumerator, 8n * 1073741824n),
      },
    };
  }

  // Duration mode: exact target bytes as a fraction (hundredths of the
  // unit). The range is judged on this exact value.
  const targetUnitBytes = UNIT_BYTES[raw.targetUnit];
  const targetExactNumerator = targetHundredths * targetUnitBytes; // /100
  if (targetExactNumerator < 100n || targetExactNumerator > MAX_TARGET_BYTES * 100n) {
    return failure("RANGE", "targetSize");
  }
  const targetBytes = roundHalfUp(targetExactNumerator, 100n);
  const maxDurationSec = (targetExactNumerator * 8n) / (100n * totalBps); // floor
  const usedBytes = roundHalfUp(totalBps * maxDurationSec, 8n);
  return {
    ok: true,
    result: {
      mode,
      targetBytes: Number(targetBytes),
      videoBps: Number(videoBps),
      audioBps: Number(audioBps),
      totalBps: Number(totalBps),
      maxDurationSec: Number(maxDurationSec),
      maxDurationText: formatDurationText(maxDurationSec),
      usedBytes: Number(usedBytes),
      headroomBytes: Number(targetBytes - usedBytes),
    },
  };
}

// Fixed report download: video-file-size-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, safe integers, strings, arrays, plain objects).
export const REPORT_FILENAME = "video-file-size-report.json";
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
