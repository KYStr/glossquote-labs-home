// Pure core for Pickup Window Route (SPEC.md spec-pickup-window-route-20261109 v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// solve(data) validates the exact input contract and searches every
// feasible visit order over the directed travel-time matrix, returning
// the earliest-return order. Ties keep the first order found, which is
// the lexicographically smallest by stop input index: the depth-first
// search expands unvisited stops in input order, and a candidate only
// replaces the best on a strictly smaller return time.
//
// Error shape: {status:"error", error:{code, path}} with a JSON Pointer
// path ("" for the root). Success shape:
//   {status:"ok", result:{found, returnAt, visits:[{name,arrive,serveStart,leave}]}}
// with found:false, returnAt:null, visits:[] when no complete route exists.
//
// Validation order (SPEC.md inputsOutputs + implementation §1):
//   SIZE (whole JSON input) -> root shape -> per-field in table order
//   (start, deadline, stops rows in input order, travel row-major) ->
//   cross-field: DUPLICATE names, travel size (RANGE), DIAGONAL,
//   deadline > start (ORDER /deadline), close > open per stop
//   (ORDER /stops/<i>/close).

export const MAX_JSON_BYTES = 65536;
export const MAX_STOPS = 8;
export const BATCH_STEPS = 4096;
export const MAX_NODES = 109601; // sum_{k=0..8} P(8,k): every DFS prefix
export const MAX_ORDERS = 40320; // 8!: every complete order

const ROOT_KEYS = ["start", "deadline", "stops", "travel"];
const STOP_KEYS = ["name", "open", "close", "service"];

function err(code, path) {
  return { status: "error", error: { code, path } };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Exact-key check. Unknown keys report SHAPE at the containing object's
// path; missing keys report SHAPE at the missing key's path.
function checkKeys(obj, keys, basePath) {
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) return err("SHAPE", basePath);
  }
  for (const key of keys) {
    if (!(key in obj)) {
      return err("SHAPE", basePath === "" ? `/${key}` : `${basePath}/${key}`);
    }
  }
  return null;
}

function isSafeInt(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Object.is(value, -0)
  );
}

// Validate an integer field; returns an error reply or null.
function checkInt(value, min, max, path) {
  if (!isSafeInt(value)) return err("TYPE", path);
  if (value < min || value > max) return err("RANGE", path);
  return null;
}

// Normalize a short name: trim U+0020 at both ends, then NFC. Returns
// {ok:true, name} or {ok:false, code} where code is TYPE (bad first
// character or bad characters) or RANGE (empty or over 24 code points).
const NAME_REST = /^[\p{L}\p{M}\p{N} _-]+$/u;
function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  const name = value.replace(/^ +/, "").replace(/ +$/, "").normalize("NFC");
  const points = [...name];
  if (points.length < 1 || points.length > 24) return { ok: false, code: "RANGE" };
  const first = points[0];
  if (!/^\p{L}$/u.test(first) && !/^\p{N}$/u.test(first)) {
    return { ok: false, code: "TYPE" };
  }
  if (!NAME_REST.test(name)) return { ok: false, code: "TYPE" };
  return { ok: true, name };
}

// Validate data and return {ok:true, data} with a normalized copy
// (names NFC-normalized and trimmed), or {ok:false, reply}.
export function validate(data) {
  // SIZE: the whole JSON input, counted in UTF-8 bytes, before any
  // shape check.
  let json;
  try {
    json = JSON.stringify(data);
  } catch {
    return { ok: false, reply: err("TYPE", "") };
  }
  if (json === undefined) return { ok: false, reply: err("TYPE", "") };
  if (new TextEncoder().encode(json).length > MAX_JSON_BYTES) {
    return { ok: false, reply: err("SIZE", "") };
  }
  if (!isPlainObject(data)) return { ok: false, reply: err("TYPE", "") };
  const rootShape = checkKeys(data, ROOT_KEYS, "");
  if (rootShape) return { ok: false, reply: rootShape };

  // Per-field validation, in table order.
  let bad = checkInt(data.start, 0, 1439, "/start");
  if (bad) return { ok: false, reply: bad };
  bad = checkInt(data.deadline, 1, 1440, "/deadline");
  if (bad) return { ok: false, reply: bad };

  if (!Array.isArray(data.stops)) return { ok: false, reply: err("TYPE", "/stops") };
  if (data.stops.length < 1 || data.stops.length > MAX_STOPS) {
    return { ok: false, reply: err("RANGE", "/stops") };
  }
  const stops = [];
  for (let i = 0; i < data.stops.length; i += 1) {
    const base = `/stops/${i}`;
    const row = data.stops[i];
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const shape = checkKeys(row, STOP_KEYS, base);
    if (shape) return { ok: false, reply: shape };
    const name = normalizeName(row.name);
    if (!name.ok) return { ok: false, reply: err(name.code, `${base}/name`) };
    bad = checkInt(row.open, 0, 1439, `${base}/open`);
    if (bad) return { ok: false, reply: bad };
    bad = checkInt(row.close, 1, 1440, `${base}/close`);
    if (bad) return { ok: false, reply: bad };
    bad = checkInt(row.service, 1, 240, `${base}/service`);
    if (bad) return { ok: false, reply: bad };
    stops.push({
      name: name.name,
      open: row.open,
      close: row.close,
      service: row.service,
    });
  }

  if (!Array.isArray(data.travel)) return { ok: false, reply: err("TYPE", "/travel") };
  const travel = [];
  for (let i = 0; i < data.travel.length; i += 1) {
    const row = data.travel[i];
    if (!Array.isArray(row)) return { ok: false, reply: err("TYPE", `/travel/${i}`) };
    const out = [];
    for (let j = 0; j < row.length; j += 1) {
      const cell = row[j];
      if (cell === null) {
        out.push(null);
        continue;
      }
      const badCell = checkInt(cell, 0, 1440, `/travel/${i}/${j}`);
      if (badCell) return { ok: false, reply: badCell };
      out.push(cell);
    }
    travel.push(out);
  }

  // Cross-field checks, after every field type is valid.
  // Duplicate names: the second occurrence is reported.
  const seen = new Map();
  for (let i = 0; i < stops.length; i += 1) {
    if (seen.has(stops[i].name)) {
      return { ok: false, reply: err("DUPLICATE", `/stops/${i}/name`) };
    }
    seen.set(stops[i].name, i);
  }

  // Matrix size: (n+1) x (n+1).
  const n = stops.length;
  if (travel.length !== n + 1) return { ok: false, reply: err("RANGE", "/travel") };
  for (let i = 0; i < travel.length; i += 1) {
    if (travel[i].length !== n + 1) {
      return { ok: false, reply: err("RANGE", `/travel/${i}`) };
    }
  }

  // Diagonal fixed 0: a null or non-zero diagonal is DIAGONAL.
  for (let i = 0; i <= n; i += 1) {
    if (travel[i][i] !== 0) {
      return { ok: false, reply: err("DIAGONAL", `/travel/${i}/${i}`) };
    }
  }

  // Deadline must be later than start.
  if (data.deadline <= data.start) {
    return { ok: false, reply: err("ORDER", "/deadline") };
  }

  // Each window must close after it opens, in stop order.
  for (let i = 0; i < n; i += 1) {
    if (stops[i].close <= stops[i].open) {
      return { ok: false, reply: err("ORDER", `/stops/${i}/close`) };
    }
  }

  return {
    ok: true,
    data: { start: data.start, deadline: data.deadline, stops, travel },
  };
}

// Depth-first search over visit orders. Yields control every
// BATCH_STEPS candidate steps so a worker can read a cancel between
// batches. Returns the result object. stats accumulates {nodes, orders}:
// nodes counts every DFS prefix (at most 109,601 for 8 stops), orders
// counts complete permutations whose return leg exists (at most 40,320).
export function* search(data, stats = { nodes: 0, orders: 0 }) {
  const n = data.stops.length;
  const { stops, travel } = data;
  let best = null;
  let steps = 0;
  const visited = new Array(n).fill(false);

  function* dfs(current, time, visits) {
    stats.nodes += 1;
    if (visits.length === n) {
      const back = travel[current][0];
      if (back !== null) {
        const returnAt = time + back;
        stats.orders += 1;
        if (
          returnAt <= data.deadline &&
          (best === null || returnAt < best.returnAt)
        ) {
          best = { returnAt, visits: visits.map((v) => ({ ...v })) };
        }
      }
      return;
    }
    for (let i = 0; i < n; i += 1) {
      if (visited[i]) continue;
      const leg = travel[current][i + 1];
      if (leg === null) continue;
      const stop = stops[i];
      const arrive = time + leg;
      const serveStart = Math.max(arrive, stop.open);
      const leave = serveStart + stop.service;
      // Times only grow along a route (travel >= 0, service >= 1,
      // waiting >= 0), so a prefix that already breaks a window or the
      // deadline can never recover: prune it.
      if (leave > stop.close || leave > data.deadline) continue;
      steps += 1;
      if (steps % BATCH_STEPS === 0) yield;
      visited[i] = true;
      visits.push({ name: stop.name, arrive, serveStart, leave });
      yield* dfs(i + 1, leave, visits);
      visits.pop();
      visited[i] = false;
    }
  }

  yield* dfs(0, data.start, []);
  if (best === null) return { found: false, returnAt: null, visits: [] };
  return { found: true, returnAt: best.returnAt, visits: best.visits };
}

export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  const stats = { nodes: 0, orders: 0 };
  const gen = search(checked.data, stats);
  let next = gen.next();
  while (!next.done) next = gen.next();
  return { status: "ok", result: next.value };
}
