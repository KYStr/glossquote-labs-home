import test from 'node:test';
import assert from 'node:assert/strict';
import { makeExampleList, parseBackupBytes, exportBackup, createRowDraft } from '../public/js/core/packing-list.mjs';
import { createPackingState, createDownloadManager } from '../public/js/state.mjs';
const bytes = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
const backup = () => JSON.parse(exportBackup(makeExampleList()).json);
const file = value => ({ size: bytes(value).length, arrayBuffer: async () => bytes(value).buffer });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('A29 preview validates without replacing current draft', async () => {
  const state = createPackingState(); const id = state.add(); state.edit(id, 'nameRaw', 'old synthetic item');
  const before = structuredClone(state.view().draft); assert.equal(await state.readFile(file(backup())), true);
  assert.deepEqual(state.view().draft, before); assert.equal(state.view().candidate.preview.rowCount, 2);
  assert.equal(state.view().candidate.preview.pieceCount, 3); assert.equal(state.view().candidate.preview.totalWeightGrams, 800);
});
test('A30 unknown key precedes bad version; failed parse preserves old list', async () => {
  const value = { ...backup(), schemaVersion: 2, other: true }; assert.deepEqual(parseBackupBytes(bytes(value)), { ok: false, code: 'UNKNOWN_FIELD' });
  const state = createPackingState(); state.add(); const before = structuredClone(state.view().draft);
  await state.readFile(file(value)); assert.deepEqual(state.view().draft, before); assert.equal(state.view().candidate, null);
});
test('A31 a missing row field rejects the whole backup', () => { const value = backup(); delete value.rows[1].packed; assert.deepEqual(parseBackupBytes(bytes(value)), { ok: false, code: 'INVALID_ROW' }); });
test('A32 byte cap precedes decoding; exact 131072-byte backup is accepted', () => {
  const text = JSON.stringify(backup()); const byteLength = bytes(text).length;
  const accepted = bytes(text + ' '.repeat(131072 - byteLength)); assert.equal(accepted.length, 131072);
  assert.equal(parseBackupBytes(accepted).ok, true);
  assert.deepEqual(parseBackupBytes(new Uint8Array(131073).fill(255)), { ok: false, code: 'FILE_TOO_LARGE' });
  assert.deepEqual(parseBackupBytes('text'), { ok: false, code: 'INVALID_BYTES' });
});
test('A33 fatal UTF-8 and JSON syntax errors are fixed codes', () => {
  assert.deepEqual(parseBackupBytes(new Uint8Array([0xc3, 0x28])), { ok: false, code: 'INVALID_UTF8' });
  assert.deepEqual(parseBackupBytes(bytes('{')), { ok: false, code: 'INVALID_JSON' });
});
test('A34 every source edit invalidates candidate before confirmation', async () => {
  for (const field of ['nameRaw', 'quantityRaw', 'unitWeightGramsRaw', 'packed', 'limit', 'add', 'remove']) {
    const state = createPackingState(); const id = state.add(); await state.readFile(file(backup()));
    if (field === 'limit') state.limit('999'); else if (field === 'add') state.add(); else if (field === 'remove') state.remove(id);
    else state.edit(id, field, field === 'packed' ? true : '2');
    const latest = structuredClone(state.view().draft); assert.equal(state.view().candidate, null);
    assert.equal(state.confirmImport(), false); assert.deepEqual(state.view().draft, latest);
  }
});
test('A35 cancel preview leaves the original draft intact', async () => { const state = createPackingState(); state.add(); const before = structuredClone(state.view().draft); await state.readFile(file(backup())); state.cancelImport(); assert.deepEqual(state.view().draft, before); assert.equal(state.confirmImport(), false); });
test('A36 stable JSON round-trip preserves known zero/null and contains no metadata', () => {
  const draft = { rows: [{ ...createRowDraft('zero'), unitWeightGramsRaw: '0' }, createRowDraft('unknown')], limitGramsRaw: '000100' };
  const exported = exportBackup(draft); const parsed = parseBackupBytes(bytes(exported.json));
  assert.equal(parsed.ok, true); assert.equal(parsed.listDraft.rows[0].unitWeightGramsRaw, '0'); assert.equal(parsed.listDraft.rows[1].unitWeightGramsRaw, '');
  assert.deepEqual(Object.keys(JSON.parse(exported.json)), ['schemaVersion', 'tool', 'limitGrams', 'rows']);
  assert.equal(exportBackup(parsed.listDraft).json, exported.json);
  assert.match(exported.json, /\n  "schemaVersion"/); assert.equal(/timestamp|date|IP/.test(exported.json), false);
  assert.equal(exportBackup({ rows: [], limitGramsRaw: '' }).ok, true);
});
test('A38 reset cancellation preserves data; confirmation and pagehide clear references', () => {
  const state = createPackingState(); state.add(); state.limit('500'); state.setFilter('unpacked');
  const before = structuredClone(state.view().draft); assert.equal(state.reset(false), false); assert.deepEqual(state.view().draft, before);
  assert.equal(state.reset(true), true); assert.deepEqual(state.view().draft, { rows: [], limitGramsRaw: '' }); assert.equal(state.view().filter, 'all');
  state.add(); state.dispose(); assert.equal(state.view().draft, null); assert.equal(state.view().validation, null); assert.equal(state.view().candidate, null);
});
test('import error priority and exact schema negatives', () => {
  const cases = [ [null, 'INVALID_SCHEMA'], [[], 'INVALID_SCHEMA'], [{ ...backup(), schemaVersion: 2 }, 'INVALID_SCHEMA'],
    [{ ...backup(), tool: 'other' }, 'INVALID_SCHEMA'], [{ ...backup(), limitGrams: 0, rows: [] }, 'INVALID_LIMIT'],
    [{ ...backup(), rows: null }, 'ROW_LIMIT'], [{ ...backup(), rows: Array(101).fill(backup().rows[0]) }, 'ROW_LIMIT'] ];
  for (const [value, code] of cases) assert.deepEqual(parseBackupBytes(bytes(value)), { ok: false, code });
  for (const [key, value, code] of [['id', 'bad id', 'INVALID_ROW'], ['name', 'x'.repeat(81), 'INVALID_NAME'], ['name', '\n', 'CONTROL_CHARACTER'],
    ['quantity', '2', 'INTEGER_REQUIRED'], ['quantity', 2.5, 'INTEGER_REQUIRED'], ['quantity', 0, 'OUT_OF_RANGE'],
    ['unitWeightGrams', '0', 'INTEGER_REQUIRED'], ['unitWeightGrams', 100000, 'OUT_OF_RANGE'], ['packed', 1, 'INVALID_ROW']]) {
    const valueBackup = backup(); valueBackup.rows[0][key] = value; assert.deepEqual(parseBackupBytes(bytes(valueBackup)), { ok: false, code });
  }
  const duplicated = backup(); duplicated.rows[1].id = duplicated.rows[0].id; assert.equal(parseBackupBytes(bytes(duplicated)).code, 'DUPLICATE_ID');
  const extra = backup(); extra.rows[0].extra = true; assert.equal(parseBackupBytes(bytes(extra)).code, 'UNKNOWN_FIELD');
  const proto = JSON.stringify(backup()).replace('"schemaVersion":1', '"__proto__":{},"schemaVersion":1'); assert.equal(parseBackupBytes(bytes(proto)).code, 'UNKNOWN_FIELD');
});
test('PACK-M1-R1 duplicate ID precedes errors in later fields, including the primary reproduction', () => {
  const value = { schemaVersion: 1, tool: 'glossquote-packing-list', limitGrams: null, rows: [
    { id: 'item-1', name: 'Synthetic item', quantity: 1, unitWeightGrams: 0, packed: false },
    { id: 'item-1', name: 'Bad\u0000Name', quantity: 1, unitWeightGrams: 0, packed: false }
  ] };
  assert.deepEqual(parseBackupBytes(bytes(value)), { ok: false, code: 'DUPLICATE_ID' });
  for (const [field, invalid] of [
    ['name', 'Bad\u0000Name'], ['name', 'x'.repeat(81)], ['name', 42],
    ['quantity', 0], ['quantity', 100], ['quantity', '1'], ['quantity', 1.5],
    ['unitWeightGrams', 100000], ['unitWeightGrams', '0'], ['unitWeightGrams', 0.5],
    ['packed', 'false'], ['packed', 1]
  ]) {
    const candidate = structuredClone(value);
    candidate.rows[1] = { ...candidate.rows[0], [field]: invalid };
    assert.deepEqual(parseBackupBytes(bytes(candidate)), { ok: false, code: 'DUPLICATE_ID' }, field);
  }
});
test('PACK-M1-R1 root schema, row shape and row-index ordering still precede ID value checks', () => {
  const duplicate = () => { const value = backup(); value.rows[1].id = value.rows[0].id; value.rows[1].name = 'Bad\u0000Name'; return value; };
  const extraRoot = duplicate(); extraRoot.extra = true;
  assert.deepEqual(parseBackupBytes(bytes(extraRoot)), { ok: false, code: 'UNKNOWN_FIELD' });
  const badVersion = duplicate(); badVersion.schemaVersion = 2;
  assert.deepEqual(parseBackupBytes(bytes(badVersion)), { ok: false, code: 'INVALID_SCHEMA' });
  const extraRow = duplicate(); extraRow.rows[1].extra = true;
  assert.deepEqual(parseBackupBytes(bytes(extraRow)), { ok: false, code: 'UNKNOWN_FIELD' });
  for (const field of ['id', 'name', 'quantity', 'unitWeightGrams', 'packed']) {
    const missing = duplicate(); delete missing.rows[1][field];
    assert.deepEqual(parseBackupBytes(bytes(missing)), { ok: false, code: 'INVALID_ROW' }, field);
  }
  const firstRowInvalid = duplicate(); firstRowInvalid.rows[0].name = 'Bad\u0000Name';
  assert.deepEqual(parseBackupBytes(bytes(firstRowInvalid)), { ok: false, code: 'CONTROL_CHARACTER' });
  const invalidId = duplicate(); invalidId.rows[1].id = 'bad id';
  assert.deepEqual(parseBackupBytes(bytes(invalidId)), { ok: false, code: 'INVALID_ROW' });
});
test('PACK-M1-R1 duplicate plus later error rejects the whole candidate and preserves existing state', async () => {
  const state = createPackingState(); state.loadExample(true, 'en');
  const before = structuredClone(state.view().draft);
  const candidate = backup(); candidate.rows[1].id = candidate.rows[0].id; candidate.rows[1].name = 'Bad\u0000Name';
  assert.equal(await state.readFile(file(candidate)), false);
  assert.equal(state.view().importError, 'DUPLICATE_ID');
  assert.equal(state.view().candidate, null);
  assert.equal(state.confirmImport(), false);
  assert.deepEqual(state.view().draft, before);
});
test('late File API results after edit, cancel, newer file, reset or pagehide are ignored', async () => {
  for (const action of ['edit', 'cancel', 'newer', 'reset', 'dispose']) {
    const pending = deferred(); const state = createPackingState(); const id = state.add();
    const oldRead = state.readFile({ size: 200, arrayBuffer: () => pending.promise });
    assert.equal(state.view().importState, 'reading');
    if (action === 'edit') state.edit(id, 'nameRaw', 'latest');
    if (action === 'cancel') state.cancelImport();
    if (action === 'newer') await state.readFile(file({ ...backup(), rows: [] }));
    if (action === 'reset') state.reset(true);
    if (action === 'dispose') state.dispose();
    pending.resolve(bytes(backup()).buffer); assert.equal(await oldRead, false);
    if (action === 'newer') assert.equal(state.view().candidate.preview.rowCount, 0);
    else assert.equal(state.view().candidate, null);
  }
});
test('oversized file never read; read rejection is generic and preserves draft', async () => {
  const state = createPackingState(); let reads = 0; state.add(); const before = structuredClone(state.view().draft);
  await state.readFile({ size: 131073, arrayBuffer: () => { reads++; } }); assert.equal(reads, 0); assert.equal(state.view().importError, 'FILE_TOO_LARGE');
  await state.readFile({ size: 5, arrayBuffer: async () => { throw new Error('SYNTHETIC_PRIVATE_CONTENT'); } });
  assert.equal(state.view().importError, 'INVALID_BYTES'); assert.deepEqual(state.view().draft, before);
});
test('confirmed import is atomic; IDs skip collisions and 100-row add cap works', async () => {
  const state = createPackingState(); const value = backup(); value.rows[0].id = 'row-1'; value.rows[1].id = 'row-2';
  await state.readFile(file(value)); assert.equal(state.confirmImport(), true); assert.equal(state.add(), 'row-3');
  while (state.view().draft.rows.length < 100) state.add(); assert.equal(state.add(), null);
  const s = createPackingState(); s.add(); const before = structuredClone(s.view().draft); assert.equal(s.loadExample(false), false); assert.deepEqual(s.view().draft, before);
});
test('filter only changes visibility state, leaving full summary unchanged', () => {
  const state = createPackingState(); state.loadExample(true); state.edit('example-clothes', 'packed', true);
  const before = state.view().validation.summary; state.setFilter('unpacked'); assert.deepEqual(state.view().validation.summary, before);
});
test('object URLs are not revoked synchronously; expire at 60s; pagehide revokes all once (mock only)', () => {
  let sequence = 0; const revoked = [], scheduled = new Map();
  const manager = createDownloadManager({ url: { createObjectURL: () => `blob:${++sequence}`, revokeObjectURL: value => revoked.push(value) },
    schedule: (callback, delay) => { assert.equal(delay, 60000); scheduled.set(sequence, callback); return sequence; }, cancel: id => scheduled.delete(id) });
  assert.equal(manager.create({}), 'blob:1'); assert.deepEqual(revoked, []); assert.equal(manager.count(), 1);
  scheduled.get(1)(); assert.deepEqual(revoked, ['blob:1']); assert.equal(manager.count(), 0);
  manager.create({}); manager.create({}); manager.dispose(); manager.dispose();
  assert.deepEqual(revoked, ['blob:1', 'blob:2', 'blob:3']); assert.equal(scheduled.size, 0);
});
