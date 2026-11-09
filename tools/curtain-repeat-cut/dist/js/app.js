import { createFlow, emptyDraft, SAMPLE_DRAFT } from "./core/curtain-repeat-cut.mjs";
import { STRINGS } from "./i18n.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const fmt = new Intl.NumberFormat(lang === "en" ? "en-US" : "zh-Hant-TW");
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const MAX_PANELS = 16;

const flow = createFlow();
let runCounter = 0;

const $ = (id) => document.querySelector(`#${id}`);
const form = $("cut-form");
const panelsEl = $("panels");
const planButton = $("plan");
const cancelButton = $("cancel");
const clearButton = $("clear-draft");
const sampleButton = $("load-sample");
const addButton = $("add-panel");
const errorEl = $("error");
const statusEl = $("status");
const resultsEl = $("results");
const shortageNoteEl = $("shortage-note");
const trialNoteEl = $("trial-note");
const rulerEl = $("ruler");
const cutsBody = $("cuts-body");

const FIELD_META = [
  { key: "stockMm", id: "stock-mm", min: 1, max: 100000 },
  { key: "repeatMm", id: "repeat-mm", min: 0, max: 5000 },
  { key: "headPhaseMm", id: "head-phase-mm", min: 0, max: 4999 },
  { key: "motifPhaseMm", id: "motif-phase-mm", min: 0, max: 4999 },
];

const PANEL_FIELD_META = [
  { key: "name", suffix: "name", kind: "text" },
  { key: "finishedMm", suffix: "finished", kind: "number", min: 1, max: 8000 },
  { key: "topMm", suffix: "top", kind: "number", min: 0, max: 1000 },
  { key: "bottomMm", suffix: "bottom", kind: "number", min: 0, max: 1000 },
];

function panelFieldId(index, suffix) {
  return `${suffix}-${index}`;
}

function panelFieldLabel(index, suffix) {
  const key = PANEL_FIELD_META.find((m) => m.suffix === suffix).key;
  return `${t.panelLegend.replace("{n}", String(index + 1))} — ${t[key]}`;
}

function createPanelRow(index, panel) {
  const row = document.createElement("div");
  row.className = "panel-row";
  row.dataset.index = String(index);

  const legend = document.createElement("h3");
  legend.textContent = t.panelLegend.replace("{n}", String(index + 1));
  row.appendChild(legend);

  for (const meta of PANEL_FIELD_META) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    const id = panelFieldId(index, meta.suffix);
    label.htmlFor = id;
    label.textContent = t[meta.key];
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    if (meta.kind === "text") {
      input.type = "text";
      input.maxLength = 128;
      input.autocomplete = "off";
      input.value = panel.name ?? "";
    } else {
      input.type = "text";
      input.inputMode = "numeric";
      input.maxLength = 12;
      input.autocomplete = "off";
      input.value = panel[meta.key] == null ? "" : String(panel[meta.key]);
    }
    wrap.appendChild(label);
    wrap.appendChild(input);
    row.appendChild(wrap);
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.id = `remove-${index}`;
  remove.className = "remove-panel";
  remove.textContent = t.removePanel;
  remove.addEventListener("click", () => {
    row.remove();
    reindexPanels();
    onEdit();
  });
  row.appendChild(remove);
  return row;
}

function reindexPanels() {
  const rows = [...panelsEl.querySelectorAll(".panel-row")];
  rows.forEach((row, index) => {
    row.dataset.index = String(index);
    row.querySelector("h3").textContent = t.panelLegend.replace("{n}", String(index + 1));
    const inputs = row.querySelectorAll("input");
    PANEL_FIELD_META.forEach((meta, i) => {
      const input = inputs[i];
      const id = panelFieldId(index, meta.suffix);
      input.id = id;
      input.name = id;
      row.querySelectorAll("label")[i].htmlFor = id;
    });
    row.querySelector(".remove-panel").id = `remove-${index}`;
  });
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const rows = panelsEl.querySelectorAll(".panel-row");
  rows.forEach((row) => {
    row.querySelector(".remove-panel").disabled = rows.length <= 1;
  });
  addButton.disabled = rows.length >= MAX_PANELS;
}

function readPanelsLoose() {
  return [...panelsEl.querySelectorAll(".panel-row")].map((row) => {
    const inputs = row.querySelectorAll("input");
    const out = {};
    PANEL_FIELD_META.forEach((meta, i) => {
      const raw = inputs[i].value;
      if (meta.kind === "text") {
        out[meta.key] = raw;
      } else if (raw === "" || !INTEGER_PATTERN.test(raw)) {
        out[meta.key] = null;
      } else {
        out[meta.key] = Number(raw);
      }
    });
    return out;
  });
}

function readDraft() {
  const errors = [];
  const draft = { panels: readPanelsLoose() };
  for (const meta of FIELD_META) {
    const input = $(meta.id);
    const raw = input.value;
    if (raw === "") {
      errors.push({ code: "required", path: `/${meta.key}`, fieldId: meta.id, label: t[meta.key] });
      draft[meta.key] = null;
    } else if (!INTEGER_PATTERN.test(raw)) {
      errors.push({ code: "badInteger", path: `/${meta.key}`, fieldId: meta.id, label: t[meta.key] });
      draft[meta.key] = null;
    } else {
      draft[meta.key] = Number(raw);
    }
  }
  draft.panels.forEach((panel, i) => {
    PANEL_FIELD_META.forEach((meta) => {
      const id = panelFieldId(i, meta.suffix);
      if (meta.kind === "text") {
        if (panel[meta.key] === "") {
          errors.push({ code: "required", path: `/panels/${i}/${meta.key}`, fieldId: id, label: panelFieldLabel(i, meta.suffix) });
        }
      } else if (panel[meta.key] === null) {
        const input = $(id);
        errors.push({
          code: input.value === "" ? "required" : "badInteger",
          path: `/panels/${i}/${meta.key}`,
          fieldId: id,
          label: panelFieldLabel(i, meta.suffix),
        });
      }
    });
  });
  return { draft, errors };
}

function pathToField(error) {
  const path = error.path || "";
  const root = path.match(/^\/(stockMm|repeatMm|headPhaseMm|motifPhaseMm)$/);
  if (root) {
    const meta = FIELD_META.find((m) => m.key === root[1]);
    return { fieldId: meta.id, label: t[meta.key] };
  }
  if (path === "/panels") {
    return { fieldId: "add-panel", label: t.panelsLegend };
  }
  const panel = path.match(/^\/panels\/(\d+)\/(name|finishedMm|topMm|bottomMm)$/);
  if (panel) {
    const index = Number(panel[1]);
    const meta = PANEL_FIELD_META.find((m) => m.key === panel[2]);
    return { fieldId: panelFieldId(index, meta.suffix), label: panelFieldLabel(index, meta.suffix) };
  }
  return { fieldId: "stock-mm", label: t.stockMm };
}

function showError(error) {
  const { fieldId, label } = pathToField(error);
  errorEl.replaceChildren();
  const heading = document.createElement("strong");
  heading.textContent = t.errorHeading;
  errorEl.appendChild(heading);
  errorEl.appendChild(document.createTextNode(" "));
  const message = document.createElement("span");
  message.textContent = t.errors[error.code] || t.errors.TYPE;
  errorEl.appendChild(message);
  errorEl.appendChild(document.createTextNode(" "));
  const link = document.createElement("a");
  link.href = `#${fieldId}`;
  link.textContent = label;
  errorEl.appendChild(link);
  errorEl.hidden = false;
  const target = $(fieldId);
  if (target && target.tagName === "INPUT") {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-describedby", "error");
    target.focus();
  } else if (target) {
    target.focus();
  }
}

function clearError() {
  errorEl.replaceChildren();
  errorEl.hidden = true;
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  form.querySelectorAll("[aria-describedby]").forEach((el) => el.removeAttribute("aria-describedby"));
}

function setText(id, value) {
  const el = $(id);
  el.textContent = value;
}

function renderResults(result) {
  setText("summary-needed", `${fmt.format(result.neededMm)} ${t.unitMm}`);
  setText("summary-waste", `${fmt.format(result.wasteMm)} ${t.unitMm}`);
  setText("summary-spare", `${fmt.format(result.spareMm)} ${t.unitMm}`);
  setText("summary-shortage", `${fmt.format(result.shortageMm)} ${t.unitMm}`);
  shortageNoteEl.hidden = result.shortageMm === 0;
  trialNoteEl.hidden = result.shortageMm === 0;

  cutsBody.replaceChildren();
  for (const cut of result.cuts) {
    const tr = document.createElement("tr");
    for (const value of [cut.name, fmt.format(cut.skipMm), fmt.format(cut.startMm), fmt.format(cut.endMm)]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    cutsBody.appendChild(tr);
  }

  const scale = Math.max(result.neededMm, Number($("stock-mm").value || 0));
  rulerEl.replaceChildren();
  for (const cut of result.cuts) {
    if (cut.skipMm > 0) {
      const gap = document.createElement("div");
      gap.className = "ruler-skip";
      gap.style.width = `${(cut.skipMm / scale) * 100}%`;
      gap.textContent = `+${fmt.format(cut.skipMm)}`;
      rulerEl.appendChild(gap);
    }
    const seg = document.createElement("div");
    seg.className = "ruler-cut";
    seg.style.width = `${((cut.endMm - cut.startMm) / scale) * 100}%`;
    seg.textContent = `${cut.name} ${fmt.format(cut.startMm)}–${fmt.format(cut.endMm)}`;
    rulerEl.appendChild(seg);
  }
  resultsEl.hidden = false;
}

function render() {
  const state = flow.state();
  if (state.phase === "busy") {
    planButton.disabled = true;
    planButton.textContent = t.working;
    cancelButton.hidden = false;
    statusEl.textContent = t.working;
    return;
  }
  planButton.disabled = false;
  planButton.textContent = t.plan;
  cancelButton.hidden = true;
  if (state.phase === "empty") {
    clearError();
    resultsEl.hidden = true;
    statusEl.textContent = t.emptyStatus;
  } else if (state.phase === "dirty") {
    clearError();
    resultsEl.hidden = true;
    statusEl.textContent = t.dirtyStatus;
  } else if (state.phase === "ready") {
    clearError();
    statusEl.textContent = t.readyStatus;
    renderResults(state.result);
  } else if (state.phase === "error") {
    resultsEl.hidden = true;
    statusEl.textContent = "";
    if (state.error) showError(state.error);
  }
}

function onEdit() {
  const { draft } = readDraft();
  flow.edit(draft);
  render();
}

function fillForm(draft) {
  for (const meta of FIELD_META) {
    $(meta.id).value = draft[meta.key] == null ? "" : String(draft[meta.key]);
  }
  panelsEl.replaceChildren();
  draft.panels.forEach((panel, i) => {
    panelsEl.appendChild(createPanelRow(i, panel));
  });
  updateRemoveButtons();
}

form.addEventListener("input", onEdit);

planButton.addEventListener("click", () => {
  const { draft, errors } = readDraft();
  if (errors.length > 0) {
    flow.fail(errors[0]);
    render();
    return;
  }
  flow.edit(draft);
  runCounter += 1;
  const runId = runCounter;
  flow.run(runId);
  render();
  setTimeout(() => {
    flow.settle(runId);
    render();
  }, 0);
});

cancelButton.addEventListener("click", () => {
  flow.cancel();
  render();
});

clearButton.addEventListener("click", () => {
  flow.reset();
  fillForm(flow.draft);
  render();
  $("stock-mm").focus();
});

sampleButton.addEventListener("click", () => {
  flow.loadSample();
  fillForm(SAMPLE_DRAFT);
  render();
});

addButton.addEventListener("click", () => {
  const rows = panelsEl.querySelectorAll(".panel-row").length;
  if (rows >= MAX_PANELS) return;
  panelsEl.appendChild(createPanelRow(rows, { name: "", finishedMm: null, topMm: 0, bottomMm: 0 }));
  updateRemoveButtons();
  onEdit();
  const last = panelsEl.querySelector(".panel-row:last-child input");
  if (last) last.focus();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    flow.reset();
    fillForm(flow.draft);
    render();
  }
});

fillForm(emptyDraft());
render();
