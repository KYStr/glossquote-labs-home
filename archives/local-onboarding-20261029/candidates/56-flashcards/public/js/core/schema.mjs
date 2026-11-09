export const LIMITS = Object.freeze({ csvBytes: 1048576, jsonBytes: 2097152, cards: 500, records: 501, columns: 30, face: 2000 });
export class CardError extends Error {
  constructor(code, field = 'source', record = null) { super(code); this.name = 'CardError'; this.code = code; this.field = field; this.record = record; }
}
export function fail(code, field, record) { throw new CardError(code, field, record); }
export function validateText(value, { face = false, record = null, field = 'source' } = {}) {
  if (typeof value !== 'string') fail('INVALID_SCHEMA', field, record);
  if (!value.isWellFormed() || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(value)) fail('INVALID_TEXT', field, record);
  if (face && value.length > LIMITS.face) fail('FACE_TOO_LONG', field, record);
  if (face && !value.trim()) fail('EMPTY_FACE', field, record);
  return value;
}
export function exactObject(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('INVALID_SCHEMA', 'json');
  const own = Object.keys(value);
  if (own.length !== keys.length || !keys.every(key => Object.hasOwn(value, key)) || own.some(key => !keys.includes(key))) fail('INVALID_SCHEMA', 'json');
}
export function validateCards(cards) {
  if (!Array.isArray(cards)) fail('INVALID_SCHEMA', 'json');
  if (!cards.length) fail('EMPTY_DECK');
  if (cards.length > LIMITS.cards) fail('TOO_MANY_CARDS');
  const ids = new Set();
  return cards.map((card, index) => {
    exactObject(card, ['id', 'question', 'answer']);
    if (!Number.isSafeInteger(card.id) || card.id < 1) fail('INVALID_ID', 'json', index + 1);
    if (ids.has(card.id)) fail('DUPLICATE_ID', 'json', index + 1);
    ids.add(card.id);
    return { id: card.id, question: validateText(card.question, { face: true, record: index + 1 }), answer: validateText(card.answer, { face: true, record: index + 1 }) };
  });
}
export function validateDeck(value) {
  exactObject(value, ['schemaVersion', 'cards', 'known']);
  if (value.schemaVersion !== 1 || !Array.isArray(value.known)) fail('INVALID_SCHEMA', 'json');
  const cards = validateCards(value.cards);
  const ids = new Set(cards.map(card => card.id));
  const known = new Set();
  for (const id of value.known) {
    if (!Number.isSafeInteger(id) || !ids.has(id)) fail('INVALID_REFERENCE', 'json');
    if (known.has(id)) fail('DUPLICATE_ID', 'json');
    known.add(id);
  }
  return { schemaVersion: 1, cards, known: [...known] };
}
export function parseDeckJson(source) {
  if (typeof source !== 'string') fail('INVALID_SCHEMA', 'json');
  if (source.length > LIMITS.jsonBytes) fail('SOURCE_TOO_LARGE', 'json');
  validateText(source, { field: 'json' });
  if (new TextEncoder().encode(source).byteLength > LIMITS.jsonBytes) fail('SOURCE_TOO_LARGE', 'json');
  let value;
  try { value = JSON.parse(source.replace(/^\uFEFF/u, '')); } catch { fail('INVALID_JSON', 'json'); }
  return validateDeck(value);
}
