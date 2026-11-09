// DOM wiring for the Retry Time Budget Planner. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/retry.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const PAGE_SIZE = 25;
const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      budget: "總預算（毫秒）",
      timeout: "單次逾時（毫秒）",
      attemptLimit: "嘗試上限（次，含第一次）",
      initialDelay: "初始間隔（毫秒）",
      factor: "倍率",
      maxDelay: "間隔上限（毫秒）",
    },
    error: {
      SCHEMA: "輸入格式不正確，請重新填寫。",
      EMPTY: "此欄不可為空。",
      INPUT_LIMIT: "此欄最多 8 位數字。",
      UNICODE: "此欄含有無法處理的字元。",
      INTEGER_FORMAT: "請輸入不含小數、符號或空白的整數。",
      RANGE: "超出允許範圍。",
      INTERNAL: "計算時發生內部錯誤，草稿已保留，請再試一次。",
      WORKER_ERROR: "背景工作無法完成，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超過 2,097,152 位元組，無法下載。",
    },
    statusEmpty: "尚未計算。請輸入數值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中…",
    statusCancelled: "已取消，可重新執行。",
    exampleNote: "已載入範例，請按「計算重試時間表」執行。",
    summaryFits: (count, unspent) => `可完成 ${count} 次嘗試，未使用 ${unspent} 毫秒。`,
    summaryRejected: (number, start, end) =>
      `第 ${number} 次嘗試第一次超界：開始 ${start} 毫秒，結束 ${end} 毫秒。`,
    summaryAllFit: "全部嘗試都在預算內。",
    summaryNone: "第一次嘗試就超出預算。",
    tableAttempt: "嘗試",
    tableDelay: "間隔（毫秒）",
    tableStart: "開始（毫秒）",
    tableEnd: "結束（毫秒）",
    pageLabel: (page, pages) => `第 ${page} / ${pages} 頁`,
    prevPage: "上一頁",
    nextPage: "下一頁",
  },
  en: {
    fieldLabel: {
      budget: "Total budget (ms)",
      timeout: "Per-attempt timeout (ms)",
      attemptLimit: "Attempt limit (including the first)",
      initialDelay: "Initial delay (ms)",
      factor: "Multiplier",
      maxDelay: "Delay cap (ms)",
    },
    error: {
      SCHEMA: "The input is malformed. Please fill in the fields again.",
      EMPTY: "This field is required.",
      INPUT_LIMIT: "This field allows at most 8 digits.",
      UNICODE: "This field contains an unsupported character.",
      INTEGER_FORMAT: "Enter an integer without decimals, signs, or spaces.",
      RANGE: "Out of the allowed range.",
      INTERNAL: "An internal error occurred while calculating. Your draft is kept; please try again.",
      WORKER_ERROR: "The background worker could not finish. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter values or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working…",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate retry timeline” to compute it.",
    summaryFits: (count, unspent) => `Fits ${count} attempt${count === 1 ? "" : "s"}, ${unspent} ms unspent.`,
    summaryRejected: (number, start, end) =>
      `Attempt ${number} is the first to exceed the budget: starts at ${start} ms, ends at ${end} ms.`,
    summaryAllFit: "All attempts fit within the budget.",
    summaryNone: "The first attempt already exceeds the budget.",
    tableAttempt: "Attempt",
    tableDelay: "Delay (ms)",
    tableStart: "Start (ms)",
    tableEnd: "End (ms)",
    pageLabel: (page, pages) => `Page ${page} of ${pages}`,
    prevPage: "Previous page",
    nextPage: "Next page",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("retry-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("attempt-rows");
const paginationEl = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageLabelEl = document.getElementById("page-label");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let currentPage = 1;
let lastResult = null;
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

function renderTable(result) {
  const attempts = result.attempts;
  const pages = Math.max(1, Math.ceil(attempts.length / PAGE_SIZE));
  if (currentPage > pages) currentPage = pages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = attempts.slice(start, start + PAGE_SIZE);
  tableBody.replaceChildren();
  for (const attempt of rows) {
    const tr = document.createElement("tr");
    for (const value of [attempt.number, attempt.delayMs, attempt.startMs, attempt.endMs]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
  pageLabelEl.textContent = t.pageLabel(currentPage, pages);
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= pages;
  paginationEl.hidden = pages <= 1;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
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
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
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
    lastResult = result;
    currentPage = 1;
    const parts = [t.summaryFits(result.attempts.length, result.unspentMs)];
    if (result.nextRejected !== null) {
      parts.push(
        t.summaryRejected(result.nextRejected.number, result.nextRejected.startMs, result.nextRejected.endMs),
      );
    } else if (result.attempts.length === 0) {
      parts.push(t.summaryNone);
    } else {
      parts.push(t.summaryAllFit);
    }
    summaryEl.textContent = parts.join(" ");
    statusEl.textContent = summaryEl.textContent;
    renderTable(result);
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
  inputs.budget.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1 && lastResult !== null) {
    currentPage -= 1;
    renderTable(lastResult);
  }
});

nextBtn.addEventListener("click", () => {
  if (lastResult !== null) {
    const pages = Math.max(1, Math.ceil(lastResult.attempts.length / PAGE_SIZE));
    if (currentPage < pages) {
      currentPage += 1;
      renderTable(lastResult);
    }
  }
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

render(controller.getState());
