// DOM controller for Bead String Pattern. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core (solve,
// flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw number syntax
// (SYNTAX) and name/range rules in row order, then core validate() runs
// for duplicates and references. A valid draft is sent to the module
// worker; the flow controller settles only when the runId still matches
// and the phase is still busy, so late or cancelled replies are ignored.
// If the worker cannot start, the same solve runs synchronously in-page
// (same result) and a note is shown once.

import { validate, normalizeName, MAX_COLORS, MAX_MOTIF } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// bead-string-pattern.mirrored.
const SAMPLE = {
  colors: [
    { name: "R", stock: 2 },
    { name: "G", stock: 1 },
    { name: "B", stock: 2 },
    { name: "K", stock: 2 },
  ],
  motif: ["R", "G", "B"],
  repeats: 2,
  mode: "alternate",
  head: "K",
  tail: "K",
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let lastDraft = null; // last built draft (may be stale after edits)
let lastValidData = null; // validated snapshot behind the shown result
let worker = null;
let workerUsable = false;
let fallbackNoted = false;

const $ = (id) => document.getElementById(id);

let colorsBody;
let motifBody;
let repeatsInput;
let headSelect;
let tailSelect;
let statusEl;
let resultsEl;
let errorListEl;
let arrangeButton;
let cancelButton;
let clearButton;
let sampleButton;
let addColorButton;
let addBeadButton;
let fallbackNoteEl;

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

function fill(template, values) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

// ---- row construction -------------------------------------------------

function makeColorRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "color";

  const nameId = `c${id}-name`;
  const stockId = `c${id}-stock`;

  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = values ? values.name : "";
  nameWrap.append(labelFor(nameId, strings.colorNameLabel), nameInput);

  const stockWrap = el("div", "field field-narrow");
  const stockInput = document.createElement("input");
  stockInput.type = "text";
  stockInput.id = stockId;
  stockInput.inputMode = "numeric";
  stockInput.maxLength = 12;
  stockInput.autocomplete = "off";
  stockInput.value = values ? String(values.stock) : "";
  stockWrap.append(labelFor(stockId, strings.stockLabel), stockInput);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (colorsBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
    refreshColorOptions();
  });

  row.append(nameWrap, stockWrap, removeButton);
  row._controls = { nameInput, stockInput, removeButton };
  return row;
}

function makeMotifRow(value) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "motif";

  const selectId = `m${id}-color`;
  const selectWrap = el("div", "field");
  const select = document.createElement("select");
  select.id = selectId;
  selectWrap.append(labelFor(selectId, ""), select);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (motifBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
    refreshMotifLabels();
  });

  row.append(selectWrap, removeButton);
  row._controls = { select, removeButton, label: selectWrap.querySelector("label") };
  return row;
}

function refreshRowButtons() {
  for (const row of colorsBody.children) {
    row._controls.removeButton.disabled = colorsBody.childElementCount <= 1;
  }
  for (const row of motifBody.children) {
    row._controls.removeButton.disabled = motifBody.childElementCount <= 1;
  }
  addColorButton.disabled = colorsBody.childElementCount >= MAX_COLORS;
  addBeadButton.disabled = motifBody.childElementCount >= MAX_MOTIF;
}

function refreshMotifLabels() {
  let n = 0;
  for (const row of motifBody.children) {
    n += 1;
    row._controls.label.textContent = fill(strings.motifPositionLabel, { n });
  }
}

// Current colour names, normalized when valid, in row order.
function currentColorNames() {
  const names = [];
  for (const row of colorsBody.children) {
    const checked = normalizeName(row._controls.nameInput.value);
    if (checked.ok) names.push(checked.name);
  }
  return names;
}

// Rebuild every colour select from the current colour names. A selected
// value that no longer matches a colour name is kept as an extra option
// so the choice is preserved and core validation can report REF for it.
function rebuildSelect(select, names, noneLabel) {
  const current = select.value;
  select.textContent = "";
  if (noneLabel !== null) {
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = noneLabel;
    select.append(noneOption);
  } else {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "—";
    select.append(emptyOption);
  }
  const seen = new Set([""]);
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.append(option);
  }
  if (current !== "" && !seen.has(current)) {
    const stale = document.createElement("option");
    stale.value = current;
    stale.textContent = current;
    select.append(stale);
  }
  select.value = current;
}

function refreshColorOptions() {
  const names = currentColorNames();
  for (const row of motifBody.children) {
    rebuildSelect(row._controls.select, names, null);
  }
  rebuildSelect(headSelect, names, strings.endNone);
  rebuildSelect(tailSelect, names, strings.endNone);
}

// ---- draft building ---------------------------------------------------

function isBlankColorRow(row) {
  const c = row._controls;
  return c.nameInput.value === "" && c.stockInput.value === "";
}

// Builds the core data object from the form, in row order. Returns
// {data} or {fieldError:{code,path}} for the first raw-syntax /
// name / range problem, mirroring the core's field order so the first
// reported error is the same one solve() would report. Duplicates and
// references are left to core validate().
function buildDraft() {
  const colors = [];
  const colorRows = [...colorsBody.children].filter(
    (row) => !isBlankColorRow(row),
  );
  for (let i = 0; i < colorRows.length; i += 1) {
    const c = colorRows[i]._controls;
    const base = `/colors/${i}`;
    const name = normalizeName(c.nameInput.value);
    if (!name.ok) return { fieldError: { code: name.code, path: `${base}/name` } };
    const rawStock = c.stockInput.value;
    if (!INTEGER_SYNTAX.test(rawStock)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/stock` } };
    }
    const stock = Number(rawStock);
    if (stock < 0 || stock > 1000) {
      return { fieldError: { code: "RANGE", path: `${base}/stock` } };
    }
    colors.push({ name: name.name, stock });
  }

  const motif = [];
  const motifRows = [...motifBody.children];
  for (let i = 0; i < motifRows.length; i += 1) {
    const value = motifRows[i]._controls.select.value;
    if (value === "") {
      return { fieldError: { code: "RANGE", path: `/motif/${i}` } };
    }
    const name = normalizeName(value);
    if (!name.ok) {
      return { fieldError: { code: name.code, path: `/motif/${i}` } };
    }
    motif.push(name.name);
  }

  const rawRepeats = repeatsInput.value;
  if (!INTEGER_SYNTAX.test(rawRepeats)) {
    return { fieldError: { code: "SYNTAX", path: "/repeats" } };
  }
  const repeats = Number(rawRepeats);
  if (repeats < 1 || repeats > 32) {
    return { fieldError: { code: "RANGE", path: "/repeats" } };
  }

  const mode = document.querySelector("input[name='mode']:checked");
  const modeValue = mode ? mode.value : "repeat";

  let head = null;
  if (headSelect.value !== "") {
    const name = normalizeName(headSelect.value);
    if (!name.ok) return { fieldError: { code: name.code, path: "/head" } };
    head = name.name;
  }
  let tail = null;
  if (tailSelect.value !== "") {
    const name = normalizeName(tailSelect.value);
    if (!name.ok) return { fieldError: { code: name.code, path: "/tail" } };
    tail = name.name;
  }

  return { data: { colors, motif, repeats, mode: modeValue, head, tail } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  const colorMatch = /^\/colors\/(\d+)\/(name|stock)$/.exec(path);
  if (colorMatch) {
    const rows = [...colorsBody.children].filter((row) => !isBlankColorRow(row));
    const row = rows[Number(colorMatch[1])];
    if (!row) return null;
    return colorMatch[2] === "name"
      ? row._controls.nameInput
      : row._controls.stockInput;
  }
  const motifMatch = /^\/motif\/(\d+)$/.exec(path);
  if (motifMatch) {
    const row = [...motifBody.children][Number(motifMatch[1])];
    return row ? row._controls.select : null;
  }
  if (path === "/colors") return colorsBody.querySelector("input");
  if (path === "/motif") return motifBody.querySelector("select");
  if (path === "/repeats") return repeatsInput;
  if (path === "/head") return headSelect;
  if (path === "/tail") return tailSelect;
  return null;
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
  head.append(codeEl, document.createTextNode(` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})`));
  const fix = text("p", `${strings.errorFix}：${message}`);
  const goButton = el("button", "error-goto");
  goButton.type = "button";
  goButton.textContent = strings.errorFix;
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
  statusEl.textContent =
    result.firstMissing === null ? strings.statusReady : strings.statusReadyMissing;

  resultsEl.append(text("h2", strings.resultHeading));
  const strip = el("ol", "bead-strip");
  for (const position of result.positions) {
    const item = el("li", position.available ? "bead ok" : "bead missing");
    const label = text(
      "span",
      fill(strings.positionLabel, { n: position.index }),
      "bead-index",
    );
    const name = text("span", position.name, "bead-name");
    const state = text(
      "span",
      position.available ? strings.availableLabel : strings.missingLabel,
      "bead-state",
    );
    item.append(label, name, state);
    strip.append(item);
  }
  resultsEl.append(strip);

  const first = el("p", "first-missing");
  if (result.firstMissing === null) {
    first.textContent = `${strings.firstMissingLabel}：${strings.firstMissingNone}`;
  } else {
    const missingPosition = result.positions[result.firstMissing - 1];
    const missingRow = result.colors.find(
      (row) => row.name === missingPosition.name,
    );
    first.textContent = `${strings.firstMissingLabel}：${fill(strings.firstMissingAt, {
      n: result.firstMissing,
      name: missingPosition.name,
      count: missingRow ? missingRow.missing : 0,
    })}`;
  }
  resultsEl.append(first);

  resultsEl.append(text("h2", strings.colorsHeadingResult));
  const table = el("table", "usage-table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const heading of [
    strings.colColor,
    strings.colNeeded,
    strings.colMissing,
    strings.colRemaining,
  ]) {
    headRow.append(text("th", heading));
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = el("tbody");
  for (const row of result.colors) {
    const tr = el("tr");
    tr.append(text("td", row.name));
    tr.append(text("td", `${row.needed} ${strings.unitBead}`));
    const missingCell = text(
      "td",
      row.missing > 0
        ? `${row.missing} ${strings.unitBead}（${fill(strings.needMore, { count: row.missing })}）`
        : `0 ${strings.unitBead}`,
    );
    if (row.missing > 0) missingCell.className = "missing";
    tr.append(missingCell);
    tr.append(text("td", `${row.remaining} ${strings.unitBead}`));
    tbody.append(tr);
  }
  table.append(tbody);
  resultsEl.append(table);
}

// ---- actions ------------------------------------------------------------

function onEdit() {
  // Every edit clears the old result and invalidates the active runId.
  if (flow.snapshot().phase === "busy") {
    if (workerUsable && worker) {
      worker.postMessage({ type: "cancel", runId: activeRunId });
    }
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
  if (workerUsable && worker) {
    worker.postMessage({ type: "run", runId: activeRunId, data: checked.data });
  } else {
    // Synchronous fallback: same solve, same runId guard.
    if (!fallbackNoted) {
      fallbackNoted = true;
      fallbackNoteEl.textContent = strings.workerFallback;
      fallbackNoteEl.hidden = false;
    }
    flow.settle(activeRunId);
    activeRunId = null;
    render();
  }
}

function onCancel() {
  if (flow.snapshot().phase !== "busy") return;
  if (workerUsable && worker) {
    worker.postMessage({ type: "cancel", runId: activeRunId });
  }
  activeRunId = null;
  flow.cancel();
  render();
}

function onClear() {
  if (flow.snapshot().phase === "busy") {
    if (workerUsable && worker) {
      worker.postMessage({ type: "cancel", runId: activeRunId });
    }
    activeRunId = null;
  }
  lastDraft = null;
  lastValidData = null;
  colorsBody.textContent = "";
  motifBody.textContent = "";
  colorsBody.append(makeColorRow());
  motifBody.append(makeMotifRow());
  repeatsInput.value = "1";
  document.querySelector("input[name='mode'][value='repeat']").checked = true;
  refreshRowButtons();
  refreshMotifLabels();
  refreshColorOptions();
  flow.reset();
  render();
  const first = colorsBody.querySelector("input");
  if (first) first.focus();
}

function onLoadSample() {
  if (flow.snapshot().phase === "busy") {
    if (workerUsable && worker) {
      worker.postMessage({ type: "cancel", runId: activeRunId });
    }
    activeRunId = null;
    flow.cancel();
  }
  colorsBody.textContent = "";
  motifBody.textContent = "";
  for (const color of SAMPLE.colors) colorsBody.append(makeColorRow(color));
  for (const bead of SAMPLE.motif) motifBody.append(makeMotifRow(bead));
  repeatsInput.value = String(SAMPLE.repeats);
  document.querySelector(
    `input[name='mode'][value='${SAMPLE.mode}']`,
  ).checked = true;
  lastDraft = SAMPLE;
  refreshRowButtons();
  refreshMotifLabels();
  refreshColorOptions();
  [...motifBody.children].forEach((row, i) => {
    row._controls.select.value = SAMPLE.motif[i];
  });
  headSelect.value = SAMPLE.head;
  tailSelect.value = SAMPLE.tail;
  flow.edit(SAMPLE);
  render();
}

function startWorker() {
  try {
    worker = new Worker(new URL("./worker.mjs", import.meta.url), {
      type: "module",
    });
  } catch {
    worker = null;
    workerUsable = false;
    return;
  }
  workerUsable = true;
  worker.addEventListener("message", (event) => {
    const message = event.data;
    if (message === null || typeof message !== "object") return;
    if (message.type === "cancelled") return; // cancel already applied locally
    if (message.type !== "done") return;
    // settleWith ignores stale runIds and non-busy phases.
    flow.settleWith(message.runId, message.reply);
    activeRunId = null;
    render();
  });
  worker.addEventListener("error", () => {
    // A worker that fails mid-run falls back to synchronous solving for
    // the next run; an in-flight run is settled locally.
    workerUsable = false;
    if (flow.snapshot().phase === "busy" && activeRunId !== null) {
      flow.settle(activeRunId);
      activeRunId = null;
      render();
    }
  });
}

// ---- init ---------------------------------------------------------------

function init() {
  colorsBody = $("colors-body");
  motifBody = $("motif-body");
  repeatsInput = $("repeats");
  headSelect = $("head");
  tailSelect = $("tail");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  arrangeButton = $("arrange");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  addColorButton = $("add-color");
  addBeadButton = $("add-bead");
  fallbackNoteEl = $("worker-fallback");

  colorsBody.append(makeColorRow());
  motifBody.append(makeMotifRow());
  refreshRowButtons();
  refreshMotifLabels();
  refreshColorOptions();

  const form = $("bead-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", (event) => {
    if (
      event.target.matches("input[type='text']") &&
      event.target.closest("#colors-body")
    ) {
      refreshColorOptions();
    }
    onEdit();
  });
  form.addEventListener("change", (event) => {
    if (event.target.matches("select, input[type='radio']")) onEdit();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addColorButton.addEventListener("click", () => {
    if (colorsBody.childElementCount >= MAX_COLORS) return;
    colorsBody.append(makeColorRow());
    onEdit();
    refreshRowButtons();
    refreshColorOptions();
  });
  addBeadButton.addEventListener("click", () => {
    if (motifBody.childElementCount >= MAX_MOTIF) return;
    motifBody.append(makeMotifRow());
    onEdit();
    refreshRowButtons();
    refreshMotifLabels();
    refreshColorOptions();
  });

  // Leaving the page (including a bfcache restore) clears working memory.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) onClear();
  });

  startWorker();
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
