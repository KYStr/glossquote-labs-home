// DOM wiring for the Currency Converter. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft lives only in this page: there is no persistent storage, and
// leaving the page or switching language discards it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatCents,
  formatRate,
  serializeReport,
} from "./core/currency-converter.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      CODE_FORMAT: "幣別代碼須為恰好 3 個英文字母",
      DECIMAL_FORMAT: "請輸入有效的數字",
      ENUM: "請選擇換算方向",
      RANGE_RATE: "匯率須大於 0 且不超過 1000000",
      RANGE_AMOUNT: "金額須不超過 9999999.99",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    conversionSentence: (amount, amountCode, converted, convertedCode) =>
      `${amount} ${amountCode} = ${converted} ${convertedCode}`,
    directionForward: (fromCode, rateDisplay, toCode) => `1 ${fromCode} = ${rateDisplay} ${toCode}`,
    directionInverse: (toCode, inverseRate, fromCode) =>
      `反向匯率：1 ${toCode} = ${inverseRate} ${fromCode}`,
    quickRow: (amount, fromCode, converted, toCode) =>
      `${amount} ${fromCode} = ${converted} ${toCode}`,
    disclaimer:
      "本工具不會取得或提供即時匯率。所有換算只使用你輸入的匯率；實際交易的匯率與費用，請向你的銀行或匯兌服務商確認。",
    exampleNote: "已載入範例，請按「換算」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      CODE_FORMAT: "A currency code must be exactly 3 letters.",
      DECIMAL_FORMAT: "Enter a valid number.",
      ENUM: "Choose a conversion direction.",
      RANGE_RATE: "The rate must be greater than 0 and at most 1000000.",
      RANGE_AMOUNT: "The amount must be at most 9999999.99.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    conversionSentence: (amount, amountCode, converted, convertedCode) =>
      `${amount} ${amountCode} = ${converted} ${convertedCode}`,
    directionForward: (fromCode, rateDisplay, toCode) => `1 ${fromCode} = ${rateDisplay} ${toCode}`,
    directionInverse: (toCode, inverseRate, fromCode) =>
      `Inverse rate: 1 ${toCode} = ${inverseRate} ${fromCode}`,
    quickRow: (amount, fromCode, converted, toCode) =>
      `${amount} ${fromCode} = ${converted} ${toCode}`,
    disclaimer:
      "This tool does not fetch or provide live exchange rates. Every conversion uses only the rate you enter; for the rate and fees that will actually apply, check your bank or exchange provider.",
    exampleNote: "Example loaded. Run “Convert” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("currency-converter-form");
const inputs = {};
for (const field of ["fromCode", "toCode", "rate", "amount"]) {
  inputs[field] = document.getElementById(`field-${field}`);
}
const directionRadios = {
  "a-to-b": document.getElementById("field-direction-a-to-b"),
  "b-to-a": document.getElementById("field-direction-b-to-a"),
};
const directionGroup = document.getElementById("field-direction");
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const conversionEl = document.getElementById("conversion-sentence");
const directionForwardEl = document.getElementById("direction-forward");
const directionInverseEl = document.getElementById("direction-inverse");
const quickTableBodyEl = document.getElementById("quick-table-body");
const disclaimerResultEl = document.getElementById("disclaimer");
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

function errorMessage(error) {
  if (error.code === "RANGE" && error.field === "rate") return t.error.RANGE_RATE;
  if (error.code === "RANGE" && error.field === "amount") return t.error.RANGE_AMOUNT;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  if (field === "direction") {
    if (message === null) {
      directionGroup.removeAttribute("aria-invalid");
      directionGroup.removeAttribute("aria-errormessage");
      errorEl.textContent = "";
      return;
    }
    directionGroup.setAttribute("aria-invalid", "true");
    directionGroup.setAttribute("aria-errormessage", "error-direction");
    errorEl.textContent = message;
    return;
  }
  const input = inputs[field];
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

function renderQuickTable(result) {
  while (quickTableBodyEl.firstChild !== null) {
    quickTableBodyEl.removeChild(quickTableBodyEl.firstChild);
  }
  for (const row of result.quickTable) {
    const tr = document.createElement("tr");
    const amountCell = document.createElement("td");
    amountCell.textContent = `${formatCents(row.amountCents)} ${result.fromCode}`;
    const convertedCell = document.createElement("td");
    convertedCell.textContent = `${formatCents(row.convertedCents)} ${result.toCode}`;
    tr.appendChild(amountCell);
    tr.appendChild(convertedCell);
    quickTableBodyEl.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  for (const field of ["fromCode", "toCode", "rate", "amount"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  directionRadios["a-to-b"].checked = draft.direction === "a-to-b";
  directionRadios["b-to-a"].checked = draft.direction === "b-to-a";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    const amountCode = result.direction === "a-to-b" ? result.fromCode : result.toCode;
    const convertedCode = result.direction === "a-to-b" ? result.toCode : result.fromCode;
    conversionEl.textContent = t.conversionSentence(
      formatCents(result.amountCents),
      amountCode,
      formatCents(result.convertedCents),
      convertedCode,
    );
    directionForwardEl.textContent = t.directionForward(
      result.fromCode,
      formatRate(result.rateMicro),
      result.toCode,
    );
    directionInverseEl.textContent = t.directionInverse(
      result.toCode,
      result.inverseRate,
      result.fromCode,
    );
    renderQuickTable(result);
    disclaimerResultEl.textContent = t.disclaimer;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          if (error.field === "direction") directionRadios["a-to-b"].focus();
          else inputs[error.field].focus();
        }
      } else {
        // A field-less error (SCHEMA, INTERNAL, WORKER_ERROR,
        // OUTPUT_LIMIT) has no field slot; the detail lives in the
        // status region.
        statusEl.textContent = message;
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

for (const field of ["fromCode", "toCode", "rate", "amount"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}
for (const value of ["a-to-b", "b-to-a"]) {
  directionRadios[value].addEventListener("change", () => {
    controller.edit({ direction: value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.fromCode.focus();
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
