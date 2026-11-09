// 單日多軌議程核心：只用整數分鐘，不讀取時鐘、日期函式或外部資料。
export const LIMITS = Object.freeze({ rows: 60, speakers: 5, raw: 256, title: 80, name: 40, basis: 60, buffer: 180 });
const rootKeys = ['dateRaw', 'timeBasisRaw', 'roomBufferRaw', 'speakerBufferRaw', 'rows'];
const rowKeys = ['id', 'titleRaw', 'roomRaw', 'speakersRaw', 'startRaw', 'endRaw'];
// 錯誤只含固定代碼、欄位與列序，不回顯任意原文或例外。
const internalErrors = new WeakSet();
const fail = (code, field = null, row = null) => {
  const error = Object.freeze({ code, field, row });
  internalErrors.add(error); throw error;
};
function record(value, keys, row = null) {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) fail('SCHEMA', null, row);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key => !keys.includes(key))) fail('SCHEMA', null, row);
  const result = {};
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d) || !d.enumerable) fail('SCHEMA', key, row);
    result[key] = d.value;
  }
  return result;
}
function array(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail('SCHEMA', 'rows');
  // 先查 length 限制，避免掃描超大陣列或讀取索引 getter。
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isInteger(length) || length < 1 || length > LIMITS.rows) fail('ROW_COUNT', 'rows');
  if (Reflect.ownKeys(value).length !== length + 1) fail('SCHEMA', 'rows');
  const result = [];
  for (let i = 0; i < length; i++) {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d) || !d.enumerable) fail('SCHEMA', 'rows');
    result.push(d.value);
  }
  return result;
}
function raw(value, field, row = null) {
  if (typeof value !== 'string') fail('TYPE', field, row);
  if (value.length > LIMITS.raw) fail('RAW_LENGTH', field, row);
  if (!value.isWellFormed() || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)) fail('TEXT', field, row);
  return value;
}
function label(value, maximum, field, row = null, optional = false) {
  const trimmed = raw(value, field, row).trim();
  if ((!optional && !trimmed) || trimmed.length > maximum) fail('LABEL', field, row);
  return trimmed;
}
function clock(value, end, field, row) {
  if (!/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u.test(value)) {
    if (end && value === '24:00') return 1440;
    fail('CLOCK', field, row);
  }
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
function buffer(value, field) {
  if (!/^[0-9]{1,3}$/u.test(value) || Number(value) > LIMITS.buffer) fail('BUFFER', field);
  return Number(value);
}
function date(value) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(value)) fail('DATE', 'dateRaw');
  const y = Number(value.slice(0, 4)), m = Number(value.slice(5, 7)), d = Number(value.slice(8));
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]) fail('DATE', 'dateRaw');
  return value;
}
export function validateDraft(input) {
  try {
    const d = record(input, rootKeys);
    const rows = array(d.rows).map((item, i) => record(item, rowKeys, i));
    // 完整形狀通過後才驗證值，ordinary accessor 絕不執行。
    for (const key of rootKeys.filter(key => key !== 'rows')) raw(d[key], key);
    rows.forEach((item, i) => rowKeys.forEach(key => raw(item[key], key, i)));
    const ids = new Set();
    rows.forEach((item, i) => {
      if (!/^r[1-9][0-9]{0,8}$/u.test(item.id) || ids.has(item.id)) fail('ID', 'id', i);
      ids.add(item.id);
    });
    const normalized = {
      date: date(d.dateRaw), timeBasis: label(d.timeBasisRaw, LIMITS.basis, 'timeBasisRaw'),
      roomBuffer: buffer(d.roomBufferRaw, 'roomBufferRaw'), speakerBuffer: buffer(d.speakerBufferRaw, 'speakerBufferRaw'), rows: []
    };
    normalized.rows = rows.map((item, i) => {
      const title = label(item.titleRaw, LIMITS.title, 'titleRaw', i);
      const room = label(item.roomRaw, LIMITS.name, 'roomRaw', i);
      const text = item.speakersRaw.trim();
      const speakers = text ? text.split(';').map(part => label(part, LIMITS.name, 'speakersRaw', i)) : [];
      if (speakers.length > LIMITS.speakers || new Set(speakers).size !== speakers.length) fail('SPEAKERS', 'speakersRaw', i);
      const start = clock(item.startRaw, false, 'startRaw', i), end = clock(item.endRaw, true, 'endRaw', i);
      if (start >= end) fail('ORDER', 'endRaw', i);
      return { id: item.id, number: i + 1, title, room, speakers, start, end };
    });
    return { ok: true, value: normalized };
  } catch (error) {
    // Proxy 的反射 trap 可能執行；不可宣稱能安全處理任意 Proxy。
    // WeakSet 身分比對不讀取被拋出的 Proxy / getter 屬性。
    return { ok: false, error: internalErrors.has(error) ? { code: error.code, field: error.field, row: error.row } : { code: 'SCHEMA', field: null, row: null } };
  }
}
export function checkAgenda(input) {
  const checked = validateDraft(input);
  if (!checked.ok) return checked;
  const draft = checked.value, conflicts = [];
  // 60 列最多 1770 個配對；每一對只輸出一次，但保留全部適用原因。
  for (let i = 0; i < draft.rows.length; i++) for (let j = i + 1; j < draft.rows.length; j++) {
    const a = draft.rows[i], b = draft.rows[j];
    const overlap = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
    const gap = overlap > 0 ? null : Math.max(a.start, b.start) - Math.min(a.end, b.end);
    const shared = a.speakers.filter(name => b.speakers.includes(name));
    const sameRoom = a.room === b.room;
    const duplicate = sameRoom && a.title === b.title && a.start === b.start && a.end === b.end && a.speakers.length === b.speakers.length && shared.length === a.speakers.length;
    const reasons = [];
    if (duplicate) reasons.push('DUPLICATE');
    if (overlap > 0 && sameRoom) reasons.push('ROOM_OVERLAP');
    if (overlap > 0 && shared.length) reasons.push('SPEAKER_OVERLAP');
    if (gap !== null && sameRoom && gap < draft.roomBuffer) reasons.push('ROOM_BUFFER');
    if (gap !== null && !sameRoom && shared.length && gap < draft.speakerBuffer) reasons.push('SPEAKER_BUFFER');
    if (reasons.length) conflicts.push({ a: a.number, b: b.number, reasons, overlap, gap, speakers: shared });
  }
  return { ok: true, value: { ...draft, conflicts } };
}
export function formatClock(minute) {
  if (!Number.isInteger(minute) || minute < 0 || minute > 1440) throw new RangeError('Invalid minute.');
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
export const REASONS = Object.freeze({
  'zh-Hant': { DUPLICATE: '重複議程列', ROOM_OVERLAP: '場地重疊', SPEAKER_OVERLAP: '講者重疊', ROOM_BUFFER: '場地換場緩衝不足', SPEAKER_BUFFER: '講者跨場緩衝不足' },
  en: { DUPLICATE: 'Duplicate session', ROOM_OVERLAP: 'Room overlap', SPEAKER_OVERLAP: 'Speaker overlap', ROOM_BUFFER: 'Insufficient room buffer', SPEAKER_BUFFER: 'Insufficient speaker transition' }
});
export function buildReport(result, locale) {
  if (!Object.hasOwn(REASONS, locale)) throw new RangeError('Invalid locale.');
  const zh = locale === 'zh-Hant';
  const lines = [zh ? '多軌議程衝突檢查' : 'Multi-Track Agenda Checker', `${zh ? '日期' : 'Date'}: ${result.date}`, `${zh ? '共同時間基準' : 'Shared time basis'}: ${result.timeBasis}`, `${zh ? '場地／講者跨場緩衝（分鐘）' : 'Room / speaker transition buffer (minutes)'}: ${result.roomBuffer} / ${result.speakerBuffer}`, '', zh ? '議程：' : 'Sessions:'];
  for (const row of result.rows) lines.push(`${row.number}. ${formatClock(row.start)}–${formatClock(row.end)} | ${row.title} | ${row.room} | ${row.speakers.join('; ') || (zh ? '無講者' : 'No speaker')}`);
  lines.push('', `${zh ? '衝突配對數' : 'Conflicting pairs'}: ${result.conflicts.length}`);
  for (const c of result.conflicts) lines.push(`${c.a} ↔ ${c.b}: ${c.reasons.map(code => REASONS[locale][code]).join(' / ')}; ${c.overlap > 0 ? `${zh ? '重疊' : 'overlap'} ${c.overlap}` : `${zh ? '間隔' : 'gap'} ${c.gap}`} ${zh ? '分鐘' : 'min'}${c.speakers.length ? `; ${zh ? '共同講者' : 'shared speakers'}: ${c.speakers.join('; ')}` : ''}`);
  if (!result.conflicts.length) lines.push(zh ? '依本頁規則未發現衝突；不代表整份活動安排已完整驗證。' : 'No conflicts under these rules; this is not a full event-plan validation.');
  lines.push('', zh ? '半開區間；不轉換時區或夏令時間；不支援跨午夜與 DST 跳時／重複時刻。' : 'Half-open intervals; no time-zone or daylight-saving conversion; no overnight or DST skipped/repeated clock times.');
  return lines.join('\n');
}
