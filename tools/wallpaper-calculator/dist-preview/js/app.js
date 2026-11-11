// DOM wiring for the Wallpaper Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it. The
// draft is a whole core input object, rebuilt from the form on every edit.

import { createController } from "./controller.mjs";
import {
  MAX_OPENING_ROWS,
  MAX_WALL_ROWS,
  REPORT_FILENAME,
  serializeReport,
} from "./core/wallpaper.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const SCALAR_FIELDS = [
  "perimeterM",
  "heightM",
  "rollWidthM",
  "rollLengthM",
  "patternRepeatCm",
  "openingsAreaM2",
  "wastePercent",
];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      perimeterM: "房間周長（公尺）",
      heightM: "天花板高（公尺）",
      rollWidthM: "捲寬（公尺）",
      rollLengthM: "捲長（公尺）",
      patternRepeatCm: "圖案重複（公分，0 表示不用對花）",
      openingsAreaM2: "開口總面積（平方公尺）",
      wastePercent: "損耗百分比 %",
      walls: "牆面清單",
      openings: "開口清單",
      openingsMode: "開口面積輸入方式",
    },
    rowLabel: (kind, row, field) =>
      `${kind === "wall" ? "牆" : "開口"} ${row} ${field === "widthM" ? "寬" : "高"}`,
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      DECIMAL_FORMAT: "請用數字，最多兩位小數",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      ENUM: "選項不正確",
      MODE_COMBINATION: "逐牆模式不能用開口尺寸清單，請改用面積扣除",
      OPENING_HEIGHT_EXCEEDS_WALL: "開口高度不可超過牆高。",
      OPENINGS_EXCEED_WALL: "開口合計不小於牆面，請檢查開口尺寸",
      STRIP_TOO_LONG: "每幅長度超過一捲長度，這款捲長不夠",
      ROW_LIMIT: "列數超過上限",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未計算。請輸入房間與壁紙捲尺寸，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算壁紙用量」執行。",
    separator: "：",
    wallCell: (index, perimeterMode) => (perimeterMode ? "全周長" : `牆 ${index}`),
    summary: (result) =>
      `需要 ${result.rolls} 捲：共 ${result.strips} 幅，加損耗後 ${result.stripsWithWaste} 幅。各牆的每幅長度與每捲可裁幅數見明細。`,
    totals: (result) =>
      `牆面總面積 ${result.grossWallAreaM2} m² · 開口面積 ${result.openingsAreaM2} m² · 淨面積 ${result.netWallAreaM2} m²`,
    removeRow: "刪除",
  },
  en: {
    fieldLabel: {
      perimeterM: "Room perimeter (m)",
      heightM: "Ceiling height (m)",
      rollWidthM: "Roll width (m)",
      rollLengthM: "Roll length (m)",
      patternRepeatCm: "Pattern repeat (cm, 0 = no matching)",
      openingsAreaM2: "Total openings area (m²)",
      wastePercent: "Waste percent %",
      walls: "Wall list",
      openings: "Openings list",
      openingsMode: "How to enter opening area",
    },
    rowLabel: (kind, row, field) =>
      `${kind === "wall" ? "Wall" : "Opening"} ${row} ${field === "widthM" ? "width" : "height"}`,
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with at most two decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      ENUM: "Invalid option.",
      MODE_COMBINATION:
        "Per-wall mode cannot use an openings dimension list; use the area deduction instead.",
      OPENING_HEIGHT_EXCEEDS_WALL: "Enter an opening height at or below the wall height.",
      OPENINGS_EXCEED_WALL: "The openings add up to at least the wall size; check the opening dimensions.",
      STRIP_TOO_LONG: "One strip is longer than a whole roll; this roll is too short.",
      ROW_LIMIT: "Too many rows.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter your room and roll sizes, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate wallpaper needed” to compute it.",
    separator: ": ",
    wallCell: (index, perimeterMode) => (perimeterMode ? "Whole perimeter" : `Wall ${index}`),
    summary: (result) =>
      `${result.rolls} roll${result.rolls === 1 ? "" : "s"} needed: ${result.strips} strips in total, ${result.stripsWithWaste} with waste added. See the breakdown for each wall's strip length and drops per roll.`,
    totals: (result) =>
      `Gross wall area ${result.grossWallAreaM2} m² · openings ${result.openingsAreaM2} m² · net area ${result.netWallAreaM2} m²`,
    removeRow: "Remove",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("wallpaper-form");
const inputs = {};
for (const field of SCALAR_FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of SCALAR_FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const wallModeRadios = [...document.querySelectorAll('input[name="wallMode"]')];
const openingsModeRadios = [...document.querySelectorAll('input[name="openingsMode"]')];
const perimeterFieldsEl = document.getElementById("perimeter-fields");
const wallsFieldsEl = document.getElementById("walls-fields");
const wallsRowsEl = document.getElementById("walls-rows");
const wallsErrorEl = document.getElementById("error-walls");
const addWallBtn = document.getElementById("add-wall-btn");
const openingsAreaFieldsEl = document.getElementById("openings-area-fields");
const openingsListFieldsEl = document.getElementById("openings-list-fields");
const openingsRowsEl = document.getElementById("openings-rows");
const openingsErrorEl = document.getElementById("error-openings");
const openingsModeErrorEl = document.getElementById("error-openingsMode");
const addOpeningBtn = document.getElementById("add-opening-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const totalsEl = document.getElementById("totals");
const tableBody = document.getElementById("wall-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  let worker;
  try {
    worker = new Worker(url, { type: "module" });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  const originalTerminate = worker.terminate.bind(worker);
  let terminated = false;
  worker.terminate = () => {
    if (terminated) return;
    terminated = true;
    try {
      originalTerminate();
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  return worker;
}

function revokeReportUrl() {
  if (reportUrlTimer !== null) {
    clearTimeout(reportUrlTimer);
    reportUrlTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

// Build one wall/opening row of two text inputs with labels and error
// slots. Ids are rebuilt whenever the row set changes so they always
// carry the current 1-based row number.
function buildRow(kind, index) {
  const row = document.createElement("div");
  row.className = "data-row";
  row.dataset.kind = kind;
  for (const field of ["widthM", "heightM"]) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const id = `field-${kind}-${index}-${field}`;
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.textContent = t.rowLabel(kind, index, field);
    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.dataset.role = field;
    const errorEl = document.createElement("p");
    errorEl.className = "field-error";
    errorEl.id = `error-${kind}-${index}-${field}`;
    errorEl.setAttribute("role", "alert");
    wrap.append(label, input, errorEl);
    row.appendChild(wrap);
  }
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "button-secondary remove-row-btn";
  removeBtn.dataset.removeRow = kind;
  removeBtn.textContent = t.removeRow;
  row.appendChild(removeBtn);
  return row;
}

function ensureRows(container, kind, count) {
  if (container.children.length === count) return;
  container.replaceChildren();
  for (let i = 1; i <= count; i += 1) container.appendChild(buildRow(kind, i));
}

function readRows(container) {
  return [...container.children].map((row) => ({
    widthM: row.querySelector('[data-role="widthM"]').value,
    heightM: row.querySelector('[data-role="heightM"]').value,
  }));
}

function checkedValue(radios) {
  const checked = radios.find((radio) => radio.checked);
  return checked ? checked.value : radios[0].value;
}

// Rebuild the whole core input object from the current form. Only the
// keys of the active modes are included, exactly as the core requires.
function readDraft() {
  const wallMode = checkedValue(wallModeRadios);
  const openingsMode = checkedValue(openingsModeRadios);
  const draft = {
    wallMode,
    rollWidthM: inputs.rollWidthM.value,
    rollLengthM: inputs.rollLengthM.value,
    patternRepeatCm: inputs.patternRepeatCm.value,
    openingsMode,
    wastePercent: inputs.wastePercent.value,
  };
  if (wallMode === "perimeter") {
    draft.perimeterM = inputs.perimeterM.value;
    draft.heightM = inputs.heightM.value;
  } else {
    draft.walls = readRows(wallsRowsEl);
  }
  if (openingsMode === "area") draft.openingsAreaM2 = inputs.openingsAreaM2.value;
  if (openingsMode === "list") draft.openings = readRows(openingsRowsEl);
  return draft;
}

function setInputValue(input, value) {
  if (input !== null && input.value !== value) input.value = value;
}

function syncRows(container, kind, rows) {
  ensureRows(container, kind, rows.length);
  [...container.children].forEach((rowEl, i) => {
    setInputValue(rowEl.querySelector('[data-role="widthM"]'), rows[i].widthM);
    setInputValue(rowEl.querySelector('[data-role="heightM"]'), rows[i].heightM);
    const removeBtn = rowEl.querySelector("[data-remove-row]");
    removeBtn.disabled = rows.length <= 1;
  });
}

function syncForm(draft) {
  for (const radio of wallModeRadios) radio.checked = radio.value === draft.wallMode;
  for (const radio of openingsModeRadios) radio.checked = radio.value === draft.openingsMode;
  perimeterFieldsEl.hidden = draft.wallMode !== "perimeter";
  wallsFieldsEl.hidden = draft.wallMode !== "walls";
  openingsAreaFieldsEl.hidden = draft.openingsMode !== "area";
  openingsListFieldsEl.hidden = draft.openingsMode !== "list";
  if (draft.wallMode === "perimeter") {
    setInputValue(inputs.perimeterM, draft.perimeterM);
    setInputValue(inputs.heightM, draft.heightM);
  } else {
    syncRows(wallsRowsEl, "wall", draft.walls);
  }
  setInputValue(inputs.rollWidthM, draft.rollWidthM);
  setInputValue(inputs.rollLengthM, draft.rollLengthM);
  setInputValue(inputs.patternRepeatCm, draft.patternRepeatCm);
  if (draft.openingsMode === "area") setInputValue(inputs.openingsAreaM2, draft.openingsAreaM2);
  if (draft.openingsMode === "list") syncRows(openingsRowsEl, "opening", draft.openings);
  setInputValue(inputs.wastePercent, draft.wastePercent);
  addWallBtn.disabled = draft.wallMode === "walls" && draft.walls.length >= MAX_WALL_ROWS;
  addOpeningBtn.disabled = draft.openingsMode === "list" && draft.openings.length >= MAX_OPENING_ROWS;
}

function setError(input, errorEl, message) {
  if (message === null) {
    if (input !== null) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (input !== null) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", errorEl.id);
  }
  errorEl.textContent = message;
}

function clearErrors() {
  for (const field of SCALAR_FIELDS) setError(inputs[field], fieldErrors[field], null);
  setError(null, wallsErrorEl, null);
  setError(null, openingsErrorEl, null);
  setError(null, openingsModeErrorEl, null);
  for (const container of [wallsRowsEl, openingsRowsEl]) {
    for (const errorEl of container.querySelectorAll(".field-error")) errorEl.textContent = "";
    for (const input of container.querySelectorAll("input")) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }
}

// Locate the visible error slot for a core error. Returns null when the
// error has no field (status line only).
function errorTarget(error, draft) {
  if (error.field === null) return null;
  if ((error.field === "widthM" || error.field === "heightM") && error.row !== null) {
    const kind = draft.wallMode === "walls" ? "wall" : "opening";
    const input = document.getElementById(`field-${kind}-${error.row}-${error.field}`);
    const errorEl = document.getElementById(`error-${kind}-${error.row}-${error.field}`);
    if (input === null || errorEl === null) return null;
    return { input, errorEl, label: t.rowLabel(kind, error.row, error.field) };
  }
  if (SCALAR_FIELDS.includes(error.field)) {
    return {
      input: inputs[error.field],
      errorEl: fieldErrors[error.field],
      label: t.fieldLabel[error.field],
    };
  }
  if (error.field === "walls") return { input: null, errorEl: wallsErrorEl, label: t.fieldLabel.walls };
  if (error.field === "openings") {
    return { input: null, errorEl: openingsErrorEl, label: t.fieldLabel.openings };
  }
  if (error.field === "openingsMode") {
    return { input: null, errorEl: openingsModeErrorEl, label: t.fieldLabel.openingsMode };
  }
  return null;
}

function renderWalls(result, perimeterMode) {
  tableBody.replaceChildren();
  for (const wall of result.walls) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = t.wallCell(wall.index, perimeterMode);
    tr.appendChild(labelCell);
    const values = [
      wall.widthCm,
      wall.openingsWidthCm,
      wall.effectiveWidthCm,
      wall.strips,
      wall.stripLengthCm,
      wall.dropsPerRoll,
      wall.stripsWithWaste,
      wall.rolls,
    ];
    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  syncForm(draft);
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "empty") {
    statusEl.textContent = t.statusEmpty;
    resultsEl.hidden = true;
    clearErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearErrors();
  } else if (state === "error") {
    clearErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      const target = errorTarget(error, draft);
      if (target !== null) {
        setError(target.input, target.errorEl, message);
        statusEl.textContent = `${target.label}${t.separator}${message}`;
        if (submitted) {
          submitted = false;
          if (target.input !== null) target.input.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    summaryEl.textContent = t.summary(result);
    totalsEl.textContent = t.totals(result);
    statusEl.textContent = summaryEl.textContent;
    renderWalls(result, draft.wallMode === "perimeter");
    resultsEl.hidden = false;
    clearErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

// Any edit anywhere in the form rebuilds the whole draft snapshot; the
// controller's deep comparison decides whether anything actually changed.
form.addEventListener("input", () => {
  controller.edit(readDraft());
});
form.addEventListener("change", () => {
  controller.edit(readDraft());
});

function addRow(kind) {
  const container = kind === "wall" ? wallsRowsEl : openingsRowsEl;
  const limit = kind === "wall" ? MAX_WALL_ROWS : MAX_OPENING_ROWS;
  if (container.children.length >= limit) return;
  container.appendChild(buildRow(kind, container.children.length + 1));
  controller.edit(readDraft());
}

addWallBtn.addEventListener("click", () => addRow("wall"));
addOpeningBtn.addEventListener("click", () => addRow("opening"));

form.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-row]");
  if (button === null) return;
  const rowEl = button.closest(".data-row");
  const container = rowEl.parentElement;
  if (container.children.length <= 1) return;
  rowEl.remove();
  // Renumber the remaining rows so ids and labels stay 1-based sequential.
  const kind = container === wallsRowsEl ? "wall" : "opening";
  const rows = readRows(container);
  container.replaceChildren();
  rows.forEach((unused, i) => container.appendChild(buildRow(kind, i + 1)));
  syncRows(container, kind, rows);
  controller.edit(readDraft());
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.perimeterM.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = t.error.OUTPUT_LIMIT;
    return;
  }
  revokeReportUrl();
  const blob = new Blob([serialized.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  reportUrlTimer = setTimeout(revokeReportUrl, REPORT_URL_TTL_MS);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    revokeReportUrl();
    controller.reset();
  }
});

render(controller.getState());
