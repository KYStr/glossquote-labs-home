// DOM wiring for the HSR Fare Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (hsr-fare-calculator-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.
// Station, cabin, and fare-type labels come from the core's pinned
// tables (STATIONS) and the per-language maps below; money is
// formatted with a plain grouping helper (no locale APIs), so the
// displayed digits never depend on the host locale.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  STATIONS,
  buildReport,
  cabinFares,
} from "./core/hsr-fare.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STATION_BY_CODE = new Map(STATIONS.map((station) => [station.code, station]));

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      origin: "出發站",
      destination: "到達站",
      cabin: "車廂",
      fareKind: "票種",
      quantity: "張數",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INVALID_VALUE: "請選擇有效的選項",
      INTEGER_FORMAT: "張數請輸入整數 1 至 10，不含小數、符號或空白",
      RANGE: "張數須在 1 至 10 張之間",
      SAME_STATION: "出發站與到達站不可相同",
      CABIN_NOT_SOLD: "此區間不發售商務車廂車票",
      FARE_CABIN_MISMATCH: "早鳥與大學生優惠僅限標準車廂對號座",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未查詢。選擇出發站與到達站、車廂與票種，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（台北 → 左營，標準車廂對號座全票），請按「計算票價」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelRoute: "區間",
    labelDirection: "方向",
    labelDistance: "里程",
    labelCabin: "車廂",
    labelFareKind: "票種",
    labelBaseFare: "全票原價",
    labelSingleFare: "單張票價",
    labelQuantity: "張數",
    labelTotalFare: "總價",
    labelCompare: "同區間其他車廂全票",
    direction: { southbound: "南下", northbound: "北上" },
    cabin: {
      standard: "標準車廂對號座",
      business: "商務車廂",
      nonreserved: "自由座",
    },
    fareKind: {
      full: "全票",
      concession: "優待票（敬老／愛心／兒童）",
      earlyBird65: "早鳥 65 折",
      earlyBird80: "早鳥 8 折",
      earlyBird90: "早鳥 9 折",
      student50: "大學生 5 折",
      student75: "大學生 75 折",
      student88: "大學生 88 折",
    },
    notSold: "不發售",
    routeValue: (result) =>
      `${STATION_BY_CODE.get(result.origin).zh} → ${STATION_BY_CODE.get(result.destination).zh}`,
    distanceValue: (result) => `${result.distanceKm} 公里`,
    moneyValue: (amount) => `${formatGrouped(amount)} 元`,
    quantityValue: (result) => `${result.quantity} 張`,
    successSummary: (result) =>
      `單張 ${formatGrouped(result.singleFare)} 元，${result.quantity} 張共 ${formatGrouped(result.totalFare)} 元`,
  },
  en: {
    fieldLabel: {
      origin: "Origin station",
      destination: "Destination station",
      cabin: "Cabin",
      fareKind: "Fare type",
      quantity: "Quantity",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INVALID_VALUE: "Please choose a valid option.",
      INTEGER_FORMAT: "Enter a whole number from 1 to 10 with no decimal, sign, or space.",
      RANGE: "Quantity must be between 1 and 10.",
      SAME_STATION: "Origin and destination must be different.",
      CABIN_NOT_SOLD: "Business class is not sold on this segment.",
      FARE_CABIN_MISMATCH: "Early Bird and student discounts apply to standard reserved seats only.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty:
      "Nothing calculated yet. Choose origin and destination stations, cabin and fare type, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote:
      "Example loaded (Taipei → Zuoying, standard reserved full fare). Press “Calculate fare” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelRoute: "Route",
    labelDirection: "Direction",
    labelDistance: "Distance",
    labelCabin: "Cabin",
    labelFareKind: "Fare type",
    labelBaseFare: "Full fare",
    labelSingleFare: "Fare per ticket",
    labelQuantity: "Quantity",
    labelTotalFare: "Total fare",
    labelCompare: "Full fares on the same segment, other cabins",
    direction: { southbound: "Southbound", northbound: "Northbound" },
    cabin: {
      standard: "Standard reserved seat",
      business: "Business class",
      nonreserved: "Non-reserved seat",
    },
    fareKind: {
      full: "Full fare",
      concession: "Concession (senior / disability / child)",
      earlyBird65: "Early Bird 65% off",
      earlyBird80: "Early Bird 80% off",
      earlyBird90: "Early Bird 90% off",
      student50: "Student 50% off",
      student75: "Student 75% off",
      student88: "Student 88% off",
    },
    notSold: "Not sold",
    routeValue: (result) =>
      `${STATION_BY_CODE.get(result.origin).en} → ${STATION_BY_CODE.get(result.destination).en}`,
    distanceValue: (result) => `${result.distanceKm} km`,
    moneyValue: (amount) => `NT$${formatGrouped(amount)}`,
    quantityValue: (result) => `${result.quantity}`,
    successSummary: (result) =>
      `NT$${formatGrouped(result.singleFare)} per ticket, NT$${formatGrouped(result.totalFare)} for ${result.quantity}`,
  },
};

// Plain thousands grouping ("1490" -> "1,490"); no locale APIs, so
// the displayed digits never depend on the host locale.
function formatGrouped(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  origin: document.getElementById("field-origin"),
  destination: document.getElementById("field-destination"),
  cabin: document.getElementById("field-cabin"),
  fareKind: document.getElementById("field-fareKind"),
  quantity: document.getElementById("field-quantity"),
};
const fieldErrors = {
  origin: document.getElementById("error-origin"),
  destination: document.getElementById("error-destination"),
  cabin: document.getElementById("error-cabin"),
  fareKind: document.getElementById("error-fareKind"),
  quantity: document.getElementById("error-quantity"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const compareRows = document.getElementById("compare-rows");
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
    [t.labelRoute, t.routeValue(result)],
    [t.labelDirection, t.direction[result.direction]],
    [t.labelDistance, t.distanceValue(result)],
    [t.labelCabin, t.cabin[result.cabin]],
    [t.labelFareKind, t.fareKind[result.fareKind]],
    [t.labelBaseFare, t.moneyValue(result.baseFare)],
    [t.labelSingleFare, t.moneyValue(result.singleFare)],
    [t.labelQuantity, t.quantityValue(result)],
    [t.labelTotalFare, t.moneyValue(result.totalFare)],
  ]);
  // Same-segment full fares for all three cabins, from the same
  // literal tables; business shows "not sold" on the three short
  // segments. The selected cabin's row is shown with the same value
  // as the base fare, so the comparison is always complete.
  const fares = cabinFares(result.origin, result.destination);
  const compare = [];
  for (const cabin of ["standard", "business", "nonreserved"]) {
    const fare = fares === null ? null : fares[cabin];
    compare.push([t.cabin[cabin], fare === null ? t.notSold : t.moneyValue(fare)]);
  }
  appendSummaryRows(compareRows, compare);
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
  inputs[field].addEventListener("change", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.origin.focus();
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
