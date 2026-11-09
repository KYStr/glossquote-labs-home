import { formatTime, sortForDisplay } from './notes.js';
import { checkExportBytes, exportableResult } from './serialize-json.js';

export function serializeMarkdown(result) {
  // Markdown callers may provide the content fields; never transfer extra metadata to output.
  const checked = exportableResult({
    schemaVersion: 1, kind: 'glossquote-audio-cue-notes',
    sourceTitle: result?.sourceTitle, durationMs: result?.durationMs, notes: result?.notes
  });
  if (checked.error) return checked;
  const value = checked.result;
  let text = `# ${value.sourceTitle}\nDuration: ${formatTime(value.durationMs, true)}\n\n`;
  for (const note of sortForDisplay(value.notes)) {
    const lines = note.text.replace(/\r\n?/g, '\n').split('\n');
    text += `[${formatTime(note.timeMs)}] ${lines[0]}\n`;
    for (const line of lines.slice(1)) text += `    ${line}\n`;
  }
  return checkExportBytes(new TextEncoder().encode(text));
}
