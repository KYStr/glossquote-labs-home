// DOM wiring for the Pool Volume Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, sequence, and state machine; this file
// only renders it. The draft lives only in this page: there is no
// persistent storage (SPEC implementation), so switching language or
// leaving the page discards it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatDecimal,
  formatFillDuration,
  formatInteger,
  serializeReport,
} from "./core/pool-volume.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

// Pinned bilingual error messages (SPEC inputsOutputs error table),
// carried verbatim here as well as in the core's ERROR_MESSAGES so
// the displayed text never depends on a machine-only table.
const ERROR_TEXT = {
  SCHEMA: { zh: "輸入格式不正確。", en: "The input is malformed." },
  INPUT_LIMIT: { zh: "輸入太長。", en: "The input is too long." },
  UNICODE: { zh: "輸入含有不完整的字元。", en: "The input contains an incomplete character." },
  EMPTY: { zh: "此欄必填。", en: "This field is required." },
  ENUM: { zh: "請選擇有效的選項。", en: "Choose a valid option." },
  DECIMAL_FORMAT: { zh: "請輸入最多兩位小數的數字。", en: "Enter a number with at most two decimal places." },
  RANGE: { zh: "數值超出允許範圍。", en: "The value is outside the allowed range." },
  DEPTH_ORDER: { zh: "淺端深度不可大於深端深度。", en: "Shallow-end depth must not exceed deep-end depth." },
  OUTPUT_LIMIT: { zh: "報告超過大小上限。", en: "The report exceeds the size limit." },
  INTERNAL: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
  WORKER_ERROR: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
};

const STRINGS = {
  "zh-Hant": {
    shapeName: { rectangular: "長方形", circular: "圓形", oval: "橢圓形" },
    depthModeName: { single: "單一深度", sloped: "斜底（淺端＋深端）" },
    resultHeading: "水量結果",
    avgDepthLine: (avgDepthM) => `平均深度：${formatDecimal(avgDepthM)} 公尺`,
    volumeM3Line: (volumeM3) => `水量：${formatDecimal(volumeM3)} 立方公尺`,
    volumeLitresLine: (volumeLitres) => `公升：${formatInteger(volumeLitres)} 公升`,
    volumeGallonsLine: (volumeGallonsUs) => `美制加侖：${formatInteger(volumeGallonsUs)} 加侖`,
    fillLine: (fillTotalMinutes, fillHours, fillMinutes) =>
      `注水時間：${formatInteger(fillTotalMinutes)} 分鐘（${fillHours} 小時 ${fillMinutes} 分鐘，約 ${formatFillDuration(fillHours, fillMinutes)}）`,
    noFillLine: "未提供流速，不計算注水時間",
    disclaimer:
      "以理想形狀與垂直池壁估算；未計池壁厚度、台階與實際水位（水面通常低於池緣），請把結果當估算值。",
    precisionNote: "公升與立方公尺都由未捨入的水量各自捨入一次；公升是較精確的數字。",
    exampleNote: "已載入範例，請按「計算水量」執行。",
  },
  en: {
    shapeName: { rectangular: "Rectangular", circular: "Circular", oval: "Oval" },
    depthModeName: { single: "Single depth", sloped: "Sloped floor (shallow + deep ends)" },
    resultHeading: "Volume result",
    avgDepthLine: (avgDepthM) => `Average depth: ${formatDecimal(avgDepthM)} m`,
    volumeM3Line: (volumeM3) => `Volume: ${formatDecimal(volumeM3)} m³`,
    volumeLitresLine: (volumeLitres) => `Litres: ${formatInteger(volumeLitres)} L`,
    volumeGallonsLine: (volumeGallonsUs) => `US gallons: ${formatInteger(volumeGallonsUs)} gal`,
    fillLine: (fillTotalMinutes, fillHours, fillMinutes) =>
      `Fill time: ${formatInteger(fillTotalMinutes)} minutes (${fillHours} hours ${fillMinutes} minutes, ${formatFillDuration(fillHours, fillMinutes)})`,
    noFillLine: "No fill rate provided; fill time not calculated.",
    disclaimer:
      "Estimated for an ideal shape with vertical walls. Wall thickness, steps, and the actual water level (usually below the rim) are not included; treat the result as an estimate.",
    precisionNote:
      "Litres and cubic metres are each rounded once from the same unrounded volume; the litre figure is the more precise one.",
    exampleNote: "Example loaded. Run “Calculate volume” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const errorText = (code) => (ERROR_TEXT[code] ?? ERROR_TEXT.INTERNAL)[lang];

const form = document.getElementById("pool-volume-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const avgDepthEl = document.getElementById("result-avg-depth");
const volumeM3El = document.getElementById("result-volume-m3");
const volumeLitresEl = document.getElementById("result-volume-litres");
const volumeGallonsEl = document.getElementById("result-volume-gallons");
const fillEl = document.getElementById("result-fill");
const disclaimerEl = document.getElementById("disclaimer");
const precisionEl = document.getElementById("precision-note");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
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

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  const lengthWidthActive = draft.shape === "rectangular" || draft.shape === "oval";
  inputs.lengthM.disabled = !lengthWidthActive;
  inputs.widthM.disabled = !lengthWidthActive;
  inputs.diameterM.disabled = draft.shape !== "circular";
  inputs.depthM.disabled = draft.depthMode !== "single";
  inputs.shallowDepthM.disabled = draft.depthMode !== "sloped";
  inputs.deepDepthM.disabled = draft.depthMode !== "sloped";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    avgDepthEl.textContent = t.avgDepthLine(result.avgDepthM);
    volumeM3El.textContent = t.volumeM3Line(result.volumeM3);
    volumeLitresEl.textContent = t.volumeLitresLine(result.volumeLitres);
    volumeGallonsEl.textContent = t.volumeGallonsLine(result.volumeGallonsUs);
    fillEl.textContent =
      result.fillTotalMinutes === null
        ? t.noFillLine
        : t.fillLine(result.fillTotalMinutes, result.fillHours, result.fillMinutes);
    disclaimerEl.textContent = t.disclaimer;
    precisionEl.textContent = t.precisionNote;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorText(error.code);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      }
      // A field-less error (WORKER_ERROR / OUTPUT_LIMIT) is reported
      // through the status region only; the detail lives nowhere else.
      if (error.field === null) statusEl.textContent = message;
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

for (const field of FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
inputs.shape.addEventListener("change", () => {
  controller.edit({ shape: inputs.shape.value });
});
inputs.depthMode.addEventListener("change", () => {
  controller.edit({ depthMode: inputs.depthMode.value });
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.shape.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = errorText("OUTPUT_LIMIT");
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
