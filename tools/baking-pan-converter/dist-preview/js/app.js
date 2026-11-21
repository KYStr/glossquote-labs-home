// DOM wiring for the Baking Pan Converter. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns
// the draft, sequence, and state machine; this file only renders it.
// The draft lives only in memory on this page: it is never persisted,
// and leaving the page discards it.

import { createController } from "./controller.mjs";
import {
  BASIS_LABELS,
  DEPTH_RELATION_LABELS,
  FIELDS,
  PAN_BY_ID,
  REPORT_FILENAME,
  cmToInchesDisplay,
  serializeReport,
} from "./core/baking-pan-converter.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

const RADIO_FIELDS = new Set(["sourceKind", "targetKind", "sourceShape", "targetShape", "quantityUnit"]);
const DIMENSION_FIELDS = ["sourceD1", "sourceD2", "sourceDepth", "targetD1", "targetD2", "targetDepth"];

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請用數字，最多 2 位小數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    shapeName: { round: "自訂圓形", rect: "自訂方形或長方形" },
    resultHeading: "換算結果",
    factorLine: (factor) => `倍率 × ${factor}`,
    sourceLine: (name, volumeMl, basis, depth) => `來源：${name} — ${volumeMl} 毫升（${basis}），深度 ${depth}`,
    targetLine: (name, volumeMl, basis, depth) => `目標：${name} — ${volumeMl} 毫升（${basis}），深度 ${depth}`,
    depthDash: "—",
    depthCm: (depth) => `${depth} 公分`,
    percentLine: (percent) => `百分比：${percent}%`,
    scaledLine: (value, unit) => `換算後份量：${value} ${unit}`,
    scaledNone: "換算後份量：未輸入",
    depthLine: (label) => `深度關係：${label}`,
    hintShallower:
      "相同的麵糊量在較淺的烤盤中攤得較薄，通常熟得比較快——請提早檢查熟度。本工具只換算份量，不調整烘烤時間或溫度。",
    hintDeeper:
      "相同的麵糊量在較深的烤盤中會更厚，通常需要更久才熟——請以牙籤或探針確認中心熟度。本工具只換算份量，不調整烘烤時間或溫度。",
    hintUnknown: "有一側是標稱容量烤盤，沒有可比的深度。",
    inchEquiv: (inches) => `約 ${inches} 吋`,
    exampleNote: "已載入範例，請按「換算」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter a number with at most 2 decimal places.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    shapeName: { round: "Custom round", rect: "Custom square or rectangular" },
    resultHeading: "Conversion result",
    factorLine: (factor) => `Factor × ${factor}`,
    sourceLine: (name, volumeMl, basis, depth) => `Source: ${name} — ${volumeMl} ml (${basis}), depth ${depth}`,
    targetLine: (name, volumeMl, basis, depth) => `Target: ${name} — ${volumeMl} ml (${basis}), depth ${depth}`,
    depthDash: "—",
    depthCm: (depth) => `${depth} cm`,
    percentLine: (percent) => `Percentage: ${percent}%`,
    scaledLine: (value, unit) => `Scaled quantity: ${value} ${unit}`,
    scaledNone: "Scaled quantity: not entered",
    depthLine: (label) => `Depth relation: ${label}`,
    hintShallower:
      "Shallower: the same amount of batter spreads thinner in a shallower pan and usually bakes faster — start checking for doneness early. This tool scales quantities only; it does not adjust baking time or temperature.",
    hintDeeper:
      "Deeper: the same amount of batter sits thicker in a deeper pan and usually needs longer to bake through — check the centre with a skewer or probe. This tool scales quantities only; it does not adjust baking time or temperature.",
    hintUnknown: "One side is a nominal-capacity pan, so depths cannot be compared.",
    inchEquiv: (inches) => `≈ ${inches} in`,
    exampleNote: "Example loaded. Run “Convert” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("baking-pan-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const factorEl = document.getElementById("factor-value");
const sourceLineEl = document.getElementById("result-source");
const targetLineEl = document.getElementById("result-target");
const percentEl = document.getElementById("result-percent");
const scaledEl = document.getElementById("result-scaled");
const depthEl = document.getElementById("result-depth");
const depthHintEl = document.getElementById("depth-hint");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

// Control accessors: text inputs and selects are single elements;
// kind / shape / unit are radio groups inside a fieldset.
const controls = {};
for (const field of FIELDS) {
  controls[field] = document.getElementById(`field-${field}`);
}
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const inchSpans = {};
for (const field of DIMENSION_FIELDS) inchSpans[field] = document.getElementById(`inch-${field}`);

function getControlValue(field) {
  const control = controls[field];
  if (RADIO_FIELDS.has(field)) {
    const checked = control.querySelector("input:checked");
    return checked === null ? "" : checked.value;
  }
  return control.value;
}

function setControlValue(field, value) {
  const control = controls[field];
  if (RADIO_FIELDS.has(field)) {
    const radios = control.querySelectorAll("input");
    for (const radio of radios) radio.checked = radio.value === value;
    return;
  }
  if (control.value !== value) control.value = value;
}

function setControlDisabled(field, disabled) {
  const control = controls[field];
  if (RADIO_FIELDS.has(field)) {
    const radios = control.querySelectorAll("input");
    for (const radio of radios) radio.disabled = disabled;
    return;
  }
  control.disabled = disabled;
}

function focusControl(field) {
  const control = controls[field];
  if (RADIO_FIELDS.has(field)) {
    const first = control.querySelector("input");
    if (first !== null) first.focus();
    return;
  }
  control.focus();
}

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
  const control = controls[field];
  const errorEl = fieldErrors[field];
  if (message === null) {
    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  control.setAttribute("aria-invalid", "true");
  control.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function panName(side) {
  if (side.kind === "table") {
    const row = PAN_BY_ID[side.pan];
    return lang === "en" ? row.nameEn : row.nameZh;
  }
  return t.shapeName[side.shape];
}

function renderSideLine(el, side, lineFn) {
  const depth =
    side.depthCm === null ? t.depthDash : t.depthCm(side.depthCm);
  el.textContent = lineFn(
    panName(side),
    side.volumeMl,
    BASIS_LABELS[side.basis][lang],
    depth,
  );
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) setControlValue(field, draft[field]);

  // Enable only the controls the current draft activates; inactive
  // values stay in the draft but are ignored by the core.
  setControlDisabled("sourcePan", draft.sourceKind !== "table");
  setControlDisabled("sourceShape", draft.sourceKind !== "custom");
  setControlDisabled("sourceD1", draft.sourceKind !== "custom");
  setControlDisabled("sourceD2", draft.sourceKind !== "custom" || draft.sourceShape !== "rect");
  setControlDisabled("sourceDepth", draft.sourceKind !== "custom");
  setControlDisabled("targetPan", draft.targetKind !== "table");
  setControlDisabled("targetShape", draft.targetKind !== "custom");
  setControlDisabled("targetD1", draft.targetKind !== "custom");
  setControlDisabled("targetD2", draft.targetKind !== "custom" || draft.targetShape !== "rect");
  setControlDisabled("targetDepth", draft.targetKind !== "custom");
  setControlDisabled("quantityUnit", draft.quantity === "");

  // Read-only inch equivalents for custom dimensions (display only).
  for (const field of DIMENSION_FIELDS) {
    const raw = draft[field];
    if (DECIMAL_PATTERN.test(raw)) {
      inchSpans[field].textContent = t.inchEquiv(cmToInchesDisplay(Number(raw)));
    } else {
      inchSpans[field].textContent = "";
    }
  }

  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    factorEl.textContent = t.factorLine(result.factor);
    renderSideLine(sourceLineEl, result.source, t.sourceLine);
    renderSideLine(targetLineEl, result.target, t.targetLine);
    percentEl.textContent = t.percentLine(result.percent);
    scaledEl.textContent =
      result.scaledQuantity === null
        ? t.scaledNone
        : t.scaledLine(result.scaledQuantity.value, result.scaledQuantity.unit);
    depthEl.textContent = t.depthLine(DEPTH_RELATION_LABELS[result.depthRelation][lang]);
    if (result.depthRelation === "shallower") {
      depthHintEl.hidden = false;
      depthHintEl.textContent = t.hintShallower;
    } else if (result.depthRelation === "deeper") {
      depthHintEl.hidden = false;
      depthHintEl.textContent = t.hintDeeper;
    } else if (result.depthRelation === "unknown") {
      depthHintEl.hidden = false;
      depthHintEl.textContent = t.hintUnknown;
    } else {
      depthHintEl.hidden = true;
      depthHintEl.textContent = "";
    }
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  depthHintEl.hidden = true;
  depthHintEl.textContent = "";
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          focusControl(error.field);
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

for (const field of FIELDS) {
  const control = controls[field];
  if (RADIO_FIELDS.has(field)) {
    const radios = control.querySelectorAll("input");
    for (const radio of radios) {
      radio.addEventListener("change", () => {
        controller.edit({ [field]: getControlValue(field) });
      });
    }
  } else if (control.tagName === "SELECT") {
    control.addEventListener("change", () => {
      controller.edit({ [field]: control.value });
    });
  } else {
    control.addEventListener("input", () => {
      controller.edit({ [field]: control.value });
    });
  }
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  focusControl("sourceKind");
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
