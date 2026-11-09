import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisSession } from '../public/js/core/session.js';
import { runWorkerMessage } from '../public/js/analysis-worker.js';
import { analyze } from '../public/js/core/analyze.js';
import { fixtureFiles, fixture, FakeWorker } from './helpers.mjs';

function setup() {
  const workers = [], revoked = [], blobs = [], states = [];
  const session = new AnalysisSession({ workerFactory() { const worker = new FakeWorker(); workers.push(worker); return worker; },
    onChange: state => states.push(state), createURL(blob) { blobs.push(blob); return `blob:synthetic-${blobs.length}`; }, revokeURL: url => revoked.push(url) });
  return { session, workers, revoked, blobs, states };
}
async function ready(context) {
  context.session.setFiles(fixtureFiles()); context.session.start();
  const worker = context.workers.at(-1), jobId = worker.sent[0].jobId;
  worker.deliver({ type: 'complete', jobId, result: await analyze(fixture(), { jobId }) });
}

test('D48-18: terminate A on cancel; stale complete cannot revive it or overwrite B', async () => {
  const context = setup(), { session, workers } = context;
  session.setFiles(fixtureFiles()); assert.equal(session.result, null); session.start();
  const a = workers[0], callbackA = a.lastHandler, idA = a.sent[0].jobId;
  session.cancel(); assert.equal(a.terminated, 1); assert.equal(session.result, null); assert.equal(session.download('json'), null);
  session.start(); const b = workers[1];
  callbackA({ data: { type: 'complete', jobId: idA, result: await analyze(fixture(), { jobId: idA }) } });
  assert.equal(session.state, 'hashing'); assert.equal(session.result, null); assert.equal(b.terminated, 0);
  b.deliver({ type: 'complete', jobId: b.sent[0].jobId, result: await analyze(fixture(), { jobId: b.sent[0].jobId }) });
  assert.equal(session.state, 'ready'); assert.equal(session.result.jobId, b.sent[0].jobId); assert.equal(b.terminated, 1);
});

test('D48-20/21: reorder/remove/reset/pagehide invalidate data and revoke each URL exactly once', async () => {
  for (const operation of ['reorder', 'remove', 'reset', 'pagehide', 'cancel', 'restart']) {
    const context = setup(); await ready(context); const { session, revoked, blobs } = context;
    assert.equal(blobs.length, 0);
    const json = session.download('json'), txt = session.download('txt'); session.download('json');
    assert.equal(blobs.length, 2); assert.equal(json.filename, 'duplicate-report.json'); assert.equal(txt.filename, 'duplicate-report.txt');
    assert.equal(JSON.parse(await blobs[0].text()).summary.savedBytes, 3); assert.match(await blobs[1].text(), /Potential space saved: 3 bytes/);
    if (operation === 'reorder') session.setFiles(session.files.map(item => item.file).reverse());
    if (operation === 'remove') session.removeFile(0);
    if (operation === 'reset') session.reset();
    if (operation === 'pagehide') session.pagehide();
    if (operation === 'cancel') session.cancel();
    if (operation === 'restart') session.start();
    assert.equal(session.result, null); assert.equal(session.download('json'), null); assert.equal(session.urls.size, 0);
    assert.deepEqual(revoked, [json.url, txt.url]); session.reset(); assert.equal(revoked.length, 2);
    if (['reset', 'pagehide'].includes(operation)) assert.deepEqual(session.files, []);
  }
});

test('Keeper update revokes stale reports and generates current mapping only', async () => {
  const context = setup(); await ready(context); const { session, blobs, revoked } = context;
  const first = session.download('json'); session.download('txt');
  assert.equal(session.selectKeeper('group-001', 2), false); assert.equal(revoked.length, 0);
  assert.equal(session.selectKeeper('group-001', 1), true); assert.equal(revoked.length, 2);
  const next = session.download('json'); session.download('txt'); assert.notEqual(first.url, next.url);
  assert.equal(JSON.parse(await blobs[2].text()).files[0].keeperSourceIndex, 1);
  assert.match(await blobs[3].text(), /DUPLICATE\t0\t"a"\t3\t[0-9a-f]{64}\t1/);
});

test('D48-25: advancing fake time 20 minutes does not expire ready results or downloads', async context => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 0 });
  const data = setup(); await ready(data); const result = data.session.result, download = data.session.download('json');
  context.mock.timers.tick(20 * 60 * 1000);
  assert.equal(data.session.result, result); assert.equal(data.session.download('json'), download); assert.deepEqual(data.revoked, []);
});

test('Worker protocol is fixed, redacted and fail-closed (Node invocation, not browser Worker)', async () => {
  const messages = [];
  await runWorkerMessage({ type: 'start', jobId: 'job-w', files: fixture() }, value => messages.push(value));
  assert.equal(messages.at(-1).type, 'complete'); assert.equal(messages.at(-1).result.summary.savedBytes, 3);
  for (const message of messages.filter(value => value.type === 'progress')) assert.deepEqual(Object.keys(message), ['type', 'jobId', 'stage', 'completedFiles', 'totalFiles']);
  const failure = [];
  await runWorkerMessage({ type: 'start', jobId: 'job-w', files: fixture() }, value => failure.push(value), { digestProvider: async () => new Uint8Array(0) });
  assert.deepEqual(failure.at(-1), { type: 'error', jobId: 'job-w', code: 'DIGEST_FAILED', fileIndexes: [0] });
  const ignored = []; await runWorkerMessage({ type: 'start', jobId: 'job-w', files: [], extra: true }, value => ignored.push(value)); assert.deepEqual(ignored, []);
});

test('Worker errors and invalid/decreasing progress never preserve prior success', async () => {
  const context = setup(); await ready(context); const { session, workers } = context;
  session.start(); assert.equal(session.result, null); const worker = workers.at(-1), jobId = worker.sent[0].jobId;
  worker.deliver({ type: 'progress', jobId, stage: 'hashing', completedFiles: 3, totalFiles: 5 });
  worker.deliver({ type: 'progress', jobId, stage: 'hashing', completedFiles: 2, totalFiles: 5 }); assert.equal(session.progress.completedFiles, 3);
  worker.deliver({ type: 'progress', jobId, stage: 'hashing', completedFiles: 6, totalFiles: 5 }); assert.equal(session.progress.completedFiles, 3);
  worker.onerror({ preventDefault() {} }); assert.equal(session.result, null); assert.equal(session.error.code, 'READ_FAILED'); assert.equal(worker.terminated, 1);
  assert.equal(session.download('json'), null);
});

test('T30 changing sources while hashing terminates worker and ignores late progress/errors/complete', async () => {
  const context = setup(), { session, workers } = context;
  session.setFiles(fixtureFiles()); session.start();
  const worker = workers[0], callback = worker.lastHandler, jobId = worker.sent[0].jobId;
  session.removeFile(0); assert.equal(worker.terminated, 1); assert.equal(session.notice, 'sourcesChanged');
  for (const message of [
    { type: 'progress', jobId, stage: 'verifying', completedFiles: 5, totalFiles: 5 },
    { type: 'error', jobId, code: 'DIGEST_FAILED', fileIndexes: [0] },
    { type: 'complete', jobId, result: await analyze(fixture(), { jobId }) }
  ]) callback({ data: message });
  assert.equal(session.state, 'selected'); assert.equal(session.result, null); assert.equal(session.error, null);
  assert.deepEqual(session.files.map(item => item.sourceIndex), [0, 1, 2, 3]); assert.equal(session.download('txt'), null);
});

test('T30 new job, failed selection, reset and pagehide discard pending data; no unnecessary worker on invalid input', async () => {
  const context = setup(), { session, workers } = context;
  assert.equal(session.result, null); session.start(); assert.equal(workers.length, 0); assert.equal(session.error.code, 'NO_FILES');
  session.setFiles(fixtureFiles()); session.start(); const first = workers[0];
  session.start(); assert.equal(first.terminated, 1); assert.notEqual(workers[1].sent[0].jobId, first.sent[0].jobId);
  session.reset(); assert.equal(workers[1].terminated, 1); assert.equal(session.files.length, 0);
  await ready(context); const json = session.download('json');
  session.setFiles(Array.from({ length: 201 }, () => fixtureFiles()[0]));
  assert.equal(session.result, null); assert.equal(session.files.length, 0); assert.equal(session.error.code, 'TOO_MANY_FILES');
  assert.deepEqual(context.revoked, [json.url]);
  session.setFiles(fixtureFiles()); session.start(); session.pagehide();
  assert.equal(workers.at(-1).terminated, 1); assert.equal(session.result, null); assert.deepEqual(session.files, []);
});
