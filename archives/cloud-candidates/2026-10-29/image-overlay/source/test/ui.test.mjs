// 用受控 DOM 替身檢查真 app 事件串接；不宣稱真實瀏覽器或輔助科技覆蓋。
import test from 'node:test';
import assert from 'node:assert/strict';
import { file, png, frame, tick } from './helpers.mjs';
import { locales } from '../public/js/locales.mjs';
class Element {
  constructor(id) { this.id = id; this.events = new Map(); this.textContent = ''; this.hidden = false; this.value = ''; this.files = []; this.disabled = false; this.checked = false; this.width = this.height = 1; this.classList = { toggle() {} }; this.attributes = {}; }
  addEventListener(type, callback) { this.events.set(type, callback); }
  setAttribute(key, value) { this.attributes[key] = value; }
  dispatch(type) { this.events.get(type)?.({ target: this }); }
  getContext() { return { drawImage() {}, getImageData: () => ({ data: frame().data }), putImageData: data => { this.painted = data; } }; }
}
async function setup(language) {
  const keys = ['document', 'window', 'createImageBitmap', 'ImageData'], originals = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  const ids = ['before', 'after', 'settings', 'opacity', 'generate', 'cancel', 'preview', 'canvas-wrap', 'result-info', 'result', 'opacity-value', 'before-meta', 'after-meta', 'status', 'empty-result', 'clear', 'actual-size'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element(id)])); elements['canvas-wrap'].hidden = elements['result-info'].hidden = true;
  const radios = ['overlay', 'difference'].map(mode => { const e = new Element(mode); e.value = mode; return e; });
  const window = new Element('window');
  globalThis.window = window;
  globalThis.document = { documentElement: { lang: language }, getElementById: id => elements[id], querySelectorAll: () => radios, createElement: () => new Element('canvas') };
  globalThis.createImageBitmap = async () => ({ width: 2, height: 1, close() {} });
  globalThis.ImageData = class { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; } };
  await import(`../public/js/app.mjs?test=${language}`);
  const wait = async predicate => { for (let i = 0; i < 30 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 1)); assert.ok(predicate(), 'UI did not settle'); };
  const select = async (id, name = 'fixture.png') => { elements[id].files = [file(png(), name)]; elements[id].dispatch('change'); await wait(() => !elements[id].disabled); };
  const cleanup = () => { window.dispatch('pagehide'); for (const [key, value] of Object.entries(originals)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; };
  return { elements, radios, window, wait, select, cleanup };
}
for (const language of ['zh-Hant', 'en']) test(`${language}: app wiring, names, stale preview, mode and pagehide reset`, async () => {
  const { elements: e, radios, window, wait, select, cleanup } = await setup(language);
  try {
    assert.equal(e.generate.disabled, true); assert.equal(e.status.textContent, locales[language].states.idle);
    const name = '<svg onload=alert(1)>.png'; await select('before', name); await select('after');
    assert.ok(e['before-meta'].textContent.includes(name)); assert.equal(e.generate.disabled, false);
    e.generate.dispatch('click'); await wait(() => !e['canvas-wrap'].hidden);
    assert.equal(e.preview.painted.data.length, 8); assert.equal(e['empty-result'].hidden, true);
    e.opacity.value = '0'; e.opacity.dispatch('input'); assert.equal(e['canvas-wrap'].hidden, true); assert.equal(e.preview.width, 1);
    assert.equal(e['opacity-value'].textContent, '0%');
    radios[1].dispatch('change'); assert.equal(e.opacity.disabled, true);
    e.generate.dispatch('click'); await wait(() => !e['canvas-wrap'].hidden);
    assert.deepEqual([...e.preview.painted.data], [0, 0, 0, 255, 0, 0, 0, 255]);
    window.dispatch('pagehide'); assert.equal(e['canvas-wrap'].hidden, true); assert.equal(e.generate.disabled, true);
    await select('before'); await select('after'); assert.equal(e.generate.disabled, false);
    e.clear.dispatch('click'); assert.equal(e['before-meta'].textContent, locales[language].empty); assert.equal(e['opacity-value'].textContent, '50%');
  } finally { cleanup(); }
});
