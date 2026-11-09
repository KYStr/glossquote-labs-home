import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvUtf8 } from '../public/js/core/csv.mjs';

const utf8 = (text) => new TextEncoder().encode(text);
const parse = (text, limits) => parseCsvUtf8(utf8(text), limits);
const rejects = (text, code) => assert.throws(() => parse(text), (error) => error.code === code);

test('A10 quoted comma, quote, CRLF/CR/LF normalize and physical source lines', () => {
  const result = parse('name,phone,email,org,note\r\n"王, 小明","001234","a@example.test","Org","第一行\r\n第二行"\r\n"A""B",02,,,"x\ry\nz"');
  assert.deepEqual(result.headers, ['name', 'phone', 'email', 'org', 'note']);
  assert.deepEqual(result.rows, [
    { line: 2, cells: ['王, 小明', '001234', 'a@example.test', 'Org', '第一行\n第二行'] },
    { line: 4, cells: ['A"B', '02', '', '', 'x\ny\nz'] }
  ]);
});
test('A07 duplicate and blank headers retain individual column indexes', () => {
  assert.deepEqual(parse('same,same,\nA,001,x').headers, ['same', 'same', '']);
});
for (const [text, code] of [
  ['h\n"unclosed', 'CSV_UNCLOSED_QUOTE'], ['h\n"x"z', 'CSV_AFTER_QUOTE'],
  ['h\nx"y', 'CSV_QUOTE'], ['a,b\nx', 'CSV_RAGGED'], ['a,b\nx,y,z', 'CSV_RAGGED'],
  ['h\nx\n\ny', 'CSV_BLANK_ROW'], ['a,b\nx,y\n , \nx,y', 'CSV_BLANK_ROW'],
  ['h\rx', 'CSV_LONE_CR'], ['h\nx\r', 'CSV_LONE_CR'], ['', 'CSV_EMPTY'], ['h\n', 'CSV_NO_DATA']
]) test(`A11 reject ${code}: ${JSON.stringify(text)}`, () => rejects(text, code));
test('final terminator is allowed once; a second empty row is rejected', () => {
  assert.deepEqual(parse('h\r\nx\r\n').rows, [{ line: 2, cells: ['x'] }]);
  rejects('h\nx\n\n', 'CSV_BLANK_ROW');
});
test('A12 exact 1 MiB is parsed, one extra byte rejected before decoding', () => {
  const budget = 1048576 - 2;
  const text = 'h\n' + ('a'.repeat(4096) + '\n').repeat(Math.floor(budget / 4097)) + 'a'.repeat(budget % 4097);
  assert.equal(utf8(text).length, 1048576);
  assert.equal(parse(text).rows.length, 256);
  const over = new Uint8Array(1048577).fill(0xff);
  assert.throws(() => parseCsvUtf8(over), { code: 'CSV_BYTE_LIMIT' });
  assert.throws(() => parseCsvUtf8(new Uint8Array([0x68, 10, 0xc3, 0x28])), { code: 'CSV_ENCODING' });
});
test('single initial BOM removed, second BOM and inner BOM remain data', () => {
  assert.deepEqual(parse('\ufeff\ufeffhead\nx\ufeff').headers, ['\ufeffhead']);
  assert.deepEqual(parse('\ufeffh\nx\ufeff').rows[0].cells, ['x\ufeff']);
});
test('A13 1000 rows accepted; 1001 blocks whole file', () => {
  assert.equal(parse('h\n' + Array(1000).fill('x').join('\n')).rows.length, 1000);
  rejects('h\n' + Array(1001).fill('x').join('\n'), 'CSV_ROW_LIMIT');
});
test('30 columns / 4096 Unicode scalars exact, next cell or scalar rejected', () => {
  assert.equal(parse(Array(30).fill('h').join(',') + '\n' + Array(30).fill('x').join(',')).headers.length, 30);
  rejects(Array(31).fill('h').join(',') + '\nx', 'CSV_COLUMN_LIMIT');
  assert.equal([...parse('h\n' + '😀'.repeat(4096)).rows[0].cells[0]].length, 4096);
  rejects('h\n' + '😀'.repeat(4097), 'CSV_CELL_LIMIT');
});
test('formula/HTML/URL-like strings stay literal cells; limits cannot expand', () => {
  assert.deepEqual(parse('h\n=1+1\n<img src=x>\nhttps://example.test/').rows.map((r) => r.cells[0]), ['=1+1', '<img src=x>', 'https://example.test/']);
  assert.throws(() => parse('h\nx', { maxBytes: 1048577 }), { code: 'CSV_LIMIT_CONFIG' });
  assert.throws(() => parseCsvUtf8('h\nx'), { code: 'CSV_BYTES' });
});
