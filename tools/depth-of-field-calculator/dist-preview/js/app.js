// DOM wiring for the Depth of Field Calculator. All user-visible
// text is set through textContent/value only; user input never
// becomes markup. Computation runs in a module Worker built from the
// fixed worker source embedded by the preview build (WORKER_SOURCE).
// The controller owns the draft, generation, and state machine; this
// file only renders it. The fixed report download
// (depth-of-field-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, COC_TABLE, FIELDS } from "./core/depth-of-field.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      focalLengthMm: "焦距",
      aperture: "光圈",
      focusDistanceM: "對焦距離",
      sensor: "感光元件",
      cocMm: "容許彌散圓",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      EMPTY: "此欄不可空白",
      DECIMAL_FORMAT: "請輸入十進位數字，不含符號、空白或指數",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    schemaSensor: "感光元件選項不正確",
    rangeError: {
      focalLengthMm: "焦距須在 1 至 2000 mm 之間，小數至多 2 位",
      aperture: "光圈值須在 0.5 至 64 之間，小數至多 2 位",
      focusDistanceM: "對焦距離須在 0.05 至 10000 m 之間，小數至多 3 位，且必須大於焦距",
      cocMm: "自訂容許彌散圓須在 0.001 至 1.000 mm 之間，小數至多 3 位",
    },
    statusEmpty: "尚未計算。輸入焦距、光圈、對焦距離與感光元件，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（全片幅 50mm f/8，對焦 3 m），請按「計算景深」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelHyperfocal: "超焦距",
    labelNear: "近限",
    labelFar: "遠限",
    labelDof: "景深總長",
    labelInputs: "這次設定",
    labelCoc: "採用的容許彌散圓",
    infinityText: "無限遠",
    metres: (value) => `${value.toFixed(3)} m`,
    inputsValue: (result, sensorLabel) =>
      `焦距 ${result.focalLengthMm} mm，光圈 f/${result.aperture}，對焦距離 ${result.focusDistanceM} m，${sensorLabel}`,
    cocValue: (result) => `${result.cocMm} mm`,
    successSummary: (result) =>
      result.farLimitInfinite
        ? `近限 ${result.nearLimitM.toFixed(3)} m，遠限無限遠，超焦距 ${result.hyperfocalM.toFixed(3)} m`
        : `近限 ${result.nearLimitM.toFixed(3)} m，遠限 ${result.farLimitM.toFixed(3)} m，景深 ${result.totalDofM.toFixed(3)} m`,
  },
  en: {
    fieldLabel: {
      focalLengthMm: "Focal length",
      aperture: "Aperture",
      focusDistanceM: "Focus distance",
      sensor: "Sensor format",
      cocMm: "Circle of confusion",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a decimal number with no sign, space, or exponent.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    schemaSensor: "The sensor format selection is invalid.",
    rangeError: {
      focalLengthMm: "Focal length must be between 1 and 2000 mm, with at most 2 decimal places.",
      aperture: "Aperture must be between 0.5 and 64, with at most 2 decimal places.",
      focusDistanceM: "Focus distance must be between 0.05 and 10000 m, with at most 3 decimal places, and greater than the focal length.",
      cocMm: "A custom circle of confusion must be between 0.001 and 1.000 mm, with at most 3 decimal places.",
    },
    statusEmpty: "Nothing calculated yet. Enter focal length, aperture, focus distance and sensor format, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (full frame, 50 mm f/8, focus 3 m). Press “Calculate depth of field” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelHyperfocal: "Hyperfocal distance",
    labelNear: "Near limit",
    labelFar: "Far limit",
    labelDof: "Total depth of field",
    labelInputs: "This setup",
    labelCoc: "Circle of confusion used",
    infinityText: "Infinity",
    metres: (value) => `${value.toFixed(3)} m`,
    inputsValue: (result, sensorLabel) =>
      `Focal length ${result.focalLengthMm} mm, aperture f/${result.aperture}, focus distance ${result.focusDistanceM} m, ${sensorLabel}`,
    cocValue: (result) => `${result.cocMm} mm`,
    successSummary: (result) =>
      result.farLimitInfinite
        ? `Near limit ${result.nearLimitM.toFixed(3)} m, far limit infinity, hyperfocal distance ${result.hyperfocalM.toFixed(3)} m`
        : `Near limit ${result.nearLimitM.toFixed(3)} m, far limit ${result.farLimitM.toFixed(3)} m, depth of field ${result.totalDofM.toFixed(3)} m`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

function sensorLabel(sensor) {
  if (sensor === "custom") return lang === "en" ? "Custom" : "自訂";
  const entry = COC_TABLE[sensor];
  return lang === "en" ? entry.labelEn : entry.labelZh;
}

const form = document.getElementById("entry-form");
const inputs = {
  focalLengthMm: document.getElementById("field-focal-length-mm"),
  aperture: document.getElementById("field-aperture"),
  focusDistanceM: document.getElementById("field-focus-distance-m"),
  sensor: document.getElementById("field-sensor"),
  cocMm: document.getElementById("field-coc-mm"),
};
const fieldErrors = {
  focalLengthMm: document.getElementById("error-focal-length-mm"),
  aperture: document.getElementById("error-aperture"),
  focusDistanceM: document.getElementById("error-focus-distance-m"),
  sensor: document.getElementById("error-sensor"),
  cocMm: document.getElementById("error-coc-mm"),
};
const FIELD_ERROR_IDS = {
  focalLengthMm: "error-focal-length-mm",
  aperture: "error-aperture",
  focusDistanceM: "error-focus-distance-m",
  sensor: "error-sensor",
  cocMm: "error-coc-mm",
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const setupRows = document.getElementById("setup-rows");
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
  target.setAttribute("aria-errormessage", FIELD_ERROR_IDS[field]);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  if (error.code === "SCHEMA" && error.field === "sensor") {
    return t.schemaSensor;
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
    [t.labelHyperfocal, t.metres(result.hyperfocalM)],
    [t.labelNear, t.metres(result.nearLimitM)],
    [t.labelFar, result.farLimitInfinite ? t.infinityText : t.metres(result.farLimitM)],
    [
      t.labelDof,
      result.farLimitInfinite ? t.infinityText : t.metres(result.totalDofM),
    ],
  ]);
  appendSummaryRows(setupRows, [
    [t.labelInputs, t.inputsValue(result, sensorLabel(result.sensor))],
    [t.labelCoc, t.cocValue(result)],
  ]);
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

for (const field of ["focalLengthMm", "aperture", "focusDistanceM", "cocMm"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
inputs.sensor.addEventListener("change", () => {
  controller.edit({ sensor: inputs.sensor.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.focalLengthMm.focus();
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
