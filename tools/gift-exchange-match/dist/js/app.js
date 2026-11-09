// DOM controller for Gift Exchange Match. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core (solve,
// flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw shape (a half-filled
// blocked row is a SYNTAX error) and core validate() runs for the rest. A
// valid draft is sent to the module worker; the flow controller settles
// only when the runId still matches and the phase is still busy, so late
// or cancelled replies are ignored. If the worker cannot start, the same
// solve runs synchronously in-page (same result) and a note is shown once.
//
// Reveal: the result lists every giver with the recipient hidden. The
// recipient name is not placed in the DOM (or the accessibility tree)
// until that giver is revealed. Revealing one giver hides any other;
// switching to another giver needs one more click to reveal that giver,
// and closing returns focus to the giver's reveal button.

import { validate, MAX_NAMES, MAX_BLOCKED } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture gift-exchange-match.three.
const SAMPLE = {
  names: ["A", "B", "C"],
  blocked: [],
};

const MAX_TEXT_LENGTH = 128;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let lastValidData = null; // validated snapshot behind the shown result
let worker = null;
let workerUsable = false;
let fallbackNoted = false;
let revealedFrom = null; // giver name whose recipient is currently shown

const $ = (id) => document.getElementById(id);

let namesBody;
let blockedBody;
let statusEl;
let resultsEl;
let errorListEl;
let matchButton;
let cancelButton;
let clearButton;
let sampleButton;
let addNameButton;
let addBlockedButton;
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

function makeNameRow(value) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "name";

  const nameId = `n${id}-name`;
  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = value || "";
  nameWrap.append(labelFor(nameId, strings.nameLabel), nameInput);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (namesBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
  });

  row.append(nameWrap, removeButton);
  row._controls = { nameInput, removeButton };
  return row;
}

function makeBlockedRow() {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row blocked-row");
  row.dataset.kind = "blocked";

  const fromId = `b${id}-from`;
  const fromWrap = el("div", "field");
  const fromSelect = document.createElement("select");
  fromSelect.id = fromId;
  fromWrap.append(labelFor(fromId, strings.blockedFromLabel), fromSelect);

  const toId = `b${id}-to`;
  const toWrap = el("div", "field");
  const toSelect = document.createElement("select");
  toSelect.id = toId;
  toWrap.append(labelFor(toId, strings.blockedToLabel), toSelect);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    row.remove();
    onEdit();
    refreshRowButtons();
  });

  row.append(fromWrap, toWrap, removeButton);
  row._controls = { fromSelect, toSelect, removeButton };
  return row;
}

function refreshRowButtons() {
  for (const row of namesBody.children) {
    row._controls.removeButton.disabled = namesBody.childElementCount <= 1;
  }
  addNameButton.disabled = namesBody.childElementCount >= MAX_NAMES;
  addBlockedButton.disabled = blockedBody.childElementCount >= MAX_BLOCKED;
}

// Rebuild every blocked select from the current non-blank names. A
// selected name that no longer matches a name field is kept as an extra
// option so the choice is preserved and core validation can report REF
// for it.
function refreshBlockedOptions() {
  const names = [];
  for (const row of namesBody.children) {
    const value = row._controls.nameInput.value.trim();
    if (value !== "" && !names.includes(value)) names.push(value);
  }
  for (const row of blockedBody.children) {
    for (const key of ["fromSelect", "toSelect"]) {
      const select = row._controls[key];
      const current = select.value;
      select.textContent = "";
      const blankOption = document.createElement("option");
      blankOption.value = "";
      blankOption.textContent = "—";
      select.append(blankOption);
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
}

// ---- draft building ---------------------------------------------------

// Lenient draft for edits: blank name rows and empty blocked rows are
// skipped; a half-filled blocked row is skipped here and reported only
// at submit time.
function buildDraftLenient() {
  const names = [];
  for (const row of namesBody.children) {
    const value = row._controls.nameInput.value;
    if (value.trim() !== "") names.push(value);
  }
  const blocked = [];
  for (const row of blockedBody.children) {
    const from = row._controls.fromSelect.value;
    const to = row._controls.toSelect.value;
    if (from !== "" && to !== "") blocked.push({ from, to });
  }
  return { names, blocked };
}

// Strict draft for submit. Returns {data} or {fieldError:{code,path}}.
// A half-filled blocked row is a SYNTAX error at the missing side; its
// path uses the data index the row would take.
function buildDraftStrict() {
  const names = [];
  for (const row of namesBody.children) {
    const value = row._controls.nameInput.value;
    if (value.trim() !== "") names.push(value);
  }
  const blocked = [];
  for (const row of blockedBody.children) {
    const from = row._controls.fromSelect.value;
    const to = row._controls.toSelect.value;
    if (from === "" && to === "") continue;
    if (from === "") {
      return { fieldError: { code: "SYNTAX", path: `/blocked/${blocked.length}/from` } };
    }
    if (to === "") {
      return { fieldError: { code: "SYNTAX", path: `/blocked/${blocked.length}/to` } };
    }
    blocked.push({ from, to });
  }
  return { data: { names, blocked } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  const nameMatch = /^\/names\/(\d+)$/.exec(path);
  if (nameMatch) {
    const rows = [...namesBody.children].filter(
      (row) => row._controls.nameInput.value.trim() !== "",
    );
    const row = rows[Number(nameMatch[1])];
    return row ? row._controls.nameInput : null;
  }
  if (path === "/names") return namesBody.querySelector("input");
  const blockedMatch = /^\/blocked\/(\d+)(?:\/(from|to))?$/.exec(path);
  if (blockedMatch) {
    const rows = [...blockedBody.children].filter((row) => {
      const c = row._controls;
      return c.fromSelect.value !== "" || c.toSelect.value !== "";
    });
    const row = rows[Number(blockedMatch[1])];
    if (!row) return null;
    if (blockedMatch[2] === "to") return row._controls.toSelect;
    return row._controls.fromSelect;
  }
  if (path === "/blocked") return blockedBody.querySelector("select");
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

function renderGiverList(result) {
  const heading = text("h2", strings.resultHeading);
  resultsEl.append(heading);
  const hint = text("p", strings.resultHint, "muted");
  resultsEl.append(hint);
  const list = el("ul", "giver-list");
  for (const assignment of result.assignments) {
    const item = el("li", "giver-row");
    const nameEl = text("span", assignment.from, "giver-name");
    item.append(nameEl);
    const revealed = revealedFrom === assignment.from;
    if (revealed) {
      const recipient = text("p", `${strings.recipientLabel}：${assignment.to}`, "recipient");
      const closeButton = el("button", "reveal-button");
      closeButton.type = "button";
      closeButton.textContent = strings.hide;
      closeButton.dataset.giver = assignment.from;
      closeButton.addEventListener("click", () => {
        revealedFrom = null;
        render();
        focusGiverButton(assignment.from);
      });
      item.append(recipient, closeButton);
    } else {
      const hidden = text("p", strings.hiddenRecipient, "muted");
      const revealButton = el("button", "reveal-button");
      revealButton.type = "button";
      revealButton.textContent = strings.reveal;
      revealButton.dataset.giver = assignment.from;
      revealButton.addEventListener("click", () => {
        if (revealedFrom !== null) {
          // Switching givers hides the previous card first; this giver
          // needs one more click to reveal, per the SPEC.
          revealedFrom = null;
          render();
          focusGiverButton(assignment.from);
          return;
        }
        revealedFrom = assignment.from;
        render();
        focusGiverButton(assignment.from);
      });
      item.append(hidden, revealButton);
    }
    list.append(item);
  }
  resultsEl.append(list);
}

function focusGiverButton(giver) {
  const button = resultsEl.querySelector(`button[data-giver="${CSS.escape(giver)}"]`);
  if (button) button.focus();
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  matchButton.disabled = phase === "busy";
  matchButton.textContent = phase === "busy" ? `${strings.working}…` : strings.match;
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
  statusEl.textContent = strings.statusReady;
  renderGiverList(result);
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
  revealedFrom = null;
  refreshBlockedOptions();
  flow.edit(buildDraftLenient());
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraftStrict();
  if (built.fieldError) {
    // Form-level error: enter the error phase, keep the draft, focus
    // the first invalid field (render/showError does the focusing).
    flow.fail(built.fieldError);
    render();
    return;
  }
  const checked = validate(built.data);
  if (!checked.ok) {
    lastValidData = built.data;
    flow.edit(built.data);
    flow.fail(checked.reply.error);
    render();
    return;
  }
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
  revealedFrom = null;
  flow.cancel();
  render();
}

function resetFormRows() {
  namesBody.textContent = "";
  blockedBody.textContent = "";
  for (let i = 0; i < 3; i += 1) namesBody.append(makeNameRow());
  refreshBlockedOptions();
  refreshRowButtons();
}

function onClear() {
  if (flow.snapshot().phase === "busy") {
    if (workerUsable && worker) {
      worker.postMessage({ type: "cancel", runId: activeRunId });
    }
    activeRunId = null;
  }
  lastValidData = null;
  revealedFrom = null;
  resetFormRows();
  flow.reset();
  render();
  const first = namesBody.querySelector("input");
  if (first) first.focus();
}

function onLoadSample() {
  if (flow.snapshot().phase === "busy") {
    if (workerUsable && worker) {
      worker.postMessage({ type: "cancel", runId: activeRunId });
    }
    activeRunId = null;
  }
  revealedFrom = null;
  namesBody.textContent = "";
  blockedBody.textContent = "";
  for (const name of SAMPLE.names) namesBody.append(makeNameRow(name));
  refreshBlockedOptions();
  refreshRowButtons();
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
  namesBody = $("names-body");
  blockedBody = $("blocked-body");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  matchButton = $("match");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  addNameButton = $("add-name");
  addBlockedButton = $("add-blocked");
  fallbackNoteEl = $("worker-fallback");

  resetFormRows();

  const form = $("match-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", (event) => {
    if (event.target.matches("input[type='text']")) onEdit();
  });
  form.addEventListener("change", (event) => {
    if (event.target.matches("select")) onEdit();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addNameButton.addEventListener("click", () => {
    if (namesBody.childElementCount >= MAX_NAMES) return;
    namesBody.append(makeNameRow());
    onEdit();
    refreshRowButtons();
  });
  addBlockedButton.addEventListener("click", () => {
    if (blockedBody.childElementCount >= MAX_BLOCKED) return;
    blockedBody.append(makeBlockedRow());
    refreshBlockedOptions();
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
