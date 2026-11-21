// DOM wiring for the Ideal Weight Calculator. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { REPORT_FILENAME, formatOneDecimal, serializeReport } from "./core/ideal-weight.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      heightCm: "身高（公分）",
      sex: "性別（公式用）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請輸入數字，最多一位小數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未計算。請輸入身高與性別，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算理想體重」執行。",
    sexMale: "男性",
    sexFemale: "女性",
    rowLabel: {
      range: "健康體重範圍（WHO)",
      rangeUnit: "BMI 18.5–24.9",
      bmi22: "BMI 22 參考體重",
      devine: "Devine（1974）",
      robinson: "Robinson（1983）",
      miller: "Miller（1983）",
      hamwi: "Hamwi（1964）",
      height: "身高換算",
    },
    summary: (result) =>
      `身高 ${formatOneDecimal(result.heightCm)} 公分（${formatOneDecimal(result.heightInches)} 英吋）的 WHO 健康體重範圍是 ${formatOneDecimal(result.healthyRangeKg.lowKg)}–${formatOneDecimal(result.healthyRangeKg.highKg)} 公斤；BMI 22 參考體重 ${formatOneDecimal(result.bmi22Kg)} 公斤。`,
  },
  en: {
    fieldLabel: {
      heightCm: "Height (cm)",
      sex: "Sex (used by the formulas)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an invalid character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter height and sex, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate ideal weight” to compute it.",
    sexMale: "Male",
    sexFemale: "Female",
    rowLabel: {
      range: "Healthy weight range (WHO)",
      rangeUnit: "BMI 18.5–24.9",
      bmi22: "Reference weight at BMI 22",
      devine: "Devine (1974)",
      robinson: "Robinson (1983)",
      miller: "Miller (1983)",
      hamwi: "Hamwi (1964)",
      height: "Height",
    },
    summary: (result) =>
      `At ${formatOneDecimal(result.heightCm)} cm (${formatOneDecimal(result.heightInches)} in), the WHO healthy weight range is ${formatOneDecimal(result.healthyRangeKg.lowKg)}–${formatOneDecimal(result.healthyRangeKg.highKg)} kg; the BMI-22 reference weight is ${formatOneDecimal(result.bmi22Kg)} kg.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("ideal-weight-form");
const heightInput = document.getElementById("field-heightCm");
const sexMaleInput = document.getElementById("field-sex-male");
const sexFemaleInput = document.getElementById("field-sex-female");
const errorHeight = document.getElementById("error-heightCm");
const errorSex = document.getElementById("error-sex");
const errorGeneral = document.getElementById("error-general");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("result-rows");
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

function setFieldError(input, errorEl, message) {
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-errormessage", errorEl.id);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  setFieldError(heightInput, errorHeight, null);
  setFieldError(sexFemaleInput, errorSex, null);
  sexMaleInput.removeAttribute("aria-invalid");
  sexMaleInput.removeAttribute("aria-errormessage");
  errorGeneral.textContent = "";
}

function renderResults(result) {
  tableBody.replaceChildren();
  const rows = [
    [t.rowLabel.range, `${formatOneDecimal(result.healthyRangeKg.lowKg)}–${formatOneDecimal(result.healthyRangeKg.highKg)} kg`, t.rowLabel.rangeUnit],
    [t.rowLabel.bmi22, `${formatOneDecimal(result.bmi22Kg)} kg`, ""],
    [t.rowLabel.devine, `${formatOneDecimal(result.formulasKg.devine)} kg`, ""],
    [t.rowLabel.robinson, `${formatOneDecimal(result.formulasKg.robinson)} kg`, ""],
    [t.rowLabel.miller, `${formatOneDecimal(result.formulasKg.miller)} kg`, ""],
    [t.rowLabel.hamwi, `${formatOneDecimal(result.formulasKg.hamwi)} kg`, ""],
    [t.rowLabel.height, `${formatOneDecimal(result.heightInches)} in`, ""],
  ];
  for (const [label, value, note] of rows) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = label;
    tr.appendChild(labelCell);
    const valueCell = document.createElement("td");
    valueCell.textContent = value;
    tr.appendChild(valueCell);
    const noteCell = document.createElement("td");
    noteCell.textContent = note;
    tr.appendChild(noteCell);
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  if (heightInput.value !== draft.heightCm) heightInput.value = draft.heightCm;
  if (draft.sex === "male") {
    sexMaleInput.checked = true;
    sexFemaleInput.checked = false;
  } else if (draft.sex === "female") {
    sexMaleInput.checked = false;
    sexFemaleInput.checked = true;
  } else {
    sexMaleInput.checked = false;
    sexFemaleInput.checked = false;
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
      if (error.field === "heightCm") {
        setFieldError(heightInput, errorHeight, message);
        statusEl.textContent = `${t.fieldLabel.heightCm}${lang === "en" ? ": " : "："}${message}`;
        if (submitted) {
          submitted = false;
          heightInput.focus();
        }
      } else if (error.field === "sex") {
        setFieldError(sexFemaleInput, errorSex, message);
        statusEl.textContent = `${t.fieldLabel.sex}${lang === "en" ? ": " : "："}${message}`;
        if (submitted) {
          submitted = false;
          sexFemaleInput.focus();
        }
      } else {
        errorGeneral.textContent = message;
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    summaryEl.textContent = t.summary(result);
    statusEl.textContent = summaryEl.textContent;
    renderResults(result);
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

heightInput.addEventListener("input", () => {
  controller.edit({ heightCm: heightInput.value });
});

sexMaleInput.addEventListener("change", () => {
  if (sexMaleInput.checked) controller.edit({ sex: "male" });
});

sexFemaleInput.addEventListener("change", () => {
  if (sexFemaleInput.checked) controller.edit({ sex: "female" });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  heightInput.focus();
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
