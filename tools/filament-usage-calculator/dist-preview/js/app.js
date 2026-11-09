// DOM wiring for the Filament Usage Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. Mode switches only change which fields are enabled
// — no typed value is ever cleared. The fixed report download
// (filament-usage-report.json) is created only on an explicit click
// while the controller reports it available, and its object URL is
// revoked after 30 seconds or as soon as the result is invalidated,
// whichever comes first. Error and status strings are the SPEC's
// pinned bilingual texts, verbatim.

import { createController } from "./controller.mjs";
import { CURRENCY_SYMBOLS, FIELDS, buildReport } from "./core/filament.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      mode: "模式",
      diameter: "線徑",
      material: "材料",
      lengthM: "長度（m）",
      weightG: "重量（g）",
      grossWeightG: "整捲總重（g）",
      emptySpoolPreset: "空軸重預設",
      emptySpoolCustomG: "自訂空軸重（g）",
      spoolPrice: "整軸價格",
      spoolNetWeightG: "整軸淨重（g）",
      usageG: "本次用量（g）",
      currency: "幣別",
    },
    error: {
      SCHEMA: "資料格式不正確。",
      INPUT_LIMIT: "輸入過長。",
      UNICODE: "含有不完整的字元。",
      EMPTY: "此欄必填。",
      ENUM: "請選擇有效的選項。",
      DECIMAL_FORMAT: "請輸入有效的數字。",
      RANGE: "數值超出允許範圍。",
      NEGATIVE_REMAINING: "總重小於空軸重，請確認秤重與空軸設定。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
      OUTPUT_LIMIT: "報告過大，無法下載。",
    },
    statusEmpty: "尚未計算。輸入數值或載入範例後按「計算換算」。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算換算」執行。",
    downloaded: "報告已下載。",
    summaryLength: (draft, result) => `長度 ${draft.lengthM} m，重量約 ${result.weightG} g`,
    summaryWeight: (draft, result) => `重量 ${draft.weightG} g，長度約 ${result.lengthM} m`,
    summarySpool: (draft, result) => `剩餘約 ${result.remainingG} g（約 ${result.remainingM} m）`,
    summaryCost: (draft, result) =>
      `本次列印線材成本約 ${CURRENCY_SYMBOLS[result.currency]}${result.cost}（${result.currency}）`,
    rows: {
      gramsPerMetre: "每公尺重量（g/m）",
      weightG: "線材重量（g）",
      lengthM: "線材長度（m）",
      remainingG: "剩餘重量（g）",
      remainingM: "剩餘長度（m）",
      cost: "線材成本",
      currency: "幣別",
      usageLengthM: "用量長度（m）",
    },
  },
  en: {
    fieldLabel: {
      mode: "Mode",
      diameter: "Diameter",
      material: "Material",
      lengthM: "Length (m)",
      weightG: "Weight (g)",
      grossWeightG: "Gross spool weight (g)",
      emptySpoolPreset: "Empty spool preset",
      emptySpoolCustomG: "Custom empty spool (g)",
      spoolPrice: "Spool price",
      spoolNetWeightG: "Spool net weight (g)",
      usageG: "Filament used (g)",
      currency: "Currency",
    },
    error: {
      SCHEMA: "The data format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter a valid number.",
      RANGE: "Value is outside the allowed range.",
      NEGATIVE_REMAINING:
        "Gross weight is less than the empty spool weight. Check the scale reading and spool setting.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter values or load the example, then press “Calculate”.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate” to run it.",
    downloaded: "Report downloaded.",
    summaryLength: (draft, result) => `${draft.lengthM} m of filament weighs about ${result.weightG} g`,
    summaryWeight: (draft, result) => `${draft.weightG} g of filament is about ${result.lengthM} m`,
    summarySpool: (draft, result) => `About ${result.remainingG} g left (about ${result.remainingM} m)`,
    summaryCost: (draft, result) =>
      `This print's filament costs about ${CURRENCY_SYMBOLS[result.currency]}${result.cost} (${result.currency})`,
    rows: {
      gramsPerMetre: "Weight per metre (g/m)",
      weightG: "Filament weight (g)",
      lengthM: "Filament length (m)",
      remainingG: "Remaining weight (g)",
      remainingM: "Remaining length (m)",
      cost: "Filament cost",
      currency: "Currency",
      usageLengthM: "Length used (m)",
    },
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("filament-form");
const inputs = {
  material: document.getElementById("field-material"),
  lengthM: document.getElementById("field-lengthM"),
  weightG: document.getElementById("field-weightG"),
  grossWeightG: document.getElementById("field-grossWeightG"),
  emptySpoolPreset: document.getElementById("field-emptySpoolPreset"),
  emptySpoolCustomG: document.getElementById("field-emptySpoolCustomG"),
  spoolPrice: document.getElementById("field-spoolPrice"),
  spoolNetWeightG: document.getElementById("field-spoolNetWeightG"),
  usageG: document.getElementById("field-usageG"),
  currency: document.getElementById("field-currency"),
};
const modeRadios = {
  length: document.getElementById("field-mode-length"),
  weight: document.getElementById("field-mode-weight"),
  spool: document.getElementById("field-mode-spool"),
  cost: document.getElementById("field-mode-cost"),
};
const diameterRadios = {
  "1.75": document.getElementById("field-diameter-175"),
  "2.85": document.getElementById("field-diameter-285"),
};
const fieldErrors = {
  mode: document.getElementById("error-mode"),
  diameter: document.getElementById("error-diameter"),
  material: document.getElementById("error-material"),
  lengthM: document.getElementById("error-lengthM"),
  weightG: document.getElementById("error-weightG"),
  grossWeightG: document.getElementById("error-grossWeightG"),
  emptySpoolPreset: document.getElementById("error-emptySpoolPreset"),
  emptySpoolCustomG: document.getElementById("error-emptySpoolCustomG"),
  spoolPrice: document.getElementById("error-spoolPrice"),
  spoolNetWeightG: document.getElementById("error-spoolNetWeightG"),
  usageG: document.getElementById("error-usageG"),
  currency: document.getElementById("error-currency"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("detail-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

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

let reportUrl = null;
let reportRevokeTimer = null;

function revokeReportUrl() {
  if (reportRevokeTimer !== null) {
    clearTimeout(reportRevokeTimer);
    reportRevokeTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function focusTargetFor(field) {
  if (field === "mode") return modeRadios.length;
  if (field === "diameter") return diameterRadios["1.75"];
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = focusTargetFor(field);
  if (message === null) {
    if (target !== null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (target !== null) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  return t.error[error.code] ?? t.error.INTERNAL;
}

function resultEntries(draft, result) {
  const entries = [["gramsPerMetre", result.gramsPerMetre]];
  if (Object.hasOwn(result, "weightG")) entries.push(["weightG", result.weightG]);
  if (Object.hasOwn(result, "lengthM")) entries.push(["lengthM", result.lengthM]);
  if (Object.hasOwn(result, "remainingG")) {
    entries.push(["remainingG", result.remainingG], ["remainingM", result.remainingM]);
  }
  if (Object.hasOwn(result, "cost")) {
    entries.push(
      ["cost", `${CURRENCY_SYMBOLS[result.currency]}${result.cost}`],
      ["currency", result.currency],
      ["usageLengthM", result.usageLengthM],
    );
  }
  return entries;
}

function renderDetailRows(draft, result) {
  tableBody.replaceChildren();
  for (const [key, value] of resultEntries(draft, result)) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.textContent = t.rows[key];
    const valueCell = document.createElement("td");
    valueCell.textContent = value;
    tr.appendChild(labelCell);
    tr.appendChild(valueCell);
    tableBody.appendChild(tr);
  }
}

function summaryFor(draft, result) {
  if (Object.hasOwn(result, "weightG")) return t.summaryLength(draft, result);
  if (Object.hasOwn(result, "lengthM")) return t.summaryWeight(draft, result);
  if (Object.hasOwn(result, "remainingG")) return t.summarySpool(draft, result);
  return t.summaryCost(draft, result);
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of Object.keys(inputs)) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const [value, radio] of Object.entries(modeRadios)) {
    radio.checked = draft.mode === value;
  }
  for (const [value, radio] of Object.entries(diameterRadios)) {
    radio.checked = draft.diameter === value;
  }
  // Inactive fields are disabled but keep their values, exactly as the
  // SPEC pins (switching mode never clears the draft).
  inputs.lengthM.disabled = draft.mode !== "length";
  inputs.weightG.disabled = draft.mode !== "weight";
  inputs.grossWeightG.disabled = draft.mode !== "spool";
  inputs.emptySpoolPreset.disabled = draft.mode !== "spool";
  inputs.emptySpoolCustomG.disabled =
    !(draft.mode === "spool" && draft.emptySpoolPreset === "custom");
  inputs.spoolPrice.disabled = draft.mode !== "cost";
  inputs.spoolNetWeightG.disabled = draft.mode !== "cost";
  inputs.usageG.disabled = draft.mode !== "cost";
  inputs.currency.disabled = draft.mode !== "cost";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();

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
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
        if (submitted) {
          submitted = false;
          const target = focusTargetFor(error.field);
          if (target !== null) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const summary = summaryFor(draft, result);
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    renderDetailRows(draft, result);
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

for (const radio of Object.values(modeRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ mode: radio.value });
  });
}
for (const radio of Object.values(diameterRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ diameter: radio.value });
  });
}
inputs.material.addEventListener("change", () => {
  controller.edit({ material: inputs.material.value });
});
for (const field of [
  "lengthM",
  "weightG",
  "grossWeightG",
  "emptySpoolCustomG",
  "spoolPrice",
  "spoolNetWeightG",
  "usageG",
]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
inputs.emptySpoolPreset.addEventListener("change", () => {
  controller.edit({ emptySpoolPreset: inputs.emptySpoolPreset.value });
});
inputs.currency.addEventListener("change", () => {
  controller.edit({ currency: inputs.currency.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  modeRadios.length.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusEl.textContent = errorMessage(report.error);
    return;
  }
  revokeReportUrl();
  const blob = new Blob([report.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportRevokeTimer = setTimeout(revokeReportUrl, 30000);
  statusEl.textContent = t.downloaded;
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeReportUrl();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) controller.reset();
});

render(controller.getState());
