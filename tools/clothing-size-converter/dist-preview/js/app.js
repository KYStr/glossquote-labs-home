// DOM wiring for the Clothing Size Converter. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, ROWS, serializeReport } from "./core/clothing.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const NO_LABEL = "—";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      garment: "類別",
      mode: "輸入方式",
      measurementCm: "胸圍量測（公分）",
      fromSystem: "來源尺寸制",
      sizeValue: "來源尺寸",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請輸入公分數，最多一位小數",
      SIZE_FORMAT: "尺寸代碼只能使用英文字母與數字，且數字不得有前導零",
      UNKNOWN_SIZE: "對照表中沒有這個尺寸代碼",
      RANGE: "超出允許範圍（50.0–200.0 cm）",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未換算。請輸入胸圍量測或任一制尺寸，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（女裝量測 88 cm），請按「換算尺寸」執行。",
    disclaimer:
      "尺寸表因品牌而異：本工具使用單一固定對照表，不同品牌的版型與標示可能不同，請以該品牌官方尺寸表與實際試穿為準。",
    garmentName: { women: "女裝", men: "男裝" },
    rowLabel: {
      measurement: "量測",
      status: "狀態",
      range: "胸圍範圍（cm）",
      usLetter: "US 字母",
      usNumeric: "US 數字",
      ukNumeric: "UK 數字",
      euNumeric: "EU 數字",
      jpLetter: "JP 字母",
      jpNumeric: "JP 數字",
      source: "來源尺寸",
      matchedBy: "命中欄",
    },
    statusText: {
      "in-range": "在對照表範圍內",
      "below-range": "低於對照表範圍",
      "above-range": "高於對照表範圍",
    },
    matchedByText: { letter: "字母欄", numeric: "數字欄" },
    boundaryNote: "量測正好等於這一列的下界，依半開區間規則歸入這一列。",
    belowNote: (min) => `對照表最小範圍從 ${min} cm 起。`,
    aboveNote: (max) => `對照表最大範圍到 ${max} cm 為止（不含）。`,
    summary: (result) => {
      const garment = STRINGS["zh-Hant"].garmentName[result.garment];
      if (result.mode === "size") {
        return `來源尺寸 ${result.fromSystem.toUpperCase()} ${result.sizeToken} 命中${garment}第 ${result.row.row} 列（${STRINGS["zh-Hant"].matchedByText[result.matchedBy]}）。`;
      }
      if (result.status === "in-range") {
        return `量測 ${result.measurementCm} cm 落入${garment}第 ${result.row.row} 列（${result.row.cmLow}–${result.row.cmHigh} cm）。`;
      }
      if (result.status === "below-range") {
        return `量測 ${result.measurementCm} cm 低於${garment}對照表範圍。`;
      }
      return `量測 ${result.measurementCm} cm 高於${garment}對照表範圍。`;
    },
  },
  en: {
    fieldLabel: {
      garment: "Garment",
      mode: "Input mode",
      measurementCm: "Chest or bust measurement (cm)",
      fromSystem: "Source size system",
      sizeValue: "Source size",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter centimetres with at most one decimal place.",
      SIZE_FORMAT: "A size code uses ASCII letters and digits only, with no leading zero on numbers.",
      UNKNOWN_SIZE: "That size code is not in the reference chart.",
      RANGE: "Out of range (50.0–200.0 cm).",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty:
      "Nothing converted yet. Enter a chest or bust measurement or a size in any system, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (women's chart, 88 cm measurement). Run “Convert size” to look it up.",
    disclaimer:
      "Size charts vary by brand: this tool uses one fixed reference chart. Fit and labelling differ between brands, so check the brand's official size chart and try the garment on whenever possible.",
    garmentName: { women: "women's", men: "men's" },
    rowLabel: {
      measurement: "Measurement",
      status: "Status",
      range: "Chest/bust range (cm)",
      usLetter: "US letter",
      usNumeric: "US numeric",
      ukNumeric: "UK numeric",
      euNumeric: "EU numeric",
      jpLetter: "JP letter",
      jpNumeric: "JP numeric",
      source: "Source size",
      matchedBy: "Matched column",
    },
    statusText: {
      "in-range": "In range",
      "below-range": "Below the chart",
      "above-range": "Above the chart",
    },
    matchedByText: { letter: "letter column", numeric: "numeric column" },
    boundaryNote:
      "The measurement equals this row's lower edge exactly, so the half-open rule places it in this row.",
    belowNote: (min) => `The chart's smallest range starts at ${min} cm.`,
    aboveNote: (max) => `The chart's largest range ends below ${max} cm.`,
    summary: (result) => {
      const garment = STRINGS.en.garmentName[result.garment];
      if (result.mode === "size") {
        return `The ${result.fromSystem.toUpperCase()} size ${result.sizeToken} matches row ${result.row.row} of the ${garment} chart (${STRINGS.en.matchedByText[result.matchedBy]}).`;
      }
      if (result.status === "in-range") {
        return `A ${result.measurementCm} cm measurement falls in row ${result.row.row} of the ${garment} chart (${result.row.cmLow}–${result.row.cmHigh} cm).`;
      }
      if (result.status === "below-range") {
        return `A ${result.measurementCm} cm measurement is below the ${garment} chart.`;
      }
      return `A ${result.measurementCm} cm measurement is above the ${garment} chart.`;
    },
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("size-form");
const inputs = {
  garment: document.getElementById("field-garment"),
  mode: document.getElementById("field-mode"),
  measurementCm: document.getElementById("field-measurementCm"),
  fromSystem: document.getElementById("field-fromSystem"),
  sizeValue: document.getElementById("field-sizeValue"),
};
const fieldErrors = {
  garment: document.getElementById("error-garment"),
  mode: document.getElementById("error-mode"),
  measurementCm: document.getElementById("error-measurementCm"),
  fromSystem: document.getElementById("error-fromSystem"),
  sizeValue: document.getElementById("error-sizeValue"),
};
const groupMeasurement = document.getElementById("group-measurement");
const groupSize = document.getElementById("group-size");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("result-rows");
const resultNoteEl = document.getElementById("result-note");
const disclaimerEl = document.getElementById("disclaimer");
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
  let worker;
  try {
    worker = new Worker(url, { type: "module" });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  const originalTerminate = worker.terminate.bind(worker);
  let terminated = false;
  worker.terminate = () => {
    if (terminated) return;
    terminated = true;
    try {
      originalTerminate();
    } finally {
      URL.revokeObjectURL(url);
    }
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
  const control = inputs[field];
  if (message === null) {
    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-errormessage");
  } else {
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message ?? "";
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function cellText(value) {
  return value === null ? NO_LABEL : value;
}

function renderResults(result) {
  tableBody.replaceChildren();
  const rows = [];
  if (result.mode === "measurement") {
    rows.push([t.rowLabel.measurement, `${result.measurementCm} cm`]);
    rows.push([t.rowLabel.status, t.statusText[result.status]]);
  } else {
    rows.push([t.rowLabel.source, `${result.fromSystem.toUpperCase()} ${result.sizeToken}`]);
    rows.push([t.rowLabel.matchedBy, t.matchedByText[result.matchedBy]]);
  }
  if (result.row !== null) {
    const row = result.row;
    rows.push([t.rowLabel.range, `${row.cmLow}–${row.cmHigh}`]);
    rows.push([t.rowLabel.usLetter, cellText(row.usLetter)]);
    rows.push([t.rowLabel.usNumeric, cellText(row.usNumeric)]);
    rows.push([t.rowLabel.ukNumeric, cellText(row.ukNumeric)]);
    rows.push([t.rowLabel.euNumeric, cellText(row.euNumeric)]);
    rows.push([t.rowLabel.jpLetter, cellText(row.jpLetter)]);
    rows.push([t.rowLabel.jpNumeric, cellText(row.jpNumeric)]);
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
  if (result.mode === "measurement" && result.onBoundary) {
    resultNoteEl.textContent = t.boundaryNote;
  } else if (result.mode === "measurement" && result.status === "below-range") {
    resultNoteEl.textContent = t.belowNote(ROWS[result.garment][0].cmLow);
  } else if (result.mode === "measurement" && result.status === "above-range") {
    const rowsForGarment = ROWS[result.garment];
    resultNoteEl.textContent = t.aboveNote(rowsForGarment[rowsForGarment.length - 1].cmHigh);
  } else {
    resultNoteEl.textContent = "";
  }
  disclaimerEl.textContent = t.disclaimer;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  if (inputs.garment.value !== draft.garment) inputs.garment.value = draft.garment;
  if (inputs.mode.value !== draft.mode) inputs.mode.value = draft.mode;
  if (inputs.measurementCm.value !== draft.measurementCm) {
    inputs.measurementCm.value = draft.measurementCm;
  }
  if (inputs.fromSystem.value !== draft.fromSystem) inputs.fromSystem.value = draft.fromSystem;
  if (inputs.sizeValue.value !== draft.sizeValue) inputs.sizeValue.value = draft.sizeValue;
  groupMeasurement.hidden = draft.mode !== "measurement";
  groupSize.hidden = draft.mode !== "size";
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

inputs.garment.addEventListener("change", () => {
  controller.edit({ garment: inputs.garment.value });
});
inputs.mode.addEventListener("change", () => {
  controller.edit({ mode: inputs.mode.value });
});
inputs.measurementCm.addEventListener("input", () => {
  controller.edit({ measurementCm: inputs.measurementCm.value });
});
inputs.fromSystem.addEventListener("change", () => {
  controller.edit({ fromSystem: inputs.fromSystem.value });
});
inputs.sizeValue.addEventListener("input", () => {
  controller.edit({ sizeValue: inputs.sizeValue.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.garment.focus();
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

// Render both fixed reference tables from the same core data the lookup
// uses, so the printed tables can never drift from the pinned charts.
{
  const bodies = {
    women: document.getElementById("women-table-rows"),
    men: document.getElementById("men-table-rows"),
  };
  for (const garment of ["women", "men"]) {
    const body = bodies[garment];
    if (body === null) continue;
    for (const row of ROWS[garment]) {
      const cells = [
        String(row.row),
        `${row.cmLow}–${row.cmHigh}`,
        cellText(row.usLetter),
        cellText(row.usNumeric),
        cellText(row.ukNumeric),
        cellText(row.euNumeric),
        cellText(row.jpLetter),
        cellText(row.jpNumeric),
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
}

render(controller.getState());
