// Pure money parsing and formatting for the Compound Interest Calculator.
// Contract: docs/specs/compound-interest-calculator/SPEC.md section 4.
// All money is integer cents held as BigInt; the rate is an integer count of
// thousandths of a percent (12.345% -> 12345). No DOM, network or storage.

export const MAX_AMOUNT_CENTS = 99999999999n; // 999,999,999.99 (SPEC cap)
export const MAX_RATE_THOUSANDTHS = 100000; // 100.000%
export const MAX_TERM_MONTHS = 600;
// Monthly interest denominator: balance * rateThousandths / (1200 * 1000),
// i.e. balance * (annualRatePercent / 1200) with the rate kept exact.
export const MONTHLY_RATE_DENOMINATOR = 1200000n;

const AMOUNT_RE = /^(\d+)(?:\.(\d+))?$/;
const RATE_RE = /^(\d+)(?:\.(\d+))?$/;
const TERM_RE = /^\d+$/;

function fail(error) {
  return { ok: false, error };
}

// Parse a user-typed amount into integer cents (BigInt).
// Errors: required | negative | invalid | too-many-decimals | over-cap.
export function parseAmountToCents(raw) {
  if (typeof raw !== 'string') return fail('invalid');
  const text = raw.trim();
  if (text === '') return fail('required');
  if (text.startsWith('-')) return fail('negative');
  const m = AMOUNT_RE.exec(text);
  if (!m) return fail('invalid');
  const frac = m[2] ?? '';
  if (frac.length > 2) return fail('too-many-decimals');
  const cents = BigInt(m[1]) * 100n + BigInt((frac + '00').slice(0, 2));
  if (cents > MAX_AMOUNT_CENTS) return fail('over-cap');
  return { ok: true, cents };
}

// Parse a nominal annual rate (percent) into thousandths of a percent.
// Errors: required | negative | invalid | too-many-decimals | over-max.
export function parseRateToThousandths(raw) {
  if (typeof raw !== 'string') return fail('invalid');
  const text = raw.trim();
  if (text === '') return fail('required');
  if (text.startsWith('-')) return fail('negative');
  const m = RATE_RE.exec(text);
  if (!m) return fail('invalid');
  const frac = m[2] ?? '';
  if (frac.length > 3) return fail('too-many-decimals');
  const thousandths = Number(m[1]) * 1000 + Number((frac + '000').slice(0, 3));
  if (thousandths > MAX_RATE_THOUSANDTHS) return fail('over-max');
  return { ok: true, thousandths };
}

// Parse a term in whole months, 1..600.
// Errors: required | invalid | out-of-range.
export function parseTermMonths(raw) {
  if (typeof raw !== 'string') return fail('invalid');
  const text = raw.trim();
  if (text === '') return fail('required');
  if (!TERM_RE.test(text)) return fail('invalid');
  const months = Number(text);
  if (!Number.isSafeInteger(months) || months < 1 || months > MAX_TERM_MONTHS) {
    return fail('out-of-range');
  }
  return { ok: true, months };
}

// Format integer cents (BigInt) as a decimal string with exactly 2 places.
// grouped=true inserts thousands separators (display); false is CSV/plain.
export function formatCents(cents, grouped = true) {
  const value = BigInt(cents);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  let units = (abs / 100n).toString();
  const frac = (abs % 100n).toString().padStart(2, '0');
  if (grouped) units = units.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${units}.${frac}`;
}
