// Parking Fee Calculator — pure core (validation + billing + report bytes).
// Contract: SPEC.md of spec-parking-fee-calculator-20261109 (candidate
// commit 29b703e0a23ea6e5c56d702a746686467892d01f). No DOM, no network, no
// storage, no Date/timezone reads: all civil-time math is integer
// days-from-civil arithmetic on Asia/Taipei wall-clock minute serials.

export const FIELD_ORDER = [
  "entry",
  "exit",
  "graceMinutes",
  "firstPeriodMinutes",
  "firstPrice",
  "nextPeriodMinutes",
  "nextPrice",
  "dailyCap",
  "lostTicketFee",
  "lostTicket"
];

export const DEFAULT_DRAFT = Object.freeze({
  entry: "",
  exit: "",
  graceMinutes: "15",
  firstPeriodMinutes: "60",
  firstPrice: "40",
  nextPeriodMinutes: "30",
  nextPrice: "20",
  dailyCap: "200",
  lostTicketFee: "1000",
  lostTicket: false
});

export const MAX_TOTAL_MINUTES = 43200; // 30 days
export const REPORT_LIMIT_BYTES = 2097152;

const NUMERIC_RANGES = {
  graceMinutes: [0, 1440],
  firstPeriodMinutes: [1, 1440],
  firstPrice: [0, 999999],
  nextPeriodMinutes: [1, 1440],
  nextPrice: [0, 999999],
  dailyCap: [0, 999999],
  lostTicketFee: [0, 999999]
};

const RAW_LIMIT = 8;
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;
const DATETIME_RE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/;
const LONE_SURROGATE_RE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(y, m) {
  return m === 2 && isLeapYear(y) ? 29 : MONTH_DAYS[m - 1];
}

// Howard Hinnant's days-from-civil: serial day number with 1970-01-01 = 0.
function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const mp = m > 2 ? m - 3 : m + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

// Inverse of daysFromCivil.
function civilFromDays(z) {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { year: m <= 2 ? y + 1 : y, month: m, day: d };
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function formatDate(daySerial) {
  const c = civilFromDays(daySerial);
  return String(c.year) + "-" + pad2(c.month) + "-" + pad2(c.day);
}

// Parse a pinned YYYY-MM-DDTHH:MM wall-clock string to an absolute minute
// serial (Asia/Taipei; fixed UTC+8, no DST, so day boundaries are exactly
// the multiples of 1440). Returns null when the grammar or calendar fails.
function parseDateTime(raw) {
  const m = DATETIME_RE.exec(raw);
  if (m === null) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59) return null;
  return daysFromCivil(year, month, day) * 1440 + hour * 60 + minute;
}

function hasLoneSurrogate(s) {
  return LONE_SURROGATE_RE.test(s);
}

// Schema step: exact own-key set, data properties only, pinned types.
function checkSchema(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) return false;
  const keys = Object.keys(input);
  if (keys.length !== FIELD_ORDER.length) return false;
  for (const field of FIELD_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) return false;
    const desc = Object.getOwnPropertyDescriptor(input, field);
    if (desc === undefined || !("value" in desc)) return false;
    if (field === "lostTicket") {
      if (typeof desc.value !== "boolean") return false;
    } else if (typeof desc.value !== "string") {
      return false;
    }
  }
  return true;
}

// Per-field validation in pinned order; returns {values} or an error object.
function validate(input) {
  const values = {};
  for (const field of FIELD_ORDER) {
    if (field === "lostTicket") {
      values.lostTicket = input.lostTicket;
      continue;
    }
    const raw = input[field];
    if (field === "entry" || field === "exit") {
      if (hasLoneSurrogate(raw)) return fail("UNICODE", field);
      if (raw === "") return fail("EMPTY", field);
      const serial = parseDateTime(raw);
      if (serial === null) return fail("DATETIME_FORMAT", field);
      values[field] = serial;
      continue;
    }
    if (raw.length > RAW_LIMIT) return fail("INPUT_LIMIT", field);
    if (hasLoneSurrogate(raw)) return fail("UNICODE", field);
    if (raw === "") return fail("EMPTY", field);
    if (!INTEGER_RE.test(raw)) return fail("INTEGER_FORMAT", field);
    const n = Number(raw);
    const range = NUMERIC_RANGES[field];
    if (n < range[0] || n > range[1]) return fail("RANGE", field);
    values[field] = n;
  }
  return { values };
}

function billDay(minutes, v) {
  let nextPeriods = 0;
  if (minutes > v.firstPeriodMinutes) {
    nextPeriods = Math.floor(
      (minutes - v.firstPeriodMinutes + v.nextPeriodMinutes - 1) / v.nextPeriodMinutes
    );
  }
  const rawFee = v.firstPrice + nextPeriods * v.nextPrice;
  let capped = false;
  let fee = rawFee;
  if (v.dailyCap > 0 && rawFee > v.dailyCap) {
    capped = true;
    fee = v.dailyCap;
  }
  return { firstPeriods: 1, nextPeriods, rawFee, capped, feeAfterCap: fee };
}

export function run(input) {
  try {
    if (!checkSchema(input)) return fail("SCHEMA", null);
    const checked = validate(input);
    if (checked.ok === false) return checked;
    const v = checked.values;
    const entryAbs = v.entry;
    const exitAbs = v.exit;
    if (exitAbs <= entryAbs) return fail("ORDER", "exit");
    const totalMinutes = exitAbs - entryAbs;
    if (totalMinutes > MAX_TOTAL_MINUTES) return fail("RANGE", "exit");

    if (v.lostTicket) {
      return {
        ok: true,
        result: {
          lostTicketApplied: true,
          graceApplied: false,
          totalMinutes,
          days: [],
          totalFee: v.lostTicketFee
        }
      };
    }

    const graceApplied = totalMinutes <= v.graceMinutes;
    const days = [];
    const firstDay = Math.floor(entryAbs / 1440);
    const lastDay = Math.floor((exitAbs - 1) / 1440);
    let totalFee = 0;
    for (let day = firstDay; day <= lastDay; day += 1) {
      const dayStart = day * 1440;
      const minutes = Math.min(exitAbs, dayStart + 1440) - Math.max(entryAbs, dayStart);
      if (minutes <= 0) continue;
      const billed = billDay(minutes, v);
      const fee = graceApplied ? 0 : billed.feeAfterCap;
      totalFee += fee;
      days.push({
        date: formatDate(day),
        minutes,
        firstPeriods: billed.firstPeriods,
        nextPeriods: billed.nextPeriods,
        rawFee: billed.rawFee,
        capped: billed.capped,
        fee
      });
    }
    return {
      ok: true,
      result: {
        lostTicketApplied: false,
        graceApplied,
        totalMinutes,
        days,
        totalFee
      }
    };
  } catch {
    return fail("INTERNAL", null);
  }
}

// Canonical report serialization: compact JSON, object keys sorted by
// UTF-16 code units recursively, array order preserved, one trailing LF,
// UTF-8 without BOM. Built by hand so no input toJSON can interfere.
function serializeValue(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(serializeValue).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + serializeValue(value[k]));
  return "{" + parts.join(",") + "}";
}

export function serializeReport(result) {
  return serializeValue(result) + "\n";
}

export function buildReport(result) {
  const text = serializeReport(result);
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
