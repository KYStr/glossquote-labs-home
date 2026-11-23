// Pure core for the Life Insurance Calculator
// (spec-life-insurance-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. The
// main algorithm is the SPEC's pinned needs approach (DIME-plus
// structure with offsets):
//   incomeReplacement = annualIncome x supportYears
//   educationTotal    = educationPerChild x dependents
//   needsTotal        = incomeReplacement + mortgageBalance
//                       + otherDebts + finalExpenses + educationTotal
//   totalOffsets      = existingCoverage + liquidAssets
//   recommendedCoverage = max(0, needsTotal - totalOffsets)
// The 10x annual income benchmark (LIMRA / Life Happens 2021
// Insurance Barometer Study) is a reference value only and never
// feeds the recommendation:
//   multipleBenchmark     = annualIncome x 10
//   differenceVsBenchmark = recommendedCoverage - multipleBenchmark
// (may be negative). status is "covered" when the recommendation is
// 0, otherwise "shortfall". All arithmetic is exact BigInt; every
// result value is a safe integer (the largest possible needsTotal is
// about 4.31e9), so the result carries plain JS numbers. No
// inflation or discounting is applied: a deliberate simplification
// pinned in the SPEC scope and FAQ.

export const FIELDS = [
  "annualIncome",
  "supportYears",
  "dependents",
  "educationPerChild",
  "mortgageBalance",
  "otherDebts",
  "finalExpenses",
  "existingCoverage",
  "liquidAssets",
];

// SPEC-pinned field order is the validation order. Ranges are in
// whole NT dollars, except supportYears (years) and dependents
// (people).
export const RANGES = {
  annualIncome: [0, 99999999],
  supportYears: [0, 40],
  dependents: [0, 10],
  educationPerChild: [0, 9999999],
  mortgageBalance: [0, 99999999],
  otherDebts: [0, 99999999],
  finalExpenses: [0, 9999999],
  existingCoverage: [0, 99999999],
  liquidAssets: [0, 99999999],
};

export const DEFAULTS = {
  annualIncome: "1200000",
  supportYears: "10",
  dependents: "2",
  educationPerChild: "500000",
  mortgageBalance: "3000000",
  otherDebts: "200000",
  finalExpenses: "350000",
  existingCoverage: "1000000",
  liquidAssets: "500000",
};

// The worked example is fixtures.json case 1 (typical-family)
// input, vendored verbatim in test/fixtures.json. It coincides with
// the SPEC reset defaults.
export const EXAMPLE = { ...DEFAULTS };

export const MAX_RAW_UNITS = 8;

// Pinned §inputsOutputs disclaimer (verbatim, both languages).
// Shown in the results area of both pages and in the downloaded
// report's surrounding UI; the report bytes themselves are the
// canonical JSON of the result only (see the errata candidate in
// HANDOFF.md).
export const DISCLAIMER_ZH =
  "本工具僅供教育試算參考，不構成保險建議、招攬或商品推薦。實際保額請諮詢合格保險業務員或理財顧問，並以保單條款為準。";
export const DISCLAIMER_EN =
  "This tool is an educational estimate only. It is not insurance advice, a solicitation, or a product recommendation. Consult a licensed insurance professional for advice on your own situation.";

// The grammar is the SPEC's ASCII decimal integer string: "0" or a
// non-zero leading digit, no sign, decimal point, whitespace,
// thousands separator, or exponent.
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the nine
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
// surrogate, empty, grammar, range. Returns the parsed integer or an
// { error } outcome.
function validateField(field, value) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  const [min, max] = RANGES[field];
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const checked = {};
  for (const field of FIELDS) {
    const outcome = validateField(field, raw[field]);
    if (outcome.error) return outcome.error;
    checked[field] = outcome.value;
  }

  // Needs approach, exact BigInt arithmetic, no rounding. Every
  // intermediate and result is a safe integer, so the result carries
  // plain numbers.
  const incomeReplacement =
    BigInt(checked.annualIncome) * BigInt(checked.supportYears);
  const educationTotal =
    BigInt(checked.educationPerChild) * BigInt(checked.dependents);
  const needsTotal =
    incomeReplacement +
    BigInt(checked.mortgageBalance) +
    BigInt(checked.otherDebts) +
    BigInt(checked.finalExpenses) +
    educationTotal;
  const totalOffsets =
    BigInt(checked.existingCoverage) + BigInt(checked.liquidAssets);
  const recommendedCoverage = needsTotal > totalOffsets ? needsTotal - totalOffsets : 0n;
  const multipleBenchmark = BigInt(checked.annualIncome) * 10n;
  const differenceVsBenchmark = recommendedCoverage - multipleBenchmark;

  return {
    ok: true,
    result: {
      breakdown: {
        incomeReplacement: Number(incomeReplacement),
        mortgageBalance: checked.mortgageBalance,
        otherDebts: checked.otherDebts,
        finalExpenses: checked.finalExpenses,
        educationTotal: Number(educationTotal),
      },
      needsTotal: Number(needsTotal),
      offsets: {
        existingCoverage: checked.existingCoverage,
        liquidAssets: checked.liquidAssets,
        totalOffsets: Number(totalOffsets),
      },
      recommendedCoverage: Number(recommendedCoverage),
      multipleBenchmark: Number(multipleBenchmark),
      differenceVsBenchmark: Number(differenceVsBenchmark),
      status: recommendedCoverage === 0n ? "covered" : "shortfall",
    },
  };
}

// Display formatting for whole NT dollars: groups of three separated
// by commas, no decimals, machine values independent of locale. A
// leading minus sign is kept for a negative difference. Hand-rolled
// so the core never touches locale-aware formatting APIs or the host
// locale.
export function formatMoney(value) {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value));
  const groups = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return `${sign}${groups.join(",")}`;
}

// Fixed report download: life-insurance-calculator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is hand-written:
// it never calls a value's toJSON and accepts only the plain data
// shapes a result can hold (null, booleans, safe integers, strings,
// arrays, plain objects).
export const REPORT_FILENAME = "life-insurance-calculator-report.json";
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
