import { LIMITS, fail, validateText } from './schema.mjs';

export function decodeUtf8(bytes, limit = LIMITS.csvBytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > limit) fail('SOURCE_TOO_LARGE');
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/u, ''); }
  catch { fail('INVALID_UTF8'); }
}

export function parseCsv(csv) {
  if (typeof csv !== 'string') fail('INVALID_SCHEMA');
  if (csv.length > LIMITS.csvBytes) fail('SOURCE_TOO_LARGE');
  validateText(csv);
  if (new TextEncoder().encode(csv).byteLength > LIMITS.csvBytes) fail('SOURCE_TOO_LARGE');
  const source = csv.replace(/^\uFEFF/u, '');
  if (!source.length) fail('EMPTY_DECK');
  const rows = [];
  let row = [], field = '', state = 'start', terminated = false;
  function pushField() {
    row.push(field); field = ''; state = 'start';
    if (row.length > LIMITS.columns) fail('TOO_MANY_COLUMNS', 'source', rows.length + 1);
  }
  function pushRow() {
    pushField(); rows.push(row); row = [];
    if (rows.length > LIMITS.records) fail('TOO_MANY_CARDS');
  }
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    terminated = false;
    if (state === 'quoted') {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; } else state = 'closed';
      } else field += char;
      continue;
    }
    if (char === ',') { pushField(); continue; }
    if (char === '\r' || char === '\n') {
      if (char === '\r') { if (source[i + 1] !== '\n') fail('INVALID_CSV', 'source', rows.length + 1); i++; }
      pushRow(); terminated = true; continue;
    }
    if (char === '"' && state === 'start') { state = 'quoted'; continue; }
    if (char === '"' || state === 'closed') fail('INVALID_CSV', 'source', rows.length + 1);
    state = 'plain'; field += char;
  }
  if (state === 'quoted') fail('INVALID_CSV', 'source', rows.length + 1);
  if (!terminated) pushRow();
  const width = rows[0].length;
  rows.forEach((record, index) => { if (record.length !== width) fail('COLUMN_COUNT', 'source', index + 1); });
  return rows;
}

export function parseCards(csv, { questionColumn = 0, answerColumn = 1, header = true } = {}) {
  if (!Number.isInteger(questionColumn) || !Number.isInteger(answerColumn) || questionColumn < 0 || answerColumn < 0 || questionColumn === answerColumn || typeof header !== 'boolean') fail('INVALID_COLUMNS', 'columns');
  const rows = parseCsv(csv);
  if (questionColumn >= rows[0].length || answerColumn >= rows[0].length) fail('INVALID_COLUMNS', 'columns');
  const records = header ? rows.slice(1) : rows;
  if (!records.length) fail('EMPTY_DECK');
  if (records.length > LIMITS.cards) fail('TOO_MANY_CARDS');
  return records.map((record, index) => ({
    id: index + 1,
    question: validateText(record[questionColumn], { face: true, record: index + 1 + Number(header) }),
    answer: validateText(record[answerColumn], { face: true, record: index + 1 + Number(header) }),
  }));
}
