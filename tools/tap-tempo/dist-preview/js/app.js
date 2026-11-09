// DOM wiring for the Tap Tempo BPM detector. All user-visible text is
// set through textContent/value only; user input never becomes markup.
// The controller owns the tap list, the import draft, generations, and
// the state machine; this file only renders it and captures taps.

import { createController } from "./controller.mjs";
import {
  ERROR_MESSAGES,
  REPORT_FILENAME,
  formatReading,
  serializeReport,
} from "./core/tempo.mjs";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    hintStart: "點按開始",
    hintOnceMore: "再敲一下開始測量",
    statusBusy: "處理中",
    statusDirty: "輸入已變更，請重新計算",
    statusCancelled: "已取消，可重新執行",
    measured: (bpm) => `測得 BPM ${bpm}（中位數）`,
    outputLimit: "報告超過 2,097,152 位元組，無法下載。",
    rowSuffix: (row) => `（第 ${row} 個）`,
  },
  en: {
    hintStart: "Tap to start",
    hintOnceMore: "Tap once more to start measuring",
    statusBusy: "Working",
    statusDirty: "Input changed. Measure again.",
    statusCancelled: "Cancelled. You can run again.",
    measured: (bpm) => `Measured BPM ${bpm} (median)`,
    outputLimit: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
    rowSuffix: (row) => ` (item ${row})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const appEl = document.getElementById("app");
const tapBtn = document.getElementById("tap-btn");
const statusEl = document.getElementById("status");
const hintEl = document.getElementById("reading-hint");
const readingsEl = document.getElementById("readings");
const bpmEl = document.getElementById("reading-bpm");
const msEl = document.getElementById("reading-ms");
const meanEl = document.getElementById("reading-mean");
const bpsEl = document.getElementById("reading-bps");
const intervalsEl = document.getElementById("reading-intervals");
const segmentRow = document.getElementById("segment-row");
const segmentTapsEl = document.getElementById("reading-segment-taps");
const undoBtn = document.getElementById("undo-btn");
const resetBtn = document.getElementById("reset-btn");
const importForm = document.getElementById("import-form");
const textarea = document.getElementById("import-text");
const errorEl = document.getElementById("error-taps");
const measureBtn = document.getElementById("measure-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;

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

function errorMessage(error) {
  const entry = ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.INTERNAL;
  const base = entry[lang];
  return error.row !== null && error.row !== undefined
    ? `${base}${t.rowSuffix(error.row)}`
    : base;
}

function render(s) {
  appEl.setAttribute("aria-busy", s.state === "busy" ? "true" : "false");
  if (textarea.value !== s.importText) textarea.value = s.importText;
  cancelBtn.hidden = s.state !== "busy";
  measureBtn.disabled = s.state === "busy";
  downloadBtn.hidden = !s.downloadAvailable;
  undoBtn.disabled = s.tapCount === 0;
  if (!s.downloadAvailable) revokeReportUrl();

  if (s.state === "error" && s.error !== null) {
    const message = errorMessage(s.error);
    errorEl.textContent = message;
    textarea.setAttribute("aria-invalid", "true");
    textarea.setAttribute("aria-errormessage", "error-taps");
    statusEl.textContent = message;
    if (submitted) {
      submitted = false;
      textarea.focus();
    }
  } else {
    errorEl.textContent = "";
    textarea.removeAttribute("aria-invalid");
    textarea.removeAttribute("aria-errormessage");
  }

  const r = s.result;
  const hasReading = r !== null && r.intervalCount >= 1;
  if (hasReading) {
    const f = formatReading(r);
    hintEl.hidden = true;
    readingsEl.hidden = false;
    bpmEl.textContent = f.bpmMedianText;
    msEl.textContent = f.medianIntervalText;
    meanEl.textContent = f.bpmMeanText;
    bpsEl.textContent = f.beatsPerSecondText;
    intervalsEl.textContent = String(r.intervalCount);
    segmentRow.hidden = r.resetCount === 0;
    segmentTapsEl.textContent = String(r.segmentTapCount);
    if (s.state !== "error") statusEl.textContent = t.measured(f.bpmMedianText);
  } else {
    readingsEl.hidden = true;
    hintEl.hidden = false;
    hintEl.textContent = s.state === "empty" ? t.hintStart : t.hintOnceMore;
    if (s.state === "empty") statusEl.textContent = t.hintStart;
    else if (s.state === "busy") statusEl.textContent = t.statusBusy;
    else if (s.state === "dirty") statusEl.textContent = t.statusDirty;
    else if (s.state === "cancelled") statusEl.textContent = t.statusCancelled;
    else if (s.state === "tapping") statusEl.textContent = t.hintOnceMore;
  }
  if (s.state === "busy") statusEl.textContent = t.statusBusy;
  else if (s.state === "dirty") statusEl.textContent = t.statusDirty;
  else if (s.state === "cancelled") statusEl.textContent = t.statusCancelled;
}

const controller = createController({ onChange: render });

function recordTap() {
  controller.tap(Math.round(performance.now()));
}

let suppressClick = false;
tapBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  suppressClick = true;
  recordTap();
});
tapBtn.addEventListener("pointercancel", () => {
  suppressClick = false;
});
tapBtn.addEventListener("click", () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  recordTap();
});
tapBtn.addEventListener("keydown", (event) => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
  }
});

undoBtn.addEventListener("click", () => {
  controller.undo();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  tapBtn.focus();
});

importForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.runImport();
});

textarea.addEventListener("input", () => {
  controller.editImport(textarea.value);
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  measureBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const s = controller.getState();
  if (!s.downloadAvailable || s.result === null) return;
  const serialized = serializeReport(s.result);
  if (!serialized.ok) {
    statusEl.textContent = t.outputLimit;
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

render(controller.getState());
