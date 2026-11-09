// Percentage Calculator — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.

import { Controller } from "./core/controller.mjs";
import { normalizeEcho, REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    fieldLabels: {
      of: { first: "百分比（%）", second: "基數" },
      share: { first: "部分", second: "全部" },
      change: { first: "原始值", second: "新值" },
    },
    direction: { increase: "增加", decrease: "減少", none: "不變" },
    sentence: {
      of: "{first}% 的 {second} 是 {display}",
      share: "{first} 是 {second} 的 {display}%",
      change: "從 {first} 到 {second}，變化 {display}%（{direction}）",
    },
    status: {
      empty: "請輸入數字，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算百分比」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      MODE_INVALID: "請選擇計算模式。",
      INPUT_LIMIT: "輸入太長。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      NUMBER_FORMAT: "請輸入十進位數字，例如 12.5。",
      RANGE: "數值超出允許範圍（絕對值最多 999,999,999,999）。",
      DIVISION_BY_ZERO_FIRST: "原始值不可為 0。",
      DIVISION_BY_ZERO_SECOND: "全部不可為 0。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
  },
  en: {
    fieldLabels: {
      of: { first: "Percentage (%)", second: "Base number" },
      share: { first: "Part", second: "Whole" },
      change: { first: "Starting value", second: "New value" },
    },
    direction: { increase: "Increase", decrease: "Decrease", none: "No change" },
    sentence: {
      of: "{first}% of {second} is {display}",
      share: "{first} is {display}% of {second}",
      change: "From {first} to {second}: {display}% ({direction})",
    },
    status: {
      empty: "Enter values, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      MODE_INVALID: "Choose a calculation mode.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      NUMBER_FORMAT: "Enter a decimal number, such as 12.5.",
      RANGE: "The number is outside the allowed range (absolute value up to 999,999,999,999).",
      DIVISION_BY_ZERO_FIRST: "The starting value cannot be zero.",
      DIVISION_BY_ZERO_SECOND: "The whole cannot be zero.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const firstInput = $("input-first");
const secondInput = $("input-second");
const firstLabel = $("label-first");
const secondLabel = $("label-second");
const modeRadios = [...document.querySelectorAll('input[name="mode"]')];
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const valueEl = $("result-value");
const suffixEl = $("result-suffix");
const directionRow = $("result-direction-row");
const directionEl = $("result-direction");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = { mode: $("error-mode"), first: $("error-first"), second: $("error-second") };
const fieldEls = { first: firstInput, second: secondInput };

// --- Worker transport ------------------------------------------------------

let worker = null;
let workerUrl = null;

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

const transport = {
  send(snapshot, generation) {
    try {
      if (!worker) {
        const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
        workerUrl = URL.createObjectURL(blob);
        worker = new Worker(workerUrl, { type: "module" });
        worker.onmessage = (event) => {
          const data = event.data || {};
          controller.deliver(data.generation, data.outcome);
        };
        worker.onerror = () => {
          controller.deliver(controller.generation, {
            ok: false,
            error: { code: "WORKER_ERROR", field: null, row: null },
          });
        };
      }
      worker.postMessage({ generation, input: snapshot });
    } catch {
      queueMicrotask(() =>
        controller.deliver(generation, {
          ok: false,
          error: { code: "WORKER_ERROR", field: null, row: null },
        })
      );
    }
  },
  terminate() {
    terminateWorker();
  },
};

const controller = new Controller(transport);

// --- Download handling -----------------------------------------------------

let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

downloadBtn.addEventListener("click", () => {
  if (!controller.reportAvailable || !controller.reportBytes) return;
  revokeDownload();
  const blob = new Blob([controller.reportBytes], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

// --- Rendering ---------------------------------------------------------------

let focusFirstErrorOnError = false;

function errorMessage(error) {
  if (!error) return "";
  if (error.code === "DIVISION_BY_ZERO") {
    return error.field === "first"
      ? T.errors.DIVISION_BY_ZERO_FIRST
      : T.errors.DIVISION_BY_ZERO_SECOND;
  }
  return T.errors[error.code] || T.errors.WORKER_ERROR;
}

function buildSentence(result, draft) {
  const first = normalizeEcho(draft.first);
  const second = normalizeEcho(draft.second);
  let sentence = T.sentence[result.mode]
    .replace("{first}", first)
    .replace("{second}", second)
    .replace("{display}", result.display);
  if (result.mode === "change") {
    sentence = sentence.replace("{direction}", T.direction[result.direction]);
  }
  return sentence;
}

function setFieldError(field, message) {
  const el = errorEls[field];
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
  const input = fieldEls[field];
  if (input) {
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-errormessage", el.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }
}

function render() {
  const snap = controller.snapshot();
  const labels = T.fieldLabels[snap.draft.mode];
  firstLabel.textContent = labels.first;
  secondLabel.textContent = labels.second;

  form.setAttribute("aria-busy", snap.state === "busy" ? "true" : "false");
  runBtn.disabled = snap.state === "busy";
  cancelBtn.hidden = snap.state !== "busy";
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  setFieldError("mode", null);
  setFieldError("first", null);
  setFieldError("second", null);

  if (snap.state === "success" && snap.result) {
    const sentence = buildSentence(snap.result, snap.draft);
    sentenceEl.textContent = sentence;
    valueEl.textContent = snap.result.value;
    suffixEl.textContent = snap.result.mode === "of" ? "" : "%";
    if (snap.result.mode === "change") {
      directionRow.hidden = false;
      directionEl.textContent = T.direction[snap.result.direction];
    } else {
      directionRow.hidden = true;
      directionEl.textContent = "";
    }
    resultEl.hidden = false;
    statusEl.textContent = sentence;
  } else {
    resultEl.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = errorMessage(snap.error);
      statusEl.textContent = message;
      if (snap.error.field && errorEls[snap.error.field]) {
        setFieldError(snap.error.field, message);
      } else if (snap.error.code === "SCHEMA") {
        setFieldError("mode", message);
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        const target =
          snap.error.field && fieldEls[snap.error.field]
            ? fieldEls[snap.error.field]
            : snap.error.field === "mode"
              ? modeRadios[0]
              : firstInput;
        target.focus();
      }
    } else if (snap.state === "dirty" && snap.exampleLoaded) {
      statusEl.textContent = T.status.example;
    } else {
      statusEl.textContent = T.status[snap.state] || "";
    }
  }
}

function syncDomFromDraft() {
  const draft = controller.draft;
  for (const radio of modeRadios) radio.checked = radio.value === draft.mode;
  firstInput.value = draft.first;
  secondInput.value = draft.second;
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

firstInput.addEventListener("input", () => {
  controller.edit({ first: firstInput.value });
  render();
});
secondInput.addEventListener("input", () => {
  controller.edit({ second: secondInput.value });
  render();
});
for (const radio of modeRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      controller.edit({ mode: radio.value });
      render();
    }
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
  syncDomFromDraft();
  render();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  render();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  syncDomFromDraft();
  render();
  modeRadios[0].focus();
});

window.addEventListener("pagehide", () => {
  controller.stopWork();
  revokeDownload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    syncDomFromDraft();
    render();
  }
});

syncDomFromDraft();
render();
