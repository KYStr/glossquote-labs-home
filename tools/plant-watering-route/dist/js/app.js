// DOM controller for Plant Watering Route. All user text is rendered with
// textContent / value only; never inserted as HTML. The pure core (solve,
// flow, i18n) is imported, never re-implemented here.
//
// Flow: the form builds a draft from its state model, the app checks raw
// integer syntax (SYNTAX) and then core validate() runs for the rest.
// A valid draft is solved on the next event-loop work item (setTimeout 0)
// under a runId guard, so an edit or cancel before that item revokes the
// scheduled work and a late reply can never revive a result.

import { validate } from "./core/solve.mjs";
import { createFlow } from "./core/flow.mjs";
import { stringsFor } from "./core/i18n.mjs";

// Fixed sample data: identical to the SPEC fixture
// plant-watering-route.farthest.
const SAMPLE = {
  capacityMl: 1000,
  plants: [
    { name: "A", amountMl: 350, tapBefore: false },
    { name: "B", amountMl: 300, tapBefore: true },
    { name: "C", amountMl: 300, tapBefore: true },
    { name: "D", amountMl: 500, tapBefore: false },
  ],
};

const INTEGER_SYNTAX = /^(0|[1-9][0-9]*)$/;
const MAX_TEXT_LENGTH = 128;
const MAX_PLANTS = 60;
const MIN_PLANTS = 1;

const flow = createFlow();
let strings = stringsFor(document.documentElement.lang || "en");
let runCounter = 0;
let activeRunId = null;
let pendingTimer = null;
let lastValidData = null;
let numberFormat = new Intl.NumberFormat(
  document.documentElement.lang || "en",
);

// State model: raw form values. Amounts stay strings until submit, when
// the SYNTAX check turns them into integers.
let capacityText = "";
let plants = [{ name: "", amountMl: "", tapBefore: false }];

const $ = (id) => document.getElementById(id);

let capacityInput;
let plantsBody;
let addPlantButton;
let planButton;
let cancelButton;
let clearButton;
let sampleButton;
let statusEl;
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
  capacityText = "";
  plants = [{ name: "", amountMl: "", tapBefore: false }];
}

// ---- rendering ----------------------------------------------------------

function renderPlants() {
  plantsBody.textContent = "";
  plants.forEach((plant, i) => {
    const row = el("div", "row plant-row");
    const nameId = `plant-${i}-name`;
    const nameWrap = el("div", "field");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = nameId;
    nameInput.maxLength = MAX_TEXT_LENGTH;
    nameInput.autocomplete = "off";
    nameInput.value = plant.name;
    nameInput.addEventListener("input", () => {
      plants[i].name = nameInput.value;
      onEdit();
    });
    nameWrap.append(labelFor(nameId, `${strings.plantLabel} ${i + 1}`), nameInput);

    const amountId = `plant-${i}-amount`;
    const amountWrap = el("div", "field field-narrow");
    const amountInput = document.createElement("input");
    amountInput.type = "text";
    amountInput.id = amountId;
    amountInput.inputMode = "numeric";
    amountInput.maxLength = 12;
    amountInput.autocomplete = "off";
    amountInput.value = plant.amountMl;
    amountInput.addEventListener("input", () => {
      plants[i].amountMl = amountInput.value;
      onEdit();
    });
    amountWrap.append(labelFor(amountId, strings.amountLabel), amountInput);

    const tapId = `plant-${i}-tap`;
    const tapWrap = el("div", "field field-check");
    const tapInput = document.createElement("input");
    tapInput.type = "checkbox";
    tapInput.id = tapId;
    tapInput.checked = plant.tapBefore;
    tapInput.addEventListener("change", () => {
      plants[i].tapBefore = tapInput.checked;
      onEdit();
    });
    tapWrap.append(tapInput, labelFor(tapId, strings.tapLabel));

    const removeButton = el("button", "remove-row");
    removeButton.type = "button";
    removeButton.textContent = strings.removeRow;
    removeButton.disabled = plants.length <= MIN_PLANTS;
    removeButton.addEventListener("click", () => {
      if (plants.length <= MIN_PLANTS) return;
      plants.splice(i, 1);
      onEdit();
      renderAll();
    });
    row.append(nameWrap, amountWrap, tapWrap, removeButton);
    plantsBody.append(row);
  });
  addPlantButton.disabled = plants.length >= MAX_PLANTS;
}

function renderAll() {
  capacityInput.value = capacityText;
  renderPlants();
  render();
}

// ---- draft building -----------------------------------------------------

// Builds the core data object from the state model. Returns {data} or
// {fieldError:{code,path}} for the first raw-syntax problem. Name fields
// are passed through raw so core normalizeName reports RANGE/TYPE for
// them, exactly as solve() would.
function buildDraft() {
  if (!INTEGER_SYNTAX.test(capacityText)) {
    return { fieldError: { code: "SYNTAX", path: "/capacityMl" } };
  }
  const plantData = [];
  for (let i = 0; i < plants.length; i += 1) {
    if (!INTEGER_SYNTAX.test(plants[i].amountMl)) {
      return {
        fieldError: { code: "SYNTAX", path: `/plants/${i}/amountMl` },
      };
    }
    plantData.push({
      name: plants[i].name,
      amountMl: Number(plants[i].amountMl),
      tapBefore: plants[i].tapBefore,
    });
  }
  return { data: { capacityMl: Number(capacityText), plants: plantData } };
}

function rawDraft() {
  return {
    capacityMl: capacityText,
    plants: plants.map((p) => ({
      name: p.name,
      amountMl: p.amountMl,
      tapBefore: p.tapBefore,
    })),
  };
}

// Map an error path to the form control it belongs to (for focus and
// inline marking). Returns the element or null.
function fieldForPath(path) {
  if (path === "/capacityMl") return capacityInput;
  if (path === "/plants") return $("plant-0-name");
  let match = /^\/plants\/(\d+)$/.exec(path);
  if (match) return $(`plant-${Number(match[1])}-name`);
  match = /^\/plants\/(\d+)\/name$/.exec(path);
  if (match) return $(`plant-${Number(match[1])}-name`);
  match = /^\/plants\/(\d+)\/amountMl$/.exec(path);
  if (match) return $(`plant-${Number(match[1])}-amount`);
  match = /^\/plants\/(\d+)\/tapBefore$/.exec(path);
  if (match) return $(`plant-${Number(match[1])}-tap`);
  return null;
}

// ---- rendering state ----------------------------------------------------

function clearMarks() {
  for (const input of document.querySelectorAll("[aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
  }
  errorListEl.textContent = "";
  errorListEl.hidden = true;
}

function showError(error) {
  const message = strings.errors[error.code] || strings.errors.TYPE;
  const fix = strings.errorFixes[error.code] || strings.errorFixes.TYPE;
  const item = el("div", "error-item");
  const head = el("p");
  const codeEl = text("code", error.code);
  head.append(
    codeEl,
    document.createTextNode(` · ${error.path || "/"} (${strings.codeLabel} / ${strings.pathLabel})`),
  );
  item.append(head);
  item.append(text("p", message));
  item.append(text("p", `${strings.errorFix}：${fix}`));
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
  item.append(goButton);
  errorListEl.append(item);
  errorListEl.hidden = false;
  if (target) target.focus();
}

function renderResults(result) {
  resultsEl.textContent = "";
  resultsEl.append(text("h2", strings.resultHeading));

  const amountByName = new Map();
  if (lastValidData) {
    for (const plant of lastValidData.plants) {
      amountByName.set(plant.name, plant.amountMl);
    }
  }
  const refillByBefore = new Map();
  for (const refill of result.refills) {
    refillByBefore.set(refill.before, refill);
  }

  const table = el("table", "route");
  const thead = el("thead");
  const headerRow = el("tr");
  for (const header of [
    strings.plantHeader,
    strings.amountHeader,
    strings.leftHeader,
  ]) {
    headerRow.append(text("th", header));
  }
  thead.append(headerRow);
  table.append(thead);
  const tbody = el("tbody");
  const renderedRefills = new Set();

  function refillRow(refill) {
    const tr = el("tr", "refill-row");
    const td = el("td");
    td.colSpan = 3;
    td.textContent = strings.refillText
      .replace("{name}", refill.before)
      .replace("{ml}", numberFormat.format(refill.addMl));
    tr.append(td);
    return tr;
  }

  for (const row of result.plants) {
    const refill = refillByBefore.get(row.name);
    if (refill) {
      tbody.append(refillRow(refill));
      renderedRefills.add(refill.before);
    }
    const tr = el("tr");
    tr.append(text("td", row.name));
    const amount = amountByName.get(row.name);
    tr.append(
      text("td", amount === undefined ? "" : numberFormat.format(amount)),
    );
    tr.append(text("td", numberFormat.format(row.leftMl)));
    tbody.append(tr);
  }
  // A refill can precede the blocked plant itself (a plant larger than
  // a full can): render it after the completed rows, above the notice.
  for (const refill of result.refills) {
    if (!renderedRefills.has(refill.before)) {
      tbody.append(refillRow(refill));
      renderedRefills.add(refill.before);
    }
  }
  table.append(tbody);
  resultsEl.append(table);

  if (result.blockedAt === null) {
    resultsEl.append(
      text(
        "p",
        strings.completeSummary.replace("{n}", String(result.refills.length)),
        "notice-inline",
      ),
    );
  } else {
    resultsEl.append(
      text(
        "p",
        strings.refillCount.replace("{n}", String(result.refills.length)),
        "notice-inline",
      ),
    );
    const notice = el("div", "notice-blocked");
    notice.append(
      text(
        "h3",
        strings.blockedTitle.replace("{name}", result.blockedAt),
      ),
    );
    const blockedAmount = amountByName.get(result.blockedAt);
    const need = blockedAmount === undefined ? result.missingMl : blockedAmount;
    const have = need - result.missingMl;
    notice.append(
      text(
        "p",
        strings.blockedBody
          .replace("{need}", numberFormat.format(need))
          .replace("{have}", numberFormat.format(have))
          .replace("{missing}", numberFormat.format(result.missingMl)),
      ),
    );
    notice.append(text("p", strings.blockedNext));
    resultsEl.append(notice);
  }
}

function render() {
  const { phase, result, error } = flow.snapshot();
  clearMarks();
  resultsEl.textContent = "";

  planButton.disabled = phase === "busy";
  planButton.textContent =
    phase === "busy" ? `${strings.working}…` : strings.plan;
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

function onEdit() {
  // Every edit clears the old result and invalidates the active runId.
  if (flow.snapshot().phase === "busy") {
    revokePending();
    flow.cancel();
  }
  flow.edit(rawDraft());
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
  const checked = validate(built.data);
  if (!checked.ok) {
    flow.edit(built.data);
    flow.fail(checked.reply.error);
    render();
    return;
  }
  lastValidData = checked.data;
  flow.edit(checked.data);
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
  lastValidData = null;
  initialState();
  flow.reset();
  renderAll();
  if (capacityInput) capacityInput.focus();
}

function onLoadSample() {
  revokePending();
  if (flow.snapshot().phase === "busy") flow.cancel();
  capacityText = String(SAMPLE.capacityMl);
  plants = SAMPLE.plants.map((p) => ({
    name: p.name,
    amountMl: String(p.amountMl),
    tapBefore: p.tapBefore,
  }));
  flow.edit({
    capacityMl: SAMPLE.capacityMl,
    plants: SAMPLE.plants.map((p) => ({ ...p })),
  });
  renderAll();
}

// ---- init ---------------------------------------------------------------

function init() {
  capacityInput = $("capacity");
  plantsBody = $("plants-body");
  addPlantButton = $("add-plant");
  planButton = $("plan");
  cancelButton = $("cancel");
  clearButton = $("clear-draft");
  sampleButton = $("load-sample");
  statusEl = $("status");
  errorListEl = $("error-list");
  resultsEl = $("results");

  capacityInput.addEventListener("input", () => {
    capacityText = capacityInput.value;
    onEdit();
  });
  addPlantButton.addEventListener("click", () => {
    if (plants.length >= MAX_PLANTS) return;
    plants.push({ name: "", amountMl: "", tapBefore: false });
    onEdit();
    renderAll();
    const added = $(`plant-${plants.length - 1}-name`);
    if (added) added.focus();
  });
  cancelButton.addEventListener("click", onCancel);
  clearButton.addEventListener("click", onClear);
  sampleButton.addEventListener("click", onLoadSample);

  const form = $("water-form");
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
