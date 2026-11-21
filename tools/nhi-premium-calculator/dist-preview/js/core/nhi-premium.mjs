// Pure core for the NHI Premium Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-nhi-premium-calculator-20261109):
// Category 1 (private-sector employee) NHI premium estimate from the
// NHIA tables effective January 1, 2026 (115 year version): 58 insured
// amount grades (29,500-313,000 NTD), premium rate 5.17%, burden shares
// insured 30% / employer 60% / government 10%, average dependents 0.56
// (employer and government computed on 1.56 persons), dependents charged
// at most 3. All premium arithmetic is exact integer rational rounding
// (round half up, exactly once per premium); binary floating point is
// never used for the 5.17% products.

export const FIELDS = ["monthlySalary", "dependents"];

// Maximum raw length per field, in UTF-16 code units (SPEC section 3).
export const RAW_LIMITS = {
  monthlySalary: 8,
  dependents: 8,
};

export const DEFAULTS = {
  monthlySalary: "45000",
  dependents: "0",
};

// The example draft: the first synthetic case in fixtures.json
// (floor-grade-no-dependents), per SPEC section 2.
export const EXAMPLE = {
  monthlySalary: "29500",
  dependents: "0",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "nhi-premium-report.json";

// Pinned parameters, 115 year version (SPEC section 3).
export const RATE_NUMERATOR = 517;
export const RATE_DENOMINATOR = 10000;
export const SELF_SHARE_NUMERATOR = 30;
export const EMPLOYER_SHARE_NUMERATOR = 60;
export const GOVERNMENT_SHARE_NUMERATOR = 10;
export const SHARE_DENOMINATOR = 100;
// Average dependents 0.56, so the employer/government factor is
// 1 + 0.56 = 1.56 = 156/100.
export const AVG_DEPENDENTS_NUMERATOR = 156;
export const AVG_DEPENDENTS_DENOMINATOR = 100;
export const DEPENDENTS_CAP = 3;

export const SALARY_MIN = 1;
export const SALARY_MAX = 99999999;
export const DEPENDENTS_MIN = 0;
export const DEPENDENTS_MAX = 99;

// Insured amount grades, 115 year version (SPEC section 3): the monthly
// insured amount for each of the 58 grades, strictly increasing.
export const GRADE_AMOUNTS = [
  29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000, 43900,
  45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800, 66800, 69800,
  72800, 76500, 80200, 83900, 87600, 92100, 96600, 101100, 105600, 110100,
  115500, 120900, 126300, 131700, 137100, 142500, 147900, 150000, 156400,
  162800, 169200, 175600, 182000, 189500, 197000, 204500, 212000, 219500,
  228200, 236900, 245600, 254300, 263000, 273000, 283000, 293000, 303000,
  313000,
];

// Appendix reference table (SPEC section 3): per-grade [selfPremium,
// employerPremium, governmentPremium], computed by the pinned formulas
// and checked against the NHIA burden table (see AUTHOR-CHECK.md).
export const APPENDIX_PREMIUMS = [
  [458, 1428, 238], [470, 1466, 244], [493, 1539, 256], [516, 1611, 269],
  [540, 1684, 281], [563, 1757, 293], [592, 1849, 308], [622, 1940, 323],
  [651, 2032, 339], [681, 2124, 354], [710, 2216, 369], [748, 2332, 389],
  [785, 2449, 408], [822, 2565, 427], [859, 2681, 447], [896, 2797, 466],
  [943, 2942, 490], [990, 3087, 515], [1036, 3233, 539], [1083, 3378, 563],
  [1129, 3523, 587], [1187, 3702, 617], [1244, 3881, 647], [1301, 4060, 677],
  [1359, 4239, 707], [1428, 4457, 743], [1498, 4675, 779], [1568, 4892, 815],
  [1638, 5110, 852], [1708, 5328, 888], [1791, 5589, 932], [1875, 5850, 975],
  [1959, 6112, 1019], [2043, 6373, 1062], [2126, 6634, 1106], [2210, 6896, 1149],
  [2294, 7157, 1193], [2327, 7259, 1210], [2426, 7568, 1261], [2525, 7878, 1313],
  [2624, 8188, 1365], [2724, 8497, 1416], [2823, 8807, 1468], [2939, 9170, 1528],
  [3055, 9533, 1589], [3172, 9896, 1649], [3288, 10259, 1710], [3404, 10622, 1770],
  [3539, 11043, 1840], [3674, 11464, 1911], [3809, 11885, 1981], [3944, 12306, 2051],
  [4079, 12727, 2121], [4234, 13211, 2202], [4389, 13695, 2282], [4544, 14179, 2363],
  [4700, 14663, 2444], [4855, 15146, 2524],
];

// Pinned status announcements (SPEC section 2).
export const STATUS_TEXT = {
  empty: { zh: "準備就緒", en: "Ready" },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "試算完成", en: "Calculation complete" },
  error: { zh: "無法試算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

// ASCII decimal integer grammar: "0" or a non-zero leading digit
// followed by digits. No whitespace, signs, decimals or exponents.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
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

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable properties are exactly the two fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the two string values, or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
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

// True when the value passes the schema gate only (used to decide
// whether a draft may be restored).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate one integer field (non-empty already handled by the caller
// order): grammar (INTEGER_FORMAT), then range (RANGE). The grammar
// guarantees Number() parses the value exactly as written.
function parseIntegerField(field, raw, min, max) {
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
  const value = Number(raw);
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order monthlySalary, dependents; per field INPUT_LIMIT, UNICODE,
// EMPTY, INTEGER_FORMAT, RANGE; the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("monthlySalary", values.monthlySalary);
  if (failure !== null) return failure;
  if (values.monthlySalary === "") return fieldError("EMPTY", "monthlySalary");
  const salary = parseIntegerField(
    "monthlySalary",
    values.monthlySalary,
    SALARY_MIN,
    SALARY_MAX,
  );
  if (!salary.ok) return salary;

  failure = checkCapacityAndUnicode("dependents", values.dependents);
  if (failure !== null) return failure;
  if (values.dependents === "") return fieldError("EMPTY", "dependents");
  const dependents = parseIntegerField(
    "dependents",
    values.dependents,
    DEPENDENTS_MIN,
    DEPENDENTS_MAX,
  );
  if (!dependents.ok) return dependents;

  return {
    ok: true,
    values: {
      monthlySalary: salary.value,
      dependents: dependents.value,
    },
  };
}

// Round half up of a non-negative rational n/d to an integer, using
// exact integer arithmetic only: floor(n/d + 1/2) = floor((2n + d) / 2d).
// All operands stay far below 2^53 (largest: 313000 * 483912 * 2).
function roundHalfUp(numerator, denominator) {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

// Grade lookup: the smallest grade g whose insured amount is at least
// the salary; a salary above 313,000 takes grade 58.
export function gradeForSalary(salary) {
  for (let i = 0; i < GRADE_AMOUNTS.length; i += 1) {
    if (salary <= GRADE_AMOUNTS[i]) return i + 1;
  }
  return 58;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { monthlySalary, dependents } = validated.values;

  const grade = gradeForSalary(monthlySalary);
  const insuredAmount = GRADE_AMOUNTS[grade - 1];

  // Per-person premium: RHU(insuredAmount * 1551 / 100000), i.e.
  // insuredAmount * 5.17% * 30% rounded once. Each dependent pays the
  // same per-person premium.
  const selfPremium = roundHalfUp(insuredAmount * 1551, 100000);
  const dependentPremiumEach = selfPremium;

  const dependentsCharged = Math.min(dependents, DEPENDENTS_CAP);
  const dependentsCapped = dependents > DEPENDENTS_CAP;
  // Employee total is the already-rounded per-person premium times the
  // number of persons; no second rounding.
  const employeeTotalPremium = selfPremium * (1 + dependentsCharged);

  // Employer: RHU(insuredAmount * 483912 / 10000000), i.e.
  // insuredAmount * 5.17% * 60% * 1.56, rounded once at the end.
  const employerPremium = roundHalfUp(insuredAmount * 483912, 10000000);
  // Government: RHU(insuredAmount * 80652 / 10000000), i.e.
  // insuredAmount * 5.17% * 10% * 1.56, rounded once at the end.
  const governmentPremium = roundHalfUp(insuredAmount * 80652, 10000000);

  const result = {
    grade,
    insuredAmount,
    dependentsCharged,
    dependentsCapped,
    selfPremium,
    dependentPremiumEach,
    employeeTotalPremium,
    employerPremium,
    governmentPremium,
  };

  // Report cap backstop (SPEC section 3): a result over the cap is an
  // OUTPUT_LIMIT error instead of a success. With the pinned ranges a
  // real result is a few hundred bytes, so this never fires for a
  // genuine calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Amount display: thousands grouped with commas (presentation only;
// machine values stay plain integers).
export function formatAmount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
