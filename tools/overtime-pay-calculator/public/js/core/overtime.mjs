// Daily tiers are calculated before summing the month. Half-hour units and
// BigInt numerators over 1440 keep all pay calculations exact.
export const FIELDS = Object.freeze(["monthlySalary", "month", "entries"]);
export const ENTRY_FIELDS = Object.freeze(["date", "kind", "hours"]);
export const KINDS = Object.freeze(["weekday", "restDay", "holiday"]);
export const MAX_ENTRIES = 31;
export const EMPTY_ENTRY = Object.freeze({ date: "", kind: "weekday", hours: "0" });
export const DEFAULTS = Object.freeze({
  monthlySalary: "",
  month: "",
  entries: Object.freeze([EMPTY_ENTRY]),
});
export const EXAMPLE = Object.freeze({
  monthlySalary: "36000",
  month: "2024-02",
  entries: Object.freeze([Object.freeze({ date: "2024-02-01", kind: "weekday", hours: "3" })]),
});

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "overtime-pay-report.json";

const SALARY_PATTERN = /^(0|[1-9][0-9]*)(?![\s\S])/;
const HOURS_PATTERN = /^(0|[1-9][0-9]*)(?:\.([0-9]))?(?![\s\S])/;
const MONTH_PATTERN = /^([0-9]{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-([0-9]{2})$/;

function failure(code, field = null, row = null) {
  return { ok: false, error: { code, field, row } };
}

function ownData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && Object.hasOwn(descriptor, "value") ? descriptor : null;
}

function recordDescriptors(record, fields, row = null) {
  if (record === null || typeof record !== "object" || Object.getPrototypeOf(record) !== Object.prototype) {
    return failure("SCHEMA", row === null ? null : "entries", row);
  }
  const keys = Reflect.ownKeys(record);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key))) {
    return failure("SCHEMA", row === null ? null : "entries", row);
  }
  const descriptors = {};
  for (const field of fields) {
    const descriptor = ownData(record, field);
    if (!descriptor) return failure("SCHEMA", field, row);
    descriptors[field] = descriptor;
  }
  return { descriptors };
}

function validateSalary(raw) {
  if (typeof raw !== "string") return failure("SCHEMA", "monthlySalary");
  if (raw.length > 8) return failure("INPUT_LIMIT", "monthlySalary");
  if (raw === "") return failure("EMPTY", "monthlySalary");
  if (!SALARY_PATTERN.test(raw)) return failure("INTEGER_FORMAT", "monthlySalary");
  const salary = BigInt(raw);
  if (salary < 1n || salary > 99999999n) return failure("RANGE", "monthlySalary");
  return { salary };
}

function validateMonth(month) {
  if (typeof month !== "string") return failure("SCHEMA", "month");
  if (month === "") return failure("EMPTY", "month");
  const match = month.length === 7 && MONTH_PATTERN.exec(month);
  if (!match) return failure("MONTH_FORMAT", "month");
  const year = Number(match[1]);
  if (year < 1900 || year > 2100) return failure("RANGE", "month");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return { maxDay: monthLengths[Number(match[2]) - 1] };
}

function validateEntry(descriptors, row, month, maxDay, dates) {
  const { date, kind, hours } = descriptors;
  for (const field of ENTRY_FIELDS) {
    if (typeof descriptors[field].value !== "string") return failure("SCHEMA", field, row);
    if (descriptors[field].value === "") return failure("EMPTY", field, row);
  }
  const match = date.value.length === 10 && DATE_PATTERN.exec(date.value);
  if (!match) return failure("DATE_FORMAT", "date", row);
  if (date.value.slice(0, 7) !== month) return failure("DATE_MONTH", "date", row);
  const day = Number(match[1]);
  if (day < 1 || day > maxDay) return failure("DATE_FORMAT", "date", row);
  if (dates.has(date.value)) return failure("DUPLICATE_DATE", "date", row);
  if (!KINDS.includes(kind.value)) return failure("KIND", "kind", row);
  if (hours.value.length > 4) return failure("INPUT_LIMIT", "hours", row);
  const parts = HOURS_PATTERN.exec(hours.value);
  if (!parts) return failure("DECIMAL_FORMAT", "hours", row);
  const fraction = parts[2];
  if (fraction !== undefined && fraction !== "0" && fraction !== "5") {
    return failure("HOURS_STEP", "hours", row);
  }
  const halves = Number(parts[1]) * 2 + (fraction === "5" ? 1 : 0);
  if (halves > (kind.value === "weekday" ? 8 : 24)) return failure("RANGE", "hours", row);
  dates.add(date.value);
  return { entry: { date: date.value, kind: kind.value, halves } };
}

export function validateInput(input) {
  try {
    const shape = recordDescriptors(input, FIELDS);
    if (shape.error) return shape;
    const entries = shape.descriptors.entries.value;
    if (!Array.isArray(entries) || Object.getPrototypeOf(entries) !== Array.prototype) {
      return failure("SCHEMA", "entries");
    }
    const length = ownData(entries, "length")?.value;
    if (!Number.isInteger(length)) return failure("SCHEMA", "entries");
    if (length < 1 || length > MAX_ENTRIES) return failure("ENTRY_COUNT", "entries");
    const rows = [];
    for (let row = 0; row < length; row += 1) {
      const item = ownData(entries, String(row));
      if (!item) return failure("SCHEMA", "entries", row);
      const checked = recordDescriptors(item.value, ENTRY_FIELDS, row);
      if (checked.error) return checked;
      rows.push(checked.descriptors);
    }
    if (Reflect.ownKeys(entries).length !== length + 1) return failure("SCHEMA", "entries");

    const { monthlySalary, month } = shape.descriptors;
    const checkedSalary = validateSalary(monthlySalary.value);
    if (checkedSalary.error) return checkedSalary;
    const checkedMonth = validateMonth(month.value);
    if (checkedMonth.error) return checkedMonth;
    const dates = new Set();
    const values = [];
    for (let row = 0; row < length; row += 1) {
      const checked = validateEntry(rows[row], row, month.value, checkedMonth.maxDay, dates);
      if (checked.error) return checked;
      values.push(checked.entry);
    }
    return { ok: true, values: { monthlySalary: checkedSalary.salary, month: month.value, entries: values } };
  } catch {
    // Reflection can throw for a revoked Proxy or a hostile reflection trap.
    return failure("SCHEMA");
  }
}

function roundHalfUpDiv(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

function formatTwoDecimals(numerator, denominator) {
  const hundredths = roundHalfUpDiv(numerator * 100n, denominator);
  return `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, "0")}`;
}

const WEEKDAY_TIERS = [[4, 4], [4, 5]];
const REST_DAY_TIERS = [[4, 4], [12, 5], [8, 8]];

function calculateDay(salary, { date, kind, halves }) {
  const holiday = kind === "holiday";
  const dayPayApplied = holiday && halves > 0;
  const overtimeHalves = holiday ? Math.max(0, halves - 16) : halves;
  const tiers = kind === "restDay" ? REST_DAY_TIERS : WEEKDAY_TIERS;
  const bands = [];
  // salary / 30 is salary * 48 / 1440.
  let numerator = dayPayApplied ? salary * 48n : 0n;
  let remaining = overtimeHalves;
  for (const [cap, multiplier] of tiers) {
    if (remaining === 0) break;
    const bandHalves = Math.min(remaining, cap);
    bands.push({ hours: bandHalves / 2, multiplier: `${multiplier}/3` });
    numerator += salary * BigInt(bandHalves * multiplier);
    remaining -= bandHalves;
  }
  return {
    date,
    kind,
    hours: halves / 2,
    bands,
    dayPayApplied,
    countedOtHours: overtimeHalves / 2,
    payTwd: Number(roundHalfUpDiv(numerator, 1440n)),
  };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { monthlySalary: salary, month, entries } = validated.values;
  const days = entries.map((entry) => calculateDay(salary, entry));
  const categories = Object.fromEntries(KINDS.map((kind) => [kind, { hours: 0, payTwd: 0 }]));
  let totalPayTwd = 0;
  let countedOtHours = 0;
  for (const day of days) {
    categories[day.kind].hours += day.hours;
    categories[day.kind].payTwd += day.payTwd;
    totalPayTwd += day.payTwd;
    countedOtHours += day.countedOtHours;
  }
  return {
    ok: true,
    result: {
      month,
      hourlyRateTwd: formatTwoDecimals(salary, 240n),
      dailyWageTwd: formatTwoDecimals(salary, 30n),
      days,
      categories,
      totalPayTwd,
      countedOtHours,
      capNote: countedOtHours > 46,
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
