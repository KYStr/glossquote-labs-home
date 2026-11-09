import { validateSource } from './core/text-chunker.mjs';
import { messages } from './i18n.mjs';
import { createState, changeDraft, calculate, clearDraft, beginCopy, finishCopy, dispose } from './state.mjs';

const language = document.documentElement.lang;
const words = messages[language];
const numbers = new Intl.NumberFormat(language);
const n = value => numbers.format(value);
const byId = id => document.getElementById(id);
const form = byId('chunk-form');
const source = byId('source');
const limit = byId('limit');
const mode = byId('mode');
const split = byId('split');
const clear = byId('clear');
const status = byId('status');
const list = byId('chunks');
const summary = byId('result-summary');
const empty = byId('empty');
const pages = byId('pagination');
const pageChoice = byId('page-choice');
const previous = byId('previous');
const next = byId('next');
const PAGE_SIZE = 25;
let state = createState();
let composing = false;
let page = 1;
let pendingSnapshot = null;

function announce(text, kind = 'info') {
  status.textContent = `${kind === 'error' ? '! ' : kind === 'success' ? '✓ ' : '• '}${text}`;
  status.dataset.kind = kind;
}

function fields() {
  for (const [field, control] of [['source', source], ['limit', limit], ['mode', mode]]) {
    const code = state.fieldErrors[field];
    const error = byId(`${field}-error`);
    error.textContent = code ? `! ${words.errors[code]}` : '';
    error.hidden = !code;
    control.setAttribute('aria-invalid', String(Boolean(code)));
  }
  const validation = validateSource(state.source);
  byId('source-count').textContent = validation.ok
    ? words.sourceCount(n(validation.codePointLength), n(validation.utf16Length))
    : words.rawCount(n(state.source.length));
}

function lockControls() {
  const busy = state.copy.busy || state.disposed;
  for (const control of [source, limit, mode, split, clear, pageChoice]) control.disabled = busy;
  split.disabled = busy || composing;
  form.setAttribute('aria-busy', String(busy));
  for (const button of list.querySelectorAll('button')) button.disabled = busy;
  previous.disabled = busy || page <= 1;
  next.disabled = busy || !state.result || page >= Math.ceil(state.result.chunks.length / PAGE_SIZE);
}

function selectFallback(index) {
  const textarea = byId(`chunk-${index}`);
  if (!textarea) return;
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
}

function copyChunk(index) {
  const copyState = state;
  const ticket = beginCopy(copyState, index);
  if (!ticket) return;
  lockControls();
  announce(words.busy(n(index)));
  const settled = kind => {
    if (state !== copyState || !finishCopy(copyState, ticket, kind)) return;
    lockControls();
    if (kind === 'copied') announce(words.copied(n(index)), 'success');
    else {
      selectFallback(index);
      announce(words.fallback(n(index)));
    }
  };
  let promise;
  try {
    pendingSnapshot = copyState.result.chunks[index - 1].text;
    if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
    promise = navigator.clipboard.writeText(pendingSnapshot);
  } catch {
    pendingSnapshot = null;
    settled('fallback');
    return;
  }
  pendingSnapshot = null;
  Promise.resolve(promise).then(() => settled('copied'), () => settled('fallback'));
}

function renderChunks() {
  list.replaceChildren();
  pageChoice.replaceChildren();
  const result = state.result;
  empty.hidden = Boolean(result);
  summary.hidden = !result;
  pages.hidden = !result || result.chunks.length <= PAGE_SIZE;
  if (!result) { summary.textContent = ''; lockControls(); return; }
  summary.textContent = words.resultCount(n(result.sourceCodePointCount), n(result.chunks.length));
  const totalPages = Math.ceil(result.chunks.length / PAGE_SIZE);
  page = Math.min(page, totalPages);
  for (let p = 1; p <= totalPages; p += 1) {
    const option = document.createElement('option');
    option.value = String(p);
    option.textContent = words.pageOption(n(p), n((p - 1) * PAGE_SIZE + 1), n(Math.min(p * PAGE_SIZE, result.chunks.length)));
    pageChoice.append(option);
  }
  pageChoice.value = String(page);
  const from = (page - 1) * PAGE_SIZE;
  byId('page-range').textContent = words.page(n(from + 1), n(Math.min(from + PAGE_SIZE, result.chunks.length)), n(result.chunks.length));
  const fragment = document.createDocumentFragment();
  for (const chunk of result.chunks.slice(from, from + PAGE_SIZE)) {
    const item = document.createElement('li');
    item.className = 'chunk';
    const header = document.createElement('div');
    header.className = 'chunk-header';
    const label = document.createElement('label');
    label.htmlFor = `chunk-${chunk.index}`;
    label.textContent = words.chunk(n(chunk.index));
    const count = document.createElement('span');
    count.className = 'chunk-count';
    count.textContent = words.count(n(chunk.codePointCount));
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = words.copy(n(chunk.index));
    button.dataset.chunkIndex = String(chunk.index);
    button.addEventListener('click', () => copyChunk(chunk.index));
    header.append(label, count, button);
    const preview = document.createElement('textarea');
    preview.id = `chunk-${chunk.index}`;
    preview.className = 'chunk-text';
    preview.readOnly = true;
    preview.spellcheck = false;
    preview.rows = Math.max(2, Math.min(8, chunk.text.split('\n').length + 1));
    preview.value = chunk.text;
    item.append(header, preview);
    fragment.append(item);
  }
  list.append(fragment);
  lockControls();
}

function draftChanged(field, control) {
  if (!changeDraft(state, field, control.value)) return;
  page = 1;
  fields();
  renderChunks();
  const error = Object.values(state.fieldErrors)[0];
  announce(error ? words.errors[error] : composing ? words.composing : words.changed, error ? 'error' : 'info');
}

source.addEventListener('input', () => draftChanged('source', source));
limit.addEventListener('input', () => draftChanged('limitRaw', limit));
mode.addEventListener('change', () => draftChanged('mode', mode));
source.addEventListener('compositionstart', () => {
  composing = true;
  draftChanged('source', source);
  lockControls();
  announce(words.composing);
});
source.addEventListener('compositionend', () => {
  composing = false;
  draftChanged('source', source);
  lockControls();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (composing || state.copy.busy || state.disposed) return;
  byId('results').setAttribute('aria-busy', 'true');
  const result = calculate(state);
  fields();
  page = 1;
  renderChunks();
  byId('results').setAttribute('aria-busy', 'false');
  if (!result) return;
  announce(result.ok ? words.success(n(result.chunks.length)) : words.errors[result.code], result.ok ? 'success' : 'error');
});
clear.addEventListener('click', () => {
  if (!clearDraft(state)) return;
  source.value = '';
  limit.value = state.limitRaw;
  mode.value = state.mode;
  pendingSnapshot = null;
  page = 1;
  fields();
  renderChunks();
  announce(words.idle);
  source.focus();
});
function goToPage(target) {
  if (state.copy.busy || !state.result) return;
  page = target;
  renderChunks();
}
previous.addEventListener('click', () => goToPage(page - 1));
next.addEventListener('click', () => goToPage(page + 1));
pageChoice.addEventListener('change', () => goToPage(Number(pageChoice.value)));

window.addEventListener('pagehide', () => {
  dispose(state);
  pendingSnapshot = null;
  source.value = '';
  limit.value = '';
  list.replaceChildren();
  summary.textContent = '';
  pageChoice.replaceChildren();
  lockControls();
});
window.addEventListener('pageshow', () => {
  if (state.disposed) state = createState();
  // Reset DOM form restoration too: page memory is the only source of truth.
  source.value = state.source;
  limit.value = state.limitRaw;
  mode.value = state.mode;
  composing = false;
  fields();
  renderChunks();
  announce(words.idle);
});
source.value = state.source;
limit.value = state.limitRaw;
mode.value = state.mode;
fields();
renderChunks();
announce(words.idle);
