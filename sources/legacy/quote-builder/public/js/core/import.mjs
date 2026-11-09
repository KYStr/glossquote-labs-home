import { validateQuoteInput } from './quote.mjs';
export const importMaxBytes = 524288;

export function parseBoundedJson(text, { maxDepth = 6, maxNodes = 2000 } = {}) {
  let cursor = 0;
  let nodes = 0;
  const fail = code => { throw new Error(code); };
  const whitespace = () => { while (/[\x20\t\r\n]/.test(text[cursor] || '\0')) cursor++; };
  const count = () => { if (++nodes > maxNodes) fail('IMPORT_NODES'); };
  function string() {
    const start = cursor++;
    while (cursor < text.length) {
      const character = text[cursor++];
      if (character === '"') {
        try { return JSON.parse(text.slice(start, cursor)); } catch { fail('IMPORT_JSON'); }
      }
      if (character === '\\') cursor++;
    }
    fail('IMPORT_JSON');
  }
  function value(depth) {
    if (depth > maxDepth) fail('IMPORT_DEPTH');
    count(); whitespace();
    const character = text[cursor];
    if (character === '"') return string();
    if (character === '{') {
      cursor++; whitespace();
      const object = Object.create(null);
      const keys = new Set();
      if (text[cursor] === '}') { cursor++; return object; }
      while (cursor < text.length) {
        if (text[cursor] !== '"') fail('IMPORT_JSON');
        count(); const key = string();
        if (keys.has(key)) fail('IMPORT_DUPLICATE');
        keys.add(key); whitespace();
        if (text[cursor++] !== ':') fail('IMPORT_JSON');
        object[key] = value(depth + 1); whitespace();
        const separator = text[cursor++];
        if (separator === '}') return object;
        if (separator !== ',') fail('IMPORT_JSON');
        whitespace();
      }
      fail('IMPORT_JSON');
    }
    if (character === '[') {
      cursor++; whitespace(); const array = [];
      if (text[cursor] === ']') { cursor++; return array; }
      while (cursor < text.length) {
        array.push(value(depth + 1)); whitespace();
        const separator = text[cursor++];
        if (separator === ']') return array;
        if (separator !== ',') fail('IMPORT_JSON');
        whitespace();
      }
      fail('IMPORT_JSON');
    }
    for (const [token, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(token, cursor)) { cursor += token.length; return result; }
    }
    const numeric = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(cursor));
    if (!numeric) fail('IMPORT_JSON');
    cursor += numeric[0].length;
    // JSON numbers are never money; only version:1 is accepted by the schema.
    const result = JSON.parse(numeric[0]);
    if (!Number.isFinite(result)) fail('IMPORT_JSON');
    return result;
  }
  const result = value(1); whitespace();
  if (cursor !== text.length) fail('IMPORT_JSON');
  return result;
}

export function parseQuoteImport(utf8Bytes) {
  if (!(utf8Bytes instanceof Uint8Array)) return { ok: false, code: 'IMPORT_TYPE' };
  if (utf8Bytes.byteLength > importMaxBytes) return { ok: false, code: 'IMPORT_SIZE' };
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(utf8Bytes); }
  catch { return { ok: false, code: 'IMPORT_UTF8' }; }
  let parsed;
  try { parsed = parseBoundedJson(text); }
  catch (error) {
    const known = ['IMPORT_JSON', 'IMPORT_DUPLICATE', 'IMPORT_DEPTH', 'IMPORT_NODES'];
    return { ok: false, code: known.includes(error.message) ? error.message : 'IMPORT_JSON' };
  }
  const validated = validateQuoteInput(parsed);
  if (!validated.ok) return { ok: false, code: 'IMPORT_SCHEMA', field: validated.errors[0].field, errors: validated.errors };
  return validated;
}
