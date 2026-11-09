export const MAX_UNITS = 65_536;
export const MAX_ROWS = 256;
export class ProductError extends Error {
  constructor(code) { super(code); this.name = 'ProductError'; this.code = code; }
}
const fail = code => { throw new ProductError(code); };
const tracking = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid']);
export function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}
function validString(value, code = 'INVALID_DRAFT') {
  if (typeof value !== 'string' || hasUnpairedSurrogate(value)) fail(code);
}
export function parseQuery(raw) {
  validString(raw, 'INVALID_SOURCE');
  if (raw.length > MAX_UNITS) fail('SOURCE_LIMIT');
  if (raw === '') return [];
  const pieces = raw.split('&');
  if (pieces.length > MAX_ROWS) fail('ROW_LIMIT');
  return pieces.map((piece, index) => {
    const equal = piece.indexOf('=');
    const rawKey = equal < 0 ? piece : piece.slice(0, equal);
    const rawValue = equal < 0 ? '' : piece.slice(equal + 1);
    let decodedKey = null, decodedValue = null, decodeError = false;
    try { decodedKey = decodeURIComponent(rawKey.replaceAll('+', ' ')); decodedValue = decodeURIComponent(rawValue.replaceAll('+', ' ')); }
    catch { decodedKey = null; decodedValue = null; decodeError = true; }
    return { id: `r${index}`, index, raw: piece, rawKey, rawValue, hasEquals: equal >= 0, decodedKey, decodedValue, decodeError };
  });
}
export function inspectUrl(source) {
  if (typeof source !== 'string') fail('INVALID_SOURCE');
  if (source.length > MAX_UNITS) fail('SOURCE_LIMIT');
  source = source.replace(/^ +| +$/gu, '');
  if (/[\u0000-\u0020\u007f\\]/u.test(source) || hasUnpairedSurrogate(source)) fail('INVALID_CHARACTERS');
  const scheme = /^(https?):\/\//iu.exec(source);
  if (!scheme) fail('INVALID_SCHEME');
  const authority = source.slice(scheme[0].length).split(/[/?#]/u, 1)[0];
  if (!authority) fail('INVALID_AUTHORITY');
  if (authority.includes('@')) fail('CREDENTIALS');
  let url;
  try { url = new URL(source); } catch { fail('INVALID_URL'); }
  if (!url.hostname) fail('INVALID_AUTHORITY');
  if (url.username || url.password) fail('CREDENTIALS');
  const hash = source.indexOf('#');
  const fragment = hash < 0 ? '' : source.slice(hash);
  const beforeHash = hash < 0 ? source : source.slice(0, hash);
  const question = beforeHash.indexOf('?');
  const hasQuery = question >= 0;
  const prefix = hasQuery ? beforeHash.slice(0, question) : beforeHash;
  const queryRaw = hasQuery ? beforeHash.slice(question + 1) : '';
  return { source, prefix, fragment, hasQuery, queryRaw,
    parsed: { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, hash: url.hash },
    rows: parseQuery(queryRaw) };
}
function originalModel(model) {
  if (!model || typeof model !== 'object' || !Array.isArray(model.rows)) fail('INVALID_MODEL');
  const original = inspectUrl(model.source);
  for (const field of ['prefix', 'fragment', 'hasQuery', 'queryRaw']) if (model[field] !== original[field]) fail('INVALID_MODEL');
  if (model.rows.length !== original.rows.length) fail('INVALID_MODEL');
  for (let i = 0; i < original.rows.length; i++) {
    for (const key of Object.keys(original.rows[i])) if (model.rows[i]?.[key] !== original.rows[i][key]) fail('INVALID_MODEL');
  }
  return original;
}
export function trackingRowIds(model) {
  const original = originalModel(model);
  return original.rows.filter(row => !row.decodeError && tracking.has(row.decodedKey.replace(/[A-Z]/gu, letter => letter.toLowerCase()))).map(row => row.id);
}
export function serializeEditedPair(key, value) {
  validString(key); validString(value);
  if (key.length + value.length > MAX_UNITS) fail('DRAFT_LIMIT');
  return new URLSearchParams([[key, value]]).toString();
}
function validatePair(pair, added = false) {
  if (!pair || typeof pair !== 'object' || Array.isArray(pair)) fail('INVALID_DRAFT');
  const expected = added ? ['id', 'key', 'value'] : ['key', 'value'];
  if (Object.keys(pair).length !== expected.length || expected.some(key => !Object.hasOwn(pair, key))) fail('INVALID_DRAFT');
  validString(pair.key); validString(pair.value);
  return pair.key.length + pair.value.length;
}
export function composeUrl(model, edits = new Map(), removed = new Set(), additions = []) {
  const original = originalModel(model);
  if (!(edits instanceof Map) || !(removed instanceof Set) || !Array.isArray(additions)) fail('INVALID_DRAFT');
  const ids = new Set(original.rows.map(row => row.id));
  if (original.rows.length + additions.length > MAX_ROWS) fail('ROW_LIMIT');
  let draftUnits = 0;
  for (const [id, pair] of edits) {
    if (!ids.has(id)) fail('INVALID_ROW_ID');
    draftUnits += validatePair(pair);
    if (original.rows.find(row => row.id === id).decodeError) fail('UNEDITABLE_ROW');
  }
  for (const id of removed) if (!ids.has(id)) fail('INVALID_ROW_ID');
  for (const pair of additions) {
    draftUnits += validatePair(pair, true);
    if (typeof pair.id !== 'string' || !pair.id || ids.has(pair.id)) fail('INVALID_ROW_ID');
    ids.add(pair.id);
  }
  if (draftUnits > MAX_UNITS) fail('DRAFT_LIMIT');
  let changedRows = removed.size;
  const output = [];
  for (const row of original.rows) {
    if (removed.has(row.id)) continue;
    const pair = edits.get(row.id);
    if (!pair || (pair.key === row.decodedKey && pair.value === row.decodedValue)) output.push(row.raw);
    else { output.push(serializeEditedPair(pair.key, pair.value)); changedRows++; }
  }
  for (const pair of additions) { output.push(serializeEditedPair(pair.key, pair.value)); changedRows++; }
  const url = changedRows === 0 ? original.source : original.prefix + (output.length ? '?' + output.join('&') : '') + original.fragment;
  inspectUrl(url);
  return { url, changedRows };
}
