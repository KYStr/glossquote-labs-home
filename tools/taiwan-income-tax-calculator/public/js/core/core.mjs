// Taiwan Income Tax Calculator — pure core.
//
// Implements the fixed contract of SPEC.md (spec-taiwan-income-tax-calculator-20261109):
// income year ROC 113 (2024), salary income only, MOF published amounts.
// No DOM, network, storage, or environment access. All money math is integer
// NT dollars; step 7 is computed in integer hundredths so the only rounding
// point is step 8 (round half up to whole dollars).

export const TAX_YEAR = '113';

// Ministry of Finance, income year 113 (2024) amounts, NT dollars.
export const EXEMPTION_BASE = 97000; // per person
export const EXEMPTION_AGE_70_PLUS = 145500; // self, spouse, lineal ascendant dependents aged 70+
export const STANDARD_DEDUCTION_SINGLE = 131000;
export const STANDARD_DEDUCTION_MARRIED = 262000;
export const SALARY_SPECIAL_DEDUCTION_CAP = 218000;

// Brackets on taxable net: cap is inclusive; difference is the progressive
// difference (累進差額). Verified continuous: 590000*7% = 41300, etc.
export const BRACKETS = [
  { cap: 590000, ratePercent: 5, progressiveDifference: 0 },
  { cap: 1330000, ratePercent: 12, progressiveDifference: 41300 },
  { cap: 2660000, ratePercent: 20, progressiveDifference: 147700 },
  { cap: 4980000, ratePercent: 30, progressiveDifference: 413700 },
  { cap: Number.POSITIVE_INFINITY, ratePercent: 40, progressiveDifference: 911700 },
];

export const REPORT_LIMIT_BYTES = 2097152; // 2 MiB
export const REPORT_FILENAME = 'taiwan-income-tax-report.json';

export const DEFAULT_DRAFT = Object.freeze({
  grossSalary: '',
  filingStatus: 'single',
  selfAge70Plus: false,
  spouseAge70Plus: null,
  dependentsUnder70: '0',
  dependents70Plus: '0',
});

const FIELDS = [
  'grossSalary',
  'filingStatus',
  'selfAge70Plus',
  'spouseAge70Plus',
  'dependentsUnder70',
  'dependents70Plus',
];

const RAW_LIMIT = 8;
const SALARY_MAX = 99999999;
const DEPENDENTS_MAX = 20;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

// Reads an own data property without invoking accessors. Returns
// { present: false } for missing keys and accessor properties.
function ownData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined || !('value' in descriptor)) return { present: false };
  return { present: true, value: descriptor.value };
}

// Validates one integer-string field in the pinned order:
// SCHEMA (missing / accessor / non-string) -> INPUT_LIMIT -> EMPTY ->
// INTEGER_FORMAT -> RANGE. Returns { value } or { error }.
function integerField(input, field, max) {
  const slot = ownData(input, field);
  if (!slot.present || typeof slot.value !== 'string') return { error: failure('SCHEMA', field) };
  const raw = slot.value;
  if (raw.length > RAW_LIMIT) return { error: failure('INPUT_LIMIT', field) };
  if (raw.length === 0) return { error: failure('EMPTY', field) };
  if (!INTEGER_PATTERN.test(raw)) return { error: failure('INTEGER_FORMAT', field) };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > max) return { error: failure('RANGE', field) };
  return { value };
}

function booleanField(input, field) {
  const slot = ownData(input, field);
  if (!slot.present || typeof slot.value !== 'boolean') return { error: failure('SCHEMA', field) };
  return { value: slot.value };
}

// run(input) -> { ok: true, result } | { ok: false, error: { code, field, row } }
// Pure synchronous transform; never throws for malformed input.
export function run(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return failure('SCHEMA', null);
  }
  for (const key of Object.keys(input)) {
    if (!FIELDS.includes(key)) return failure('SCHEMA', key);
  }

  // Fields validate in the pinned table order; only the first error returns.
  const salary = integerField(input, 'grossSalary', SALARY_MAX);
  if (salary.error) return salary.error;

  const statusSlot = ownData(input, 'filingStatus');
  if (!statusSlot.present || typeof statusSlot.value !== 'string') return failure('SCHEMA', 'filingStatus');
  const filingStatus = statusSlot.value;
  if (filingStatus !== 'single' && filingStatus !== 'married') return failure('ENUM_VALUE', 'filingStatus');

  const selfAge = booleanField(input, 'selfAge70Plus');
  if (selfAge.error) return selfAge.error;

  const spouseSlot = ownData(input, 'spouseAge70Plus');
  if (!spouseSlot.present) return failure('SCHEMA', 'spouseAge70Plus');
  let spouseAge70Plus = null;
  if (filingStatus === 'married') {
    if (typeof spouseSlot.value !== 'boolean') return failure('SCHEMA', 'spouseAge70Plus');
    spouseAge70Plus = spouseSlot.value;
  } else if (spouseSlot.value !== null) {
    return failure('SCHEMA', 'spouseAge70Plus');
  }

  const depUnder = integerField(input, 'dependentsUnder70', DEPENDENTS_MAX);
  if (depUnder.error) return depUnder.error;
  const dep70 = integerField(input, 'dependents70Plus', DEPENDENTS_MAX);
  if (dep70.error) return dep70.error;

  const grossSalary = salary.value;

  // Step 1-2: salary special deduction and salary net.
  const salarySpecialDeduction = Math.min(grossSalary, SALARY_SPECIAL_DEDUCTION_CAP);
  const salaryNet = grossSalary - salarySpecialDeduction;

  // Step 3: exemptions.
  const selfExemption = selfAge.value ? EXEMPTION_AGE_70_PLUS : EXEMPTION_BASE;
  const spouseExemption = filingStatus === 'married'
    ? (spouseAge70Plus ? EXEMPTION_AGE_70_PLUS : EXEMPTION_BASE)
    : 0;
  const exemptionTotal = selfExemption + spouseExemption
    + depUnder.value * EXEMPTION_BASE
    + dep70.value * EXEMPTION_AGE_70_PLUS;

  // Step 4-5: standard deduction and taxable net (floored at zero).
  const standardDeduction = filingStatus === 'single'
    ? STANDARD_DEDUCTION_SINGLE
    : STANDARD_DEDUCTION_MARRIED;
  const taxableNet = Math.max(0, salaryNet - exemptionTotal - standardDeduction);

  // Step 6: first bracket whose cap covers the net (net 0 -> 5% bracket).
  const bracket = BRACKETS.find((entry) => taxableNet <= entry.cap);

  // Step 7-8: exact tax in integer hundredths, one round-half-up at the end.
  const taxHundredths = taxableNet * bracket.ratePercent - bracket.progressiveDifference * 100;
  const taxPayable = Math.max(0, Math.floor((taxHundredths + 50) / 100));

  return {
    ok: true,
    result: {
      taxYear: TAX_YEAR,
      grossSalary,
      salarySpecialDeduction,
      salaryNet,
      exemptionTotal,
      standardDeduction,
      taxableNet,
      ratePercent: bracket.ratePercent,
      progressiveDifference: bracket.progressiveDifference,
      taxPayable,
    },
  };
}

// Deterministic compact JSON: object own keys sorted ascending by UTF-16
// code units (recursively), array order preserved, strings escaped with the
// JSON literal rules. Never calls a value's toJSON and never reads accessors
// for serialization (own enumerable data only).
function serializeValue(value, out) {
  if (value === null) {
    out.push('null');
    return;
  }
  if (Array.isArray(value)) {
    out.push('[');
    for (let i = 0; i < value.length; i += 1) {
      if (i > 0) out.push(',');
      serializeValue(value[i], out);
    }
    out.push(']');
    return;
  }
  switch (typeof value) {
    case 'string':
      out.push(JSON.stringify(value));
      return;
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('non-finite number in report');
      out.push(JSON.stringify(value));
      return;
    case 'boolean':
      out.push(value ? 'true' : 'false');
      return;
    case 'object': {
      const keys = Object.keys(value).sort();
      out.push('{');
      let first = true;
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined || !('value' in descriptor)) {
          throw new TypeError('accessor property in report');
        }
        if (!first) out.push(',');
        first = false;
        out.push(JSON.stringify(key));
        out.push(':');
        serializeValue(descriptor.value, out);
      }
      out.push('}');
      return;
    }
    default:
      throw new TypeError('unsupported value in report');
  }
}

// serializeReport(result) -> { ok: true, text, bytes } | { ok: false, error }
// bytes is the UTF-8 (no BOM) encoding of text with exactly one trailing LF.
export function serializeReport(result) {
  const parts = [];
  try {
    serializeValue(result, parts);
  } catch {
    return failure('INTERNAL', null);
  }
  const text = parts.join('') + '\n';
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > REPORT_LIMIT_BYTES) return failure('OUTPUT_LIMIT', null);
  return { ok: true, text, bytes };
}
