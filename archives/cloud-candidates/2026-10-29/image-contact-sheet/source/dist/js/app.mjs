import { LIMITS, validateSelection, inspectImage, layout, contain, move, filenameIndex, displayName } from './core.mjs';
import { words } from './words.mjs';
// 只依固定靜態頁的語言選訊息，使用者資料不寫入網址或儲存空間。
const t = words[document.documentElement.lang] || words.en;
const $ = id => document.getElementById(id);
const form = $('settings');
// 先攔截表單提交，避免初始化之後意外導覽或把輸入放入 URL。
form.addEventListener('submit', event => { event.preventDefault(); if (!active) void generate(); });
const input = $('files');
const list = $('items');
const status = $('status');
const settings = ['columns','tile','gap','margin','labels'].map($);
let items = [];
let generation = 0;
let epoch = 0;
let decodeLease = null;
let active = null;
let result = null;
let enabled = false;
// 下載 URL 至多兩個，過期、編輯、取消與離頁均回收。
const downloads = new Map();
function revokeDownloads() {
  for (const value of downloads.values()) { clearTimeout(value.timer); URL.revokeObjectURL(value.url); }
  downloads.clear();
}
function dispose(records) { for (const record of records) { record.canvas.width = 0; record.canvas.height = 0; } }
function announce(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
// 同步失效先於任何非同步作業，舊結果無法被後來的 callback 復活。
function invalidate() {
  generation++;
  revokeDownloads();
  if (result) { result.canvas.width = 0; result.canvas.height = 0; }
  result = null;
  $('preview').replaceChildren();
  $('empty').hidden = false;
  controls();
}
function options() {
  // 空欄不是零：原生 required 之外，純邏輯也拒絕缺漏值。
  if (['columns','tile','gap','margin'].some(id => $(id).value.trim() === '')) throw new Error('SETTINGS');
  return { columns: Number($('columns').value), tile: Number($('tile').value), gap: Number($('gap').value), margin: Number($('margin').value), labels: $('labels').checked };
}
function controls() {
  input.disabled = !enabled || Boolean(active) || items.length >= LIMITS.count;
  for (const field of settings) field.disabled = !enabled || Boolean(active);
  $('build').disabled = !enabled || Boolean(active) || !items.length || Boolean(result);
  $('png').disabled = !result || Boolean(active);
  $('index').disabled = !result || Boolean(active);
  $('clear').disabled = !enabled || (!items.length && !active && !result);
  $('cancel').hidden = !active;
  $('cancel').disabled = !active || active.cancelled;
  $('build').classList.toggle('primary', !result);
  $('png').classList.toggle('primary', Boolean(result));
  form.setAttribute('aria-busy', String(Boolean(active)));
  for (const button of list.querySelectorAll('button')) button.disabled = Boolean(active) || button.dataset.boundary === 'true';
  $('count').textContent = `${items.length} / ${LIMITS.count}`;
  $('estimate').textContent = '';
  if (items.length) { try { const plan = layout(items.length, options()); $('estimate').textContent = t.layout(plan.width, plan.height); } catch { /* 產生時顯示完整錯誤。 */ } }
}
// 重新建立清單時只使用 textContent；檔名不會成為 HTML。
function renderList(focusIndex, focusAction) {
  list.replaceChildren();
  items.forEach((item, index) => {
    const li = document.createElement('li');
    const preview = document.createElement('div'); preview.className = 'thumb';
    item.canvas.setAttribute('role', 'img'); item.canvas.setAttribute('aria-label', `${t.item} ${index + 1}`); preview.append(item.canvas);
    const description = document.createElement('div'); description.className = 'item-description';
    const name = document.createElement('b'); name.textContent = `${index + 1}. ${displayName(item.name)}`; name.dir = 'auto';
    const size = document.createElement('span'); size.textContent = `${item.width} × ${item.height} px`;
    description.append(name, size);
    const actions = document.createElement('div'); actions.className = 'item-actions';
    for (const [action, label, boundary] of [['up',t.up,index === 0],['down',t.down,index === items.length - 1],['remove',t.remove,false]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.setAttribute('aria-label', `${label}: ${t.item} ${index + 1}`); button.dataset.boundary = String(boundary); button.dataset.action = action;
      button.addEventListener('click', () => {
        if (active) return;
        invalidate();
        if (action === 'remove') {
          dispose([items[index]]); items.splice(index, 1); renderList(Math.min(index, items.length - 1), 'remove'); announce(t.removed(items.length));
        } else {
          const target = index + (action === 'up' ? -1 : 1); items = move(items, index, target); renderList(target, action); announce(t.moved(target + 1));
        }
      });
      actions.append(button);
    }
    li.append(preview, description, actions); list.append(li);
  });
  controls();
  if (focusIndex !== undefined) {
    const row = list.children[focusIndex];
    const target = row?.querySelector(`[data-action="${focusAction}"]:not(:disabled)`) || row?.querySelector('button:not(:disabled)') || input;
    target.focus();
  }
}
function begin() { invalidate(); const job = { token: generation, epoch, cancelled: false }; active = job; controls(); return job; }
function current(job) { return active === job && job.epoch === epoch && generation === job.token && !job.cancelled; }
function assertCurrent(job) { if (!current(job)) throw new Error('CANCELLED'); }
function end(job) { if (active === job) { active = null; controls(); } }
// 純取消不移除已加入的圖片；目前原生解碼不能強制中斷，完成後直接丟棄。
function cancel() { if (!active) return; active.cancelled = true; invalidate(); announce(t.cancelling); controls(); }
// 原生解碼最多一個 lease。UI 期限不宣稱中止原生工作；晚到結果一律關閉。
function decode(file, job) {
  if (decodeLease) return Promise.reject(new Error('DECODER_BUSY'));
  const lease = {}; decodeLease = lease;
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => { settled = true; reject(new Error('DECODE_TIMEOUT')); }, 30_000);
    let operation;
    try { operation = createImageBitmap(file); }
    catch { clearTimeout(timer); decodeLease = null; reject(new Error('DECODE')); return; }
    Promise.resolve(operation).then(bitmap => {
      if (decodeLease === lease) decodeLease = null;
      clearTimeout(timer);
      if (settled || !current(job)) { bitmap.close(); if (!settled) reject(new Error('CANCELLED')); return; }
      settled = true; resolve(bitmap);
    }, () => {
      if (decodeLease === lease) decodeLease = null;
      clearTimeout(timer);
      if (!settled) { settled = true; reject(new Error('DECODE')); }
    });
  });
}
async function addFiles(files) {
  if (active || !files.length) return;
  const job = begin();
  const pending = [];
  try {
    if (decodeLease) throw new Error('DECODER_BUSY');
    validateSelection(files, items.length, items.reduce((sum,item) => sum + item.bytes, 0));
    const inspected = [];
    // 所有檔案先完成格式與尺寸檢查，才開始串行原生解碼。
    for (let index = 0; index < files.length; index++) {
      announce(t.reading(index + 1, files.length));
      const bytes = new Uint8Array(await files[index].arrayBuffer()); assertCurrent(job);
      inspected.push(inspectImage(bytes));
    }
    for (let index = 0; index < files.length; index++) {
      assertCurrent(job); announce(t.decoding(index + 1, files.length));
      let bitmap;
      let canvas;
      try {
        bitmap = await decode(files[index], job);
        assertCurrent(job);
        const meta = inspected[index];
        if (bitmap.width !== meta.width || bitmap.height !== meta.height) throw new Error('ORIENTATION');
        const fit = contain(meta.width, meta.height, 320);
        canvas = document.createElement('canvas'); canvas.width = fit.width; canvas.height = fit.height;
        const context = canvas.getContext('2d'); if (!context) throw new Error('MEMORY');
        context.drawImage(bitmap, 0, 0, fit.width, fit.height);
        pending.push({ name: files[index].name, bytes: files[index].size, width: meta.width, height: meta.height, canvas });
        canvas = null;
      } finally { bitmap?.close(); if (canvas) { canvas.width = 0; canvas.height = 0; } }
    }
    assertCurrent(job); items.push(...pending); pending.length = 0; renderList(); announce(t.ready(items.length));
  } catch (error) {
    dispose(pending);
    if (current(job)) announce(t.errors[error.message] || t.errors.MEMORY, true);
    else if (enabled && active === job && job.epoch === epoch) announce(t.cancelled);
  } finally { files.length = 0; end(job); }
}
// 畫布標籤以實際字寬截斷，索引保留完整檔名。
function shortLabel(context, name, maxWidth) {
  let chars = Array.from(displayName(name));
  if (context.measureText(chars.join('')).width <= maxWidth) return chars.join('');
  while (chars.length && context.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
  return chars.join('') + '…';
}
// 編碼 callback 有期限；過期 callback 不會保存任何產物。
function encode(canvas) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => { settled = true; reject(new Error('ENCODE')); }, 30_000);
    try { canvas.toBlob(blob => { if (settled) return; settled = true; clearTimeout(timer); blob ? resolve(blob) : reject(new Error('ENCODE')); }, 'image/png'); }
    catch { settled = true; clearTimeout(timer); reject(new Error('ENCODE')); }
  });
}
async function generate() {
  if (active || !items.length) return;
  const job = begin();
  let canvas;
  try {
    const plan = layout(items.length, options()); announce(t.generating);
    canvas = document.createElement('canvas'); canvas.width = plan.width; canvas.height = plan.height;
    const context = canvas.getContext('2d', { alpha: false }); if (!context) throw new Error('MEMORY');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, plan.width, plan.height);
    context.textBaseline = 'top'; context.font = '14px system-ui, sans-serif';
    plan.cells.forEach((cell, index) => {
      const thumb = items[index].canvas;
      const fit = contain(thumb.width, thumb.height, plan.tile);
      context.fillStyle = '#ffffff'; context.fillRect(cell.x, cell.y, plan.tile, plan.tile);
      context.drawImage(thumb, cell.x + fit.x, cell.y + fit.y, fit.width, fit.height);
      context.fillStyle = '#111410'; context.fillText(String(cell.number).padStart(2, '0'), cell.x, cell.y + plan.tile + 6);
      if (options().labels) context.fillText(shortLabel(context, items[index].name, plan.tile), cell.x, cell.y + plan.tile + 28);
    });
    const png = await encode(canvas); assertCurrent(job);
    if (png.type !== 'image/png' || !png.size || png.size > LIMITS.outputBytes) throw new Error('ENCODE');
    const header = new Uint8Array(await png.slice(0, 24).arrayBuffer()); assertCurrent(job);
    const view = new DataView(header.buffer);
    if (header.length !== 24 || ![137,80,78,71,13,10,26,10].every((v,i) => header[i] === v) || view.getUint32(16) !== plan.width || view.getUint32(20) !== plan.height) throw new Error('ENCODE');
    const index = new Blob([filenameIndex(items, document.documentElement.lang)], {type: 'text/plain;charset=utf-8'});
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', t.success(items.length, plan.width, plan.height));
    result = { png, index, canvas }; $('preview').replaceChildren(canvas); $('empty').hidden = true; canvas = null;
    announce(t.success(items.length, plan.width, plan.height));
  } catch (error) { if (current(job)) announce(t.errors[error.message] || t.errors.MEMORY, true); else if (enabled && active === job && job.epoch === epoch) announce(t.cancelled); }
  finally { if (canvas) { canvas.width = 0; canvas.height = 0; } end(job); }
}
// 使用者點擊才建立下載；固定檔名，不使用原始檔名當路徑。
function download(kind) {
  if (!result || active) return;
  let entry = downloads.get(kind);
  if (!entry) { entry = {url: URL.createObjectURL(result[kind]), timer: null}; downloads.set(kind, entry); }
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => { URL.revokeObjectURL(entry.url); downloads.delete(kind); }, 60_000);
  const anchor = document.createElement('a'); anchor.href = entry.url; anchor.download = kind === 'png' ? 'photo-contact-sheet.png' : 'photo-contact-sheet-index.txt';
  document.body.append(anchor); anchor.click(); anchor.remove();
}
function clear(message = true) {
  if (active) active.cancelled = true;
  invalidate(); dispose(items); items = []; input.value = ''; renderList();
  if (message) announce(active ? t.cancelling : t.cleared);
}
input.addEventListener('change', () => { const files = Array.from(input.files || []); input.value = ''; void addFiles(files); });
for (const field of settings) field.addEventListener('input', () => { invalidate(); announce(t.stale); });
// 頁內確認不開作業系統對話框；取消後焦點回到觸發控制。
const confirmation = $('confirmation');
let pendingAction = null;
let returnFocus = null;
function confirmAction(action) {
  pendingAction = action; returnFocus = document.activeElement;
  confirmation.showModal(); $('keep').focus();
}
function closeConfirmation() { pendingAction = null; confirmation.close(); returnFocus?.focus(); returnFocus = null; }
$('keep').addEventListener('click', closeConfirmation);
confirmation.addEventListener('cancel', event => { event.preventDefault(); closeConfirmation(); });
$('discard').addEventListener('click', () => { const action = pendingAction; pendingAction = null; confirmation.close(); returnFocus = null; action?.(); });
$('clear').addEventListener('click', () => confirmAction(() => { clear(); input.focus(); }));
let leaving = false;
for (const link of document.querySelectorAll('a[data-leave]')) link.addEventListener('click', event => {
  if (leaving || (!items.length && !active && !result)) return;
  event.preventDefault(); confirmAction(() => { clear(false); leaving = true; link.click(); });
});
$('cancel').addEventListener('click', cancel);
$('png').addEventListener('click', () => download('png'));
$('index').addEventListener('click', () => download('index'));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && active && !confirmation.open) { event.preventDefault(); cancel(); } });
// BFCache 返回不復用舊資料；離頁時禁止晚到的 callback 發聲或恢復焦點。
window.addEventListener('pagehide', () => { enabled = false; epoch++; clear(false); active = null; pendingAction = null; returnFocus = null; confirmation.close(); controls(); });
window.addEventListener('pageshow', event => { if (event.persisted) { epoch++; active = null; clear(false); enabled = typeof createImageBitmap === 'function'; announce(enabled ? t.idle : t.errors.UNSUPPORTED); controls(); } });
// 所有 handler 安裝完成後才解除靜態 HTML 的 disabled 保護。
enabled = typeof createImageBitmap === 'function' && typeof HTMLCanvasElement.prototype.toBlob === 'function' && typeof confirmation.showModal === 'function';
announce(enabled ? t.idle : t.errors.UNSUPPORTED, !enabled); controls();
