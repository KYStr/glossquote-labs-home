import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mountApp } from '../public/js/app.mjs';
import { fakeDocument, descendants, ancestor } from './fake-dom.mjs';

async function app(language) {
  const source = await readFile(new URL('../public/' + (language === 'en' ? 'en/' : '') + 'index.html', import.meta.url), 'utf8');
  const doc = fakeDocument(source, language), events = new Map(), blobs = new Map(), revoked = [], readers = [], timers = new Map(); let sequence = 0;
  class Reader {
    constructor() { this.readyState = 0; readers.push(this); }
    readAsArrayBuffer() { this.readyState = 1; }
    abort() { this.readyState = 2; this.aborted = true; this.onabort?.(); }
    finish(source) { this.result = new TextEncoder().encode(source).buffer; this.readyState = 2; this.onload(); }
  }
  const platform = { Blob, TextEncoder, TextDecoder, FileReader: Reader,
    URL: { createObjectURL(blob) { const id = 'blob:mock-' + ++sequence; blobs.set(id, blob); return id; }, revokeObjectURL(id) { revoked.push(id); blobs.delete(id); } },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); },
    addEventListener(type, callback) { events.set(type, callback); }
  };
  const controller = mountApp(doc, platform);
  const get = id => { const node = doc.getElementById(id); assert.ok(node, id + ' exists'); return node; };
  const input = (id, value) => { get(id).value = value; get(id).dispatch('input'); };
  const submit = id => ancestor(get(id), 'form').dispatch('submit');
  return { doc, controller, get, input, submit, events, blobs, revoked, readers, platform };
}

for (const language of ['zh-Hant', 'en']) {
  test('offline fake DOM (' + language + '): real form wiring adds, searches, edits, moves, exports and clears (not browser PASS)', async () => {
    const h = await app(language); const { controller: c, get, input, submit, doc } = h;
    assert.ok(c); assert.equal(get('application-controls').disabled, false); assert.equal(c.view().counts.boxes, 0);
    input('new-box-room', '廚房'); get('new-box-form').dispatch('submit'); assert.equal(c.view().project.boxes[0].id, 'BX001');
    input('add-item-name', '<script>alert(1)</script>'); input('add-item-quantity', '2'); submit('add-item-name');
    assert.equal(c.view().counts.items, 1); assert.equal(get('add-item-name').value, ''); assert.equal(c.view().dirty, false);
    input('new-box-room', '書房'); get('new-box-form').dispatch('submit'); assert.equal(c.view().counts.boxes, 2);
    input('search-input', '<script>'); assert.equal(c.search()[0].boxId, 'BX001'); assert.ok(get('search-list').textContent.includes('<script>alert(1)</script>'));
    assert.equal(descendants(get('search-list')).filter(element => element.tagName === 'SCRIPT').length, 0);
    get('box-select').value = 'BX001'; get('box-select').dispatch('change');
    get('move-I000001').value = 'BX002'; get('move-I000001').dispatch('change'); submit('move-I000001'); assert.deepEqual(c.view().project.boxes.map(box => box.items.length), [0, 1]);
    get('box-select').value = 'BX002'; get('box-select').dispatch('change');
    const edit = descendants(get('workspace')).find(element => element.tagName === 'BUTTON' && /^(Edit item:|編輯物品:)/.test(element.getAttribute('aria-label') ?? ''));
    edit.click(); input('item-I000001-quantity', '1e2'); submit('item-I000001-quantity'); assert.equal(c.view().code, 'INVALID_QUANTITY'); assert.equal(get('item-I000001-quantity').getAttribute('aria-invalid'), 'true');
    input('item-I000001-quantity', '3'); submit('item-I000001-quantity'); assert.equal(c.view().project.boxes[1].items[0].quantity, 3);
    input('edit-box-id', 'BX001'); submit('edit-box-id'); assert.equal(c.view().code, 'DUPLICATE_BOX_ID'); assert.equal(get('edit-box-id').getAttribute('aria-invalid'), 'true');
    assert.equal(c.view().project.boxes[1].id, 'BX002');
    input('edit-box-id', 'BX002'); submit('edit-box-id'); assert.equal(c.view().dirty, false);
    get('export-mode').value = 'json'; get('export-mode').dispatch('change'); get('prepare-export').click(); assert.equal(get('download-export').disabled, false);
    assert.ok(get('output-text').value.includes('<script>alert(1)</script>')); get('download-export').click();
    assert.equal(doc.downloads[0].filename, 'moving-boxes-project.json'); assert.equal(h.blobs.size, 1); assert.equal(get('download-export').disabled, true);
    get('clear-all').click(); assert.deepEqual(c.view().counts, { boxes: 0, items: 0 }); assert.equal(h.blobs.size, 0); assert.equal(get('output-text').value, '');
  });
  test('offline fake DOM (' + language + '): confirm/cancel import, draft retention and language warning', async () => {
    const { controller: c, get, input, submit } = await app(language);
    get('load-example').click(); input('add-item-name', 'unsaved');
    const saved = c.view().project; input('import-text', '{"schemaVersion":1,"boxes":[]}'); get('parse-import').focus(); get('parse-import').click();
    assert.equal(get('confirmation').hidden, false); get('cancel-action').click(); assert.deepEqual(c.view().project, saved); assert.equal(get('add-item-name').value, 'unsaved');
    assert.equal(get('parse-import').doc.activeElement, get('parse-import'));
    get('parse-import').click(); get('confirm-action').click(); assert.equal(c.view().counts.boxes, 0); assert.equal(c.view().dirty, false);
    const event = get('language-link').dispatch('click'); assert.equal(event.defaultPrevented, true); assert.equal(get('language-confirmation').hidden, false); get('language-cancel').click(); assert.equal(get('language-confirmation').hidden, true);
    input('new-box-room', 'Office'); get('new-box-form').dispatch('submit'); input('add-item-name', 'Keep me');
    input('edit-box-id', 'RENAMED'); submit('edit-box-id'); assert.equal(get('add-item-name').value, 'Keep me'); assert.equal(c.view().dirty, true);
  });
}
test('offline fake DOM: pagehide releases data and URLs; BFCache returns an empty usable page', async () => {
  const { controller: c, get, events, blobs, readers } = await app('en');
  get('load-example').click(); get('prepare-export').click(); assert.equal(blobs.size, 1);
  get('import-file').files = [{ size: 40 }]; get('import-file').dispatch('change'); const stale = readers[0];
  events.get('pagehide')(); stale.finish('{"schemaVersion":1,"boxes":[]}');
  assert.deepEqual(c.view().counts, { boxes: 0, items: 0 }); assert.equal(blobs.size, 0); assert.equal(get('application-controls').disabled, true);
  events.get('pageshow')({ persisted: true }); assert.equal(get('application-controls').disabled, false); assert.equal(get('search-input').value, ''); assert.equal(c.view().confirmation, null);
});
test('offline fake DOM: invalid search clears old results immediately', async () => {
  const { controller: c, get, input } = await app('en'); get('load-example').click(); input('search-input', 'Charger'); assert.equal(get('search-list').children.length, 1);
  input('search-input', '\ud800'); assert.equal(c.view().code, 'INVALID_TEXT'); assert.equal(get('search-list').children.length, 0); assert.equal(get('search-input').getAttribute('aria-invalid'), 'true');
});
test('offline fake DOM: failed rename retains unsaved new-item drafts in both boxes', async () => {
  const { get, input, submit } = await app('en'); get('load-example').click(); input('add-item-name', 'first draft');
  get('box-select').value = 'BX002'; get('box-select').dispatch('change'); input('add-item-name', 'second draft');
  input('edit-box-id', 'BX001'); submit('edit-box-id'); assert.equal(get('add-item-name').value, 'second draft');
  get('box-select').value = 'BX001'; get('box-select').dispatch('change'); assert.equal(get('add-item-name').value, 'first draft');
});
test('offline fake DOM: unsupported platform keeps all editing controls disabled with fixed error', async () => {
  const { doc, get } = await app('en');
  assert.equal(mountApp(doc, {}), null); assert.equal(get('application-controls').disabled, true); assert.equal(get('error').hidden, false); assert.ok(get('error').textContent.includes('no cloud fallback'));
});
