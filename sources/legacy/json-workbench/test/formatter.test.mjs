import test from 'node:test';
import assert from 'node:assert/strict';
import { processJson, createOutputWriter } from '../public/js/core/formatter.mjs';
import { tokenize } from '../public/js/core/lexer.mjs';
test('JS-02 exact two-space LF pretty output without trailing LF', () => {
  assert.equal(processJson('{"a":[1,true,null]}').value.text, '{\n  "a": [\n    1,\n    true,\n    null\n  ]\n}');
});
test('JS-03/06/10 raw numbers, escapes, order and compact output preserved', () => {
  assert.equal(processJson('{ "x" : 9007199254740993, "y":1.2300, "z":-0, "e":1e400 }','compact').value.text, '{"x":9007199254740993,"y":1.2300,"z":-0,"e":1e400}');
  const source = '{"x":"\\u0061","y":"a\\\\/b","z":"\\/","10":0,"2":1}';
  assert.equal(processJson(source,'compact').value.text,source);
  assert.deepEqual(tokenize(processJson(source).value.text).value.map(t=>t.raw),tokenize(source).value.map(t=>t.raw));
});
test('JS-11/13/14/15/16/17 accepted boundaries have actual formatted output', () => {
  for (const source of ['{}','[]','true','false','null','"x"','"\\uD83D\\uDE00"','"😀"','1'.repeat(4096),'"'+'a'.repeat(65534)+'"']) assert.equal(processJson(source).value.text,source);
  assert.equal(processJson(' '.repeat(262143)+'0').value.text,'0');
  assert.equal(processJson(' '.repeat(262144)+'0').error.code,'INPUT_TOO_LARGE');
  assert.equal(processJson('['+Array(24999).fill('0').join(',')+']','compact').ok,true);
  assert.equal(processJson('['+Array(25000).fill('0').join(',')+']').error.code,'TOKEN_LIMIT');
  for (const [source,code] of [['"\\uD800"','INVALID_UNICODE'],['\ufeff{}','INVALID_JSON'],['1'.repeat(4097),'TOKEN_TOO_LONG'],['"'+'a'.repeat(65535)+'"','TOKEN_TOO_LONG']]) assert.equal(processJson(source).error.code,code);
});
test('JS-19 writer refuses overflow permanently without partial output', () => {
  const writer = createOutputWriter();
  for (let index=0;index<4;index++) assert.equal(writer.append('a'.repeat(1048576)).ok,true);
  assert.equal(writer.finish().value.length,4194304);
  assert.deepEqual(writer.append('a'),{ok:false,error:{code:'OUTPUT_TOO_LARGE',offset:null}});
  assert.equal(writer.append('').ok,false);
  assert.deepEqual(writer.finish(),{ok:false,error:{code:'OUTPUT_TOO_LARGE',offset:null}});
  const multibyte = createOutputWriter();
  assert.equal(multibyte.append('😀'.repeat(1048576)).ok,true);
  assert.equal(multibyte.append('é').error.code,'OUTPUT_TOO_LARGE');
});
test('invalid mode rejected, deterministic generated nesting preserves every token', () => {
  assert.equal(processJson('{}','unknown').error.code,'INVALID_MODE');
  for (let depth=1;depth<40;depth++) {
    const source = '[ '.repeat(depth)+'{"b": -0, "a":1.2300, "s":"\\u0061"}'+']'.repeat(depth);
    for (const mode of ['pretty','compact']) {
      const result = processJson(source,mode);
      assert.equal(result.ok,true);
      assert.deepEqual(tokenize(result.value.text).value.map(t=>t.raw),tokenize(source).value.map(t=>t.raw));
      assert.equal(result.value.text.endsWith('\n'),false);
    }
  }
});
