// DOM wiring for the Rent vs Buy Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (rent-vs-buy-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.
// The yearly table shows 25 rows per page with keyboard-operable
// previous/next controls; the full result is always exported,
// never truncated. The breakeven row is marked with text and a
// symbol, not colour alone.

import { createController } from "./controller.mjs";
import { FIELDS, buildReport, formatError } from "./core/rent-vs-buy.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const PAGE_SIZE = 25;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      monthlyRent: "每月租金",
      homePrice: "房價",
      downPayment: "頭期款",
      mortgageRate: "房貸年利率",
      years: "比較年數",
      rentGrowthPct: "租金年漲幅",
      homeAppreciationPct: "房價年漲幅",
      opportunityCostPct: "頭期款機會成本年利率",
    },
    statusEmpty: "尚未試算。輸入租金、房價等假設，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（典型情境：月租 20,000 元、房價 10,000,000 元），請按「計算租買比較」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelMonthlyPayment: "每月房貸月付",
    labelBreakeven: "損益平衡年數",
    labelTotalRent: "比較期滿租屋總成本",
    labelTotalBuy: "比較期滿買房淨總成本",
    labelSavings: "相差金額（期滿）",
    labelVerdict: "判定",
    breakevenYear: (year) => `第 ${year} 年`,
    breakevenNone: "比較期內未損益平衡",
    verdictBuy: "買房在比較期內追上租屋",
    verdictRent: "比較期內買房未追上租屋",
    savingsBuy: (amount) => `買房便宜 ${amount} 元`,
    savingsRent: (amount) => `租屋便宜 ${amount} 元`,
    breakevenMark: "★ 損益平衡",
    pageLabel: (page, pages) => `第 ${page} / ${pages} 頁`,
    successSummary: (result) =>
      result.breakevenYear === null
        ? "比較期內買房未追上租屋"
        : `第 ${result.breakevenYear} 年損益平衡`,
  },
  en: {
    fieldLabel: {
      monthlyRent: "Monthly rent",
      homePrice: "Home price",
      downPayment: "Down payment",
      mortgageRate: "Annual mortgage rate",
      years: "Horizon (years)",
      rentGrowthPct: "Annual rent growth",
      homeAppreciationPct: "Annual home appreciation",
      opportunityCostPct: "Annual opportunity cost rate",
    },
    statusEmpty: "Nothing calculated yet. Enter rent, home price and the other assumptions, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (typical case: monthly rent 20,000, home price 10,000,000). Press “Calculate rent vs buy” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelMonthlyPayment: "Monthly mortgage payment",
    labelBreakeven: "Breakeven year",
    labelTotalRent: "Total rent cost at horizon",
    labelTotalBuy: "Total buy net cost at horizon",
    labelSavings: "Difference at horizon",
    labelVerdict: "Verdict",
    breakevenYear: (year) => `Year ${year}`,
    breakevenNone: "No breakeven within the horizon",
    verdictBuy: "Buying catches up with renting within the horizon",
    verdictRent: "Buying does not catch up with renting within the horizon",
    savingsBuy: (amount) => `Buying cheaper by NT$${amount}`,
    savingsRent: (amount) => `Renting cheaper by NT$${amount}`,
    breakevenMark: "★ Breakeven",
    pageLabel: (page, pages) => `Page ${page} of ${pages}`,
    successSummary: (result) =>
      result.breakevenYear === null
        ? "Buying does not catch up with renting within the horizon"
        : `Breakeven in year ${result.breakevenYear}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const FIELD_IDS = {
  monthlyRent: "field-monthly-rent",
  homePrice: "field-home-price",
  downPayment: "field-down-payment",
  mortgageRate: "field-mortgage-rate",
  years: "field-years",
  rentGrowthPct: "field-rent-growth",
  homeAppreciationPct: "field-home-appreciation",
  opportunityCostPct: "field-opportunity-cost",
};

const form = document.getElementById("entry-form");
const inputs = {};
const fieldErrors = {};
for (const field of FIELDS) {
  inputs[field] = document.getElementById(FIELD_IDS[field]);
  fieldErrors[field] = document.getElementById(`error-${FIELD_IDS[field].slice("field-".length)}`);
}
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const yearlyRows = document.getElementById("yearly-rows");
const tablePrev = document.getElementById("table-prev");
const tableNext = document.getElementById("table-next");
const tablePageLabel = document.getElementById("table-page-label");
const paginationEl = document.getElementById("pagination");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let currentResult = null;
let currentPage = 1;

function formatInt(value) {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${digits}`;
}

function formatMoney(value) {
  return lang === "en" ? `NT$${formatInt(value)}` : `${formatInt(value)} 元`;
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
  target.setAttribute("aria-errormessage", `error-${FIELD_IDS[field].slice("field-".length)}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
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

function renderTablePage() {
  if (currentResult === null) return;
  const rows = currentResult.yearly;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (currentPage > pages) currentPage = pages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  yearlyRows.replaceChildren();
  for (const row of pageRows) {
    const tr = document.createElement("tr");
    const cells = [
      String(row.year),
      formatInt(row.rentYear),
      formatInt(row.rentCumulative),
      formatInt(row.mortgageYear),
      formatInt(row.homeValue),
      formatInt(row.balance),
      formatInt(row.equity),
      formatInt(row.opportunityCost),
      formatInt(row.buyCumulative),
      formatInt(row.difference),
      row.year === currentResult.breakevenYear ? t.breakevenMark : "",
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    yearlyRows.appendChild(tr);
  }
  const multiPage = pages > 1;
  paginationEl.hidden = !multiPage;
  tablePrev.disabled = currentPage <= 1;
  tableNext.disabled = currentPage >= pages;
  tablePageLabel.textContent = t.pageLabel(currentPage, pages);
}

function renderResult(result) {
  appendSummaryRows(summaryRows, [
    [t.labelMonthlyPayment, formatMoney(result.monthlyPayment)],
    [
      t.labelBreakeven,
      result.breakevenYear === null ? t.breakevenNone : t.breakevenYear(result.breakevenYear),
    ],
    [t.labelTotalRent, formatMoney(result.totalRentCost)],
    [t.labelTotalBuy, formatMoney(result.totalBuyNetCost)],
    [
      t.labelSavings,
      result.savingsAtHorizon >= 0
        ? t.savingsBuy(formatInt(result.savingsAtHorizon))
        : t.savingsRent(formatInt(-result.savingsAtHorizon)),
    ],
    [t.labelVerdict, result.verdict === "buy" ? t.verdictBuy : t.verdictRent],
  ]);
  currentResult = result;
  currentPage = 1;
  renderTablePage();
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
  if (!reportAvailable) {
    revokeReportUrl();
    currentResult = null;
  }

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
      const message = formatError(error, lang, draft);
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
      statusEl.textContent = formatError(
        { code: "INTERNAL", field: null, row: null },
        lang,
        draft,
      );
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
  inputs.monthlyRent.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

tablePrev.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderTablePage();
  }
});

tableNext.addEventListener("click", () => {
  if (currentResult === null) return;
  const pages = Math.max(1, Math.ceil(currentResult.yearly.length / PAGE_SIZE));
  if (currentPage < pages) {
    currentPage += 1;
    renderTablePage();
  }
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusEl.textContent = formatError(report.error, lang, snapshot.draft);
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
