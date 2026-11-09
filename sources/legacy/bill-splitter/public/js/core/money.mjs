export class BillError extends Error {
  constructor(code, fieldId = 'form', details = {}) {
    super(code);
    this.name = 'BillError'; this.code = code; this.fieldId = fieldId; this.details = details;
  }
}
export function fail(code, fieldId, details) { throw new BillError(code, fieldId, details); }
export function assertPrecision(precision) {
  if (precision !== 0 && precision !== 2) fail('PRECISION', 'precision');
}
export function parseAmount(raw, precision, { allowZero = false, emptyAsZero = false } = {}) {
  assertPrecision(precision);
  if (typeof raw !== 'string') fail('INPUT_SCHEMA');
  if (raw.length > 32) fail('AMOUNT_LENGTH');
  const value = raw.trim();
  if (value === '' && emptyAsZero) return 0n;
  const pattern = precision === 0 ? /^[0-9]+$/ : /^[0-9]+(?:\.[0-9]{1,2})?$/;
  if (!pattern.test(value)) fail('AMOUNT_FORMAT');
  const [integer, fraction = ''] = value.split('.');
  const amount = BigInt(integer + fraction.padEnd(precision, '0'));
  if (amount > (precision === 0 ? 99999999n : 9999999999n)) fail('AMOUNT_MAX');
  if (!allowZero && amount === 0n) fail('AMOUNT_ZERO');
  return amount;
}
export function formatAmount(minor, precision, locale = 'zh-Hant') {
  assertPrecision(precision);
  if (typeof minor !== 'bigint') fail('INPUT_SCHEMA');
  if (!['zh-Hant', 'en'].includes(locale)) fail('LOCALE');
  const magnitude = minor < 0n ? -minor : minor;
  const divisor = precision === 0 ? 1n : 100n;
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(magnitude / divisor);
  return (minor < 0n ? '-' : '') + integer + (precision === 2 ? '.' + (magnitude % 100n).toString().padStart(2, '0') : '');
}
