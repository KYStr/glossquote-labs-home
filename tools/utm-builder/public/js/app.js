// UTM Builder — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.
// "Copy link" is the delivery action: it calls navigator.clipboard
// .writeText only on an explicit click, with only the current taggedUrl.
// A copy failure shows a localized COPY_FAILED message and keeps the
// result and the report download.

import { Controller } from "./core/controller.mjs";
import { REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    status: {
      empty: "請輸入目標網址與 UTM 參數，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「建立連結」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
      success: "已建立追蹤連結。",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT_BASEURL: "輸入太長（目標網址最多 2048 個字元）。",
      INPUT_LIMIT_VALUE: "輸入太長（每個 UTM 值最多 200 個字元）。",
      INVALID_URL: "目標網址無效：請輸入 http 或 https 開頭、有主機的完整網址，且不得含帳號或密碼。",
      DUPLICATE_UTM: "目標網址已含有 utm_* 參數，不會覆寫；請先移除原有參數再建立。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      INVALID_CHAR: "此欄含有不允許的控制字元。",
      VALUE_TOO_LONG: "此欄去空白後最多 100 個字元。",
      COPY_FAILED: "複製失敗，請手動選取連結複製。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
  },
  en: {
    status: {
      empty: "Enter a target URL and UTM parameters, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
      success: "Tagged link ready.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT_BASEURL: "Input is too long (target URL: at most 2048 characters).",
      INPUT_LIMIT_VALUE: "Input is too long (each UTM value: at most 200 characters).",
      INVALID_URL: "The target URL is invalid: enter a complete http or https URL with a host and no username or password.",
      DUPLICATE_UTM: "The target URL already contains a utm_* parameter and will not be overwritten; remove it first, then build.",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      INVALID_CHAR: "This field contains a control character, which is not allowed.",
      VALUE_TOO_LONG: "This field is at most 100 characters after trimming.",
      COPY_FAILED: "Copy failed. Select the link and copy it manually.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
  },
};

const T = STRINGS[LANG];

const FIELDS = ["baseUrl", "source", "medium", "campaign", "term", "content"];
const FIELD_IDS = {
  baseUrl: "input-baseurl",
  source: "input-source",
  medium: "input-medium",
  campaign: "input-campaign",
  term: "input-term",
  content: "input-content",
};
const ERROR_IDS = {
  baseUrl: "error-baseurl",
  source: "error-source",
  medium: "error-medium",
  campaign: "error-campaign",
  term: "error-term",
  content: "error-content",
};
const PARAM_ROW_IDS = {
  source: "param-row-source",
  medium: "param-row-medium",
  campaign: "param-row-campaign",
  term: "param-row-term",
  content: "param-row-content",
};
const PARAM_VALUE_IDS = {
  source: "param-value-source",
  medium: "param-value-medium",
  campaign: "param-value-campaign",
  term: "param-value-term",
  content: "param-value-content",
};

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const statusEl = $("status");
const resultEl = $("result");
const urlEl = $("result-url");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const copyBtn = $("btn-copy");
const downloadBtn = $("btn-download");
const presetBtns = {
  social: $("btn-preset-social"),
  newsletter: $("btn-preset-newsletter"),
  ads: $("btn-preset-ads"),
};
const fieldEls = {};
const errorEls = {};
const paramRowEls = {};
const paramValueEls = {};
for (const field of FIELDS) {
  fieldEls[field] = $(FIELD_IDS[field]);
  errorEls[field] = $(ERROR_IDS[field]);
}
for (const field of ["source", "medium", "campaign", "term", "content"]) {
  paramRowEls[field] = $(PARAM_ROW_IDS[field]);
  paramValueEls[field] = $(PARAM_VALUE_IDS[field]);
}

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
  const taggedUrl = controller.result.taggedUrl;
  let promise;
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      throw new Error("clipboard unavailable");
    }
    promise = navigator.clipboard.writeText(taggedUrl);
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
    return error.field === "baseUrl"
      ? T.errors.INPUT_LIMIT_BASEURL
      : T.errors.INPUT_LIMIT_VALUE;
  }
  return T.errors[error.code] || T.errors.WORKER_ERROR;
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

  for (const field of FIELDS) setFieldError(field, null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    urlEl.textContent = result.taggedUrl;
    const byKey = new Map(result.params.map((p) => [p.key, p.value]));
    for (const field of ["source", "medium", "campaign", "term", "content"]) {
      const key = `utm_${field}`;
      if (byKey.has(key)) {
        paramValueEls[field].textContent = byKey.get(key);
        paramRowEls[field].hidden = false;
      } else {
        paramValueEls[field].textContent = "";
        paramRowEls[field].hidden = true;
      }
    }
    resultEl.hidden = false;
    statusEl.textContent = copyFailed ? T.errors.COPY_FAILED : T.status.success;
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
            : fieldEls.baseUrl;
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
  for (const field of FIELDS) fieldEls[field].value = draft[field];
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  copyFailed = false;
  controller.run();
  render();
});

for (const field of FIELDS) {
  fieldEls[field].addEventListener("input", () => {
    copyFailed = false;
    controller.edit({ [field]: fieldEls[field].value });
    render();
  });
}

exampleBtn.addEventListener("click", () => {
  copyFailed = false;
  controller.loadExample();
  syncDomFromDraft();
  render();
});

for (const [name, button] of Object.entries(presetBtns)) {
  button.addEventListener("click", () => {
    copyFailed = false;
    controller.applyPreset(name);
    syncDomFromDraft();
    render();
  });
}

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
  fieldEls.baseUrl.focus();
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
