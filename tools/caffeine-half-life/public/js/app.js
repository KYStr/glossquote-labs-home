// DOM wiring for the Caffeine Half-Life Calculator. All rendering uses
// textContent/value; user input is never treated as markup. The draft
// lives only in this page: editing revokes the old result through the
// controller, and leaving the page discards everything.

import { createController } from "./controller.mjs";
import {
  DEFAULT_DRAFT,
  ERROR_MESSAGES,
  EXAMPLE_INPUT,
  PRESETS,
  STATUS_MESSAGES,
  formatClock,
} from "./core/caffeine.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const text = (zh, en) => (lang === "en" ? en : zh);

const main = document.getElementById("app");
const form = document.getElementById("calc-form");
const entryRowsEl = document.getElementById("entry-rows");
const addEntryBtn = document.getElementById("add-entry-btn");
const halfLifeInput = document.getElementById("half-life");
const queryTimeInput = document.getElementById("query-time");
const bedtimeInput = document.getElementById("bedtime");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const cancelBtn = document.getElementById("cancel-btn");
const resetBtn = document.getElementById("reset-btn");
const exampleNote = document.getElementById("example-note");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultQueryTime = document.getElementById("result-query-time");
const resultTotal = document.getElementById("result-total");
const resultNotYetAll = document.getElementById("result-notyet-all");
const resultEntries = document.getElementById("result-entries");
const resultSeries = document.getElementById("result-series");
const resultBedtimeBlock = document.getElementById("result-bedtime-block");
const resultBedtime = document.getElementById("result-bedtime");
const errorEls = {
  entries: document.getElementById("error-entries"),
  halfLifeHours: document.getElementById("error-halfLifeHours"),
  queryTime: document.getElementById("error-queryTime"),
  bedtime: document.getElementById("error-bedtime"),
};

const statusDefault = statusEl.textContent;
const rows = [];
let focusFirstError = false;

const controller = createController({
  schedule: (fn) => setTimeout(fn, 0),
  cancelScheduled: (handle) => clearTimeout(handle),
  onChange: render,
});

function presetMg(id) {
  const preset = PRESETS.find((entry) => entry.id === id);
  return preset ? preset.mg : null;
}

function createRow() {
  const root = document.createElement("div");
  root.className = "entry-row";

  const timeField = document.createElement("div");
  timeField.className = "field";
  const timeLabel = document.createElement("label");
  timeLabel.textContent = text("時間", "Time");
  const timeInput = document.createElement("input");
  timeInput.type = "text";
  timeInput.className = "entry-time";
  timeInput.placeholder = "HH:MM";
  timeInput.autocomplete = "off";
  timeInput.spellcheck = false;
  timeField.append(timeLabel, timeInput);

  const presetField = document.createElement("div");
  presetField.className = "field";
  const presetLabel = document.createElement("label");
  presetLabel.textContent = text("飲品預設", "Drink preset");
  const presetSelect = document.createElement("select");
  presetSelect.className = "entry-preset";
  const customOption = document.createElement("option");
  customOption.value = "";
  customOption.textContent = text("自訂毫克", "Custom mg");
  presetSelect.append(customOption);
  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = `${preset.label[lang]} (${preset.mg} mg)`;
    presetSelect.append(option);
  }
  presetField.append(presetLabel, presetSelect);

  const mgField = document.createElement("div");
  mgField.className = "field";
  const mgLabel = document.createElement("label");
  mgLabel.textContent = text("毫克", "Milligrams");
  const mgInput = document.createElement("input");
  mgInput.type = "text";
  mgInput.className = "entry-mg";
  mgInput.autocomplete = "off";
  mgInput.spellcheck = false;
  mgField.append(mgLabel, mgInput);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "entry-remove";
  removeBtn.textContent = text("刪除", "Remove");

  const row = { root, time: timeInput, preset: presetSelect, mg: mgInput, remove: removeBtn, timeLabel, presetLabel, mgLabel };
  root.append(timeField, presetField, mgField, removeBtn);

  const onInput = () => {
    syncMgState(row);
    handleEdit();
  };
  timeInput.addEventListener("input", handleEdit);
  presetSelect.addEventListener("change", onInput);
  mgInput.addEventListener("input", handleEdit);
  removeBtn.addEventListener("click", () => {
    if (rows.length <= 1) return;
    const index = rows.indexOf(row);
    if (index === -1) return;
    rows.splice(index, 1);
    root.remove();
    renumberRows();
    updateRowButtons();
    handleEdit();
  });
  return row;
}

function syncMgState(row) {
  const mg = presetMg(row.preset.value);
  if (mg !== null) {
    row.mg.disabled = true;
    row.mg.value = String(mg);
  } else {
    row.mg.disabled = false;
  }
}

function renumberRows() {
  rows.forEach((row, index) => {
    const n = index + 1;
    row.time.id = `entry-time-${n}`;
    row.preset.id = `entry-preset-${n}`;
    row.mg.id = `entry-mg-${n}`;
    row.timeLabel.htmlFor = row.time.id;
    row.presetLabel.htmlFor = row.preset.id;
    row.mgLabel.htmlFor = row.mg.id;
    row.remove.setAttribute(
      "aria-label",
      text(`刪除第 ${n} 筆`, `Remove entry ${n}`),
    );
  });
}

function updateRowButtons() {
  for (const row of rows) row.remove.disabled = rows.length <= 1;
  addEntryBtn.disabled = rows.length >= 8;
}

function readDraft() {
  return {
    entries: rows.map((row) => {
      const preset = row.preset.value === "" ? null : row.preset.value;
      return {
        time: row.time.value,
        preset,
        mg: preset === null ? row.mg.value : null,
      };
    }),
    halfLifeHours: halfLifeInput.value,
    queryTime: queryTimeInput.value,
    bedtime: bedtimeInput.value,
  };
}

function applyDraft(draft) {
  for (const row of rows) row.root.remove();
  rows.length = 0;
  for (const entry of draft.entries) {
    const row = createRow();
    row.time.value = entry.time;
    row.preset.value = entry.preset === null ? "" : entry.preset;
    syncMgState(row);
    if (entry.preset === null) row.mg.value = entry.mg === null ? "" : entry.mg;
    rows.push(row);
    entryRowsEl.append(row.root);
  }
  halfLifeInput.value = draft.halfLifeHours;
  queryTimeInput.value = draft.queryTime;
  bedtimeInput.value = draft.bedtime;
  renumberRows();
  updateRowButtons();
}

function handleEdit() {
  exampleNote.hidden = true;
  controller.edit(readDraft());
}

function errorText(error) {
  const entry = ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.INTERNAL;
  const base = entry[lang];
  if (error.field === "entries" && error.row !== null) {
    return text(`第 ${error.row} 筆：${base}`, `Entry ${error.row}: ${base}`);
  }
  return base;
}

function errorTarget(error) {
  if (error.field === "entries") {
    const row = error.row !== null ? rows[error.row - 1] : undefined;
    return { el: errorEls.entries, input: row ? row.time : null };
  }
  if (error.field === "halfLifeHours") return { el: errorEls.halfLifeHours, input: halfLifeInput };
  if (error.field === "queryTime") return { el: errorEls.queryTime, input: queryTimeInput };
  if (error.field === "bedtime") return { el: errorEls.bedtime, input: bedtimeInput };
  return null;
}

function clearErrors() {
  for (const el of Object.values(errorEls)) el.textContent = "";
  for (const input of [halfLifeInput, queryTimeInput, bedtimeInput]) {
    input.removeAttribute("aria-invalid");
  }
  for (const row of rows) {
    row.time.removeAttribute("aria-invalid");
    row.preset.removeAttribute("aria-invalid");
    row.mg.removeAttribute("aria-invalid");
  }
}

function renderResults(result) {
  resultQueryTime.textContent = formatClock(result.query.timeMin);
  resultTotal.textContent = result.query.totalMg;
  resultNotYetAll.hidden = result.query.notYetCount !== result.query.perEntry.length;

  resultEntries.replaceChildren();
  for (const entry of result.query.perEntry) {
    const tr = document.createElement("tr");
    const timeCell = document.createElement("td");
    timeCell.textContent = formatClock(entry.timeMin);
    const mgCell = document.createElement("td");
    mgCell.textContent = String(entry.mg);
    const elapsedCell = document.createElement("td");
    elapsedCell.textContent =
      entry.elapsedMin === null
        ? text("尚未攝取（在查詢時間之後）", "Not yet consumed (after the query time)")
        : String(entry.elapsedMin);
    const remainingCell = document.createElement("td");
    remainingCell.textContent = entry.remainingMg;
    tr.append(timeCell, mgCell, elapsedCell, remainingCell);
    resultEntries.append(tr);
  }

  resultSeries.replaceChildren();
  for (const point of result.series) {
    const li = document.createElement("li");
    const clock = formatClock(point.timeMin);
    const suffix = point.nextDay ? text("（隔日）", " (next day)") : "";
    li.textContent =
      lang === "en"
        ? `${clock}${suffix}: ${point.totalMg} mg`
        : `${clock}${suffix}：${point.totalMg} mg`;
    resultSeries.append(li);
  }

  if (result.atBedtime === null) {
    resultBedtimeBlock.hidden = true;
    resultBedtime.textContent = "";
  } else {
    const bedtime = result.atBedtime;
    const clock = formatClock(bedtime.timeMin);
    const suffix = bedtime.afterMidnight ? text("（隔日）", " (next day)") : "";
    resultBedtime.textContent =
      lang === "en"
        ? `${clock}${suffix} (${bedtime.minutesFromQuery} min after the query time): ${bedtime.totalMg} mg`
        : `${clock}${suffix}（距查詢時間 ${bedtime.minutesFromQuery} 分鐘）：${bedtime.totalMg} mg`;
    resultBedtimeBlock.hidden = false;
  }
}

function render(state) {
  main.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  cancelBtn.hidden = state.state !== "busy";
  runBtn.disabled = state.state === "busy";

  if (state.state === "empty") statusEl.textContent = statusDefault;
  else if (state.state === "dirty") statusEl.textContent = STATUS_MESSAGES.dirty[lang];
  else if (state.state === "busy") statusEl.textContent = STATUS_MESSAGES.busy[lang];
  else if (state.state === "cancelled") statusEl.textContent = STATUS_MESSAGES.cancelled[lang];
  else if (state.state === "success") statusEl.textContent = text("計算完成", "Done.");
  else if (state.state === "error" && state.error) statusEl.textContent = errorText(state.error);

  clearErrors();
  if (state.state === "error" && state.error) {
    const target = errorTarget(state.error);
    if (target !== null) {
      target.el.textContent = errorText(state.error);
      target.el.setAttribute("aria-errormessage", target.el.id);
      if (target.input !== null) {
        target.input.setAttribute("aria-invalid", "true");
        if (focusFirstError) target.input.focus();
      }
    }
    focusFirstError = false;
  } else if (state.state === "success") {
    focusFirstError = false;
  }

  if (state.resultAvailable && state.result !== null) {
    renderResults(state.result);
    resultsEl.hidden = false;
  } else {
    resultsEl.hidden = true;
  }
}

for (const input of [halfLifeInput, queryTimeInput, bedtimeInput]) {
  input.addEventListener("input", handleEdit);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  exampleNote.hidden = true;
  focusFirstError = true;
  controller.run();
});

addEntryBtn.addEventListener("click", () => {
  if (rows.length >= 8) return;
  const row = createRow();
  rows.push(row);
  entryRowsEl.append(row.root);
  renumberRows();
  updateRowButtons();
  handleEdit();
  row.time.focus();
});

exampleBtn.addEventListener("click", () => {
  applyDraft(EXAMPLE_INPUT);
  controller.edit(JSON.parse(JSON.stringify(EXAMPLE_INPUT)));
  exampleNote.hidden = false;
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  applyDraft(DEFAULT_DRAFT);
  exampleNote.hidden = true;
  if (rows.length > 0) rows[0].time.focus();
});

window.addEventListener("pagehide", () => {
  controller.destroy();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    applyDraft(DEFAULT_DRAFT);
    exampleNote.hidden = true;
  }
});

applyDraft(DEFAULT_DRAFT);
