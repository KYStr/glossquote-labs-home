// DOM wiring for the Inflation Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// drafts, sequence, and state machine; this file only renders it. The
// draft lives only in this page: there is no persistent storage, and
// leaving the page discards it.

import { createController } from "./controller.mjs";
import {
  ALL_FIELDS,
  ERROR_MESSAGES,
  REPORT_FILENAME,
  formatNumber,
  formatPercent,
  serializeReport,
} from "./core/inflation.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const PAGE_SIZE = 25;

const STRINGS = {
  "zh-Hant": {
    exampleNote: "已載入範例，請按「計算換算」執行。",
    pageLabel: (page, pages) => `第 ${page} 頁，共 ${pages} 頁`,
    period: (fromLabel, toLabel) => `${fromLabel} → ${toLabel}`,
    beyondRange: "超出可計算範圍",
  },
  en: {
    exampleNote: "Example loaded. Run “Calculate conversion” to compute it.",
    pageLabel: (page, pages) => `Page ${page} of ${pages}`,
    period: (fromLabel, toLabel) => `${fromLabel} → ${toLabel}`,
    beyondRange: "Beyond the computable range",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("inflation-form");
const inputs = {};
for (const field of ALL_FIELDS) {
  if (field !== "mode") inputs[field] = document.getElementById(`field-${field}`);
}
const fieldErrors = {};
for (const field of ALL_FIELDS) {
  if (field !== "mode") fieldErrors[field] = document.getElementById(`error-${field}`);
}
const modeRate = document.getElementById("mode-rate");
const modeCpi = document.getElementById("mode-cpi");
const groupRate = document.getElementById("group-rate");
const groupCpi = document.getElementById("group-cpi");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultRateEl = document.getElementById("result-rate");
const resultCpiEl = document.getElementById("result-cpi");
const futureValueEl = document.getElementById("result-future-value");
const purchasingPowerEl = document.getElementById("result-purchasing-power");
const cumulativeEl = document.getElementById("result-cumulative");
const yearTableBody = document.getElementById("year-table-body");
const pagePrevBtn = document.getElementById("page-prev");
const pageNextBtn = document.getElementById("page-next");
const pageLabelEl = document.getElementById("page-label");
const rangeNoteEl = document.getElementById("range-note");
const periodEl = document.getElementById("result-period");
const adjustedAmountEl = document.getElementById("result-adjusted-amount");
const cpiCumulativeEl = document.getElementById("result-cpi-cumulative");
const equivalentRowEl = document.getElementById("result-equivalent-row");
const equivalentRateEl = document.getElementById("result-equivalent-rate");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;
let tablePage = 0;
let currentYearTable = null;

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
  for (const field of Object.keys(fieldErrors)) setFieldError(field, null);
}

function renderYearTable() {
  while (yearTableBody.firstChild !== null) {
    yearTableBody.removeChild(yearTableBody.firstChild);
  }
  if (currentYearTable === null) {
    pageLabelEl.textContent = "";
    pagePrevBtn.disabled = true;
    pageNextBtn.disabled = true;
    return;
  }
  const pages = Math.max(1, Math.ceil(currentYearTable.length / PAGE_SIZE));
  if (tablePage >= pages) tablePage = pages - 1;
  if (tablePage < 0) tablePage = 0;
  const start = tablePage * PAGE_SIZE;
  const rows = currentYearTable.slice(start, start + PAGE_SIZE);
  for (const row of rows) {
    const tr = document.createElement("tr");
    const yearCell = document.createElement("td");
    yearCell.textContent = String(row.year);
    tr.appendChild(yearCell);
    const nominalCell = document.createElement("td");
    nominalCell.textContent = formatNumber(row.nominalValue);
    tr.appendChild(nominalCell);
    const powerCell = document.createElement("td");
    if (row.purchasingPower === null) {
      powerCell.textContent = "—";
      powerCell.title = t.beyondRange;
    } else {
      powerCell.textContent = formatNumber(row.purchasingPower);
    }
    tr.appendChild(powerCell);
    yearTableBody.appendChild(tr);
  }
  pageLabelEl.textContent = t.pageLabel(tablePage + 1, pages);
  pagePrevBtn.disabled = tablePage === 0;
  pageNextBtn.disabled = tablePage >= pages - 1;
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  const draftMode = draft.mode;
  modeRate.checked = draftMode === "rate";
  modeCpi.checked = draftMode === "cpi";
  groupRate.hidden = draftMode !== "rate";
  groupCpi.hidden = draftMode !== "cpi";
  for (const field of Object.keys(inputs)) {
    const value = field === "yearsBetween" && draft[field] === null ? "" : draft[field] ?? "";
    if (inputs[field].value !== value) inputs[field].value = value;
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
    resultsEl.hidden = false;
    if (draftMode === "rate" && "yearTable" in result) {
      resultRateEl.hidden = false;
      resultCpiEl.hidden = true;
      futureValueEl.textContent = formatNumber(result.futureValue);
      purchasingPowerEl.textContent =
        result.purchasingPower === null ? "—" : formatNumber(result.purchasingPower);
      cumulativeEl.textContent = formatPercent(result.cumulativePercent);
      if (currentYearTable !== result.yearTable) {
        currentYearTable = result.yearTable;
        tablePage = 0;
      }
      renderYearTable();
      rangeNoteEl.hidden = !result.yearTable.some((row) => row.purchasingPower === null) &&
        result.purchasingPower !== null;
    } else if (draftMode === "cpi" && "adjustedAmount" in result) {
      resultRateEl.hidden = true;
      resultCpiEl.hidden = false;
      currentYearTable = null;
      periodEl.textContent = t.period(result.fromLabel, result.toLabel);
      adjustedAmountEl.textContent = formatNumber(result.adjustedAmount);
      cpiCumulativeEl.textContent = formatPercent(result.cumulativePercent);
      const hasRate = result.equivalentAnnualRatePercent !== null;
      equivalentRowEl.hidden = !hasRate;
      if (hasRate) equivalentRateEl.textContent = formatPercent(result.equivalentAnnualRatePercent);
    }
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  currentYearTable = null;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = ERROR_MESSAGES[error.code]?.[lang] ?? ERROR_MESSAGES.INTERNAL[lang];
      if (error.field !== null && error.field in fieldErrors) {
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

for (const field of Object.keys(inputs)) {
  inputs[field].addEventListener("input", () => {
    const value = inputs[field].value;
    controller.edit({ [field]: field === "yearsBetween" && value === "" ? null : value });
  });
}
modeRate.addEventListener("change", () => {
  if (modeRate.checked) controller.edit({ mode: "rate" });
});
modeCpi.addEventListener("change", () => {
  if (modeCpi.checked) controller.edit({ mode: "cpi" });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.amount.focus();
});

pagePrevBtn.addEventListener("click", () => {
  if (tablePage > 0) {
    tablePage -= 1;
    renderYearTable();
  }
});

pageNextBtn.addEventListener("click", () => {
  if (currentYearTable !== null && (tablePage + 1) * PAGE_SIZE < currentYearTable.length) {
    tablePage += 1;
    renderYearTable();
  }
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = ERROR_MESSAGES.OUTPUT_LIMIT[lang];
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
