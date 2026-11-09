// Route Overlap Audit — pure core.
// Implements SPEC spec-route-overlap-audit-20261109 (docs/specs/route-overlap-audit/SPEC.md).
// No DOM, network, or storage access. Importable by node --test and by the
// Worker (the build embeds this exact source into the worker bundle).

export const METHODS = Object.freeze([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
]);

export const MAX_ROUTES_LENGTH = 16384;
export const MAX_ROWS = 100;
export const MAX_PATTERN_LENGTH = 160;
export const MAX_SEGMENTS = 8;
export const REPORT_LIMIT_BYTES = 2097152;
export const REPORT_FILENAME = 'route-overlap-audit-report.json';

const LITERAL_RE = /^[a-z0-9][a-z0-9_-]{0,23}$/;
const NAME_RE = /^[a-z][a-z0-9_]{0,15}$/;

function fail(code, field = null, row = null) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Parse one pattern string into segments, or null when it violates the grammar.
// Root '/' parses to zero segments. A tail ('*name') is allowed only as the
// final segment. Names are validated here; uniqueness is checked by run().
function parsePattern(pattern) {
  if (pattern === '/') return [];
  if (pattern.length < 2) return null;
  if (pattern[0] !== '/') return null;
  if (pattern.endsWith('/')) return null;
  const parts = pattern.slice(1).split('/');
  if (parts.length > MAX_SEGMENTS) return null;
  const segments = [];
  for (let k = 0; k < parts.length; k += 1) {
    const part = parts[k];
    if (part === '') return null;
    const head = part[0];
    if (head === ':') {
      const name = part.slice(1);
      if (!NAME_RE.test(name)) return null;
      segments.push({ type: 'param', name });
    } else if (head === '*') {
      if (k !== parts.length - 1) return null;
      const name = part.slice(1);
      if (!NAME_RE.test(name)) return null;
      segments.push({ type: 'tail', name });
    } else {
      if (!LITERAL_RE.test(part)) return null;
      segments.push({ type: 'literal', value: part });
    }
  }
  return segments;
}

// Inclusive length interval a pattern can match: [min, max] segment counts.
// No tail: exactly the segment count. Tail: from the segment count (the tail
// must consume at least one segment) up to MAX_SEGMENTS.
function lengthInterval(segments) {
  const hasTail = segments.some((segment) => segment.type === 'tail');
  if (!hasTail) return [segments.length, segments.length];
  return [segments.length, MAX_SEGMENTS];
}

function segmentAt(segments, pos) {
  if (pos < segments.length) return segments[pos];
  // Only reachable when the pattern has a tail: the tail extends.
  return { type: 'tail-ext' };
}

// Witness for one pair of parsed patterns, or null when they cannot overlap.
// L is the minimum of the intersection of the two length intervals. At each
// of the L positions: two literals that differ rule the pair out; a literal on
// either side fixes the witness segment; two param/tail positions use 'x'.
// A literal conflict cannot be repaired by a longer length, so no other
// length needs to be tried.
function witnessFor(aSegments, bSegments) {
  const [aMin, aMax] = lengthInterval(aSegments);
  const [bMin, bMax] = lengthInterval(bSegments);
  const length = Math.max(aMin, bMin);
  if (length > Math.min(aMax, bMax)) return null;
  if (length === 0) return '/';
  const parts = [];
  for (let pos = 0; pos < length; pos += 1) {
    const a = segmentAt(aSegments, pos);
    const b = segmentAt(bSegments, pos);
    const aLiteral = a.type === 'literal' ? a.value : null;
    const bLiteral = b.type === 'literal' ? b.value : null;
    if (aLiteral !== null && bLiteral !== null && aLiteral !== bLiteral) return null;
    parts.push(aLiteral !== null ? aLiteral : (bLiteral !== null ? bLiteral : 'x'));
  }
  return `/${parts.join('/')}`;
}

// The SPEC's fixed entry point: synchronous pure data transform.
// Input must be a plain object with exactly the own data field `routes`.
// Unknown/missing/extra fields, wrong types, and accessors are SCHEMA.
export function run(input) {
  if (!isPlainObject(input)) return fail('SCHEMA');
  const keys = Object.keys(input);
  if (keys.length !== 1 || keys[0] !== 'routes') return fail('SCHEMA');
  const descriptor = Object.getOwnPropertyDescriptor(input, 'routes');
  if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
    return fail('SCHEMA');
  }
  const routes = input.routes;
  if (typeof routes !== 'string') return fail('SCHEMA');
  if (routes.length > MAX_ROUTES_LENGTH) return fail('INPUT_LIMIT', 'routes', null);
  if (hasUnpairedSurrogate(routes)) return fail('UNICODE', 'routes', null);
  if (routes.length === 0) return fail('EMPTY', 'routes', null);
  let text = routes;
  if (text.endsWith('\n')) text = text.slice(0, -1);
  const lines = text.split('\n');
  if (lines.length > MAX_ROWS) return fail('ROW_LIMIT', 'routes', null);

  const parsed = [];
  for (let index = 0; index < lines.length; index += 1) {
    const row = index + 1;
    const parts = lines[index].split('\t');
    if (parts.length !== 2) return fail('ROW_FORMAT', 'routes', row);
    const [method, pattern] = parts;
    if (!METHODS.includes(method)) return fail('METHOD', 'routes', row);
    if (pattern.length > MAX_PATTERN_LENGTH) return fail('PATTERN_LIMIT', 'routes', row);
    const segments = parsePattern(pattern);
    if (segments === null) return fail('PATTERN', 'routes', row);
    const names = new Set();
    for (const segment of segments) {
      if (segment.type === 'literal') continue;
      if (names.has(segment.name)) return fail('DUP_PARAMETER', 'routes', row);
      names.add(segment.name);
    }
    parsed.push({ method, segments, row });
  }

  const overlaps = [];
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const first = parsed[i];
      const second = parsed[j];
      if (first.method !== second.method) continue;
      const witness = witnessFor(first.segments, second.segments);
      if (witness !== null) {
        overlaps.push({
          method: first.method,
          first: first.row,
          second: second.row,
          witness,
        });
      }
    }
  }
  return { ok: true, result: { routeCount: parsed.length, overlaps } };
}

// Canonical JSON: compact, object own keys sorted by UTF-16 code units
// ascending, recursively; array order unchanged. Never calls toJSON.
function canonicalStringify(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('non-finite number in report');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));
    const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  throw new Error('unsupported value in report');
}

// Serialize a run() result into the fixed report file content: compact
// canonical JSON, one trailing LF, UTF-8, no BOM. Over the byte cap the
// report is refused with OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  let text;
  try {
    text = `${canonicalStringify(result)}\n`;
  } catch {
    return { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
