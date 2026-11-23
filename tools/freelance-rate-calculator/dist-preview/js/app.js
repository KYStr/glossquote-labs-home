// DOM wiring for the Freelance Rate Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (freelance-rate-calculator-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob URL
// is revoked within 30 seconds or as soon as the result is
// invalidated. Displayed amounts use thousands separators; the
// machine values never change with locale.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/freelance-rate.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      targetAnnualIncome: "目標年收入（NT$）",
      workingDaysPerYear: "年工作天數",
      hoursPerDay: "每日工時",
      billableUtilizationPercent: "可計費使用率（%）",
      overheadPercent: "間接成本（%）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數，不含小數、符號或空白",
      DECIMAL_FORMAT: "請輸入數字，最多 1 位小數，不含符號或空白",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      targetAnnualIncome: "目標年收入須在 1 至 100,000,000 NT$ 之間",
      workingDaysPerYear: "年工作天數須在 1 至 365 天之間",
      hoursPerDay: "每日工時須在 0.5 至 24 小時之間",
      billableUtilizationPercent: "可計費使用率須在 1 至 100% 之間",
      overheadPercent: "間接成本須在 0 至 100% 之間",
    },
    statusEmpty: "尚未試算。輸入五個數值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：目標年收入 1,200,000 NT$、220 天、每日 8 小時、70% 使用率、20% 間接成本），請按「計算費率」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelHourlyRate: "時薪",
    labelDayRate: "日薪",
    labelMonthlyTarget: "月均目標",
    labelGrossTarget: "目標加間接成本",
    labelBillableDays: "計費天數",
    labelBillableHours: "計費時數",
    moneyValue: (amount) => `NT$ ${groupDigits(amount)}`,
    daysValue: (days) => `${days.toFixed(1)} 天`,
    hoursValue: (hours) => `${hours.toFixed(1)} 小時`,
    successSummary: (result) => `時薪 NT$ ${groupDigits(result.hourlyRate)}，日薪 NT$ ${groupDigits(result.dayRate)}`,
  },
  en: {
    fieldLabel: {
      targetAnnualIncome: "Target annual income (NT$)",
      workingDaysPerYear: "Working days per year",
      hoursPerDay: "Hours per day",
      billableUtilizationPercent: "Billable utilization (%)",
      overheadPercent: "Overhead (%)",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number with no decimal, sign, or space.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place and no sign or space.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      targetAnnualIncome: "Target annual income must be between NT$ 1 and NT$ 100,000,000.",
      workingDaysPerYear: "Working days per year must be between 1 and 365.",
      hoursPerDay: "Hours per day must be between 0.5 and 24.",
      billableUtilizationPercent: "Billable utilization must be between 1% and 100%.",
      overheadPercent: "Overhead must be between 0% and 100%.",
    },
    statusEmpty: "Nothing calculated yet. Enter the five values, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: target annual income NT$ 1,200,000, 220 days, 8 hours per day, 70% utilization, 20% overhead). Press “Calculate rates” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelHourlyRate: "Hourly rate",
    labelDayRate: "Day rate",
    labelMonthlyTarget: "Monthly target",
    labelGrossTarget: "Target plus overhead",
    labelBillableDays: "Billable days",
    labelBillableHours: "Billable hours",
    moneyValue: (amount) => `NT$ ${groupDigits(amount)}`,
    daysValue: (days) => `${days.toFixed(1)} days`,
    hoursValue: (hours) => `${hours.toFixed(1)} hours`,
    successSummary: (result) => `Hourly rate NT$ ${groupDigits(result.hourlyRate)}, day rate NT$ ${groupDigits(result.dayRate)}`,
  },
};

// Thousands separators for display only; the machine value is
// unchanged. Implemented by hand so display grouping never depends
// on host locale.
function groupDigits(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  targetAnnualIncome: document.getElementById("field-targetAnnualIncome"),
  workingDaysPerYear: document.getElementById("field-workingDaysPerYear"),
  hoursPerDay: document.getElementById("field-hoursPerDay"),
  billableUtilizationPercent: document.getElementById("field-billableUtilizationPercent"),
  overheadPercent: document.getElementById("field-overheadPercent"),
};
const fieldErrors = {
  targetAnnualIncome: document.getElementById("error-targetAnnualIncome"),
  workingDaysPerYear: document.getElementById("error-workingDaysPerYear"),
  hoursPerDay: document.getElementById("error-hoursPerDay"),
  billableUtilizationPercent: document.getElementById("error-billableUtilizationPercent"),
  overheadPercent: document.getElementById("error-overheadPercent"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

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
    [t.labelHourlyRate, t.moneyValue(result.hourlyRate)],
    [t.labelDayRate, t.moneyValue(result.dayRate)],
    [t.labelMonthlyTarget, t.moneyValue(result.monthlyTarget)],
    [t.labelGrossTarget, t.moneyValue(result.grossTarget)],
    [t.labelBillableDays, t.daysValue(result.billableDays)],
    [t.labelBillableHours, t.hoursValue(result.billableHours)],
  ]);
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
    statusEl.textContent = t.successSummary(result);
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
  inputs.targetAnnualIncome.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
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
