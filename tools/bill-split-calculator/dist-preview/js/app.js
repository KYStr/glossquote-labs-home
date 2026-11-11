// DOM wiring for the Bill Split Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatMoney,
  serializeReport,
} from "./core/bill-split.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const TEXT_FIELDS = ["bill", "taxPercent", "tipPercent", "people"];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      bill: "帳單金額",
      taxPercent: "稅率 %",
      tipPercent: "小費比例 %",
      tipBase: "小費計算基數",
      people: "人數",
    },
    tipBaseLabel: { "pre-tax": "稅前金額", "post-tax": "稅後金額" },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      INTEGER_FORMAT: "請輸入整數",
      ENUM: "請選擇小費計算基數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    decimalError: {
      bill: "金額請用數字，最多兩位小數",
      taxPercent: "百分比請用數字，最多三位小數",
      tipPercent: "百分比請用數字，最多三位小數",
    },
    statusEmpty: "尚未計算。請輸入帳單，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「計算每人應付」執行。",
    checkLine: "每人金額加總與總計相同",
    personLabel: (n) => `第 ${n} 人`,
    summary: (result, baseLabel) =>
      `稅額 ${formatMoney(result.taxCents)}；小費 ${formatMoney(result.tipCents)}（基數為${baseLabel} ${formatMoney(result.tipBaseCents)}）；總計 ${formatMoney(result.totalCents)}。`,
  },
  en: {
    fieldLabel: {
      bill: "Bill amount",
      taxPercent: "Tax rate %",
      tipPercent: "Tip percent %",
      tipBase: "Tip base",
      people: "People",
    },
    tipBaseLabel: { "pre-tax": "Pre-tax amount", "post-tax": "Post-tax amount" },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number.",
      ENUM: "Choose a tip base.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    decimalError: {
      bill: "Enter an amount with at most two decimal places.",
      taxPercent: "Enter a percentage with at most three decimal places.",
      tipPercent: "Enter a percentage with at most three decimal places.",
    },
    statusEmpty: "Nothing calculated yet. Enter the bill, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate per-person amounts” to compute it.",
    checkLine: "The per-person amounts add up to the total.",
    personLabel: (n) => `Person ${n}`,
    summary: (result, baseLabel) =>
      `Tax ${formatMoney(result.taxCents)}; tip ${formatMoney(result.tipCents)} (base: ${baseLabel} ${formatMoney(result.tipBaseCents)}); total ${formatMoney(result.totalCents)}.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("bill-form");
const inputs = {};
for (const field of TEXT_FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const tipBaseRadios = {
  "pre-tax": document.getElementById("field-tipBase-pre-tax"),
  "post-tax": document.getElementById("field-tipBase-post-tax"),
};
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const checkLineEl = document.getElementById("check-line");
const tableBody = document.getElementById("share-rows");
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

function errorMessage(field, code) {
  if (code === "DECIMAL_FORMAT") return t.decimalError[field] ?? t.error.INTERNAL;
  return t.error[code] ?? t.error.INTERNAL;
}

function errorAnchor(field) {
  if (field === "tipBase") return tipBaseRadios["pre-tax"];
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  if (message === null) {
    errorEl.textContent = "";
    if (field === "tipBase") {
      for (const radio of Object.values(tipBaseRadios)) {
        radio.removeAttribute("aria-invalid");
        radio.removeAttribute("aria-errormessage");
      }
    } else {
      inputs[field].removeAttribute("aria-invalid");
      inputs[field].removeAttribute("aria-errormessage");
    }
    return;
  }
  errorEl.textContent = message;
  const targets =
    field === "tipBase" ? Object.values(tipBaseRadios) : [inputs[field]];
  for (const target of targets) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function renderShares(result) {
  tableBody.replaceChildren();
  result.sharesCents.forEach((share, index) => {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.setAttribute("scope", "row");
    labelCell.textContent = t.personLabel(index + 1);
    tr.appendChild(labelCell);
    const amountCell = document.createElement("td");
    amountCell.textContent = formatMoney(share);
    tr.appendChild(amountCell);
    tableBody.appendChild(tr);
  });
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of TEXT_FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const [value, radio] of Object.entries(tipBaseRadios)) {
    radio.checked = draft.tipBase === value;
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
      const message = errorMessage(error.field, error.code);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
        if (submitted) {
          submitted = false;
          const anchor = errorAnchor(error.field);
          if (anchor !== null) anchor.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    summaryEl.textContent = t.summary(result, t.tipBaseLabel[draft.tipBase]);
    checkLineEl.textContent = t.checkLine;
    statusEl.textContent = t.checkLine;
    renderShares(result);
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

for (const field of TEXT_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const [value, radio] of Object.entries(tipBaseRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ tipBase: value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.bill.focus();
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
