// Child Height Predictor — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.

import { Controller } from "./core/controller.mjs";
import { REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    sex: { boy: "男孩", girl: "女孩" },
    sentence: "預估成年身高 {target} 公分，目標區間 {low}–{high} 公分。",
    disclaimer:
      "此為依父母身高推估的統計估計，不是醫療建議，也不是對任何一位兒童的成長診斷或保證。遺傳只是影響成人身高的因素之一；實際身高還受營養、整體健康、睡眠與青春期時間等因素影響，個別兒童完全可能落在預估區間之外。",
    status: {
      empty: "請輸入父母身高與孩子性別，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算預估身高」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      DECIMAL_FORMAT: "請輸入公分數字，最多一位小數，例如 178 或 172.5。",
      RANGE: "身高超出允許範圍（100.0–230.0 公分）。",
      ENUM: "請選擇孩子性別。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
  },
  en: {
    sex: { boy: "Boy", girl: "Girl" },
    sentence: "Predicted adult height {target} cm, target range {low}–{high} cm.",
    disclaimer:
      "This is a statistical estimate based on the parents' heights. It is not medical advice and is not a diagnosis or guarantee for any individual child. Genetics is only one of many factors that influence adult height; nutrition, overall health, sleep and the timing of puberty also matter, and an individual child may well finish outside the estimated range.",
    status: {
      empty: "Enter both parents' heights and the child's sex, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter a height in cm with at most one decimal, such as 178 or 172.5.",
      RANGE: "Height is outside the allowed range (100.0–230.0 cm).",
      ENUM: "Choose the child's sex.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const fatherInput = $("input-father");
const motherInput = $("input-mother");
const sexRadios = [...document.querySelectorAll('input[name="childSex"]')];
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const targetEl = $("result-target");
const lowEl = $("result-low");
const highEl = $("result-high");
const disclaimerEl = $("result-disclaimer");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = {
  fatherHeightCm: $("error-father"),
  motherHeightCm: $("error-mother"),
  childSex: $("error-sex"),
};
const fieldEls = {
  fatherHeightCm: fatherInput,
  motherHeightCm: motherInput,
  childSex: sexRadios[0],
};

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

function formatCm(value) {
  return value.toFixed(1);
}

function buildSentence(result) {
  return T.sentence
    .replace("{target}", formatCm(result.targetCm))
    .replace("{low}", formatCm(result.rangeLowCm))
    .replace("{high}", formatCm(result.rangeHighCm));
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

  setFieldError("fatherHeightCm", null);
  setFieldError("motherHeightCm", null);
  setFieldError("childSex", null);

  if (snap.state === "success" && snap.result) {
    const sentence = buildSentence(snap.result);
    sentenceEl.textContent = sentence;
    targetEl.textContent = formatCm(snap.result.targetCm);
    lowEl.textContent = formatCm(snap.result.rangeLowCm);
    highEl.textContent = formatCm(snap.result.rangeHighCm);
    disclaimerEl.textContent = T.disclaimer;
    resultEl.hidden = false;
    statusEl.textContent = sentence;
  } else {
    resultEl.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = T.errors[snap.error.code] || T.errors.WORKER_ERROR;
      statusEl.textContent = message;
      if (snap.error.field && errorEls[snap.error.field]) {
        setFieldError(snap.error.field, message);
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        const target =
          snap.error.field && fieldEls[snap.error.field]
            ? fieldEls[snap.error.field]
            : fatherInput;
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
  for (const radio of sexRadios) radio.checked = radio.value === draft.childSex;
  fatherInput.value = draft.fatherHeightCm;
  motherInput.value = draft.motherHeightCm;
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

fatherInput.addEventListener("input", () => {
  controller.edit({ fatherHeightCm: fatherInput.value });
  render();
});
motherInput.addEventListener("input", () => {
  controller.edit({ motherHeightCm: motherInput.value });
  render();
});
for (const radio of sexRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      controller.edit({ childSex: radio.value });
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
  fatherInput.focus();
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
