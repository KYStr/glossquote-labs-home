// DOM wiring for the Car Depreciation Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.
// Switching the method shows only that method's field; the other methods'
// draft values are kept but never sent to the core.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatMoney,
  serializeReport,
} from "./core/car-depreciation.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    methodLabel: {
      declining: "定率遞減",
      straight: "直線法",
      table: "逐年費率表",
    },
    fieldLabel: {
      method: "計算方式",
      price: "購入價（新臺幣）",
      years: "年數",
      salvagePercent: "殘值下限（%）",
      rate: "年折舊率（%）",
      usefulLife: "直線攤提年數",
      tableRates: "逐年折舊率（%，每行一年）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇計算方式",
      INTEGER_FORMAT: "請輸入整數",
      DECIMAL_FORMAT: "請輸入數字，最多兩位小數",
      ROW_LIMIT: "費率表最多 30 行",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未計算。請輸入購入價與年數，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算折舊」執行。",
    summary: (result) => {
      const floorPart =
        result.floorReachedYear === null
          ? "尚未達到殘值下限。"
          : `於第 ${result.floorReachedYear} 年達到殘值下限。`;
      return (
        `目前估值 NT$${formatMoney(result.currentValue)}，累計折舊 NT$${formatMoney(result.totalDepreciation)}（${result.totalDepreciationPercent}%）。` +
        `殘值下限 NT$${formatMoney(result.floorValue)}；${floorPart}`
      );
    },
    emptyScheduleNote: "逐年表為空（年數為 0），目前估值等於購入價。",
    flooredLabel: "✓ 已達殘值下限",
    notFlooredLabel: "—",
    rateDash: "—",
    rowErrorSuffix: (row) => `（第 ${row} 行）`,
  },
  en: {
    methodLabel: {
      declining: "Declining balance",
      straight: "Straight line",
      table: "Year-by-year rate table",
    },
    fieldLabel: {
      method: "Method",
      price: "Purchase price (NT$)",
      years: "Years",
      salvagePercent: "Salvage floor (%)",
      rate: "Annual rate (%)",
      usefulLife: "Straight-line life (years)",
      tableRates: "Yearly rates (%, one per line)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a calculation method.",
      INTEGER_FORMAT: "Enter a whole number.",
      DECIMAL_FORMAT: "Enter a number with at most two decimal places.",
      ROW_LIMIT: "The rate table has at most 30 rows.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter a purchase price and years, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate depreciation” to compute it.",
    summary: (result) => {
      const floorPart =
        result.floorReachedYear === null
          ? "The salvage floor has not been reached."
          : `The salvage floor was reached in year ${result.floorReachedYear}.`;
      return (
        `Current value NT$${formatMoney(result.currentValue)}; total depreciation NT$${formatMoney(result.totalDepreciation)} (${result.totalDepreciationPercent}%). ` +
        `Salvage floor NT$${formatMoney(result.floorValue)}; ${floorPart}`
      );
    },
    emptyScheduleNote: "The year-by-year table is empty (0 years); the current value equals the purchase price.",
    flooredLabel: "✓ At salvage floor",
    notFlooredLabel: "—",
    rateDash: "—",
    rowErrorSuffix: (row) => ` (row ${row})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("car-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const methodSections = {
  declining: document.getElementById("method-fields-declining"),
  straight: document.getElementById("method-fields-straight"),
  table: document.getElementById("method-fields-table"),
};
const tableNote = document.getElementById("table-note");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const emptyScheduleEl = document.getElementById("empty-schedule-note");
const tableBody = document.getElementById("schedule-rows");
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
  const worker = new Worker(url, { type: "module" });
  const originalTerminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    originalTerminate();
    URL.revokeObjectURL(url);
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

function setFieldError(field, message) {
  const input = inputs[field];
  const errorEl = fieldErrors[field];
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function renderSchedule(result) {
  tableBody.replaceChildren();
  for (const row of result.schedule) {
    const tr = document.createElement("tr");
    const yearCell = document.createElement("th");
    yearCell.setAttribute("scope", "row");
    yearCell.textContent = String(row.year);
    tr.appendChild(yearCell);
    const rateCell = document.createElement("td");
    rateCell.textContent = row.ratePercent === null ? t.rateDash : `${row.ratePercent}%`;
    tr.appendChild(rateCell);
    const depCell = document.createElement("td");
    depCell.textContent = formatMoney(row.depreciation);
    tr.appendChild(depCell);
    const endCell = document.createElement("td");
    endCell.textContent = formatMoney(row.endValue);
    tr.appendChild(endCell);
    const statusCell = document.createElement("td");
    statusCell.textContent = row.floored ? t.flooredLabel : t.notFlooredLabel;
    tr.appendChild(statusCell);
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const [method, section] of Object.entries(methodSections)) {
    section.hidden = draft.method !== method;
  }
  tableNote.hidden = draft.method !== "table";
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
    clearFieldErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        const fullMessage =
          error.row === null ? message : `${message}${t.rowErrorSuffix(error.row)}`;
        setFieldError(error.field, fullMessage);
        statusEl.textContent =
          lang === "en"
            ? `${t.fieldLabel[error.field]}: ${fullMessage}`
            : `${t.fieldLabel[error.field]}：${fullMessage}`;
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
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
    statusEl.textContent = summaryEl.textContent;
    emptyScheduleEl.hidden = result.schedule.length !== 0;
    if (result.schedule.length === 0) emptyScheduleEl.textContent = t.emptyScheduleNote;
    renderSchedule(result);
    resultsEl.hidden = false;
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const field of FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.method.focus();
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
