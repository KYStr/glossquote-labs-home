// DOM wiring for the Air Purifier Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (air-purifier-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/air-purifier.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      areaValue: "房間面積",
      areaUnit: "面積單位",
      ceilingHeightM: "天花板高度",
      targetAch: "目標換氣率",
      purifierCadrCfm: "自有清淨機煙霧 CADR",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      DECIMAL_FORMAT: "請輸入十進位數字，不含空白、符號或指數",
      INTEGER_FORMAT: "請輸入整數，不含小數、符號或空白",
      ENUM: "請選擇平方公尺或坪",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      areaValue: "換算後面積須在 1 至 200 平方公尺之間",
      ceilingHeightM: "天花板高度須在 2.0 至 4.0 公尺之間",
      targetAch: "目標換氣率須在 1.0 至 10.0 之間，小數至多 1 位",
      purifierCadrCfm: "自有清淨機煙霧 CADR 須為 10 至 2000 CFM 的整數",
    },
    statusEmpty: "尚未計算。輸入房間面積與天花板高度，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：15 平方公尺房間），請按「計算所需 CADR」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelRequiredCadr: "所需煙霧 CADR",
    labelAhamRoom: "AHAM 建議適用面積",
    labelArea: "房間面積",
    labelCeiling: "天花板高度",
    labelVolume: "房間體積",
    labelTargetAch: "目標換氣率",
    labelOwnedAhamRoom: "自有清淨機 AHAM 適用面積",
    labelOwnedAch: "自有清淨機實際換氣率",
    labelAdequacy: "夠用與否",
    requiredCadrValue: (result) => `${result.requiredCadrCfm} CFM（${result.requiredCadrM3h} m³/h）`,
    ahamRoomValue: (sqft, m2) => `${sqft.toFixed(1)} 平方呎（${m2.toFixed(1)} 平方公尺）`,
    areaValue: (result) => `${result.areaM2.toFixed(1)} 平方公尺（${result.areaSqft.toFixed(1)} 平方呎）`,
    ceilingValue: (result) => `${result.ceilingFt.toFixed(2)} 呎`,
    volumeValue: (result) => `${result.volumeFt3.toFixed(1)} 立方呎`,
    achValue: (ach) => `${ach.toFixed(1)} ACH`,
    adequateValue: (owned) =>
      owned.adequate ? "足夠" : `不足，缺 ${owned.shortfallCfm} CFM`,
    successSummary: (result) =>
      `所需煙霧 CADR ${result.requiredCadrCfm} CFM（${result.requiredCadrM3h} m³/h）；AHAM 建議適用面積 ${result.ahamSuggestedRoomSqft.toFixed(1)} 平方呎（${result.ahamSuggestedRoomM2.toFixed(1)} 平方公尺）。`,
  },
  en: {
    fieldLabel: {
      areaValue: "Room area",
      areaUnit: "Area unit",
      ceilingHeightM: "Ceiling height",
      targetAch: "Target air changes per hour",
      purifierCadrCfm: "Your purifier's smoke CADR",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a decimal number with no space, sign, or exponent.",
      INTEGER_FORMAT: "Enter a whole number with no decimal, sign, or space.",
      ENUM: "Choose square metres or ping.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      areaValue: "Converted area must be between 1 and 200 m².",
      ceilingHeightM: "Ceiling height must be between 2.0 and 4.0 m.",
      targetAch: "Target air changes per hour must be between 1.0 and 10.0, with at most 1 decimal place.",
      purifierCadrCfm: "Your purifier's smoke CADR must be a whole number from 10 to 2000 CFM.",
    },
    statusEmpty: "Nothing calculated yet. Enter the room area and ceiling height, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: a 15 m² room). Press “Calculate required CADR” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelRequiredCadr: "Required smoke CADR",
    labelAhamRoom: "AHAM suggested room size",
    labelArea: "Room area",
    labelCeiling: "Ceiling height",
    labelVolume: "Room volume",
    labelTargetAch: "Target air changes per hour",
    labelOwnedAhamRoom: "Your purifier's AHAM room size",
    labelOwnedAch: "Your purifier's actual air changes",
    labelAdequacy: "Big enough?",
    requiredCadrValue: (result) => `${result.requiredCadrCfm} CFM (${result.requiredCadrM3h} m³/h)`,
    ahamRoomValue: (sqft, m2) => `${sqft.toFixed(1)} sq ft (${m2.toFixed(1)} m²)`,
    areaValue: (result) => `${result.areaM2.toFixed(1)} m² (${result.areaSqft.toFixed(1)} sq ft)`,
    ceilingValue: (result) => `${result.ceilingFt.toFixed(2)} ft`,
    volumeValue: (result) => `${result.volumeFt3.toFixed(1)} ft³`,
    achValue: (ach) => `${ach.toFixed(1)} ACH`,
    adequateValue: (owned) =>
      owned.adequate ? "Yes, big enough" : `No — short by ${owned.shortfallCfm} CFM`,
    successSummary: (result) =>
      `Required smoke CADR ${result.requiredCadrCfm} CFM (${result.requiredCadrM3h} m³/h); AHAM suggested room size ${result.ahamSuggestedRoomSqft.toFixed(1)} sq ft (${result.ahamSuggestedRoomM2.toFixed(1)} m²).`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  areaValue: document.getElementById("field-areaValue"),
  areaUnit: document.getElementById("field-areaUnit"),
  ceilingHeightM: document.getElementById("field-ceilingHeightM"),
  targetAch: document.getElementById("field-targetAch"),
  purifierCadrCfm: document.getElementById("field-purifierCadrCfm"),
};
const fieldErrors = {
  areaValue: document.getElementById("error-areaValue"),
  areaUnit: document.getElementById("error-areaUnit"),
  ceilingHeightM: document.getElementById("error-ceilingHeightM"),
  targetAch: document.getElementById("error-targetAch"),
  purifierCadrCfm: document.getElementById("error-purifierCadrCfm"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const ownedRows = document.getElementById("owned-rows");
const ownedHeading = document.getElementById("owned-heading");
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
    [t.labelRequiredCadr, t.requiredCadrValue(result)],
    [
      t.labelAhamRoom,
      t.ahamRoomValue(result.ahamSuggestedRoomSqft, result.ahamSuggestedRoomM2),
    ],
    [t.labelArea, t.areaValue(result)],
    [t.labelCeiling, t.ceilingValue(result)],
    [t.labelVolume, t.volumeValue(result)],
    [t.labelTargetAch, t.achValue(result.targetAch)],
  ]);
  if (result.owned !== null) {
    ownedHeading.hidden = false;
    ownedRows.hidden = false;
    appendSummaryRows(ownedRows, [
      [
        t.labelOwnedAhamRoom,
        t.ahamRoomValue(result.owned.ahamRoomSqft, result.owned.ahamRoomM2),
      ],
      [t.labelOwnedAch, t.achValue(result.owned.ach)],
      [t.labelAdequacy, t.adequateValue(result.owned)],
    ]);
  } else {
    ownedHeading.hidden = true;
    ownedRows.hidden = true;
    ownedRows.replaceChildren();
  }
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
  if (field === "areaUnit") {
    inputs[field].addEventListener("change", () => {
      controller.edit({ [field]: inputs[field].value });
    });
  } else {
    inputs[field].addEventListener("input", () => {
      controller.edit({ [field]: inputs[field].value });
    });
  }
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.areaValue.focus();
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
