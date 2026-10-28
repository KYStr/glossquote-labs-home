import test from 'node:test';
import assert from 'node:assert/strict';
import { createBox, updateBox, nextBoxId, addItem, updateItem, deleteItem, moveItem, searchItems, deleteBox } from '../public/js/core/boxes.mjs';
import { emptyProject, validateProject, parseProject, serializeProject, LIMITS } from '../public/js/core/schema.mjs';
import { createSession, addSessionItem, commitProject, stageImport, cancelImport, confirmImport, requestBoxDeletion, cancelBoxDeletion, confirmBoxDeletion } from '../public/js/core/session.mjs';
import { renderTextReport } from '../public/js/core/report.mjs';

const box = (id, room = '廚房') => ({ id, room, priority: false, notes: '', items: [] });
const item = (id = 'I000001', name = '鍋子', quantity = 1) => ({ id, name, quantity, notes: '' });
function fixture() { return { schemaVersion: 1, boxes: [{ ...box('BX001'), items: [item()] }, { ...box('BX002', '書房'), items: [item('I000002', '充電器', 2)] }] }; }
function reject(code, run) { assert.throws(run, error => error.code === code); }
function freeze(value) { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child); return value; }

test('A01 exact search identifies box, destination and quantity', () => {
  assert.deepEqual(searchItems(fixture(), '充電器'), [{ boxId: 'BX002', room: '書房', priority: false, boxNotes: '', itemId: 'I000002', name: '充電器', quantity: 2, notes: '' }]);
});
test('A02 duplicate box rename rejects without changing either box', () => {
  const state = freeze(fixture());
  reject('DUPLICATE_BOX_ID', () => updateBox(state, 'BX002', { id: 'BX001', room: '書房', priority: true, notes: '' }));
  assert.deepEqual(state, fixture());
});
test('A03 automatic box numbering uses first gap; beyond 999 never wraps', () => {
  const state = { schemaVersion: 1, boxes: [box('BX001'), box('BX003')] };
  assert.equal(createBox(state, { id: '', room: '房間', priority: false, notes: '' }).boxes[2].id, 'BX002');
  assert.equal(nextBoxId({ boxes: Array.from({ length: 999 }, (_, i) => ({ id: 'BX' + String(i + 1).padStart(3, '0') })) }), 'BX1000');
});
test('A04 move is one transaction preserving the same ID and global count', () => {
  const state = freeze(fixture());
  const moved = moveItem(state, 'BX001', 'I000001', 'BX002');
  assert.deepEqual(moved.boxes[0].items, []);
  assert.deepEqual(moved.boxes[1].items.map(row => row.id), ['I000002', 'I000001']);
  assert.equal(moved.boxes.flatMap(row => row.items).length, 2);
  reject('BOX_NOT_FOUND', () => moveItem(state, 'BX001', 'I000001', 'missing'));
  assert.deepEqual(state, fixture());
});
test('A05 cancel nonempty box deletion leaves two items exact; confirm deletes', () => {
  const project = { schemaVersion: 1, boxes: [{ ...box('BX001'), items: [item(), item('I000002', '充電器', 2)] }] };
  const session = createSession(project);
  reject('CONFIRM_DELETE_REQUIRED', () => deleteBox(project, 'BX001'));
  const pending = requestBoxDeletion(session, 'BX001');
  assert.deepEqual(pending.pendingDelete, { id: 'BX001', count: 2 });
  assert.deepEqual(cancelBoxDeletion(pending).project, project);
  assert.deepEqual(confirmBoxDeletion(pending).project, emptyProject());
});
test('A06 strict quantities reject zero, exponent, fraction and nondecimal forms', () => {
  const project = { schemaVersion: 1, boxes: [box('BX001')] };
  for (const quantity of ['0', '1e2', '2.5', ' 2', '+2', '-1', '100001', '', Infinity, NaN]) reject('INVALID_QUANTITY', () => addItem(project, 'BX001', { name: '物品', quantity, notes: '' }));
  assert.equal(addItem(project, 'BX001', { name: '物品', quantity: '100000', notes: '' }).boxes[0].items[0].quantity, 100000);
});
test('A07 IDs are case sensitive while search is case insensitive and NFC normalized', () => {
  const project = validateProject({ schemaVersion: 1, boxes: [{ ...box('a', 'Office'), items: [item('I000001', 'Café')] }, box('A')] });
  assert.deepEqual(project.boxes.map(value => value.id), ['a', 'A']);
  assert.equal(searchItems(project, ' CAFE\u0301 ')[0].boxId, 'a');
  assert.equal(searchItems(project, 'OFFICE').length, 1);
});
test('A08 empty search returns all items in box then item order; no mutation', () => {
  const state = freeze(fixture());
  assert.deepEqual(searchItems(state, '').map(row => row.itemId), ['I000001', 'I000002']);
  assert.deepEqual(searchItems(state, 'missing'), []);
  assert.deepEqual(state, fixture());
});
test('A09 unknown fields, dangerous keys and duplicate IDs reject the whole import', () => {
  reject('INVALID_SCHEMA', () => validateProject({ ...fixture(), extra: true }));
  const state = fixture(); state.boxes[1].items[0].id = 'I000001';
  reject('DUPLICATE_ITEM_ID', () => validateProject(state));
  reject('DANGEROUS_KEY', () => parseProject('{"schemaVersion":1,"boxes":[],"__proto__":{}}'));
  const accessor = { schemaVersion: 1, get boxes() { throw new Error('must not run'); } };
  reject('INVALID_SCHEMA', () => validateProject(accessor));
  reject('INVALID_JSON', () => parseProject('{bad'));
});
test('A10 preview and cancel preserve existing project exact, confirm replaces', () => {
  const original = freeze(createSession(fixture()));
  const replacement = { schemaVersion: 1, boxes: [box('RESTORED')] };
  const preview = stageImport(original, replacement);
  assert.deepEqual(preview.project, fixture());
  assert.deepEqual(cancelImport(preview), original);
  assert.deepEqual(confirmImport(preview).project, replacement);
});
test('A11 100 boxes allowed, 101 rejected; total 1000 items enforced across boxes', () => {
  const state = { schemaVersion: 1, boxes: Array.from({ length: 100 }, (_, i) => box('B' + i)) };
  assert.equal(validateProject(state).boxes.length, 100);
  reject('BOX_LIMIT', () => validateProject({ schemaVersion: 1, boxes: [...state.boxes, box('OVER')] }));
  const many = { schemaVersion: 1, boxes: [{ ...box('BX001'), items: Array.from({ length: 1000 }, (_, i) => item('I' + String(i + 1).padStart(6, '0'))) }] };
  assert.equal(validateProject(many).boxes[0].items.length, 1000);
  reject('ITEM_LIMIT', () => addItem(many, 'BX001', { name: 'over', quantity: 1, notes: '' }));
});
test('A12 hostile item name remains literal text in core and text reports (DOM is separate)', () => {
  const state = fixture(); state.boxes[0].items[0].name = '<script>alert(1)</script>';
  assert.equal(searchItems(state, '<script>')[0].name, '<script>alert(1)</script>');
  assert.ok(renderTextReport(state, 'boxes', 'en').includes('  <script>alert(1)</script> | Quantity: 1'));
});
test('unicode, normalization, required and length boundaries reject invalid values', () => {
  for (const id of ['a\0', '\ud800', '\udc00', 'a\n', 'a\u0085']) reject('INVALID_TEXT', () => validateProject({ schemaVersion: 1, boxes: [box(id)] }));
  reject('REQUIRED', () => validateProject({ schemaVersion: 1, boxes: [box('  ')] }));
  assert.equal(validateProject({ schemaVersion: 1, boxes: [box('😀'.repeat(40))] }).boxes[0].id.length, 80);
  reject('TEXT_TOO_LONG', () => validateProject({ schemaVersion: 1, boxes: [box('😀'.repeat(41))] }));
  const normalized = validateProject({ schemaVersion: 1, boxes: [box(' e\u0301 ')] });
  assert.equal(normalized.boxes[0].id, 'é');
  reject('DUPLICATE_BOX_ID', () => validateProject({ schemaVersion: 1, boxes: [box('é'), box('e\u0301')] }));
  reject('INVALID_TEXT', () => createBox(emptyProject(), { id: '\n', room: 'Office', priority: false, notes: '' }));
});
test('all name, room and notes limits are inclusive and never truncate data', () => {
  const state = { schemaVersion: 1, boxes: [{ ...box('A', '房'.repeat(80)), notes: '箱'.repeat(500), items: [{ ...item('I000001', '物'.repeat(120)), notes: '備'.repeat(500) }] }] };
  assert.equal(validateProject(state).boxes[0].items[0].name.length, 120);
  for (const change of [value => { value.boxes[0].room += '房'; }, value => { value.boxes[0].notes += '箱'; }, value => { value.boxes[0].items[0].name += '物'; }, value => { value.boxes[0].items[0].notes += '備'; }]) {
    const invalid = structuredClone(state); change(invalid); reject('TEXT_TOO_LONG', () => validateProject(invalid));
  }
});
test('IDs survive restore and session counters do not reuse a deleted highest ID', () => {
  let session = createSession(fixture());
  session = commitProject(session, deleteItem(session.project, 'BX002', 'I000002'));
  session = addSessionItem(session, 'BX002', { name: '新物品', quantity: '1', notes: '' });
  assert.equal(session.project.boxes[1].items[0].id, 'I000003');
  const restored = fixture(); restored.boxes[1].items[0].id = 'I000999';
  const resumed = addSessionItem(createSession(restored), 'BX001', { name: '新物品', quantity: '1', notes: '' });
  assert.equal(resumed.project.boxes[0].items[1].id, 'I001000');
});
test('updates and deletes operate on new values and preserve other records', () => {
  const state = freeze(fixture());
  const changed = updateItem(state, 'BX001', 'I000001', { name: '鐵鍋', quantity: '3', notes: '易碎' });
  assert.deepEqual(changed.boxes[0].items[0], { id: 'I000001', name: '鐵鍋', quantity: 3, notes: '易碎' });
  assert.deepEqual(deleteItem(changed, 'BX001', 'I000001').boxes[0].items, []);
  assert.deepEqual(state, fixture());
});
test('room grouping preserves first-seen order, priority and box-only scope', () => {
  const state = { schemaVersion: 1, boxes: [box('A', 'Study'), { ...box('B', 'Kitchen'), priority: true }, box('C', 'Study')] };
  assert.equal(renderTextReport(state, 'rooms', 'en'), 'Room moving list\n\nDestination room: Study\n  Box: A | Standard unpacking\n  Box: C | Standard unpacking\n\nDestination room: Kitchen\n  Box: B | Open first\n');
});
test('box detail report exact bilingual output includes quantities and notes', () => {
  const state = { schemaVersion: 1, boxes: [{ ...box('BX001', '廚房'), priority: true, notes: '先搬', items: [{ ...item(), notes: '易碎' }] }] };
  assert.equal(renderTextReport(state, 'boxes', 'zh-Hant'), '逐箱內容明細\n\n箱號: BX001\n目的房間: 廚房\n優先開箱\n備註: 先搬\n  鍋子 | 數量: 1\n    備註: 易碎\n');
});
test('JSON output has exact schema, two spaces and final LF; strict import size and schema', () => {
  assert.equal(serializeProject(emptyProject()), '{\n  "schemaVersion": 1,\n  "boxes": []\n}\n');
  assert.deepEqual(parseProject(serializeProject(fixture())), fixture());
  reject('IMPORT_TOO_LARGE', () => parseProject('a'.repeat(LIMITS.importBytes + 1)));
  reject('IMPORT_TOO_LARGE', () => parseProject('中'.repeat(Math.ceil(LIMITS.importBytes / 3))));
  reject('INVALID_SCHEMA', () => parseProject('{"schemaVersion":2,"boxes":[]}'));
  reject('INVALID_QUANTITY', () => validateProject({ schemaVersion: 1, boxes: [{ ...box('A'), items: [item('I000001', 'x', '2')] }] }));
  for (const id of ['I0', 'I000000', 'I0000001', 'I9007199254740992']) reject('INVALID_ITEM_ID', () => validateProject({ schemaVersion: 1, boxes: [{ ...box('A'), items: [item(id)] }] }));
});
function maximumProject(supplementary = false) {
  const chars = supplementary ? { box: '📦', room: '🏠', notes: '📝', name: '🔌' } : { box: '箱', room: '房', notes: '備', name: '物' };
  return { schemaVersion: 1, boxes: Array.from({ length: 100 }, (_, b) => ({
    id: chars.box.repeat(38) + String(b).padStart(2, '0'), room: chars.room.repeat(80), priority: false, notes: chars.notes.repeat(500),
    items: Array.from({ length: 10 }, (_, i) => ({ id: 'I' + String(b * 10 + i + 1).padStart(6, '0'), name: chars.name.repeat(120), quantity: 100000, notes: chars.notes.repeat(500) }))
  })) };
}
test('A13 D01 maximum legal Chinese inventory backup restores exactly (2,179,142 bytes)', () => {
  const expected = maximumProject(); const backup = serializeProject(expected);
  assert.equal(Buffer.byteLength(backup), 2_179_142); assert.deepEqual(parseProject(backup), expected);
});
test('A14 D01 maximum supplementary Unicode inventory and escaped JSON restore exactly', () => {
  const expected = maximumProject(true); const backup = serializeProject(expected);
  assert.equal(Buffer.byteLength(backup), 2_860_942); assert.deepEqual(parseProject(backup), expected);
  const escaped = backup.replace(/[\u0080-\uffff]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
  assert.equal(Buffer.byteLength(escaped), 8_315_342); assert.deepEqual(parseProject(escaped), expected);
});
test('A15 D01 exact 8 MiB valid JSON is allowed; one byte over rejects before parsing', () => {
  assert.equal(LIMITS.importBytes, 8_388_608);
  const base = '{"schemaVersion":1,"boxes":[]}';
  const boundary = base + ' '.repeat(8_388_608 - base.length);
  assert.equal(Buffer.byteLength(boundary), 8_388_608); assert.deepEqual(parseProject(boundary), { schemaVersion: 1, boxes: [] });
  reject('IMPORT_TOO_LARGE', () => parseProject(boundary + ' '));
});
