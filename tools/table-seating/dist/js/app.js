// DOM controller for Party Table Seating. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core (solve,
// flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw number syntax
// (SYNTAX) and name/range rules in row order, then core validate() runs
// for duplicates and pin references. A valid draft is sent to the module
// worker; the flow controller settles only when the runId still matches
// and the phase is still busy, so late or cancelled replies are ignored.
// If the worker cannot start, the same solve runs synchronously in-page
// (same result) and a note is shown once.

import { validate, normalizeName, MAX_TABLES, MAX_PARTIES } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture table-seating.backtrack.
const SAMPLE = {
  tables: [
    { name: "T1", seats: 4, stepFree: true },
    { name: "T2", seats: 4, stepFree: false },
  ],
  parties: [
    { name: "A", size: 3, stepFree: false, pin: null },
    { name: "B", size: 2, stepFree: true, pin: null },
    { name: "C", size: 1, stepFree: false, pin: "T2" },
  ],
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

let tablesBody;
let partiesBody;
let statusEl;
let resultsEl;
let errorListEl;
let arrangeButton;
let cancelButton;
let clearButton;
let sampleButton;
let addTableButton;
let addPartyButton;
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

// ---- row construction -------------------------------------------------

function makeTableRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "table";

  const nameId = `t${id}-name`;
  const seatsId = `t${id}-seats`;
  const stepFreeId = `t${id}-stepfree`;

  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = values ? values.name : "";
  nameWrap.append(labelFor(nameId, strings.tableNameLabel), nameInput);

  const seatsWrap = el("div", "field field-narrow");
  const seatsInput = document.createElement("input");
  seatsInput.type = "text";
  seatsInput.id = seatsId;
  seatsInput.inputMode = "numeric";
  seatsInput.maxLength = 12;
  seatsInput.autocomplete = "off";
  seatsInput.value = values ? String(values.seats) : "";
  seatsWrap.append(labelFor(seatsId, strings.seatsLabel), seatsInput);

  const stepWrap = el("div", "field field-check");
  const stepInput = document.createElement("input");
  stepInput.type = "checkbox";
  stepInput.id = stepFreeId;
  stepInput.checked = values ? values.stepFree : false;
  stepWrap.append(stepInput, labelFor(stepFreeId, strings.stepFreeTableLabel));

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (tablesBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
    refreshPinOptions();
  });

  row.append(nameWrap, seatsWrap, stepWrap, removeButton);
  row._controls = { nameInput, seatsInput, stepInput, removeButton };
  return row;
}

function makePartyRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "party";

  const nameId = `p${id}-name`;
  const sizeId = `p${id}-size`;
  const stepFreeId = `p${id}-stepfree`;
  const pinId = `p${id}-pin`;

  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = values ? values.name : "";
  nameWrap.append(labelFor(nameId, strings.partyNameLabel), nameInput);

  const sizeWrap = el("div", "field field-narrow");
  const sizeInput = document.createElement("input");
  sizeInput.type = "text";
  sizeInput.id = sizeId;
  sizeInput.inputMode = "numeric";
  sizeInput.maxLength = 12;
  sizeInput.autocomplete = "off";
  sizeInput.value = values ? String(values.size) : "";
  sizeWrap.append(labelFor(sizeId, strings.sizeLabel), sizeInput);

  const stepWrap = el("div", "field field-check");
  const stepInput = document.createElement("input");
  stepInput.type = "checkbox";
  stepInput.id = stepFreeId;
  stepInput.checked = values ? values.stepFree : false;
  stepWrap.append(stepInput, labelFor(stepFreeId, strings.stepFreePartyLabel));

  const pinWrap = el("div", "field");
  const pinSelect = document.createElement("select");
  pinSelect.id = pinId;
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = strings.pinNone;
  pinSelect.append(noneOption);
  pinSelect.value = values && values.pin !== null ? values.pin : "";
  pinWrap.append(labelFor(pinId, strings.pinLabel), pinSelect);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (partiesBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
  });

  row.append(nameWrap, sizeWrap, stepWrap, pinWrap, removeButton);
  row._controls = { nameInput, sizeInput, stepInput, pinSelect, removeButton };
  return row;
}

function refreshRowButtons() {
  for (const row of tablesBody.children) {
    row._controls.removeButton.disabled = tablesBody.childElementCount <= 1;
  }
  for (const row of partiesBody.children) {
    row._controls.removeButton.disabled = partiesBody.childElementCount <= 1;
  }
  addTableButton.disabled = tablesBody.childElementCount >= MAX_TABLES;
  addPartyButton.disabled = partiesBody.childElementCount >= MAX_PARTIES;
}

// Rebuild every pin select from the current table names. A selected pin
// that no longer matches a table name is kept as an extra option so the
// choice is preserved and core validation can report REF for it.
function refreshPinOptions() {
  const names = [];
  for (const row of tablesBody.children) {
    const value = row._controls.nameInput.value.trim();
    if (value !== "") names.push(value);
  }
  for (const row of partiesBody.children) {
    const select = row._controls.pinSelect;
    const current = select.value;
    select.textContent = "";
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = strings.pinNone;
    select.append(noneOption);
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
}

// ---- draft building ---------------------------------------------------

function isBlankTableRow(row) {
  const c = row._controls;
  return (
    c.nameInput.value === "" &&
    c.seatsInput.value === "" &&
    c.stepInput.checked === false
  );
}

function isBlankPartyRow(row) {
  const c = row._controls;
  return (
    c.nameInput.value === "" &&
    c.sizeInput.value === "" &&
    c.stepInput.checked === false &&
    c.pinSelect.value === ""
  );
}

// Builds the core data object from the form, in row order. Returns
// {data} or {fieldError:{code,path}} for the first raw-syntax /
// name / range problem, mirroring the core's field order so the first
// reported error is the same one solve() would report.
function buildDraft() {
  const tables = [];
  const tableRows = [...tablesBody.children].filter(
    (row) => !isBlankTableRow(row),
  );
  for (let i = 0; i < tableRows.length; i += 1) {
    const c = tableRows[i]._controls;
    const base = `/tables/${i}`;
    const name = normalizeName(c.nameInput.value);
    if (!name.ok) return { fieldError: { code: name.code, path: `${base}/name` } };
    const rawSeats = c.seatsInput.value;
    if (!INTEGER_SYNTAX.test(rawSeats)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/seats` } };
    }
    const seats = Number(rawSeats);
    if (seats < 1 || seats > 20) {
      return { fieldError: { code: "RANGE", path: `${base}/seats` } };
    }
    tables.push({ name: name.name, seats, stepFree: c.stepInput.checked });
  }

  const parties = [];
  const partyRows = [...partiesBody.children].filter(
    (row) => !isBlankPartyRow(row),
  );
  for (let i = 0; i < partyRows.length; i += 1) {
    const c = partyRows[i]._controls;
    const base = `/parties/${i}`;
    const name = normalizeName(c.nameInput.value);
    if (!name.ok) return { fieldError: { code: name.code, path: `${base}/name` } };
    const rawSize = c.sizeInput.value;
    if (!INTEGER_SYNTAX.test(rawSize)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/size` } };
    }
    const size = Number(rawSize);
    if (size < 1 || size > 20) {
      return { fieldError: { code: "RANGE", path: `${base}/size` } };
    }
    const pinRaw = c.pinSelect.value;
    const pin = pinRaw === "" ? null : pinRaw;
    parties.push({
      name: name.name,
      size,
      stepFree: c.stepInput.checked,
      pin,
    });
  }

  return { data: { tables, parties } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  const match = /^\/(tables|parties)\/(\d+)\/(name|seats|size|pin|stepFree)$/.exec(path);
  if (!match) {
    if (path === "/tables") return tablesBody.querySelector("input");
    if (path === "/parties") return partiesBody.querySelector("input");
    return null;
  }
  const [, section, indexText, field] = match;
  const index = Number(indexText);
  const rows =
    section === "tables"
      ? [...tablesBody.children].filter((row) => !isBlankTableRow(row))
      : [...partiesBody.children].filter((row) => !isBlankPartyRow(row));
  const row = rows[index];
  if (!row) return null;
  const c = row._controls;
  if (field === "name") return c.nameInput;
  if (field === "seats") return c.seatsInput;
  if (field === "size") return c.sizeInput;
  if (field === "pin") return c.pinSelect;
  return c.stepInput;
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
  if (!result.found) {
    statusEl.textContent = strings.statusReadyNoSolution;
    const notice = el("div", "notice");
    notice.append(text("h2", strings.noSolutionTitle));
    notice.append(text("p", strings.noSolutionBody));
    notice.append(totalsLine());
    resultsEl.append(notice);
    return;
  }
  statusEl.textContent = strings.statusReady;
  const heading = text("h2", strings.resultHeading);
  resultsEl.append(heading);
  const sizeByName = new Map();
  if (lastValidData) {
    for (const party of lastValidData.parties) {
      sizeByName.set(party.name, party.size);
    }
  }
  const list = el("ul", "result-list");
  for (const table of result.tables) {
    const item = el("li", "result-table");
    const title = text("h3", `${table.name}`);
    item.append(title);
    if (table.parties.length === 0) {
      item.append(text("p", strings.noPartiesAtTable, "muted"));
    } else {
      const partyList = el("ul");
      for (const partyName of table.parties) {
        const size = sizeByName.get(partyName);
        const line = text(
          "li",
          size === undefined ? partyName : `${partyName} — ${size} ${strings.personUnit}`,
        );
        partyList.append(line);
      }
      item.append(partyList);
    }
    item.append(
      text("p", `${strings.remainingLabel}：${table.remaining} ${strings.seatUnit}`),
    );
    list.append(item);
  }
  resultsEl.append(list, totalsLine());
}

function totalsLine() {
  const line = el("p", "totals");
  if (!lastValidData) return line;
  const totalSeats = lastValidData.tables.reduce(
    (sum, table) => sum + table.seats,
    0,
  );
  const totalPeople = lastValidData.parties.reduce(
    (sum, party) => sum + party.size,
    0,
  );
  line.textContent = `${strings.totalSeats}：${totalSeats} · ${strings.totalPeople}：${totalPeople}`;
  return line;
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
  tablesBody.textContent = "";
  partiesBody.textContent = "";
  tablesBody.append(makeTableRow());
  partiesBody.append(makePartyRow());
  flow.reset();
  refreshRowButtons();
  refreshPinOptions();
  render();
  const first = tablesBody.querySelector("input");
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
  tablesBody.textContent = "";
  partiesBody.textContent = "";
  for (const table of SAMPLE.tables) tablesBody.append(makeTableRow(table));
  for (const party of SAMPLE.parties) partiesBody.append(makePartyRow(party));
  lastDraft = SAMPLE;
  flow.edit(SAMPLE);
  refreshRowButtons();
  refreshPinOptions();
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
    if (message.reply.status === "ok") {
      // lastValidData was set at submit time from the same snapshot.
    }
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
  tablesBody = $("tables-body");
  partiesBody = $("parties-body");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  arrangeButton = $("arrange");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  addTableButton = $("add-table");
  addPartyButton = $("add-party");
  fallbackNoteEl = $("worker-fallback");

  tablesBody.append(makeTableRow());
  partiesBody.append(makePartyRow());
  refreshRowButtons();
  refreshPinOptions();

  const form = $("seating-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", (event) => {
    if (
      event.target.matches("input[type='text']") &&
      event.target.closest("#tables-body")
    ) {
      refreshPinOptions();
    }
    onEdit();
  });
  form.addEventListener("change", (event) => {
    if (event.target.matches("select")) onEdit();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addTableButton.addEventListener("click", () => {
    if (tablesBody.childElementCount >= MAX_TABLES) return;
    tablesBody.append(makeTableRow());
    onEdit();
    refreshRowButtons();
    refreshPinOptions();
  });
  addPartyButton.addEventListener("click", () => {
    if (partiesBody.childElementCount >= MAX_PARTIES) return;
    partiesBody.append(makePartyRow());
    onEdit();
    refreshRowButtons();
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
