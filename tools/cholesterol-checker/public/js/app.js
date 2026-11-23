// Cholesterol Checker — DOM app.
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
    itemLabel: {
      total: "總膽固醇",
      ldl: "LDL",
      hdl: "HDL",
      triglycerides: "三酸甘油脂",
    },
    item: (label, value, band) => `${label}：${value} mg/dL — ${band}`,
    band: {
      desirable: "理想",
      "borderline-high": "邊緣偏高",
      high: "偏高",
      optimal: "最佳",
      "near-optimal": "接近或略高於最佳",
      low: "偏低",
      normal: "正常",
      "very-high": "很高",
    },
    overall: {
      "all-desirable": "四項數值皆在理想範圍",
      borderline: "部分數值為邊緣值，建議追蹤",
      "needs-attention": "有一項以上數值需要注意，建議諮詢醫師",
    },
    nonHdl: (value) => `非 HDL 膽固醇：${value} mg/dL（僅供參考，不分級）`,
    hdlNote:
      "HDL ≥60 mg/dL 在 ATP III 視為「負向危險因子」，具保護性；偏低（<40）才需要注意。",
    status: {
      empty: "請輸入數值，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「查詢分級」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長（每欄最多 5 個字元）。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      INTEGER_FORMAT: "請輸入整數，例如 180。",
      RANGE: "數值超出允許範圍（1–9999 mg/dL）。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
  },
  en: {
    itemLabel: {
      total: "Total cholesterol",
      ldl: "LDL",
      hdl: "HDL",
      triglycerides: "Triglycerides",
    },
    item: (label, value, band) => `${label}: ${value} mg/dL — ${band}`,
    band: {
      desirable: "Desirable",
      "borderline-high": "Borderline high",
      high: "High",
      optimal: "Optimal",
      "near-optimal": "Near or above optimal",
      low: "Low",
      normal: "Normal",
      "very-high": "Very high",
    },
    overall: {
      "all-desirable": "All four values are in the desirable range",
      borderline: "Some values are borderline — consider follow-up testing",
      "needs-attention": "One or more values need attention — consider consulting a physician",
    },
    nonHdl: (value) => `Non-HDL cholesterol: ${value} mg/dL (reference only, not classified)`,
    hdlNote:
      "ATP III treats HDL ≥60 mg/dL as a “negative” risk factor — protective; low HDL (<40) is the concern.",
    status: {
      empty: "Enter values, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "The input is too long (at most 5 characters per field).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number, such as 180.",
      RANGE: "The number is outside the allowed range (1–9999 mg/dL).",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
  },
};

const T = STRINGS[LANG];
const FIELDS = ["total", "ldl", "hdl", "triglycerides"];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const inputs = {
  total: $("input-total"),
  ldl: $("input-ldl"),
  hdl: $("input-hdl"),
  triglycerides: $("input-triglycerides"),
};
const statusEl = $("status");
const resultEl = $("result");
const overallEl = $("result-overall");
const itemEls = {
  total: $("result-total"),
  ldl: $("result-ldl"),
  hdl: $("result-hdl"),
  triglycerides: $("result-triglycerides"),
};
const nonHdlEl = $("result-nonhdl");
const hdlNoteRow = $("result-hdl-note");
const hdlNoteEl = $("result-hdl-note-text");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = {
  total: $("error-total"),
  ldl: $("error-ldl"),
  hdl: $("error-hdl"),
  triglycerides: $("error-triglycerides"),
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

function errorMessage(error) {
  if (!error) return "";
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
  const input = inputs[field];
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

  for (const field of FIELDS) setFieldError(field, null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    overallEl.textContent = T.overall[result.overall.label];
    for (const field of FIELDS) {
      const c = result.classifications[field];
      itemEls[field].textContent = T.item(
        T.itemLabel[field],
        result.values[field],
        T.band[c.band]
      );
    }
    nonHdlEl.textContent = T.nonHdl(result.nonHdl);
    if (result.classifications.hdl.band === "high") {
      hdlNoteRow.hidden = false;
      hdlNoteEl.textContent = T.hdlNote;
    } else {
      hdlNoteRow.hidden = true;
      hdlNoteEl.textContent = "";
    }
    resultEl.hidden = false;
    statusEl.textContent = T.overall[result.overall.label];
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
          snap.error.field && inputs[snap.error.field]
            ? inputs[snap.error.field]
            : inputs.total;
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
  for (const field of FIELDS) inputs[field].value = draft[field];
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

for (const field of FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
    render();
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
  inputs.total.focus();
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
