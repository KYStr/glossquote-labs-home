// These are lightweight Node wiring fakes, NOT a browser/clipboard/download gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mountApp } from '../public/js/app.js';

class ElementFake {
  constructor(tag = 'div', attrs = '') {
    this.tag = tag; this.children = []; this.listeners = new Map(); this.attributes = new Map();
    this.value = ''; this.checked = false; this.disabled = /\bdisabled\b/.test(attrs);
    this.hidden = /\bhidden\b/.test(attrs); this.dataset = {}; this.files = [];
    this.text = ''; this.href = ''; this.download = '';
  }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ''; this.children = children; }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  removeAttribute(key) { this.attributes.delete(key); if (key === 'href' || key === 'download') this[key] = ''; }
  addEventListener(name, handler) { const list = this.listeners.get(name) ?? []; list.push(handler); this.listeners.set(name, list); }
  async dispatch(name, event = {}) { for (const handler of this.listeners.get(name) ?? []) await handler(event); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}

async function fixture(language, clipboard) {
  const file = language === 'en' ? '../public/en/index.html' : '../public/index.html';
  const html = await readFile(new URL(file, import.meta.url), 'utf8');
  const nodes = new Map();
  for (const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) nodes.set(match[3], new ElementFake(match[1], match[2]));
  const created = [], revoked = [];
  const window = new ElementFake();
  const document = { documentElement: { lang: language, dataset: {} },
    getElementById: id => { assert.ok(nodes.has(id), `Real HTML must contain #${id}`); return nodes.get(id); },
    createElement: tag => new ElementFake(tag),
  };
  const app = mountApp({ document, window, navigator: { clipboard }, sessionOptions: {
    createUrl: blob => { created.push(blob); return `blob:fake-${created.length}`; },
    revokeUrl: url => revoked.push(url), makeBlob: (bytes, type) => ({ bytes, type }),
  } });
  const ui = id => nodes.get(id);
  const edit = async (id, value) => { ui(id).value = value; await ui(id).dispatch('input'); };
  return { ...app, ui, edit, window, created, revoked };
}

for (const language of ['zh-Hant', 'en']) {
  test(`${language}: real HTML wiring from example to per-row preview and both fixed exports`, async () => {
    let copied = '';
    const h = await fixture(language, { writeText: async value => { copied = value; } });
    assert.equal(h.ui('generate').disabled, true);
    assert.equal(h.ui('preview').textContent, '');
    await h.ui('sample').dispatch('click');
    assert.equal(h.ui('generate').disabled, false);
    assert.equal(h.created.length, 0);
    await h.ui('generate').dispatch('click');
    assert.equal(h.created.length, 2);
    assert.equal(h.ui('download-txt').download, 'personalized-text.txt');
    assert.equal(h.ui('download-json').download, 'personalized-text.json');
    assert.equal(h.ui('previous').disabled, true);
    assert.match(h.ui('preview').textContent, language === 'en' ? /Hello Alex/ : /您好小王/);
    await h.ui('next').dispatch('click');
    assert.match(h.ui('preview').textContent, language === 'en' ? /Hello Sam/ : /您好小林/);
    await h.ui('copy').dispatch('click');
    assert.equal(copied, h.ui('preview').textContent);
    assert.match(h.ui('copy-status').textContent, language === 'en' ? /Copied row 2/ : /已複製第 2 筆/);
    h.ui('row-number').value = '3'; await h.ui('jump').dispatch('click');
    assert.equal(h.ui('next').disabled, true);
    await h.edit('template', language === 'en' ? '{{ID}}' : '{{編號}}');
    assert.equal(h.ui('download-txt').href, '');
    assert.equal(h.ui('download-json').hidden, true);
    assert.equal(h.ui('preview').textContent, '');
    assert.equal(h.ui('stale-notice').hidden, false);
    assert.equal(h.ui('copy-status').textContent, '');
    assert.deepEqual(h.revoked, ['blob:fake-1', 'blob:fake-2']);
  });
}
test('unknown fields are listed together and missing fields block until explicit opt-in', async () => {
  const h = await fixture('en');
  await h.edit('csv', 'Name,ID\nA,\nB,002');
  await h.edit('template', '{{Address}} {{Email}}');
  assert.equal(h.ui('generate').disabled, true);
  assert.match(h.ui('unknown-fields').textContent, /\{\{Address\}\}.*\{\{Email\}\}/);
  await h.edit('template', '{{ID}}');
  assert.equal(h.ui('generate').disabled, true);
  assert.match(h.ui('missing').textContent, /data rows 1/);
  h.ui('allow-blank').checked = true; await h.ui('allow-blank').dispatch('change');
  assert.equal(h.ui('blank-warning').hidden, false);
  assert.equal(h.ui('generate').disabled, false);
  await h.ui('generate').dispatch('click');
  assert.equal(h.ui('preview').textContent, '');
  assert.equal(h.ui('preview-content').hidden, false);
  assert.match(h.ui('blank-record').textContent, /ID/);
});
test('malicious cell/name text reaches only text nodes; denied clipboard has selectable fallback', async () => {
  const h = await fixture('en', { writeText: async () => { throw new Error('DENIED_PRIVATE'); } });
  const payload = '<img src=x onerror=alert(1)>{{Other}} $&';
  await h.edit('csv', `Name\n${payload}`); await h.edit('template', '{{Name}}');
  await h.ui('generate').dispatch('click'); await h.ui('copy').dispatch('click');
  assert.equal(h.ui('preview').textContent, payload);
  assert.equal(h.ui('preview').children.length, 0);
  assert.equal(h.ui('copy-fallback').hidden, false);
  assert.equal(h.ui('copy-text').value, payload);
  assert.ok(!h.ui('copy-status').textContent.includes('DENIED_PRIVATE'));
  await h.ui('select-text').dispatch('click');
  assert.equal(h.ui('copy-text').selected, true);
  await h.window.dispatch('pagehide');
  assert.equal(h.ui('copy-text').value, '');
  assert.equal(h.ui('csv').value, ''); assert.equal(h.ui('template').value, '');
  assert.equal(h.session.getState().source, null);
  assert.equal(h.ui('download-txt').href, '');
  assert.deepEqual(h.revoked, ['blob:fake-1', 'blob:fake-2']);
});
test('copy completion after an input edit cannot revive old success or fallback text', async () => {
  let rejectCopy;
  const h = await fixture('en', { writeText: () => new Promise((resolve, reject) => { rejectCopy = reject; }) });
  await h.ui('sample').dispatch('click'); await h.ui('generate').dispatch('click');
  const copy = h.ui('copy').dispatch('click');
  await h.edit('template', '{{ID}}'); rejectCopy(new Error('denied')); await copy;
  assert.equal(h.ui('copy-status').textContent, '');
  assert.equal(h.ui('copy-fallback').hidden, true);
});
test('oversized file never calls its reader; late synthetic file read after reset is discarded', async () => {
  const h = await fixture('en'); let reads = 0;
  h.ui('csv-file').files = [{ name: '../../fake.csv', size: 1_048_577, arrayBuffer: async () => { reads++; } }];
  await h.ui('csv-file').dispatch('change');
  assert.equal(reads, 0); assert.match(h.ui('validation-error').textContent, /1 MiB/);
  let finish;
  h.ui('csv-file').files = [{ name: '<img>.csv', size: 6, arrayBuffer: () => new Promise(resolve => { finish = resolve; }) }];
  const reading = h.ui('csv-file').dispatch('change');
  await h.ui('reset').dispatch('click'); finish(new TextEncoder().encode('Name\nA').buffer); await reading;
  assert.equal(h.session.getState().source, null);
  assert.equal(h.ui('source-status').textContent, '');
});

async function editedPasteFixture(language) {
  const h = await fixture(language);
  const headers = language === 'en' ? ['Name', 'ID'] : ['姓名', '編號'];
  const original = `${headers.join(',')}\r\nRevised,001\r\nFixed draft,`;
  const template = `{{${headers[0]}}} / {{${headers[1]}}}`;
  await h.edit('csv', `${headers.join(',')}\r\nBefore editing,000`);
  await h.edit('csv', original);
  await h.edit('template', template);
  h.ui('allow-blank').checked = true;
  await h.ui('allow-blank').dispatch('change');
  await h.ui('generate').dispatch('click');
  assert.equal(h.session.getState().result.records[0].text, 'Revised / 001');
  return { ...h, language, headers, original, template };
}
function chooseSyntheticFile(h, name, size, arrayBuffer) {
  h.ui('csv-file').files = [{ name, size, arrayBuffer }];
  h.ui('csv-file').value = `selected:${name}`;
  return h.ui('csv-file').dispatch('change');
}
function assertKeptAndInactive(h) {
  assert.equal(h.ui('csv').value, h.original);
  assert.equal(h.ui('template').value, h.template);
  assert.equal(h.ui('allow-blank').checked, true);
  assert.equal(h.session.getState().template, h.template);
  assert.equal(h.session.getState().allowBlank, true);
  assert.equal(h.session.getState().source, null);
  assert.equal(h.session.getState().valid, false);
  assert.equal(h.session.getState().result, null);
  assert.equal(h.session.getState().urls, null);
  assert.equal(h.ui('generate').disabled, true);
  assert.equal(h.ui('preview').textContent, '');
  assert.equal(h.ui('download-txt').href, '');
  assert.equal(h.ui('download-json').hidden, true);
  assert.deepEqual(h.revoked, ['blob:fake-1', 'blob:fake-2']);
  assert.match(h.ui('source-status').textContent, h.language === 'en' ? /pasted text is kept/ : /原貼文.*保留/);
  assert.ok(!h.ui('source-status').textContent.includes('selected:'));
}
const bufferOf = text => new TextEncoder().encode(text).buffer;

for (const language of ['zh-Hant', 'en']) {
  for (const failure of ['oversized', 'read rejection', 'malformed CSV', 'invalid UTF-8']) {
    test(`R01 ${language}: ${failure} keeps edited pasted data, template and option; old output invalidates`, async () => {
      const h = await editedPasteFixture(language);
      let reads = 0;
      const reading = chooseSyntheticFile(h, 'rejected.csv', failure === 'oversized' ? 1_048_577 : 32, async () => {
        reads++;
        if (failure === 'read rejection') throw new Error('PRIVATE_READ_FAILURE');
        if (failure === 'invalid UTF-8') return Uint8Array.of(0xff).buffer;
        return bufferOf(`${h.headers.join(',')}\nBad,"unfinished`);
      });
      assertKeptAndInactive(h);
      await reading;
      assertKeptAndInactive(h);
      const code = failure === 'oversized' ? 'FILE_TOO_LARGE' : failure === 'invalid UTF-8' ? 'INVALID_UTF8' : 'CSV_SYNTAX';
      assert.equal(h.session.getState().error.code, code);
      assert.equal(reads, failure === 'oversized' ? 0 : 1);
      assert.equal(h.ui('validation-error').hidden, false);
      assert.ok(!h.ui('validation-error').textContent.includes('PRIVATE_READ_FAILURE'));
      assert.equal(h.ui('csv-file').value, '');
      assert.equal(h.ui('csv-file').attributes.get('aria-invalid'), 'true');
      assert.equal(h.ui('csv').attributes.get('aria-invalid'), 'false');
      assert.equal(h.ui('reuse-paste').hidden, false);
      await h.ui('reuse-paste').dispatch('click');
      assert.equal(h.ui('csv').value, h.original);
      assert.equal(h.ui('generate').disabled, false);
      assert.equal(h.ui('reuse-paste').hidden, true);
      await h.ui('generate').dispatch('click');
      assert.deepEqual(h.session.getState().result.records.map(record => record.text), ['Revised / 001', 'Fixed draft / ']);
    });
  }
  test(`R01 ${language}: cancel reading retains the edited paste and discards a late successful read`, async () => {
    const h = await editedPasteFixture(language);
    let finish;
    const reading = chooseSyntheticFile(h, 'cancelled.csv', 32, () => new Promise(resolve => { finish = resolve; }));
    assertKeptAndInactive(h);
    assert.equal(h.ui('cancel').hidden, false);
    await h.ui('cancel').dispatch('click');
    assertKeptAndInactive(h);
    assert.equal(h.ui('csv-file').value, '');
    assert.equal(h.session.getState().error.code, 'CANCELLED');
    finish(bufferOf(`${h.headers.join(',')}\nLate replacement,900`));
    await reading;
    assertKeptAndInactive(h);
    assert.equal(h.session.getState().error.code, 'CANCELLED');
    assert.equal(h.ui('reuse-paste').hidden, false);
  });
  test(`R01 ${language}: only a validated current file clears pasted text and becomes the source`, async () => {
    const h = await editedPasteFixture(language);
    let finish;
    const reading = chooseSyntheticFile(h, 'replacement.csv', 32, () => new Promise(resolve => { finish = resolve; }));
    assertKeptAndInactive(h);
    finish(bufferOf(`${h.headers.join(',')}\nReplacement,900`));
    await reading;
    assert.equal(h.ui('csv').value, '');
    assert.equal(h.ui('template').value, h.template);
    assert.equal(h.ui('allow-blank').checked, true);
    assert.equal(h.session.getState().sourceLabel, 'replacement.csv');
    assert.deepEqual(h.session.getState().source.rows, [['Replacement', '900']]);
    assert.equal(h.ui('generate').disabled, false);
    assert.equal(h.ui('reuse-paste').hidden, true);
    assert.equal(h.ui('download-txt').href, '');
    await h.ui('generate').dispatch('click');
    assert.equal(h.session.getState().result.records[0].text, 'Replacement / 900');
  });
  test(`R01 ${language}: template edit during reading invalidates the file token without clearing the paste`, async () => {
    const h = await editedPasteFixture(language);
    let finish;
    const reading = chooseSyntheticFile(h, 'stale-template.csv', 32, () => new Promise(resolve => { finish = resolve; }));
    h.template += '\nUpdated';
    await h.edit('template', h.template);
    assertKeptAndInactive(h);
    assert.equal(h.ui('csv-file').value, '');
    finish(bufferOf(`${h.headers.join(',')}\nStale file,999`)); await reading;
    assertKeptAndInactive(h);
    await h.ui('reuse-paste').dispatch('click');
    await h.ui('generate').dispatch('click');
    assert.equal(h.session.getState().result.records[0].text, 'Revised / 001\nUpdated');
  });
  test(`R01 ${language}: option edit during reading rejects late file data and keeps the new option`, async () => {
    const h = await editedPasteFixture(language);
    let finish;
    const reading = chooseSyntheticFile(h, 'stale-option.csv', 32, () => new Promise(resolve => { finish = resolve; }));
    h.ui('allow-blank').checked = false; await h.ui('allow-blank').dispatch('change');
    assert.equal(h.ui('csv-file').value, '');
    finish(bufferOf(`${h.headers.join(',')}\nStale file,999`)); await reading;
    assert.equal(h.ui('csv').value, h.original);
    assert.equal(h.ui('template').value, h.template);
    assert.equal(h.session.getState().allowBlank, false);
    assert.equal(h.session.getState().source, null);
    assert.equal(h.ui('download-txt').href, '');
    await h.ui('reuse-paste').dispatch('click');
    assert.equal(h.session.getState().error.code, 'MISSING_VALUES');
    assert.equal(h.ui('generate').disabled, true);
  });
  test(`R01 ${language}: a new paste during reading cannot be erased by the late file`, async () => {
    const h = await editedPasteFixture(language);
    let finish;
    const reading = chooseSyntheticFile(h, 'stale-paste.csv', 32, () => new Promise(resolve => { finish = resolve; }));
    const edited = `${h.headers.join(',')}\nNewest pasted edit,007`;
    await h.edit('csv', edited);
    finish(bufferOf(`${h.headers.join(',')}\nStale file,999`)); await reading;
    assert.equal(h.ui('csv').value, edited);
    assert.deepEqual(h.session.getState().source.rows, [['Newest pasted edit', '007']]);
    assert.equal(h.ui('reuse-paste').hidden, true);
    await h.ui('generate').dispatch('click');
    assert.equal(h.session.getState().result.records[0].text, 'Newest pasted edit / 007');
  });
  test(`R01 ${language}: an older valid file cannot overwrite a newer rejected file or erase the kept paste`, async () => {
    const h = await editedPasteFixture(language);
    let finish;
    const oldReading = chooseSyntheticFile(h, 'older.csv', 32, () => new Promise(resolve => { finish = resolve; }));
    await chooseSyntheticFile(h, 'newer-invalid.csv', 32, async () => bufferOf(`${h.headers.join(',')}\nWrong width`));
    assert.equal(h.session.getState().error.code, 'ROW_WIDTH');
    finish(bufferOf(`${h.headers.join(',')}\nOlder file,999`)); await oldReading;
    assertKeptAndInactive(h);
    assert.equal(h.session.getState().error.code, 'ROW_WIDTH');
    assert.equal(h.ui('reuse-paste').hidden, false);
  });
}
