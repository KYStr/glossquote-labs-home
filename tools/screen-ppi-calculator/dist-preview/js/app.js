// DOM wiring for the Screen PPI Calculator. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, sequence, and state machine; this file only renders
// it. The draft lives only in the current page: switching language or
// leaving the page discards it (no persistent storage, per SPEC).

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatCm,
  formatDotPitchMm,
  formatMegapixels,
  formatPpi,
  serializeReport,
} from "./core/screen-ppi.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      diagonalIn: "對角線（英寸）",
      widthPx: "水平像素",
      heightPx: "垂直像素",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      DECIMAL_FORMAT: "對角線請用數字（英寸），最多兩位小數",
      INTEGER_FORMAT: "像素請用整數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    resultHeading: "像素密度與實體尺寸",
    ppiUnit: "PPI",
    echo: (diagonalIn, widthPx, heightPx) => `${diagonalIn} 英寸 · ${widthPx} × ${heightPx}`,
    widthLabel: "寬度",
    heightLabel: "高度",
    dotPitchLabel: "點距",
    megapixelsLabel: "總像素",
    aspectLabel: "長寬比（參考）",
    exampleNote: "已載入範例，請按「計算螢幕密度」執行。",
  },
  en: {
    fieldLabel: {
      diagonalIn: "Diagonal (inches)",
      widthPx: "Horizontal pixels",
      heightPx: "Vertical pixels",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter the diagonal in inches, with at most two decimal places.",
      INTEGER_FORMAT: "Enter the pixel count as a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    resultHeading: "Pixel density and physical size",
    ppiUnit: "PPI",
    echo: (diagonalIn, widthPx, heightPx) => `${diagonalIn} in · ${widthPx} × ${heightPx}`,
    widthLabel: "Width",
    heightLabel: "Height",
    dotPitchLabel: "Dot pitch",
    megapixelsLabel: "Total pixels",
    aspectLabel: "Aspect ratio (reference)",
    exampleNote: "Example loaded. Run “Calculate screen density” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("screen-ppi-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const ppiEl = document.getElementById("ppi-value");
const echoEl = document.getElementById("result-echo");
const widthEl = document.getElementById("result-width");
const heightEl = document.getElementById("result-height");
const dotPitchEl = document.getElementById("result-dot-pitch");
const megapixelsEl = document.getElementById("result-megapixels");
const aspectEl = document.getElementById("result-aspect");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
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

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
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
    ppiEl.textContent = `${formatPpi(result.ppi)} ${t.ppiUnit}`;
    echoEl.textContent = t.echo(result.diagonalIn, result.widthPx, result.heightPx);
    widthEl.textContent = `${t.widthLabel}：${formatCm(result.widthCm)} cm`;
    heightEl.textContent = `${t.heightLabel}：${formatCm(result.heightCm)} cm`;
    dotPitchEl.textContent = `${t.dotPitchLabel}：${formatDotPitchMm(result.dotPitchMm)} mm`;
    megapixelsEl.textContent = `${t.megapixelsLabel}：${formatMegapixels(result.megapixels)} MP`;
    aspectEl.textContent = `${t.aspectLabel}：${result.aspectRatio}`;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
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
  inputs.diagonalIn.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = t.error.OUTPUT_LIMIT;
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
