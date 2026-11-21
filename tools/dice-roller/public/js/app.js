// DOM wiring for the Dice Roller. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft lives only on this page: no storage of any kind is used, and
// leaving the page discards it. When the seed field is blank at run
// time, this layer (never the core) fills one cryptographically random
// uint32 seed into the field and includes it in that run's snapshot.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatErrorMessage,
  serializeReport,
} from "./core/dice-roller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    resultHeading: "每顆骰子與總和",
    summary: (result) => `骰式 ${result.expression} · 種子 ${result.seed} · 總和 ${result.total}`,
    dieLine: (index, value) => `第 ${index} 顆：${value}`,
    modifierLine: (modifier, sum) =>
      modifier > 0 ? `修正 +${modifier} · 骰面總和 ${sum}` : `修正 −${-modifier} · 骰面總和 ${sum}`,
    exampleNote: "已載入範例，請按「擲骰」執行。",
    draftNote: "切換語言或離開頁面會失去草稿。",
  },
  en: {
    resultHeading: "Dice and total",
    summary: (result) => `Notation ${result.expression} · Seed ${result.seed} · Total ${result.total}`,
    dieLine: (index, value) => `Die ${index}: ${value}`,
    modifierLine: (modifier, sum) =>
      modifier > 0 ? `Modifier +${modifier} · Face total ${sum}` : `Modifier −${-modifier} · Face total ${sum}`,
    exampleNote: "Example loaded. Run “Roll dice” to roll it.",
    draftNote: "Switching language or leaving the page discards the draft.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("dice-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("result-summary");
const rollsEl = document.getElementById("rolls-list");
const modifierEl = document.getElementById("result-modifier");
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
  runBtn.disabled = state === "busy";
  cancelBtn.hidden = state !== "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    summaryEl.textContent = t.summary(result);
    while (rollsEl.firstChild !== null) rollsEl.removeChild(rollsEl.firstChild);
    result.rolls.forEach((value, index) => {
      const item = document.createElement("li");
      item.textContent = t.dieLine(index + 1, value);
      rollsEl.appendChild(item);
    });
    if (result.modifier !== 0) {
      modifierEl.textContent = t.modifierLine(result.modifier, result.sum);
      modifierEl.hidden = false;
    } else {
      modifierEl.textContent = "";
      modifierEl.hidden = true;
    }
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = formatErrorMessage(error, lang);
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
  // Seed auto-fill (app layer only, SPEC userFlow): only on an explicit
  // run, only when the seed field is blank. The filled seed is written
  // back to the field and included in this run's snapshot.
  if (inputs.seed.value === "") {
    const random = new Uint32Array(1);
    globalThis.crypto.getRandomValues(random);
    const filled = String(random[0]);
    inputs.seed.value = filled;
    controller.edit({ seed: filled });
  }
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

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.notation.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = formatErrorMessage(serialized.error, lang);
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
