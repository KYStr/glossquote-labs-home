// DOM wiring for the Moon Phase Calculator. All user-visible text is
// set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download (moon-phase-report.json)
// is created only on an explicit click while a success result is
// live, and its Blob URL is revoked within 30 seconds or as soon as
// the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/moon.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: { date: "日期", utcOffset: "UTC 偏移" },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      DATE_FORMAT: "日期格式須為 YYYY-MM-DD",
      INVALID_DATE: "這個日期不存在",
      OFFSET_FORMAT: "偏移格式須為 +HH:MM 或 −HH:MM",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載。",
    },
    errorByField: {
      EMPTY: { date: "請輸入日期", utcOffset: "請輸入 UTC 偏移" },
      RANGE: {
        date: "日期須在 1900-01-01 至 2100-12-31 之間",
        utcOffset: "偏移須在 −12:00 至 +14:00 之間，且分鐘須為 00、15、30 或 45",
      },
    },
    statusEmpty: "尚未計算。輸入日期，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算月相」執行。",
    downloaded: "報告已下載。",
    summaryPhase: "月相",
    summaryAge: "月齡",
    summaryIllumination: "照亮比",
    summaryJulianDay: "儒略日（JD）",
    summaryNextNew: "下一個朔",
    summaryNextFull: "下一個滿月",
    ageValue: (ageDays) => `${ageDays.toFixed(1)} 天`,
    eventValue: (days, utcDate, localDate) =>
      `${days.toFixed(1)} 天後 · UTC ${utcDate} · 當地 ${localDate}`,
  },
  en: {
    fieldLabel: { date: "Date", utcOffset: "UTC offset" },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      DATE_FORMAT: "Use the YYYY-MM-DD format.",
      INVALID_DATE: "That date does not exist.",
      OFFSET_FORMAT: "Use the +HH:MM or −HH:MM format.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    errorByField: {
      EMPTY: { date: "Enter a date.", utcOffset: "Enter a UTC offset." },
      RANGE: {
        date: "The date must be between 1900-01-01 and 2100-12-31.",
        utcOffset: "The offset must be between −12:00 and +14:00, with minutes of 00, 15, 30 or 45.",
      },
    },
    statusEmpty: "Nothing calculated yet. Enter a date or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate moon phase” to run it.",
    downloaded: "Report downloaded.",
    summaryPhase: "Phase",
    summaryAge: "Moon age",
    summaryIllumination: "Illumination",
    summaryJulianDay: "Julian day (JD)",
    summaryNextNew: "Next new moon",
    summaryNextFull: "Next full moon",
    ageValue: (ageDays) => `${ageDays.toFixed(1)} days`,
    eventValue: (days, utcDate, localDate) =>
      `in ${days.toFixed(1)} days · UTC ${utcDate} · local ${localDate}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("moon-form");
const inputs = {
  date: document.getElementById("field-date"),
  utcOffset: document.getElementById("field-utcOffset"),
};
const fieldErrors = {
  date: document.getElementById("error-date"),
  utcOffset: document.getElementById("error-utcOffset"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
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
  const byField = t.errorByField[error.code];
  if (byField !== undefined) return byField[error.field] ?? t.error.INTERNAL;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderSummary(result) {
  summaryRows.replaceChildren();
  const rows = [
    [t.summaryPhase, lang === "en" ? result.phaseEn : result.phaseZh],
    [t.summaryAge, t.ageValue(result.ageDays)],
    [t.summaryIllumination, `${result.illuminationPercent.toFixed(1)}%`],
    [t.summaryJulianDay, String(result.julianDay)],
    [
      t.summaryNextNew,
      t.eventValue(result.daysToNextNewMoon, result.nextNewMoonDate, result.nextNewMoonDateLocal),
    ],
    [
      t.summaryNextFull,
      t.eventValue(
        result.daysToNextFullMoon,
        result.nextFullMoonDate,
        result.nextFullMoonDateLocal,
      ),
    ],
  ];
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    summaryRows.appendChild(div);
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
    renderSummary(result);
    statusEl.textContent = `${t.summaryPhase}：${lang === "en" ? result.phaseEn : result.phaseZh}`;
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

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.date.focus();
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
  if (event.persisted) controller.reset();
});

render(controller.getState());
