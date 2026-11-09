// UI 與純核心分離；不使用網路、持久儲存或 HTML 字串插入。
import { LIMITS, formatTimestamp, parseTimestamp, normalizeText, snapshot, exportNotes, validateFile } from './core.mjs';
import { createAudioSession, createDownloads } from './resources.mjs';
import { messages } from './messages.mjs';
const $ = id => document.getElementById(id);
const language = document.documentElement.lang;
const m = messages[language];
const form = $('note-form');
// 第一個事件先攔截 form，初始化失敗也不會送出使用者輸入。
form.addEventListener('submit', event => event.preventDefault());
let durationMs = 0;
let notes = [];
let nextId = 1;
let editingId = null;
let dirty = false;
let loading = false;
let composing = false;
let exports = null;
// 狀態列只放固定介面文字，從不回顯例外或檔案內容。
const status = text => { $('status').textContent = text; };
const error = code => { if (code.startsWith('TIME_')) $('timestamp').setAttribute('aria-invalid', 'true'); if (code === 'TEXT') $('note-text').setAttribute('aria-invalid', 'true'); $('error').textContent = m.errors[code] ?? m.errors.SCHEMA; $('error').hidden = false; };
const clearError = () => { $('timestamp').removeAttribute('aria-invalid'); $('note-text').removeAttribute('aria-invalid'); $('error').textContent = ''; $('error').hidden = true; };
// 每個編輯動作都撤銷唯讀輸出和下載按鈕，避免匯出舊資料。
const invalidate = () => { exports = null; $('txt-report').value = ''; $('json-report').value = ''; $('download-txt').disabled = true; $('download-json').disabled = true; };
const downloads = createDownloads({
  createObjectURL: blob => URL.createObjectURL(blob), revokeObjectURL: url => URL.revokeObjectURL(url),
  // 原生 Window timer 必須保留接收者，不能被 env 方法呼叫改綁 this。
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: id => window.clearTimeout(id),
  clickDownload(url, filename) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  },
});
const session = createAudioSession({
  createAudio: () => { const audio = document.createElement('audio'); audio.controls = true; audio.setAttribute('aria-label', m.player); return audio; },
  createObjectURL: file => URL.createObjectURL(file), revokeObjectURL: url => { if (url) URL.revokeObjectURL(url); },
  // 音訊與下載兩個 adapter 都必須以 Window 呼叫原生 timer。
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: id => window.clearTimeout(id),
}, (audio, duration) => {
  // 只有最新版成功 callback 能到這裡；舊音檔的筆記此時才清除。
  durationMs = duration;
  notes = [];
  nextId = 1;
  loading = false;
  resetEditor();
  invalidate();
  $('audio-host').replaceChildren(audio);
  $('duration').textContent = formatTimestamp(durationMs);
  clearError();
  render();
  status(m.ready);
}, code => {
  // 舊 current 的播放錯誤不能解除較新 pending 音檔的編輯鎖。
  loading = session.loading;
  render();
  error(code);
  status(loading ? m.loading : durationMs ? m.ready : m.empty);
});
// 重設編輯區不觸碰已儲存筆記。
function resetEditor() {
  editingId = null;
  dirty = false;
  composing = false;
  $('timestamp').value = '';
  $('note-text').value = '';
  $('editor-heading').textContent = m.editNew;
}
// 清理可從 pagehide 呼叫，不顯示對話框或移動焦點。
function clearAll() {
  session.clear();
  downloads.clear();
  loading = false;
  durationMs = 0;
  notes = [];
  nextId = 1;
  resetEditor();
  invalidate();
  $('audio-file').value = '';
  $('audio-host').replaceChildren();
  $('duration').textContent = '—';
  clearError();
  render();
  status(m.empty);
}
function confirmDiscard() { return !dirty || window.confirm(m.discard); }
// 列表所有不可信文字以 textContent 呈現，按鈕帶明確列名。
function render() {
  $('editor-fields').disabled = !durationMs || loading;
  $('mark').disabled = !durationMs || loading;
  $('generate').disabled = !durationMs || loading || !notes.length;
  $('audio-host').hidden = loading;
  $('note-count').textContent = m.count(notes.length);
  $('empty-notes').hidden = notes.length > 0;
  $('notes').replaceChildren();
  for (const note of notes) {
    const li = document.createElement('li');
    const time = document.createElement('button');
    time.type = 'button';
    time.className = 'time-code';
    time.textContent = formatTimestamp(note.timeMs);
    time.setAttribute('aria-label', `${m.seek} ${time.textContent}`);
    time.disabled = loading;
    time.addEventListener('click', () => {
      try { session.audio.currentTime = note.timeMs / 1000; } catch { error('PLAYBACK'); }
    });
    const body = document.createElement('p');
    body.className = 'note-body';
    body.textContent = note.text;
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = m.edit;
    edit.setAttribute('aria-label', `${m.edit} ${m.note} ${formatTimestamp(note.timeMs)}`);
    edit.disabled = loading;
    edit.addEventListener('click', () => {
      if (!confirmDiscard()) return;
      invalidate();
      clearError();
      editingId = note.id;
      dirty = true;
      $('timestamp').value = formatTimestamp(note.timeMs);
      $('note-text').value = note.text;
      $('editor-heading').textContent = m.editExisting;
      $('note-text').focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = m.delete;
    remove.setAttribute('aria-label', `${m.delete} ${m.note} ${formatTimestamp(note.timeMs)}`);
    remove.disabled = loading;
    remove.addEventListener('click', () => {
      if (!window.confirm(m.remove)) return;
      notes = notes.filter(item => item.id !== note.id);
      if (editingId === note.id) resetEditor();
      invalidate();
      render();
      status(m.removed);
      $('mark').focus();
    });
    actions.append(edit, remove);
    li.append(time, body, actions);
    $('notes').append(li);
  }
}
$('audio-file').addEventListener('change', () => {
  const file = $('audio-file').files?.[0];
  // 立即重置選擇器，使取消確認或失敗後能重新選取同一檔。
  $('audio-file').value = '';
  if (!file) return;
  try { validateFile({ size: file.size, type: file.type, name: file.name }); } catch (issue) { invalidate(); session.cancelPending(); loading = false; render(); status(durationMs ? m.ready : m.empty); error(issue.message); return; }
  if ((durationMs || dirty || loading) && !window.confirm(m.replace)) return;
  invalidate();
  clearError();
  session.audio?.pause();
  loading = true;
  render();
  status(m.loading);
  try { session.load(file); } catch (issue) { loading = false; render(); error(issue.message); }
});
$('mark').addEventListener('click', () => {
  if (!confirmDiscard()) return;
  if (!session.audio || loading) return;
  session.audio.pause();
  const time = Math.floor(session.audio.currentTime * 1000);
  // 瀏覽器回報異常值時不建立錯誤標記。
  if (!Number.isFinite(time)) { error('TIME_RANGE'); return; }
  resetEditor();
  $('timestamp').value = formatTimestamp(Math.min(durationMs, Math.max(0, time)));
  dirty = true;
  invalidate();
  clearError();
  status(m.marked);
  $('note-text').focus();
});
for (const input of [$('timestamp'), $('note-text')]) {
  input.addEventListener('input', () => { dirty = true; invalidate(); clearError(); });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; });
}
form.addEventListener('submit', () => {
  if (loading || !durationMs) return;
  if (composing) { error('COMPOSING'); return; }
  try {
    const timeMs = parseTimestamp($('timestamp').value, durationMs);
    const text = normalizeText($('note-text').value);
    if (editingId === null && notes.length >= LIMITS.notes) throw new Error('NOTES');
    const id = editingId ?? nextId;
    const updated = [...notes.filter(note => note.id !== id), { id, timeMs, text }];
    notes = snapshot({ durationMs, notes: updated }).notes;
    if (editingId === null) nextId += 1;
    resetEditor();
    invalidate();
    clearError();
    render();
    status(m.saved);
    $('mark').focus();
  } catch (issue) { error(issue.message); }
});
$('cancel-edit').addEventListener('click', () => {
  if (!confirmDiscard()) return;
  resetEditor();
  invalidate();
  clearError();
  status(m.canceled);
  $('mark').focus();
});
$('generate').addEventListener('click', () => {
  invalidate();
  clearError();
  if (dirty) { error('DIRTY'); $('note-text').focus(); return; }
  try {
    exports = exportNotes({ durationMs, notes }, language);
    $('txt-report').value = exports.txt;
    $('json-report').value = exports.json;
    $('download-txt').disabled = false;
    $('download-json').disabled = false;
    status(m.generated);
  } catch (issue) { error(issue.message); }
});
for (const kind of ['txt', 'json']) $('download-' + kind).addEventListener('click', () => {
  if (!exports || dirty || loading) return;
  clearError();
  try { downloads.start(exports[kind], kind); status(m.download); } catch (issue) { error(issue.message); }
});
$('clear-all').addEventListener('click', () => {
  if ((durationMs || dirty || loading) && !window.confirm(m.clear)) return;
  clearAll();
  $('audio-file').focus();
});
for (const link of document.querySelectorAll('[data-leave]')) link.addEventListener('click', event => {
  if ((durationMs || dirty || loading) && !window.confirm(m.leave)) event.preventDefault();
});
// 離頁清空記憶體與輸入；BFCache 回來也不恢復音檔或筆記。
window.addEventListener('pagehide', clearAll);
window.addEventListener('pageshow', event => { if (event.persisted) clearAll(); });
// 所有監聽器就位後才啟用頂層工作區，初始化失敗時維持安全禁用。
clearAll();
$('workspace-fields').disabled = false;
