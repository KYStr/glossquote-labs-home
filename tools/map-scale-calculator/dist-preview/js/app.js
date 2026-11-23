// DOM wiring for the Map Scale Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (map-scale-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.
// The common-scales table is rendered statically in the HTML from
// the SPEC-pinned table; each row's button fills the scale field.

import { createController } from "./controller.mjs";
import { buildReport, COMMON_SCALES } from "./core/map-scale.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    modeLabel: { "map-to-real": "圖上距離 → 實際距離", "real-to-map": "實際距離 → 圖上距離" },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數，不含小數、符號或空白",
      DECIMAL_FORMAT: "請輸入數字，小數點後最多 3 位，不含正負號或空白",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      scale: "比例尺分母須在 1 至 10,000,000 之間的整數",
      mapCm: "圖上距離須在 0.01 至 10,000 公分之間",
      realValue: "實際距離超出範圍（公尺 0.01 至 1,000,000；公里 0.01 至 1,000）",
    },
    fieldLabel: { mode: "換算方向", scale: "比例尺", mapCm: "圖上距離", realValue: "實際距離", realUnit: "實際距離單位" },
    statusEmpty: "尚未換算。輸入比例尺與距離，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：1:25000、圖上 4 公分），請按「換算」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelPrimary: "換算結果",
    labelScale: "比例尺",
    labelMapCm: "圖上距離",
    labelRealMeters: "實際距離（公尺）",
    labelRealKilometers: "實際距離（公里）",
    labelRealDistance: "實際距離",
    primaryMeters: (value) => `${value} 公尺`,
    primaryKilometers: (value) => `${value} 公里`,
    primaryCm: (value) => `${value} 公分`,
    mapCmValue: (value) => `${value} 公分`,
    realMetersValue: (value) => `${value} 公尺`,
    realKilometersValue: (value) => `${value} 公里`,
    realBothValue: (meters, kilometers) => `${meters} 公尺（${kilometers} 公里）`,
    scaleValue: (scale) => `1:${scale}`,
    successSummaryForward: (result) =>
      result.primaryUnit === "m"
        ? `實際距離：${result.realMeters} 公尺`
        : `實際距離：${result.realKilometers} 公里`,
    successSummaryReverse: (result) => `圖上距離：${result.mapCentimeters} 公分`,
  },
  en: {
    modeLabel: { "map-to-real": "Map distance → real distance", "real-to-map": "Real distance → map distance" },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number with no decimal, sign, or space.",
      DECIMAL_FORMAT: "Enter a number with up to 3 decimal places and no sign or space.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      scale: "The scale denominator must be a whole number from 1 to 10,000,000.",
      mapCm: "Map distance must be from 0.01 to 10,000 cm.",
      realValue: "Real distance is out of range (0.01 to 1,000,000 m; 0.01 to 1,000 km).",
    },
    fieldLabel: { mode: "Direction", scale: "Map scale", mapCm: "Map distance", realValue: "Real distance", realUnit: "Real distance unit" },
    statusEmpty: "Nothing converted yet. Enter a scale and a distance, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: 1:25000, map 4 cm). Press “Convert” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelPrimary: "Result",
    labelScale: "Map scale",
    labelMapCm: "Map distance",
    labelRealMeters: "Real distance (m)",
    labelRealKilometers: "Real distance (km)",
    labelRealDistance: "Real distance",
    primaryMeters: (value) => `${value} m`,
    primaryKilometers: (value) => `${value} km`,
    primaryCm: (value) => `${value} cm`,
    mapCmValue: (value) => `${value} cm`,
    realMetersValue: (value) => `${value} m`,
    realKilometersValue: (value) => `${value} km`,
    realBothValue: (meters, kilometers) => `${meters} m (${kilometers} km)`,
    scaleValue: (scale) => `1:${scale}`,
    successSummaryForward: (result) =>
      result.primaryUnit === "m"
        ? `Real distance: ${result.realMeters} m`
        : `Real distance: ${result.realKilometers} km`,
    successSummaryReverse: (result) => `Map distance: ${result.mapCentimeters} cm`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  scale: document.getElementById("field-scale"),
  mapCm: document.getElementById("field-map-cm"),
  realValue: document.getElementById("field-real-value"),
};
const modeInputs = {
  "map-to-real": document.getElementById("field-mode-map"),
  "real-to-map": document.getElementById("field-mode-real"),
};
const unitInputs = {
  m: document.getElementById("field-unit-m"),
  km: document.getElementById("field-unit-km"),
};
const fieldErrors = {
  scale: document.getElementById("error-scale"),
  mapCm: document.getElementById("error-map-cm"),
  realValue: document.getElementById("error-real-value"),
};
const mapGroup = document.getElementById("group-map-cm");
const realGroup = document.getElementById("group-real-value");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const detailRows = document.getElementById("detail-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const scaleTable = document.getElementById("scale-table");

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
  for (const field of Object.keys(fieldErrors)) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function appendRows(container, rows) {
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
  if (result.mode === "map-to-real") {
    const primary =
      result.primaryUnit === "m"
        ? t.primaryMeters(result.realMeters)
        : t.primaryKilometers(result.realKilometers);
    appendRows(summaryRows, [[t.labelPrimary, primary]]);
    appendRows(detailRows, [
      [t.labelScale, t.scaleValue(result.scale)],
      [t.labelMapCm, t.mapCmValue(result.mapCentimeters)],
      [t.labelRealMeters, t.realMetersValue(result.realMeters)],
      [t.labelRealKilometers, t.realKilometersValue(result.realKilometers)],
    ]);
  } else {
    appendRows(summaryRows, [[t.labelPrimary, t.primaryCm(result.mapCentimeters)]]);
    appendRows(detailRows, [
      [t.labelScale, t.scaleValue(result.scale)],
      [t.labelRealDistance, t.realBothValue(result.realMeters, result.realKilometers)],
      [t.labelMapCm, t.mapCmValue(result.mapCentimeters)],
    ]);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of Object.keys(inputs)) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  if (modeInputs[draft.mode]) modeInputs[draft.mode].checked = true;
  if (unitInputs[draft.realUnit]) unitInputs[draft.realUnit].checked = true;
  const forward = draft.mode === "map-to-real";
  mapGroup.hidden = !forward;
  realGroup.hidden = forward;
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
      if (error.field !== null && fieldErrors[error.field]) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      } else if (error.field !== null && t.fieldLabel[error.field]) {
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    renderResult(result);
    statusEl.textContent =
      result.mode === "map-to-real"
        ? t.successSummaryForward(result)
        : t.successSummaryReverse(result);
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

for (const field of Object.keys(inputs)) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const mode of Object.keys(modeInputs)) {
  modeInputs[mode].addEventListener("change", () => {
    if (modeInputs[mode].checked) controller.edit({ mode });
  });
}

for (const unit of Object.keys(unitInputs)) {
  unitInputs[unit].addEventListener("change", () => {
    if (unitInputs[unit].checked) controller.edit({ realUnit: unit });
  });
}

if (scaleTable !== null) {
  scaleTable.addEventListener("click", (event) => {
    const target = event.target;
    if (target === null || typeof target !== "object") return;
    const scale = target.getAttribute ? target.getAttribute("data-scale") : null;
    if (scale === null) return;
    if (!COMMON_SCALES.some((row) => String(row.scale) === scale)) return;
    controller.edit({ scale });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.scale.focus();
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
