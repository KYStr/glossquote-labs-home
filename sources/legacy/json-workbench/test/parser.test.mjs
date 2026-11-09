import test from 'node:test';
import assert from 'node:assert/strict';
import { processJson } from '../public/js/core/formatter.mjs';
import { tokenize, locate } from '../public/js/core/lexer.mjs';
import { parseTokens } from '../public/js/core/parser.mjs';
test('JS-01 empty input has no result', () => {
  for (const source of ['', ' \t\r\n']) assert.deepEqual(processJson(source), { ok:false, error:{ code:'EMPTY_INPUT', offset:null } });
});
test('JS-04/05 duplicate keys compare decoded values and locate the second quote', () => {
  for (const source of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}']) {
    const result = processJson(source);
    assert.deepEqual(result, { ok:false, error:{ code:'DUPLICATE_KEY', offset:7 } });
    assert.deepEqual(locate(source,result.error.offset), { line:1, column:8 });
  }
  for (const source of ['{"a":1,"b":{"a":2}}','{"A":1,"a":2}','{" a":1,"a":2}','{"é":1,"e\\u0301":2}']) assert.equal(processJson(source).ok, true);
});
test('JS-07 keys remain ordered entries without prototype mutation', () => {
  const source = '{"__proto__":{"polluted":true},"constructor":1,"prototype":2}';
  const tokens = tokenize(source).value;
  const ast = parseTokens(tokens,source.length).value;
  assert.equal(ast.entries[0].keyValue, '__proto__');
  assert.equal(Object.hasOwn(ast,'__proto__'), false);
  assert.equal(({}).polluted, undefined);
  assert.equal(processJson(source,'compact').value.text,source);
});
test('JS-08/09 complete strict grammar rejects without repair', () => {
  assert.deepEqual(processJson('[1,]').error, { code:'INVALID_JSON',offset:3 });
  assert.deepEqual(locate('[1,]',3), {line:1,column:4});
  for (const source of ['01','+1','NaN','Infinity','1.','1e','{}{}','true false','[1 2]','{"a" 1}','{"a":}','{"a":1,}','[','{','[1','{"a":1','{"a":1]','[,1]','{"a":1,,"b":2}','/*x*/0','0\u00a0']) assert.equal(processJson(source).error.code,'INVALID_JSON');
});
test('JS-12 depth 64 passes and 65 fails', () => {
  assert.equal(processJson('['.repeat(64)+'0'+']'.repeat(64),'compact').ok,true);
  assert.deepEqual(processJson('['.repeat(65)+'0'+']'.repeat(65)).error, {code:'DEPTH_LIMIT',offset:null});
});
test('first syntax error has fixed fields and never copies input', () => {
  const result = processJson('{\r\nx}');
  assert.deepEqual(result.error, {code:'INVALID_JSON',offset:3});
  assert.deepEqual(locate('{\r\nx}',3), {line:2,column:1});
  const canary = 'SYNTHETIC_CANARY_FOR_PRIVACY';
  assert.equal(JSON.stringify(processJson('{"'+canary+'":}')).includes(canary),false);
});
