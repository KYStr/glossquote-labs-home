// Pure core for Laundry Machine Handoff (SPEC.md inputsOutputs +
// implementation). No DOM / network / storage access. Directly
// importable by node --test.
//
// solve(data) validates the input object in the SPEC's fixed order
// (SIZE -> SHAPE -> fields in table/array order -> DUPLICATE -> ORDER)
// and schedules the loads in fixed order on the washer and dryer,
// returning the feasible prefix and the first load that cannot be
// placed (blockedAt), or an error {code, path}.
//
// Scheduling (SPEC implementation steps 1-4): both machines use
// half-open [start, end) occupancy tables over the 1440 minutes of the
// day. Each load takes the earliest wash minute w whose wash interval
// is free, then the earliest dryer start d >= max(washEnd, prevDryEnd)
// with a free dry interval, both inside the window and with
// d - washEnd <= maxWaitMin. The first acceptable w is used: a later w
// has a later wash end and a non-earlier dryer start, so it cannot
// leave the machines freer for later loads.

export const MAX_JSON_BYTES = 65536;
export const DAY_MINUTES = 1440;
export const MAX_BUSY = 16;
export const MAX_LOADS = 8;
export const MAX_NAME_CODE_POINTS = 24;

const ROOT_KEYS = ["start", "end", "washerBusy", "dryerBusy", "loads"];
const BUSY_KEYS = ["start", "end"];
const LOAD_KEYS = ["name", "washMin", "dryMin", "maxWaitMin"];

// Name characters (SPEC inputsOutputs): first character a Unicode
// letter or digit; the rest letters, marks, digits, ASCII space,
// hyphen or underscore. The hyphen sits last in the class on purpose:
// " -_" inside a class would be the range U+0020-U+005F.
const NAME_FIRST = /^[\p{L}\p{N}]$/u;
const NAME_REST = /^[\p{L}\p{M}\p{N} _-]$/u;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function error(code, path) {
  return { status: "error", error: { code, path } };
}

function byteLength(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

// A core integer: a safe integer, never -0, never a numeric string.
function isInteger(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Object.is(value, -0)
  );
}

function checkInt(value, min, max, path) {
  if (!isInteger(value)) return error("TYPE", path);
  if (value < min || value > max) return error("RANGE", path);
  return null;
}

// Short name N: trim only U+0020 at both ends, then NFC. Length is
// counted in Unicode code points. Empty or over-long is RANGE; a bad
// first or later character is TYPE.
function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  const trimmed = value.replace(/^ +/, "").replace(/ +$/, "");
  const name = trimmed.normalize("NFC");
  const chars = [...name];
  if (chars.length < 1 || chars.length > MAX_NAME_CODE_POINTS) {
    return { ok: false, code: "RANGE" };
  }
  if (!NAME_FIRST.test(chars[0])) return { ok: false, code: "TYPE" };
  for (const ch of chars.slice(1)) {
    if (!NAME_REST.test(ch)) return { ok: false, code: "TYPE" };
  }
  return { ok: true, name };
}

// Exact key set. An unknown key reports SHAPE at the containing
// object's path; a missing key reports SHAPE at that key's path.
function checkShape(obj, keys, path) {
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) return error("SHAPE", path);
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return error("SHAPE", path === "" ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

function buildPrefix(busy) {
  const occupied = new Uint8Array(DAY_MINUTES);
  for (const interval of busy) {
    for (let t = interval.start; t < interval.end; t += 1) occupied[t] = 1;
  }
  const prefix = new Uint16Array(DAY_MINUTES + 1);
  for (let t = 0; t < DAY_MINUTES; t += 1) prefix[t + 1] = prefix[t] + occupied[t];
  return prefix;
}

function isFree(prefix, start, end) {
  return prefix[end] - prefix[start] === 0;
}

// Earliest dryer start >= t whose [s, s + dryMin) interval is free,
// or -1. One reverse scan over t = 1440..0 (at most 1441 steps).
function buildDryNext(prefix, dryMin) {
  const next = new Int16Array(DAY_MINUTES + 1);
  let best = -1;
  for (let t = DAY_MINUTES; t >= 0; t -= 1) {
    if (t + dryMin <= DAY_MINUTES && isFree(prefix, t, t + dryMin)) best = t;
    next[t] = best;
  }
  return next;
}

export function solve(data) {
  // 1. Whole-input size, before shape.
  if (byteLength(data) > MAX_JSON_BYTES) return error("SIZE", "");

  // 2. Root shape.
  if (!isPlainObject(data)) return error("SHAPE", "");
  let bad = checkShape(data, ROOT_KEYS, "");
  if (bad) return bad;

  // 3. Fields in table order, then array input order.
  bad = checkInt(data.start, 0, 1439, "/start");
  if (bad) return bad;
  bad = checkInt(data.end, 1, 1440, "/end");
  if (bad) return bad;

  for (const [field, path] of [
    ["washerBusy", "/washerBusy"],
    ["dryerBusy", "/dryerBusy"],
  ]) {
    const list = data[field];
    if (!Array.isArray(list)) return error("TYPE", path);
    if (list.length > MAX_BUSY) return error("RANGE", path);
    for (let i = 0; i < list.length; i += 1) {
      const row = list[i];
      const rowPath = `${path}/${i}`;
      if (!isPlainObject(row)) return error("TYPE", rowPath);
      bad = checkShape(row, BUSY_KEYS, rowPath);
      if (bad) return bad;
      bad = checkInt(row.start, 0, 1439, `${rowPath}/start`);
      if (bad) return bad;
      bad = checkInt(row.end, 1, 1440, `${rowPath}/end`);
      if (bad) return bad;
    }
  }

  const loads = data.loads;
  if (!Array.isArray(loads)) return error("TYPE", "/loads");
  if (loads.length < 1 || loads.length > MAX_LOADS) {
    return error("RANGE", "/loads");
  }
  const names = [];
  for (let i = 0; i < loads.length; i += 1) {
    const row = loads[i];
    const rowPath = `/loads/${i}`;
    if (!isPlainObject(row)) return error("TYPE", rowPath);
    bad = checkShape(row, LOAD_KEYS, rowPath);
    if (bad) return bad;
    const checkedName = normalizeName(row.name);
    if (!checkedName.ok) return error(checkedName.code, `${rowPath}/name`);
    names.push(checkedName.name);
    bad = checkInt(row.washMin, 1, 240, `${rowPath}/washMin`);
    if (bad) return bad;
    bad = checkInt(row.dryMin, 1, 240, `${rowPath}/dryMin`);
    if (bad) return bad;
    bad = checkInt(row.maxWaitMin, 0, 240, `${rowPath}/maxWaitMin`);
    if (bad) return bad;
  }

  // 4. Cross-field: duplicate load names, at the second occurrence.
  const seen = new Set();
  for (let i = 0; i < names.length; i += 1) {
    if (seen.has(names[i])) return error("DUPLICATE", `/loads/${i}/name`);
    seen.add(names[i]);
  }

  // 5. Cross-field ORDER: window first, then washerBusy, then
  // dryerBusy. A zero-length or reversed interval reports ORDER at
  // its end field.
  if (data.end <= data.start) return error("ORDER", "/end");
  for (const [field, path] of [
    ["washerBusy", "/washerBusy"],
    ["dryerBusy", "/dryerBusy"],
  ]) {
    const list = data[field];
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].end <= list[i].start) {
        return error("ORDER", `${path}/${i}/end`);
      }
    }
  }

  // 6. Schedule in fixed load order.
  const washPrefix = buildPrefix(data.washerBusy);
  const dryPrefix = buildPrefix(data.dryerBusy);
  const rows = [];
  let prevWashEnd = data.start;
  let prevDryEnd = data.start;
  for (let i = 0; i < loads.length; i += 1) {
    const load = loads[i];
    const dryNext = buildDryNext(dryPrefix, load.dryMin);
    let placed = null;
    // Forward scan: at most 1441 candidate wash minutes.
    for (let w = prevWashEnd; w + load.washMin <= data.end; w += 1) {
      if (!isFree(washPrefix, w, w + load.washMin)) continue;
      const washEnd = w + load.washMin;
      const t = Math.max(washEnd, prevDryEnd);
      const d = dryNext[t];
      // d is non-decreasing in w, so once the dryer cannot finish
      // inside the window here, no later w can fix it.
      if (d === -1 || d + load.dryMin > data.end) break;
      const waitMin = d - washEnd;
      if (waitMin > load.maxWaitMin) continue;
      placed = {
        name: names[i],
        washStart: w,
        washEnd,
        dryStart: d,
        dryEnd: d + load.dryMin,
        waitMin,
      };
      break;
    }
    if (placed === null) {
      return { status: "ok", result: { rows, blockedAt: names[i] } };
    }
    rows.push(placed);
    prevWashEnd = placed.washEnd;
    prevDryEnd = placed.dryEnd;
  }
  return { status: "ok", result: { rows, blockedAt: null } };
}
