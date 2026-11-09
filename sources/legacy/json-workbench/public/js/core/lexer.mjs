export const LIMITS = Object.freeze({ inputBytes: 262144, tokens: 50000, stringUnits: 65536, numberUnits: 4096, depth: 64, outputBytes: 4194304 });
export const failure = (code, offset = null) => ({ ok: false, error: { code, offset } });
const success = value => ({ ok: true, value });
const whitespace = char => char === ' ' || char === '\t' || char === '\r' || char === '\n';
const digit = char => char >= '0' && char <= '9';
const hex = char => !!char && /^[0-9a-f]$/iu.test(char);

export function unpairedSurrogate(text) {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return index;
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) return index;
  }
  return -1;
}

export function tokenize(source) {
  if (typeof source !== 'string') return failure('INVALID_JSON', 0);
  if (source.length > LIMITS.inputBytes) return failure('INPUT_TOO_LARGE');
  if (typeof TextEncoder !== 'function') return failure('UNSUPPORTED');
  if (new TextEncoder().encode(source).byteLength > LIMITS.inputBytes) return failure('INPUT_TOO_LARGE');
  const unpaired = unpairedSurrogate(source);
  if (unpaired !== -1) return failure('INVALID_UNICODE', unpaired);
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    if (whitespace(source[index])) { index++; continue; }
    const start = index;
    let kind;
    if ('{}[]:,'.includes(source[index])) { kind = source[index++]; }
    else if (source[index] === '"') {
      kind = 'string';
      index++;
      let closed = false;
      while (index < source.length) {
        if (index - start >= LIMITS.stringUnits) return failure('TOKEN_TOO_LONG');
        const char = source[index++];
        if (char === '"') { closed = true; break; }
        if (char.charCodeAt(0) < 0x20) return failure('INVALID_JSON', index - 1);
        if (char === '\\') {
          if (index >= source.length) return failure('INVALID_JSON', source.length);
          const escape = source[index++];
          if (escape === 'u') {
            for (let count = 0; count < 4; count++) {
              if (index - start >= LIMITS.stringUnits) return failure('TOKEN_TOO_LONG');
              if (!hex(source[index])) return failure('INVALID_JSON', index);
              index++;
            }
          } else if (!'"\\/bfnrt'.includes(escape)) return failure('INVALID_JSON', index - 1);
          if (index - start > LIMITS.stringUnits) return failure('TOKEN_TOO_LONG');
        }
      }
      if (!closed) return failure('INVALID_JSON', source.length);
      const raw = source.slice(start, index);
      // The entire document is never passed to the native parser.
      let decoded;
      try { decoded = JSON.parse(raw); } catch { return failure('INVALID_JSON', start); }
      if (unpairedSurrogate(decoded) !== -1) return failure('INVALID_UNICODE', start);
      if (tokens.length >= LIMITS.tokens) return failure('TOKEN_LIMIT');
      tokens.push({ kind, raw, start, end: index, decoded });
      continue;
    } else if (source[index] === '-' || digit(source[index])) {
      kind = 'number';
      if (source[index] === '-') index++;
      if (source[index] === '0') index++;
      else if (source[index] >= '1' && source[index] <= '9') {
        while (digit(source[index])) {
          index++;
          if (index - start > LIMITS.numberUnits) return failure('TOKEN_TOO_LONG');
        }
      } else return failure('INVALID_JSON', index);
      if (source[index] === '.') {
        index++;
        if (!digit(source[index])) return failure('INVALID_JSON', index);
        while (digit(source[index])) {
          index++;
          if (index - start > LIMITS.numberUnits) return failure('TOKEN_TOO_LONG');
        }
      }
      if (source[index] === 'e' || source[index] === 'E') {
        index++;
        if (source[index] === '+' || source[index] === '-') index++;
        if (!digit(source[index])) return failure('INVALID_JSON', index);
        while (digit(source[index])) {
          index++;
          if (index - start > LIMITS.numberUnits) return failure('TOKEN_TOO_LONG');
        }
      }
      if (index - start > LIMITS.numberUnits) return failure('TOKEN_TOO_LONG');
    } else {
      const literal = ['true', 'false', 'null'].find(value => source.startsWith(value, index));
      if (!literal) return failure('INVALID_JSON', index);
      kind = literal;
      index += literal.length;
    }
    if (tokens.length >= LIMITS.tokens) return failure('TOKEN_LIMIT');
    tokens.push({ kind, raw: source.slice(start, index), start, end: index });
  }
  return tokens.length ? success(tokens) : failure('EMPTY_INPUT');
}

export function locate(source, offset) {
  const end = Math.max(0, Math.min(source.length, offset));
  let line = 1;
  let column = 1;
  for (let index = 0; index < end; index++) {
    if (source[index] === '\r') {
      if (source[index + 1] === '\n' && index + 1 < end) index++;
      line++; column = 1;
    } else if (source[index] === '\n') { line++; column = 1; }
    else column++;
  }
  return { line, column };
}
