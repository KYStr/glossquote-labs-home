// Spacing Token Audit — page wiring.
// Safe DOM only (textContent / value). User input is never inserted as HTML.
// The work runs in a module Worker built from the embedded worker source
// (fixed core + handler bytes injected by scripts/build.mjs). When the
// Worker cannot be created (or when serving the unbuilt source tree, where
// the placeholder is still null), a synchronous in-page shim runs the same
// core and preserves the controller contract, including generation guards.

import {
  DEFAULT_DRAFT,
  EXAMPLE_DRAFT,
  REPORT_FILENAME,
  run,
} from "./core/audit.mjs";
import { createController } from "./controller.mjs";

// Replaced at build time by scripts/build.mjs with the embedded worker
// source string (JSON). Null in the unbuilt source tree.
const WORKER_SOURCE = /*__WORKER_SOURCE__*/ null;

const PAGE_SIZE = 25;
const DOWNLOAD_REVOKE_MS = 30000;

const isZh = document.documentElement.lang === "zh-Hant";

const STRINGS = isZh
  ? {
      statusEmpty: "尚未輸入。請輸入 Token 與量測，或載入範例。",
      statusDirty: "輸入已變更，請重新執行。",
      statusBusy: "處理中…",
      statusSuccess: "已完成對照。",
      statusCancelled: "已取消，可重新執行。",
      exampleLoaded: "已載入範例，請按「對照間距 Token」執行。",
      summary: (total, outside) =>
        `共 ${total} 筆量測，${outside} 列超出容許偏差。`,
      summaryNone: (total) => `共 ${total} 筆量測，沒有超出容許偏差的列。`,
      pageLabel: (page, pages) => `第 ${page} / ${pages} 頁`,
      errorTitle: "輸入有誤：",
      rowLabel: (row) => `第 ${row} 列`,
      fieldTokens: "設計 Token",
      fieldMeasurements: "量測",
      fieldTolerance: "容許偏差",
      errors: {
        SCHEMA: "輸入格式不正確。",
        TOLERANCE: "容許偏差必須是 0–2048 的數字，最多三位小數。",
        INPUT_LIMIT: "內容超過 8,192 個字元。",
        UNICODE: "內容含有不成對的代理字元。",
        EMPTY: "此欄不可為空。",
        ROW_LIMIT: "列數超過上限。",
        ROW_FORMAT:
          "每列須為「名稱 + Tab + px」，名稱以英文字母開頭，最多 32 個字元。",
        DUP_NAME: "名稱在同一份表內重複。",
        PIXELS: "px 必須是 0–2048 的數字，最多三位小數，不可帶單位。",
        OUTPUT_LIMIT: "報告超過 2,097,152 bytes，無法下載。",
        INTERNAL: "處理時發生內部錯誤，請重試。",
        WORKER_ERROR: "處理時發生內部錯誤，請重試。",
      },
      statusExact: "相符",
      statusWithin: "容許內",
      statusOutside: "超出",
    }
  : {
      statusEmpty: "Nothing entered yet. Enter tokens and measurements, or load the example.",
      statusDirty: "Input changed. Run again.",
      statusBusy: "Working…",
      statusSuccess: "Audit complete.",
      statusCancelled: "Cancelled. You can run again.",
      exampleLoaded: "Example loaded. Press “Match spacing tokens” to run it.",
      summary: (total, outside) =>
        `${total} measurements, ${outside} outside tolerance.`,
      summaryNone: (total) => `${total} measurements, none outside tolerance.`,
      pageLabel: (page, pages) => `Page ${page} of ${pages}`,
      errorTitle: "There is a problem with the input:",
      rowLabel: (row) => `row ${row}`,
      fieldTokens: "Design tokens",
      fieldMeasurements: "Measurements",
      fieldTolerance: "Tolerance",
      errors: {
        SCHEMA: "The input is not in the expected format.",
        TOLERANCE:
          "Tolerance must be a number from 0 to 2048 with at most three decimal places.",
        INPUT_LIMIT: "Content exceeds 8,192 characters.",
        UNICODE: "Content contains an unpaired surrogate.",
        EMPTY: "This field must not be empty.",
        ROW_LIMIT: "Too many rows.",
        ROW_FORMAT:
          "Each row must be “name, tab, pixels” with a name starting with a letter and at most 32 characters.",
        DUP_NAME: "A name is duplicated in the same table.",
        PIXELS:
          "Pixels must be a number from 0 to 2048 with at most three decimal places and no unit.",
        OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
        INTERNAL: "An internal error occurred. Please try again.",
        WORKER_ERROR: "An internal error occurred. Please try again.",
      },
      statusExact: "Exact",
      statusWithin: "Within",
      statusOutside: "Outside",
    };

const STATUS_TEXT = {
  exact: () => STRINGS.statusExact,
  within: () => STRINGS.statusWithin,
  outside: () => STRINGS.statusOutside,
};

const $ = (id) => document.getElementById(id);
const tokensInput = $("tokens");
const measurementsInput = $("measurements");
const toleranceInput = $("tolerance");
const runButton = $("run");
const exampleButton = $("example");
const cancelButton = $("cancel");
const resetButton = $("reset");
const downloadButton = $("download");
const statusEl = $("status");
const errorEl = $("error");
const resultsEl = $("results");
const summaryEl = $("summary");
const resultsBody = $("results-body");
const prevButton = $("prev");
const nextButton = $("next");
const pageLabelEl = $("page-label");
const pagerEl = $("pager");

let currentPage = 1;
let downloadUrl = null;
let downloadRevokeTimer = 0;
let workerBlobUrl = null;
let lastErrorKey = null;

function readDraft() {
  return {
    tokens: tokensInput.value,
    measurements: measurementsInput.value,
    tolerance: toleranceInput.value,
  };
}

function writeDraft(draft) {
  tokensInput.value = draft.tokens;
  measurementsInput.value = draft.measurements;
  toleranceInput.value = draft.tolerance;
}

function revokeDownload() {
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  if (downloadRevokeTimer !== 0) {
    clearTimeout(downloadRevokeTimer);
    downloadRevokeTimer = 0;
  }
}

// Synchronous in-page fallback worker: runs the same core, preserves the
// async controller contract, and honours termination via the generation
// guard (a terminated shim never delivers).
function createSyncWorker() {
  let onmessage = null;
  let terminated = false;
  let timer = 0;
  return {
    set onmessage(fn) {
      onmessage = fn;
    },
    get onmessage() {
      return onmessage;
    },
    postMessage(message) {
      timer = setTimeout(() => {
        if (terminated) return;
        let outcome;
        try {
          outcome = run(message.snapshot);
        } catch {
          outcome = {
            ok: false,
            error: { code: "INTERNAL", field: null, row: null },
          };
        }
        if (onmessage) {
          onmessage({ data: { generation: message.generation, outcome } });
        }
      }, 0);
    },
    terminate() {
      terminated = true;
      clearTimeout(timer);
    },
  };
}

function createWorker() {
  if (typeof WORKER_SOURCE === "string" && WORKER_SOURCE.length > 0) {
    try {
      if (workerBlobUrl === null) {
        workerBlobUrl = URL.createObjectURL(
          new Blob([WORKER_SOURCE], { type: "text/javascript" }),
        );
      }
      return new Worker(workerBlobUrl, { type: "module" });
    } catch {
      // Fall through to the synchronous shim below.
    }
  }
  return createSyncWorker();
}

const controller = createController({ createWorker });

function fieldElement(field) {
  if (field === "tokens") return tokensInput;
  if (field === "measurements") return measurementsInput;
  if (field === "tolerance") return toleranceInput;
  return null;
}

function errorMessage(error) {
  const base =
    STRINGS.errors[error.code] || STRINGS.errors.INTERNAL;
  const parts = [base];
  if (error.field) {
    const fieldName =
      error.field === "tokens"
        ? STRINGS.fieldTokens
        : error.field === "measurements"
          ? STRINGS.fieldMeasurements
          : STRINGS.fieldTolerance;
    parts.push(fieldName);
  }
  if (error.row !== null && error.row !== undefined) {
    parts.push(STRINGS.rowLabel(error.row));
  }
  return parts.join(" ");
}

function renderResults(state) {
  const rows = state.result === null ? [] : state.result.rows;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  summaryEl.textContent =
    state.result.outsideCount > 0
      ? STRINGS.summary(rows.length, state.result.outsideCount)
      : STRINGS.summaryNone(rows.length);

  resultsBody.textContent = "";
  for (const row of pageRows) {
    const tr = document.createElement("tr");
    for (const value of [
      row.label,
      row.px,
      row.token,
      row.tokenPx,
      row.delta,
      STATUS_TEXT[row.status](),
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    resultsBody.appendChild(tr);
  }

  const showPager = rows.length > PAGE_SIZE;
  pagerEl.hidden = !showPager;
  if (showPager) {
    pageLabelEl.textContent = STRINGS.pageLabel(currentPage, totalPages);
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  }
}

function render(state) {
  revokeDownload();
  statusEl.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  cancelButton.disabled = state.state !== "busy";

  if (state.state === "empty") {
    statusEl.textContent = STRINGS.statusEmpty;
  } else if (state.state === "dirty") {
    statusEl.textContent = STRINGS.statusDirty;
  } else if (state.state === "busy") {
    statusEl.textContent = STRINGS.statusBusy;
  } else if (state.state === "success") {
    statusEl.textContent = STRINGS.statusSuccess;
  } else if (state.state === "cancelled") {
    statusEl.textContent = STRINGS.statusCancelled;
  } else if (state.state === "error") {
    statusEl.textContent = "";
  }

  if (state.state === "error" && state.error !== null) {
    errorEl.hidden = false;
    errorEl.textContent = STRINGS.errorTitle + " " + errorMessage(state.error);
    const key = state.error.code + "|" + state.error.field + "|" + state.error.row;
    // Only a failed submission moves focus to the first error field.
    if (key !== lastErrorKey) {
      lastErrorKey = key;
      const target = fieldElement(state.error.field);
      if (target !== null) target.focus();
    }
  } else {
    errorEl.hidden = true;
    errorEl.textContent = "";
    if (state.state !== "error") lastErrorKey = null;
  }

  const showResults = state.state === "success" && state.result !== null;
  resultsEl.hidden = !showResults;
  downloadButton.hidden = !showResults;
  if (showResults) renderResults(state);
}

controller.subscribe(render);

tokensInput.addEventListener("input", () => controller.edit(readDraft()));
measurementsInput.addEventListener("input", () => controller.edit(readDraft()));
toleranceInput.addEventListener("input", () => controller.edit(readDraft()));

$("audit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  controller.run();
});

exampleButton.addEventListener("click", () => {
  writeDraft(EXAMPLE_DRAFT);
  currentPage = 1;
  controller.loadExample({ ...EXAMPLE_DRAFT });
  statusEl.textContent = STRINGS.exampleLoaded;
});

cancelButton.addEventListener("click", () => controller.cancel());

resetButton.addEventListener("click", () => {
  writeDraft(DEFAULT_DRAFT);
  currentPage = 1;
  controller.reset();
  tokensInput.focus();
});

prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render(controller.getState());
  }
});

nextButton.addEventListener("click", () => {
  const state = controller.getState();
  if (state.result === null) return;
  const totalPages = Math.max(
    1,
    Math.ceil(state.result.rows.length / PAGE_SIZE),
  );
  if (currentPage < totalPages) {
    currentPage += 1;
    render(state);
  }
});

downloadButton.addEventListener("click", () => {
  const text = controller.getReportText();
  if (text === null) return;
  revokeDownload();
  const blob = new Blob([text], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = REPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  downloadRevokeTimer = setTimeout(revokeDownload, DOWNLOAD_REVOKE_MS);
});

// Leaving the page (including bfcache restore) discards the draft and any
// worker/blob references; the controller contract has no persistence.
window.addEventListener("pagehide", () => {
  controller.dispose();
  revokeDownload();
  if (workerBlobUrl !== null) {
    URL.revokeObjectURL(workerBlobUrl);
    workerBlobUrl = null;
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    writeDraft(DEFAULT_DRAFT);
    currentPage = 1;
    controller.reset();
  }
});

render(controller.getState());
