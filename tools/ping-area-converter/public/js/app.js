// DOM wiring for the Ping Area Converter. All user-visible text is
// set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this
// file only renders it. The fixed quick table (ping 1-100) is
// rendered once at load from the same pure core and does not depend
// on the input. The fixed report download (ping-area-report.json)
// is created only on an explicit click, from the current success
// snapshot, and its Blob URL is revoked within 30 seconds or as
// soon as the result is invalidated.

import { createController } from "./controller.mjs";
import {
  buildQuickTable,
  buildReport,
  formatValue,
  DISPLAY_DECIMALS,
  FIELDS,
} from "./core/ping-area.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const TATAMI_LABEL = {
  "zh-Hant": "畳（概略，1 畳 = 1.62 m² 廣告慣例）",
  en: "Tatami (approximate; 1 tatami = 1.62 m² advertising convention)",
};

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      amount: "數量",
      unit: "單位",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "此欄必填",
      DECIMAL_FORMAT: "請輸入最多三位小數的數字",
      RANGE: "數值須大於 0 且不超過 1,000,000",
      ENUM: "請選擇單位",
      OUTPUT_LIMIT: "報告超過大小上限",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    statusEmpty: "尚未換算。輸入數量並選擇單位，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    statusSuccess: "換算完成",
    exampleNote: "已載入範例（合成案例），請按「換算」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelPing: "坪",
    labelM2: "平方公尺 (m²)",
    labelFt2: "平方英尺 (ft²)",
  },
  en: {
    fieldLabel: {
      amount: "Amount",
      unit: "Unit",
    },
    error: {
      SCHEMA: "The input shape is not valid.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an invalid character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with at most three decimal places.",
      RANGE: "The value must be greater than 0 and at most 1,000,000.",
      ENUM: "Choose a unit.",
      OUTPUT_LIMIT: "The report exceeds the size limit.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    statusEmpty: "Nothing converted yet. Enter an amount and choose a unit, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    statusSuccess: "Conversion complete",
    exampleNote: "Example loaded (synthetic case). Press “Convert” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelPing: "Ping",
    labelM2: "Square metres (m²)",
    labelFt2: "Square feet (ft²)",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  amount: document.getElementById("field-amount"),
  unit: document.getElementById("field-unit"),
};
const fieldErrors = {
  amount: document.getElementById("error-amount"),
  unit: document.getElementById("error-unit"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultRows = document.getElementById("result-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const quickTableBody = document.getElementById("quick-table-body");

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

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = inputs[field];
  if (message === null) {
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderResult(result) {
  resultRows.replaceChildren();
  const rows = [
    [t.labelPing, formatValue(result.ping, DISPLAY_DECIMALS.ping)],
    [t.labelM2, formatValue(result.m2, DISPLAY_DECIMALS.m2)],
    [t.labelFt2, formatValue(result.ft2, DISPLAY_DECIMALS.ft2)],
    [TATAMI_LABEL[lang], formatValue(result.tatami, DISPLAY_DECIMALS.tatami)],
  ];
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    resultRows.appendChild(div);
  }
}

// The fixed quick table is identical on both language pages (only
// the header text differs, and that is static markup); its numbers
// come from the same pure core as a single conversion.
function renderQuickTable() {
  const { rows } = buildQuickTable();
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const pingCell = document.createElement("td");
    pingCell.textContent = String(row.ping);
    const m2Cell = document.createElement("td");
    m2Cell.textContent = formatValue(row.m2, DISPLAY_DECIMALS.m2);
    const ft2Cell = document.createElement("td");
    ft2Cell.textContent = formatValue(row.ft2, DISPLAY_DECIMALS.ft2);
    tr.append(pingCell, m2Cell, ft2Cell);
    fragment.appendChild(tr);
  }
  quickTableBody.replaceChildren(fragment);
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();

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
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
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
    renderResult(result);
    statusEl.textContent = t.statusSuccess;
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

inputs.amount.addEventListener("input", () => {
  controller.edit({ amount: inputs.amount.value });
});

inputs.unit.addEventListener("change", () => {
  controller.edit({ unit: inputs.unit.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.amount.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.draft, snapshot.result);
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

renderQuickTable();
render(controller.getState());
