import { tokenize, LIMITS, failure } from './lexer.mjs';
import { parseTokens } from './parser.mjs';

export function createOutputWriter() {
  const chunks = [];
  let bytes = 0;
  let failed = null;
  const encoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;
  return {
    append(chunk) {
      if (failed) return failed;
      if (!encoder) return (failed = failure('UNSUPPORTED'));
      if (typeof chunk !== 'string' || chunk.length > LIMITS.outputBytes) return (failed = failure('OUTPUT_TOO_LARGE'));
      const size = encoder.encode(chunk).byteLength;
      if (bytes + size > LIMITS.outputBytes) {
        chunks.length = 0;
        return (failed = failure('OUTPUT_TOO_LARGE'));
      }
      bytes += size;
      chunks.push(chunk);
      return { ok: true, value: undefined };
    },
    finish() {
      if (failed) return failed;
      return { ok: true, value: chunks.join('') };
    },
  };
}

export function formatNode(node, mode) {
  if (mode !== 'pretty' && mode !== 'compact') return failure('INVALID_MODE');
  const writer = createOutputWriter();
  let failed = null;
  const append = text => {
    if (failed) return;
    const result = writer.append(text);
    if (!result.ok) failed = result;
  };
  function write(current, depth) {
    if (failed) return;
    if (!['array', 'object'].includes(current.kind)) { append(current.raw); return; }
    const object = current.kind === 'object';
    const items = object ? current.entries : current.items;
    const pretty = mode === 'pretty';
    append(object ? '{' : '[');
    if (items.length) {
      if (pretty) append('\n');
      for (let index = 0; index < items.length && !failed; index++) {
        if (index) append(pretty ? ',\n' : ',');
        if (pretty) append('  '.repeat(depth + 1));
        if (object) { append(items[index].keyRaw); append(pretty ? ': ' : ':'); }
        write(object ? items[index].value : items[index], depth + 1);
      }
      if (pretty) { append('\n'); append('  '.repeat(depth)); }
    }
    append(object ? '}' : ']');
  }
  write(node, 0);
  return failed ?? writer.finish();
}

export function processJson(source, mode = 'pretty') {
  if (mode !== 'pretty' && mode !== 'compact') return failure('INVALID_MODE');
  const lexed = tokenize(source);
  if (!lexed.ok) return lexed;
  const parsed = parseTokens(lexed.value, source.length);
  if (!parsed.ok) return parsed;
  const formatted = formatNode(parsed.value, mode);
  return formatted.ok ? { ok: true, value: { text: formatted.value } } : formatted;
}
