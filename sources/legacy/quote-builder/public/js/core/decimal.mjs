export const decimalRules = Object.freeze({
  quantity: { scale: 1000n, min: 1n, max: 1000000000n, maxFractionDigits: 3 },
  unitPrice: { scale: 100n, min: 0n, max: 100000000000n, maxFractionDigits: 2 },
  discount: { scale: 100n, min: 0n, max: 5000000000000000000n, maxFractionDigits: 2 },
  taxRate: { scale: 100n, min: 0n, max: 10000n, maxFractionDigits: 2 },
});

export function parseScaledDecimal(text, { scale, min, max, maxFractionDigits, field }) {
  const bad = code => ({ ok: false, code, field });
  if (typeof text !== 'string') return bad('DECIMAL_TYPE');
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(text)) return bad('DECIMAL_FORMAT');
  const [integer, fraction = ''] = text.split('.');
  if (fraction.length > maxFractionDigits) return bad('DECIMAL_PRECISION');
  // Strip leading zeroes before conversion, so valid padded inputs cannot create
  // an unbounded BigInt. Never parse the amount through a floating-point value.
  const significant = integer.replace(/^0+/, '') || '0';
  const factor = BigInt(scale);
  if (significant.length > (BigInt(max) / factor).toString().length) return bad('DECIMAL_RANGE');
  const scaled = BigInt(significant) * factor + BigInt(fraction.padEnd(maxFractionDigits, '0') || '0');
  if (scaled < BigInt(min) || scaled > BigInt(max)) return bad('DECIMAL_RANGE');
  return { ok: true, scaled };
}

export function formatMinor(value) {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

export function formatQuantity(milli) {
  const fraction = (milli % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return `${milli / 1000n}${fraction ? `.${fraction}` : ''}`;
}
