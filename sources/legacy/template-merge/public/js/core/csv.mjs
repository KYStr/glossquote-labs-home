import { LIMITS, ToolError } from './errors.mjs';

/** Strict UTF-8 CSV. Record numbers are 1-based and include the header record. */
export function parseCsv(bytes, limits = {}) {
  const caps = {};
  for (const key of ['maxBytes', 'maxRows', 'maxColumns']) {
    const value = limits[key] ?? LIMITS[key];
    if (!Number.isSafeInteger(value) || value < 1 || value > LIMITS[key]) throw new TypeError('Invalid CSV limit.');
    caps[key] = value;
  }
  if (!(bytes instanceof Uint8Array)) throw new TypeError('CSV input must be bytes.');
  if (bytes.byteLength > caps.maxBytes) throw new ToolError('FILE_TOO_LARGE', { maxBytes: caps.maxBytes });
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new ToolError('INVALID_UTF8'); }
  if (source.startsWith('\uFEFF')) source = source.slice(1);
  if (!source.length) throw new ToolError('HEADER_INVALID', { record: 1, columns: [1] });

  let state = 'start';
  let field = '';
  let record = [];
  let headers;
  const rows = [];
  let separator;
  let endedRecord = false;
  const position = () => ({ record: headers ? rows.length + 2 : 1, column: record.length + 1 });
  const pushField = () => {
    record.push(field);
    field = '';
    state = 'start';
    if (record.length > caps.maxColumns) throw new ToolError('COLUMN_LIMIT', position());
  };
  const pushRecord = () => {
    pushField();
    if (!headers) {
      const seen = new Set();
      const invalid = [];
      record.forEach((header, i) => {
        if (header === '' || seen.has(header)) invalid.push(i + 1);
        seen.add(header);
      });
      if (invalid.length) throw new ToolError('HEADER_INVALID', { record: 1, columns: invalid });
      headers = record;
    } else {
      if (record.length !== headers.length) throw new ToolError('ROW_WIDTH', { record: rows.length + 2, expected: headers.length, actual: record.length });
      if (rows.length >= caps.maxRows) throw new ToolError('ROW_LIMIT', { record: rows.length + 2, maxRows: caps.maxRows });
      rows.push(record);
    }
    record = [];
    endedRecord = true;
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (state === 'quoted') {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else state = 'closed';
      } else field += char;
      continue;
    }
    if (char === ',' ) {
      pushField();
      endedRecord = false;
    } else if (char === '\r' || char === '\n') {
      const nextSeparator = char === '\r' && source[i + 1] === '\n' ? '\r\n' : char;
      if (separator && separator !== nextSeparator) throw new ToolError('CSV_SYNTAX', position());
      separator = nextSeparator;
      if (nextSeparator.length === 2) i++;
      pushRecord();
    } else if (char === '"') {
      if (state !== 'start') throw new ToolError('CSV_SYNTAX', position());
      state = 'quoted';
      endedRecord = false;
    } else {
      if (state === 'closed') throw new ToolError('CSV_SYNTAX', position());
      field += char;
      state = 'unquoted';
      endedRecord = false;
    }
  }
  if (state === 'quoted') throw new ToolError('CSV_SYNTAX', position());
  if (!endedRecord) pushRecord();
  return { headers, rows };
}
