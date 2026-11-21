// DOM wiring for the Calories Burned Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation is synchronous (SPEC §4.3): the controller owns the draft,
// generation, and state machine, and the default scheduler delivers each
// cycle's outcome at once. This file only renders controller state.

import { createController } from "./controller.mjs";
import { DEFAULTS } from "./core/calculate.mjs";
import { REPORT_FILENAME, serializeReport } from "./core/report.mjs";
import { ACTIVITY_BY_ID, ACTIVITY_TABLE, formatMet } from "./core/table.mjs";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      weight: "體重（公斤）",
      durationMinutes: "運動時間（分鐘）",
      activities: "活動（最多選 3 項比較）",
    },
    error: {
      SCHEMA: "這份輸入的結構不正確，請重新輸入。",
      INPUT_LIMIT_WEIGHT: "體重最多 8 個字元。",
      INPUT_LIMIT_DURATION: "運動時間最多 8 個字元。",
      INPUT_LIMIT_ACTIVITY: "每個活動代碼最多 32 個字元。",
      UNICODE: "輸入含有不完整的 Unicode 字元。",
      EMPTY_WEIGHT: "請輸入體重。",
      EMPTY_DURATION: "請輸入運動時間。",
      EMPTY_ACTIVITIES: "請至少選擇一個活動。",
      EMPTY_ACTIVITY: "活動代碼不可空白。",
      DECIMAL_FORMAT_WEIGHT: "體重需為數字，最多兩位小數（例如 62.5）。",
      DECIMAL_FORMAT_DURATION: "時間需為數字，最多一位小數（例如 30 或 45.5）。",
      RANGE_WEIGHT: "體重需介於 20–500 kg。",
      RANGE_DURATION: "時間需介於 1–1440 分鐘。",
      ROW_LIMIT: "最多比較 3 個活動。",
      ENUM: "未知的活動代碼。",
      DUPLICATE: "同一活動不可重複選取。",
      OUTPUT_LIMIT: "報告超過 2 MiB 上限，無法下載。",
      INTERNAL: "計算失敗，請重試。",
    },
    statusEmpty: "尚未計算。請輸入體重、運動時間並選擇活動。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行。",
    staleNote: "以下為上次接受的結果，輸入已變更，尚未重新計算。",
    summary: (input, result) =>
      `體重 ${input.weight} kg、運動 ${input.durationMinutes} 分鐘，合計 ${result.totalKcal} kcal（總消耗，含休息代謝）。`,
    disclaimer:
      "本工具的熱量為估算值：依 2024 年成人身體活動彙編（2024 Adult Compendium of Physical Activities）的 MET 值，以「MET × 體重（kg）× 時間（小時）」計算，為包含休息代謝的總消耗。實際消耗因個人代謝、動作效率與強度而異，本結果不作為醫療、減重或飲食處方。",
    rowSuffix: (row) => `（第 ${row} 項）`,
  },
  en: {
    fieldLabel: {
      weight: "Weight (kg)",
      durationMinutes: "Duration (minutes)",
      activities: "Activities (choose up to 3 to compare)",
    },
    error: {
      SCHEMA: "This input is not shaped correctly. Please re-enter it.",
      INPUT_LIMIT_WEIGHT: "Weight is limited to 8 characters.",
      INPUT_LIMIT_DURATION: "Duration is limited to 8 characters.",
      INPUT_LIMIT_ACTIVITY: "Each activity code is limited to 32 characters.",
      UNICODE: "The input contains an incomplete Unicode character.",
      EMPTY_WEIGHT: "Enter your weight.",
      EMPTY_DURATION: "Enter the duration.",
      EMPTY_ACTIVITIES: "Choose at least one activity.",
      EMPTY_ACTIVITY: "An activity code must not be blank.",
      DECIMAL_FORMAT_WEIGHT: "Weight must be a number with at most two decimal places (for example 62.5).",
      DECIMAL_FORMAT_DURATION: "Duration must be a number with at most one decimal place (for example 30 or 45.5).",
      RANGE_WEIGHT: "Weight must be between 20 and 500 kg.",
      RANGE_DURATION: "Duration must be between 1 and 1440 minutes.",
      ROW_LIMIT: "At most 3 activities can be compared.",
      ENUM: "Unknown activity code.",
      DUPLICATE: "The same activity cannot be selected twice.",
      OUTPUT_LIMIT: "The report exceeds the 2 MiB limit and cannot be downloaded.",
      INTERNAL: "Something went wrong. Try again.",
    },
    statusEmpty: "No estimate yet. Enter your weight, duration and activities.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    staleNote: "This is the last accepted result; the input has changed and has not been recalculated.",
    summary: (input, result) =>
      `Weight ${input.weight} kg, duration ${input.durationMinutes} minutes, total ${result.totalKcal} kcal (gross, including resting metabolism).`,
    disclaimer:
      "Calorie figures are estimates: they use MET values from the 2024 Adult Compendium of Physical Activities in the formula MET × weight (kg) × duration (hours) and are gross totals that include resting metabolism. Actual expenditure varies with individual metabolism, movement efficiency and intensity. This result is not medical, weight-loss or dietary advice.",
    rowSuffix: (row) => ` (item ${row})`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const activityName = (activity) => (lang === "en" ? activity.nameEn : activity.nameZh);

const form = document.getElementById("calories-form");
const weightInput = document.getElementById("field-weight");
const durationInput = document.getElementById("field-durationMinutes");
const activityList = document.getElementById("activity-list");
const activitiesGroup = document.getElementById("activities-group");
const errorWeight = document.getElementById("error-weight");
const errorDuration = document.getElementById("error-durationMinutes");
const errorActivities = document.getElementById("error-activities");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const staleNoteEl = document.getElementById("stale-note");
const resultRows = document.getElementById("result-rows");
const totalKcalEl = document.getElementById("total-kcal");
const disclaimerEl = document.getElementById("disclaimer");
const metRows = document.getElementById("met-rows");
const runBtn = document.getElementById("run-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;

// The activity selector and the MET reference table are both rendered
// from the single pinned table module (SPEC §4.1), so the selector, the
// core and the displayed table can never disagree.
function buildActivityControls() {
  for (const activity of ACTIVITY_TABLE) {
    const item = document.createElement("div");
    item.className = "choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `activity-${activity.id}`;
    checkbox.value = activity.id;
    checkbox.checked = DEFAULTS.activities.includes(activity.id);
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = `${activityName(activity)} — ${formatMet(activity.metTenths)} MET`;
    item.appendChild(checkbox);
    item.appendChild(label);
    activityList.appendChild(item);
    checkbox.addEventListener("change", () => {
      const state = controller.getState();
      const selected = [...state.draft.activities];
      if (checkbox.checked) {
        if (!selected.includes(activity.id)) selected.push(activity.id);
      } else {
        const at = selected.indexOf(activity.id);
        if (at !== -1) selected.splice(at, 1);
      }
      controller.edit({ activities: selected });
    });
  }
}

function buildMetTable() {
  for (const activity of ACTIVITY_TABLE) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("th");
    nameCell.setAttribute("scope", "row");
    nameCell.textContent = activityName(activity);
    tr.appendChild(nameCell);
    const metCell = document.createElement("td");
    metCell.textContent = formatMet(activity.metTenths);
    tr.appendChild(metCell);
    const codeCell = document.createElement("td");
    codeCell.textContent = activity.code;
    tr.appendChild(codeCell);
    metRows.appendChild(tr);
  }
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

function errorMessage(error) {
  if (error === null) return null;
  const { code, field, row } = error;
  let message;
  if (code === "SCHEMA") message = t.error.SCHEMA;
  else if (code === "INPUT_LIMIT" && field === "weight") message = t.error.INPUT_LIMIT_WEIGHT;
  else if (code === "INPUT_LIMIT" && field === "durationMinutes") message = t.error.INPUT_LIMIT_DURATION;
  else if (code === "INPUT_LIMIT") message = t.error.INPUT_LIMIT_ACTIVITY;
  else if (code === "UNICODE") message = t.error.UNICODE;
  else if (code === "EMPTY" && field === "weight") message = t.error.EMPTY_WEIGHT;
  else if (code === "EMPTY" && field === "durationMinutes") message = t.error.EMPTY_DURATION;
  else if (code === "EMPTY" && field === "activities" && row !== null) message = t.error.EMPTY_ACTIVITY;
  else if (code === "EMPTY") message = t.error.EMPTY_ACTIVITIES;
  else if (code === "DECIMAL_FORMAT" && field === "weight") message = t.error.DECIMAL_FORMAT_WEIGHT;
  else if (code === "DECIMAL_FORMAT") message = t.error.DECIMAL_FORMAT_DURATION;
  else if (code === "RANGE" && field === "weight") message = t.error.RANGE_WEIGHT;
  else if (code === "RANGE") message = t.error.RANGE_DURATION;
  else if (code === "ROW_LIMIT") message = t.error.ROW_LIMIT;
  else if (code === "ENUM") message = t.error.ENUM;
  else if (code === "DUPLICATE") message = t.error.DUPLICATE;
  else if (code === "OUTPUT_LIMIT") message = t.error.OUTPUT_LIMIT;
  else message = t.error.INTERNAL;
  if (row !== null) message += t.rowSuffix(row);
  return message;
}

function setFieldError(input, errorEl, message) {
  if (message === null) {
    if (input !== null) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (input !== null) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", errorEl.id);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  setFieldError(weightInput, errorWeight, null);
  setFieldError(durationInput, errorDuration, null);
  setFieldError(null, errorActivities, null);
  activitiesGroup.removeAttribute("aria-invalid");
}

function renderResult(lastAccepted, stale) {
  resultRows.replaceChildren();
  for (const row of lastAccepted.result.rows) {
    const activity = ACTIVITY_BY_ID.get(row.activityId);
    const tr = document.createElement("tr");
    const nameCell = document.createElement("th");
    nameCell.setAttribute("scope", "row");
    nameCell.textContent = activity ? activityName(activity) : row.activityId;
    tr.appendChild(nameCell);
    const metCell = document.createElement("td");
    metCell.textContent = row.met;
    tr.appendChild(metCell);
    const kcalCell = document.createElement("td");
    kcalCell.textContent = String(row.kcal);
    tr.appendChild(kcalCell);
    resultRows.appendChild(tr);
  }
  totalKcalEl.textContent = String(lastAccepted.result.totalKcal);
  summaryEl.textContent = t.summary(lastAccepted.input, lastAccepted.result);
  disclaimerEl.textContent = t.disclaimer;
  staleNoteEl.hidden = !stale;
  if (stale) staleNoteEl.textContent = t.staleNote;
  resultsEl.hidden = false;
}

function render(publicState) {
  const { state, draft, lastAccepted, error } = publicState;
  if (weightInput.value !== draft.weight) weightInput.value = draft.weight;
  if (durationInput.value !== draft.durationMinutes) durationInput.value = draft.durationMinutes;
  for (const activity of ACTIVITY_TABLE) {
    const checkbox = document.getElementById(`activity-${activity.id}`);
    if (checkbox !== null) checkbox.checked = draft.activities.includes(activity.id);
  }
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
    if (lastAccepted !== null) renderResult(lastAccepted, true);
    else resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    if (lastAccepted !== null) renderResult(lastAccepted, true);
    else resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    if (lastAccepted !== null) renderResult(lastAccepted, true);
    else resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field === "weight") {
        setFieldError(weightInput, errorWeight, message);
        statusEl.textContent = `${t.fieldLabel.weight}：${message}`;
        if (submitted) {
          submitted = false;
          weightInput.focus();
        }
      } else if (error.field === "durationMinutes") {
        setFieldError(durationInput, errorDuration, message);
        statusEl.textContent = `${t.fieldLabel.durationMinutes}：${message}`;
        if (submitted) {
          submitted = false;
          durationInput.focus();
        }
      } else if (error.field === "activities") {
        setFieldError(null, errorActivities, message);
        activitiesGroup.setAttribute("aria-invalid", "true");
        statusEl.textContent = `${t.fieldLabel.activities}：${message}`;
        if (submitted) {
          submitted = false;
          const first = document.getElementById(`activity-${ACTIVITY_TABLE[0].id}`);
          if (first !== null) first.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    if (lastAccepted !== null) renderResult(lastAccepted, true);
    else resultsEl.hidden = true;
  } else if (state === "success" && lastAccepted !== null) {
    renderResult(lastAccepted, false);
    statusEl.textContent = summaryEl.textContent;
    clearFieldErrors();
  }
}

const controller = createController({ onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

weightInput.addEventListener("input", () => {
  controller.edit({ weight: weightInput.value });
});

durationInput.addEventListener("input", () => {
  controller.edit({ durationMinutes: durationInput.value });
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  weightInput.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.lastAccepted === null) return;
  const serialized = serializeReport(current.lastAccepted.input, current.lastAccepted.result);
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

buildActivityControls();
buildMetTable();
render(controller.getState());
