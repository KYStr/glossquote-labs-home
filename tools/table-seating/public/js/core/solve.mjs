// Pure core for Party Table Seating (spec-table-seating-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{found, tables}}
//                | {status:"error", error:{code, path}}
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE, REF (SYNTAX is a
// form-level raw-text error and is produced by the app, not by solve).
// path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// array input order (duplicates detected at the second occurrence) ->
// cross-field pin references (REF).

export const MAX_JSON_BYTES = 65536;
export const MAX_TABLES = 4;
export const MAX_PARTIES = 8;
export const MAX_NAME_CODE_POINTS = 24;
export const SEAT_MIN = 1;
export const SEAT_MAX = 20;
export const BATCH_STEPS = 4096;

const ROOT_KEYS = ["tables", "parties"];
const TABLE_KEYS = ["name", "seats", "stepFree"];
const PARTY_KEYS = ["name", "size", "stepFree", "pin"];

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
const NAME_REST = /[\p{L}\p{M}\p{N} \-_]/u;

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

// I[a,b]: JavaScript safe integer within endpoints. Rejects -0, string
// numbers and non-integers with TYPE; out-of-range integers with RANGE.
function checkInteger(value, min, max) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Object.is(value, -0)
  ) {
    return { ok: false, code: "TYPE" };
  }
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return { ok: false, code: "RANGE" };
  }
  return { ok: true };
}

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

function checkBoolean(value, path) {
  return typeof value === "boolean" ? null : err("TYPE", path);
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

  if (!Array.isArray(data.tables)) {
    return { ok: false, reply: err("TYPE", "/tables") };
  }
  if (data.tables.length < 1 || data.tables.length > MAX_TABLES) {
    return { ok: false, reply: err("RANGE", "/tables") };
  }
  if (!Array.isArray(data.parties)) {
    return { ok: false, reply: err("TYPE", "/parties") };
  }
  if (data.parties.length < 1 || data.parties.length > MAX_PARTIES) {
    return { ok: false, reply: err("RANGE", "/parties") };
  }

  const tables = [];
  const tableNames = new Map();
  for (let i = 0; i < data.tables.length; i += 1) {
    const row = data.tables[i];
    const base = `/tables/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, TABLE_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) return { ok: false, reply: err(name.code, `${base}/name`) };
    if (tableNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    tableNames.set(name.name, true);
    const seats = checkInteger(row.seats, SEAT_MIN, SEAT_MAX);
    if (!seats.ok) {
      return { ok: false, reply: err(seats.code, `${base}/seats`) };
    }
    const stepFree = checkBoolean(row.stepFree, `${base}/stepFree`);
    if (stepFree) return { ok: false, reply: stepFree };
    tables.push({ name: name.name, seats: row.seats, stepFree: row.stepFree });
  }

  const parties = [];
  const partyNames = new Map();
  for (let i = 0; i < data.parties.length; i += 1) {
    const row = data.parties[i];
    const base = `/parties/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, PARTY_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) return { ok: false, reply: err(name.code, `${base}/name`) };
    if (partyNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    partyNames.set(name.name, true);
    const size = checkInteger(row.size, SEAT_MIN, SEAT_MAX);
    if (!size.ok) {
      return { ok: false, reply: err(size.code, `${base}/size`) };
    }
    const stepFree = checkBoolean(row.stepFree, `${base}/stepFree`);
    if (stepFree) return { ok: false, reply: stepFree };
    let pin = null;
    if (row.pin !== null) {
      const pinName = normalizeName(row.pin);
      if (!pinName.ok) {
        return { ok: false, reply: err(pinName.code, `${base}/pin`) };
      }
      pin = pinName.name;
    }
    parties.push({
      name: name.name,
      size: row.size,
      stepFree: row.stepFree,
      pin,
    });
  }

  // Cross-field: every pin must name an existing table (after the same
  // normalization; comparison is case-sensitive).
  for (let i = 0; i < parties.length; i += 1) {
    if (parties[i].pin !== null && !tableNames.has(parties[i].pin)) {
      return { ok: false, reply: err("REF", `/parties/${i}/pin`) };
    }
  }

  return { ok: true, data: { tables, parties } };
}

// Backtracking search as a generator. Yields {steps} progress every
// BATCH_STEPS candidate steps (one candidate step = considering one table
// for one party) and returns the result envelope.
// Rules (SPEC implementation): parties in input order; tables in input
// order; skip tables that mismatch pin, step-free need, or remaining
// capacity; place (deduct capacity) and recurse; on failure restore and
// try the next table. The first complete assignment wins; only after all
// legal branches are exhausted is found=false.
// stats is mutated in place: {nodes, placements}.
export function* search(validated, stats) {
  const { tables, parties } = validated;
  const remaining = tables.map((table) => table.seats);
  const assignment = tables.map(() => []);
  const tableIndexByName = new Map(tables.map((t, i) => [t.name, i]));
  let steps = 0;

  function* place(partyIndex) {
    stats.nodes += 1;
    if (partyIndex === parties.length) return true;
    const party = parties[partyIndex];
    const pinned =
      party.pin === null ? null : tableIndexByName.get(party.pin);
    const candidates =
      pinned === null
        ? tables.map((_, i) => i)
        : [pinned];
    for (const ti of candidates) {
      stats.placements += 1;
      steps += 1;
      if (steps % BATCH_STEPS === 0) yield { steps };
      const table = tables[ti];
      if (party.stepFree && !table.stepFree) continue;
      if (remaining[ti] < party.size) continue;
      remaining[ti] -= party.size;
      assignment[ti].push(partyIndex);
      if (yield* place(partyIndex + 1)) return true;
      assignment[ti].pop();
      remaining[ti] += party.size;
    }
    return false;
  }

  const found = yield* place(0);
  if (!found) return { found: false, tables: null };
  return {
    found: true,
    tables: tables.map((table, ti) => ({
      name: table.name,
      // assignment[ti] is already in party input order (parties are
      // placed in input order and appended).
      parties: assignment[ti].map((pi) => parties[pi].name),
      remaining: remaining[ti],
    })),
  };
}

function runSearch(validated) {
  const stats = { nodes: 0, placements: 0 };
  const gen = search(validated, stats);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return { result: step.value, stats };
}

// Full entry point: validate, then search. Returns the exact SPEC envelope.
export function solve(data) {
  return solveWithStats(data).reply;
}

// Same as solve, plus the search counters for boundary verification.
// The unpruned full tree for 8 parties x 4 tables is 87,381 nodes and
// 87,380 placement attempts; a pruned search never exceeds those.
export function solveWithStats(data) {
  const checked = validate(data);
  if (!checked.ok) {
    return { reply: checked.reply, nodes: 0, placements: 0 };
  }
  const { result, stats } = runSearch(checked.data);
  return {
    reply: { status: "ok", result },
    nodes: stats.nodes,
    placements: stats.placements,
  };
}
