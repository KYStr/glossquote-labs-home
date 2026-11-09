import { emptyDraft, validateQuoteInput, calculateQuote } from './core/quote.mjs';
import { formatMinor, formatQuantity } from './core/decimal.mjs';
import { makeExportPair, quoteLabels } from './core/safe-output.mjs';
import { parseQuoteImport, importMaxBytes } from './core/import.mjs';

// The same controller drives the page and offline lifecycle tests. Injected
// fakes test state transitions only; they are not browser/API verification.
export function createQuoteSession({ lang = 'zh-Hant', readerFactory = () => new FileReader(), blobFactory = (bytes, type) => new Blob([bytes], { type }), createUrl = blob => URL.createObjectURL(blob), revokeUrl = url => URL.revokeObjectURL(url), onChange = () => {} } = {}) {
  const state = { generation: 0, draft: emptyDraft(), errors: [], phase: 'blank', preview: null, pending: null, importReader: null, blobUrls: new Map() };
  function releaseReader(abort = true) {
    const reader = state.importReader;
    state.importReader = null;
    if (reader) {
      reader.onload = null; reader.onerror = null; reader.onabort = null;
      if (abort && reader.readyState === 1) reader.abort();
    }
  }
  function invalidate(phase = 'editing') {
    state.generation++;
    releaseReader();
    for (const url of state.blobUrls.values()) revokeUrl(url);
    state.blobUrls.clear();
    state.preview = null; state.pending = null; state.errors = []; state.phase = phase;
  }
  const notify = () => onChange(state);
  const fail = (code, details = {}) => { state.phase = 'error'; state.errors = [{ code, field: 'root', ...details }]; notify(); return false; };
  function generate() {
    invalidate();
    const generation = state.generation;
    const checked = validateQuoteInput(state.draft);
    if (!checked.ok) { state.errors = checked.errors; state.phase = 'error'; notify(); return false; }
    try {
      const totals = calculateQuote(checked.validatedInput);
      const pair = makeExportPair(checked.validatedInput, totals, { lang });
      if (!pair.ok) return fail(pair.code, { actualBytes: pair.actualBytes, maxBytes: pair.maxBytes });
      if (generation !== state.generation) return false;
      state.preview = { input: checked.validatedInput, totals, pair, generation };
      state.phase = 'ready'; notify(); return true;
    } catch { return fail('OUTPUT_FAILED'); }
  }
  return {
    state,
    edit(draft) { const wasPreview = state.preview !== null || state.phase === 'stale'; invalidate(wasPreview ? 'stale' : 'editing'); state.draft = draft; notify(); },
    generate,
    download(kind) {
      if (!['html', 'json'].includes(kind) || !state.preview || state.preview.generation !== state.generation || state.phase !== 'ready') return { ok: false };
      try {
        if (!state.blobUrls.has(kind)) {
          const type = kind === 'html' ? 'text/html;charset=utf-8' : 'application/json;charset=utf-8';
          const blob = blobFactory(state.preview.pair[kind], type);
          state.blobUrls.set(kind, createUrl(blob));
        }
        return { ok: true, url: state.blobUrls.get(kind), filename: `quote.${kind}` };
      } catch { invalidate(); fail('DOWNLOAD_FAILED'); return { ok: false }; }
    },
    beginImport(file) {
      invalidate();
      if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > importMaxBytes) return fail('IMPORT_SIZE');
      const generation = state.generation;
      try {
        const reader = readerFactory();
        state.importReader = reader; state.phase = 'importing';
        const current = () => generation === state.generation && state.importReader === reader;
        reader.onload = () => {
          if (!current()) return;
          const data = reader.result;
          releaseReader(false);
          if (!(data instanceof ArrayBuffer)) return fail('IMPORT_READ');
          const result = parseQuoteImport(new Uint8Array(data));
          if (generation !== state.generation) return;
          if (!result.ok) return fail(result.code, { importErrors: result.errors });
          state.pending = result.validatedInput; state.phase = 'confirm-import'; notify();
        };
        reader.onerror = () => { if (current()) { releaseReader(false); fail('IMPORT_READ'); } };
        reader.onabort = () => { if (current()) { invalidate(); notify(); } };
        notify(); reader.readAsArrayBuffer(file); file = null; return true;
      } catch { releaseReader(); return fail('IMPORT_READ'); }
    },
    cancelImport() { invalidate(); notify(); },
    confirmImport() {
      if (state.phase !== 'confirm-import' || !state.pending) return false;
      const checked = validateQuoteInput(state.pending);
      if (!checked.ok) { invalidate(); return fail('IMPORT_SCHEMA'); }
      const replacement = checked.validatedInput;
      invalidate(); state.draft = replacement;
      return generate();
    },
    clear({ dispose = false } = {}) {
      invalidate(dispose ? 'disposed' : 'blank');
      state.draft = dispose ? null : emptyDraft(); notify();
    },
    resume() {
      if (state.phase !== 'disposed') return false;
      state.draft = emptyDraft(); state.phase = 'blank'; notify(); return true;
    },
  };
}

export const messages = {
  'zh-Hant': {
    blank: '空白草稿', editing: '編輯中', stale: '預覽已過期，請重新產生', ready: '✓ 預覽就緒', error: '⚠ 無法產生', importing: '正在讀取 JSON…', 'confirm-import': '請確認匯入', disposed: '草稿已清除',
    description: '品項說明', quantity: '數量', unitPrice: '單價', remove: '移除品項', item: '品項', itemCount: '品項數', maxItems: '已達 50 項。請先移除一項再新增。',
    fieldNames: { root: '報價資料', 'parties.from': '出價方', 'parties.to': '客戶', parties: '雙方名稱', currency: '幣別標籤', items: '品項', discount: '固定折扣', taxRate: '自訂稅率', note: '備註' },
    errors: {
      DECIMAL_TYPE: '請用十進位文字輸入數字。', DECIMAL_FORMAT: '請輸入不帶空白、正負號、逗號或指數的十進位數字。', DECIMAL_PRECISION: '數量最多 3 位小數；單價、折扣及稅率最多 2 位。', DECIMAL_RANGE: '請依欄位下方的範圍輸入。',
      TEXT_TYPE: '請輸入文字。', TEXT_SURROGATE: '文字含不完整字元，請刪除後重新輸入。', TEXT_LIMIT: '文字超過欄位字數上限，請縮短。', TEXT_CONTROL: '文字含不允許的控制字元，請移除；名稱不能換行。', TEXT_REQUIRED: '請填寫非空白的品項說明。', CURRENCY_FORMAT: '請填 1–8 個 ASCII 大寫英文字母或數字，例如 TWD。', ITEM_COUNT: '請保留 1–50 項品項。', DISCOUNT_EXCEEDS: '固定折扣不能超過逐行進位後的小計。',
      SCHEMA_KEYS: '資料欄位不完整或含未知欄位，請改用本工具匯出的 JSON。', SCHEMA_VERSION: '只接受 gq.quote schema 1，請改用本工具匯出的 JSON。',
      IMPORT_SIZE: 'JSON 超過 512 KiB 或檔案無效，未讀取檔案。請選較小的 JSON。', IMPORT_UTF8: '檔案不是有效 UTF-8，請以 UTF-8 JSON 重存後重試。', IMPORT_JSON: 'JSON 語法無效，請選本工具匯出的 JSON。', IMPORT_DUPLICATE: 'JSON 含重複欄位，請移除重複鍵後重試。', IMPORT_DEPTH: 'JSON 巢狀超過 6 層，請選本工具匯出的 JSON。', IMPORT_NODES: 'JSON 結構超過 2000 個節點，請選本工具匯出的 JSON。', IMPORT_SCHEMA: 'JSON 欄位、文字或金額不符合規則，原草稿保持不變。請修正檔案後重試。', IMPORT_READ: '無法讀取檔案，原草稿保持不變。請重新選擇 JSON。', IMPORT_TYPE: '請選擇 UTF-8 JSON 檔案。',
      EXPORT_LIMIT: 'HTML 和 JSON 合計超過 512 KiB（524288 bytes）；兩份皆不提供，請縮短輸入後重試。', OUTPUT_FAILED: '無法建立產物。請重新產生預覽；此版沒有下載連結。', DOWNLOAD_FAILED: '無法建立下載。請重新產生預覽後重試；舊連結已撤下。',
    },
    emptyPreview: '填入至少一項品項，按「產生預覽」檢查報價。',
    importSummary: count => `將取代目前草稿：${count} 項品項，共 ${count * 3 + 6} 個可編輯欄位。欄位：幣別、出價方、客戶、品項說明／數量／單價、固定折扣、自訂稅率、備註。確認前不更動原草稿。`,
    current: '目前草稿的完整報價', errorsTitle: '請修正以下欄位後重新產生', clearStatus: '草稿與目前產物已清除；已下載的檔案不受影響。', downloadNote: '若瀏覽器未開始下載，請再次按下載；你也可重新產生預覽。',
  },
  en: {
    blank: 'Blank draft', editing: 'Editing', stale: 'Preview is out of date. Create it again.', ready: '✓ Preview ready', error: '⚠ Unable to create', importing: 'Reading JSON…', 'confirm-import': 'Confirm import', disposed: 'Draft cleared',
    description: 'Item description', quantity: 'Quantity', unitPrice: 'Unit price', remove: 'Remove item', item: 'Item', itemCount: 'Items', maxItems: 'The limit is 50 items. Remove an item before adding another.',
    fieldNames: { root: 'Quote data', 'parties.from': 'From', 'parties.to': 'Client', parties: 'Parties', currency: 'Currency label', items: 'Items', discount: 'Fixed discount', taxRate: 'Custom rate', note: 'Notes' },
    errors: {
      DECIMAL_TYPE: 'Enter the number as decimal text.', DECIMAL_FORMAT: 'Enter a decimal without spaces, signs, commas, or exponents.', DECIMAL_PRECISION: 'Use up to 3 decimal places for quantity and 2 for price, discount, or rate.', DECIMAL_RANGE: 'Use the range shown below this field.',
      TEXT_TYPE: 'Enter text.', TEXT_SURROGATE: 'The text contains an incomplete character. Remove it and enter it again.', TEXT_LIMIT: 'The text exceeds the field limit. Shorten it.', TEXT_CONTROL: 'Remove unsupported control characters; party names cannot contain line breaks.', TEXT_REQUIRED: 'Enter an item description that is not blank.', CURRENCY_FORMAT: 'Use 1–8 ASCII uppercase letters or digits, such as TWD.', ITEM_COUNT: 'Keep between 1 and 50 items.', DISCOUNT_EXCEEDS: 'The fixed discount cannot exceed the subtotal after each line is rounded.',
      SCHEMA_KEYS: 'Fields are missing or unknown. Use JSON exported by this tool.', SCHEMA_VERSION: 'Only gq.quote schema 1 is accepted. Use JSON exported by this tool.',
      IMPORT_SIZE: 'The JSON exceeds 512 KiB or is not a valid file. It was not read. Choose a smaller JSON file.', IMPORT_UTF8: 'The file is not valid UTF-8. Save it as UTF-8 JSON and try again.', IMPORT_JSON: 'The JSON syntax is invalid. Choose JSON exported by this tool.', IMPORT_DUPLICATE: 'The JSON contains duplicate keys. Remove them and try again.', IMPORT_DEPTH: 'The JSON exceeds 6 nested levels. Choose JSON exported by this tool.', IMPORT_NODES: 'The JSON exceeds 2000 structural nodes. Choose JSON exported by this tool.', IMPORT_SCHEMA: 'The JSON fields, text, or amounts do not meet the rules. Your draft is unchanged. Correct the file and try again.', IMPORT_READ: 'The file could not be read. Your draft is unchanged. Choose the JSON file again.', IMPORT_TYPE: 'Choose a UTF-8 JSON file.',
      EXPORT_LIMIT: 'The HTML and JSON together exceed 512 KiB (524288 bytes). Neither is available. Shorten the input and try again.', OUTPUT_FAILED: 'The outputs could not be created. Create the preview again; this version has no download links.', DOWNLOAD_FAILED: 'The download could not be created. Create the preview again and retry; old links have been removed.',
    },
    emptyPreview: 'Enter at least one item, then choose Create preview to review the quote.',
    importSummary: count => `Replace the current draft with ${count} items and ${count * 3 + 6} editable fields. Fields: currency, from, client, item description / quantity / unit price, fixed discount, custom rate, and notes. Your draft stays unchanged until you confirm.`,
    current: 'Full quote for the current draft', errorsTitle: 'Correct these fields and create the preview again', clearStatus: 'The draft and current outputs were cleared. Downloaded files are unaffected.', downloadNote: 'If your browser did not start the download, choose Download again or create a new preview.',
  },
};

export function mountQuoteApp(doc, windowObject) {
  const lang = doc.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const text = messages[lang];
  const labels = quoteLabels[lang];
  const byId = id => doc.getElementById(id);
  const form = byId('quote-form');
  let hasPreview = false;
  let pendingClear = false;
  const element = (tag, content, className) => {
    const node = doc.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  };
  function fieldLabel(field) {
    if (text.fieldNames[field]) return text.fieldNames[field];
    const item = /^items\.(\d+)(?:\.(description|quantity|unitPrice))?$/.exec(field);
    return item ? `${text.item} ${Number(item[1]) + 1}${item[2] ? ` · ${text[item[2]]}` : ''}` : text.fieldNames.root;
  }
  function fieldId(field) {
    return ({ 'parties.from': 'from', 'parties.to': 'to', parties: 'from', items: 'item-list' })[field] || field.replaceAll('.', '-');
  }
  function readDraft() {
    return { schema: 'gq.quote', version: 1, currency: byId('currency').value, parties: { from: byId('from').value, to: byId('to').value },
      items: [...byId('item-list').children].map((_, index) => ({ description: byId(`items-${index}-description`).value, quantity: byId(`items-${index}-quantity`).value, unitPrice: byId(`items-${index}-unitPrice`).value })), discount: byId('discount').value, taxRate: byId('taxRate').value, note: byId('note').value };
  }
  function field(parent, name, id, value, { multiline = false, help = '', decimal = false } = {}) {
    const wrapper = element('div', undefined, 'field');
    const label = element('label', name); label.htmlFor = id;
    const control = element(multiline ? 'textarea' : 'input'); control.id = id; control.name = id; control.value = value;
    if (multiline) control.rows = 2;
    else control.type = 'text';
    control.autocomplete = 'off'; control.spellcheck = false;
    if (decimal) { control.inputMode = 'decimal'; control.className = 'number-input'; }
    const hint = element('small', help); hint.id = `${id}-help`;
    const error = element('span', '', 'field-error'); error.id = `${id}-error`; error.hidden = true;
    control.setAttribute('aria-describedby', `${hint.id} ${error.id}`);
    wrapper.append(label, control, hint, error); parent.append(wrapper);
  }
  function drawItems(items) {
    byId('item-list').replaceChildren();
    items.forEach((item, index) => {
      const row = element('fieldset', undefined, 'item-row');
      row.append(element('legend', `${text.item} ${index + 1}`));
      field(row, text.description, `items-${index}-description`, item.description, { multiline: true, help: lang === 'en' ? '1–200 characters; line breaks allowed.' : '1–200 字；可換行。' });
      const amounts = element('div', undefined, 'field-pair');
      field(amounts, text.quantity, `items-${index}-quantity`, item.quantity, { decimal: true, help: '0.001–1000000' });
      field(amounts, text.unitPrice, `items-${index}-unitPrice`, item.unitPrice, { decimal: true, help: '0–1000000000.00' });
      row.append(amounts);
      const remove = element('button', `${text.remove} ${index + 1}`, 'quiet'); remove.type = 'button'; remove.disabled = items.length === 1;
      remove.addEventListener('click', () => {
        const next = readDraft(); next.items.splice(index, 1); session.edit(next); drawItems(next.items);
        byId(`items-${Math.min(index, next.items.length - 1)}-description`).focus();
      });
      row.append(remove); byId('item-list').append(row);
    });
    byId('item-count').textContent = `${text.itemCount}: ${items.length} / 50`;
    byId('add-item').disabled = items.length >= 50;
    byId('item-limit').hidden = items.length < 50;
    byId('item-limit').textContent = text.maxItems;
  }
  function writeDraft(draft) {
    for (const key of ['currency', 'discount', 'taxRate', 'note']) byId(key).value = draft[key];
    byId('from').value = draft.parties.from; byId('to').value = draft.parties.to;
    drawItems(draft.items);
  }
  function showErrors(errors) {
    for (const control of form.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
    for (const message of form.querySelectorAll('.field-error')) { message.textContent = ''; message.hidden = true; }
    const summary = byId('errors'); summary.replaceChildren(); summary.hidden = errors.length === 0;
    if (!errors.length) return;
    summary.append(element('h3', `⚠ ${text.errorsTitle}`));
    const list = element('ul');
    for (const error of errors) {
      const message = text.errors[error.code] || text.errors.OUTPUT_FAILED;
      const line = element('li');
      const control = byId(fieldId(error.field));
      const detail = `${fieldLabel(error.field)}: ${message}${error.code === 'EXPORT_LIMIT' ? ` ${error.actualBytes} / ${error.maxBytes} bytes` : ''}`;
      if (control) {
        const link = element('a', detail); link.href = `#${control.id}`;
        link.addEventListener('click', event => { event.preventDefault(); control.focus(); }); line.append(link);
        control.setAttribute('aria-invalid', 'true');
        const inline = byId(`${control.id}-error`);
        if (inline) { inline.textContent = `⚠ ${message}`; inline.hidden = false; }
      } else line.textContent = detail;
      list.append(line);
    }
    summary.append(list);
  }
  function drawPreview(preview) {
    const canvas = byId('quote-canvas'); canvas.replaceChildren();
    if (!preview) { canvas.append(element('p', text.emptyPreview, 'empty-state')); return; }
    const { input, totals } = preview;
    const money = minor => `${input.currency} ${formatMinor(minor)}`;
    canvas.append(element('h3', labels.title, 'quote-title'));
    const parties = element('dl', undefined, 'quote-parties');
    for (const [label, value] of [[labels.from, input.parties.from], [labels.to, input.parties.to]]) {
      const group = element('div'); group.append(element('dt', label), element('dd', value || labels.missing, 'preserve')); parties.append(group);
    }
    canvas.append(parties, element('p', `${labels.currency}: ${input.currency}`, 'quote-currency'));
    const list = element('ol', undefined, 'quote-items');
    input.items.forEach((item, index) => {
      const result = totals.items[index];
      const row = element('li'); row.append(element('p', item.description, 'preserve item-description'));
      const values = element('dl', undefined, 'quote-item-values');
      for (const [label, value] of [[labels.quantity, formatQuantity(result.quantityMilli)], [labels.price, money(result.unitPriceMinor)], [labels.amount, money(result.lineMinor)]]) {
        const group = element('div'); group.append(element('dt', label), element('dd', value, 'amount')); values.append(group);
      }
      row.append(values); list.append(row);
    });
    canvas.append(list);
    const summary = element('dl', undefined, 'quote-summary');
    for (const [label, value] of [[labels.subtotal, money(totals.subtotalMinor)], [labels.discount, money(totals.discountMinor)], [labels.after, money(totals.afterDiscountMinor)], [labels.rate, `${formatMinor(totals.taxRateBasisPoints)}%`], [labels.tax, money(totals.taxMinor)], [labels.total, money(totals.totalMinor)]]) {
      const group = element('div', undefined, label === labels.total ? 'quote-total' : ''); group.append(element('dt', label), element('dd', value, 'amount')); summary.append(group);
    }
    canvas.append(summary, element('h4', labels.note), element('p', input.note || labels.noNote, 'preserve'), element('p', labels.footer, 'quote-footer'));
  }
  function selectPanel(panel, focus = false) {
    byId('workspace').dataset.panel = panel;
    for (const name of ['edit', 'preview']) {
      const tab = byId(`tab-${name}`); tab.setAttribute('aria-pressed', String(name === panel));
    }
    if (focus) byId(panel === 'preview' ? 'preview-heading' : 'editor-heading').focus();
  }
  function render(state) {
    byId('draft-state').textContent = text[state.phase];
    byId('preview-state').textContent = state.phase === 'ready' ? text.current : text[state.phase];
    byId('create-preview').disabled = ['importing', 'confirm-import', 'disposed'].includes(state.phase);
    const ready = state.phase === 'ready' && state.preview !== null;
    byId('downloads').hidden = !ready;
    for (const kind of ['html', 'json']) {
      if (ready) byId(`download-${kind}`).setAttribute('href', '#');
      else byId(`download-${kind}`).removeAttribute('href');
    }
    byId('create-preview').className = ready ? '' : 'primary';
    showErrors(state.errors);
    byId('import-panel').hidden = !['importing', 'confirm-import'].includes(state.phase);
    byId('confirm-import').hidden = state.phase !== 'confirm-import';
    byId('import-message').textContent = state.phase === 'confirm-import' ? text.importSummary(state.pending.items.length) : text.importing;
    byId('import-panel').setAttribute('aria-busy', String(state.phase === 'importing'));
    if (ready || hasPreview || !byId('quote-canvas').children.length) drawPreview(state.preview);
    hasPreview = ready;
    byId('download-note').textContent = '';
  }
  const session = createQuoteSession({ lang, onChange: render });
  form.addEventListener('input', () => {
    pendingClear = false; byId('clear-panel').hidden = true; byId('import-file').value = '';
    session.edit(readDraft());
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    session.edit(readDraft());
    if (session.generate()) selectPanel('preview', true);
    else { selectPanel('edit'); const first = session.state.errors[0]; (byId(fieldId(first?.field || 'root')) || byId('errors')).focus(); }
  });
  byId('add-item').addEventListener('click', () => {
    const draft = readDraft(); if (draft.items.length >= 50) return;
    draft.items.push({ description: '', quantity: '', unitPrice: '' }); session.edit(draft); drawItems(draft.items); byId(`items-${draft.items.length - 1}-description`).focus();
  });
  for (const panel of ['edit', 'preview']) byId(`tab-${panel}`).addEventListener('click', () => selectPanel(panel, true));
  byId('import-file').addEventListener('change', event => {
    pendingClear = false; byId('clear-panel').hidden = true;
    const file = event.target.files?.[0];
    if (file) session.beginImport(file);
    event.target.value = '';
  });
  byId('cancel-import').addEventListener('click', () => { session.cancelImport(); byId('import-file').focus(); });
  byId('confirm-import').addEventListener('click', () => {
    session.confirmImport(); writeDraft(session.state.draft); render(session.state);
    selectPanel(session.state.phase === 'ready' ? 'preview' : 'edit', true);
  });
  for (const kind of ['html', 'json']) byId(`download-${kind}`).addEventListener('click', event => {
    const result = session.download(kind);
    if (!result.ok) { event.preventDefault(); return; }
    event.currentTarget.href = result.url; event.currentTarget.download = result.filename;
    byId('download-note').textContent = text.downloadNote;
  });
  byId('clear-draft').addEventListener('click', () => { pendingClear = true; byId('clear-panel').hidden = false; byId('cancel-clear').focus(); });
  byId('cancel-clear').addEventListener('click', () => { pendingClear = false; byId('clear-panel').hidden = true; byId('clear-draft').focus(); });
  byId('confirm-clear').addEventListener('click', () => {
    if (!pendingClear) return;
    pendingClear = false; session.clear(); writeDraft(session.state.draft);
    byId('clear-panel').hidden = true; byId('import-file').value = ''; byId('action-status').textContent = text.clearStatus; selectPanel('edit'); byId('from').focus();
  });
  windowObject.addEventListener('pagehide', () => {
    pendingClear = false; session.clear({ dispose: true });
    form.reset(); byId('item-list').replaceChildren();
    for (const control of form.querySelectorAll('input,textarea')) control.value = '';
    byId('import-file').value = ''; byId('clear-panel').hidden = true; byId('action-status').textContent = '';
  });
  windowObject.addEventListener('pageshow', () => { if (session.resume()) { writeDraft(session.state.draft); selectPanel('edit'); } });
  writeDraft(session.state.draft); render(session.state); byId('js-required').hidden = true;
  return session;
}

if (typeof document !== 'undefined' && document.getElementById('quote-form')) mountQuoteApp(document, window);
