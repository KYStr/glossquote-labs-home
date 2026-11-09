// DOM wiring for the AC Capacity Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/ac.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const SWITCH_FIELDS = ["westSun", "topFloor", "largeWindows", "kitchenHeat"];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      sizeUnit: "面積單位",
      area: "面積",
      occupants: "人數",
      westSun: "西曬",
      topFloor: "頂樓",
      largeWindows: "大面落地窗",
      kitchenHeat: "廚房相鄰／熱源",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請輸入數字，最多兩位小數",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    statusEmpty: "尚未計算。請輸入面積與條件，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算冷房能力」執行。",
    tonnageNote:
      "噸數依台灣家電通路慣例 1 噸 ≈ 2,500 kcal/h 估算，僅供參考；請以冷房能力 kW 選型，並與安裝廠商確認。",
    overRangeNote: "所需能力超過常見單機最大級距（10.0 kW），請考慮分區多台或請安裝廠商評估。",
    rowLabel: {
      recommended: "建議機型級距",
      next: "次一級",
      requiredKw: "所需冷房能力（kW）",
      requiredKcalH: "所需 kcal/h",
      requiredBtuH: "所需 BTU/h",
      tonnage: "噸數（台灣通路慣例估算）",
      ping: "換算後坪數",
      baseKcalH: "基準負荷（kcal/h）",
      adjustmentPct: "加成總計",
      breakdown: "逐項加成",
    },
    noAdjustment: "無加成",
    largestSize: "（已是最大常見級距）",
    occupantsPart: (count, extra, pct) => `人數 ${count} 人（多 ${extra} 人）+${pct}%`,
    summary: (result) =>
      result.modelOverRange
        ? `所需冷房能力 ${result.requiredKw} kW，超過常見單機最大級距（10.0 kW）。`
        : `建議機型級距 ${result.recommendedModelKw} kW${result.nextModelKw === null ? "（已是最大常見級距）" : `，次一級 ${result.nextModelKw} kW`}；所需冷房能力 ${result.requiredKw} kW。`,
  },
  en: {
    fieldLabel: {
      sizeUnit: "Size unit",
      area: "Area",
      occupants: "Occupants",
      westSun: "West-facing sun",
      topFloor: "Top floor",
      largeWindows: "Large windows",
      kitchenHeat: "Kitchen / heat source",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter a number with at most two decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter the size and conditions, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate required capacity” to compute it.",
    tonnageNote:
      "Tonnage uses the Taiwan retail rule of thumb 1 ton ≈ 2,500 kcal/h and is indicative only. Choose by cooling capacity in kW and confirm with your installer.",
    overRangeNote:
      "The required capacity exceeds the largest common single-unit size (10.0 kW); consider multiple units by zone or ask an installer to assess.",
    rowLabel: {
      recommended: "Recommended model size",
      next: "Next size up",
      requiredKw: "Required capacity (kW)",
      requiredKcalH: "Required kcal/h",
      requiredBtuH: "Required BTU/h",
      tonnage: "Tonnage (Taiwan retail rule of thumb)",
      ping: "Area in ping",
      baseKcalH: "Base load (kcal/h)",
      adjustmentPct: "Total adjustment",
      breakdown: "Adjustment breakdown",
    },
    noAdjustment: "None",
    largestSize: " (the largest common size)",
    occupantsPart: (count, extra, pct) => `Occupants ${count} (${extra} extra) +${pct}%`,
    summary: (result) =>
      result.modelOverRange
        ? `Required capacity ${result.requiredKw} kW exceeds the largest common single-unit size (10.0 kW).`
        : `Recommended model size ${result.recommendedModelKw} kW${result.nextModelKw === null ? " (the largest common size)" : `, next size up ${result.nextModelKw} kW`}; required capacity ${result.requiredKw} kW.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("ac-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("result-rows");
const noteEl = document.getElementById("tonnage-note");
const overRangeEl = document.getElementById("overrange-note");
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

function groupThousands(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function breakdownText(draft) {
  const parts = [];
  if (draft.westSun === "true") parts.push(`${t.fieldLabel.westSun} +10%`);
  if (draft.topFloor === "true") parts.push(`${t.fieldLabel.topFloor} +15%`);
  if (draft.largeWindows === "true") parts.push(`${t.fieldLabel.largeWindows} +10%`);
  if (draft.kitchenHeat === "true") parts.push(`${t.fieldLabel.kitchenHeat} +10%`);
  const occupants = Number.parseInt(draft.occupants, 10);
  if (Number.isInteger(occupants) && occupants > 2) {
    parts.push(t.occupantsPart(occupants, occupants - 2, 3 * (occupants - 2)));
  }
  return parts.length === 0 ? t.noAdjustment : parts.join(lang === "en" ? ", " : "、");
}

function renderResults(result, draft) {
  tableBody.replaceChildren();
  const rows = [
    [t.rowLabel.recommended, result.modelOverRange ? "—" : `${result.recommendedModelKw} kW`],
    [t.rowLabel.next, result.nextModelKw === null ? "—" : `${result.nextModelKw} kW`],
    [t.rowLabel.requiredKw, result.requiredKw],
    [t.rowLabel.requiredKcalH, groupThousands(result.requiredKcalH)],
    [t.rowLabel.requiredBtuH, groupThousands(result.requiredBtuH)],
    [t.rowLabel.tonnage, result.tonnageRuleOfThumb],
    [t.rowLabel.ping, result.ping],
    [t.rowLabel.baseKcalH, groupThousands(result.baseKcalH)],
    [t.rowLabel.adjustmentPct, `+${result.adjustmentPct}%`],
    [t.rowLabel.breakdown, breakdownText(draft)],
  ];
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
  noteEl.textContent = t.tonnageNote;
  overRangeEl.hidden = !result.modelOverRange;
  if (result.modelOverRange) overRangeEl.textContent = t.overRangeNote;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (SWITCH_FIELDS.includes(field)) {
      inputs[field].checked = draft[field] === "true";
    } else if (inputs[field].value !== draft[field]) {
      inputs[field].value = draft[field];
    }
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
    renderResults(result, draft);
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

inputs.sizeUnit.addEventListener("change", () => {
  controller.edit({ sizeUnit: inputs.sizeUnit.value });
});
inputs.area.addEventListener("input", () => {
  controller.edit({ area: inputs.area.value });
});
inputs.occupants.addEventListener("input", () => {
  controller.edit({ occupants: inputs.occupants.value });
});
for (const field of SWITCH_FIELDS) {
  inputs[field].addEventListener("change", () => {
    controller.edit({ [field]: inputs[field].checked ? "true" : "false" });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.sizeUnit.focus();
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
