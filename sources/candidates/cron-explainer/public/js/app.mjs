// DOM layer and text/builder sync controller for the Cron Expression
// Explainer.
//
// Parsing, the DOM/DOW rule, enumeration and the explanation model
// live in the pure core (public/js/core/cron.mjs); prose is rendered
// from the model by public/js/explain.mjs. This layer keeps the text
// field and the per-field builder in sync in both directions (SPEC
// section 3): builder edits rewrite the text canonically, and text
// edits re-classify each field into a builder shape — or "custom",
// in which case the hand-typed text is never silently rewritten.

import {
  FIELD_DEFS,
  buildExplanation,
  canonicalFromRange,
  canonicalFromStep,
  canonicalFromValues,
  classifyShape,
  nextRuns,
  parseExpression,
} from "./core/cron.mjs";
import { displayValue, renderExplanation } from "./explain.mjs";
import { DICTIONARIES, errorMessage, translate } from "./i18n.mjs";

const LANG = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = (code, params) => translate(LANG, code, params);
const $ = (id) => document.querySelector(`#${id}`);
const DICT = DICTIONARIES[LANG] ?? DICTIONARIES["zh-Hant"];

const expressionInput = $("expression-input");
const expressionError = $("expression-error");
const startInput = $("start-input");
const fieldLines = $("field-lines");
const scheduleLine = $("schedule-line");
const runsHeading = $("runs-heading");
const runsBody = $("runs-body");
const runsNote = $("runs-note");
const builderRows = $("builder-rows");

let currentParsed = null;
let debounceTimer = 0;
let syncingFromBuilder = false;

const pad = (n) => String(n).padStart(2, "0");
const fmtDateTime = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

function timezoneName() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  } catch {
    // fall through to the offset form
  }
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// ---------- Builder rows ----------

function fieldValues(def) {
  // DOW builder values are 0-6 (7 is only a typed alias for Sunday).
  const max = def.key === "dow" ? 6 : def.max;
  const values = [];
  for (let v = def.min; v <= max; v += 1) values.push(v);
  return values;
}

function makeSelect(options, value) {
  const select = document.createElement("select");
  for (const option of options) {
    const element = document.createElement("option");
    element.value = String(option.value);
    element.textContent = option.label;
    select.append(element);
  }
  select.value = String(value);
  return select;
}

const builder = FIELD_DEFS.map((def, fieldIndex) => {
  const row = document.createElement("div");
  row.className = "builder-row";
  const label = document.createElement("span");
  label.className = "field-label";
  label.textContent = DICT.fieldLabels[def.key];
  const modeSelect = makeSelect(
    [
      { value: "every", label: t("BUILDER_EVERY") },
      { value: "values", label: t("BUILDER_VALUES") },
      { value: "range", label: t("BUILDER_RANGE") },
      { value: "step", label: t("BUILDER_STEP") },
      { value: "custom", label: t("BUILDER_CUSTOM") },
    ],
    "every",
  );
  const controls = document.createElement("div");
  controls.className = "builder-controls";
  row.append(label, modeSelect, controls);
  builderRows.append(row);
  const state = { def, fieldIndex, modeSelect, controls, shape: { mode: "every" }, parts: {} };

  modeSelect.addEventListener("change", () => {
    applyMode(fieldIndex, modeSelect.value, true);
  });
  return state;
});

function valueOptions(def) {
  return fieldValues(def).map((value) => ({
    value,
    label: displayValue(LANG, def.key, value),
  }));
}

function buildControls(state) {
  const { def, controls, shape } = state;
  controls.replaceChildren();
  state.parts = {};
  if (shape.mode === "values") {
    const grid = document.createElement("div");
    grid.className = "checkbox-grid";
    const boxes = new Map();
    for (const value of fieldValues(def)) {
      const item = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = String(value);
      box.checked = state.currentSet.has(value);
      box.addEventListener("change", () => {
        const next = new Set(state.currentSet);
        if (box.checked) next.add(value);
        else next.delete(value);
        if (next.size === 0) {
          box.checked = true; // an empty set is not a cron field
          return;
        }
        state.currentSet = next;
        writeField(fieldIndexOf(state), canonicalFromValues(next, def));
      });
      boxes.set(value, box);
      item.append(box, document.createTextNode(` ${displayValue(LANG, def.key, value)}`));
      grid.append(item);
    }
    state.parts.boxes = boxes;
    controls.append(grid);
  } else if (shape.mode === "range") {
    const from = makeSelect(valueOptions(def), shape.a ?? def.min);
    const to = makeSelect(valueOptions(def), shape.b ?? def.min + 1);
    const onChange = () => {
      let a = Number(from.value);
      let b = Number(to.value);
      if (a > b) [a, b] = [b, a];
      from.value = String(a);
      to.value = String(b);
      writeField(fieldIndexOf(state), canonicalFromRange(a, b, def));
    };
    from.addEventListener("change", onChange);
    to.addEventListener("change", onChange);
    state.parts = { from, to };
    controls.append(labelled(t("BUILDER_FROM"), from), labelled(t("BUILDER_TO"), to));
  } else if (shape.mode === "step") {
    const base = shape.base ?? { type: "star" };
    const baseSelect = makeSelect(
      [
        { value: "star", label: t("BUILDER_BASE_ALL") },
        { value: "range", label: t("BUILDER_BASE_RANGE") },
        { value: "single", label: t("BUILDER_BASE_FROM") },
      ],
      base.type,
    );
    const fromValue = base.type === "range" || base.type === "single" ? base.a : def.min;
    const toValue = base.type === "range" ? base.b : def.min + 1;
    const from = makeSelect(valueOptions(def), fromValue);
    const to = makeSelect(valueOptions(def), toValue);
    const stepInput = document.createElement("input");
    stepInput.type = "number";
    stepInput.min = "1";
    stepInput.value = String(shape.step ?? 2);
    const onChange = () => {
      const step = Math.max(1, Math.floor(Number(stepInput.value) || 1));
      stepInput.value = String(step);
      const kind = baseSelect.value;
      to.hidden = kind !== "range";
      from.hidden = kind === "star";
      let baseSpec = { type: "star" };
      if (kind === "range") {
        let a = Number(from.value);
        let b = Number(to.value);
        if (a > b) [a, b] = [b, a];
        baseSpec = { type: "range", a, b };
      } else if (kind === "single") {
        baseSpec = { type: "single", a: Number(from.value) };
      }
      writeField(fieldIndexOf(state), canonicalFromStep(baseSpec, step, def));
    };
    baseSelect.addEventListener("change", onChange);
    from.addEventListener("change", onChange);
    to.addEventListener("change", onChange);
    stepInput.addEventListener("change", onChange);
    state.parts = { baseSelect, from, to, stepInput };
    controls.append(
      labelled(t("BUILDER_BASE"), baseSelect),
      labelled(t("BUILDER_FROM"), from),
      labelled(t("BUILDER_TO"), to),
      labelled(t("BUILDER_STEP_EVERY"), stepInput),
    );
    to.hidden = base.type !== "range";
    from.hidden = base.type === "star";
  } else if (shape.mode === "custom") {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = t("BUILDER_CUSTOM_NOTE");
    controls.append(note);
  }
}

function labelled(text, control) {
  const wrap = document.createElement("label");
  wrap.append(document.createTextNode(`${text} `), control);
  return wrap;
}

function fieldIndexOf(state) {
  return builder.indexOf(state);
}

// Switch a builder row to a mode (from its select or from a text
// re-classification). When the switch comes from the user, the field
// text is rewritten canonically for that mode at once.
function applyMode(fieldIndex, mode, fromUser) {
  const state = builder[fieldIndex];
  const def = state.def;
  const field = currentParsed ? currentParsed.fields[fieldIndex] : null;
  state.modeSelect.value = mode;
  if (mode === "every") {
    state.shape = { mode };
    state.currentSet = new Set(fieldValues(def));
    buildControls(state);
    if (fromUser) writeField(fieldIndex, "*");
  } else if (mode === "values") {
    state.shape = { mode };
    state.currentSet = new Set(field ? field.set : [def.min]);
    buildControls(state);
    if (fromUser) writeField(fieldIndex, canonicalFromValues(state.currentSet, def));
  } else if (mode === "range") {
    const a = field && classifyShapeSafe(field)?.mode === "range" ? classifyShapeSafe(field).a : def.min;
    const b = field && classifyShapeSafe(field)?.mode === "range" ? classifyShapeSafe(field).b : Math.min(def.min + 1, def.max);
    state.shape = { mode, a, b };
    buildControls(state);
    if (fromUser) writeField(fieldIndex, canonicalFromRange(a, b, def));
  } else if (mode === "step") {
    const shape = field ? classifyShapeSafe(field) : null;
    state.shape = shape && shape.mode === "step"
      ? { mode, base: shape.base, step: shape.step }
      : { mode, base: { type: "star" }, step: def.key === "minute" || def.key === "hour" ? 15 : 2 };
    buildControls(state);
    if (fromUser) writeField(fieldIndex, canonicalFromStep(state.shape.base, state.shape.step, def));
  } else {
    state.shape = { mode: "custom" };
    buildControls(state);
  }
}

function classifyShapeSafe(field) {
  return classifyShape(field);
}

// Reflect a fresh parse in the builder rows (text -> builder sync).
function syncBuilder(parsed) {
  parsed.fields.forEach((field, i) => {
    const state = builder[i];
    const shape = classifyShape(field);
    state.currentSet = new Set(field.set);
    state.modeSelect.value = shape.mode;
    state.shape = shape.mode === "range"
      ? { mode: "range", a: shape.a, b: shape.b }
      : shape.mode === "step"
        ? { mode: "step", base: shape.base, step: shape.step }
        : { mode: shape.mode };
    buildControls(state);
  });
}

// Replace one field's text with a builder-written canonical form and
// re-run (builder -> text sync). Other fields are never altered.
function writeField(fieldIndex, fieldText) {
  const parts = expressionInput.value.trim().split(/[ \t]+/);
  while (parts.length < 5) parts.push("*");
  parts[fieldIndex] = fieldText;
  syncingFromBuilder = true;
  expressionInput.value = parts.join(" ");
  refresh();
  syncingFromBuilder = false;
}

// ---------- Evaluation ----------

function clearResults() {
  fieldLines.replaceChildren();
  scheduleLine.textContent = "";
  runsBody.replaceChildren();
  runsHeading.textContent = "";
  runsNote.textContent = "";
}

function refresh() {
  const raw = expressionInput.value;
  let parsed;
  try {
    parsed = parseExpression(raw);
  } catch (error) {
    currentParsed = null;
    expressionError.textContent = errorMessage(LANG, error);
    expressionError.hidden = false;
    clearResults(); // SPEC section 3: no stale results under an error
    return;
  }
  expressionError.textContent = "";
  expressionError.hidden = true;
  currentParsed = parsed;
  // Macros expand visibly as soon as they are entered (SPEC section 4).
  if (parsed.macro && expressionInput.value.trim() !== parsed.text) {
    expressionInput.value = parsed.text;
  }
  const start = startInput.value ? new Date(startInput.value) : new Date();
  const { runs, exhausted } = nextRuns(parsed, start, 10);
  const model = buildExplanation(parsed, {
    neverFires: runs.length === 0 && exhausted,
  });
  const rendered = renderExplanation(LANG, model);
  const items = rendered.lines.map((line) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = line.label + (LANG === "en" ? ": " : "：");
    item.append(strong, document.createTextNode(line.phrase));
    return item;
  });
  fieldLines.replaceChildren(...items);
  scheduleLine.textContent = rendered.schedule;
  runsHeading.textContent = t("RUNS_FROM", {
    start: fmtDateTime(start),
    zone: timezoneName(),
  });
  const rows = runs.map((run) => {
    const tr = document.createElement("tr");
    const cells = [
      `${run.getFullYear()}-${pad(run.getMonth() + 1)}-${pad(run.getDate())}`,
      DICT.dowNames[run.getDay()],
      `${pad(run.getHours())}:${pad(run.getMinutes())}`,
    ];
    for (const cell of cells) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.append(td);
    }
    return tr;
  });
  runsBody.replaceChildren(...rows);
  runsNote.textContent = exhausted ? t("NEVER_RUNS_NOTE") : "";
  if (!syncingFromBuilder) syncBuilder(parsed);
}

function scheduleRefresh() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(refresh, 150); // SPEC 3: <= 200 ms
}

expressionInput.addEventListener("input", scheduleRefresh);
startInput.addEventListener("change", refresh);
$("start-reset").addEventListener("click", () => {
  startInput.value = "";
  refresh();
});

// Initial state (SPEC section 3): the bundled example is real input,
// already run.
refresh();
