// DOM wiring for the TV Viewing Distance Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, generation, and state machine; this file only renders.

import { createController } from "./controller.mjs";
import { REPORT_FILENAME, serializeReport } from "./core/tv.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const TEXT_FIELDS = ["diagonalIn", "roomDistanceCm"];
const QUICK_SIZES = ["32", "43", "50", "55", "65", "75", "85", "98"];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      diagonalIn: "電視對角線（吋）",
      roomDistanceCm: "沙發到電視的距離（公分，選填）",
      resolution: "解析度",
    },
    error: {
      SCHEMA: "輸入格式不正確，請重新填寫。",
      EMPTY: "請至少填入對角線吋數或沙發距離其中一項。",
      INPUT_LIMIT: "此欄最多 8 個字元。",
      UNICODE: "此欄含有無法處理的字元。",
      DECIMAL_FORMAT: "請輸入最多一位小數的數字，不含符號或空白。",
      RANGE: "超出允許範圍。",
      ENUM: "請選擇解析度。",
      INTERNAL: "計算時發生內部錯誤，草稿已保留，請再試一次。",
      WORKER_ERROR: "背景工作無法完成，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超過 2,097,152 位元組，無法下載。",
    },
    statusEmpty: "尚未計算。請輸入吋數或距離，或載入範例。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中…",
    statusCancelled: "已取消，可重新執行。",
    exampleNote: "已載入範例（55 吋、FHD、無距離），請按「計算觀賞距離」執行。",
    screenLine: (w, h) => `螢幕寬 × 高：${w} × ${h} 公分（16:9）。`,
    distMinimum: "最近",
    distIdealLow: "理想下限",
    distIdealHigh: "理想上限",
    distMaximum: "最遠",
    distanceCell: (cm, m) => `${cm} 公分（${m} 公尺）`,
    fitLine: (symbol, label, room) => `以你的距離 ${room} 公分來看：${symbol} ${label}`,
    fitLabel: {
      TOO_CLOSE: "太近",
      NEAR: "偏近",
      IDEAL: "理想範圍",
      FAR: "偏遠",
      TOO_FAR: "太遠",
    },
    inverseRange: (low, high) => `建議吋數範圍：${low} – ${high} 吋。`,
    inverseMax: (value) => `可接受上限：${value} 吋（再大就會比最近距離更近）。`,
    inverseMin: (value) => `下限：${value} 吋（再小就會超過最遠距離）。`,
  },
  en: {
    fieldLabel: {
      diagonalIn: "TV diagonal (inches)",
      roomDistanceCm: "Distance from sofa to TV (cm, optional)",
      resolution: "Resolution",
    },
    error: {
      SCHEMA: "The input is malformed. Please fill in the fields again.",
      EMPTY: "Enter at least one of the diagonal or the sofa distance.",
      INPUT_LIMIT: "This field allows at most 8 characters.",
      UNICODE: "This field contains an unsupported character.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place, without signs or spaces.",
      RANGE: "Out of the allowed range.",
      ENUM: "Choose a resolution.",
      INTERNAL: "An internal error occurred while calculating. Your draft is kept; please try again.",
      WORKER_ERROR: "The background worker could not finish. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter a diagonal or a distance, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working…",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (55 in, FHD, no distance). Run “Calculate viewing distance” to compute it.",
    screenLine: (w, h) => `Screen width × height: ${w} × ${h} cm (16:9).`,
    distMinimum: "Minimum",
    distIdealLow: "Ideal low",
    distIdealHigh: "Ideal high",
    distMaximum: "Maximum",
    distanceCell: (cm, m) => `${cm} cm (${m} m)`,
    fitLine: (symbol, label, room) => `At your distance of ${room} cm: ${symbol} ${label}`,
    fitLabel: {
      TOO_CLOSE: "Too close",
      NEAR: "On the close side",
      IDEAL: "In the ideal range",
      FAR: "On the far side",
      TOO_FAR: "Too far",
    },
    inverseRange: (low, high) => `Recommended size range: ${low} – ${high} inches.`,
    inverseMax: (value) => `Acceptable maximum: ${value} inches (any larger would sit closer than the minimum distance).`,
    inverseMin: (value) => `Minimum: ${value} inches (any smaller would exceed the maximum distance).`,
  },
};

const FIT_SYMBOLS = {
  TOO_CLOSE: "◀◀",
  NEAR: "◀",
  IDEAL: "●",
  FAR: "▶",
  TOO_FAR: "▶▶",
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("tv-form");
const inputs = {};
for (const field of TEXT_FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of [...TEXT_FIELDS, "resolution"]) {
  fieldErrors[field] = document.getElementById(`error-${field}`);
}
const resolutionRadios = [...document.querySelectorAll('input[name="resolution"]')];
const quickButtons = [...document.querySelectorAll("[data-quick-size]")];
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const forwardBlock = document.getElementById("forward-block");
const distanceRows = document.getElementById("distance-rows");
const fitLineEl = document.getElementById("fit-line");
const inverseBlock = document.getElementById("inverse-block");
const inverseLines = document.getElementById("inverse-lines");
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
  errorEl.textContent = message ?? "";
  if (field === "resolution") {
    for (const radio of resolutionRadios) {
      if (message === null) radio.removeAttribute("aria-invalid");
      else radio.setAttribute("aria-invalid", "true");
    }
    return;
  }
  const input = inputs[field];
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  } else {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", `error-${field}`);
  }
}

function clearFieldErrors() {
  for (const field of [...TEXT_FIELDS, "resolution"]) setFieldError(field, null);
}

function renderForward(result) {
  summaryEl.textContent = t.screenLine(result.screen.widthCm, result.screen.heightCm);
  distanceRows.replaceChildren();
  const rows = [
    ["minimum", t.distMinimum],
    ["idealLow", t.distIdealLow],
    ["idealHigh", t.distIdealHigh],
    ["maximum", t.distMaximum],
  ];
  for (const [key, label] of rows) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = t.distanceCell(result.distances[key].cm, result.distances[key].m);
    tr.appendChild(th);
    tr.appendChild(td);
    distanceRows.appendChild(tr);
  }
  if (result.fit !== null) {
    fitLineEl.textContent = t.fitLine(
      FIT_SYMBOLS[result.fit.status],
      t.fitLabel[result.fit.status],
      result.fit.roomDistanceCm,
    );
    fitLineEl.hidden = false;
  } else {
    fitLineEl.hidden = true;
  }
  forwardBlock.hidden = false;
  inverseBlock.hidden = true;
}

function renderInverse(result) {
  summaryEl.textContent = t.inverseRange(result.diagonalRangeIn.low, result.diagonalRangeIn.high);
  inverseLines.replaceChildren();
  for (const line of [t.inverseMax(result.diagonalMaxIn), t.inverseMin(result.diagonalMinIn)]) {
    const li = document.createElement("li");
    li.textContent = line;
    inverseLines.appendChild(li);
  }
  forwardBlock.hidden = true;
  inverseBlock.hidden = false;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of TEXT_FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const radio of resolutionRadios) {
    radio.checked = radio.value === draft.resolution;
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
      if (error.field !== null && error.field in t.fieldLabel) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
        if (submitted) {
          submitted = false;
          if (error.field === "resolution") resolutionRadios[0].focus();
          else inputs[error.field].focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    clearFieldErrors();
    if (result.mode === "diagonal") renderForward(result);
    else renderInverse(result);
    statusEl.textContent = summaryEl.textContent;
    resultsEl.hidden = false;
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const field of TEXT_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const radio of resolutionRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ resolution: radio.value });
  });
}

for (const button of quickButtons) {
  button.addEventListener("click", () => {
    const size = button.getAttribute("data-quick-size");
    if (size !== null && QUICK_SIZES.includes(size)) {
      inputs.diagonalIn.value = size;
      controller.edit({ diagonalIn: size });
      inputs.diagonalIn.focus();
    }
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.diagonalIn.focus();
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
