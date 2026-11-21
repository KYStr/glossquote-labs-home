// DOM wiring for the NHI Premium Calculator. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft lives only in the current page: nothing is persisted, uploaded,
// or sent anywhere.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatAmount,
  serializeReport,
} from "./core/nhi-premium.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      INTEGER_FORMAT: "請用整數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    integerFormat: {
      monthlySalary: "月薪請用整數（新臺幣元），不可含小數或符號",
      dependents: "眷屬人數請用整數",
    },
    resultHeading: "投保級距與每月保費",
    gradeLabel: "投保等級",
    insuredAmountLabel: "投保金額",
    employeeTotalLabel: "員工合計保費",
    selfLabel: "本人保費",
    dependentEachLabel: "每位眷屬保費",
    dependentsChargedLabel: "計費眷屬人數",
    employerLabel: "投保單位負擔",
    governmentLabel: "政府補助",
    unit: "元",
    capNotice: "⚠ 眷屬超過 3 人，以 3 人計",
    dependentsSuffix: (count) => `${count} 人`,
    disclaimer:
      "依健保署 115 年 1 月 1 日生效公告表試算，僅供估算。",
    exampleNote: "已載入範例，請按「試算健保費」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    integerFormat: {
      monthlySalary: "Enter the salary as a whole number of NTD, with no decimals or symbols.",
      dependents: "Enter the number of dependents as a whole number.",
    },
    resultHeading: "Insured grade and monthly premiums",
    gradeLabel: "Insured grade",
    insuredAmountLabel: "Insured amount",
    employeeTotalLabel: "Employee total premium",
    selfLabel: "Insured person's premium",
    dependentEachLabel: "Premium per dependent",
    dependentsChargedLabel: "Dependents charged",
    employerLabel: "Employer share",
    governmentLabel: "Government subsidy",
    unit: "NTD",
    capNotice: "⚠ Only the first 3 dependents are charged.",
    dependentsSuffix: (count) => `${count}`,
    disclaimer:
      "Estimated from NHIA tables effective January 1, 2026.",
    exampleNote: "Example loaded. Run “Calculate NHI premium” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("nhi-premium-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const gradeEl = document.getElementById("grade-value");
const insuredAmountEl = document.getElementById("insured-amount-value");
const employeeTotalEl = document.getElementById("employee-total-value");
const selfEl = document.getElementById("self-premium-value");
const dependentEachEl = document.getElementById("dependent-premium-value");
const dependentsChargedEl = document.getElementById("dependents-charged-value");
const employerEl = document.getElementById("employer-premium-value");
const governmentEl = document.getElementById("government-premium-value");
const capNoticeEl = document.getElementById("cap-notice");
const disclaimerEl = document.getElementById("disclaimer");
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

function errorMessage(error) {
  if (error.code === "INTEGER_FORMAT" && error.field !== null) {
    return t.integerFormat[error.field] ?? t.error.INTEGER_FORMAT;
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    gradeEl.textContent = String(result.grade);
    insuredAmountEl.textContent = `${formatAmount(result.insuredAmount)} ${t.unit}`;
    employeeTotalEl.textContent = `${formatAmount(result.employeeTotalPremium)} ${t.unit}`;
    selfEl.textContent = `${formatAmount(result.selfPremium)} ${t.unit}`;
    dependentEachEl.textContent = `${formatAmount(result.dependentPremiumEach)} ${t.unit}`;
    dependentsChargedEl.textContent = t.dependentsSuffix(result.dependentsCharged);
    employerEl.textContent = `${formatAmount(result.employerPremium)} ${t.unit}`;
    governmentEl.textContent = `${formatAmount(result.governmentPremium)} ${t.unit}`;
    capNoticeEl.hidden = !result.dependentsCapped;
    if (result.dependentsCapped) capNoticeEl.textContent = t.capNotice;
    disclaimerEl.textContent = t.disclaimer;
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

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.monthlySalary.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
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
