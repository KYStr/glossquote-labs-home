// Pure core for Gift Exchange Match (spec-gift-exchange-match-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{found, assignments}}
//                | {status:"error", error:{code, path}}
//   solveSteps(data) is a generator: it yields a progress object after
//   every tentative feasibility check and returns the same reply solve()
//   returns, so a worker can drive the search in batches and read a
//   cancel between batches. Each yielded batch holds at most one
//   feasibility check (<= 256 edge attempts), far below BATCH_STEPS.
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE, REF, SELF_RULE
// (SYNTAX is a form-level raw-text error and is produced by the app,
// not by solve). path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// array input order (name duplicates at the second occurrence) ->
// cross-field, in the implementation order: blocked refs (from then to,
// row order), then SELF_RULE, then duplicate directions.

export const MAX_JSON_BYTES = 65536;
export const MIN_NAMES = 3;
export const MAX_NAMES = 16;
export const MAX_BLOCKED = 240;
export const MAX_NAME_CODE_POINTS = 24;
export const MAX_FEASIBILITY_CHECKS = 256;
export const MAX_EDGE_ATTEMPTS_PER_CHECK = 4096;
export const BATCH_STEPS = 4096;

const ROOT_KEYS = ["names", "blocked"];
const BLOCKED_KEYS = ["from", "to"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function err(code, path) {
  return { status: "error", error: { code, path } };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// N: short name. Trim U+0020 on both ends, NFC-normalize, 1-24 Unicode
// code points, first char a Unicode letter or digit, the rest letters,
// combining marks, digits, ASCII space, hyphen or underscore.
// Returns {ok:true, name} or {ok:false, code} (TYPE for non-string,
// RANGE for length / character violations).
const NAME_FIRST = /[\p{L}\p{N}]/u;
const NAME_REST = /[\p{L}\p{M}\p{N} _-]/u;

export function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  let name = value;
  // Trim only U+0020, not other whitespace.
  let start = 0;
  let end = name.length;
  while (start < end && name.charCodeAt(start) === 0x20) start += 1;
  while (end > start && name.charCodeAt(end - 1) === 0x20) end -= 1;
  name = name.slice(start, end).normalize("NFC");
  const codePoints = [...name].length;
  if (codePoints < 1 || codePoints > MAX_NAME_CODE_POINTS) {
    return { ok: false, code: "RANGE" };
  }
  const chars = [...name];
  if (!NAME_FIRST.test(chars[0])) return { ok: false, code: "RANGE" };
  for (let i = 1; i < chars.length; i += 1) {
    if (!NAME_REST.test(chars[i])) return { ok: false, code: "RANGE" };
  }
  return { ok: true, name };
}

// Exact key set: unknown keys report SHAPE at the object's path, missing
// keys report SHAPE at the missing key's path. Returns an error envelope
// or null.
function checkShape(object, keys, path) {
  for (const key of Object.keys(object)) {
    if (!keys.includes(key)) return err("SHAPE", path);
  }
  for (const key of keys) {
    if (!hasOwn(object, key)) {
      return err("SHAPE", path === "" ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

// Full validation. Returns {ok:true, data} with normalized names, or
// {ok:false, reply} where reply is the error envelope.
export function validate(data) {
  if (!isPlainObject(data)) return { ok: false, reply: err("TYPE", "") };

  // SIZE first (measured on the JSON serialization of the input).
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return { ok: false, reply: err("TYPE", "") };
  }
  if (serialized === undefined) return { ok: false, reply: err("TYPE", "") };
  if (new TextEncoder().encode(serialized).length > MAX_JSON_BYTES) {
    return { ok: false, reply: err("SIZE", "") };
  }

  const shapeError = checkShape(data, ROOT_KEYS, "");
  if (shapeError) return { ok: false, reply: shapeError };

  if (!Array.isArray(data.names)) {
    return { ok: false, reply: err("TYPE", "/names") };
  }
  if (data.names.length < MIN_NAMES || data.names.length > MAX_NAMES) {
    return { ok: false, reply: err("RANGE", "/names") };
  }
  const names = [];
  const seenNames = new Set();
  for (let i = 0; i < data.names.length; i += 1) {
    const checked = normalizeName(data.names[i]);
    if (!checked.ok) {
      return { ok: false, reply: err(checked.code, `/names/${i}`) };
    }
    if (seenNames.has(checked.name)) {
      return { ok: false, reply: err("DUPLICATE", `/names/${i}`) };
    }
    seenNames.add(checked.name);
    names.push(checked.name);
  }

  if (!Array.isArray(data.blocked)) {
    return { ok: false, reply: err("TYPE", "/blocked") };
  }
  if (data.blocked.length > MAX_BLOCKED) {
    return { ok: false, reply: err("RANGE", "/blocked") };
  }
  const blocked = [];
  for (let i = 0; i < data.blocked.length; i += 1) {
    const row = data.blocked[i];
    if (!isPlainObject(row)) {
      return { ok: false, reply: err("TYPE", `/blocked/${i}`) };
    }
    const rowShape = checkShape(row, BLOCKED_KEYS, `/blocked/${i}`);
    if (rowShape) return { ok: false, reply: rowShape };
    const from = normalizeName(row.from);
    if (!from.ok) {
      return { ok: false, reply: err(from.code, `/blocked/${i}/from`) };
    }
    const to = normalizeName(row.to);
    if (!to.ok) {
      return { ok: false, reply: err(to.code, `/blocked/${i}/to`) };
    }
    blocked.push({ from: from.name, to: to.name });
  }

  // Cross-field, in the implementation order. First all references
  // (from then to, row order), then explicit self-rules, then duplicate
  // directions.
  const nameSet = new Set(names);
  for (let i = 0; i < blocked.length; i += 1) {
    if (!nameSet.has(blocked[i].from)) {
      return { ok: false, reply: err("REF", `/blocked/${i}/from`) };
    }
    if (!nameSet.has(blocked[i].to)) {
      return { ok: false, reply: err("REF", `/blocked/${i}/to`) };
    }
  }
  for (let i = 0; i < blocked.length; i += 1) {
    if (blocked[i].from === blocked[i].to) {
      return { ok: false, reply: err("SELF_RULE", `/blocked/${i}/to`) };
    }
  }
  const seenDirections = new Set();
  for (let i = 0; i < blocked.length; i += 1) {
    const key = `${blocked[i].from}\u0000${blocked[i].to}`;
    if (seenDirections.has(key)) {
      return { ok: false, reply: err("DUPLICATE", `/blocked/${i}`) };
    }
    seenDirections.add(key);
  }

  return { ok: true, data: { names, blocked } };
}

// Deterministic matching search as a generator. Yields a progress object
// {steps, checks, maxCheckSteps} after every tentative feasibility
// check and returns the solve reply. The algorithm follows SPEC
// implementation rule 2: givers in input order, recipients in input
// order among still-unused legal edges; a tentative pick is locked only
// when the remaining givers still admit a complete matching (checked by
// an augmenting-path search); the first such pick wins. If no pick works
// at any stage the whole result is no-match. Decided recipients are
// locked and never re-divided among the remaining matching.
export function* solveSteps(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  const { names, blocked } = checked.data;
  const n = names.length;
  const index = new Map(names.map((name, i) => [name, i]));
  const blockedSet = new Set(
    blocked.map((row) => `${index.get(row.from)}\u0000${index.get(row.to)}`),
  );
  // allowed[i]: recipient indices giver i may give to, in input order.
  // Self-giving is implicitly excluded.
  const allowed = [];
  for (let i = 0; i < n; i += 1) {
    const row = [];
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      if (blockedSet.has(`${i}\u0000${j}`)) continue;
      row.push(j);
    }
    allowed.push(row);
  }

  let steps = 0;
  let checks = 0;
  let maxCheckSteps = 0;
  const assigned = new Array(n).fill(-1);
  const used = new Array(n).fill(false);

  // True when givers start..n-1 can be completely matched to the
  // recipients not yet used. Augmenting-path (Kuhn) search; a recipient
  // already held is reassigned only inside this feasibility check, never
  // in the locked result.
  function feasible(start) {
    checks += 1;
    let checkSteps = 0;
    const matchR = new Array(n).fill(-1);
    const tryKuhn = (giver, visited) => {
      for (const rec of allowed[giver]) {
        if (used[rec] || visited[rec]) continue;
        visited[rec] = true;
        steps += 1;
        checkSteps += 1;
        if (matchR[rec] === -1 || tryKuhn(matchR[rec], visited)) {
          matchR[rec] = giver;
          return true;
        }
      }
      return false;
    };
    for (let g = start; g < n; g += 1) {
      if (!tryKuhn(g, new Array(n).fill(false))) {
        if (checkSteps > maxCheckSteps) maxCheckSteps = checkSteps;
        return false;
      }
    }
    if (checkSteps > maxCheckSteps) maxCheckSteps = checkSteps;
    return true;
  }

  for (let i = 0; i < n; i += 1) {
    let placed = false;
    for (const rec of allowed[i]) {
      if (used[rec]) continue;
      steps += 1;
      assigned[i] = rec;
      used[rec] = true;
      const ok = feasible(i + 1);
      yield { steps, checks, maxCheckSteps };
      if (ok) {
        placed = true;
        break;
      }
      assigned[i] = -1;
      used[rec] = false;
    }
    if (!placed) {
      return { status: "ok", result: { found: false, assignments: [] } };
    }
  }
  return {
    status: "ok",
    result: {
      found: true,
      assignments: names.map((from, i) => ({ from, to: names[assigned[i]] })),
    },
  };
}

// Synchronous solve: drive the generator to completion and return its
// reply. Used by the flow controller's synchronous path and by tests.
export function solve(data) {
  const iterator = solveSteps(data);
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}
