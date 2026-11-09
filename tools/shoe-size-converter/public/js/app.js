// DOM wiring for the Shoe Size Converter. All conversion logic lives in
// js/core/; this file only moves values between the controls and the core.
// User input is written to the page with textContent / value only.

import {
  coveredRangeCm,
  labelsFor,
  parseFootLength,
  rowResult,
  selectRowByFoot,
  selectRowByLabel,
  tableFor,
} from "./core/convert.mjs";

const LANG = document.documentElement.lang.startsWith("zh") ? "zh" : "en";

const STRINGS = {
  zh: {
    category: { men: "男鞋", women: "女鞋", kids: "童鞋" },
    footText: (cm, mm) => `${cm} 公分（${mm} mm）`,
    errors: {
      empty: "請輸入腳長。",
      format: "請輸入數字，例如 27.0。",
      step: "請輸入到小數一位（0.1 公分一格）。",
      range: "腳長欄位可輸入 10.0–35.0 公分。",
    },
    outOfRange: (cat, min, max) =>
      `這個腳長不在${cat}表格的涵蓋範圍內（${min}–${max} 公分）。本工具不推算表外鞋碼；可以改量另一隻腳，或看其他類別的表格。`,
  },
  en: {
    category: { men: "Men", women: "Women", kids: "Kids" },
    footText: (cm, mm) => `${cm} cm (${mm} mm)`,
    errors: {
      empty: "Enter a foot length.",
      format: "Enter a number, for example 27.0.",
      step: "Use one decimal place (0.1 cm steps).",
      range: "The foot-length field accepts 10.0–35.0 cm.",
    },
    outOfRange: (cat, min, max) =>
      `This foot length is outside the ${cat} table's covered range (${min}–${max} cm). The tool never extrapolates a label beyond the table; try the other foot's measurement or another category.`,
  },
}[LANG];

const $ = (id) => document.getElementById(id);
const els = {
  form: $("tool-form"),
  unsupported: $("unsupported-note"),
  footPanel: $("foot-panel"),
  labelPanel: $("label-panel"),
  footInput: $("foot-cm"),
  footError: $("foot-error"),
  selects: { us: $("label-us"), uk: $("label-uk"), eur: $("label-eur"), jp: $("label-jp") },
  category: $("result-category"),
  table: $("result-table"),
  foot: $("res-foot"),
  us: $("res-us"),
  uk: $("res-uk"),
  eur: $("res-eur"),
  jp: $("res-jp"),
  missing: $("missing-note"),
  oor: $("out-of-range"),
  empty: $("empty-state"),
};

const state = {
  category: "men",
  mode: "foot",
  // The foot length is the invariant across category switches (SPEC section 3):
  // in foot mode it is the entered length; in label mode it is the selected
  // row's Mondopoint length. Integer millimetres, or null when no valid input.
  enteredMm: 270,
};

function rows() {
  return tableFor(state.category);
}

function showState(which) {
  els.table.hidden = which !== "result";
  els.missing.hidden = true;
  els.oor.hidden = which !== "oor";
  els.empty.hidden = which !== "empty";
  els.category.hidden = which === "empty";
}

function renderRow(row) {
  const r = rowResult(state.category, row);
  els.category.textContent = STRINGS.category[state.category];
  els.foot.textContent = STRINGS.footText(r.footCm, r.mondo);
  els.us.textContent = r.us ?? "—";
  els.uk.textContent = r.uk ?? "—";
  els.eur.textContent = r.eur ?? "—";
  els.jp.textContent = r.jp;
  showState("result");
  els.missing.hidden = !(r.us === null || r.uk === null || r.eur === null);
}

function renderOutOfRange() {
  const range = coveredRangeCm(rows());
  els.category.textContent = STRINGS.category[state.category];
  els.oor.textContent = STRINGS.outOfRange(
    STRINGS.category[state.category],
    range.min,
    range.max,
  );
  showState("oor");
}

function syncSelectsToRow(row) {
  for (const system of Object.keys(els.selects)) {
    const select = els.selects[system];
    const wanted = row ? rowResult(state.category, row)[system] : null;
    select.value = wanted ?? "";
  }
}

function populateSelects() {
  for (const system of Object.keys(els.selects)) {
    const select = els.selects[system];
    select.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "—";
    select.append(placeholder);
    for (const label of labelsFor(rows(), system)) {
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      select.append(option);
    }
  }
}

// Foot-mode render: parse the field, then select a row. A parse refusal
// shows its error and the empty state; a parsed length outside the table
// shows the out-of-range state naming the covered range.
function renderFootMode() {
  const parsed = parseFootLength(els.footInput.value);
  if (!parsed.ok) {
    const key = parsed.error === "below-min" || parsed.error === "above-max" ? "range" : parsed.error;
    els.footError.textContent = STRINGS.errors[key];
    els.footError.hidden = false;
    els.footInput.setAttribute("aria-invalid", "true");
    state.enteredMm = null;
    showState("empty");
    return;
  }
  els.footError.textContent = "";
  els.footError.hidden = true;
  els.footInput.removeAttribute("aria-invalid");
  state.enteredMm = parsed.mm;
  const picked = selectRowByFoot(rows(), parsed.mm);
  if (picked.status !== "ok") {
    renderOutOfRange();
    return;
  }
  renderRow(picked.row);
  if (state.mode === "label") syncSelectsToRow(picked.row);
}

function renderLabelMode() {
  populateSelects();
  if (state.enteredMm === null) {
    syncSelectsToRow(null);
    showState("empty");
    return;
  }
  const picked = selectRowByFoot(rows(), state.enteredMm);
  if (picked.status !== "ok") {
    syncSelectsToRow(null);
    renderOutOfRange();
    return;
  }
  syncSelectsToRow(picked.row);
  renderRow(picked.row);
}

function render() {
  els.footPanel.hidden = state.mode !== "foot";
  els.labelPanel.hidden = state.mode !== "label";
  if (state.mode === "foot") renderFootMode();
  else renderLabelMode();
}

els.form.addEventListener("submit", (event) => event.preventDefault());

for (const radio of els.form.querySelectorAll('input[name="category"]')) {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    state.category = radio.value;
    render();
  });
}

for (const radio of els.form.querySelectorAll('input[name="mode"]')) {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    state.mode = radio.value;
    if (state.mode === "foot" && state.enteredMm !== null) {
      els.footInput.value = (state.enteredMm / 10).toFixed(1);
    }
    render();
  });
}

els.footInput.addEventListener("input", () => {
  if (state.mode === "foot") renderFootMode();
});

for (const [system, select] of Object.entries(els.selects)) {
  select.addEventListener("change", () => {
    if (select.value === "") return;
    const row = selectRowByLabel(rows(), system, select.value);
    if (!row) return;
    state.enteredMm = row.mondo;
    els.footInput.value = (row.mondo / 10).toFixed(1);
    els.footError.textContent = "";
    els.footError.hidden = true;
    syncSelectsToRow(row);
    renderRow(row);
  });
}

els.unsupported.hidden = true;
render();
