// Curtain Pattern Cuts — pure core.
// Implements docs/specs/curtain-repeat-cut/SPEC.md (spec-curtain-repeat-cut-20261109 v1).
// No DOM, network or storage access. All arithmetic is integer millimetres.

export const STOCK_MIN = 1;
export const STOCK_MAX = 100000;
export const REPEAT_MIN = 0;
export const REPEAT_MAX = 5000;
export const PHASE_MIN = 0;
export const PHASE_MAX = 4999;
export const PANELS_MIN = 1;
export const PANELS_MAX = 16;
export const FINISHED_MIN = 1;
export const FINISHED_MAX = 8000;
export const HEM_MIN = 0;
export const HEM_MAX = 1000;
export const NAME_MIN_CODE_POINTS = 1;
export const NAME_MAX_CODE_POINTS = 24;
export const INPUT_BYTES_MAX = 65536;

const ROOT_KEYS = ["stockMm", "repeatMm", "headPhaseMm", "motifPhaseMm", "panels"];
const PANEL_KEYS = ["name", "finishedMm", "topMm", "bottomMm"];

function error(code, path) {
  return { status: "error", error: { code, path } };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeNonNegativeZero(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0);
}

// Exact key set: unknown keys report the unknown key's fixed path,
// missing keys report the known key's path, both in canonical order.
function checkKeySet(object, expectedKeys, basePath) {
  for (const key of Object.keys(object)) {
    if (!expectedKeys.includes(key)) return error("SHAPE", `${basePath}/${key}`);
  }
  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) {
      return error("SHAPE", `${basePath}/${key}`);
    }
  }
  return null;
}

function checkInteger(value, min, max, path) {
  if (!isSafeNonNegativeZero(value)) return error("TYPE", path);
  if (value < min || value > max) return error("RANGE", path);
  return null;
}

const FIRST_CHAR = /[\p{L}\p{N}]/u;
const REST_CHAR = /[\p{L}\p{M}\p{N} \-_]/u;

// N: trim U+0020 only, NFC-normalise, 1-24 Unicode code points, first
// character a Unicode letter or number, the rest letters, combining
// marks, numbers, ASCII space, hyphen or underscore. Case-sensitive.
export function normalizeName(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/^ +/, "").replace(/ +$/, "");
  return trimmed.normalize("NFC");
}

export function nameProblem(raw) {
  if (typeof raw !== "string") return "TYPE";
  const name = normalizeName(raw);
  const points = [...name];
  if (points.length < NAME_MIN_CODE_POINTS) return "TYPE";
  if (points.length > NAME_MAX_CODE_POINTS) return "RANGE";
  if (!FIRST_CHAR.test(points[0])) return "TYPE";
  for (const point of points.slice(1)) {
    if (!REST_CHAR.test(point)) return "TYPE";
  }
  return null;
}

function validatePanels(panels) {
  if (!Array.isArray(panels)) return error("TYPE", "/panels");
  if (panels.length < PANELS_MIN || panels.length > PANELS_MAX) {
    return error("RANGE", "/panels");
  }
  const seen = new Map();
  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    const base = `/panels/${i}`;
    if (!isPlainObject(panel)) return error("SHAPE", base);
    const shape = checkKeySet(panel, PANEL_KEYS, base);
    if (shape) return shape;
    const problem = nameProblem(panel.name);
    if (problem) return error(problem, `${base}/name`);
    const name = normalizeName(panel.name);
    if (seen.has(name)) return error("DUPLICATE", `${base}/name`);
    seen.set(name, i);
    const finished = checkInteger(panel.finishedMm, FINISHED_MIN, FINISHED_MAX, `${base}/finishedMm`);
    if (finished) return finished;
    const top = checkInteger(panel.topMm, HEM_MIN, HEM_MAX, `${base}/topMm`);
    if (top) return top;
    const bottom = checkInteger(panel.bottomMm, HEM_MIN, HEM_MAX, `${base}/bottomMm`);
    if (bottom) return bottom;
  }
  return null;
}

function validatePhases(data) {
  const { repeatMm, headPhaseMm, motifPhaseMm } = data;
  if (repeatMm === 0) {
    if (headPhaseMm !== 0) return error("PHASE", "/headPhaseMm");
    if (motifPhaseMm !== 0) return error("PHASE", "/motifPhaseMm");
    return null;
  }
  if (headPhaseMm >= repeatMm) return error("PHASE", "/headPhaseMm");
  if (motifPhaseMm >= repeatMm) return error("PHASE", "/motifPhaseMm");
  return null;
}

function compute(data) {
  const { stockMm, repeatMm, headPhaseMm, motifPhaseMm, panels } = data;
  let cursor = 0;
  let wasteMm = 0;
  const cuts = panels.map((panel) => {
    let skipMm = 0;
    if (repeatMm !== 0) {
      const raw = motifPhaseMm - headPhaseMm - cursor - panel.topMm;
      skipMm = ((raw % repeatMm) + repeatMm) % repeatMm;
    }
    const startMm = cursor + skipMm;
    const endMm = startMm + panel.topMm + panel.finishedMm + panel.bottomMm;
    cursor = endMm;
    wasteMm += skipMm;
    return { name: normalizeName(panel.name), skipMm, startMm, endMm };
  });
  const neededMm = cursor;
  return {
    cuts,
    neededMm,
    wasteMm,
    spareMm: Math.max(0, stockMm - neededMm),
    shortageMm: Math.max(0, neededMm - stockMm),
  };
}

// Pure solve: accepts a parsed JSON value. Returns the SPEC's fixed
// {status:"ok",result:{...}} or {status:"error",error:{code,path}}.
export function solve(data) {
  if (!isPlainObject(data)) return error("SHAPE", "");
  const shape = checkKeySet(data, ROOT_KEYS, "");
  if (shape) return shape;
  const stock = checkInteger(data.stockMm, STOCK_MIN, STOCK_MAX, "/stockMm");
  if (stock) return stock;
  const repeat = checkInteger(data.repeatMm, REPEAT_MIN, REPEAT_MAX, "/repeatMm");
  if (repeat) return repeat;
  const head = checkInteger(data.headPhaseMm, PHASE_MIN, PHASE_MAX, "/headPhaseMm");
  if (head) return head;
  const motif = checkInteger(data.motifPhaseMm, PHASE_MIN, PHASE_MAX, "/motifPhaseMm");
  if (motif) return motif;
  const panels = validatePanels(data.panels);
  if (panels) return panels;
  const phases = validatePhases(data);
  if (phases) return phases;
  return { status: "ok", result: compute(data) };
}

// Text entry point: enforces the 65536 UTF-8 byte input cap (SIZE at
// the root) and JSON syntax (SYNTAX at the root) before solve().
export function solveJson(text) {
  if (typeof text !== "string") return error("TYPE", "");
  if (new TextEncoder().encode(text).length > INPUT_BYTES_MAX) {
    return error("SIZE", "");
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return error("SYNTAX", "");
  }
  return solve(data);
}

export const SAMPLE_DRAFT = Object.freeze({
  stockMm: 4000,
  repeatMm: 320,
  headPhaseMm: 80,
  motifPhaseMm: 0,
  panels: Object.freeze([
    Object.freeze({ name: "A", finishedMm: 1500, topMm: 50, bottomMm: 70 }),
    Object.freeze({ name: "B", finishedMm: 1500, topMm: 50, bottomMm: 70 }),
  ]),
});

export function emptyDraft() {
  return {
    stockMm: null,
    repeatMm: 0,
    headPhaseMm: 0,
    motifPhaseMm: 0,
    panels: [{ name: "", finishedMm: null, topMm: 0, bottomMm: 0 }],
  };
}

function cloneDraft(draft) {
  return JSON.parse(JSON.stringify(draft));
}

// Controlled executor for the SPEC's flow cases and the app's run/cancel
// states. edit() replaces the draft and invalidates any pending run;
// run() is ignored while busy; settle() only applies when the runId
// matches the current busy run; cancel() returns to dirty keeping the
// draft; a late settle after cancel or a newer run is discarded.
export function createFlow() {
  const flow = {
    phase: "empty",
    result: null,
    error: null,
    draft: emptyDraft(),
    pendingRunId: null,
    snapshot: null,

    edit(draft) {
      this.draft = cloneDraft(draft);
      this.phase = "dirty";
      this.result = null;
      this.error = null;
      this.pendingRunId = null;
      this.snapshot = null;
      return this.state();
    },

    loadSample() {
      return this.edit(SAMPLE_DRAFT);
    },

    run(runId) {
      if (this.phase === "busy") return this.state();
      this.phase = "busy";
      this.pendingRunId = runId;
      this.snapshot = cloneDraft(this.draft);
      return this.state();
    },

    settle(runId) {
      if (this.phase !== "busy" || this.pendingRunId !== runId) return this.state();
      const outcome = solve(this.snapshot);
      this.pendingRunId = null;
      this.snapshot = null;
      if (outcome.status === "ok") {
        this.phase = "ready";
        this.result = outcome.result;
        this.error = null;
      } else {
        this.phase = "error";
        this.error = outcome.error;
        this.result = null;
      }
      return this.state();
    },

    // Form-level submit errors (blank or malformed fields) enter the
    // error phase without a run; the next edit returns to dirty.
    fail(error) {
      this.phase = "error";
      this.result = null;
      this.error = error;
      this.pendingRunId = null;
      this.snapshot = null;
      return this.state();
    },

    cancel() {
      if (this.phase === "busy") {
        this.phase = "dirty";
        this.pendingRunId = null;
        this.snapshot = null;
      }
      return this.state();
    },

    reset() {
      this.phase = "empty";
      this.result = null;
      this.error = null;
      this.draft = emptyDraft();
      this.pendingRunId = null;
      this.snapshot = null;
      return this.state();
    },

    state() {
      return { phase: this.phase, result: this.result, error: this.error };
    },
  };
  return flow;
}
