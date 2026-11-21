// DOM wiring for the Photo Print Size Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, sequence, and state machine; this file only renders
// it. There is no persistence: the draft lives only in this page, and
// switching language or leaving the page discards it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  QUALITY_LABELS,
  REPORT_FILENAME,
  SIZE_LABELS,
  formatCm,
  formatDpi,
  formatInches,
  formatMegapixels,
  serializeReport,
} from "./core/photo-print-size.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      INTEGER_FORMAT: "像素請用整數",
      DECIMAL_FORMAT: "DPI 請用數字，最多兩位小數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    modeName: {
      max: "最大可印尺寸",
      need: "需求像素",
      check: "實際 DPI",
    },
    maxSummary: (wIn, hIn, wCm, hCm) =>
      `最大可印尺寸：${wIn} × ${hIn} 英寸（${wCm} × ${hCm} 公分）`,
    bestFit: (name) => `建議最大標準尺寸：${name}`,
    noFit: "無標準尺寸符合此 DPI",
    needSummary: (longPx, shortPx, mp) =>
      `需求像素：${longPx} × ${shortPx}（長邊 × 短邊），共 ${mp} 百萬像素`,
    needDetails: (name, longIn, shortIn, longCm, shortCm) =>
      `${name}：${longIn} × ${shortIn} 英寸（${longCm} × ${shortCm} 公分）`,
    checkSummary: (dpi, quality) => `${dpi} DPI · ${quality}`,
    checkDetails: (dpiLong, dpiShort) => `長邊 DPI：${dpiLong}，短邊 DPI：${dpiShort}`,
    tableSize: "尺寸",
    tableDpiLong: "長邊 DPI",
    tableDpiShort: "短邊 DPI",
    tableEffective: "有效 DPI",
    tableQuality: "品質",
    tableFits: "符合",
    fitsYes: "符合",
    fitsNo: "不符合",
    qualityDisclosure:
      "品質分級是依一般觀看距離的常見經驗值，不是業界標準。",
    exampleNote: "已載入範例，請按「計算沖印尺寸」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      INTEGER_FORMAT: "Enter the pixels as a whole number.",
      DECIMAL_FORMAT: "Enter the DPI as a number, with at most two decimal places.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    modeName: {
      max: "Largest print size",
      need: "Required pixels",
      check: "Effective DPI",
    },
    maxSummary: (wIn, hIn, wCm, hCm) =>
      `Largest printable size: ${wIn} × ${hIn} in (${wCm} × ${hCm} cm)`,
    bestFit: (name) => `Largest fitting standard size: ${name}`,
    noFit: "No standard size fits at this DPI",
    needSummary: (longPx, shortPx, mp) =>
      `Required pixels: ${longPx} × ${shortPx} (long × short), ${mp} megapixels in total`,
    needDetails: (name, longIn, shortIn, longCm, shortCm) =>
      `${name}: ${longIn} × ${shortIn} in (${longCm} × ${shortCm} cm)`,
    checkSummary: (dpi, quality) => `${dpi} DPI · ${quality}`,
    checkDetails: (dpiLong, dpiShort) => `Long-side DPI: ${dpiLong}, short-side DPI: ${dpiShort}`,
    tableSize: "Size",
    tableDpiLong: "Long-side DPI",
    tableDpiShort: "Short-side DPI",
    tableEffective: "Effective DPI",
    tableQuality: "Quality",
    tableFits: "Fits",
    fitsYes: "Fits",
    fitsNo: "Does not fit",
    qualityDisclosure:
      "Quality bands are common rules of thumb for typical viewing distances, not an industry standard.",
    exampleNote: "Example loaded. Run “Calculate print sizes” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("photo-print-size-form");
const modeRadios = {};
for (const mode of ["max", "need", "check"]) {
  modeRadios[mode] = document.getElementById(`field-mode-${mode}`);
}
const inputs = {
  pixelsW: document.getElementById("field-pixelsW"),
  pixelsH: document.getElementById("field-pixelsH"),
  dpi: document.getElementById("field-dpi"),
  sizeId: document.getElementById("field-sizeId"),
};
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("result-summary");
const subEl = document.getElementById("result-sub");
const detailsEl = document.getElementById("result-details");
const disclaimerEl = document.getElementById("disclaimer");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const dpiPresetButtons = [];
for (const preset of ["150", "240", "300"]) {
  dpiPresetButtons.push(document.getElementById(`dpi-preset-${preset}`));
}

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
  const errorEl = fieldErrors[field];
  const input =
    field === "mode" ? modeRadios.max : inputs[field];
  if (message === null) {
    if (input !== undefined && input !== null) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (input !== undefined && input !== null) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function clearDetails() {
  while (detailsEl.firstChild !== null) detailsEl.removeChild(detailsEl.firstChild);
}

function buildSizesTable(result) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const heading of [
    t.tableSize,
    t.tableDpiLong,
    t.tableDpiShort,
    t.tableEffective,
    t.tableQuality,
    t.tableFits,
  ]) {
    const th = document.createElement("th");
    th.textContent = heading;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const row of result.sizes) {
    const tr = document.createElement("tr");
    const cells = [
      SIZE_LABELS[row.sizeId][lang],
      formatDpi(row.dpiLong),
      formatDpi(row.dpiShort),
      formatDpi(row.effectiveDpi),
      QUALITY_LABELS[row.quality][lang],
      row.fits ? t.fitsYes : t.fitsNo,
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const mode of ["max", "need", "check"]) {
    modeRadios[mode].checked = draft.mode === mode;
  }
  for (const field of ["pixelsW", "pixelsH", "dpi", "sizeId"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  // Field availability follows the mode (SPEC userFlow).
  const pixelsActive = draft.mode === "max" || draft.mode === "check";
  const dpiActive = draft.mode === "max" || draft.mode === "need";
  const sizeActive = draft.mode === "need" || draft.mode === "check";
  inputs.pixelsW.disabled = !pixelsActive;
  inputs.pixelsH.disabled = !pixelsActive;
  inputs.dpi.disabled = !dpiActive;
  inputs.sizeId.disabled = !sizeActive;
  for (const button of dpiPresetButtons) button.disabled = !dpiActive;
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";
  cancelBtn.hidden = state !== "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    clearDetails();
    if (result.mode === "max") {
      summaryEl.textContent = t.maxSummary(
        formatInches(result.maxWidthIn),
        formatInches(result.maxHeightIn),
        formatCm(result.maxWidthCm),
        formatCm(result.maxHeightCm),
      );
      subEl.textContent =
        result.bestFitSizeId === null
          ? t.noFit
          : t.bestFit(SIZE_LABELS[result.bestFitSizeId][lang]);
      detailsEl.appendChild(buildSizesTable(result));
    } else if (result.mode === "need") {
      summaryEl.textContent = t.needSummary(
        result.requiredLongPx,
        result.requiredShortPx,
        formatMegapixels(result.megapixels),
      );
      subEl.textContent = t.needDetails(
        SIZE_LABELS[result.sizeId][lang],
        formatInches(result.sizeLongIn),
        formatInches(result.sizeShortIn),
        formatCm(result.sizeLongCm),
        formatCm(result.sizeShortCm),
      );
    } else {
      summaryEl.textContent = t.checkSummary(
        formatDpi(result.effectiveDpi),
        QUALITY_LABELS[result.quality][lang],
      );
      subEl.textContent = t.checkDetails(
        formatDpi(result.dpiLong),
        formatDpi(result.dpiShort),
      );
    }
    disclaimerEl.textContent = t.qualityDisclosure;
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
          const target = error.field === "mode" ? modeRadios.max : inputs[error.field];
          if (target !== undefined && target !== null) target.focus();
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

for (const mode of ["max", "need", "check"]) {
  modeRadios[mode].addEventListener("change", () => {
    controller.edit({ mode });
  });
}
for (const field of ["pixelsW", "pixelsH", "dpi", "sizeId"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
inputs.sizeId.addEventListener("change", () => {
  controller.edit({ sizeId: inputs.sizeId.value });
});
for (const button of dpiPresetButtons) {
  button.addEventListener("click", () => {
    controller.edit({ dpi: button.dataset.dpi });
  });
}

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  modeRadios.max.focus();
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
