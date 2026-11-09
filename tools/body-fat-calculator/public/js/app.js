// DOM wiring for the Body Fat Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.
// Switching sex to male clears the hip draft and disables the hip field,
// as the SPEC's userFlow pins.

import { createController } from "./controller.mjs";
import { REPORT_FILENAME, serializeReport } from "./core/bodyfat.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const NUMERIC_FIELDS = ["heightCm", "neckCm", "waistCm", "hipCm", "weightKg"];
const ALL_FIELDS = ["sex", ...NUMERIC_FIELDS];
const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      sex: "性別",
      heightCm: "身高（公分）",
      neckCm: "頸圍（公分）",
      waistCm: "腰圍（公分）",
      hipCm: "臀圍（公分）",
      weightKg: "體重（公斤）",
    },
    error: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長。",
      UNICODE: "輸入含有不完整的字元。",
      EMPTY: "這個欄位必填。",
      DECIMAL_FORMAT: "請輸入數字，最多一位小數。",
      RANGE: "數值超出允許範圍。",
      ENUM: "請選擇性別。",
      NOT_APPLICABLE: "男性不需填臀圍。",
      LOG_DOMAIN: "圍度組合無法計算：腰圍必須大於頸圍（女性為腰圍加臀圍大於頸圍）。",
      IMPLAUSIBLE_RESULT: "依這組圍度算出的體脂率超出合理範圍，請重新量測後再試。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    category: {
      "below-essential": "低於必需脂肪",
      essential: "必需脂肪",
      athletes: "運動員",
      fitness: "健身",
      average: "一般",
      obese: "肥胖",
    },
    statusEmpty: "尚未計算。請輸入量測值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行。",
    exampleNote: "已載入範例，請按「計算體脂率」執行。",
    summary: (pct, category) => `體脂率 ${pct}%，類別：${category}。`,
    colon: "：",
  },
  en: {
    fieldLabel: {
      sex: "Sex",
      heightCm: "Height (cm)",
      neckCm: "Neck (cm)",
      waistCm: "Waist (cm)",
      hipCm: "Hip (cm)",
      weightKg: "Weight (kg)",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place.",
      RANGE: "The value is outside the allowed range.",
      ENUM: "Select a sex.",
      NOT_APPLICABLE: "Hip is not used for men.",
      LOG_DOMAIN:
        "These circumferences cannot be computed: the waist must exceed the neck (for women, waist plus hip must exceed the neck).",
      IMPLAUSIBLE_RESULT:
        "The body fat percentage from these measurements is outside the plausible range. Please re-measure and try again.",
      INTERNAL: "The calculation failed. Please try again.",
      WORKER_ERROR: "The calculation failed. Please try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    category: {
      "below-essential": "Below essential fat",
      essential: "Essential fat",
      athletes: "Athletes",
      fitness: "Fitness",
      average: "Average",
      obese: "Obese",
    },
    statusEmpty: "Nothing calculated yet. Enter your measurements, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate body fat” to compute it.",
    summary: (pct, category) => `Body fat ${pct}%, category: ${category}.`,
    colon: ": ",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("bodyfat-form");
const inputs = {};
for (const field of NUMERIC_FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const sexMale = document.getElementById("field-sex-male");
const sexFemale = document.getElementById("field-sex-female");
const fieldErrors = {};
for (const field of ALL_FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const pctEl = document.getElementById("result-pct");
const categoryEl = document.getElementById("result-category");
const fatEl = document.getElementById("result-fat");
const leanEl = document.getElementById("result-lean");
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

function focusTarget(field) {
  if (field === "sex") return sexMale;
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const targets = field === "sex" ? [sexMale, sexFemale] : [inputs[field]];
  if (message === null) {
    for (const target of targets) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  for (const target of targets) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of ALL_FIELDS) setFieldError(field, null);
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of NUMERIC_FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  sexMale.checked = draft.sex === "male";
  sexFemale.checked = draft.sex === "female";
  inputs.hipCm.disabled = draft.sex === "male";
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
      if (error.field !== null && ALL_FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.colon}${message}`;
        if (submitted) {
          submitted = false;
          focusTarget(error.field)?.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const pctText = result.bodyFatPct.toFixed(1);
    pctEl.textContent = `${pctText}%`;
    categoryEl.textContent = t.category[result.category] ?? result.category;
    fatEl.textContent = `${result.fatMassKg.toFixed(1)} kg`;
    leanEl.textContent = `${result.leanMassKg.toFixed(1)} kg`;
    statusEl.textContent = t.summary(pctText, categoryEl.textContent);
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

for (const field of NUMERIC_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

sexMale.addEventListener("change", () => {
  if (sexMale.checked) controller.edit({ sex: "male", hipCm: "" });
});

sexFemale.addEventListener("change", () => {
  if (sexFemale.checked) controller.edit({ sex: "female" });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  sexMale.focus();
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

render(controller.getState());
