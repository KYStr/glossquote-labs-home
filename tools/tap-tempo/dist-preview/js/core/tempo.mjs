// Pure core for the Tap Tempo BPM detector. Synchronous data in, data out:
// no DOM, no network, no storage, no timers. Implements the fixed contract
// of SPEC spec-tap-tempo-20261109: strict schema, capacity before the
// per-element scan, segment reset on gaps strictly over 2000 ms, the
// last at most 8 segment intervals as the statistics set, median-first
// statistics, and output-only half-up rounding via BigInt formulas.

export const MAX_TAPS = 512;
export const MAX_TIMESTAMP = 10000000000000; // 10^13 ms
export const RESET_GAP_MS = 2000;
export const WINDOW_SIZE = 8;
export const MAX_TOKEN_UNITS = 16;
export const REPORT_FILENAME = "tap-tempo-report.json";
export const REPORT_BYTE_LIMIT = 2097152;

const MAX_TIMESTAMP_BIG = 10000000000000n;

export const ERROR_MESSAGES = {
  SCHEMA: { "zh-Hant": "輸入格式不正確", en: "The input shape is invalid." },
  EMPTY: { "zh-Hant": "沒有可計算的時間戳", en: "There are no timestamps to measure." },
  INPUT_LIMIT: { "zh-Hant": "超過數量上限", en: "The item limit was exceeded." },
  INTEGER_FORMAT: {
    "zh-Hant": "時間戳必須是整數毫秒",
    en: "Timestamps must be integer milliseconds.",
  },
  RANGE: { "zh-Hant": "時間戳超出允許範圍", en: "A timestamp is out of range." },
  NON_MONOTONIC: {
    "zh-Hant": "時間戳必須嚴格遞增",
    en: "Timestamps must be strictly increasing.",
  },
  INTERNAL: { "zh-Hant": "處理失敗，請重試", en: "Something went wrong. Try again." },
};

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Reads only own data properties. Accessors, extra fields, missing fields,
// and non-plain inputs are all SCHEMA failures.
function readTaps(input) {
  if (!isPlainObject(input)) return null;
  const names = Object.getOwnPropertyNames(input);
  if (names.length !== 1 || names[0] !== "taps") return null;
  const descriptor = Object.getOwnPropertyDescriptor(input, "taps");
  if (descriptor === undefined || !("value" in descriptor)) return null;
  return descriptor.value;
}

// Half-up rounding of a rate derived from a rational interval p/q (ms):
// bpm = 60000 * q / p to one decimal; the tenths integer is
// floor((1200000*q + p) / (2p)). beatsPerSecond = 1000 * q / p to two
// decimals; the hundredths integer is floor((200000*q + p) / (2p)).
function bpmTenths(p, q) {
  return Number((1200000n * q + p) / (2n * p));
}

function bpsHundredths(p, q) {
  return Number((200000n * q + p) / (2n * p));
}

export function run(input) {
  try {
    const taps = readTaps(input);
    if (taps === null || !Array.isArray(taps)) return failure("SCHEMA", null, null);
    if (taps.length > MAX_TAPS) return failure("INPUT_LIMIT", "taps", null);

    for (let i = 0; i < taps.length; i += 1) {
      const value = taps[i];
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return failure("INTEGER_FORMAT", "taps", i + 1);
      }
      if (value < 0 || value > MAX_TIMESTAMP) {
        return failure("RANGE", "taps", i + 1);
      }
      if (i > 0 && value <= taps[i - 1]) {
        return failure("NON_MONOTONIC", "taps", i + 1);
      }
    }

    const n = taps.length;
    const intervals = [];
    for (let i = 0; i + 1 < n; i += 1) intervals.push(taps[i + 1] - taps[i]);

    let resetCount = 0;
    let segmentStartIndex = 0;
    for (let i = 0; i < intervals.length; i += 1) {
      if (intervals[i] > RESET_GAP_MS) {
        resetCount += 1;
        segmentStartIndex = i + 1;
      }
    }

    const segmentIntervals = intervals.slice(segmentStartIndex);
    const windowIntervals = segmentIntervals.slice(-WINDOW_SIZE);
    const intervalCount = windowIntervals.length;

    let medianIntervalMs = null;
    let meanIntervalMs = null;
    let bpmMedian = null;
    let bpmMean = null;
    let beatsPerSecond = null;

    if (intervalCount > 0) {
      const sorted = [...windowIntervals].sort((a, b) => a - b);
      const mid = intervalCount >> 1;
      let medianP;
      let medianQ;
      if (intervalCount % 2 === 1) {
        medianP = BigInt(sorted[mid]);
        medianQ = 1n;
        medianIntervalMs = sorted[mid];
      } else {
        medianP = BigInt(sorted[mid - 1]) + BigInt(sorted[mid]);
        medianQ = 2n;
        medianIntervalMs = Number(medianP) / 2;
      }

      let sum = 0n;
      for (const value of windowIntervals) sum += BigInt(value);
      const count = BigInt(intervalCount);
      // meanIntervalMs display value: one-decimal half-up of sum/count,
      // tenths integer floor((20*sum + count) / (2*count)).
      const meanTenths = Number((20n * sum + count) / (2n * count));
      meanIntervalMs = meanTenths / 10;

      bpmMedian = bpmTenths(medianP, medianQ) / 10;
      bpmMean = bpmTenths(sum, count) / 10;
      beatsPerSecond = bpsHundredths(medianP, medianQ) / 100;
    }

    return {
      ok: true,
      result: {
        tapCount: n,
        segmentStartIndex,
        segmentTapCount: n - segmentStartIndex,
        segmentIntervalCount: segmentIntervals.length,
        resetCount,
        intervalCount,
        windowIntervals,
        medianIntervalMs,
        meanIntervalMs,
        bpmMedian,
        bpmMean,
        beatsPerSecond,
      },
    };
  } catch {
    return failure("INTERNAL", null, null);
  }
}

// Import-text grammar (controller side, still pure): trim separators at
// both ends, split on runs of whitespace/commas, then per token check raw
// length, the integer grammar, and the timestamp range. NON_MONOTONIC and
// the capacity of the parsed array are left to run(), except that more
// than MAX_TAPS tokens already fail here with row null.
export function parseImportText(text) {
  if (typeof text !== "string") return failure("SCHEMA", null, null);
  const trimmed = text.replace(/^[\s,]+/u, "").replace(/[\s,]+$/u, "");
  if (trimmed === "") return failure("EMPTY", "taps", null);
  const tokens = trimmed.split(/[\s,]+/u);
  if (tokens.length > MAX_TAPS) return failure("INPUT_LIMIT", "taps", null);
  const taps = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.length > MAX_TOKEN_UNITS) return failure("INPUT_LIMIT", "taps", i + 1);
    if (!/^(0|[1-9][0-9]*)$/.test(token)) return failure("INTEGER_FORMAT", "taps", i + 1);
    const value = BigInt(token);
    if (value > MAX_TIMESTAMP_BIG) return failure("RANGE", "taps", i + 1);
    taps.push(Number(value));
  }
  return { ok: true, taps };
}

// Display strings are assembled from the rounded digit values, never via
// float formatting: BPM always one decimal, beats per second two,
// medianIntervalMs bare when integral and one decimal otherwise,
// meanIntervalMs always one decimal.
export function formatReading(result) {
  if (result === null || result.intervalCount === 0) return null;
  const bpmTenths = Math.round(result.bpmMedian * 10);
  const bpmMeanTenths = Math.round(result.bpmMean * 10);
  const bpsHundredths = Math.round(result.beatsPerSecond * 100);
  const meanIntervalTenths = Math.round(result.meanIntervalMs * 10);
  const median = result.medianIntervalMs;
  return {
    bpmMedianText: `${Math.floor(bpmTenths / 10)}.${bpmTenths % 10}`,
    bpmMeanText: `${Math.floor(bpmMeanTenths / 10)}.${bpmMeanTenths % 10}`,
    beatsPerSecondText: `${Math.floor(bpsHundredths / 100)}.${String(bpsHundredths % 100).padStart(2, "0")}`,
    medianIntervalText: Number.isInteger(median) ? String(median) : `${Math.floor(median)}.5`,
    meanIntervalText: `${Math.floor(meanIntervalTenths / 10)}.${meanIntervalTenths % 10}`,
  };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings escaped as JSON literals;
// the input's toJSON is never consulted.
export function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
