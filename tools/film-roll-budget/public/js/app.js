// DOM controller for Film Roll Frame Budget. All user text is rendered
// with textContent / value only; never inserted as HTML. The pure core
// (validate, solve, flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw number syntax
// (SYNTAX) and name rules in field order, then core validate() runs for
// shape, duplicates and cross-field ORDER. A valid draft is solved in
// the next event-loop work item (setTimeout(0), per the SPEC); the flow
// controller settles only when the runId still matches and the phase is
// still busy, so late or cancelled replies are ignored. Cancelling or
// editing clears the scheduled work item.

import { validate, normalizeName, MAX_SCENES } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor, formatNumber } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// film-roll-budget.priority-rounds.
const SAMPLE = {
  remaining: 24,
  reserve: 4,
  scenes: [
    { name: "A", min: 3, wanted: 10, priority: 3 },
    { name: "B", min: 2, wanted: 8, priority: 3 },
    { name: "C", min: 4, wanted: 10, priority: 2 },
  ],
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let scheduled = null;
let lastDraft = null; // last validated draft (may be stale after edits)
let lastValidData = null; // validated snapshot behind the shown result

const $ = (id) => document.getElementById(id);

let remainingInput;
let reserveInput;
let scenesBody;
let statusEl;
let resultsEl;
let errorListEl;
let arrangeButton;
let cancelButton;
let clearButton;
let sampleButton;
let addSceneButton;

let rowCounter = 0;

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function text(tag, value, className) {
  const node = el(tag, className);
  node.textContent = value;
  return node;
}

function labelFor(inputId, value) {
  const label = el("label");
  label.htmlFor = inputId;
  label.textContent = value;
  return label;
}

function clearScheduled() {
  if (scheduled !== null) {
    clearTimeout(scheduled);
    scheduled = null;
  }
}

function makeSceneRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "scene";

  const nameId = `s${id}-name`;
  const minId = `s${id}-min`;
  const wantedId = `s${id}-wanted`;
  const priorityId = `s${id}-priority`;

  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = values ? values.name : "";
  nameWrap.append(labelFor(nameId, strings.sceneNameLabel), nameInput);

  const minWrap = el("div", "field field-narrow");
  const minInput = document.createElement("input");
  minInput.type = "text";
  minInput.id = minId;
  minInput.inputMode = "numeric";
  minInput.maxLength = 12;
  minInput.autocomplete = "off";
  minInput.value = values ? String(values.min) : "";
  minWrap.append(labelFor(minId, strings.minLabel), minInput);

  const wantedWrap = el("div", "field field-narrow");
  const wantedInput = document.createElement("input");
  wantedInput.type = "text";
  wantedInput.id = wantedId;
  wantedInput.inputMode = "numeric";
  wantedInput.maxLength = 12;
  wantedInput.autocomplete = "off";
  wantedInput.value = values ? String(values.wanted) : "";
  wantedWrap.append(labelFor(wantedId, strings.wantedLabel), wantedInput);

  const priorityWrap = el("div", "field");
  const prioritySelect = document.createElement("select");
  prioritySelect.id = priorityId;
  for (const value of [3, 2, 1]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value} — ${strings.priorityNames[value]}`;
    prioritySelect.append(option);
  }
  prioritySelect.value = values ? String(values.priority) : "2";
  priorityWrap.append(labelFor(priorityId, strings.priorityLabel), prioritySelect);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (scenesBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
  });

  row.append(nameWrap, minWrap, wantedWrap, priorityWrap, removeButton);
  row._controls = {
    nameInput,
    minInput,
    wantedInput,
    prioritySelect,
    removeButton,
  };
  return row;
}

function refreshRowButtons() {
  for (const row of scenesBody.children) {
    row._controls.removeButton.disabled = scenesBody.childElementCount <= 1;
  }
  addSceneButton.disabled = scenesBody.childElementCount >= MAX_SCENES;
}

// Builds the core data object from the form, in field order. Returns
// {data} or {fieldError:{code,path}} for the first raw-syntax / name
// problem, mirroring the core's field order so the first reported error
// is the same one solve() would report.
function buildDraft() {
  const remainingRaw = remainingInput.value;
  if (!INTEGER_SYNTAX.test(remainingRaw)) {
    return { fieldError: { code: "SYNTAX", path: "/remaining" } };
  }
  const reserveRaw = reserveInput.value;
  if (!INTEGER_SYNTAX.test(reserveRaw)) {
    return { fieldError: { code: "SYNTAX", path: "/reserve" } };
  }
  const scenes = [];
  const rows = [...scenesBody.children];
  for (let i = 0; i < rows.length; i += 1) {
    const c = rows[i]._controls;
    const base = `/scenes/${i}`;
    const name = normalizeName(c.nameInput.value);
    if (!name.ok) return { fieldError: { code: name.code, path: `${base}/name` } };
    if (!INTEGER_SYNTAX.test(c.minInput.value)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/min` } };
    }
    if (!INTEGER_SYNTAX.test(c.wantedInput.value)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/wanted` } };
    }
    scenes.push({
      name: name.name,
      min: Number(c.minInput.value),
      wanted: Number(c.wantedInput.value),
      priority: Number(c.prioritySelect.value),
    });
  }
  return {
    data: {
      remaining: Number(remainingRaw),
      reserve: Number(reserveRaw),
      scenes,
    },
  };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  if (path === "/remaining") return remainingInput;
  if (path === "/reserve") return reserveInput;
  if (path === "/scenes") return scenesBody.querySelector("input");
  const match = /^\/scenes\/(\d+)\/(name|min|wanted|priority)$/.exec(path);
  if (!match) return null;
  const [, indexText, field] = match;
  const row = [...scenesBody.children][Number(indexText)];
  if (!row) return null;
  const c = row._controls;
  if (field === "name") return c.nameInput;
  if (field === "min") return c.minInput;
  if (field === "wanted") return c.wantedInput;
  return c.prioritySelect;
}

// ---- rendering ----------------------------------------------------------

function clearMarks() {
  for (const input of document.querySelectorAll("[aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
  }
  errorListEl.textContent = "";
  errorListEl.hidden = true;
}

function showError(error) {
  const message = strings.errors[error.code] || strings.errors.TYPE;
  const item = el("div", "error-item");
  const head = el("p");
  const codeEl = text("code", error.code);
  head.append(
    codeEl,
    document.createTextNode(` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})`),
  );
  const fix = text("p", `${strings.errorFix}：${message}`);
  const goButton = el("button", "error-goto");
  goButton.type = "button";
  goButton.textContent = strings.errorGoTo;
  const target = fieldForPath(error.path);
  if (target) {
    target.setAttribute("aria-invalid", "true");
    goButton.addEventListener("click", () => target.focus());
  } else {
    goButton.disabled = true;
  }
  item.append(head, fix, goButton);
  errorListEl.append(item);
  errorListEl.hidden = false;
  if (target) target.focus();
}

function totalsLine(result) {
  const plannedSum = result.rows.reduce((sum, row) => sum + row.planned, 0);
  const line = el("p", "totals");
  const lang = document.documentElement.lang || "en";
  line.textContent = strings.totalsLine
    .replace("{planned}", formatNumber(plannedSum, lang))
    .replace("{reserve}", formatNumber(lastValidData.reserve, lang))
    .replace("{spare}", formatNumber(result.spare, lang))
    .replace("{remaining}", formatNumber(lastValidData.remaining, lang));
  return line;
}

function renderResults(result) {
  const lang = document.documentElement.lang || "en";
  if (result.deficit > 0) {
    statusEl.textContent = strings.statusReadyDeficit;
    const notice = el("div", "notice");
    notice.append(text("h2", strings.deficitHeading));
    const minSum = result.available + result.deficit;
    notice.append(
      text(
        "p",
        strings.deficitBody
          .replace("{minSum}", formatNumber(minSum, lang))
          .replace("{available}", formatNumber(result.available, lang))
          .replace("{deficit}", formatNumber(result.deficit, lang)),
      ),
    );
    const facts = el("ul", "result-facts");
    facts.append(
      text(
        "li",
        `${strings.availableLabel}：${formatNumber(result.available, lang)} ${strings.framesUnit}`,
      ),
    );
    facts.append(
      text(
        "li",
        `${strings.deficitLabel}：${formatNumber(result.deficit, lang)} ${strings.framesUnit}`,
      ),
    );
    notice.append(facts);
    resultsEl.append(notice);
    return;
  }

  statusEl.textContent = strings.statusReady;
  const heading = text("h2", strings.resultHeading);
  resultsEl.append(heading);
  const table = el("table", "result-table");
  const thead = document.createElement("thead");
  const headRow = el("tr");
  headRow.append(
    text("th", strings.colScene),
    text("th", strings.colPlanned),
    text("th", strings.colUnmet),
  );
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  for (const row of result.rows) {
    const tr = el("tr");
    tr.append(
      text("td", row.name),
      text("td", formatNumber(row.planned, lang)),
      text("td", formatNumber(row.unmet, lang)),
    );
    tbody.append(tr);
  }
  table.append(thead, tbody);
  resultsEl.append(table);
  resultsEl.append(
    text(
      "p",
      `${strings.availableLabel}：${formatNumber(result.available, lang)} ${strings.framesUnit} · ${strings.reserveSummaryLabel}：${formatNumber(lastValidData.reserve, lang)} ${strings.framesUnit} · ${strings.spareLabel}：${formatNumber(result.spare, lang)} ${strings.framesUnit}`,
      "totals",
    ),
  );
  resultsEl.append(totalsLine(result));
  resultsEl.append(text("p", strings.unmetNote, "muted"));
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  arrangeButton.disabled = phase === "busy";
  arrangeButton.textContent =
    phase === "busy" ? `${strings.working}…` : strings.arrange;
  cancelButton.hidden = phase !== "busy";

  if (phase === "empty") {
    statusEl.textContent = strings.statusEmpty;
    return;
  }
  if (phase === "dirty") {
    statusEl.textContent = strings.statusDirty;
    return;
  }
  if (phase === "busy") {
    statusEl.textContent = strings.statusBusy;
    return;
  }
  if (phase === "error") {
    statusEl.textContent = strings.statusError;
    if (error) showError(error);
    return;
  }
  // ready
  if (result === null) {
    statusEl.textContent = strings.statusEmpty;
    return;
  }
  renderResults(result);
}

// ---- actions ------------------------------------------------------------

function onEdit() {
  // Every edit clears the old result and invalidates the active runId,
  // and revokes the scheduled next-event-loop work item.
  if (flow.snapshot().phase === "busy") {
    clearScheduled();
    activeRunId = null;
    flow.cancel();
  }
  flow.edit(lastDraft);
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraft();
  if (built.fieldError) {
    // Form-level error: enter the error phase, keep the draft, focus
    // the first invalid field (render/showError does the focusing).
    flow.fail(built.fieldError);
    render();
    return;
  }
  const checked = validate(built.data);
  if (!checked.ok) {
    lastDraft = built.data;
    flow.edit(built.data);
    flow.fail(checked.reply.error);
    render();
    return;
  }
  lastDraft = checked.data;
  lastValidData = checked.data;
  flow.edit(checked.data);
  runCounter += 1;
  activeRunId = runCounter;
  flow.run(activeRunId);
  render();
  // Pure core runs in the next event-loop work item (SPEC). The flow
  // settles only for the matching runId while still busy.
  const id = activeRunId;
  scheduled = setTimeout(() => {
    scheduled = null;
    flow.settle(id);
    activeRunId = null;
    render();
  }, 0);
}

function onCancel() {
  if (flow.snapshot().phase !== "busy") return;
  clearScheduled();
  activeRunId = null;
  flow.cancel();
  render();
}

function onClear() {
  clearScheduled();
  activeRunId = null;
  lastDraft = null;
  lastValidData = null;
  remainingInput.value = "";
  reserveInput.value = "0";
  scenesBody.textContent = "";
  scenesBody.append(makeSceneRow());
  flow.reset();
  refreshRowButtons();
  render();
  remainingInput.focus();
}

function onLoadSample() {
  clearScheduled();
  activeRunId = null;
  remainingInput.value = String(SAMPLE.remaining);
  reserveInput.value = String(SAMPLE.reserve);
  scenesBody.textContent = "";
  for (const scene of SAMPLE.scenes) scenesBody.append(makeSceneRow(scene));
  lastDraft = SAMPLE;
  flow.edit(SAMPLE);
  refreshRowButtons();
  render();
}

// ---- init ---------------------------------------------------------------

function init() {
  remainingInput = $("remaining");
  reserveInput = $("reserve");
  scenesBody = $("scenes-body");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  arrangeButton = $("allocate");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  addSceneButton = $("add-scene");

  scenesBody.append(makeSceneRow());
  refreshRowButtons();

  const form = $("budget-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", onEdit);
  form.addEventListener("change", onEdit);
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addSceneButton.addEventListener("click", () => {
    if (scenesBody.childElementCount >= MAX_SCENES) return;
    scenesBody.append(makeSceneRow());
    onEdit();
    refreshRowButtons();
  });

  // Leaving the page (including a bfcache restore) clears working memory.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) onClear();
  });

  render();
}

try {
  init();
} catch {
  const status = $("status");
  if (status) status.textContent = strings.initFailed;
  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.textContent = strings.reload;
  reloadButton.addEventListener("click", () => window.location.reload());
  if (status && status.parentNode) status.parentNode.append(reloadButton);
}
