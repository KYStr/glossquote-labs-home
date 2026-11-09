import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { WORKER_SOURCE } from '../public/js/worker-source.mjs';
test('reviewed standalone Worker uses the same lossless parser and fixed protocol', () => {
  const replies=[];
  const self={postMessage:message=>replies.push(message)};
  vm.runInNewContext(WORKER_SOURCE,{self,TextEncoder});
  self.onmessage({data:{type:'process',jobId:1,source:' {"x":9007199254740993,"y":1.2300,"z":-0,"e":1e400} ',mode:'compact'}});
  assert.equal(replies[0].result.value.text,'{"x":9007199254740993,"y":1.2300,"z":-0,"e":1e400}');
  self.onmessage({data:{type:'process',jobId:2,source:'{"a":1,"a":2}',mode:'pretty'}});
  assert.equal(replies[1].result.error.code,'DUPLICATE_KEY');
  self.onmessage({data:{type:'process',jobId:3,source:'{}',mode:'pretty',extra:true}});
  assert.equal(replies[2].result.error.code,'WORKER_FAILED');
  self.onmessage({data:{type:'unknown',jobId:4,source:'{}',mode:'pretty'}});
  assert.equal(replies[3].result.error.code,'WORKER_FAILED');
  self.onmessage({data:{type:'process',jobId:-1,source:'{}',mode:'pretty'}});
  assert.equal(replies.length,4);
});
