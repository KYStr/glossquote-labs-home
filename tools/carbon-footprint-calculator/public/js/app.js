// DOM wiring for the Carbon Footprint Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (carbon-footprint-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, CATEGORY_KEYS, FIELDS } from "./core/carbon-footprint.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const DECIMAL_FIELDS = FIELDS.filter((field) => field !== "carFuelType");

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      electricityKwhPerMonth: "每月用電",
      carKmPerYear: "開車里程",
      carFuelLPer100Km: "油耗",
      carFuelType: "燃料種類",
      busKmPerYear: "公車里程",
      railKmPerYear: "捷運／鐵路里程",
      flightShortKmPerYear: "短程飛行里程",
      flightLongKmPerYear: "長程飛行里程",
      dietBeefKgPerWeek: "牛肉",
      dietPorkKgPerWeek: "豬肉",
      dietPoultryKgPerWeek: "雞肉",
      dietFishKgPerWeek: "養殖魚",
      dietEggsKgPerWeek: "雞蛋",
      dietRiceKgPerWeek: "米",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      DECIMAL_FORMAT: "請輸入數字，最多 2 位小數，不含符號、空白或千分位逗號",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    fuelTypeSchema: "燃料種類只能選汽油或柴油",
    rangeError: {
      electricityKwhPerMonth: "每月用電須在 0 至 100000 度／月之間",
      carKmPerYear: "開車里程須在 0 至 500000 公里／年之間",
      carFuelLPer100Km: "油耗須在 0 至 100 公升／100 公里之間",
      busKmPerYear: "公車里程須在 0 至 1000000 公里／年之間",
      railKmPerYear: "捷運／鐵路里程須在 0 至 1000000 公里／年之間",
      flightShortKmPerYear: "短程飛行里程須在 0 至 1000000 公里／年之間",
      flightLongKmPerYear: "長程飛行里程須在 0 至 1000000 公里／年之間",
      dietBeefKgPerWeek: "牛肉須在 0 至 100 公斤／週之間",
      dietPorkKgPerWeek: "豬肉須在 0 至 100 公斤／週之間",
      dietPoultryKgPerWeek: "雞肉須在 0 至 100 公斤／週之間",
      dietFishKgPerWeek: "養殖魚須在 0 至 100 公斤／週之間",
      dietEggsKgPerWeek: "雞蛋須在 0 至 100 公斤／週之間",
      dietRiceKgPerWeek: "米須在 0 至 100 公斤／週之間",
    },
    statusEmpty: "尚未計算。輸入用電、交通與飲食資料，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（典型家戶合成案例），請按「計算年度碳足跡」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelTotalKg: "年度總量",
    labelTotalTonnes: "年度總量（公噸）",
    labelLargest: "占比最大類別",
    labelCategories: "類別拆解",
    categoryLabel: {
      electricity: "用電",
      car: "開車／騎車",
      bus: "公車",
      rail: "捷運／鐵路",
      flights: "飛行",
      diet: "飲食",
    },
    kgUnit: "公斤 CO2e",
    tonnesUnit: "公噸 CO2e",
    allZeroLargest: "—（全零輸入，各類別皆為 0.0）",
    successSummary: (result) => `年度總量 ${format1(result.totalKgCo2e)} 公斤 CO2e（${format1(result.totalTonnesCo2e)} 公噸）`,
    categoryValue: (entry) => `${format1(entry.kgCo2e)} 公斤 CO2e（${format1(entry.sharePct)}%）`,
    largestValue: (label, pct) => `${label}（${format1(pct)}%）`,
  },
  en: {
    fieldLabel: {
      electricityKwhPerMonth: "Electricity per month",
      carKmPerYear: "Driving distance",
      carFuelLPer100Km: "Fuel use",
      carFuelType: "Fuel type",
      busKmPerYear: "Bus distance",
      railKmPerYear: "Metro / rail distance",
      flightShortKmPerYear: "Short-haul flight distance",
      flightLongKmPerYear: "Long-haul flight distance",
      dietBeefKgPerWeek: "Beef",
      dietPorkKgPerWeek: "Pork",
      dietPoultryKgPerWeek: "Poultry",
      dietFishKgPerWeek: "Farmed fish",
      dietEggsKgPerWeek: "Eggs",
      dietRiceKgPerWeek: "Rice",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a number with at most 2 decimal places and no sign, space, or thousands separator.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    fuelTypeSchema: "Fuel type must be gasoline or diesel.",
    rangeError: {
      electricityKwhPerMonth: "Monthly electricity must be between 0 and 100000 kWh per month.",
      carKmPerYear: "Driving distance must be between 0 and 500000 km per year.",
      carFuelLPer100Km: "Fuel use must be between 0 and 100 litres per 100 km.",
      busKmPerYear: "Bus distance must be between 0 and 1000000 km per year.",
      railKmPerYear: "Metro / rail distance must be between 0 and 1000000 km per year.",
      flightShortKmPerYear: "Short-haul flight distance must be between 0 and 1000000 km per year.",
      flightLongKmPerYear: "Long-haul flight distance must be between 0 and 1000000 km per year.",
      dietBeefKgPerWeek: "Beef must be between 0 and 100 kg per week.",
      dietPorkKgPerWeek: "Pork must be between 0 and 100 kg per week.",
      dietPoultryKgPerWeek: "Poultry must be between 0 and 100 kg per week.",
      dietFishKgPerWeek: "Farmed fish must be between 0 and 100 kg per week.",
      dietEggsKgPerWeek: "Eggs must be between 0 and 100 kg per week.",
      dietRiceKgPerWeek: "Rice must be between 0 and 100 kg per week.",
    },
    statusEmpty: "Nothing calculated yet. Enter electricity, transport, and diet figures, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic typical-household case). Press “Calculate annual footprint” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelTotalKg: "Annual total",
    labelTotalTonnes: "Annual total (tonnes)",
    labelLargest: "Largest category",
    labelCategories: "Breakdown by category",
    categoryLabel: {
      electricity: "Electricity",
      car: "Driving",
      bus: "Bus",
      rail: "Metro / rail",
      flights: "Flights",
      diet: "Diet",
    },
    kgUnit: "kg CO2e",
    tonnesUnit: "tonnes CO2e",
    allZeroLargest: "— (all inputs are zero)",
    successSummary: (result) => `Annual total ${format1(result.totalKgCo2e)} kg CO2e (${format1(result.totalTonnesCo2e)} tonnes)`,
    categoryValue: (entry) => `${format1(entry.kgCo2e)} kg CO2e (${format1(entry.sharePct)}%)`,
    largestValue: (label, pct) => `${label} (${format1(pct)}%)`,
  },
};

// One-decimal display formatting. Result values are exact tenths, so
// toFixed(1) on them is deterministic and locale-independent.
function format1(value) {
  return value.toFixed(1);
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {};
for (const field of FIELDS) {
  inputs[field] = document.getElementById(`field-${field}`);
}
const fieldErrors = {};
for (const field of FIELDS) {
  fieldErrors[field] = document.getElementById(`error-${field}`);
}
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const categoryRows = document.getElementById("category-rows");
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

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = inputs[field];
  if (message === null) {
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  if (error.code === "SCHEMA" && error.field === "carFuelType") {
    return t.fuelTypeSchema;
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function appendSummaryRows(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    container.appendChild(div);
  }
}

function renderResult(result) {
  const rows = [
    [t.labelTotalKg, `${format1(result.totalKgCo2e)} ${t.kgUnit}`],
    [t.labelTotalTonnes, `${format1(result.totalTonnesCo2e)} ${t.tonnesUnit}`],
  ];
  if (result.totalKgCo2e === 0) {
    rows.push([t.labelLargest, t.allZeroLargest]);
  } else {
    let largestKey = CATEGORY_KEYS[0];
    for (const key of CATEGORY_KEYS) {
      if (result.categories[key].kgCo2e > result.categories[largestKey].kgCo2e) {
        largestKey = key;
      }
    }
    rows.push([
      t.labelLargest,
      t.largestValue(t.categoryLabel[largestKey], result.categories[largestKey].sharePct),
    ]);
  }
  appendSummaryRows(summaryRows, rows);
  appendSummaryRows(
    categoryRows,
    CATEGORY_KEYS.map((key) => [t.categoryLabel[key], t.categoryValue(result.categories[key])]),
  );
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
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
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
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
    renderResult(result);
    statusEl.textContent = t.successSummary(result);
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

for (const field of DECIMAL_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

inputs.carFuelType.addEventListener("change", () => {
  controller.edit({ carFuelType: inputs.carFuelType.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.electricityKwhPerMonth.focus();
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
  if (event.persisted) {
    controller.reset();
  }
});

render(controller.getState());
