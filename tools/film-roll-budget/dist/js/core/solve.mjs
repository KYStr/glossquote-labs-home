// Pure core for Film Roll Frame Budget (spec-film-roll-budget-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{available, deficit, spare, rows}}
//                | {status:"error", error:{code, path}}
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE, ORDER (SYNTAX is a
// form-level raw-text error and is produced by the app, not by solve).
// path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// table and array input order (duplicates detected at the second
// occurrence) -> cross-field ORDER (reserve <= remaining, then wanted >=
// min per row, in input order).
//
// Allocation: available = remaining - reserve. If the minimums exceed
// available, return the deficit with spare null and rows []. Otherwise
// every scene first receives its minimum, then the remaining budget is
// handed out priority 3 -> 1; within one priority the scenes take turns
// in input order, at most one frame per round, skipping scenes that
// already reached wanted. spare is what is left unallocated and
// unreserved; unmet = wanted - planned.

export const MAX_JSON_BYTES = 65536;
export const MAX_SCENES = 16;
export const MAX_FRAMES = 200;
export const MAX_NAME_CODE_POINTS = 24;
export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 3;

const ROOT_KEYS = ["remaining", "reserve", "scenes"];
const SCENE_KEYS = ["name", "min", "wanted", "priority"];

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

  const remaining = checkInteger(data.remaining, 0, MAX_FRAMES);
  if (!remaining.ok) {
    return { ok: false, reply: err(remaining.code, "/remaining") };
  }
  const reserve = checkInteger(data.reserve, 0, MAX_FRAMES);
  if (!reserve.ok) {
    return { ok: false, reply: err(reserve.code, "/reserve") };
  }
  if (!Array.isArray(data.scenes)) {
    return { ok: false, reply: err("TYPE", "/scenes") };
  }
  if (data.scenes.length < 1 || data.scenes.length > MAX_SCENES) {
    return { ok: false, reply: err("RANGE", "/scenes") };
  }

  const scenes = [];
  const names = new Map();
  for (let i = 0; i < data.scenes.length; i += 1) {
    const row = data.scenes[i];
    const base = `/scenes/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, SCENE_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) return { ok: false, reply: err(name.code, `${base}/name`) };
    if (names.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    names.set(name.name, true);
    const min = checkInteger(row.min, 0, MAX_FRAMES);
    if (!min.ok) {
      return { ok: false, reply: err(min.code, `${base}/min`) };
    }
    const wanted = checkInteger(row.wanted, 0, MAX_FRAMES);
    if (!wanted.ok) {
      return { ok: false, reply: err(wanted.code, `${base}/wanted`) };
    }
    const priority = checkInteger(row.priority, PRIORITY_MIN, PRIORITY_MAX);
    if (!priority.ok) {
      return { ok: false, reply: err(priority.code, `${base}/priority`) };
    }
    scenes.push({
      name: name.name,
      min: row.min,
      wanted: row.wanted,
      priority: row.priority,
    });
  }

  // Cross-field constraints, in the SPEC implementation order:
  // reserve <= remaining first, then wanted >= min per row, in order.
  if (data.reserve > data.remaining) {
    return { ok: false, reply: err("ORDER", "/reserve") };
  }
  for (let i = 0; i < scenes.length; i += 1) {
    if (scenes[i].wanted < scenes[i].min) {
      return { ok: false, reply: err("ORDER", `/scenes/${i}/wanted`) };
    }
  }

  return {
    ok: true,
    data: { remaining: data.remaining, reserve: data.reserve, scenes },
  };
}

// Allocation on validated data. Integer arithmetic only; no rounding.
export function allocate(validated) {
  const { remaining, reserve, scenes } = validated;
  const available = remaining - reserve;
  const minSum = scenes.reduce((sum, scene) => sum + scene.min, 0);
  if (available < minSum) {
    return { available, deficit: minSum - available, spare: null, rows: [] };
  }
  const planned = scenes.map((scene) => scene.min);
  let budget = available - minSum;
  // Priorities 3 -> 1; within one priority, round-robin in input order,
  // at most one frame per scene per round, skipping scenes at wanted.
  for (let priority = PRIORITY_MAX; priority >= PRIORITY_MIN; priority -= 1) {
    if (budget <= 0) break;
    let progressed = true;
    while (budget > 0 && progressed) {
      progressed = false;
      for (let i = 0; i < scenes.length; i += 1) {
        if (budget <= 0) break;
        if (scenes[i].priority !== priority) continue;
        if (planned[i] >= scenes[i].wanted) continue;
        planned[i] += 1;
        budget -= 1;
        progressed = true;
      }
    }
  }
  return {
    available,
    deficit: 0,
    spare: budget,
    rows: scenes.map((scene, i) => ({
      name: scene.name,
      planned: planned[i],
      unmet: scene.wanted - planned[i],
    })),
  };
}

// Full entry point: validate, then allocate. Returns the exact SPEC envelope.
export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  return { status: "ok", result: allocate(checked.data) };
}
