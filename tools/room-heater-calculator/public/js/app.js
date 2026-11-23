// DOM wiring for the Room Heater Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (room-heater-calculator-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  MULTI_UNIT_NOTE_EN,
  MULTI_UNIT_NOTE_ZH,
  buildReport,
} from "./core/room-heater.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      area: "房間面積",
      areaUnit: "面積單位",
      ceilingHeight: "天花板高度",
      insulation: "隔熱等級",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      DECIMAL_FORMAT: "請輸入數字，最多 2 位小數，不含空白、符號或指數",
      ENUM: "請選擇有效的選項",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      area: "換算後面積須在 0.5 至 200 平方公尺之間",
      ceilingHeight: "天花板高度須在 2.0 至 4.0 公尺之間",
    },
    statusEmpty: "尚未計算。輸入面積、天花板高度與隔熱等級，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：10 平方公尺、普通隔熱、2.4 公尺），請按「計算暖氣功率」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelRequired: "所需瓦數",
    labelRecommended: "建議規格",
    labelAreaM2: "換算後面積",
    labelVolume: "房間體積",
    labelWPerM2: "採用 W/m²",
    labelRaw: "未進位瓦數",
    multiUnitNote: MULTI_UNIT_NOTE_ZH,
    requiredValue: (result) => `${result.requiredWatts} W`,
    recommendedValue: (result) =>
      result.units > 1
        ? `${result.recommendedWatts} W（${result.units} 台，每台 2000 W）`
        : `${result.recommendedWatts} W（1 台）`,
    areaM2Value: (result) => `${result.areaM2} m²`,
    volumeValue: (result) => `${result.volumeM3} m³`,
    wPerM2Value: (result) => `${result.wPerM2} W/m²`,
    rawValue: (result) => `${result.rawWatts} W`,
    successSummary: (result) =>
      `所需瓦數 ${result.requiredWatts} W，建議 ${result.recommendedWatts} W（${result.units} 台）`,
  },
  en: {
    fieldLabel: {
      area: "Room area",
      areaUnit: "Area unit",
      ceilingHeight: "Ceiling height",
      insulation: "Insulation level",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with up to 2 decimal places and no spaces, signs, or exponents.",
      ENUM: "Choose a valid option.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      area: "Converted area must be between 0.5 and 200 m².",
      ceilingHeight: "Ceiling height must be between 2.0 and 4.0 m.",
    },
    statusEmpty: "Nothing calculated yet. Enter the room area, ceiling height and insulation level, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: 10 m², average insulation, 2.4 m). Press “Calculate heater wattage” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelRequired: "Required wattage",
    labelRecommended: "Recommended size",
    labelAreaM2: "Converted area",
    labelVolume: "Room volume",
    labelWPerM2: "W/m² used",
    labelRaw: "Unrounded wattage",
    multiUnitNote: MULTI_UNIT_NOTE_EN,
    requiredValue: (result) => `${result.requiredWatts} W`,
    recommendedValue: (result) =>
      result.units > 1
        ? `${result.recommendedWatts} W (${result.units} units, 2000 W each)`
        : `${result.recommendedWatts} W (1 unit)`,
    areaM2Value: (result) => `${result.areaM2} m²`,
    volumeValue: (result) => `${result.volumeM3} m³`,
    wPerM2Value: (result) => `${result.wPerM2} W/m²`,
    rawValue: (result) => `${result.rawWatts} W`,
    successSummary: (result) =>
      `Required ${result.requiredWatts} W; recommended ${result.recommendedWatts} W (${result.units} unit${result.units > 1 ? "s" : ""})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  area: document.getElementById("field-area"),
  areaUnit: document.getElementById("field-area-unit"),
  ceilingHeight: document.getElementById("field-ceiling-height"),
  insulation: document.getElementById("field-insulation"),
};
const fieldErrors = {
  area: document.getElementById("error-area"),
  areaUnit: document.getElementById("error-area-unit"),
  ceilingHeight: document.getElementById("error-ceiling-height"),
  insulation: document.getElementById("error-insulation"),
};
const errorIds = {
  area: "error-area",
  areaUnit: "error-area-unit",
  ceilingHeight: "error-ceiling-height",
  insulation: "error-insulation",
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const detailRows = document.getElementById("detail-rows");
const multiNoteEl = document.getElementById("multi-note");
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
  target.setAttribute("aria-errormessage", errorIds[field]);
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
    [t.labelRequired, t.requiredValue(result)],
    [t.labelRecommended, t.recommendedValue(result)],
  ]);
  appendSummaryRows(detailRows, [
    [t.labelAreaM2, t.areaM2Value(result)],
    [t.labelVolume, t.volumeValue(result)],
    [t.labelWPerM2, t.wPerM2Value(result)],
    [t.labelRaw, t.rawValue(result)],
  ]);
  multiNoteEl.hidden = result.units <= 1;
  if (result.units > 1) multiNoteEl.textContent = t.multiUnitNote;
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
  const eventName = inputs[field].tagName === "SELECT" ? "change" : "input";
  inputs[field].addEventListener(eventName, () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.area.focus();
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
