export const INPUT_KEYS = Object.freeze(['observationDaysRaw', 'leadDaysRaw', 'coverageDaysRaw', 'items']);
export const ROW_KEYS = Object.freeze(['id', 'nameRaw', 'unitRaw', 'usedRaw', 'stockRaw', 'reserveRaw', 'packSizeRaw']);
export const DAY_KEYS = INPUT_KEYS.slice(0, 3);
export const QUANTITY_KEYS = ROW_KEYS.slice(3);
export const fail = (code, field) => ({ ok: false, error: { code, field } });

// Inspect all descriptors before returning values. Accessors are never evaluated.
export function inspectObject(value, keys, prefix, field) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return fail(`${prefix}_OBJECT`, field);
  const actual = Reflect.ownKeys(value);
  if (actual.some(key => typeof key !== 'string' || !keys.includes(key))) return fail(`${prefix}_UNKNOWN_FIELD`, field);
  for (const key of keys) if (!Object.hasOwn(value, key)) return fail(`${prefix}_MISSING_FIELD`, field === 'input' ? key : `${field}.${key}`);
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(value, key));
  for (let i = 0; i < keys.length; i++) {
    if (!Object.hasOwn(descriptors[i], 'value') || !descriptors[i].enumerable) return fail(`${prefix}_PROPERTY`, field === 'input' ? keys[i] : `${field}.${keys[i]}`);
  }
  return { ok: true, values: Object.fromEntries(keys.map((key, i) => [key, descriptors[i].value])) };
}

export function inspectItems(value) {
  if (!Array.isArray(value)) return fail('ITEMS_TYPE', 'items');
  if (Object.getPrototypeOf(value) !== Array.prototype) return fail('ITEMS_SHAPE', 'items');
  // Array length is a native own data property. Gate it BEFORE own-key scanning.
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (length > 30) return fail('ITEM_LIMIT', 'items');
  if (length < 1) return fail('ITEM_COUNT', 'items');
  const indices = Array.from({ length }, (_, i) => String(i));
  if (Reflect.ownKeys(value).some(key => key !== 'length' && !indices.includes(key))) return fail('ITEMS_SHAPE', 'items');
  const descriptors = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor) return fail('ITEM_HOLE', `items[${i}]`);
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return fail('ITEMS_PROPERTY', `items[${i}]`);
    descriptors.push(descriptor);
  }
  return { ok: true, values: descriptors.map(descriptor => descriptor.value) };
}

export function parseInteger(raw, minimum, maximum, prefix, field) {
  if (typeof raw !== 'string') return fail(`${prefix}_TYPE`, field);
  if (raw.length > 16) return fail(`${prefix}_RAW_LIMIT`, field);
  if (!/^[0-9]{1,16}$/.test(raw)) return fail(`${prefix}_FORMAT`, field);
  const value = BigInt(raw);
  if (value < minimum || value > maximum) return fail(`${prefix}_RANGE`, field);
  return { ok: true, value };
}

export function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

export function parseLabel(raw, prefix, field) {
  if (typeof raw !== 'string') return fail(`${prefix}_TYPE`, field);
  const isName = prefix === 'NAME';
  if (raw.length > (isName ? 512 : 128)) return fail(`${prefix}_RAW_LIMIT`, field);
  if (hasUnpairedSurrogate(raw)) return fail(`${prefix}_SURROGATE`, field);
  if (/[\u0000-\u001f\u007f-\u009f]/.test(raw)) return fail(`${prefix}_CONTROL`, field);
  if (/[\u2028\u2029]/.test(raw)) return fail(`${prefix}_LINE_SEPARATOR`, field);
  const value = raw.trim();
  if (!value) return fail(`${prefix}_EMPTY`, field);
  if ([...value].length > (isName ? 80 : 16)) return fail(`${prefix}_CODEPOINT_LIMIT`, field);
  return { ok: true, value };
}

export function validateInput(input) {
  const root = inspectObject(input, INPUT_KEYS, 'INPUT', 'input');
  if (!root.ok) return root;
  const days = [];
  for (let i = 0; i < DAY_KEYS.length; i++) {
    const key = DAY_KEYS[i];
    const parsed = parseInteger(root.values[key], i === 1 ? 0n : 1n, 365n, 'DAY', key);
    if (!parsed.ok) return parsed;
    days.push(parsed.value);
  }
  const array = inspectItems(root.values.items);
  if (!array.ok) return array;
  const ids = new Set();
  const rows = [];
  for (let i = 0; i < array.values.length; i++) {
    const field = `items[${i}]`;
    const inspected = inspectObject(array.values[i], ROW_KEYS, 'ROW', field);
    if (!inspected.ok) return inspected;
    const row = inspected.values;
    if (typeof row.id !== 'string') return fail('ROW_ID_TYPE', `${field}.id`);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(row.id)) return fail('ROW_ID_FORMAT', `${field}.id`);
    if (ids.has(row.id)) return fail('ROW_ID_DUPLICATE', `${field}.id`);
    ids.add(row.id);
    const name = parseLabel(row.nameRaw, 'NAME', `${field}.nameRaw`);
    if (!name.ok) return name;
    const unit = parseLabel(row.unitRaw, 'UNIT', `${field}.unitRaw`);
    if (!unit.ok) return unit;
    const quantities = [];
    for (const key of QUANTITY_KEYS) {
      const pack = key === 'packSizeRaw';
      const parsed = parseInteger(row[key], pack ? 1n : 0n, pack ? 10000n : 1000000n, 'QUANTITY', `${field}.${key}`);
      if (!parsed.ok) return parsed;
      quantities.push(parsed.value);
    }
    rows.push({ id: row.id, name: name.value, unit: unit.value, quantities });
  }
  return { ok: true, days, rows };
}
