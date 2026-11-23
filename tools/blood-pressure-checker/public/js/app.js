// DOM wiring for the Blood Pressure Checker. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (blood-pressure-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, CATEGORIES, FIELDS } from "./core/blood-pressure.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      systolic: "收縮壓",
      diastolic: "舒張壓",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數（mmHg），不含小數、符號或空白",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      systolic: "收縮壓須在 40 至 300 mmHg 之間",
      diastolic: "舒張壓須在 20 至 200 mmHg 之間，且不得高於收縮壓",
    },
    statusEmpty: "尚未查詢。輸入收縮壓與舒張壓，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例 118/76），請按「查詢分級」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelCategory: "分級",
    labelInputs: "這次量測",
    labelRange: "所屬區間",
    labelAdvice: "一般性提醒",
    rangeText: {
      normal: "收縮壓 < 120 且舒張壓 < 80",
      elevated: "收縮壓 120–129 且舒張壓 < 80",
      stage1: "收縮壓 130–139 或舒張壓 80–89",
      stage2: "收縮壓 ≥ 140 或舒張壓 ≥ 90",
      crisis: "收縮壓 > 180 及/或舒張壓 > 120",
    },
    inputsValue: (systolic, diastolic) => `收縮壓 ${systolic} mmHg，舒張壓 ${diastolic} mmHg`,
    categoryValue: (result) => `${result.categoryZh}（${result.categoryEn}）`,
    crisisNote: "⚠ 血壓極高，請盡快就醫；若出現胸痛、呼吸困難、視力變化等症狀，請立即就醫或撥打 119。",
    successSummary: (result) => `分級：${result.categoryZh}（${result.categoryEn}）`,
  },
  en: {
    fieldLabel: {
      systolic: "Systolic",
      diastolic: "Diastolic",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number (mmHg) with no decimal, sign, or space.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      systolic: "Systolic pressure must be between 40 and 300 mmHg.",
      diastolic: "Diastolic pressure must be between 20 and 200 mmHg and must not exceed systolic pressure.",
    },
    statusEmpty: "Nothing checked yet. Enter systolic and diastolic pressure, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case 118/76). Press “Check category” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelCategory: "Category",
    labelInputs: "This reading",
    labelRange: "Category range",
    labelAdvice: "General reminder",
    rangeText: {
      normal: "Systolic < 120 and diastolic < 80",
      elevated: "Systolic 120–129 and diastolic < 80",
      stage1: "Systolic 130–139 or diastolic 80–89",
      stage2: "Systolic ≥ 140 or diastolic ≥ 90",
      crisis: "Systolic > 180 and/or diastolic > 120",
    },
    inputsValue: (systolic, diastolic) => `Systolic ${systolic} mmHg, diastolic ${diastolic} mmHg`,
    categoryValue: (result) => `${result.categoryEn} (${result.categoryZh})`,
    crisisNote: "⚠ Blood pressure is very high — seek medical care promptly. If you have chest pain, shortness of breath, or vision changes, seek emergency care or call 119.",
    successSummary: (result) => `Category: ${result.categoryEn} (${result.categoryZh})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  systolic: document.getElementById("field-systolic"),
  diastolic: document.getElementById("field-diastolic"),
};
const fieldErrors = {
  systolic: document.getElementById("error-systolic"),
  diastolic: document.getElementById("error-diastolic"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const adviceRows = document.getElementById("advice-rows");
const crisisNoteEl = document.getElementById("crisis-note");
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
  const pinned = CATEGORIES[result.category];
  appendSummaryRows(summaryRows, [
    [t.labelCategory, t.categoryValue(result)],
    [t.labelInputs, t.inputsValue(result.systolic, result.diastolic)],
    [t.labelRange, t.rangeText[result.category]],
  ]);
  appendSummaryRows(adviceRows, [
    [t.labelAdvice, lang === "en" ? pinned.adviceEn : pinned.adviceZh],
  ]);
  crisisNoteEl.hidden = result.category !== "crisis";
  if (result.category === "crisis") crisisNoteEl.textContent = t.crisisNote;
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
  inputs.systolic.focus();
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
