// 頁面控制器只持有目前練習；沒有網路、儲存或歷史。
import { parseCSV, createOrder, progressJSON, printableText } from './core/flashcards.mjs';
import { messages } from './i18n.mjs';

export function mount(document, window) {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const copy = messages[locale];
  const node = id => document.getElementById(id);
  const form = node('editor-form');
  const source = node('source');
  const shuffle = node('shuffle');
  const urls = new Map();
  let practice = null;
  let composing = false;
  let active = true;
  let restoringFocus = true;
  const supported = typeof TextEncoder === 'function';

  // 第一個 listener 先堵住原生提交，所有輸入最後才啟用。
  form.addEventListener('submit', event => { event.preventDefault(); start(); });
  const announce = text => { node('status').textContent = text; };
  const clearError = () => { node('error').textContent = ''; source.removeAttribute('aria-invalid'); };
  function showError(code, record = null, invalidInput = false) {
    node('error').textContent = (copy.errors[code] || copy.errors.SCHEMA) + (record === null ? '' : copy.record(record));
    if (invalidInput) source.setAttribute('aria-invalid', 'true');
  }
  function syncDownloads() {
    const disabled = !active || !practice || urls.size >= 4;
    node('download-progress').disabled = disabled;
    node('download-print').disabled = disabled;
    if (active && practice && urls.size >= 4 && !node('error').textContent) showError('DOWNLOAD_LIMIT');
    if (urls.size < 4 && node('error').textContent === copy.errors.DOWNLOAD_LIMIT) node('error').textContent = '';
  }
  function revoke(url) {
    if (!urls.has(url)) return;
    const timer = urls.get(url);
    if (timer !== null) window.clearTimeout(timer);
    urls.delete(url);
    // 原生撤銷失敗不得復活舊文字，也不暴露例外。
    try { window.URL.revokeObjectURL(url); } catch { /* 清除頁面持有的引用即可。 */ }
    syncDownloads();
  }
  function revokeAll() { for (const url of [...urls.keys()]) revoke(url); }
  function invalidate(message = '') {
    practice = null;
    // 已交接下載的lease保留至60秒；立即清掉工作內容與新下載權。
    node('practice').hidden = true;
    node('exports').hidden = true;
    for (const id of ['question', 'answer', 'position', 'summary', 'rating']) node(id).textContent = '';
    node('print-preview').value = '';
    node('preview-details').open = false;
    for (const id of ['reveal', 'again', 'remembered', 'previous', 'next', 'download-progress', 'download-print']) node(id).disabled = true;
    node('start').textContent = copy.start;
    clearError();
    announce(message);
  }
  function draw() {
    if (!practice) return;
    const id = practice.order[practice.position - 1];
    const card = practice.cards[id - 1];
    node('practice').hidden = false;
    node('exports').hidden = false;
    node('position').textContent = copy.position(practice.position, practice.cards.length, id);
    node('question').textContent = card.question;
    node('answer').textContent = practice.revealed ? card.answer : '';
    node('answer-region').hidden = !practice.revealed;
    node('reveal').disabled = practice.revealed;
    node('again').disabled = !practice.revealed;
    node('remembered').disabled = !practice.revealed;
    node('previous').disabled = practice.position === 1;
    node('next').disabled = practice.position === practice.cards.length;
    node('rating').textContent = copy.currentRating(copy[practice.ratings[id - 1]]);
    node('summary').textContent = copy.summary(practice.cards.length, practice.ratings.filter(value => value === 'remembered').length, practice.ratings.filter(value => value === 'again').length);
    syncDownloads();
    node('start').textContent = copy.restart;
  }
  function start() {
    if (!active || composing || node('editor').disabled) return;
    invalidate();
    const parsed = parseCSV(source.value);
    if (!parsed.ok) { showError(parsed.code, parsed.record, true); source.focus(); return; }
    const order = createOrder(parsed.value, shuffle.checked);
    if (!order.ok) { showError(order.code); return; }
    practice = { cards: parsed.value, ratings: parsed.value.map(() => 'unreviewed'), order: order.value, position: 1, revealed: false };
    const printable = printableText(practice.cards, locale);
    if (!printable.ok) { invalidate(); showError('SCHEMA'); return; }
    node('print-preview').value = printable.value;
    draw();
    announce(copy.started);
    node('position').focus();
  }
  function changed() {
    if (!active) return;
    invalidate(copy.dirty);
  }
  source.addEventListener('input', changed);
  source.addEventListener('change', changed);
  shuffle.addEventListener('input', changed);
  shuffle.addEventListener('change', changed);
  source.addEventListener('compositionstart', () => { composing = true; node('start').disabled = true; changed(); });
  source.addEventListener('compositionend', () => { composing = false; if (active) node('start').disabled = false; changed(); });

  // 只在已顯示答案後評分；重複評分覆寫同一來源 ID，不增加虛假次數。
  node('reveal').addEventListener('click', () => {
    if (!practice || practice.revealed) return;
    practice.revealed = true;
    draw(); announce(copy.shown); node('answer-heading').focus();
  });
  for (const rating of ['again', 'remembered']) node(rating).addEventListener('click', () => {
    if (!practice || !practice.revealed) return;
    practice.ratings[practice.order[practice.position - 1] - 1] = rating;
    draw(); announce(copy.rated);
  });
  for (const [id, step] of [['previous', -1], ['next', 1]]) node(id).addEventListener('click', () => {
    if (!practice) return;
    const next = practice.position + step;
    if (next < 1 || next > practice.cards.length) return;
    practice.position = next; practice.revealed = false;
    draw(); announce(copy.moved); node('position').focus();
  });
  node('example').addEventListener('click', () => {
    if (!active) return;
    invalidate(copy.sample); source.value = copy.sampleCSV; shuffle.checked = false;
    source.focus();
  });

  // 每次下載都是明確 gesture；不讀剪貼簿、不自動保存。
  function download(kind) {
    if (!practice || !active) return;
    clearError();
    if (urls.size >= 4) { showError('DOWNLOAD_LIMIT'); return; }
    const result = kind === 'progress' ? progressJSON(practice) : printableText(practice.cards, locale);
    if (!result.ok) { showError(result.code); return; }
    let url = null;
    let anchor = null;
    try {
      const type = kind === 'progress' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8';
      const blob = new window.Blob([result.value], { type });
      url = window.URL.createObjectURL(blob);
      // 先登記URL，timer建立失敗也能由catch回收，不遺漏已建立Blob引用。
      urls.set(url, null);
      const timer = window.setTimeout(() => revoke(url), 60_000);
      urls.set(url, timer);
      anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = kind === 'progress' ? 'flashcards-progress.json' : 'flashcards-print.txt';
      document.body.append(anchor);
      anchor.click();
      announce(copy.downloaded);
      syncDownloads();
      if (urls.size >= 4) showError('DOWNLOAD_LIMIT');
    } catch {
      if (url !== null) revoke(url);
      showError('DOWNLOAD');
    } finally { anchor?.remove(); }
  }
  node('download-progress').addEventListener('click', () => download('progress'));
  node('download-print').addEventListener('click', () => download('print'));

  function reset(message = '', focus = false) {
    invalidate(message); source.value = ''; shuffle.checked = false; composing = false;
    node('start').disabled = !active;
    if (node('clear-dialog').open) {
      restoringFocus = false;
      node('clear-dialog').close();
    }
    if (focus) source.focus();
  }
  node('clear').addEventListener('click', () => {
    if (!active) return;
    try {
      restoringFocus = true;
      node('clear-dialog').showModal();
      node('cancel-clear').focus();
    } catch { showError('DIALOG'); }
  });
  node('cancel-clear').addEventListener('click', () => node('clear-dialog').close());
  node('clear-dialog').addEventListener('cancel', event => { event.preventDefault(); node('clear-dialog').close(); });
  node('clear-dialog').addEventListener('close', () => { if (restoringFocus && active) node('clear').focus(); });
  node('confirm-clear').addEventListener('click', () => { reset(copy.cleared, true); });
  function leave() {
    active = false;
    reset();
    revokeAll();
    node('editor').disabled = true;
  }
  window.addEventListener('pagehide', leave);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (!supported) { leave(); showError('UNSUPPORTED'); return; }
    active = true; reset(copy.ready); node('editor').disabled = false;
  });
  node('language-link').addEventListener('click', leave);

  // 功能失敗前原生 fieldset 保持 disabled；不以雲端備援繞過能力限制。
  if (!supported) { active = false; showError('UNSUPPORTED'); return { destroy: leave }; }
  reset(copy.ready);
  node('editor').disabled = false;
  node('start').disabled = false;
  node('init-status').hidden = true;
  return { destroy: leave };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') mount(document, window);
