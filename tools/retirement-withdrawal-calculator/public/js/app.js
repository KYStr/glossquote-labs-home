// Retirement Withdrawal Calculator — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.
// Money shown on screen gets thousands separators and the chosen currency
// label (display only); machine values in the report are unchanged.

import { Controller } from "./core/controller.mjs";
import { REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";
const PAGE_SIZE = 25;

const STRINGS = {
  zh: {
    summary: {
      depleted: (years) => `資金將在 ${years} 年後耗盡。`,
      never: "年提領額為 0，資金永不耗盡。",
      beyond: "100 年內未耗盡。",
      fourTargetOnly: (target) => `目標組合 ${target}。`,
      fourMeets: (target) => `目標組合 ${target}，現有組合已達標。`,
      fourShort: (target, shortfall) => `目標組合 ${target}，尚短少 ${shortfall}。`,
    },
    statusText: {
      depleted: "已耗盡",
      never: "永不耗盡",
      "beyond-horizon": "100 年內未耗盡",
    },
    meets: { yes: "符合 4% 法則", no: "未達 4% 法則目標", none: "—" },
    partial: { yes: "是", no: "否" },
    dash: "—",
    pageInfo: (from, to, total) => `第 ${from}–${to} 列，共 ${total} 列`,
    status: {
      empty: "請輸入數字，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算提領年限」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長，每欄最多 16 個字元。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      DECIMAL_FORMAT: "請輸入十進位數字，例如 50000.25；不接受逗號、貨幣符號或指數。",
      DECIMAL_PLACES: "小數點後最多 2 位。",
      RANGE: "數值超出允許範圍。",
      RANGE_portfolioValue: "投資組合價值須介於 0 至 999,999,999.99 之間。",
      RANGE_annualWithdrawal: "每年提領額須介於 0 至 999,999,999.99 之間。",
      RANGE_returnRatePct: "年報酬率須介於 -50 至 100 之間。",
      RANGE_inflationRatePct: "年通膨率須介於 0 至 100 之間。",
      RANGE_annualSpending: "每年支出須大於 0，且不超過 999,999,999.99。",
      RANGE_currentPortfolio: "現有組合價值須大於 0，且不超過 999,999,999.99。",
      WORKER_ERROR: "計算失敗，請重試。",
      INTERNAL: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
  },
  en: {
    summary: {
      depleted: (years) => `The portfolio lasts ${years} years.`,
      never: "With a zero annual withdrawal, the portfolio never depletes.",
      beyond: "Not depleted within 100 years.",
      fourTargetOnly: (target) => `Target portfolio ${target}.`,
      fourMeets: (target) => `Target portfolio ${target}; the current portfolio meets the rule.`,
      fourShort: (target, shortfall) => `Target portfolio ${target}; shortfall ${shortfall}.`,
    },
    statusText: {
      depleted: "Depleted",
      never: "Never depletes",
      "beyond-horizon": "Not depleted within 100 years",
    },
    meets: { yes: "Meets the 4% rule", no: "Below the 4% rule target", none: "—" },
    partial: { yes: "Yes", no: "No" },
    dash: "—",
    pageInfo: (from, to, total) => `Rows ${from}–${to} of ${total}`,
    status: {
      empty: "Enter values, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "The input is too long (at most 16 characters per field).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a decimal number, such as 50000.25; commas, currency symbols and exponents are not accepted.",
      DECIMAL_PLACES: "At most 2 decimal places.",
      RANGE: "The number is outside the allowed range.",
      RANGE_portfolioValue: "Portfolio value must be between 0 and 999,999,999.99.",
      RANGE_annualWithdrawal: "Annual withdrawal must be between 0 and 999,999,999.99.",
      RANGE_returnRatePct: "Annual return must be between -50 and 100.",
      RANGE_inflationRatePct: "Annual inflation must be between 0 and 100.",
      RANGE_annualSpending: "Annual spending must be greater than 0 and at most 999,999,999.99.",
      RANGE_currentPortfolio: "Current portfolio must be greater than 0 and at most 999,999,999.99.",
      WORKER_ERROR: "Something went wrong. Try again.",
      INTERNAL: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
const currencyRadios = [...document.querySelectorAll('input[name="currency"]')];
const groupDepletion = $("group-depletion");
const groupFourPercent = $("group-four-percent");
const inputs = {
  portfolioValue: $("input-portfolio"),
  annualWithdrawal: $("input-withdrawal"),
  returnRatePct: $("input-return"),
  inflationRatePct: $("input-inflation"),
  annualSpending: $("input-spending"),
  currentPortfolio: $("input-current"),
};
const errorEls = {
  mode: $("error-mode"),
  portfolioValue: $("error-portfolio"),
  annualWithdrawal: $("error-withdrawal"),
  returnRatePct: $("error-return"),
  inflationRatePct: $("error-inflation"),
  annualSpending: $("error-spending"),
  currentPortfolio: $("error-current"),
};
const statusEl = $("status");
const resultEl = $("result");
const summaryEl = $("result-summary");
const resultRows = {
  years: $("row-years"),
  status: $("row-status"),
  fullYears: $("row-full-years"),
  partial: $("row-partial"),
  finalPartial: $("row-final-partial"),
  target: $("row-target"),
  implied: $("row-implied"),
  shortfall: $("row-shortfall"),
  meets: $("row-meets"),
};
const resultValues = {
  years: $("result-years"),
  status: $("result-status"),
  fullYears: $("result-full-years"),
  partial: $("result-partial"),
  finalPartial: $("result-final-partial"),
  target: $("result-target"),
  implied: $("result-implied"),
  shortfall: $("result-shortfall"),
  meets: $("result-meets"),
};
const tableWrap = $("table-wrap");
const tableBody = $("yearly-body");
const pageInfoEl = $("page-info");
const pagePrevBtn = $("btn-page-prev");
const pageNextBtn = $("btn-page-next");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");

let currency = "NT$";
let tablePage = 0;
let lastResult = null;

// --- Worker transport ------------------------------------------------------

let worker = null;
let workerUrl = null;

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

function completeJob(generation, outcome) {
  if (controller.deliver(generation, outcome)) render();
}

function failJob(generation) {
  completeJob(generation, {
    ok: false,
    error: { code: "WORKER_ERROR", field: null, row: null },
  });
}

const transport = {
  send(snapshot, generation) {
    try {
      const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
      workerUrl = URL.createObjectURL(blob);
      const jobWorker = new Worker(workerUrl, { type: "module" });
      worker = jobWorker;
      jobWorker.onmessage = ({ data }) => {
        if (worker === jobWorker && data?.generation === generation) {
          completeJob(generation, data.outcome);
        }
      };
      jobWorker.onerror = () => {
        if (worker === jobWorker) failJob(generation);
      };
      jobWorker.postMessage({ generation, input: snapshot });
    } catch {
      // Let the submit handler render busy before reporting a startup failure.
      queueMicrotask(() => failJob(generation));
    }
  },
  terminate() {
    terminateWorker();
  },
};

const controller = new Controller(transport);

// --- Download handling -----------------------------------------------------

let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

downloadBtn.addEventListener("click", () => {
  if (!controller.reportAvailable || !controller.reportBytes) return;
  revokeDownload();
  const blob = new Blob([controller.reportBytes], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

// --- Display formatting (presentation only; never enters the report) -------

function formatMoney(value) {
  if (value === null || value === undefined) return T.dash;
  const negative = value.startsWith("-");
  const body = negative ? value.slice(1) : value;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "00" : body.slice(dot + 1);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negative ? "-" : "") + currency + " " + grouped + "." + fracPart;
}

function formatYears(value) {
  return value === null ? T.dash : value;
}

function formatRate(value) {
  return value === null ? T.dash : value + "%";
}

// --- Rendering ---------------------------------------------------------------

let focusFirstErrorOnError = false;

function errorMessage(error) {
  if (!error) return "";
  const keyed = error.field ? T.errors[`${error.code}_${error.field}`] : null;
  return keyed || T.errors[error.code] || T.errors.WORKER_ERROR;
}

function buildSummary(result) {
  if (result.mode === "depletion") {
    if (result.depletionStatus === "depleted") return T.summary.depleted(result.yearsUntilDepletion);
    if (result.depletionStatus === "never") return T.summary.never;
    return T.summary.beyond;
  }
  const target = formatMoney(result.targetPortfolio);
  if (result.currentPortfolio === null) return T.summary.fourTargetOnly(target);
  if (result.meetsRule) return T.summary.fourMeets(target);
  return T.summary.fourShort(target, formatMoney(result.shortfall));
}

function setFieldError(field, message) {
  const el = errorEls[field];
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
  const input = inputs[field];
  if (input) {
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-errormessage", el.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }
}

function renderTable(result) {
  const table = result.yearlyTable;
  const totalPages = Math.max(1, Math.ceil(table.length / PAGE_SIZE));
  if (tablePage >= totalPages) tablePage = totalPages - 1;
  if (tablePage < 0) tablePage = 0;
  const start = tablePage * PAGE_SIZE;
  const rows = table.slice(start, start + PAGE_SIZE);
  tableBody.textContent = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const text of [
      String(row.year),
      formatMoney(row.startBalance),
      formatMoney(row.withdrawal),
      formatMoney(row.returnAmount),
      formatMoney(row.endBalance),
      row.partial ? T.partial.yes : T.partial.no,
    ]) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
  if (table.length === 0) {
    pageInfoEl.textContent = T.pageInfo(0, 0, 0);
  } else {
    pageInfoEl.textContent = T.pageInfo(start + 1, start + rows.length, table.length);
  }
  pagePrevBtn.disabled = tablePage === 0;
  pageNextBtn.disabled = tablePage >= totalPages - 1;
}

function render() {
  const snap = controller.snapshot();
  if (snap.result !== lastResult) {
    tablePage = 0;
    lastResult = snap.result;
  }
  const mode = snap.draft.mode;
  groupDepletion.hidden = mode !== "depletion";
  groupFourPercent.hidden = mode !== "four-percent";

  form.setAttribute("aria-busy", snap.state === "busy" ? "true" : "false");
  runBtn.disabled = snap.state === "busy";
  cancelBtn.hidden = snap.state !== "busy";
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  for (const field of Object.keys(errorEls)) setFieldError(field, null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    summaryEl.textContent = buildSummary(result);
    const depletion = result.mode === "depletion";
    resultRows.years.hidden = !depletion;
    resultRows.status.hidden = !depletion;
    resultRows.fullYears.hidden = !depletion;
    resultRows.partial.hidden = !depletion;
    resultRows.finalPartial.hidden = !depletion;
    resultRows.target.hidden = depletion;
    resultRows.implied.hidden = depletion;
    resultRows.shortfall.hidden = depletion;
    resultRows.meets.hidden = depletion;
    if (depletion) {
      resultValues.years.textContent = formatYears(result.yearsUntilDepletion);
      resultValues.status.textContent = T.statusText[result.depletionStatus];
      resultValues.fullYears.textContent = String(result.fullYears);
      resultValues.partial.textContent = result.partialYearFraction;
      resultValues.finalPartial.textContent = formatMoney(result.finalPartialWithdrawal);
      tableWrap.hidden = result.yearlyTable.length === 0;
      if (result.yearlyTable.length > 0) renderTable(result);
    } else {
      resultValues.target.textContent = formatMoney(result.targetPortfolio);
      resultValues.implied.textContent = formatRate(result.impliedWithdrawalRatePct);
      resultValues.shortfall.textContent =
        result.shortfall === null ? T.dash : formatMoney(result.shortfall);
      resultValues.meets.textContent =
        result.meetsRule === null ? T.meets.none : result.meetsRule ? T.meets.yes : T.meets.no;
      tableWrap.hidden = true;
    }
    resultEl.hidden = false;
    statusEl.textContent = summaryEl.textContent;
  } else {
    resultEl.hidden = true;
    tableWrap.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = errorMessage(snap.error);
      statusEl.textContent = message;
      if (snap.error.field && errorEls[snap.error.field]) {
        setFieldError(snap.error.field, message);
      } else if (snap.error.code === "SCHEMA") {
        setFieldError("mode", message);
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        const target =
          snap.error.field && inputs[snap.error.field]
            ? inputs[snap.error.field]
            : snap.error.field === "mode"
              ? modeRadios[0]
              : inputs.portfolioValue;
        target.focus();
      }
    } else if (snap.state === "dirty" && snap.exampleLoaded) {
      statusEl.textContent = T.status.example;
    } else {
      statusEl.textContent = T.status[snap.state] || "";
    }
  }
}

function syncDomFromDraft() {
  const snap = controller.snapshot();
  for (const radio of modeRadios) radio.checked = radio.value === snap.draft.mode;
  for (const radio of currencyRadios) radio.checked = radio.value === currency;
  for (const field of Object.keys(inputs)) {
    const value = snap.drafts.depletion[field] ?? snap.drafts["four-percent"][field] ?? "";
    inputs[field].value = value;
  }
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

for (const field of Object.keys(inputs)) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
    render();
  });
}
for (const radio of modeRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      controller.edit({ mode: radio.value });
      syncDomFromDraft();
      render();
    }
  });
}
for (const radio of currencyRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      currency = radio.value;
      controller.edit({});
      render();
    }
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
  syncDomFromDraft();
  render();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  render();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  syncDomFromDraft();
  render();
  modeRadios[0].focus();
});

pagePrevBtn.addEventListener("click", () => {
  if (tablePage > 0) {
    tablePage -= 1;
    render();
  }
});

pageNextBtn.addEventListener("click", () => {
  tablePage += 1;
  render();
});

window.addEventListener("pagehide", () => {
  controller.stopWork();
  revokeDownload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    syncDomFromDraft();
    render();
  }
});

syncDomFromDraft();
render();
