// DOM wiring for the Markup & Margin Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. No
// draft is persisted: switching language or leaving the page discards
// it, as the SPEC requires.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatMoney,
  formatPercent,
  serializeReport,
} from "./core/markup-margin.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請用正確的小數格式",
      RANGE: "超出允許範圍",
      NO_SOLUTION: "目標毛利率達到或超過 100% 時，沒有有限售價能達成",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    resultHeading: {
      report: "加價率與毛利率",
      "solve-markup": "建議售價與換算",
      "solve-margin": "建議售價與換算",
    },
    summaryPrice: (price) => `建議售價 ${price}`,
    summaryRates: (markup, margin) => `加價率 ${markup} · 毛利率 ${margin}`,
    summaryMarkupOnly: (markup) => `加價率 ${markup}`,
    derivedNote: "另一率由四捨五入後售價回算",
    belowCostNote: "售價低於成本，兩率為負值",
    marginUndefined: "毛利率無法定義（售價為零）",
    exampleNote: "已載入範例，請按「計算」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Use the correct decimal format.",
      RANGE: "Out of range.",
      NO_SOLUTION: "No finite price achieves a margin of 100% or more.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    resultHeading: {
      report: "Markup and margin",
      "solve-markup": "Selling price and conversion",
      "solve-margin": "Selling price and conversion",
    },
    summaryPrice: (price) => `Suggested price ${price}`,
    summaryRates: (markup, margin) => `Markup ${markup} · Margin ${margin}`,
    summaryMarkupOnly: (markup) => `Markup ${markup}`,
    derivedNote: "Derived from the rounded price",
    belowCostNote: "The price is below cost; both rates are negative.",
    marginUndefined: "Margin is undefined (the price is zero).",
    exampleNote: "Example loaded. Run “Calculate” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("markup-margin-form");
const modeRadios = {};
for (const mode of ["report", "solve-markup", "solve-margin"]) {
  modeRadios[mode] = document.getElementById(`field-mode-${mode}`);
}
const inputs = {};
for (const field of ["cost", "price", "markupPercent", "marginPercent"]) {
  inputs[field] = document.getElementById(`field-${field}`);
}
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultsHeadingEl = document.getElementById("results-heading");
const summaryEl = document.getElementById("result-summary");
const priceEl = document.getElementById("result-price");
const profitEl = document.getElementById("result-profit");
const markupEl = document.getElementById("result-markup");
const marginEl = document.getElementById("result-margin");
const noteEl = document.getElementById("result-note");
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
  const errorEl = fieldErrors[field];
  if (message === null) {
    errorEl.textContent = "";
    if (field === "mode") {
      for (const radio of Object.values(modeRadios)) {
        radio.removeAttribute("aria-invalid");
        radio.removeAttribute("aria-errormessage");
      }
    } else {
      inputs[field].removeAttribute("aria-invalid");
      inputs[field].removeAttribute("aria-errormessage");
    }
    return;
  }
  if (field === "mode") {
    for (const radio of Object.values(modeRadios)) {
      radio.setAttribute("aria-invalid", "true");
      radio.setAttribute("aria-errormessage", "error-mode");
    }
  } else {
    inputs[field].setAttribute("aria-invalid", "true");
    inputs[field].setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function focusField(field) {
  if (field === "mode") {
    modeRadios.report.focus();
  } else {
    inputs[field].focus();
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const mode of Object.keys(modeRadios)) {
    modeRadios[mode].checked = draft.mode === mode;
  }
  for (const field of Object.keys(inputs)) {
    const value = draft[field];
    inputs[field].value = value === null ? "" : value;
  }
  inputs.price.disabled = draft.mode !== "report";
  inputs.markupPercent.disabled = draft.mode !== "solve-markup";
  inputs.marginPercent.disabled = draft.mode !== "solve-margin";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    resultsHeadingEl.textContent = t.resultHeading[result.mode];
    priceEl.textContent = formatMoney(result.priceCents);
    profitEl.textContent = formatMoney(result.profitCents);
    markupEl.textContent = formatPercent(result.markupHundredths);
    if (result.mode === "report") {
      marginEl.textContent =
        result.marginHundredths === null ? t.marginUndefined : formatPercent(result.marginHundredths);
      summaryEl.textContent =
        result.marginHundredths === null
          ? t.summaryMarkupOnly(formatPercent(result.markupHundredths))
          : t.summaryRates(
              formatPercent(result.markupHundredths),
              formatPercent(result.marginHundredths),
            );
      noteEl.textContent = result.belowCost ? t.belowCostNote : "";
    } else {
      marginEl.textContent = formatPercent(result.marginHundredths);
      summaryEl.textContent = t.summaryPrice(formatMoney(result.priceCents));
      noteEl.textContent = t.derivedNote;
    }
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          focusField(error.field);
        }
      }
      // The status region keeps the pinned status string; the detail
      // lives in the field's own error slot (role="alert").
    }
  } else {
    clearFieldErrors();
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const field of Object.keys(inputs)) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const mode of Object.keys(modeRadios)) {
  modeRadios[mode].addEventListener("change", () => {
    if (!modeRadios[mode].checked) return;
    const current = controller.getState().draft;
    controller.edit({
      mode,
      price: mode === "report" ? (current.price ?? "") : null,
      markupPercent: mode === "solve-markup" ? (current.markupPercent ?? "") : null,
      marginPercent: mode === "solve-margin" ? (current.marginPercent ?? "") : null,
    });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.cost.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
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
