const ROOT_KEYS = ['stockLengthRaw', 'endTrimRaw', 'kerfRaw', 'rows'];
const ROW_KEYS = ['id', 'nameRaw', 'lengthRaw', 'quantityRaw'];
const encoder = new TextEncoder();
const fail = (code, field) => ({ ok: false, error: { code, field } });
class ValidationFailure {
  constructor(code, field) { this.code = code; this.field = field; }
}
const problem = (code, field) => { throw new ValidationFailure(code, field); };

// Read only checked data descriptors. Unknown keys are never used in diagnostics.
function record(value, keys, path, schemaCode, unknownCode = schemaCode) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) problem(schemaCode, path);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) problem(schemaCode, path);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some(key => typeof key !== 'string' || !keys.includes(key))) problem(unknownCode, path);
  const fieldPath = key => path === 'request' && key === 'rows' ? 'rows' : `${path}.${key}`;
  for (const key of keys) if (!ownKeys.includes(key)) problem(schemaCode, fieldPath(key));
  const values = {};
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) problem(schemaCode, fieldPath(key));
    values[key] = d.value;
  }
  return values;
}

function dense(value, path, schemaCode, min, max, lengthCodes) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) problem(schemaCode, path);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value') || lengthDescriptor.enumerable || lengthDescriptor.configurable) problem(schemaCode, path);
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < min || length > max) {
    problem(lengthCodes ? (length < min ? lengthCodes[0] : lengthCodes[1]) : schemaCode, path);
  }
  const keys = Reflect.ownKeys(value);
  const allowed = new Set(['length', ...Array.from({ length }, (_, i) => String(i))]);
  if (keys.some(key => typeof key !== 'string' || !allowed.has(key))) problem(schemaCode, path);
  const values = [];
  for (let i = 0; i < length; i++) {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) problem(schemaCode, `${path}.${i}`);
    values.push(d.value);
  }
  return values;
}

function rawType(value, path) {
  if (typeof value !== 'string') problem('invalid_type', path);
  if (value.length > 12) problem('raw_too_long', path);
}

function rawNumber(value, path, min, max, integer = false) {
  if (!(integer ? /^[0-9]+$/ : /^[0-9]+(?:\.[0-9]{1,2})?$/).test(value)) problem('invalid_format', path);
  const [whole, fraction = ''] = value.split('.');
  const n = integer ? BigInt(whole) : BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (n < min || n > max) problem('out_of_range', path);
  return n;
}

function validName(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  if (encoder.encode(value).byteLength > 240) return false;
  const count = [...value.trim()].length;
  return count >= 1 && count <= 60;
}

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value);
const mm = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;

function plan(stock, trim, kerf, rows) {
  const usable = stock - 2n * trim;
  const pieces = rows.flatMap(row => Array.from({ length: row.quantity }, (_, i) => ({ rowIndex: row.rowIndex, pieceIndex: i + 1, id: row.id, name: row.name, length: row.length })));
  pieces.sort((a, b) => a.length === b.length ? a.rowIndex - b.rowIndex || a.pieceIndex - b.pieceIndex : a.length > b.length ? -1 : 1);
  const bins = [];
  for (const piece of pieces) {
    let bin = bins.find(candidate => candidate.used + kerf + piece.length <= usable);
    if (!bin) {
      bin = { pieces: [], used: 0n, pieceLength: 0n };
      bins.push(bin);
    }
    bin.used += piece.length + (bin.pieces.length ? kerf : 0n);
    bin.pieceLength += piece.length;
    bin.pieces.push(piece);
  }
  const sticks = bins.map((bin, i) => ({
    stickIndex: i + 1,
    stockLengthMm: mm(stock), trimLossMm: mm(2n * trim), usableLengthMm: mm(usable),
    pieces: bin.pieces.map(p => ({ rowIndex: p.rowIndex, pieceIndex: p.pieceIndex, id: p.id, name: p.name, lengthMm: mm(p.length) })),
    pieceLengthMm: mm(bin.pieceLength), kerfLossMm: mm(bin.used - bin.pieceLength), usedLengthMm: mm(bin.used), remainingLengthMm: mm(usable - bin.used)
  }));
  const count = BigInt(sticks.length);
  const totalPiece = pieces.reduce((sum, p) => sum + p.length, 0n);
  const totalUsed = bins.reduce((sum, b) => sum + b.used, 0n);
  return {
    schemaVersion: 1, algorithm: 'ffd-v1',
    settings: { stockLengthMm: mm(stock), endTrimMm: mm(trim), kerfMm: mm(kerf), usableLengthMm: mm(usable) },
    rows: rows.map(row => ({ rowIndex: row.rowIndex, id: row.id, name: row.name, lengthMm: mm(row.length), quantity: row.quantity })),
    sticks,
    totals: { stockCount: sticks.length, pieceCount: pieces.length, totalStockMm: mm(stock * count), totalTrimLossMm: mm(2n * trim * count), totalPieceMm: mm(totalPiece), totalKerfLossMm: mm(totalUsed - totalPiece), totalUsedMm: mm(totalUsed), totalRemainingMm: mm(usable * count - totalUsed) }
  };
}

export function calculateCutPlan(request) {
  try {
    const root = record(request, ROOT_KEYS, 'request', 'invalid_request_schema', 'unknown_field');
    for (const key of ROOT_KEYS.slice(0, 3)) rawType(root[key], `request.${key}`);
    if (!Array.isArray(root.rows)) problem('invalid_type', 'rows');
    const stock = rawNumber(root.stockLengthRaw, 'request.stockLengthRaw', 1n, 10000000n);
    const trim = rawNumber(root.endTrimRaw, 'request.endTrimRaw', 0n, 1000000n);
    const kerf = rawNumber(root.kerfRaw, 'request.kerfRaw', 0n, 100000n);
    const sourceRows = dense(root.rows, 'rows', 'invalid_request_schema', 1, 40, ['empty_rows', 'too_many_rows']);
    const usable = stock - trim * 2n;
    if (usable <= 0n) problem('non_positive_usable', 'usableLength');
    const ids = new Set();
    let count = 0;
    const rows = sourceRows.map((source, i) => {
      const path = `rows.${i}`;
      const row = record(source, ROW_KEYS, path, 'invalid_request_schema', 'unknown_field');
      if (typeof row.id !== 'string') problem('invalid_type', `${path}.id`);
      if (!validId(row.id)) problem('invalid_format', `${path}.id`);
      if (ids.has(row.id)) problem('duplicate_id', `${path}.id`);
      ids.add(row.id);
      if (typeof row.nameRaw !== 'string') problem('invalid_type', `${path}.nameRaw`);
      if (!validName(row.nameRaw)) problem('invalid_name', `${path}.nameRaw`);
      rawType(row.lengthRaw, `${path}.lengthRaw`);
      const length = rawNumber(row.lengthRaw, `${path}.lengthRaw`, 1n, 10000000n);
      rawType(row.quantityRaw, `${path}.quantityRaw`);
      const quantity = Number(rawNumber(row.quantityRaw, `${path}.quantityRaw`, 1n, 200n, true));
      count += quantity;
      if (count > 200) problem('total_pieces_exceeded', `${path}.quantityRaw`);
      return { rowIndex: i, id: row.id, name: row.nameRaw.trim(), length, quantity };
    });
    for (const row of rows) if (row.length > usable) problem('piece_exceeds_usable', `rows.${row.rowIndex}.lengthRaw`);
    return { ok: true, result: plan(stock, trim, kerf, rows) };
  } catch (e) {
    return e instanceof ValidationFailure ? fail(e.code, e.field) : fail('invalid_request_schema', 'request');
  }
}

const RESULT_KEYS = ['schemaVersion', 'algorithm', 'settings', 'rows', 'sticks', 'totals'];
const SETTINGS_KEYS = ['stockLengthMm', 'endTrimMm', 'kerfMm', 'usableLengthMm'];
const RESULT_ROW_KEYS = ['rowIndex', 'id', 'name', 'lengthMm', 'quantity'];
const PIECE_KEYS = ['rowIndex', 'pieceIndex', 'id', 'name', 'lengthMm'];
const STICK_KEYS = ['stickIndex', 'stockLengthMm', 'trimLossMm', 'usableLengthMm', 'pieces', 'pieceLengthMm', 'kerfLossMm', 'usedLengthMm', 'remainingLengthMm'];
const TOTAL_KEYS = ['stockCount', 'pieceCount', 'totalStockMm', 'totalTrimLossMm', 'totalPieceMm', 'totalKerfLossMm', 'totalUsedMm', 'totalRemainingMm'];
const schemaFail = path => problem('invalid_result_schema', path);
const resultRecord = (v, keys, path) => record(v, keys, path, 'invalid_result_schema');
function int(v, path, min, max) { if (!Number.isSafeInteger(v) || v < min || v > max) schemaFail(path); }
function canonicalMm(v, path, min, max) {
  if (typeof v !== 'string' || v.length > 11 || !/^(?:0|[1-9][0-9]*)\.[0-9]{2}$/.test(v)) schemaFail(path);
  const n = BigInt(v.replace('.', ''));
  if (n < min || n > max) schemaFail(path);
}
function identity(v, path) {
  if (!validId(v.id)) schemaFail(`${path}.id`);
  if (!validName(v.name) || v.name !== v.name.trim()) schemaFail(`${path}.name`);
}
function guardedResult(input) {
  const r = resultRecord(input, RESULT_KEYS, 'result');
  if (r.schemaVersion !== 1) schemaFail('result.schemaVersion');
  if (r.algorithm !== 'ffd-v1') schemaFail('result.algorithm');
  const s = resultRecord(r.settings, SETTINGS_KEYS, 'result.settings');
  const sourceBounds = [[1n, 10000000n], [0n, 1000000n], [0n, 100000n], [1n, 10000000n]];
  SETTINGS_KEYS.forEach((key, i) => canonicalMm(s[key], `result.settings.${key}`, ...sourceBounds[i]));
  const rows = dense(r.rows, 'result.rows', 'invalid_result_schema', 1, 40).map((v, i) => {
    const p = `result.rows.${i}`;
    const row = resultRecord(v, RESULT_ROW_KEYS, p);
    int(row.rowIndex, `${p}.rowIndex`, 0, 39); identity(row, p);
    canonicalMm(row.lengthMm, `${p}.lengthMm`, 1n, 10000000n);
    int(row.quantity, `${p}.quantity`, 1, 200);
    return row;
  });
  const sticks = dense(r.sticks, 'result.sticks', 'invalid_result_schema', 1, 200).map((v, i) => {
    const p = `result.sticks.${i}`;
    const stick = resultRecord(v, STICK_KEYS, p);
    int(stick.stickIndex, `${p}.stickIndex`, 1, 200);
    for (const key of STICK_KEYS.filter(key => key.endsWith('Mm'))) {
      canonicalMm(stick[key], `${p}.${key}`, key === 'stockLengthMm' || key === 'usableLengthMm' ? 1n : 0n, key === 'trimLossMm' ? 2000000n : 10000000n);
    }
    stick.pieces = dense(stick.pieces, `${p}.pieces`, 'invalid_result_schema', 1, 200).map((v, j) => {
      const pp = `${p}.pieces.${j}`;
      const piece = resultRecord(v, PIECE_KEYS, pp);
      int(piece.rowIndex, `${pp}.rowIndex`, 0, 39);
      int(piece.pieceIndex, `${pp}.pieceIndex`, 1, rows[piece.rowIndex]?.quantity ?? 200);
      identity(piece, pp); canonicalMm(piece.lengthMm, `${pp}.lengthMm`, 1n, 10000000n);
      return piece;
    });
    return stick;
  });
  const totals = resultRecord(r.totals, TOTAL_KEYS, 'result.totals');
  int(totals.stockCount, 'result.totals.stockCount', 1, 200); int(totals.pieceCount, 'result.totals.pieceCount', 1, 200);
  for (const key of TOTAL_KEYS.slice(2)) {
    const max = key === 'totalTrimLossMm' ? 400000000n : key === 'totalKerfLossMm' ? 19900000n : 2000000000n;
    canonicalMm(totals[key], `result.totals.${key}`, key === 'totalStockMm' || key === 'totalPieceMm' ? 1n : 0n, max);
  }
  if (sticks.length > totals.pieceCount) schemaFail('result.sticks');
  return { schemaVersion: r.schemaVersion, algorithm: r.algorithm, settings: s, rows, sticks, totals };
}

function compare(actual, expected, path) {
  if (Array.isArray(expected)) {
    if (actual.length !== expected.length) problem('inconsistent_result', path);
    expected.forEach((v, i) => compare(actual[i], v, `${path}.${i}`));
  } else if (expected !== null && typeof expected === 'object') {
    for (const key of Object.keys(expected)) compare(actual[key], expected[key], `${path}.${key}`);
  } else if (actual !== expected) problem('inconsistent_result', path);
}

export function buildReport(input, language) {
  if (language !== 'zh-Hant' && language !== 'en') return fail('invalid_language', 'language');
  try {
    const r = guardedResult(input);
    const canonical = calculateCutPlan({ stockLengthRaw: r.settings.stockLengthMm, endTrimRaw: r.settings.endTrimMm, kerfRaw: r.settings.kerfMm,
      rows: r.rows.map(row => ({ id: row.id, nameRaw: row.name, lengthRaw: row.lengthMm, quantityRaw: String(row.quantity) })) });
    if (!canonical.ok) {
      let field = canonical.error.field.replace(/^request\./, 'result.settings.').replace(/^rows\./, 'result.rows.').replace(/lengthRaw$/, 'lengthMm').replace(/quantityRaw$/, 'quantity').replace(/nameRaw$/, 'name');
      if (field === 'usableLength') field = 'result.settings.usableLengthMm';
      field = field.replace(/stockLengthRaw$/, 'stockLengthMm').replace(/endTrimRaw$/, 'endTrimMm').replace(/kerfRaw$/, 'kerfMm');
      problem('inconsistent_result', field);
    }
    compare(r, canonical.result, 'result');
    const z = language === 'zh-Hant', s = r.settings, t = r.totals;
    const lines = z ? [
      'GlossQuote 長料裁切規劃', '演算法：FFD v1（啟發式；不保證使用最少支原料）',
      '模型：鋸縫只計相鄰成品；不計修邊切鋸與最後成品至餘料間鋸縫。餘料不保證可回用。', '單位：mm',
      `原料長度：${s.stockLengthMm}`, `每端修邊：${s.endTrimMm}`, `相鄰件鋸縫：${s.kerfMm}`, `單支可用長度：${s.usableLengthMm}`,
      `原料支數：${t.stockCount}`, `成品件數：${t.pieceCount}`, `原料總長：${t.totalStockMm}`, `成品總長：${t.totalPieceMm}`, `兩端修邊總損耗：${t.totalTrimLossMm}`,
      `鋸縫總損耗：${t.totalKerfLossMm}`, `總已使用可用長度：${t.totalUsedMm}`, `餘料總長：${t.totalRemainingMm}`,
      `平衡：${t.totalStockMm} = ${t.totalPieceMm} + ${t.totalTrimLossMm} + ${t.totalKerfLossMm} + ${t.totalRemainingMm}`
    ] : [
      'GlossQuote Cut Planner', 'Algorithm: FFD v1 (heuristic; does not guarantee the fewest stock sticks)',
      'Model: Kerf is counted only between adjacent pieces; end-trim cuts and a final cut before leftover are excluded. Remaining length is not guaranteed reusable.', 'Unit: mm',
      `Stock length: ${s.stockLengthMm}`, `End trim per end: ${s.endTrimMm}`, `Kerf between adjacent pieces: ${s.kerfMm}`, `Usable length per stick: ${s.usableLengthMm}`,
      `Stock sticks: ${t.stockCount}`, `Pieces: ${t.pieceCount}`, `Total stock length: ${t.totalStockMm}`, `Total piece length: ${t.totalPieceMm}`, `Total end-trim loss: ${t.totalTrimLossMm}`,
      `Total kerf loss: ${t.totalKerfLossMm}`, `Total used usable length: ${t.totalUsedMm}`, `Total remaining: ${t.totalRemainingMm}`,
      `Balance: ${t.totalStockMm} = ${t.totalPieceMm} + ${t.totalTrimLossMm} + ${t.totalKerfLossMm} + ${t.totalRemainingMm}`
    ];
    for (const stick of r.sticks) {
      lines.push(z ? `原料 ${stick.stickIndex}（原料 ${stick.stockLengthMm}；修邊損耗 ${stick.trimLossMm}；可用 ${stick.usableLengthMm}）` : `Stock ${stick.stickIndex} (stock ${stick.stockLengthMm}; trim loss ${stick.trimLossMm}; usable ${stick.usableLengthMm})`);
      stick.pieces.forEach((p, i) => lines.push(z ? `  ${i + 1}. ${p.name}（需求列 ${p.id}，第 ${p.pieceIndex} 件）：${p.lengthMm}` : `  ${i + 1}. ${p.name} (row ${p.id}, piece ${p.pieceIndex}): ${p.lengthMm}`));
      lines.push(z ? `成品小計：${stick.pieceLengthMm}；鋸縫：${stick.kerfLossMm}；已使用可用長度：${stick.usedLengthMm}；餘料：${stick.remainingLengthMm}` : `Piece subtotal: ${stick.pieceLengthMm}; kerf: ${stick.kerfLossMm}; used usable length: ${stick.usedLengthMm}; remaining: ${stick.remainingLengthMm}`);
    }
    const text = lines.join('\n');
    if (encoder.encode(text).byteLength > 131072) return fail('report_too_large', 'result');
    return { ok: true, text, filename: 'glossquote-cut-plan.txt', mimeType: 'text/plain;charset=utf-8' };
  } catch (e) {
    return e instanceof ValidationFailure ? fail(e.code, e.field) : fail('invalid_result_schema', 'result');
  }
}
