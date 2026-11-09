export const MAX_AUDIO_BYTES = 67_108_864;
export const MAX_NOTES = 1_000;
export const MAX_NOTE_UTF16 = 2_000;
export const MAX_TOTAL_NOTE_UTF8 = 1_048_576;
export const MAX_TITLE_UTF16 = 200;
export const MAX_IMPORT_BYTES = 4_194_304;
export const MAX_EXPORT_BYTES_EACH = 4_194_304;
export const MAX_EXPORT_BYTES_BOTH = 8_388_608;
export const MAX_NOTE_ID = 999_999_999_999;
export const KIND = 'glossquote-audio-cue-notes';
const encoder = new TextEncoder();

export const utf8Size = text => encoder.encode(text).byteLength;
export const validMs = value => Number.isSafeInteger(value) && value >= 0;
export const noteBytes = notes => notes.reduce((sum, note) => sum + utf8Size(note.text), 0);
export const maxNoteTime = notes => notes.reduce((max, note) => Math.max(max, note.timeMs), 0);

export function durationToMs(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return { error: 'invalid-duration' };
  const ms = Math.floor(seconds * 1000);
  return validMs(ms) ? ms : { error: 'invalid-duration' };
}

export function captureTimeMs(currentTime, durationMs) {
  if (!Number.isFinite(currentTime) || currentTime < 0 || !validMs(durationMs)) {
    return { error: 'invalid-time' };
  }
  const ms = Math.min(durationMs, Math.round(currentTime * 1000));
  return validMs(ms) ? ms : { error: 'invalid-time' };
}

export function parseDuration(text) {
  if (typeof text !== 'string') return { error: 'DURATION_FORMAT' };
  const match = /^(\d{2,8}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(text);
  if (!match || match[0] !== text) return { error: 'DURATION_FORMAT' };
  const ms = Number(match[1]) * 3_600_000 + Number(match[2]) * 60_000 +
    Number(match[3]) * 1000 + Number(match[4]);
  return validMs(ms) ? ms : { error: 'DURATION_FORMAT' };
}

export function formatTime(ms, alwaysHours = false) {
  if (!validMs(ms)) return '—';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor(ms / 60_000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  const pad = (number, length = 2) => String(number).padStart(length, '0');
  return `${alwaysHours || hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}.${pad(ms % 1000, 3)}`;
}

export function validTitle(title) {
  return typeof title === 'string' && title.trim().length > 0 && title.length <= MAX_TITLE_UTF16 &&
    !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(title);
}

export function createDraft(timeMs, durationMs) {
  return validMs(timeMs) && validMs(durationMs) && timeMs <= durationMs
    ? Object.freeze({ timeMs }) : { error: 'DURATION_RANGE' };
}

export function validateNote(text, notes, excludingId) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, code: 'NOTE_EMPTY' };
  if (text.length > MAX_NOTE_UTF16) return { ok: false, code: 'NOTE_TOO_LONG' };
  const remaining = notes.filter(note => note.noteId !== excludingId);
  if (remaining.length >= MAX_NOTES) return { ok: false, code: 'NOTE_LIMIT' };
  if (noteBytes(remaining) + utf8Size(text) > MAX_TOTAL_NOTE_UTF8) {
    return { ok: false, code: 'NOTE_TOTAL_BYTES' };
  }
  return { ok: true };
}

export function formatNoteId(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_NOTE_ID
    ? `note-${String(value).padStart(6, '0')}` : { error: 'NOTE_ID_EXHAUSTED' };
}

export function noteIdValue(id) {
  if (typeof id !== 'string' || !/^note-[0-9]{6,12}$/.test(id)) return null;
  const value = Number(id.slice(5));
  return formatNoteId(value) === id ? value : null;
}

export function nextNoteIdCounter(notes) {
  return notes.reduce((max, note) => Math.max(max, noteIdValue(note.noteId) ?? 0), 0) + 1;
}

export function commitDraft(notes, draft, counter, text, durationMs) {
  const noteId = formatNoteId(counter);
  if (typeof noteId !== 'string') return noteId;
  if (counter < nextNoteIdCounter(notes)) return { error: 'NOTE_ID_EXHAUSTED' };
  if (!draft || createDraft(draft.timeMs, durationMs).error) return { error: 'DURATION_RANGE' };
  const validation = validateNote(text, notes);
  if (!validation.ok) return { error: validation.code };
  return { notes: [...notes, { noteId, timeMs: draft.timeMs, text }], nextCounter: counter + 1 };
}

export function editNote(notes, id, text) {
  if (!notes.some(note => note.noteId === id)) return { error: 'NOTE_MISSING' };
  const validation = validateNote(text, notes, id);
  return validation.ok ? { notes: notes.map(note => note.noteId === id ? { ...note, text } : note) }
    : { error: validation.code };
}

export function sortForDisplay(notes) {
  return notes.map((note, index) => ({ note, index }))
    .sort((a, b) => a.note.timeMs - b.note.timeMs || a.index - b.index)
    .map(entry => entry.note);
}

export function emptyResult(sourceTitle, durationMs = 0) {
  return { schemaVersion: 1, kind: KIND, sourceTitle, durationMs, notes: [] };
}
