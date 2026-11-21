// DOM wiring for the Battery Runtime Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import {
  MODE_FIELDS,
  REPORT_FILENAME,
  formatNumber,
  serializeReport,
} from "./core/battery-runtime-calculator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      mode: "計算模式",
      capacityMah: "電池容量（mAh）",
      capacityWh: "電池容量（Wh）",
      voltage: "電壓（V）",
      loadWatts: "負載功率（W）",
      targetRuntimeHours: "目標續航（小時）",
      depthOfDischargePercent: "放電深度（%）",
      cellCapacityMah: "單顆電芯容量（mAh）",
      cellVoltage: "單顆電芯電壓（V）",
      seriesCount: "串聯數",
      parallelCount: "並聯數",
    },
    modeLabel: {
      "runtime-mah": "用 mAh 計算",
      "runtime-wh": "用 Wh 計算",
      solve: "反推所需容量",
      pack: "電池組組合",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      DECIMAL_FORMAT: "請輸入數字，最多 6 位小數",
      INTEGER_FORMAT: "請輸入整數",
      ENUM: "請選擇計算模式",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未計算。請輸入資料，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算」執行。",
    infinite: "無負載，續航無限",
    summaryRuntime: (result) =>
      `總電量 ${formatNumber(result.energyWh, 2)} Wh，可用電量 ${formatNumber(result.usableWh, 2)} Wh，續航 ${formatNumber(result.runtimeHours, 1)} 小時（${result.runtimeHoursPart} 小時 ${result.runtimeMinutesPart} 分）。`,
    summaryInfinite: (result) =>
      `總電量 ${formatNumber(result.energyWh, 2)} Wh，可用電量 ${formatNumber(result.usableWh, 2)} Wh。無負載，續航無限。`,
    summarySolve: (result) =>
      `所需電量 ${formatNumber(result.requiredEnergyWh, 2)} Wh，所需容量 ${result.requiredCapacityMah} mAh。`,
  },
  en: {
    fieldLabel: {
      mode: "Mode",
      capacityMah: "Capacity (mAh)",
      capacityWh: "Capacity (Wh)",
      voltage: "Voltage (V)",
      loadWatts: "Load (W)",
      targetRuntimeHours: "Target runtime (hours)",
      depthOfDischargePercent: "Depth of discharge (%)",
      cellCapacityMah: "Cell capacity (mAh)",
      cellVoltage: "Cell voltage (V)",
      seriesCount: "Cells in series",
      parallelCount: "Cells in parallel",
    },
    modeLabel: {
      "runtime-mah": "From mAh",
      "runtime-wh": "From Wh",
      solve: "Solve required capacity",
      pack: "Battery pack",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with at most 6 decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      ENUM: "Choose a calculation mode.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter your values, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate” to compute it.",
    infinite: "No load — runtime is unlimited",
    summaryRuntime: (result) =>
      `Total energy ${formatNumber(result.energyWh, 2)} Wh, usable energy ${formatNumber(result.usableWh, 2)} Wh, runtime ${formatNumber(result.runtimeHours, 1)} hours (${result.runtimeHoursPart} h ${result.runtimeMinutesPart} min).`,
    summaryInfinite: (result) =>
      `Total energy ${formatNumber(result.energyWh, 2)} Wh, usable energy ${formatNumber(result.usableWh, 2)} Wh. No load — runtime is unlimited.`,
    summarySolve: (result) =>
      `Required energy ${formatNumber(result.requiredEnergyWh, 2)} Wh, required capacity ${result.requiredCapacityMah} mAh.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const TEXT_FIELDS = [
  "capacityMah",
  "capacityWh",
  "voltage",
  "loadWatts",
  "targetRuntimeHours",
  "depthOfDischargePercent",
  "cellCapacityMah",
  "cellVoltage",
  "seriesCount",
  "parallelCount",
];

const form = document.getElementById("battery-form");
const modeRadios = {
  "runtime-mah": document.getElementById("field-mode-runtime-mah"),
  "runtime-wh": document.getElementById("field-mode-runtime-wh"),
  solve: document.getElementById("field-mode-solve"),
  pack: document.getElementById("field-mode-pack"),
};
const inputs = {};
for (const field of TEXT_FIELDS) {
  inputs[field] = document.getElementById(`field-${field}`);
}
const fieldWraps = {};
for (const field of TEXT_FIELDS) {
  fieldWraps[field] = document.getElementById(`wrap-${field}`);
}
const fieldErrors = {};
for (const field of ["mode", ...TEXT_FIELDS]) {
  fieldErrors[field] = document.getElementById(`error-${field}`);
}
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const energyEl = document.getElementById("result-energy");
const usableEl = document.getElementById("result-usable");
const runtimeHoursEl = document.getElementById("result-runtime-hours");
const runtimeHmEl = document.getElementById("result-runtime-hm");
const packVoltageEl = document.getElementById("result-pack-voltage");
const packCapacityEl = document.getElementById("result-pack-capacity");
const rowEnergyEl = document.getElementById("row-energy");
const rowUsableEl = document.getElementById("row-usable");
const rowRuntimeHoursEl = document.getElementById("row-runtime-hours");
const rowRuntimeHmEl = document.getElementById("row-runtime-hm");
const rowPackVoltageEl = document.getElementById("row-pack-voltage");
const rowPackCapacityEl = document.getElementById("row-pack-capacity");
const rowRequiredEnergyEl = document.getElementById("row-required-energy");
const rowRequiredCapacityEl = document.getElementById("row-required-capacity");
const infiniteEl = document.getElementById("result-infinite");
const solveNoteEl = document.getElementById("result-solve-note");
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

function errorMessage(field, code) {
  return t.error[code] ?? t.error.INTERNAL;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  if (!errorEl) return;
  errorEl.textContent = message === null ? "" : message;
  const targets =
    field === "mode"
      ? Object.values(modeRadios)
      : field in inputs
        ? [inputs[field]]
        : [];
  for (const target of targets) {
    if (message === null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    } else {
      target.setAttribute("aria-invalid", "true");
      target.setAttribute("aria-errormessage", `error-${field}`);
    }
  }
}

function clearFieldErrors() {
  for (const field of ["mode", ...TEXT_FIELDS]) setFieldError(field, null);
}

function errorAnchor(error) {
  if (error.field === "mode") return modeRadios["runtime-mah"];
  if (error.field !== null && error.field in inputs) return inputs[error.field];
  return null;
}

function syncModeGroups(mode) {
  const visible = new Set(MODE_FIELDS[mode]);
  for (const field of TEXT_FIELDS) {
    fieldWraps[field].hidden = !visible.has(field);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const [value, radio] of Object.entries(modeRadios)) {
    radio.checked = draft.mode === value;
  }
  syncModeGroups(draft.mode);
  for (const field of TEXT_FIELDS) {
    const value = field in draft ? draft[field] : "";
    if (inputs[field].value !== value) inputs[field].value = value;
  }
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
      const message = errorMessage(error.field, error.code);
      if (error.field !== null && fieldErrors[error.field]) {
        setFieldError(error.field, message);
        const label = t.fieldLabel[error.field] ?? error.field;
        statusEl.textContent = `${label}：${message}`;
      } else {
        statusEl.textContent = message;
      }
      if (submitted) {
        submitted = false;
        const anchor = errorAnchor(error);
        if (anchor !== null) anchor.focus();
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    if (result.mode === "solve") {
      summaryEl.textContent = t.summarySolve(result);
      requiredEnergyEl.textContent = `${formatNumber(result.requiredEnergyWh, 2)} Wh`;
      requiredCapacityEl.textContent = `${result.requiredCapacityMah} mAh`;
      rowEnergyEl.hidden = true;
      rowUsableEl.hidden = true;
      rowRuntimeHoursEl.hidden = true;
      rowRuntimeHmEl.hidden = true;
      rowPackVoltageEl.hidden = true;
      rowPackCapacityEl.hidden = true;
      rowRequiredEnergyEl.hidden = false;
      rowRequiredCapacityEl.hidden = false;
      infiniteEl.hidden = true;
      solveNoteEl.hidden = false;
    } else {
      energyEl.textContent = `${formatNumber(result.energyWh, 2)} Wh`;
      usableEl.textContent = `${formatNumber(result.usableWh, 2)} Wh`;
      rowEnergyEl.hidden = false;
      rowUsableEl.hidden = false;
      rowRequiredEnergyEl.hidden = true;
      rowRequiredCapacityEl.hidden = true;
      solveNoteEl.hidden = true;
      if (result.mode === "pack") {
        packVoltageEl.textContent = `${String(result.packVoltageV)} V`;
        packCapacityEl.textContent = `${String(result.packCapacityMah)} mAh`;
        rowPackVoltageEl.hidden = false;
        rowPackCapacityEl.hidden = false;
      } else {
        rowPackVoltageEl.hidden = true;
        rowPackCapacityEl.hidden = true;
      }
      if (result.status === "infinite") {
        summaryEl.textContent = t.summaryInfinite(result);
        rowRuntimeHoursEl.hidden = true;
        rowRuntimeHmEl.hidden = true;
        infiniteEl.hidden = false;
        infiniteEl.textContent = t.infinite;
      } else {
        summaryEl.textContent = t.summaryRuntime(result);
        runtimeHoursEl.textContent = `${formatNumber(result.runtimeHours, 1)}`;
        runtimeHmEl.textContent =
          lang === "en"
            ? `${result.runtimeHoursPart} h ${result.runtimeMinutesPart} min`
            : `${result.runtimeHoursPart} 小時 ${result.runtimeMinutesPart} 分`;
        rowRuntimeHoursEl.hidden = false;
        rowRuntimeHmEl.hidden = false;
        infiniteEl.hidden = true;
      }
    }
    statusEl.textContent = summaryEl.textContent;
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

for (const [value, radio] of Object.entries(modeRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ mode: value });
  });
}

for (const field of TEXT_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  modeRadios["runtime-mah"].focus();
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
