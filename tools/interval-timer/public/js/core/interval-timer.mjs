// Pure core for the Interval Timer.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-interval-timer-20261109):
// run(input) validates four ASCII integer-string fields plus the
// finalRest enum and builds a segment-by-segment program (prepare, then
// rounds of work/rest, zero-length segments omitted) with its total
// time; startSession / applyEvent / snapshot drive a state machine that
// only consumes active elapsed milliseconds supplied by the controller
// (paused time never advances it). All arithmetic is safe-integer
// seconds / milliseconds; the only rounding is the pinned ceil display
// rule for remaining seconds.

export const FIELDS = ["prepareSeconds", "workSeconds", "restSeconds", "rounds", "finalRest"];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs).
export const RAW_LIMITS = {
  prepareSeconds: 8,
  workSeconds: 8,
  restSeconds: 8,
  rounds: 8,
  finalRest: 8,
};

// Pinned field ranges (SPEC inputsOutputs).
export const RANGES = {
  prepareSeconds: [0, 3600],
  workSeconds: [1, 3600],
  restSeconds: [0, 3600],
  rounds: [1, 99],
};

// Segment-count and total-time ceilings implied by the pinned ranges:
// 1 prepare + 99 work + 99 rest segments; 3600 + 99*3600 + 99*3600 s.
export const MAX_SEGMENTS = 199;
export const MAX_TOTAL_SECONDS = 716400;

export const DEFAULTS = {
  prepareSeconds: "10",
  workSeconds: "30",
  restSeconds: "10",
  rounds: "8",
  finalRest: "skip",
};

// The example draft; identical to the first fixture case (tabata-classic).
export const EXAMPLE = {
  prepareSeconds: "10",
  workSeconds: "20",
  restSeconds: "10",
  rounds: "8",
  finalRest: "skip",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "interval-timer-report.json";

export const KIND_LABELS = {
  prepare: { zh: "準備", en: "Prepare" },
  work: { zh: "運動", en: "Work" },
  rest: { zh: "休息", en: "Rest" },
};

// Pinned status announcements (SPEC userFlow).
export const STATUS_TEXT = {
  empty: { zh: "請輸入節目設定，或載入範例。", en: "Enter a program, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行。", en: "Input changed. Run again." },
  busy: { zh: "處理中…", en: "Working…" },
  success: { zh: "節目表已建立。", en: "Program built." },
  error: { zh: "無法建立節目表，請檢查輸入。", en: "Cannot build the program — check the input." },
  cancelled: { zh: "已取消，可重新執行。", en: "Cancelled. You can run again." },
};

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable properties are exactly the five fields, each an
// own data property (no accessors) holding a primitive string. Symbol
// keys are rejected. Returns the five string values, or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  return values;
}

// True when the value passes the schema gate only (used to decide
// whether a draft may be restored or accepted).
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate one integer field (capacity, surrogate, EMPTY, grammar,
// range) and return its numeric value, or the first field error.
function parseIntegerField(field, raw) {
  const failure = checkCapacityAndUnicode(field, raw);
  if (failure !== null) return failure;
  if (raw === "") return fieldError("EMPTY", field);
  if (!INTEGER_PATTERN.test(raw)) return fieldError("INTEGER_FORMAT", field);
  const value = Number(raw);
  const [min, max] = RANGES[field];
  if (value < min || value > max) return fieldError("RANGE", field);
  return { ok: true, value };
}

// Validate the whole input: schema first, then fields in the fixed
// order prepareSeconds, workSeconds, restSeconds, rounds, finalRest;
// the first error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  const parsed = {};
  for (const field of ["prepareSeconds", "workSeconds", "restSeconds", "rounds"]) {
    const outcome = parseIntegerField(field, values[field]);
    if (!outcome.ok) return outcome;
    parsed[field] = outcome.value;
  }

  const finalFailure = checkCapacityAndUnicode("finalRest", values.finalRest);
  if (finalFailure !== null) return finalFailure;
  if (values.finalRest === "") return fieldError("EMPTY", "finalRest");
  if (values.finalRest !== "include" && values.finalRest !== "skip") {
    return fieldError("ENUM", "finalRest");
  }

  return {
    ok: true,
    values: {
      prepareSeconds: parsed.prepareSeconds,
      workSeconds: parsed.workSeconds,
      restSeconds: parsed.restSeconds,
      rounds: parsed.rounds,
      finalRest: values.finalRest,
    },
  };
}

// Build the segment table for validated values. Zero-length segments
// are omitted; a rest segment follows round k only when restSeconds > 0
// and (k < rounds or finalRest is include).
function buildSegments(values) {
  const { prepareSeconds, workSeconds, restSeconds, rounds, finalRest } = values;
  const segments = [];
  let cursor = 0;
  const push = (kind, round, durationSeconds) => {
    segments.push({
      index: segments.length,
      kind,
      round,
      startSeconds: cursor,
      durationSeconds,
      endSeconds: cursor + durationSeconds,
    });
    cursor += durationSeconds;
  };
  if (prepareSeconds > 0) push("prepare", null, prepareSeconds);
  for (let k = 1; k <= rounds; k += 1) {
    push("work", k, workSeconds);
    if (restSeconds > 0 && (k < rounds || finalRest === "include")) {
      push("rest", k, restSeconds);
    }
  }
  // Cross-check: the cursor total must equal the SPEC formula.
  const rests = finalRest === "include" ? rounds : rounds - 1;
  const formulaTotal = prepareSeconds + rounds * workSeconds + rests * restSeconds;
  if (cursor !== formulaTotal) throw new Error("Segment total disagrees with the SPEC formula.");
  return { segments, totalSeconds: cursor };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { segments, totalSeconds } = buildSegments(validated.values);
  const result = {
    program: { ...validated.values },
    segments,
    segmentCount: segments.length,
    totalSeconds,
  };
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;
  return { ok: true, result };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}

// Duration display (app layer, never feeds back into machine values):
// H:MM:SS at or above one hour, otherwise M:SS.
function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const rest = seconds - hours * 3600;
    return `${hours}:${pad2(Math.floor(rest / 60))}:${pad2(rest % 60)}`;
  }
  return `${Math.floor(seconds / 60)}:${pad2(seconds % 60)}`;
}

// ---- Session state machine (SPEC inputsOutputs, "狀態機核心") ----
// A session is an opaque frozen value: { result, phase, activeElapsedMs }.
// applyEvent never mutates its input session; it returns
// { session, cues }. Events outside the transition table are ignored
// whole (session unchanged, cues empty), as are tick/pause events whose
// elapsedMs is not a safe non-negative integer, and tick/pause readings
// that move backwards. The delivered SPEC.md file is truncated
// mid-transition-table (see HANDOFF.md); the transitions below are the
// ones pinned by the three session fixtures, and reset is accepted from
// every phase.

function isValidResult(result) {
  if (result === null || typeof result !== "object" || Array.isArray(result)) return false;
  if (!Array.isArray(result.segments) || result.segments.length === 0) return false;
  if (!Number.isSafeInteger(result.totalSeconds) || result.totalSeconds <= 0) return false;
  let cursor = 0;
  for (let i = 0; i < result.segments.length; i += 1) {
    const seg = result.segments[i];
    if (seg === null || typeof seg !== "object") return false;
    if (
      !Number.isSafeInteger(seg.index) ||
      seg.index !== i ||
      !Number.isSafeInteger(seg.startSeconds) ||
      !Number.isSafeInteger(seg.durationSeconds) ||
      !Number.isSafeInteger(seg.endSeconds) ||
      seg.durationSeconds <= 0 ||
      seg.startSeconds !== cursor ||
      seg.endSeconds !== seg.startSeconds + seg.durationSeconds ||
      (seg.kind !== "prepare" && seg.kind !== "work" && seg.kind !== "rest")
    ) {
      return false;
    }
    cursor = seg.endSeconds;
  }
  return cursor === result.totalSeconds;
}

export function startSession(result) {
  if (!isValidResult(result)) {
    throw new TypeError("startSession requires a successful run() result.");
  }
  const segments = result.segments.map((seg) => ({
    index: seg.index,
    kind: seg.kind,
    round: seg.round,
    startSeconds: seg.startSeconds,
    durationSeconds: seg.durationSeconds,
    endSeconds: seg.endSeconds,
  }));
  const frozenResult = Object.freeze({
    program: Object.freeze({ ...result.program }),
    segments: Object.freeze(segments),
    segmentCount: segments.length,
    totalSeconds: result.totalSeconds,
  });
  return Object.freeze({ result: frozenResult, phase: "ready", activeElapsedMs: 0 });
}

// Position of an active elapsed value: the segment with
// startMs <= E < endMs, or null when E >= totalMs (finished position).
// A boundary exactly equal to a segment endMs belongs to the next segment.
function locate(session, elapsedMs) {
  const totalMs = session.result.totalSeconds * 1000;
  if (elapsedMs >= totalMs) return null;
  for (const seg of session.result.segments) {
    if (elapsedMs >= seg.startSeconds * 1000 && elapsedMs < seg.endSeconds * 1000) return seg;
  }
  return null;
}

function makeSession(session, phase, activeElapsedMs) {
  return Object.freeze({ result: session.result, phase, activeElapsedMs });
}

function segmentStartCue(seg) {
  return { type: "segmentStart", segmentIndex: seg.index, kind: seg.kind, round: seg.round };
}

function isValidEvent(event) {
  if (event === null || typeof event !== "object" || Array.isArray(event)) return false;
  if (typeof event.type !== "string") return false;
  if (event.type === "tick" || event.type === "pause") {
    return (
      Number.isSafeInteger(event.elapsedMs) &&
      event.elapsedMs >= 0
    );
  }
  return (
    event.type === "start" ||
    event.type === "resume" ||
    event.type === "skip" ||
    event.type === "reset"
  );
}

export function applyEvent(session, event) {
  const unchanged = { session, cues: [] };
  if (
    session === null ||
    typeof session !== "object" ||
    !["ready", "running", "paused", "finished"].includes(session.phase) ||
    !Number.isSafeInteger(session.activeElapsedMs) ||
    !isValidResult(session.result)
  ) {
    return unchanged;
  }
  if (!isValidEvent(event)) return unchanged;

  const totalMs = session.result.totalSeconds * 1000;
  const { phase } = session;

  if (event.type === "reset") {
    return { session: makeSession(session, "ready", 0), cues: [] };
  }

  if (event.type === "start") {
    if (phase !== "ready") return unchanged;
    const first = session.result.segments[0];
    return { session: makeSession(session, "running", 0), cues: [segmentStartCue(first)] };
  }

  if (event.type === "resume") {
    if (phase !== "paused") return unchanged;
    return { session: makeSession(session, "running", session.activeElapsedMs), cues: [] };
  }

  if (event.type === "tick" || event.type === "pause") {
    if (phase !== "running") return unchanged;
    if (event.elapsedMs < session.activeElapsedMs) return unchanged;
    if (event.elapsedMs >= totalMs) {
      return { session: makeSession(session, "finished", totalMs), cues: [{ type: "programEnd" }] };
    }
    const nextPhase = event.type === "pause" ? "paused" : "running";
    const before = locate(session, session.activeElapsedMs);
    const after = locate(session, event.elapsedMs);
    const cues = after !== null && (before === null || after.index !== before.index)
      ? [segmentStartCue(after)]
      : [];
    return { session: makeSession(session, nextPhase, event.elapsedMs), cues };
  }

  if (event.type === "skip") {
    if (phase !== "running" && phase !== "paused") return unchanged;
    const current = locate(session, session.activeElapsedMs);
    if (current === null) return unchanged;
    const nextIndex = current.index + 1;
    if (nextIndex >= session.result.segments.length) {
      return { session: makeSession(session, "finished", totalMs), cues: [{ type: "programEnd" }] };
    }
    const next = session.result.segments[nextIndex];
    return {
      session: makeSession(session, phase, next.startSeconds * 1000),
      cues: [segmentStartCue(next)],
    };
  }

  return unchanged;
}

export function snapshot(session) {
  const totalMs = session.result.totalSeconds * 1000;
  const { phase, activeElapsedMs } = session;
  if (phase === "ready") {
    return {
      phase,
      segmentIndex: null,
      kind: null,
      round: null,
      segmentRemainingSeconds: null,
      totalRemainingSeconds: session.result.totalSeconds,
      activeElapsedMs,
    };
  }
  if (phase === "finished") {
    return {
      phase,
      segmentIndex: null,
      kind: null,
      round: null,
      segmentRemainingSeconds: null,
      totalRemainingSeconds: 0,
      activeElapsedMs,
    };
  }
  const seg = locate(session, activeElapsedMs);
  return {
    phase,
    segmentIndex: seg.index,
    kind: seg.kind,
    round: seg.round,
    segmentRemainingSeconds: Math.ceil((seg.endSeconds * 1000 - activeElapsedMs) / 1000),
    totalRemainingSeconds: Math.ceil((totalMs - activeElapsedMs) / 1000),
    activeElapsedMs,
  };
}
