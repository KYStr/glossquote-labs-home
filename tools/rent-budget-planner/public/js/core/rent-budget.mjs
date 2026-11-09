// Rent Budget Planner — pure core.
// Implements spec-rent-budget-planner-20261109 (candidate 2b83a326544418542bb0223b58f2cc86701a49dd).
// Synchronous pure data transform: no DOM, no network, no storage.

export const FIELD_ORDER = Object.freeze([
  "income",
  "ratioPreset",
  "customRatio",
  "candidateRent",
  "depositMonths",
  "agencyFee",
]);

export const DEFAULT_INPUT = Object.freeze({
  income: "45000",
  ratioPreset: "P30",
  customRatio: "",
  candidateRent: "12000",
  depositMonths: "2",
  agencyFee: "0.5",
});

export const REPORT_FILENAME = "rent-budget-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

const INTEGER_RE = /^(0|[1-9][0-9]*)$/;
const RATIO_PRESETS = new Set(["P25", "P30", "P33", "CUSTOM"]);
const DEPOSIT_MONTHS = new Set(["0", "1", "2", "3"]);
const AGENCY_FEES = new Set(["0", "0.5", "1"]);

// Exact rational ratios: preset -> [numerator, denominator].
const RATIO_FRACTIONS = Object.freeze({
  P25: Object.freeze([1n, 4n]),
  P30: Object.freeze([3n, 10n]),
  P33: Object.freeze([1n, 3n]),
});

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasLoneSurrogate(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Shared checks for integer-string fields, in pinned order:
// capacity -> surrogate -> empty -> grammar. Returns an error object or null.
function checkIntegerString(value, field, maxRawUnits) {
  if (value.length > maxRawUnits) return fail("INPUT_LIMIT", field);
  if (hasLoneSurrogate(value)) return fail("UNICODE", field);
  if (value === "") return fail("EMPTY", field);
  if (!INTEGER_RE.test(value)) return fail("INTEGER_FORMAT", field);
  return null;
}

// Shared checks for enum fields, in pinned order: surrogate -> empty -> membership.
function checkEnumString(value, field, allowed) {
  if (hasLoneSurrogate(value)) return fail("UNICODE", field);
  if (value === "") return fail("EMPTY", field);
  if (!allowed.has(value)) return fail("ENUM", field);
  return null;
}

// Round half up of p / q for p >= 0, q > 0, exact BigInt arithmetic.
function roundHalfUpDiv(p, q) {
  return (2n * p + q) / (2n * q);
}

export function run(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return fail("SCHEMA", null);
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    return fail("SCHEMA", null);
  }
  // Presence, accessors and value types, in pinned field order.
  for (const field of FIELD_ORDER) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor) return fail("SCHEMA", field);
    if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
      return fail("SCHEMA", field);
    }
    if (typeof descriptor.value !== "string") return fail("SCHEMA", field);
  }
  for (const key of Object.keys(input)) {
    if (!FIELD_ORDER.includes(key)) return fail("SCHEMA", key);
  }

  const incomeRaw = input.income;
  const ratioPreset = input.ratioPreset;
  const customRatioRaw = input.customRatio;
  const candidateRentRaw = input.candidateRent;
  const depositMonthsRaw = input.depositMonths;
  const agencyFeeRaw = input.agencyFee;

  let error = checkIntegerString(incomeRaw, "income", 9);
  if (error) return error;
  const income = BigInt(incomeRaw);
  if (income > 999999999n) return fail("RANGE", "income");

  error = checkEnumString(ratioPreset, "ratioPreset", RATIO_PRESETS);
  if (error) return error;

  let ratioNum;
  let ratioDen;
  if (ratioPreset === "CUSTOM") {
    error = checkIntegerString(customRatioRaw, "customRatio", 3);
    if (error) return error;
    const custom = BigInt(customRatioRaw);
    if (custom < 1n || custom > 100n) return fail("RANGE", "customRatio");
    ratioNum = custom;
    ratioDen = 100n;
  } else {
    // customRatio is fully ignored when the preset is not CUSTOM.
    [ratioNum, ratioDen] = RATIO_FRACTIONS[ratioPreset];
  }

  error = checkIntegerString(candidateRentRaw, "candidateRent", 8);
  if (error) return error;
  const candidateRent = BigInt(candidateRentRaw);
  if (candidateRent > 99999999n) return fail("RANGE", "candidateRent");

  error = checkEnumString(depositMonthsRaw, "depositMonths", DEPOSIT_MONTHS);
  if (error) return error;
  error = checkEnumString(agencyFeeRaw, "agencyFee", AGENCY_FEES);
  if (error) return error;

  const depositMonths = BigInt(depositMonthsRaw);
  const feeNum = agencyFeeRaw === "0.5" ? 1n : BigInt(agencyFeeRaw);
  const feeDen = agencyFeeRaw === "0.5" ? 2n : 1n;

  const maxRent = (income * ratioNum) / ratioDen; // BigInt division floors for non-negative values.
  let sharePercent = null;
  if (income > 0n) {
    const tenths = roundHalfUpDiv(candidateRent * 1000n, income);
    sharePercent = Number(tenths) / 10;
  }
  const withinBudget = candidateRent <= maxRent;
  const overBy = candidateRent > maxRent ? candidateRent - maxRent : 0n;
  const firstMonth = candidateRent;
  const deposit = candidateRent * depositMonths;
  const agencyFee = roundHalfUpDiv(candidateRent * feeNum, feeDen);
  const total = firstMonth + deposit + agencyFee;
  const remainder = income - candidateRent;

  return {
    ok: true,
    result: {
      maxRentNt: Number(maxRent),
      candidate: {
        rentNt: Number(candidateRent),
        sharePercent,
        withinBudget,
        overByNt: Number(overBy),
      },
      moveIn: {
        firstMonthNt: Number(firstMonth),
        depositNt: Number(deposit),
        agencyFeeNt: Number(agencyFee),
        totalNt: Number(total),
      },
      monthlyRemainderNt: Number(remainder),
    },
  };
}

// Fixed report serialization: compact JSON, object keys sorted recursively by
// UTF-16 code units, array order preserved, one trailing LF. Serialized
// manually so no input toJSON can interfere.
function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cannot serialize a non-finite number.");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((item) => serializeValue(item)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => JSON.stringify(key) + ":" + serializeValue(value[key]));
    return "{" + parts.join(",") + "}";
  }
  throw new Error("Cannot serialize this value.");
}

export function serializeReport(result) {
  return serializeValue(result) + "\n";
}

export function reportByteLength(result) {
  return new TextEncoder().encode(serializeReport(result)).byteLength;
}
