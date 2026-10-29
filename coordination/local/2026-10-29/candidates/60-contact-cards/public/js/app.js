import { CSV_LIMITS, parseCsvUtf8 } from './core/csv.mjs';
import { FIELDS, mapContacts } from './core/map-contacts.mjs';
import { serializeVcards, VCARD_FILENAME, VCARD_MIME } from './core/vcard.mjs';

const blankMapping = () => Object.fromEntries(FIELDS.map((field) => [field, null]));

// Injectable effects allow lifecycle unit tests without a DOM, browser, network or listener.
export function createSession({ readerFactory = () => new FileReader(), urlApi = URL, blobFactory = (bytes) => new Blob([bytes], { type: VCARD_MIME }), onDownload = () => {}, onChange = () => {} } = {}) {
  const state = { phase: 'idle', generation: 0, source: null, parsed: null, mapping: blankMapping(), contacts: [], duplicateGroups: [], bytes: null, url: null, error: null };
  let reader = null;
  function dropOutput() {
    if (state.url !== null) urlApi.revokeObjectURL(state.url);
    state.url = null; state.bytes = null; state.contacts = []; state.duplicateGroups = [];
  }
  function detach(active) { active.onload = null; active.onerror = null; active.onabort = null; }
  function invalidate() {
    state.generation++;
    const old = reader; reader = null;
    if (old) { detach(old); if (old.readyState === 1) old.abort(); }
    dropOutput();
  }
  function fail(error) {
    dropOutput();
    state.error = { code: error.code || 'READ_ERROR', row: error.row, column: error.column, field: error.field, issues: error.issues };
    state.phase = state.parsed ? 'mapping' : 'idle'; onChange(state);
  }
  function readFile(file) {
    invalidate(); state.parsed = null; state.mapping = blankMapping(); state.source = null; state.error = null;
    if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > CSV_LIMITS.maxBytes) { fail({ code: 'CSV_BYTE_LIMIT' }); return; }
    state.source = { name: String(file.name), size: file.size }; state.phase = 'reading'; onChange(state);
    const generation = state.generation;
    try {
      const active = readerFactory(); reader = active;
      const current = () => reader === active && state.generation === generation;
      active.onload = () => {
        if (!current()) return;
        reader = null; detach(active);
        try {
          if (!(active.result instanceof ArrayBuffer) || active.result.byteLength !== file.size) throw { code: 'READ_ERROR' };
          state.parsed = parseCsvUtf8(new Uint8Array(active.result));
          state.phase = 'mapping'; onChange(state);
        } catch (error) { fail(error); }
      };
      active.onerror = () => { if (current()) { reader = null; detach(active); fail({ code: 'READ_ERROR' }); } };
      active.onabort = () => { if (current()) cancelRead(); };
      active.readAsArrayBuffer(file);
    } catch { if (reader) { detach(reader); reader = null; } fail({ code: 'READ_ERROR' }); }
  }
  function setMapping(mapping) {
    invalidate(); state.mapping = { ...mapping }; state.error = null;
    state.phase = state.parsed ? 'mapping' : 'idle'; onChange(state);
  }
  function preview() {
    dropOutput(); state.error = null;
    if (!state.parsed) { fail({ code: 'CSV_NO_DATA' }); return; }
    try {
      const result = mapContacts(state.parsed.rows, state.mapping);
      const bytes = serializeVcards(result.contacts);
      state.contacts = result.contacts; state.duplicateGroups = result.duplicateGroups; state.bytes = bytes;
      state.phase = 'preview'; onChange(state);
    } catch (error) { fail(error); }
  }
  function download() {
    if (!state.bytes || !['preview', 'exported'].includes(state.phase)) return false;
    try {
      if (state.url) urlApi.revokeObjectURL(state.url);
      state.url = null;
      state.url = urlApi.createObjectURL(blobFactory(state.bytes));
      onDownload(state.url, VCARD_FILENAME);
      state.phase = 'exported'; state.error = null; onChange(state); return true;
    } catch { fail({ code: 'DOWNLOAD_ERROR' }); return false; }
  }
  function cancelRead() {
    invalidate(); state.phase = state.parsed ? 'mapping' : 'idle'; state.error = { code: 'READ_CANCELLED' }; onChange(state);
  }
  function clear() {
    invalidate(); state.phase = 'idle'; state.source = null; state.parsed = null; state.mapping = blankMapping(); state.error = null; onChange(state);
  }
  return { state, readFile, setMapping, preview, download, cancelRead, clear };
}

export const COPY = {
  'zh-Hant': {
    fields: { name: '姓名', phone: '電話', email: 'Email', organization: '組織', note: '備註', contact: '聯絡方式' },
    status: { idle: '○ 未選檔', reading: '◌ 正在本地讀取', mapping: '○ 請選擇欄位', preview: '✓ 預覽已就緒', exported: '✓ 已送出下載請求' },
    choose: '請選擇來源欄位', omit: '不匯出此欄', blank: '（空白標題）', column: '欄', example: '樣本', noSample: '此欄沒有非空樣本', noFile: '尚未選擇 CSV',
    csvLine: 'CSV 行', contact: '聯絡人', missing: '未提供', mapped: '已映射欄位', none: '無',
    duplicate: '⚑ 欄位相同，請確認是否重複。未合併。', duplicateGroup: '可能重複群組', row: '行',
    summary: (n, d, size) => `${n} 筆聯絡人 · 0 個錯誤 · ${d} 組可能重複 · ${size} bytes`,
    sourceSummary: (n, c) => `${n} 筆資料 · ${c} 個來源欄位`, errorTitle: '無法產生整批 VCF',
    errorHelp: '請修正來源 CSV 或欄位映射，再重新預覽；沒有輸出部分名單。',
    errors: {
      CSV_BYTES: '請重新選擇 CSV 檔案。', CSV_BYTE_LIMIT: '檔案須不超過 1 MiB（1,048,576 bytes）；尚未讀取超限檔。', CSV_LIMIT_CONFIG: '解析設定無效，請重新載入頁面。',
      CSV_ENCODING: '檔案不是有效 UTF-8。請從試算表另存為 UTF-8 CSV 後重試。', CSV_EMPTY: 'CSV 沒有內容。請加入標題列和聯絡人。', CSV_NO_DATA: 'CSV 需要標題列及至少一筆聯絡人。',
      CSV_CELL_LIMIT: '某個儲存格超過 4096 個 Unicode 字元。請縮短後重試。', CSV_COLUMN_LIMIT: 'CSV 最多支援 30 欄。請移除不需要的欄位。', CSV_ROW_LIMIT: 'CSV 最多支援 1000 筆資料。請拆成較小名單。',
      CSV_RAGGED: '這一列的欄位數與標題列不同。請檢查逗號與引號。', CSV_BLANK_ROW: 'CSV 含空白資料列。請移除整列空白後重試。', CSV_LONE_CR: '引號外有單獨 CR 換行；請使用 LF 或 CRLF。',
      CSV_QUOTE: '雙引號只能包住完整欄位；欄位內的引號要寫成兩個雙引號。', CSV_AFTER_QUOTE: '關閉引號後只能接逗號、行尾或檔案結尾。', CSV_UNCLOSED_QUOTE: 'CSV 有未關閉的雙引號。請修正後重試。',
      MAPPING_NAME: '請明確選擇姓名來源欄位。', MAPPING_REUSED: '同一來源欄不能映射到兩個目標。請選擇不同欄位。', MAPPING_INDEX: '來源欄位無效。請重新選擇映射。', MAPPING_SCHEMA: '欄位映射無效。請重新選擇。', MAPPING_ROWS: '來源資料已失效。請重新選擇 CSV。',
      NAME_REQUIRED: '姓名去除外側空白後不可為空。', FIELD_UNICODE: '欄位含無效 Unicode 字元。請修正來源。', FIELD_CONTROL: '欄位含不允許的控制字元或換行；只有備註允許換行。',
      FIELD_LENGTH: '超過長度限制：姓名／組織 120、電話 64、Email 254、備註 500 個字元。', EMAIL_BASIC: 'Email 不符合基本 ASCII 語法。請檢查 @、點號與網域；此檢查不驗證可寄送性。', CONTACT_METHOD: '此聯絡人至少需要非空電話或 Email。',
      CONTACT_ERRORS: '請修正下列全部問題後重新預覽。', OUTPUT_LIMIT: 'VCF 超過 4 MiB，整批未產生。請縮小名單。', OUTPUT_LIMIT_CONFIG: '輸出設定無效。請重新載入頁面。',
      VCARD_CONTACTS: '聯絡人欄位不符合匯出要求。請重新映射並預覽。', VCARD_VALUE: '欄位文字無效。請修正來源後預覽。', VCARD_LINE: 'VCF 文字無法編碼。請重新選擇來源並預覽。', VCARD_ESCAPE: 'VCF 跳脫編碼無效。請重新預覽。',
      READ_ERROR: '無法讀取檔案。請重新選擇可存取的 UTF-8 CSV。', READ_CANCELLED: '已取消讀取。請選擇 CSV 重新開始。', DOWNLOAD_ERROR: '瀏覽器未能開始下載。請重新預覽後再試。'
    }
  },
  en: {
    fields: { name: 'Name', phone: 'Phone', email: 'Email', organization: 'Organization', note: 'Notes', contact: 'Contact method' },
    status: { idle: '○ No file selected', reading: '◌ Reading locally', mapping: '○ Choose columns', preview: '✓ Preview ready', exported: '✓ Download requested' },
    choose: 'Choose a source column', omit: 'Do not export this field', blank: '(blank heading)', column: 'Column', example: 'Sample', noSample: 'No nonempty sample in this column', noFile: 'No CSV selected',
    csvLine: 'CSV line', contact: 'Contact', missing: 'Not provided', mapped: 'Mapped fields', none: 'None',
    duplicate: '⚑ Fields match. Check whether these are duplicates. Not merged.', duplicateGroup: 'Possible duplicate group', row: 'line',
    summary: (n, d, size) => `${n} ${n === '1' ? 'contact' : 'contacts'} · 0 errors · ${d} possible duplicate ${d === '1' ? 'group' : 'groups'} · ${size} bytes`,
    sourceSummary: (n, c) => `${n} data ${n === '1' ? 'row' : 'rows'} · ${c} source ${c === '1' ? 'column' : 'columns'}`, errorTitle: 'The whole VCF is blocked',
    errorHelp: 'Fix the source CSV or column mapping, then preview again. No partial contact list was produced.',
    errors: {
      CSV_BYTES: 'Choose the CSV file again.', CSV_BYTE_LIMIT: 'The file must be at most 1 MiB (1,048,576 bytes). An oversized file has not been read.', CSV_LIMIT_CONFIG: 'The parser settings are invalid. Reload the page.',
      CSV_ENCODING: 'The file is not valid UTF-8. Save it as a UTF-8 CSV from your spreadsheet and try again.', CSV_EMPTY: 'The CSV is empty. Add a header row and contacts.', CSV_NO_DATA: 'The CSV needs a header and at least one contact.',
      CSV_CELL_LIMIT: 'A cell exceeds 4096 Unicode characters. Shorten it and try again.', CSV_COLUMN_LIMIT: 'The CSV may have at most 30 columns. Remove unused columns.', CSV_ROW_LIMIT: 'The CSV may have at most 1000 data rows. Use smaller lists.',
      CSV_RAGGED: 'This row has a different number of columns from the header. Check commas and quotes.', CSV_BLANK_ROW: 'The CSV contains a blank data row. Remove the blank row and try again.', CSV_LONE_CR: 'A lone CR occurs outside quotes. Use LF or CRLF record endings.',
      CSV_QUOTE: 'Quotes must enclose a whole field. Use two double quotes for a quote inside it.', CSV_AFTER_QUOTE: 'A closing quote must be followed by a comma, record ending, or end of file.', CSV_UNCLOSED_QUOTE: 'A quoted CSV field was not closed. Fix it and try again.',
      MAPPING_NAME: 'Choose the name source column explicitly.', MAPPING_REUSED: 'One source column cannot serve two fields. Choose different columns.', MAPPING_INDEX: 'The source column is invalid. Choose the mapping again.', MAPPING_SCHEMA: 'The column mapping is invalid. Choose it again.', MAPPING_ROWS: 'The source data is no longer available. Choose the CSV again.',
      NAME_REQUIRED: 'A name cannot be empty after trimming outer whitespace.', FIELD_UNICODE: 'The field contains invalid Unicode. Correct the source.', FIELD_CONTROL: 'The field contains a forbidden control character or line break. Only notes may contain line breaks.',
      FIELD_LENGTH: 'A length limit was exceeded: name/organization 120, phone 64, email 254, notes 500 characters.', EMAIL_BASIC: 'The email fails basic ASCII syntax. Check @, dots and domain labels. This does not verify deliverability.', CONTACT_METHOD: 'This contact needs a nonempty phone number or email.',
      CONTACT_ERRORS: 'Fix all the issues listed below, then preview again.', OUTPUT_LIMIT: 'The VCF exceeds 4 MiB. No file was produced. Use a smaller list.', OUTPUT_LIMIT_CONFIG: 'The output settings are invalid. Reload the page.',
      VCARD_CONTACTS: 'Contact fields do not meet export requirements. Map the columns and preview again.', VCARD_VALUE: 'A field contains invalid text. Fix the source and preview again.', VCARD_LINE: 'The VCF text could not be encoded. Choose the source and preview again.', VCARD_ESCAPE: 'The VCF escaping is invalid. Preview again.',
      READ_ERROR: 'The file could not be read. Choose an accessible UTF-8 CSV and try again.', READ_CANCELLED: 'Reading was cancelled. Choose a CSV to start again.', DOWNLOAD_ERROR: 'The browser could not start the download. Preview again and retry.'
    }
  }
};

export function initApp(doc) {
  const lang = doc.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const t = COPY[lang], format = new Intl.NumberFormat(lang);
  const get = (id) => doc.getElementById(id);
  const node = (tag, value, className) => { const el = doc.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; };
  const fields = Object.fromEntries(FIELDS.map((field) => [field, get(`map-${field}`)]));
  let renderedParsed = null, renderedContacts = null, renderedError = null;
  const session = createSession({ onChange: render, onDownload: (url, name) => {
    const anchor = node('a'); anchor.href = url; anchor.download = name; anchor.hidden = true;
    doc.body.append(anchor); anchor.click(); anchor.remove();
  } });
  function showPane(pane) {
    get('workspace').dataset.pane = pane;
    get('show-source').setAttribute('aria-pressed', String(pane === 'source'));
    get('show-preview').setAttribute('aria-pressed', String(pane === 'preview'));
  }
  function render(state) {
    get('status').textContent = t.status[state.phase];
    get('file-name').textContent = state.source ? `${state.source.name} · ${format.format(state.source.size)} bytes` : t.noFile;
    get('cancel').hidden = state.phase !== 'reading';
    get('mapping').disabled = !state.parsed;
    get('preview-button').disabled = !state.parsed;
    get('preview-button').classList.toggle('primary', !state.bytes);
    get('download').hidden = !state.bytes;
    get('clear').disabled = !state.source && !state.parsed && !state.error;
    get('source-summary').textContent = state.parsed ? t.sourceSummary(format.format(state.parsed.rows.length), format.format(state.parsed.headers.length)) : '';
    get('source-panel').setAttribute('aria-busy', String(state.phase === 'reading'));
    if (state.parsed !== renderedParsed) {
      renderedParsed = state.parsed;
      for (const field of FIELDS) {
        const select = fields[field]; select.replaceChildren();
        const empty = node('option', field === 'name' ? t.choose : t.omit); empty.value = ''; select.append(empty);
        state.parsed?.headers.forEach((header, index) => {
          const sample = state.parsed.rows.find((row) => row.cells[index].trim() !== '')?.cells[index] ?? '';
          const short = [...sample].slice(0, 60).join('');
          const option = node('option', `${t.column} ${index + 1} · ${header || t.blank}${sample ? ` · ${t.example}: ${short}${[...sample].length > 60 ? '…' : ''}` : ''}`);
          option.value = String(index); select.append(option);
        });
      }
    }
    for (const field of FIELDS) {
      fields[field].value = state.mapping[field] === null || state.mapping[field] === undefined ? '' : String(state.mapping[field]);
      const index = state.mapping[field];
      const sample = state.parsed && index !== null ? state.parsed.rows.find((row) => row.cells[index]?.trim() !== '')?.cells[index] : null;
      get(`sample-${field}`).textContent = index === null ? '' : `${t.example}: ${sample || t.noSample}`;
      const invalid = state.error?.field === field || state.error?.issues?.some((issue) => issue.field === field);
      fields[field].setAttribute('aria-invalid', String(Boolean(invalid)));
    }
    if (!state.source) get('csv-file').value = '';
    if (state.error !== renderedError) {
      renderedError = state.error;
      get('error-panel').hidden = !state.error;
      get('issues').replaceChildren();
      if (state.error) {
        get('error-title').textContent = state.error.code === 'READ_CANCELLED' ? t.errors.READ_CANCELLED : t.errorTitle;
        get('error-description').textContent = t.errors[state.error.code] || t.errors.READ_ERROR;
        const issues = state.error.issues ?? (state.error.row ? [state.error] : []);
        for (const issue of issues) {
          const location = `${t.csvLine} ${format.format(issue.row)}${issue.column ? ` · ${t.column} ${issue.column}` : ''}${issue.field ? ` · ${t.fields[issue.field]}` : ''}`;
          get('issues').append(node('li', `${location} — ${t.errors[issue.code] || t.errors.READ_ERROR}`));
        }
      }
    }
    get('preview-empty').hidden = Boolean(state.bytes);
    get('preview-summary').textContent = state.bytes ? t.summary(format.format(state.contacts.length), format.format(state.duplicateGroups.length), format.format(state.bytes.length)) : '';
    get('mapped-fields').textContent = state.bytes ? `${t.mapped}: ${FIELDS.filter((field) => state.mapping[field] !== null).map((field) => `${t.fields[field]} (${t.column} ${state.mapping[field] + 1})`).join(' · ')}` : '';
    if (state.contacts !== renderedContacts) {
      renderedContacts = state.contacts; get('contacts').replaceChildren(); get('duplicates').replaceChildren();
      const duplicates = new Map();
      state.duplicateGroups.forEach((group, index) => {
        group.forEach((item) => duplicates.set(item.rowIndex, index + 1));
        get('duplicates').append(node('p', `${t.duplicateGroup} ${index + 1}: ${t.csvLine} ${group.map((item) => item.line).join(', ')}. ${t.duplicate}`));
      });
      const fragment = doc.createDocumentFragment();
      for (const contact of state.contacts) {
        const item = node('li', undefined, 'contact-row');
        item.append(node('p', `${t.contact} ${format.format(contact.rowIndex + 1)} · ${t.csvLine} ${format.format(contact.line)}`, 'row-origin'), node('h3', contact.name));
        const list = node('dl');
        for (const field of ['phone', 'email', 'organization']) { list.append(node('dt', t.fields[field]), node('dd', contact[field] || t.missing)); }
        item.append(list);
        if (duplicates.has(contact.rowIndex)) item.append(node('p', `${t.duplicateGroup} ${duplicates.get(contact.rowIndex)} · ${t.duplicate}`, 'duplicate-notice'));
        if (contact.note) { const details = node('details'); details.append(node('summary', t.fields.note), node('p', contact.note, 'note-text')); item.append(details); }
        fragment.append(item);
      }
      get('contacts').append(fragment);
    }
  }
  get('csv-file').addEventListener('change', (event) => {
    const files = event.target.files;
    if (files?.length === 1) session.readFile(files[0]);
    else if (files?.length > 1) { session.clear(); session.state.error = { code: 'CSV_BYTES' }; render(session.state); }
    event.target.value = '';
  });
  for (const field of FIELDS) fields[field].addEventListener('change', () => {
    session.setMapping(Object.fromEntries(FIELDS.map((key) => [key, fields[key].value === '' ? null : Number(fields[key].value)])));
  });
  get('preview-button').addEventListener('click', () => { session.preview(); if (session.state.bytes) { showPane('preview'); get('preview-heading').focus(); } else { showPane('source'); get('error-panel').focus(); } });
  get('download').addEventListener('click', () => session.download());
  get('cancel').addEventListener('click', () => session.cancelRead());
  get('clear').addEventListener('click', () => { session.clear(); showPane('source'); get('csv-file').focus(); });
  get('show-source').addEventListener('click', () => showPane('source'));
  get('show-preview').addEventListener('click', () => showPane('preview'));
  doc.defaultView.addEventListener('pagehide', () => session.clear());
  render(session.state);
  return session;
}

if (typeof document !== 'undefined') initApp(document);
