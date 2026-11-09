// Pure core for the Pairwise Test Matrix tool.
// No DOM, no network, no storage, no imports: this file is also embedded
// verbatim into the Worker script by scripts/build.mjs, so it must stay
// self-contained (no import statements).
//
// Contract: docs/specs/pairwise-test-matrix/SPEC.md (spec-pairwise-test-matrix-20261109).

export const LIMITS = Object.freeze({
  MAX_INPUT_UNITS: 1024,
  MIN_DIMENSIONS: 2,
  MAX_DIMENSIONS: 5,
  MIN_VALUES: 2,
  MAX_VALUES: 6,
  MAX_PRODUCT: 2048,
  MAX_REPORT_BYTES: 2097152,
});

const KEY_RE = /^[A-Za-z][A-Za-z0-9_-]{0,23}$/;
const VALUE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;
// One dimension line: key:value1|value2...  (no spaces anywhere).
const LINE_RE = /^([A-Za-z][A-Za-z0-9_-]{0,23}):([A-Za-z0-9][A-Za-z0-9_-]{0,23}(?:\|[A-Za-z0-9][A-Za-z0-9_-]{0,23})*)$/;

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

// True when the string contains a lone (unpaired) surrogate code unit.
function hasLoneSurrogate(s) {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1; // skip the paired low surrogate
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true; // low surrogate without a preceding high surrogate
    }
  }
  return false;
}

// Parse and validate the dimensions textarea value.
// Returns { ok: true, dimensions: [{ key, values }] } or a failure object
// with { code, field, row } following the SPEC's check order:
// capacity -> surrogate -> row count -> per-row (format, value count,
// duplicate key, duplicate value) -> product limit.
export function parseDimensions(text) {
  if (typeof text !== 'string') {
    return fail('SCHEMA', 'dimensions', null);
  }
  if (text.length > LIMITS.MAX_INPUT_UNITS) {
    return fail('INPUT_LIMIT', 'dimensions', null);
  }
  if (hasLoneSurrogate(text)) {
    return fail('UNICODE', 'dimensions', null);
  }
  let body = text;
  if (body.endsWith('\n')) body = body.slice(0, -1); // one trailing LF allowed
  if (body === '') {
    return fail('EMPTY', 'dimensions', null);
  }
  const lines = body.split('\n');
  if (lines.length > LIMITS.MAX_DIMENSIONS) {
    return fail('ROW_LIMIT', 'dimensions', null);
  }
  if (lines.length < LIMITS.MIN_DIMENSIONS) {
    return fail('DIMENSION_COUNT', 'dimensions', null);
  }
  const seenKeys = new Set();
  const dimensions = [];
  for (let i = 0; i < lines.length; i += 1) {
    const row = i + 1;
    const line = lines[i];
    const m = LINE_RE.exec(line);
    if (!m) {
      return fail('DIMENSION', 'dimensions', row);
    }
    const key = m[1];
    const values = m[2].split('|');
    if (values.length < LIMITS.MIN_VALUES || values.length > LIMITS.MAX_VALUES) {
      return fail('VALUE_COUNT', 'dimensions', row);
    }
    if (seenKeys.has(key)) {
      return fail('DUP_KEY', 'dimensions', row);
    }
    seenKeys.add(key);
    if (new Set(values).size !== values.length) {
      return fail('DUP_VALUE', 'dimensions', row);
    }
    dimensions.push({ key, values });
  }
  let product = 1;
  for (const d of dimensions) product *= d.values.length;
  if (product > LIMITS.MAX_PRODUCT) {
    return fail('PRODUCT_LIMIT', 'dimensions', null);
  }
  return { ok: true, dimensions };
}

// All (i, valueIndexI, j, valueIndexJ) pairs of one index tuple,
// as string keys. i < j, first dimension slowest is only relevant to
// enumeration order, not to the pair set itself.
function pairsOfTuple(tuple) {
  const out = [];
  for (let i = 0; i < tuple.length; i += 1) {
    for (let j = i + 1; j < tuple.length; j += 1) {
      out.push(`${i}:${tuple[i]}|${j}:${tuple[j]}`);
    }
  }
  return out;
}

// Enumerate every index tuple of the full Cartesian product,
// first dimension slowest, last dimension fastest.
function* enumerateTuples(counts) {
  const idx = new Array(counts.length).fill(0);
  for (;;) {
    yield [...idx];
    let p = counts.length - 1;
    while (p >= 0) {
      idx[p] += 1;
      if (idx[p] < counts[p]) break;
      idx[p] = 0;
      p -= 1;
    }
    if (p < 0) return;
  }
}

// Recompute coverage from the real cases (never trust the gain sum).
// dimensions: [{ key, values }]; cases: [{ values, gain }].
// Returns { ok: true } or { ok: false, reason }.
export function verifyCoverage(dimensions, cases) {
  const counts = dimensions.map((d) => d.values.length);
  const uncovered = new Set();
  for (const tuple of enumerateTuples(counts)) {
    for (const key of pairsOfTuple(tuple)) uncovered.add(key);
  }
  const seenTuples = new Set();
  for (const c of cases) {
    const tuple = c.values.map((v, i) => dimensions[i].values.indexOf(v));
    if (tuple.some((x) => x < 0)) {
      return { ok: false, reason: 'unknown value in case' };
    }
    const tupleKey = tuple.join(',');
    if (seenTuples.has(tupleKey)) {
      return { ok: false, reason: 'duplicate tuple' };
    }
    seenTuples.add(tupleKey);
    let gain = 0;
    for (const key of pairsOfTuple(tuple)) {
      if (uncovered.has(key)) {
        uncovered.delete(key);
        gain += 1;
      }
    }
    if (gain !== c.gain) {
      return { ok: false, reason: `gain mismatch: case ${tupleKey} recomputed ${gain}, reported ${c.gain}` };
    }
  }
  if (uncovered.size !== 0) {
    return { ok: false, reason: `${uncovered.size} pairs uncovered` };
  }
  return { ok: true };
}

// Deterministic greedy pairwise coverage.
// dimensions: [{ key, values }]. Returns the result object.
function generate(dimensions) {
  const counts = dimensions.map((d) => d.values.length);
  const spaceSize = counts.reduce((a, b) => a * b, 1);
  const candidates = [];
  const allPairs = new Set();
  for (const tuple of enumerateTuples(counts)) {
    const pairs = pairsOfTuple(tuple);
    candidates.push({ tuple, pairs });
    for (const key of pairs) allPairs.add(key);
  }
  const pairCount = allPairs.size;
  const maxPairsPerCase = (counts.length * (counts.length - 1)) / 2;
  const uncovered = new Set(allPairs);
  const cases = [];
  while (uncovered.size > 0) {
    let best = null;
    let bestGain = 0;
    for (const cand of candidates) {
      let gain = 0;
      for (const key of cand.pairs) {
        if (uncovered.has(key)) gain += 1;
      }
      if (gain > bestGain) {
        bestGain = gain;
        best = cand;
        if (gain === maxPairsPerCase) break; // earliest ordinal wins ties
      }
    }
    if (!best || bestGain === 0) {
      return { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
    }
    cases.push({
      values: best.tuple.map((v, i) => dimensions[i].values[v]),
      gain: bestGain,
    });
    for (const key of best.pairs) uncovered.delete(key);
  }
  const result = {
    dimensions: dimensions.map((d) => d.key),
    spaceSize,
    pairCount,
    cases,
  };
  const check = verifyCoverage(dimensions, cases);
  if (!check.ok) {
    return { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  return { ok: true, result };
}

// Synchronous pure data transform: run({ dimensions }) ->
// { ok: true, result } or { ok: false, error: { code, field, row } }.
// The input must be a plain object with exactly the own data field
// `dimensions` (a string). Unknown/missing/wrong-typed/accessor fields
// are SCHEMA with field null, row null.
export function run(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('SCHEMA', null, null);
  }
  const keys = Object.keys(input);
  if (keys.length !== 1 || keys[0] !== 'dimensions') {
    return fail('SCHEMA', null, null);
  }
  const desc = Object.getOwnPropertyDescriptor(input, 'dimensions');
  if (!desc || !('value' in desc) || typeof desc.value !== 'string') {
    return fail('SCHEMA', null, null);
  }
  const parsed = parseDimensions(desc.value);
  if (!parsed.ok) return parsed;
  return generate(parsed.dimensions);
}

// Canonical JSON: object own keys sorted ascending by UTF-16 code units,
// recursively; array order unchanged; strings as JSON literals.
// Never calls toJSON.
export function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite number');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  throw new TypeError('value is not JSON-serializable');
}

// Build the fixed download report for a result object.
// Returns { ok: true, text, bytes } or { ok: false, error: OUTPUT_LIMIT }.
export function buildReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > LIMITS.MAX_REPORT_BYTES) {
    return fail('OUTPUT_LIMIT', null, null);
  }
  return { ok: true, text, bytes };
}
