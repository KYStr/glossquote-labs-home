// DOM controller for Laundry Machine Handoff. All user text is rendered
// with textContent / value only; never inserted as HTML. The pure core
// (solve, flow, i18n) is imported, never re-implemented here.
//
// Flow: the form builds a draft from its state model, the app checks raw
// time/integer syntax (SYNTAX) and then the core runs on the next
// event-loop work item (setTimeout 0) under a runId guard, so an edit or
// cancel before that item revokes the scheduled work and a late reply
// can never revive a result. A core error settles as phase "error" with
// the core's fixed {code, path}.

import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// laundry-machine-handoff.delayed-wash.
const SAMPLE = {
  start: 480,
  end: 720,
  washerBusy: [{ start: 480, end: 500 }],
  dryerBusy: [{ start: 520, end: 550 }],
  loads: [
    { name: "A", washMin: 30, dryMin: 40, maxWaitMin: 10 },
    { name: "B", washMin: 20, dryMin: 30, maxWaitMin: 0 },
  ],
};

const TIME_SYNTAX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;
const MAX_BUSY = 16;
const MAX_LOADS = 8;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;
let lastDraft = null;
let lastSubmitted = null;
// Maps compact (core) row indices to state-model row indices, recorded
// at submit time so error focus lands on the right row even when blank
// rows were skipped while building the draft.
let lastIndexMap = { washerBusy: [], dryerBusy: [], loads: [] };

// State model: raw form values. Times stay "HH:MM" text and numbers
// stay text until submit, when the SYNTAX check turns them into ints.
let windowStartText = "";
let windowEndText = "";
let washerBusy = [{ start: "", end: "" }];
let dryerBusy = [{ start: "", end: "" }];
let loads = [{ name: "", washMin: "", dryMin: "", maxWaitMin: "0" }];

const $ = (id) => document.getElementById(id);

let windowStartInput;
let windowEndInput;
let washerBody;
let dryerBody;
let loadsBody;
let addWasherButton;
let addDryerButton;
let addLoadButton;
let planButton;
let cancelButton;
let clearButton;
let sampleButton;
let statusEl;
let missingEl;
let errorListEl;
let resultsEl;

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

function initialState() {
  windowStartText = "";
  windowEndText = "";
  washerBusy = [{ start: "", end: "" }];
  dryerBusy = [{ start: "", end: "" }];
  loads = [{ name: "", washMin: "", dryMin: "", maxWaitMin: "0" }];
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// ---- draft building -----------------------------------------------------

function parseTime(value, allow24, path) {
  if (allow24 && value === "24:00") return { ok: true, value: 1440 };
  const match = TIME_SYNTAX.exec(value);
  if (!match) return { ok: false, error: { code: "SYNTAX", path } };
  return { ok: true, value: Number(match[1]) * 60 + Number(match[2]) };
}

function parseInteger(value, path) {
  if (!INTEGER_SYNTAX.test(value)) {
    return { ok: false, error: { code: "SYNTAX", path } };
  }
  return { ok: true, value: Number(value) };
}

// Builds one machine's busy list, skipping blank rows. Returns
// {items, map} or {error, map}; map[compactIndex] = state row index.
function buildBusyList(rows, field) {
  const items = [];
  const map = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.start === "" && row.end === "") continue;
    const idx = items.length;
    map.push(i);
    const s = parseTime(row.start, false, `/${field}/${idx}/start`);
    if (!s.ok) return { error: s.error, map };
    const e = parseTime(row.end, true, `/${field}/${idx}/end`);
    if (!e.ok) return { error: e.error, map };
    items.push({ start: s.value, end: e.value });
  }
  return { items, map };
}

function buildLoadList(rows) {
  const items = [];
  const map = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.name === "" && row.washMin === "" && row.dryMin === "") continue;
    const idx = items.length;
    map.push(i);
    const wash = parseInteger(row.washMin, `/loads/${idx}/washMin`);
    if (!wash.ok) return { error: wash.error, map };
    const dry = parseInteger(row.dryMin, `/loads/${idx}/dryMin`);
    if (!dry.ok) return { error: dry.error, map };
    const wait = parseInteger(row.maxWaitMin, `/loads/${idx}/maxWaitMin`);
    if (!wait.ok) return { error: wait.error, map };
    items.push({
      name: row.name,
      washMin: wash.value,
      dryMin: dry.value,
      maxWaitMin: wait.value,
    });
  }
  return { items, map };
}

function emptyMap() {
  return { washerBusy: [], dryerBusy: [], loads: [] };
}

function buildDraft() {
  const start = parseTime(windowStartText, false, "/start");
  if (!start.ok) return { fieldError: start.error, indexMap: emptyMap() };
  const end = parseTime(windowEndText, true, "/end");
  if (!end.ok) return { fieldError: end.error, indexMap: emptyMap() };
  const washer = buildBusyList(washerBusy, "washerBusy");
  if (washer.error) {
    return {
      fieldError: washer.error,
      indexMap: { washerBusy: washer.map, dryerBusy: [], loads: [] },
    };
  }
  const dryer = buildBusyList(dryerBusy, "dryerBusy");
  if (dryer.error) {
    return {
      fieldError: dryer.error,
      indexMap: { washerBusy: washer.map, dryerBusy: dryer.map, loads: [] },
    };
  }
  const loadList = buildLoadList(loads);
  if (loadList.error) {
    return {
      fieldError: loadList.error,
      indexMap: {
        washerBusy: washer.map,
        dryerBusy: dryer.map,
        loads: loadList.map,
      },
    };
  }
  return {
    data: {
      start: start.value,
      end: end.value,
      washerBusy: washer.items,
      dryerBusy: dryer.items,
      loads: loadList.items,
    },
    indexMap: {
      washerBusy: washer.map,
      dryerBusy: dryer.map,
      loads: loadList.map,
    },
  };
}

// ---- row rendering ------------------------------------------------------

function makeTimeInput(id, labelText, value, onInput) {
  const wrap = el("div", "field");
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.inputMode = "numeric";
  input.maxLength = 5;
  input.autocomplete = "off";
  input.placeholder = "08:00";
  input.value = value;
  input.addEventListener("input", () => {
    onInput(input.value);
    onEdit();
  });
  wrap.append(labelFor(id, labelText), input);
  return wrap;
}

function makeTextInput(id, labelText, value, maxLength, onInput) {
  const wrap = el("div", "field");
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.maxLength = maxLength;
  input.autocomplete = "off";
  input.value = value;
  input.addEventListener("input", () => {
    onInput(input.value);
    onEdit();
  });
  wrap.append(labelFor(id, labelText), input);
  return wrap;
}

function makeRemoveButton(disabled, onClick) {
  const button = el("button", "remove-row secondary");
  button.type = "button";
  button.textContent = strings.removeRow;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function renderBusyRows(body, rows, prefix) {
  body.textContent = "";
  rows.forEach((row, i) => {
    const line = el("div", "row");
    line.append(
      makeTimeInput(
        `${prefix}-${i}-start`,
        strings.busyStartLabel,
        row.start,
        (value) => {
          rows[i].start = value;
        },
      ),
      makeTimeInput(
        `${prefix}-${i}-end`,
        strings.busyEndLabel,
        row.end,
        (value) => {
          rows[i].end = value;
        },
      ),
      makeRemoveButton(rows.length <= 1, () => {
        if (rows.length <= 1) return;
        rows.splice(i, 1);
        onEdit();
        renderAll();
      }),
    );
    body.append(line);
  });
}

function renderLoadRows() {
  loadsBody.textContent = "";
  loads.forEach((row, i) => {
    const line = el("div", "row load-row");
    line.append(
      makeTextInput(
        `load-${i}-name`,
        `${strings.loadNameLabel} ${i + 1}`,
        row.name,
        MAX_TEXT_LENGTH,
        (value) => {
          loads[i].name = value;
        },
      ),
      makeTextInput(
        `load-${i}-wash`,
        strings.washLabel,
        row.washMin,
        12,
        (value) => {
          loads[i].washMin = value;
        },
      ),
      makeTextInput(
        `load-${i}-dry`,
        strings.dryLabel,
        row.dryMin,
        12,
        (value) => {
          loads[i].dryMin = value;
        },
      ),
      makeTextInput(
        `load-${i}-wait`,
        strings.waitLabel,
        row.maxWaitMin,
        12,
        (value) => {
          loads[i].maxWaitMin = value;
        },
      ),
      makeRemoveButton(loads.length <= 1, () => {
        if (loads.length <= 1) return;
        loads.splice(i, 1);
        onEdit();
        renderAll();
      }),
    );
    loadsBody.append(line);
  });
}

function renderAll() {
  windowStartInput.value = windowStartText;
  windowEndInput.value = windowEndText;
  renderBusyRows(washerBody, washerBusy, "wb");
  renderBusyRows(dryerBody, dryerBusy, "db");
  renderLoadRows();
  addWasherButton.disabled = washerBusy.length >= MAX_BUSY;
  addDryerButton.disabled = dryerBusy.length >= MAX_BUSY;
  addLoadButton.disabled = loads.length >= MAX_LOADS;
  render();
}

// ---- status / error / results -------------------------------------------

function fieldForPath(path) {
  if (path === "/start") return windowStartInput;
  if (path === "/end") return windowEndInput;
  let match = /^\/(washerBusy|dryerBusy)\/(\d+)\/(start|end)$/.exec(path);
  if (match) {
    const map = lastIndexMap[match[1]] || [];
    const stateIdx = map[Number(match[2])] ?? Number(match[2]);
    const prefix = match[1] === "washerBusy" ? "wb" : "db";
    return $(`${prefix}-${stateIdx}-${match[3]}`);
  }
  if (path === "/washerBusy") return $("wb-0-start");
  if (path === "/dryerBusy") return $("db-0-start");
  match = /^\/loads\/(\d+)\/(name|washMin|dryMin|maxWaitMin)$/.exec(path);
  if (match) {
    const map = lastIndexMap.loads || [];
    const stateIdx = map[Number(match[1])] ?? Number(match[1]);
    const field = {
      name: "name",
      washMin: "wash",
      dryMin: "dry",
      maxWaitMin: "wait",
    }[match[2]];
    return $(`load-${stateIdx}-${field}`);
  }
  if (path === "/loads") return $("load-0-name");
  return null;
}

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
  const goButton = el("button", "error-goto secondary");
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

function missingFields() {
  const missing = [];
  if (windowStartText === "") missing.push(strings.startLabel);
  if (windowEndText === "") missing.push(strings.endLabel);
  loads.forEach((row, i) => {
    if (row.name === "") missing.push(`${strings.loadNameLabel} ${i + 1}`);
    if (row.washMin === "") missing.push(`${strings.washLabel} ${i + 1}`);
    if (row.dryMin === "") missing.push(`${strings.dryLabel} ${i + 1}`);
  });
  return missing;
}

function renderTimeline(container, data, result) {
  const span = data.end - data.start;
  if (span <= 0) return;
  const note = text("p", strings.timelineNote, "timeline-note");
  container.append(note);
  const tracks = [
    { label: strings.timelineWasher, busy: data.washerBusy, key: "wash" },
    { label: strings.timelineDryer, busy: data.dryerBusy, key: "dry" },
  ];
  for (const track of tracks) {
    const trackEl = el("div", "track");
    trackEl.append(text("span", track.label, "track-label"));
    const bar = el("div", "track-bar");
    for (const interval of track.busy) {
      const left = Math.max(0, ((interval.start - data.start) / span) * 100);
      const right = Math.min(100, ((interval.end - data.start) / span) * 100);
      if (right <= left) continue;
      const block = el("div", "block block-busy");
      block.style.left = `${left}%`;
      block.style.width = `${right - left}%`;
      block.textContent = strings.timelineBusy;
      bar.append(block);
    }
    for (const row of result.rows) {
      const s = track.key === "wash" ? row.washStart : row.dryStart;
      const e = track.key === "wash" ? row.washEnd : row.dryEnd;
      const left = ((s - data.start) / span) * 100;
      const width = ((e - s) / span) * 100;
      const block = el("div", "block block-load");
      block.style.left = `${left}%`;
      block.style.width = `${width}%`;
      block.textContent = row.name;
      bar.append(block);
    }
    trackEl.append(bar);
    container.append(trackEl);
  }
}

function renderResults(result) {
  resultsEl.textContent = "";
  resultsEl.append(text("h2", strings.resultHeading));
  const summary = result.blockedAt === null
    ? strings.allPlaced.replace("{n}", String(result.rows.length))
    : strings.placedPrefix.replace("{n}", String(result.rows.length));
  resultsEl.append(text("p", summary, "summary"));
  if (lastSubmitted) {
    const timeline = el("div", "timeline");
    timeline.setAttribute("aria-hidden", "true");
    renderTimeline(timeline, lastSubmitted, result);
    resultsEl.append(timeline);
  }
  const table = el("table", "handoff");
  const head = el("tr");
  for (const header of [
    strings.nameHeader,
    strings.washHeader,
    strings.waitHeader,
    strings.dryHeader,
  ]) {
    head.append(text("th", header));
  }
  table.append(head);
  for (const row of result.rows) {
    const line = el("tr");
    line.append(text("td", row.name));
    line.append(
      text("td", `${formatMinutes(row.washStart)}–${formatMinutes(row.washEnd)}`),
    );
    line.append(text("td", `${row.waitMin} ${strings.minutesUnit}`));
    line.append(
      text("td", `${formatMinutes(row.dryStart)}–${formatMinutes(row.dryEnd)}`),
    );
    table.append(line);
  }
  resultsEl.append(table);
  if (result.blockedAt !== null) {
    const notice = el("div", "notice");
    notice.append(text("h2", strings.blockedTitle));
    notice.append(
      text("p", strings.blockedBody.replace("{name}", result.blockedAt)),
    );
    notice.append(text("p", strings.blockedNext));
    resultsEl.append(notice);
  }
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";
  missingEl.textContent = "";

  planButton.disabled = phase === "busy";
  planButton.textContent = phase === "busy" ? `${strings.working}…` : strings.plan;
  cancelButton.hidden = phase !== "busy";

  if (phase === "empty") {
    statusEl.textContent = strings.statusEmpty;
    missingEl.textContent = `${strings.missingLabel}：${missingFields().join("、")}`;
    return;
  }
  if (phase === "dirty") {
    statusEl.textContent = strings.statusDirty;
    const missing = missingFields();
    if (missing.length > 0) {
      missingEl.textContent = `${strings.missingLabel}：${missing.join("、")}`;
    }
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
  renderResults(result);
}

// ---- actions ------------------------------------------------------------

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
  const built = buildDraft();
  if (built.data) lastDraft = built.data;
  flow.edit(lastDraft);
  render();
}

function onSubmit(event) {
  event.preventDefault();
  if (flow.snapshot().phase === "busy") return; // resubmit while busy is ignored
  const built = buildDraft();
  if (built.fieldError) {
    lastIndexMap = built.indexMap;
    flow.fail(built.fieldError);
    render();
    return;
  }
  lastIndexMap = built.indexMap;
  lastDraft = built.data;
  lastSubmitted = built.data;
  flow.edit(built.data);
  runCounter += 1;
  const runId = runCounter;
  activeRunId = runId;
  flow.run(runId);
  render();
  // Pure core runs on the next event-loop work item; an edit or cancel
  // before that item revokes it, and the runId guard drops late replies.
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    activeRunId = null;
    flow.settle(runId);
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
  initialState();
  lastDraft = null;
  lastSubmitted = null;
  lastIndexMap = emptyMap();
  flow.reset();
  renderAll();
  windowStartInput.focus();
}

function onLoadSample() {
  revokePending();
  if (flow.snapshot().phase === "busy") flow.cancel();
  windowStartText = formatMinutes(SAMPLE.start);
  windowEndText = formatMinutes(SAMPLE.end);
  washerBusy = SAMPLE.washerBusy.map((row) => ({
    start: formatMinutes(row.start),
    end: formatMinutes(row.end),
  }));
  dryerBusy = SAMPLE.dryerBusy.map((row) => ({
    start: formatMinutes(row.start),
    end: formatMinutes(row.end),
  }));
  loads = SAMPLE.loads.map((row) => ({
    name: row.name,
    washMin: String(row.washMin),
    dryMin: String(row.dryMin),
    maxWaitMin: String(row.maxWaitMin),
  }));
  lastDraft = {
    start: SAMPLE.start,
    end: SAMPLE.end,
    washerBusy: SAMPLE.washerBusy.map((row) => ({ ...row })),
    dryerBusy: SAMPLE.dryerBusy.map((row) => ({ ...row })),
    loads: SAMPLE.loads.map((row) => ({ ...row })),
  };
  flow.edit(lastDraft);
  renderAll();
}

// ---- init ---------------------------------------------------------------

function init() {
  windowStartInput = $("window-start");
  windowEndInput = $("window-end");
  washerBody = $("washer-body");
  dryerBody = $("dryer-body");
  loadsBody = $("loads-body");
  addWasherButton = $("add-washer");
  addDryerButton = $("add-dryer");
  addLoadButton = $("add-load");
  planButton = $("plan");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  statusEl = $("status");
  missingEl = $("missing");
  errorListEl = $("error-list");
  resultsEl = $("results");

  windowStartInput.addEventListener("input", () => {
    windowStartText = windowStartInput.value;
    onEdit();
  });
  windowEndInput.addEventListener("input", () => {
    windowEndText = windowEndInput.value;
    onEdit();
  });
  addWasherButton.addEventListener("click", () => {
    if (washerBusy.length >= MAX_BUSY) return;
    washerBusy.push({ start: "", end: "" });
    onEdit();
    renderAll();
    const added = $(`wb-${washerBusy.length - 1}-start`);
    if (added) added.focus();
  });
  addDryerButton.addEventListener("click", () => {
    if (dryerBusy.length >= MAX_BUSY) return;
    dryerBusy.push({ start: "", end: "" });
    onEdit();
    renderAll();
    const added = $(`db-${dryerBusy.length - 1}-start`);
    if (added) added.focus();
  });
  addLoadButton.addEventListener("click", () => {
    if (loads.length >= MAX_LOADS) return;
    loads.push({ name: "", washMin: "", dryMin: "", maxWaitMin: "0" });
    onEdit();
    renderAll();
    const added = $(`load-${loads.length - 1}-name`);
    if (added) added.focus();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);

  const form = $("plan-form");
  form.addEventListener("submit", onSubmit);

  // Leaving the page (including a bfcache restore) clears working memory.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) onClear();
  });

  renderAll();
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
