// DOM wiring for the EV Charging Calculator. All arithmetic, validation
// and report serialization live in the pure core modules; this file only
// reads fields with value, renders with textContent, and drives the
// controller state machine.

import {
  DEFAULT_INPUT,
  FIELD_ORDER,
  buildReport,
  formatDuration,
} from "./core/ev-charging.mjs";
import { createController } from "./core/controller.mjs";

const locale = document.documentElement.lang === "en" ? "en" : "zh-Hant";

const MESSAGES = {
  "zh-Hant": {
    empty: "輸入充電條件，或載入範例。",
    dirty: "輸入已變更，請重新執行。",
    busy: "處理中",
    success: "試算完成。",
    cancelled: "已取消，可重新執行。",
    exampleLoaded: "已載入範例，請按「計算充電時間」執行。",
    downloaded: "報告已下載。",
    errors: {
      SCHEMA: "輸入格式不正確，請檢查所有欄位。",
      INPUT_LIMIT: "輸入太長（最多 12 個字元）。",
      UNICODE: "輸入含有不完整的字元。",
      EMPTY: "此欄必填。",
      DECIMAL_FORMAT: "請輸入至多 2 位小數的數字。",
      INTEGER_FORMAT: "請輸入整數。",
      SOC_ORDER: "目標電量不可低於目前電量。",
      INTERNAL: "計算發生問題，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載。",
      RANGE: {
        capacityKwh: "電池容量須大於 0 且不超過 500。",
        currentSoc: "目前電量須介於 0 到 100。",
        targetSoc: "目標電量須介於 0 到 100。",
        chargerPowerKw: "充電功率須大於 0 且不超過 1000。",
        efficiencyPct: "充電效率須介於 50 到 100。",
        pricePerKwh: "每度電價須介於 0 到 100。",
      },
    },
  },
  en: {
    empty: "Enter charging details, or load the example.",
    dirty: "Input changed. Run again.",
    busy: "Working",
    success: "Estimate ready.",
    cancelled: "Cancelled. You can run again.",
    exampleLoaded: "Example loaded. Choose “Calculate charging estimate” to run it.",
    downloaded: "Report downloaded.",
    errors: {
      SCHEMA: "The input shape is not valid. Check every field.",
      INPUT_LIMIT: "Input is too long (12 characters at most).",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with at most 2 decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      SOC_ORDER: "Target charge cannot be below the current charge.",
      INTERNAL: "Something went wrong. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
      RANGE: {
        capacityKwh: "Battery capacity must be above 0 and at most 500.",
        currentSoc: "Current charge must be between 0 and 100.",
        targetSoc: "Target charge must be between 0 and 100.",
        chargerPowerKw: "Charger power must be above 0 and at most 1000.",
        efficiencyPct: "Charging efficiency must be between 50 and 100.",
        pricePerKwh: "Price per kWh must be between 0 and 100.",
      },
    },
  },
};

const messages = MESSAGES[locale];
const EXAMPLE_INPUT = Object.freeze({
  capacityKwh: "60",
  currentSoc: "20",
  targetSoc: "80",
  chargerPowerKw: "7",
  efficiencyPct: "90",
  pricePerKwh: "",
});

const controls = document.querySelector("#tool-controls");
const unsupportedNote = document.querySelector("#unsupported-note");
const form = document.querySelector("#tool-form");
const statusElement = document.querySelector("#tool-status");
const resultsSection = document.querySelector("#results");
const zeroNote = document.querySelector("#zero-note");
const costRow = document.querySelector("#cost-row");
const downloadButton = document.querySelector("#download-button");
const cancelButton = document.querySelector("#cancel-button");

const inputs = {};
const errorElements = {};
for (const field of FIELD_ORDER) {
  inputs[field] = document.querySelector(`#input-${field}`);
  errorElements[field] = document.querySelector(`#error-${field}`);
}
const resultElements = {
  battery: document.querySelector("#result-battery"),
  wall: document.querySelector("#result-wall"),
  time: document.querySelector("#result-time"),
  cost: document.querySelector("#result-cost"),
};

function errorText(error) {
  if (error.code === "RANGE") {
    return messages.errors.RANGE[error.field] ?? messages.errors.RANGE.capacityKwh;
  }
  return messages.errors[error.code] ?? messages.errors.INTERNAL;
}

function readDraft() {
  const draft = {};
  for (const field of FIELD_ORDER) draft[field] = inputs[field].value;
  return draft;
}

function writeDraft(draft) {
  for (const field of FIELD_ORDER) inputs[field].value = draft[field];
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

let focusErrorOnSettle = false;

function render(snapshot) {
  const { state, result, error, reportAvailable } = snapshot;

  form.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelButton.hidden = state !== "busy";

  for (const field of FIELD_ORDER) {
    const showError = state === "error" && error !== null && error.field === field;
    inputs[field].setAttribute("aria-invalid", showError ? "true" : "false");
    if (showError) {
      errorElements[field].textContent = errorText(error);
      errorElements[field].hidden = false;
    } else {
      errorElements[field].textContent = "";
      errorElements[field].hidden = true;
    }
  }

  if (state === "success" && result !== null) {
    resultsSection.hidden = false;
    zeroNote.hidden = result.needsCharge;
    resultElements.battery.textContent = result.energyBatteryKwh;
    resultElements.wall.textContent = result.energyWallKwh;
    resultElements.time.textContent = formatDuration(result.timeMinutes, locale);
    costRow.hidden = result.cost === null;
    resultElements.cost.textContent = result.cost === null ? "" : String(result.cost);
  } else {
    resultsSection.hidden = true;
  }
  downloadButton.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();

  if (state === "error" && error !== null && error.field === null) {
    statusElement.textContent = errorText(error);
  } else if (state === "empty") {
    statusElement.textContent = messages.empty;
  } else if (state === "dirty") {
    statusElement.textContent = messages.dirty;
  } else if (state === "busy") {
    statusElement.textContent = messages.busy;
  } else if (state === "success") {
    statusElement.textContent = messages.success;
  } else if (state === "cancelled") {
    statusElement.textContent = messages.cancelled;
  } else {
    statusElement.textContent = "";
  }

  if (focusErrorOnSettle && state === "error") {
    focusErrorOnSettle = false;
    const target = error !== null && error.field !== null ? inputs[error.field] : inputs.capacityKwh;
    target.focus();
  }
  if (state !== "error") focusErrorOnSettle = state === "busy" ? focusErrorOnSettle : false;
}

const controller = createController({ onChange: render });

form.addEventListener("input", () => {
  controller.edit(readDraft());
});

for (const button of document.querySelectorAll("[data-power]")) {
  button.addEventListener("click", () => {
    inputs.chargerPowerKw.value = button.getAttribute("data-power") ?? "";
    controller.edit(readDraft());
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusErrorOnSettle = true;
  controller.execute();
});

document.querySelector("#example-button").addEventListener("click", () => {
  writeDraft(EXAMPLE_INPUT);
  controller.edit(readDraft());
  statusElement.textContent = messages.exampleLoaded;
});

document.querySelector("#reset-button").addEventListener("click", () => {
  controller.reset();
  writeDraft({ ...DEFAULT_INPUT });
  inputs.capacityKwh.focus();
});

cancelButton.addEventListener("click", () => {
  controller.cancel();
});

downloadButton.addEventListener("click", () => {
  const snapshot = controller.getSnapshot();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusElement.textContent = errorText(report.error);
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
  statusElement.textContent = messages.downloaded;
});

window.addEventListener("pagehide", () => {
  if (controller.getSnapshot().state === "busy") controller.cancel();
  revokeReportUrl();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    writeDraft({ ...DEFAULT_INPUT });
  }
});

if (unsupportedNote) unsupportedNote.hidden = true;
controls.disabled = false;
render(controller.getSnapshot());
