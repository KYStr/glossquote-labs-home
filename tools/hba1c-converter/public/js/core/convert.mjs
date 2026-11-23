// HbA1c Converter — pure core.
// Synchronous, no imports, no DOM / network / storage access.
// All conversion math uses exact BigInt rationals; rounding happens once,
// at output, and no output is ever derived from another rounded output.
// Classification and range checks use the unrounded canonical value
// (or, for the per-unit input ranges, the raw input against the SPEC
// table — see the range note in runChecked).
//
// Fixed contract: docs/specs/hba1c-converter/SPEC.md
// (spec-hba1c-converter-20261121, spec PR #372, registry rev 1707).
//
// Pinned formulas (SPEC §5, "implementation" / 釘版公式與來源):
//   eAG mg/dL  = 28.7 × A1c − 46.7            (ADAG / Nathan 2008)
//   eAG mmol/L = 1.5944 × A1c − 2.594         (ADAG Table 1 footnote)
//   IFCC mmol/mol = (A1c% − 2.15) × 10.929    (NGSP/IFCC master equation)
//   A1c% = IFCC ÷ 10.929 + 2.15 (inverse)
//   A1c% = (eAG mg/dL + 46.7) ÷ 28.7 (inverse)
//   A1c% = (eAG mmol/L + 2.594) ÷ 1.5944 (inverse)
// Categories (ADA diagnostic cut points, unrounded A1c%):
//   < 5.7 normal; 5.7–< 6.5 prediabetes; >= 6.5 diabetes-range.
// Display precision (ROUND_HALF_UP, strings keep trailing zeros):
//   A1c% 2 dp, IFCC 0 dp, eAG mg/dL 0 dp, eAG mmol/L 1 dp.

export const DEFAULT_DRAFT = Object.freeze({ value: '7', unit: 'a1c-percent' });

// "Load example" fills the first core fixture (A1c 7%).
export const EXAMPLE = Object.freeze({ value: '7', unit: 'a1c-percent' });

export const REPORT_FILENAME = 'hba1c-converter-report.json';
export const REPORT_BYTE_LIMIT = 2097152;

const UNITS = new Set(['a1c-percent', 'ifcc', 'eag-mgdl', 'eag-mmoll']);

// Grammar (SPEC inputsOutputs): 1–3 integer digits, optional "." plus
// 1–2 fraction digits; no sign, whitespace, comma or exponent. Leading
// zeros are accepted: the SPEC grammar is a digit-count rule, and "07"
// is two integer digits. See VERIFICATION.md.
const VALUE_PATTERN = /^[0-9]{1,3}(\.[0-9]{1,2})?$/;

// Per-unit input ranges, in integer hundredths of the entered unit
// (SPEC inputsOutputs table — the rounded display values of the exact
// canonical endpoints A1c% 3.0 / 20.0). The range check is applied to the
// RAW input against this table, not to the derived canonical A1c%:
// e.g. IFCC 9.29 derives to A1c% 2.99996, which is below 3.0, yet the
// SPEC's own endpoint tests require 9.29 to be accepted. Checking the
// raw input is the only reading under which the SPEC-named endpoints
// (IFCC 9.29/195.08, mg/dL 39.40/527.30, mmol/L 2.19/29.29) are all
// accepted. See VERIFICATION.md.
const RANGE_HUNDREDTHS = {
  'a1c-percent': { min: 300n, max: 2000n },
  ifcc: { min: 929n, max: 19508n },
  'eag-mgdl': { min: 3940n, max: 52730n },
  'eag-mmoll': { min: 219n, max: 2929n },
};

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

// Parse a grammar-valid decimal string to integer hundredths (BigInt).
function parseHundredths(raw) {
  const dot = raw.indexOf('.');
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? '' : raw.slice(dot + 1);
  const fracHundredths = (fracPart + '00').slice(0, 2);
  return BigInt(intPart) * 100n + BigInt(fracHundredths);
}

// Round the rational n/d (d > 0) to the nearest integer; exact halves
// round away from zero. All values here are non-negative, but the sign
// handling keeps the helper honest.
function roundDivToInt(n, d) {
  const negative = n < 0n;
  const a = negative ? -n : n;
  const q = (2n * a + d) / (2n * d);
  return negative ? -q : q;
}

// Format the rational n/d with exactly `decimals` decimal places,
// ROUND_HALF_UP, as a string with trailing zeros preserved.
function formatRational(n, d, decimals) {
  const scale = 10n ** BigInt(decimals);
  const rounded = roundDivToInt(n * scale, d);
  if (decimals === 0) return rounded.toString();
  const negative = rounded < 0n;
  const abs = negative ? -rounded : rounded;
  const intPart = abs / scale;
  const fracPart = (abs % scale).toString().padStart(decimals, '0');
  return `${negative ? '-' : ''}${intPart.toString()}.${fracPart}`;
}

// Derive the canonical unrounded A1c% as the exact rational { n, d }.
function canonicalA1c(unit, hundredths) {
  if (unit === 'a1c-percent') {
    return { n: hundredths, d: 100n };
  }
  if (unit === 'ifcc') {
    // A1c = IFCC ÷ 10.929 + 2.15
    //   = hundredths × 10 / 10929 + 215 / 100
    //   = (1000 × hundredths + 2349735) / 1092900
    return { n: 1000n * hundredths + 2349735n, d: 1092900n };
  }
  if (unit === 'eag-mgdl') {
    // A1c = (eAG + 46.7) ÷ 28.7 = (hundredths + 4670) / 2870
    return { n: hundredths + 4670n, d: 2870n };
  }
  // eag-mmoll: A1c = (eAG + 2.594) ÷ 1.5944
  //   = (100 × hundredths + 25940) / 15944
  return { n: 100n * hundredths + 25940n, d: 15944n };
}

function categoryOf(a1c) {
  // Compare unrounded A1c%: < 5.7 normal; < 6.5 prediabetes; else
  // diabetes-range. 10n < 57d ⟺ A1c < 5.7; 10n < 65d ⟺ A1c < 6.5.
  if (10n * a1c.n < 57n * a1c.d) return 'normal';
  if (10n * a1c.n < 65n * a1c.d) return 'prediabetes';
  return 'diabetes-range';
}

function runChecked(input) {
  // 1. SCHEMA: plain object, exactly the two own data fields.
  // Unknown extra fields, missing fields and wrong types are SCHEMA
  // with field null (SPEC inputsOutputs); the unit field is the one
  // exception — a missing/non-string/non-enum unit is SCHEMA with
  // field "unit" (SPEC step 1).
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail('SCHEMA', null);
  }
  const keys = Object.keys(input);
  if (keys.length > 2 || keys.some((k) => k !== 'value' && k !== 'unit')) {
    return fail('SCHEMA', null);
  }
  if (!keys.includes('unit')) return fail('SCHEMA', 'unit');
  if (!keys.includes('value')) return fail('SCHEMA', null);
  const unitDescriptor = Object.getOwnPropertyDescriptor(input, 'unit');
  const valueDescriptor = Object.getOwnPropertyDescriptor(input, 'value');
  if (unitDescriptor === undefined || !('value' in unitDescriptor)
    || typeof unitDescriptor.value !== 'string') {
    return fail('SCHEMA', 'unit');
  }
  if (valueDescriptor === undefined || !('value' in valueDescriptor)
    || typeof valueDescriptor.value !== 'string') {
    return fail('SCHEMA', null);
  }
  const { value, unit } = input;

  // 2. Unit enumeration (SPEC step 1).
  if (!UNITS.has(unit)) return fail('SCHEMA', 'unit');

  // 3. Value: capacity, then empty, then grammar, then range
  // (SPEC step 2). There is no UNICODE row in the SPEC error table:
  // an unpaired surrogate is not ASCII, so it fails the grammar
  // (value) or the enum (unit) and is reported as NUMBER_FORMAT /
  // SCHEMA respectively. See VERIFICATION.md.
  if (value.length > 8) return fail('INPUT_LIMIT', 'value');
  if (value === '') return fail('EMPTY', 'value');
  if (!VALUE_PATTERN.test(value)) return fail('NUMBER_FORMAT', 'value');
  const hundredths = parseHundredths(value);
  const range = RANGE_HUNDREDTHS[unit];
  if (hundredths < range.min || hundredths > range.max) {
    return fail('RANGE', 'value');
  }

  // 4. Derive canonical A1c% (unrounded, exact), then all four
  // outputs from it — never from another rounded output.
  const a1c = canonicalA1c(unit, hundredths);
  const { n, d } = a1c;
  return {
    ok: true,
    result: {
      a1cPercent: formatRational(n, d, 2),
      // IFCC = (A1c − 2.15) × 10.929
      //   = (100n − 215d) × 10929 / (100000d)
      ifcc: formatRational((100n * n - 215n * d) * 10929n, 100000n * d, 0),
      // eAG mg/dL = 28.7 × A1c − 46.7 = (287n − 467d) / (10d)
      eagMgdl: formatRational(287n * n - 467n * d, 10n * d, 0),
      // eAG mmol/L = 1.5944 × A1c − 2.594
      //   = (15944n − 25940d) / (10000d)
      eagMmoll: formatRational(15944n * n - 25940n * d, 10000n * d, 1),
      category: categoryOf(a1c),
    },
  };
}

export function run(input) {
  try {
    return runChecked(input);
  } catch {
    return fail('INTERNAL', null);
  }
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls on the input.
function canonicalJson(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download as
// hba1c-converter-report.json: canonical compact JSON plus one trailing
// LF, UTF-8, no BOM. Over the 2,097,152-byte report limit the result is
// OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
