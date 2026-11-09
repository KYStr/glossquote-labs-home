// DOM wiring for the Overtime Pay Calculator. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import { FIELDS, REPORT_FILENAME, serializeReport } from "./core/overtime.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      monthlySalary: "月薪（新台幣）",
      weekdayOtHours: "平日延時時數",
      restDayHours: "休息日時數",
      holidayHours: "休假日時數",
    },
    error: {
      SCHEMA: "輸入格式不正確，請重新填寫。",
      EMPTY: "此欄不可為空。",
      INPUT_LIMIT: "此欄長度超過上限。",
      INTEGER_FORMAT: "請輸入不含逗號、小數、符號或空白的整數。",
      DECIMAL_FORMAT: "請輸入整數或一位小數（例如 2.5）。",
      HOURS_STEP: "時數以 0.5 小時為單位，小數位只能是 .0 或 .5。",
      RANGE: "超出允許範圍。",
      INTERNAL: "計算時發生內部錯誤，草稿已保留，請再試一次。",
      WORKER_ERROR: "背景工作無法完成，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超過 2,097,152 位元組，無法下載。",
    },
    statusEmpty: "尚未計算。請輸入月薪與時數，或載入範例。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中…",
    statusCancelled: "已取消，可重新執行。",
    exampleNote: "已載入範例，請按「計算加班費」執行。",
    totalLine: (total) => `加班費合計新台幣 ${total} 元。`,
    zeroNote: "三種時數皆為 0，本月加班費為 0 元。",
    metaLine: (hourly, daily, counted) =>
      `平日每小時工資額 ${hourly} 元；一日工資 ${daily} 元；計入每月延長工時上限的時數 ${counted} 小時。`,
    capNote:
      "計入每月延長工時上限的時數已超過 46 小時。46 小時是勞動基準法第 32 條的基準上限；經工會或勞資會議同意，單月得延長至 54 小時。此為資訊提醒，不影響試算金額。",
    category: { weekday: "平日延時", restDay: "休息日出勤", holiday: "休假日出勤" },
    bandHours: "時數",
    bandMultiplier: "乘數",
    dayPayLine: (daily) => `再加發一日工資 ${daily} 元（出勤 8 小時內一律加發）。`,
    subtotalLine: (name, hours, pay) => `${name}小計 ${pay} 元（${hours} 小時）`,
  },
  en: {
    fieldLabel: {
      monthlySalary: "Monthly salary (NT$)",
      weekdayOtHours: "Weekday overtime hours",
      restDayHours: "Rest-day hours",
      holidayHours: "Holiday hours",
    },
    error: {
      SCHEMA: "The input is malformed. Please fill in the fields again.",
      EMPTY: "This field is required.",
      INPUT_LIMIT: "This field is too long.",
      INTEGER_FORMAT: "Enter an integer without commas, decimals, signs, or spaces.",
      DECIMAL_FORMAT: "Enter an integer or a one-decimal number (for example 2.5).",
      HOURS_STEP: "Hours use 0.5-hour steps; the decimal digit must be .0 or .5.",
      RANGE: "Out of the allowed range.",
      INTERNAL: "An internal error occurred while calculating. Your draft is kept; please try again.",
      WORKER_ERROR: "The background worker could not finish. Your draft is kept; please try again.",
      OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter a salary and hours, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working…",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Calculate overtime pay” to compute it.",
    totalLine: (total) => `Total overtime pay: NT$${total}.`,
    zeroNote: "All three hour fields are 0, so this month's overtime pay is NT$0.",
    metaLine: (hourly, daily, counted) =>
      `Hourly rate NT$${hourly}; one day's wage NT$${daily}; hours counted toward the monthly overtime cap: ${counted}.`,
    capNote:
      "Hours counted toward the monthly overtime cap exceed 46. The Labor Standards Act Article 32 baseline cap is 46 hours; with union or labor-management agreement it may extend to 54 hours in a single month. This note is informational and does not change the estimate.",
    category: { weekday: "Weekday overtime", restDay: "Rest-day work", holiday: "Holiday work" },
    bandHours: "Hours",
    bandMultiplier: "Multiplier",
    dayPayLine: (daily) => `Plus one extra day's pay of NT$${daily} (paid for any attendance up to 8 hours).`,
    subtotalLine: (name, hours, pay) => `${name} subtotal NT$${pay} (${hours} hours)`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("overtime-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const metaEl = document.getElementById("result-meta");
const breakdownEl = document.getElementById("breakdown");
const capNoteEl = document.getElementById("cap-note");
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

function formatHours(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function renderCategory(key, data, dailyWageTwd) {
  const block = document.createElement("div");
  block.className = "category";
  const heading = document.createElement("h3");
  heading.textContent = t.category[key];
  block.appendChild(heading);
  if (key === "holiday" && data.dayPayApplied) {
    const dayPay = document.createElement("p");
    dayPay.textContent = t.dayPayLine(dailyWageTwd);
    block.appendChild(dayPay);
  }
  if (data.bands.length > 0) {
    const scroll = document.createElement("div");
    scroll.className = "table-scroll";
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", t.category[key]);
    scroll.tabIndex = 0;
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of [t.bandHours, t.bandMultiplier]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const band of data.bands) {
      const tr = document.createElement("tr");
      const hoursCell = document.createElement("td");
      hoursCell.textContent = formatHours(band.hours);
      const multiplierCell = document.createElement("td");
      multiplierCell.textContent = `×${band.multiplier}`;
      tr.appendChild(hoursCell);
      tr.appendChild(multiplierCell);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scroll.appendChild(table);
    block.appendChild(scroll);
  }
  const subtotal = document.createElement("p");
  subtotal.className = "subtotal";
  subtotal.textContent = t.subtotalLine(t.category[key], formatHours(data.hours), data.payTwd);
  block.appendChild(subtotal);
  return block;
}

function renderBreakdown(result) {
  breakdownEl.replaceChildren();
  breakdownEl.appendChild(renderCategory("weekday", result.weekday, result.dailyWageTwd));
  breakdownEl.appendChild(renderCategory("restDay", result.restDay, result.dailyWageTwd));
  breakdownEl.appendChild(renderCategory("holiday", result.holiday, result.dailyWageTwd));
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

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
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
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
    const isZero =
      result.weekday.hours === 0 && result.restDay.hours === 0 && result.holiday.hours === 0;
    summaryEl.textContent = isZero
      ? `${t.totalLine(result.totalPayTwd)} ${t.zeroNote}`
      : t.totalLine(result.totalPayTwd);
    metaEl.textContent = t.metaLine(
      result.hourlyRateTwd,
      result.dailyWageTwd,
      formatHours(result.countedOtHours),
    );
    renderBreakdown(result);
    capNoteEl.hidden = !result.capNote;
    if (result.capNote) capNoteEl.textContent = t.capNote;
    statusEl.textContent = summaryEl.textContent;
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

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.monthlySalary.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
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

render(controller.getState());
