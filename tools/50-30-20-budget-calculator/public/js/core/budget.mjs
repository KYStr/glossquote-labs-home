// Pure core for the 50-30-20 Budget Calculator (spec-50-30-20-budget-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no storage.
// All arithmetic is exact integer math (the SPEC forbids float-decided
// results):
//   exact[category] = income * pct / 100 (never materialized as a float)
//   monthly[category] = roundHalfUp(exact) = floor((2*income*pct + 100) / 200)
//   residual = income - sum(monthly) is always -1, 0 or +1; when non-zero
//   it is added to the category with the largest exact value (max pct;
//   ties in needs -> wants -> savings order), so the monthly amounts
//   always sum to exactly income.
//   yearly[category] = monthly[category] * 12
//   actualPercent = roundHalfUp(actual / income * 100, 1 decimal)
//     = floor((2*actual*1000 + income) / (2*income)) / 10
//   difference = actual - target; status on-target / over / under by sign.
//   totals (only when all three actuals are filled): actual = sum,
//   unallocated = income - actual; status balanced / under / over.

export const FIELDS = [
  "income",
  "needsPct",
  "wantsPct",
  "savingsPct",
  "actualNeeds",
  "actualWants",
  "actualSavings",
];

export const DEFAULTS = {
  income: "",
  needsPct: "50",
  wantsPct: "30",
  savingsPct: "20",
  actualNeeds: "",
  actualWants: "",
  actualSavings: "",
};

// The worked example is fixtures.json case 1 (default-split) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  income: "60000",
  needsPct: "50",
  wantsPct: "30",
  savingsPct: "20",
  actualNeeds: "",
  actualWants: "",
  actualSavings: "",
};

export const MAX_RAW_UNITS = 16;

export const INCOME_RANGE = [1, 100000000];
export const PCT_RANGE = [0, 100];
export const ACTUAL_RANGE = [0, 100000000];

export const CATEGORY_IDS = ["needs", "wants", "savings"];

export const REPORT_FILENAME = "50-30-20-budget-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns the
// raw string map, or null when the shape is not exactly the seven fields.
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

// Integer-string field validation in the SPEC's order: capacity
// INPUT_LIMIT (16 units, pinned for every field), EMPTY, INTEGER_FORMAT
// grammar, RANGE. Optional fields (the three actuals) return { value:
// null } for an empty string instead of an EMPTY error.
// Returns { value } or { error }.
function validateIntegerField(field, value, range, { optional = false } = {}) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (value.length === 0) {
    return optional ? { value: null } : { error: failure("EMPTY", field) };
  }
  if (!INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field) };
  const parsed = Number(value);
  if (parsed < range[0] || parsed > range[1]) return { error: failure("RANGE", field) };
  return { value: parsed };
}

// roundHalfUp of a non-negative rational a/b, computed with exact integer
// math: floor((2a + b) / (2b)). All operands here are small enough that
// the integer products stay exactly representable.
function roundHalfUpDiv(numerator, denominator) {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Field order pinned by the SPEC: income, needsPct, wantsPct,
  // savingsPct, actualNeeds, actualWants, actualSavings; the cross-field
  // percent sum is checked last.
  const incomeResult = validateIntegerField("income", raw.income, INCOME_RANGE);
  if (incomeResult.error) return incomeResult.error;
  const income = incomeResult.value;

  const percentages = {};
  for (const [field, id] of [
    ["needsPct", "needs"],
    ["wantsPct", "wants"],
    ["savingsPct", "savings"],
  ]) {
    const result = validateIntegerField(field, raw[field], PCT_RANGE);
    if (result.error) return result.error;
    percentages[id] = result.value;
  }

  const actualInputs = {};
  for (const [field, id] of [
    ["actualNeeds", "needs"],
    ["actualWants", "wants"],
    ["actualSavings", "savings"],
  ]) {
    const result = validateIntegerField(field, raw[field], ACTUAL_RANGE, { optional: true });
    if (result.error) return result.error;
    actualInputs[id] = result.value;
  }

  if (percentages.needs + percentages.wants + percentages.savings !== 100) {
    return failure("PERCENT_SUM", null);
  }

  // Monthly amounts: exact round-half-up of income * pct / 100, then the
  // -1/0/+1 residual goes to the category with the largest exact value
  // (max pct; ties in needs -> wants -> savings order).
  const monthly = {};
  let roundedSum = 0;
  for (const id of CATEGORY_IDS) {
    monthly[id] = roundHalfUpDiv(income * percentages[id], 100);
    roundedSum += monthly[id];
  }
  const residual = income - roundedSum;
  if (residual !== 0) {
    let largest = CATEGORY_IDS[0];
    for (const id of CATEGORY_IDS.slice(1)) {
      if (percentages[id] > percentages[largest]) largest = id;
    }
    monthly[largest] += residual;
  }

  const yearly = {};
  for (const id of CATEGORY_IDS) yearly[id] = monthly[id] * 12;

  // Actuals and variance. When no actual is filled, all three are null;
  // a partially filled set keeps nulls for the unfilled categories and
  // totals stay null.
  const anyActualFilled = CATEGORY_IDS.some((id) => actualInputs[id] !== null);
  let actuals = null;
  let variance = null;
  let totals = null;
  if (anyActualFilled) {
    actuals = {};
    variance = {};
    for (const id of CATEGORY_IDS) {
      const actual = actualInputs[id];
      actuals[id] = actual;
      if (actual === null) {
        variance[id] = null;
        continue;
      }
      const difference = actual - monthly[id];
      const status = difference === 0 ? "on-target" : difference > 0 ? "over" : "under";
      variance[id] = {
        actual,
        target: monthly[id],
        difference,
        actualPercent: roundHalfUpDiv(actual * 1000, income) / 10,
        targetPercent: percentages[id],
        status,
      };
    }
    if (CATEGORY_IDS.every((id) => actualInputs[id] !== null)) {
      const actualTotal = actualInputs.needs + actualInputs.wants + actualInputs.savings;
      const unallocated = income - actualTotal;
      totals = {
        actual: actualTotal,
        income,
        unallocated,
        status: unallocated === 0 ? "balanced" : unallocated > 0 ? "under" : "over",
      };
    }
  }

  return {
    ok: true,
    result: {
      income,
      percentages: {
        needs: percentages.needs,
        wants: percentages.wants,
        savings: percentages.savings,
      },
      targets: {
        monthly: { needs: monthly.needs, wants: monthly.wants, savings: monthly.savings },
        yearly: { needs: yearly.needs, wants: yearly.wants, savings: yearly.savings },
      },
      actuals,
      variance,
      totals,
    },
  };
}

// Canonical report serialization (SPEC): compact JSON of the result with
// object own keys sorted ascending by UTF-16 code units recursively,
// array order preserved, string escaping done by the JSON literal rules
// without ever calling an input's toJSON, one trailing LF, UTF-8 no BOM.
// Throws RangeError when the encoded report exceeds the pinned limit.
export function serializeReport(result) {
  const canonical = (value) => {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === "function" || typeof item === "undefined" || typeof item === "symbol"
          ? null
          : canonical(item),
      );
    }
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      // Skip non-data values instead of copying them: a copied function
      // property named toJSON would otherwise be invoked by stringify.
      if (typeof item === "function" || typeof item === "undefined" || typeof item === "symbol") {
        continue;
      }
      sorted[key] = canonical(item);
    }
    return sorted;
  };
  const text = `${JSON.stringify(canonical(result))}\n`;
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > REPORT_LIMIT_BYTES) {
    throw new RangeError(`Report exceeds ${REPORT_LIMIT_BYTES} bytes`);
  }
  return text;
}
