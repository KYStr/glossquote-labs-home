// DOM wiring for the Tax-Included Converter. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft lives only on this page: the SPEC pins it to the current page
// (switching language or leaving discards it), so no storage adapter is
// passed to the controller.

import { createController } from "./controller.mjs";
import {
  LINE_MAX,
  REPORT_FILENAME,
  formatAmount,
  serializeReport,
} from "./core/tax-included.mjs";
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
      DECIMAL_FORMAT: "稅率請用數字，最多兩位小數",
      INTEGER_FORMAT: "金額請用整數元",
      RANGE: "超出允許範圍",
      ROW_LIMIT: "明細最多 20 列",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    rowErrorPrefix: (row) => `第 ${row} 列：`,
    rowLabel: (row) => `第 ${row} 列`,
    removeRow: (row) => `移除第 ${row} 列`,
    addRow: "新增一列",
    amountSuffix: " 元",
    echoSingleNet: (rate) => `稅率 ${rate}% · 以未稅金額換算`,
    echoSingleGross: (rate) => `稅率 ${rate}% · 以含稅金額換算`,
    echoLines: (rate, count) => `稅率 ${rate}% · 明細 ${count} 列`,
    exampleNote: "已載入範例，請按「換算」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter the rate as a number with at most two decimals.",
      INTEGER_FORMAT: "Enter the amount as whole dollars.",
      RANGE: "Out of range.",
      ROW_LIMIT: "At most 20 lines.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    rowErrorPrefix: (row) => `Row ${row}: `,
    rowLabel: (row) => `Row ${row}`,
    removeRow: (row) => `Remove row ${row}`,
    addRow: "Add a row",
    amountSuffix: " NT$",
    echoSingleNet: (rate) => `Tax rate ${rate}% · converted from net`,
    echoSingleGross: (rate) => `Tax rate ${rate}% · converted from gross`,
    echoLines: (rate, count) => `Tax rate ${rate}% · ${count} lines`,
    exampleNote: "Example loaded. Run “Convert” to calculate it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("tax-form");
const modeSingle = document.getElementById("field-mode-single");
const modeLines = document.getElementById("field-mode-lines");
const rateInput = document.getElementById("field-ratePercent");
const basisNet = document.getElementById("field-basis-net");
const basisGross = document.getElementById("field-basis-gross");
const amountInput = document.getElementById("field-amount");
const basisFieldset = document.getElementById("basis-fieldset");
const amountField = document.getElementById("amount-field");
const linesSection = document.getElementById("lines-section");
const linesList = document.getElementById("lines-list");
const linesEmpty = document.getElementById("lines-empty");
const linesAddBtn = document.getElementById("lines-add-btn");
const errorEls = {
  mode: document.getElementById("error-mode"),
  ratePercent: document.getElementById("error-ratePercent"),
  basis: document.getElementById("error-basis"),
  amount: document.getElementById("error-amount"),
  lines: document.getElementById("error-lines"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultNetValue = document.getElementById("result-net-value");
const resultTaxValue = document.getElementById("result-tax-value");
const resultGrossValue = document.getElementById("result-gross-value");
const resultNetTag = document.getElementById("result-net-tag");
const resultTaxTag = document.getElementById("result-tax-tag");
const resultGrossTag = document.getElementById("result-gross-tag");
const resultNetBox = document.getElementById("result-net");
const resultTaxBox = document.getElementById("result-tax");
const resultGrossBox = document.getElementById("result-gross");
const echoEl = document.getElementById("result-echo");
const linesWrap = document.getElementById("result-lines-wrap");
const linesBody = document.getElementById("result-lines-body");
const perlineValue = document.getElementById("result-perline-value");
const differenceValue = document.getElementById("result-difference-value");
const sameNote = document.getElementById("result-same-note");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;
// Values of the inactive mode, remembered so switching back restores
// them instead of resetting to the defaults.
let rememberedSingle = null;
let rememberedLines = null;

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

function formatMoney(value) {
  return `${formatAmount(value)}${t.amountSuffix}`;
}

function formatSignedMoney(value) {
  if (value < 0) return `-${formatAmount(-value)}${t.amountSuffix}`;
  return formatMoney(value);
}

function setFieldError(field, message) {
  const errorEl = errorEls[field];
  if (errorEl === null) return;
  errorEl.textContent = message === null ? "" : message;
}

function clearFieldErrors() {
  for (const field of Object.keys(errorEls)) setFieldError(field, null);
  for (const input of linesList.querySelectorAll("input")) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  }
  rateInput.removeAttribute("aria-invalid");
  rateInput.removeAttribute("aria-errormessage");
  amountInput.removeAttribute("aria-invalid");
  amountInput.removeAttribute("aria-errormessage");
}

function markInvalid(input, errorElId) {
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-errormessage", errorElId);
}

function readLinesFromDom() {
  return [...linesList.querySelectorAll("input")].map((input) => ({ amount: input.value }));
}

function lineInputAt(row) {
  return linesList.querySelector(`#field-line-${row}`);
}

// Rebuild the lines rows only when the draft's rows differ from the DOM
// rows, so typing in a row never rebuilds the row being edited.
function syncLinesRows(lines) {
  const rows = [...linesList.querySelectorAll(".line-row")];
  const domValues = rows.map((row) => row.querySelector("input").value);
  const draftValues = lines.map((line) => line.amount);
  const sameShape =
    rows.length === lines.length && domValues.every((value, index) => value === draftValues[index]);
  if (sameShape) return;
  linesList.textContent = "";
  lines.forEach((line, index) => {
    const row = index + 1;
    const rowEl = document.createElement("div");
    rowEl.className = "line-row";
    const label = document.createElement("label");
    label.setAttribute("for", `field-line-${row}`);
    label.textContent = t.rowLabel(row);
    const input = document.createElement("input");
    input.id = `field-line-${row}`;
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.value = line.amount;
    input.setAttribute("aria-describedby", "help-lines");
    input.addEventListener("input", () => {
      controller.edit({ lines: readLinesFromDom() });
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button-secondary line-remove";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", t.removeRow(row));
    remove.addEventListener("click", () => {
      const next = readLinesFromDom();
      next.splice(row - 1, 1);
      controller.edit({ lines: next });
    });
    rowEl.append(label, input, remove);
    linesList.append(rowEl);
  });
  linesEmpty.hidden = lines.length !== 0;
  linesAddBtn.disabled = lines.length >= LINE_MAX;
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  modeSingle.checked = draft.mode === "single";
  modeLines.checked = draft.mode === "lines";
  if (rateInput.value !== draft.ratePercent) rateInput.value = draft.ratePercent;
  basisNet.checked = draft.basis === "net";
  basisGross.checked = draft.basis === "gross";
  if (draft.amount !== null && amountInput.value !== draft.amount) {
    amountInput.value = draft.amount;
  }
  const isLines = draft.mode === "lines";
  basisFieldset.hidden = isLines;
  amountField.hidden = isLines;
  linesSection.hidden = !isLines;
  if (isLines) syncLinesRows(draft.lines ?? []);
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";
  cancelBtn.hidden = state !== "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    resultNetValue.textContent = formatMoney(result.net);
    resultTaxValue.textContent = formatMoney(result.tax);
    resultGrossValue.textContent = formatMoney(result.gross);
    const inputIsNet = result.mode === "single" && result.basis === "net";
    const inputIsGross = result.mode === "single" && result.basis === "gross";
    resultNetBox.classList.toggle("is-input", inputIsNet);
    resultTaxBox.classList.toggle("is-input", false);
    resultGrossBox.classList.toggle("is-input", inputIsGross);
    resultNetTag.hidden = !inputIsNet;
    resultTaxTag.hidden = true;
    resultGrossTag.hidden = !inputIsGross;
    if (result.mode === "single") {
      echoEl.textContent =
        result.basis === "net"
          ? t.echoSingleNet(result.ratePercent)
          : t.echoSingleGross(result.ratePercent);
      linesWrap.hidden = true;
    } else {
      echoEl.textContent = t.echoLines(result.ratePercent, result.lines.length);
      linesBody.textContent = "";
      for (const line of result.lines) {
        const tr = document.createElement("tr");
        const rowCell = document.createElement("td");
        rowCell.textContent = String(line.row);
        const amountCell = document.createElement("td");
        amountCell.className = "amount";
        amountCell.textContent = formatAmount(line.net);
        tr.append(rowCell, amountCell);
        linesBody.append(tr);
      }
      perlineValue.textContent = formatMoney(result.perLineTaxSum);
      differenceValue.textContent = formatSignedMoney(result.roundingDifference);
      sameNote.hidden = result.roundingDifference !== 0;
      linesWrap.hidden = false;
    }
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.row !== null && error.field === "amount") {
        const prefixed = `${t.rowErrorPrefix(error.row)}${message}`;
        setFieldError("lines", prefixed);
        const input = lineInputAt(error.row);
        if (input !== null) markInvalid(input, "error-lines");
        if (submitted) {
          submitted = false;
          const target = lineInputAt(error.row);
          if (target !== null) target.focus();
        }
      } else if (error.field !== null && Object.prototype.hasOwnProperty.call(errorEls, error.field)) {
        setFieldError(error.field, message);
        if (error.field === "ratePercent") markInvalid(rateInput, "error-ratePercent");
        if (error.field === "amount") markInvalid(amountInput, "error-amount");
        if (error.field === "lines" && linesList.querySelector("input") !== null) {
          markInvalid(linesList.querySelector("input"), "error-lines");
        }
        if (submitted) {
          submitted = false;
          if (error.field === "ratePercent") rateInput.focus();
          else if (error.field === "amount") amountInput.focus();
          else if (error.field === "lines") {
            const first = linesList.querySelector("input");
            if (first !== null) first.focus();
            else linesAddBtn.focus();
          } else if (error.field === "mode") modeSingle.focus();
          else if (error.field === "basis") basisNet.focus();
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

rateInput.addEventListener("input", () => {
  controller.edit({ ratePercent: rateInput.value });
});

amountInput.addEventListener("input", () => {
  controller.edit({ amount: amountInput.value });
});

function onModeChange() {
  const nextMode = modeLines.checked ? "lines" : "single";
  const current = controller.getState().draft;
  if (nextMode === "lines") {
    rememberedSingle = { basis: current.basis, amount: current.amount };
    controller.edit({
      mode: "lines",
      basis: null,
      amount: null,
      lines: rememberedLines ?? [{ amount: "" }],
    });
  } else {
    rememberedLines = current.lines;
    controller.edit({
      mode: "single",
      basis: rememberedSingle?.basis ?? "net",
      amount: rememberedSingle?.amount ?? "10000",
      lines: null,
    });
  }
}
modeSingle.addEventListener("change", onModeChange);
modeLines.addEventListener("change", onModeChange);

function onBasisChange() {
  controller.edit({ basis: basisGross.checked ? "gross" : "net" });
}
basisNet.addEventListener("change", onBasisChange);
basisGross.addEventListener("change", onBasisChange);

linesAddBtn.addEventListener("click", () => {
  const current = controller.getState().draft;
  const lines = current.lines ?? [];
  if (lines.length >= LINE_MAX) return;
  controller.edit({ lines: [...lines, { amount: "" }] });
  const added = lineInputAt(lines.length + 1);
  if (added !== null) added.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  rememberedSingle = null;
  rememberedLines = null;
  controller.reset();
  modeSingle.focus();
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
