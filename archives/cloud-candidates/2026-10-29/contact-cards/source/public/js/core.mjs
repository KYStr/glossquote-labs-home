// 純函式核心：所有入口自行驗證，不信任 DOM 已通過檢查。
export const LIMITS = Object.freeze({ input: 262144, rows: 501, contacts: 500, columns: 20, field: 4096, output: 524288 });
const knownErrors = new WeakSet(); // 品牌判斷不對未知 thrown object 做 instanceof 反射。
const encoder = new TextEncoder(); // 全程 UTF-8；電話與姓名不轉數值、不正規化 Unicode。
export class ContactError extends Error {
  constructor(code, record = null, field = null) { super(code); knownErrors.add(this); this.code = code; this.record = record; this.field = field; }
}
const reject = (code, record, field) => { throw new ContactError(code, record, field); };
export function validateSource(text) {
  if (typeof text !== 'string') reject('INVALID_TEXT'); // 拒絕隱式 coercion。
  if (text.length > LIMITS.input || encoder.encode(text).length > LIMITS.input) reject('INPUT_LIMIT');
  if (!text.isWellFormed()) reject('INVALID_UNICODE'); // 拒絕孤立 UTF-16 surrogate。
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(text)) reject('CONTROL');
  return text.startsWith('\uFEFF') ? text.slice(1) : text; // 僅移除來源第一個 BOM。
}
export function decodeUtf8(bytes) {
  if (!(bytes instanceof Uint8Array)) reject('INVALID_UTF8');
  if (bytes.byteLength > LIMITS.input) reject('INPUT_LIMIT'); // 解碼前先守 byte limit。
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { reject('INVALID_UTF8'); }
  validateSource(text); // 保留原文 BOM，真正解析時才移除一次。
  return text;
}
export function parseCsv(source) {
  const text = validateSource(source); // 不猜分隔符、日期、數字或試算表公式。
  const records = []; let row = [], chunks = [], state = 'start', touched = false;
  const fail = code => reject(code, records.length + 1, row.length + 1);
  const append = char => { if (chunks.length >= LIMITS.field) fail('FIELD_LIMIT'); chunks.push(char); };
  const field = () => { if (row.length >= LIMITS.columns) fail('COLUMN_LIMIT'); row.push(chunks.join('')); chunks = []; };
  const record = () => {
    if (records.length >= LIMITS.rows) fail('ROW_LIMIT');
    if (records.length && row.length !== records[0].length) fail('COLUMN_MISMATCH');
    records.push(row); row = []; touched = false;
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (state === 'quoted') { if (char === '"') state = 'after'; else append(char); }
    else if (char === ',') { field(); state = 'start'; touched = true; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] !== '\n') fail('CSV_SYNTAX');
      field(); record(); state = 'start'; if (char === '\r') index++;
    } else if (char === '"') {
      if (state === 'plain') fail('CSV_SYNTAX');
      if (state === 'after') append('"');
      state = 'quoted'; touched = true;
    } else {
      if (state === 'after') fail('CSV_SYNTAX');
      append(char); state = 'plain'; touched = true;
    }
  }
  if (state === 'quoted') fail('CSV_SYNTAX');
  if (state !== 'start' || touched || row.length) { field(); record(); }
  if (!records.length) reject('EMPTY');
  return records;
}
// 將輸入的 own data descriptors 轉為新快照，不直接讀取來源 getter。
// 一般瀏覽器無通用 Proxy 偵測；反射 trap 本身仍可能執行，異常則轉為固定代碼。
function reflectSafely(code, record, inspect) {
  try { return inspect(); }
  catch (error) { if (knownErrors.has(error)) throw error; reject(code, record); }
}
function dataProperty(value, key, code, record = null) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) reject(code, record);
  return descriptor.value; // 這是引擎建立的 descriptor，而不是來源物件屬性讀取。
}
function snapshotRecord(value, fields, code, record = null) {
  return reflectSafely(code, record, () => {
    if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) reject(code, record);
    const keys = Reflect.ownKeys(value);
    if (keys.length !== fields.length || keys.some(key => typeof key !== 'string' || !fields.includes(key))) reject(code, record);
    const copy = {};
    for (const key of fields) copy[key] = dataProperty(value, key, code, record);
    return copy; // 固定 schema 不會使用未驗證的 key，亦不讀取 Symbol/隱藏欄位。
  });
}
function snapshotArray(value, maximum, shapeCode, limitCode) {
  return reflectSafely(shapeCode, null, () => {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) reject(shapeCode);
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !Object.hasOwn(length, 'value') || length.enumerable !== false || !Number.isSafeInteger(length.value) || length.value < 0) reject(shapeCode);
    if (length.value > maximum) reject(limitCode); // 在逐項反射前拒絕超限長度。
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length.value + 1 || !keys.includes('length')) reject(shapeCode);
    const copy = [];
    for (let index = 0; index < length.value; index++) copy.push(dataProperty(value, String(index), shapeCode));
    // 精確 keys 數量＋每個連續 index 都存在，排除 sparse/Symbol/extra/non-enumerable。
    return copy;
  });
}
function validateRecords(source) {
  const records = snapshotArray(source, LIMITS.rows, 'RECORD_SHAPE', 'ROW_LIMIT');
  if (!records.length) reject('ROW_LIMIT');
  let size = 0, width = null;
  const rows = records.map(sourceRow => {
    const row = snapshotArray(sourceRow, LIMITS.columns, 'RECORD_SHAPE', 'COLUMN_LIMIT');
    if (!row.length) reject('COLUMN_LIMIT');
    if (width === null) width = row.length;
    if (row.length !== width) reject('COLUMN_MISMATCH');
    for (const value of row) {
      if (typeof value !== 'string' || value.length > LIMITS.field) reject('FIELD_LIMIT');
      validateSource(value); // 只檢查，不能使用會移除 BOM 的回傳值改寫格值。
      size += encoder.encode(value).length;
      if (size > LIMITS.input) reject('INPUT_LIMIT');
    }
    return row;
  });
  return { width, rows }; // 後續所有運算只使用已擷取的普通陣列與字串。
}
export function mapContacts(records, mapping, hasHeader) {
  const validated = validateRecords(records);
  const width = validated.width; records = validated.rows;
  if (typeof hasHeader !== 'boolean') reject('MAPPING');
  mapping = snapshotRecord(mapping, ['name', 'phone', 'email'], 'MAPPING');
  const indexes = [mapping.name, mapping.phone, mapping.email];
  if (indexes.some(index => !Number.isInteger(index) || index < -1 || index >= width) || mapping.name < 0 || (mapping.phone < 0 && mapping.email < 0)) reject('MAPPING');
  const selected = indexes.filter(index => index >= 0);
  if (new Set(selected).size !== selected.length) reject('MAPPING'); // 依位置對應，重複表頭仍可辨識。
  const rows = records.slice(hasHeader ? 1 : 0);
  if (!rows.length) reject('EMPTY');
  if (rows.length > LIMITS.contacts) reject('ROW_LIMIT');
  return rows.map((row, index) => {
    const number = index + (hasHeader ? 2 : 1);
    const contact = { name: row[mapping.name], phone: mapping.phone < 0 ? '' : row[mapping.phone], email: mapping.email < 0 ? '' : row[mapping.email] };
    return validateContact(contact, number);
  });
}
function validateContact(contact, record = null) {
  contact = snapshotRecord(contact, ['name', 'phone', 'email'], 'CONTACT_SHAPE', record);
  for (const value of Object.values(contact)) { validateSource(value); }
  // 姓名保留首尾空白與換行，但拒絕純空白；不猜姓氏拆分。
  if (!contact.name.trim() || [...contact.name].length > 200 || /[\t\u2028\u2029]/u.test(contact.name)) reject('NAME', record);
  // 明確受限的電話 profile；不假稱電話有效，不猜國碼、不移除前導零。
  if (contact.phone && (contact.phone.length > 80 || !/^\+?[0-9(). -]+$/u.test(contact.phone) || !/[0-9]/u.test(contact.phone))) reject('PHONE', record);
  // 只接受常見 ASCII 單一信箱，不接受顯示名稱、國際化信箱或多地址。
  if (contact.email) {
    const parts = contact.email.split('@');
    if (contact.email.length > 254 || parts.length !== 2 || parts[0].length > 64 || !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/u.test(parts[0]) || !parts[1].includes('.') || parts[1].split('.').some(label => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u.test(label))) reject('EMAIL', record);
  }
  if (!contact.phone && !contact.email) reject('NO_CHANNEL', record);
  return contact; // 呼叫者使用此普通 data 快照，不再讀取原始 contact。
}
export function escapeText(value) {
  validateSource(value); // 任何原始換行只能成為值中的 \n，不可注入 property。
  return value.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/gu, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
}
export function foldLine(line) {
  if (typeof line !== 'string' || !line.isWellFormed() || /[\r\n]/u.test(line) || line.length > 20000) reject('LINE');
  const lines = []; let current = '', bytes = 0;
  // 採較保守的 75 UTF-8 octets，續行的前導空白也計入；不拆 Unicode 碼點。
  for (const point of line) {
    const length = encoder.encode(point).length;
    if (bytes + length > 75) { lines.push(current); current = ' '; bytes = 1; }
    current += point; bytes += length;
  }
  lines.push(current); return lines.join('\r\n');
}
export function serializeVCard(contacts) {
  contacts = snapshotArray(contacts, LIMITS.contacts, 'CONTACT_SHAPE', 'ROW_LIMIT');
  if (!contacts.length) reject('ROW_LIMIT');
  const output = []; let size = 0;
  for (const [index, sourceContact] of contacts.entries()) {
    const contact = validateContact(sourceContact, index + 1); // 匯出不接受未驗證的模型或過期 mapping。
    const name = escapeText(contact.name);
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:;${name};;;`];
    if (contact.phone) lines.push(`TEL:${escapeText(contact.phone)}`);
    if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeText(contact.email)}`);
    lines.push('END:VCARD');
    const card = lines.map(foldLine).join('\r\n') + '\r\n';
    size += encoder.encode(card).length; if (size > LIMITS.output) reject('OUTPUT_LIMIT');
    output.push(card);
  }
  return output.join(''); // UTF-8、CRLF、末尾 CRLF、無 BOM、無外部 URI property。
}
