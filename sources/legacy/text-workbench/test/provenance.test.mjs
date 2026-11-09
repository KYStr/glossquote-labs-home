import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanText, MAX_SOURCE_LINES, measureText, normalizeNewlines } from '../public/js/core/text.mjs';
import { handleWorkerMessage } from '../public/js/worker.mjs';
import { inspectReply, mountWorkbench, removalPage, REMOVAL_PAGE_SIZE } from '../public/js/app.mjs';
import { encodeOutput } from '../public/js/core/export.mjs';

const all = { trimAscii: true, dropEmpty: true, deduplicate: true };
const off = { trimAscii: false, dropEmpty: false, deduplicate: false };
const mapping = (kept = [], empty = [], duplicate = [], first = [], trimmed = []) => ({
  keptSourceLines: kept, emptyRemovedSourceLines: empty, duplicateRemovedSourceLines: duplicate,
  duplicateFirstSourceLines: first, trimmedSourceLines: trimmed,
});
const cases = [
  { id: 'U01-01', source: '  A \r\nA\r\n\r\n B\t\r\nB\r\n', options: all,
    text: 'A\nB', provenance: mapping([1, 4], [3, 6], [2, 5], [1, 4], [1, 4]) },
  { id: 'U01-02', source: ' A \nA\n \t\n\nB\nB\n', options: { ...all, dropEmpty: false },
    text: 'A\n\nB', provenance: mapping([1, 3, 5], [], [2, 4, 6, 7], [1, 3, 5, 3], [1, 3]) },
  { id: 'U01-03', source: '\n', options: { ...off, deduplicate: true },
    text: '', provenance: mapping([1], [], [2], [1]) },
  { id: 'U01-04', source: ' \t', options: { ...off, trimAscii: true },
    text: '', provenance: mapping([1], [], [], [], [1]) },
  { id: 'U01-05', source: 'A\r\nA\r', options: { ...off, deduplicate: true },
    text: 'A\n', provenance: mapping([1, 3], [], [2], [1]) },
  { id: 'U01-06', source: 'é\ne\u0301\né\n a\na\n\u3000a\u3000', options: { ...all, dropEmpty: false },
    text: 'é\ne\u0301\na\n\u3000a\u3000', provenance: mapping([1, 2, 4, 6], [], [3, 5], [1, 4], [4]) },
];

for (const fixture of cases) {
  test(`${fixture.id}: exact source mapping, unchanged output, native worker protocol and reply validation`, () => {
    const result = cleanText(fixture.source, fixture.options);
    assert.equal(result.ok, true);
    assert.deepEqual(Object.keys(result.value).sort(), ['after', 'before', 'provenance', 'text']);
    assert.equal(result.value.text, fixture.text);
    assert.deepEqual(result.value.provenance, fixture.provenance);
    const envelope = handleWorkerMessage({ type: 'clean', jobId: 1, text: fixture.source, options: fixture.options });
    assert.deepEqual(envelope.result, result);
    assert.deepEqual(inspectReply(envelope, 1, result.value.before, fixture.source, fixture.options), result);
  });
}

test('U01-01 metrics and source-order review are exact', () => {
  const value = cleanText(cases[0].source, all).value;
  assert.deepEqual(value.before, { codePoints: 14, lines: 6, utf8Bytes: 14 });
  assert.deepEqual(value.after, { codePoints: 3, lines: 2, utf8Bytes: 3 });
  assert.deepEqual(removalPage(value.provenance, 0), [
    { sourceLine: 2, reason: 'duplicate', firstSourceLine: 1 },
    { sourceLine: 3, reason: 'empty', firstSourceLine: null },
    { sourceLine: 5, reason: 'duplicate', firstSourceLine: 4 },
    { sourceLine: 6, reason: 'empty', firstSourceLine: null },
  ]);
});

test('U01-03/04 removed count is independent of output line count or trimming', () => {
  const emptyDuplicate = cleanText('\n', { ...off, deduplicate: true }).value;
  assert.equal(emptyDuplicate.before.lines, 2);
  assert.equal(emptyDuplicate.after.lines, 0);
  assert.equal(emptyDuplicate.provenance.duplicateRemovedSourceLines.length, 1);
  const trimmed = cleanText(' \t', { ...off, trimAscii: true }).value;
  assert.equal(trimmed.provenance.keptSourceLines.length, 1);
  assert.equal(trimmed.provenance.emptyRemovedSourceLines.length + trimmed.provenance.duplicateRemovedSourceLines.length, 0);
});

test('U01-07 empty source and every option combination keep empty mapping; disabled changes retain source lines', () => {
  for (const trimAscii of [false, true]) for (const dropEmpty of [false, true]) for (const deduplicate of [false, true]) {
    assert.deepEqual(cleanText('', { trimAscii, dropEmpty, deduplicate }), {
      ok: true, value: { text: '', before: { codePoints: 0, lines: 0, utf8Bytes: 0 },
        after: { codePoints: 0, lines: 0, utf8Bytes: 0 }, provenance: mapping() },
    });
  }
  assert.deepEqual(cleanText('A\nA', off).value.provenance, mapping([1, 2]));
  assert.equal(cleanText('A\nA', off).value.text, 'A\nA');
});

test('U01-08 maximum 200001 source paragraphs remain complete and every page has at most 100 entries', () => {
  assert.equal(MAX_SOURCE_LINES, 200001);
  assert.equal(REMOVAL_PAGE_SIZE, 100);
  const source = '\n'.repeat(200000);
  const value = cleanText(source, all).value;
  assert.equal(value.text, '');
  assert.equal(value.before.lines, 200001);
  assert.deepEqual(value.provenance, mapping([], Array.from({ length: 200001 }, (_, index) => index + 1)));
  assert.equal(Math.ceil(value.provenance.emptyRemovedSourceLines.length / REMOVAL_PAGE_SIZE), 2001);
  assert.equal(removalPage(value.provenance, 0).length, 100);
  assert.equal(removalPage(value.provenance, 1)[0].sourceLine, 101);
  assert.deepEqual(removalPage(value.provenance, 2000), [{ sourceLine: 200001, reason: 'empty', firstSourceLine: null }]);
  assert.deepEqual(removalPage(value.provenance, -1), []);
  assert.deepEqual(removalPage(value.provenance, 2001), []);
  assert.deepEqual(inspectReply({ type: 'result', jobId: 1, result: { ok: true, value } }, 1, value.before, source, all).value, value);
});

test('mixed removal-list binary partitions agree with declared source order at page boundaries', () => {
  const empty = []; const duplicate = []; const first = [];
  for (let line = 2; line <= 502; line += 1) {
    if (line % 3 === 0) empty.push(line); else { duplicate.push(line); first.push(1); }
  }
  const value = mapping([1], empty, duplicate, first);
  for (let page = 0; page < 6; page += 1) {
    const rows = removalPage(value, page);
    const expected = Array.from({ length: Math.min(100, 501 - page * 100) }, (_, index) => page * 100 + index + 2);
    assert.deepEqual(rows.map(row => row.sourceLine), expected);
    assert.ok(rows.length <= 100);
  }
});

function replyFixture() {
  const source = ' A \nA\n\n B\nB';
  const reply = handleWorkerMessage({ type: 'clean', jobId: 1, text: source, options: all });
  return { source, reply, before: reply.result.value.before };
}

test('U01-10 rejects invalid domains, partitions, first occurrences, option conflicts and forged semantic mappings', () => {
  const corruptions = [
    p => { p.keptSourceLines[0] = 0; },
    p => { p.keptSourceLines[0] = 6; },
    p => { p.keptSourceLines[0] = 1.5; },
    p => { p.duplicateFirstSourceLines[0] = 3; },
    p => { p.duplicateFirstSourceLines[0] = 4; },
    p => { p.extra = []; },
    p => { p.keptSourceLines.push(4); },
    p => { p.emptyRemovedSourceLines = []; },
    p => { p.emptyRemovedSourceLines = [2]; },
    p => { p.duplicateRemovedSourceLines.reverse(); },
    p => { p.duplicateFirstSourceLines.pop(); },
    p => { p.trimmedSourceLines = []; },
    p => { p.trimmedSourceLines.push(5); },
    p => { p.keptSourceLines = new Uint32Array([1, 4]); },
    p => { p.keptSourceLines = Array(MAX_SOURCE_LINES + 1); },
    p => { p.keptSourceLines[0] = Number.MAX_SAFE_INTEGER + 1; },
    p => { p.keptSourceLines[0] = '1'; },
  ];
  for (const corrupt of corruptions) {
    const { source, reply, before } = replyFixture();
    corrupt(reply.result.value.provenance);
    assert.equal(inspectReply(reply, 1, before, source, all), null);
  }
  const { source, reply, before } = replyFixture();
  assert.equal(inspectReply(reply, 1, before, source, off), null);
  assert.equal(inspectReply(reply, 2, before, source, all), null);
  delete reply.result.value.provenance;
  assert.equal(inspectReply(reply, 1, before, source, all), null);
});

test('U01-10 array holes, hidden/symbol fields and own accessors are rejected without invoking getters', () => {
  let reads = 0;
  const mutations = [
    p => { delete p.keptSourceLines[0]; },
    p => { Object.defineProperty(p, 'keptSourceLines', { get() { reads += 1; return [1, 4]; } }); },
    p => { Object.defineProperty(p.keptSourceLines, '0', { get() { reads += 1; return 1; } }); },
    p => { Object.defineProperty(p.keptSourceLines, 'extra', { value: 1 }); },
    p => { p.keptSourceLines[Symbol('extra')] = 1; },
    p => { p[Symbol('extra')] = []; },
  ];
  for (const mutate of mutations) {
    const { source, reply, before } = replyFixture(); mutate(reply.result.value.provenance);
    assert.equal(inspectReply(reply, 1, before, source, all), null);
  }
  assert.equal(reads, 0);
});

test('a valid partition with a false first-string match or tampered output still fails', () => {
  const source = 'A\nB\nA';
  const reply = handleWorkerMessage({ type: 'clean', jobId: 1, text: source, options: { ...off, deduplicate: true } });
  reply.result.value.provenance.duplicateFirstSourceLines = [2];
  assert.equal(inspectReply(reply, 1, reply.result.value.before, source, { ...off, deduplicate: true }), null);
  const next = replyFixture();
  next.reply.result.value.text = 'B\nA';
  next.reply.result.value.after = measureText('B\nA');
  assert.equal(inspectReply(next.reply, 1, next.before, next.source, all), null);
});

class FakeElement {
  constructor(owner, id = '') { this.owner = owner; this.id = id; this.value = ''; this.checked = false; this.hidden = false;
    this.disabled = false; this.open = false; this.children = []; this.listeners = new Map(); this.attributes = new Map(); this.textContent = ''; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  focus() { this.owner.activeElement = this; }
  click() { return this.listeners.get('click')?.({}); }
  dispatch(type) { return this.listeners.get(type)?.({}); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); }
}

function workbench() {
  const elements = new Map(); const workers = []; const timers = new Map(); const copied = []; const blobs = [];
  let clock = 0; let ticket = 0;
  const doc = {
    documentElement: { lang: 'en' },
    getElementById(id) { if (!elements.has(id)) elements.set(id, new FakeElement(doc, id)); return elements.get(id); },
    createElement() { return new FakeElement(doc); },
  };
  doc.defaultView = new FakeElement(doc); doc.body = new FakeElement(doc);
  const controller = mountWorkbench({ doc, now: () => clock, capabilities: { worker: true, encoder: true, blob: true },
    schedule: (callback, delay) => { const id = ++ticket; timers.set(id, { callback, delay }); return id; },
    unschedule: id => timers.delete(id),
    writeClipboard: async text => { copied.push(text); },
    createObjectURL: blob => { blobs.push(blob); return 'blob:fake'; }, revokeObjectURL: () => {},
    createWorker: () => { const worker = { postMessage(request) { this.request = request; }, terminate() { this.terminated = true; } };
      workers.push(worker); return worker; },
  });
  const get = id => doc.getElementById(id);
  const start = (source, options = all) => {
    get('source-text').value = source; get('source-text').dispatch('input');
    for (const [id, key] of [['trim-ascii', 'trimAscii'], ['drop-empty', 'dropEmpty'], ['deduplicate', 'deduplicate']]) {
      get(id).checked = options[key]; get(id).dispatch('change');
    }
    get('process-button').click(); return workers.at(-1);
  };
  const finish = worker => worker.onmessage({ data: handleWorkerMessage(worker.request) });
  const assertCleared = () => { assert.equal(get('review-panel').hidden, true); assert.equal(get('review-count').textContent, '');
    assert.equal(get('removal-list').children.length, 0); assert.equal(get('removal-details').open, false);
    assert.equal(get('review-page').textContent, ''); assert.equal(get('output-text').value, '');
    assert.equal(get('copy-button').disabled, true); assert.equal(get('download-button').disabled, true); };
  return { doc, get, workers, timers, copied, blobs, controller, start, finish, assertCleared, setClock: value => { clock = value; } };
}

test('U01-09 controlled component state clears all review data on edits, running cancel/clear and stale callbacks', () => {
  const ui = workbench(); const first = ui.start('A\nA'); ui.finish(first);
  assert.equal(ui.get('review-panel').hidden, false);
  ui.get('removal-details').open = true;
  ui.get('trim-ascii').checked = false; ui.get('trim-ascii').dispatch('change'); ui.assertCleared();
  const next = ui.start('B\nB'); const stale = next.onmessage; const envelope = handleWorkerMessage(next.request);
  ui.get('cancel-button').click(); ui.assertCleared(); stale({ data: envelope }); ui.assertCleared();
  const third = ui.start('C\nC'); const late = third.onmessage;
  ui.get('clear-button').click(); ui.assertCleared();
  assert.equal(ui.get('source-text').value, ''); assert.equal(ui.doc.activeElement.id, 'source-text');
  assert.ok(['trim-ascii', 'drop-empty', 'deduplicate'].every(id => !ui.get(id).checked));
  late({ data: handleWorkerMessage(third.request) }); ui.assertCleared();
  const newest = ui.start('D\nD'); stale({ data: envelope }); ui.assertCleared(); ui.finish(newest);
  assert.equal(ui.get('output-text').value, 'D');
});

test('U01-09 controlled timeout, failure, pagehide and destroy clear the summary', () => {
  for (const action of ['timeout', 'malformed', 'pagehide', 'destroy']) {
    const ui = workbench(); const first = ui.start('A\nA'); ui.finish(first);
    ui.get('removal-details').open = true;
    if (action === 'pagehide') ui.doc.defaultView.dispatch('pagehide');
    else if (action === 'destroy') ui.controller.destroy();
    else {
      const worker = ui.start('B\nB');
      if (action === 'timeout') { ui.setClock(5000); worker.onmessage({ data: handleWorkerMessage(worker.request) }); }
      else worker.onmessage({ data: { type: 'result', jobId: worker.request.jobId, result: { ok: true, value: {} } } });
    }
    ui.assertCleared();
  }
});

test('U01-10 malformed current provenance yields fixed WORKER_FAILED and no result or getter execution', () => {
  const ui = workbench(); const worker = ui.start('A\nA'); const reply = handleWorkerMessage(worker.request);
  let reads = 0;
  Object.defineProperty(reply.result.value.provenance.duplicateFirstSourceLines, '0', { get() { reads += 1; return 1; } });
  worker.onmessage({ data: reply }); ui.assertCleared();
  assert.equal(reads, 0);
  assert.equal(ui.get('work-status').textContent, 'Text cleaning could not be completed. Check that the page loaded correctly, then try again.');
});

test('U01-11 literal original rows and text-only copy/Blob bytes are preserved in controlled component integration', async () => {
  const literal = '<img src=x onerror=alert(1)>';
  const ui = workbench(); const worker = ui.start(`${literal}\n${literal}`); ui.finish(worker);
  const row = ui.get('removal-list').children[0];
  assert.equal(row.children[1].textContent, literal);
  assert.equal(ui.get('output-text').value, literal);
  await ui.get('copy-button').click(); assert.deepEqual(ui.copied, [literal]);
  ui.get('download-button').click();
  assert.deepEqual(new Uint8Array(await ui.blobs[0].arrayBuffer()), encodeOutput(literal).value);
  assert.equal(ui.get('review-panel').hidden, false);
});

test('U01-12 controlled pagination is bounded, never starts a worker, survives actions and resets on a new result', async () => {
  const ui = workbench(); const worker = ui.start('A\n'.repeat(251)); ui.finish(worker);
  assert.equal(ui.get('removal-list').children.length, 100);
  assert.equal(ui.get('review-page').textContent, 'Page 1 of 3');
  ui.get('removal-details').open = true;
  ui.get('review-next').click(); assert.equal(ui.get('review-page').textContent, 'Page 2 of 3');
  ui.get('review-last').click(); assert.equal(ui.get('removal-list').children.length, 51);
  assert.equal(ui.get('review-page').textContent, 'Page 3 of 3');
  assert.equal(ui.get('review-next').disabled, true); assert.equal(ui.workers.length, 1);
  await ui.get('copy-button').click(); assert.equal(ui.get('removal-details').open, true);
  assert.equal(ui.get('review-page').textContent, 'Page 3 of 3');
  const next = ui.start('B\nB'); ui.finish(next);
  assert.equal(ui.get('review-page').textContent, 'Page 1 of 1'); assert.equal(ui.get('removal-details').open, false);
  assert.equal(ui.get('output-text').value, 'B');
});

test('empty successful reviews remain usable without a fake removed count', () => {
  const ui = workbench(); const worker = ui.start('\n', { ...off, deduplicate: true }); ui.finish(worker);
  assert.equal(ui.get('copy-button').disabled, false); assert.equal(ui.get('download-button').disabled, true);
  assert.equal(ui.get('review-empty-note').hidden, false);
  assert.match(ui.get('review-count').textContent, /Removed 1 lines: 0 empty and 1 duplicates/);
});
