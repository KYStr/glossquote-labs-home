// DOM wiring for the School Entry Year Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (school-entry-year-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS } from "./core/school-entry.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      birthDate: "出生日期",
      asOfDate: "查詢日期",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      DATE_FORMAT: "請以 YYYY-MM-DD 格式輸入西元日期",
      DATE_INVALID: "不是真實存在的日期",
      RANGE: "日期須在 1912-01-01 至 2199-12-31 之間",
      DATE_ORDER: "出生日期不可晚於查詢日期",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未計算。輸入出生日期與查詢日期，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算入學與年級」執行。",
    downloaded: "報告已下載。",
    entrySeptember: "入學年月",
    entrySchoolYear: "學年度",
    entryAge: "入學時年齡",
    currentSchoolYear: "查詢日所屬學年度",
    currentClass: "目前班級／年級",
    currentAge: "學年度開始時年齡",
    valueNone: "—",
    entrySeptemberValue: (year) => `${year} 年 9 月`,
    schoolYearValue: (rocYear) => `民國 ${rocYear} 學年度`,
    entryAgeValue: (years, months) => `${years} 歲又 ${months} 個月`,
    currentAgeValue: (years) => `${years} 歲`,
    classValue: (name, alias) => (alias === null ? name : `${name}（${alias}）`),
    successSummary: (name, rocYear) => `目前：${name}（民國 ${rocYear} 學年度）`,
  },
  en: {
    fieldLabel: {
      birthDate: "Birth date",
      asOfDate: "As-of date",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      DATE_FORMAT: "Enter the date as YYYY-MM-DD.",
      DATE_INVALID: "This is not a real calendar date.",
      RANGE: "The date must be between 1912-01-01 and 2199-12-31.",
      DATE_ORDER: "The birth date must not be after the as-of date.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter a birth date and an as-of date, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate entry & grade” to run it.",
    downloaded: "Report downloaded.",
    entrySeptember: "Entry September",
    entrySchoolYear: "School year",
    entryAge: "Age at entry",
    currentSchoolYear: "School year of the as-of date",
    currentClass: "Current class / grade",
    currentAge: "Age at school-year start",
    valueNone: "—",
    entrySeptemberValue: (year) => `September ${year}`,
    schoolYearValue: (rocYear) => `ROC ${rocYear}`,
    entryAgeValue: (years, months) => `${years} years ${months} months`,
    currentAgeValue: (years) => `${years} years old`,
    classValue: (name) => name,
    successSummary: (name, rocYear) => `Current: ${name} (ROC ${rocYear})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  birthDate: document.getElementById("field-birthDate"),
  asOfDate: document.getElementById("field-asOfDate"),
};
const fieldErrors = {
  birthDate: document.getElementById("error-birthDate"),
  asOfDate: document.getElementById("error-asOfDate"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const entryRows = document.getElementById("entry-rows");
const currentRows = document.getElementById("current-rows");
const kindergartenBody = document.getElementById("kindergarten-rows");
const projectionBody = document.getElementById("projection-rows");
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

function renderKindergarten(rows) {
  kindergartenBody.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const cells = [
      lang === "en" ? row.nameEn : row.nameZh,
      String(row.septemberYear),
      String(row.rocYear),
    ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    kindergartenBody.appendChild(tr);
  }
}

function renderProjection(rows) {
  projectionBody.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const name = lang === "en" ? row.nameEn : t.classValue(row.nameZh, row.aliasZh);
    const cells = [
      name,
      String(row.septemberYear),
      String(row.rocYear),
      `${row.spanStart} – ${row.spanEnd}`,
    ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    projectionBody.appendChild(tr);
  }
}

function renderResult(result) {
  const { entry, current } = result;
  appendSummaryRows(entryRows, [
    [t.entrySeptember, t.entrySeptemberValue(entry.septemberYear)],
    [t.entrySchoolYear, t.schoolYearValue(entry.rocYear)],
    [t.entryAge, t.entryAgeValue(entry.ageYears, entry.ageMonths)],
  ]);
  appendSummaryRows(currentRows, [
    [t.currentSchoolYear, t.schoolYearValue(current.schoolYearRoc)],
    [
      t.currentClass,
      lang === "en" ? current.nameEn : t.classValue(current.nameZh, current.aliasZh),
    ],
    [
      t.currentAge,
      current.ageAtStartYears === null
        ? t.valueNone
        : t.currentAgeValue(current.ageAtStartYears),
    ],
  ]);
  renderKindergarten(result.kindergarten);
  renderProjection(result.projection);
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
    renderResult(result);
    statusEl.textContent = t.successSummary(
      lang === "en" ? result.current.nameEn : result.current.nameZh,
      result.current.schoolYearRoc,
    );
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

// "Use today" is an ordinary draft edit of the as-of field: it fills
// the Asia/Taipei calendar date, invalidates any old result, and does
// not run the calculation.
todayBtn.addEventListener("click", () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = {};
  for (const part of parts) byType[part.type] = part.value;
  controller.edit({ asOfDate: `${byType.year}-${byType.month}-${byType.day}` });
});

resetBtn.addEventListener("click", () => {
  controller.reset();
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
  if (event.persisted) controller.reset();
});

render(controller.getState());
