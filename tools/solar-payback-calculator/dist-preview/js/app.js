// DOM wiring for the Solar Payback Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (solar-payback-calculator-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob URL
// is revoked within 30 seconds or as soon as the result is
// invalidated.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS, m2ToPing } from "./core/solar-payback.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      systemKwp: "裝置容量",
      roofAreaM2: "屋頂面積",
      sunHours: "年日照時數",
      installCost: "建置成本",
      fitRate: "躉購費率",
      selfUsePct: "自用比例",
      retailPrice: "零售電價",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      EMPTY: "此欄不可空白",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    decimalError: {
      systemKwp: "裝置容量小數最多 2 位，請輸入十進位數字",
      roofAreaM2: "屋頂面積小數最多 2 位，請輸入十進位數字",
      sunHours: "年日照時數小數最多 1 位，請輸入十進位數字",
      installCost: "建置成本須為整數，請勿輸入小數",
      fitRate: "躉購費率小數最多 4 位，請輸入十進位數字",
      selfUsePct: "自用比例小數最多 1 位，請輸入十進位數字",
      retailPrice: "零售電價小數最多 2 位，請輸入十進位數字",
    },
    rangeError: {
      systemKwp: "裝置容量須在 0.1 至 500 kWp 之間",
      roofAreaM2: "屋頂面積須在 1 至 100,000 m² 之間",
      sunHours: "年日照時數須在 500 至 2,000 小時/年之間",
      installCost: "建置成本須在 1 至 100,000,000 元之間",
      fitRate: "躉購費率須在 0.0001 至 20 元/度之間",
      selfUsePct: "自用比例須在 0 至 100% 之間",
      retailPrice: "零售電價須在 0.01 至 20 元/度之間",
    },
    statusEmpty: "尚未試算。輸入裝置容量、屋頂面積、年日照時數與建置成本，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例：9 kWp 屋頂、自用 30%），請按「計算回本」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelGeneration: "年發電量",
    labelBenefit: "年總收益",
    labelPayback: "回本年數",
    labelSelfUsed: "自用電量",
    labelExported: "售電度數",
    labelExportRevenue: "售電收入",
    labelSelfUseSaving: "自用節省",
    labelFitRate: "躉購費率",
    labelTotal20: "20 年總收益",
    labelNet20: "20 年淨收益",
    labelRequiredRoof: "所需屋頂面積",
    labelRoofArea: "屋頂面積",
    labelMaxFeasible: "最大可裝容量",
    fitSourceTable: "級距表",
    fitSourceOverride: "自填覆寫",
    roofWarning: (result, draft) =>
      `⚠ 屋頂面積不足：需要 ${result.requiredRoofAreaM2} m²，現有 ${draft.roofAreaM2} m²，最多可裝 ${result.maxFeasibleKwp} kWp。請改小裝置容量再算。`,
    beyondNote: (result) =>
      `⚠ 回本需要約 ${result.paybackYears} 年，超過躉購 20 年期間；20 年淨收益為負，請審慎評估。`,
    successSummary: (result) =>
      `年發電量 ${formatInt(result.annualGenerationKwh)} 度，年收益 ${formatInt(result.annualBenefitTwd)} 元，回本約 ${result.paybackYears} 年`,
    unitKwhYear: (value) => `${formatInt(value)} 度/年`,
    unitKwh: (value) => `${formatInt(value)} 度`,
    unitTwdYear: (value) => `${formatInt(value)} 元/年`,
    unitTwd: (value) => `${formatInt(value)} 元`,
    unitYears: (value) => `${value} 年`,
    unitKwp: (value) => `${value} kWp`,
    unitM2: (valueText, ping) => `${valueText} m²（約 ${ping} 坪）`,
    unitFitRate: (value, source) => `${value} 元/度（${source}）`,
  },
  en: {
    fieldLabel: {
      systemKwp: "System capacity",
      roofAreaM2: "Roof area",
      sunHours: "Annual sun hours",
      installCost: "Installation cost",
      fitRate: "Feed-in tariff",
      selfUsePct: "Self-use ratio",
      retailPrice: "Retail electricity price",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      EMPTY: "This field is required.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    decimalError: {
      systemKwp: "System capacity allows at most 2 decimal places. Enter a decimal number.",
      roofAreaM2: "Roof area allows at most 2 decimal places. Enter a decimal number.",
      sunHours: "Annual sun hours allow at most 1 decimal place. Enter a decimal number.",
      installCost: "Installation cost must be a whole number with no decimals.",
      fitRate: "Feed-in tariff allows at most 4 decimal places. Enter a decimal number.",
      selfUsePct: "Self-use ratio allows at most 1 decimal place. Enter a decimal number.",
      retailPrice: "Retail electricity price allows at most 2 decimal places. Enter a decimal number.",
    },
    rangeError: {
      systemKwp: "System capacity must be between 0.1 and 500 kWp.",
      roofAreaM2: "Roof area must be between 1 and 100,000 m².",
      sunHours: "Annual sun hours must be between 500 and 2,000 hours/year.",
      installCost: "Installation cost must be between NT$1 and NT$100,000,000.",
      fitRate: "Feed-in tariff must be between NT$0.0001 and NT$20 per kWh.",
      selfUsePct: "Self-use ratio must be between 0 and 100%.",
      retailPrice: "Retail electricity price must be between NT$0.01 and NT$20 per kWh.",
    },
    statusEmpty: "Nothing calculated yet. Enter system capacity, roof area, annual sun hours and installation cost, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case: 9 kWp rooftop, 30% self-use). Press “Calculate payback” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelGeneration: "Annual generation",
    labelBenefit: "Annual benefit",
    labelPayback: "Payback years",
    labelSelfUsed: "Self-used electricity",
    labelExported: "Exported electricity",
    labelExportRevenue: "Export revenue",
    labelSelfUseSaving: "Self-use saving",
    labelFitRate: "Feed-in tariff",
    labelTotal20: "20-year total benefit",
    labelNet20: "20-year net benefit",
    labelRequiredRoof: "Required roof area",
    labelRoofArea: "Roof area",
    labelMaxFeasible: "Largest capacity that fits",
    fitSourceTable: "tariff table",
    fitSourceOverride: "manual override",
    roofWarning: (result, draft) =>
      `⚠ Roof area is not enough: ${result.requiredRoofAreaM2} m² needed, ${draft.roofAreaM2} m² available; at most ${result.maxFeasibleKwp} kWp fits. Lower the system capacity and calculate again.`,
    beyondNote: (result) =>
      `⚠ Payback takes about ${result.paybackYears} years, beyond the 20-year feed-in tariff period; the 20-year net benefit is negative. Please evaluate carefully.`,
    successSummary: (result) =>
      `Annual generation ${formatInt(result.annualGenerationKwh)} kWh, annual benefit NT$${formatInt(result.annualBenefitTwd)}, payback about ${result.paybackYears} years`,
    unitKwhYear: (value) => `${formatInt(value)} kWh/year`,
    unitKwh: (value) => `${formatInt(value)} kWh`,
    unitTwdYear: (value) => `NT$${formatInt(value)}/year`,
    unitTwd: (value) => `NT$${formatInt(value)}`,
    unitYears: (value) => `${value} years`,
    unitKwp: (value) => `${value} kWp`,
    unitM2: (valueText, ping) => `${valueText} m² (about ${ping} ping)`,
    unitFitRate: (value, source) => `NT$${value}/kWh (${source})`,
  },
};

function formatInt(value) {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Groups the integer part of a decimal string without rounding it:
// "80" -> "80", "80.55" -> "80.55", "100000" -> "100,000". Used for
// echoing the user's own roof-area input in the results.
function formatDecimalString(raw) {
  const [intPart, fracPart] = String(raw).split(".");
  const grouped = formatInt(Number(intPart));
  return fracPart === undefined ? grouped : `${grouped}.${fracPart}`;
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const detailRows = document.getElementById("detail-rows");
const roofNoteEl = document.getElementById("roof-note");
const beyondNoteEl = document.getElementById("beyond-note");
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
  if (error.code === "DECIMAL_FORMAT" && error.field !== null && t.decimalError[error.field]) {
    return t.decimalError[error.field];
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

function renderResult(result, draft) {
  appendSummaryRows(summaryRows, [
    [t.labelGeneration, t.unitKwhYear(result.annualGenerationKwh)],
    [t.labelBenefit, t.unitTwdYear(result.annualBenefitTwd)],
    [t.labelPayback, t.unitYears(result.paybackYears.toFixed(1))],
  ]);
  const fitSourceText =
    result.fitSource === "table" ? t.fitSourceTable : t.fitSourceOverride;
  const requiredPing = m2ToPing(String(result.requiredRoofAreaM2));
  const roofPing = m2ToPing(draft.roofAreaM2);
  appendSummaryRows(detailRows, [
    [t.labelSelfUsed, t.unitKwh(result.selfUsedKwh)],
    [t.labelExported, t.unitKwh(result.exportedKwh)],
    [t.labelExportRevenue, t.unitTwd(result.exportRevenueTwd)],
    [t.labelSelfUseSaving, t.unitTwd(result.selfUseSavingTwd)],
    [t.labelFitRate, t.unitFitRate(result.fitRateApplied, fitSourceText)],
    [t.labelTotal20, t.unitTwd(result.total20BenefitTwd)],
    [t.labelNet20, t.unitTwd(result.net20Twd)],
    [t.labelRequiredRoof, t.unitM2(formatDecimalString(result.requiredRoofAreaM2.toFixed(1)), requiredPing ?? "—")],
    [t.labelRoofArea, t.unitM2(formatDecimalString(draft.roofAreaM2), roofPing ?? "—")],
    [t.labelMaxFeasible, t.unitKwp(result.maxFeasibleKwp.toFixed(1))],
  ]);
  roofNoteEl.hidden = result.roofWarning !== "ROOF_TIGHT";
  if (result.roofWarning === "ROOF_TIGHT") roofNoteEl.textContent = t.roofWarning(result, draft);
  beyondNoteEl.hidden = result.beyondContract !== true;
  if (result.beyondContract === true) beyondNoteEl.textContent = t.beyondNote(result);
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
    renderResult(result, draft);
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

for (const field of FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.systemKwp.focus();
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
