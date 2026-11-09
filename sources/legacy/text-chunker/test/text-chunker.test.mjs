import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLimit, validateSource, splitText } from '../public/js/core/text-chunker.mjs';
import { VALID_CASES, MARKUP_SOURCE } from './fixtures.mjs';

const split = (source, limit = 2, mode = 'strict') => splitText({ source, limit, mode });
const error = (code, count = null) => ({ ok: false, code, chunks: [], sourceCodePointCount: count });
function invariant(result, source, limit) {
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result), ['ok', 'chunks', 'sourceCodePointCount']);
  assert.equal(result.chunks.map(chunk => chunk.text).join(''), source);
  assert.equal(result.sourceCodePointCount, Array.from(source).length);
  assert.equal(result.chunks.reduce((total, chunk) => total + chunk.codePointCount, 0), Array.from(source).length);
  let start = 0;
  result.chunks.forEach((chunk, index) => {
    assert.deepEqual(Object.keys(chunk), ['index', 'startCodePoint', 'endCodePoint', 'codePointCount', 'text']);
    assert.equal(chunk.index, index + 1);
    assert.equal(chunk.startCodePoint, start);
    assert.equal(chunk.endCodePoint, start + chunk.codePointCount);
    assert.equal(chunk.codePointCount, Array.from(chunk.text).length);
    assert.ok(chunk.codePointCount >= 1 && chunk.codePointCount <= limit);
    start = chunk.endCodePoint;
  });
}

for (const fixture of VALID_CASES) test(`${fixture.id}: literal chunks and offsets`, () => {
  const result = split(fixture.source, fixture.limit, fixture.mode);
  assert.deepEqual(result.chunks.map(chunk => chunk.text), fixture.expected);
  invariant(result, fixture.source, fixture.limit);
  if (fixture.id === 'A03') assert.deepEqual(validateSource(fixture.source), { ok: true, utf16Length: 5, codePointLength: 4 });
});
test('A11: empty source rejects all output', () => assert.deepEqual(split(''), error('SOURCE_EMPTY')));
test('A12: exact 100000 UTF-16 units accepted', () => {
  const source = 'A'.repeat(100000);
  const result = split(source, 10000);
  assert.deepEqual(result.chunks.map(chunk => chunk.codePointCount), [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000]);
  invariant(result, source, 10000);
  assert.deepEqual(validateSource('😀'.repeat(50000)), { ok: true, utf16Length: 100000, codePointLength: 50000 });
});
test('A13: raw 100001 units refused before Unicode and limits', () => {
  assert.deepEqual(split('A'.repeat(100001)), error('SOURCE_TOO_LONG'));
  assert.deepEqual(split('😀'.repeat(50000) + 'A'), error('SOURCE_TOO_LONG'));
  assert.deepEqual(splitText({ source: '\ud800'.repeat(100001), limit: 0, mode: 'bad' }), error('SOURCE_TOO_LONG'));
});
test('A14: 1001 chunks rejected without partial output', () => assert.deepEqual(split('A'.repeat(1001), 1), error('CHUNK_LIMIT_EXCEEDED', 1001)));
test('A15: 1000 chunks retains final scalar', () => {
  const result = split('A'.repeat(999) + 'Z', 1);
  assert.equal(result.chunks.length, 1000);
  assert.deepEqual(result.chunks[999], { index: 1000, startCodePoint: 999, endCodePoint: 1000, codePointCount: 1, text: 'Z' });
});
test('A16: invalid Number limits', () => {
  for (const value of [0, 10001, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2', null, true]) assert.deepEqual(split('AB', value), error('OUT_OF_RANGE', 2));
  for (const raw of ['0', '10001', '99999999999999999999999999999999']) assert.deepEqual(parseLimit(raw), { ok: false, code: 'OUT_OF_RANGE' });
});
test('A17: ASCII digits only, no signs, decimal, grouping, exponent or fullwidth', () => {
  for (const raw of ['1e2', '+2', '-2', '1,000', '２', '2.0', '', ' ', '2 2', '0x10']) assert.deepEqual(parseLimit(raw), { ok: false, code: 'INTEGER_REQUIRED' });
});
test('A18: length checked before trim, including 33 spaces', () => {
  for (const raw of ['0'.repeat(32) + '2', ' '.repeat(32) + '2', ' '.repeat(33)]) assert.deepEqual(parseLimit(raw), { ok: false, code: 'INPUT_TOO_LONG' });
  assert.deepEqual(parseLimit('0'.repeat(31) + '2'), { ok: true, value: 2 });
});
test('A19: unknown mode', () => assert.deepEqual(split('AB', 2, 'other'), error('INVALID_MODE', 2)));
test('A20: all unpaired surrogate positions reject', () => {
  for (const source of ['\ud800', '\udfff', 'A\ud800B', 'A\udfffB', '\ud800\ud800', '\udfff\ud800']) assert.deepEqual(split(source), error('INVALID_UNICODE'));
});
test('A22/A23: rejoin and summed counts for all valid acceptance outputs', () => {
  for (const fixture of VALID_CASES) invariant(split(fixture.source, fixture.limit, fixture.mode), fixture.source, fixture.limit);
});
test('A24: failed chunk limit followed by independent valid retry', () => {
  const source = 'A'.repeat(1001);
  assert.deepEqual(split(source, 1), error('CHUNK_LIMIT_EXCEEDED', 1001));
  const result = split(source, 10000);
  assert.equal(result.chunks.length, 1);
  invariant(result, source, 10000);
});
test('A25: only LF is a preferred boundary and the last candidate wins', () => {
  assert.deepEqual(split('A\rBC', 3, 'prefer-lf').chunks.map(chunk => chunk.text), ['A\rB', 'C']);
  assert.deepEqual(split('A\nB\nCD', 5, 'prefer-lf').chunks.map(chunk => chunk.text), ['A\nB\n', 'CD']);
  for (const source of ['A\rB\r', 'A\r\nB\n', '\n\r\n\r', '\n'.repeat(1000)]) invariant(split(source, 3, 'prefer-lf'), source, 3);
  const earlyLF = 'A\n' + 'B'.repeat(999);
  assert.equal(split(earlyLF, 2, 'strict').ok, true);
  // A last-LF preference can produce more chunks than strict at the same limit.
  const manyLines = 'A\nB'.repeat(1000);
  assert.equal(split(manyLines, 3, 'strict').ok, true);
  assert.deepEqual(split(manyLines, 3, 'prefer-lf'), error('CHUNK_LIMIT_EXCEEDED', 3000));
});
test('A26: markup retained as text', () => invariant(split(MARKUP_SOURCE, 100), MARKUP_SOURCE, 100));
test('A27: leading zeroes', () => assert.deepEqual(parseLimit('0002'), { ok: true, value: 2 }));
test('A28: trim exactly ASCII whitespace, no Unicode normalization', () => {
  assert.deepEqual(parseLimit('\t\n\v\f\r 2 \t'), { ok: true, value: 2 });
  for (const raw of ['\u30002\u3000', '\u00a02', '2\u200b']) assert.deepEqual(parseLimit(raw), { ok: false, code: 'INTEGER_REQUIRED' });
});
test('exact request schema, descriptors and prototype; getters never read', () => {
  const valid = { source: 'AB', limit: 2, mode: 'strict' };
  assert.equal(splitText(Object.assign(Object.create(null), valid)).ok, true);
  let calls = 0;
  const getter = Object.defineProperty({ limit: 2, mode: 'strict' }, 'source', { enumerable: true, get() { calls += 1; throw new Error('never'); } });
  const hidden = Object.defineProperty({ limit: 2, mode: 'strict' }, 'source', { value: 'AB', enumerable: false });
  for (const invalid of [null, [], 'AB', 1, new Date(), { ...valid, extra: true }, { ...valid, [Symbol('extra')]: 1 }, { source: 'AB', limit: 2 }, getter, hidden, Object.assign(Object.create({}), valid)]) assert.deepEqual(splitText(invalid), error('INVALID_REQUEST'));
  assert.equal(calls, 0);
  assert.deepEqual(splitText(new Proxy(valid, { ownKeys() { throw new Error('fake'); } })), error('INVALID_REQUEST'));
});
test('fixed error priority and verified count availability', () => {
  assert.deepEqual(splitText({ source: 1, limit: 0, mode: 'bad' }), error('INVALID_SOURCE'));
  assert.deepEqual(splitText({ source: '\ud800', limit: 0, mode: 'bad' }), error('INVALID_UNICODE'));
  assert.deepEqual(splitText({ source: '', limit: 0, mode: 'bad' }), error('SOURCE_EMPTY'));
  assert.deepEqual(splitText({ source: '😀', limit: 0, mode: 'bad' }), error('OUT_OF_RANGE', 1));
  assert.deepEqual(splitText({ source: '😀', limit: 2, mode: 'bad' }), error('INVALID_MODE', 1));
});
test('seeded synthetic Unicode corpus preserves scalars and progress', () => {
  const alphabet = ['A', '中', '😀', '\n', '\r', ' ', '\t', '\u0301', '\u200d', '\u00a0'];
  let seed = 2301;
  for (let trial = 0; trial < 120; trial += 1) {
    let source = '';
    for (let i = 0; i <= trial; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      source += alphabet[seed % alphabet.length];
    }
    const limit = trial % 13 + 1;
    for (const mode of ['strict', 'prefer-lf']) invariant(split(source, limit, mode), source, limit);
  }
});
