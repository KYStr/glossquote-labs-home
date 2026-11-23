// URL Slug Generator — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.
// "Copy slug" is the delivery action: it calls navigator.clipboard
// .writeText only on an explicit click, with only the current slug. A copy
// failure shows a localized COPY_FAILED message and keeps the result and
// the report download.

import { Controller } from "./core/controller.mjs";
import { REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    status: {
      empty: "請輸入標題，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「產生 slug」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT_TITLE: "輸入太長（標題最多 1000 個字元）。",
      INPUT_LIMIT_MAXLENGTH: "輸入太長（長度上限最多 8 個字元）。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      EMPTY_SLUG: "標題轉換後沒有可用的 slug，請加入拉丁字母或數字。",
      INTEGER_FORMAT: "請輸入整數，例如 50；不接受小數、符號或空白。",
      RANGE: "長度上限需介於 1 至 100。",
      COPY_FAILED: "複製失敗，請手動選取 slug 複製。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    truncatedYes: "是",
    truncatedNo: "否",
  },
  en: {
    status: {
      empty: "Enter a title, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT_TITLE: "Input is too long (title: at most 1000 characters).",
      INPUT_LIMIT_MAXLENGTH: "Input is too long (max length: at most 8 characters).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      EMPTY_SLUG: "The title produced no usable slug. Add Latin letters or digits.",
      INTEGER_FORMAT: "Enter a whole number, such as 50; no decimals, signs or spaces.",
      RANGE: "Max length must be between 1 and 100.",
      COPY_FAILED: "Copy failed. Select the slug and copy it manually.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    truncatedYes: "Yes",
    truncatedNo: "No",
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const titleInput = $("input-title");
const maxLengthInput = $("input-maxlength");
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const slugEl = $("result-slug");
const lengthEl = $("result-length");
const maxLengthEl = $("result-maxlength");
const truncatedEl = $("result-truncated");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const copyBtn = $("btn-copy");
const downloadBtn = $("btn-download");
const errorEls = { title: $("error-title"), maxLength: $("error-maxlength") };
const fieldEls = { title: titleInput, maxLength: maxLengthInput };

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

// --- Copy handling ---------------------------------------------------------
// A copy failure is a transient message only: the result and the report
// download stay available.

let copyFailed = false;

copyBtn.addEventListener("click", () => {
  if (!controller.result) return;
  const slug = controller.result.slug;
  let promise;
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      throw new Error("clipboard unavailable");
    }
    promise = navigator.clipboard.writeText(slug);
  } catch {
    copyFailed = true;
    render();
    return;
  }
  Promise.resolve(promise).then(
    () => {
      copyFailed = false;
      render();
    },
    () => {
      copyFailed = true;
      render();
    }
  );
});

// --- Rendering ---------------------------------------------------------------

let focusFirstErrorOnError = false;

function errorMessage(error) {
  if (!error) return "";
  if (error.code === "INPUT_LIMIT") {
    return error.field === "title"
      ? T.errors.INPUT_LIMIT_TITLE
      : T.errors.INPUT_LIMIT_MAXLENGTH;
  }
  return T.errors[error.code] || T.errors.WORKER_ERROR;
}

function buildSentence(result) {
  if (LANG === "zh") {
    return `已產生 slug：${result.slug}。`;
  }
  return `Slug ready: ${result.slug}.`;
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
  copyBtn.hidden = !snap.reportAvailable;
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  setFieldError("title", null);
  setFieldError("maxLength", null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    sentenceEl.textContent = buildSentence(result);
    slugEl.textContent = result.slug;
    lengthEl.textContent = String(result.length);
    maxLengthEl.textContent = String(result.maxLength);
    truncatedEl.textContent = result.truncated ? T.truncatedYes : T.truncatedNo;
    resultEl.hidden = false;
    statusEl.textContent = copyFailed ? T.errors.COPY_FAILED : sentenceEl.textContent;
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
            : titleInput;
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
  titleInput.value = draft.title;
  maxLengthInput.value = draft.maxLength;
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  copyFailed = false;
  controller.run();
  render();
});

titleInput.addEventListener("input", () => {
  copyFailed = false;
  controller.edit({ title: titleInput.value });
  render();
});
maxLengthInput.addEventListener("input", () => {
  copyFailed = false;
  controller.edit({ maxLength: maxLengthInput.value });
  render();
});

exampleBtn.addEventListener("click", () => {
  copyFailed = false;
  controller.loadExample();
  syncDomFromDraft();
  render();
});

cancelBtn.addEventListener("click", () => {
  copyFailed = false;
  controller.cancel();
  render();
});

resetBtn.addEventListener("click", () => {
  copyFailed = false;
  controller.reset();
  syncDomFromDraft();
  render();
  titleInput.focus();
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
