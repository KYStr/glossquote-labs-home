// DOM wiring for the Moving Box Estimator. All user-visible text is set
// through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, generation, and state machine; this file only renders
// it. The report download is created only on an explicit click, from
// the current successful result, with the SPEC's fixed file name; its
// object URL is revoked within 30 seconds or as soon as the result is
// invalidated, whichever comes first.

import { createController } from "./controller.mjs";
import { TOGGLES, buildReport } from "./core/boxes.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太大",
      UNICODE: "文字含有不完整的 Unicode 字元",
      EMPTY: "請選擇住宅型態",
      ENUM: "住宅型態不在可選清單中",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    statusEmpty: "尚未計算。選擇住宅型態與加量選項，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算紙箱數量」執行。",
    statusSuccess: (total) => `估算完成：共需要 ${total} 箱`,
    resultRows: {
      small: "小箱",
      medium: "中箱",
      large: "大箱",
      tapeRolls: "膠帶（捲）",
      packingPaperRolls: "包裝紙（捲）",
    },
  },
  en: {
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "The input is too large.",
      UNICODE: "The text contains an incomplete Unicode character.",
      EMPTY: "Choose a home type.",
      ENUM: "The home type is not one of the available choices.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    statusEmpty: "Nothing estimated yet. Choose a home type and options, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate boxes” to run it.",
    statusSuccess: (total) => `Estimate ready: ${total} boxes in total`,
    resultRows: {
      small: "Small boxes",
      medium: "Medium boxes",
      large: "Large boxes",
      tapeRolls: "Tape (rolls)",
      packingPaperRolls: "Packing paper (rolls)",
    },
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("boxes-form");
const homeTypeFieldset = document.getElementById("field-homeType");
const homeTypeRadios = [...form.querySelectorAll('input[name="homeType"]')];
const toggleInputs = Object.fromEntries(
  TOGGLES.map((field) => [field, document.getElementById(`field-${field}`)]),
);
const homeTypeError = document.getElementById("error-homeType");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryTotal = document.getElementById("summary-total");
const resultRows = document.getElementById("result-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let pendingReportUrl = null;
let pendingReportTimer = null;

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

function revokePendingReport() {
  if (pendingReportTimer !== null) {
    clearTimeout(pendingReportTimer);
    pendingReportTimer = null;
  }
  if (pendingReportUrl !== null) {
    URL.revokeObjectURL(pendingReportUrl);
    pendingReportUrl = null;
  }
}

function setHomeTypeError(message) {
  if (message === null) {
    homeTypeFieldset.removeAttribute("aria-invalid");
    homeTypeFieldset.removeAttribute("aria-errormessage");
    homeTypeError.textContent = "";
    return;
  }
  homeTypeFieldset.setAttribute("aria-invalid", "true");
  homeTypeFieldset.setAttribute("aria-errormessage", "error-homeType");
  homeTypeError.textContent = message;
}

function errorMessage(error) {
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderResult(result) {
  summaryTotal.textContent = String(result.totalBoxes);
  resultRows.replaceChildren();
  const rows = [
    [t.resultRows.small, result.boxes.small],
    [t.resultRows.medium, result.boxes.medium],
    [t.resultRows.large, result.boxes.large],
    [t.resultRows.tapeRolls, result.supplies.tapeRolls],
    [t.resultRows.packingPaperRolls, result.supplies.packingPaperRolls],
  ];
  for (const [label, value] of rows) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = String(value);
    tr.append(th, td);
    resultRows.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const radio of homeTypeRadios) {
    radio.checked = radio.value === draft.homeType;
  }
  for (const field of TOGGLES) {
    toggleInputs[field].checked = draft[field] === true;
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  if (state !== "success") revokePendingReport();
  downloadBtn.disabled = !(state === "success" && result !== null);

  if (state === "empty") {
    statusEl.textContent = t.statusEmpty;
    resultsEl.hidden = true;
    setHomeTypeError(null);
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    setHomeTypeError(null);
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    setHomeTypeError(null);
  } else if (state === "error") {
    setHomeTypeError(null);
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field === "homeType") {
        setHomeTypeError(message);
        statusEl.textContent = message;
        if (submitted) {
          submitted = false;
          homeTypeRadios[0].focus();
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
    statusEl.textContent = t.statusSuccess(result.totalBoxes);
    resultsEl.hidden = false;
    setHomeTypeError(null);
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const radio of homeTypeRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ homeType: radio.value });
  });
}

for (const field of TOGGLES) {
  toggleInputs[field].addEventListener("change", () => {
    controller.edit({ [field]: toggleInputs[field].checked });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  homeTypeRadios[0].focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const { state, result } = controller.getState();
  if (state !== "success" || result === null) return;
  const report = buildReport(result);
  if (!report.ok) return;
  revokePendingReport();
  const blob = new Blob([report.text], { type: "application/json" });
  pendingReportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = pendingReportUrl;
  anchor.download = report.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  pendingReportTimer = setTimeout(revokePendingReport, 30000);
});

window.addEventListener("pagehide", () => {
  revokePendingReport();
  controller.destroy();
});

render(controller.getState());
