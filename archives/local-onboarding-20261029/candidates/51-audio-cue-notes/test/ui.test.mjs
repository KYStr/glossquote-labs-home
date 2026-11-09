import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Workspace } from '../public/js/workspace.js';
import { connectUI } from '../public/js/ui.js';
import { messages } from '../public/js/i18n.js';
import { FakeAudio, fakeUrls, audioFile, fileOf, encode, result, one, many } from './fixtures.mjs';

// A data-only adapter to exercise event wiring. It performs no rendering,
// navigation, real input, focus/IME operation, playback or browser emulation.
class Element {
  constructor(doc, tag = 'div') {
    this.doc = doc; this.tag = tag; this.children = []; this.events = {};
    this.value = ''; this.textContent = ''; this.hidden = false; this.disabled = false;
    this.attributes = {}; this._id = '';
  }
  set id(id) { this._id = id; this.doc.elements.set(id, this); }
  get id() { return this._id; }
  addEventListener(type, handler) { (this.events[type] ??= []).push(handler); }
  setAttribute(key, value) { this.attributes[key] = value; }
  append(...children) { for (const child of children) this.children.push(...(child.tag === 'fragment' ? child.children : [child])); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  focus() { this.doc.activeElement = this; }
  trigger(type) { for (const handler of this.events[type] ?? []) handler({ target: this, preventDefault() {} }); }
}

async function adapter(lang = 'en') {
  const html = await readFile(new URL(`../public/${lang === 'en' ? 'en/' : ''}index.html`, import.meta.url), 'utf8');
  const doc = {
    elements: new Map(), activeElement: null,
    getElementById(id) { return this.elements.get(id); },
    createElement(tag) { return new Element(this, tag); },
    createDocumentFragment() { return new Element(this, 'fragment'); }
  };
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) new Element(doc).id = match[1];
  const audio = new FakeAudio(); const urls = fakeUrls();
  let ui;
  const ws = new Workspace(audio, { urls, changed: reason => ui?.render(reason) });
  const exports = [];
  const download = { error: null, export(value, format) { exports.push([structuredClone(value), format]); return this.error ? { error: this.error } : { ok: true, bytes: 42 }; } };
  ui = connectUI(doc, ws, download, messages[lang], lang);
  ui.render();
  const $ = id => doc.getElementById(id);
  return { ws, audio, urls, doc, $, ui, exports, download };
}

test('offline UI adapter: capture/draft/save/export and literal text wiring in both languages', async () => {
  for (const lang of ['en', 'zh-Hant']) {
    const s = await adapter(lang);
    assert.equal(s.$('capture').disabled, true);
    assert.equal(s.$('export-json').disabled, true);
    s.ws.selectSource(audioFile()); s.audio.metadata(); s.audio.currentTime = 12.345; s.audio.emit('timeupdate');
    assert.equal(s.$('capture').disabled, false);
    s.$('capture').trigger('click');
    assert.equal(s.doc.activeElement, s.$('note-text'));
    assert.equal(s.$('draft-time').textContent, '00:12.345');
    assert.equal(s.ws.result.notes.length, 0);
    s.$('note-text').value = '<script>synthetic</script>\n<img src="fake">';
    s.$('note-form').trigger('submit');
    assert.equal(s.ws.result.notes.length, 1);
    assert.equal(s.$('notes').children[0].children[1].textContent, '<script>synthetic</script>\n<img src="fake">');
    assert.equal(s.$('notes').children[0].children[1].children.length, 0);
    s.$('export-json').trigger('click');
    assert.equal(s.exports[0][1], 'json');
    assert.equal(s.exports[0][0].notes[0].timeMs, 12345);
    assert.equal(s.$('note-text').value, '');
  }
});

test('offline UI adapter: invalid save retains draft text and translated error; cancel clears draft', async () => {
  const s = await adapter('zh-Hant');
  s.ws.selectSource(audioFile()); s.audio.metadata(); s.$('capture').trigger('click');
  s.$('note-text').value = ' \n ';
  s.$('note-form').trigger('submit');
  assert.equal(s.$('note-text').value, ' \n ');
  assert.equal(s.$('error').textContent, messages['zh-Hant'].errors.NOTE_EMPTY);
  assert.equal(s.$('note-text').attributes['aria-invalid'], 'true');
  s.$('cancel-editor').trigger('click');
  assert.equal(s.ws.draft, null);
  assert.equal(s.$('editor').hidden, true);
});

test('offline UI adapter: mismatch preview lists both exact ms, cancel keeps unsaved draft/metadata', async () => {
  const s = await adapter();
  s.ws.selectSource(audioFile()); s.audio.metadata(2);
  s.$('capture').trigger('click'); s.$('note-text').value = 'unsaved draft'; s.$('source-title').value = 'unsaved title';
  await s.ws.previewImport(fileOf(encode(result([one('outside', 3000)], 4000, 'New'))));
  assert.equal(s.$('confirmation-mismatch').hidden, false);
  assert.ok(s.$('confirmation-mismatch').textContent.endsWith('4000 / 2000'));
  assert.equal(s.$('capture').disabled, true);
  s.$('confirmation-actions').children[0].trigger('click');
  assert.equal(s.$('note-text').value, 'unsaved draft');
  assert.equal(s.$('source-title').value, 'unsaved title');
  assert.equal(s.audio.currentTime, 0);
});

test('offline UI adapter: imported range warning, metadata replacement, seek disabled, clear and labels', async () => {
  const s = await adapter();
  s.ws.selectSource(audioFile()); s.audio.metadata(2);
  const title = s.ws.result.sourceTitle;
  s.$('source-title').value = 'unapplied text';
  await s.ws.previewImport(fileOf(encode(result([one('outside', 3000)], 4000, title))));
  s.$('confirmation-actions').children[1].trigger('click');
  assert.equal(s.$('source-title').value, title);
  assert.equal(s.$('source-duration').value, '00:00:04.000');
  const row = s.$('notes').children[0];
  assert.equal(row.children[0].children[0].disabled, true);
  assert.equal(row.children[1].textContent, messages.en.outOfRange);
  s.$('clear').trigger('click');
  assert.equal(s.$('confirmation-heading').textContent, messages.en.clearConfirm);
  s.$('confirmation-actions').children[1].trigger('click');
  assert.equal(s.ws.result, null);
  assert.equal(s.$('source-title').value, '');
  assert.equal(s.$('notes').children.length, 0);
});

test('offline UI adapter: timeline overflow disables capture until explicit adopt', async () => {
  const s = await adapter();
  s.ws.selectSource(audioFile()); s.audio.metadata(20);
  s.ws.setMetadata('Short', '00:00:01.000'); s.audio.currentTime = 12.345; s.audio.emit('timeupdate');
  assert.equal(s.$('capture').disabled, true);
  assert.equal(s.$('over-timeline').hidden, false);
  assert.equal(s.$('adopt-duration').hidden, false);
  s.$('adopt-duration').trigger('click');
  assert.equal(s.ws.result.durationMs, 20000);
  assert.equal(s.$('capture').disabled, false);
});

test('offline UI adapter: oversized Markdown offers JSON only when current JSON serialization succeeds', async () => {
  for (const lang of ['en', 'zh-Hant']) {
    const s = await adapter(lang);
    s.ws.result = result([one('text')]); s.ui.render();
    s.download.error = 'EXPORT_TOO_LARGE';
    s.$('export-markdown').trigger('click');
    assert.ok(s.$('error').textContent.includes(messages[lang].exportJsonAvailable));
    s.ws.result = result(many(700, '\u0001'.repeat(1000)), 0); s.ui.render();
    s.$('export-markdown').trigger('click');
    assert.equal(s.$('error').textContent.includes(messages[lang].exportJsonAvailable), false);
    assert.equal(s.$('error').textContent, messages[lang].errors.EXPORT_TOO_LARGE);
  }
});

test('R01 offline UI adapter: playback failure keeps notes and enables export/attach while capture is disabled', async () => {
  for (const lang of ['en', 'zh-Hant']) {
    const s = await adapter(lang);
    s.ws.selectSource(audioFile()); s.audio.metadata(3);
    s.$('capture').trigger('click'); s.$('note-text').value = 'keep after playback failure';
    s.$('note-form').trigger('submit');
    const original = structuredClone(s.ws.result);
    s.audio.emit('error');
    assert.deepEqual(s.ws.result, original);
    assert.equal(s.$('capture').disabled, true);
    assert.equal(s.$('export-json').disabled, false);
    assert.equal(s.$('source-title').value, original.sourceTitle);
    assert.equal(s.$('notes').children.length, 1);
    assert.equal(s.$('error').textContent, messages[lang].errors.AUDIO_UNSUPPORTED);
    s.$('export-json').trigger('click');
    assert.deepEqual(s.exports[0][0], original);
    s.ws.selectSource(audioFile(8, 'new.wav'));
    assert.equal(s.$('confirmation-heading').textContent, messages[lang].attachConfirm);
  }
});
