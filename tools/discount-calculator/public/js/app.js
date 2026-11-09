// DOM wiring for the Discount Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatMoney,
  formatPercentBp,
  formatZheDisplay,
  serializeReport,
} from "./core/discount.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      price: "原價（單件）",
      discount1: "第一重折扣 %",
      discount2: "第二重折扣 %",
      coupon: "折價券",
      taxRate: "稅率 %（折扣後加計）",
      quantity: "數量",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      MONEY_FORMAT: "金額請用數字，最多兩位小數",
      PERCENT_FORMAT: "百分比請用數字，最多兩位小數",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "明細太大，無法下載",
    },
    statusEmpty: "尚未計算。請輸入價格與折扣，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算折扣」執行。",
    stepLabel: {
      list: "原價",
      discount1: "第一重折扣",
      discount2: "第二重折扣",
      coupon: "折價券",
      tax: "稅金",
    },
    offSuffix: "",
    summary: (result, quantity) =>
      `最終單價 ${formatMoney(result.unitFinalCents)}，總價 ${formatMoney(result.totalCents)}（共 ${quantity} 件，原價總額 ${formatMoney(result.listTotalCents)}），共省 ${formatMoney(result.totalSavedCents)}，有效折扣 ${result.effectiveOffPercent}%，約 ${formatZheDisplay(result.zhe)} 折。`,
  },
  en: {
    fieldLabel: {
      price: "List price (per item)",
      discount1: "First discount, % off",
      discount2: "Second discount, % off",
      coupon: "Coupon",
      taxRate: "Tax rate % (applied after discounts)",
      quantity: "Quantity",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      MONEY_FORMAT: "Enter an amount with at most two decimal places.",
      PERCENT_FORMAT: "Enter a percentage with at most two decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The breakdown is too large to download.",
    },
    statusEmpty: "Nothing calculated yet. Enter a price and discounts, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate discount” to compute it.",
    stepLabel: {
      list: "List price",
      discount1: "First discount",
      discount2: "Second discount",
      coupon: "Coupon",
      tax: "Tax",
    },
    offSuffix: " off",
    summary: (result, quantity) =>
      `Final unit price ${formatMoney(result.unitFinalCents)}; total ${formatMoney(result.totalCents)} for ${quantity} item${quantity === 1 ? "" : "s"} (list total ${formatMoney(result.listTotalCents)}); total saved ${formatMoney(result.totalSavedCents)}; effective ${result.effectiveOffPercent}% off; about ${formatZheDisplay(result.zhe)} zhe.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("discount-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("step-rows");
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

function stepCells(step) {
  if (step.kind === "list") return ["—", "—", formatMoney(step.priceCents)];
  if (step.kind === "discount1" || step.kind === "discount2") {
    return [
      `${formatPercentBp(step.offBp)}%${t.offSuffix}`,
      `-${formatMoney(step.savedCents)}`,
      formatMoney(step.priceCents),
    ];
  }
  if (step.kind === "coupon") {
    return ["—", `-${formatMoney(step.appliedCents)}`, formatMoney(step.priceCents)];
  }
  return [
    `${formatPercentBp(step.rateBp)}%`,
    `+${formatMoney(step.taxCents)}`,
    formatMoney(step.priceCents),
  ];
}

function renderSteps(result) {
  tableBody.replaceChildren();
  for (const step of result.steps) {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = t.stepLabel[step.kind];
    tr.appendChild(labelCell);
    for (const value of stepCells(step)) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
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
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
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
    const quantity = Number.parseInt(draft.quantity, 10);
    summaryEl.textContent = t.summary(result, quantity);
    statusEl.textContent = summaryEl.textContent;
    renderSteps(result);
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
  inputs.price.focus();
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
