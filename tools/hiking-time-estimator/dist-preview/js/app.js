// DOM wiring for the Hiking Time Estimator. All values are rendered
// with textContent / value only; the computation itself runs in a
// module Worker built from the fixed worker source.

import { REPORT_FILENAME, REPORT_LIMIT_BYTES, serializeReport } from "./core/hiking.mjs";
import { createController } from "./controller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const lang = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    emptyField: {
      distanceKm: "請輸入距離。",
      ascentM: "請輸入爬升。",
      descentM: "請輸入下降。",
      descentType: "請選擇下降類型。",
    },
    errors: {
      SCHEMA: "輸入格式不正確，請檢查後重新輸入。",
      INPUT_LIMIT: "輸入太長，請縮短後再試。",
      UNICODE: "輸入含有不完整的字元。",
      ENUM: "請選擇有效的下降類型。",
      DECIMAL_FORMAT: "距離格式不正確：請輸入數字，最多 2 位小數，例如 12.5。",
      INTEGER_FORMAT: "請輸入整數。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
    },
    rangeField: {
      distanceKm: "距離需在 0.1 至 200 公里之間。",
      ascentM: "爬升需在 0 至 10000 公尺之間。",
      descentM: "下降需在 0 至 10000 公尺之間。",
    },
    statusDirty: "輸入已變更，請重新執行",
    statusCancelled: "已取消，可重新執行",
    statusBusy: "處理中",
    statusFixField: "請修正標示的欄位後重新執行。",
    exampleNote: "目前是範例內容（12 公里、爬升 600 公尺）；按「計算登山時間」執行。",
    summaryTotal: "預估移動時間",
    minutesSuffix: (n) => `（${n} 分鐘）`,
    details: {
      flatMinutes: "平路耗時",
      ascentMinutes: "爬升耗時",
      descentAdjustmentMinutes: "下降調整",
      paceMinPerKm: "平均配速",
      equivalentFlatKm: "等效平路距離",
    },
    minutesUnit: (n) => `${n} 分鐘`,
    paceUnit: (n) => `${n} 分鐘／公里`,
    kmUnit: (n) => `${n} 公里`,
    reportTooLarge: "報告超過大小上限，無法下載。",
  },
  en: {
    emptyField: {
      distanceKm: "Enter the distance.",
      ascentM: "Enter the ascent.",
      descentM: "Enter the descent.",
      descentType: "Choose the descent type.",
    },
    errors: {
      SCHEMA: "The input shape is not valid; check it and run again.",
      INPUT_LIMIT: "The input is too long; shorten it and try again.",
      UNICODE: "The input contains an incomplete character.",
      ENUM: "Choose a valid descent type.",
      DECIMAL_FORMAT: "Use the distance format: a number with at most 2 decimal places, for example 12.5.",
      INTEGER_FORMAT: "Enter a whole number.",
      INTERNAL: "Processing failed. Try again.",
      WORKER_ERROR: "Processing failed. Try again.",
    },
    rangeField: {
      distanceKm: "The distance must be between 0.1 and 200 km.",
      ascentM: "The ascent must be between 0 and 10000 m.",
      descentM: "The descent must be between 0 and 10000 m.",
    },
    statusDirty: "Input changed. Run again.",
    statusCancelled: "Cancelled. You can run again.",
    statusBusy: "Working",
    statusFixField: "Fix the highlighted field and run again.",
    exampleNote: "Showing the worked example (12 km, 600 m of ascent). Press \u201CCalculate hiking time\u201D to run it.",
    summaryTotal: "Estimated moving time",
    minutesSuffix: (n) => ` (${n} min)`,
    details: {
      flatMinutes: "Flat time",
      ascentMinutes: "Ascent time",
      descentAdjustmentMinutes: "Descent adjustment",
      paceMinPerKm: "Average pace",
      equivalentFlatKm: "Equivalent flat distance",
    },
    minutesUnit: (n) => `${n} min`,
    paceUnit: (n) => `${n} min/km`,
    kmUnit: (n) => `${n} km`,
    reportTooLarge: "The report exceeds the size limit and cannot be downloaded.",
  },
};

const t = STRINGS[lang];

const FIELD_NAMES = ["distanceKm", "ascentM", "descentM", "descentType"];

const elements = {
  form: document.getElementById("hiking-form"),
  inputs: {},
  errors: {},
  status: document.getElementById("status"),
  exampleNote: document.getElementById("example-note"),
  runButton: document.getElementById("run-btn"),
  exampleButton: document.getElementById("example-btn"),
  resetButton: document.getElementById("reset-btn"),
  cancelButton: document.getElementById("cancel-btn"),
  results: document.getElementById("results"),
  summary: document.getElementById("summary-list"),
  details: document.getElementById("details-list"),
  downloadButton: document.getElementById("download-btn"),
};

for (const field of FIELD_NAMES) {
  elements.inputs[field] = document.getElementById(`field-${field}`);
  elements.errors[field] = document.getElementById(`error-${field}`);
}

function errorMessage(error) {
  if (error.code === "EMPTY") return t.emptyField[error.field] ?? t.errors.SCHEMA;
  if (error.code === "RANGE" && error.field !== null && t.rangeField[error.field] !== undefined) {
    return t.rangeField[error.field];
  }
  return t.errors[error.code] ?? t.errors.WORKER_ERROR;
}

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

let latestState = null;
let submitted = false;

function render(state) {
  latestState = state;
  const draft = state.draft;

  for (const field of ["distanceKm", "ascentM", "descentM"]) {
    const input = elements.inputs[field];
    if (input.value !== draft[field]) input.value = draft[field];
  }
  if (elements.inputs.descentType.value !== draft.descentType) {
    elements.inputs.descentType.value = draft.descentType;
  }

  for (const field of FIELD_NAMES) {
    const slot = elements.errors[field];
    if (slot !== null && slot !== undefined) slot.textContent = "";
    const input = elements.inputs[field];
    if (input !== null && input !== undefined && input.removeAttribute !== undefined) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }

  let statusText = "";
  if (state.state === "busy") statusText = t.statusBusy;
  else if (state.state === "dirty") statusText = t.statusDirty;
  else if (state.state === "cancelled") statusText = t.statusCancelled;

  if (state.state === "error" && state.error !== null) {
    const message = errorMessage(state.error);
    if (state.error.field !== null && elements.errors[state.error.field] !== undefined) {
      elements.errors[state.error.field].textContent = message;
      const input = elements.inputs[state.error.field];
      if (input !== null) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-errormessage", `error-${state.error.field}`);
        if (submitted) input.focus();
      }
      statusText = t.statusFixField;
    } else {
      statusText = message;
    }
  }

  if (state.state === "success" && state.result !== null) {
    const result = state.result;
    statusText = `${t.summaryTotal} ${result.totalDisplay}${t.minutesSuffix(result.totalMinutes)}`;
  }

  elements.status.textContent = statusText;
  elements.status.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  elements.exampleNote.textContent = t.exampleNote;
  elements.exampleNote.hidden = !state.isExample;
  elements.cancelButton.hidden = state.state !== "busy";
  elements.runButton.disabled = state.state === "busy";

  const showResults = state.state === "success" && state.result !== null;
  elements.results.hidden = !showResults;
  if (showResults) {
    const result = state.result;
    elements.summary.replaceChildren();
    const summaryRow = document.createElement("div");
    summaryRow.className = "summary-row";
    const summaryLabel = document.createElement("span");
    summaryLabel.className = "summary-label";
    summaryLabel.textContent = t.summaryTotal;
    const summaryValue = document.createElement("span");
    summaryValue.className = "summary-value";
    summaryValue.textContent = `${result.totalDisplay}${t.minutesSuffix(result.totalMinutes)}`;
    summaryRow.append(summaryLabel, summaryValue);
    elements.summary.append(summaryRow);

    elements.details.replaceChildren();
    const detailRows = [
      ["flatMinutes", t.minutesUnit(result.flatMinutes)],
      ["ascentMinutes", t.minutesUnit(result.ascentMinutes)],
      ["descentAdjustmentMinutes", t.minutesUnit(result.descentAdjustmentMinutes)],
      ["paceMinPerKm", t.paceUnit(result.paceMinPerKm)],
      ["equivalentFlatKm", t.kmUnit(result.equivalentFlatKm)],
    ];
    for (const [key, value] of detailRows) {
      const item = document.createElement("li");
      const term = document.createElement("span");
      term.className = "reading-label";
      term.textContent = t.details[key];
      const detail = document.createElement("span");
      detail.className = "reading-value";
      detail.textContent = value;
      item.append(term, detail);
      elements.details.append(item);
    }
  } else {
    elements.summary.replaceChildren();
    elements.details.replaceChildren();
  }

  elements.downloadButton.hidden = !state.reportAvailable;
  if (!state.reportAvailable) revokeReportUrl();
  submitted = false;
}

const controller = createController({
  createWorker() {
    const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, { type: "module" });
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      terminate();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    return worker;
  },
  onChange: render,
});

for (const field of ["distanceKm", "ascentM", "descentM"]) {
  elements.inputs[field].addEventListener("input", (event) => {
    controller.edit({ [field]: event.target.value });
  });
}
elements.inputs.descentType.addEventListener("change", (event) => {
  controller.edit({ descentType: event.target.value });
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

elements.exampleButton.addEventListener("click", () => {
  controller.loadExample();
});

elements.resetButton.addEventListener("click", () => {
  controller.reset();
  elements.inputs.distanceKm.focus();
});

elements.cancelButton.addEventListener("click", () => {
  controller.cancel();
});

elements.downloadButton.addEventListener("click", () => {
  if (latestState === null || !latestState.reportAvailable || latestState.result === null) return;
  revokeReportUrl();
  const bytes = new TextEncoder().encode(serializeReport(latestState.result));
  if (bytes.byteLength > REPORT_LIMIT_BYTES) {
    elements.status.textContent = t.reportTooLarge;
    return;
  }
  reportUrl = URL.createObjectURL(new Blob([bytes], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportTimer = setTimeout(revokeReportUrl, 30000);
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

render(controller.snapshot());
