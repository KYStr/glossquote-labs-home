import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { fixture } from './helpers.mjs';

test('T30 genuine Node worker structured-clones synthetic File objects; protocol completion (not browser)', { timeout: 15000 }, async () => {
  const worker = new Worker(new URL('./bridge-node-worker.mjs', import.meta.url));
  const messages = [];
  worker.on('message', value => messages.push(value));
  const exited = once(worker, 'exit');
  worker.postMessage({ type: 'start', jobId: 'job-node', files: fixture() });
  const [exit] = await exited;
  assert.equal(exit, 0); assert.equal(messages.at(-1).type, 'complete');
  assert.deepEqual(messages.at(-1).result.groups.map(group => group.memberSourceIndexes), [[0, 1], [2], [3, 4]]);
  assert.deepEqual(messages.at(-1).result.summary, { selectedFileCount: 5, uniqueContentCount: 3, duplicateFileCount: 2, savedBytes: 3 });
});

test('T30 identified Node worker can be terminated during hashing without a partial report', { timeout: 15000 }, async () => {
  const worker = new Worker(new URL('./bridge-node-worker.mjs', import.meta.url), { workerData: { pauseDigest: true } });
  const messages = []; let termination;
  worker.on('message', value => {
    messages.push(value);
    if (value.type === 'test-digest-paused') termination = worker.terminate();
  });
  const exited = once(worker, 'exit');
  const files = fixture();
  worker.postMessage({ type: 'start', jobId: 'job-stop', files });
  await exited; await termination;
  assert(termination); assert.equal(messages.some(value => value.type === 'complete'), false);
});
