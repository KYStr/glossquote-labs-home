// Pure core for the School Entry Year Calculator
// (spec-school-entry-year-20261109). Synchronous data-in / data-out
// only: no DOM, no network, no storage, and no clock access at all.
// All date math is integer (year, month, day) comparison exactly as
// the SPEC pins:
//   entry year E = birth year + 6 when (month, day) <= (9, 1),
//     otherwise birth year + 7 (the September 1 age-six rule)
//   the sixth-birthday date A6 is the birth month/day in year
//     birth + 6, except a February 29 birth observes March 1 in a
//     non-leap year
//   age at entry is the invariant 6 years + M months, with
//     M = fullMonths(A6, (E, 9, 1)), always in 0..11
//   kindergarten entry Septembers are E-4 (toddler), E-3 (junior),
//     E-2 (middle), E-1 (senior)
//   the school year containing the as-of date starts in year Y =
//     asOf year when asOf month >= 9, else asOf year - 1; it runs
//     September 1 to the next August 31 and is named by Y
//   grade index g = Y - E + 1; age at that September 1 is a = g + 5,
//     reported as null when negative (not yet born)
//   roc(Y) = Y - 1911

export const FIELDS = ["birthDate", "asOfDate"];

export const DEFAULTS = { birthDate: "", asOfDate: "" };

// The worked example is fixtures.json case 1 (sep1-exact) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { birthDate: "2019-09-01", asOfDate: "2026-10-15" };

export const MAX_RAW_UNITS = 10;

export const MIN_DATE = "1912-01-01";
export const MAX_DATE = "2199-12-31";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MIN_PARTS = [1912, 1, 1];
const MAX_PARTS = [2199, 12, 31];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

// Lexicographic comparison of [year, month, day] parts.
function compareParts(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function formatParts(parts) {
  const [year, month, day] = parts;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function roc(year) {
  return year - 1911;
}

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the two
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

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, real calendar date, range. Returns the
// parsed [year, month, day] parts or an { error } outcome.
function validateField(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!DATE_PATTERN.test(value)) return { error: failure("DATE_FORMAT", field) };
  const parts = [Number(value.slice(0, 4)), Number(value.slice(5, 7)), Number(value.slice(8, 10))];
  const [year, month, day] = parts;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("DATE_INVALID", field) };
  }
  if (compareParts(parts, MIN_PARTS) < 0 || compareParts(parts, MAX_PARTS) > 0) {
    return { error: failure("RANGE", field) };
  }
  return { parts };
}

// The fixed grade-name table for projection rows and school-age
// current statuses (SPEC inputsOutputs, grade names table).
const GRADE_ROWS = [
  { stage: "elementary", stageGrade: 1, nameZh: "國小一年級", nameEn: "Elementary School Grade 1", aliasZh: null },
  { stage: "elementary", stageGrade: 2, nameZh: "國小二年級", nameEn: "Elementary School Grade 2", aliasZh: null },
  { stage: "elementary", stageGrade: 3, nameZh: "國小三年級", nameEn: "Elementary School Grade 3", aliasZh: null },
  { stage: "elementary", stageGrade: 4, nameZh: "國小四年級", nameEn: "Elementary School Grade 4", aliasZh: null },
  { stage: "elementary", stageGrade: 5, nameZh: "國小五年級", nameEn: "Elementary School Grade 5", aliasZh: null },
  { stage: "elementary", stageGrade: 6, nameZh: "國小六年級", nameEn: "Elementary School Grade 6", aliasZh: null },
  { stage: "juniorHigh", stageGrade: 1, nameZh: "國中一年級", nameEn: "Junior High School Grade 1", aliasZh: "國一" },
  { stage: "juniorHigh", stageGrade: 2, nameZh: "國中二年級", nameEn: "Junior High School Grade 2", aliasZh: "國二" },
  { stage: "juniorHigh", stageGrade: 3, nameZh: "國中三年級", nameEn: "Junior High School Grade 3", aliasZh: "國三" },
  { stage: "seniorHigh", stageGrade: 1, nameZh: "高中一年級", nameEn: "Senior High School Grade 1", aliasZh: "高一" },
  { stage: "seniorHigh", stageGrade: 2, nameZh: "高中二年級", nameEn: "Senior High School Grade 2", aliasZh: "高二" },
  { stage: "seniorHigh", stageGrade: 3, nameZh: "高中三年級", nameEn: "Senior High School Grade 3", aliasZh: "高三" },
];

// The four kindergarten bands and their entry-September offsets from E.
const KINDERGARTEN_ROWS = [
  { band: "toddler", nameZh: "幼幼班", nameEn: "Toddler Class", offset: -4 },
  { band: "junior", nameZh: "小班", nameEn: "Kindergarten Junior Class", offset: -3 },
  { band: "middle", nameZh: "中班", nameEn: "Kindergarten Middle Class", offset: -2 },
  { band: "senior", nameZh: "大班", nameEn: "Kindergarten Senior Class", offset: -1 },
];

// Stage, in-stage grade, band, and fixed names for a grade index g.
function stageFor(gradeIndex) {
  if (gradeIndex <= -4) {
    return {
      stage: "notEnrolled", stageGrade: null, band: null,
      nameZh: "未滿 2 歲（尚未入學）", nameEn: "Under 2 (Not Yet Enrolled)", aliasZh: null,
    };
  }
  if (gradeIndex === -3) {
    return {
      stage: "toddler", stageGrade: null, band: "toddler",
      nameZh: "幼幼班", nameEn: "Toddler Class", aliasZh: null,
    };
  }
  if (gradeIndex === -2) {
    return {
      stage: "kindergartenJunior", stageGrade: null, band: "junior",
      nameZh: "小班", nameEn: "Kindergarten Junior Class", aliasZh: null,
    };
  }
  if (gradeIndex === -1) {
    return {
      stage: "kindergartenMiddle", stageGrade: null, band: "middle",
      nameZh: "中班", nameEn: "Kindergarten Middle Class", aliasZh: null,
    };
  }
  if (gradeIndex === 0) {
    return {
      stage: "kindergartenSenior", stageGrade: null, band: "senior",
      nameZh: "大班", nameEn: "Kindergarten Senior Class", aliasZh: null,
    };
  }
  if (gradeIndex >= 13) {
    return {
      stage: "graduated", stageGrade: null, band: null,
      nameZh: "已畢業（高中）", nameEn: "Graduated (Senior High School Completed)", aliasZh: null,
    };
  }
  const row = GRADE_ROWS[gradeIndex - 1];
  return {
    stage: row.stage, stageGrade: row.stageGrade, band: null,
    nameZh: row.nameZh, nameEn: row.nameEn, aliasZh: row.aliasZh,
  };
}

// Whole calendar months from date X to date Y (both [y, m, d] parts).
function fullMonths(fromParts, toParts) {
  return (
    (toParts[0] - fromParts[0]) * 12 +
    (toParts[1] - fromParts[1]) -
    (toParts[2] < fromParts[2] ? 1 : 0)
  );
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of FIELDS) {
    const outcome = validateField(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.parts;
  }
  const birth = checked.birthDate;
  const asOf = checked.asOfDate;

  // Cross-field: the birth date must not be after the as-of date.
  if (compareParts(birth, asOf) > 0) return failure("DATE_ORDER", "birthDate");

  // Entry year: on or before September 1 in (month, day) order means
  // the child is six by that September and enters the same year.
  const entersSameYear = birth[1] < 9 || (birth[1] === 9 && birth[2] <= 1);
  const entryYear = birth[0] + (entersSameYear ? 6 : 7);

  // Observed sixth birthday: February 29 is observed on March 1 when
  // the sixth-birthday year is not a leap year.
  const sixthBirthday =
    birth[1] === 2 && birth[2] === 29 && !isLeapYear(birth[0] + 6)
      ? [birth[0] + 6, 3, 1]
      : [birth[0] + 6, birth[1], birth[2]];
  const ageMonths = fullMonths(sixthBirthday, [entryYear, 9, 1]);

  const kindergarten = KINDERGARTEN_ROWS.map((row) => ({
    band: row.band,
    nameZh: row.nameZh,
    nameEn: row.nameEn,
    septemberYear: entryYear + row.offset,
    rocYear: roc(entryYear + row.offset),
  }));

  const schoolYearStartYear = asOf[1] >= 9 ? asOf[0] : asOf[0] - 1;
  const gradeIndex = schoolYearStartYear - entryYear + 1;
  const ageAtStart = gradeIndex + 5;
  const stage = stageFor(gradeIndex);
  const current = {
    schoolYearStartYear,
    schoolYearRoc: roc(schoolYearStartYear),
    gradeIndex,
    ageAtStartYears: ageAtStart >= 0 ? ageAtStart : null,
    stage: stage.stage,
    stageGrade: stage.stageGrade,
    band: stage.band,
    nameZh: stage.nameZh,
    nameEn: stage.nameEn,
    aliasZh: stage.aliasZh,
  };

  const projection = GRADE_ROWS.map((row, index) => {
    const septemberYear = entryYear + index;
    return {
      gradeIndex: index + 1,
      septemberYear,
      rocYear: roc(septemberYear),
      spanStart: formatParts([septemberYear, 9, 1]),
      spanEnd: formatParts([septemberYear + 1, 8, 31]),
      stage: row.stage,
      stageGrade: row.stageGrade,
      nameZh: row.nameZh,
      nameEn: row.nameEn,
      aliasZh: row.aliasZh,
    };
  });

  return {
    ok: true,
    result: {
      birthDate: raw.birthDate,
      asOfDate: raw.asOfDate,
      entry: {
        septemberYear: entryYear,
        rocYear: roc(entryYear),
        month: 9,
        ageYears: 6,
        ageMonths,
      },
      kindergarten,
      current,
      projection,
    },
  };
}

// Fixed report download: school-entry-year-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls a
// value's toJSON and accepts only the plain data shapes a result can
// hold (null, booleans, safe integers, strings, arrays, plain objects).
export const REPORT_FILENAME = "school-entry-year-report.json";
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
