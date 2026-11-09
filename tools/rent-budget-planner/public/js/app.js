// Rent Budget Planner — DOM wiring.
// All rendering goes through textContent/value; user input is never parsed
// as markup. The controller owns state; this file only reflects it.

import { createController } from "./core/controller.mjs";
import {
  DEFAULT_INPUT,
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  serializeReport,
} from "./core/rent-budget.mjs";
import { FIELD_IDS, MESSAGES } from "./core/messages.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const dict = MESSAGES[lang];

const form = document.getElementById("budget-form");
const workspace = document.getElementById("workspace");
const statusMessage = document.getElementById("status-message");
const exampleNote = document.getElementById("example-note");
const resultsSection = document.getElementById("results");
const cancelButton = document.getElementById("cancel");
const downloadButton = document.getElementById("download-report");
const warningLine = document.getElementById("result-warning");

const fieldElements = {};
const errorElements = {};
for (const [field, id] of Object.entries(FIELD_IDS)) {
  fieldElements[field] = document.getElementById(id);
  errorElements[field] = document.getElementById("err-" + id);
}

const resultElements = {
  maxRent: document.getElementById("result-max-rent"),
  share: document.getElementById("result-share"),
  verdict: document.getElementById("result-verdict"),
  firstMonth: document.getElementById("result-first-month"),
  deposit: document.getElementById("result-deposit"),
  agencyFee: document.getElementById("result-agency-fee"),
  total: document.getElementById("result-total"),
  remainder: document.getElementById("result-remainder"),
};

function readForm() {
  return {
    income: fieldElements.income.value,
    ratioPreset: fieldElements.ratioPreset.value,
    customRatio: fieldElements.customRatio.value,
    candidateRent: fieldElements.candidateRent.value,
    depositMonths: fieldElements.depositMonths.value,
    agencyFee: fieldElements.agencyFee.value,
  };
}

function writeForm(input) {
  fieldElements.income.value = input.income;
  fieldElements.ratioPreset.value = input.ratioPreset;
  fieldElements.customRatio.value = input.customRatio;
  fieldElements.candidateRent.value = input.candidateRent;
  fieldElements.depositMonths.value = input.depositMonths;
  fieldElements.agencyFee.value = input.agencyFee;
}

function formatNt(value) {
  const negative = value < 0;
  const digits = String(Math.abs(value));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negative ? "-" : "") + grouped;
}

let pendingObjectUrl = null;
function revokePendingUrl() {
  if (pendingObjectUrl !== null) {
    URL.revokeObjectURL(pendingObjectUrl);
    pendingObjectUrl = null;
  }
}

function clearFieldErrors() {
  for (const field of Object.keys(errorElements)) {
    errorElements[field].hidden = true;
    errorElements[field].textContent = "";
    fieldElements[field].removeAttribute("aria-invalid");
  }
}

function showFieldError(error) {
  clearFieldErrors();
  const message = dict.errors[error.code] ?? dict.errors.INTERNAL;
  statusMessage.textContent = message;
  if (error.field && errorElements[error.field]) {
    errorElements[error.field].textContent =
      dict.fields[error.field] + ": " + message;
    errorElements[error.field].hidden = false;
    fieldElements[error.field].setAttribute("aria-invalid", "true");
  }
}

function renderResult(result) {
  const text = dict.result;
  resultElements.maxRent.textContent = formatNt(result.maxRentNt);
  resultElements.share.textContent =
    result.candidate.sharePercent === null
      ? "—"
      : String(result.candidate.sharePercent) + "%";
  resultElements.verdict.textContent = result.candidate.withinBudget
    ? "✓ " + text.within
    : "⚠ " + text.over + " · " + text.overBy + " " + formatNt(result.candidate.overByNt);
  resultElements.firstMonth.textContent = formatNt(result.moveIn.firstMonthNt);
  resultElements.deposit.textContent = formatNt(result.moveIn.depositNt);
  resultElements.agencyFee.textContent = formatNt(result.moveIn.agencyFeeNt);
  resultElements.total.textContent = formatNt(result.moveIn.totalNt);
  resultElements.remainder.textContent = formatNt(result.monthlyRemainderNt);
  const warnings = [];
  if (result.candidate.sharePercent === null) warnings.push(text.shareUnavailable);
  if (result.monthlyRemainderNt < 0) warnings.push(text.remainderNegative);
  warningLine.textContent = warnings.join(" ");
  warningLine.hidden = warnings.length === 0;
}

let previousStatus = "empty";
function render(state) {
  workspace.setAttribute("aria-busy", state.status === "busy" ? "true" : "false");
  cancelButton.hidden = state.status !== "busy";
  if (state.status === "error" && state.error) {
    showFieldError(state.error);
    if (previousStatus === "busy" && state.error.field && fieldElements[state.error.field]) {
      fieldElements[state.error.field].focus();
    }
  } else {
    clearFieldErrors();
    statusMessage.textContent = dict.states[state.status] ?? "";
  }
  if (state.status === "success" && state.result) {
    renderResult(state.result);
    resultsSection.hidden = false;
  } else {
    resultsSection.hidden = true;
  }
  downloadButton.hidden = !state.reportAvailable;
  if (!state.reportAvailable) revokePendingUrl();
  previousStatus = state.status;
}

const controller = createController();
controller.subscribe(render);

form.addEventListener("input", () => {
  exampleNote.hidden = true;
  controller.edit(readForm());
});
form.addEventListener("change", () => {
  exampleNote.hidden = true;
  controller.edit(readForm());
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  exampleNote.hidden = true;
  controller.run();
});

document.getElementById("load-example").addEventListener("click", () => {
  writeForm(DEFAULT_INPUT);
  controller.edit({ ...DEFAULT_INPUT });
  exampleNote.textContent = dict.exampleLoaded;
  exampleNote.hidden = false;
});

cancelButton.addEventListener("click", () => {
  controller.cancel();
});

document.getElementById("reset").addEventListener("click", () => {
  exampleNote.hidden = true;
  controller.reset();
  writeForm(DEFAULT_INPUT);
  fieldElements.income.focus();
});

downloadButton.addEventListener("click", () => {
  const state = controller.getState();
  if (!state.reportAvailable || !state.result) return;
  const text = serializeReport(state.result);
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > REPORT_LIMIT_BYTES) {
    statusMessage.textContent = dict.errors.OUTPUT_LIMIT;
    return;
  }
  revokePendingUrl();
  const blob = new Blob([text], { type: "application/json" });
  pendingObjectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = pendingObjectUrl;
  anchor.download = REPORT_FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(revokePendingUrl, 30000);
});

window.addEventListener("pagehide", () => {
  if (controller.getState().status === "busy") controller.cancel();
  revokePendingUrl();
});

writeForm(DEFAULT_INPUT);
render(controller.getState());
