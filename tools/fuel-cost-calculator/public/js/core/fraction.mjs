// Exact rational arithmetic on BigInt.
//
// The fuel-cost core must never use floating point: doubles cannot represent
// the exact identities the specification pins (for example 100 miles at
// 40 MPG (US) is exactly 2.5 US gallons). Every value is a normalised
// fraction { num, den } with den > 0 and gcd(|num|, den) = 1.
// Pure data only: no DOM, no network, no storage.

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

/** Create a normalised fraction from BigInt numerator/denominator. */
export function frac(num, den = 1n) {
  if (den === 0n) throw new RangeError('fraction denominator must not be zero');
  let n = num;
  let d = den;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return Object.freeze({ num: n / g, den: d / g });
}

export function mul(a, b) {
  return frac(a.num * b.num, a.den * b.den);
}

export function div(a, b) {
  if (b.num === 0n) throw new RangeError('division by a zero fraction');
  return frac(a.num * b.den, a.den * b.num);
}

/** -1, 0 or 1 as a < b, a == b or a > b. */
export function cmp(a, b) {
  const left = a.num * b.den;
  const right = b.num * a.den;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function equals(a, b) {
  return a.num === b.num && a.den === b.den;
}

const DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse a plain decimal string into an exact fraction.
 * Returns { ok: true, value, decimals } or { ok: false, error: 'not-a-number' }.
 * `decimals` is the number of digits written after the decimal point, so the
 * caller can enforce the specification's two-decimal-place cap on the text as
 * typed ("1.800" has three decimal places and is refused).
 * Scientific notation, thousands separators and "+" signs are not numbers here.
 */
export function parseDecimal(raw) {
  const text = String(raw).trim();
  if (!DECIMAL_PATTERN.test(text)) {
    return { ok: false, error: 'not-a-number' };
  }
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  const dot = body.indexOf('.');
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? '' : body.slice(dot + 1);
  const digits = (intPart === '' ? '0' : intPart) + fracPart;
  let num = BigInt(digits === '' ? '0' : digits);
  if (negative) num = -num;
  const den = 10n ** BigInt(fracPart.length);
  return { ok: true, value: frac(num, den), decimals: fracPart.length };
}

/**
 * The single rounding point in the tool: round-half-up to two decimal
 * places, applied once per displayed number, formatted with exactly two
 * digits after the point. All quantities in this tool are non-negative.
 */
export function formatTwoDp(value) {
  const negative = value.num < 0n;
  const absNum = negative ? -value.num : value.num;
  const scaled = absNum * 100n;
  let q = scaled / value.den;
  const r = scaled % value.den;
  if (2n * r >= value.den) q += 1n;
  const intPart = q / 100n;
  const fracPart = q % 100n;
  return `${negative ? '-' : ''}${intPart.toString()}.${fracPart.toString().padStart(2, '0')}`;
}

/**
 * Truncated decimal expansion with exactly `places` digits after the point.
 * Used by tests to assert constant identities to at least 10 significant
 * digits without ever touching a double.
 */
export function toDecimalString(value, places) {
  const negative = value.num < 0n;
  const absNum = negative ? -value.num : value.num;
  const intPart = absNum / value.den;
  let rem = absNum % value.den;
  let digits = '';
  for (let i = 0; i < places; i += 1) {
    rem *= 10n;
    digits += (rem / value.den).toString();
    rem %= value.den;
  }
  return `${negative ? '-' : ''}${intPart.toString()}.${digits}`;
}
