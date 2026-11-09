import { fail } from './errors.js';
const TAGS = new Set(['META', 'TITLE', 'H1', 'DL', 'DT', 'H3', 'A', 'P']);
const SPACE = /[\t\n\r ]/;
export function* tokenize(source) {
  let index = 0;
  while (index < source.length) {
    const offset = index;
    if (source[index] !== '<') {
      let end = source.indexOf('<', index);
      if (end === -1) end = source.length;
      yield { kind: 'text', value: source.slice(index, end), offset };
      index = end;
      continue;
    }
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);
      if (end === -1 || source.slice(index + 4, end).includes('--')) fail('UNSUPPORTED_MARKUP', offset);
      index = end + 3;
      continue;
    }
    if (/^<!DOCTYPE NETSCAPE-Bookmark-file-1>/i.test(source.slice(index, index + 35))) {
      index += 35;
      yield { kind: 'doctype', offset };
      continue;
    }
    index++;
    const closing = source[index] === '/';
    if (closing) index++;
    const nameMatch = /^[A-Za-z][A-Za-z0-9]*/.exec(source.slice(index));
    if (!nameMatch) fail('UNSUPPORTED_MARKUP', offset);
    const name = nameMatch[0].toUpperCase();
    index += nameMatch[0].length;
    if (!TAGS.has(name)) fail('UNSUPPORTED_MARKUP', offset);
    const attrs = Object.create(null);
    while (index < source.length) {
      let spaces = 0;
      while (SPACE.test(source[index] ?? '') && index < source.length) { spaces++; index++; }
      if (source[index] === '>') { index++; break; }
      if (closing || !spaces) fail('UNSUPPORTED_MARKUP', index);
      const attrOffset = index;
      const attrMatch = /^[A-Za-z][A-Za-z0-9_-]*/.exec(source.slice(index));
      if (!attrMatch) fail('UNSUPPORTED_ATTRIBUTE', index);
      const key = attrMatch[0].toUpperCase();
      index += attrMatch[0].length;
      if (Object.hasOwn(attrs, key)) fail('UNSUPPORTED_ATTRIBUTE', attrOffset);
      while (index < source.length && SPACE.test(source[index])) index++;
      if (source[index] !== '=') fail('UNSUPPORTED_ATTRIBUTE', attrOffset);
      index++;
      while (index < source.length && SPACE.test(source[index])) index++;
      const quote = source[index];
      if (quote !== '"' && quote !== "'") fail('UNSUPPORTED_ATTRIBUTE', attrOffset);
      index++;
      const valueOffset = index;
      const end = source.indexOf(quote, index);
      if (end === -1) fail('UNSUPPORTED_MARKUP', attrOffset);
      attrs[key] = { value: source.slice(index, end), offset: valueOffset };
      index = end + 1;
    }
    if (source[index - 1] !== '>') fail('UNSUPPORTED_MARKUP', offset);
    yield { kind: closing ? 'end' : 'start', name, attrs, offset };
  }
  yield { kind: 'eof', offset: source.length };
}
