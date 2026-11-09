// Pure core for Drop-In Court Queue (spec-court-queue-rotation-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{played, queue, holder, active, next}}
//                | {status:"error", error:{code, path}}
// Error codes: SIZE, SHAPE, TYPE, RANGE, ENUM, DUPLICATE, REF, STATE,
// NEED_TEAMS, WINNER (SYNTAX is a form-level raw-text error and is produced
// by the app, not by solve). path is a JSON Pointer; the root is "".
// Validation order: root TYPE -> SIZE -> root SHAPE -> fields in table
// order (teams, initialQueue, maxConsecutive, events) -> cross-field
// (initialQueue REF then DUPLICATE, then event REFs) -> replay
// (STATE / NEED_TEAMS / WINNER, first offending event in order).
//
// Replay rules: holder re-enters first with streak+1, otherwise the two
// queue heads start with streak 1. On finish, a winner below the cap stays
// as holder and the loser goes to the queue tail; on a draw or when the
// winner hits the cap, both teams return to the tail in court order.
// next previews the start selection only while idle and never consumes
// the queue.

export const MAX_JSON_BYTES = 65536;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 12;
export const MAX_QUEUE = 12;
export const MAX_EVENTS = 120;
export const MIN_CONSECUTIVE = 1;
export const MAX_CONSECUTIVE = 3;
export const MAX_NAME_CODE_POINTS = 24;

const ROOT_KEYS = ["teams", "initialQueue", "maxConsecutive", "events"];
const EVENT_TYPES = new Set(["join", "leave", "start", "finish"]);
const EVENT_KEYS = {
  join: ["type", "team"],
  leave: ["type", "team"],
  start: ["type"],
  finish: ["type", "winner"],
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function err(code, path) {
  return { status: "error", error: { code, path } };
}

// N: short team name. Trim U+0020 on both ends, NFC-normalize, 1-24 Unicode
// code points, first char a Unicode letter or digit, the rest letters,
// combining marks, digits, ASCII space, hyphen or underscore. Case matters.
// Returns {ok:true, name} or {ok:false, error}.
function validateName(value, path) {
  if (typeof value !== "string") return { ok: false, error: err("TYPE", path) };
  const name = value.replace(/^ +| +$/g, "").normalize("NFC");
  const points = [...name];
  if (points.length < 1 || points.length > MAX_NAME_CODE_POINTS) {
    return { ok: false, error: err("RANGE", path) };
  }
  if (!/^[\p{L}\p{N}]$/u.test(points[0])) {
    return { ok: false, error: err("RANGE", path) };
  }
  for (const ch of points.slice(1)) {
    if (!/^[\p{L}\p{M}\p{N} \-_]$/u.test(ch)) {
      return { ok: false, error: err("RANGE", path) };
    }
  }
  return { ok: true, name };
}

// I[a,b]: JavaScript safe integer within bounds. Rejects -0, string numbers
// and non-integers. -0 is RANGE (an integer whose representation is refused);
// non-integers and non-numbers are TYPE.
function validateInteger(value, path, min, max) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return { ok: false, error: err("TYPE", path) };
  }
  if (Object.is(value, -0) || value < min || value > max) {
    return { ok: false, error: err("RANGE", path) };
  }
  return { ok: true, value };
}

// Strict ASCII decimal integer syntax from the SPEC: "0|[1-9][0-9]*", and
// where negatives are allowed "-[1-9][0-9]*". Rejects surrounding space,
// leading zeros, full-width digits, exponents, plus signs, decimals and -0.
// Returns {ok:true, value} or {ok:false}. Used by the form for raw text;
// the core itself works on parsed JSON values.
export function parseAsciiInteger(text, allowNegative = false) {
  if (typeof text !== "string") return { ok: false };
  const pattern = allowNegative
    ? /^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/
    : /^(?:0|[1-9][0-9]*)$/;
  if (!pattern.test(text)) return { ok: false };
  const value = Number(text);
  if (!Number.isSafeInteger(value)) return { ok: false };
  return { ok: true, value };
}

export function solve(data) {
  if (!isPlainObject(data)) return err("TYPE", "");

  // SIZE: whole JSON input over the 65536 UTF-8 byte cap.
  let json;
  try {
    json = JSON.stringify(data);
  } catch {
    return err("TYPE", "");
  }
  if (new TextEncoder().encode(json).length > MAX_JSON_BYTES) {
    return err("SIZE", "");
  }

  // Root SHAPE: exact key set.
  for (const key of ROOT_KEYS) {
    if (!hasOwn(data, key)) return err("SHAPE", `/${key}`);
  }
  for (const key of Object.keys(data)) {
    if (!ROOT_KEYS.includes(key)) return err("SHAPE", "");
  }

  // teams: 2-12 unique N.
  if (!Array.isArray(data.teams)) return err("TYPE", "/teams");
  if (data.teams.length < MIN_TEAMS || data.teams.length > MAX_TEAMS) {
    return err("RANGE", "/teams");
  }
  const teams = [];
  const teamSet = new Set();
  for (let i = 0; i < data.teams.length; i += 1) {
    const checked = validateName(data.teams[i], `/teams/${i}`);
    if (!checked.ok) return checked.error;
    if (teamSet.has(checked.name)) return err("DUPLICATE", `/teams/${i}`);
    teamSet.add(checked.name);
    teams.push(checked.name);
  }

  // initialQueue: 0-12 N (shape only here; refs/duplicates are cross-field).
  if (!Array.isArray(data.initialQueue)) return err("TYPE", "/initialQueue");
  if (data.initialQueue.length > MAX_QUEUE) {
    return err("RANGE", "/initialQueue");
  }
  const initialQueue = [];
  for (let i = 0; i < data.initialQueue.length; i += 1) {
    const checked = validateName(data.initialQueue[i], `/initialQueue/${i}`);
    if (!checked.ok) return checked.error;
    initialQueue.push(checked.name);
  }

  // maxConsecutive: I[1,3].
  const maxChecked = validateInteger(
    data.maxConsecutive,
    "/maxConsecutive",
    MIN_CONSECUTIVE,
    MAX_CONSECUTIVE,
  );
  if (!maxChecked.ok) return maxChecked.error;
  const maxConsecutive = maxChecked.value;

  // events: 0-120, exact union shapes, per-field name checks.
  if (!Array.isArray(data.events)) return err("TYPE", "/events");
  if (data.events.length > MAX_EVENTS) return err("RANGE", "/events");
  const events = [];
  for (let i = 0; i < data.events.length; i += 1) {
    const event = data.events[i];
    const base = `/events/${i}`;
    if (!isPlainObject(event)) return err("TYPE", base);
    if (!hasOwn(event, "type")) return err("SHAPE", `${base}/type`);
    if (typeof event.type !== "string" || !EVENT_TYPES.has(event.type)) {
      return err("ENUM", `${base}/type`);
    }
    const keys = EVENT_KEYS[event.type];
    for (const key of keys) {
      if (!hasOwn(event, key)) return err("SHAPE", `${base}/${key}`);
    }
    for (const key of Object.keys(event)) {
      if (!keys.includes(key)) return err("SHAPE", base);
    }
    if (event.type === "join" || event.type === "leave") {
      const checked = validateName(event.team, `${base}/team`);
      if (!checked.ok) return checked.error;
      events.push({ type: event.type, team: checked.name });
    } else if (event.type === "start") {
      events.push({ type: "start" });
    } else {
      if (event.winner === null) {
        events.push({ type: "finish", winner: null });
      } else {
        const checked = validateName(event.winner, `${base}/winner`);
        if (!checked.ok) return checked.error;
        events.push({ type: "finish", winner: checked.name });
      }
    }
  }

  // Cross-field: initialQueue refs, then initialQueue duplicates, then
  // event team/winner refs, each in array order.
  for (let i = 0; i < initialQueue.length; i += 1) {
    if (!teamSet.has(initialQueue[i])) return err("REF", `/initialQueue/${i}`);
  }
  const queueSeen = new Set();
  for (let i = 0; i < initialQueue.length; i += 1) {
    if (queueSeen.has(initialQueue[i])) {
      return err("DUPLICATE", `/initialQueue/${i}`);
    }
    queueSeen.add(initialQueue[i]);
  }
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if ((event.type === "join" || event.type === "leave") && !teamSet.has(event.team)) {
      return err("REF", `/events/${i}/team`);
    }
    if (event.type === "finish" && event.winner !== null && !teamSet.has(event.winner)) {
      return err("REF", `/events/${i}/winner`);
    }
  }

  // Replay, in event order. One team occupies at most one state.
  let queue = [...initialQueue];
  let holder = null;
  let active = null;
  let played = 0;

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const base = `/events/${i}`;
    if (event.type === "join") {
      const busy =
        queue.includes(event.team) ||
        (holder !== null && holder.team === event.team) ||
        (active !== null && active.some((p) => p.team === event.team));
      if (busy) return err("STATE", base);
      queue.push(event.team);
    } else if (event.type === "leave") {
      const at = queue.indexOf(event.team);
      if (at >= 0) {
        queue.splice(at, 1);
      } else if (holder !== null && holder.team === event.team) {
        holder = null;
      } else {
        return err("STATE", base);
      }
    } else if (event.type === "start") {
      if (active !== null) return err("STATE", base);
      if (holder !== null) {
        if (queue.length < 1) return err("NEED_TEAMS", base);
        active = [
          { team: holder.team, streak: holder.streak + 1 },
          { team: queue.shift(), streak: 1 },
        ];
        holder = null;
      } else {
        if (queue.length < 2) return err("NEED_TEAMS", base);
        active = [
          { team: queue.shift(), streak: 1 },
          { team: queue.shift(), streak: 1 },
        ];
      }
    } else {
      // finish
      if (active === null) return err("STATE", base);
      if (event.winner !== null && !active.some((p) => p.team === event.winner)) {
        return err("WINNER", `${base}/winner`);
      }
      played += 1;
      const winnerEntry =
        event.winner === null
          ? null
          : active.find((p) => p.team === event.winner);
      if (winnerEntry === null || winnerEntry.streak >= maxConsecutive) {
        // Draw, or the winner hit the cap: both return to the tail in
        // court order.
        queue.push(active[0].team, active[1].team);
        holder = null;
      } else {
        const loser = active.find((p) => p.team !== event.winner);
        holder = { team: winnerEntry.team, streak: winnerEntry.streak };
        queue.push(loser.team);
      }
      active = null;
    }
  }

  // next previews the start selection while idle, without consuming.
  let next = null;
  if (active === null) {
    if (holder !== null && queue.length >= 1) {
      next = [holder.team, queue[0]];
    } else if (queue.length >= 2) {
      next = [queue[0], queue[1]];
    }
  }

  return {
    status: "ok",
    result: { played, queue, holder, active, next },
  };
}
