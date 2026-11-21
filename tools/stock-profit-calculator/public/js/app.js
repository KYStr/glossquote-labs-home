// DOM wiring for the Stock Profit Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, sequence, and state machine; this file
// only renders it. The draft lives only in this page: there is no
// persistent storage, no network, and nothing is uploaded (SPEC
// implementation).

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatMoney2,
  formatMoneyInt,
  formatReturnPct,
  serializeReport,
} from "./core/stock-profit.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      DECIMAL_FORMAT: "數字格式不正確，請檢查小數位數",
      INTEGER_FORMAT: "請輸入整數",
      ENUM: "請選擇有效的選項",
      RANGE: "超出允許範圍",
      SELL_EXCEEDS_BUY: "賣出股數不可超過買入股數",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    netLabel: "淨損益",
    returnLabel: "報酬率",
    profitWord: "獲利",
    lossWord: "虧損",
    evenWord: "損益兩平",
    currency: "元",
    sharesUnit: "股",
    buyGrossLabel: "買入金額",
    buyFeeLabel: "買入手續費",
    buyTotalLabel: "買入總成本",
    sellGrossLabel: "賣出金額",
    sellFeeLabel: "賣出手續費",
    sellTaxLabel: "證券交易稅",
    sellNetLabel: "賣出淨額",
    costBasisLabel: "賣出部分成本",
    remainingLabel: "剩餘股數",
    breakevenLabel: "損益兩平賣出價",
    effectiveTaxLabel: "適用證交稅率",
    disclaimer:
      "試算結果不構成投資建議；費率、稅率與最低費可能調整，實際收費以券商對帳單為準。",
    exampleNote: "已載入範例，請按「計算損益」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Check the number format and decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      ENUM: "Choose a valid option.",
      RANGE: "Out of range.",
      SELL_EXCEEDS_BUY: "Sell shares cannot exceed buy shares.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    netLabel: "Net profit / loss",
    returnLabel: "Return",
    profitWord: "Profit",
    lossWord: "Loss",
    evenWord: "Breakeven",
    currency: "NT$",
    sharesUnit: "shares",
    buyGrossLabel: "Buy gross",
    buyFeeLabel: "Buy brokerage fee",
    buyTotalLabel: "Total buy cost",
    sellGrossLabel: "Sell gross",
    sellFeeLabel: "Sell brokerage fee",
    sellTaxLabel: "Securities transaction tax",
    sellNetLabel: "Sell net proceeds",
    costBasisLabel: "Cost basis of shares sold",
    remainingLabel: "Remaining shares",
    breakevenLabel: "Breakeven sell price",
    effectiveTaxLabel: "Effective transaction tax rate",
    disclaimer:
      "Results are estimates, not investment advice. Rates and minimum fees may change; your broker's statement governs.",
    exampleNote: "Example loaded. Run “Calculate profit & loss” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("stock-profit-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const netEl = document.getElementById("net-value");
const returnEl = document.getElementById("return-value");
const profitWordEl = document.getElementById("profit-word");
const breakdown = {};
for (const id of [
  "buy-gross",
  "buy-fee",
  "buy-total",
  "sell-gross",
  "sell-fee",
  "sell-tax",
  "sell-net",
  "cost-basis",
  "remaining-shares",
  "breakeven",
  "effective-tax",
]) {
  breakdown[id] = document.getElementById(`result-${id}`);
}
const disclaimerEl = document.getElementById("disclaimer");
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

function money2(value) {
  return `NT$ ${formatMoney2(value)}`;
}

function moneyInt(value) {
  return `NT$ ${formatMoneyInt(value)}`;
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
    const sign = result.netProfitLoss > 0 ? "+" : result.netProfitLoss < 0 ? "−" : "";
    netEl.textContent = `${t.netLabel}：${sign}${moneyInt(Math.abs(result.netProfitLoss))}`;
    returnEl.textContent = `${t.returnLabel}：${formatReturnPct(result.returnPct)}`;
    profitWordEl.textContent =
      result.netProfitLoss > 0 ? t.profitWord : result.netProfitLoss < 0 ? t.lossWord : t.evenWord;
    breakdown["buy-gross"].textContent = money2(result.buyGross);
    breakdown["buy-fee"].textContent = moneyInt(result.buyFee);
    breakdown["buy-total"].textContent = money2(result.buyTotal);
    breakdown["sell-gross"].textContent = money2(result.sellGross);
    breakdown["sell-fee"].textContent = moneyInt(result.sellFee);
    breakdown["sell-tax"].textContent = moneyInt(result.sellTax);
    breakdown["sell-net"].textContent = money2(result.sellNet);
    breakdown["cost-basis"].textContent = money2(result.costBasisSold);
    breakdown["remaining-shares"].textContent = `${result.remainingShares} ${t.sharesUnit}`;
    breakdown["breakeven"].textContent = money2(result.breakevenPrice);
    breakdown["effective-tax"].textContent = `${result.effectiveTaxRatePct}%`;
    disclaimerEl.textContent = t.disclaimer;
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
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
  inputs[field].addEventListener("change", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.buyPrice.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
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
