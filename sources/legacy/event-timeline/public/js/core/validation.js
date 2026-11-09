import { parseClock } from './parse-clock.js';
import { parseDuration } from './parse-duration.js';

const rootKeys = ['startTimeRaw', 'targetTimeRaw', 'targetNextDay', 'rows'];
const rowKeys = ['id', 'nameRaw', 'durationMinutesRaw', 'noteRaw'];
const failure = (code, field = null, rowId = null) => ({ ok: false, error: { code, field, rowId } });

export function createInitialDraft() {
  return { startTimeRaw: '', targetTimeRaw: '', targetNextDay: false, rows: [{ id: 'row-1', nameRaw: '', durationMinutesRaw: '', noteRaw: '' }] };
}

// Reflection is the only contact with unvalidated records. No property getter is read.
function recordDescriptors(input, keys, prefix = '') {
  if (input === null || typeof input !== 'object') return failure('INVALID_SCHEMA');
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return failure('INVALID_SCHEMA');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some(key => typeof key === 'symbol')) return failure('INVALID_SCHEMA');
  if (ownKeys.some(key => !keys.includes(key))) return failure('UNKNOWN_FIELD');
  for (const key of keys) if (!Object.hasOwn(descriptors, key)) return failure('MISSING_FIELD', prefix + key);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return failure('INVALID_SCHEMA', prefix + key);
  }
  return { ok: true, descriptors };
}

function arrayDescriptors(input) {
  if (Object.getPrototypeOf(input) !== Array.prototype) return failure('INVALID_SCHEMA', 'rows');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  const length = descriptors.length;
  if (keys.some(key => typeof key === 'symbol') || !length || !Object.hasOwn(length, 'value') || length.enumerable || length.configurable) return failure('INVALID_SCHEMA', 'rows');
  const count = length.value;
  if (!Number.isSafeInteger(count) || count < 0 || keys.length !== count + 1) return failure('INVALID_SCHEMA', 'rows');
  for (let index = 0; index < count; index++) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return failure('INVALID_SCHEMA', 'rows');
  }
  if (count < 1 || count > 60) return failure('ROW_COUNT', 'rows');
  return { ok: true, count, descriptors };
}

function unicodeError(text) {
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit <= 31 || unit >= 127 && unit <= 159) return 'CONTROL_CHARACTER';
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return 'UNPAIRED_SURROGATE';
      index++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return 'UNPAIRED_SURROGATE';
  }
  return null;
}

export function validateDraft(input) {
  try { return validate(input); }
  catch { return failure('INVALID_SCHEMA'); }
}

function validate(input) {
  const root = recordDescriptors(input, rootKeys);
  if (!root.ok) return root;
  const descriptors = root.descriptors;
  for (const key of rootKeys) {
    const value = descriptors[key].value;
    const validType = key === 'rows' ? Array.isArray(value) : typeof value === (key === 'targetNextDay' ? 'boolean' : 'string');
    if (!validType) return failure('INVALID_FIELD_TYPE', key);
  }
  const array = arrayDescriptors(descriptors.rows.value);
  if (!array.ok) return array;
  const rows = [];
  for (let index = 0; index < array.count; index++) {
    const row = recordDescriptors(array.descriptors[String(index)].value, rowKeys, 'rows[].');
    if (!row.ok) return row;
    for (const key of rowKeys) if (typeof row.descriptors[key].value !== 'string') return failure('INVALID_FIELD_TYPE', `rows[].${key}`);
    rows.push(Object.fromEntries(rowKeys.map(key => [key, row.descriptors[key].value])));
  }
  const ids = new Set();
  for (const row of rows) {
    if (row.id.length < 1 || row.id.length > 64 || /[^A-Za-z0-9_-]/.test(row.id)) return failure('INVALID_ROW_ID', 'rows[].id');
    if (ids.has(row.id)) return failure('DUPLICATE_ROW_ID', 'rows[].id', row.id);
    ids.add(row.id);
  }
  const startRaw = descriptors.startTimeRaw.value;
  const targetRaw = descriptors.targetTimeRaw.value;
  const nextDay = descriptors.targetNextDay.value;
  const texts = [[startRaw, 'startTimeRaw', null], [targetRaw, 'targetTimeRaw', null]];
  for (const row of rows) for (const key of rowKeys.slice(1)) texts.push([row[key], `rows[].${key}`, row.id]);
  for (const [text, field, rowId] of texts) if (text.length > 256) return failure('RAW_TEXT_TOO_LONG', field, rowId);
  for (const [text, field, rowId] of texts) {
    const error = unicodeError(text);
    if (error) return failure(error, field, rowId);
  }
  const start = parseClock(startRaw);
  if (!start.ok) return failure(start.code, 'startTimeRaw');
  if (nextDay && targetRaw === '') return failure('TARGET_NEXT_DAY_WITHOUT_TARGET', 'targetNextDay');
  let target = null;
  if (targetRaw !== '') {
    const parsed = parseClock(targetRaw);
    if (!parsed.ok) return failure(parsed.code, 'targetTimeRaw');
    if (!nextDay && parsed.minuteOfDay <= start.minuteOfDay) return failure('TARGET_NOT_AFTER_START', 'targetTimeRaw');
    target = { minuteOfDay: parsed.minuteOfDay, dayOffset: nextDay ? 1 : 0, absoluteMinute: parsed.minuteOfDay + (nextDay ? 1440 : 0) };
  }
  const normalizedRows = [];
  let totalMinutes = 0;
  for (const row of rows) {
    const name = row.nameRaw.trim();
    if (name.length === 0) return failure('NAME_REQUIRED', 'rows[].nameRaw', row.id);
    if (name.length > 80) return failure('NAME_TOO_LONG', 'rows[].nameRaw', row.id);
    const duration = parseDuration(row.durationMinutesRaw);
    if (!duration.ok) return failure(duration.code, 'rows[].durationMinutesRaw', row.id);
    const note = row.noteRaw.trim();
    if (note.length > 160) return failure('NOTE_TOO_LONG', 'rows[].noteRaw', row.id);
    normalizedRows.push({ id: row.id, name, durationMinutes: duration.minutes, note });
    totalMinutes += duration.minutes;
  }
  if (totalMinutes > 1440) return failure('TOTAL_DURATION_EXCEEDED');
  return { ok: true, value: { startMinuteOfDay: start.minuteOfDay, target, rows: normalizedRows, totalMinutes } };
}
