// Pure core for Card Sleeve Stock Fit (SPEC spec-card-sleeve-fit-20261109 v1).
// No DOM, network or storage imports. Exports:
//   validate(data) -> {code, path} | null
//   solve(data) -> {status:"ok", result} | {status:"error", error}
//   solveDetailed(data) -> {reply, stats} (stats: steps, augmentations, nodes, arcs)
//   solveSteps(data) -> generator yielding {type:"progress", steps, augmentations}
//     every 4096 candidate edge examinations, returning the solve reply.
//   parseTenths(text) / formatTenths(tenths) -> form helpers (mm with 1 decimal).
//
// Validation order (SPEC inputsOutputs): overall SIZE, then object SHAPE,
// then fields in table order (minGap, maxGap, cards, sleeves; within a row
// name, w, h, qty/stock; rows in array order), then DUPLICATE names (cards,
// then sleeves, pointing at the second occurrence), then the ORDER cross-field
// rule (maxGap >= minGap, path /maxGap).
// Error format: {status:"error", error:{code, path}} with JSON Pointer paths.

export const MAX_BYTES = 65536;
export const MAX_STEPS_PER_BATCH = 4096;
export const MAX_CARDS = 8;
export const MAX_SLEEVES = 8;

const ROOT_KEYS = ['minGap', 'maxGap', 'cards', 'sleeves'];
const CARD_KEYS = ['name', 'w', 'h', 'qty'];
const SLEEVE_KEYS = ['name', 'w', 'h', 'stock'];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function err(code, path) {
  return { code, path };
}

// --- names (N) -----------------------------------------------------------
// Trim U+0020 only, NFC normalize, 1-24 Unicode code points, first char a
// Unicode letter or digit, rest letters / combining marks / numbers / ASCII
// space / hyphen / underscore. Case-sensitive.
const NAME_FIRST = /^[\p{L}\p{N}]$/u;
const NAME_REST = /^[\p{L}\p{M}\p{N} _-]$/u;

export function normalizeName(value) {
  if (typeof value !== 'string') return null;
  let s = value;
  while (s.startsWith(' ')) s = s.slice(1);
  while (s.endsWith(' ')) s = s.slice(0, -1);
  return s.normalize('NFC');
}

function checkName(value, path) {
  if (typeof value !== 'string') return err('TYPE', path);
  const name = normalizeName(value);
  const points = [...name];
  if (points.length < 1 || points.length > 24) return err('RANGE', path);
  if (!NAME_FIRST.test(points[0])) return err('RANGE', path);
  for (const ch of points) {
    if (!NAME_REST.test(ch)) return err('RANGE', path);
  }
  return null;
}

// --- integers (I[a,b]) ----------------------------------------------------
// Core rejects -0, string numbers and non-integers with TYPE; values outside
// the inclusive bounds with RANGE.
function checkInt(value, min, max, path) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || Object.is(value, -0)) {
    return err('TYPE', path);
  }
  if (value < min || value > max) return err('RANGE', path);
  return null;
}

// --- exact key sets -------------------------------------------------------
function checkKeys(obj, expected, path) {
  for (const key of Object.keys(obj)) {
    if (!expected.includes(key)) return err('SHAPE', path);
  }
  for (const key of expected) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return err('SHAPE', path === '' ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

function checkRow(row, keys, path, isCard) {
  if (!isPlainObject(row)) return err('TYPE', path);
  const shape = checkKeys(row, keys, path);
  if (shape) return shape;
  let bad = checkName(row.name, `${path}/name`);
  if (bad) return bad;
  bad = checkInt(row.w, 10, 3000, `${path}/w`);
  if (bad) return bad;
  bad = checkInt(row.h, 10, 3000, `${path}/h`);
  if (bad) return bad;
  bad = isCard
    ? checkInt(row.qty, 1, 500, `${path}/qty`)
    : checkInt(row.stock, 0, 1000, `${path}/stock`);
  if (bad) return bad;
  return null;
}

function checkDuplicates(rows, basePath) {
  const seen = new Map();
  for (let i = 0; i < rows.length; i++) {
    const name = normalizeName(rows[i].name);
    if (seen.has(name)) return err('DUPLICATE', `${basePath}/${i}/name`);
    seen.set(name, i);
  }
  return null;
}

export function validate(data) {
  if (!isPlainObject(data)) return err('TYPE', '');
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return err('TYPE', '');
  }
  if (serialized === undefined) return err('TYPE', '');
  if (new TextEncoder().encode(serialized).length > MAX_BYTES) return err('SIZE', '');
  const shape = checkKeys(data, ROOT_KEYS, '');
  if (shape) return shape;

  let bad = checkInt(data.minGap, 0, 100, '/minGap');
  if (bad) return bad;
  bad = checkInt(data.maxGap, 0, 100, '/maxGap');
  if (bad) return bad;

  if (!Array.isArray(data.cards)) return err('TYPE', '/cards');
  if (data.cards.length < 1 || data.cards.length > MAX_CARDS) return err('RANGE', '/cards');
  for (let i = 0; i < data.cards.length; i++) {
    bad = checkRow(data.cards[i], CARD_KEYS, `/cards/${i}`, true);
    if (bad) return bad;
  }

  if (!Array.isArray(data.sleeves)) return err('TYPE', '/sleeves');
  if (data.sleeves.length < 1 || data.sleeves.length > MAX_SLEEVES) return err('RANGE', '/sleeves');
  for (let i = 0; i < data.sleeves.length; i++) {
    bad = checkRow(data.sleeves[i], SLEEVE_KEYS, `/sleeves/${i}`, false);
    if (bad) return bad;
  }

  bad = checkDuplicates(data.cards, '/cards');
  if (bad) return bad;
  bad = checkDuplicates(data.sleeves, '/sleeves');
  if (bad) return bad;

  if (data.maxGap < data.minGap) return err('ORDER', '/maxGap');
  return null;
}

// --- form helpers: millimetres with one decimal ---------------------------
// UI accepts ASCII integers or one decimal place, e.g. "63.5" -> 635 tenths.
// Strict: no whitespace, no leading zeros (except "0" itself), no sign,
// no exponent, no second decimal digit. Returns integer tenths or null.
const TENTHS_RE = /^(0|[1-9][0-9]*)(?:\.([0-9]))?$/;
export function parseTenths(text) {
  if (typeof text !== 'string') return null;
  const m = TENTHS_RE.exec(text);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = m[2] === undefined ? 0 : Number(m[2]);
  return whole * 10 + frac;
}

// Strict ASCII non-negative integer, e.g. qty / stock. Returns the integer
// or null.
const INT_RE = /^(0|[1-9][0-9]*)$/;
export function parseIntField(text) {
  if (typeof text !== 'string') return null;
  if (!INT_RE.test(text)) return null;
  return Number(text);
}

// Integer tenths -> "63.5" / "2.0" / "0.0" (plain string math, locale-free).
export function formatTenths(tenths) {
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(tenths);
  return `${sign}${Math.trunc(abs / 10)}.${abs % 10}`;
}

// --- max flow (Edmonds-Karp, SPEC implementation rules) --------------------
// Nodes: 0 source, 1..C cards, C+1..C+S sleeves, last sink (<= 18 nodes).
// Edges appended in order: source->card (cap qty), card->sleeve for each
// compatible pair (cap card qty, card order then sleeve order), sleeve->sink
// (cap stock). Each forward edge immediately appends its reverse edge
// (cap 0) to the endpoint's adjacency list. BFS is FIFO, visits neighbours
// in adjacency-append order, each node once per search; augment by the
// path's minimum residual, then repeat. The cut proves maximality.
function compatible(card, sleeve, minGap, maxGap) {
  const dw = sleeve.w - card.w;
  const dh = sleeve.h - card.h;
  return dw >= minGap && dw <= maxGap && dh >= minGap && dh <= maxGap;
}

export function* solveSteps(data) {
  const invalid = validate(data);
  if (invalid) return { status: 'error', error: invalid };

  const { cards, sleeves, minGap, maxGap } = data;
  const C = cards.length;
  const S = sleeves.length;
  const N = 2 + C + S;
  const SRC = 0;
  const SNK = N - 1;
  const adj = Array.from({ length: N }, () => []);

  function addEdge(u, v, cap) {
    const fwd = { to: v, rev: adj[v].length, cap };
    const rev = { to: u, rev: adj[u].length, cap: 0 };
    adj[u].push(fwd);
    adj[v].push(rev);
  }

  for (let i = 0; i < C; i++) addEdge(SRC, 1 + i, cards[i].qty);
  // Remember each card->sleeve forward edge so its flow can be read back.
  const edgeRef = [];
  for (let i = 0; i < C; i++) {
    edgeRef.push([]);
    for (let j = 0; j < S; j++) {
      if (compatible(cards[i], sleeves[j], minGap, maxGap)) {
        edgeRef[i].push({ node: 1 + i, edgeIndex: adj[1 + i].length });
        addEdge(1 + i, 1 + C + j, cards[i].qty);
      } else {
        edgeRef[i].push(null);
      }
    }
  }
  for (let j = 0; j < S; j++) addEdge(1 + C + j, SNK, sleeves[j].stock);

  const arcCount = adj.reduce((sum, list) => sum + list.length, 0);
  let steps = 0;
  let augmentations = 0;
  let covered = 0;

  for (;;) {
    const parent = new Array(N).fill(null);
    parent[SRC] = { node: -1, edgeIndex: -1 };
    const queue = [SRC];
    let qi = 0;
    let found = false;
    while (qi < queue.length && !found) {
      const u = queue[qi++];
      for (let ei = 0; ei < adj[u].length; ei++) {
        const e = adj[u][ei];
        steps++;
        if (steps % MAX_STEPS_PER_BATCH === 0) {
          yield { type: 'progress', steps, augmentations };
        }
        if (e.cap > 0 && parent[e.to] === null) {
          parent[e.to] = { node: u, edgeIndex: ei };
          if (e.to === SNK) {
            found = true;
            break;
          }
          queue.push(e.to);
        }
      }
    }
    if (!found) break;

    let add = Infinity;
    for (let v = SNK; v !== SRC;) {
      const p = parent[v];
      const e = adj[p.node][p.edgeIndex];
      if (e.cap < add) add = e.cap;
      v = p.node;
    }
    for (let v = SNK; v !== SRC;) {
      const p = parent[v];
      const e = adj[p.node][p.edgeIndex];
      e.cap -= add;
      adj[v][e.rev].cap += add;
      v = p.node;
    }
    covered += add;
    augmentations++;
  }

  const cardRows = [];
  for (let i = 0; i < C; i++) {
    const use = [];
    let outflow = 0;
    for (let j = 0; j < S; j++) {
      const ref = edgeRef[i][j];
      if (ref === null) continue;
      const flow = cards[i].qty - adj[ref.node][ref.edgeIndex].cap;
      if (flow > 0) {
        use.push({ sleeve: normalizeName(sleeves[j].name), qty: flow });
        outflow += flow;
      }
    }
    cardRows.push({
      name: normalizeName(cards[i].name),
      missing: cards[i].qty - outflow,
      use,
    });
  }
  const sleeveRows = [];
  for (let j = 0; j < S; j++) {
    // Inflow to a sleeve = stock - residual of its sleeve->sink edge.
    const sinkEdge = adj[1 + C + j][adj[1 + C + j].length - 1];
    const inflow = sleeves[j].stock - sinkEdge.cap;
    sleeveRows.push({ name: normalizeName(sleeves[j].name), remaining: sleeves[j].stock - inflow });
  }

  return {
    status: 'ok',
    result: { covered, cardRows, sleeveRows },
    stats: { steps, augmentations, nodes: N, arcs: arcCount },
  };
}

export function solve(data) {
  const iterator = solveSteps(data);
  let out = iterator.next();
  while (!out.done) out = iterator.next();
  const { stats, ...reply } = out.value;
  return reply;
}

export function solveDetailed(data) {
  const iterator = solveSteps(data);
  let out = iterator.next();
  while (!out.done) out = iterator.next();
  const { stats, ...reply } = out.value;
  return { reply, stats };
}
