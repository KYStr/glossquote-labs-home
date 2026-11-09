// Annual Leave Calculator — pure core.
// Validates the raw draft and derives statutory annual leave under
// Article 38 of Taiwan's Labor Standards Act (version effective 2017-01-01).
// All date math is integer calendar arithmetic (days-from-civil); no local
// time Date construction is used to derive calendar days.

const FIELD_NAMES = ["startDate", "referenceDate", "usedDays"];
const DATE_LIMIT = 64;
const USED_LIMIT = 8;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const USED_MAX = 30;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_DAYS[month - 1];
}

// Howard Hinnant's days-from-civil: serial day number for a Gregorian date.
export function daysFromCivil(year, month, day) {
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const monthPrime = (month + 9) % 12;
  const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

// Inverse of daysFromCivil.
export function civilFromDays(serial) {
  const shifted = serial + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const yearBase = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime < 10 ? monthPrime + 3 : monthPrime - 9;
  return { year: month <= 2 ? yearBase + 1 : yearBase, month, day };
}

function formatDate({ year, month, day }) {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateParts(text) {
  const match = DATE_PATTERN.exec(text);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

// addMonths on {year, month, day}: advance k months, clamp the day to the
// target month's length (Aug 31 + 6 months -> Feb 28/29).
export function addMonthsParts(parts, k) {
  const index = parts.year * 12 + (parts.month - 1) + k;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const day = Math.min(parts.day, daysInMonth(year, month));
  return { year, month, day };
}

// anniv on {year, month, day}: same month/day k years later; a Feb 29 start
// falls on Feb 28 in non-leap years (Civil Code Art. 121 end-of-period rule).
export function annivParts(parts, k) {
  if (k === 0) return { ...parts };
  const year = parts.year + k;
  const day = Math.min(parts.day, daysInMonth(year, parts.month));
  return { year, month: parts.month, day };
}

export function addMonths(dateText, k) {
  return formatDate(addMonthsParts(parseDateParts(dateText), k));
}

export function anniv(dateText, k) {
  return formatDate(annivParts(parseDateParts(dateText), k));
}

function serialOf(parts) {
  return daysFromCivil(parts.year, parts.month, parts.day);
}

// Statutory days for a completed-years count n (assumes the 6-month point
// has been reached when n = 0). Labor Standards Act Art. 38.
function daysForCompletedYears(n) {
  if (n <= 0) return 3;
  if (n === 1) return 7;
  if (n === 2) return 10;
  if (n <= 4) return 14;
  if (n <= 9) return 15;
  return Math.min(15 + (n - 9), 30);
}

function hasLoneSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function readField(input, name) {
  const descriptor = Object.getOwnPropertyDescriptor(input, name);
  if (!descriptor) return { present: false, accessor: false, value: undefined };
  if (!("value" in descriptor)) return { present: true, accessor: true, value: undefined };
  return { present: true, accessor: false, value: descriptor.value };
}

// Validates one date field's raw string content. Returns {parts} or {error}.
function validateDateRaw(raw) {
  if (raw.length > DATE_LIMIT) return { error: failure("INPUT_LIMIT", null) };
  if (hasLoneSurrogate(raw)) return { error: failure("UNICODE", null) };
  if (raw === "") return { error: failure("EMPTY", null) };
  const parts = parseDateParts(raw);
  if (!parts) return { error: failure("DATE_FORMAT", null) };
  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > daysInMonth(parts.year, parts.month)
  ) {
    return { error: failure("INVALID_DATE", null) };
  }
  if (parts.year < YEAR_MIN || parts.year > YEAR_MAX) {
    return { error: failure("RANGE", null) };
  }
  return { parts };
}

function withField(result, field) {
  if (result.error) {
    return { error: failure(result.error.error.code, field) };
  }
  return result;
}

function runInner(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failure("SCHEMA", null);
  }
  for (const key of Object.keys(input)) {
    if (!FIELD_NAMES.includes(key)) return failure("SCHEMA", key);
  }

  const startField = readField(input, "startDate");
  if (!startField.present || startField.accessor || typeof startField.value !== "string") {
    return failure("SCHEMA", "startDate");
  }
  const startCheck = withField(validateDateRaw(startField.value), "startDate");
  if (startCheck.error) return startCheck.error;
  const start = startCheck.parts;

  const refField = readField(input, "referenceDate");
  if (!refField.present || refField.accessor || typeof refField.value !== "string") {
    return failure("SCHEMA", "referenceDate");
  }
  const refCheck = withField(validateDateRaw(refField.value), "referenceDate");
  if (refCheck.error) return refCheck.error;
  const ref = refCheck.parts;

  const usedField = readField(input, "usedDays");
  if (usedField.accessor) return failure("SCHEMA", "usedDays");
  let usedDays = 0;
  if (usedField.present && usedField.value !== null) {
    if (typeof usedField.value !== "string") return failure("SCHEMA", "usedDays");
    const raw = usedField.value;
    if (raw.length > USED_LIMIT) return failure("INPUT_LIMIT", "usedDays");
    if (hasLoneSurrogate(raw)) return failure("UNICODE", "usedDays");
    if (raw !== "") {
      if (!INTEGER_PATTERN.test(raw)) return failure("INTEGER_FORMAT", "usedDays");
      usedDays = Number(raw);
      if (usedDays > USED_MAX) return failure("RANGE", "usedDays");
    }
  }

  const startSerial = serialOf(start);
  const refSerial = serialOf(ref);
  if (refSerial < startSerial) return failure("DATE_ORDER", "referenceDate");

  // Tenure derivation.
  const tenureDays = refSerial - startSerial;
  let completedYears = 0;
  while (serialOf(annivParts(start, completedYears + 1)) <= refSerial) {
    completedYears += 1;
  }
  let completedMonths = (ref.year - start.year) * 12 + (ref.month - start.month);
  while (serialOf(addMonthsParts(start, completedMonths + 1)) <= refSerial) {
    completedMonths += 1;
  }
  while (serialOf(addMonthsParts(start, completedMonths)) > refSerial) {
    completedMonths -= 1;
  }

  const sixMonths = addMonthsParts(start, 6);
  const underSix = refSerial < serialOf(sixMonths);
  let stage;
  let entitlementDays;
  if (underSix) {
    stage = "under-6-months";
    entitlementDays = 0;
  } else if (completedYears === 0) {
    stage = "first-3-days";
    entitlementDays = 3;
  } else {
    stage = "standard";
    entitlementDays = daysForCompletedYears(completedYears);
  }

  if (usedDays > entitlementDays) return failure("RANGE", "usedDays");
  const remainingDays = entitlementDays - usedDays;

  let periodStart = null;
  let periodEnd = null;
  let periodEntitlementDays = 0;
  let nextGrantDate;
  let nextGrantDays;
  if (stage === "under-6-months") {
    nextGrantDate = formatDate(sixMonths);
    nextGrantDays = 3;
  } else if (stage === "first-3-days") {
    periodStart = formatDate(sixMonths);
    periodEnd = formatDate(civilFromDays(serialOf(annivParts(start, 1)) - 1));
    periodEntitlementDays = entitlementDays;
    nextGrantDate = formatDate(annivParts(start, 1));
    nextGrantDays = 7;
  } else {
    periodStart = formatDate(annivParts(start, completedYears));
    periodEnd = formatDate(civilFromDays(serialOf(annivParts(start, completedYears + 1)) - 1));
    periodEntitlementDays = entitlementDays;
    nextGrantDate = formatDate(annivParts(start, completedYears + 1));
    nextGrantDays = daysForCompletedYears(completedYears + 1);
  }

  return {
    ok: true,
    result: {
      startDate: startField.value,
      referenceDate: refField.value,
      tenureDays,
      completedYears,
      completedMonths,
      stage,
      entitlementDays,
      usedDays,
      remainingDays,
      periodStart,
      periodEnd,
      periodEntitlementDays,
      nextGrantDate,
      nextGrantDays,
      feb29Adjusted: start.month === 2 && start.day === 29,
    },
  };
}

export function run(input) {
  try {
    return runInner(input);
  } catch {
    return failure("INTERNAL", null);
  }
}
