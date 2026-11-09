import { FIELDS, normalizeField } from './map-contacts.mjs';

export const VCARD_MIME = 'text/vcard;charset=utf-8';
export const VCARD_FILENAME = 'contacts.vcf';
export const OUTPUT_MAX_BYTES = 4194304;
export class VcardError extends Error {
  constructor(code) { super(code); this.name = 'VcardError'; this.code = code; }
}

export function escapeVcardText(value) {
  if (typeof value !== 'string') throw new VcardError('VCARD_VALUE');
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function octets(char) {
  const point = char.codePointAt(0);
  if (point >= 0xd800 && point <= 0xdfff) throw new VcardError('VCARD_VALUE');
  return point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
}

export function foldVcardLine(logicalLine, { maxOctets = 75 } = {}) {
  if (typeof logicalLine !== 'string' || /[\r\n]/u.test(logicalLine) || !Number.isInteger(maxOctets) || maxOctets < 5 || maxOctets > 75) throw new VcardError('VCARD_LINE');
  const lines = [];
  let parts = [], size = 0;
  for (let i = 0; i < logicalLine.length; i++) {
    let token = String.fromCodePoint(logicalLine.codePointAt(i));
    if (token.length === 2) i++;
    let width = octets(token);
    if (token === '\\') {
      const next = logicalLine[++i];
      if (!next || !['\\', 'n', 'N', ',', ';'].includes(next)) throw new VcardError('VCARD_ESCAPE');
      token += next; width++;
    }
    if (size + width > maxOctets) {
      lines.push(parts.join('')); parts = [' ']; size = 1;
    }
    parts.push(token); size += width;
  }
  lines.push(parts.join(''));
  return lines;
}

// Shared byte-budget boundary; accepts synthetic logical lines for the exact cap oracle.
export function encodeVcardLines(logicalLines, { maxBytes = OUTPUT_MAX_BYTES } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > OUTPUT_MAX_BYTES) throw new VcardError('OUTPUT_LIMIT_CONFIG');
  const chunks = [];
  let total = 0;
  for (const logicalLine of logicalLines) {
    const physical = foldVcardLine(logicalLine);
    let size = physical.length * 2;
    for (const line of physical) for (const char of line) size += octets(char);
    if (total + size > maxBytes) throw new VcardError('OUTPUT_LIMIT');
    total += size; chunks.push(physical.join('\r\n') + '\r\n');
  }
  return new TextEncoder().encode(chunks.join(''));
}

export function serializeVcards(contacts, options = {}) {
  if (!Array.isArray(contacts) || contacts.length < 1 || contacts.length > 1000) throw new VcardError('VCARD_CONTACTS');
  function* lines() {
    for (const contact of contacts) {
      const fields = {};
      for (const field of FIELDS) {
        const result = normalizeField(contact[field], field);
        if (result.code) throw new VcardError('VCARD_CONTACTS');
        fields[field] = result.value;
      }
      if (!fields.phone && !fields.email) throw new VcardError('VCARD_CONTACTS');
      yield 'BEGIN:VCARD'; yield 'VERSION:3.0'; yield 'N:;;;;';
      yield `FN:${escapeVcardText(fields.name)}`;
      for (const [field, property] of [['phone', 'TEL;TYPE=VOICE'], ['email', 'EMAIL;TYPE=INTERNET'], ['organization', 'ORG'], ['note', 'NOTE']]) {
        if (fields[field]) yield `${property}:${escapeVcardText(fields[field])}`;
      }
      yield 'END:VCARD';
    }
  }
  return encodeVcardLines(lines(), options);
}
