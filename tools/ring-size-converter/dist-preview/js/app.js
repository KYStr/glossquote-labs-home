// DOM wiring for the Ring Size Converter. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, ROWS, UK_LABELS, run, serializeReport } from "./core/ring.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: { source: "來源系統", value: "數值" },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請輸入數字，最多兩位小數",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      STEP: "美圍須為 0.5 的倍數",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未換算。請選擇來源系統、輸入數值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「換算」執行。",
    valueHelp: {
      circumference: "內圍長度，40.0–70.0 mm，最多兩位小數。",
      diameter: "內徑，12.8–22.2 mm，最多兩位小數。",
      us: "美圍 3.0–13.0，須為 0.5 的倍數。",
      eu: "歐圍（ISO）整數，40–70。",
      jp: "日圍整數，1–28。",
      uk: "從固定表的 21 個英圍字母中選擇。",
    },
    rowLabel: {
      circumference: "內圍（mm）",
      diameter: "內徑（mm）",
      eu: "歐圍（EU）",
      jp: "日圍（JP）",
      nearest: "最接近的標準尺寸",
      delta: "與標準尺寸差距（mm）",
      fit: "狀態",
      adjacent: "相鄰的另一尺寸",
    },
    fitExact: "吻合",
    fitBetween: "介於兩尺寸之間",
    jpBelow: "未滿日圍 1 號",
    toleranceNote: "差距 0.3 mm 以內視為吻合。",
    brandNote: "各品牌尺寸可能略有差異，購買前請先實測。",
    nearestText: (row) => `美圍 ${row.usSize} · 英圍 ${row.ukSize} · 內圍 ${row.circumferenceMm} mm`,
    summary: (result) =>
      result.fit === "exact"
        ? `內圍 ${result.circumferenceMm} mm，最接近的標準尺寸是美圍 ${result.nearestRow.usSize}（英圍 ${result.nearestRow.ukSize}），差距 ${result.deltaMm} mm，吻合。`
        : `內圍 ${result.circumferenceMm} mm，最接近的標準尺寸是美圍 ${result.nearestRow.usSize}，差距 ${result.deltaMm} mm，介於兩尺寸之間。`,
  },
  en: {
    fieldLabel: { source: "Source system", value: "Value" },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter a number with at most two decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      STEP: "US size must be a multiple of 0.5.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing converted yet. Choose a source system and enter a value, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Convert” to compute it.",
    valueHelp: {
      circumference: "Inside circumference, 40.0–70.0 mm, up to two decimal places.",
      diameter: "Inside diameter, 12.8–22.2 mm, up to two decimal places.",
      us: "US size 3.0–13.0, in half-size steps.",
      eu: "EU (ISO) size, a whole number from 40 to 70.",
      jp: "Japan size, a whole number from 1 to 28.",
      uk: "Choose one of the 21 UK letters in the fixed table.",
    },
    rowLabel: {
      circumference: "Inside circumference (mm)",
      diameter: "Inside diameter (mm)",
      eu: "EU size",
      jp: "Japan size",
      nearest: "Nearest standard size",
      delta: "Difference from the standard size (mm)",
      fit: "Fit",
      adjacent: "Adjacent size",
    },
    fitExact: "Exact match",
    fitBetween: "Between sizes",
    jpBelow: "Below Japan size 1",
    toleranceNote: "A difference of up to 0.3 mm counts as an exact match.",
    brandNote: "Sizes vary slightly by brand; measure before buying.",
    nearestText: (row) => `US ${row.usSize} · UK ${row.ukSize} · ${row.circumferenceMm} mm`,
    summary: (result) =>
      result.fit === "exact"
        ? `Inside circumference ${result.circumferenceMm} mm; the nearest standard size is US ${result.nearestRow.usSize} (UK ${result.nearestRow.ukSize}), ${result.deltaMm} mm away — an exact match.`
        : `Inside circumference ${result.circumferenceMm} mm; between sizes, ${result.deltaMm} mm from the nearest standard size US ${result.nearestRow.usSize}.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("ring-form");
const inputs = {
  source: document.getElementById("field-source"),
  value: document.getElementById("field-value"),
  valueUk: document.getElementById("field-value-uk"),
};
const fieldErrors = {
  source: document.getElementById("error-source"),
  value: document.getElementById("error-value"),
};
const valueHelpEl = document.getElementById("help-value");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("result-rows");
const toleranceNoteEl = document.getElementById("tolerance-note");
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
  const controls = field === "value" ? [inputs.value, inputs.valueUk] : [inputs.source];
  for (const control of controls) {
    if (message === null) {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-errormessage");
    } else {
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-errormessage", `error-${field}`);
    }
  }
  errorEl.textContent = message ?? "";
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function renderResults(result) {
  tableBody.replaceChildren();
  const rows = [
    [t.rowLabel.circumference, result.circumferenceMm],
    [t.rowLabel.diameter, result.diameterMm],
    [t.rowLabel.eu, String(result.euSize)],
    [t.rowLabel.jp, result.jpSize === null ? t.jpBelow : String(result.jpSize)],
    [t.rowLabel.nearest, t.nearestText(result.nearestRow)],
    [t.rowLabel.delta, result.deltaMm],
    [t.rowLabel.fit, result.fit === "exact" ? t.fitExact : t.fitBetween],
  ];
  if (result.adjacentRow !== null) {
    rows.push([t.rowLabel.adjacent, t.nearestText(result.adjacentRow)]);
  }
  for (const [label, value] of rows) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = label;
    tr.appendChild(labelCell);
    const valueCell = document.createElement("td");
    valueCell.textContent = value;
    tr.appendChild(valueCell);
    tableBody.appendChild(tr);
  }
  toleranceNoteEl.textContent = t.toleranceNote;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  if (inputs.source.value !== draft.source) inputs.source.value = draft.source;
  const isUk = draft.source === "uk";
  inputs.value.hidden = isUk;
  inputs.valueUk.hidden = !isUk;
  if (!isUk && inputs.value.value !== draft.value) inputs.value.value = draft.value;
  if (isUk) inputs.valueUk.value = UK_LABELS.includes(draft.value) ? draft.value : "";
  valueHelpEl.textContent = t.valueHelp[draft.source];
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
          (error.field === "value" && isUk ? inputs.valueUk : inputs[error.field]).focus();
        }
      } else {
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

inputs.source.addEventListener("change", () => {
  controller.edit({ source: inputs.source.value });
});
inputs.value.addEventListener("input", () => {
  controller.edit({ value: inputs.value.value });
});
inputs.valueUk.addEventListener("change", () => {
  controller.edit({ value: inputs.valueUk.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.source.focus();
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

// Render the fixed standard-size reference table from the same core data
// the converter uses: each row's derived columns come from run() itself,
// so the printed table can never drift from the conversion pipeline.
{
  const body = document.getElementById("size-table-rows");
  for (const row of ROWS) {
    const outcome = run({ source: "us", value: row.usSize });
    if (!outcome.ok) continue;
    const cells = [
      outcome.result.circumferenceMm,
      outcome.result.diameterMm,
      row.usSize,
      String(outcome.result.euSize),
      outcome.result.jpSize === null ? t.jpBelow : String(outcome.result.jpSize),
      row.ukSize,
    ];
    const tr = document.createElement("tr");
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

render(controller.getState());
