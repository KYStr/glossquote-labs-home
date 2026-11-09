export class InputError extends Error {
  constructor(code, path = '') { super(code); this.name = 'InputError'; this.code = code; this.path = path; }
}

export const MAX_TOTAL = 1_000_000_000_000n; // Thousandths of 1,000,000,000 g/ml/piece/custom units.
export function parseQuantity(text) {
  if (typeof text !== 'string' || !/^[0-9]+(?:\.[0-9]{1,3})?$/.test(text)) throw new InputError('INVALID_QUANTITY');
  const [rawWhole, fraction = ''] = text.split('.');
  const whole = rawWhole.replace(/^0+/, '') || '0';
  if (whole.length > 7) throw new InputError('INVALID_QUANTITY');
  const value = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (value > 1_000_000_000n) throw new InputError('INVALID_QUANTITY');
  return value;
}

export function formatQuantity(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new InputError('INVALID_QUANTITY');
  const whole = value / 1000n;
  const fraction = (value % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}`;
}

export function normalizeText(value, maximum, code = 'INVALID_NAME') {
  if (typeof value !== 'string' || !value.isWellFormed() || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new InputError(code);
  const result = value.normalize('NFC').trim();
  if ([...result].length < 1 || [...result].length > maximum) throw new InputError(code);
  return result;
}

export function normalizeIngredient(name) { return normalizeText(name, 120); }

export function unitInfo(unit, unitLabel = '') {
  const units = {
    g: { dimension: 'mass', outputUnit: 'g', factor: 1n },
    kg: { dimension: 'mass', outputUnit: 'g', factor: 1000n },
    ml: { dimension: 'volume', outputUnit: 'ml', factor: 1n },
    L: { dimension: 'volume', outputUnit: 'ml', factor: 1000n },
    piece: { dimension: 'count', outputUnit: 'piece', factor: 1n },
  };
  if (unit === 'customCount') return { dimension: 'customCount', outputUnit: normalizeText(unitLabel, 20, 'INVALID_UNIT_LABEL'), factor: 1n };
  if (!Object.hasOwn(units, unit) || unitLabel !== '') throw new InputError('INVALID_UNIT');
  return units[unit];
}

export function itemKey(ingredient, info) { return JSON.stringify([ingredient, info.dimension, info.dimension === 'customCount' ? info.outputUnit : '']); }
