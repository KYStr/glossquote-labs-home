// Bounded schema reflection. Values are taken only from validated descriptors.
export function readRecord(value, keys, path) {
  try {
    if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return { error: path };
    const own = Reflect.ownKeys(value);
    if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) return { error: path };
    const values = {};
    for (const key of keys) {
      let descriptor;
      try { descriptor = Object.getOwnPropertyDescriptor(value, key); } catch { return { error: `${path}.${key}` }; }
      if (!descriptor || !descriptor.enumerable) return { error: path };
      if (!Object.hasOwn(descriptor, 'value') || Object.hasOwn(descriptor, 'get') || Object.hasOwn(descriptor, 'set')) return { error: `${path}.${key}` };
      values[key] = descriptor.value;
    }
    return { values };
  } catch { return { error: path }; }
}

export const decimalPattern = /^[0-9]+(?:\.[0-9]{1,2})?(?![\s\S])/u;
export function parseHundredths(raw) {
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function formatHundredths(value) {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}
export function displayNumerator(value) {
  return formatHundredths((value + 5000n) / 10000n);
}
export function derive(target, earned, remaining) {
  const targetNumerator = target * 10000n;
  const maximum = earned + remaining * 10000n;
  let status;
  let required = null;
  if (remaining === 0n) status = earned >= targetNumerator ? 'complete_met' : 'complete_missed';
  else if (earned >= targetNumerator) { status = 'target_already_met'; required = 0n; }
  else if (maximum < targetNumerator) status = 'target_unreachable';
  else { status = 'target_feasible'; required = (targetNumerator - earned + remaining - 1n) / remaining; }
  return { status, required, maximum };
}
