import { LIMITS, ToolError, abortIfNeeded } from './errors.mjs';
import { inspectMissing } from './template.mjs';

const yieldTurn = () => new Promise(resolve => setTimeout(resolve, 0));

export async function renderBatch(rows, compiled, {
  allowBlank = false, signal, isCurrent = () => true, onProgress = () => {}, yieldControl = yieldTurn,
} = {}) {
  abortIfNeeded(signal, isCurrent);
  if (rows.length > LIMITS.maxRows) throw new ToolError('ROW_LIMIT');
  const missing = inspectMissing(rows, compiled.fields);
  if (missing.totalCells && !allowBlank) throw new ToolError('MISSING_VALUES', missing);
  const encoder = new TextEncoder();
  let recordTextBytes = 0;
  const records = [];
  for (let i = 0; i < rows.length; i++) {
    abortIfNeeded(signal, isCurrent);
    const values = rows[i];
    const pieces = [];
    const fieldBytes = new Map();
    let tailCodeUnit = -1;
    // Appended values are never passed back through the template scanner.
    for (const segment of compiled.segments) {
      const piece = segment.type === 'literal' ? segment.value : values[segment.index];
      let byteLength;
      if (segment.type === 'field' && fieldBytes.has(segment.index)) byteLength = fieldBytes.get(segment.index);
      else {
        byteLength = encoder.encode(piece).byteLength;
        if (segment.type === 'field') fieldBytes.set(segment.index, byteLength);
      }
      recordTextBytes += byteLength;
      if (piece.length) {
        const first = piece.charCodeAt(0);
        if (tailCodeUnit >= 0xd800 && tailCodeUnit <= 0xdbff && first >= 0xdc00 && first <= 0xdfff) recordTextBytes -= 2;
        tailCodeUnit = piece.charCodeAt(piece.length - 1);
      }
      // Check before joining repeated large cells into a potentially huge string.
      // A trailing surrogate may combine with the next nonempty segment.
      const pendingBytes = tailCodeUnit >= 0xd800 && tailCodeUnit <= 0xdbff ? 3 : 0;
      if (recordTextBytes - pendingBytes > LIMITS.maxCombinedBytes) throw new ToolError('OUTPUT_TOO_LARGE');
      pieces.push(piece);
    }
    if (recordTextBytes > LIMITS.maxCombinedBytes) throw new ToolError('OUTPUT_TOO_LARGE');
    const text = pieces.join('');
    records.push({ row: i + 1, text, blankFields: compiled.fields.filter(field => values[field.index] === '').map(field => field.name) });
    if ((i + 1) % 100 === 0) {
      onProgress({ completed: i + 1, total: rows.length });
      await yieldControl();
      abortIfNeeded(signal, isCurrent);
    }
  }
  abortIfNeeded(signal, isCurrent);
  return { records, recordTextBytes };
}
