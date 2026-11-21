// DOM wiring for the Steps Converter. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/steps.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      steps: "步數",
      strideSource: "步幅來源",
      strideCm: "步幅（公分）",
      heightCm: "身高（公分）",
      calories: "估算熱量",
      weightKg: "體重（公斤）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      INTEGER_FORMAT: "步數請用整數，不能有小數點或符號",
      DECIMAL_FORMAT: "數字格式不正確，請檢查小數位數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未換算。請輸入步數，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「換算步數」執行。",
    rowLabel: {
      strideCm: "步幅（公分）",
      distanceKm: "距離（公里）",
      stepsPerKm: "每公里步數",
      caloriesKcal: "熱量（大卡，估算）",
    },
    caloriesNotEstimated: "未估算",
    summary: (result) => {
      const base = `步幅 ${result.strideCm} 公分，走了 ${result.distanceKm} 公里，每公里約 ${result.stepsPerKm} 步。`;
      return result.caloriesKcal === null
        ? base
        : `${base}約消耗 ${result.caloriesKcal} 大卡。`;
    },
    disclaimer:
      "步幅與熱量皆為估算值。身高推估步幅採 0.414 × 身高；熱量採每公斤每公里 0.75 kcal（總消耗，含休息代謝），實際值因步速、地形與個人差異而不同。",
  },
  en: {
    fieldLabel: {
      steps: "Steps",
      strideSource: "Stride source",
      strideCm: "Stride (cm)",
      heightCm: "Height (cm)",
      calories: "Estimate calories",
      weightKg: "Weight (kg)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      INTEGER_FORMAT: "Steps must be a whole number, with no decimal point or sign.",
      DECIMAL_FORMAT: "Check the number format and decimal places.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "No conversion yet. Enter a step count, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Convert steps” to compute it.",
    rowLabel: {
      strideCm: "Stride (cm)",
      distanceKm: "Distance (km)",
      stepsPerKm: "Steps per km",
      caloriesKcal: "Calories (kcal, estimate)",
    },
    caloriesNotEstimated: "Not estimated",
    summary: (result) => {
      const base = `Stride ${result.strideCm} cm, distance ${result.distanceKm} km, about ${result.stepsPerKm} steps per km.`;
      return result.caloriesKcal === null ? base : `${base} About ${result.caloriesKcal} kcal.`;
    },
    disclaimer:
      "Stride and calories are estimates. The height-based stride uses 0.414 × height; calories use 0.75 kcal per kg per km (gross, including resting metabolism). Actual values vary with pace, terrain and the individual.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("steps-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("result-rows");
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

function renderResults(result) {
  tableBody.replaceChildren();
  const rows = [
    ["strideCm", String(result.strideCm)],
    ["distanceKm", String(result.distanceKm)],
    ["stepsPerKm", String(result.stepsPerKm)],
    [
      "caloriesKcal",
      result.caloriesKcal === null ? t.caloriesNotEstimated : String(result.caloriesKcal),
    ],
  ];
  for (const [key, value] of rows) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = t.rowLabel[key];
    tr.appendChild(labelCell);
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(td);
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  inputs.strideCm.disabled = draft.strideSource !== "measured";
  inputs.heightCm.disabled = draft.strideSource !== "height";
  inputs.weightKg.disabled = draft.calories !== "on";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

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
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
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
    summaryEl.textContent = t.summary(result);
    statusEl.textContent = summaryEl.textContent;
    renderResults(result);
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
inputs.strideSource.addEventListener("change", () => {
  controller.edit({ strideSource: inputs.strideSource.value });
});
inputs.calories.addEventListener("change", () => {
  controller.edit({ calories: inputs.calories.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.steps.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
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
