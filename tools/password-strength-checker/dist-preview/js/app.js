// DOM wiring for the Password Strength Checker. All user-visible
// text is set through textContent/value only; user input never
// becomes markup. Computation runs in a module Worker built from the
// fixed worker source embedded by the preview build (WORKER_SOURCE).
// The controller owns the draft, generation, and state machine; this
// file only renders it. The fixed report download
// (password-strength-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.
//
// Privacy: the password lives only in the page memory and the Worker
// message. It is never written to storage, the URL, the title, the
// console, or any log; the results area and the report never quote
// the password or any substring of it (penalty rows name only the
// feature, e.g. "contains a dictionary word", never the word). There
// is deliberately no copy-password button.

import { createController } from "./controller.mjs";
import {
  BAND_LABELS,
  PENALTY_INFO,
  SUGGESTION_TEXTS,
  buildReport,
} from "./core/password-strength.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "密碼超過 128 個字元上限",
      UNICODE: "密碼含有不成對的字元",
      EMPTY: "請輸入密碼",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未評估。輸入密碼，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成範例密碼），請按「評估強度」執行。",
    downloaded: "報告已下載。",
    showPassword: "顯示密碼",
    hidePassword: "隱藏密碼",
    labelFinalEntropy: "最終熵",
    labelBand: "強度等級",
    labelOnline: "線上破解時間（10 次／秒）",
    labelOffline: "離線破解時間（10¹⁰ 次／秒）",
    labelBaseEntropy: "基礎熵",
    labelTotalPenalty: "扣分總計",
    labelLength: "密碼長度",
    labelClasses: "字元類別",
    labelPenalties: "扣分明細",
    labelSuggestions: "改進建議",
    bitsUnit: "bits",
    noPenalties: "無扣分",
    noSuggestions: "沒有需要改進的地方",
    classLabel: {
      lowercase: "小寫字母",
      uppercase: "大寫字母",
      digits: "數字",
      symbols: "符號",
      other: "其他字元",
    },
    lengthValue: (length) => `${length} 個字元`,
    penaltyValue: (bits) => `−${bits} bits`,
    bandValue: (result) =>
      `${BAND_LABELS[result.band].zh}（${BAND_LABELS[result.band].en}）`,
    successSummary: (result) => `${BAND_LABELS[result.band].zh}，${result.finalEntropyBits} bits`,
  },
  en: {
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "The password exceeds the 128-character limit.",
      UNICODE: "The password contains an unpaired character.",
      EMPTY: "Enter a password.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty: "Nothing checked yet. Enter a password, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (a synthetic example password). Press “Check strength” to run it.",
    downloaded: "Report downloaded.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    labelFinalEntropy: "Final entropy",
    labelBand: "Strength band",
    labelOnline: "Online crack time (10 guesses/sec)",
    labelOffline: "Offline crack time (10¹⁰ guesses/sec)",
    labelBaseEntropy: "Base entropy",
    labelTotalPenalty: "Total penalty",
    labelLength: "Password length",
    labelClasses: "Character classes",
    labelPenalties: "Penalty breakdown",
    labelSuggestions: "Improvements",
    bitsUnit: "bits",
    noPenalties: "No deductions",
    noSuggestions: "No improvements needed",
    classLabel: {
      lowercase: "Lowercase letters",
      uppercase: "Uppercase letters",
      digits: "Digits",
      symbols: "Symbols",
      other: "Other characters",
    },
    lengthValue: (length) => `${length} characters`,
    penaltyValue: (bits) => `−${bits} bits`,
    bandValue: (result) =>
      `${BAND_LABELS[result.band].en} (${BAND_LABELS[result.band].zh})`,
    successSummary: (result) => `${BAND_LABELS[result.band].en}, ${result.finalEntropyBits} bits`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const passwordInput = document.getElementById("field-password");
const passwordError = document.getElementById("error-password");
const showBtn = document.getElementById("show-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const penaltyRows = document.getElementById("penalty-rows");
const suggestionRows = document.getElementById("suggestion-rows");
const bandFill = document.getElementById("band-fill");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

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

let reportUrl = null;
let reportRevokeTimer = null;

function revokeReportUrl() {
  if (reportRevokeTimer !== null) {
    clearTimeout(reportRevokeTimer);
    reportRevokeTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function setFieldError(message) {
  if (message === null) {
    passwordInput.removeAttribute("aria-invalid");
    passwordInput.removeAttribute("aria-errormessage");
    passwordError.textContent = "";
    return;
  }
  passwordInput.setAttribute("aria-invalid", "true");
  passwordInput.setAttribute("aria-errormessage", "error-password");
  passwordError.textContent = message;
}

function errorMessage(error) {
  return t.error[error.code] ?? t.error.INTERNAL;
}

function appendSummaryRows(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    container.appendChild(div);
  }
}

function appendListRows(container, items) {
  container.replaceChildren();
  for (const text of items) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dd = document.createElement("dd");
    dd.textContent = text;
    div.appendChild(dd);
    container.appendChild(div);
  }
}

function renderResult(result) {
  const crack = lang === "en" ? "en" : "zh";
  appendSummaryRows(summaryRows, [
    [t.labelFinalEntropy, `${result.finalEntropyBits} ${t.bitsUnit}`],
    [t.labelBand, t.bandValue(result)],
    [t.labelOnline, result.crackTimeOnline[crack]],
    [t.labelOffline, result.crackTimeOffline[crack]],
    [t.labelBaseEntropy, `${result.baseEntropyBits} ${t.bitsUnit}`],
    [t.labelTotalPenalty, `${result.totalPenaltyBits} ${t.bitsUnit}`],
    [t.labelLength, t.lengthValue(result.passwordLength)],
    [
      t.labelClasses,
      result.classes.map((cls) => t.classLabel[cls]).join(lang === "en" ? ", " : "、"),
    ],
  ]);
  bandFill.style.width = `${Math.min(100, result.finalEntropyBits)}%`;
  bandFill.className = `band-fill band-${result.band.replace(" ", "-")}`;
  if (result.penalties.length === 0) {
    appendListRows(penaltyRows, [t.noPenalties]);
  } else {
    appendListRows(
      penaltyRows,
      result.penalties.map((entry) => {
        const info = PENALTY_INFO[entry.code];
        const description = lang === "en" ? info.en : info.zh;
        return `${entry.code} — ${description} — ${t.penaltyValue(entry.bits)}`;
      }),
    );
  }
  if (result.suggestions.length === 0) {
    appendListRows(suggestionRows, [t.noSuggestions]);
  } else {
    appendListRows(
      suggestionRows,
      result.suggestions.map((code) => {
        const text = SUGGESTION_TEXTS[code];
        return lang === "en" ? text.en : text.zh;
      }),
    );
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  if (passwordInput.value !== draft.password) passwordInput.value = draft.password;
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();

  if (state === "empty") {
    statusEl.textContent = t.statusEmpty;
    resultsEl.hidden = true;
    setFieldError(null);
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    setFieldError(null);
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    setFieldError(null);
  } else if (state === "error") {
    setFieldError(null);
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field === "password") {
        setFieldError(message);
        statusEl.textContent = message;
        if (submitted) {
          submitted = false;
          passwordInput.focus();
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
    statusEl.textContent = t.successSummary(result);
    resultsEl.hidden = false;
    setFieldError(null);
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

passwordInput.addEventListener("input", () => {
  controller.edit({ password: passwordInput.value });
});

showBtn.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  showBtn.textContent = showing ? t.showPassword : t.hidePassword;
  showBtn.setAttribute("aria-pressed", showing ? "false" : "true");
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  passwordInput.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusEl.textContent = errorMessage(report.error);
    return;
  }
  revokeReportUrl();
  const blob = new Blob([report.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportRevokeTimer = setTimeout(revokeReportUrl, 30000);
  statusEl.textContent = t.downloaded;
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeReportUrl();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
  }
});

render(controller.getState());
