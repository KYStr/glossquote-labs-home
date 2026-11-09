// Pure core for the Download Time Calculator
// (spec-download-time-calculator-20261109). Synchronous data-in /
// data-out only: no DOM, no network, no storage. All arithmetic is
// exact BigInt rational arithmetic exactly as the SPEC pins; no
// floating point is used anywhere in the derivation.
//
//   sizeBytes (exact) = sizeMilli * unitBytes / 1000
//   duration D (seconds, exact rational) = num / den, where
//     num = sizeMilli * unitBytes * 800
//     den = speedMilli * speedUnitBits * efficiency
//   durationSeconds = round half-up of D = floor((2*num + den) / (2*den))
//   finish time uses the UNROUNDED D: only floor(num/den) whole
//   seconds are added to the start clock, and the displayed finish
//   clock drops its seconds. Duration text never rolls into days.

export const FIELDS = [
  "sizeValue",
  "sizeUnit",
  "speedValue",
  "speedUnit",
  "efficiency",
  "startTime",
];

// Per-field raw length caps in UTF-16 code units (SPEC inputsOutputs).
export const FIELD_LIMITS = {
  sizeValue: 10,
  sizeUnit: 4,
  speedValue: 10,
  speedUnit: 4,
  efficiency: 3,
  startTime: 5,
};

export const DEFAULTS = {
  sizeValue: "1",
  sizeUnit: "GB",
  speedValue: "100",
  speedUnit: "Mbps",
  efficiency: "100",
  startTime: "",
};

// The worked example is fixtures.json case 1 (basic-gb) input, vendored
// verbatim in test/fixtures.json.
export const EXAMPLE = {
  sizeValue: "4.7",
  sizeUnit: "GB",
  speedValue: "100",
  speedUnit: "Mbps",
  efficiency: "100",
  startTime: "21:30",
};

// Bytes per size unit: decimal SI and binary IEC are separate enum
// values; there is no unit-system toggle.
export const SIZE_UNIT_BYTES = {
  B: 1n,
  KB: 1000n,
  MB: 1000000n,
  GB: 1000000000n,
  TB: 1000000000000n,
  KiB: 1024n,
  MiB: 1048576n,
  GiB: 1073741824n,
  TiB: 1099511627776n,
};

// Bits per second per speed unit.
export const SPEED_UNIT_BITS = {
  Mbps: 1000000n,
  "MB/s": 8000000n,
};

export const REPORT_LIMIT_BYTES = 2097152;

// ASCII decimal strings only: "0" or a non-zero leading digit, an
// optional fraction of 1-3 digits. No sign, whitespace, exponent, or
// non-ASCII digits; those fail the grammar, never normalize.
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const TIME_PATTERN = /^[0-9]{2}:[0-9]{2}$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the six
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

function hasUnpairedSurrogate(value) {
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
// surrogate, empty, grammar, range. Returns { milli } for decimal
// fields, { value } for the others, or { error }.
function validateDecimal(field, value, minMilli, maxMilli) {
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const dot = value.indexOf(".");
  const whole = dot === -1 ? value : value.slice(0, dot);
  const fraction = dot === -1 ? "000" : value.slice(dot + 1).padEnd(3, "0");
  const milli = BigInt(whole) * 1000n + BigInt(fraction);
  if (milli < minMilli || milli > maxMilli) return { error: failure("RANGE", field) };
  return { milli };
}

function validateField(field, value) {
  if (value.length > FIELD_LIMITS[field]) return { error: failure("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (field === "sizeValue") return validateDecimal(field, value, 1n, 9999999n);
  if (field === "speedValue") return validateDecimal(field, value, 10n, 999999999n);
  if (field === "sizeUnit") {
    if (!Object.hasOwn(SIZE_UNIT_BYTES, value)) return { error: failure("ENUM", field) };
    return { value };
  }
  if (field === "speedUnit") {
    if (!Object.hasOwn(SPEED_UNIT_BITS, value)) return { error: failure("ENUM", field) };
    return { value };
  }
  if (field === "efficiency") {
    if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
    const numeric = Number(value);
    if (numeric < 1 || numeric > 100) return { error: failure("RANGE", field) };
    return { value: numeric };
  }
  // startTime
  if (!TIME_PATTERN.test(value)) return { error: failure("TIME_FORMAT", field) };
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));
  if (hours > 23 || minutes > 59) return { error: failure("RANGE", field) };
  return { value: { hours, minutes } };
}

// Exact decimal string for milli * unitBytes / 1000: integer part as
// usual, fraction of at most 3 digits with trailing zeros removed, no
// decimal point when integral, never exponential notation.
function formatSizeBytes(sizeMilli, unitBytes) {
  const numerator = sizeMilli * unitBytes;
  const whole = numerator / 1000n;
  const fraction = numerator % 1000n;
  if (fraction === 0n) return whole.toString();
  const digits = fraction.toString().padStart(3, "0").replace(/0+$/, "");
  return `${whole.toString()}.${digits}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

// Duration text from the rounded whole seconds: H:MM:SS at or above
// one hour (H unpadded, may exceed 24 — never rolls into days), M:SS
// below one hour, 0:SS below one minute.
function formatDurationText(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (totalSeconds >= 3600) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  if (totalSeconds >= 60) return `${Math.floor(totalSeconds / 60)}:${pad2(seconds)}`;
  return `0:${pad2(seconds)}`;
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of FIELDS) {
    const outcome = validateField(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome;
  }

  const sizeMilli = checked.sizeValue.milli;
  const unitBytes = SIZE_UNIT_BYTES[checked.sizeUnit.value];
  const speedMilli = checked.speedValue.milli;
  const speedBits = SPEED_UNIT_BITS[checked.speedUnit.value];
  const efficiency = BigInt(checked.efficiency.value);

  const num = sizeMilli * unitBytes * 800n;
  const den = speedMilli * speedBits * efficiency;

  const durationSeconds = Number((2n * num + den) / (2n * den));
  const durationParts = {
    hours: Math.floor(durationSeconds / 3600),
    minutes: Math.floor((durationSeconds % 3600) / 60),
    seconds: durationSeconds % 60,
  };

  // Finish time from the UNROUNDED duration: whole seconds of D are
  // floored, added to the start clock, and the clock's seconds are not
  // displayed. The duration itself is never used here.
  const { hours, minutes } = checked.startTime.value;
  const startSec = (hours * 60 + minutes) * 60;
  const totalFloor = BigInt(startSec) + num / den;
  const finishDayOffset = Number(totalFloor / 86400n);
  const clockSec = Number(totalFloor % 86400n);
  const finishTime = `${pad2(Math.floor(clockSec / 3600))}:${pad2(Math.floor((clockSec % 3600) / 60))}`;
  const finishText = finishDayOffset === 0 ? finishTime : `${finishTime} +${finishDayOffset}d`;

  return {
    ok: true,
    result: {
      durationSeconds,
      durationText: formatDurationText(durationSeconds),
      durationParts,
      finishTime,
      finishDayOffset,
      finishText,
      sizeBytes: formatSizeBytes(sizeMilli, unitBytes),
    },
  };
}

// Canonical report serialization: compact JSON of the result, object
// own keys sorted ascending by UTF-16 code units recursively, array
// order unchanged, exactly one trailing LF. Built by hand from own
// data properties so an input's toJSON is never invoked. Returns null
// when the UTF-8 encoding would exceed the report limit.
export function serializeReport(result) {
  const text = `${canonicalStringify(result)}\n`;
  if (new TextEncoder().encode(text).length > REPORT_LIMIT_BYTES) return null;
  return text;
}

function canonicalStringify(value) {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number in report");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalStringify(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("non-data property in report");
      }
      parts.push(`${JSON.stringify(key)}:${canonicalStringify(descriptor.value)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported value in report");
}
