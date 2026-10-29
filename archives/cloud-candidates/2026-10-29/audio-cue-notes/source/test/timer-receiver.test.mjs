// 匯入實際 app；DOM/audio 仍為替身，timer 特別模擬 WebIDL receiver 限制。
// 這是 CPU 回歸，不等於原生瀏覽器 WAV 解碼或真下載。
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
let importId = 0;
function harness() {
  let document;
  const audios = [], revoked = [], created = [], clicks = [], timerCalls = [], timers = new Map();
  let sequence = 0;
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.value = ''; this.textContent = ''; this.disabled = false; this.hidden = false; this.children = []; this.listeners = new Map(); this.attributes = new Map(); this.files = []; this.duration = 2; this.currentTime = 0; }
    addEventListener(k, fn) { this.listeners.set(k, [...(this.listeners.get(k) ?? []), fn]); }
    removeEventListener(k, fn) { this.listeners.set(k, (this.listeners.get(k) ?? []).filter(f => f !== fn)); }
    fire(k, event = {}) { for (const fn of [...(this.listeners.get(k) ?? [])]) fn({ preventDefault() {}, ...event }); }
    setAttribute(k, value) { this.attributes.set(k, String(value)); }
    removeAttribute(k) { this.attributes.delete(k); if (k === 'src') this.src = ''; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    focus() { document.activeElement = this; }
    pause() { this.paused = true; }
    load() {}
    click() { if (this.tagName === 'a') clicks.push({ href: this.href, download: this.download }); this.fire('click'); }
    remove() {}
  }
  const nodes = new Map();
  document = { documentElement: { lang: 'en' }, getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); }, querySelectorAll() { return []; }, createElement(tag) { const element = new Element(tag); if (tag === 'audio') audios.push(element); return element; }, body: new Element('body') };
  const window = new Element(); window.confirm = () => true;
  // 以方法錯誤接收 env 時必須 throw；正常 Window 接收者或裸呼叫可以。
  function checkReceiver(receiver, name) { const ok = receiver === window || receiver === undefined || receiver === globalThis; timerCalls.push({ name, receiver: receiver === window ? 'window' : receiver === undefined ? 'undefined' : receiver === globalThis ? 'global' : 'foreign', ok }); if (!ok) throw new TypeError('Illegal invocation'); }
  window.setTimeout = function (callback, delay) { checkReceiver(this, 'setTimeout'); const id = ++sequence; timers.set(id, { callback, delay }); return id; };
  window.clearTimeout = function (id) { checkReceiver(this, 'clearTimeout'); timers.delete(id); };
  return { document, window, audios, revoked, created, clicks, timerCalls, timers, createURL() { const url = `blob:receiver-${++sequence}`; created.push(url); return url; } };
}
async function withApp(action) {
  const h = harness();
  const saved = { document: globalThis.document, window: globalThis.window, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  globalThis.document = h.document; globalThis.window = h.window; globalThis.setTimeout = h.window.setTimeout; globalThis.clearTimeout = h.window.clearTimeout; URL.createObjectURL = () => h.createURL(); URL.revokeObjectURL = url => h.revoked.push(url);
  try {
    const appPath = process.env.AUDIO_APP ?? new URL('../public/app.mjs', import.meta.url).pathname;
    await import(pathToFileURL(resolve(appPath)).href + '?receiver-test=' + (++importId));
    const el = id => h.document.getElementById(id);
    const choose = () => { el('audio-file').files = [{ size: 32044, type: 'audio/wav', name: 'valid-2s.wav' }]; el('audio-file').fire('change'); };
    await action({ ...h, el, choose });
  } finally {
    try { h.window.fire('pagehide'); } catch {}
    globalThis.document = saved.document; globalThis.window = saved.window; globalThis.setTimeout = saved.setTimeout; globalThis.clearTimeout = saved.clearTimeout; URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
  }
}
test('actual app: valid audio metadata survives native-like timer receivers', () => withApp(h => {
  h.choose();
  assert.equal(h.el('error').hidden, true, `Unexpected load error: ${h.el('error').textContent}; timer calls=${JSON.stringify(h.timerCalls)}`);
  assert.equal(h.timers.size, 1);
  h.audios[0].fire('loadedmetadata');
  assert.equal(h.el('duration').textContent, '00:00:02.000');
  assert.equal(h.el('editor-fields').disabled, false);
  assert.equal(h.el('mark').disabled, false);
  assert.equal(h.timers.size, 0);
  assert.ok(h.timerCalls.every(c => c.ok));
}));
test('actual app: downloads and delayed release use correct timer receivers', () => withApp(h => {
  h.choose(); h.audios[0].fire('loadedmetadata');
  h.el('timestamp').value = '00:00:01.000'; h.el('timestamp').fire('input'); h.el('note-text').value = 'Synthetic note'; h.el('note-text').fire('input'); h.el('note-form').fire('submit'); h.el('generate').fire('click');
  h.el('download-txt').fire('click'); h.el('download-json').fire('click');
  assert.equal(h.clicks.length, 2);
  assert.deepEqual(h.clicks.map(x => x.download), ['glossquote-audio-notes.txt', 'glossquote-audio-notes.json']);
  const pending = [...h.timers.values()]; assert.equal(pending.length, 2); assert.ok(pending.every(x => x.delay === 60000));
  pending[0].callback(); assert.equal(h.timers.size, 1);
  h.window.fire('pagehide'); assert.equal(h.timers.size, 0); assert.equal(h.revoked.length, 3); assert.ok(h.timerCalls.every(c => c.ok));
}));
test('actual app: timeout and replacement cleanup keep correct receiver and fence late metadata', () => withApp(h => {
  h.choose(); const late = h.audios[0].listeners.get('loadedmetadata')[0];
  h.choose(); assert.equal(h.revoked.length, 1); late(); assert.equal(h.el('editor-fields').disabled, true);
  const pending = [...h.timers.values()]; assert.equal(pending.length, 1); assert.equal(pending[0].delay, 15000); pending[0].callback();
  assert.equal(h.el('editor-fields').disabled, true); assert.match(h.el('error').textContent, /timed out/); assert.equal(h.timers.size, 0); assert.equal(h.revoked.length, 2); assert.ok(h.timerCalls.every(c => c.ok));
}));
