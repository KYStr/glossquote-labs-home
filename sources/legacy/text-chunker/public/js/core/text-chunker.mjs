const MAX_SOURCE_UNITS = 100000;
const MAX_CHUNKS = 1000;
const REQUEST_KEYS = ['source', 'limit', 'mode'];

export function parseLimit(raw) {
  if (typeof raw !== 'string') return { ok: false, code: 'INTEGER_REQUIRED' };
  if (raw.length > 32) return { ok: false, code: 'INPUT_TOO_LONG' };
  const digits = raw.replace(/^[\u0009-\u000d\u0020]+|[\u0009-\u000d\u0020]+$/g, '');
  if (!/^[0-9]+$/.test(digits)) return { ok: false, code: 'INTEGER_REQUIRED' };
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) {
    return { ok: false, code: 'OUT_OF_RANGE' };
  }
  return { ok: true, value };
}

export function validateSource(source) {
  if (typeof source !== 'string') return { ok: false, code: 'INVALID_SOURCE' };
  if (source.length > MAX_SOURCE_UNITS) return { ok: false, code: 'SOURCE_TOO_LONG' };
  for (let i = 0; i < source.length; i += 1) {
    const unit = source.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = source.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return { ok: false, code: 'INVALID_UNICODE' };
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return { ok: false, code: 'INVALID_UNICODE' };
    }
  }
  if (source.length === 0) return { ok: false, code: 'SOURCE_EMPTY' };
  return { ok: true, utf16Length: source.length, codePointLength: Array.from(source).length };
}

function failure(code, sourceCodePointCount = null) {
  return { ok: false, code, chunks: [], sourceCodePointCount };
}

function readRequest(request) {
  if (request === null || typeof request !== 'object') return null;
  try {
    const prototype = Object.getPrototypeOf(request);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(request);
    if (keys.length !== REQUEST_KEYS.length || keys.some(key => !REQUEST_KEYS.includes(key))) return null;
    const values = Object.create(null);
    for (const key of REQUEST_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(request, key);
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
      values[key] = descriptor.value;
    }
    return values;
  } catch {
    return null;
  }
}

export function splitText(request) {
  const values = readRequest(request);
  if (!values) return failure('INVALID_REQUEST');
  const validated = validateSource(values.source);
  if (!validated.ok) return failure(validated.code);
  const sourceCodePointCount = validated.codePointLength;
  if (!Number.isSafeInteger(values.limit) || values.limit < 1 || values.limit > 10000) {
    return failure('OUT_OF_RANGE', sourceCodePointCount);
  }
  if (values.mode !== 'strict' && values.mode !== 'prefer-lf') {
    return failure('INVALID_MODE', sourceCodePointCount);
  }
  const tokens = Array.from(values.source);
  const chunks = [];
  let cursor = 0;
  while (cursor < tokens.length) {
    if (chunks.length === MAX_CHUNKS) return failure('CHUNK_LIMIT_EXCEEDED', sourceCodePointCount);
    const cap = Math.min(cursor + values.limit, tokens.length);
    let end = cap;
    if (values.mode === 'prefer-lf') {
      for (let i = cap - 1; i >= cursor; i -= 1) {
        if (tokens[i] === '\n') { end = i + 1; break; }
      }
    }
    chunks.push({
      index: chunks.length + 1,
      startCodePoint: cursor,
      endCodePoint: end,
      codePointCount: end - cursor,
      text: tokens.slice(cursor, end).join('')
    });
    cursor = end;
  }
  return { ok: true, chunks, sourceCodePointCount };
}
