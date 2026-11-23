// Pure core for the Freelance Rate Calculator
// (spec-freelance-rate-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// The SPEC pins the direction opposite to salary-converter: the rate
// is derived FROM the target annual income, not the other way round.
// All derivation uses exact rational arithmetic (BigInt numerator /
// denominator); binary floating point never participates in the
// derivation or the rounding. Rounding is half-up, applied exactly
// once, at output only: amounts to whole NT$, billable days/hours to
// one decimal. The rates are computed from the unrounded exact
// values, never from already-rounded intermediates:
//
//   grossTarget      = targetAnnualIncome x (1 + overheadPercent / 100)
//   billableDays     = workingDaysPerYear x billableUtilizationPercent / 100
//   billableHours    = billableDays x hoursPerDay
//   dayRate          = grossTarget / billableDays
//   hourlyRate       = grossTarget / billableHours
//   monthlyTarget    = targetAnnualIncome / 12
//
// The result shape follows fixtures.json exactly:
// {grossTarget, billableDays, billableHours, dayRate, hourlyRate,
// monthlyTarget}. Amounts are whole NT$ (JSON integers); days/hours
// are one-decimal JSON numbers (154 renders as 154, 149.5 as 149.5).

export const FIELDS = [
  "targetAnnualIncome",
  "workingDaysPerYear",
  "hoursPerDay",
  "billableUtilizationPercent",
  "overheadPercent",
];

// SPEC userFlow reset defaults (also the fixtures.json case 1 input,
// so EXAMPLE equals DEFAULTS here; see HANDOFF.md).
export const DEFAULTS = {
  targetAnnualIncome: "1200000",
  workingDaysPerYear: "220",
  hoursPerDay: "8",
  billableUtilizationPercent: "70",
  overheadPercent: "20",
};

// The worked example is fixtures.json case 1 (standard-rate) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { ...DEFAULTS };

export const MAX_RAW_UNITS = 12;

// Pinned §4 ranges, as the exact strings the grammar accepts.
export const RANGES = {
  targetAnnualIncome: { min: "1", max: "100000000" },
  workingDaysPerYear: { min: "1", max: "365" },
  hoursPerDay: { min: "0.5", max: "24" },
  billableUtilizationPercent: { min: "1", max: "100" },
  overheadPercent: { min: "0", max: "100" },
};

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
// House decimal grammar (same canonical leading-zero rule as the
// integer fields): integer part "0" or non-zero leading, then at
// most one fractional digit.
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the five
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

// Exact rational: { n: BigInt, d: BigInt }, d > 0. Values are never
// reduced; magnitudes here stay far below any BigInt concern.
function rat(n, d) {
  return { n, d };
}

function mulRat(a, b) {
  return rat(a.n * b.n, a.d * b.d);
}

function divRat(a, b) {
  // b.n > 0 at every call site (billable days/hours are strictly
  // positive: workingDaysPerYear >= 1 and utilization >= 1).
  return rat(a.n * b.d, a.d * b.n);
}

// -1 / 0 / 1, by cross-multiplication (no division, no float).
function cmpRat(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// Parse a grammar-valid decimal string ("8", "7.5", "62.5") to its
// exact rational. The integer part carries the digits; the
// denominator is 10^(fraction digits).
function parseDecimal(value) {
  const dot = value.indexOf(".");
  if (dot === -1) return rat(BigInt(value), 1n);
  const digits = value.slice(0, dot) + value.slice(dot + 1);
  return rat(BigInt(digits), 10n ** BigInt(value.length - dot - 1));
}

function parseRangeBound(value) {
  return parseDecimal(value);
}

// Half-up rounding of a non-negative rational to a whole number:
// floor((2n + d) / (2d)). All derived values here are non-negative.
function halfUpInt(value) {
  return (2n * value.n + value.d) / (2n * value.d);
}

// Half-up rounding of a non-negative rational to one decimal place,
// returned as the nearest JS number to the exact tenths value
// (e.g. 149.5, 154, 0). The exact tenths integer is computed first;
// only this final conversion touches a JS number.
function roundToTenths(value) {
  const tenths = halfUpInt(rat(value.n * 10n, value.d));
  return Number(tenths) / 10;
}

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range. Returns the parsed exact value
// (BigInt for integer fields, rational for decimal fields) or an
// { error } outcome.
function validateIntegerField(field, value, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = BigInt(value);
  if (parsed < min || parsed > max) return { error: failure("RANGE", field) };
  return { value: parsed };
}

function validateDecimalField(field, value, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  const parsed = parseDecimal(value);
  if (cmpRat(parsed, min) < 0 || cmpRat(parsed, max) > 0) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const targetOutcome = validateIntegerField(
    "targetAnnualIncome",
    raw.targetAnnualIncome,
    BigInt(RANGES.targetAnnualIncome.min),
    BigInt(RANGES.targetAnnualIncome.max),
  );
  if (targetOutcome.error) return targetOutcome.error;
  const daysOutcome = validateIntegerField(
    "workingDaysPerYear",
    raw.workingDaysPerYear,
    BigInt(RANGES.workingDaysPerYear.min),
    BigInt(RANGES.workingDaysPerYear.max),
  );
  if (daysOutcome.error) return daysOutcome.error;
  const hoursOutcome = validateDecimalField(
    "hoursPerDay",
    raw.hoursPerDay,
    parseRangeBound(RANGES.hoursPerDay.min),
    parseRangeBound(RANGES.hoursPerDay.max),
  );
  if (hoursOutcome.error) return hoursOutcome.error;
  const utilizationOutcome = validateDecimalField(
    "billableUtilizationPercent",
    raw.billableUtilizationPercent,
    parseRangeBound(RANGES.billableUtilizationPercent.min),
    parseRangeBound(RANGES.billableUtilizationPercent.max),
  );
  if (utilizationOutcome.error) return utilizationOutcome.error;
  const overheadOutcome = validateDecimalField(
    "overheadPercent",
    raw.overheadPercent,
    parseRangeBound(RANGES.overheadPercent.min),
    parseRangeBound(RANGES.overheadPercent.max),
  );
  if (overheadOutcome.error) return overheadOutcome.error;

  const target = targetOutcome.value;
  const days = daysOutcome.value;
  const hours = hoursOutcome.value;
  const utilization = utilizationOutcome.value;
  const overhead = overheadOutcome.value;

  // Exact derivation. grossTarget = target x (1 + overhead / 100),
  // with overhead = overhead.n / overhead.d, so the multiplier is
  // (100 x overhead.d + overhead.n) / (100 x overhead.d).
  const grossTarget = rat(
    target * (100n * overhead.d + overhead.n),
    100n * overhead.d,
  );
  const billableDays = rat(days * utilization.n, 100n * utilization.d);
  const billableHours = mulRat(billableDays, hours);
  const dayRate = divRat(grossTarget, billableDays);
  const hourlyRate = divRat(grossTarget, billableHours);
  const monthlyTarget = rat(target, 12n);

  // Rounding happens exactly once, here, at output. The rates above
  // were computed from the unrounded exact values.
  return {
    ok: true,
    result: {
      grossTarget: Number(halfUpInt(grossTarget)),
      billableDays: roundToTenths(billableDays),
      billableHours: roundToTenths(billableHours),
      dayRate: Number(halfUpInt(dayRate)),
      hourlyRate: Number(halfUpInt(hourlyRate)),
      monthlyTarget: Number(halfUpInt(monthlyTarget)),
    },
  };
}

// Fixed report download: freelance-rate-calculator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is hand-written:
// it never calls a value's toJSON and accepts only the plain data
// shapes a result can hold (null, booleans, finite numbers — whole
// NT$ amounts and one-decimal days/hours — strings, arrays, plain
// objects).
export const REPORT_FILENAME = "freelance-rate-calculator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    return JSON.stringify(value);
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
