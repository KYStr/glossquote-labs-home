// DOM wiring for the 50-30-20 Budget Calculator. All user-visible text is
// set through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it. The
// fixed report (50-30-20-budget-report.json) is offered only in the success
// state, and its Blob URL is revoked as soon as the result is invalidated
// (and at most 30 seconds after a download starts).

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/budget.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      income: "稅後月收入",
      needsPct: "需求比例",
      wantsPct: "想要比例",
      savingsPct: "儲蓄／還債比例",
      actualNeeds: "實際需求支出",
      actualWants: "實際想要支出",
      actualSavings: "實際儲蓄／還債支出",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      EMPTY: "請輸入數值",
      INTEGER_FORMAT: "請輸入整數",
      PERCENT_SUM: "三個比例合計須恰為 100",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorRange: {
      income: "稅後月收入須在 1–100,000,000 元之間",
      needsPct: "比例須在 0–100 之間",
      wantsPct: "比例須在 0–100 之間",
      savingsPct: "比例須在 0–100 之間",
      actualNeeds: "實際支出須在 0–100,000,000 元之間",
      actualWants: "實際支出須在 0–100,000,000 元之間",
      actualSavings: "實際支出須在 0–100,000,000 元之間",
    },
    statusEmpty: "尚未計算。輸入數值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算預算分配」執行。",
    categoryName: { needs: "需求", wants: "想要", savings: "儲蓄／還債" },
    varianceStatus: { under: "低於目標", "on-target": "符合目標", over: "超出目標" },
    totalsStatus: { under: "未用完", balanced: "恰好", over: "超支" },
    summary: (income) => `稅後月收入 ${income} 元，三類每月分配合計等於收入。`,
    totalsLine: (actual, income, unallocated, statusLabel) =>
      `實際總支出 ${actual} 元，收入 ${income} 元，未分配餘額 ${unallocated} 元（${statusLabel}）。`,
    adviceNeedsOver:
      "需求超出目標：檢視固定支出，是否能調降或改列想要。",
    adviceWantsOver: "想要超出目標：先列出可延後的想要支出。",
    adviceSavingsUnder: "儲蓄低於目標：先補緊急預備金，再提高儲蓄。",
    adviceTotalsOver: "本月支出超過收入：超支金額須由儲蓄或下月收入補回。",
    notFilled: "未填",
  },
  en: {
    fieldLabel: {
      income: "Monthly after-tax income",
      needsPct: "Needs percentage",
      wantsPct: "Wants percentage",
      savingsPct: "Savings percentage",
      actualNeeds: "Actual needs spending",
      actualWants: "Actual wants spending",
      actualSavings: "Actual savings spending",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      EMPTY: "Enter a value.",
      INTEGER_FORMAT: "Enter a whole number.",
      PERCENT_SUM: "The three percentages must add up to exactly 100.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorRange: {
      income: "Monthly after-tax income must be between 1 and 100,000,000.",
      needsPct: "Percentage must be between 0 and 100.",
      wantsPct: "Percentage must be between 0 and 100.",
      savingsPct: "Percentage must be between 0 and 100.",
      actualNeeds: "Actual spending must be between 0 and 100,000,000.",
      actualWants: "Actual spending must be between 0 and 100,000,000.",
      actualSavings: "Actual spending must be between 0 and 100,000,000.",
    },
    statusEmpty: "Nothing calculated yet. Enter values or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate budget split” to run it.",
    categoryName: { needs: "Needs", wants: "Wants", savings: "Savings" },
    varianceStatus: { under: "Under target", "on-target": "On target", over: "Over target" },
    totalsStatus: { under: "Under budget", balanced: "Balanced", over: "Over budget" },
    summary: (income) => `After-tax income ${income}. The three monthly amounts add up to income.`,
    totalsLine: (actual, income, unallocated, statusLabel) =>
      `Actual total ${actual}, income ${income}, unallocated ${unallocated} (${statusLabel}).`,
    adviceNeedsOver:
      "Needs are over target: review fixed costs and check whether any item belongs in wants.",
    adviceWantsOver: "Wants are over target: list wants spending that can wait.",
    adviceSavingsUnder: "Savings are under target: build the emergency fund first, then raise savings.",
    adviceTotalsOver:
      "Spending exceeds income this month: the shortfall must come from savings or next month's income.",
    notFilled: "Not filled",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("budget-form");
const inputs = {
  income: document.getElementById("field-income"),
  needsPct: document.getElementById("field-needsPct"),
  wantsPct: document.getElementById("field-wantsPct"),
  savingsPct: document.getElementById("field-savingsPct"),
  actualNeeds: document.getElementById("field-actualNeeds"),
  actualWants: document.getElementById("field-actualWants"),
  actualSavings: document.getElementById("field-actualSavings"),
};
const fieldErrors = {
  income: document.getElementById("error-income"),
  needsPct: document.getElementById("error-needsPct"),
  wantsPct: document.getElementById("error-wantsPct"),
  savingsPct: document.getElementById("error-savingsPct"),
  actualNeeds: document.getElementById("error-actualNeeds"),
  actualWants: document.getElementById("error-actualWants"),
  actualSavings: document.getElementById("error-actualSavings"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const allocationTableBody = document.getElementById("allocation-rows");
const varianceBlock = document.getElementById("variance-block");
const varianceTableBody = document.getElementById("variance-rows");
const totalsBlock = document.getElementById("totals-block");
const totalsEl = document.getElementById("totals");
const adviceEl = document.getElementById("advice");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let reportUrl = null;
let reportTimer = null;

function revokeReportUrl() {
  if (reportTimer !== null) {
    clearTimeout(reportTimer);
    reportTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

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

// Locale-independent thousands grouping for display only; machine values
// in the result JSON are plain numbers.
function fmt(value) {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value));
  const groups = [];
  for (let i = digits.length; i > 0; i -= 3) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return sign + groups.join(",");
}

function fmtSigned(value) {
  if (value === 0) return "0";
  return value > 0 ? `+${fmt(value)}` : fmt(value);
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = inputs[field] ?? null;
  if (message === null) {
    if (target !== null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (target !== null) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE" && t.errorRange[error.field]) return t.errorRange[error.field];
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderAllocationRows(result) {
  allocationTableBody.replaceChildren();
  for (const id of ["needs", "wants", "savings"]) {
    const tr = document.createElement("tr");
    const cells = [
      t.categoryName[id],
      `${result.percentages[id]}%`,
      fmt(result.targets.monthly[id]),
      fmt(result.targets.yearly[id]),
    ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    allocationTableBody.appendChild(tr);
  }
}

function renderVarianceRows(result) {
  varianceTableBody.replaceChildren();
  if (result.variance === null) {
    varianceBlock.hidden = true;
    return;
  }
  for (const id of ["needs", "wants", "savings"]) {
    const entry = result.variance[id];
    const tr = document.createElement("tr");
    const cells =
      entry === null
        ? [t.categoryName[id], t.notFilled, fmt(result.targets.monthly[id]), t.notFilled, t.notFilled, t.notFilled]
        : [
            t.categoryName[id],
            fmt(entry.actual),
            fmt(entry.target),
            fmtSigned(entry.difference),
            `${entry.actualPercent.toFixed(1)}%`,
            t.varianceStatus[entry.status],
          ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    varianceTableBody.appendChild(tr);
  }
  varianceBlock.hidden = false;
}

function renderAdvice(result) {
  const lines = [];
  if (result.variance !== null) {
    if (result.variance.needs !== null && result.variance.needs.status === "over") {
      lines.push(t.adviceNeedsOver);
    }
    if (result.variance.wants !== null && result.variance.wants.status === "over") {
      lines.push(t.adviceWantsOver);
    }
    if (result.variance.savings !== null && result.variance.savings.status === "under") {
      lines.push(t.adviceSavingsUnder);
    }
  }
  if (result.totals !== null && result.totals.status === "over") {
    lines.push(t.adviceTotalsOver);
  }
  adviceEl.replaceChildren();
  for (const line of lines) {
    const p = document.createElement("p");
    p.textContent = line;
    adviceEl.appendChild(p);
  }
  adviceEl.hidden = lines.length === 0;
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
  downloadBtn.disabled = !reportAvailable;
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
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
        if (submitted) {
          submitted = false;
          const target = inputs[error.field];
          if (target !== null) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const summary = t.summary(fmt(result.income));
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    renderAllocationRows(result);
    renderVarianceRows(result);
    if (result.totals !== null) {
      totalsEl.textContent = t.totalsLine(
        fmt(result.totals.actual),
        fmt(result.totals.income),
        fmtSigned(result.totals.unallocated),
        t.totalsStatus[result.totals.status],
      );
      totalsBlock.hidden = false;
    } else {
      totalsEl.textContent = "";
      totalsBlock.hidden = true;
    }
    renderAdvice(result);
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
  inputs.income.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const publicState = controller.getState();
  if (!publicState.reportAvailable || publicState.result === null) return;
  let text;
  try {
    text = serializeReport(publicState.result);
  } catch {
    statusEl.textContent = t.error.INTERNAL;
    return;
  }
  revokeReportUrl();
  const blob = new Blob([text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  reportTimer = setTimeout(revokeReportUrl, 30000);
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

render(controller.getState());
