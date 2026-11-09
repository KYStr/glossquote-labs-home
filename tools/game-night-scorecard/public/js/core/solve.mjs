// Pure core for Game Night Scorecard (spec-game-night-scorecard-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{standings:[{name,rank,total,best,dropped}]}}
//                | {status:"error", error:{code, path}}
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE, ORDER, ENUM
// (SYNTAX is a form-level raw-text error and is produced by the app, not
// by solve). path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// table/array input order (duplicates detected at the second occurrence)
// -> cross-field: every scores row length first (RANGE), then
// drop < rounds.length (ORDER).

export const MAX_JSON_BYTES = 65536;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 30;
export const MAX_DROP = 3;
export const SCORE_MIN = -999;
export const SCORE_MAX = 999;
export const MAX_NAME_CODE_POINTS = 24;

const ROOT_KEYS = ["players", "mode", "drop", "rounds"];
const ROUND_KEYS = ["name", "scores"];

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

  if (!Array.isArray(data.players)) {
    return { ok: false, reply: err("TYPE", "/players") };
  }
  if (data.players.length < MIN_PLAYERS || data.players.length > MAX_PLAYERS) {
    return { ok: false, reply: err("RANGE", "/players") };
  }
  if (data.mode !== "high" && data.mode !== "low") {
    return { ok: false, reply: err("ENUM", "/mode") };
  }
  const drop = checkInteger(data.drop, 0, MAX_DROP);
  if (!drop.ok) return { ok: false, reply: err(drop.code, "/drop") };
  if (!Array.isArray(data.rounds)) {
    return { ok: false, reply: err("TYPE", "/rounds") };
  }
  if (data.rounds.length < MIN_ROUNDS || data.rounds.length > MAX_ROUNDS) {
    return { ok: false, reply: err("RANGE", "/rounds") };
  }

  const players = [];
  const playerNames = new Map();
  for (let i = 0; i < data.players.length; i += 1) {
    const name = normalizeName(data.players[i]);
    if (!name.ok) {
      return { ok: false, reply: err(name.code, `/players/${i}`) };
    }
    if (playerNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `/players/${i}`) };
    }
    playerNames.set(name.name, true);
    players.push(name.name);
  }

  const rounds = [];
  const roundNames = new Map();
  for (let i = 0; i < data.rounds.length; i += 1) {
    const row = data.rounds[i];
    const base = `/rounds/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, ROUND_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) {
      return { ok: false, reply: err(name.code, `${base}/name`) };
    }
    if (roundNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    roundNames.set(name.name, true);
    if (!Array.isArray(row.scores)) {
      return { ok: false, reply: err("TYPE", `${base}/scores`) };
    }
    const scores = [];
    for (let j = 0; j < row.scores.length; j += 1) {
      const score = checkInteger(row.scores[j], SCORE_MIN, SCORE_MAX);
      if (!score.ok) {
        return { ok: false, reply: err(score.code, `${base}/scores/${j}`) };
      }
      scores.push(row.scores[j]);
    }
    rounds.push({ name: name.name, scores });
  }

  // Cross-field, in SPEC order: every scores row length first, then
  // drop < rounds.length.
  for (let i = 0; i < rounds.length; i += 1) {
    if (rounds[i].scores.length !== players.length) {
      return { ok: false, reply: err("RANGE", `/rounds/${i}/scores`) };
    }
  }
  if (data.drop >= rounds.length) {
    return { ok: false, reply: err("ORDER", "/drop") };
  }

  return { ok: true, data: { players, mode: data.mode, drop: data.drop, rounds } };
}

// Full entry point: validate, then compute standings. Returns the exact
// SPEC envelope.
export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  const { players, mode, drop, rounds } = checked.data;

  // Per player: sort rounds worst-first (high: lowest first; low:
  // highest first), ties by earlier round index; drop the first `drop`.
  // dropped names are listed in round input order.
  const perPlayer = players.map((name, p) => {
    const entries = rounds.map((round, idx) => ({
      score: round.scores[p],
      idx,
      name: round.name,
    }));
    const worstFirst = [...entries].sort((a, b) => {
      if (a.score !== b.score) {
        return mode === "high" ? a.score - b.score : b.score - a.score;
      }
      return a.idx - b.idx;
    });
    const droppedSet = new Set(worstFirst.slice(0, drop).map((e) => e.idx));
    const kept = entries.filter((e) => !droppedSet.has(e.idx));
    const total = kept.reduce((sum, e) => sum + e.score, 0);
    const best =
      mode === "high"
        ? Math.max(...kept.map((e) => e.score))
        : Math.min(...kept.map((e) => e.score));
    const dropped = entries
      .filter((e) => droppedSet.has(e.idx))
      .map((e) => e.name);
    return { name, total, best, dropped, inputIndex: p };
  });

  // Rank by total, then best, both in the mode direction; ties keep
  // input order (Array.prototype.sort is stable). rank = 1 + the number
  // of players strictly better on the (total, best) pair, so shared
  // ranks such as 1, 1, 3 occur.
  const order = [...perPlayer].sort((a, b) => {
    if (a.total !== b.total) {
      return mode === "high" ? b.total - a.total : a.total - b.total;
    }
    if (a.best !== b.best) {
      return mode === "high" ? b.best - a.best : a.best - b.best;
    }
    return a.inputIndex - b.inputIndex;
  });
  const standings = order.map((entry) => {
    let better = 0;
    for (const other of perPlayer) {
      if (other === entry) continue;
      const totalBetter =
        mode === "high" ? other.total > entry.total : other.total < entry.total;
      const totalEqual = other.total === entry.total;
      const bestBetter =
        mode === "high" ? other.best > entry.best : other.best < entry.best;
      if (totalBetter || (totalEqual && bestBetter)) better += 1;
    }
    return {
      name: entry.name,
      rank: 1 + better,
      total: entry.total,
      best: entry.best,
      dropped: entry.dropped,
    };
  });

  return { status: "ok", result: { standings } };
}
