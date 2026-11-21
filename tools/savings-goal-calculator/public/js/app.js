// DOM wiring for the Savings Goal Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, sequence, and state machine; this file only renders
// it. The draft lives only in this page: there is no persistent
// storage anywhere in this tool, and switching language or leaving
// the page discards the draft.

import { createController } from "./controller.mjs";
import {
  DISCLOSURE,
  FIELDS,
  REPORT_FILENAME,
  STATUS_SENTENCES,
  formatMoneyDisplay,
  serializeReport,
} from "./core/savings-goal.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT_MONEY: "金額請用數字，最多 2 位小數",
      DECIMAL_FORMAT_RATE: "年利率請用數字，最多 2 位小數",
      INTEGER_FORMAT: "期限請用整數",
      RANGE_MONTHS: "期限為 1–600 個月",
      RANGE_RATE: "年利率為 0–100%",
      RANGE_TARGET: "目標金額為 0.01–999,999,999.99",
      RANGE_MONEY: "金額為 0–999,999,999.99",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    summaryPayment: (result) =>
      `每月需存 ${formatMoneyDisplay(result.monthlyPayment)} 元，共 ${result.months} 個月。`,
    summaryMonths: (result) =>
      `約 ${result.monthsRequired} 個月達標，最後一月存 ${formatMoneyDisplay(result.finalMonthPayment)} 元。`,
    exampleNote: "已載入範例，請按「計算儲蓄計畫」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT_MONEY: "Enter the amount as a number, with at most 2 decimal places.",
      DECIMAL_FORMAT_RATE: "Enter the annual rate as a number, with at most 2 decimal places.",
      INTEGER_FORMAT: "Enter the term as a whole number.",
      RANGE_MONTHS: "The term must be 1–600 months.",
      RANGE_RATE: "The annual rate must be 0–100%.",
      RANGE_TARGET: "The goal amount must be 0.01–999,999,999.99.",
      RANGE_MONEY: "The amount must be 0–999,999,999.99.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    summaryPayment: (result) =>
      `Deposit ${formatMoneyDisplay(result.monthlyPayment)} per month for ${result.months} months.`,
    summaryMonths: (result) =>
      `About ${result.monthsRequired} months to reach the goal; deposit ${formatMoneyDisplay(result.finalMonthPayment)} in the final month.`,
    exampleNote: "Example loaded. Run “Calculate savings plan” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

function errorMessage(error) {
  if (error === null) return null;
  const messages = t.error;
  switch (error.code) {
    case "DECIMAL_FORMAT":
      return error.field === "annualRate"
        ? messages.DECIMAL_FORMAT_RATE
        : messages.DECIMAL_FORMAT_MONEY;
    case "RANGE":
      if (error.field === "months") return messages.RANGE_MONTHS;
      if (error.field === "annualRate") return messages.RANGE_RATE;
      if (error.field === "targetAmount") return messages.RANGE_TARGET;
      return messages.RANGE_MONEY;
    default:
      return messages[error.code] ?? messages.INTERNAL;
  }
}

function statusSentence(result) {
  if (result === null) return null;
  if (result.status === "already-funded") return STATUS_SENTENCES["already-funded"];
  if (result.status === "growth-sufficient") return STATUS_SENTENCES["growth-sufficient"];
  if (result.status === "unreachable" && result.reason === "no-growth") {
    return STATUS_SENTENCES["unreachable-no-growth"];
  }
  if (result.status === "unreachable" && result.reason === "beyond-horizon") {
    return STATUS_SENTENCES["unreachable-beyond-horizon"];
  }
  return null;
}

const form = document.getElementById("savings-goal-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("result-summary");
const sentenceEl = document.getElementById("status-sentence");
const disclosureEl = document.getElementById("disclosure");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

const DETAIL_ROWS = [
  "months",
  "monthlyPayment",
  "totalDeposits",
  "totalInterest",
  "finalBalance",
  "monthsRequired",
  "finalMonthPayment",
  "balanceIfFullPayment",
];
const rowEls = {};
const valueEls = {};
for (const key of DETAIL_ROWS) {
  rowEls[key] = document.getElementById(`row-${key}`);
  valueEls[key] = document.getElementById(`value-${key}`);
}

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

function showDetail(key, text) {
  rowEls[key].hidden = false;
  valueEls[key].textContent = text;
}

function hideDetail(key) {
  rowEls[key].hidden = true;
  valueEls[key].textContent = "";
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  inputs.months.disabled = draft.mode !== "payment";
  inputs.monthlyPayment.disabled = draft.mode !== "months";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    const sentence = statusSentence(result);
    if (sentence !== null) {
      summaryEl.textContent = `${sentence.zh} / ${sentence.en}`;
      sentenceEl.hidden = true;
      sentenceEl.textContent = "";
    } else if (result.mode === "payment") {
      summaryEl.textContent = t.summaryPayment(result);
      sentenceEl.hidden = true;
      sentenceEl.textContent = "";
    } else {
      summaryEl.textContent = t.summaryMonths(result);
      sentenceEl.hidden = true;
      sentenceEl.textContent = "";
    }
    for (const key of DETAIL_ROWS) hideDetail(key);
    if (result.status === "unreachable") {
      // No numeric values to show; the pinned sentence is the summary.
    } else if (result.mode === "payment") {
      showDetail("months", String(result.months));
      showDetail("monthlyPayment", formatMoneyDisplay(result.monthlyPayment));
      showDetail("totalDeposits", formatMoneyDisplay(result.totalDeposits));
      showDetail("totalInterest", formatMoneyDisplay(result.totalInterest));
      showDetail("finalBalance", formatMoneyDisplay(result.finalBalance));
    } else {
      showDetail("monthsRequired", String(result.monthsRequired));
      showDetail("finalMonthPayment", formatMoneyDisplay(result.finalMonthPayment));
      showDetail("balanceIfFullPayment", formatMoneyDisplay(result.balanceIfFullPayment));
      showDetail("totalDeposits", formatMoneyDisplay(result.totalDeposits));
      showDetail("totalInterest", formatMoneyDisplay(result.totalInterest));
      showDetail("finalBalance", formatMoneyDisplay(result.finalBalance));
    }
    disclosureEl.textContent = `${DISCLOSURE.zh} / ${DISCLOSURE.en}`;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      }
      // The status region keeps the pinned status string; the detail
      // lives in the field's own error slot (role="alert").
    }
  } else {
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
inputs.mode.addEventListener("change", () => {
  controller.edit({ mode: inputs.mode.value });
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.mode.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null || current.input === null) return;
  const serialized = serializeReport({ input: current.input, result: current.result });
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
