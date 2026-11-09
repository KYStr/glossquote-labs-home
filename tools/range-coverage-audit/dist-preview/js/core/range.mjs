// Pure core for Numeric Range Coverage Audit.
// No DOM, network, or storage access. Importable by Node tests and by the
// module Worker (the build embeds this file's source into the worker bundle).
//
// Contract: docs/specs/range-coverage-audit/SPEC.md (spec-range-coverage-audit-20261109)
// Half-open [lo, hi) decimal ranges over one domain. All endpoints are
// converted to BigInt thousandths; no rounding ever happens.

export const MAX_INTERVAL_CHARS = 16384;
export const MAX_INTERVAL_ROWS = 200;
export const MAX_ENDPOINT_ABS_THOUSANDTHS = 1000000000000n; // 1,000,000,000
export const MAX_REPORT_BYTES = 2097152;
export const REPORT_FILENAME = 'range-coverage-audit-report.json';

// -?(0|[1-9][0-9]{0,9})(\.[0-9]{1,3})? — no whitespace, no plus, no exponent.
const DECIMAL_RE = /^-?(0|[1-9][0-9]{0,9})(\.[0-9]{1,3})?$/;

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

// Parse a decimal string to BigInt thousandths. Returns null when the grammar
// or the absolute range (-1,000,000,000 … 1,000,000,000) fails. -0 becomes 0.
export function parseDecimal(text) {
  if (typeof text !== 'string' || !DECIMAL_RE.test(text)) return null;
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  const dot = body.indexOf('.');
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? '' : body.slice(dot + 1);
  const thousandths = BigInt(intPart) * 1000n + BigInt((fracPart + '000').slice(0, 3));
  if (thousandths > MAX_ENDPOINT_ABS_THOUSANDTHS) return null;
  return negative ? -thousandths : thousandths;
}

// Format BigInt thousandths as a standard ASCII decimal string: no
// unnecessary leading/trailing zeros, no negative zero, no rounding.
export function formatDecimal(thousandths) {
  if (thousandths === 0n) return '0';
  const negative = thousandths < 0n;
  const abs = negative ? -thousandths : thousandths;
  const intPart = abs / 1000n;
  const frac = abs % 1000n;
  let out = intPart.toString();
  if (frac !== 0n) {
    out += '.' + frac.toString().padStart(3, '0').replace(/0+$/, '');
  }
  return negative ? '-' + out : out;
}

// True when the string contains an unpaired UTF-16 surrogate.
export function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function sameLines(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Validate and audit one snapshot. Input must be a plain object with exactly
// the own string fields {start, end, intervals}; anything else is SCHEMA.
// Success is {ok:true, result:{spans, covered, uncovered, overlapped}}.
// Failure is {ok:false, error:{code, field, row}}.
export function runAudit(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('SCHEMA', null, null);
  }
  const keys = Object.keys(input);
  if (keys.length !== 3 || !keys.includes('start') || !keys.includes('end') || !keys.includes('intervals')) {
    return fail('SCHEMA', null, null);
  }
  for (const key of ['start', 'end', 'intervals']) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      return fail('SCHEMA', null, null);
    }
    if (typeof input[key] !== 'string') return fail('SCHEMA', null, null);
  }

  const { start, end, intervals } = input;

  // Domain endpoints first: start, then end, then domain order.
  if (start === '') return fail('EMPTY', 'start', null);
  const startValue = parseDecimal(start);
  if (startValue === null) return fail('ENDPOINT', 'start', null);
  if (end === '') return fail('EMPTY', 'end', null);
  const endValue = parseDecimal(end);
  if (endValue === null) return fail('ENDPOINT', 'end', null);
  if (startValue >= endValue) return fail('DOMAIN_ORDER', 'end', null);

  // Intervals: capacity, then surrogate, then row count.
  if (intervals.length > MAX_INTERVAL_CHARS) return fail('INPUT_LIMIT', 'intervals', null);
  if (hasUnpairedSurrogate(intervals)) return fail('UNICODE', 'intervals', null);
  let body = intervals;
  if (body.endsWith('\n')) body = body.slice(0, -1);
  const rows = body === '' ? [] : body.split('\n');
  if (rows.length > MAX_INTERVAL_ROWS) return fail('ROW_LIMIT', 'intervals', null);

  const parsed = [];
  for (let i = 0; i < rows.length; i += 1) {
    const rowNo = i + 1;
    const columns = rows[i].split('\t');
    if (columns.length !== 2) return fail('ROW_FORMAT', 'intervals', rowNo);
    const lo = parseDecimal(columns[0]);
    if (lo === null) return fail('ENDPOINT', 'intervals', rowNo);
    const hi = parseDecimal(columns[1]);
    if (hi === null) return fail('ENDPOINT', 'intervals', rowNo);
    if (lo >= hi) return fail('INTERVAL_ORDER', 'intervals', rowNo);
    if (lo < startValue || hi > endValue) return fail('OUTSIDE', 'intervals', rowNo);
    parsed.push({ lo, hi, line: rowNo });
  }

  // Sweep distinct endpoints in ascending order. At each x, intervals ending
  // at x are already out and intervals starting at x are already in, which
  // the predicate lo <= x < hi expresses exactly. Touching endpoints never
  // produce a zero-width span and never count as overlapping.
  const points = new Set([startValue, endValue]);
  for (const item of parsed) {
    points.add(item.lo);
    points.add(item.hi);
  }
  const sorted = [...points].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const spans = [];
  let covered = 0n;
  let uncovered = 0n;
  let overlapped = 0n;
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    const x = sorted[i];
    const y = sorted[i + 1];
    const lines = parsed
      .filter((item) => item.lo <= x && item.hi > x)
      .map((item) => item.line);
    const length = y - x;
    if (lines.length >= 1) covered += length;
    if (lines.length === 0) uncovered += length;
    if (lines.length >= 2) overlapped += length;
    const last = spans[spans.length - 1];
    if (last && sameLines(last.lines, lines)) {
      last.to = formatDecimal(y);
    } else {
      spans.push({ from: formatDecimal(x), to: formatDecimal(y), depth: lines.length, lines });
    }
  }

  return {
    ok: true,
    result: {
      spans,
      covered: formatDecimal(covered),
      uncovered: formatDecimal(uncovered),
      overlapped: formatDecimal(overlapped),
    },
  };
}

// Canonical JSON: object own keys sorted by UTF-16 code units, recursively;
// array order unchanged. Compact, one trailing LF, no BOM.
export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

export function serializeReport(result) {
  return JSON.stringify(canonicalize(result)) + '\n';
}

// Build the downloadable report text. Over the 2,097,152-byte cap the report
// is refused (OUTPUT_LIMIT) and no product is produced.
export function buildReport(result) {
  const text = serializeReport(result);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
