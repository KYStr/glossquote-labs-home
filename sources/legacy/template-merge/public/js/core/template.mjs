import { LIMITS, ToolError } from './errors.mjs';

export function compileTemplate(source, headers, { maxCodeUnits = LIMITS.maxCodeUnits } = {}) {
  if (typeof source !== 'string' || !Array.isArray(headers)) throw new TypeError('Invalid template arguments.');
  if (!Number.isSafeInteger(maxCodeUnits) || maxCodeUnits < 1 || maxCodeUnits > LIMITS.maxCodeUnits) throw new TypeError('Invalid template limit.');
  if (source.length > maxCodeUnits) throw new ToolError('TEMPLATE_TOO_LARGE', { maxCodeUnits });
  const segments = [];
  const fields = new Map();
  const unknown = new Set();
  let literalStart = 0;
  for (let i = 0; i < source.length;) {
    if (source.startsWith('}}', i)) throw new ToolError('TEMPLATE_SYNTAX', { position: i + 1 });
    if (!source.startsWith('{{', i)) { i++; continue; }
    if (i > literalStart) segments.push(Object.freeze({ type: 'literal', value: source.slice(literalStart, i) }));
    const end = source.indexOf('}}', i + 2);
    if (end < 0) throw new ToolError('TEMPLATE_SYNTAX', { position: i + 1 });
    const name = source.slice(i + 2, end);
    if (name === '' || /[{}]/.test(name)) throw new ToolError('TEMPLATE_SYNTAX', { position: i + 1 });
    const index = headers.indexOf(name);
    if (index < 0) unknown.add(name);
    else {
      segments.push(Object.freeze({ type: 'field', name, index }));
      if (!fields.has(name)) fields.set(name, Object.freeze({ name, index }));
    }
    i = end + 2;
    literalStart = i;
  }
  if (literalStart < source.length) segments.push(Object.freeze({ type: 'literal', value: source.slice(literalStart) }));
  if (unknown.size) throw new ToolError('UNKNOWN_FIELD', { fields: [...unknown] });
  return Object.freeze({
    source, headers: Object.freeze([...headers]),
    segments: Object.freeze(segments), fields: Object.freeze([...fields.values()]),
  });
}

/** fields are unique {name,index} descriptors from compileTemplate. Row indexes exclude the header. */
export function inspectMissing(rows, fields) {
  const byField = [];
  let totalCells = 0;
  for (const { name, index } of fields) {
    const rowIndexes = [];
    let count = 0;
    rows.forEach((row, i) => {
      if (row[index] === '') {
        count++;
        if (rowIndexes.length < 20) rowIndexes.push(i + 1);
      }
    });
    if (count) byField.push({ field: name, count, rowIndexes });
    totalCells += count;
  }
  return { byField, totalCells };
}
