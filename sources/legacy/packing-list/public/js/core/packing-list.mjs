export const MAX_ROWS = 100;
export const MAX_BACKUP_BYTES = 131072;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const DRAFT_KEYS = ['rows', 'limitGramsRaw'];
const ROW_KEYS = ['id', 'nameRaw', 'quantityRaw', 'unitWeightGramsRaw', 'packed'];
const BACKUP_KEYS = ['schemaVersion', 'tool', 'limitGrams', 'rows'];
const BACKUP_ROW_KEYS = ['id', 'name', 'quantity', 'unitWeightGrams', 'packed'];

function plain(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Read descriptors before values. Accessors never run, even on rejected inputs.
function recordShape(value, keys, invalid = 'INVALID_SCHEMA') {
  if (!plain(value)) return invalid;
  const own = Reflect.ownKeys(value);
  if (own.some(key => !keys.includes(key))) return 'UNKNOWN_FIELD';
  if (keys.some(key => !Object.hasOwn(value, key))) return invalid;
  if (keys.some(key => !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))) {
    return 'INVALID_SCHEMA';
  }
  return null;
}

function denseRows(rows) {
  if (!Array.isArray(rows)) return false;
  const length = Object.getOwnPropertyDescriptor(rows, 'length');
  if (!length || !Object.hasOwn(length, 'value') || length.enumerable ||
      !Number.isSafeInteger(length.value) || length.value > MAX_ROWS) return false;
  const own = Reflect.ownKeys(rows);
  if (own.length !== length.value + 1) return false;
  for (let index = 0; index < length.value; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(rows, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return false;
  }
  return true;
}

export function parseInteger(raw, { min, max, allowEmpty = false }) {
  if (typeof raw !== 'string') return { ok: false, code: 'INVALID_SCHEMA' };
  if (raw.length > 32) return { ok: false, code: 'INPUT_TOO_LONG' };
  const text = raw.replace(/^[\u0009-\u000d\u0020]+|[\u0009-\u000d\u0020]+$/g, '');
  if (text === '' && allowEmpty) return { ok: true, value: null };
  if (!/^[0-9]+$/.test(text)) return { ok: false, code: 'INTEGER_REQUIRED' };
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return { ok: false, code: 'OUT_OF_RANGE' };
  }
  return { ok: true, value };
}

function nameError(name) {
  if (name.length > 80) return 'INVALID_NAME';
  if (CONTROL.test(name)) return 'CONTROL_CHARACTER';
  return null;
}

export function createEmptyDraft() { return { rows: [], limitGramsRaw: '' }; }
export function createRowDraft(id) {
  return { id, nameRaw: '', quantityRaw: '1', unitWeightGramsRaw: '', packed: false };
}

const structuralFailure = code => ({ ok: false, code, fieldErrors: [], summary: null });
const fieldFailure = (rowIndex, field, code) => ({
  ok: false, code: null, fieldErrors: [{ rowIndex, field, code }], summary: null
});

export function validateDraft(draft) {
  const shape = recordShape(draft, DRAFT_KEYS);
  if (shape) return structuralFailure(shape);
  if (typeof draft.limitGramsRaw !== 'string') return structuralFailure('INVALID_SCHEMA');
  if (!denseRows(draft.rows)) return structuralFailure('ROW_LIMIT');
  const ids = new Set();
  const rows = [];
  for (let index = 0; index < draft.rows.length; index++) {
    const row = draft.rows[index];
    const rowShape = recordShape(row, ROW_KEYS, 'INVALID_ROW');
    if (rowShape) return structuralFailure(rowShape);
    if (typeof row.id !== 'string' || typeof row.nameRaw !== 'string' ||
        typeof row.quantityRaw !== 'string' || typeof row.unitWeightGramsRaw !== 'string' ||
        typeof row.packed !== 'boolean') return structuralFailure('INVALID_ROW');
    if (!ID.test(row.id)) return fieldFailure(index, 'id', 'INVALID_ROW');
    if (ids.has(row.id)) return fieldFailure(index, 'id', 'DUPLICATE_ID');
    ids.add(row.id);
    const invalidName = nameError(row.nameRaw);
    if (invalidName) return fieldFailure(index, 'nameRaw', invalidName);
    const quantity = parseInteger(row.quantityRaw, { min: 1, max: 99 });
    if (!quantity.ok) return fieldFailure(index, 'quantityRaw', quantity.code);
    const weight = parseInteger(row.unitWeightGramsRaw, { min: 0, max: 99999, allowEmpty: true });
    if (!weight.ok) return fieldFailure(index, 'unitWeightGramsRaw', weight.code);
    rows.push({ id: row.id, name: row.nameRaw.trim(), quantity: quantity.value,
      unitWeightGrams: weight.value, packed: row.packed });
  }
  const limit = parseInteger(draft.limitGramsRaw, { min: 1, max: 999999999, allowEmpty: true });
  if (!limit.ok) return fieldFailure(null, 'limitGramsRaw', limit.code);
  const list = { rows, limitGrams: limit.value };
  return { ok: true, list, summary: calculateSummary(list) };
}

function safeAdd(left, right) {
  const value = left + right;
  if (!Number.isSafeInteger(value)) throw new RangeError('OUT_OF_RANGE');
  return value;
}

// Caller supplies the complete, validated internal list; never a partial draft.
export function calculateSummary(list) {
  const result = { rowCount: list.rows.length, pieceCount: 0, packedRows: 0, packedPieces: 0,
    knownSubtotalGrams: 0, unknownWeightRows: 0, unknownWeightPieces: 0,
    totalWeightGrams: null, limitGrams: list.limitGrams, limitStatus: 'empty',
    overByGrams: null, minimumOverByGrams: null };
  for (const row of list.rows) {
    result.pieceCount = safeAdd(result.pieceCount, row.quantity);
    if (row.packed) {
      result.packedRows++;
      result.packedPieces = safeAdd(result.packedPieces, row.quantity);
    }
    if (row.unitWeightGrams === null) {
      result.unknownWeightRows++;
      result.unknownWeightPieces = safeAdd(result.unknownWeightPieces, row.quantity);
    } else {
      const weight = row.quantity * row.unitWeightGrams;
      if (!Number.isSafeInteger(weight)) throw new RangeError('OUT_OF_RANGE');
      result.knownSubtotalGrams = safeAdd(result.knownSubtotalGrams, weight);
    }
  }
  if (result.rowCount === 0) return result;
  if (result.unknownWeightRows === 0) result.totalWeightGrams = result.knownSubtotalGrams;
  if (list.limitGrams === null) result.limitStatus = 'not-set';
  else if (result.unknownWeightRows > 0) {
    result.limitStatus = result.knownSubtotalGrams > list.limitGrams ? 'over-known-minimum' : 'unknown-weight';
    if (result.limitStatus === 'over-known-minimum') {
      result.minimumOverByGrams = result.knownSubtotalGrams - list.limitGrams;
    }
  } else {
    result.limitStatus = result.totalWeightGrams > list.limitGrams ? 'over' : 'within';
    result.overByGrams = Math.max(0, result.totalWeightGrams - list.limitGrams);
  }
  return result;
}

export function makeExampleList(language = 'zh-Hant') {
  return { rows: [
    { id: 'example-clothes', nameRaw: language === 'en' ? 'Clothes' : '衣物', quantityRaw: '2', unitWeightGramsRaw: '300', packed: false },
    { id: 'example-charger', nameRaw: language === 'en' ? 'Charger' : '充電器', quantityRaw: '1', unitWeightGramsRaw: '200', packed: false }
  ], limitGramsRaw: '' };
}

function mapListToBackup(list) {
  return { schemaVersion: 1, tool: 'glossquote-packing-list', limitGrams: list.limitGrams,
    rows: list.rows.map(row => ({ id: row.id, name: row.name, quantity: row.quantity,
      unitWeightGrams: row.unitWeightGrams, packed: row.packed })) };
}

export function exportBackup(draft) {
  const validated = validateDraft(draft);
  if (!validated.ok) return validated;
  return { ok: true, json: JSON.stringify(mapListToBackup(validated.list), null, 2) };
}

export function parseBackupBytes(bytes) {
  const fail = code => ({ ok: false, code });
  if (!(bytes instanceof Uint8Array)) return fail('INVALID_BYTES');
  if (bytes.byteLength > MAX_BACKUP_BYTES) return fail('FILE_TOO_LARGE');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return fail('INVALID_UTF8'); }
  let backup;
  try { backup = JSON.parse(text); }
  catch { return fail('INVALID_JSON'); }
  const shape = recordShape(backup, BACKUP_KEYS);
  if (shape) return fail(shape);
  if (backup.schemaVersion !== 1 || backup.tool !== 'glossquote-packing-list') return fail('INVALID_SCHEMA');
  if (backup.limitGrams !== null && (!Number.isSafeInteger(backup.limitGrams) ||
      backup.limitGrams < 1 || backup.limitGrams > 999999999)) return fail('INVALID_LIMIT');
  if (!denseRows(backup.rows)) return fail('ROW_LIMIT');
  const rows = [];
  const ids = new Set();
  for (const row of backup.rows) {
    const rowShape = recordShape(row, BACKUP_ROW_KEYS, 'INVALID_ROW');
    if (rowShape) return fail(rowShape);
    if (typeof row.id !== 'string' || !ID.test(row.id)) return fail('INVALID_ROW');
    if (ids.has(row.id)) return fail('DUPLICATE_ID');
    ids.add(row.id);
    if (typeof row.name !== 'string') return fail('INVALID_ROW');
    const invalidName = nameError(row.name);
    if (invalidName) return fail(invalidName);
    if (!Number.isSafeInteger(row.quantity)) return fail('INTEGER_REQUIRED');
    if (row.quantity < 1 || row.quantity > 99) return fail('OUT_OF_RANGE');
    if (row.unitWeightGrams !== null) {
      if (!Number.isSafeInteger(row.unitWeightGrams)) return fail('INTEGER_REQUIRED');
      if (row.unitWeightGrams < 0 || row.unitWeightGrams > 99999) return fail('OUT_OF_RANGE');
    }
    if (typeof row.packed !== 'boolean') return fail('INVALID_ROW');
    rows.push({ id: row.id, nameRaw: row.name, quantityRaw: String(row.quantity),
      unitWeightGramsRaw: row.unitWeightGrams === null ? '' : String(row.unitWeightGrams), packed: row.packed });
  }
  const listDraft = { rows, limitGramsRaw: backup.limitGrams === null ? '' : String(backup.limitGrams) };
  const validated = validateDraft(listDraft);
  if (!validated.ok) return fail(validated.code ?? validated.fieldErrors[0].code);
  return { ok: true, listDraft, preview: validated.summary };
}
