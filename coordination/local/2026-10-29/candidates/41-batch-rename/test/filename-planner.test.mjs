import test from 'node:test';
import assert from 'node:assert/strict';
import { planRenames, splitFilename, replaceNonOverlapping, validateOutputName, collisionKey, scalarCount, parseDecimal, LIMITS } from '../public/js/core/filename-planner.mjs';

const sequence = { mode: 'sequence', base: 'file', start: 1, width: 3 };
const literal = { mode: 'replace', find: 'unlikely', replacement: '', prefix: '' };
const item = name => ({ name, size: 0 });
const code = (fn, expected) => assert.throws(fn, error => error.code === expected && error.message === expected);
const invalid = (rule, expected) => {
  const plan = planRenames([item('receipt.PDF')], rule);
  assert.equal(plan.canBuild, false); assert.deepEqual(plan.errors, [{ code: expected }]); assert.deepEqual(plan.rows, []);
};

test('BR10/11: defaults, uppercase extension and minimum width, never truncation', () => {
  assert.deepEqual(planRenames([item('receipt.PDF'), item('plain')], sequence).rows.map(row => row.outputName), ['file-001.PDF', 'file-002']);
  assert.deepEqual(planRenames(['a', 'b', 'c', 'd'].map(item), { ...sequence, start: 999 }).rows.map(row => row.outputName), ['file-999', 'file-1000', 'file-1001', 'file-1002']);
});
test('BR12: strict numeric fields in core and ASCII-only UI decimal parser', () => {
  for (const start of [0, -1, 1.5, NaN, Infinity, 1000000000, '1', '1e3', null]) invalid({ ...sequence, start }, 'START');
  for (const width of [0, 10, 1.5, '3', null]) invalid({ ...sequence, width }, 'WIDTH');
  for (const text of ['', ' ', '+1', '-1', '1.0', '1e3', ' 1', '1 ', '１２', '0x1', '1000000000']) code(() => parseDecimal(text, 1, 999999999), 'START');
  assert.equal(parseDecimal('001', 1, 999999999), 1);
  assert.equal(parseDecimal('999999999', 1, 999999999), 999999999);
  assert.equal(parseDecimal('9', 1, 9, 'WIDTH'), 9);
});
test('BR13/18: dotfile and extension definitions', () => {
  for (const [name, expected] of [['.gitignore', { stem: '.gitignore', extension: '' }], ['.env.local', { stem: '.env', extension: '.local' }], ['report.', { stem: 'report.', extension: '' }], ['receipt', { stem: 'receipt', extension: '' }], ['a.b.CSV', { stem: 'a.b', extension: '.CSV' }]]) assert.deepEqual(splitFilename(name), expected);
  assert.deepEqual(planRenames(['.gitignore', '.env.local', 'report.', 'a.b.CSV'].map(item), sequence).rows.map(row => row.outputName), ['file-001', 'file-002.local', 'file-003', 'file-004.CSV']);
});
test('BR14/15/17: literal, non-overlapping, case-sensitive replacement; prefix on stem', () => {
  assert.equal(replaceNonOverlapping('aaaa', 'aa', 'x'), 'xx');
  assert.equal(replaceNonOverlapping('aaaaa', 'aa', 'x'), 'xxa');
  assert.equal(replaceNonOverlapping('a-b-c', '-', ''), 'abc');
  assert.equal(replaceNonOverlapping('Aa.a*a', 'a', '$&'), 'A$&.$&*$&');
  assert.equal(replaceNonOverlapping('a.*b.*', '.*', 'x'), 'axbx');
  const plan = planRenames([item('receipt.PDF')], { mode: 'replace', find: 'xyz', replacement: 'z', prefix: 'pre-' });
  assert.equal(plan.rows[0].outputName, 'pre-receipt.PDF'); assert.equal(plan.canBuild, true);
  assert.equal(planRenames([item('a-b-c')], { mode: 'replace', find: '-', replacement: '' }).rows[0].outputName, 'abc');
});
test('BR16/45: rule code-point limits and surrogate validation before encoding', () => {
  invalid({ ...sequence, base: '' }, 'BASE'); invalid({ ...sequence, base: 'x'.repeat(81) }, 'BASE');
  invalid({ ...literal, find: '' }, 'FIND'); invalid({ ...literal, find: 'x'.repeat(81) }, 'FIND');
  invalid({ ...literal, replacement: 'x'.repeat(81) }, 'REPLACEMENT'); invalid({ ...literal, prefix: 'x'.repeat(41) }, 'PREFIX');
  for (const base of ['a', 'a'.repeat(80)]) assert.equal(planRenames([item('x')], { ...sequence, base }).canBuild, true);
  assert.equal(scalarCount('😀'.repeat(80), 160), 80);
  // Valid scalar rule may subsequently fail the 180-byte output limit.
  invalid({ ...sequence, base: '😀'.repeat(81) }, 'BASE');
  assert.equal(planRenames([item('x')], { ...sequence, base: '😀'.repeat(80) }).errors[0].code, 'NAME_LENGTH');
  assert.equal(planRenames([item('x')], { ...literal, find: 'x'.repeat(80), replacement: 'y'.repeat(80), prefix: 'p'.repeat(40) }).canBuild, true);
  for (const lone of ['\ud800', '\udfff']) {
    invalid({ ...sequence, base: lone }, 'UNICODE'); invalid({ ...literal, find: lone }, 'UNICODE');
    invalid({ ...literal, replacement: lone }, 'UNICODE'); invalid({ ...literal, prefix: lone }, 'UNICODE');
  }
});
test('BR19/20/21: every disallowed character, trailing dot/space and reserved device variants', () => {
  for (const char of '/\\<>:"|?*') code(() => validateOutputName(`a${char}b`), 'NAME_UNSAFE');
  for (let i = 0; i <= 31; i++) code(() => validateOutputName(`a${String.fromCharCode(i)}b`), 'NAME_UNSAFE');
  code(() => validateOutputName('a\x7fb'), 'NAME_UNSAFE');
  for (const name of ['', '.', '..']) code(() => validateOutputName(name), 'NAME_EMPTY');
  for (const name of ['name.', 'name ']) code(() => validateOutputName(name), 'NAME_TRAILING');
  for (const name of ['CON', 'con.txt', 'PRN.log', 'AUX', 'NUL.a.b', 'COM1', 'LPT9.pdf', 'COM¹.txt', 'LPT³', 'CoM².foo', 'con .txt']) code(() => validateOutputName(name), 'NAME_DEVICE');
  for (const name of ['my receipt.pdf', 'COM0.txt', 'LPT10.pdf', 'COM⁴.txt', 'CONSOLE', '.gitignore']) assert.equal(validateOutputName(name).normalizedName, name);
});
test('BR22/23/24: mojibake preserved, Unicode rejected before NFC and byte-length limits', () => {
  for (const name of ['cafÃ©.txt', '\ufffd.txt', '😀.txt']) assert.equal(validateOutputName(name).normalizedName, name);
  for (const lone of ['\ud800', '\udfff', 'x\ud800x']) code(() => validateOutputName(lone), 'UNICODE');
  assert.deepEqual(validateOutputName('a'.repeat(180)), { normalizedName: 'a'.repeat(180), utf8Length: 180 });
  code(() => validateOutputName('a'.repeat(181)), 'NAME_LENGTH');
  assert.equal(validateOutputName('界'.repeat(60)).utf8Length, 180);
  code(() => validateOutputName('界'.repeat(60) + 'a'), 'NAME_LENGTH');
  assert.deepEqual(validateOutputName('e\u0301.txt'), { normalizedName: 'é.txt', utf8Length: 6 });
});
test('BR25/26/27/28: NFC, case and uppercase-expansion collisions fail the whole batch', () => {
  for (const names of [['e\u0301.txt', 'é.txt'], ['Receipt.TXT', 'receipt.txt'], ['ß.txt', 'ss.TXT'], ['safe', 'safe']]) {
    const plan = planRenames(names.map(item), literal);
    assert.equal(plan.canBuild, false); assert.deepEqual(plan.errors, [{ code: 'COLLISION', index: 0 }, { code: 'COLLISION', index: 1 }]);
    assert.deepEqual(plan.rows.map(row => row.errors), [['COLLISION'], ['COLLISION']]);
  }
  assert.equal(collisionKey('ß.txt'), 'SS.TXT');
  const plan = planRenames([item('a'), item('b')], { mode: 'replace', find: 'b', replacement: 'a' });
  assert.equal(plan.canBuild, false);
});
test('BR44/46/47/49: bounded sources, exact discriminated schema, last sequence and path-like source', () => {
  assert.equal(planRenames([item('x'.repeat(1024))], sequence).canBuild, true);
  assert.deepEqual(planRenames([item('x'.repeat(1025))], sequence).errors, [{ code: 'SOURCE_NAME', index: 0 }]);
  assert.equal(planRenames([item('\ud800')], sequence).errors[0].code, 'UNICODE');
  for (const rule of [{ ...sequence, find: 'a' }, { ...literal, start: 1 }, { ...sequence, unexpected: true }, { mode: 'replace', replacement: '' }, { mode: 'other' }, null, [], { mode: 'sequence', base: 'a', start: 1 }, { ...literal, [Symbol('x')]: 1 }]) invalid(rule, 'RULE_SCHEMA');
  const names = Array.from({ length: 100 }, (_, index) => item(`source${index}`));
  const valid = planRenames(names, { ...sequence, start: 999999900 });
  assert.equal(valid.canBuild, true); assert.equal(valid.rows[99].outputName, 'file-999999999');
  const overflow = planRenames(names, { ...sequence, start: 999999901 });
  assert.deepEqual(overflow, { rows: [], errors: [{ code: 'SEQUENCE_END' }], canBuild: false });
  assert.equal(planRenames([item('../receipt.pdf')], sequence).rows[0].outputName, 'file-001.pdf');
  const path = planRenames([item('../receipt.pdf')], literal);
  assert.equal(path.canBuild, false); assert.equal(path.rows[0].outputName, '../receipt.pdf'); assert.equal(path.errors[0].code, 'NAME_UNSAFE');
});
test('BR02–06: exact count/file/aggregate caps; invalid sizes and empty list fail closed', () => {
  assert.equal(planRenames([item('zero')], sequence).canBuild, true);
  assert.equal(planRenames([{ name: 'x', size: LIMITS.fileBytes }], sequence).canBuild, true);
  assert.equal(planRenames([{ name: 'x', size: LIMITS.fileBytes + 1 }], sequence).errors[0].code, 'FILE_LIMIT');
  const hundred = Array.from({ length: 100 }, (_, i) => item(`x${i}`));
  assert.equal(planRenames(hundred, sequence).canBuild, true);
  assert.equal(planRenames([...hundred, item('extra')], sequence).errors[0].code, 'COUNT');
  const four = Array.from({ length: 4 }, (_, i) => ({ name: `x${i}`, size: LIMITS.fileBytes }));
  assert.equal(planRenames(four, sequence).canBuild, true);
  assert.equal(planRenames([...four, { name: 'extra', size: 1 }], sequence).errors[0].code, 'TOTAL_LIMIT');
  for (const size of [-1, 0.1, NaN, Infinity, '1']) assert.equal(planRenames([{ name: 'x', size }], sequence).errors[0].code, 'SIZE');
  assert.equal(planRenames([], sequence).canBuild, false);
  assert.equal(planRenames([item('')], sequence).errors[0].code, 'SOURCE_NAME');
});
test('planner inputs are not mutated and no-op preserves valid names (NFC policy excepted)', () => {
  const items = Object.freeze([Object.freeze({ name: 'Receipt.PDF', size: 123 })]);
  const rule = Object.freeze({ ...literal });
  const result = planRenames(items, rule);
  assert.equal(result.rows[0].outputName, 'Receipt.PDF'); assert.equal(result.canBuild, true);
  assert.deepEqual(items, [{ name: 'Receipt.PDF', size: 123 }]); assert.deepEqual(rule, literal);
});
