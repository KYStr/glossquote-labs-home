import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, locate } from '../public/js/core/lexer.mjs';
const code = input => tokenize(input).error?.code;
test('lexer preserves exact raw tokens, offsets and legal escapes (JS-10)', () => {
  const source = ' { "x" : 9007199254740993, "y":"\\u0061", "z":"a\\\\/b" } ';
  const result = tokenize(source);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.map(token => token.raw), ['{','"x"',':','9007199254740993',',','"y"',':','"\\u0061"',',','"z"',':','"a\\\\/b"','}']);
  for (const token of result.value) assert.equal(source.slice(token.start, token.end), token.raw);
  assert.equal(result.value.find(token => token.raw === '"\\u0061"').decoded, 'a');
});
test('lexer rejects malformed tokens and non-JSON whitespace (JS-09/17)', () => {
  for (const source of ['+1','NaN','Infinity','1.','1e','-','"\\q"','"\\u001Z"','"x\n"','"unterminated','\ufeff{}','\u00a0{}','//x','/*x*/']) assert.equal(code(source), 'INVALID_JSON', source);
  assert.equal(code(''), 'EMPTY_INPUT');
  assert.equal(code(' \t\r\n'), 'EMPTY_INPUT');
  assert.equal(tokenize('true false null {}[]:,').ok, true); // Grammar belongs to parser.
});
test('raw and decoded surrogate checks (JS-11)', () => {
  for (const source of ['"\\uD800"','"\\uDC00"','"\ud800"','"\udc00"']) assert.equal(code(source), 'INVALID_UNICODE');
  for (const source of ['"\\uD83D\\uDE00"','"😀"']) assert.equal(tokenize(source).ok, true);
});
test('UTF-16 and UTF-8 limits have priority (JS-13)', () => {
  assert.equal(tokenize(' '.repeat(262143) + '0').ok, true);
  assert.equal(code(' '.repeat(262144) + '0'), 'INPUT_TOO_LARGE');
  assert.equal(code('中'.repeat(90000)), 'INPUT_TOO_LARGE');
  assert.equal(tokenize('x'.repeat(262145)).error.offset, null);
});
test('bounded token, string and number counts (JS-14/15/16)', () => {
  assert.equal(tokenize('[' + Array(24999).fill('0').join(',') + ']').value.length, 49999);
  assert.equal(code('[' + Array(25000).fill('0').join(',') + ']'), 'TOKEN_LIMIT');
  assert.equal(tokenize('"' + 'a'.repeat(65534) + '"').ok, true);
  assert.equal(code('"' + 'a'.repeat(65535) + '"'), 'TOKEN_TOO_LONG');
  assert.equal(tokenize('1'.repeat(4096)).value[0].raw, '1'.repeat(4096));
  assert.equal(code('1'.repeat(4097)), 'TOKEN_TOO_LONG');
});
test('locate counts CRLF, CR, LF and UTF-16 columns (JS-18)', () => {
  assert.deepEqual(locate('{\r\nx}',3), { line:2, column:1 });
  assert.deepEqual(locate('a\rb\nc\r\nd',7), { line:4, column:1 });
  assert.deepEqual(locate('😀x',2), { line:1, column:3 });
});
