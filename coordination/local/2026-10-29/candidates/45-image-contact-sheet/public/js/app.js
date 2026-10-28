import { ContactSheetSession } from './core/session.mjs';
import { sheetLayout } from './core/layout.mjs';
import { copy } from './copy.mjs';

const language = document.documentElement.lang === 'en' ? 'en' : 'zh-TW';
const t = copy[language];
const $ = (id) => document.getElementById(id);
const elements = Object.fromEntries(['files', 'source-list', 'empty-list', 'count', 'columns', 'show-names',
  'generate', 'cancel', 'reset', 'download-png', 'download-text', 'status', 'preview', 'preview-empty',
  'dimensions', 'preview-summary', 'preview-scale', 'workspace', 'capability-error'].map((id) => [id, $(id)]));
let renderedFiles = null, renderedItems = null, renderedError = null;

const supported = typeof globalThis.createImageBitmap === 'function'
  && typeof globalThis.Blob === 'function' && typeof globalThis.TextEncoder === 'function'
  && typeof globalThis.AbortController === 'function' && typeof URL.createObjectURL === 'function'
  && typeof elements.preview.getContext === 'function' && typeof elements.preview.toBlob === 'function';

function textNode(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderList(session) {
  // Keep row controls and keyboard focus stable during progress updates.
  const order = session.files.slice();
  if (renderedFiles?.length === order.length && renderedFiles.every((file, i) => file === order[i])
    && renderedItems === session.items && renderedError === session.error) return;
  const focused = document.activeElement;
  const focusFile = focused?.dataset?.row !== undefined ? renderedFiles?.[Number(focused.dataset.row)] : null;
  const focusAction = focused?.dataset?.action;
  elements['source-list'].replaceChildren();
  const formatter = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  session.files.forEach((file, index) => {
    const row = document.createElement('li');
    const title = textNode('div', '', 'source-title');
    title.append(textNode('span', String(index + 1), 'number'), textNode('bdi', file.name, 'filename'));
    const meta = session.items[index]?.metadata;
    const error = session.error?.details?.index === index;
    const info = textNode('p', `${formatter.format(file.size / 1_048_576)} MiB${meta ? ' · ' + t.format(meta) : ''}`, 'file-info');
    const state = textNode('p', error ? t.rejected : meta ? t.accepted : t.unchecked, 'file-state');
    row.append(title, info, state);
    if (error) row.append(textNode('p', t.errors[session.error.code] ?? t.errors.IMAGE_HEADER_INVALID, 'row-error'));
    if (meta) {
      const expected = meta.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const matchesName = (meta.format === 'jpeg' ? /\.jpe?g$/iu : /\.png$/iu).test(file.name);
      if (!matchesName || (file.type && file.type !== expected)) row.append(textNode('p', t.mismatch, 'file-info'));
    }
    const actions = textNode('div', '', 'row-actions');
    for (const [action, label, symbol, disabled] of [
      ['up', t.up, '↑', index === 0], ['down', t.down, '↓', index === session.files.length - 1], ['remove', t.remove, '×', false],
    ]) {
      const button = textNode('button', symbol, 'icon-button');
      button.type = 'button'; button.dataset.action = action; button.dataset.row = String(index);
      button.setAttribute('aria-label', t.actionName(label, index + 1, file.name));
      button.title = label; button.disabled = disabled;
      button.addEventListener('click', () => {
        if (action === 'remove') void session.replaceFiles(session.files.filter((_, i) => i !== index));
        else session.reorder(index, action === 'up' ? -1 : 1);
      });
      actions.append(button);
    }
    row.append(actions); elements['source-list'].append(row);
  });
  renderedFiles = order; renderedItems = session.items; renderedError = session.error;
  if (focusFile && focusAction) {
    const newIndex = session.files.indexOf(focusFile);
    const target = elements['source-list'].querySelector(`[data-row="${newIndex}"][data-action="${focusAction}"]`);
    if (target && !target.disabled) target.focus({ preventScroll: true });
    else if (newIndex >= 0) elements['source-list'].querySelector(`[data-row="${newIndex}"][data-action="remove"]`)?.focus({ preventScroll: true });
    else {
      const neighbor = Math.min(Number(focused.dataset.row), session.files.length - 1);
      const remaining = elements['source-list'].querySelector(`[data-row="${neighbor}"][data-action="remove"]`);
      (remaining ?? elements.files).focus({ preventScroll: true });
    }
  }
}

function statusText(session) {
  const p = session.progress;
  if (session.error) {
    const message = t.errors[session.error.code] ?? t.errors.IMAGE_HEADER_INVALID;
    const file = session.files[session.error.details?.index];
    return file ? t.fileError(file.name, message) : t.batchError(message);
  }
  switch (session.phase) {
    case 'preflighting': return t.preflighting(p?.index ?? 0, session.files.length);
    case 'ready': return t.ready(session.files.length);
    case 'rendering': return t.rendering(p?.index ?? 0, session.files.length);
    case 'encoding': return t.encoding;
    case 'cancelling': return t.cancelling;
    case 'result': return t.result(session.result);
    case 'stale': return session.items.length ? t.stale : t.cancelledPreflight;
    default: return t.idle;
  }
}

function render(session) {
  renderList(session);
  elements.count.textContent = t.count(session.files.length);
  elements['empty-list'].hidden = session.files.length > 0;
  elements['empty-list'].textContent = t.empty;
  elements.status.textContent = statusText(session);
  elements.status.dataset.state = session.phase;
  elements.workspace.setAttribute('aria-busy', String(session.busy));
  elements.generate.disabled = !supported || session.busy || !session.files.length;
  elements.generate.textContent = session.files.length && !session.items.length ? t.recheck : t.generate;
  elements.cancel.disabled = !session.busy || session.phase === 'cancelling';
  elements.reset.disabled = !session.files.length && !session.busy;
  elements['download-png'].disabled = !session.result || session.busy;
  elements['download-text'].disabled = !session.result || session.busy;
  elements['show-names'].checked = session.options.showNames;
  let layout = null;
  try { if (session.files.length) layout = sheetLayout(session.files.length, session.options.columns); } catch { /* Error is shown by the selection/generation gate. */ }
  elements.columns.value = String(layout?.columns ?? session.options.columns ?? 4);
  elements.dimensions.textContent = layout ? t.dimensions(layout) : '—';
  const showResult = session.phase === 'result' && session.result !== null;
  elements.preview.hidden = !showResult;
  elements['preview-empty'].hidden = showResult;
  elements['preview-scale'].disabled = !showResult;
  if (!showResult) { elements['preview-scale'].value = 'fit'; elements.workspace.dataset.scale = 'fit'; }
  elements['preview-summary'].textContent = showResult ? t.summary(session.result) : t.pendingPreview;
}

const session = new ContactSheetSession({ canvas: elements.preview, onChange: render });
elements.files.addEventListener('change', () => {
  const selected = Array.from(elements.files.files ?? []);
  elements.files.value = '';
  if (selected.length) void session.replaceFiles([...session.files, ...selected]);
});
elements.columns.addEventListener('change', () => session.setOptions({ columns: Number(elements.columns.value) }));
elements['show-names'].addEventListener('change', () => session.setOptions({ showNames: elements['show-names'].checked }));
elements['preview-scale'].addEventListener('change', () => { elements.workspace.dataset.scale = elements['preview-scale'].value === 'actual' ? 'actual' : 'fit'; });
elements.generate.addEventListener('click', () => void session.generate());
elements.cancel.addEventListener('click', () => session.cancel());
elements.reset.addEventListener('click', () => { elements.files.value = ''; session.reset(); });
function download(kind) {
  session.download(kind, (url, name) => {
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
    document.body.append(anchor); anchor.click(); anchor.remove();
  });
}
elements['download-png'].addEventListener('click', () => download('png'));
elements['download-text'].addEventListener('click', () => download('text'));
globalThis.addEventListener('pagehide', () => { elements.files.value = ''; session.dispose(); });
// Restore an empty session after back/forward cache navigation; no previous File or output survives.
globalThis.addEventListener('pageshow', (event) => { if (event.persisted) session.resume(render); });
if (!supported) {
  elements.files.disabled = true; elements['capability-error'].hidden = false;
  elements['capability-error'].textContent = t.unavailable;
}
render(session);
