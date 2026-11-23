// UV Index Guide — DOM app.
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
    color: {
      green: "綠色",
      yellow: "黃色",
      orange: "橘色",
      red: "紅色",
      purple: "紫色",
    },
    status: {
      empty: "請輸入紫外線指數與膚質，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「查詢防曬建議」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      SCHEMA_SKIN: "請選擇 I 至 VI 的膚質。",
      INPUT_LIMIT: "輸入太長（最多 8 個字元）。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      FORMAT: "請輸入 0 至 20 的數字，最多 1 位小數，例如 8.5。",
      RANGE: "紫外線指數需介於 0 至 20。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    spfNone: "無補擦排程",
    spfReapply: (minutes) => `每 ${minutes} 分鐘補擦`,
    burnNone: "無估計值（紫外線指數為 0）",
    burnCapped: "180 分鐘以上（估計值，不是安全曝曬時間）",
    burnMinutes: (minutes) => `約 ${minutes} 分鐘（估計值，不是安全曝曬時間）`,
    cwaNone: "—",
    cwaMinutes: (minutes) => `${minutes} 分鐘內可能曬傷`,
  },
  en: {
    color: {
      green: "green",
      yellow: "yellow",
      orange: "orange",
      red: "red",
      purple: "purple",
    },
    status: {
      empty: "Enter the UV index and your skin type, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      SCHEMA_SKIN: "Choose a skin type from I to VI.",
      INPUT_LIMIT: "Input is too long (at most 8 characters).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      FORMAT: "Enter a number from 0 to 20 with at most 1 decimal place, such as 8.5.",
      RANGE: "The UV index must be between 0 and 20.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    spfNone: "no reapplication schedule",
    spfReapply: (minutes) => `reapply every ${minutes} minutes`,
    burnNone: "No estimate (UV index is 0)",
    burnCapped: "180+ minutes (estimate, not a safe exposure time)",
    burnMinutes: (minutes) => `About ${minutes} minutes (estimate, not a safe exposure time)`,
    cwaNone: "—",
    cwaMinutes: (minutes) => `Burn possible within ${minutes} minutes`,
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const uvInput = $("input-uv");
const skinSelect = $("select-skin");
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const swatchEl = $("result-swatch");
const categoryEl = $("result-category");
const spfEl = $("result-spf");
const burnEl = $("result-burn");
const cwaEl = $("result-cwa");
const adviceEl = $("result-advice");
const skinEl = $("result-skin");
const disclaimerEl = $("result-disclaimer");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = { uvIndex: $("error-uv"), skinType: $("error-skin") };
const fieldEls = { uvIndex: uvInput, skinType: skinSelect };

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
  if (error.code === "RANGE") return T.errors.RANGE;
  if (error.code === "SCHEMA" && error.field === "skinType") return T.errors.SCHEMA_SKIN;
  return T.errors[error.code] || T.errors.WORKER_ERROR;
}

function buildSentence(result, draft) {
  const uv = normalizeEcho(draft.uvIndex);
  const categoryName = LANG === "zh" ? result.category.zh : result.category.en;
  const colorName = T.color[result.category.color];
  if (LANG === "zh") {
    return `紫外線指數 ${uv}，屬於${categoryName}（${colorName}，${result.category.pms}），建議使用 SPF ${result.spfMinimum}+ 防曬乳。`;
  }
  return `UV index ${uv} is ${categoryName} (${colorName}, ${result.category.pms}). Use SPF ${result.spfMinimum}+ sunscreen.`;
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

  setFieldError("uvIndex", null);
  setFieldError("skinType", null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    sentenceEl.textContent = buildSentence(result, snap.draft);
    swatchEl.className = `swatch swatch-${result.category.color}`;
    swatchEl.textContent = T.color[result.category.color];
    categoryEl.textContent = LANG === "zh" ? result.category.zh : result.category.en;
    const sep = LANG === "zh" ? "；" : "; ";
    spfEl.textContent =
      result.reapplyMinutes === null
        ? `SPF ${result.spfMinimum}+${sep}${T.spfNone}`
        : `SPF ${result.spfMinimum}+${sep}${T.spfReapply(result.reapplyMinutes)}`;
    const estimate = result.burnEstimate;
    burnEl.textContent =
      estimate.minutesToRedness === null
        ? T.burnNone
        : estimate.capped
          ? T.burnCapped
          : T.burnMinutes(estimate.minutesToRedness);
    cwaEl.textContent =
      result.cwaBurnTimeMinutes === null ? T.cwaNone : T.cwaMinutes(result.cwaBurnTimeMinutes);
    adviceEl.textContent = LANG === "zh" ? result.adviceZh : result.adviceEn;
    skinEl.textContent = LANG === "zh" ? result.skinNoteZh : result.skinNoteEn;
    disclaimerEl.textContent = LANG === "zh" ? result.disclaimerZh : result.disclaimerEn;
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
            : uvInput;
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
  uvInput.value = draft.uvIndex;
  skinSelect.value = draft.skinType;
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

uvInput.addEventListener("input", () => {
  controller.edit({ uvIndex: uvInput.value });
  render();
});
skinSelect.addEventListener("change", () => {
  controller.edit({ skinType: skinSelect.value });
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
  uvInput.focus();
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
