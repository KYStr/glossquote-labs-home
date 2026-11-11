// DOM wiring for the Race Time Predictor. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatDistanceM,
  formatDuration,
  formatPace,
  serializeReport,
} from "./core/race.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      knownPreset: "已知成績距離",
      knownCustomM: "自訂距離（公尺）",
      knownTime: "完賽時間",
      targetCustomM: "自訂目標距離（公尺，選填）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的距離",
      DECIMAL_FORMAT: "距離請用數字（公尺），最多兩位小數",
      TIME_FORMAT: "時間格式為 分:秒 或 時:分:秒",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未預測。請輸入一場比賽的距離與完賽時間，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「預測完賽時間」執行。",
    rowLabel: { "5k": "5K", "10k": "10K", half: "半馬", marathon: "全馬", custom: "自訂" },
    paceSuffix: "／公里",
    summary: (result) =>
      `已知成績：${formatDistanceM(result.knownDistanceM)} 公尺，完賽時間 ${formatDuration(result.knownTimeSeconds)}，每公里配速 ${formatPace(result.knownPaceSecPerKm)}／公里。`,
    disclaimer:
      "預測以 Riegel 公式估算，假設各距離的訓練與體能狀態相當；實際成績會受路線、天氣、補給與臨場狀況影響，本工具僅供參考。",
  },
  en: {
    fieldLabel: {
      knownPreset: "Known result distance",
      knownCustomM: "Custom distance (metres)",
      knownTime: "Finish time",
      targetCustomM: "Custom target distance (metres, optional)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid distance.",
      DECIMAL_FORMAT: "Enter the distance in metres, at most two decimal places.",
      TIME_FORMAT: "Use M:SS or H:MM:SS.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "No prediction yet. Enter a race distance and finish time, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Predict finish times” to compute it.",
    rowLabel: { "5k": "5K", "10k": "10K", half: "Half marathon", marathon: "Marathon", custom: "Custom" },
    paceSuffix: "/km",
    summary: (result) =>
      `Known result: ${formatDistanceM(result.knownDistanceM)} metres in ${formatDuration(result.knownTimeSeconds)}, pace ${formatPace(result.knownPaceSecPerKm)}/km.`,
    disclaimer:
      "Predictions use the Riegel formula and assume equivalent training and fitness across distances; actual results vary with course, weather, fueling and race-day conditions. For reference only.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("race-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("prediction-rows");
const disclaimerEl = document.getElementById("disclaimer");
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

function renderPredictions(result) {
  tableBody.replaceChildren();
  for (const row of result.predictions) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = t.rowLabel[row.key];
    tr.appendChild(labelCell);
    const values = [
      formatDistanceM(row.distanceM),
      formatDuration(row.predictedSeconds),
      `${formatPace(row.paceSecPerKm)}${t.paceSuffix}`,
    ];
    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  inputs.knownCustomM.disabled = draft.knownPreset !== "custom";
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
    disclaimerEl.textContent = t.disclaimer;
    renderPredictions(result);
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
inputs.knownPreset.addEventListener("change", () => {
  controller.edit({ knownPreset: inputs.knownPreset.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.knownPreset.focus();
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
