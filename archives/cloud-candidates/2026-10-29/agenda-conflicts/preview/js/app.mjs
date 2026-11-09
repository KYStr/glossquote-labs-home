// 所有資料僅留在當頁；DOM 只用 value/textContent，不解析使用者標記。
import { checkAgenda, buildReport } from './core.mjs';
import { COPY } from './i18n.mjs';
const get = id => document.getElementById(id);
const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const copy = COPY[locale];
const rootFields = ['dateRaw', 'timeBasisRaw', 'roomBufferRaw', 'speakerBufferRaw'];
const rowFields = ['titleRaw', 'roomRaw', 'speakersRaw', 'startRaw', 'endRaw'];
const fieldLabels = ['title', 'room', 'speakers', 'start', 'end'];
let rows = [], nextId = 1, report = '', composing = false, pending = null, returnFocus = null;
const downloads = new Map();
function element(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
function revokeDownloads() {
  for (const [url, timer] of downloads) { globalThis.clearTimeout(timer); URL.revokeObjectURL(url); }
  downloads.clear();
}
function clearError() {
  get('error').textContent = '';
  for (const input of document.querySelectorAll('input')) { input.removeAttribute('aria-invalid'); if (input.id.includes('-')) input.setAttribute('aria-describedby', 'identity-help'); else input.removeAttribute('aria-describedby'); }
}
function invalidate(message = copy.changed) {
  report = ''; get('report').value = ''; get('result').hidden = true; get('download').disabled = true;
  // 已開始的下載獨立持有 60 秒 lease；編輯只撤銷目前結果與新下載權。
  clearError(); get('status').textContent = message;
}
function wire(input) {
  for (const type of ['input', 'change']) input.addEventListener(type, () => invalidate());
  input.addEventListener('compositionstart', () => { composing = true; invalidate(); });
  input.addEventListener('compositionend', () => { composing = false; invalidate(); });
}
function addRow(focus = true) {
  if (rows.length >= 60 || pending) return;
  invalidate();
  const id = `r${nextId++}`, box = element('fieldset'); box.className = 'session';
  const legend = element('legend'); box.append(legend);
  const grid = element('div'); grid.className = 'row-grid'; box.append(grid);
  const inputs = {};
  for (let i = 0; i < rowFields.length; i++) {
    const key = rowFields[i], label = element('label', copy[fieldLabels[i]]), input = element('input');
    input.id = `${id}-${key}`; input.type = 'text'; input.maxLength = 256; input.setAttribute('aria-describedby', 'identity-help'); input.autocomplete = 'off'; input.spellcheck = false;
    label.htmlFor = input.id; label.append(input); grid.append(label); inputs[key] = input; wire(input);
  }
  const remove = element('button'); remove.type = 'button';
  remove.addEventListener('click', () => {
    if (rows.length <= 1 || pending) return;
    const index = rows.findIndex(row => row.id === id); invalidate();
    for (const input of Object.values(inputs)) input.value = '';
    box.remove(); rows.splice(index, 1); updateRows();
    rows[Math.min(index, rows.length - 1)].inputs.titleRaw.focus();
  });
  box.append(remove); get('rows').append(box); rows.push({ id, inputs, box, legend, remove }); updateRows();
  if (focus) inputs.titleRaw.focus();
}
function updateRows() {
  rows.forEach((row, index) => { row.legend.textContent = copy.session(index + 1); row.remove.textContent = copy.remove(index + 1); row.remove.disabled = rows.length === 1; });
  get('count').textContent = copy.count(rows.length); get('add').disabled = rows.length >= 60;
}
function draft() {
  const data = Object.fromEntries(rootFields.map(key => [key, get(key).value]));
  data.rows = rows.map(row => ({ id: row.id, ...Object.fromEntries(rowFields.map(key => [key, row.inputs[key].value])) }));
  return data;
}
function closeDialog() {
  const dialog = get('confirmation');
  try { dialog.close(); } catch {
    // close 不可用或拋錯時先移出文件，避免留下 modal/inert，再保留同一節點與事件。
    const parent = dialog.parentElement;
    dialog.remove(); dialog.removeAttribute('open'); parent?.append(dialog);
  }
}
function reset() {
  pending = null; returnFocus = null; closeDialog(); get('workspace').disabled = false;
  // 先清掉仍可被引用的 DOM 值，再釋放舊列及下載。
  for (const input of document.querySelectorAll('input')) input.value = '';
  rows = []; get('rows').replaceChildren(); nextId = 1; composing = false; report = '';
  get('roomBufferRaw').value = '0'; get('speakerBufferRaw').value = '0';
  addRow(false); addRow(false); invalidate(copy.empty);
}
function purge() {
  for (const input of document.querySelectorAll('input')) input.value = '';
  rows = []; get('rows').replaceChildren(); composing = false; nextId = 1;
  pending = null; returnFocus = null; closeDialog(); get('workspace').disabled = false;
  revokeDownloads(); invalidate('');
}
function confirmAction(action, origin, message) {
  if (pending) return;
  pending = action; returnFocus = origin; get('confirmation-text').textContent = message;
  get('workspace').disabled = true;
  try {
    get('confirmation').showModal(); get('confirm-cancel').focus();
  } catch {
    // 開啟失敗不是使用者同意：不清草稿、不導覽、不保留 pending 鎖。
    pending = null; returnFocus = null; closeDialog(); get('workspace').disabled = false;
    get('error').textContent = copy.confirmError; origin?.focus();
  }
}
function closeConfirmation(accept) {
  if (!pending) return;
  const action = pending, origin = returnFocus;
  pending = null; returnFocus = null; closeDialog(); get('workspace').disabled = false;
  if (accept) action(); else { get('status').textContent = copy.cancelled; origin?.focus(); }
}
// 先攔截表單 submit，再啟用輸入，JS 未載入時無法提交原文。
get('form').addEventListener('submit', event => {
  event.preventDefault(); if (pending) return;
  invalidate('');
  if (composing) { get('status').textContent = copy.composing; return; }
  const result = checkAgenda(draft());
  if (!result.ok) {
    const error = result.error; get('error').textContent = copy.errors[error.code] || copy.errors.SCHEMA;
    const control = error.row === null ? get(error.field) : rows[error.row]?.inputs[error.field];
    if (control) { control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', 'error'); control.focus(); }
    else get('error').focus();
    return;
  }
  report = buildReport(result.value, locale); get('report').value = report;
  get('result').hidden = false; get('download').disabled = false;
  get('status').textContent = copy.ready(result.value.conflicts.length);
});
rootFields.forEach(key => wire(get(key)));
get('add').addEventListener('click', () => addRow());
get('clear').addEventListener('click', () => confirmAction(() => { reset(); get('dateRaw').focus(); }, get('clear'), copy.clearQuestion));
get('language').addEventListener('click', event => {
  event.preventDefault(); confirmAction(() => { const path = locale === 'en' ? '../index.html' : 'en/index.html'; purge(); location.assign(path); }, get('language'), copy.languageQuestion);
});
get('confirmation').addEventListener('cancel', event => { event.preventDefault(); closeConfirmation(false); });
get('confirm-cancel').addEventListener('click', () => closeConfirmation(false));
get('confirm-accept').addEventListener('click', () => closeConfirmation(true));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && pending) { event.preventDefault(); closeConfirmation(false); } });
get('download').addEventListener('click', () => {
  if (!report || pending) return;
  if (downloads.size >= 8) { get('status').textContent = copy.downloadLimit; return; }
  let url = null, link = null;
  try {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' }); url = URL.createObjectURL(blob);
    link = element('a'); link.href = url; link.download = 'glossquote-agenda-conflicts.txt';
    document.body.append(link); link.click(); link.remove();
    // 不在 click 同步堆疊撤銷；60 秒 lease 不因編輯／清除而縮短，離頁例外立即回收。
    downloads.set(url, globalThis.setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 60_000));
    get('status').textContent = copy.downloadStarted;
  } catch { link?.remove(); if (url) URL.revokeObjectURL(url); get('status').textContent = copy.downloadError; }
});
addEventListener('pagehide', purge);
addEventListener('pageshow', event => { if (event.persisted) reset(); });
reset(); get('workspace').disabled = false;
