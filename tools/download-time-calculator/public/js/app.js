// DOM wiring for the Download Time Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed download artifact is
// download-time-report.json, offered only while the controller reports
// it available, built from the exact current result snapshot.

import { createController } from "./controller.mjs";
import { FIELDS } from "./core/download.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      sizeValue: "檔案大小",
      sizeUnit: "大小單位",
      speedValue: "連線速度",
      speedUnit: "速度單位",
      efficiency: "效率 %",
      startTime: "開始時間（留空＝現在）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "此欄不可留空",
      DECIMAL_FORMAT: "請輸入最多三位小數的數字",
      ENUM: "請選擇有效的單位",
      INTEGER_FORMAT: "請輸入整數",
      TIME_FORMAT: "請以 HH:MM 格式輸入時刻",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorRange: {
      sizeValue: "檔案大小須大於 0 且不超過 9999.999",
      speedValue: "連線速度須在 0.01 到 999999.999 之間",
      efficiency: "效率須在 1 到 100 之間",
      startTime: "時刻須在 00:00 到 23:59 之間",
    },
    statusEmpty: "尚未計算。輸入檔案大小與速度，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算下載時間」執行。",
    summaryDuration: "所需時間",
    summaryFinish: "預計完成",
    detailSeconds: "總秒數",
    detailParts: "時／分／秒拆解",
    detailBytes: "檔案位元組數",
    detailOffset: "完成日偏移",
    unitSeconds: "秒",
    offsetDays: (n) => (n === 0 ? "同一天" : `+${n} 天`),
    partsText: (h, m, s) => `${h} 小時 ${m} 分 ${s} 秒`,
  },
  en: {
    fieldLabel: {
      sizeValue: "File size",
      sizeUnit: "Size unit",
      speedValue: "Connection speed",
      speedUnit: "Speed unit",
      efficiency: "Efficiency %",
      startTime: "Start time (blank = now)",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains invalid characters.",
      EMPTY: "This field must not be blank.",
      DECIMAL_FORMAT: "Enter a number with at most three decimal places.",
      ENUM: "Choose a valid unit.",
      INTEGER_FORMAT: "Enter a whole number.",
      TIME_FORMAT: "Enter the time as HH:MM.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorRange: {
      sizeValue: "File size must be above 0 and at most 9999.999.",
      speedValue: "Speed must be between 0.01 and 999999.999.",
      efficiency: "Efficiency must be between 1 and 100.",
      startTime: "Time must be between 00:00 and 23:59.",
    },
    statusEmpty: "Nothing calculated yet. Enter a file size and speed, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate download time” to run it.",
    summaryDuration: "Time needed",
    summaryFinish: "Estimated finish",
    detailSeconds: "Total seconds",
    detailParts: "Hours / minutes / seconds",
    detailBytes: "File size in bytes",
    detailOffset: "Finish day offset",
    unitSeconds: "s",
    offsetDays: (n) => (n === 0 ? "same day" : `+${n} day(s)`),
    partsText: (h, m, s) => `${h} h ${m} min ${s} s`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("download-form");
const inputs = {
  sizeValue: document.getElementById("field-sizeValue"),
  sizeUnit: document.getElementById("field-sizeUnit"),
  speedValue: document.getElementById("field-speedValue"),
  speedUnit: document.getElementById("field-speedUnit"),
  efficiency: document.getElementById("field-efficiency"),
  startTime: document.getElementById("field-startTime"),
};
const fieldErrors = {
  sizeValue: document.getElementById("error-sizeValue"),
  sizeUnit: document.getElementById("error-sizeUnit"),
  speedValue: document.getElementById("error-speedValue"),
  speedUnit: document.getElementById("error-speedUnit"),
  efficiency: document.getElementById("error-efficiency"),
  startTime: document.getElementById("error-startTime"),
};
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
const chipButtons = [...document.querySelectorAll("[data-chip-speed]")];

let submitted = false;
let reportUrl = null;
let reportRevokeTimer = null;

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
  if (error.code === "RANGE") return t.errorRange[error.field] ?? t.error.INTERNAL;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function appendRow(list, label, value) {
  const div = document.createElement("div");
  div.className = "summary-row";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  div.append(dt, dd);
  list.appendChild(div);
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
    summaryRows.replaceChildren();
    appendRow(summaryRows, t.summaryDuration, result.durationText);
    appendRow(summaryRows, t.summaryFinish, result.finishText);
    detailRows.replaceChildren();
    appendRow(detailRows, t.detailSeconds, `${result.durationSeconds} ${t.unitSeconds}`);
    appendRow(
      detailRows,
      t.detailParts,
      t.partsText(result.durationParts.hours, result.durationParts.minutes, result.durationParts.seconds),
    );
    appendRow(detailRows, t.detailBytes, result.sizeBytes);
    appendRow(detailRows, t.detailOffset, t.offsetDays(result.finishDayOffset));
    statusEl.textContent = `${t.summaryDuration}：${result.durationText} · ${t.summaryFinish}：${result.finishText}`;
    resultsEl.hidden = false;
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  revokeReportUrl();
  controller.run();
});

for (const field of FIELDS) {
  const eventName = inputs[field].tagName === "SELECT" ? "change" : "input";
  inputs[field].addEventListener(eventName, () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const chip of chipButtons) {
  chip.addEventListener("click", () => {
    controller.edit({ speedValue: chip.dataset.chipSpeed, speedUnit: "Mbps" });
    inputs.speedValue.focus();
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.sizeValue.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const text = controller.getReportText();
  if (text === null) return;
  revokeReportUrl();
  const blob = new Blob([text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = "download-time-report.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  reportRevokeTimer = setTimeout(revokeReportUrl, 30000);
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

render(controller.getState());
