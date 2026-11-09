// Archive Member Path Preflight — pure core.
// Spec: docs/specs/archive-path-preflight/SPEC.md
// (spec-archive-path-preflight-20261109, v1, 2026-11-09).
// No DOM, network, or storage access. No imports: this module is embedded
// verbatim into the preview Worker by scripts/build.mjs.

export const MAX_ENTRIES_UNITS = 65536;
export const MAX_ROWS = 500;
export const MAX_PATH_UNITS = 240;
export const MAX_SEGMENTS = 16;
export const MAX_SEGMENT_CHARS = 64;
export const MAX_REPORT_BYTES = 2097152;
export const REPORT_FILENAME = 'archive-path-preflight-report.json';

const DEVICE_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);
const SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const DRIVE_PREFIX = /^[A-Za-z]:/;

function schemaError() {
  return { ok: false, error: { code: 'SCHEMA', field: null, row: null } };
}

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: must be followed by a low surrogate.
      if (i + 1 >= text.length) return true;
      const next = text.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true; // Lone low surrogate.
    }
  }
  return false;
}

// First segment error, in SPEC priority order:
// EMPTY_SEGMENT, DOT_SEGMENT, SEGMENT_LIMIT, SEGMENT_CHAR, TRAILING_DOT,
// DEVICE_NAME. Returns the code string, or null when the segment is valid.
function firstSegmentError(segment) {
  if (segment === '') return 'EMPTY_SEGMENT';
  if (segment === '.' || segment === '..') return 'DOT_SEGMENT';
  if (segment.length > MAX_SEGMENT_CHARS) return 'SEGMENT_LIMIT';
  if (!SEGMENT_PATTERN.test(segment)) return 'SEGMENT_CHAR';
  if (segment.endsWith('.')) return 'TRAILING_DOT';
  const stem = segment.split('.')[0];
  if (DEVICE_NAMES.has(stem.toUpperCase())) return 'DEVICE_NAME';
  return null;
}

// First path-level error, in SPEC order: PATH_LIMIT, ABSOLUTE, BACKSLASH,
// DEPTH, then per-segment errors left to right.
// Returns { code, segment } (segment is 1-based, or null), or null.
function firstPathError(path) {
  if (path.length > MAX_PATH_UNITS) return { code: 'PATH_LIMIT', segment: null };
  if (path.startsWith('/') || path.startsWith('\\') || DRIVE_PREFIX.test(path)) {
    return { code: 'ABSOLUTE', segment: null };
  }
  if (path.includes('\\')) return { code: 'BACKSLASH', segment: null };
  const segments = path.split('/');
  if (segments.length > MAX_SEGMENTS) return { code: 'DEPTH', segment: null };
  for (let i = 0; i < segments.length; i += 1) {
    const code = firstSegmentError(segments[i]);
    if (code !== null) return { code, segment: i + 1 };
  }
  return null;
}

function makeNode(key) {
  return {
    key,
    children: new Map(),
    // Original segment spellings seen at this node -> lines passing through.
    spellings: new Map(),
    // Explicit members ending at this node: { line, kind }.
    explicit: [],
    // Every source line whose path passes through this node.
    linesThrough: new Set(),
  };
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function collectExplicitLines(node) {
  const lines = [];
  for (const member of node.explicit) lines.push(member.line);
  for (const child of node.children.values()) {
    lines.push(...collectExplicitLines(child));
  }
  return lines;
}

function hasExplicitDescendant(node) {
  for (const child of node.children.values()) {
    if (child.explicit.length > 0) return true;
    if (hasExplicitDescendant(child)) return true;
  }
  return false;
}

const CONFLICT_RANK = { CASE_ALIAS: 0, SAME_MEMBER: 1, PARENT_FILE: 2 };

function walkConflicts(node, out) {
  if (node.key !== '') {
    if (node.spellings.size > 1) {
      out.push({
        kind: 'CASE_ALIAS',
        key: node.key,
        lines: sortedUnique(node.linesThrough),
      });
    }
    if (node.explicit.length >= 2) {
      out.push({
        kind: 'SAME_MEMBER',
        key: node.key,
        lines: sortedUnique(node.explicit.map((member) => member.line)),
      });
    }
    const fileLines = node.explicit
      .filter((member) => member.kind === 'F')
      .map((member) => member.line);
    if (fileLines.length > 0 && hasExplicitDescendant(node)) {
      const descendantLines = [];
      for (const child of node.children.values()) {
        descendantLines.push(...collectExplicitLines(child));
      }
      out.push({
        kind: 'PARENT_FILE',
        key: node.key,
        lines: sortedUnique([...fileLines, ...descendantLines]),
      });
    }
  }
  for (const child of node.children.values()) {
    walkConflicts(child, out);
  }
}

function findConflicts(validRows) {
  const root = makeNode('');
  for (const row of validRows) {
    const segments = row.path.split('/');
    let node = root;
    const keyParts = [];
    for (const segment of segments) {
      const lower = segment.toLowerCase();
      keyParts.push(lower);
      let child = node.children.get(lower);
      if (child === undefined) {
        child = makeNode(keyParts.join('/'));
        node.children.set(lower, child);
      }
      node = child;
      node.linesThrough.add(row.line);
      let spellingLines = node.spellings.get(segment);
      if (spellingLines === undefined) {
        spellingLines = new Set();
        node.spellings.set(segment, spellingLines);
      }
      spellingLines.add(row.line);
    }
    node.explicit.push({ line: row.line, kind: row.kind });
  }
  const conflicts = [];
  walkConflicts(root, conflicts);
  conflicts.sort((a, b) => {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return CONFLICT_RANK[a.kind] - CONFLICT_RANK[b.kind];
  });
  return conflicts;
}

// run(input) — synchronous pure transform.
// input must be a plain object with exactly the own field `entries` (string).
// Returns { ok: true, result } or { ok: false, error: { code, field, row } }.
// Whole-input checks run in SPEC order: SCHEMA, INPUT_LIMIT, UNICODE, EMPTY,
// ROW_LIMIT, then per-line structure (ROW_FORMAT) for every line, then
// per-path validation (first error per row, source order).
export function run(input) {
  if (!isPlainObject(input)) return schemaError();
  const names = Object.getOwnPropertyNames(input);
  if (names.length !== 1 || names[0] !== 'entries') return schemaError();
  const descriptor = Object.getOwnPropertyDescriptor(input, 'entries');
  if (
    descriptor === undefined
    || typeof descriptor.get === 'function'
    || typeof descriptor.set === 'function'
  ) {
    return schemaError();
  }
  const entries = descriptor.value;
  if (typeof entries !== 'string') return schemaError();

  if (entries.length > MAX_ENTRIES_UNITS) {
    return fail('INPUT_LIMIT', 'entries', null);
  }
  if (hasUnpairedSurrogate(entries)) {
    return fail('UNICODE', 'entries', null);
  }
  let body = entries;
  if (body.endsWith('\n')) body = body.slice(0, -1);
  if (body === '') return fail('EMPTY', 'entries', null);
  const lines = body.split('\n');
  if (lines.length > MAX_ROWS) {
    return fail('ROW_LIMIT', 'entries', null);
  }

  const parsed = [];
  for (let i = 0; i < lines.length; i += 1) {
    const parts = lines[i].split('\t');
    if (
      parts.length !== 2
      || (parts[0] !== 'F' && parts[0] !== 'D')
      || parts[1] === ''
    ) {
      return fail('ROW_FORMAT', 'entries', i + 1);
    }
    parsed.push({ kind: parts[0], path: parts[1], line: i + 1 });
  }

  const unsafe = [];
  const valid = [];
  for (const row of parsed) {
    const error = firstPathError(row.path);
    if (error !== null) {
      unsafe.push({ line: row.line, code: error.code, segment: error.segment });
    } else {
      valid.push(row);
    }
  }

  const conflicts = findConflicts(valid);
  return {
    ok: true,
    result: {
      rowCount: parsed.length,
      unsafe,
      conflicts,
      safeWithinPolicy: unsafe.length === 0 && conflicts.length === 0,
    },
  };
}

// Deterministic JSON: compact, object own keys sorted recursively by UTF-16
// code units ascending, array order unchanged. Strings use JSON literal
// escaping. Only plain JSON values are accepted; anything else is INTERNAL.
function stringifySorted(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite number');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifySorted(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError('non-plain object');
    }
    const keys = Object.keys(value).sort();
    const parts = keys.map(
      (key) => `${JSON.stringify(key)}:${stringifySorted(value[key])}`,
    );
    return `{${parts.join(',')}}`;
  }
  throw new TypeError('unserializable value');
}

// Serialize a run() result for download: compact sorted JSON, one trailing
// LF, UTF-8 without BOM. Enforces the 2,097,152-byte report cap.
// Returns { ok: true, text, bytes } or { ok: false, error }.
export function serializeReport(result) {
  let text;
  try {
    text = `${stringifySorted(result)}\n`;
  } catch {
    return { ok: false, error: { code: 'INTERNAL', field: null, row: null } };
  }
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
