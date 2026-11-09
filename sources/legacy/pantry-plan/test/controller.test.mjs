import test from 'node:test';
import assert from 'node:assert/strict';
import { Controller } from '../public/js/controller.mjs';
import { serializeProject } from '../public/js/core/schema.mjs';
import en from '../public/js/locales/en.mjs';
import zh from '../public/js/locales/zh-Hant.mjs';

const item = (ingredient, quantity, unit = 'g', unitLabel = '') => ({ ingredient, quantity, unit, unitLabel });
const fixture = () => ({ schema: 1, meals: [{ id: 'm1', name: 'Fictional rice', items: [item('Rice', '500'), item('Rice', '0.75', 'kg')] }], stock: [item('Rice', '300')] });
export function harness() {
  const events = [], readers = [], blobs = new Map(), revoked = [], timers = new Map(), downloads = [];
  let sequence = 0;
  const io = {
    createReader() {
      const reader = { readyState: 0, result: null, aborts: 0,
        readAsArrayBuffer(file) { this.file = file; this.readyState = 1; },
        abort() { this.aborts++; this.readyState = 2; this.onabort?.(); },
        complete(text) { this.result = new TextEncoder().encode(text).buffer; this.readyState = 2; this.onload?.(); },
      };
      readers.push(reader); return reader;
    },
    decodeUTF8: buffer => new TextDecoder('utf-8', { fatal: true }).decode(buffer),
    createURL(text, type) { const url = `blob:fake-${++sequence}`; blobs.set(url, new Blob([text], { type })); return url; },
    revokeURL(url) { revoked.push(url); },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    startDownload(url, filename) { downloads.push({ url, filename }); },
    writeClipboard: async () => {},
  };
  const controller = new Controller({ io, onChange: (kind, message) => events.push({ kind, message }) });
  return { controller, io, events, readers, blobs, revoked, timers, downloads };
}
test('controller uses fixed filenames and real UTF-8 Blob bytes, with 30-second delayed revocation', async () => {
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
  for (const [kind, filename] of [['txt', 'pantry-shopping-list.txt'], ['report', 'pantry-shopping-report.json'], ['project', 'pantry-project.json']]) {
    assert.equal(h.controller.download(kind, en), true);
    const download = h.downloads.at(-1); assert.equal(download.filename, filename);
    const bytes = new Uint8Array(await h.blobs.get(download.url).arrayBuffer());
    assert.notDeepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
    const text = new TextDecoder().decode(bytes); assert.ok(text.endsWith('\n')); assert.ok(!text.includes('\r'));
    if (kind === 'txt') assert.ok(text.includes('[ ] Rice: 950 g (Mass)'));
    if (kind === 'report') { const report = JSON.parse(text); assert.equal(report.buy[0].toBuy, '950'); assert.equal(report.buy[0].deductedStock, '300'); assert.ok(report.unitNote.includes('stay separate')); }
    if (kind === 'project') assert.deepEqual(JSON.parse(text), fixture());
    assert.equal(h.revoked.includes(download.url), false);
    assert.equal([...h.timers.values()].at(-1).delay, 30000);
  }
  assert.equal(h.revoked.length, 2);
  const active = h.downloads.at(-1).url;
  [...h.timers.values()][0].fn(); assert.ok(h.revoked.includes(active)); assert.equal(h.controller.urls.size, 0);
});
test('source edits synchronously clear ready outputs, marks and owned URLs before changing inputs', () => {
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
  const key = h.controller.session.result.buy[0].key; h.controller.mark(key, true); h.controller.download('txt', en);
  const url = h.downloads[0].url;
  h.controller.edit(project => {
    assert.equal(h.controller.session.result, null); assert.equal(h.controller.session.checked.size, 0); assert.ok(h.revoked.includes(url));
    project.meals[0].items[0].quantity = '1e3';
  });
  assert.equal(h.controller.calculate(), null); assert.equal(h.controller.session.error.code, 'INVALID_QUANTITY');
  assert.equal(h.controller.download('report', en), false); assert.equal(h.downloads.length, 1);
});
test('late reads after reselection, source edit, cancel and pagehide never restore results', () => {
  for (const action of ['reselect', 'edit', 'cancel', 'dispose']) {
    const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
    h.controller.beginImport({ size: 100 }); const reader = h.readers[0], late = reader.onload;
    if (action === 'reselect') h.controller.beginImport({ size: 100 });
    if (action === 'edit') h.controller.edit(p => { p.meals[0].name = 'Changed'; });
    if (action === 'cancel') h.controller.cancelImport();
    if (action === 'dispose') h.controller.dispose();
    reader.result = new TextEncoder().encode(serializeProject(fixture())).buffer;
    late();
    assert.equal(h.controller.session.pending, null); assert.equal(h.controller.session.result, null); assert.equal(reader.aborts, 1);
  }
});
test('import preview confirms whole project; cancelling retains originals', () => {
  const h = harness(); h.controller.replace(fixture());
  const incoming = fixture(); incoming.meals[0].items[0].ingredient = 'Noodles';
  h.controller.beginImport({ size: 500 }); h.readers[0].complete(serializeProject(incoming));
  assert.equal(h.controller.session.state, 'preview'); assert.equal(h.controller.session.project.meals[0].items[0].ingredient, 'Rice');
  h.controller.cancelImport(); assert.equal(h.controller.session.project.meals[0].items[0].ingredient, 'Rice');
  h.controller.beginImport({ size: 500 }); h.readers[1].complete(serializeProject(incoming));
  assert.equal(h.controller.confirmImport(), true); assert.equal(h.controller.session.project.meals[0].items[0].ingredient, 'Noodles');
  assert.equal(h.controller.session.result, null); assert.equal(h.controller.session.pending, null);
});
test('whole invalid or oversized import leaves source editable and removes previous result', () => {
  for (const text of ['{"schema":2,"meals":[],"stock":[]}', '{bad', '{"schema":1,"meals":[],"stock":[{"ingredient":"A","quantity":"bad","unit":"g","unitLabel":""}]}']) {
    const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
    h.controller.beginImport({ size: text.length }); h.readers[0].complete(text);
    assert.equal(h.controller.session.state, 'error'); assert.equal(h.controller.session.result, null);
    assert.equal(h.controller.session.project.meals[0].items[0].ingredient, 'Rice');
  }
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
  h.controller.beginImport({ size: 2097153 }); assert.equal(h.readers.length, 0); assert.equal(h.controller.session.error.code, 'IMPORT_TOO_LARGE');
});
test('invalid UTF-8 and reader errors are fixed safe codes, without raw exception data', () => {
  const h = harness(); h.controller.replace(fixture());
  h.controller.beginImport({ size: 2 }); const reader = h.readers[0]; reader.result = new Uint8Array([0xc0, 0x80]).buffer; reader.onload();
  assert.equal(h.controller.session.error.code, 'READ_FAILED');
  h.controller.beginImport({ size: 10 }); h.readers[1].onerror(new Error('private raw data'));
  assert.equal(h.controller.session.error.message, 'READ_FAILED');
  assert.equal(JSON.stringify(h.events).includes('private raw data'), false);
});
test('copy reports success only after promise and falls back after denial; stale completion stays silent', async () => {
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
  let finish; h.io.writeClipboard = () => new Promise(resolve => { finish = resolve; });
  const copying = h.controller.copy(en); assert.equal(h.events.at(-1).kind, 'copying');
  finish(); assert.equal(await copying, true); assert.equal(h.events.at(-1).kind, 'copied');
  h.io.writeClipboard = async () => { throw new Error('denied raw'); };
  assert.equal(await h.controller.copy(en), false); assert.equal(h.events.at(-1).kind, 'copy-fallback');
  h.io.writeClipboard = () => new Promise(resolve => { finish = resolve; });
  const stale = h.controller.copy(en); h.controller.edit(p => { p.stock[0].quantity = '0'; }); const eventCount = h.events.length;
  finish(); assert.equal(await stale, false); assert.equal(h.events.length, eventCount);
});
test('purchased marks change report progress without re-deducting stock; editing resets them', () => {
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
  const row = h.controller.session.result.buy[0]; h.controller.mark(row.key, true);
  const report = JSON.parse(h.controller.exportText('report', zh));
  assert.deepEqual([report.buy[0].toBuy, report.buy[0].deductedStock, report.buy[0].purchased], ['950', '300', true]);
  assert.equal(report.unitNote, zh.unitNote);
  h.controller.edit(() => {}); assert.equal(h.controller.session.checked.size, 0);
});
test('pagehide releases downloads and reader references and empties transient source', () => {
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate(); h.controller.download('txt', en);
  const url = h.downloads[0].url; h.controller.dispose();
  assert.equal(h.controller.urls.size, 0); assert.equal(h.timers.size, 0); assert.ok(h.revoked.includes(url));
  assert.equal(h.controller.session.project.meals.length, 0); assert.equal(h.controller.reader, null);
});
test('download failure after URL allocation releases the owned URL and clears result with fixed error', () => {
  const h = harness(); h.controller.replace(fixture()); h.controller.calculate();
  h.io.setTimeout = () => { throw new Error('private raw failure'); };
  assert.equal(h.controller.download('txt', en), false); assert.equal(h.controller.urls.size, 0);
  assert.equal(h.revoked.length, 1); assert.equal(h.controller.session.error.code, 'UNEXPECTED'); assert.equal(h.controller.session.result, null);
});
