// DOM wiring for the Cocktail ABV Calculator. All user-visible
// text is set through textContent/value only; user input never
// becomes markup. Computation runs in a module Worker built from
// the fixed worker source embedded by the preview build
// (WORKER_SOURCE). The controller owns the draft, generation, and
// state machine; this file only renders it. The fixed report
// download (cocktail-abv-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob
// URL is revoked within 30 seconds or as soon as the result is
// invalidated.
//
// Ingredient rows are dynamic (2-6). The row list is rebuilt only
// when the row count changes; otherwise input values are synced in
// place so focus is not stolen while typing.

import { createController } from "./controller.mjs";
import { buildReport, MAX_ROWS, MIN_ROWS } from "./core/cocktail-abv.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const ROW_FIELDS = ["name", "volumeMl", "abvPct"];

const STRINGS = {
  "zh-Hant": {
    rowLegend: (n) => `材料 ${n}`,
    fieldLabel: {
      name: "材料名稱（可不填）",
      volumeMl: "體積（ml）",
      abvPct: "酒精度（ABV%）",
    },
    fieldHelp: {
      name: "不填時顯示為「材料 n」。1–40 字。",
      volumeMl: "0.1 至 2000 ml，小數點後至多 1 位。",
      abvPct: "0 至 100%，小數點後至多 1 位。",
    },
    fieldPlaceholder: {
      name: "例如 龍舌蘭",
      volumeMl: "例如 45",
      abvPct: "例如 40",
    },
    removeRow: (n) => `移除材料 ${n}`,
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      NUMBER_FORMAT: "請輸入數字，小數點後至多 1 位，不含符號或空白",
      ROW_COUNT: "至少需要 2 種材料",
      ROW_LIMIT: "最多 6 種材料",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      name: "材料名稱須在 1 至 40 字之間",
      volumeMl: "體積須在 0.1 至 2000 ml 之間",
      abvPct: "酒精度須在 0 至 100% 之間",
    },
    statusEmpty: "尚未計算。輸入 2–6 種材料的體積與酒精度，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（經典瑪格麗特，合成案例），請按「計算調酒酒精度」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    rowErrorPrefix: (n) => `材料 ${n}`,
    labelTotalVolume: "總體積",
    labelTotalAbv: "總酒精度",
    labelTotalAlcoholG: "純酒精",
    labelStandardDrinks: "標準杯數",
    labelDetail: "各材料純酒精量",
    detailValue: (alcoholMl, alcoholG) => `純酒精 ${alcoholMl} ml（${alcoholG} g）`,
    unitMl: "ml",
    unitPct: "%",
    unitG: "g",
    unitDrinks: "杯",
    successSummary: (result) =>
      `總酒精度 ${result.totalAbvPct.toFixed(1)}%，${result.standardDrinks.toFixed(1)} 標準杯`,
  },
  en: {
    rowLegend: (n) => `Ingredient ${n}`,
    fieldLabel: {
      name: "Ingredient name (optional)",
      volumeMl: "Volume (ml)",
      abvPct: "Alcohol by volume (ABV%)",
    },
    fieldHelp: {
      name: "Leave blank to show “Ingredient n”. 1–40 characters.",
      volumeMl: "0.1 to 2000 ml, at most 1 decimal place.",
      abvPct: "0 to 100%, at most 1 decimal place.",
    },
    fieldPlaceholder: {
      name: "e.g. Tequila",
      volumeMl: "e.g. 45",
      abvPct: "e.g. 40",
    },
    removeRow: (n) => `Remove ingredient ${n}`,
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      NUMBER_FORMAT: "Enter a number with at most 1 decimal place, no sign or space.",
      ROW_COUNT: "At least 2 ingredients are required.",
      ROW_LIMIT: "At most 6 ingredients are allowed.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      name: "The ingredient name must be 1 to 40 characters.",
      volumeMl: "Volume must be between 0.1 and 2000 ml.",
      abvPct: "ABV must be between 0 and 100%.",
    },
    statusEmpty: "Nothing calculated yet. Enter the volume and ABV of 2–6 ingredients, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (classic Margarita, synthetic case). Press “Calculate cocktail ABV” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    rowErrorPrefix: (n) => `Ingredient ${n}`,
    labelTotalVolume: "Total volume",
    labelTotalAbv: "Total ABV",
    labelTotalAlcoholG: "Pure alcohol",
    labelStandardDrinks: "Standard drinks",
    labelDetail: "Pure alcohol per ingredient",
    detailValue: (alcoholMl, alcoholG) => `Pure alcohol ${alcoholMl} ml (${alcoholG} g)`,
    unitMl: "ml",
    unitPct: "%",
    unitG: "g",
    unitDrinks: "drinks",
    successSummary: (result) =>
      `Total ABV ${result.totalAbvPct.toFixed(1)}%, ${result.standardDrinks.toFixed(1)} standard drinks`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const rowsContainer = document.getElementById("ingredient-rows");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const detailRows = document.getElementById("detail-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const addBtn = document.getElementById("add-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let renderedRowCount = 0;

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: "module" });
  const originalTerminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    originalTerminate();
    URL.revokeObjectURL(url);
  };
  return worker;
}

let reportUrl = null;
let reportRevokeTimer = null;

function revokeReportUrl() {
  if (reportRevokeTimer !== null) {
    clearTimeout(reportRevokeTimer);
    reportRevokeTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function fieldInput(rowNumber, field) {
  return document.getElementById(`field-${field}-${rowNumber}`);
}

function fieldErrorEl(rowNumber, field) {
  return document.getElementById(`error-${field}-${rowNumber}`);
}

function buildRow(rowNumber, row) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "ingredient-row";
  const legend = document.createElement("legend");
  legend.textContent = t.rowLegend(rowNumber);
  fieldset.append(legend);

  for (const field of ROW_FIELDS) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const label = document.createElement("label");
    label.setAttribute("for", `field-${field}-${rowNumber}`);
    label.textContent = t.fieldLabel[field];
    const help = document.createElement("p");
    help.className = "help";
    help.id = `help-${field}-${rowNumber}`;
    help.textContent = t.fieldHelp[field];
    const input = document.createElement("input");
    input.id = `field-${field}-${rowNumber}`;
    input.name = `${field}-${rowNumber}`;
    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = t.fieldPlaceholder[field];
    input.value = row[field] ?? "";
    input.setAttribute("aria-describedby", `help-${field}-${rowNumber}`);
    if (field !== "name") input.inputMode = "decimal";
    const errorEl = document.createElement("p");
    errorEl.className = "field-error";
    errorEl.id = `error-${field}-${rowNumber}`;
    errorEl.setAttribute("role", "alert");
    input.addEventListener("input", () => {
      controller.setField(rowNumber - 1, field, input.value);
    });
    wrapper.append(label, help, input, errorEl);
    fieldset.append(wrapper);
  }

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.id = `remove-${rowNumber}`;
  removeBtn.className = "button-secondary";
  removeBtn.textContent = t.removeRow(rowNumber);
  removeBtn.addEventListener("click", () => {
    controller.removeRow(rowNumber - 1);
  });
  fieldset.append(removeBtn);
  return fieldset;
}

function syncRows(draft) {
  const rows = draft.ingredients;
  if (renderedRowCount !== rows.length) {
    rowsContainer.replaceChildren();
    rows.forEach((row, index) => {
      rowsContainer.append(buildRow(index + 1, row));
    });
    renderedRowCount = rows.length;
    return;
  }
  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    for (const field of ROW_FIELDS) {
      const input = fieldInput(rowNumber, field);
      const value = row[field] ?? "";
      if (input !== null && input.value !== value) input.value = value;
    }
  });
}

function setFieldError(rowNumber, field, message) {
  const errorEl = fieldErrorEl(rowNumber, field);
  const target = fieldInput(rowNumber, field);
  if (errorEl === null || target === null) return;
  if (message === null) {
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-errormessage", `error-${field}-${rowNumber}`);
  errorEl.textContent = message;
}

function clearFieldErrors(rowCount) {
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    for (const field of ROW_FIELDS) setFieldError(rowNumber, field, null);
  }
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function appendSummaryRows(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    container.appendChild(div);
  }
}

function renderResult(result) {
  appendSummaryRows(summaryRows, [
    [t.labelTotalVolume, `${result.totalVolumeMl.toFixed(1)} ${t.unitMl}`],
    [t.labelTotalAbv, `${result.totalAbvPct.toFixed(1)}${t.unitPct}`],
    [t.labelTotalAlcoholG, `${result.totalAlcoholG.toFixed(1)} ${t.unitG}`],
    [t.labelStandardDrinks, `${result.standardDrinks.toFixed(1)} ${t.unitDrinks}`],
  ]);
  appendSummaryRows(
    detailRows,
    result.rows.map((row) => [
      row.name,
      t.detailValue(row.alcoholMl.toFixed(1), row.alcoholG.toFixed(1)),
    ]),
  );
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  syncRows(draft);
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  addBtn.disabled = draft.ingredients.length >= MAX_ROWS;
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();
  for (let rowNumber = 1; rowNumber <= draft.ingredients.length; rowNumber += 1) {
    const removeBtn = document.getElementById(`remove-${rowNumber}`);
    if (removeBtn !== null) removeBtn.disabled = draft.ingredients.length <= MIN_ROWS;
  }

  if (state === "empty") {
    statusEl.textContent = t.statusEmpty;
    resultsEl.hidden = true;
    clearFieldErrors(draft.ingredients.length);
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearFieldErrors(draft.ingredients.length);
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearFieldErrors(draft.ingredients.length);
  } else if (state === "error") {
    clearFieldErrors(draft.ingredients.length);
    if (error !== null) {
      const message = errorMessage(error);
      if (
        error.field !== null &&
        error.row !== null &&
        ROW_FIELDS.includes(error.field)
      ) {
        setFieldError(error.row, error.field, message);
        statusEl.textContent = `${t.rowErrorPrefix(error.row)}${t.fieldErrorJoiner}${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          const target = fieldInput(error.row, error.field);
          if (target !== null) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    renderResult(result);
    statusEl.textContent = t.successSummary(result);
    resultsEl.hidden = false;
    clearFieldErrors(draft.ingredients.length);
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  const first = fieldInput(1, "name");
  if (first !== null) first.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

addBtn.addEventListener("click", () => {
  controller.addRow();
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusEl.textContent = errorMessage(report.error);
    return;
  }
  revokeReportUrl();
  const blob = new Blob([report.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportRevokeTimer = setTimeout(revokeReportUrl, 30000);
  statusEl.textContent = t.downloaded;
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeReportUrl();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
  }
});

render(controller.getState());
