// DOM wiring for the Reading Time Estimator. All user-visible text
// is set through textContent/value only; user input never becomes
// HTML. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, sequence, and state machine; this file
// only renders it. The draft lives only in this page: nothing is
// stored, uploaded, or added to the URL.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  serializeReport,
} from "./core/reading-time.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      INTERNAL: "估算失敗，請重試",
      WORKER_ERROR: "估算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    countsLine: (cjkChars, latinWords) => `漢字 ${cjkChars} 字 · 英文 ${latinWords} 詞`,
    silentLine: (display, seconds) => `靜讀 ${display}（${seconds} 秒）`,
    speakLine: (display, seconds) => `朗讀 ${display}（${seconds} 秒）`,
    ratesLine: (draft) =>
      `所用速度：中文靜讀 ${draft.zhSilentRate} 字/分、中文朗讀 ${draft.zhSpeakRate} 字/分、英文靜讀 ${draft.enSilentRate} 詞/分、英文朗讀 ${draft.enSpeakRate} 詞/分`,
    rulesLine:
      "計數規則：漢字逐字計；英文以空白分詞，token 含 ASCII 字母或數字才算 1 詞；總秒數只捨入一次。",
    zeroNote:
      "計數為 0：本文只有空白或符號，或只有日文假名、韓文等本工具 v1 不計數的字元。",
    exampleNote: "已載入範例，請按「估算閱讀時間」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    countsLine: (cjkChars, latinWords) =>
      `Chinese characters: ${cjkChars} · English words: ${latinWords}`,
    silentLine: (display, seconds) => `Silent reading ${display} (${seconds} seconds)`,
    speakLine: (display, seconds) => `Read aloud ${display} (${seconds} seconds)`,
    ratesLine: (draft) =>
      `Speeds used: Chinese silent ${draft.zhSilentRate}/min, Chinese speaking ${draft.zhSpeakRate}/min, English silent ${draft.enSilentRate}/min, English speaking ${draft.enSpeakRate}/min`,
    rulesLine:
      "Counting rules: CJK characters are counted one by one; English tokens are split on whitespace and count as one word when they contain an ASCII letter or digit; total seconds are rounded only once.",
    zeroNote:
      "Counts are zero: the text has only spaces or symbols, or only characters v1 does not count, such as Japanese kana or Korean syllables.",
    exampleNote: "Example loaded. Run “Estimate reading time” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("reading-time-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const countsEl = document.getElementById("counts");
const silentEl = document.getElementById("silent-time");
const speakEl = document.getElementById("speak-time");
const ratesEl = document.getElementById("rates-echo");
const rulesEl = document.getElementById("rules-echo");
const zeroNoteEl = document.getElementById("zero-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const cancelBtn = document.getElementById("cancel-btn");
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
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    countsEl.textContent = t.countsLine(result.cjkChars, result.latinWords);
    silentEl.textContent = t.silentLine(result.silentDisplay, result.silentSeconds);
    speakEl.textContent = t.speakLine(result.speakDisplay, result.speakSeconds);
    ratesEl.textContent = t.ratesLine(draft);
    rulesEl.textContent = t.rulesLine;
    zeroNoteEl.hidden = !(result.cjkChars === 0 && result.latinWords === 0);
    if (!zeroNoteEl.hidden) zeroNoteEl.textContent = t.zeroNote;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = t.error[error.code] ?? t.error.INTERNAL;
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
  inputs.text.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (current.state !== "success" || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusEl.textContent = t.error.OUTPUT_LIMIT;
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
