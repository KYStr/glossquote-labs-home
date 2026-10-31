// DOM 層只處理互動；檔名永遠以 textContent 呈現而不是 HTML。
import { createSession } from './session.mjs';
import { decodeImage, supported } from './browser.mjs';
import { locales } from './locales.mjs';
const l = locales[document.documentElement.lang] ?? locales['zh-Hant'];
const byId = id => document.getElementById(id);
const before = byId('before'), after = byId('after'), settings = byId('settings');
const opacity = byId('opacity'), generate = byId('generate'), cancel = byId('cancel');
const canvas = byId('preview'), wrap = byId('canvas-wrap'), info = byId('result-info');
const available = supported();
let displayed = null;
function paint(state) {
  const busy = ['loading', 'rendering'].includes(state.status);
  before.disabled = after.disabled = !available || busy;
  settings.disabled = !available || busy;
  const same = state.sources.every(Boolean) && state.sources[0].width === state.sources[1].width && state.sources[0].height === state.sources[1].height;
  generate.disabled = !available || busy || !same || state.code === 'SETTINGS'; cancel.disabled = !busy;
  byId('result').setAttribute('aria-busy', String(busy));
  opacity.value = String(state.settings.opacity); byId('opacity-value').textContent = `${state.settings.opacity}%`;
  opacity.disabled = state.settings.mode === 'difference';
  for (const radio of document.querySelectorAll('input[name="mode"]')) radio.checked = radio.value === state.settings.mode;
  for (const [index, id] of ['before', 'after'].entries()) {
    const source = state.sources[index];
    byId(`${id}-meta`).textContent = source ? `${source.name} · ${source.width} × ${source.height} px` : l.empty;
  }
  byId('status').textContent = !available ? l.unsupported : state.code ? l.errors[state.code] ?? l.states.error : l.states[state.status];
  byId('status').classList.toggle('error', state.status === 'error');
  if (state.result !== displayed) {
    displayed = state.result;
    if (displayed) {
      try {
        canvas.width = displayed.width; canvas.height = displayed.height;
        const context = canvas.getContext('2d');
        if (!context) throw Error('RENDER');
        context.putImageData(new ImageData(displayed.data, displayed.width, displayed.height), 0, 0);
        const mode = state.settings.mode === 'difference' ? l.difference : `${l.overlay} · B ${state.settings.opacity}%`;
        info.textContent = `${mode} · ${l.resultInfo}: ${displayed.width} × ${displayed.height} ${l.pixels}`;
        canvas.setAttribute('aria-label', `${l.resultAlt}: ${info.textContent}`);
      } catch {
        // 即使核心成功，Canvas 配置失敗也不能留下先前的影像。
        canvas.width = canvas.height = 1; displayed = null;
        byId('status').textContent = l.errors.RENDER;
      }
    } else { canvas.width = canvas.height = 1; info.textContent = ''; }
    wrap.hidden = !displayed; info.hidden = !displayed; byId('empty-result').hidden = !!displayed;
  }
}
const session = createSession({ decode: decodeImage, onChange: paint });
for (const [slot, input] of [before, after].entries()) input.addEventListener('change', () => {
  const files = Array.from(input.files ?? []); input.value = ''; void session.select(slot, files);
});
for (const radio of document.querySelectorAll('input[name="mode"]')) radio.addEventListener('change', () => session.update({ mode: radio.value }));
opacity.addEventListener('input', () => session.update({ opacity: Number(opacity.value) }));
generate.addEventListener('click', () => { void session.generate(); });
cancel.addEventListener('click', () => session.cancel());
byId('clear').addEventListener('click', () => { session.clear(); before.value = after.value = ''; });
byId('actual-size').addEventListener('change', event => wrap.classList.toggle('actual', event.target.checked));
// pagehide 釋放來源；不永久 dispose，讓返回快取頁面仍可重新選檔。
window.addEventListener('pagehide', () => session.clear());
paint(session.snapshot());
