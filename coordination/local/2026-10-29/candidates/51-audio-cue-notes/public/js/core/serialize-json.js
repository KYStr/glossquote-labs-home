import { MAX_EXPORT_BYTES_EACH } from './notes.js';
import { validateResult } from './validate-json.js';

export function checkExportBytes(bytes) {
  return bytes instanceof Uint8Array && bytes.byteLength <= MAX_EXPORT_BYTES_EACH
    ? bytes : { error: 'EXPORT_TOO_LARGE' };
}

export function exportableResult(result) {
  const checked = validateResult(result);
  if (checked.error || !checked.result.sourceTitle.isWellFormed() ||
      checked.result.notes.some(note => !note.text.isWellFormed())) return { error: 'INVALID_RESULT' };
  return checked;
}

export function serializeJson(result) {
  const checked = exportableResult(result);
  if (checked.error) return checked;
  return checkExportBytes(new TextEncoder().encode(`${JSON.stringify(checked.result, null, 2)}\n`));
}
