// Pure core for Module Dependency Reduction.
// No DOM, network, or storage access. Importable by Node tests and by the
// browser app / worker. Implements docs/specs/dependency-reduction/SPEC.md.

export const LIMITS = Object.freeze({
  modulesMaxLength: 3300,
  modulesMaxRows: 100,
  edgesMaxLength: 26400,
  edgesMaxRows: 400,
  reportMaxBytes: 2097152,
});

const NAME_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,31}$/;
// Edge shape: exactly one '>', both sides non-empty, no whitespace anywhere.
const EDGE_SHAPE_RE = /^[^>\s]+>[^>\s]+$/;

function asciiCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

// Index of the first unpaired surrogate, or -1.
function firstUnpairedSurrogateIndex(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return i;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return i;
    }
  }
  return -1;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function stripOneTrailingLf(text) {
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

function parseModules(raw) {
  if (raw.length > LIMITS.modulesMaxLength) {
    return fail('INPUT_LIMIT', 'modules', null);
  }
  const bad = firstUnpairedSurrogateIndex(raw);
  if (bad !== -1) return fail('UNICODE', 'modules', lineOf(raw, bad));
  const stripped = stripOneTrailingLf(raw);
  if (stripped === '') return fail('EMPTY', 'modules', null);
  const lines = stripped.split('\n');
  if (lines.length > LIMITS.modulesMaxRows) {
    return fail('ROW_LIMIT', 'modules', LIMITS.modulesMaxRows + 1);
  }
  const seen = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const name = lines[i];
    if (!NAME_RE.test(name)) return fail('ID', 'modules', i + 1);
    if (seen.has(name)) return fail('DUP_ID', 'modules', i + 1);
    seen.add(name);
  }
  return { ok: true, modules: lines };
}

function parseEdges(raw, moduleSet) {
  if (raw.length > LIMITS.edgesMaxLength) {
    return fail('INPUT_LIMIT', 'edges', null);
  }
  const bad = firstUnpairedSurrogateIndex(raw);
  if (bad !== -1) return fail('UNICODE', 'edges', lineOf(raw, bad));
  const stripped = stripOneTrailingLf(raw);
  const lines = stripped === '' ? [] : stripped.split('\n');
  if (lines.length > LIMITS.edgesMaxRows) {
    return fail('ROW_LIMIT', 'edges', LIMITS.edgesMaxRows + 1);
  }
  const seen = new Set();
  const edges = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!EDGE_SHAPE_RE.test(line)) return fail('EDGE', 'edges', i + 1);
    const splitAt = line.indexOf('>');
    const from = line.slice(0, splitAt);
    const to = line.slice(splitAt + 1);
    if (!moduleSet.has(from) || !moduleSet.has(to)) {
      return fail('UNKNOWN_ID', 'edges', i + 1);
    }
    const key = `${from}\u0000${to}`;
    if (seen.has(key)) return fail('DUP_EDGE', 'edges', i + 1);
    seen.add(key);
    edges.push({ from, to });
  }
  return { ok: true, edges };
}

function findCycle(nodes, successors) {
  const color = new Map(nodes.map((n) => [n, 0])); // 0 unvisited, 1 in stack, 2 done
  const stack = [];
  function dfs(u) {
    color.set(u, 1);
    stack.push(u);
    for (const v of successors.get(u)) {
      if (color.get(v) === 1) {
        const at = stack.indexOf(v);
        return [...stack.slice(at), v];
      }
      if (color.get(v) === 0) {
        const found = dfs(v);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(u, 2);
    return null;
  }
  for (const n of nodes) {
    if (color.get(n) === 0) {
      const found = dfs(n);
      if (found) return found;
    }
  }
  return null;
}

function computeStages(nodes, successors, edges) {
  const indegree = new Map(nodes.map((n) => [n, 0]));
  for (const { to } of edges) indegree.set(to, indegree.get(to) + 1);
  const remaining = new Set(nodes);
  const stages = [];
  while (remaining.size > 0) {
    const layer = [...remaining]
      .filter((n) => indegree.get(n) === 0)
      .sort(asciiCompare);
    // In an acyclic graph a layer always exists.
    stages.push(layer);
    for (const u of layer) {
      remaining.delete(u);
      for (const v of successors.get(u)) {
        indegree.set(v, indegree.get(v) - 1);
      }
    }
  }
  return stages;
}

// Shortest path from `from` to `to` without using the direct edge from>to.
// BFS with ASCII-sorted successors; first enqueue fixes the predecessor.
function alternatePath(from, to, successors) {
  const predecessor = new Map([[from, null]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const u = queue[head];
    for (const v of successors.get(u)) {
      if (u === from && v === to) continue; // ignore the direct edge itself
      if (!predecessor.has(v)) {
        predecessor.set(v, u);
        if (v === to) {
          const path = [v];
          let cur = v;
          while (predecessor.get(cur) !== null) {
            cur = predecessor.get(cur);
            path.push(cur);
          }
          return path.reverse();
        }
        queue.push(v);
      }
    }
  }
  return null;
}

export function run(input) {
  // Schema: a plain object with exactly the own data fields `modules` and
  // `edges`, both strings. Unknown, missing, wrong-typed, or accessor fields
  // are SCHEMA with field,row null.
  if (!isPlainObject(input)) return fail('SCHEMA', null, null);
  const keys = Object.keys(input);
  if (keys.length !== 2 || !keys.includes('modules') || !keys.includes('edges')) {
    return fail('SCHEMA', null, null);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || 'get' in descriptor || 'set' in descriptor) {
      return fail('SCHEMA', null, null);
    }
    if (typeof input[key] !== 'string') return fail('SCHEMA', null, null);
  }

  const parsedModules = parseModules(input.modules);
  if (!parsedModules.ok) return parsedModules;
  const modules = parsedModules.modules;
  const moduleSet = new Set(modules);

  const parsedEdges = parseEdges(input.edges, moduleSet);
  if (!parsedEdges.ok) return parsedEdges;
  const edges = parsedEdges.edges;

  const nodes = [...modules].sort(asciiCompare);
  const successors = new Map(nodes.map((n) => [n, []]));
  for (const { from, to } of edges) successors.get(from).push(to);
  for (const list of successors.values()) list.sort(asciiCompare);

  const cycle = findCycle(nodes, successors);
  if (cycle) {
    return {
      ok: true,
      result: { status: 'cycle', stages: [], redundant: [], cycle },
    };
  }

  const stages = computeStages(nodes, successors, edges);
  const sortedEdges = [...edges].sort(
    (a, b) => asciiCompare(a.from, b.from) || asciiCompare(a.to, b.to),
  );
  const redundant = [];
  for (const { from, to } of sortedEdges) {
    const via = alternatePath(from, to, successors);
    if (via) redundant.push({ from, to, via });
  }
  return {
    ok: true,
    result: { status: 'acyclic', stages, redundant, cycle: null },
  };
}

// Canonical compact JSON: object own keys recursively sorted by UTF-16 code
// units, array order unchanged, JSON literal string escaping.
export function canonicalStringify(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const parts = keys.map(
      (key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`,
    );
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value);
}

// Serializes the report file body for a successful result. Returns
// {ok:true, text, bytes} or {ok:false, error:{code:'OUTPUT_LIMIT',...}}.
export function serializeReport(result) {
  const text = `${canonicalStringify(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > LIMITS.reportMaxBytes) {
    return fail('OUTPUT_LIMIT', null, null);
  }
  return { ok: true, text, bytes };
}
