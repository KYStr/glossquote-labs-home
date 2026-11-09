export const LIMITS = Object.freeze({ boxes: 100, items: 1000, boxId: 40, room: 80, name: 120, notes: 500, quantity: 100000, importBytes: 8 * 1024 * 1024 });
export class InventoryError extends Error {
  constructor(code, field = '') { super(code); this.name = 'InventoryError'; this.code = code; this.field = field; }
}
export function fail(code, field = '') { throw new InventoryError(code, field); }
export function exact(value, keys, field = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('INVALID_SCHEMA', field);
  const own = Reflect.ownKeys(value);
  if (own.some(key => typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key))) fail('DANGEROUS_KEY', field);
  if (own.length !== keys.length || own.some(key => !keys.includes(key))) fail('INVALID_SCHEMA', field);
  for (const key of own) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) fail('INVALID_SCHEMA', field);
  }
}
export function text(value, maximum, { required = false, trim = true, field = '' } = {}) {
  if (typeof value !== 'string') fail('INVALID_TEXT', field);
  // Bound work before normalization; valid strings use at most two UTF-16 units per code point.
  if (value.length > maximum * 2 + 100) fail('TEXT_TOO_LONG', field);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) fail('INVALID_TEXT', field);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('INVALID_TEXT', field);
    } else if (code >= 0xdc00 && code <= 0xdfff) fail('INVALID_TEXT', field);
  }
  const normalized = (trim ? value.trim() : value).normalize('NFC');
  const length = [...normalized].length;
  if (length > maximum) fail('TEXT_TOO_LONG', field);
  if (required && !length) fail('REQUIRED', field);
  return normalized;
}
export function quantity(value, { draft = false } = {}) {
  if (draft && typeof value === 'string') {
    if (!/^[0-9]{1,6}$/.test(value)) fail('INVALID_QUANTITY', 'item.quantity');
    value = Number(value);
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > LIMITS.quantity) fail('INVALID_QUANTITY', 'item.quantity');
  return value;
}
export function itemNumber(id) {
  if (typeof id !== 'string' || !/^I[0-9]{6,16}$/.test(id)) fail('INVALID_ITEM_ID');
  const number = Number(id.slice(1));
  if (!Number.isSafeInteger(number) || number < 1 || 'I' + String(number).padStart(6, '0') !== id) fail('INVALID_ITEM_ID');
  return number;
}
export function normalizeBoxDraft(draft) {
  exact(draft, ['id', 'room', 'priority', 'notes'], 'box');
  if (typeof draft.priority !== 'boolean') fail('INVALID_PRIORITY', 'box.priority');
  return {
    id: text(draft.id, LIMITS.boxId, { required: true, field: 'box.id' }),
    room: text(draft.room, LIMITS.room, { required: true, field: 'box.room' }),
    priority: draft.priority,
    notes: text(draft.notes, LIMITS.notes, { trim: false, field: 'box.notes' })
  };
}
export function normalizeItemDraft(draft, { importing = false } = {}) {
  exact(draft, ['name', 'quantity', 'notes'], 'item');
  return {
    name: text(draft.name, LIMITS.name, { required: true, field: 'item.name' }),
    quantity: quantity(draft.quantity, { draft: !importing }),
    notes: text(draft.notes, LIMITS.notes, { trim: false, field: 'item.notes' })
  };
}
export function emptyProject() { return { schemaVersion: 1, boxes: [] }; }
export function validateProject(value) {
  exact(value, ['schemaVersion', 'boxes']);
  if (value.schemaVersion !== 1 || !Array.isArray(value.boxes)) fail('INVALID_SCHEMA');
  if (value.boxes.length > LIMITS.boxes) fail('BOX_LIMIT');
  const boxIds = new Set();
  const itemIds = new Set();
  let count = 0;
  const boxes = value.boxes.map(box => {
    exact(box, ['id', 'room', 'priority', 'notes', 'items'], 'box');
    const normalized = normalizeBoxDraft({ id: box.id, room: box.room, priority: box.priority, notes: box.notes });
    if (boxIds.has(normalized.id)) fail('DUPLICATE_BOX_ID', 'box.id');
    boxIds.add(normalized.id);
    if (!Array.isArray(box.items)) fail('INVALID_SCHEMA');
    count += box.items.length;
    if (count > LIMITS.items) fail('ITEM_LIMIT');
    const items = box.items.map(item => {
      exact(item, ['id', 'name', 'quantity', 'notes'], 'item');
      itemNumber(item.id);
      if (itemIds.has(item.id)) fail('DUPLICATE_ITEM_ID');
      itemIds.add(item.id);
      return { id: item.id, ...normalizeItemDraft({ name: item.name, quantity: item.quantity, notes: item.notes }, { importing: true }) };
    });
    return { ...normalized, items };
  });
  return { schemaVersion: 1, boxes };
}
export function parseProject(source) {
  if (typeof source !== 'string') fail('INVALID_JSON');
  if (source.length > LIMITS.importBytes || new TextEncoder().encode(source).byteLength > LIMITS.importBytes) fail('IMPORT_TOO_LARGE');
  let value;
  try { value = JSON.parse(source); } catch { fail('INVALID_JSON'); }
  return validateProject(value);
}
export function serializeProject(state) { return JSON.stringify(validateProject(state), null, 2) + '\n'; }
export function countItems(state) { return state.boxes.reduce((count, box) => count + box.items.length, 0); }
