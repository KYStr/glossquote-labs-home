import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizerSession } from '../public/js/core/session.js';
import { parseInput } from '../public/js/core/parser.js';
import { createOutputs } from '../public/js/core/export-json.js';
import { setIncluded } from '../public/js/core/organizer.js';
import { bytes, minimal } from './fixtures.mjs';
function harness() {
  const workers = [], created = [], revoked = [];
  let exports = 0;
  const session = new OrganizerSession({
    workerFactory: () => { const worker = { messages: [], terminated: 0, postMessage(message) { this.messages.push(message); }, terminate() { this.terminated++; } }; workers.push(worker); return worker; },
    objectUrls: { createObjectURL(blob) { created.push(blob); return `blob:unit-${created.length}`; }, revokeObjectURL(url) { revoked.push(url); } },
    outputs: job => { exports++; return createOutputs(job); }
  });
  const file = (value = minimal, name = 'synthetic.html') => ({ name, size: bytes(value).length, async arrayBuffer() { return bytes(value).buffer; } });
  const complete = (worker = workers.at(-1), input = minimal, id = session.state.jobId) => worker.onmessage({ data: { type: 'result', jobId: id, result: parseInput(bytes(input), { jobId: id }) } });
  return { session, file, complete, workers, created, revoked, exports: () => exports };
}
test('K49-25: preview and edits do not create outputs or URLs; explicit download does', async () => {
  const h = harness();
  await h.session.select(h.file()); h.complete();
  h.session.edit(job => setIncluded(job, 0, true));
  assert.equal(h.exports(), 0); assert.equal(h.created.length, 0);
  assert.equal(h.session.state.job.exportHtml, null);
  assert.deepEqual(h.session.download('html'), { url: 'blob:unit-1', filename: 'bookmarks-organized.html' });
  assert.deepEqual(h.session.download('json'), { url: 'blob:unit-2', filename: 'duplicate-report.json' });
  assert.equal(h.exports(), 1);
  assert.equal(await h.created[0].text(), await h.session.state.job.exportHtml.text());
  assert.equal(JSON.parse(await h.created[1].text()).bookmarks[0].included, true);
  h.session.edit(job => setIncluded(job, 0, false, true));
  assert.deepEqual(h.revoked, ['blob:unit-1', 'blob:unit-2']);
  h.session.download('html');
  assert.equal(h.exports(), 2); assert.equal(parseInput(bytes(await h.created[2].text())).bookmarks.length, 0);
  h.session.dispose();
});
test('K49-28: twenty-minute fake clock does not expire ready edits', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const h = harness();
  await h.session.select(h.file()); h.complete();
  h.session.edit(job => setIncluded(job, 0, false, true));
  t.mock.timers.tick(20 * 60 * 1000);
  assert.equal(h.session.state.phase, 'ready-to-export');
  assert.equal(h.session.state.job.bookmarks[0].included, false);
  assert(h.session.download('json'));
  h.session.dispose();
});
test('K49-29: cancel terminates worker; stale result cannot revive preview or exports', async () => {
  const h = harness();
  await h.session.select(h.file());
  const worker = h.workers[0], id = h.session.state.jobId;
  h.session.cancel();
  assert.equal(worker.terminated, 1);
  assert.deepEqual(worker.messages.at(-1), { type: 'cancel', jobId: id });
  h.complete(worker, minimal, id);
  assert.equal(h.session.state.phase, 'canceled'); assert.equal(h.session.state.job, null);
  assert.equal(h.session.download('html'), null); assert.equal(h.exports(), 0); assert.equal(h.created.length, 0);
});
test('replacement synchronously clears old output, ignores old read and old worker', async () => {
  const h = harness();
  await h.session.select(h.file()); h.complete(); h.session.download('html');
  let resolveRead;
  const read = new Promise(resolve => { resolveRead = resolve; });
  const reading = h.session.select({ name: 'pending.html', size: bytes(minimal).length, arrayBuffer: () => read });
  assert.equal(h.session.state.job, null); assert.deepEqual(h.revoked, ['blob:unit-1']);
  await h.session.select(h.file(minimal.replace('Example', 'Replacement')));
  const newest = h.workers.at(-1), newestId = h.session.state.jobId;
  resolveRead(bytes(minimal).buffer); await reading;
  h.complete(newest, minimal.replace('Example', 'Replacement'), newestId);
  assert.equal(h.session.state.job.bookmarks[0].title, 'Replacement');
  assert.equal(h.workers.length, 2);
  const old = h.workers[0]; h.complete(old, minimal, old.messages[0].jobId);
  assert.equal(h.session.state.job.bookmarks[0].title, 'Replacement');
  h.session.dispose();
});
test('reset/pagehide disposer revoke both formats and remove state references', async () => {
  for (const action of ['reset', 'dispose', 'cancel']) {
    const h = harness(); await h.session.select(h.file()); h.complete();
    h.session.download('html'); h.session.download('json'); h.session.download('html');
    h.session[action]();
    assert.equal(h.session.state.job, null); assert.equal(h.session.state.sourceName, ''); assert.equal(h.session.state.sourceBytes, 0);
    assert.equal(h.session.urls.size, 0); assert.equal(h.session.worker, null);
    assert.deepEqual(h.revoked, ['blob:unit-1', 'blob:unit-3', 'blob:unit-2']);
  }
});
test('read rejection, worker failure and oversized files produce no partial results', async () => {
  const h = harness();
  await h.session.select({ name: 'large.html', size: 2097153, arrayBuffer() { throw new Error('Should not read'); } });
  assert.equal(h.session.state.error.code, 'INPUT_TOO_LARGE'); assert.equal(h.workers.length, 0);
  await h.session.select({ name: 'unreadable.html', size: 1, arrayBuffer() { throw new Error('untrusted raw error'); } });
  assert.equal(h.session.state.error.code, 'INVALID_STRUCTURE'); assert(!JSON.stringify(h.session.state).includes('untrusted'));
  await h.session.select(h.file()); h.workers.at(-1).onerror();
  assert.equal(h.session.state.error.code, 'INVALID_STRUCTURE'); assert.equal(h.session.state.job, null);
});
