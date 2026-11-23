// DOM wiring for the Image File Size Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (image-file-size-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, ESTIMATE_NOTE_EN, ESTIMATE_NOTE_ZH, FIELDS, FORMATS } from "./core/image-file-size.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      widthPx: "圖片寬度",
      heightPx: "圖片高度",
      bitDepth: "色彩深度",
      format: "格式",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數，不含小數、符號或空白",
      ENUM: "請選擇列出的選項",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      widthPx: "圖片寬度須在 1 至 100000 像素之間",
      heightPx: "圖片高度須在 1 至 100000 像素之間，且總像素不得超過 10 億",
    },
    statusEmpty: "尚未估算。輸入圖片寬×高像素、色彩深度與格式，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例 4000×3000、24-bit、JPEG），請按「估算檔案大小」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelEstimatedSize: "估算大小",
    labelTotalPixels: "總像素",
    labelUncompressed: "未壓縮大小",
    labelEstimatedBytes: "估算位元組數",
    labelSizeKB: "估算大小（KB）",
    labelSizeMB: "估算大小（MB）",
    labelMegapixels: "百萬像素",
    labelEffectiveBitDepth: "有效色彩深度",
    labelFormat: "格式與係數",
    estimateNote: ESTIMATE_NOTE_ZH,
    formatValue: (result) => `${FORMATS[result.format].labelZh}（係數 ${FORMATS[result.format].factorText}，${FORMATS[result.format].ratioZh}）`,
    bitDepthValue: (result) => `${result.effectiveBitDepth}-bit`,
    bytesValue: (value) => `${value} bytes`,
    pixelsValue: (value) => `${value} 像素`,
    successSummary: (result) => `估算大小：${result.displaySize}（${ESTIMATE_NOTE_ZH}）`,
  },
  en: {
    fieldLabel: {
      widthPx: "Image width",
      heightPx: "Image height",
      bitDepth: "Colour depth",
      format: "Format",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number with no decimal, sign, or space.",
      ENUM: "Choose one of the listed options.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      widthPx: "Image width must be between 1 and 100000 pixels.",
      heightPx: "Image height must be between 1 and 100000 pixels, and total pixels must not exceed 1 billion.",
    },
    statusEmpty: "Nothing estimated yet. Enter the image width and height in pixels, bit depth and format, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case 4000×3000, 24-bit, JPEG). Press “Estimate file size” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelEstimatedSize: "Estimated size",
    labelTotalPixels: "Total pixels",
    labelUncompressed: "Uncompressed size",
    labelEstimatedBytes: "Estimated bytes",
    labelSizeKB: "Estimated size (KB)",
    labelSizeMB: "Estimated size (MB)",
    labelMegapixels: "Megapixels",
    labelEffectiveBitDepth: "Effective bit depth",
    labelFormat: "Format and factor",
    estimateNote: ESTIMATE_NOTE_EN,
    formatValue: (result) => `${FORMATS[result.format].labelEn} (factor ${FORMATS[result.format].factorText}, ${FORMATS[result.format].ratioEn})`,
    bitDepthValue: (result) => `${result.effectiveBitDepth}-bit`,
    bytesValue: (value) => `${value} bytes`,
    pixelsValue: (value) => `${value} pixels`,
    successSummary: (result) => `Estimated size: ${result.displaySize} (${ESTIMATE_NOTE_EN})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  widthPx: document.getElementById("field-widthPx"),
  heightPx: document.getElementById("field-heightPx"),
  bitDepth: document.getElementById("field-bitDepth"),
  format: document.getElementById("field-format"),
};
const fieldErrors = {
  widthPx: document.getElementById("error-widthPx"),
  heightPx: document.getElementById("error-heightPx"),
  bitDepth: document.getElementById("error-bitDepth"),
  format: document.getElementById("error-format"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const detailRows = document.getElementById("detail-rows");
const estimateNoteEl = document.getElementById("estimate-note");
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
  appendSummaryRows(summaryRows, [
    [t.labelEstimatedSize, `${result.displaySize} — ${t.estimateNote}`],
  ]);
  appendSummaryRows(detailRows, [
    [t.labelTotalPixels, t.pixelsValue(result.totalPixels)],
    [t.labelMegapixels, result.megapixels],
    [t.labelUncompressed, t.bytesValue(result.uncompressedBytes)],
    [t.labelEstimatedBytes, t.bytesValue(result.estimatedBytes)],
    [t.labelSizeKB, result.sizeKB],
    [t.labelSizeMB, result.sizeMB],
    [t.labelEffectiveBitDepth, t.bitDepthValue(result)],
    [t.labelFormat, t.formatValue(result)],
  ]);
  estimateNoteEl.textContent = t.estimateNote;
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
  const eventName = field === "bitDepth" || field === "format" ? "change" : "input";
  inputs[field].addEventListener(eventName, () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.widthPx.focus();
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
