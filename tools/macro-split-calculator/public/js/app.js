// DOM wiring for the Macro Split Calculator. All user-visible text is set
// through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it. The
// fixed report (macro-split-report.json) is offered only in the success
// state, and its Blob URL is revoked as soon as the result is invalidated
// (and at most 30 seconds after a download starts).

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/macro.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      calories: "每日熱量目標",
      preset: "飲食比例",
      proteinPct: "蛋白質百分比",
      carbsPct: "碳水化合物百分比",
      fatPct: "脂肪百分比",
      meals: "餐數",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      EMPTY: "請輸入數值",
      ENUM: "請選擇飲食比例",
      INTEGER_FORMAT: "請輸入整數",
      RATIO_SUM: "三個百分比合計須恰為 100",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorRange: {
      calories: "熱量目標須在 800–10,000 kcal 之間",
      proteinPct: "百分比須在 0–100 之間",
      carbsPct: "百分比須在 0–100 之間",
      fatPct: "百分比須在 0–100 之間",
      meals: "餐數須在 1–6 之間",
    },
    statusEmpty: "尚未計算。輸入數值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算三大營養素克數」執行。",
    macroName: { protein: "蛋白質", carbs: "碳水化合物", fat: "脂肪" },
    summary: (implied, delta) =>
      delta === 0
        ? `回算總熱量 ${implied} kcal，與目標相同。`
        : `回算總熱量 ${implied} kcal，與目標差 ${delta > 0 ? "+" : ""}${delta} kcal。`,
    adjustedNote: (name) => `${name}的克數已按固定規則調整（表中以＊標示），以吸收取整的捨入差。`,
    mealLabel: (index) => `第 ${index} 餐`,
  },
  en: {
    fieldLabel: {
      calories: "Daily calorie target",
      preset: "Diet preset",
      proteinPct: "Protein percentage",
      carbsPct: "Carbohydrate percentage",
      fatPct: "Fat percentage",
      meals: "Meals",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      EMPTY: "Enter a value.",
      ENUM: "Choose a diet preset.",
      INTEGER_FORMAT: "Enter a whole number.",
      RATIO_SUM: "The three percentages must add up to exactly 100.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorRange: {
      calories: "Calorie target must be between 800 and 10,000 kcal.",
      proteinPct: "Percentage must be between 0 and 100.",
      carbsPct: "Percentage must be between 0 and 100.",
      fatPct: "Percentage must be between 0 and 100.",
      meals: "Meals must be between 1 and 6.",
    },
    statusEmpty: "Nothing calculated yet. Enter values or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate macro grams” to run it.",
    macroName: { protein: "Protein", carbs: "Carbohydrates", fat: "Fat" },
    summary: (implied, delta) =>
      delta === 0
        ? `Implied total ${implied} kcal — exactly the target.`
        : `Implied total ${implied} kcal — ${delta > 0 ? "+" : ""}${delta} kcal vs the target.`,
    adjustedNote: (name) =>
      `${name} grams were adjusted by the fixed drift rule (marked * in the table) to absorb the rounding difference.`,
    mealLabel: (index) => `Meal ${index}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("macro-form");
const presetRadios = {
  balanced: document.getElementById("field-preset-balanced"),
  "high-protein": document.getElementById("field-preset-high-protein"),
  "low-carb": document.getElementById("field-preset-low-carb"),
  keto: document.getElementById("field-preset-keto"),
  custom: document.getElementById("field-preset-custom"),
};
const inputs = {
  calories: document.getElementById("field-calories"),
  proteinPct: document.getElementById("field-proteinPct"),
  carbsPct: document.getElementById("field-carbsPct"),
  fatPct: document.getElementById("field-fatPct"),
  meals: document.getElementById("field-meals"),
};
const fieldErrors = {
  calories: document.getElementById("error-calories"),
  preset: document.getElementById("error-preset"),
  proteinPct: document.getElementById("error-proteinPct"),
  carbsPct: document.getElementById("error-carbsPct"),
  fatPct: document.getElementById("error-fatPct"),
  meals: document.getElementById("error-meals"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const adjustedNoteEl = document.getElementById("adjusted-note");
const macroTableBody = document.getElementById("macro-rows");
const mealsBlock = document.getElementById("meals-block");
const mealTableBody = document.getElementById("meal-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let reportUrl = null;
let reportTimer = null;

function revokeReportUrl() {
  if (reportTimer !== null) {
    clearTimeout(reportTimer);
    reportTimer = null;
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

function focusTargetFor(field) {
  if (field === "preset") return presetRadios.balanced;
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
  if (error.code === "RANGE" && t.errorRange[error.field]) return t.errorRange[error.field];
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderMacroRows(result) {
  macroTableBody.replaceChildren();
  for (const macro of result.macros) {
    const tr = document.createElement("tr");
    const name =
      macro.id === result.adjustedMacro ? `${t.macroName[macro.id]}＊` : t.macroName[macro.id];
    const cells = [name, `${macro.pct}%`, `${macro.targetKcal}`, `${macro.grams}`, `${macro.kcal}`];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    macroTableBody.appendChild(tr);
  }
}

function renderMealRows(result) {
  mealTableBody.replaceChildren();
  if (result.meals === null) {
    mealsBlock.hidden = true;
    return;
  }
  for (const item of result.meals.items) {
    const tr = document.createElement("tr");
    const cells = [
      t.mealLabel(item.index),
      `${item.protein}`,
      `${item.carbs}`,
      `${item.fat}`,
      `${item.kcal}`,
    ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    mealTableBody.appendChild(tr);
  }
  mealsBlock.hidden = false;
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of ["calories", "proteinPct", "carbsPct", "fatPct", "meals"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const [preset, radio] of Object.entries(presetRadios)) {
    radio.checked = draft.preset === preset;
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.disabled = !reportAvailable;
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
    const summary = t.summary(result.impliedKcal, result.deltaKcal);
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    if (result.adjustedMacro !== null) {
      adjustedNoteEl.textContent = t.adjustedNote(t.macroName[result.adjustedMacro]);
      adjustedNoteEl.hidden = false;
    } else {
      adjustedNoteEl.textContent = "";
      adjustedNoteEl.hidden = true;
    }
    renderMacroRows(result);
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

for (const radio of Object.values(presetRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ preset: radio.value });
  });
}

for (const field of ["calories", "proteinPct", "carbsPct", "fatPct", "meals"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  presetRadios.balanced.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const publicState = controller.getState();
  if (!publicState.reportAvailable || publicState.result === null) return;
  let text;
  try {
    text = serializeReport(publicState.result);
  } catch {
    statusEl.textContent = t.error.INTERNAL;
    return;
  }
  revokeReportUrl();
  const blob = new Blob([text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  reportTimer = setTimeout(revokeReportUrl, 30000);
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

render(controller.getState());
