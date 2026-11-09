// Chinese Zodiac Calculator page wiring: binds the form to the flow
// controller, runs the core in a Web Worker built from the embedded
// worker source, renders results with textContent only, renders the
// pinned CNY table from the core's literal data, and downloads the
// canonical JSON report. No storage, no network.

import { createController } from "./controller.mjs";
import {
  BRANCH_PINYIN,
  CNY_DATES,
  DEFAULTS,
  STEM_PINYIN,
} from "./core/zodiac.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    statusEmpty: "尚未查詢。輸入出生日期，或按「載入範例」。",
    statusExample: "已載入範例（合成案例），請按「查詢生肖」執行。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    statusSuccess: "查詢完成。",
    statusDownloaded: "報告已下載。",
    beforeCnyNote: "出生在春節之前，屬前一年生肖",
    outputLimit: "報告超過大小上限，無法下載。",
    errors: {
      fallback: "處理失敗，請重試一次。",
      SCHEMA: "輸入格式不正確，請重填後再試。",
      INPUT_LIMIT: "輸入太長，請縮短後再試。",
      UNICODE: "輸入含有不完整的字元，請重打。",
      EMPTY: "請輸入出生日期。",
      DATE_FORMAT: "日期格式須為 YYYY-MM-DD，例如 2025-01-15。",
      DATE_INVALID: "這個日期不存在，請檢查年月日。",
      OUT_OF_RANGE: {
        birthDate: "出生日期須在 1960-01-01 至 2035-12-31 之間。",
        asOfDate: "查詢日期須在 1960-01-01 至 2036-12-31 之間。",
      },
      INTERNAL: "處理失敗，請重試一次。",
      WORKER_ERROR: "處理失敗，請重試一次。",
    },
  },
  en: {
    statusEmpty: "Nothing looked up yet. Enter a birth date, or load the example.",
    statusExample: "Example loaded (synthetic case). Press “Find my sign” to run it.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    statusSuccess: "Done.",
    statusDownloaded: "Report downloaded.",
    beforeCnyNote: "Born before Chinese New Year — the previous year's sign applies.",
    outputLimit: "The report exceeds the size limit and cannot be downloaded.",
    errors: {
      fallback: "Something went wrong. Please try again.",
      SCHEMA: "The input shape is not valid. Please re-enter and try again.",
      INPUT_LIMIT: "The input is too long. Please shorten it.",
      UNICODE: "The input contains an incomplete character. Please retype it.",
      EMPTY: "Please enter a birth date.",
      DATE_FORMAT: "Use the YYYY-MM-DD format, e.g. 2025-01-15.",
      DATE_INVALID: "That date does not exist. Check the year, month and day.",
      OUT_OF_RANGE: {
        birthDate: "Birth date must be between 1960-01-01 and 2035-12-31.",
        asOfDate: "As-of date must be between 1960-01-01 and 2036-12-31.",
      },
      INTERNAL: "Something went wrong. Please try again.",
      WORKER_ERROR: "Something went wrong. Please try again.",
    },
  },
};

const T = STRINGS[LANG];

const form = document.getElementById("zodiac-form");
const inputs = {
  birthDate: document.getElementById("field-birthDate"),
  asOfDate: document.getElementById("field-asOfDate"),
};
const errorSlots = {
  birthDate: document.getElementById("error-birthDate"),
  asOfDate: document.getElementById("error-asOfDate"),
};
const statusEl = document.getElementById("status");
const exampleNote = document.getElementById("example-note");
const headlineEl = document.getElementById("result-headline");
const rowsEl = document.getElementById("summary-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");

function errorMessage(error) {
  if (!error || typeof error.code !== "string") return T.errors.fallback;
  const entry = T.errors[error.code];
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    return entry[error.field] ?? T.errors.fallback;
  }
  return T.errors.fallback;
}

function ganzhiPinyin(result) {
  const stemIndex = (((result.zodiacYear - 4) % 10) + 10) % 10;
  return `${STEM_PINYIN[stemIndex]}-${BRANCH_PINYIN[result.animalIndex]}`;
}

function buildRows(result) {
  if (LANG === "zh") {
    const rows = [
      ["生肖年", String(result.zodiacYear)],
      ["干支", result.ganzhiZh],
      ["五行", `${result.elementZh}（${result.elementEn}）`],
      ["生肖年起訖", `${result.spanStart} 至 ${result.spanEnd}`],
      ["出生年春節", result.cnyOfBirthYear],
    ];
    if (result.beforeCny) rows.push(["出生與春節", T.beforeCnyNote]);
    if (result.asOfZodiacYear !== null) {
      rows.push(["查詢日生肖年", String(result.asOfZodiacYear)]);
      rows.push(["本命年", result.isBenMingNian ? "是，本命年" : "否，不是本命年"]);
      rows.push([
        "下一個本命年",
        result.nextBenMingNianStart !== null
          ? `${result.nextBenMingNianYear} 年（${result.nextBenMingNianStart} 開始）`
          : `${result.nextBenMingNianYear} 年（超出對照表範圍，僅列年份）`,
      ]);
    }
    return rows;
  }
  const rows = [
    ["Zodiac year", String(result.zodiacYear)],
    ["Stem & branch", `${ganzhiPinyin(result)} (${result.ganzhiZh})`],
    ["Element", `${result.elementEn} (${result.elementZh})`],
    ["Zodiac year span", `${result.spanStart} to ${result.spanEnd}`],
    ["CNY of birth year", result.cnyOfBirthYear],
  ];
  if (result.beforeCny) rows.push(["Birth vs. CNY", T.beforeCnyNote]);
  if (result.asOfZodiacYear !== null) {
    rows.push(["As-of zodiac year", String(result.asOfZodiacYear)]);
    rows.push(["Ben Ming Nian", result.isBenMingNian ? "Yes — this is it" : "No"]);
    rows.push([
      "Next Ben Ming Nian",
      result.nextBenMingNianStart !== null
        ? `${result.nextBenMingNianYear} (starts ${result.nextBenMingNianStart})`
        : `${result.nextBenMingNianYear} (year only — beyond the date table)`,
    ]);
  }
  return rows;
}

let statusOverride = null;
let exampleLoaded = false;

function render(snapshot) {
  for (const field of Object.keys(inputs)) {
    if (inputs[field].value !== snapshot.draft[field]) {
      inputs[field].value = snapshot.draft[field];
    }
    const showError =
      snapshot.state === "error" && snapshot.error && snapshot.error.field === field;
    errorSlots[field].textContent = showError ? errorMessage(snapshot.error) : "";
    inputs[field].setAttribute("aria-invalid", showError ? "true" : "false");
  }

  headlineEl.textContent = "";
  rowsEl.replaceChildren();
  if (snapshot.state === "success" && snapshot.result) {
    const result = snapshot.result;
    headlineEl.textContent =
      LANG === "zh"
        ? `生肖：${result.animalZh}（${result.animalEn}）· ${result.ganzhiZh}年`
        : `Sign: ${result.animalEn} · ${ganzhiPinyin(result)} year`;
    for (const [label, value] of buildRows(result)) {
      const row = document.createElement("div");
      row.className = "summary-row";
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.append(dt, dd);
      rowsEl.append(row);
    }
  }

  let statusText;
  if (statusOverride) statusText = statusOverride;
  else if (snapshot.state === "busy") statusText = T.statusBusy;
  else if (snapshot.state === "dirty") {
    statusText = exampleLoaded ? T.statusExample : T.statusDirty;
  } else if (snapshot.state === "cancelled") statusText = T.statusCancelled;
  else if (snapshot.state === "success") statusText = T.statusSuccess;
  else if (snapshot.state === "error") {
    statusText =
      snapshot.error && !snapshot.error.field
        ? errorMessage(snapshot.error)
        : T.errors.fallback;
  } else statusText = T.statusEmpty;
  statusEl.textContent = statusText;
  exampleNote.hidden = !exampleLoaded;

  const busy = snapshot.state === "busy";
  runBtn.disabled = busy;
  exampleBtn.disabled = busy;
  resetBtn.disabled = busy;
  cancelBtn.disabled = !busy;
  downloadBtn.disabled = !snapshot.reportAvailable;
}

let workerNumber = 0;

function execute(snapshot, { onResult, onError }) {
  workerNumber += 1;
  const generation = workerNumber;
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: "module" });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    worker.terminate();
    URL.revokeObjectURL(url);
  };
  worker.addEventListener("message", (event) => {
    const data = event.data ?? {};
    if (data.generation !== generation) return;
    const { generation: _ignored, ...payload } = data;
    close();
    onResult(payload);
  });
  worker.addEventListener("error", () => {
    close();
    onError(new Error("worker error"));
  });
  worker.postMessage({ generation, snapshot });
  return { cancel: close };
}

const controller = createController({ execute, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  statusOverride = null;
  exampleLoaded = false;
  controller.run();
});

for (const field of Object.keys(inputs)) {
  inputs[field].addEventListener("input", () => {
    statusOverride = null;
    exampleLoaded = false;
    controller.setField(field, inputs[field].value);
  });
}

exampleBtn.addEventListener("click", () => {
  statusOverride = null;
  exampleLoaded = true;
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  statusOverride = null;
  exampleLoaded = false;
  controller.reset();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

downloadBtn.addEventListener("click", () => {
  const report = controller.downloadReport();
  if (!report || !report.ok) {
    statusOverride = T.outputLimit;
    render(controller.getSnapshot());
    return;
  }
  const blob = new Blob([report.text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  statusOverride = T.statusDownloaded;
  render(controller.getSnapshot());
});

// Static CNY table, rendered from the core's pinned literal data.
const tableBody = document.getElementById("cny-table-body");
if (tableBody) {
  for (const year of Object.keys(CNY_DATES).sort()) {
    const row = document.createElement("tr");
    const yearCell = document.createElement("td");
    yearCell.textContent = year;
    const dateCell = document.createElement("td");
    dateCell.textContent = CNY_DATES[year];
    row.append(yearCell, dateCell);
    tableBody.append(row);
  }
}

for (const field of Object.keys(inputs)) {
  inputs[field].value = DEFAULTS[field];
}
render(controller.getSnapshot());
