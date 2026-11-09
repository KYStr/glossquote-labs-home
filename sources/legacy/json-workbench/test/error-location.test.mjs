import test from 'node:test';
import assert from 'node:assert/strict';
import { currentErrorOffset } from '../public/js/core/error-location.mjs';
import { initialSession, transition } from '../public/js/core/session.mjs';
import { processJson } from '../public/js/core/formatter.mjs';

function errorSession(source) {
  const running = transition(transition(initialSession(),{type:'SOURCE',source}),{type:'START'});
  return transition(running,{type:'RESULT',jobId:running.jobId,result:processJson(source)});
}
test('U02 uses current parser UTF-16 offsets including EOF, emoji and the second duplicate key',() => {
  for (const [source,expected] of [['{"a":}',5],['{"a":1',6],['{"😀":}',6],['{"a":1,"a":2}',7],['\r\n{"a":}',7]]) assert.equal(currentErrorOffset(errorSession(source)),expected);
  assert.equal(currentErrorOffset(errorSession('{}')),null);
});
test('U02 rejects null, malformed, out-of-bounds, unknown and mismatched-source positions',() => {
  const error = errorSession('{"a":}');
  for (const offset of [null,undefined,-1,7,1.5,NaN,Infinity,'5']) assert.equal(currentErrorOffset({...error,error:{code:'INVALID_JSON',offset}}),null);
  assert.equal(currentErrorOffset({...error,error:{code:'UNKNOWN',offset:5}}),null);
  for (const code of ['TIMEOUT','UNSUPPORTED','WORKER_FAILED','INPUT_TOO_LARGE','TOKEN_LIMIT','TOKEN_TOO_LONG','DEPTH_LIMIT','OUTPUT_TOO_LARGE','INVALID_MODE','EMPTY_INPUT']) assert.equal(currentErrorOffset({...error,error:{code,offset:5}}),null);
  assert.equal(currentErrorOffset(error,'{"b":}'),null);
  assert.equal(currentErrorOffset(errorSession('')),null);
  assert.equal(currentErrorOffset(null),null);
  assert.equal(currentErrorOffset({...error,source:'',error:{code:'INVALID_JSON',offset:0}}),0);
});
test('U02 edits, mode, clear, recheck, cancellation and late replies cannot restore an old target',() => {
  const error=errorSession('{"a":}');
  for (const event of [{type:'SOURCE',source:'{}'},{type:'MODE',mode:'compact'},{type:'CLEAR'},{type:'START'}]) {
    const changed=transition(error,event);
    assert.equal(currentErrorOffset(changed),null);
    const late=transition(changed,{type:'RESULT',jobId:error.jobId,result:{ok:false,error:{code:'INVALID_JSON',offset:5}}});
    assert.equal(late,changed);
    assert.equal(currentErrorOffset(late),null);
  }
  const running=transition(error,{type:'START'});
  const cancelled=transition(running,{type:'CANCEL'});
  assert.equal(currentErrorOffset(cancelled),null);
  assert.equal(transition(cancelled,{type:'RESULT',jobId:running.jobId,result:processJson('{"a":}')}),cancelled);
});
