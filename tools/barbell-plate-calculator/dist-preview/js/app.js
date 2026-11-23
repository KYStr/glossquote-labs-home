// DOM wiring for the Barbell Plate Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (barbell-plate-calculator-report.json) is created only on an
// explicit click, from the current success snapshot, and its Blob URL
// is revoked within 30 seconds or as soon as the result is
// invalidated.

import { createController } from "./controller.mjs";
import { buildReport, FIELDS, formatKg } from "./core/barbell-plate-calculator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const BAR_PRESETS = ["20", "15", "10"];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      targetKg: "目標總重",
      barKg: "槓鈴重量",
      pairs25: "25 公斤槓片",
      pairs20: "20 公斤槓片",
      pairs15: "15 公斤槓片",
      pairs10: "10 公斤槓片",
      pairs5: "5 公斤槓片",
      pairs2_5: "2.5 公斤槓片",
      pairs1_25: "1.25 公斤槓片",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      NUMBER_FORMAT: "請輸入公斤數，最多兩位小數，不含符號或空白",
      INTEGER_FORMAT: "請輸入整數對數，不含小數、符號或空白",
      NOT_MULTIPLE: "必須是 0.25 公斤的倍數",
      TARGET_BELOW_BAR: "目標總重不得小於槓鈴重量",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeError: {
      targetKg: "目標總重須在 0 至 500 公斤之間",
      barKg: "槓鈴重量須在 0 至 50 公斤之間",
      pairs25: "對數須在 0 至 10 之間",
      pairs20: "對數須在 0 至 10 之間",
      pairs15: "對數須在 0 至 10 之間",
      pairs10: "對數須在 0 至 10 之間",
      pairs5: "對數須在 0 至 10 之間",
      pairs2_5: "對數須在 0 至 10 之間",
      pairs1_25: "對數須在 0 至 10 之間",
    },
    statusEmpty: "尚未計算。輸入目標總重、槓鈴重與槓片對數，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例 100 公斤、20 公斤槓），請按「計算每邊配重」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelTarget: "目標總重",
    labelBar: "槓鈴重量",
    labelPerSide: "每邊重量",
    labelPlates: "每邊槓片",
    labelPlatesCount: "每邊片數",
    labelLoaded: "每邊已掛重量",
    labelAchieved: "實際可達總重",
    labelRemainder: "每邊餘數",
    labelReachable: "是否掛得出來",
    labelNextUp: "下一個較重建議",
    reachableYes: "可以掛出來",
    reachableNo: "掛不出來",
    platesText: (plates) =>
      plates.map((entry) => `${formatKg(entry.plateKg)} 公斤 × ${entry.count}`).join("、"),
    platesEmpty: "無槓片",
    remainderNote: (result) =>
      `⚠ 掛不出來：每邊餘 ${formatKg(result.remainderPerSideKg)} 公斤，手邊槓片湊不出目標；實際可達 ${formatKg(result.achievedKg)} 公斤。`,
    nextUpNone: "無（手邊沒有剩餘槓片可再加）",
    kgSuffix: (value) => `${formatKg(value)} 公斤`,
    successSummary: (result) =>
      result.reachable
        ? `每邊 ${formatKg(result.perSideKg)} 公斤，可達 ${formatKg(result.achievedKg)} 公斤。`
        : `掛不出來：實際可達 ${formatKg(result.achievedKg)} 公斤，每邊餘 ${formatKg(result.remainderPerSideKg)} 公斤。`,
  },
  en: {
    fieldLabel: {
      targetKg: "Target total weight",
      barKg: "Bar weight",
      pairs25: "25 kg plates",
      pairs20: "20 kg plates",
      pairs15: "15 kg plates",
      pairs10: "10 kg plates",
      pairs5: "5 kg plates",
      pairs2_5: "2.5 kg plates",
      pairs1_25: "1.25 kg plates",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      NUMBER_FORMAT: "Enter a weight in kg with at most two decimals, no sign or space.",
      INTEGER_FORMAT: "Enter a whole number of pairs, no decimal, sign, or space.",
      NOT_MULTIPLE: "Must be a multiple of 0.25 kg.",
      TARGET_BELOW_BAR: "The target total must not be below the bar weight.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeError: {
      targetKg: "Target total weight must be between 0 and 500 kg.",
      barKg: "Bar weight must be between 0 and 50 kg.",
      pairs25: "Pairs must be between 0 and 10.",
      pairs20: "Pairs must be between 0 and 10.",
      pairs15: "Pairs must be between 0 and 10.",
      pairs10: "Pairs must be between 0 and 10.",
      pairs5: "Pairs must be between 0 and 10.",
      pairs2_5: "Pairs must be between 0 and 10.",
      pairs1_25: "Pairs must be between 0 and 10.",
    },
    statusEmpty: "Nothing calculated yet. Enter a target total, bar weight, and plate pairs, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case 100 kg, 20 kg bar). Press “Calculate plates per side” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelTarget: "Target total",
    labelBar: "Bar weight",
    labelPerSide: "Weight per side",
    labelPlates: "Plates per side",
    labelPlatesCount: "Plates per side (count)",
    labelLoaded: "Loaded per side",
    labelAchieved: "Achievable total",
    labelRemainder: "Remainder per side",
    labelReachable: "Reachable",
    labelNextUp: "Next heavier suggestion",
    reachableYes: "Reachable",
    reachableNo: "Not reachable",
    platesText: (plates) =>
      plates.map((entry) => `${formatKg(entry.plateKg)} kg × ${entry.count}`).join(", "),
    platesEmpty: "No plates",
    remainderNote: (result) =>
      `⚠ Not reachable: ${formatKg(result.remainderPerSideKg)} kg remains per side — your plates cannot make the target; achievable total is ${formatKg(result.achievedKg)} kg.`,
    nextUpNone: "None (no spare plates left to add)",
    kgSuffix: (value) => `${formatKg(value)} kg`,
    successSummary: (result) =>
      result.reachable
        ? `${formatKg(result.perSideKg)} kg per side, achievable total ${formatKg(result.achievedKg)} kg.`
        : `Not reachable: achievable total ${formatKg(result.achievedKg)} kg, ${formatKg(result.remainderPerSideKg)} kg remains per side.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const platesRows = document.getElementById("plates-rows");
const remainderNoteEl = document.getElementById("remainder-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");
const barPresetButtons = BAR_PRESETS.map((value) =>
  document.getElementById(`bar-preset-${value}`),
);

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

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = inputs[field];
  if (message === null) {
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  if (error.code === "TARGET_BELOW_BAR") return t.error.TARGET_BELOW_BAR;
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

function renderResult(result) {
  appendSummaryRows(summaryRows, [
    [t.labelTarget, t.kgSuffix(result.targetKg)],
    [t.labelBar, t.kgSuffix(result.barKg)],
    [t.labelPerSide, t.kgSuffix(result.perSideKg)],
    [t.labelLoaded, t.kgSuffix(result.loadedPerSideKg)],
    [t.labelAchieved, t.kgSuffix(result.achievedKg)],
    [t.labelRemainder, t.kgSuffix(result.remainderPerSideKg)],
    [t.labelReachable, result.reachable ? t.reachableYes : t.reachableNo],
    [
      t.labelNextUp,
      result.nextUpKg === null ? t.nextUpNone : t.kgSuffix(result.nextUpKg),
    ],
  ]);
  appendSummaryRows(platesRows, [
    [
      t.labelPlates,
      result.platesPerSide.length === 0 ? t.platesEmpty : t.platesText(result.platesPerSide),
    ],
    [t.labelPlatesCount, String(result.platesPerSideCount)],
  ]);
  remainderNoteEl.hidden = result.reachable;
  if (!result.reachable) remainderNoteEl.textContent = t.remainderNote(result);
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
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
    clearFieldErrors();
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    clearFieldErrors();
  } else if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
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

for (const button of barPresetButtons) {
  button.addEventListener("click", () => {
    controller.edit({ barKg: button.dataset.barKg });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.targetKg.focus();
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
