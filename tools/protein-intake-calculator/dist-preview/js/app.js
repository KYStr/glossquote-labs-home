// DOM wiring for the Protein Intake Calculator. All user-visible text is
// set through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it. The
// fixed report download (protein-intake-report.json) is created only on
// an explicit click while the controller reports it available, and its
// object URL is revoked after 30 seconds or as soon as the result is
// invalidated, whichever comes first.

import { createController } from "./controller.mjs";
import { FIELDS, buildReport } from "./core/protein.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      weight: "體重（公斤）",
      goal: "目標／活動程度",
      customFactor: "自訂係數（g/kg）",
      meals: "每日餐數",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "請輸入數值",
      DECIMAL_FORMAT: "請輸入最多一位小數的數字",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    errorEnum: {
      goal: "請選擇目標／活動程度",
      meals: "請選擇每日餐數",
    },
    errorRange: {
      weight: "體重須在 20.0–300.0 公斤之間",
      customFactor: "自訂係數須在 0.1–4.0 g/kg 之間",
    },
    statusEmpty: "尚未計算。輸入體重與目標，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算每日蛋白質」執行。",
    downloaded: "報告已下載。",
    summary: (factor, daily, low, high, meals) =>
      `每日目標 ${daily} 克（係數 ${factor} g/kg，區間 ${low}–${high} 克，共 ${meals} 餐）`,
    mealLabel: (index) => `第 ${index + 1} 餐`,
    grams: (value) => `${value} 克`,
  },
  en: {
    fieldLabel: {
      weight: "Body weight (kg)",
      goal: "Goal / activity level",
      customFactor: "Custom factor (g/kg)",
      meals: "Meals per day",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains invalid characters.",
      EMPTY: "Enter a value.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    errorEnum: {
      goal: "Choose a goal / activity level.",
      meals: "Choose the number of meals per day.",
    },
    errorRange: {
      weight: "Body weight must be between 20.0 and 300.0 kg.",
      customFactor: "Custom factor must be between 0.1 and 4.0 g/kg.",
    },
    statusEmpty: "Nothing calculated yet. Enter your weight and goal, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate daily protein” to run it.",
    downloaded: "Report downloaded.",
    summary: (factor, daily, low, high, meals) =>
      `Daily target ${daily} g (factor ${factor} g/kg, range ${low}–${high} g, ${meals} meals)`,
    mealLabel: (index) => `Meal ${index + 1}`,
    grams: (value) => `${value} g`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("protein-form");
const inputs = {
  weight: document.getElementById("field-weight"),
  goal: document.getElementById("field-goal"),
  customFactor: document.getElementById("field-customFactor"),
};
const mealsRadios = {
  3: document.getElementById("field-meals-3"),
  4: document.getElementById("field-meals-4"),
};
const fieldErrors = {
  weight: document.getElementById("error-weight"),
  goal: document.getElementById("error-goal"),
  customFactor: document.getElementById("error-customFactor"),
  meals: document.getElementById("error-meals"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("meal-rows");
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

function focusTargetFor(field) {
  if (field === "meals") return mealsRadios[3];
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = focusTargetFor(field);
  if (message === null) {
    if (target !== null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (target !== null) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE") return t.errorRange[error.field] ?? t.error.INTERNAL;
  if (error.code === "ENUM") return t.errorEnum[error.field] ?? t.error.INTERNAL;
  if (error.code === "EMPTY" && error.field === "goal") return t.errorEnum.goal;
  if (error.code === "EMPTY" && error.field === "meals") return t.errorEnum.meals;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderMealRows(result) {
  tableBody.replaceChildren();
  result.perMealGrams.forEach((grams, index) => {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.textContent = t.mealLabel(index);
    const gramsCell = document.createElement("td");
    gramsCell.textContent = t.grams(grams);
    tr.appendChild(labelCell);
    tr.appendChild(gramsCell);
    tableBody.appendChild(tr);
  });
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  if (inputs.weight.value !== draft.weight) inputs.weight.value = draft.weight;
  if (inputs.goal.value !== draft.goal) inputs.goal.value = draft.goal;
  if (inputs.customFactor.value !== draft.customFactor) {
    inputs.customFactor.value = draft.customFactor;
  }
  // The custom factor field is enabled only for the custom goal; any
  // value already typed is kept when switching goals.
  inputs.customFactor.disabled = draft.goal !== "custom";
  mealsRadios[3].checked = draft.meals === "3";
  mealsRadios[4].checked = draft.meals === "4";
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
          const target = focusTargetFor(error.field);
          if (target !== null) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const summary = t.summary(
      result.factor,
      result.dailyGrams,
      result.lowGrams,
      result.highGrams,
      result.meals,
    );
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    renderMealRows(result);
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

inputs.weight.addEventListener("input", () => {
  controller.edit({ weight: inputs.weight.value });
});

inputs.goal.addEventListener("change", () => {
  controller.edit({ goal: inputs.goal.value });
});

inputs.customFactor.addEventListener("input", () => {
  controller.edit({ customFactor: inputs.customFactor.value });
});

for (const radio of [mealsRadios[3], mealsRadios[4]]) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ meals: radio.value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.weight.focus();
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
