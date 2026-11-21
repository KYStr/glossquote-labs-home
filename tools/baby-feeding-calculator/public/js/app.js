// DOM wiring for the Baby Feeding Calculator. All user-visible text
// is set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, sequence, and state machine; this file only renders it. The
// draft lives only in memory on this page: there is no persistent
// storage anywhere in this tool (the SPEC forbids it), and leaving the
// page discards the draft.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  NOTICE_TEXT,
  REPORT_FILENAME,
  formatAverageMl,
  formatWeightKg,
  serializeReport,
} from "./core/baby-feeding.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      DECIMAL_FORMAT: "體重請用數字（公斤），最多兩位小數",
      INTEGER_FORMAT: {
        factor: "係數請用整數",
        feedsPerDay: "餐數請用整數",
        ageMonths: "月齡請用整數",
      },
      RANGE: {
        weight: "體重需在 1–15 公斤之間",
        factor: "係數需在 150–200 之間",
        feedsPerDay: "餐數需在 1–24 之間",
        ageMonths: "月齡需在 0–24 個月之間",
      },
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    resultHeading: "每日總量與每餐奶量",
    totalLine: (total) => `每日總量：${total} ml`,
    averageLine: (average) => `每餐平均：${average} ml`,
    echoLine: (weight, factor, feeds) =>
      `體重 ${weight} 公斤 × 每公斤每日 ${factor} ml，分 ${feeds} 餐`,
    ageEcho: (age) => `月齡：${age} 個月（僅供標示，不影響計算）`,
    feedItem: (index, ml) => `第 ${index} 餐：${ml} ml`,
    disclaimer:
      "本工具僅依公開的一般餵食指引估算奶量，不是醫療建議，也不能取代醫師的診斷。每個寶寶需要的奶量都不同，請依寶寶的饑餓與飽足訊號餵食，並遵循您的兒科醫師、助產師或健康訪視員的個別建議。早產、低出生體重、正在生病或有健康狀況的寶寶，請完全依照醫療人員的指示餵食。",
    source:
      "指引來源：NHS 111 Wales《Infant formula: common questions》（頁面最後更新 2021-04-19，2026-11-09 查閱）：大多數寶寶在出生第一週結束後、到約 6 個月大之前，每天約需要每公斤體重 150 至 200 ml 的奶。本工具的預設值 150 是該範圍的下限，可在 150–200 間調整。",
    exampleNote: "已載入範例，請按「計算每日奶量」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      DECIMAL_FORMAT: "Enter the weight in kg, with at most two decimal places.",
      INTEGER_FORMAT: {
        factor: "Enter the factor as a whole number.",
        feedsPerDay: "Enter the number of feeds as a whole number.",
        ageMonths: "Enter the age as a whole number.",
      },
      RANGE: {
        weight: "Weight must be between 1 and 15 kg.",
        factor: "The factor must be between 150 and 200.",
        feedsPerDay: "Feeds per day must be between 1 and 24.",
        ageMonths: "Age must be between 0 and 24 months.",
      },
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    resultHeading: "Daily total and amount per feed",
    totalLine: (total) => `Daily total: ${total} ml`,
    averageLine: (average) => `Per-feed average: ${average} ml`,
    echoLine: (weight, factor, feeds) =>
      `Weight ${weight} kg × ${factor} ml per kg per day, split into ${feeds} feeds`,
    ageEcho: (age) => `Age: ${age} months (label only; does not change the result)`,
    feedItem: (index, ml) => `Feed ${index}: ${ml} ml`,
    disclaimer:
      "This tool only estimates milk volume from a published general feeding guideline. It is not medical advice and does not replace a clinician's judgement. Every baby needs a different amount: feed in response to your baby's hunger and fullness cues, and follow the individual advice of your paediatrician, midwife or health visitor. For babies who are preterm, low birth weight, unwell or have a medical condition, follow your clinician's instructions exactly.",
    source:
      "Guideline source: NHS 111 Wales, 'Infant formula: common questions' (page last updated 19 Apr 2021; retrieved 9 Nov 2026): by the end of their first week, most babies need around 150 to 200 ml per kilo of their weight a day until they're 6 months old. This tool's default of 150 is the lower bound of that range; it can be adjusted between 150 and 200.",
    exampleNote: "Example loaded. Run “Calculate daily amount” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("baby-feeding-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const totalEl = document.getElementById("total-value");
const averageEl = document.getElementById("average-value");
const echoEl = document.getElementById("result-echo");
const ageEl = document.getElementById("result-age");
const noticesEl = document.getElementById("result-notices");
const feedListEl = document.getElementById("feed-list");
const disclaimerEl = document.getElementById("disclaimer");
const sourceEl = document.getElementById("source");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
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

function errorMessage(code, field) {
  const entry = t.error[code];
  if (entry === undefined) return t.error.INTERNAL;
  if (typeof entry === "string") return entry;
  if (field !== null && entry[field] !== undefined) return entry[field];
  return t.error.INTERNAL;
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
    totalEl.textContent = t.totalLine(result.dailyTotalMl);
    averageEl.textContent = t.averageLine(formatAverageMl(result.perFeedAverageMl));
    echoEl.textContent = t.echoLine(
      formatWeightKg(result.weightKg),
      result.factorMlPerKgDay,
      result.feedsPerDay,
    );
    ageEl.textContent =
      result.ageMonths === null ? "" : t.ageEcho(result.ageMonths);
    ageEl.hidden = result.ageMonths === null;
    while (noticesEl.firstChild !== null) noticesEl.removeChild(noticesEl.firstChild);
    for (const notice of result.notices) {
      const item = document.createElement("p");
      item.textContent = NOTICE_TEXT[notice][lang];
      noticesEl.appendChild(item);
    }
    noticesEl.hidden = result.notices.length === 0;
    while (feedListEl.firstChild !== null) feedListEl.removeChild(feedListEl.firstChild);
    result.perFeedMl.forEach((ml, index) => {
      const item = document.createElement("li");
      item.textContent = t.feedItem(index + 1, ml);
      feedListEl.appendChild(item);
    });
    disclaimerEl.textContent = t.disclaimer;
    sourceEl.textContent = t.source;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error.code, error.field);
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

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.weight.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
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
