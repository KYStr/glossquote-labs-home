import { verifyCases } from "../verify-cases.mjs";

const defaults = { prepareSeconds: "10", workSeconds: "30", restSeconds: "10", rounds: "8", finalRest: "skip" };
const bounds = { prepareSeconds: [0, 3600], workSeconds: [1, 3600], restSeconds: [0, 3600], rounds: [1, 99] };
const fail = (code, field = null) => ({ ok: false, error: { code, field, row: null } });
const ok = result => ({ ok: true, result });

function core(input) {
  const keys = Object.keys(defaults);
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype ||
      Reflect.ownKeys(input).length !== keys.length ||
      keys.some(key => typeof Object.getOwnPropertyDescriptor(input, key)?.value !== "string")) return fail("SCHEMA");
  const program = {};
  for (const key of keys) {
    const raw = input[key];
    if (raw.length > 8) return fail("INPUT_LIMIT", key);
    if (!raw.isWellFormed()) return fail("UNICODE", key);
    if (!raw.length) return fail("EMPTY", key);
    if (key === "finalRest") {
      if (raw !== "include" && raw !== "skip") return fail("ENUM", key);
      program[key] = raw;
      continue;
    }
    if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) return fail("INTEGER_FORMAT", key);
    const value = Number(raw);
    const [min, max] = bounds[key];
    if (value < min || value > max) return fail("RANGE", key);
    program[key] = value;
  }
  const { prepareSeconds: prepare, workSeconds: work, restSeconds: rest, rounds, finalRest } = program;
  const segments = [];
  function segment(kind, round, startSeconds, durationSeconds) {
    segments.push({ index: segments.length, kind, round, startSeconds, durationSeconds,
      endSeconds: startSeconds + durationSeconds });
  }
  if (prepare > 0) segment("prepare", null, 0, prepare);
  const restRounds = finalRest === "include" ? rounds : rounds - 1;
  for (let round = 1; round <= rounds; round++) {
    const start = prepare + (round - 1) * (work + rest);
    segment("work", round, start, work);
    if (rest > 0 && round <= restRounds) segment("rest", round, start + work, rest);
  }
  const totalSeconds = prepare + rounds * work + restRounds * rest;
  if (totalSeconds !== segments.at(-1).endSeconds) throw new Error("Segment total does not match");
  return ok({ program, segments, segmentCount: segments.length, totalSeconds });
}

const ready = () => ({ phase: "ready", activeElapsedMs: 0 });
const at = (schedule, ms) => schedule.segments.find(s => s.endSeconds * 1000 > ms) ?? null;
const segmentCue = s => ({ type: "segmentStart", segmentIndex: s.index, kind: s.kind, round: s.round });

function view(schedule, state) {
  const { phase, activeElapsedMs } = state;
  const segment = phase === "running" || phase === "paused" ? at(schedule, activeElapsedMs) : null;
  return { phase, activeElapsedMs, segmentIndex: segment?.index ?? null, kind: segment?.kind ?? null,
    round: segment?.round ?? null,
    segmentRemainingSeconds: segment ? Math.ceil((segment.endSeconds * 1000 - activeElapsedMs) / 1000) : null,
    totalRemainingSeconds: Math.ceil((schedule.totalSeconds * 1000 - activeElapsedMs) / 1000) };
}

// The committed transition table is clipped. The rules in this function are
// reconstructed from the surviving definitions and prose in AUTHOR-CHECK.md.
function apply(schedule, state, event) {
  const ignore = { state, cues: [] };
  if (event === null || typeof event !== "object" || Object.getPrototypeOf(event) !== Object.prototype) return ignore;
  const { type, elapsedMs } = event;
  const readsClock = type === "tick" || type === "pause";
  if (Reflect.ownKeys(event).length !== (readsClock ? 2 : 1)) return ignore;
  if (readsClock && (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)) return ignore;
  if (type === "reset") return { state: ready(), cues: [] };
  const { phase, activeElapsedMs } = state;
  if (phase === "ready" && type === "start") {
    return { state: { phase: "running", activeElapsedMs: 0 }, cues: [segmentCue(schedule.segments[0])] };
  }
  if (phase === "paused" && type === "resume") {
    return { state: { phase: "running", activeElapsedMs }, cues: [] };
  }
  const oldSegment = at(schedule, activeElapsedMs);
  let target;
  if (type === "skip" && (phase === "running" || phase === "paused")) {
    target = oldSegment.endSeconds * 1000;
  } else if (readsClock && phase === "running" && elapsedMs >= activeElapsedMs) {
    target = elapsedMs;
  } else return ignore;
  const totalMs = schedule.totalSeconds * 1000;
  if (target >= totalMs) {
    return { state: { phase: "finished", activeElapsedMs: totalMs }, cues: [{ type: "programEnd" }] };
  }
  const nextSegment = at(schedule, target);
  return {
    state: { phase: type === "pause" ? "paused" : phase, activeElapsedMs: target },
    cues: oldSegment.index === nextSegment.index ? [] : [segmentCue(nextSegment)]
  };
}

function replay(input) {
  const schedule = core(input.program).result;
  let state = ready();
  const initial = view(schedule, state);
  const steps = input.steps.map(({ event }) => {
    const next = apply(schedule, state, event);
    state = next.state;
    return { cues: next.cues, snapshot: view(schedule, state) };
  });
  return { initial, steps };
}

function derive(test) {
  const input = test.input;
  if (test.kind === "core") return core(input);
  if (test.kind === "session") return replay(input);
  let active;
  let state = { state: "empty", reportAvailable: false };
  const transition = name => {
    active = name === "busy" ? Symbol("worker") : null;
    state = { state: name, reportAvailable: false };
    return active;
  };
  const finish = (request, result) => {
    if (active !== request || state.state !== "busy") return;
    state = result.ok ? { state: "success", reportAvailable: true }
      : { state: "error", error: result.error, reportAvailable: false };
  };
  const execute = draft => finish(transition("busy"), core(draft));
  if (test.id === "state-dirty-error") {
    execute(input.initial);
    const afterRun = state;
    transition("dirty");
    const afterEdit = state;
    execute(input.edit);
    return { afterRun, afterEdit, afterRerun: state };
  }
  if (test.id === "state-cancel-late") {
    const old = transition("busy");
    const whilePending = state;
    transition("cancelled");
    const afterCancel = { ...state, draft: input.draft };
    finish(old, ok(input.lateResult));
    const afterLateResult = state;
    transition("empty");
    return { whilePending, afterCancel, afterLateResult, afterReset: { ...state, draft: defaults } };
  }
  if (test.id === "state-replace-late") {
    const old = transition("busy");
    execute(input.newerDraft);
    const afterNewerResult = state;
    finish(old, ok(input.olderLateResult));
    return { afterNewerResult, afterOlderLateResult: state };
  }
  throw new Error("Unhandled fixture: " + test.id);
}

const maxInput = { prepareSeconds: "3600", workSeconds: "3600", restSeconds: "3600", rounds: "99", finalRest: "include" };
const max = core(maxInput).result;
const skipInput = { program: { prepareSeconds: "0", workSeconds: "20", restSeconds: "5", rounds: "2", finalRest: "include" },
  steps: [{event:{type:"start"}}, {event:{type:"tick",elapsedMs:3000}}, {event:{type:"skip"}}] };
function tickAfterSkip(elapsedMs) {
  return replay({ ...skipInput, steps: [...skipInput.steps, {event:{type:"tick",elapsedMs}}] }).steps.at(-1);
}
const extra = [
  { id: "proof-scope", core: { count: 15, basis: "fixed SPEC §inputsOutputs program builder" },
    session: { count: 3, basis: "partial SPEC and reviewer reconstruction from AUTHOR-CHECK; normative transition verification NOT_RUN" },
    controller: { count: 3, basis: "partial SPEC §userFlow and reviewer model from AUTHOR-CHECK; complete controller contract verification NOT_RUN" } },
  { id: "max-program", input: maxInput, totalSeconds: max.totalSeconds, segmentCount: max.segmentCount,
    first: max.segments[0], last: max.segments.at(-1) },
  { id: "TMR-01-skip-clock-rebase", input: skipInput, immediatelyAfterSkip: replay(skipInput).steps.at(-1),
    tickWithoutRebaseAt4000: tickAfterSkip(4000), tickRebasedAt21000: tickAfterSkip(21000) }
];
verifyCases(derive, extra);
