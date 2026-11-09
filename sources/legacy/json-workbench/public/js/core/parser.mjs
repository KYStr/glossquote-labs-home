import { LIMITS, failure } from './lexer.mjs';
const success = value => ({ ok: true, value });

export function parseTokens(tokens, sourceLength) {
  if (!Array.isArray(tokens) || tokens.length === 0) return failure('EMPTY_INPUT');
  if (tokens.length > LIMITS.tokens) return failure('TOKEN_LIMIT');
  let cursor = 0;
  const syntax = () => failure('INVALID_JSON', tokens[cursor]?.start ?? sourceLength);
  function value(depth) {
    const token = tokens[cursor];
    if (!token) return syntax();
    if (['string', 'number', 'true', 'false', 'null'].includes(token.kind)) {
      cursor++;
      return success({ kind: token.kind, raw: token.raw });
    }
    if (token.kind !== '{' && token.kind !== '[') return syntax();
    if (depth + 1 > LIMITS.depth) return failure('DEPTH_LIMIT');
    const object = token.kind === '{';
    const close = object ? '}' : ']';
    const entries = [];
    const keys = new Set();
    cursor++;
    if (tokens[cursor]?.kind === close) {
      cursor++;
      return success(object ? { kind: 'object', entries } : { kind: 'array', items: entries });
    }
    while (cursor < tokens.length) {
      let key;
      if (object) {
        key = tokens[cursor];
        if (key?.kind !== 'string') return syntax();
        if (keys.has(key.decoded)) return failure('DUPLICATE_KEY', key.start);
        keys.add(key.decoded);
        cursor++;
        if (tokens[cursor]?.kind !== ':') return syntax();
        cursor++;
      }
      const child = value(depth + 1);
      if (!child.ok) return child;
      if (object) entries.push({ keyRaw: key.raw, keyValue: key.decoded, value: child.value });
      else entries.push(child.value);
      if (tokens[cursor]?.kind === close) {
        cursor++;
        return success(object ? { kind: 'object', entries } : { kind: 'array', items: entries });
      }
      if (tokens[cursor]?.kind !== ',') return syntax();
      cursor++;
      // A comma must be followed by another member; no trailing comma.
      if (tokens[cursor]?.kind === close) return syntax();
    }
    return syntax();
  }
  const result = value(0);
  if (!result.ok) return result;
  return cursor === tokens.length ? result : syntax();
}
