// DOM wiring for the Lighting Lumen Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft is kept only in this page: switching language or leaving the
// page discards it, and nothing is persisted anywhere.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  ROOM_TYPES,
  formatDecimal,
  formatInteger,
  serializeReport,
} from "./core/lighting-lumen.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      mode: "面積來源",
      lengthM: "長（公尺）",
      widthM: "寬（公尺）",
      areaUnit: "面積單位",
      areaValue: "面積",
      roomType: "房間用途",
      bulbLumens: "每顆燈泡流明",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "數字格式不正確，請檢查小數位數",
      INTEGER_FORMAT: "每顆流明請用整數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    decimalFormat: {
      lengthM: "長度請用數字，最多一位小數",
      widthM: "寬度請用數字，最多一位小數",
      areaValue: "面積請用數字，最多兩位小數",
    },
    roomSource: (roomType) =>
      `目標照度 ${ROOM_TYPES[roomType].lux} lx（${ROOM_TYPES[roomType].source.zh}）`,
    resultHeading: "需要的流明與燈泡數",
    resultSummary: (totalLumens, bulbCount) =>
      `需要 ${formatInteger(totalLumens)} 流明，共 ${formatInteger(bulbCount)} 顆燈泡`,
    areaLine: (areaM2) => `面積：${formatDecimal(areaM2)} 平方公尺`,
    targetLine: (targetLux) => `目標照度：${formatInteger(targetLux)} lx`,
    totalLine: (totalLumens) => `總流明：${formatInteger(totalLumens)} lm`,
    countLine: (bulbCount) => `燈泡顆數：${formatInteger(bulbCount)} 顆`,
    installedLine: (installedLumens) => `裝設總流明：${formatInteger(installedLumens)} lm`,
    achievedLine: (achievedLux) => `實際照度：${formatDecimal(achievedLux)} lx`,
    disclaimer: "未計利用係數與維護係數，為簡化估算",
    exampleNote: "已載入範例，請按「計算所需流明」執行。",
  },
  en: {
    fieldLabel: {
      mode: "Area source",
      lengthM: "Length (m)",
      widthM: "Width (m)",
      areaUnit: "Area unit",
      areaValue: "Area",
      roomType: "Room type",
      bulbLumens: "Lumens per bulb",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Check the number format and decimal places.",
      INTEGER_FORMAT: "Enter the lumens per bulb as a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    decimalFormat: {
      lengthM: "Enter the length in metres with at most one decimal place.",
      widthM: "Enter the width in metres with at most one decimal place.",
      areaValue: "Enter the area as a number with at most two decimal places.",
    },
    roomSource: (roomType) =>
      `Target illuminance ${ROOM_TYPES[roomType].lux} lx (${ROOM_TYPES[roomType].source.en})`,
    resultHeading: "Required lumens and bulb count",
    resultSummary: (totalLumens, bulbCount) =>
      `${formatInteger(totalLumens)} lumens needed · ${formatInteger(bulbCount)} bulbs`,
    areaLine: (areaM2) => `Area: ${formatDecimal(areaM2)} m²`,
    targetLine: (targetLux) => `Target illuminance: ${formatInteger(targetLux)} lx`,
    totalLine: (totalLumens) => `Total lumens: ${formatInteger(totalLumens)} lm`,
    countLine: (bulbCount) => `Bulb count: ${formatInteger(bulbCount)}`,
    installedLine: (installedLumens) => `Installed lumens: ${formatInteger(installedLumens)} lm`,
    achievedLine: (achievedLux) => `Achieved illuminance: ${formatDecimal(achievedLux)} lx`,
    disclaimer: "Simplified estimate: utilisation and maintenance factors are not applied.",
    exampleNote: "Example loaded. Run “Calculate required lumens” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("lighting-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultSummaryEl = document.getElementById("result-summary");
const resultAreaEl = document.getElementById("result-area");
const resultTargetEl = document.getElementById("result-target");
const resultTotalEl = document.getElementById("result-total");
const resultCountEl = document.getElementById("result-count");
const resultInstalledEl = document.getElementById("result-installed");
const resultAchievedEl = document.getElementById("result-achieved");
const disclaimerEl = document.getElementById("disclaimer");
const roomSourceEl = document.getElementById("room-source");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
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

function errorMessage(error) {
  if (error.code === "DECIMAL_FORMAT" && error.field !== null) {
    return t.decimalFormat[error.field] ?? t.error.DECIMAL_FORMAT;
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  const dimensionsMode = draft.mode === "dimensions";
  inputs.lengthM.disabled = !dimensionsMode;
  inputs.widthM.disabled = !dimensionsMode;
  inputs.areaUnit.disabled = dimensionsMode;
  inputs.areaValue.disabled = dimensionsMode;
  roomSourceEl.textContent = t.roomSource(draft.roomType);
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";
  cancelBtn.hidden = state !== "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    resultSummaryEl.textContent = t.resultSummary(result.totalLumens, result.bulbCount);
    resultAreaEl.textContent = t.areaLine(result.areaM2);
    resultTargetEl.textContent = t.targetLine(result.targetLux);
    resultTotalEl.textContent = t.totalLine(result.totalLumens);
    resultCountEl.textContent = t.countLine(result.bulbCount);
    resultInstalledEl.textContent = t.installedLine(result.installedLumens);
    resultAchievedEl.textContent = t.achievedLine(result.achievedLux);
    disclaimerEl.textContent = t.disclaimer;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
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
for (const field of ["mode", "areaUnit", "roomType"]) {
  inputs[field].addEventListener("change", () => {
    controller.edit({ [field]: inputs[field].value });
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
  inputs.mode.focus();
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
