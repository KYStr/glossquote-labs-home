// DOM wiring for the Life Insurance Calculator. All user-visible
// text is set through textContent/value only; user input never
// becomes markup. Computation runs in a module Worker built from the
// fixed worker source embedded by the preview build (WORKER_SOURCE).
// The controller owns the draft, generation, and state machine; this
// file only renders it. The fixed report download
// (life-insurance-calculator-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob URL
// is revoked within 30 seconds or as soon as the result is
// invalidated.

import { createController } from "./controller.mjs";
import {
  buildReport,
  FIELDS,
  formatMoney,
} from "./core/life-insurance.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      annualIncome: "年收入",
      supportYears: "扶養年數",
      dependents: "扶養人數",
      educationPerChild: "每位扶養人教育費用",
      mortgageBalance: "房貸餘額",
      otherDebts: "其他負債",
      finalExpenses: "喪葬與處理費用",
      existingCoverage: "現有壽險保障",
      liquidAssets: "可動用資產",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數（NT$），不含小數、符號或空白",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      annualIncome: "年收入須在 0 至 99,999,999 NT$ 之間",
      supportYears: "扶養年數須在 0 至 40 年之間",
      dependents: "扶養人數須在 0 至 10 人之間",
      educationPerChild: "每位扶養人教育費用須在 0 至 9,999,999 NT$ 之間",
      mortgageBalance: "房貸餘額須在 0 至 99,999,999 NT$ 之間",
      otherDebts: "其他負債須在 0 至 99,999,999 NT$ 之間",
      finalExpenses: "喪葬與處理費用須在 0 至 9,999,999 NT$ 之間",
      existingCoverage: "現有壽險保障須在 0 至 99,999,999 NT$ 之間",
      liquidAssets: "可動用資產須在 0 至 99,999,999 NT$ 之間",
    },
    statusEmpty: "尚未試算。輸入年收入、扶養年數與其他數字，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（典型雙扶養家庭），請按「計算建議保額」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelRecommended: "建議保額",
    labelStatus: "狀態",
    labelNeedsTotal: "需求總額",
    labelOffsetsTotal: "扣抵總額",
    labelBenchmark: "10 倍年收入對照值",
    labelDifference: "與對照值的差距",
    labelIncomeReplacement: "收入替代（年收入 × 扶養年數）",
    labelMortgage: "房貸餘額",
    labelOtherDebts: "其他負債",
    labelFinalExpenses: "喪葬與處理費用",
    labelEducationTotal: "教育費用總額",
    labelExistingCoverage: "現有壽險保障",
    labelLiquidAssets: "可動用資產",
    statusText: {
      shortfall: "保障缺口",
      covered: "已足夠",
    },
    money: (value) => `NT$ ${formatMoney(value)}`,
    successSummary: (result) =>
      `建議保額：NT$ ${formatMoney(result.recommendedCoverage)}（${result.status === "covered" ? "已足夠" : "保障缺口"}）`,
  },
  en: {
    fieldLabel: {
      annualIncome: "Annual income",
      supportYears: "Support years",
      dependents: "Dependents",
      educationPerChild: "Education cost per dependent",
      mortgageBalance: "Mortgage balance",
      otherDebts: "Other debts",
      finalExpenses: "Final expenses",
      existingCoverage: "Existing coverage",
      liquidAssets: "Liquid assets",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number (NT$) with no decimal, sign, or space.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      annualIncome: "Annual income must be between 0 and 99,999,999 NT$.",
      supportYears: "Support years must be between 0 and 40 years.",
      dependents: "Dependents must be between 0 and 10 people.",
      educationPerChild: "Education cost per dependent must be between 0 and 9,999,999 NT$.",
      mortgageBalance: "Mortgage balance must be between 0 and 99,999,999 NT$.",
      otherDebts: "Other debts must be between 0 and 99,999,999 NT$.",
      finalExpenses: "Final expenses must be between 0 and 9,999,999 NT$.",
      existingCoverage: "Existing coverage must be between 0 and 99,999,999 NT$.",
      liquidAssets: "Liquid assets must be between 0 and 99,999,999 NT$.",
    },
    statusEmpty:
      "Nothing estimated yet. Enter annual income, support years and the other figures, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote:
      "Example loaded (typical two-dependent family). Press “Calculate recommended coverage” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelRecommended: "Recommended coverage",
    labelStatus: "Status",
    labelNeedsTotal: "Total need",
    labelOffsetsTotal: "Total offsets",
    labelBenchmark: "10× income benchmark",
    labelDifference: "Difference vs benchmark",
    labelIncomeReplacement: "Income replacement (annual income × support years)",
    labelMortgage: "Mortgage balance",
    labelOtherDebts: "Other debts",
    labelFinalExpenses: "Final expenses",
    labelEducationTotal: "Total education cost",
    labelExistingCoverage: "Existing coverage",
    labelLiquidAssets: "Liquid assets",
    statusText: {
      shortfall: "Shortfall",
      covered: "Covered",
    },
    money: (value) => `NT$ ${formatMoney(value)}`,
    successSummary: (result) =>
      `Recommended coverage: NT$ ${formatMoney(result.recommendedCoverage)} (${result.status === "covered" ? "Covered" : "Shortfall"})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

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
const breakdownRows = document.getElementById("breakdown-rows");
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
    [t.labelRecommended, t.money(result.recommendedCoverage)],
    [t.labelStatus, t.statusText[result.status]],
    [t.labelNeedsTotal, t.money(result.needsTotal)],
    [t.labelOffsetsTotal, t.money(result.offsets.totalOffsets)],
    [t.labelBenchmark, t.money(result.multipleBenchmark)],
    [t.labelDifference, t.money(result.differenceVsBenchmark)],
  ]);
  appendSummaryRows(breakdownRows, [
    [t.labelIncomeReplacement, t.money(result.breakdown.incomeReplacement)],
    [t.labelMortgage, t.money(result.breakdown.mortgageBalance)],
    [t.labelOtherDebts, t.money(result.breakdown.otherDebts)],
    [t.labelFinalExpenses, t.money(result.breakdown.finalExpenses)],
    [t.labelEducationTotal, t.money(result.breakdown.educationTotal)],
    [t.labelExistingCoverage, t.money(result.offsets.existingCoverage)],
    [t.labelLiquidAssets, t.money(result.offsets.liquidAssets)],
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
