import test from 'node:test';
import assert from 'node:assert/strict';
import { initialSession, transition } from '../public/js/core/session.mjs';
const done = {ok:true,value:{text:'{}'}};
test('JS-20 ignores stale and cleared replies', () => {
  let session = transition(initialSession(),{type:'SOURCE',source:'{}'});
  session = transition(session,{type:'START'});
  assert.equal(session.jobId,2);
  assert.equal(transition(session,{type:'RESULT',jobId:1,result:done}),session);
  const cleared = transition(session,{type:'CLEAR'});
  assert.equal(transition(cleared,{type:'RESULT',jobId:2,result:done}),cleared);
  assert.equal(cleared.source,''); assert.equal(cleared.mode,'pretty');
});
test('cancel, edits and mode changes invalidate text and current job', () => {
  let running = transition(initialSession(),{type:'SOURCE',source:'{}'});
  running = transition(running,{type:'START'});
  const completed = transition(running,{type:'RESULT',jobId:running.jobId,result:done});
  assert.equal(completed.status,'success');
  for (const event of [{type:'SOURCE',source:'[]'},{type:'MODE',mode:'compact'}]) {
    const changed = transition(completed,event);
    assert.equal(changed.text,''); assert.equal(changed.status,'dirty');
  }
  const cancelled = transition(running,{type:'CANCEL'});
  assert.equal(cancelled.source,'{}'); assert.equal(cancelled.reason,'cancelled');
  assert.equal(transition(cancelled,{type:'RESULT',jobId:running.jobId,result:done}),cancelled);
});
test('worker result exact schema, limits and errors fail closed', () => {
  const running = transition(initialSession(),{type:'START'});
  for (const result of [{ok:true,value:{text:'{}',extra:true}}, {ok:false,error:{code:'unknown',offset:0}}, {ok:false,error:{code:'INVALID_JSON',offset:1}}, {ok:true,value:{text:'x'.repeat(4194305)}}, {ok:true,value:{text:'😀'.repeat(1048577)}}]) assert.deepEqual(transition(running,{type:'RESULT',jobId:running.jobId,result}).error,{code:'WORKER_FAILED',offset:null});
  for (const code of ['TIMEOUT','UNSUPPORTED','WORKER_FAILED']) assert.equal(transition(running,{type:'RESULT',jobId:running.jobId,result:{ok:false,error:{code,offset:null}}}).status,'error');
});
