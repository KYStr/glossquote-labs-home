// DOM wiring for the Taiwan Water Bill Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, sequence, and state machine; this file only renders
// it. No draft is persisted anywhere: the SPEC forbids persistent
// storage, and leaving the page discards the draft.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatMoneyMilliNt,
  formatUsage,
  serializeReport,
} from "./core/taiwan-water-bill.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      INTEGER_FORMAT: "度數請用整數",
      DECIMAL_FORMAT: "費率請用數字，整數或最多兩位小數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    cycleName: { monthly: "每月抄表", bimonthly: "隔月抄表" },
    resultHeading: "費用明細",
    totalLabel: "應繳總額",
    totalUnit: "元",
    echoLine: (cycleName, diameterMm, usageM3) =>
      `${cycleName} · ${diameterMm} 公厘 · ${formatUsage(usageM3)} 度`,
    tierHeading: "逐段用水費",
    tierHeaderTier: "段別",
    tierHeaderDegrees: "度數",
    tierHeaderUnit: "單價（元／度）",
    tierHeaderSubtotal: "小計（元）",
    tierName: (tier) => `第 ${tier} 段`,
    basicLabel: "基本費",
    usageLabel: "用水費",
    subtotalLabel: "水費小計",
    wrccLabel: "水源保育與回饋費",
    sewerLabel: "污水下水道使用費",
    wasteLabel: "清除處理費",
    taxLabel: "內含營業稅（已內含，不另加收）",
    notIncluded: "未計入",
    levyRateNote: (rate) => `費率 ${rate} 元／度`,
    roundingNote:
      "明細以精確值計算，總額依官方規定四捨五入至元；內含營業稅只作資訊列，不另加收。",
    exampleNote: "已載入範例，請按「計算水費」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      INTEGER_FORMAT: "Enter the usage as a whole number.",
      DECIMAL_FORMAT: "Enter the rate as a number, with at most two decimal places.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    cycleName: { monthly: "Monthly reading", bimonthly: "Every two months" },
    resultHeading: "Charge breakdown",
    totalLabel: "Total payable",
    totalUnit: "NT$",
    echoLine: (cycleName, diameterMm, usageM3) =>
      `${cycleName} · ${diameterMm} mm · ${formatUsage(usageM3)} m³`,
    tierHeading: "Tiered usage charge",
    tierHeaderTier: "Tier",
    tierHeaderDegrees: "Degrees",
    tierHeaderUnit: "Unit price (NT$/m³)",
    tierHeaderSubtotal: "Subtotal (NT$)",
    tierName: (tier) => `Tier ${tier}`,
    basicLabel: "Basic charge",
    usageLabel: "Usage charge",
    subtotalLabel: "Water subtotal",
    wrccLabel: "Water conservation and feedback levy",
    sewerLabel: "Sewer usage fee",
    wasteLabel: "Waste treatment fee",
    taxLabel: "Business tax included (included; not added)",
    notIncluded: "Not included",
    levyRateNote: (rate) => `Rate ${rate} NT$/m³`,
    roundingNote:
      "Line items are computed from exact values; the total is rounded to the nearest yuan per the official rule. Business tax is an information row only and is never added.",
    exampleNote: "Example loaded. Run “Calculate water bill” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("water-bill-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const totalEl = document.getElementById("total-value");
const echoEl = document.getElementById("result-echo");
const tiersBodyEl = document.getElementById("tiers-body");
const breakdownEl = document.getElementById("breakdown-list");
const roundingNoteEl = document.getElementById("rounding-note");
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

function addBreakdownRow(label, valueText, isTotal) {
  const row = document.createElement("div");
  row.className = isTotal ? "breakdown-row breakdown-total" : "breakdown-row";
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.textContent = valueText;
  row.append(labelEl, valueEl);
  breakdownEl.append(row);
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
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
    totalEl.textContent = `${formatMoneyMilliNt(result.totalPayableMilliNt)} ${t.totalUnit}`;
    echoEl.textContent = t.echoLine(
      t.cycleName[result.cycle],
      result.diameterMm,
      result.usageM3,
    );
    tiersBodyEl.replaceChildren();
    for (const tier of result.tiers) {
      const row = document.createElement("tr");
      const tierCell = document.createElement("td");
      tierCell.textContent = t.tierName(tier.tier);
      const degreesCell = document.createElement("td");
      degreesCell.textContent = formatUsage(tier.degrees);
      const unitCell = document.createElement("td");
      unitCell.textContent = formatMoneyMilliNt(tier.unitPriceMilliNt);
      const subtotalCell = document.createElement("td");
      subtotalCell.textContent = formatMoneyMilliNt(tier.subtotalMilliNt);
      row.append(tierCell, degreesCell, unitCell, subtotalCell);
      tiersBodyEl.append(row);
    }
    breakdownEl.replaceChildren();
    addBreakdownRow(t.basicLabel, `${formatMoneyMilliNt(result.basicFeeMilliNt)} ${t.totalUnit}`, false);
    addBreakdownRow(t.usageLabel, `${formatMoneyMilliNt(result.usageChargeMilliNt)} ${t.totalUnit}`, false);
    addBreakdownRow(t.subtotalLabel, `${formatMoneyMilliNt(result.waterSubtotalMilliNt)} ${t.totalUnit}`, false);
    addBreakdownRow(t.wrccLabel, `${formatMoneyMilliNt(result.wrccMilliNt)} ${t.totalUnit}`, false);
    if (result.sewerFeeMilliNt === null) {
      addBreakdownRow(t.sewerLabel, t.notIncluded, false);
    } else {
      addBreakdownRow(
        `${t.sewerLabel}（${t.levyRateNote(result.sewerRateNt)}）`,
        `${formatMoneyMilliNt(result.sewerFeeMilliNt)} ${t.totalUnit}`,
        false,
      );
    }
    if (result.wasteFeeMilliNt === null) {
      addBreakdownRow(t.wasteLabel, t.notIncluded, false);
    } else {
      addBreakdownRow(
        `${t.wasteLabel}（${t.levyRateNote(result.wasteRateNt)}）`,
        `${formatMoneyMilliNt(result.wasteFeeMilliNt)} ${t.totalUnit}`,
        false,
      );
    }
    addBreakdownRow(t.taxLabel, `${formatMoneyMilliNt(result.businessTaxMilliNt)} ${t.totalUnit}`, false);
    addBreakdownRow(t.totalLabel, `${formatMoneyMilliNt(result.totalPayableMilliNt)} ${t.totalUnit}`, true);
    roundingNoteEl.textContent = t.roundingNote;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      }
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

for (const field of ["usageM3", "sewerRateNt", "wasteRateNt"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
for (const field of ["cycle", "diameterMm"]) {
  inputs[field].addEventListener("change", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.cycle.focus();
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
