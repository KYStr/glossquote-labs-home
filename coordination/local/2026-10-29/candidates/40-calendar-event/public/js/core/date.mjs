export const DAY_MS = 86_400_000;

export class CalendarError extends Error {
  constructor(code, field = 'form') { super(code); this.name = 'CalendarError'; this.code = code; this.field = field; }
}
export function fail(code, field) { throw new CalendarError(code, field); }

export function exactRecord(value, allowed, required = allowed, field = 'form') {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('INVALID_SCHEMA', field);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || !allowed.includes(key) || !Object.hasOwn(descriptors[key], 'value')) ||
      required.some(key => !Object.hasOwn(descriptors, key))) fail('INVALID_SCHEMA', field);
}

export function parseCivilDate(text, field = 'date') {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) fail('INVALID_DATE', field);
  const [year, month, day] = text.split('-').map(Number);
  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) fail('INVALID_DATE', field);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail('INVALID_DATE', field);
  return { year, month, day };
}

export function parseClock(text, field = 'time') {
  if (typeof text !== 'string' || !/^\d{2}:\d{2}$/.test(text)) fail('INVALID_TIME', field);
  const [hour, minute] = text.split(':').map(Number);
  if (hour > 23 || minute > 59) fail('INVALID_TIME', field);
  return { hour, minute };
}

export function civilEpoch({ year, month, day }) { return Date.UTC(year, month - 1, day); }
export function isoCivil(epochMs) {
  const d = new Date(epochMs);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function normalizedText(value, field, maximum, { required = false, multiline = false } = {}) {
  if (typeof value !== 'string') fail('INVALID_TEXT', field);
  // Hard cap before any normalization or code-point expansion.
  if (value.length > maximum * 2 + (multiline ? maximum : 0) + (required ? 512 : 0)) fail('TEXT_TOO_LONG', field);
  if (!value.isWellFormed()) fail('INVALID_TEXT', field);
  const normalized = multiline ? value.replace(/\r\n?/g, '\n') : value;
  if ((multiline ? /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/).test(normalized)) fail('INVALID_TEXT', field);
  const text = required ? normalized.trim() : normalized;
  const length = [...text].length;
  if (required && length === 0) fail('TITLE_REQUIRED', field);
  if (length > maximum) fail('TEXT_TOO_LONG', field);
  return text;
}
