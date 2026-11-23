// Waist-to-Height Ratio Calculator — DOM app.
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
    category: {
      "below-healthy": "低於健康範圍",
      healthy: "健康",
      increased: "中心肥胖增加",
      high: "高中心肥胖",
    },
    status: {
      empty: "請輸入腰圍與身高，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算腰高比」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長（最多 16 個字元）。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      DECIMAL_FORMAT: "請輸入十進位數字，例如 84.9；最多 2 位小數。",
      RANGE_WAIST: "腰圍需介於 20 至 300 公分。",
      RANGE_HEIGHT: "身高需介於 50 至 300 公分。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    loseNone: "無 — 已低於身高一半",
    loseUnit: "公分",
    rangeUnit: "公分",
  },
  en: {
    category: {
      "below-healthy": "Below healthy range",
      healthy: "Healthy",
      increased: "Increased central adiposity",
      high: "High central adiposity",
    },
    status: {
      empty: "Enter your waist and height, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long (at most 16 characters).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a decimal number, such as 84.9, with at most 2 decimal places.",
      RANGE_WAIST: "Waist must be between 20 and 300 cm.",
      RANGE_HEIGHT: "Height must be between 50 and 300 cm.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    loseNone: "None — already under half your height",
    loseUnit: "cm",
    rangeUnit: "cm",
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const waistInput = $("input-waist");
const heightInput = $("input-height");
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const whtrEl = $("result-whtr");
const categoryEl = $("result-category");
const rangeEl = $("result-range");
const loseEl = $("result-lose");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = { waistCm: $("error-waist"), heightCm: $("error-height") };
const fieldEls = { waistCm: waistInput, heightCm: heightInput };

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

function completeJob(generation, outcome) {
  if (controller.deliver(generation, outcome)) render();
}

function failJob(generation) {
  completeJob(generation, {
    ok: false,
    error: { code: "WORKER_ERROR", field: null, row: null },
  });
}

const transport = {
  send(snapshot, generation) {
    try {
      const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
      workerUrl = URL.createObjectURL(blob);
      const jobWorker = new Worker(workerUrl, { type: "module" });
      worker = jobWorker;
      jobWorker.onmessage = ({ data }) => {
        if (worker === jobWorker && data?.generation === generation) {
          completeJob(generation, data.outcome);
        }
      };
      jobWorker.onerror = () => {
        if (worker === jobWorker) failJob(generation);
      };
      jobWorker.postMessage({ generation, input: snapshot });
    } catch {
      // Let the submit handler render busy before reporting a startup failure.
      queueMicrotask(() => failJob(generation));
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
  if (error.code === "RANGE") {
    return error.field === "waistCm" ? T.errors.RANGE_WAIST : T.errors.RANGE_HEIGHT;
  }
  return T.errors[error.code] || T.errors.WORKER_ERROR;
}

function buildSentence(result, draft) {
  const waist = normalizeEcho(draft.waistCm);
  const height = normalizeEcho(draft.heightCm);
  const category = T.category[result.category];
  if (LANG === "zh") {
    let sentence = `腰圍 ${waist} 公分，身高 ${height} 公分，腰高比 ${result.whtr}，屬於${category}。`;
    if (result.waistToLoseCm !== null) {
      sentence += `腰圍比健康上限多 ${result.waistToLoseCm} 公分。`;
    }
    return sentence;
  }
  let sentence = `Waist ${waist} cm, height ${height} cm, waist-to-height ratio ${result.whtr} (${category}).`;
  if (result.waistToLoseCm !== null) {
    sentence += ` Your waist is ${result.waistToLoseCm} cm above the healthy maximum.`;
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

  form.setAttribute("aria-busy", snap.state === "busy" ? "true" : "false");
  runBtn.disabled = snap.state === "busy";
  cancelBtn.hidden = snap.state !== "busy";
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  setFieldError("waistCm", null);
  setFieldError("heightCm", null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    sentenceEl.textContent = buildSentence(result, snap.draft);
    whtrEl.textContent = result.whtr;
    categoryEl.textContent = T.category[result.category];
    rangeEl.textContent =
      `${result.healthyWaistMinCm} – ${result.healthyWaistMaxCm} ${T.rangeUnit}`;
    loseEl.textContent =
      result.waistToLoseCm === null
        ? T.loseNone
        : `${result.waistToLoseCm} ${T.loseUnit}`;
    resultEl.hidden = false;
    statusEl.textContent = sentenceEl.textContent;
  } else {
    resultEl.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = errorMessage(snap.error);
      statusEl.textContent = message;
      if (snap.error.field && errorEls[snap.error.field]) {
        setFieldError(snap.error.field, message);
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        const target =
          snap.error.field && fieldEls[snap.error.field]
            ? fieldEls[snap.error.field]
            : waistInput;
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
  waistInput.value = draft.waistCm;
  heightInput.value = draft.heightCm;
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

waistInput.addEventListener("input", () => {
  controller.edit({ waistCm: waistInput.value });
  render();
});
heightInput.addEventListener("input", () => {
  controller.edit({ heightCm: heightInput.value });
  render();
});

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
  waistInput.focus();
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
