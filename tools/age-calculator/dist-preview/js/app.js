// DOM wiring for the Age Calculator. All user-visible text is set
// through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The core never reads a clock: the two places this
// app layer touches the device calendar are the initial prefill of
// the reference field and the "Use today" button, both plain draft
// edits that invalidate any old result and never run the calculation.
// The fixed report download (age-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob URL
// is revoked within 30 seconds or as soon as the result is
// invalidated.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/age.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      birthDate: "出生日期",
      referenceDate: "參考日期",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      DATE_FORMAT: "請以 YYYY-MM-DD 格式輸入西元日期",
      INVALID_DATE: "不是真實存在的日期",
      RANGE: "日期須在 1900-01-01 至 2100-12-31 之間",
      DATE_ORDER: "參考日期不可早於出生日期",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未計算。輸入出生日期與參考日期，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算年齡」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelAge: "年齡",
    labelTotalDays: "總天數",
    labelWeekday: "出生星期",
    labelNextBirthday: "下一個生日",
    labelCountdown: "距下一個生日",
    labelTurningAge: "屆時滿歲數",
    ageValue: (years, months, days) => `${years} 歲 ${months} 個月 ${days} 天`,
    totalDaysValue: (days) => `${days} 天`,
    countdownValue: (days) => `${days} 天`,
    turningValue: (years) => `${years} 歲`,
    birthdayToday: "🎂 今天生日",
    successSummary: (ageText) => `年齡：${ageText}`,
  },
  en: {
    fieldLabel: {
      birthDate: "Birth date",
      referenceDate: "Reference date",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      DATE_FORMAT: "Enter the date as YYYY-MM-DD.",
      INVALID_DATE: "This is not a real calendar date.",
      RANGE: "The date must be between 1900-01-01 and 2100-12-31.",
      DATE_ORDER: "The reference date must not be before the birth date.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter a birth date and a reference date, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate age” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelAge: "Age",
    labelTotalDays: "Total days",
    labelWeekday: "Weekday of birth",
    labelNextBirthday: "Next birthday",
    labelCountdown: "Days until next birthday",
    labelTurningAge: "Turning age",
    ageValue: (years, months, days) =>
      `${years} ${years === 1 ? "year" : "years"}, ${months} ${months === 1 ? "month" : "months"}, ${days} ${days === 1 ? "day" : "days"}`,
    totalDaysValue: (days) => `${days} ${days === 1 ? "day" : "days"}`,
    countdownValue: (days) => `${days} ${days === 1 ? "day" : "days"}`,
    turningValue: (years) => (years === 1 ? "1 year old" : `${years} years old`),
    birthdayToday: "🎂 Birthday today",
    successSummary: (ageText) => `Age: ${ageText}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  birthDate: document.getElementById("field-birthDate"),
  referenceDate: document.getElementById("field-referenceDate"),
};
const fieldErrors = {
  birthDate: document.getElementById("error-birthDate"),
  referenceDate: document.getElementById("error-referenceDate"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const ageRows = document.getElementById("age-rows");
const weekdayRows = document.getElementById("weekday-rows");
const nextRows = document.getElementById("next-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const todayBtn = document.getElementById("today-btn");
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

function ageText(result) {
  return t.ageValue(result.ageYears, result.ageMonths, result.ageDays);
}

function renderResult(result) {
  appendSummaryRows(ageRows, [
    [t.labelAge, ageText(result)],
    [t.labelTotalDays, t.totalDaysValue(result.totalDays)],
  ]);
  appendSummaryRows(weekdayRows, [
    [t.labelWeekday, lang === "en" ? result.birthWeekdayEn : result.birthWeekdayZh],
  ]);
  appendSummaryRows(nextRows, [
    [t.labelNextBirthday, result.nextBirthday],
    [
      t.labelCountdown,
      result.isBirthdayToday
        ? t.birthdayToday
        : t.countdownValue(result.daysUntilNextBirthday),
    ],
    [t.labelTurningAge, t.turningValue(result.turningAge)],
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
    statusEl.textContent = t.successSummary(ageText(result));
    resultsEl.hidden = false;
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

// App layer only: prefill the reference field with the device's local
// today (YYYY-MM-DD). This is a plain draft edit; the core receives
// explicit strings only and never reads a clock.
function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
controller.edit({ referenceDate: localToday() });

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

// "Use today" is an ordinary draft edit of the reference field: it
// fills the device's local calendar day, invalidates any old result,
// and does not run the calculation.
todayBtn.addEventListener("click", () => {
  controller.edit({ referenceDate: localToday() });
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  controller.edit({ referenceDate: localToday() });
  inputs.birthDate.focus();
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
    controller.edit({ referenceDate: localToday() });
  }
});

render(controller.getState());
