// DOM controller for Parcel Billable Weight. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core (solve,
// flow) is imported, never re-implemented here.
//
// Flow: the form builds a draft, the app checks raw number syntax
// (SYNTAX) and name/range rules via the core, then a valid draft is
// solved on the next event-loop work item (setTimeout 0) under a runId
// guard, so a late or cancelled reply can never overwrite a newer state.
// If the core cannot start (no draft), nothing runs. Blank rows are
// skipped; a partially filled row reports its first bad field.

import { solve, volumeTenths, normalizeName } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// parcel-billable-weight.two-services.
const SAMPLE = {
  parcels: [
    { name: "P", sidesMm: [300, 200, 100], actualG: 1000 },
    { name: "Q", sidesMm: [100, 200, 100], actualG: 750 },
  ],
  services: [
    {
      name: "A",
      divisor: 5000,
      stepG: 500,
      minG: 0,
      maxLengthMm: null,
      maxWrapMm: null,
      maxActualG: null,
    },
    {
      name: "B",
      divisor: 6000,
      stepG: 100,
      minG: 0,
      maxLengthMm: 299,
      maxWrapMm: null,
      maxActualG: null,
    },
  ],
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;
const MAX_PARCEL_ROWS = 12;
const MAX_SERVICE_ROWS = 4;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;
let lastParcelMap = [];
let lastServiceMap = [];

const $ = (id) => document.getElementById(id);

let parcelsBody;
let servicesBody;
let statusEl;
let resultsEl;
let errorListEl;
let updateButton;
let cancelButton;
let clearButton;
let sampleButton;
let addParcelButton;
let addServiceButton;

let rowCounter = 0;
let parcelRows = [];
let serviceRows = [];
let lastValidData = null; // validated snapshot behind the shown result

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

function formatInt(value) {
  return new Intl.NumberFormat(document.documentElement.lang || "en").format(
    value,
  );
}

function formatGrams(value) {
  return new Intl.NumberFormat(document.documentElement.lang || "en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

// ---- row construction -------------------------------------------------

function makeTextInput(id, maxLength) {
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.maxLength = maxLength;
  input.autocomplete = "off";
  return input;
}

function makeParcelRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "parcel";
  const n = parcelRows.length + 1;

  const nameId = `p${id}-name`;
  const nameInput = makeTextInput(nameId, MAX_TEXT_LENGTH);
  nameInput.value = values ? values.name : "";
  const nameWrap = el("div", "field");
  nameWrap.append(
    labelFor(nameId, `${strings.parcelLabel} ${n} · ${strings.nameLabel}`),
    nameInput,
  );

  const sideInputs = [];
  const sideWraps = [];
  for (let k = 0; k < 3; k += 1) {
    const sideId = `p${id}-side${k}`;
    const input = makeTextInput(sideId, 12);
    input.inputMode = "numeric";
    input.value = values ? String(values.sidesMm[k]) : "";
    sideInputs.push(input);
    const wrap = el("div", "field field-narrow");
    wrap.append(
      labelFor(sideId, `${strings.sideLabel} ${k + 1}`),
      input,
    );
    sideWraps.push(wrap);
  }
  const sidesGroup = el("div", "field-group");
  const sidesLabel = el("span", "group-label");
  sidesLabel.textContent = strings.sidesHelp;
  sidesGroup.append(sidesLabel, ...sideWraps);

  const actualId = `p${id}-actual`;
  const actualInput = makeTextInput(actualId, 12);
  actualInput.inputMode = "numeric";
  actualInput.value = values ? String(values.actualG) : "";
  const actualWrap = el("div", "field field-narrow");
  actualWrap.append(labelFor(actualId, strings.actualLabel), actualInput);

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (parcelRows.length <= 1) return;
    row.remove();
    parcelRows = parcelRows.filter((r) => r.element !== row);
    onEdit();
    refreshRowButtons();
  });

  row.append(nameWrap, sidesGroup, actualWrap, removeButton);
  const controls = {
    element: row,
    nameInput,
    sideInputs,
    actualInput,
    removeButton,
  };
  parcelRows.push(controls);
  return controls;
}

function makeServiceRow(values) {
  const id = rowCounter;
  rowCounter += 1;
  const row = el("div", "row");
  row.dataset.kind = "service";
  const n = serviceRows.length + 1;

  const nameId = `s${id}-name`;
  const nameInput = makeTextInput(nameId, MAX_TEXT_LENGTH);
  nameInput.value = values ? values.name : "";
  const nameWrap = el("div", "field");
  nameWrap.append(
    labelFor(nameId, `${strings.serviceLabel} ${n} · ${strings.nameLabel}`),
    nameInput,
  );

  function numberField(key, label, value, optional) {
    const fieldId = `s${id}-${key}`;
    const input = makeTextInput(fieldId, 12);
    input.inputMode = "numeric";
    input.value = value === null || value === undefined ? "" : String(value);
    if (optional) input.placeholder = strings.optionalLabel;
    const wrap = el("div", "field field-narrow");
    wrap.append(labelFor(fieldId, label), input);
    return { wrap, input };
  }

  const divisor = numberField("divisor", strings.divisorLabel, values ? values.divisor : "");
  const step = numberField("step", strings.stepLabel, values ? values.stepG : "");
  const min = numberField("min", strings.minLabel, values ? values.minG : "0");
  const maxLength = numberField(
    "maxLength",
    strings.maxLengthLabel,
    values ? values.maxLengthMm : null,
    true,
  );
  const maxWrap = numberField(
    "maxWrap",
    strings.maxWrapLabel,
    values ? values.maxWrapMm : null,
    true,
  );
  const maxActual = numberField(
    "maxActual",
    strings.maxActualLabel,
    values ? values.maxActualG : null,
    true,
  );

  const removeButton = el("button", "remove-row");
  removeButton.type = "button";
  removeButton.textContent = strings.removeRow;
  removeButton.addEventListener("click", () => {
    if (serviceRows.length <= 1) return;
    row.remove();
    serviceRows = serviceRows.filter((r) => r.element !== row);
    onEdit();
    refreshRowButtons();
  });

  row.append(
    nameWrap,
    divisor.wrap,
    step.wrap,
    min.wrap,
    maxLength.wrap,
    maxWrap.wrap,
    maxActual.wrap,
    removeButton,
  );
  const controls = {
    element: row,
    nameInput,
    divisorInput: divisor.input,
    stepInput: step.input,
    minInput: min.input,
    maxLengthInput: maxLength.input,
    maxWrapInput: maxWrap.input,
    maxActualInput: maxActual.input,
    removeButton,
  };
  serviceRows.push(controls);
  return controls;
}

function refreshRowButtons() {
  for (const r of parcelRows) r.removeButton.disabled = parcelRows.length <= 1;
  for (const r of serviceRows) r.removeButton.disabled = serviceRows.length <= 1;
  addParcelButton.disabled = parcelRows.length >= MAX_PARCEL_ROWS;
  addServiceButton.disabled = serviceRows.length >= MAX_SERVICE_ROWS;
}

// ---- draft building ---------------------------------------------------

function isBlankParcelRow(r) {
  return (
    r.nameInput.value === "" &&
    r.sideInputs.every((input) => input.value === "") &&
    r.actualInput.value === ""
  );
}

function isBlankServiceRow(r) {
  return (
    r.nameInput.value === "" &&
    r.divisorInput.value === "" &&
    r.stepInput.value === "" &&
    r.maxLengthInput.value === "" &&
    r.maxWrapInput.value === "" &&
    r.maxActualInput.value === ""
  );
}

// Builds the core data object from the form, in row order. Blank rows
// are skipped (lastParcelMap / lastServiceMap record which DOM row each
// built index came from, so error paths still focus the right field).
// Returns {data} or {fieldError:{code,path}} for the first raw-syntax
// problem. Name rules and duplicates are left to solve().
function buildDraft() {
  const parcels = [];
  lastParcelMap = [];
  for (let i = 0; i < parcelRows.length; i += 1) {
    const r = parcelRows[i];
    if (isBlankParcelRow(r)) continue;
    const index = parcels.length;
    const base = `/parcels/${index}`;
    const sidesMm = [];
    for (let k = 0; k < 3; k += 1) {
      const raw = r.sideInputs[k].value;
      if (!INTEGER_SYNTAX.test(raw)) {
        return { fieldError: { code: "SYNTAX", path: `${base}/sidesMm/${k}` } };
      }
      sidesMm.push(Number(raw));
    }
    if (!INTEGER_SYNTAX.test(r.actualInput.value)) {
      return { fieldError: { code: "SYNTAX", path: `${base}/actualG` } };
    }
    parcels.push({
      name: r.nameInput.value,
      sidesMm,
      actualG: Number(r.actualInput.value),
    });
    lastParcelMap.push(i);
  }

  const services = [];
  lastServiceMap = [];
  for (let j = 0; j < serviceRows.length; j += 1) {
    const r = serviceRows[j];
    if (isBlankServiceRow(r)) continue;
    const index = services.length;
    const base = `/services/${index}`;
    function requiredNumber(input, key) {
      if (!INTEGER_SYNTAX.test(input.value)) {
        return { fieldError: { code: "SYNTAX", path: `${base}/${key}` } };
      }
      return { value: Number(input.value) };
    }
    function optionalNumber(input, key) {
      if (input.value === "") return { value: null };
      if (!INTEGER_SYNTAX.test(input.value)) {
        return { fieldError: { code: "SYNTAX", path: `${base}/${key}` } };
      }
      return { value: Number(input.value) };
    }
    const divisor = requiredNumber(r.divisorInput, "divisor");
    if (divisor.fieldError) return divisor;
    const step = requiredNumber(r.stepInput, "stepG");
    if (step.fieldError) return step;
    const min = requiredNumber(r.minInput, "minG");
    if (min.fieldError) return min;
    const maxLength = optionalNumber(r.maxLengthInput, "maxLengthMm");
    if (maxLength.fieldError) return maxLength;
    const maxWrap = optionalNumber(r.maxWrapInput, "maxWrapMm");
    if (maxWrap.fieldError) return maxWrap;
    const maxActual = optionalNumber(r.maxActualInput, "maxActualG");
    if (maxActual.fieldError) return maxActual;
    services.push({
      name: r.nameInput.value,
      divisor: divisor.value,
      stepG: step.value,
      minG: min.value,
      maxLengthMm: maxLength.value,
      maxWrapMm: maxWrap.value,
      maxActualG: maxActual.value,
    });
    lastServiceMap.push(j);
  }

  return { data: { parcels, services } };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  const parcelMatch = /^\/parcels(?:\/(\d+)(?:\/(name|sidesMm|actualG)(?:\/(\d+))?)?)?$/.exec(path);
  if (parcelMatch) {
    const builtIndex = parcelMatch[1] === undefined ? 0 : Number(parcelMatch[1]);
    const domIndex = lastParcelMap[builtIndex] ?? builtIndex;
    const r = parcelRows[domIndex] || parcelRows[0];
    if (!r) return null;
    if (parcelMatch[2] === "sidesMm") {
      const k = parcelMatch[3] === undefined ? 0 : Number(parcelMatch[3]);
      return r.sideInputs[k] || r.sideInputs[0];
    }
    if (parcelMatch[2] === "actualG") return r.actualInput;
    return r.nameInput;
  }
  const serviceMatch = /^\/services(?:\/(\d+)(?:\/(name|divisor|stepG|minG|maxLengthMm|maxWrapMm|maxActualG))?)?$/.exec(path);
  if (serviceMatch) {
    const builtIndex = serviceMatch[1] === undefined ? 0 : Number(serviceMatch[1]);
    const domIndex = lastServiceMap[builtIndex] ?? builtIndex;
    const r = serviceRows[domIndex] || serviceRows[0];
    if (!r) return null;
    switch (serviceMatch[2]) {
      case "divisor": return r.divisorInput;
      case "stepG": return r.stepInput;
      case "minG": return r.minInput;
      case "maxLengthMm": return r.maxLengthInput;
      case "maxWrapMm": return r.maxWrapInput;
      case "maxActualG": return r.maxActualInput;
      default: return r.nameInput;
    }
  }
  if (path === "") return parcelRows[0] ? parcelRows[0].nameInput : null;
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
  head.append(
    codeEl,
    document.createTextNode(` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})`),
  );
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

function renderResults(result) {
  resultsEl.textContent = "";
  const heading = text("h2", strings.resultHeading);
  resultsEl.append(heading);
  for (const service of result.services) {
    const section = el("section", "service-result");
    const title = text("h3", `${strings.serviceHeading} ${service.name}`);
    section.append(title);
    if (service.totalChargeG === null) {
      const note = text("p", strings.noTotalNote, "notice");
      section.append(note);
    } else {
      const total = text(
        "p",
        `${strings.totalLabel}：${formatInt(service.totalChargeG)} ${strings.totalUnit}`,
        "total",
      );
      section.append(total);
    }
    const table = el("table");
    const headRow = el("tr");
    for (const header of [
      strings.pieceNameHeader,
      strings.sidesHeader,
      strings.volumeHeader,
      strings.wrapHeader,
      strings.reasonsHeader,
      strings.chargeHeader,
    ]) {
      const th = el("th");
      th.scope = "col";
      th.textContent = header;
      headRow.append(th);
    }
    const thead = el("thead");
    thead.append(headRow);
    table.append(thead);
    const tbody = el("tbody");
    for (const piece of service.pieces) {
      const tr = el("tr");
      const nameCell = text("td", piece.name);
      // The core result carries no sides (SPEC-fixed shape); the sorted
      // sides come from the validated draft behind this result.
      const source = lastValidData
        ? lastValidData.parcels.find((p) => {
            const n = normalizeName(p.name);
            return n.ok && n.name === piece.name;
          })
        : null;
      const sidesText = source
        ? [...source.sidesMm].sort((a, b) => b - a).map((v) => formatInt(v)).join(" × ")
        : "—";
      const sidesCell = text("td", sidesText, "numeric");
      const volumeCell = text(
        "td",
        formatGrams(volumeTenths(piece.volumeNumerator, piece.volumeDenominator) / 10),
        "numeric",
      );
      const wrapCell = text("td", formatInt(piece.wrapMm), "numeric");
      const reasonsCell = text(
        "td",
        piece.reasons.length === 0
          ? strings.reasonsNone
          : piece.reasons.map((code) => strings.reasonNames[code]).join("、"),
      );
      const chargeCell = text(
        "td",
        piece.chargeG === null ? strings.chargeNone : formatInt(piece.chargeG),
        "numeric",
      );
      tr.append(nameCell, sidesCell, volumeCell, wrapCell, reasonsCell, chargeCell);
      tbody.append(tr);
    }
    table.append(tbody);
    section.append(table);
    resultsEl.append(section);
  }
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  updateButton.disabled = phase === "busy";
  updateButton.textContent =
    phase === "busy" ? `${strings.working}…` : strings.update;
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

function collectRaw() {
  const built = buildDraft();
  // buildDraft returns the validated shape when possible; for the dirty
  // draft we keep the raw form values (names as typed, numbers as
  // strings) so edits never lose input. Only a fully valid draft is
  // stored as data; otherwise store the raw rows.
  if (built.data) return built.data;
  return {
    parcels: parcelRows.map((r) => ({
      name: r.nameInput.value,
      sidesMm: r.sideInputs.map((input) => input.value),
      actualG: r.actualInput.value,
    })),
    services: serviceRows.map((r) => ({
      name: r.nameInput.value,
      divisor: r.divisorInput.value,
      stepG: r.stepInput.value,
      minG: r.minInput.value,
      maxLengthMm: r.maxLengthInput.value,
      maxWrapMm: r.maxWrapInput.value,
      maxActualG: r.maxActualInput.value,
    })),
  };
}

function onEdit() {
  // Every edit clears the old result and invalidates the active runId.
  if (flow.snapshot().phase === "busy") {
    revokePending();
    flow.cancel();
  }
  flow.edit(collectRaw());
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
  const checked = solve(built.data);
  if (checked.status !== "ok") {
    flow.edit(built.data);
    flow.fail(checked.error);
    render();
    return;
  }
  flow.edit(built.data);
  lastValidData = built.data;
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

function initialState() {
  parcelsBody.textContent = "";
  servicesBody.textContent = "";
  parcelRows = [];
  serviceRows = [];
  parcelsBody.append(makeParcelRow().element);
  servicesBody.append(makeServiceRow().element);
  refreshRowButtons();
}

function onClear() {
  revokePending();
  lastValidData = null;
  initialState();
  flow.reset();
  render();
  const first = parcelsBody.querySelector("input");
  if (first) first.focus();
}

function onLoadSample() {
  revokePending();
  if (flow.snapshot().phase === "busy") flow.cancel();
  parcelsBody.textContent = "";
  servicesBody.textContent = "";
  parcelRows = [];
  serviceRows = [];
  for (const parcel of SAMPLE.parcels) {
    parcelsBody.append(makeParcelRow(parcel).element);
  }
  for (const service of SAMPLE.services) {
    servicesBody.append(makeServiceRow(service).element);
  }
  refreshRowButtons();
  lastValidData = SAMPLE;
  flow.edit(SAMPLE);
  render();
}

// ---- init ---------------------------------------------------------------

function init() {
  parcelsBody = $("parcels-body");
  servicesBody = $("services-body");
  statusEl = $("status");
  resultsEl = $("results");
  errorListEl = $("error-list");
  updateButton = $("update");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  addParcelButton = $("add-parcel");
  addServiceButton = $("add-service");

  initialState();

  const form = $("parcel-form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", () => onEdit());
  form.addEventListener("change", () => onEdit());
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);
  addParcelButton.addEventListener("click", () => {
    if (parcelRows.length >= MAX_PARCEL_ROWS) return;
    parcelsBody.append(makeParcelRow().element);
    onEdit();
    refreshRowButtons();
  });
  addServiceButton.addEventListener("click", () => {
    if (serviceRows.length >= MAX_SERVICE_ROWS) return;
    servicesBody.append(makeServiceRow().element);
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
