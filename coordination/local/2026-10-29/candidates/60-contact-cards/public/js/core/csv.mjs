export const CSV_LIMITS = Object.freeze({ maxBytes: 1048576, maxRows: 1000, maxColumns: 30, maxCellScalars: 4096 });

export class CsvError extends Error {
  constructor(code, row = 1, column = 1) {
    super(code);
    this.name = 'CsvError';
    this.code = code;
    this.row = row;
    this.column = column;
  }
}

export function parseCsvUtf8(bytes, limits = {}) {
  if (!(bytes instanceof Uint8Array)) throw new CsvError('CSV_BYTES');
  const cap = { ...CSV_LIMITS };
  for (const [key, value] of Object.entries(limits)) {
    if (!Object.hasOwn(cap, key) || !Number.isSafeInteger(value) || value < 1 || value > cap[key]) throw new CsvError('CSV_LIMIT_CONFIG');
    cap[key] = value;
  }
  if (bytes.byteLength > cap.maxBytes) throw new CsvError('CSV_BYTE_LIMIT');
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(start));
  } catch {
    throw new CsvError('CSV_ENCODING');
  }
  if (!text.length) throw new CsvError('CSV_EMPTY');
  let headers;
  const rows = [];
  let cells = [], field = '', scalars = 0, state = 'start', line = 1, recordLine = 1, started = false;
  const fail = (code) => { throw new CsvError(code, line, cells.length + 1); };
  const append = (char) => {
    if (++scalars > cap.maxCellScalars) fail('CSV_CELL_LIMIT');
    field += char;
  };
  const endField = () => {
    if (cells.length >= cap.maxColumns) fail('CSV_COLUMN_LIMIT');
    cells.push(field);
    field = ''; scalars = 0; state = 'start';
  };
  const endRecord = () => {
    endField();
    if (!headers) headers = cells;
    else {
      if (cells.length !== headers.length) throw new CsvError('CSV_RAGGED', recordLine, Math.min(cells.length, headers.length) + 1);
      if (cells.every((cell) => cell.trim() === '')) throw new CsvError('CSV_BLANK_ROW', recordLine, 1);
      if (rows.length >= cap.maxRows) throw new CsvError('CSV_ROW_LIMIT', recordLine, 1);
      rows.push({ line: recordLine, cells });
    }
    cells = []; started = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = String.fromCodePoint(text.codePointAt(i));
    if (char.length === 2) i++;
    started = true;
    if (state === 'quoted') {
      if (char === '"') state = 'after';
      else if (char === '\r' || char === '\n') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        append('\n'); line++;
      } else append(char);
      continue;
    }
    if (char === '\r' || char === '\n') {
      if (char === '\r') {
        if (text[i + 1] !== '\n') fail('CSV_LONE_CR');
        i++;
      }
      endRecord(); line++; recordLine = line;
    } else if (char === ',') endField();
    else if (char === '"') {
      if (state === 'start') state = 'quoted';
      else if (state === 'after') { append('"'); state = 'quoted'; }
      else fail('CSV_QUOTE');
    } else {
      if (state === 'after') fail('CSV_AFTER_QUOTE');
      append(char); state = 'unquoted';
    }
  }
  if (state === 'quoted') fail('CSV_UNCLOSED_QUOTE');
  if (started) endRecord();
  if (!rows.length) throw new CsvError('CSV_NO_DATA');
  return { headers, rows };
}
