// DOM controller for Event Ticket Range Check. All user text is rendered
// with textContent / value only; never inserted as HTML. The pure core
// (solve, flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks the raw digits syntax
// (SYNTAX) and lets the core validate everything else. A valid draft is
// scheduled as the next event-loop work item (setTimeout(0)) so the run
// can be cancelled or invalidated by an edit before it starts; the flow
// controller settles only when the runId still matches and the phase is
// still busy, so late or cancelled replies are ignored.

import { solve } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture event-ticket-ranges.mixed.
const SAMPLE = {
  digits: 4,
  issued: { first: "0001", last: "0010" },
  bundles: [
    { name: "A", first: "0001", last: "0004" },
    { name: "B", first: "0004", last: "0006" },
    { name: "C", first: "0008", last: "0011" },
  ],
};

const MAX_BUNDLES = 64;
const MAX_TEXT_LENGTH = 128;
const MAX_NUMBER_LENGTH = 12;
const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;
let lastValidData = null;

const $ = (id) => document.getElementById(id);

let digitsInput;
let issuedFirstInput;
let issuedLastInput;
let bundlesBody;
let statusEl;
let errorListEl;
let resultsEl;
let checkButton;
let cancelButton;
let clearButton;
let sampleButton;
let addBundleButton;

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

function formatCount(n) {
  return new Intl.NumberFormat(document.documentElement.lang || "en").format(n);
}

// ---- bundle rows ----------------------------------------------------------

function makeBundleRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "bundle";

  const nameId = `b${id}-name`;
  const firstId = `b${id}-first`;
  const lastId = `b${id}-last`;

  const nameWrap = el("div", "field");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = nameId;
  nameInput.maxLength = MAX_TEXT_LENGTH;
  nameInput.autocomplete = "off";
  nameInput.value = values ? values.name : "";
  nameWrap.append(labelFor(nameId, strings.bundleNameLabel), nameInput);

  const firstWrap = el("div", "field field-narrow");
  const firstInput = document.createElement("input");
  firstInput.type = "text";
  firstInput.id = firstId;
  firstInput.inputMode = "numeric";
  firstInput.maxLength = MAX_NUMBER_LENGTH;
  firstInput.autocomplete = "off";
  firstInput.value = values ? values.first : "";
  firstWrap.append(labelFor(firstId, strings.bundleFirstLabel), firstInput);

  const lastWrap = el("div", "field field-narrow");
  const lastInput = document.createElement("input");
  lastInput.type = "text";
  lastInput.id = lastId;
  lastInput.inputMode = "numeric";
  lastInput.maxLength = MAX_NUMBER_LENGTH;
  lastInput.autocomplete = "off";
  lastInput.value = values ? values.last : "";
  lastWrap.append(labelFor(lastId, strings.bundleLastLabel), lastInput);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (bundlesBody.childElementCount <= 1) return;
    row.remove();
    onEdit();
    refreshRowButtons();
  });

  row.append(nameWrap, firstWrap, lastWrap, removeButton);
  row._controls = { nameInput, firstInput, lastInput, removeButton };
  return row;
}

function refreshRowButtons() {
  for (const row of bundlesBody.children) {
    row._controls.removeButton.disabled = bundlesBody.childElementCount <= 1;
  }
  addBundleButton.disabled = bundlesBody.childElementCount >= MAX_BUNDLES;
}

function isBlankBundleRow(row) {
  const c = row._controls;
  return (
    c.nameInput.value === "" &&
    c.firstInput.value === "" &&
    c.lastInput.value === ""
  );
}

function filledBundleRows() {
  return [...bundlesBody.children].filter((row) => !isBlankBundleRow(row));
}

// ---- draft building -------------------------------------------------------

// Builds the core data object from the form. Returns {data} or
// {data, fieldError} when the raw digits text fails the ASCII integer
// syntax the form accepts; the core still validates every other field.
function buildDraft() {
  const rawDigits = digitsInput.value;
  let digits = rawDigits;
  let fieldError = null;
  if (!INTEGER_SYNTAX.test(rawDigits)) {
    fieldError = { code: "SYNTAX", path: "/digits" };
  } else {
    digits = Number(rawDigits);
  }
  const bundles = filledBundleRows().map((row) => {
    const c = row._controls;
    return {
      name: c.nameInput.value,
      first: c.firstInput.value,
      last: c.lastInput.value,
    };
  });
  return {
    data: {
      digits,
      issued: { first: issuedFirstInput.value, last: issuedLastInput.value },
      bundles,
    },
    fieldError,
  };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  if (path === "/digits" || path === "") return digitsInput;
  if (path === "/issued/first") return issuedFirstInput;
  if (path === "/issued/last") return issuedLastInput;
  if (path === "/issued") return issuedFirstInput;
  if (path === "/bundles") return addBundleButton;
  const match = /^\/bundles\/(\d+)\/(name|first|last)$/.exec(path);
  if (!match) return null;
  const rows = filledBundleRows();
  const row = rows[Number(match[1])];
  if (!row) return null;
  const c = row._controls;
  if (match[2] === "name") return c.nameInput;
  if (match[2] === "first") return c.firstInput;
  return c.lastInput;
}

// ---- rendering ------------------------------------------------------------

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
  goButton.textContent = strings.goToField;
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

function rangeCount(first, last) {
  return Number.parseInt(last, 10) - Number.parseInt(first, 10) + 1;
}

function resultTable(headers, rows) {
  const table = el("table", "result-table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const header of headers) headRow.append(text("th", header));
  thead.append(headRow);
  const tbody = el("tbody");
  for (const cells of rows) {
    const tr = el("tr");
    for (const cell of cells) tr.append(text("td", cell));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  return table;
}

function renderResults(result) {
  resultsEl.textContent = "";

  const summary = el("div", "summary");
  summary.append(text("h2", strings.summaryHeading));
  const summaryList = el("dl", "summary-list");
  const issuedTotal = result.uniqueCovered + result.missingCount;
  const summaryItems = [
    [strings.uniqueCoveredLabel, result.uniqueCovered],
    [strings.missingCountLabel, result.missingCount],
    [strings.duplicateCopiesLabel, result.duplicateCopies],
    [strings.outsideCopiesLabel, result.outsideCopies],
    [strings.issuedLengthLabel, issuedTotal],
  ];
  for (const [label, value] of summaryItems) {
    summaryList.append(text("dt", label), text("dd", formatCount(value)));
  }
  summary.append(summaryList);
  resultsEl.append(summary);

  const missingSection = el("section");
  missingSection.append(text("h2", strings.missingHeading));
  missingSection.append(text("p", strings.missingHint, "hint"));
  if (result.missing.length === 0) {
    missingSection.append(text("p", strings.missingNone, "muted"));
  } else {
    missingSection.append(
      resultTable(
        [strings.rangeFirstLabel, strings.rangeLastLabel, strings.rangeCountLabel],
        result.missing.map((seg) => [
          seg.first,
          seg.last,
          formatCount(rangeCount(seg.first, seg.last)),
        ]),
      ),
    );
  }
  resultsEl.append(missingSection);

  const overlapsSection = el("section");
  overlapsSection.append(text("h2", strings.overlapsHeading));
  overlapsSection.append(text("p", strings.overlapsHint, "hint"));
  if (result.overlaps.length === 0) {
    overlapsSection.append(text("p", strings.overlapsNone, "muted"));
  } else {
    overlapsSection.append(
      resultTable(
        [
          strings.rangeFirstLabel,
          strings.rangeLastLabel,
          strings.bundlesLabel,
          strings.duplicateCopiesLabel,
        ],
        result.overlaps.map((seg) => [
          seg.first,
          seg.last,
          seg.bundles.join("、"),
          formatCount(rangeCount(seg.first, seg.last) * (seg.bundles.length - 1)),
        ]),
      ),
    );
  }
  resultsEl.append(overlapsSection);

  const outsideSection = el("section");
  outsideSection.append(text("h2", strings.outsideHeading));
  outsideSection.append(text("p", strings.outsideHint, "hint"));
  if (result.outside.length === 0) {
    outsideSection.append(text("p", strings.outsideNone, "muted"));
  } else {
    outsideSection.append(
      resultTable(
        [
          strings.bundleLabel,
          strings.rangeFirstLabel,
          strings.rangeLastLabel,
          strings.rangeCountLabel,
        ],
        result.outside.map((seg) => [
          seg.bundle,
          seg.first,
          seg.last,
          formatCount(rangeCount(seg.first, seg.last)),
        ]),
      ),
    );
  }
  resultsEl.append(outsideSection);
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  checkButton.disabled = phase === "busy";
  checkButton.textContent = phase === "busy" ? `${strings.working}…` : strings.arrange;
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
  statusEl.textContent = strings.statusReady;
  if (result !== null) renderResults(result);
}

// ---- actions ---------------------------------------------------------------

function revokePending() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  activeRunId = null;
}

function onEdit() {
  // Every edit clears the old result and invalidates the active runId.
  if (flow.snapshot().phase === "busy") {
    revokePending();
    flow.cancel();
  }
  flow.edit(buildDraft().data);
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraft();
  if (built.fieldError) {
    flow.edit(built.data);
    flow.fail(built.fieldError);
    render();
    return;
  }
  lastValidData = built.data;
  flow.edit(built.data);
  runCounter += 1;
  activeRunId = runCounter;
  flow.run(activeRunId);
  render();
  const runId = activeRunId;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    // The core runs in this next event-loop work item; the flow
    // controller only accepts the reply while this run is still live.
    flow.settleWith(runId, solve(lastValidData));
    activeRunId = null;
    render();
  }, 0);
}

function onCancel() {
  if (flow.snapshot().phase !== "busy") return;
  revokePending();
  flow.cancel();
  render();
}

function onClear() {
  revokePending();
  lastValidData = null;
  digitsInput.value = "4";
  issuedFirstInput.value = "";
  issuedLastInput.value = "";
  bundlesBody.textContent = "";
  bundlesBody.append(makeBundleRow());
  flow.reset();
  refreshRowButtons();
  render();
  digitsInput.focus();
}

function onLoadSample() {
  revokePending();
  if (flow.snapshot().phase === "busy") flow.cancel();
  digitsInput.value = String(SAMPLE.digits);
  issuedFirstInput.value = SAMPLE.issued.first;
  issuedLastInput.value = SAMPLE.issued.last;
  bundlesBody.textContent = "";
  for (const bundle of SAMPLE.bundles) bundlesBody.append(makeBundleRow(bundle));
  flow.edit(SAMPLE);
  refreshRowButtons();
  render();
}

// ---- init ------------------------------------------------------------------

function init() {
  strings = stringsFor(document.documentElement.lang || "en");
  digitsInput = $("digits");
  issuedFirstInput = $("issued-first");
  issuedLastInput = $("issued-last");
  bundlesBody = $("bundles-body");
  statusEl = $("status");
  errorListEl = $("error-list");
  resultsEl = $("results");
  checkButton = $("check");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  addBundleButton = $("add-bundle");

  bundlesBody.append(makeBundleRow());
  refreshRowButtons();

  const form = $("ticket-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", onEdit);
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addBundleButton.addEventListener("click", () => {
    if (bundlesBody.childElementCount >= MAX_BUNDLES) return;
    bundlesBody.append(makeBundleRow());
    onEdit();
    refreshRowButtons();
    const rows = bundlesBody.children;
    const last = rows[rows.length - 1];
    if (last) last.querySelector("input").focus();
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
