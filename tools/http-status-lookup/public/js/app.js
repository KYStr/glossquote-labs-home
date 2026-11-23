// DOM wiring for the HTTP Status Lookup. All user-visible text is
// set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (http-status-lookup-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.
// The full 64-row status table is static HTML in both pages; this
// file only filters it by class and fills the input when a row's code
// button is pressed.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/http-status.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: { code: "狀態碼" },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入三位數字，不含小數、符號或空白",
      RANGE: "狀態碼須為 100 至 599 的三位數",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未查詢。輸入一個狀態碼，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例 200），請按「查詢」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelClass: "分類",
    labelCode: "狀態碼",
    labelOfficial: "官方名稱",
    labelMeaning: "意義",
    labelCause: "常見成因",
    labelAdvice: "處理建議",
    labelReference: "出處",
    labelUnassigned: "未指派",
    unassignedNote: "此代碼在 IANA HTTP 狀態碼登記中為 Unassigned，尚未指派官方語義；只以分類概略理解。",
    temporaryNote: "暫時性登記：登記已於 2026-11-13 到期，但登記列仍在。",
    obsoleteNote: "此代碼已廢止（OBSOLETED），不應在新系統使用。",
    unusedNote: "此代碼目前未使用，沒有定義的語義。",
    categoryValue: (result) =>
      `${result.category.class}xx ${result.category.labelZh}（${result.category.labelEn}）`,
    classSummary: (result) => result.category.summaryZh,
    successSummary: (result) =>
      result.assigned
        ? `${result.code} ${result.reason}（${result.reasonZh}）`
        : `${result.code} 未指派（${result.category.labelZh}）`,
  },
  en: {
    fieldLabel: { code: "Status code" },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter exactly three digits with no decimal, sign, or space.",
      RANGE: "The status code must be a three-digit number from 100 to 599.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty: "Nothing looked up yet. Enter a status code, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case 200). Press “Look up” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelClass: "Class",
    labelCode: "Status code",
    labelOfficial: "Official name",
    labelMeaning: "Meaning",
    labelCause: "Common causes",
    labelAdvice: "What to do",
    labelReference: "Reference",
    labelUnassigned: "Unassigned",
    unassignedNote:
      "This code is Unassigned in the IANA HTTP Status Code Registry; no official semantics are assigned. Interpret it only by its class.",
    temporaryNote:
      "Temporary registration: the registration expired 2026-11-13, but the registry entry remains.",
    obsoleteNote: "This code is obsolete (OBSOLETED); do not use it in new systems.",
    unusedNote: "This code is currently unused and has no defined semantics.",
    categoryValue: (result) =>
      `${result.category.class}xx ${result.category.labelEn} (${result.category.labelZh})`,
    classSummary: (result) => result.category.summaryEn,
    successSummary: (result) =>
      result.assigned
        ? `${result.code} ${result.reason} (${result.reasonZh})`
        : `${result.code} Unassigned (${result.category.labelEn})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = { code: document.getElementById("field-code") };
const fieldErrors = { code: document.getElementById("error-code") };
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const adviceRows = document.getElementById("advice-rows");
const flagsNoteEl = document.getElementById("flags-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const tableFilter = document.getElementById("table-filter");
const tableRows = Array.from(document.querySelectorAll("#status-table tbody tr"));

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
  const primaryMeaning = lang === "en" ? result.meaningEn : result.meaningZh;
  const primaryCause = lang === "en" ? result.causeEn : result.causeZh;
  const primaryAdvice = lang === "en" ? result.adviceEn : result.adviceZh;
  const summary = [
    [t.labelClass, `${t.categoryValue(result)} — ${t.classSummary(result)}`],
    [t.labelCode, String(result.code)],
    [
      t.labelOfficial,
      result.assigned ? `${result.reason}（${result.reasonZh}）` : t.labelUnassigned,
    ],
    [t.labelMeaning, primaryMeaning],
    [t.labelReference, result.assigned ? result.reference : "—"],
  ];
  appendSummaryRows(summaryRows, summary);
  appendSummaryRows(adviceRows, [
    [t.labelCause, primaryCause],
    [t.labelAdvice, primaryAdvice],
  ]);
  const notes = [];
  if (!result.assigned) notes.push(t.unassignedNote);
  if (result.temporary) notes.push(t.temporaryNote);
  if (result.obsolete) notes.push(t.obsoleteNote);
  if (result.assigned && (result.code === 306 || result.code === 418)) {
    notes.push(t.unusedNote);
  }
  flagsNoteEl.hidden = notes.length === 0;
  flagsNoteEl.textContent = notes.join(" ");
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

let submitted = false;

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
  inputs.code.focus();
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

// Full status code table: filter by class, and fill the input when a
// row's code button is pressed (marks the draft dirty, waits for a
// manual run, exactly as the SPEC pins).
function applyTableFilter() {
  const selected = tableFilter.value;
  for (const row of tableRows) {
    row.hidden = selected !== "all" && row.dataset.class !== selected;
  }
}

tableFilter.addEventListener("change", applyTableFilter);

for (const row of tableRows) {
  const button = row.querySelector(".code-btn");
  if (button === null) continue;
  button.addEventListener("click", () => {
    controller.edit({ code: button.dataset.code });
    inputs.code.focus();
  });
}

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
