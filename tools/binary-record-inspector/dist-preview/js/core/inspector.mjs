// Binary Record Inspector — pure core.
// Validation, decoding and canonical report serialization only.
// No DOM, network, or storage access. The same bytes are embedded into the
// module Worker by scripts/build.mjs and imported directly by the tests.
//
// Contract: docs/specs/binary-record-inspector/SPEC.md
// (spec-binary-record-inspector-20261109).

export const MAX_HEX_UNITS = 16384;
export const MAX_LAYOUT_UNITS = 4096;
export const MAX_BYTES = 4096;
export const MAX_LAYOUT_ROWS = 64;
export const MAX_REPORT_BYTES = 2097152;

// Width in bytes per field type.
export const FIELD_TYPES = Object.freeze({
  u8: 1,
  i8: 1,
  u16le: 2,
  u16be: 2,
  i16le: 2,
  i16be: 2,
  u32le: 4,
  u32be: 4,
  i32le: 4,
  i32be: 4,
  u64le: 8,
  u64be: 8,
  i64le: 8,
  i64be: 8,
});

const HEX_DIGIT = /^[0-9a-fA-F]+$/;
const LABEL_RE = /^[A-Za-z][A-Za-z0-9_-]{0,23}$/;
const OFFSET_RE = /^(0|[1-9][0-9]{0,3})$/;

function fail(code, field, row = null) {
  return { ok: false, error: { code, field, row } };
}

function hasLoneSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= text.length) return true;
      const next = text.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// The input must be a plain object with exactly the own data fields
// `hex` and `layout`, both strings held by data descriptors. Unknown or
// missing fields, wrong types, and accessors are all SCHEMA.
function checkInputSchema(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }
  if (Reflect.ownKeys(input).length !== 2) return false;
  for (const name of ['hex', 'layout']) {
    if (!Object.prototype.hasOwnProperty.call(input, name)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(input, name);
    if (!descriptor || 'get' in descriptor || 'set' in descriptor) return false;
    if (typeof descriptor.value !== 'string') return false;
  }
  return true;
}

function decodeValue(bytes, offset, type, width) {
  const bigEndian = type.endsWith('be');
  let n = 0n;
  if (bigEndian || width === 1) {
    for (let k = 0; k < width; k += 1) {
      n = (n << 8n) + BigInt(bytes[offset + k]);
    }
  } else {
    for (let k = width - 1; k >= 0; k -= 1) {
      n = (n << 8n) + BigInt(bytes[offset + k]);
    }
  }
  if (type.charCodeAt(0) === 105) {
    // Signed: i*.
    const half = 1n << BigInt(width * 8 - 1);
    if (n >= half) n -= 1n << BigInt(width * 8);
  }
  return n.toString(10);
}

function fieldHex(bytes, offset, width) {
  let out = '';
  for (let k = 0; k < width; k += 1) {
    out += bytes[offset + k].toString(16).padStart(2, '0');
  }
  return out;
}

// Synchronous pure data transformation.
// Returns { ok: true, result: { byteCount, fields } } or
// { ok: false, error: { code, field, row } }.
// Validation order: hex capacity, hex surrogate, hex grammar, then layout
// capacity, layout surrogate, layout grammar; layout rows are checked in
// order, per row: format, duplicate label, type, bounds.
export function run(input) {
  if (!checkInputSchema(input)) return fail('SCHEMA', null, null);

  const hex = input.hex;
  if (hex.length > MAX_HEX_UNITS) return fail('INPUT_LIMIT', 'hex', null);
  if (hasLoneSurrogate(hex)) return fail('UNICODE', 'hex', null);
  if (hex.length === 0) return fail('EMPTY', 'hex', null);
  const tokens = hex.split(/[ \t\n]+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return fail('EMPTY', 'hex', null);
  let byteCount = 0;
  for (const token of tokens) {
    if (token.length % 2 !== 0 || !HEX_DIGIT.test(token)) {
      return fail('HEX_FORMAT', 'hex', null);
    }
    byteCount += token.length / 2;
  }
  if (byteCount > MAX_BYTES) return fail('BYTE_LIMIT', 'hex', null);
  const bytes = new Uint8Array(byteCount);
  let position = 0;
  for (const token of tokens) {
    for (let i = 0; i < token.length; i += 2) {
      bytes[position] = Number.parseInt(token.slice(i, i + 2), 16);
      position += 1;
    }
  }

  const layout = input.layout;
  if (layout.length > MAX_LAYOUT_UNITS) return fail('INPUT_LIMIT', 'layout', null);
  if (hasLoneSurrogate(layout)) return fail('UNICODE', 'layout', null);
  if (layout.length === 0) return fail('EMPTY', 'layout', null);
  let layoutText = layout;
  if (layoutText.endsWith('\n')) layoutText = layoutText.slice(0, -1);
  const lines = layoutText.split('\n');
  if (lines.length > MAX_LAYOUT_ROWS) return fail('ROW_LIMIT', 'layout', null);
  const seenLabels = new Set();
  const fields = [];
  for (let i = 0; i < lines.length; i += 1) {
    const row = i + 1;
    const parts = lines[i].split('\t');
    if (parts.length !== 3) return fail('LAYOUT_FORMAT', 'layout', row);
    const [label, offsetText, type] = parts;
    if (!LABEL_RE.test(label)) return fail('LAYOUT_FORMAT', 'layout', row);
    if (seenLabels.has(label)) return fail('DUP_LABEL', 'layout', row);
    seenLabels.add(label);
    if (!OFFSET_RE.test(offsetText)) return fail('LAYOUT_FORMAT', 'layout', row);
    const offset = Number(offsetText);
    const width = FIELD_TYPES[type];
    if (width === undefined) return fail('TYPE', 'layout', row);
    if (offset + width > bytes.length) return fail('BOUNDS', 'layout', row);
    fields.push({
      label,
      offset,
      type,
      hex: fieldHex(bytes, offset, width),
      value: decodeValue(bytes, offset, type, width),
    });
  }
  return { ok: true, result: { byteCount, fields } };
}

function escapeJsonString(text) {
  let out = '"';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20) out += '\\u' + code.toString(16).padStart(4, '0');
    else out += ch;
  }
  return out + '"';
}

// Compact JSON with object own keys sorted by UTF-16 code units
// (Array.prototype.sort on strings compares UTF-16 code units), array order
// unchanged. Strings are escaped literally; no toJSON is ever invoked.
function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite number');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return escapeJsonString(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const parts = keys.map(
      (key) => escapeJsonString(key) + ':' + canonicalJson(value[key]),
    );
    return '{' + parts.join(',') + '}';
  }
  throw new TypeError('unsupported value in report');
}

// Serialize a run() result into the fixed report text: compact canonical
// JSON plus one trailing LF, UTF-8, no BOM. Over the byte cap: OUTPUT_LIMIT.
export function serializeReport(result) {
  let text;
  try {
    text = canonicalJson(result) + '\n';
  } catch {
    return fail('INTERNAL', null, null);
  }
  const size = new TextEncoder().encode(text).length;
  if (size > MAX_REPORT_BYTES) return fail('OUTPUT_LIMIT', null, null);
  return { ok: true, text };
}
