// Pure core for the Period Cycle Calculator.
// No DOM, network, storage, clock, or timezone access. Implements SPEC.md
// (spec-period-cycle-calculator-20261109): the calendar-method estimate
// with a fixed 14-day luteal phase. Ovulation = cycle start + (cycle
// length - 14); the fertile span is ovulation - 5 days through
// ovulation + 1 day inclusive. All arithmetic is integer Julian Day
// Number math — no floating point, no rounding, no host clock reads.

export const FIELDS = ["lastPeriodStart", "cycleLength", "periodLength"];

// Maximum raw length per field, in UTF-16 code units.
export const RAW_LIMITS = {
  lastPeriodStart: 10,
  cycleLength: 8,
  periodLength: 8,
};

export const DEFAULTS = {
  lastPeriodStart: "",
  cycleLength: "28",
  periodLength: "5",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  lastPeriodStart: "2026-10-26",
  cycleLength: "28",
  periodLength: "5",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "period-cycle-report.json";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

// Inclusive integer ranges for the two day-count fields.
const INTEGER_RANGES = {
  cycleLength: [21, 35],
  periodLength: [1, 10],
};

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

// Gregorian Julian Day Number, Fliegel & Van Flandern integer formula
// (pinned by the SPEC). All divisions are exact integer floors.
export function dateToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// Inverse conversion, Richards' integer formula (pinned by the SPEC).
export function jdnToDate(jdn) {
  const f = jdn + 1401 + Math.floor((Math.floor((4 * jdn + 274277) / 146097) * 3) / 4) - 38;
  const e = 4 * f + 3;
  const g = Math.floor((e % 1461) / 4);
  const h = 5 * g + 2;
  const day = Math.floor((h % 153) / 5) + 1;
  const month = ((Math.floor(h / 153) + 2) % 12) + 1;
  const year = Math.floor(e / 1461) - 4716 + Math.floor((14 - month) / 12);
  return { year, month, day };
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year, month) {
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_DAYS[month - 1];
}

function formatIso({ year, month, day }) {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MIN_JDN = dateToJdn(1900, 1, 1);
const MAX_JDN = dateToJdn(2100, 12, 31);

// Schema gate: the input must be a plain object whose own properties are
// exactly the three fields, each an own data property (no accessors)
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

// Validate one field in the SPEC's order: capacity (INPUT_LIMIT),
// unpaired surrogate (UNICODE), missing content (EMPTY), grammar
// (DATE_FORMAT / INTEGER_FORMAT), calendar existence (INVALID_DATE),
// range (RANGE). Returns null when valid, otherwise the error.
function validateField(field, raw) {
  if (raw.length > RAW_LIMITS[field]) {
    return { code: "INPUT_LIMIT", field, row: null };
  }
  if (hasUnpairedSurrogate(raw)) {
    return { code: "UNICODE", field, row: null };
  }
  if (raw === "") {
    return { code: "EMPTY", field, row: null };
  }
  if (field === "lastPeriodStart") {
    if (!DATE_PATTERN.test(raw)) {
      return { code: "DATE_FORMAT", field, row: null };
    }
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      return { code: "INVALID_DATE", field, row: null };
    }
    const jdn = dateToJdn(year, month, day);
    if (jdn < MIN_JDN || jdn > MAX_JDN) {
      return { code: "RANGE", field, row: null };
    }
    return null;
  }
  if (!INTEGER_PATTERN.test(raw)) {
    return { code: "INTEGER_FORMAT", field, row: null };
  }
  const value = Number(raw);
  const [min, max] = INTEGER_RANGES[field];
  if (value < min || value > max) {
    return { code: "RANGE", field, row: null };
  }
  return null;
}

// Validate the whole input: schema first, then fields in the fixed order
// lastPeriodStart, cycleLength, periodLength; the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  return { ok: true, values };
}

// The estimate. Four cycles: the one starting at lastPeriodStart and the
// next three. Every derived date is a JDN offset from the cycle start;
// output dates may fall outside the input range (into 2101) without error.
export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { lastPeriodStart, cycleLength, periodLength } = validated.values;
  const year = Number(lastPeriodStart.slice(0, 4));
  const month = Number(lastPeriodStart.slice(5, 7));
  const day = Number(lastPeriodStart.slice(8, 10));
  const j0 = dateToJdn(year, month, day);
  const cycle = Number(cycleLength);
  const period = Number(periodLength);

  const cycles = [];
  for (let i = 0; i < 4; i += 1) {
    const start = j0 + i * cycle;
    const ovulation = start + cycle - 14;
    cycles.push({
      index: i,
      start: formatIso(jdnToDate(start)),
      periodEnd: formatIso(jdnToDate(start + period - 1)),
      ovulation: formatIso(jdnToDate(ovulation)),
      fertileStart: formatIso(jdnToDate(ovulation - 5)),
      fertileEnd: formatIso(jdnToDate(ovulation + 1)),
    });
  }
  return { ok: true, result: { cycles } };
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
