import { LIMITS, ContactError, decodeUtf8, parseCsv, mapContacts, serializeVCard } from './core.mjs';
import { words } from './words.mjs';
// 注入平台介面以便 CPU 受控 DOM 測試；實際網頁也呼叫同一控制器。
export function createApp(document, platform = globalThis) {
  const $ = id => document.getElementById(id);
  const language = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const w = words[language]; const ids = ['name', 'phone', 'email'];
  let records = null, contacts = null, output = null, fileRaw = null, sourceKind = 'text';
  let reader = null, epoch = 0, url = null, timer = null, page = 0;
  const revoke = () => {
    if (timer !== null) { platform.clearTimeout(timer); timer = null; }
    if (url !== null) { platform.URL.revokeObjectURL(url); url = null; }
  };
  const cancelRead = () => {
    epoch++; const old = reader; reader = null;
    if (old?.readyState === 1) old.abort(); // 過期 callback 以 epoch 阻擋，abort 也不能覆蓋新狀態。
  };
  const invalidate = (message = w.dirty, dropRecords = false) => {
    revoke(); contacts = null; output = null; page = 0;
    $('preview').replaceChildren(); $('vcf').value = ''; $('result').hidden = true;
    $('ack').checked = false; $('ack').disabled = true; $('download').disabled = true;
    $('error').textContent = ''; $('status').textContent = message;
    for (const id of ['source', ...ids]) $(id).removeAttribute('aria-invalid');
    if (dropRecords) { records = null; $('mapping').disabled = true; $('prepare').disabled = true; }
  };
  const showError = error => {
    invalidate('');
    const code = error instanceof ContactError ? error.code : 'UNKNOWN';
    const position = error?.record ? ` ${w.row} ${error.record}${error.field ? ` / ${w.column} ${error.field}` : ''}.` : '';
    $('error').textContent = `${w.errors[code] ?? w.errors.UNKNOWN}${position}`;
    $('source').setAttribute('aria-invalid', 'true'); $('error').focus(); // 錯誤不含使用者格值。
  };
  const resetMappings = () => {
    for (const id of ids) {
      const select = $(id); select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = '-1'; placeholder.textContent = id === 'name' ? w.choose : w.none; select.append(placeholder);
      records[0].forEach((cell, index) => {
        const option = document.createElement('option'); option.value = String(index);
        option.textContent = `${w.column} ${index + 1}${$('header').checked ? ` — ${cell}` : ''}`; select.append(option);
      }); select.value = '-1';
    }
  };
  const render = () => {
    $('preview').replaceChildren();
    const start = page * 25;
    for (const [offset, contact] of contacts.slice(start, start + 25).entries()) {
      const tr = document.createElement('tr');
      for (const value of [String(start + offset + 1), contact.name, contact.phone, contact.email]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      $('preview').append(tr);
    }
    $('count').textContent = `${contacts.length} ${w.count} · ${w.page} ${page + 1} / ${Math.ceil(contacts.length / 25)}`;
    $('previous').disabled = page === 0; $('next').disabled = start + 25 >= contacts.length;
  };
  const clear = () => {
    cancelRead(); fileRaw = null; sourceKind = 'text'; $('source').value = ''; $('file').value = ''; $('header').checked = true;
    invalidate(w.cleared, true); for (const id of ids) $(id).replaceChildren();
  };
  const parse = () => {
    cancelRead(); invalidate('', true);
    try { records = parseCsv(sourceKind === 'file' ? fileRaw : $('source').value); resetMappings(); $('mapping').disabled = false; $('prepare').disabled = false; $('status').textContent = w.parsed; }
    catch (error) { records = null; showError(error); }
  };
  const prepare = () => {
    invalidate('');
    try {
      const mapping = Object.fromEntries(ids.map(id => [id, Number($(id).value)]));
      contacts = mapContacts(records, mapping, $('header').checked); output = serializeVCard(contacts);
      $('vcf').value = output; $('result').hidden = false; $('ack').disabled = false; render(); $('status').textContent = w.ready;
    } catch (error) { showError(error); }
  };
  const loadFile = () => {
    cancelRead(); invalidate('', true); fileRaw = null; sourceKind = 'text';
    const files = $('file').files;
    if (!files?.length) { $('status').textContent = w.dirty; return; }
    try {
      if (files.length !== 1 || !/\.csv$/iu.test(files[0].name)) throw new ContactError('FILE');
      if (!Number.isSafeInteger(files[0].size) || files[0].size < 0 || files[0].size > LIMITS.input) throw new ContactError('INPUT_LIMIT');
      const mine = epoch; const current = new platform.FileReader(); reader = current; $('status').textContent = w.reading;
      current.onload = () => {
        if (mine !== epoch || reader !== current) return;
        reader = null;
        try { const raw = decodeUtf8(new Uint8Array(current.result)); fileRaw = raw; sourceKind = 'file'; $('source').value = raw; $('status').textContent = w.dirty; }
        catch (error) { showError(error); }
        current.onload = current.onerror = current.onabort = null;
      };
      current.onerror = () => { if (mine === epoch && reader === current) { reader = null; showError(new ContactError('READ')); } };
      current.onabort = () => { if (mine === epoch && reader === current) { reader = null; invalidate(w.dirty, true); } };
      current.readAsArrayBuffer(files[0]);
    } catch (error) { showError(error); }
  };
  const download = () => {
    if (!output || !contacts || !$('ack').checked) return; // 不只依賴 disabled 按鈕。
    revoke(); let anchor = null;
    try {
      url = platform.URL.createObjectURL(new platform.Blob([output], { type: 'text/vcard;charset=utf-8' }));
      anchor = document.createElement('a'); anchor.href = url; anchor.download = 'contacts.vcf'; document.body.append(anchor); anchor.click();
      timer = platform.setTimeout(() => { timer = null; revoke(); }, 1000);
    } catch { revoke(); $('error').textContent = w.downloadError; }
    finally { anchor?.remove(); }
  };
  // 能力不足保持 HTML 預設 disabled，不嘗試降級上傳或遠端處理。
  if (!platform.FileReader || !platform.Blob || !platform.URL?.createObjectURL || !platform.URL?.revokeObjectURL || !platform.TextEncoder || !platform.TextDecoder || !String.prototype.isWellFormed) { $('status').textContent = w.unsupported; return { supported: false }; }
  $('editor').disabled = false; $('status').textContent = w.empty;
  $('source').addEventListener('input', () => { cancelRead(); fileRaw = null; sourceKind = 'text'; $('file').value = ''; invalidate(w.edited, true); });
  $('file').addEventListener('change', loadFile);
  $('header').addEventListener('change', () => { cancelRead(); invalidate(w.dirty, true); });
  for (const id of ids) for (const event of ['input', 'change']) $(id).addEventListener(event, () => invalidate());
  $('parse').addEventListener('click', parse); $('prepare').addEventListener('click', prepare); $('clear').addEventListener('click', clear);
  $('ack').addEventListener('change', () => { revoke(); $('download').disabled = !output || !$('ack').checked; });
  $('download').addEventListener('click', download);
  $('previous').addEventListener('click', () => { if (contacts && page > 0) { page--; render(); } });
  $('next').addEventListener('click', () => { if (contacts && (page + 1) * 25 < contacts.length) { page++; render(); } });
  platform.addEventListener('pagehide', clear); // 返回快取頁面也不保留聯絡資料。
  return { supported: true, clear, parse, prepare, loadFile, download, state: () => ({ hasRecords: !!records, hasOutput: !!output, reading: !!reader, sourceKind, page, url }) };
}
if (typeof document !== 'undefined') createApp(document);
