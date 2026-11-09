// Pure core for the Overtime Pay Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-overtime-pay-calculator-20261109): Taiwan Labor Standards Act
// Articles 24 and 39 rates over one month of aggregated hours.
//
// All money math is exact rational arithmetic on BigInt. Hours are handled
// in half-hour units; the hourly rate is salary / 240; a band with h half
// hours and multiplier m/3 pays salary * h * m / 1440. Each category
// subtotal is rounded half-up to whole NT$ exactly once, and the total is
// the sum of the three rounded subtotals. Display rates (hourly/daily) are
// rounded half-up to 2 decimals for display only and never feed the pay
// computation.

export const FIELDS = ["monthlySalary", "weekdayOtHours", "restDayHours", "holidayHours"];

// Raw input capacity per field, in UTF-16 code units.
export const RAW_LIMITS = {
  monthlySalary: 8,
  weekdayOtHours: 4,
  restDayHours: 4,
  holidayHours: 4,
};

// Value ranges: monthlySalary in whole NT$; the hour fields in half-hour
// units (weekday 0-4 h, rest-day 0-12 h, holiday 0-12 h).
export const RANGES = {
  monthlySalary: [1, 99999999],
  weekdayOtHours: [0, 8],
  restDayHours: [0, 24],
  holidayHours: [0, 24],
};

export const DEFAULTS = {
  monthlySalary: "",
  weekdayOtHours: "0",
  restDayHours: "0",
  holidayHours: "0",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  monthlySalary: "36000",
  weekdayOtHours: "3",
  restDayHours: "0",
  holidayHours: "0",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "overtime-pay-report.json";

const SALARY_PATTERN = /^(0|[1-9][0-9]*)$/;
const HOURS_PATTERN = /^(0|[1-9][0-9]*)(?:\.([0-9]))?$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

// Validate one field in the SPEC's order: raw capacity (INPUT_LIMIT), then
// empty (EMPTY), then grammar (INTEGER_FORMAT for the salary,
// DECIMAL_FORMAT for hours), then the 0.5-hour step (HOURS_STEP), then the
// value range (RANGE). Returns { error } or { value }, where value is a
// BigInt for monthlySalary and an integer count of half hours otherwise.
function validateField(field, raw) {
  if (raw.length > RAW_LIMITS[field]) {
    return { error: { code: "INPUT_LIMIT", field, row: null } };
  }
  if (raw === "") {
    return { error: { code: "EMPTY", field, row: null } };
  }
  if (field === "monthlySalary") {
    if (!SALARY_PATTERN.test(raw)) {
      return { error: { code: "INTEGER_FORMAT", field, row: null } };
    }
    const value = BigInt(raw);
    const [min, max] = RANGES[field];
    if (value < BigInt(min) || value > BigInt(max)) {
      return { error: { code: "RANGE", field, row: null } };
    }
    return { value };
  }
  const match = HOURS_PATTERN.exec(raw);
  if (match === null) {
    return { error: { code: "DECIMAL_FORMAT", field, row: null } };
  }
  const fractionDigit = match[2];
  if (fractionDigit !== undefined && fractionDigit !== "0" && fractionDigit !== "5") {
    return { error: { code: "HOURS_STEP", field, row: null } };
  }
  const halves = Number(match[1]) * 2 + (fractionDigit === "5" ? 1 : 0);
  const [min, max] = RANGES[field];
  if (halves < min || halves > max) {
    return { error: { code: "RANGE", field, row: null } };
  }
  return { value: halves };
}

// Validate the whole input object. Unknown, missing, wrongly typed, or
// accessor-backed inputs are SCHEMA with field/row null. Fields are then
// checked in the SPEC's fixed order: monthlySalary, weekdayOtHours,
// restDayHours, holidayHours; the first error wins.
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
    const checked = validateField(field, raw);
    if (checked.error) return { ok: false, error: checked.error };
    values[field] = checked.value;
  }
  return { ok: true, values };
}

// Round the non-negative rational numerator/denominator half-up to an
// integer: floor((2n + d) / 2d). BigInt division of non-negative values
// truncates toward zero, which is floor here.
function roundHalfUpDiv(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Format the non-negative rational numerator/denominator rounded half-up
// to exactly two decimals, as a fixed two-decimal string. Display only.
function formatTwoDecimals(numerator, denominator) {
  const hundredths = roundHalfUpDiv(numerator * 100n, denominator);
  const whole = hundredths / 100n;
  const fraction = hundredths % 100n;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

// Split a half-hour count into rate bands. tiers is a list of
// [tierCapHalves, multiplierNumerator, multiplierLabel] consumed in order;
// each band pays salary * bandHalves * multiplierNumerator / 1440.
// Returns the non-zero bands and the summed numerator over 1440.
function splitBands(salary, halves, tiers) {
  const bands = [];
  let numerator = 0n;
  let remaining = halves;
  for (const [cap, multiplierNumerator, label] of tiers) {
    if (remaining <= 0) break;
    const bandHalves = Math.min(remaining, cap);
    bands.push({ hours: bandHalves / 2, multiplier: label });
    numerator += salary * BigInt(bandHalves) * BigInt(multiplierNumerator);
    remaining -= bandHalves;
  }
  return { bands, numerator };
}

const WEEKDAY_TIERS = [
  [4, 4, "4/3"],
  [Number.POSITIVE_INFINITY, 5, "5/3"],
];
const REST_DAY_TIERS = [
  [4, 4, "4/3"],
  [12, 5, "5/3"],
  [Number.POSITIVE_INFINITY, 8, "8/3"],
];
const HOLIDAY_EXTRA_TIERS = [
  [4, 4, "4/3"],
  [Number.POSITIVE_INFINITY, 5, "5/3"],
];

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const salary = validated.values.monthlySalary;
  const weekdayHalves = validated.values.weekdayOtHours;
  const restDayHalves = validated.values.restDayHours;
  const holidayHalves = validated.values.holidayHours;

  const weekdaySplit = splitBands(salary, weekdayHalves, WEEKDAY_TIERS);
  const weekdayPay = Number(roundHalfUpDiv(weekdaySplit.numerator, 1440n));

  const restDaySplit = splitBands(salary, restDayHalves, REST_DAY_TIERS);
  const restDayPay = Number(roundHalfUpDiv(restDaySplit.numerator, 1440n));

  // Holiday work: any attendance up to 8 hours earns one extra day's wage
  // (salary / 30 = salary * 48 / 1440); hours beyond 8 use the weekday
  // overtime tiers. The day wage and the extra bands are summed unrounded
  // and rounded half-up once.
  const dayPayApplied = holidayHalves > 0;
  const extraHalves = Math.max(0, holidayHalves - 16);
  const holidayExtraSplit = splitBands(salary, extraHalves, HOLIDAY_EXTRA_TIERS);
  const holidayNumerator = (dayPayApplied ? salary * 48n : 0n) + holidayExtraSplit.numerator;
  const holidayPay = Number(roundHalfUpDiv(holidayNumerator, 1440n));

  const countedHalves = weekdayHalves + restDayHalves + extraHalves;

  return {
    ok: true,
    result: {
      hourlyRateTwd: formatTwoDecimals(salary, 240n),
      dailyWageTwd: formatTwoDecimals(salary, 30n),
      weekday: { hours: weekdayHalves / 2, bands: weekdaySplit.bands, payTwd: weekdayPay },
      restDay: { hours: restDayHalves / 2, bands: restDaySplit.bands, payTwd: restDayPay },
      holiday: {
        hours: holidayHalves / 2,
        dayPayApplied,
        extraHours: extraHalves / 2,
        bands: holidayExtraSplit.bands,
        payTwd: holidayPay,
      },
      totalPayTwd: weekdayPay + restDayPay + holidayPay,
      countedOtHours: countedHalves / 2,
      capNote: countedHalves > 92,
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
