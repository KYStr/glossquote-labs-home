// DOM wiring for the Debt Payoff Planner. All user-visible text is
// set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (debt-payoff-plan.json) is created only on an explicit click, from
// the current success snapshot, and its Blob URL is revoked within 30
// seconds or as soon as the result is invalidated.
//
// The debt table is dynamic: rows are built from the controller
// draft. While the user types, render() only writes back values that
// differ, so focus is never stolen; rows are rebuilt only when the
// row count changes (add / remove / example / reset).

import { createController } from "./controller.mjs";
import {
  DEBT_FIELDS,
  MAX_DEBTS,
  buildReport,
  formatMoneyCents,
} from "./core/debt-payoff-planner.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const PAGE_SIZE = 25;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      name: "名稱",
      balance: "餘額",
      apr: "年利率",
      minimum: "最低還款",
      extraMonthly: "每月額外還款",
      debts: "債務表",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元或控制字元",
      EMPTY: "此欄不可空白",
      MONEY_FORMAT: "金額格式不正確：整數或小數點後 1–2 位，不含符號、空白或逗號",
      APR_FORMAT: "年利率格式不正確：整數或小數點後 1–2 位，不含符號、空白或逗號",
      DUPLICATE_NAME: "名稱重複，請為每筆債務使用不同的名稱",
      INSUFFICIENT_PAYMENT: "每月還款總額為零，無法開始還款",
      ROW_LIMIT: "最多 12 筆債務",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      balance: "餘額須大於 0 且不超過 10,000,000.00",
      apr: "年利率須在 0 至 99.99 之間",
      minimum: "最低還款須在 0 至 1,000,000.00 之間",
      extraMonthly: "每月額外還款須在 0 至 1,000,000.00 之間",
    },
    statusEmpty: "尚未比較。輸入每筆債務的餘額、年利率與最低還款，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：3 筆債務，每月額外還款 100.00），請按「比較兩種策略」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    rowPrefix: (row) => `第 ${row} 筆`,
    removeLabel: "移除",
    addLabel: "新增一筆債務",
    labelComparison: "比較摘要",
    labelSnowball: "雪球法",
    labelAvalanche: "雪崩法",
    labelOrder: "還款順序",
    labelPayoff: "每筆還清月份",
    labelMonthly: "逐月彙總",
    labelMonths: "還清月數",
    labelInterest: "總利息",
    labelPaid: "總還款",
    labelMonth: "月份",
    labelMonthPaid: "當月還款",
    labelMonthInterest: "當月利息",
    labelMonthRemaining: "剩餘總額",
    labelNotFree: "未還清",
    notFreeNote: (months, remaining) =>
      `600 個月後仍未還清，剩餘 ${remaining}。`,
    payoffMonthText: (name, month) => `${name}：第 ${month} 個月還清`,
    monthsText: (months) => (months === null ? "未還清" : `${months} 個月`),
    pageLabel: (first, last, total) => `第 ${first}–${last} 列，共 ${total} 列`,
    prevLabel: "上一頁",
    nextLabel: "下一頁",
    lowerInterest: (strategy, amount) =>
      strategy === "tie"
        ? "兩種策略總利息相同"
        : `${strategy === "snowball" ? "雪球法" : "雪崩法"}總利息較低，省 ${amount}`,
    fewerMonths: (strategy, count) =>
      strategy === "tie"
        ? "兩種策略月數相同"
        : `${strategy === "snowball" ? "雪球法" : "雪崩法"}月數較少，少 ${count} 個月`,
    successSummary: (result) =>
      `已完成比較：雪球法 ${result.strategies.snowball.monthsToDebtFree ?? "未還清"} 個月、總利息 ${formatMoneyCents(result.strategies.snowball.totalInterestCents)}；雪崩法 ${result.strategies.avalanche.monthsToDebtFree ?? "未還清"} 個月、總利息 ${formatMoneyCents(result.strategies.avalanche.totalInterestCents)}。`,
  },
  en: {
    fieldLabel: {
      name: "Name",
      balance: "Balance",
      apr: "APR",
      minimum: "Minimum payment",
      extraMonthly: "Extra monthly payment",
      debts: "Debt list",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired or control character.",
      EMPTY: "This field is required.",
      MONEY_FORMAT: "Enter an amount with up to 2 decimal places and no sign, space, or comma.",
      APR_FORMAT: "Enter an APR with up to 2 decimal places and no sign, space, or comma.",
      DUPLICATE_NAME: "Duplicate name; use a different name for each debt.",
      INSUFFICIENT_PAYMENT: "Total monthly payment is zero, so no payoff plan can start.",
      ROW_LIMIT: "At most 12 debts.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      balance: "Balance must be greater than 0 and at most 10,000,000.00.",
      apr: "APR must be between 0 and 99.99.",
      minimum: "Minimum payment must be between 0 and 1,000,000.00.",
      extraMonthly: "Extra monthly payment must be between 0 and 1,000,000.00.",
    },
    statusEmpty: "Nothing compared yet. Enter each debt's balance, APR, and minimum payment, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: 3 debts, extra monthly payment 100.00). Press “Compare both strategies” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    rowPrefix: (row) => `Row ${row}`,
    removeLabel: "Remove",
    addLabel: "Add a debt",
    labelComparison: "Comparison",
    labelSnowball: "Snowball",
    labelAvalanche: "Avalanche",
    labelOrder: "Payoff order",
    labelPayoff: "Payoff month per debt",
    labelMonthly: "Monthly summary",
    labelMonths: "Months to debt-free",
    labelInterest: "Total interest",
    labelPaid: "Total paid",
    labelMonth: "Month",
    labelMonthPaid: "Paid this month",
    labelMonthInterest: "Interest this month",
    labelMonthRemaining: "Remaining total",
    labelNotFree: "Not debt-free",
    notFreeNote: (months, remaining) =>
      `Not debt-free after ${months} months; ${remaining} remains.`,
    payoffMonthText: (name, month) => `${name}: paid off in month ${month}`,
    monthsText: (months) => (months === null ? "Not debt-free" : `${months} months`),
    pageLabel: (first, last, total) => `Rows ${first}–${last} of ${total}`,
    prevLabel: "Previous page",
    nextLabel: "Next page",
    lowerInterest: (strategy, amount) =>
      strategy === "tie"
        ? "Both strategies cost the same total interest"
        : `${strategy === "snowball" ? "Snowball" : "Avalanche"} costs less interest, saving ${amount}`,
    fewerMonths: (strategy, count) =>
      strategy === "tie"
        ? "Both strategies take the same number of months"
        : `${strategy === "snowball" ? "Snowball" : "Avalanche"} takes fewer months, saving ${count} months`,
    successSummary: (result) =>
      `Comparison complete: snowball ${result.strategies.snowball.monthsToDebtFree ?? "not debt-free"} months, total interest ${formatMoneyCents(result.strategies.snowball.totalInterestCents)}; avalanche ${result.strategies.avalanche.monthsToDebtFree ?? "not debt-free"} months, total interest ${formatMoneyCents(result.strategies.avalanche.totalInterestCents)}.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const debtRowsEl = document.getElementById("debt-rows");
const rowErrorsEl = document.getElementById("row-errors");
const addDebtBtn = document.getElementById("add-debt-btn");
const extraInput = document.getElementById("field-extra");
const extraErrorEl = document.getElementById("error-extra");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const comparisonRows = document.getElementById("comparison-rows");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");

const strategyEls = {
  snowball: {
    section: document.getElementById("snowball-section"),
    order: document.getElementById("snowball-order"),
    payoff: document.getElementById("snowball-payoff"),
    monthly: document.getElementById("snowball-monthly"),
    prev: document.getElementById("snowball-prev"),
    next: document.getElementById("snowball-next"),
    page: document.getElementById("snowball-page"),
    notFree: document.getElementById("snowball-notfree"),
    months: document.getElementById("snowball-months"),
    interest: document.getElementById("snowball-interest"),
    paid: document.getElementById("snowball-paid"),
  },
  avalanche: {
    section: document.getElementById("avalanche-section"),
    order: document.getElementById("avalanche-order"),
    payoff: document.getElementById("avalanche-payoff"),
    monthly: document.getElementById("avalanche-monthly"),
    prev: document.getElementById("avalanche-prev"),
    next: document.getElementById("avalanche-next"),
    page: document.getElementById("avalanche-page"),
    notFree: document.getElementById("avalanche-notfree"),
    months: document.getElementById("avalanche-months"),
    interest: document.getElementById("avalanche-interest"),
    paid: document.getElementById("avalanche-paid"),
  },
};

let submitted = false;
let currentResult = null;
let snowballPage = 0;
let avalanchePage = 0;

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

function inputId(rowIndex, field) {
  return `field-debt-${rowIndex}-${field}`;
}

function buildRow(rowIndex, debt) {
  const row = document.createElement("tr");
  for (const field of DEBT_FIELDS) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.id = inputId(rowIndex, field);
    input.name = `debts[${rowIndex}][${field}]`;
    input.type = "text";
    input.autocomplete = "off";
    input.value = debt[field];
    if (field === "name") input.setAttribute("aria-label", t.fieldLabel.name);
    if (field === "balance") input.setAttribute("aria-label", t.fieldLabel.balance);
    if (field === "apr") input.setAttribute("aria-label", t.fieldLabel.apr);
    if (field === "minimum") input.setAttribute("aria-label", t.fieldLabel.minimum);
    input.setAttribute("aria-errormessage", `error-debt-${rowIndex}`);
    cell.appendChild(input);
    row.appendChild(cell);
  }
  const actionCell = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "button-remove";
  removeBtn.dataset.rowIndex = String(rowIndex);
  removeBtn.textContent = t.removeLabel;
  actionCell.appendChild(removeBtn);
  row.appendChild(actionCell);
  return row;
}

function syncDebtRows(draft) {
  const rows = [...debtRowsEl.children];
  if (rows.length !== draft.debts.length) {
    debtRowsEl.replaceChildren();
    rowErrorsEl.replaceChildren();
    draft.debts.forEach((debt, rowIndex) => {
      debtRowsEl.appendChild(buildRow(rowIndex, debt));
      const errorEl = document.createElement("p");
      errorEl.className = "field-error";
      errorEl.id = `error-debt-${rowIndex}`;
      errorEl.setAttribute("role", "alert");
      rowErrorsEl.appendChild(errorEl);
    });
  } else {
    draft.debts.forEach((debt, rowIndex) => {
      for (const field of DEBT_FIELDS) {
        const input = document.getElementById(inputId(rowIndex, field));
        if (input && input.value !== debt[field]) input.value = debt[field];
      }
    });
  }
  addDebtBtn.disabled = draft.debts.length >= MAX_DEBTS;
  for (const row of debtRowsEl.children) {
    const removeBtn = row.querySelector(".button-remove");
    if (removeBtn) removeBtn.disabled = draft.debts.length <= 1;
  }
}

function readDebtsFromDom() {
  const debts = [];
  for (const row of debtRowsEl.children) {
    const debt = {};
    for (const field of DEBT_FIELDS) {
      const input = row.querySelector(`[name$="[${field}]"]`);
      debt[field] = input ? input.value : "";
    }
    debts.push(debt);
  }
  return debts;
}

function clearRowErrors() {
  for (const errorEl of rowErrorsEl.children) errorEl.textContent = "";
  for (const row of debtRowsEl.children) {
    for (const input of row.querySelectorAll("input")) {
      input.removeAttribute("aria-invalid");
    }
  }
  extraErrorEl.textContent = "";
  extraInput.removeAttribute("aria-invalid");
  extraInput.removeAttribute("aria-errormessage");
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function showFieldError(error) {
  const message = errorMessage(error);
  const rowIndex = error.row === null ? null : error.row - 1;
  if (error.field === "extraMonthly") {
    extraInput.setAttribute("aria-invalid", "true");
    extraInput.setAttribute("aria-errormessage", "error-extra");
    extraErrorEl.textContent = message;
    return { message, focusTarget: extraInput };
  }
  if (rowIndex !== null && DEBT_FIELDS.includes(error.field)) {
    const input = document.getElementById(inputId(rowIndex, error.field));
    const errorEl = document.getElementById(`error-debt-${rowIndex}`);
    if (input && errorEl) {
      input.setAttribute("aria-invalid", "true");
      errorEl.textContent = message;
      return {
        message: `${t.rowPrefix(error.row)} ${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`,
        focusTarget: input,
      };
    }
  }
  if (error.field === "name" && rowIndex !== null) {
    const errorEl = document.getElementById(`error-debt-${rowIndex}`);
    if (errorEl) errorEl.textContent = message;
  }
  return { message, focusTarget: null };
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

function appendListItems(list, items) {
  list.replaceChildren();
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }
}

function renderMonthlyTable(strategyKey, strategy) {
  const els = strategyEls[strategyKey];
  const page = strategyKey === "snowball" ? snowballPage : avalanchePage;
  const total = strategy.monthly.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  if (strategyKey === "snowball") snowballPage = safePage;
  else avalanchePage = safePage;
  const start = safePage * PAGE_SIZE;
  const rows = strategy.monthly.slice(start, start + PAGE_SIZE);
  els.monthly.replaceChildren();
  for (const entry of rows) {
    const tr = document.createElement("tr");
    for (const value of [
      String(entry.month),
      formatMoneyCents(entry.paidCents),
      formatMoneyCents(entry.interestCents),
      formatMoneyCents(entry.remainingCents),
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    els.monthly.appendChild(tr);
  }
  els.page.textContent = t.pageLabel(start + 1, start + rows.length, total);
  els.prev.disabled = safePage === 0;
  els.next.disabled = safePage >= pageCount - 1;
}

function renderStrategy(strategyKey, strategy) {
  const els = strategyEls[strategyKey];
  els.months.textContent = t.monthsText(strategy.monthsToDebtFree);
  els.interest.textContent = formatMoneyCents(strategy.totalInterestCents);
  els.paid.textContent = formatMoneyCents(strategy.totalPaidCents);
  appendListItems(
    els.order,
    strategy.order.map((name, index) => `${index + 1}. ${name}`),
  );
  appendListItems(
    els.payoff,
    strategy.payoffOrder.map((name) => t.payoffMonthText(name, strategy.payoffMonth[name])),
  );
  if (strategy.status === "not-debt-free") {
    els.notFree.hidden = false;
    els.notFree.textContent = t.notFreeNote(
      strategy.monthsSimulated,
      formatMoneyCents(strategy.monthly[strategy.monthly.length - 1].remainingCents),
    );
  } else {
    els.notFree.hidden = true;
    els.notFree.textContent = "";
  }
  renderMonthlyTable(strategyKey, strategy);
}

function renderResult(result) {
  currentResult = result;
  snowballPage = 0;
  avalanchePage = 0;
  const { snowball, avalanche } = result.strategies;
  const comparison = result.comparison;
  const comparisonRowsData = [];
  if (comparison.lowerInterestStrategy !== null) {
    comparisonRowsData.push([
      t.labelInterest,
      t.lowerInterest(comparison.lowerInterestStrategy, formatMoneyCents(comparison.interestDifferenceCents)),
    ]);
    comparisonRowsData.push([
      t.labelMonths,
      t.fewerMonths(comparison.fewerMonthsStrategy, comparison.monthsDifference),
    ]);
  } else {
    comparisonRowsData.push([t.labelNotFree, t.notFreeNote(600, formatMoneyCents(
      Math.max(
        snowball.monthly[snowball.monthly.length - 1].remainingCents,
        avalanche.monthly[avalanche.monthly.length - 1].remainingCents,
      ),
    ))]);
  }
  appendSummaryRows(comparisonRows, comparisonRowsData);
  renderStrategy("snowball", snowball);
  renderStrategy("avalanche", avalanche);
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  syncDebtRows(draft);
  if (extraInput.value !== draft.extraMonthly) extraInput.value = draft.extraMonthly;
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
    currentResult = null;
    clearRowErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    currentResult = null;
    clearRowErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
    currentResult = null;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    currentResult = null;
    clearRowErrors();
  } else if (state === "error") {
    clearRowErrors();
    resultsEl.hidden = true;
    currentResult = null;
    if (error !== null) {
      const shown = showFieldError(error);
      statusEl.textContent = shown.message;
      if (submitted && shown.focusTarget !== null) {
        shown.focusTarget.focus();
      }
      submitted = false;
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
  } else if (state === "success" && result !== null) {
    renderResult(result);
    statusEl.textContent = t.successSummary(result);
    resultsEl.hidden = false;
    clearRowErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

debtRowsEl.addEventListener("input", () => {
  controller.edit({ debts: readDebtsFromDom() });
});

debtRowsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".button-remove");
  if (button === null) return;
  const debts = readDebtsFromDom();
  debts.splice(Number(button.dataset.rowIndex), 1);
  controller.edit({ debts });
  const firstInput = document.getElementById(inputId(0, "name"));
  if (firstInput) firstInput.focus();
});

addDebtBtn.addEventListener("click", () => {
  const debts = readDebtsFromDom();
  if (debts.length >= MAX_DEBTS) return;
  debts.push({ name: "", balance: "", apr: "", minimum: "" });
  controller.edit({ debts });
  const added = document.getElementById(inputId(debts.length - 1, "name"));
  if (added) added.focus();
});

extraInput.addEventListener("input", () => {
  controller.edit({ extraMonthly: extraInput.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  const firstInput = document.getElementById(inputId(0, "name"));
  if (firstInput) firstInput.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

strategyEls.snowball.prev.addEventListener("click", () => {
  snowballPage = Math.max(0, snowballPage - 1);
  if (currentResult) renderMonthlyTable("snowball", currentResult.strategies.snowball);
});
strategyEls.snowball.next.addEventListener("click", () => {
  snowballPage += 1;
  if (currentResult) renderMonthlyTable("snowball", currentResult.strategies.snowball);
});
strategyEls.avalanche.prev.addEventListener("click", () => {
  avalanchePage = Math.max(0, avalanchePage - 1);
  if (currentResult) renderMonthlyTable("avalanche", currentResult.strategies.avalanche);
});
strategyEls.avalanche.next.addEventListener("click", () => {
  avalanchePage += 1;
  if (currentResult) renderMonthlyTable("avalanche", currentResult.strategies.avalanche);
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
