import {
  KIND, MAX_NOTES, MAX_NOTE_UTF16, MAX_TOTAL_NOTE_UTF8, MAX_IMPORT_BYTES,
  validMs, validTitle, noteIdValue, utf8Size
} from './notes.js';

const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function validateResult(value) {
  if (!exactKeys(value, ['schemaVersion', 'kind', 'sourceTitle', 'durationMs', 'notes'])) {
    return { error: 'IMPORT_SCHEMA' };
  }
  if (value.schemaVersion !== 1 || value.kind !== KIND || !validMs(value.durationMs)) {
    return { error: 'IMPORT_SCHEMA' };
  }
  if (!validTitle(value.sourceTitle)) return { error: 'TITLE_INVALID' };
  if (!Array.isArray(value.notes) || value.notes.length > MAX_NOTES) return { error: 'NOTE_LIMIT' };
  const seen = new Set();
  let textBytes = 0;
  const notes = [];
  for (const note of value.notes) {
    if (!exactKeys(note, ['noteId', 'timeMs', 'text'])) return { error: 'IMPORT_SCHEMA' };
    if (noteIdValue(note.noteId) === null || seen.has(note.noteId)) return { error: 'IMPORT_NOTE_ID' };
    if (!validMs(note.timeMs) || note.timeMs > value.durationMs) return { error: 'DURATION_RANGE' };
    if (typeof note.text !== 'string' || !note.text.trim()) return { error: 'NOTE_EMPTY' };
    if (note.text.length > MAX_NOTE_UTF16) return { error: 'NOTE_TOO_LONG' };
    textBytes += utf8Size(note.text);
    if (textBytes > MAX_TOTAL_NOTE_UTF8) return { error: 'NOTE_TOTAL_BYTES' };
    seen.add(note.noteId);
    notes.push({ noteId: note.noteId, timeMs: note.timeMs, text: note.text });
  }
  return { result: {
    schemaVersion: 1, kind: KIND, sourceTitle: value.sourceTitle,
    durationMs: value.durationMs, notes
  } };
}

export function parseImport(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_IMPORT_BYTES) return { error: 'IMPORT_TOO_LARGE' };
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  let text;
  try {
    // Preserve any second BOM, so JSON.parse rejects it rather than stripping it twice.
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(start));
  } catch {
    return { error: 'IMPORT_UTF8' };
  }
  let value;
  try { value = JSON.parse(text); } catch { return { error: 'IMPORT_JSON' }; }
  return validateResult(value);
}
