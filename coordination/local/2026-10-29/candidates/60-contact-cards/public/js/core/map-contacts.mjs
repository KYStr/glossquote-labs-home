export const FIELDS = Object.freeze(['name', 'phone', 'email', 'organization', 'note']);

export class MappingError extends Error {
  constructor(code, field = null) {
    super(code); this.name = 'MappingError'; this.code = code; this.field = field;
  }
}
export class ContactErrors extends Error {
  constructor(issues) {
    super('CONTACT_ERRORS'); this.name = 'ContactErrors'; this.code = 'CONTACT_ERRORS'; this.issues = issues;
  }
}

export function validateMappings(headerCount, mapping) {
  if (!Number.isInteger(headerCount) || headerCount < 1 || headerCount > 30 || !mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new MappingError('MAPPING_SCHEMA');
  if (Object.keys(mapping).some((key) => !FIELDS.includes(key))) throw new MappingError('MAPPING_SCHEMA');
  const result = {}, used = new Set();
  for (const field of FIELDS) {
    const index = Object.hasOwn(mapping, field) ? mapping[field] : null;
    if (index === null && field === 'name') throw new MappingError('MAPPING_NAME', field);
    if (index !== null && (!Number.isInteger(index) || index < 0 || index >= headerCount)) throw new MappingError('MAPPING_INDEX', field);
    if (index !== null && used.has(index)) throw new MappingError('MAPPING_REUSED', field);
    if (index !== null) used.add(index);
    result[field] = index;
  }
  return result;
}

function unpaired(value) {
  for (const char of value) {
    const point = char.codePointAt(0);
    if (point >= 0xd800 && point <= 0xdfff) return true;
  }
  return false;
}

export function isBasicEmail(value) {
  if (value.length > 254 || !/^[\x21-\x7e]+$/.test(value)) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const local = value.slice(0, at), domain = value.slice(at + 1);
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..') || !domain.includes('.')) return false;
  return domain.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
}

export function normalizeField(value, field) {
  if (typeof value !== 'string' || unpaired(value)) return { code: 'FIELD_UNICODE' };
  const forbidden = field === 'note' ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u : /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
  if (forbidden.test(value)) return { code: 'FIELD_CONTROL' };
  const normalized = field === 'note' ? value.replace(/\r\n|\r/g, '\n').normalize('NFC') : value.trim().normalize('NFC');
  const count = [...normalized].length;
  if (field === 'name' && count === 0) return { code: 'NAME_REQUIRED' };
  const cap = { name: 120, phone: 64, email: 254, organization: 120, note: 500 }[field];
  if (count > cap) return { code: 'FIELD_LENGTH' };
  if (field === 'email' && normalized !== '' && !isBasicEmail(normalized)) return { code: 'EMAIL_BASIC' };
  return { value: normalized };
}

export function mapContacts(rows, mapping) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 1000 || !Array.isArray(rows[0]?.cells)) throw new MappingError('MAPPING_ROWS');
  const headerCount = rows[0].cells.length;
  const selected = validateMappings(headerCount, mapping);
  const issues = [], contacts = [], duplicateIndex = new Map();
  rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row.cells) || row.cells.length !== headerCount || !Number.isSafeInteger(row.line) || row.line < 1) throw new MappingError('MAPPING_ROWS');
    const contact = { rowIndex, line: row.line };
    let rowInvalid = false;
    for (const field of FIELDS) {
      const column = selected[field];
      const result = normalizeField(column === null ? '' : row.cells[column], field);
      if (result.code) {
        issues.push({ row: row.line, rowIndex, column: column === null ? null : column + 1, field, code: result.code });
        rowInvalid = true;
      } else contact[field] = result.value;
    }
    if (!contact.phone && !contact.email) {
      issues.push({ row: row.line, rowIndex, column: null, field: 'contact', code: 'CONTACT_METHOD' });
      rowInvalid = true;
    }
    if (!rowInvalid) contacts.push(contact);
  });
  if (issues.length) throw new ContactErrors(issues);
  contacts.forEach((contact) => {
    const key = JSON.stringify([contact.name, contact.phone, contact.email, contact.organization]);
    const group = duplicateIndex.get(key) ?? [];
    group.push({ rowIndex: contact.rowIndex, line: contact.line });
    duplicateIndex.set(key, group);
  });
  const duplicateGroups = [...duplicateIndex.values()].filter((group) => group.length > 1);
  return { contacts, duplicateGroups };
}
