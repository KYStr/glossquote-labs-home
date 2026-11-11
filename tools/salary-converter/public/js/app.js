// DOM wiring for the Salary Converter. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import {
  BASES,
  FIELDS,
  REPORT_FILENAME,
  formatAmount,
  serializeReport,
} from "./core/salary.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const RESULT_KEYS = ["monthly", "daily", "hourly", "annualBase", "bonusAmount", "annualTotal"];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      sourceBasis: "計算基準",
      amount: "金額（新台幣）",
      bonusMonths: "年終獎金（月數）",
    },
    error: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長。",
      UNICODE: "輸入含有不完整的字元。",
      EMPTY: "此欄必填。",
      ENUM: "請選擇有效的計算基準。",
      DECIMAL_FORMAT: "數字格式不正確。",
      RANGE: "數值超出允許範圍。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    labelSep: "：",
    statusEmpty: "尚未換算。請輸入金額，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「換算薪資」執行。",
    resultLabel: {
      monthly: "月薪",
      daily: "日薪",
      hourly: "時薪",
      annualBase: "年薪（不含獎金）",
      bonusAmount: "年終獎金",
      annualTotal: "年薪（含獎金）",
    },
    summary: (result) =>
      `換算完成：月薪 ${formatAmount(result.monthly)} 元、日薪 ${formatAmount(result.daily)} 元、時薪 ${formatAmount(result.hourly)} 元，年薪（含獎金）${formatAmount(result.annualTotal)} 元。`,
  },
  en: {
    fieldLabel: {
      sourceBasis: "Salary basis",
      amount: "Amount (NT$)",
      bonusMonths: "Year-end bonus (months)",
    },
    error: {
      SCHEMA: "The input shape is invalid.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an unpaired surrogate.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid salary basis.",
      DECIMAL_FORMAT: "Invalid number format.",
      RANGE: "The value is outside the allowed range.",
      INTERNAL: "Processing failed. Try again.",
      WORKER_ERROR: "Processing failed. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    labelSep: ": ",
    statusEmpty: "Nothing converted yet. Enter an amount, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Convert salary” to compute it.",
    resultLabel: {
      monthly: "Monthly salary",
      daily: "Daily pay",
      hourly: "Hourly pay",
      annualBase: "Annual salary (excl. bonus)",
      bonusAmount: "Year-end bonus",
      annualTotal: "Annual salary (incl. bonus)",
    },
    summary: (result) =>
      `Converted: monthly ${formatAmount(result.monthly)}, daily ${formatAmount(result.daily)}, hourly ${formatAmount(result.hourly)}; annual salary including bonus ${formatAmount(result.annualTotal)} (NT$).`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("salary-form");
const inputs = {
  amount: document.getElementById("field-amount"),
  bonusMonths: document.getElementById("field-bonusMonths"),
};
const basisInputs = {};
for (const basis of BASES) {
  basisInputs[basis] = document.getElementById(`field-sourceBasis-${basis}`);
}
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("result-rows");
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

function fieldFocusTarget(field, draft) {
  if (field === "sourceBasis") return basisInputs[draft.sourceBasis] ?? basisInputs.monthly;
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const targets = field === "sourceBasis" ? Object.values(basisInputs) : [inputs[field]];
  if (message === null) {
    for (const target of targets) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  for (const target of targets) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function renderResults(result) {
  tableBody.replaceChildren();
  for (const key of RESULT_KEYS) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = t.resultLabel[key];
    tr.appendChild(labelCell);
    const valueCell = document.createElement("td");
    valueCell.textContent = formatAmount(result[key]);
    tr.appendChild(valueCell);
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of ["amount", "bonusMonths"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const basis of BASES) {
    basisInputs[basis].checked = draft.sourceBasis === basis;
  }
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
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.labelSep}${message}`;
        if (submitted) {
          submitted = false;
          fieldFocusTarget(error.field, draft)?.focus();
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
    renderResults(result);
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

for (const field of ["amount", "bonusMonths"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const basis of BASES) {
  basisInputs[basis].addEventListener("change", () => {
    if (basisInputs[basis].checked) controller.edit({ sourceBasis: basis });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  basisInputs.monthly.focus();
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
