// DOM wiring for the Highway Toll Calculator. All values are rendered
// with textContent / value only; the computation itself runs in a
// module Worker built from the fixed worker source.

import { REPORT_FILENAME, REPORT_LIMIT_BYTES, serializeReport } from "./core/toll.mjs";
import { createController } from "./controller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const lang = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    emptyField: {
      mode: "請選擇輸入方式。",
      vehicleType: "請選擇車種。",
      entry: "請選擇上交流道。",
      exit: "請選擇下交流道。",
      distanceKm: "請輸入里程。",
      priorKm: "請輸入今日已行駛里程。",
      etag: "請選擇是否使用 eTag。",
    },
    errors: {
      SCHEMA: "輸入格式不正確，請檢查後重新輸入。",
      INPUT_LIMIT: "輸入太長，請縮短後再試。",
      UNICODE: "輸入含有不完整的字元。",
      FORMAT: "輸入格式不正確，請檢查後重新輸入。",
      UNKNOWN_INTERCHANGE: "請選擇有效的交流道。",
      SAME_INTERCHANGE: "上下交流道不能相同。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
    },
    rangeField: {
      distanceKm: "里程需在 0.1 至 999.9 公里之間。",
      priorKm: "今日已行駛里程需在 0 至 999.9 公里之間。",
    },
    statusDirty: "輸入已變更，請重新執行",
    statusCancelled: "已取消，可重新執行",
    statusBusy: "處理中",
    statusFixField: "請修正標示的欄位後重新執行。",
    exampleNote: "目前是範例內容（台北至台中，153.5 公里）；按「計算通行費」執行。",
    summaryTotal: "應繳通行費",
    details: {
      distanceKm: "本趟里程",
      priorKm: "今日已行駛里程",
      totalKm: "當日累計里程",
      freeKm: "免費里程（每日 20 公里）",
      standardKm: "標準費率里程",
      discountedKm: "長途折扣里程（超過 200 公里）",
      rateStandard: "標準費率",
      rateLong: "長途費率",
      grossNt: "本趟未折金額",
      etagDiscount: "eTag 折扣",
      amountNt: "應繳通行費",
    },
    kmUnit: (n) => `${n} 公里`,
    rateUnit: (n) => `${n} 元／公里`,
    etagOn: "9 折",
    etagOff: "無",
    reportTooLarge: "報告超過大小上限，無法下載。",
  },
  en: {
    emptyField: {
      mode: "Choose how to enter the trip.",
      vehicleType: "Choose the vehicle type.",
      entry: "Choose the entry interchange.",
      exit: "Choose the exit interchange.",
      distanceKm: "Enter the distance.",
      priorKm: "Enter the distance already driven today.",
      etag: "Choose whether to use eTag.",
    },
    errors: {
      SCHEMA: "The input shape is not valid; check it and run again.",
      INPUT_LIMIT: "The input is too long; shorten it and try again.",
      UNICODE: "The input contains an incomplete character.",
      FORMAT: "The input format is not valid; check it and run again.",
      UNKNOWN_INTERCHANGE: "Choose a valid interchange.",
      SAME_INTERCHANGE: "The entry and exit interchanges must differ.",
      INTERNAL: "Processing failed. Try again.",
      WORKER_ERROR: "Processing failed. Try again.",
    },
    rangeField: {
      distanceKm: "The distance must be between 0.1 and 999.9 km.",
      priorKm: "The distance already driven today must be between 0 and 999.9 km.",
    },
    statusDirty: "Input changed. Run again.",
    statusCancelled: "Cancelled. You can run again.",
    statusBusy: "Working",
    statusFixField: "Fix the highlighted field and run again.",
    exampleNote:
      "Showing the worked example (Taipei to Taichung, 153.5 km). Press \u201CCalculate toll\u201D to run it.",
    summaryTotal: "Toll due",
    details: {
      distanceKm: "Trip distance",
      priorKm: "Distance already driven today",
      totalKm: "Total distance today",
      freeKm: "Free distance (20 km per day)",
      standardKm: "Standard-rate distance",
      discountedKm: "Long-distance discount distance (beyond 200 km)",
      rateStandard: "Standard rate",
      rateLong: "Long-distance rate",
      grossNt: "Trip amount before eTag discount",
      etagDiscount: "eTag discount",
      amountNt: "Toll due",
    },
    kmUnit: (n) => `${n} km`,
    rateUnit: (n) => `${n} per km`,
    etagOn: "10% off",
    etagOff: "None",
    reportTooLarge: "The report exceeds the size limit and cannot be downloaded.",
  },
};

const t = STRINGS[lang];

// Format a 1-decimal km number (the core returns tenths / 10).
function formatKm(value) {
  return t.kmUnit(value.toFixed(1));
}

// Format a money value with at most 3 decimals, trimming trailing zeros.
function formatMoney(value) {
  const trimmed = value.toFixed(3).replace(/\.?0+$/, "");
  return `NT$${trimmed === "" || trimmed === "-" ? "0" : trimmed}`;
}

function formatRate(value) {
  return t.rateUnit(value.toFixed(2));
}

const FIELD_NAMES = ["mode", "vehicleType", "entry", "exit", "distanceKm", "priorKm", "etag"];

const elements = {
  form: document.getElementById("toll-form"),
  modeDistance: document.getElementById("field-mode-distance"),
  modePair: document.getElementById("field-mode-pair"),
  modeDistanceFields: document.getElementById("mode-distance-fields"),
  modePairFields: document.getElementById("mode-pair-fields"),
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

for (const field of ["vehicleType", "entry", "exit", "distanceKm", "priorKm", "etag"]) {
  elements.inputs[field] = document.getElementById(`field-${field}`);
  elements.errors[field] = document.getElementById(`error-${field}`);
}
elements.inputs.mode = elements.modeDistance;
elements.errors.mode = document.getElementById("error-mode");

function errorMessage(error) {
  if (error.code === "EMPTY") return t.emptyField[error.field] ?? t.errors.SCHEMA;
  if (error.code === "RANGE" && error.field !== null && t.rangeField[error.field] !== undefined) {
    return t.rangeField[error.field];
  }
  return t.errors[error.code] ?? t.errors.WORKER_ERROR;
}

function focusField(field) {
  if (field === "mode") {
    elements.modeDistance.focus();
    return;
  }
  const input = elements.inputs[field];
  if (input !== null && input !== undefined) input.focus();
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

  elements.modeDistance.checked = draft.mode === "distance";
  elements.modePair.checked = draft.mode === "pair";
  elements.modeDistanceFields.hidden = draft.mode !== "distance";
  elements.modePairFields.hidden = draft.mode !== "pair";

  if (elements.inputs.vehicleType.value !== draft.vehicleType) {
    elements.inputs.vehicleType.value = draft.vehicleType;
  }
  if (elements.inputs.entry.value !== (draft.entry ?? "")) {
    elements.inputs.entry.value = draft.entry ?? "";
  }
  if (elements.inputs.exit.value !== (draft.exit ?? "")) {
    elements.inputs.exit.value = draft.exit ?? "";
  }
  if (elements.inputs.distanceKm.value !== (draft.distanceKm ?? "")) {
    elements.inputs.distanceKm.value = draft.distanceKm ?? "";
  }
  if (elements.inputs.priorKm.value !== draft.priorKm) {
    elements.inputs.priorKm.value = draft.priorKm;
  }
  elements.inputs.etag.checked = draft.etag === "true";

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
        if (submitted) focusField(state.error.field);
      }
      statusText = t.statusFixField;
    } else {
      statusText = message;
    }
  }

  if (state.state === "success" && state.result !== null) {
    const result = state.result;
    statusText = `${t.summaryTotal} ${formatMoney(result.amountNt)}`;
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
    summaryValue.textContent = formatMoney(result.amountNt);
    summaryRow.append(summaryLabel, summaryValue);
    elements.summary.append(summaryRow);

    elements.details.replaceChildren();
    const detailRows = [
      ["distanceKm", formatKm(result.distanceKm)],
      ["priorKm", formatKm(result.priorKm)],
      ["totalKm", formatKm(result.totalKm)],
      ["freeKm", formatKm(result.freeKm)],
      ["standardKm", formatKm(result.standardKm)],
      ["discountedKm", formatKm(result.discountedKm)],
      ["rateStandard", formatRate(result.rateStandard)],
      ["rateLong", formatRate(result.rateLong)],
      ["grossNt", formatMoney(result.grossNt)],
      ["etagDiscount", result.etagApplied ? t.etagOn : t.etagOff],
      ["amountNt", formatMoney(result.amountNt)],
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

function onModeChange(event) {
  const nextMode = event.target.value;
  if (nextMode === "pair") {
    // A pair trip derives its distance from the interchanges, so the
    // typed distance no longer applies.
    controller.edit({ mode: "pair", distanceKm: null });
  } else {
    const patch = { mode: "distance", entry: null, exit: null };
    if (latestState !== null && latestState.draft.distanceKm === null) {
      patch.distanceKm = "100";
    }
    controller.edit(patch);
  }
}

elements.modeDistance.addEventListener("change", onModeChange);
elements.modePair.addEventListener("change", onModeChange);
elements.inputs.vehicleType.addEventListener("change", (event) => {
  controller.edit({ vehicleType: event.target.value });
});
elements.inputs.entry.addEventListener("change", (event) => {
  controller.edit({ entry: event.target.value === "" ? null : event.target.value });
});
elements.inputs.exit.addEventListener("change", (event) => {
  controller.edit({ exit: event.target.value === "" ? null : event.target.value });
});
elements.inputs.distanceKm.addEventListener("input", (event) => {
  controller.edit({ distanceKm: event.target.value });
});
elements.inputs.priorKm.addEventListener("input", (event) => {
  controller.edit({ priorKm: event.target.value });
});
elements.inputs.etag.addEventListener("change", (event) => {
  controller.edit({ etag: event.target.checked ? "true" : "false" });
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
  elements.modeDistance.focus();
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
