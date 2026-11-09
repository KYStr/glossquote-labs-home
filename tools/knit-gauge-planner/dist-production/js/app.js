// DOM controller for Knit Gauge Pattern Planner. All user text is
// rendered with textContent / value only; never inserted as HTML. The
// pure core (solve, flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw integer syntax in
// SPEC table order, then core solve() runs for range/shape checks. A
// valid draft is solved in the next event-loop work item (setTimeout
// 0) behind a runId guard, so a cancel or edit before that item runs
// revokes the scheduled work and a late reply can never revive a
// result. If the scheduled item cannot run, the same solve runs
// synchronously in-page (same result).

import { solve, parseRawInteger, FIELD_DEFS } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor, fieldLabel, formatMm } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// knit-gauge-planner.repeats.
const SAMPLE = {
  swatchStitches: 20,
  swatchWidthMm: 100,
  swatchRows: 24,
  swatchHeightMm: 120,
  targetWidthMm: 103,
  targetHeightMm: 52,
  edgeEach: 2,
  repeatStitches: 6,
  repeatRows: 4,
};

const FIELD_KEYS = FIELD_DEFS.map((field) => field.key);
const DEFAULT_VALUES = { edgeEach: "0", repeatStitches: "1", repeatRows: "1" };

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;

const $ = (id) => document.getElementById(id);

let form;
let inputs;
let statusEl;
let resultsEl;
let errorListEl;
let submitButton;
let cancelButton;
let clearButton;
let sampleButton;

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

function inputFor(key) {
  return inputs[key];
}

// Build the core data object from the form, in SPEC table order.
// Returns {data} or {fieldError:{code,path}} for the first raw-syntax
// problem. Empty fields are a syntax error: every field is required.
function buildDraft() {
  const data = {};
  for (const key of FIELD_KEYS) {
    const parsed = parseRawInteger(inputFor(key).value);
    if (!parsed.ok) {
      return { fieldError: { code: parsed.code, path: `/${key}` } };
    }
    data[key] = parsed.value;
  }
  return { data };
}

// Draft for edit tracking: the data object when every field parses,
// otherwise null (an incomplete draft can never run).
function draftOrNull() {
  const built = buildDraft();
  return built.data ?? null;
}

function clearPendingTimer() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function fieldForPath(path) {
  const match = /^\/(swatchStitches|swatchWidthMm|swatchRows|swatchHeightMm|targetWidthMm|targetHeightMm|edgeEach|repeatStitches|repeatRows)$/.exec(
    path ?? "",
  );
  return match ? inputFor(match[1]) : null;
}

function clearMarks() {
  for (const input of document.querySelectorAll("[aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
  }
  errorListEl.textContent = "";
  errorListEl.hidden = true;
}

function showError(error) {
  const lang = document.documentElement.lang || "en";
  const key = (error.path ?? "").replace(/^\//, "");
  const label = FIELD_LABELS_HAS(key) ? fieldLabel(lang, key) : "";
  const message = strings.errors[error.code] || strings.errors.TYPE;
  const item = el("div", "error-item");
  const head = el("p");
  const codeEl = text("code", error.code);
  head.append(
    codeEl,
    document.createTextNode(
      ` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})${label ? ` — ${label}` : ""}`,
    ),
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

function FIELD_LABELS_HAS(key) {
  return FIELD_KEYS.includes(key);
}

function axisSection(axis, heading) {
  const lang = document.documentElement.lang || "en";
  const section = el("section", "result-axis");
  section.append(text("h3", heading));
  const { lower, upper, chosen } = axis;
  if (lower !== null && upper !== null && lower.count === upper.count) {
    section.append(text("p", strings.exactNote, "notice-inline"));
  } else if (lower === null) {
    section.append(text("p", strings.minOnlyNote, "notice-inline"));
  } else if (upper === null) {
    section.append(text("p", strings.capOnlyNote, "notice-inline"));
  }
  const table = el("table", "result-table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const headingText of [
    strings.optionColumn,
    strings.countColumn,
    strings.sizeColumn,
  ]) {
    headRow.append(text("th", headingText));
  }
  thead.append(headRow);
  table.append(thead);
  const body = el("tbody");
  const rows = [];
  if (lower !== null) rows.push([strings.lowerLabel, lower]);
  if (upper !== null && (lower === null || upper.count !== lower.count)) {
    rows.push([strings.upperLabel, upper]);
  }
  for (const [optionLabel, option] of rows) {
    const row = el("tr");
    const isChosen = option.count === chosen.count;
    if (isChosen) row.className = "chosen";
    const labelCell = el("td");
    labelCell.append(
      document.createTextNode(optionLabel),
      ...(isChosen
        ? [document.createTextNode(" "), text("span", strings.chosenBadge, "badge")]
        : []),
    );
    row.append(labelCell);
    row.append(text("td", String(option.count), "number"));
    row.append(
      text("td", `${formatMm(option.sizeTenthsMm, lang)} mm`, "number"),
    );
    body.append(row);
  }
  table.append(body);
  section.append(table);
  return section;
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  submitButton.disabled = phase === "busy";
  submitButton.textContent =
    phase === "busy" ? `${strings.statusBusy}` : strings.submit;
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
  statusEl.textContent = strings.statusReady;
  resultsEl.append(text("h2", strings.resultsHeading));
  resultsEl.append(axisSection(result.stitches, strings.stitchesHeading));
  resultsEl.append(axisSection(result.rows, strings.rowsHeading));
}

function onEdit() {
  // Every edit clears the old result and invalidates the active runId.
  if (flow.snapshot().phase === "busy") {
    clearPendingTimer();
    activeRunId = null;
    flow.cancel();
  }
  flow.edit(draftOrNull());
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraft();
  if (built.fieldError) {
    flow.fail(built.fieldError);
    render();
    return;
  }
  const reply = solve(built.data);
  if (reply.status === "error") {
    flow.fail(reply.error);
    render();
    return;
  }
  flow.edit(built.data);
  runCounter += 1;
  activeRunId = runCounter;
  flow.run(activeRunId);
  render();
  const runId = activeRunId;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flow.settle(runId);
    activeRunId = null;
    render();
  }, 0);
}

function onCancel() {
  if (flow.snapshot().phase !== "busy") return;
  clearPendingTimer();
  activeRunId = null;
  flow.cancel();
  render();
}

function onClear() {
  clearPendingTimer();
  activeRunId = null;
  for (const key of FIELD_KEYS) {
    inputFor(key).value = DEFAULT_VALUES[key] ?? "";
  }
  flow.reset();
  render();
  const first = inputFor(FIELD_KEYS[0]);
  if (first) first.focus();
}

function onLoadSample() {
  clearPendingTimer();
  activeRunId = null;
  if (flow.snapshot().phase === "busy") flow.cancel();
  for (const key of FIELD_KEYS) {
    inputFor(key).value = String(SAMPLE[key]);
  }
  flow.edit({ ...SAMPLE });
  render();
}

function init() {
  form = $("gauge-form");
  inputs = {};
  for (const key of FIELD_KEYS) inputs[key] = $(`field-${key}`);
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  submitButton = $("find");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");

  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", onEdit);
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);

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
