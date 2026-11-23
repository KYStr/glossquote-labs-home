// DOM wiring for the Grocery Budget Calculator. All user-visible
// text is set through textContent/value only; user input never
// becomes markup. Computation runs in a module Worker built from
// the fixed worker source embedded by the preview build
// (WORKER_SOURCE). The controller owns the draft, generation, and
// state machine; this file only renders it. The fixed report
// download (grocery-budget-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob
// URL is revoked within 30 seconds or as soon as the result is
// invalidated.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  GROUP_LABELS,
  LOW_COST_CENTS,
  PLAN_LABELS,
  THRIFTY_CENTS,
  buildReport,
} from "./core/grocery-budget.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

const STRINGS = {
  "zh-Hant": {
    planLabel: { thrifty: "Thrifty", "low-cost": "Low-cost" },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數，不含小數、符號或空白",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      plan: "請選擇 Thrifty 或 Low-cost",
      household: "全戶人數須為 1 至 20 人",
    },
    countRangeError: "人數須在 0 至 10 人之間",
    emptyHouseholdError: "全戶至少須有 1 人",
    statusEmpty: "尚未試算。輸入家中各年齡層人數、選好食物計畫，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（USDA 參照四口之家，Thrifty），請按「計算採買預算」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    householdTotal: (count) => `全戶共 ${count} 人`,
    householdTotalUnknown: "全戶共 — 人",
    perPersonWeeklyHelp: (amount) => `每人每週 ${amount}`,
    stepDownLabel: (label) => `減少${label}人數`,
    stepUpLabel: (label) => `增加${label}人數`,
    labelPlan: "食物計畫",
    labelHouseholdSize: "全戶人數",
    labelWeeklyTotal: "每週總額",
    labelMonthlyTotal: "每月總額",
    labelPerPersonWeekly: "每人每週",
    labelPerPersonMonthly: "每人每月",
    labelDailyAverage: "每日平均",
    labelUnadjusted: "未調整每週合計",
    labelAdjustment: "戶人數調整",
    adjustmentValue: (factor, amount) => `${factor}（${amount}）`,
    breakdownGroup: "組別",
    breakdownCount: "人數",
    breakdownWeeklyPerPerson: "每人每週",
    breakdownWeeklySubtotal: "該組每週小計",
    breakdownMonthlySubtotal: "該組每月小計",
    breakdownNote:
      "明細為調整前金額；各組每月小計之和可能與每月總額相差 0.10 至 0.40 美元，此為捨入所致，不是錯誤。",
    successSummary: (result) => `每週總額 ${formatMoney(result.weeklyTotal)}，每月總額 ${formatMoney(result.monthlyTotal)}`,
  },
  en: {
    planLabel: { thrifty: "Thrifty", "low-cost": "Low-cost" },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number with no decimal, sign, or space.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      plan: "Choose Thrifty or Low-cost.",
      household: "The household must have 1 to 20 people.",
    },
    countRangeError: "Each group must have 0 to 10 people.",
    emptyHouseholdError: "The household must have at least 1 person.",
    statusEmpty:
      "Nothing calculated yet. Enter the number of people in each age group, choose a food plan, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote:
      "Example loaded (USDA reference family of four, Thrifty). Press “Calculate grocery budget” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    householdTotal: (count) => `${count} people in the household`,
    householdTotalUnknown: "— people in the household",
    perPersonWeeklyHelp: (amount) => `${amount} per person per week`,
    stepDownLabel: (label) => `Decrease ${label}`,
    stepUpLabel: (label) => `Increase ${label}`,
    labelPlan: "Food plan",
    labelHouseholdSize: "Household size",
    labelWeeklyTotal: "Weekly total",
    labelMonthlyTotal: "Monthly total",
    labelPerPersonWeekly: "Per person per week",
    labelPerPersonMonthly: "Per person per month",
    labelDailyAverage: "Daily average",
    labelUnadjusted: "Unadjusted weekly total",
    labelAdjustment: "Household size adjustment",
    adjustmentValue: (factor, amount) => `${factor} (${amount})`,
    breakdownGroup: "Group",
    breakdownCount: "People",
    breakdownWeeklyPerPerson: "Weekly per person",
    breakdownWeeklySubtotal: "Weekly subtotal",
    breakdownMonthlySubtotal: "Monthly subtotal",
    breakdownNote:
      "Breakdown amounts are before the household size adjustment; the monthly subtotals may differ from the monthly total by $0.10–$0.40 through rounding. That is not an error.",
    successSummary: (result) =>
      `Weekly total ${formatMoney(result.weeklyTotal)}, monthly total ${formatMoney(result.monthlyTotal)}`,
  },
};

// Money is rendered from the result's dollar values by recovering
// exact integer cents (every result amount is a multiple of $0.01),
// so display formatting never re-rounds a computed value.
function groupThousands(digits) {
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits[i];
  }
  return out;
}

function formatMoney(value) {
  const cents = Math.round(value * 100);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  return `${sign}$${groupThousands(String(dollars))}.${String(abs % 100).padStart(2, "0")}`;
}

function formatSignedMoney(value) {
  if (value === 0) return "$0.00";
  if (value > 0) return `+${formatMoney(value)}`;
  return formatMoney(value);
}

function formatFactor(value) {
  const hundredths = Math.round(value * 100);
  return `×${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const planInputs = {
  thrifty: document.getElementById("field-plan-thrifty"),
  "low-cost": document.getElementById("field-plan-low-cost"),
};
const planErrorEl = document.getElementById("error-plan");
const inputs = {};
const fieldErrors = {};
const stepDown = {};
const stepUp = {};
const helpEls = {};
for (const field of FIELDS) {
  inputs[field] = document.getElementById(`field-${field}`);
  fieldErrors[field] = document.getElementById(`error-${field}`);
  stepDown[field] = document.getElementById(`step-down-${field}`);
  stepUp[field] = document.getElementById(`step-up-${field}`);
  helpEls[field] = document.getElementById(`help-${field}`);
}
const householdTotalEl = document.getElementById("household-total");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const breakdownBody = document.getElementById("breakdown-body");
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
  planErrorEl.textContent = "";
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  if (error.code === "RANGE" && error.field !== null && FIELDS.includes(error.field)) {
    return t.countRangeError;
  }
  if (error.code === "EMPTY" && error.field === "household") {
    return t.emptyHouseholdError;
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

function renderBreakdown(result) {
  breakdownBody.replaceChildren();
  for (const row of result.breakdown) {
    const tr = document.createElement("tr");
    const label = GROUP_LABELS[row.group][lang];
    const cells = [
      label,
      String(row.count),
      formatMoney(row.weeklyPerPerson),
      formatMoney(row.weeklySubtotal),
      formatMoney(row.monthlySubtotal),
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    breakdownBody.appendChild(tr);
  }
}

function renderResult(result) {
  appendSummaryRows(summaryRows, [
    [t.labelPlan, PLAN_LABELS[result.plan][lang]],
    [t.labelHouseholdSize, String(result.householdSize)],
    [t.labelWeeklyTotal, formatMoney(result.weeklyTotal)],
    [t.labelMonthlyTotal, formatMoney(result.monthlyTotal)],
    [t.labelPerPersonWeekly, formatMoney(result.perPersonWeekly)],
    [t.labelPerPersonMonthly, formatMoney(result.perPersonMonthly)],
    [t.labelDailyAverage, formatMoney(result.dailyAverage)],
    [t.labelUnadjusted, formatMoney(result.unadjustedWeekly)],
    [
      t.labelAdjustment,
      t.adjustmentValue(formatFactor(result.sizeFactor), formatSignedMoney(result.sizeAdjustmentWeekly)),
    ],
  ]);
  renderBreakdown(result);
}

function householdTotalFromDraft(draft) {
  let total = 0;
  for (const field of FIELDS) {
    const raw = draft[field];
    if (INTEGER_PATTERN.test(raw)) {
      const value = Number(raw);
      if (value >= 0 && value <= 10) total += value;
      else return null;
    } else {
      return null;
    }
  }
  return total;
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const plan of ["thrifty", "low-cost"]) {
    planInputs[plan].checked = draft.plan === plan;
  }
  // Per-person weekly cost shown under each group follows the
  // currently selected plan.
  const table = draft.plan === "low-cost" ? LOW_COST_CENTS : THRIFTY_CENTS;
  for (const field of FIELDS) {
    helpEls[field].textContent = t.perPersonWeeklyHelp(formatMoney(table[field] / 100));
    const raw = draft[field];
    const value = INTEGER_PATTERN.test(raw) ? Number(raw) : 0;
    stepDown[field].disabled = value <= 0;
    stepUp[field].disabled = value >= 10;
  }
  const total = householdTotalFromDraft(draft);
  householdTotalEl.textContent =
    total === null ? t.householdTotalUnknown : t.householdTotal(total);
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
        statusEl.textContent = `${GROUP_LABELS[error.field][lang]}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      } else if (error.field === "plan") {
        planErrorEl.textContent = message;
        statusEl.textContent = message;
        if (submitted) {
          submitted = false;
          planInputs.thrifty.focus();
        }
      } else {
        statusEl.textContent = message;
        if (submitted && error.field === "household") {
          submitted = false;
          inputs.c1.focus();
        }
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
  stepDown[field].addEventListener("click", () => {
    const current = INTEGER_PATTERN.test(inputs[field].value) ? Number(inputs[field].value) : 0;
    controller.edit({ [field]: String(Math.max(0, current - 1)) });
    inputs[field].focus();
  });
  stepUp[field].addEventListener("click", () => {
    const current = INTEGER_PATTERN.test(inputs[field].value) ? Number(inputs[field].value) : 0;
    controller.edit({ [field]: String(Math.min(10, current + 1)) });
    inputs[field].focus();
  });
}

for (const plan of ["thrifty", "low-cost"]) {
  planInputs[plan].addEventListener("change", () => {
    if (planInputs[plan].checked) controller.edit({ plan });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  planInputs.thrifty.focus();
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
