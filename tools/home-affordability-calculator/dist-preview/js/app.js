// DOM wiring for the Home Affordability Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (home-affordability-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.
//
// Error messages follow the SPEC's pinned bilingual templates
// (inputsOutputs): {label} is the field's bilingual label, {raw} the
// raw input, {min}/{max} the pinned range, {front}/{back} the raw cap
// inputs for CAP_ORDER. Money is shown with ASCII digit grouping
// (locale-independent); the machine values never change with locale.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/home-affordability.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      annualIncome: "年收入",
      downPayment: "頭期款",
      mortgageRate: "房貸年利率",
      years: "年期",
      otherDebts: "每月其他債務",
      frontEndCapPct: "前端上限",
      backEndCapPct: "後端上限",
    },
    rangeDisplay: {
      annualIncome: ["1", "1,000,000,000"],
      downPayment: ["0", "1,000,000,000"],
      mortgageRate: ["0", "30"],
      years: ["1", "40"],
      otherDebts: ["0", "1,000,000"],
      frontEndCapPct: ["10", "50"],
      backEndCapPct: ["20", "60"],
    },
    error: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: (label) => `${label}輸入過長。`,
      EMPTY: (label) => `請輸入${label}。`,
      INTEGER_FORMAT: (label, raw) => `${label}須為整數，你輸入的是「${raw}」。`,
      DECIMAL_FORMAT: (label, raw) => `${label}格式不正確，你輸入的是「${raw}」。`,
      RANGE: (label, raw, min, max) =>
        `${label}須介於 ${min} 至 ${max} 之間，你輸入的是「${raw}」。`,
      CAP_ORDER: (front, back) =>
        `後端上限不可低於前端上限，你輸入的前端上限是 ${front}%，後端上限是 ${back}%。`,
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載。",
    },
    statusEmpty: "尚未計算。輸入年收入、頭期款、房貸利率、年期與其他債務，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（典型情境：年收入 120 萬、頭期款 200 萬、利率 2%、30 年），請按「計算購屋能力」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelMonthlyIncome: "月收入",
    labelFrontEndLimit: "前端上限金額",
    labelBackEndLimit: "後端上限金額",
    labelMaxPayment: "最高月付",
    labelBindingCap: "綁定的上限",
    labelMaxLoan: "最高貸款",
    labelMaxPrice: "最高房價",
    labelFrontPct: "最高月付時前端比率",
    labelBackPct: "最高月付時後端比率",
    labelAffordable: "仍有貸款額度",
    bindingValue: {
      front: "● 前端上限（綁定）",
      back: "● 後端上限（綁定）",
      equal: "● 前後端上限相等",
    },
    affordableYes: "是",
    affordableNo: "否",
    noRoomNote: "⚠ 無貸款額度：最高房價等於頭期款，僅能全現金購屋，或先降低其他債務、再調高上限假設重算。",
    moneySuffix: " 元",
    successSummary: (result) =>
      `最高房價：${formatMoney(result.maxHomePrice)} 元；最高月付：${formatMoney(result.maxMonthlyPayment)} 元`,
  },
  en: {
    fieldLabel: {
      annualIncome: "Annual income",
      downPayment: "Down payment",
      mortgageRate: "Mortgage annual rate",
      years: "Term",
      otherDebts: "Other monthly debts",
      frontEndCapPct: "Front-end cap",
      backEndCapPct: "Back-end cap",
    },
    rangeDisplay: {
      annualIncome: ["1", "1,000,000,000"],
      downPayment: ["0", "1,000,000,000"],
      mortgageRate: ["0", "30"],
      years: ["1", "40"],
      otherDebts: ["0", "1,000,000"],
      frontEndCapPct: ["10", "50"],
      backEndCapPct: ["20", "60"],
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: (label) => `${label} input is too long.`,
      EMPTY: (label) => `Enter ${label}.`,
      INTEGER_FORMAT: (label, raw) => `${label} must be an integer; you entered “${raw}”.`,
      DECIMAL_FORMAT: (label, raw) => `${label} has an invalid format; you entered “${raw}”.`,
      RANGE: (label, raw, min, max) =>
        `${label} must be between ${min} and ${max}; you entered “${raw}”.`,
      CAP_ORDER: (front, back) =>
        `The back-end cap must not be lower than the front-end cap; you entered a front-end cap of ${front}% and a back-end cap of ${back}%.`,
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty:
      "Nothing calculated yet. Enter annual income, down payment, mortgage rate, term and other debts, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote:
      "Example loaded (typical case: annual income NTD 1,200,000, down payment NTD 2,000,000, rate 2%, 30 years). Press “Calculate home affordability” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelMonthlyIncome: "Monthly gross income",
    labelFrontEndLimit: "Front-end limit",
    labelBackEndLimit: "Back-end limit",
    labelMaxPayment: "Maximum monthly payment",
    labelBindingCap: "Binding cap",
    labelMaxLoan: "Maximum loan",
    labelMaxPrice: "Maximum home price",
    labelFrontPct: "Front-end ratio at maximum payment",
    labelBackPct: "Back-end ratio at maximum payment",
    labelAffordable: "Loan room available",
    bindingValue: {
      front: "● Front-end cap (binding)",
      back: "● Back-end cap (binding)",
      equal: "● Front-end and back-end caps are equal",
    },
    affordableYes: "Yes",
    affordableNo: "No",
    noRoomNote:
      "⚠ No loan room: the maximum home price equals the down payment (a cash-only purchase), unless you lower other debts or raise the cap assumption and recalculate.",
    moneySuffix: "",
    successSummary: (result) =>
      `Maximum home price: NTD ${formatMoney(result.maxHomePrice)}; maximum monthly payment: NTD ${formatMoney(result.maxMonthlyPayment)}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

function formatMoney(value) {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}`;
}

function formatMoneyLabel(value) {
  if (lang === "en") return `NTD ${formatMoney(value)}`;
  return `${formatMoney(value)}${t.moneySuffix}`;
}

function formatPct(value) {
  return `${value.toFixed(1)}%`;
}

const form = document.getElementById("entry-form");
const inputs = {};
const fieldErrors = {};
for (const field of FIELDS) {
  inputs[field] = document.getElementById(`field-${field}`);
  fieldErrors[field] = document.getElementById(`error-${field}`);
}
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const noRoomNoteEl = document.getElementById("no-room-note");
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

function errorMessage(error, draft) {
  const label = error.field !== null ? t.fieldLabel[error.field] : null;
  const raw = error.field !== null ? (draft[error.field] ?? "") : "";
  switch (error.code) {
    case "INPUT_LIMIT":
      return t.error.INPUT_LIMIT(label);
    case "EMPTY":
      return t.error.EMPTY(label);
    case "INTEGER_FORMAT":
      return t.error.INTEGER_FORMAT(label, raw);
    case "DECIMAL_FORMAT":
      return t.error.DECIMAL_FORMAT(label, raw);
    case "RANGE": {
      const [min, max] = t.rangeDisplay[error.field];
      return t.error.RANGE(label, raw, min, max);
    }
    case "CAP_ORDER":
      return t.error.CAP_ORDER(draft.frontEndCapPct, draft.backEndCapPct);
    default:
      return t.error[error.code] ?? t.error.INTERNAL;
  }
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
    [t.labelMonthlyIncome, formatMoneyLabel(result.monthlyGrossIncome)],
    [t.labelFrontEndLimit, formatMoneyLabel(result.frontEndLimit)],
    [t.labelBackEndLimit, formatMoneyLabel(result.backEndLimit)],
    [t.labelMaxPayment, formatMoneyLabel(result.maxMonthlyPayment)],
    [t.labelBindingCap, t.bindingValue[result.bindingCap]],
    [t.labelMaxLoan, formatMoneyLabel(result.maxLoanAmount)],
    [t.labelMaxPrice, formatMoneyLabel(result.maxHomePrice)],
    [t.labelFrontPct, formatPct(result.frontEndPctAtMax)],
    [t.labelBackPct, formatPct(result.backEndPctAtMax)],
    [
      t.labelAffordable,
      result.affordable ? t.affordableYes : t.affordableNo,
    ],
  ]);
  noRoomNoteEl.hidden = result.affordable;
  if (!result.affordable) noRoomNoteEl.textContent = t.noRoomNote;
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
      const message = errorMessage(error, draft);
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
  inputs.annualIncome.focus();
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
    statusEl.textContent = errorMessage(report.error, snapshot.draft);
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
