// DOM wiring for the Cooking Measurement Converter. All user-visible
// text is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, generation, and state machine; this file only renders.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/convert.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      amount: "數量",
      fromUnit: "從",
      toUnit: "到",
      ingredient: "食材",
    },
    error: {
      SCHEMA: "資料格式不正確",
      INPUT_LIMIT: "輸入超過長度上限",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "不可留空",
      DECIMAL_FORMAT: "請輸入數字（可含小數點）",
      ENUM: "請選擇有效的選項",
      RANGE: "數值必須大於 0 且不超過 100,000",
      INGREDIENT_REQUIRED: "重量與體積互換需要選擇食材",
      OUTPUT_LIMIT: "報告超過大小上限",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    statusEmpty: "尚未換算。請輸入數量與單位，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    statusSuccess: "換算完成",
    exampleNote: "已載入範例，請按「換算」執行。",
    fractionLabel: "分數表示",
    densityNote: (name, gramsPerCup) => `${name}：${gramsPerCup} 公克／杯`,
  },
  en: {
    fieldLabel: {
      amount: "Amount",
      fromUnit: "From",
      toUnit: "To",
      ingredient: "Ingredient",
    },
    error: {
      SCHEMA: "The data format is invalid",
      INPUT_LIMIT: "Input exceeds the length limit",
      UNICODE: "Input contains an unpaired character",
      EMPTY: "Must not be empty",
      DECIMAL_FORMAT: "Enter a number, with an optional decimal point",
      ENUM: "Choose a valid option",
      RANGE: "Value must be greater than 0 and at most 100,000",
      INGREDIENT_REQUIRED: "Choose an ingredient to convert between weight and volume",
      OUTPUT_LIMIT: "The report exceeds the size limit",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    statusEmpty: "Nothing converted yet. Enter an amount and units, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    statusSuccess: "Conversion complete",
    exampleNote: "Example loaded. Press Convert to run it.",
    fractionLabel: "As a fraction",
    densityNote: (name, gramsPerCup) => `${name}: ${gramsPerCup} g per cup`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("convert-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultValueEl = document.getElementById("result-value");
const fractionRowEl = document.getElementById("result-fraction-row");
const fractionLabelEl = document.getElementById("result-fraction-label");
const fractionEl = document.getElementById("result-fraction");
const densityEl = document.getElementById("result-density");
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

function setFieldError(field, message) {
  const input = inputs[field];
  const errorEl = fieldErrors[field];
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function ingredientDisplayName(id) {
  for (const option of inputs.ingredient.options) {
    if (option.value === id) return option.textContent;
  }
  return id;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
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
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${lang === "en" ? ": " : "："}${message}`;
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
    statusEl.textContent = t.statusSuccess;
    resultValueEl.textContent = `${result.value} ${result.unit}`;
    if (result.fractionText !== null) {
      fractionLabelEl.textContent = t.fractionLabel;
      fractionEl.textContent = result.fractionText;
      fractionRowEl.hidden = false;
    } else {
      fractionRowEl.hidden = true;
    }
    if (result.ingredient !== null && result.gramsPerCup !== null) {
      densityEl.textContent = t.densityNote(
        ingredientDisplayName(result.ingredient),
        result.gramsPerCup,
      );
      densityEl.hidden = false;
    } else {
      densityEl.hidden = true;
    }
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

inputs.amount.addEventListener("input", () => {
  controller.edit({ amount: inputs.amount.value });
});
inputs.fromUnit.addEventListener("change", () => {
  controller.edit({ fromUnit: inputs.fromUnit.value });
});
inputs.toUnit.addEventListener("change", () => {
  controller.edit({ toUnit: inputs.toUnit.value });
});
inputs.ingredient.addEventListener("change", () => {
  controller.edit({ ingredient: inputs.ingredient.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.amount.focus();
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
