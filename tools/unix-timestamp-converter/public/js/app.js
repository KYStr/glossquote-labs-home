// DOM wiring for the Unix Timestamp Converter. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (unix-timestamp-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { FIELDS, buildReport } from "./core/unix-timestamp.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      direction: "方向",
      timestamp: "時間戳",
      unit: "單位",
      date: "日期",
      time: "時間",
      milliseconds: "毫秒",
      timezone: "時區",
      format: "輸出格式",
      customPattern: "自訂格式",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入十進位時間戳，可選負號與 1–3 位小數，不含空白、符號或指數",
      DATETIME_FORMAT: "請輸入正確格式的日期或時間",
      INVALID_DATE: "這個日期不存在",
      RANGE: "超出可換算範圍（0001-01-01 至 9999-12-31）",
      AMBIGUOUS_UNIT: "這個數值無法自動判別是秒或毫秒，請明確選擇單位",
      LEAP_SECOND_UNSUPPORTED: "Unix 時間不計閏秒，23:59:60 沒有對應的時間戳",
      NONEXISTENT_LOCAL_TIME: "這個本地時間在該時區不存在（日光節約切換的缺失時段）",
      UNSUPPORTED_ZONE: "不支援這個時區",
      CUSTOM_FORMAT: "自訂格式含有未知的字母組合，請只用 YYYY、MM、DD、HH、mm、ss、SSS",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未轉換。輸入時間戳或日期時間，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：時間戳 0），請按「轉換」執行。",
    nowNote: "已填入目前時刻快照（非即時更新），請按「轉換」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelTimestampSeconds: "時間戳（秒）",
    labelTimestampMs: "時間戳（毫秒）",
    labelUnitDetected: "偵測到的單位",
    unitSeconds: "秒",
    unitMilliseconds: "毫秒",
    labelIso: "ISO 8601",
    labelRfc: "RFC 2822",
    labelCustom: "自訂格式",
    ambiguousNote: "此本地時間出現兩次，採用較早者。",
    successSummary: (result) =>
      `時間戳 ${result.timestampMs} 毫秒（${result.timestampSeconds} 秒）`,
  },
  en: {
    fieldLabel: {
      direction: "Direction",
      timestamp: "Timestamp",
      unit: "Unit",
      date: "Date",
      time: "Time",
      milliseconds: "Milliseconds",
      timezone: "Time zone",
      format: "Output format",
      customPattern: "Custom format",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT:
        "Enter a decimal timestamp, optionally negative with 1–3 decimal digits, with no spaces, symbols, or exponents.",
      DATETIME_FORMAT: "Enter a date or time in the required format.",
      INVALID_DATE: "This date does not exist.",
      RANGE: "Outside the convertible range (0001-01-01 to 9999-12-31).",
      AMBIGUOUS_UNIT:
        "This value cannot be told apart as seconds or milliseconds automatically; choose a unit explicitly.",
      LEAP_SECOND_UNSUPPORTED: "Unix time does not count leap seconds; 23:59:60 has no timestamp.",
      NONEXISTENT_LOCAL_TIME:
        "This local time does not exist in that time zone (a daylight-saving gap).",
      UNSUPPORTED_ZONE: "This time zone is not supported.",
      CUSTOM_FORMAT:
        "The custom format contains an unknown letter combination; use only YYYY, MM, DD, HH, mm, ss, SSS.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty: "Nothing converted yet. Enter a timestamp or a date-time, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: timestamp 0). Press “Convert” to run it.",
    nowNote: "Current time snapshot loaded (not live). Press “Convert” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelTimestampSeconds: "Timestamp (seconds)",
    labelTimestampMs: "Timestamp (milliseconds)",
    labelUnitDetected: "Detected unit",
    unitSeconds: "seconds",
    unitMilliseconds: "milliseconds",
    labelIso: "ISO 8601",
    labelRfc: "RFC 2822",
    labelCustom: "Custom format",
    ambiguousNote: "This local time occurs twice; the earlier occurrence is used.",
    successSummary: (result) =>
      `Timestamp ${result.timestampMs} ms (${result.timestampSeconds} s)`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  directionTimestamp: document.getElementById("field-direction-timestamp"),
  directionDatetime: document.getElementById("field-direction-datetime"),
  timestamp: document.getElementById("field-timestamp"),
  unit: document.getElementById("field-unit"),
  date: document.getElementById("field-date"),
  time: document.getElementById("field-time"),
  milliseconds: document.getElementById("field-milliseconds"),
  timezone: document.getElementById("field-timezone"),
  format: document.getElementById("field-format"),
  customPattern: document.getElementById("field-custom-pattern"),
};
const fieldErrors = {
  direction: document.getElementById("error-direction"),
  timestamp: document.getElementById("error-timestamp"),
  unit: document.getElementById("error-unit"),
  date: document.getElementById("error-date"),
  time: document.getElementById("error-time"),
  milliseconds: document.getElementById("error-milliseconds"),
  timezone: document.getElementById("error-timezone"),
  format: document.getElementById("error-format"),
  customPattern: document.getElementById("error-custom-pattern"),
};
const groupTimestamp = document.getElementById("group-timestamp");
const groupDatetime = document.getElementById("group-datetime");
const customPatternWrap = document.getElementById("field-custom-pattern-wrap");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const ambiguousNoteEl = document.getElementById("ambiguous-note");
const displaysRows = document.getElementById("displays-rows");
const runBtn = document.getElementById("run-btn");
const nowBtn = document.getElementById("now-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const nowNoteEl = document.getElementById("now-note");

let submitted = false;
let isNowSnapshot = false;

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

function fieldControl(field) {
  if (field === "direction") return inputs.directionTimestamp;
  return inputs[field];
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = fieldControl(field);
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

function renderResult(result) {
  appendSummaryRows(summaryRows, [
    [t.labelTimestampSeconds, String(result.timestampSeconds)],
    [t.labelTimestampMs, String(result.timestampMs)],
    [
      t.labelUnitDetected,
      result.unitDetected === "seconds" ? t.unitSeconds : t.unitMilliseconds,
    ],
  ]);
  ambiguousNoteEl.hidden = !result.ambiguousLocalTime;
  if (result.ambiguousLocalTime) ambiguousNoteEl.textContent = t.ambiguousNote;
  displaysRows.replaceChildren();
  for (const display of result.displays) {
    const block = document.createElement("section");
    block.className = "display-block";
    const heading = document.createElement("h3");
    heading.textContent = display.zone;
    block.appendChild(heading);
    const rows = [
      [t.labelIso, display.iso8601],
      [t.labelRfc, display.rfc2822],
    ];
    if (display.custom !== null) rows.push([t.labelCustom, display.custom]);
    const list = document.createElement("dl");
    list.className = "summary-list";
    for (const [label, value] of rows) {
      const div = document.createElement("div");
      div.className = "summary-row";
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      div.append(dt, dd);
      list.appendChild(div);
    }
    block.appendChild(list);
    displaysRows.appendChild(block);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  inputs.directionTimestamp.checked = draft.direction === "timestamp-to-datetime";
  inputs.directionDatetime.checked = draft.direction === "datetime-to-timestamp";
  for (const field of ["timestamp", "unit", "date", "time", "milliseconds", "timezone", "format", "customPattern"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  groupTimestamp.hidden = draft.direction !== "timestamp-to-datetime";
  groupDatetime.hidden = draft.direction !== "datetime-to-timestamp";
  customPatternWrap.hidden = draft.format !== "custom";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  nowNoteEl.hidden = !isNowSnapshot;
  if (isNowSnapshot) nowNoteEl.textContent = t.nowNote;
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
          fieldControl(error.field).focus();
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

for (const field of ["timestamp", "date", "time", "milliseconds", "customPattern"]) {
  inputs[field].addEventListener("input", () => {
    isNowSnapshot = false;
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const field of ["unit", "timezone", "format"]) {
  inputs[field].addEventListener("change", () => {
    isNowSnapshot = false;
    controller.edit({ [field]: inputs[field].value });
  });
}

inputs.directionTimestamp.addEventListener("change", () => {
  if (!inputs.directionTimestamp.checked) return;
  isNowSnapshot = false;
  controller.edit({ direction: "timestamp-to-datetime" });
  inputs.timestamp.focus();
});

inputs.directionDatetime.addEventListener("change", () => {
  if (!inputs.directionDatetime.checked) return;
  isNowSnapshot = false;
  controller.edit({ direction: "datetime-to-timestamp" });
  inputs.date.focus();
});

nowBtn.addEventListener("click", () => {
  isNowSnapshot = true;
  controller.edit({
    direction: "timestamp-to-datetime",
    timestamp: String(Date.now()),
    unit: "auto",
  });
});

exampleBtn.addEventListener("click", () => {
  isNowSnapshot = false;
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  isNowSnapshot = false;
  controller.reset();
  inputs.timestamp.focus();
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
