import test from 'node:test';
import assert from 'node:assert/strict';
import { mapContacts, validateMappings, normalizeField, isBasicEmail } from '../public/js/core/map-contacts.mjs';
const mapping = { name: 0, phone: 1, email: 2, organization: 3, note: 4 };
const row = (cells, line = 2) => ({ line, cells });
const one = (cells) => mapContacts([row(cells)], mapping).contacts[0];
const issue = (cells, code, field) => assert.throws(() => one(cells), (e) => e.code === 'CONTACT_ERRORS' && e.issues.some((i) => i.code === code && i.field === field));

test('A07 explicit index mapping; no guesses, reused/out of range/unknown rejected', () => {
  assert.deepEqual(validateMappings(2, { name: 1, phone: 0 }), { name: 1, phone: 0, email: null, organization: null, note: null });
  for (const [m, code] of [[{ name: null }, 'MAPPING_NAME'], [{ name: 0, phone: 0 }, 'MAPPING_REUSED'], [{ name: 2 }, 'MAPPING_INDEX'], [{ name: 0, x: 1 }, 'MAPPING_SCHEMA']]) assert.throws(() => validateMappings(2, m), { code });
  assert.equal(mapContacts([row(['001', 'Person'])], { name: 1, phone: 0 }).contacts[0].phone, '001');
});
test('NFC / trim field rules, note whitespace preserved, phone not rewritten', () => {
  const c = one(['  Cafe\u0301  ', '  001-02 +886  ', ' x@example.test ', ' A\u030a ', ' \r\nNote \rEnd  ']);
  assert.deepEqual(c, { rowIndex: 0, line: 2, name: 'Café', phone: '001-02 +886', email: 'x@example.test', organization: 'Å', note: ' \nNote \nEnd  ' });
});
test('A08 any invalid contact blocks all; errors reveal positions and fixed codes only', () => {
  assert.throws(() => mapContacts([row(['Okay', '001', '', '', '']), row(['SECRET_NAME', '', '', '', 'SECRET_NOTE'], 7)], mapping), (e) => {
    assert.deepEqual(e.issues, [{ row: 7, rowIndex: 1, column: null, field: 'contact', code: 'CONTACT_METHOD' }]);
    assert.equal(JSON.stringify(e).includes('SECRET'), false); return true;
  });
  issue([' ', '1', '', '', ''], 'NAME_REQUIRED', 'name');
});
test('A09 phone 64 scalars valid, 65 and control-only rejected', () => {
  assert.equal([...one(['N', '😀'.repeat(64), '', '', '']).phone].length, 64);
  issue(['N', '1'.repeat(65), '', '', ''], 'FIELD_LENGTH', 'phone');
  issue(['N', '\t', '', '', ''], 'FIELD_CONTROL', 'phone');
});
test('field boundaries for name/organization/note count scalars after NFC', () => {
  assert.equal(one(['😀'.repeat(120), '1', '', '😀'.repeat(120), '😀'.repeat(500)]).name.length, 240);
  for (const [index, field, max] of [[0, 'name', 120], [3, 'organization', 120], [4, 'note', 500]]) {
    const cells = ['N', '1', '', '', '']; cells[index] = '😀'.repeat(max + 1); issue(cells, 'FIELD_LENGTH', field);
  }
});
test('A09/A16 basic email ASCII grammar, exact 254 and rejection variants', () => {
  const boundary = 'a'.repeat(247) + '@x.test';
  assert.equal(boundary.length, 254); assert.equal(isBasicEmail(boundary), true);
  assert.equal(one(['N', '', boundary, '', '']).email, boundary);
  for (const value of [boundary + 'x', 'a@@x.test', 'x@', '@x.test', '.x@a.test', 'x.@a.test', 'x..y@a.test', 'x@localhost', 'x@-a.test', 'x@a-.test', 'x@a..test', 'x@a_te.st', 'x y@a.test', '名@a.test']) assert.equal(isBasicEmail(value), false, value);
  issue(['N', '1', 'x@example.test\r\nTEL:999', '', ''], 'FIELD_CONTROL', 'email');
});
test('A14 exact tuple duplicate ignoring note; no dedupe or delimiter collisions', () => {
  const rows = [row(['N', '001', 'x@a.test', 'O', 'one']), row(['N', '001', 'x@a.test', 'O', 'two'], 3), row(['N', '1', 'x@a.test', 'O', ''], 4), row(['N', '001', 'X@a.test', 'O', ''], 5)];
  const result = mapContacts(rows, mapping);
  assert.equal(result.contacts.length, 4);
  assert.deepEqual(result.duplicateGroups, [[{ rowIndex: 0, line: 2 }, { rowIndex: 1, line: 3 }]]);
  assert.equal(mapContacts([row(['A|B', 'C', '', '', '']), row(['A', 'B|C', '', '', ''], 3)], mapping).duplicateGroups.length, 0);
});
test('A15 name injection, unpaired surrogates, C0/C1 and Unicode line separators rejected before trim', () => {
  issue(['BEGIN:VCARD\r\nTEL:999', '1', '', '', ''], 'FIELD_CONTROL', 'name');
  for (const value of ['\ud800', '\udc00']) assert.equal(normalizeField(value, 'name').code, 'FIELD_UNICODE');
  for (const value of ['\n', '\r', '\t', '\u0000', '\u007f', '\u0085', '\u2028', '\u2029']) assert.equal(normalizeField('N' + value, 'name').code, 'FIELD_CONTROL');
  assert.equal(normalizeField('note\t', 'note').code, 'FIELD_CONTROL');
  assert.equal(normalizeField('x\r\ny\rz', 'note').value, 'x\ny\nz');
});
