// Pure core for the Retry Time Budget Planner.
// No DOM, network, or storage access. Implements SPEC.md (spec-retry-budget-20261109):
// fixed-timeout, integer-millisecond, serial-retry upper-bound model.
// All times are plain safe integers (milliseconds); no floating point is used.

export const FIELDS = ["budget", "timeout", "attemptLimit", "initialDelay", "factor", "maxDelay"];

export const RANGES = {
  budget: [0, 86400000],
  timeout: [1, 600000],
  attemptLimit: [1, 16],
  initialDelay: [0, 600000],
  factor: [1, 8],
  maxDelay: [0, 600000],
};

export const DEFAULTS = {
  budget: "10000",
  timeout: "1500",
  attemptLimit: "5",
  initialDelay: "500",
  factor: "2",
  maxDelay: "2000",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  budget: "5500",
  timeout: "1000",
  attemptLimit: "5",
  initialDelay: "500",
  factor: "2",
  maxDelay: "1200",
};

export const MAX_RAW_UNITS = 8;
export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "retry-budget-report.json";

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

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

// Validate one field, in the SPEC's order: capacity (EMPTY / INPUT_LIMIT),
// then unpaired surrogate (UNICODE), then grammar (INTEGER_FORMAT), then
// range (RANGE). Returns null when valid, otherwise the error object.
function validateField(field, raw) {
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (raw.length > MAX_RAW_UNITS) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (!INTEGER_PATTERN.test(raw)) {
    return { code: "INTEGER_FORMAT", field, row: null };
  }
  const value = Number(raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input object. Unknown, missing, wrongly typed, or
// accessor-backed inputs are SCHEMA with field/row null. Fields are checked
// in the SPEC's fixed order: budget, timeout, attemptLimit, initialDelay,
// factor, maxDelay.
export function validateInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return schemaError();
  }
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return schemaError();
  }
  if (keys.length !== FIELDS.length) return schemaError();
  const values = {};
  for (const field of FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) return schemaError();
    let raw;
    try {
      raw = input[field];
    } catch {
      return schemaError();
    }
    if (typeof raw !== "string") return schemaError();
    values[field] = raw;
  }
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  const parsed = {};
  for (const field of FIELDS) parsed[field] = Number(values[field]);
  return { ok: true, values: parsed };
}

// The timeline model. Attempt 1 has delay 0. For i >= 2 the delay is
// min(maxDelay, initialDelay * factor^(i-2)), computed iteratively with
// BigInt: the second attempt uses min(initialDelay, maxDelay), and only
// after an attempt is accepted is the capped delay multiplied by the factor
// and capped again. start = previousEnd + delay, end = start + timeout.
// The first attempt whose end exceeds the budget is reported as
// nextRejected (its waiting time is not deducted); accepted attempts keep
// {number, delayMs, startMs, endMs}. unspentMs is budget minus the last
// accepted end, or 0 when nothing was accepted.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { budget, timeout, attemptLimit, initialDelay, factor, maxDelay } = validated.values;

  const attempts = [];
  let previousEnd = 0;
  let cappedDelay = BigInt(Math.min(initialDelay, maxDelay));
  const factorBig = BigInt(factor);
  const maxDelayBig = BigInt(maxDelay);

  for (let i = 1; i <= attemptLimit; i += 1) {
    const delayMs = i === 1 ? 0 : Number(cappedDelay);
    const startMs = previousEnd + delayMs;
    const endMs = startMs + timeout;
    if (endMs > budget) {
      return {
        ok: true,
        result: {
          attempts,
          unspentMs: attempts.length === 0 ? 0 : budget - previousEnd,
          nextRejected: { number: i, startMs, endMs },
        },
      };
    }
    attempts.push({ number: i, delayMs, startMs, endMs });
    previousEnd = endMs;
    if (i >= 2) {
      const grown = cappedDelay * factorBig;
      cappedDelay = grown > maxDelayBig ? maxDelayBig : grown;
    }
  }
  return {
    ok: true,
    result: {
      attempts,
      unspentMs: budget - previousEnd,
      nextRejected: null,
    },
  };
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
