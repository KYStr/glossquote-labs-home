export const MAX_TEXT_CODE_UNITS = 200_000;
export const MAX_TEXT_UTF8_BYTES = 262_144;
export const MAX_SOURCE_LINES = MAX_TEXT_CODE_UNITS + 1;

const OPTION_NAMES = ['trimAscii', 'dropEmpty', 'deduplicate'];

function failure(code) {
  return { ok: false, error: { code } };
}

function validateOptions(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    return failure('INVALID_OPTIONS');
  }

  try {
    const ownKeys = Reflect.ownKeys(options);
    if (ownKeys.length !== OPTION_NAMES.length ||
        ownKeys.some((key) => typeof key !== 'string' || !OPTION_NAMES.includes(key))) {
      return failure('INVALID_OPTIONS');
    }

    const values = Object.create(null);
    for (const name of OPTION_NAMES) {
      const descriptor = Object.getOwnPropertyDescriptor(options, name);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') ||
          typeof descriptor.value !== 'boolean') {
        return failure('INVALID_OPTIONS');
      }
      values[name] = descriptor.value;
    }
    return { ok: true, value: values };
  } catch {
    return failure('INVALID_OPTIONS');
  }
}

function hasPairedSurrogates(text) {
  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function validateText(text) {
  if (typeof text !== 'string') return failure('INVALID_UNICODE');
  if (text.length > MAX_TEXT_CODE_UNITS) return failure('INPUT_TOO_LARGE');
  if (!hasPairedSurrogates(text)) return failure('INVALID_UNICODE');

  const Encoder = globalThis.TextEncoder;
  if (typeof Encoder !== 'function') return failure('UNSUPPORTED');

  let utf8Bytes;
  try {
    utf8Bytes = new Encoder().encode(text).byteLength;
  } catch {
    return failure('UNSUPPORTED');
  }
  if (utf8Bytes > MAX_TEXT_UTF8_BYTES) return failure('INPUT_TOO_LARGE');
  return { ok: true, value: { utf8Bytes } };
}

export function normalizeNewlines(text) {
  return text.replace(/\r\n|\r/g, '\n');
}

// Call after validateText has succeeded; that also confirms TextEncoder support and valid Unicode.
export function measureText(lfText) {
  const Encoder = globalThis.TextEncoder;
  if (typeof Encoder !== 'function') throw new Error('TextEncoder is unavailable.');

  let codePoints = 0;
  for (const _codePoint of lfText) codePoints += 1;

  const lines = lfText.length === 0 ? 0 : lfText.split('\n').length;
  const utf8Bytes = new Encoder().encode(lfText).byteLength;
  return { codePoints, lines, utf8Bytes };
}

export function cleanText(text, options) {
  const validation = validateText(text);
  if (!validation.ok) return validation;

  const checkedOptions = validateOptions(options);
  if (!checkedOptions.ok) return checkedOptions;

  const lfText = normalizeNewlines(text);
  const before = measureText(lfText);
  const sourceLines = lfText === '' ? [] : lfText.split('\n');
  const lines = [];
  const provenance = {
    keptSourceLines: [], emptyRemovedSourceLines: [],
    duplicateRemovedSourceLines: [], duplicateFirstSourceLines: [], trimmedSourceLines: [],
  };
  const seen = checkedOptions.value.deduplicate ? new Map() : null;
  for (let index = 0; index < sourceLines.length; index += 1) {
    const sourceLine = index + 1;
    const original = sourceLines[index];
    const line = checkedOptions.value.trimAscii ? original.replace(/^[ \t]+|[ \t]+$/g, '') : original;
    if (line !== original) provenance.trimmedSourceLines.push(sourceLine);
    if (checkedOptions.value.dropEmpty && line.length === 0) {
      provenance.emptyRemovedSourceLines.push(sourceLine);
      continue;
    }
    const first = seen?.get(line);
    if (first !== undefined) {
      provenance.duplicateRemovedSourceLines.push(sourceLine);
      provenance.duplicateFirstSourceLines.push(first);
      continue;
    }
    seen?.set(line, sourceLine);
    provenance.keptSourceLines.push(sourceLine);
    lines.push(line);
  }
  const output = lines.join('\n');
  const after = measureText(output);
  return { ok: true, value: { text: output, before, after, provenance } };
}
