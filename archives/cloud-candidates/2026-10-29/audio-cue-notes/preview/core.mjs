// 純核心不接觸 DOM、檔案內容、網路或瀏覽器儲存。
export const LIMITS = Object.freeze({ bytes: 200 * 1024 * 1024, durationMs: 86400000, notes: 300, text: 2000 });
// 所有錯誤只回傳代碼，不攜帶使用者原文。
const fail = code => { throw new Error(code); };
// 嚴格檢查自有資料欄位，避免執行 getter 或接納隱藏欄位。
function record(value, keys) {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('SCHEMA');
  const names = Reflect.ownKeys(value);
  if (names.length !== keys.length || names.some(key => !keys.includes(key))) fail('SCHEMA');
  for (const key of keys) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !('value' in field) || !field.enumerable) fail('SCHEMA');
  }
}
// 時間採整數毫秒，禁止 NaN、Infinity、小數與負零。
export function validTime(value, maximum = LIMITS.durationMs) {
  if (!Number.isSafeInteger(value) || Object.is(value, -0) || value < 0 || value > maximum) fail('TIME_RANGE');
  return value;
}
// 音訊 metadata 可能有小數；向下取整避免標記超過可播放範圍。
export function durationToMs(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || seconds > 86400) fail('DURATION');
  const ms = Math.floor(seconds * 1000);
  if (ms < 1) fail('DURATION');
  return ms;
}
// 僅允許有限大小的音訊候選；實際解碼能力由瀏覽器判斷。
export function validateFile(file) {
  record(file, ['size', 'type', 'name']);
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > LIMITS.bytes) fail('FILE_SIZE');
  if (typeof file.type !== 'string' || typeof file.name !== 'string') fail('FILE_TYPE');
  if (!(file.type.startsWith('audio/') || file.type === '' && /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name))) fail('FILE_TYPE');
  return true;
}
// 固定 ASCII 時間格式，不猜測區域時間、不接納前後空白。
export function parseTimestamp(value, maximum = LIMITS.durationMs) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(value)) fail('TIME_FORMAT');
  const [h, m, s, ms] = value.split(/[:.]/).map(Number);
  if (m > 59 || s > 59) fail('TIME_FORMAT');
  return validTime(((h * 60 + m) * 60 + s) * 1000 + ms, maximum);
}
// 同一個 formatter 同時用於畫面、TXT 與測試可檢查的時間碼。
export function formatTimestamp(value) {
  validTime(value);
  const pad = (number, width = 2) => String(number).padStart(width, '0');
  return `${pad(Math.floor(value / 3600000))}:${pad(Math.floor(value / 60000) % 60)}:${pad(Math.floor(value / 1000) % 60)}.${pad(value % 1000, 3)}`;
}
// 保留使用者正常空白與多行內容，只統一 CRLF/CR 為 LF。
export function normalizeText(value) {
  if (typeof value !== 'string' || value.length > LIMITS.text || !value.trim()) fail('TEXT');
  if (!value.isWellFormed() || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) fail('TEXT');
  return value.replace(/\r\n?/g, '\n');
}
// 整份文件先驗證再建立獨立快照；不會排序或改動來源。
export function snapshot(document) {
  record(document, ['durationMs', 'notes']);
  const durationMs = validTime(document.durationMs);
  if (durationMs === 0) fail('DURATION');
  const notes = document.notes;
  if (!Array.isArray(notes) || Object.getPrototypeOf(notes) !== Array.prototype || notes.length > LIMITS.notes) fail('NOTES');
  if (Reflect.ownKeys(notes).length !== notes.length + 1) fail('SCHEMA');
  const ids = new Set();
  const copied = [];
  for (let index = 0; index < notes.length; index += 1) {
    const item = Object.getOwnPropertyDescriptor(notes, String(index));
    if (!item || !('value' in item) || !item.enumerable) fail('SCHEMA');
    const note = item.value;
    record(note, ['id', 'timeMs', 'text']);
    if (!Number.isSafeInteger(note.id) || note.id < 1 || ids.has(note.id)) fail('SCHEMA');
    ids.add(note.id);
    copied.push({ id: note.id, timeMs: validTime(note.timeMs, durationMs), text: normalizeText(note.text) });
  }
  // 相同時間點保留新增順序，而非目前畫面或編輯順序。
  copied.sort((a, b) => a.timeMs - b.timeMs || a.id - b.id);
  return { durationMs, notes: copied };
}
// 匯出不帶檔名、路徑、音檔位元組、內部 ID 或 object URL。
export function exportNotes(document, language) {
  if (!['zh-Hant', 'en'].includes(language)) fail('LANGUAGE');
  const data = snapshot(document);
  if (!data.notes.length) fail('EMPTY');
  const heading = language === 'en' ? 'Timestamped Audio Notes' : '錄音時間戳筆記';
  const duration = language === 'en' ? 'Duration' : '音檔長度';
  const txt = [heading, `${duration}: ${formatTimestamp(data.durationMs)}`, '', ...data.notes.map(note => `[${formatTimestamp(note.timeMs)}] ${note.text}`)].join('\n');
  const json = JSON.stringify({ format: 'glossquote-audio-cue-notes', version: 1, durationMs: data.durationMs, notes: data.notes.map(({ timeMs, text }) => ({ timeMs, text })) }, null, 2);
  return Object.freeze({ txt, json });
}
