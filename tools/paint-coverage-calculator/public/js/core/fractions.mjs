// Exact rational arithmetic on BigInt numerators/denominators.
// Pure module: no DOM, no network, no storage. All quantities handled by
// this tool are non-negative, but the helpers keep signs correct generally.

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

/** Create a normalised fraction { n, d } with d > 0. */
export function frac(n, d = 1n) {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new RangeError('fraction denominator must not be zero');
  if (den < 0n) {
    den = -den;
    num = -num;
  }
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

export const fAdd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const fSub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fMul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const fDiv = (a, b) => frac(a.n * b.d, a.d * b.n);
export const fMulInt = (a, k) => frac(a.n * BigInt(k), a.d);

/** -1, 0 or 1 as a < b, a == b, a > b. */
export function fCmp(a, b) {
  const lhs = a.n * b.d;
  const rhs = b.n * a.d;
  return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
}

/**
 * Smallest whole number k (BigInt) with k * b >= a, for a >= 0 and b > 0.
 * This is the exact mathematical ceiling of a / b: when a is an exact
 * multiple of b the result is that multiple, never one more.
 */
export function fCeilDiv(a, b) {
  if (a.n <= 0n) return 0n;
  const num = a.n * b.d;
  const den = a.d * b.n;
  return (num + den - 1n) / den;
}

/**
 * Format a non-negative fraction rounded half-up to exactly two decimals,
 * e.g. frac(1018, 1000) -> "1.02", frac(201, 200) -> "1.01".
 */
export function formatHalfUp2(a) {
  if (a.n < 0n) throw new RangeError('formatHalfUp2 expects a non-negative value');
  // rounded hundredths = floor((a * 100 * 2 + 1) / 2) computed exactly:
  // half-up of x = floor(x + 1/2); with x = a.n * 100 / a.d.
  const scaledNum = a.n * 100n;
  const hundredths = (2n * scaledNum + a.d) / (2n * a.d);
  const whole = hundredths / 100n;
  const rem = hundredths % 100n;
  return `${whole}.${rem.toString().padStart(2, '0')}`;
}

/** Exact decimal string of a fraction when it terminates within 6 dp (for diagnostics). */
export function fracToString(a) {
  return `${a.n}/${a.d}`;
}
