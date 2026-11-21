// DOM wiring for the Breakeven Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft lives only in this page: there is no storage, and switching
// language or leaving the page discards it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  NO_MARGIN_TEXT,
  REPORT_FILENAME,
  serializeReport,
} from "./core/breakeven.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      fixedCost: "固定成本",
      price: "單位售價",
      variableCost: "單位變動成本",
      expectedUnits: "預期銷量（選填）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "含有無效字元",
      EMPTY: "必填",
      DECIMAL_FORMAT: "金額格式不正確（最多兩位小數）",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      NO_MARGIN: NO_MARGIN_TEXT.zh,
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    resultHeading: "損益平衡結果",
    resultSummary: (units, revenue) => `至少賣 ${units} 件，做到營收 ${revenue} 才打平。`,
    wholeUnitsNote: "可直接採用",
    exactNote: "理論值，僅供參考",
    belowWarning: "⚠ 預期銷量低於損益平衡銷量",
    marginUnits: (units) => `安全邊際：${units} 件`,
    marginPercent: (percent) => `安全邊際率：${percent} %`,
    expectedProfit: (profit) => `預期利潤：${profit}`,
    exampleNote: "已載入範例，請按「計算損益平衡」執行。",
  },
  en: {
    fieldLabel: {
      fixedCost: "Fixed costs",
      price: "Price per unit",
      variableCost: "Variable cost per unit",
      expectedUnits: "Expected sales volume (optional)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Contains an invalid character.",
      EMPTY: "Required.",
      DECIMAL_FORMAT: "Invalid amount (up to two decimal places).",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      NO_MARGIN: NO_MARGIN_TEXT.en,
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    resultHeading: "Breakeven result",
    resultSummary: (units, revenue) => `Sell at least ${units} units, reaching revenue ${revenue}, to break even.`,
    wholeUnitsNote: "Use this figure",
    exactNote: "Exact figure, for reference only",
    belowWarning: "⚠ Expected volume is below the breakeven volume",
    marginUnits: (units) => `Margin of safety: ${units} units`,
    marginPercent: (percent) => `Margin of safety: ${percent} %`,
    expectedProfit: (profit) => `Expected profit: ${profit}`,
    exampleNote: "Example loaded. Run “Calculate breakeven” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("breakeven-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const noticeEl = document.getElementById("semantic-notice");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("result-summary");
const contributionEl = document.getElementById("result-contribution");
const ratioEl = document.getElementById("result-ratio");
const unitsExactEl = document.getElementById("result-units-exact");
const unitsEl = document.getElementById("result-units");
const revenueExactEl = document.getElementById("result-revenue-exact");
const revenueEl = document.getElementById("result-revenue");
const marginEl = document.getElementById("result-margin");
const marginUnitsEl = document.getElementById("result-margin-units");
const marginPercentEl = document.getElementById("result-margin-percent");
const expectedProfitEl = document.getElementById("result-expected-profit");
const belowEl = document.getElementById("below-warning");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
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

function showNotice(message) {
  noticeEl.hidden = false;
  noticeEl.textContent = message;
}

function hideNotice() {
  noticeEl.hidden = true;
  noticeEl.textContent = "";
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
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    hideNotice();
    clearFieldErrors();
    summaryEl.textContent = t.resultSummary(result.breakevenUnits, result.breakevenRevenue);
    contributionEl.textContent = result.contributionMarginPerUnit;
    ratioEl.textContent = `${result.contributionMarginRatioPercent} %`;
    unitsExactEl.textContent = result.breakevenUnitsExact;
    unitsEl.textContent = String(result.breakevenUnits);
    revenueExactEl.textContent = result.breakevenRevenueExact;
    revenueEl.textContent = result.breakevenRevenue;
    if (result.marginOfSafety === null) {
      marginEl.hidden = true;
    } else {
      const margin = result.marginOfSafety;
      marginEl.hidden = false;
      marginUnitsEl.textContent = t.marginUnits(margin.units);
      marginPercentEl.textContent =
        margin.percent === null ? "" : t.marginPercent(margin.percent);
      marginPercentEl.hidden = margin.percent === null;
      expectedProfitEl.textContent = t.expectedProfit(margin.expectedProfit);
      belowEl.hidden = !margin.belowBreakeven;
      if (margin.belowBreakeven) belowEl.textContent = t.belowWarning;
    }
    resultsEl.hidden = false;
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        hideNotice();
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      } else {
        // NO_MARGIN is a semantic result for the whole input, not a
        // field error: no field is marked; the explanation is shown
        // and focus moves to it. The same slot carries WORKER_ERROR,
        // INTERNAL and OUTPUT_LIMIT.
        showNotice(message);
        if (submitted) {
          submitted = false;
          noticeEl.focus();
        }
      }
    }
  } else {
    clearFieldErrors();
    hideNotice();
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

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.fixedCost.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    showNotice(t.error.OUTPUT_LIMIT);
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
