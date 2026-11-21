// DOM wiring for the VO2max Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft is persisted through the injected storage adapter (the pinned
// storage key from the core); a stored draft that fails the schema
// gate is discarded by the controller and the default draft is used.

import { createController } from "./controller.mjs";
import {
  CATEGORY_LABELS,
  FIELDS,
  REPORT_FILENAME,
  formatDistanceM,
  formatDuration,
  formatVo2max,
  serializeReport,
} from "./core/vo2max.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      test: "測驗",
      distanceMeters: "距離（公尺）",
      time: "時間",
      age: "年齡",
      sex: "性別",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "距離請用數字（公尺），最多一位小數",
      TIME_FORMAT: "時間格式為 分:秒 或 時:分:秒",
      INTEGER_FORMAT: "年齡請用整數",
      RANGE: "超出允許範圍",
      PAIR_REQUIRED: "年齡與性別需一起填寫",
      BELOW_RANGE: "距離太短，無法估算",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    testName: { cooper12: "Cooper 12 分鐘跑", mile15: "1.5 英里跑" },
    resultHeading: "估算結果",
    vo2maxUnit: "ml/kg/min",
    echoDistance: (distanceMeters) => `距離：${formatDistanceM(distanceMeters)} 公尺`,
    echoTime: (timeSeconds) => `時間：${formatDuration(timeSeconds)}（${timeSeconds} 秒）`,
    classificationLine: (ageBand, category) => `年齡帶 ${ageBand} · ${CATEGORY_LABELS[category].zh}`,
    noClassificationHint: "填入年齡與性別，可對照 Cooper Institute 體適能分級。",
    disclaimer:
      "估算值：實地測驗公式的估算，與實驗室氣體分析相比誤差約 ±10%，適合追蹤個人變化而非醫學判斷。分級來自 Cooper Institute 常模，為群體近似值，不同出版品略有差異；請把等級當作參考，不要當成醫療門檻。",
    exampleNote: "已載入範例，請按「計算最大攝氧量」執行。",
  },
  en: {
    fieldLabel: {
      test: "Test",
      distanceMeters: "Distance (metres)",
      time: "Time",
      age: "Age",
      sex: "Sex",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter the distance in metres, with at most one decimal place.",
      TIME_FORMAT: "Use M:SS or H:MM:SS.",
      INTEGER_FORMAT: "Enter the age as a whole number.",
      RANGE: "Out of range.",
      PAIR_REQUIRED: "Age and sex must be entered together.",
      BELOW_RANGE: "Distance too short to estimate.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    testName: { cooper12: "Cooper 12-minute run", mile15: "1.5-mile run" },
    resultHeading: "Estimated result",
    vo2maxUnit: "ml/kg/min",
    echoDistance: (distanceMeters) => `Distance: ${formatDistanceM(distanceMeters)} metres`,
    echoTime: (timeSeconds) => `Time: ${formatDuration(timeSeconds)} (${timeSeconds} seconds)`,
    classificationLine: (ageBand, category) => `Age band ${ageBand} · ${CATEGORY_LABELS[category].en}`,
    noClassificationHint:
      "Add your age and sex to see the Cooper Institute fitness rating.",
    disclaimer:
      "Estimate: a field-test estimate, roughly ±10% against laboratory gas analysis — good for tracking change, not a medical measurement. The rating comes from the Cooper Institute norms, which are approximate population norms; reproductions vary slightly. Treat the rating as a reference, not a medical cut-off.",
    exampleNote: "Example loaded. Run “Calculate VO2 max” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("vo2max-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const vo2maxEl = document.getElementById("vo2max-value");
const echoEl = document.getElementById("result-echo");
const classificationEl = document.getElementById("result-classification");
const disclaimerEl = document.getElementById("disclaimer");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
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
  inputs.distanceMeters.disabled = draft.test !== "cooper12";
  inputs.time.disabled = draft.test !== "mile15";
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "submitting" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "submitting";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    vo2maxEl.textContent = `${formatVo2max(result.vo2max)} ${t.vo2maxUnit}`;
    const testLine = t.testName[result.test];
    echoEl.textContent =
      result.test === "cooper12"
        ? `${testLine} · ${t.echoDistance(result.distanceMeters)}`
        : `${testLine} · ${t.echoTime(result.timeSeconds)}`;
    classificationEl.textContent =
      result.classification === null
        ? t.noClassificationHint
        : t.classificationLine(
            result.classification.ageBand,
            result.classification.category,
          );
    disclaimerEl.textContent = t.disclaimer;
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

const storageAdapter = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

const controller = createController({ createWorker, storage: storageAdapter, onChange: render });

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
inputs.test.addEventListener("change", () => {
  controller.edit({ test: inputs.test.value });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.test.focus();
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
