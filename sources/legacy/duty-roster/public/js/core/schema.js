// Reflection is bounded to data descriptors: no input getter is evaluated.
export function readRecord(value, keys) {
  try {
    if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.length !== keys.length || ownKeys.some(k => typeof k !== 'string' || !keys.includes(k))) return null;
    const data = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
      data[key] = descriptor.value;
    }
    return data;
  } catch { return null; }
}

export function readArray(value, maximum = 4294967295) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length;
    if (!length || !Object.hasOwn(length, 'value') || length.enumerable || !Number.isInteger(length.value) || length.value < 0 || length.value > maximum) return null;
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== length.value + 1) return null;
    const items = [];
    for (let i = 0; i < length.value; i++) {
      const descriptor = descriptors[String(i)];
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
      items.push(descriptor.value);
    }
    return items;
  } catch { return null; }
}

export const validId = value => typeof value === 'string' && value.length >= 1 && value.length <= 40 && !/[^A-Za-z0-9_-]/.test(value);
export const isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const monthLengths = year => [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const beforeYear = year => 365 * (year - 1) + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400);

export function parseDate(raw) {
  if (typeof raw !== 'string' || raw.length > 10 || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { issue: 'FORMAT' };
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  const day = Number(raw.slice(8, 10));
  const lengths = monthLengths(year);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > lengths[month - 1]) return { issue: 'INVALID' };
  if (year < 1900 || year > 2099) return { issue: 'RANGE' };
  let ordinal = beforeYear(year) + day - 1;
  for (let i = 0; i < month - 1; i++) ordinal += lengths[i];
  return { ordinal, weekday: ordinal % 7 + 1 };
}

export function formatOrdinal(ordinal) {
  let year = 1900;
  while (beforeYear(year + 1) <= ordinal) year++;
  let day = ordinal - beforeYear(year);
  const lengths = monthLengths(year);
  let month = 0;
  while (day >= lengths[month]) day -= lengths[month++];
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
}

export function nameIssue(raw) {
  if (typeof raw !== 'string') return 'TYPE';
  if (raw.length > 512) return 'RAW_LIMIT';
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(raw)) return 'CONTROL';
  for (let i = 0; i < raw.length; i++) {
    const unit = raw.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = raw.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return 'SURROGATE';
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return 'SURROGATE';
  }
  const name = raw.trim();
  if (!name.length) return 'EMPTY';
  if ([...name].length > 80) return 'TOO_LONG';
  return null;
}
