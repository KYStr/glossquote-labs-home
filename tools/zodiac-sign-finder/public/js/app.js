// DOM wiring for the Zodiac Sign Finder. The controller owns state;
// this module only renders snapshots and forwards user actions. All text
// is set with textContent/value; user input never becomes HTML.

import { createController } from "./controller.mjs";
import {
  ELEMENT_LABELS,
  MODALITY_LABELS,
  MONTH_ABBR_EN,
  SIGN_NAMES,
} from "./core/zodiac.mjs";
import { WORKER_SOURCE } from "./worker-source.mjs";

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

/** First core case of docs/specs/zodiac-sign-finder/fixtures.json. */
const EXAMPLE = Object.freeze({ month: "12", day: "25", year: "" });

const STRINGS = {
  zh: {
    badge: {
      empty: "尚未開始",
      dirty: "已變更，請重新執行",
      busy: "處理中",
      success: "已完成",
      error: "有錯誤",
      cancelled: "已取消",
    },
    status: {
      empty: "請輸入出生月、日，或載入範例。",
      dirty: "輸入已變更，請重新執行。",
      busy: "處理中…",
      success: "查詢完成，可下載報告。",
      cancelled: "已取消，可重新執行。",
      fieldError: "輸入有誤，請修正標示的欄位。",
    },
    errors: {
      SCHEMA: "輸入格式錯誤。",
      INPUT_LIMIT: "欄位過長（最多 8 個字元）。",
      UNICODE: "含有不成對的代理字元。",
      EMPTY: "此欄必填。",
      INTEGER_FORMAT: "請輸入整數（只接受 0 或非零開頭的十進位數字）。",
      RANGE: "數值超出範圍。",
      DATE_INVALID: "這個日期不存在。",
      INTERNAL: "發生內部錯誤，請再試一次。",
      WORKER_ERROR: "背景工作失敗，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超出大小上限。",
    },
    rangeLabel: (start, end) =>
      `${start.month} 月 ${start.day} 日 – ${end.month} 月 ${end.day} 日`,
    cusp: "接近交界，依出生年與時間可能不同",
    neighbour: (name) => `相鄰星座：${name}`,
  },
  en: {
    badge: {
      empty: "Not started",
      dirty: "Changed — run again",
      busy: "Working",
      success: "Done",
      error: "Error",
      cancelled: "Cancelled",
    },
    status: {
      empty: "Enter a birth month and day, or load the example.",
      dirty: "Input changed. Run again.",
      busy: "Working…",
      success: "Lookup complete. You can download the report.",
      cancelled: "Cancelled. You can run again.",
      fieldError: "There is an input error. Fix the marked field.",
    },
    errors: {
      SCHEMA: "Invalid input format.",
      INPUT_LIMIT: "Field is too long (maximum 8 characters).",
      UNICODE: "Contains an unpaired surrogate.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter an integer (a decimal number, 0 or starting with a non-zero digit).",
      RANGE: "Value is out of range.",
      DATE_INVALID: "This date does not exist.",
      INTERNAL: "An internal error occurred. Please try again.",
      WORKER_ERROR: "The background worker failed. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit.",
    },
    rangeLabel: (start, end) =>
      `${MONTH_ABBR_EN[start.month - 1]} ${start.day} – ${MONTH_ABBR_EN[end.month - 1]} ${end.day}`,
    cusp: "Near a cusp — the sign can differ by birth year and time",
    neighbour: (name) => `Neighbouring sign: ${name}`,
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const monthInput = $("month-input");
const dayInput = $("day-input");
const yearInput = $("year-input");
const fieldInputs = { month: monthInput, day: dayInput, year: yearInput };
const fieldErrors = {
  month: $("month-error"),
  day: $("day-error"),
  year: $("year-error"),
};
const form = $("zodiac-form");
const findButton = $("find-button");
const exampleButton = $("example-button");
const cancelButton = $("cancel-button");
const resetButton = $("reset-button");
const downloadButton = $("download-button");
const statusBadge = $("status-badge");
const statusLine = $("status-line");
const resultSection = $("result");
const resultSymbol = $("result-symbol");
const resultName = $("result-name");
const resultRange = $("result-range");
const resultAttrs = $("result-attrs");
const resultCusp = $("result-cusp");
const resultNeighbour = $("result-neighbour");

function createRealWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const inner = new Worker(url, { type: "module" });
  return {
    postMessage(message) {
      inner.postMessage(message);
    },
    terminate() {
      inner.terminate();
      URL.revokeObjectURL(url);
    },
    set onmessage(handler) {
      inner.onmessage = handler;
    },
    get onmessage() {
      return inner.onmessage;
    },
    set onerror(handler) {
      inner.onerror = handler;
    },
    get onerror() {
      return inner.onerror;
    },
  };
}

const controller = createController({ createWorker: createRealWorker });

let submittedRun = false;
let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

function setFieldError(field, message) {
  const input = fieldInputs[field];
  const errorElement = fieldErrors[field];
  if (message === null) {
    errorElement.hidden = true;
    errorElement.textContent = "";
    input.removeAttribute("aria-invalid");
    return;
  }
  errorElement.hidden = false;
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function clearFieldErrors() {
  for (const field of Object.keys(fieldInputs)) setFieldError(field, null);
}

function renderResult(result) {
  const names = SIGN_NAMES[result.sign];
  // The SPEC shows the sign name in both languages side by side.
  resultSymbol.textContent = result.symbol;
  resultName.textContent = `${names.zh} / ${names.en}`;
  resultRange.textContent = T.rangeLabel(result.rangeStart, result.rangeEnd);
  const element = ELEMENT_LABELS[result.element];
  const modality = MODALITY_LABELS[result.modality];
  resultAttrs.textContent =
    `${element.zh} · ${modality.zh} / ${element.en} · ${modality.en}`;
  if (result.cusp) {
    resultCusp.hidden = false;
    resultCusp.textContent = T.cusp;
    resultNeighbour.hidden = false;
    resultNeighbour.textContent = T.neighbour(
      LANG === "en"
        ? SIGN_NAMES[result.cuspNeighbor].en
        : SIGN_NAMES[result.cuspNeighbor].zh,
    );
  } else {
    resultCusp.hidden = true;
    resultCusp.textContent = "";
    resultNeighbour.hidden = true;
    resultNeighbour.textContent = "";
  }
}

function render(state) {
  statusBadge.textContent = T.badge[state.state];
  statusBadge.dataset.tone =
    state.state === "success"
      ? "success"
      : state.state === "error"
        ? "danger"
        : state.state === "dirty" || state.state === "cancelled"
          ? "warning"
          : "info";

  if (state.state !== "success") revokeDownload();

  if (state.state === "error" && state.error !== null) {
    const { code, field } = state.error;
    const message = T.errors[code] ?? T.errors.INTERNAL;
    clearFieldErrors();
    if (field !== null && fieldInputs[field]) {
      setFieldError(field, message);
      statusLine.textContent = T.status.fieldError;
      statusLine.dataset.tone = "danger";
      if (submittedRun) {
        fieldInputs[field].focus();
        submittedRun = false;
      }
    } else {
      statusLine.textContent = message;
      statusLine.dataset.tone = "danger";
    }
  } else {
    clearFieldErrors();
    statusLine.textContent = T.status[state.state];
    statusLine.dataset.tone = state.state === "dirty" ? "warning" : "";
  }

  findButton.disabled = state.state === "busy";
  exampleButton.disabled = state.state === "busy";
  resetButton.disabled = state.state === "busy";
  cancelButton.hidden = state.state !== "busy";
  if (state.state === "busy") {
    form.setAttribute("aria-busy", "true");
  } else {
    form.removeAttribute("aria-busy");
  }

  if (state.state === "success" && state.result !== null) {
    resultSection.hidden = false;
    renderResult(state.result);
  } else {
    resultSection.hidden = true;
    resultSymbol.textContent = "";
    resultName.textContent = "";
    resultRange.textContent = "";
    resultAttrs.textContent = "";
    resultCusp.hidden = true;
    resultCusp.textContent = "";
    resultNeighbour.hidden = true;
    resultNeighbour.textContent = "";
  }
}

controller.onChange(render);

function syncDraft() {
  controller.setDraft({
    month: monthInput.value,
    day: dayInput.value,
    year: yearInput.value,
  });
}

for (const input of [monthInput, dayInput, yearInput]) {
  input.addEventListener("input", syncDraft);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submittedRun = true;
  syncDraft();
  controller.run();
});

exampleButton.addEventListener("click", () => {
  controller.loadExample(EXAMPLE);
  monthInput.value = EXAMPLE.month;
  dayInput.value = EXAMPLE.day;
  yearInput.value = EXAMPLE.year;
  monthInput.focus();
});

cancelButton.addEventListener("click", () => {
  controller.cancel();
});

resetButton.addEventListener("click", () => {
  controller.reset();
  monthInput.value = "";
  dayInput.value = "";
  yearInput.value = "";
  monthInput.focus();
});

downloadButton.addEventListener("click", () => {
  const report = controller.getReport();
  if (report === null) return;
  revokeDownload();
  const blob = new Blob([report], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "zodiac-sign-report.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // The SPEC requires the download URL to be revoked within 30 seconds.
  downloadTimer = window.setTimeout(revokeDownload, 30000);
});

window.addEventListener("pagehide", () => {
  revokeDownload();
  if (controller.getState().state === "busy") controller.cancel();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    monthInput.value = "";
    dayInput.value = "";
    yearInput.value = "";
  }
});

render(controller.getState());
