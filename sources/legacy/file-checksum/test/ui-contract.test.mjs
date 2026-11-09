import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ChecksumController, displayFileName, DOWNLOAD_NAME } from '../public/js/controller.mjs';
import { mountChecksumApp } from '../public/js/app.mjs';
import { LOCALES } from '../public/js/i18n.mjs';
import { ERROR_CODES } from '../public/js/core/checksum.mjs';
import { WORKER_SOURCE } from '../public/js/worker-source.mjs';
import { validatePreviewHtml, ValidationError } from '../scripts/validation.mjs';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const ASSETS = ['index.html', 'en/index.html', 'styles/app.css', 'js/app.mjs', 'js/controller.mjs', 'js/i18n.mjs', 'js/core/checksum.mjs', 'js/core/session.mjs', 'js/hash.worker.mjs', 'js/worker-source.mjs'];
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function box() {
  const workers = [];
  const urls = new Map();
  const allBlobs = new Map();
  const revoked = [];
  const timers = new Map();
  const views = [];
  const focus = [];
  const requests = [];
  const clipboard = [];
  let time = 1000;
  let timerId = 0;
  let urlId = 0;
  let resets = 0;
  let fallback = 0;
  class FakeWorker {
    constructor(url, options) { this.url = url; this.options = options; this.listeners = new Map(); this.removed = []; this.terminated = 0; this.posts = []; workers.push(this); }
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    removeEventListener(type, fn) { this.removed.push(type); if (this.listeners.get(type) === fn) this.listeners.delete(type); }
    terminate() { this.terminated += 1; }
    postMessage(message, ...other) { this.posts.push({ message, other }); }
    emit(data) { this.listeners.get('message')?.({ data }); }
    fail(type) { this.listeners.get(type)?.({ preventDefault() {} }); }
  }
  const environment = {
    File, Blob, Worker: FakeWorker, isSecureContext: true, crypto: globalThis.crypto,
    performance: { now() { return time; } },
    URL: { createObjectURL(blob) { const id = `blob:fake-${++urlId}`; urls.set(id, blob); allBlobs.set(id, blob); return id; }, revokeObjectURL(url) { revoked.push(url); urls.delete(url); } },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn() { timers.delete(id); fn(); }, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    navigator: { clipboard: { async writeText(value) { clipboard.push(value); } } },
  };
  const callbacks = { onChange(view) { views.push(view); }, resetInputs() { resets += 1; }, focus(id) { focus.push(id); },
    copyFallback() { fallback += 1; }, requestDownload(url, name) { requests.push({ url, name }); } };
  const controller = new ChecksumController({ environment, ...callbacks });
  return { controller, environment, callbacks, workers, urls, allBlobs, revoked, timers, views, focus, requests, clipboard,
    get resets() { return resets; }, get fallback() { return fallback; }, set time(value) { time = value; }, get time() { return time; } };
}
function selectStart(h, bytes = [97, 98, 99], name = 'FAKE_abc.bin') {
  const file = new File([Uint8Array.from(bytes)], name);
  h.controller.selectFile(file); h.controller.start();
  return { file, worker: h.workers.at(-1), jobId: h.controller.snapshot.state.activeJobId };
}
function complete(h, hex = ABC, bytes = 3) {
  const worker = h.workers.at(-1);
  const jobId = h.controller.snapshot.state.activeJobId;
  worker.emit({ type: 'stage', jobId, stage: 'reading' });
  worker.emit({ type: 'stage', jobId, stage: 'hashing' });
  worker.emit({ type: 'done', jobId, hex, bytes });
}
function released(h, worker) {
  assert.equal(worker.terminated, 1);
  assert.equal(worker.listeners.size, 0);
  assert.deepEqual(worker.removed.sort(), ['error', 'message', 'messageerror']);
  assert.equal(h.urls.has(worker.url), false);
  assert.equal(h.timers.size, 0);
}

test('controller only selects metadata before start, then uses a fixed module Blob and exact File request', async () => {
  const h = box(); let reads = 0;
  class CountedFile extends File { arrayBuffer() { reads += 1; return super.arrayBuffer(); } }
  const file = new CountedFile(['abc'], 'FAKE_name.bin');
  assert.equal(h.controller.selectFile(file), true);
  assert.equal(reads, 0); assert.equal(h.workers.length, 0); assert.equal(h.urls.size, 0);
  h.controller.start();
  const worker = h.workers[0];
  assert.equal(h.controller.snapshot.state.phase, 'reading');
  assert.deepEqual(worker.options, { type: 'module' });
  assert.equal(h.allBlobs.get(worker.url).type, 'text/javascript');
  assert.equal(await h.allBlobs.get(worker.url).text(), WORKER_SOURCE);
  assert.deepEqual(worker.posts[0].message, { type: 'hash', jobId: 2, file });
  assert.deepEqual(worker.posts[0].other, []);
  assert.equal(reads, 0);
  assert.equal([...h.timers.values()][0].delay, 60000);
  for (let count = 0; count < 10; count += 1) assert.equal(h.controller.start(), false);
  assert.equal(h.workers.length, 1);
  h.controller.clear(); released(h, worker);
});

test('done clears the worker/listeners/deadline/URL; expected edits preserve valid output without a new job', () => {
  const h = box(); const { worker } = selectStart(h);
  h.controller.setExpected(` \t${ABC.toUpperCase()}\r\n`);
  complete(h); released(h, worker);
  assert.equal(h.controller.snapshot.state.hash, ABC);
  assert.equal(h.controller.snapshot.state.comparison, 'match');
  const revision = h.controller.snapshot.state.outputRevision;
  h.controller.setExpected('g'.repeat(64));
  assert.equal(h.controller.snapshot.state.comparison, 'invalid');
  assert.equal(h.controller.snapshot.state.hash, ABC);
  h.controller.setExpected('0'.repeat(64));
  assert.equal(h.controller.snapshot.state.comparison, 'mismatch');
  assert.equal(h.controller.snapshot.state.outputRevision, revision);
  assert.equal(h.workers.length, 1);
});

test('cancel/new selection/clear/pagehide invalidate old callbacks before reading their data', () => {
  for (const action of ['cancel', 'select', 'clear', 'pagehide']) {
    const h = box(); const { worker } = selectStart(h);
    h.controller.setExpected(ABC);
    const queued = worker.listeners.get('message');
    if (action === 'cancel') h.controller.cancel();
    if (action === 'select') h.controller.selectFile(new File(['different'], 'FAKE_B.bin'));
    if (action === 'clear') h.controller.clear();
    if (action === 'pagehide') h.controller.clear({ pagehide: true });
    released(h, worker);
    const current = h.controller.snapshot.state;
    queued({ get data() { throw new Error('FAKE_RAW_LATE_DATA_MUST_NOT_BE_READ'); } });
    assert.strictEqual(h.controller.snapshot.state, current);
    assert.equal(current.hash, null);
    if (action === 'cancel') { assert.equal(current.phase, 'cancelled'); assert.equal(current.fileSize, 3); assert.equal(current.expectedSource, ABC); assert.deepEqual(h.focus, ['calculate']); }
    if (action === 'clear' || action === 'pagehide') { assert.equal(current.phase, 'idle'); assert.equal(current.expectedSource, ''); assert.equal(h.controller.snapshot.hasFile, false); assert.equal(h.resets, 1); }
    if (action === 'pagehide') assert.deepEqual(h.focus, []);
    if (action === 'clear') assert.deepEqual(h.focus, ['file']);
  }
});

test('oversized/non-File selection removes a good result and never constructs a worker or reads bytes', () => {
  const h = box(); selectStart(h); complete(h);
  let reads = 0;
  class LargeMetadata extends File { get size() { return 134217729; } arrayBuffer() { reads += 1; return super.arrayBuffer(); } }
  h.controller.selectFile(new LargeMetadata([], 'FAKE_large.bin'));
  assert.equal(h.controller.snapshot.state.error, 'SIZE_LIMIT');
  assert.equal(h.controller.snapshot.state.hash, null); assert.equal(h.controller.snapshot.hasFile, false);
  assert.equal(h.workers.length, 1); assert.equal(reads, 0);
  h.controller.selectFile({ size: 3, name: 'fake object' });
  assert.equal(h.controller.snapshot.state.error, 'SIZE_INVALID');
  assert.equal(h.workers.length, 1);
});

test('current worker errors/messageerrors/protocol faults clear all owned resources and suppress raw data', () => {
  for (const kind of ['error', 'messageerror', 'invalid', 'worker-error']) {
    const h = box(); const { worker, jobId } = selectStart(h);
    if (kind === 'error' || kind === 'messageerror') worker.fail(kind);
    else if (kind === 'invalid') worker.emit({ type: 'done', jobId, hex: ABC, bytes: 4, raw: 'FAKE_RAW_EXCEPTION' });
    else worker.emit({ type: 'error', jobId, code: 'READ_FAILED' });
    released(h, worker);
    assert.equal(h.controller.snapshot.state.error, { error: 'WORKER_FAILED', messageerror: 'WORKER_MESSAGE_FAILED', invalid: 'WORKER_PROTOCOL', 'worker-error': 'READ_FAILED' }[kind]);
    assert.equal(h.controller.snapshot.state.hash, null);
    assert.doesNotMatch(JSON.stringify(h.views), /FAKE_RAW_EXCEPTION/);
  }
});

test('deadline check and late success reject at the real configured 60000ms boundary; no long wait is simulated as browser PASS', () => {
  for (const source of ['timer', 'message', 'visibility-check']) {
    const h = box(); const { worker, jobId } = selectStart(h);
    h.time = 60999;
    h.controller.checkDeadline();
    assert.equal(h.controller.snapshot.state.phase, 'reading');
    h.time = 61000;
    if (source === 'message') worker.emit({ type: 'done', jobId, hex: ABC, bytes: 3 });
    else if (source === 'timer') [...h.timers.values()][0].fn();
    else h.controller.checkDeadline();
    released(h, worker);
    assert.equal(h.controller.snapshot.state.error, 'TIMEOUT');
    assert.equal(h.controller.snapshot.state.hash, null);
  }
});

test('worker startup/API/post failures revoke created URLs, and startup elapsed time cannot bypass deadline', () => {
  for (const mode of ['create-url', 'construct', 'post', 'elapsed', 'missing-interface']) {
    const h = box();
    if (mode === 'create-url') h.environment.URL.createObjectURL = () => { throw new Error('FAKE_RAW_URL'); };
    if (mode === 'construct') h.environment.Worker = class { constructor() { throw new Error('FAKE_RAW_START'); } };
    if (mode === 'missing-interface') h.environment.Worker = class {};
    if (mode === 'post') { const Base = h.environment.Worker; h.environment.Worker = class extends Base { postMessage() { throw new Error('FAKE_RAW_POST'); } }; }
    if (mode === 'elapsed') { const Base = h.environment.Worker; h.environment.Worker = class extends Base { constructor(...args) { super(...args); h.time = 61000; } }; }
    selectStart(h);
    assert.equal(h.controller.snapshot.state.error, mode === 'elapsed' ? 'TIMEOUT' : 'WORKER_START_FAILED');
    assert.equal(h.controller.snapshot.state.hash, null);
    assert.equal(h.urls.size, 0); assert.equal(h.timers.size, 0);
    if (h.workers.length) { assert.equal(h.workers[0].terminated, 1); if (mode === 'elapsed') assert.equal(h.workers[0].posts.length, 0); }
    assert.doesNotMatch(JSON.stringify(h.views), /FAKE_RAW_/);
  }
});

test('unsupported APIs fail closed with no alternate hashing/network implementation', () => {
  for (const field of ['isSecureContext', 'Worker', 'crypto', 'Blob', 'performance', 'setTimeout']) {
    const h = box(); h.environment[field] = field === 'isSecureContext' ? false : undefined;
    h.controller.selectFile(new File(['abc'], 'FAKE_abc.bin'));
    h.controller.start();
    assert.equal(h.controller.snapshot.state.error, 'UNSUPPORTED_ENVIRONMENT');
    assert.equal(h.workers.length, 0); assert.equal(h.urls.size, 0);
  }
});

test('copy writes only 64 lowercase hex; rejection offers fallback while expected errors preserve copy', async () => {
  const h = box(); selectStart(h); complete(h);
  h.controller.setExpected('invalid expected');
  assert.equal(await h.controller.copy(), true);
  assert.deepEqual(h.clipboard, [ABC]);
  assert.equal(h.clipboard[0].length, 64);
  assert.equal(h.controller.snapshot.outputStatus, 'copied');
  h.environment.navigator.clipboard.writeText = async () => { throw new Error('FAKE_RAW_DENIED'); };
  assert.equal(await h.controller.copy(), false);
  assert.equal(h.controller.snapshot.outputStatus, 'copy-denied');
  assert.equal(h.fallback, 1);
  assert.equal(h.controller.snapshot.state.hash, ABC);
});

test('clear/new job and two same-hash copy requests ignore late resolve/reject feedback', async () => {
  for (const reject of [false, true]) {
    for (const action of ['clear', 'select', 'start', 'pagehide']) {
      const h = box(); selectStart(h); complete(h);
      const pending = deferred(); h.environment.navigator.clipboard.writeText = () => pending.promise;
      const copy = h.controller.copy();
      if (action === 'clear') h.controller.clear();
      if (action === 'select') h.controller.selectFile(new File(['abc'], 'FAKE_next.bin'));
      if (action === 'start') h.controller.start();
      if (action === 'pagehide') h.controller.clear({ pagehide: true });
      if (reject) pending.reject(new Error('FAKE_RAW_LATE_CLIPBOARD')); else pending.resolve();
      assert.equal(await copy, false); assert.equal(h.controller.snapshot.outputStatus, 'idle'); assert.equal(h.fallback, 0);
      h.controller.clear();
    }
  }
  const h = box(); selectStart(h); complete(h);
  const first = deferred(); const second = deferred(); let calls = 0;
  h.environment.navigator.clipboard.writeText = () => ++calls === 1 ? first.promise : second.promise;
  const one = h.controller.copy(); const two = h.controller.copy();
  second.resolve(); assert.equal(await two, true);
  first.reject(new Error('FAKE_OLD_DENIED')); assert.equal(await one, false);
  assert.equal(h.controller.snapshot.outputStatus, 'copied'); assert.equal(h.fallback, 0);
});

test('download requests the fixed name and 65-byte text, with delayed/clear/pagehide URL cleanup', async () => {
  for (const ending of ['timer', 'clear', 'pagehide']) {
    const h = box(); selectStart(h); complete(h);
    assert.equal(h.controller.download(), true);
    assert.equal(DOWNLOAD_NAME, 'glossquote-sha256.txt');
    assert.equal(h.requests.length, 1); assert.equal(h.requests[0].name, 'glossquote-sha256.txt');
    const { url } = h.requests[0]; const blob = h.allBlobs.get(url);
    assert.equal(blob.type, 'text/plain;charset=utf-8'); assert.equal(blob.size, 65);
    assert.equal(await blob.text(), `${ABC}\n`);
    assert.equal(h.controller.snapshot.outputStatus, 'download-requested');
    assert.equal(h.urls.has(url), true);
    if (ending === 'timer') [...h.timers.values()][0].fn();
    if (ending === 'clear') h.controller.clear();
    if (ending === 'pagehide') h.controller.clear({ pagehide: true });
    assert.equal(h.urls.has(url), false); assert.equal(h.timers.size, 0);
  }
});

test('failed/reentrant download and previous pending copy cannot restore output or leak URL', async () => {
  const h = box(); selectStart(h); complete(h);
  const pending = deferred(); h.environment.navigator.clipboard.writeText = () => pending.promise;
  const copy = h.controller.copy(); h.controller.download(); pending.resolve();
  assert.equal(await copy, false); assert.equal(h.controller.snapshot.outputStatus, 'download-requested');
  h.controller.clear(); assert.equal(h.urls.size, 0);
  const failure = box();
  const c = new ChecksumController({ environment: failure.environment, requestDownload() { throw new Error('FAKE_RAW_DOWNLOAD'); } });
  c.selectFile(new File(['abc'], 'fake')); c.start();
  const worker = failure.workers[0]; const id = c.snapshot.state.activeJobId;
  worker.emit({ type: 'stage', jobId: id, stage: 'hashing' }); worker.emit({ type: 'done', jobId: id, hex: ABC, bytes: 3 });
  assert.equal(c.download(), false); assert.equal(c.snapshot.outputStatus, 'download-failed'); assert.equal(failure.urls.size, 0);
  const reentrant = box(); let r;
  r = new ChecksumController({ environment: reentrant.environment, requestDownload() { r.clear({ pagehide: true }); } });
  r.selectFile(new File(['abc'], 'fake')); r.start();
  const rw = reentrant.workers[0]; const rid = r.snapshot.state.activeJobId;
  rw.emit({ type: 'stage', jobId: rid, stage: 'hashing' }); rw.emit({ type: 'done', jobId: rid, hex: ABC, bytes: 3 });
  assert.equal(r.download(), false); assert.equal(r.snapshot.outputStatus, 'idle'); assert.equal(reentrant.urls.size, 0); assert.equal(reentrant.timers.size, 0);
});

test('all work states deny export except a current successful File job', async () => {
  const h = box();
  assert.equal(await h.controller.copy(), false); assert.equal(h.controller.download(), false);
  selectStart(h);
  assert.equal(await h.controller.copy(), false); assert.equal(h.controller.download(), false);
  h.controller.cancel(); assert.equal(await h.controller.copy(), false); assert.equal(h.controller.download(), false);
  h.controller.start(); complete(h); assert.equal(await h.controller.copy(), true);
  h.controller.clear(); assert.equal(await h.controller.copy(), false); assert.equal(h.controller.download(), false);
});

test('filename HTML remains text and control/bidi characters become visible markers', () => {
  assert.equal(displayFileName('<img onerror=fake>\u202e\u000a\u200b.bin'), '<img onerror=fake>U+202EU+000AU+200B.bin');
  const h = box(); h.controller.selectFile(new File(['abc'], '<script>FAKE\u2066.txt'));
  assert.equal(h.controller.snapshot.fileName, '<script>FAKEU+2066.txt');
  assert.equal(h.controller.snapshot.state.fileSize, 3);
});

class Element {
  constructor(id) { this.id = id; this.value = ''; this.textContent = ''; this.dataset = {}; this.attrs = new Map(); this.handlers = new Map(); this.disabled = false; this.hidden = false; this.open = false; this.focused = 0; this.selected = 0; this.files = []; }
  set innerHTML(_value) { throw new Error('UNSAFE_DOM_MUST_NOT_BE_USED'); }
  setAttribute(name, value) { this.attrs.set(name, value); }
  addEventListener(type, fn) { this.handlers.set(type, fn); }
  dispatch(type, event = {}) { this.handlers.get(type)?.(event); }
  focus() { this.focused += 1; }
  select() { this.selected += 1; }
  click() { this.clicked = true; this.dispatch('click'); }
  remove() { this.removed = true; }
}
function fakeDocument(language = 'en') {
  const ids = ['file', 'expected', 'calculate', 'cancel', 'clear', 'copy', 'download', 'checksum', 'status', 'comparison', 'file-meta', 'file-name', 'full-name', 'file-size', 'name-details', 'expected-error', 'support-notice', 'output-status', 'startup-notice'];
  const elements = new Map(ids.map(id => [id, new Element(id)]));
  const handlers = new Map(); const anchors = [];
  return { elements, handlers, anchors, documentElement: { lang: language, dataset: {} }, visibilityState: 'visible',
    getElementById(id) { return elements.get(id) ?? null; }, addEventListener(type, fn) { handlers.set(type, fn); },
    createElement(tag) { assert.equal(tag, 'a'); return new Element('anchor'); }, body: { append(anchor) { anchors.push(anchor); } } };
}

test('DOM adapter in both locales exposes labels/status, preserves cancelled dialog and expected draft, and fallback selects result', async () => {
  for (const language of ['zh-Hant', 'en']) {
    const h = box(); const document = fakeDocument(language); const events = new Map();
    h.environment.addEventListener = (type, fn) => events.set(type, fn);
    const c = mountChecksumApp(document, h.environment);
    const element = id => document.elements.get(id);
    assert.equal(document.documentElement.dataset.preview, 'T02');
    assert.equal(element('calculate').disabled, true); assert.equal(element('clear').disabled, false);
    element('file').files = [new File(['abc'], '<FAKE>\u202e.bin')]; element('file').dispatch('change');
    assert.equal(element('calculate').disabled, false); assert.equal(element('file-name').textContent, '<FAKE>U+202E.bin');
    const selected = c.snapshot.state; element('file').files = []; element('file').dispatch('change'); assert.strictEqual(c.snapshot.state, selected);
    element('expected').value = ' '.repeat(193) + ABC; element('expected').dispatch('input');
    assert.equal(element('expected').value.length, 257); assert.equal(element('expected').attrs.get('aria-invalid'), 'true');
    element('calculate').dispatch('click'); assert.equal(element('cancel').disabled, false); assert.equal(element('clear').disabled, false);
    const worker = h.workers.at(-1); const id = c.snapshot.state.activeJobId;
    worker.emit({ type: 'stage', jobId: id, stage: 'hashing' }); worker.emit({ type: 'done', jobId: id, hex: ABC, bytes: 3 });
    assert.equal(element('checksum').value, ABC); assert.equal(element('copy').disabled, false); assert.equal(element('comparison').dataset.state, 'invalid');
    assert.equal(element('checksum').focused, 0);
    h.environment.navigator.clipboard.writeText = async () => { throw new Error('FAKE_RAW_DENIED'); };
    await c.copy(); assert.equal(element('checksum').focused, 1); assert.equal(element('checksum').selected, 1);
    assert.equal(c.download(), true); assert.equal(document.anchors[0].download, 'glossquote-sha256.txt'); assert.equal(document.anchors[0].removed, true);
    events.get('pagehide')({}); assert.equal(element('file').value, ''); assert.equal(element('expected').value, ''); assert.equal(element('checksum').value, ''); assert.equal(element('file').focused, 0);
    // A persisted pageshow defensively clears restored native input values without focus.
    element('expected').value = 'FAKE_RESTORED'; events.get('pageshow')({ persisted: true });
    assert.equal(element('expected').value, ''); assert.equal(c.snapshot.state.phase, 'idle'); assert.equal(element('file').focused, 0);
    element('clear').dispatch('click'); assert.equal(element('file').focused, 1);
    assert.equal(h.urls.size, 0); assert.equal(h.timers.size, 0);
  }
});

test('DOM visibility hidden preserves work; visible checks deadline without treating it as pagehide', () => {
  const h = box(); const document = fakeDocument(); const events = new Map(); h.environment.addEventListener = (type, fn) => events.set(type, fn);
  const c = mountChecksumApp(document, h.environment);
  c.selectFile(new File(['abc'], 'fake')); c.start();
  document.visibilityState = 'hidden'; document.handlers.get('visibilitychange')({});
  assert.equal(c.snapshot.state.phase, 'reading'); assert.equal(h.workers[0].terminated, 0);
  h.time = 61000; document.visibilityState = 'visible'; document.handlers.get('visibilitychange')({});
  assert.equal(c.snapshot.state.error, 'TIMEOUT'); assert.equal(h.workers[0].terminated, 1); assert.equal(c.snapshot.hasFile, true);
});

test('translations cover every fixed product error and every comparison/output state', () => {
  assert.deepEqual(Object.keys(LOCALES['zh-Hant'].errors).sort(), [...ERROR_CODES].sort());
  assert.deepEqual(Object.keys(LOCALES.en.errors).sort(), [...ERROR_CODES].sort());
  for (const section of ['phases', 'comparisons', 'output', 'errors']) assert.deepEqual(Object.keys(LOCALES['zh-Hant'][section]).sort(), Object.keys(LOCALES.en[section]).sort());
  for (const language of ['zh-Hant', 'en']) for (const code of ERROR_CODES) assert.equal(typeof LOCALES[language].errors[code], 'string');
});

test('interactive HTML is verified separately while original head/remote/ARIA gates remain mandatory', async () => {
  for (const page of ['index.html', 'en/index.html']) {
    const source = await fs.readFile(fileURLToPath(new URL(`../public/${page}`, import.meta.url)), 'utf8');
    assert.equal(validatePreviewHtml(source, page, ASSETS, { mode: 'tool' }).length, 8);
    const variants = [
      [source.replace('id="expected" rows="3"', 'id="expected" maxlength="256" rows="3"'), 'EXPECTED_DRAFT_MUST_NOT_TRUNCATE'],
      [source.replace('rows="3" readonly', 'rows="3"'), 'READONLY_EMPTY_RESULT_REQUIRED'],
      [source.replace('<bdi id="file-name"', '<span id="file-name"').replace('class="file-name"></bdi>', 'class="file-name"></span>'), 'FILENAME_BDI_REQUIRED'],
      [source.replace('aria-describedby="expected-help expected-error"', 'aria-describedby="expected-help"'), 'EXPECTED_ERROR_ASSOCIATION_REQUIRED'],
      [source.replace('<meta name="robots" content="noindex,nofollow">', ''), 'PREVIEW_ROBOTS_REQUIRED'],
    ];
    for (const [html, code] of variants) assert.throws(() => validatePreviewHtml(html, page, ASSETS, { mode: 'tool' }), error => error instanceof ValidationError && error.code === code);
  }
});
