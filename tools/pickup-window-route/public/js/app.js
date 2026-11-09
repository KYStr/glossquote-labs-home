// DOM controller for Pickup Window Route. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core
// (validate, flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw text syntax
// (SYNTAX) and then core validate() runs for the remaining rules. A
// valid draft is sent to the module worker; the flow controller settles
// only when the runId still matches and the phase is still busy, so
// late or cancelled replies are ignored. If the worker cannot start,
// the same solve runs synchronously in-page (same result) and a note
// is shown once.
//
// The travel matrix is kept in matrixValues (null = no direct route,
// a number = minutes, undefined = blank) so stop add/remove/name edits
// preserve entered legs. A source select filters matrix rows on narrow
// screens, per SPEC.md userFlow.

import { validate } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// pickup-window-route.only-order.
const SAMPLE = {
  start: 480,
  deadline: 600,
  stops: [
    { name: "A", open: 500, close: 540, service: 10 },
    { name: "B", open: 480, close: 520, service: 5 },
  ],
  travel: [
    [0, 20, 10],
    [15, 0, 15],
    [20, 10, 0],
  ],
};

const MAX_STOPS = 8;
const TIME_RE = /^([0-9]{1,2}):([0-9]{2})$/;
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "zh-Hant");
let runCounter = 0;
let activeRunId = null;
let lastDraft = null; // last built draft (may be stale after edits)
let lastValidData = null; // validated snapshot behind the shown result
let worker = null;
let workerUsable = false;
let fallbackNoted = false;

// matrixValues[i][j]: null = no direct route, number = minutes,
// undefined = blank. Index 0 is the departure point, 1..n the stops.
let matrixValues = [
  [0, undefined],
  [undefined, 0],
];

const $ = (id) => document.getElementById(id);

let startInput;
let deadlineInput;
let stopsBody;
let matrixSourceSelect;
let matrixTable;
let matrixWrap;
let addStopButton;
let statusEl;
let resultsEl;
let errorListEl;
let findButton;
let cancelButton;
let clearButton;
let sampleButton;
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

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Parse HH:MM strictly. 24:00 is only allowed when allow240 is true
// (deadline / close); otherwise the hour must be 0-23.
function parseTime(value, allow240) {
  const match = TIME_RE.exec(value);
  if (match === null) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (m > 59) return null;
  if (h === 24) return allow240 && m === 0 ? 1440 : null;
  if (h > 23) return null;
  return h * 60 + m;
}

function parseIntField(value) {
  if (!INTEGER_RE.test(value)) return null;
  return Number(value);
}

// ---- stop rows ----------------------------------------------------------

function stopCount() {
  return stopsBody.childElementCount;
}

function makeStopRow(values) {
  const index = rowCounter;
  rowCounter += 1;
  const row = el("div", "stop-row");
  row.dataset.kind = "stop";

  const nameId = `s${index}-name`;
  const openId = `s${index}-open`;
  const closeId = `s${index}-close`;
  const serviceId = `s${index}-service`;

  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = values ? values.name : "";
  nameWrap.append(labelFor(nameId, strings.nameLabel), nameInput);

  const openWrap = el("div", "field field-time");
  const openInput = document.createElement("input");
  openInput.type = "text";
  openInput.id = openId;
  openInput.maxLength = 5;
  openInput.inputMode = "numeric";
  openInput.autocomplete = "off";
  openInput.placeholder = "HH:MM";
  openInput.value = values ? formatMinutes(values.open) : "";
  openWrap.append(labelFor(openId, strings.openLabel), openInput);

  const closeWrap = el("div", "field field-time");
  const closeInput = document.createElement("input");
  closeInput.type = "text";
  closeInput.id = closeId;
  closeInput.maxLength = 5;
  closeInput.inputMode = "numeric";
  closeInput.autocomplete = "off";
  closeInput.placeholder = "HH:MM";
  closeInput.value = values ? formatMinutes(values.close) : "";
  closeWrap.append(labelFor(closeId, strings.closeLabel), closeInput);

  const serviceWrap = el("div", "field field-narrow");
  const serviceInput = document.createElement("input");
  serviceInput.type = "text";
  serviceInput.id = serviceId;
  serviceInput.maxLength = 12;
  serviceInput.inputMode = "numeric";
  serviceInput.autocomplete = "off";
  serviceInput.value = values ? String(values.service) : "";
  serviceWrap.append(labelFor(serviceId, strings.serviceLabel), serviceInput);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (stopCount() <= 1) return;
    row.remove();
    resizeMatrix();
    onEdit();
    refreshStopButtons();
  });

  row.append(nameWrap, openWrap, closeWrap, serviceWrap, removeButton);
  row._controls = { nameInput, openInput, closeInput, serviceInput, removeButton };
  return row;
}

function refreshStopButtons() {
  for (const row of stopsBody.children) {
    row._controls.removeButton.disabled = stopCount() <= 1;
  }
  addStopButton.disabled = stopCount() >= MAX_STOPS;
}

// ---- travel matrix ------------------------------------------------------

function stopLabel(index, name) {
  // index 0 is the departure point; stops are 1..n in matrix order.
  if (index === 0) return `0 ${strings.depotLabel}`;
  return name ? `${index} ${name}` : `${index}`;
}

function currentStopNames() {
  const names = [];
  for (const row of stopsBody.children) {
    names.push(row._controls.nameInput.value);
  }
  return names;
}

// Resize matrixValues to (n+1) x (n+1), preserving legs by index, then
// re-render the matrix table and the source select.
function resizeMatrix() {
  const n = stopCount();
  const next = [];
  for (let i = 0; i <= n; i += 1) {
    const row = [];
    for (let j = 0; j <= n; j += 1) {
      if (i === j) row.push(0);
      else if (i < matrixValues.length && j < matrixValues[i].length) {
        row.push(matrixValues[i][j]);
      } else {
        row.push(undefined);
      }
    }
    next.push(row);
  }
  matrixValues = next;
  renderMatrix();
}

function renderMatrix() {
  const n = stopCount();
  const names = currentStopNames();
  matrixTable.textContent = "";

  const thead = el("thead");
  const headRow = el("tr");
  const corner = text("th", strings.matrixSourceLabel);
  corner.setAttribute("scope", "col");
  headRow.append(corner);
  for (let j = 0; j <= n; j += 1) {
    const th = text("th", stopLabel(j, names[j - 1]));
    th.setAttribute("scope", "col");
    th.dataset.matrixLabel = `dest-${j}`;
    headRow.append(th);
  }
  thead.append(headRow);
  matrixTable.append(thead);

  const tbody = el("tbody");
  for (let i = 0; i <= n; i += 1) {
    const tr = el("tr");
    tr.dataset.sourceIndex = String(i);
    const label = text("th", stopLabel(i, names[i - 1]));
    label.setAttribute("scope", "row");
    label.dataset.matrixLabel = `src-${i}`;
    tr.append(label);
    for (let j = 0; j <= n; j += 1) {
      const td = el("td");
      if (i === j) {
        td.append(text("span", "0", "diag"));
      } else {
        const value = matrixValues[i][j];
        const input = document.createElement("input");
        input.type = "text";
        input.id = `m-${i}-${j}`;
        input.maxLength = 12;
        input.inputMode = "numeric";
        input.autocomplete = "off";
        input.setAttribute("aria-label", `${stopLabel(i, names[i - 1])} → ${stopLabel(j, names[j - 1])}`);
        input.value =
          typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
        input.disabled = value === null;
        const check = document.createElement("input");
        check.type = "checkbox";
        check.id = `m-${i}-${j}-nodirect`;
        check.checked = value === null;
        const checkLabel = el("label", "nodirect");
        checkLabel.htmlFor = check.id;
        checkLabel.textContent = strings.directLabel;
        check.addEventListener("change", () => {
          matrixValues[i][j] = check.checked ? null : undefined;
          input.disabled = check.checked;
          if (!check.checked) input.value = "";
          onEdit();
        });
        input.addEventListener("input", () => {
          matrixValues[i][j] = input.value === "" ? undefined : input.value;
          onEdit();
        });
        td.append(input, check, checkLabel);
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
  matrixTable.append(tbody);

  // Rebuild the source select, keeping the current choice when valid.
  const previous = matrixSourceSelect.value;
  matrixSourceSelect.textContent = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = strings.matrixAllSources;
  matrixSourceSelect.append(allOption);
  for (let i = 0; i <= n; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = stopLabel(i, names[i - 1]);
    matrixSourceSelect.append(option);
  }
  matrixSourceSelect.value =
    previous === "all" || (previous !== "" && Number(previous) <= n)
      ? previous
      : "all";
  applyMatrixFilter();
}

function applyMatrixFilter() {
  const selected = matrixSourceSelect.value;
  for (const tr of matrixTable.querySelectorAll("tbody tr")) {
    tr.classList.toggle(
      "matrix-row-hidden",
      selected !== "all" && tr.dataset.sourceIndex !== selected,
    );
  }
}

// Update matrix row/column labels live while a stop name is typed.
function refreshMatrixLabels() {
  const names = currentStopNames();
  for (const span of matrixTable.querySelectorAll("[data-matrix-label]")) {
    const [kind, indexText] = span.dataset.matrixLabel.split("-");
    const index = Number(indexText);
    void kind;
    span.textContent = stopLabel(index, names[index - 1]);
  }
  for (const input of matrixTable.querySelectorAll("tbody input[type='text']")) {
    const match = /^m-(\d+)-(\d+)$/.exec(input.id);
    if (!match) continue;
    const i = Number(match[1]);
    const j = Number(match[2]);
    input.setAttribute(
      "aria-label",
      `${stopLabel(i, names[i - 1])} → ${stopLabel(j, names[j - 1])}`,
    );
  }
}

// ---- draft building -----------------------------------------------------

// Builds the core data object from the form, in field order. Returns
// {data} or {fieldError:{code,path}} for the first raw-syntax problem.
function buildDraft() {
  const start = parseTime(startInput.value.trim(), false);
  if (start === null) return { fieldError: { code: "SYNTAX", path: "/start" } };
  const deadline = parseTime(deadlineInput.value.trim(), true);
  if (deadline === null) {
    return { fieldError: { code: "SYNTAX", path: "/deadline" } };
  }

  const stops = [];
  const rows = [...stopsBody.children];
  for (let i = 0; i < rows.length; i += 1) {
    const c = rows[i]._controls;
    const base = `/stops/${i}`;
    const isBlank =
      c.nameInput.value === "" &&
      c.openInput.value === "" &&
      c.closeInput.value === "" &&
      c.serviceInput.value === "";
    if (isBlank) continue;
    if (c.nameInput.value === "") {
      return { fieldError: { code: "SYNTAX", path: `${base}/name` } };
    }
    const open = parseTime(c.openInput.value.trim(), false);
    if (open === null) {
      return { fieldError: { code: "SYNTAX", path: `${base}/open` } };
    }
    const close = parseTime(c.closeInput.value.trim(), true);
    if (close === null) {
      return { fieldError: { code: "SYNTAX", path: `${base}/close` } };
    }
    const service = parseIntField(c.serviceInput.value.trim());
    if (service === null) {
      return { fieldError: { code: "SYNTAX", path: `${base}/service` } };
    }
    stops.push({ name: c.nameInput.value, open, close, service });
  }

  const n = stops.length;
  const travel = [];
  for (let i = 0; i <= n; i += 1) {
    const row = [];
    for (let j = 0; j <= n; j += 1) {
      if (i === j) {
        row.push(0);
        continue;
      }
      const value = matrixValues[i][j];
      if (value === null) {
        row.push(null);
        continue;
      }
      if (typeof value === "number") {
        row.push(value);
        continue;
      }
      if (typeof value === "string") {
        const minutes = parseIntField(value.trim());
        if (minutes === null) {
          return { fieldError: { code: "SYNTAX", path: `/travel/${i}/${j}` } };
        }
        row.push(minutes);
        continue;
      }
      return { fieldError: { code: "SYNTAX", path: `/travel/${i}/${j}` } };
    }
    travel.push(row);
  }

  return { data: { start, deadline, stops, travel } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  if (path === "/start") return startInput;
  if (path === "/deadline") return deadlineInput;
  if (path === "/stops") {
    const first = stopsBody.querySelector("input");
    return first;
  }
  const stopMatch = /^\/stops\/(\d+)\/(name|open|close|service)$/.exec(path);
  if (stopMatch) {
    const rows = [...stopsBody.children].filter((row) => {
      const c = row._controls;
      return !(
        c.nameInput.value === "" &&
        c.openInput.value === "" &&
        c.closeInput.value === "" &&
        c.serviceInput.value === ""
      );
    });
    const row = rows[Number(stopMatch[1])];
    if (!row) return null;
    const field = stopMatch[2];
    if (field === "name") return row._controls.nameInput;
    if (field === "open") return row._controls.openInput;
    if (field === "close") return row._controls.closeInput;
    return row._controls.serviceInput;
  }
  const cellMatch = /^\/travel\/(\d+)\/(\d+)$/.exec(path);
  if (cellMatch) {
    return $(`m-${cellMatch[1]}-${cellMatch[2]}`);
  }
  if (path === "/travel") return matrixTable.querySelector("input[type='text']");
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
  goButton.textContent = strings.errorGoto;
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

  findButton.disabled = phase === "busy";
  findButton.textContent = phase === "busy" ? `${strings.working}…` : strings.find;
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
  if (!result.found) {
    statusEl.textContent = strings.statusReadyNoSolution;
    const notice = el("div", "notice");
    notice.append(text("h2", strings.noSolutionTitle));
    notice.append(text("p", strings.noSolutionBody));
    resultsEl.append(notice);
    return;
  }
  statusEl.textContent = strings.statusReady.replace(
    "{time}",
    formatMinutes(result.returnAt),
  );
  const heading = text("h2", strings.resultHeading);
  const table = el("table", "result-table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const label of [
    strings.colOrder,
    strings.colStop,
    strings.colArrive,
    strings.colWait,
    strings.colServeStart,
    strings.colService,
    strings.colLeave,
  ]) {
    headRow.append(text("th", label));
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = el("tbody");
  result.visits.forEach((visit, index) => {
    const tr = el("tr");
    tr.append(text("td", String(index + 1)));
    tr.append(text("td", visit.name));
    tr.append(text("td", formatMinutes(visit.arrive)));
    tr.append(text("td", `${visit.serveStart - visit.arrive} ${strings.minutesSuffix}`));
    tr.append(text("td", formatMinutes(visit.serveStart)));
    tr.append(text("td", `${visit.leave - visit.serveStart} ${strings.minutesSuffix}`));
    tr.append(text("td", formatMinutes(visit.leave)));
    tbody.append(tr);
  });
  table.append(tbody);
  const back = el("p", "return-line");
  back.textContent = `${strings.returnRow}：${formatMinutes(result.returnAt)}`;
  resultsEl.append(heading, table, back);
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
  startInput.value = "";
  deadlineInput.value = "";
  stopsBody.textContent = "";
  stopsBody.append(makeStopRow());
  matrixValues = [
    [0, undefined],
    [undefined, 0],
  ];
  renderMatrix();
  flow.reset();
  refreshStopButtons();
  render();
  startInput.focus();
}

function onLoadSample() {
  if (flow.snapshot().phase === "busy") {
    if (workerUsable && worker) {
      worker.postMessage({ type: "cancel", runId: activeRunId });
    }
    activeRunId = null;
    flow.cancel();
  }
  startInput.value = formatMinutes(SAMPLE.start);
  deadlineInput.value = formatMinutes(SAMPLE.deadline);
  stopsBody.textContent = "";
  for (const stop of SAMPLE.stops) stopsBody.append(makeStopRow(stop));
  matrixValues = SAMPLE.travel.map((row) => [...row]);
  renderMatrix();
  lastDraft = SAMPLE;
  flow.edit(SAMPLE);
  refreshStopButtons();
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
  startInput = $("start");
  deadlineInput = $("deadline");
  stopsBody = $("stops-body");
  matrixSourceSelect = $("matrix-source");
  matrixTable = $("matrix-table");
  matrixWrap = $("matrix-wrap");
  addStopButton = $("add-stop");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  findButton = $("find");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  fallbackNoteEl = $("worker-fallback");

  stopsBody.append(makeStopRow());
  renderMatrix();
  // On narrow screens the matrix starts filtered to the departure
  // point's row; on wide screens all rows show.
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 48rem)").matches
  ) {
    matrixSourceSelect.value = "0";
    applyMatrixFilter();
  }
  refreshStopButtons();

  const form = $("route-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", (event) => {
    if (
      event.target.matches("input[type='text']") &&
      event.target.closest("#stops-body")
    ) {
      refreshMatrixLabels();
    }
    onEdit();
  });
  matrixSourceSelect.addEventListener("change", applyMatrixFilter);
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addStopButton.addEventListener("click", () => {
    if (stopCount() >= MAX_STOPS) return;
    stopsBody.append(makeStopRow());
    resizeMatrix();
    onEdit();
    refreshStopButtons();
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
