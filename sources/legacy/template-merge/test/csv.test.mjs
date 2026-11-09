import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../public/js/core/csv.mjs';
const bytes = text => new TextEncoder().encode(text);
const csv = text => parseCsv(bytes(text));
const code = expected => error => error.code === expected && error.message === expected;

test('A01: Chinese headers, leading-zero identifiers, CRLF', () => {
  assert.deepEqual(csv('姓名,ID\r\n小王,001'), { headers: ['姓名', 'ID'], rows: [['小王', '001']] });
});
test('A02–A03: quoted comma, escaped quote and literal multiline', () => {
  assert.deepEqual(csv('name,note\nA,"hi, there"').rows, [['A', 'hi, there']]);
  assert.deepEqual(csv('n,m\r\nA,"x""y\r\nz"').rows, [['A', 'x"y\r\nz']]);
});
test('A04: malformed quotes fail without partial data or content leakage', () => {
  for (const text of ['n,m\nA,"unfinished', 'n\npre"quoted', 'n\n"closed" x', 'n\n"a""']) {
    assert.throws(() => csv(text), code('CSV_SYNTAX'));
  }
  assert.throws(() => csv('n\n"CANARY_PRIVATE"x'), error => !JSON.stringify(error).includes('CANARY_PRIVATE') && code('CSV_SYNTAX')(error));
});
test('A05: both narrow and wide rows fail with safe record positions', () => {
  assert.throws(() => csv('n,m\nA'), error => error.code === 'ROW_WIDTH' && error.details.record === 2 && error.details.actual === 1);
  assert.throws(() => csv('n\nA,B'), code('ROW_WIDTH'));
});
test('A06: exact byte, row and column boundaries', () => {
  const exact = bytes(`n\n${'a'.repeat(1_048_572)}é`);
  assert.equal(exact.byteLength, 1_048_576);
  assert.equal(parseCsv(exact).rows.length, 1);
  assert.throws(() => parseCsv(new Uint8Array(1_048_577)), code('FILE_TOO_LARGE'));
  assert.equal(csv(`n\n${Array(1000).fill('a').join('\n')}`).rows.length, 1000);
  assert.throws(() => csv(`n\n${Array(1001).fill('a').join('\n')}`), code('ROW_LIMIT'));
  const headers = Array.from({ length: 30 }, (_, i) => `c${i}`).join(',');
  assert.equal(csv(`${headers}\n${Array(30).fill('x').join(',')}`).headers.length, 30);
  assert.throws(() => csv(`${headers},extra`), code('COLUMN_LIMIT'));
  assert.throws(() => csv(`n\n${Array(31).fill('a').join(',')}`), code('COLUMN_LIMIT'));
});
test('A07: empty and duplicate headers reject; whitespace and case remain exact', () => {
  for (const text of ['', '\uFEFF', 'name,name', ',ID', '"",ID']) assert.throws(() => csv(text), code('HEADER_INVALID'));
  assert.deepEqual(csv('Name, Name ,name, \n1, 2 ,3,\t').headers, ['Name', ' Name ', 'name', ' ']);
  assert.deepEqual(csv('Name, Name ,name, \n1, 2 ,3,\t').rows, [['1', ' 2 ', '3', '\t']]);
});
test('UTF-8 is fatal; byte cap precedes decode; exactly one leading BOM is stripped', () => {
  assert.throws(() => parseCsv(Uint8Array.of(0xff)), code('INVALID_UTF8'));
  assert.throws(() => parseCsv(Uint8Array.of(0xc0, 0xaf)), code('INVALID_UTF8'));
  assert.deepEqual(csv('\uFEFFn\nx').headers, ['n']);
  assert.deepEqual(csv('\uFEFF\uFEFFn\nx').headers, ['\uFEFFn']);
  assert.throws(() => parseCsv(new Uint8Array(20), { maxBytes: 10 }), code('FILE_TOO_LARGE'));
});
test('consistent LF / CR / CRLF; quoted separators are not dialect separators', () => {
  for (const newline of ['\n', '\r', '\r\n']) {
    assert.deepEqual(csv(`n${newline}x${newline}`), { headers: ['n'], rows: [['x']] });
  }
  for (const text of ['n\r\nx\ny', 'n\nx\ry', 'n\rx\r\ny']) assert.throws(() => csv(text), code('CSV_SYNTAX'));
  assert.deepEqual(csv('n,m\nA,"x\r\ny\rz"').rows, [['A', 'x\r\ny\rz']]);
});
test('header-only and final separator do not invent records; explicit empty records remain', () => {
  assert.deepEqual(csv('n\n'), { headers: ['n'], rows: [] });
  assert.deepEqual(csv('n\n\n'), { headers: ['n'], rows: [['']] });
  assert.deepEqual(csv('a,b\nx,'), { headers: ['a', 'b'], rows: [['x', '']] });
  assert.deepEqual(csv('n\n""'), { headers: ['n'], rows: [['']] });
});
test('CSV roundtrip invariant across 120 deterministic synthetic datasets', () => {
  const values = ['', 'plain', ' a ', 'é王', 'comma,here', 'a"b', 'line\r\nnext', '{{X}}', '$&'];
  const quote = value => `"${value.replaceAll('"', '""')}"`;
  for (let i = 0; i < 120; i++) {
    const rows = Array.from({ length: 1 + i % 8 }, (_, r) => Array.from({ length: 3 }, (_, c) => values[(i + r * 3 + c) % values.length]));
    const text = [['a', 'b', 'c'], ...rows].map(row => row.map(quote).join(',')).join('\r\n');
    assert.deepEqual(csv(text), { headers: ['a', 'b', 'c'], rows });
  }
});
