import { createController } from "./controller.mjs";
import { EMPTY_ENTRY, ENTRY_FIELDS, KINDS, MAX_ENTRIES, REPORT_FILENAME, serializeReport } from "./core/overtime.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;
const TOP_FIELDS = ["monthlySalary", "month"];

const STRINGS = {
  "zh-Hant": {
    field: { monthlySalary: "月薪", month: "月份", date: "日期", kind: "日別", hours: "時數" },
    error: {
      SCHEMA: "輸入格式不正確，請重新填寫。",
      EMPTY: "請填寫此欄。",
      INPUT_LIMIT: "此欄長度超過上限。",
      INTEGER_FORMAT: "請輸入不含逗號、小數、符號或空白的整數。",
      DECIMAL_FORMAT: "請輸入整數或一位小數（例如 2.5）。",
      HOURS_STEP: "時數以 0.5 小時為單位。",
      RANGE: "超出允許範圍，請參照欄位說明。",
      MONTH_FORMAT: "請用 YYYY-MM 輸入有效月份。",
      DATE_FORMAT: "請用 YYYY-MM-DD 輸入有效日期。",
      DATE_MONTH: "日期須在所填月份內。",
      DUPLICATE_DATE: "此日期已有紀錄，請合併同一天的時數。",
      ENTRY_COUNT: "請保留 1 至 31 筆日期。",
      KIND: "請選擇符合排班的日別。",
      INTERNAL: "計算時發生內部錯誤，草稿已保留，請再試一次。",
      WORKER_ERROR: "背景工作無法完成，草稿已保留，請再試一次。",
      OUTPUT_LIMIT: "報告超過 2,097,152 位元組，無法下載。",
    },
    row: (number) => "第 " + number + " 筆",
    remove: (number) => "移除第 " + number + " 筆",
    statusEmpty: "尚未計算。請輸入月薪、月份與每日工時，或載入範例。",
    statusDirty: "輸入已變更，請重新計算。",
    statusBusy: "處理中…",
    statusCancelled: "已取消，可重新計算。",
    exampleNote: "已載入範例，請按「計算加班費」。",
    totalLine: (month, total) => month + " 加班費合計新台幣 " + total + " 元。",
    zeroNote: "所有日期的時數皆為 0。",
    metaLine: (hourly, daily, counted) =>
      "平日每小時工資額 " + hourly + " 元。一日工資 " + daily + " 元。計入每月延長工時 " + counted + " 小時。",
    capNote:
      "計入每月延長工時的時數已超過 46 小時。46 小時是勞動基準法第 32 條的基準上限。經工會同意，無工會時經勞資會議同意，單月上限可延至 54 小時，每 3 個月最多 138 小時。本試算只提供金額與工時，其他適用條件請依第 32 條核對。",
    category: { weekday: "平日延時", restDay: "休息日出勤", holiday: "未調移國定假日出勤" },
    categoryHeading: "各日別小計",
    dailyHeading: "逐日明細",
    columns: ["日期", "日別", "時數", "費率明細", "加班費（新台幣）"],
    bandLine: (hours, rate) => hours + " 小時 × " + rate,
    dayPayLine: "另加一日工資",
    noPayLine: "—",
    subtotalLine: (name, hours, pay) => name + " " + hours + " 小時，共 " + pay + " 元",
  },
  en: {
    field: { monthlySalary: "Monthly salary", month: "Month", date: "Date", kind: "Day type", hours: "Hours" },
    error: {
      SCHEMA: "The input is malformed. Please fill in the fields again.",
      EMPTY: "Fill in this field.",
      INPUT_LIMIT: "This field is too long.",
      INTEGER_FORMAT: "Enter an integer without commas, decimals, signs, or spaces.",
      DECIMAL_FORMAT: "Enter an integer or a one-decimal number such as 2.5.",
      HOURS_STEP: "Enter hours in 0.5-hour steps.",
      RANGE: "The value is outside the range shown in the instructions.",
      MONTH_FORMAT: "Enter a valid month in YYYY-MM format.",
      DATE_FORMAT: "Enter a valid date in YYYY-MM-DD format.",
      DATE_MONTH: "Enter a date in the selected month.",
      DUPLICATE_DATE: "This date already has an entry. Combine the hours for that day.",
      ENTRY_COUNT: "Keep between 1 and 31 dates.",
      KIND: "Choose the day type from your work schedule.",
      INTERNAL: "An internal error occurred. Your draft is available to try again.",
      WORKER_ERROR: "The background worker could not finish. Your draft is available to try again.",
      OUTPUT_LIMIT: "The report exceeds 2,097,152 bytes and cannot be downloaded.",
    },
    row: (number) => "Entry " + number,
    remove: (number) => "Remove entry " + number,
    statusEmpty: "Nothing calculated yet. Enter a salary, month, and daily hours, or load the example.",
    statusDirty: "Input changed. Calculate again.",
    statusBusy: "Working…",
    statusCancelled: "Cancelled. You can calculate again.",
    exampleNote: "Example loaded. Select “Calculate overtime pay” to run it.",
    totalLine: (month, total) => month + " overtime pay totals NT$" + total + ".",
    zeroNote: "All dates have zero hours.",
    metaLine: (hourly, daily, counted) =>
      "Hourly rate NT$" + hourly + ". One day’s wage NT$" + daily + ". Counted monthly overtime " + counted + " hours.",
    capNote:
      "Counted overtime exceeds 46 hours. Article 32 of the Labor Standards Act sets a 46-hour monthly baseline. With union consent or, where there is no union, labor-management meeting consent, the cap can extend to 54 hours in one month, up to 138 hours over three months. This estimate covers pay and hours. See Article 32 for the other conditions.",
    category: { weekday: "Weekday overtime", restDay: "Rest-day work", holiday: "Unshifted national holiday" },
    categoryHeading: "Subtotals by day type",
    dailyHeading: "Daily breakdown",
    columns: ["Date", "Day type", "Hours", "Rate breakdown", "Overtime pay (NT$)"],
    bandLine: (hours, rate) => hours + " h × " + rate,
    dayPayLine: "One extra day’s wage",
    noPayLine: "—",
    subtotalLine: (name, hours, pay) => name + ", " + hours + " h, NT$" + pay,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];
const amount = new Intl.NumberFormat(lang);
const byId = (id) => document.getElementById(id);

const form = byId("overtime-form");
const inputs = Object.fromEntries(TOP_FIELDS.map((field) => [field, byId("field-" + field)]));
const entriesEl = byId("daily-entries");
const entryTemplate = byId("entry-template");
const addBtn = byId("add-entry");
const statusEl = byId("status");
const resultsEl = byId("results");
const summaryEl = byId("summary");
const metaEl = byId("result-meta");
const breakdownEl = byId("breakdown");
const capNoteEl = byId("cap-note");
const runBtn = byId("run-btn");
const exampleBtn = byId("example-btn");
const resetBtn = byId("reset-btn");
const cancelBtn = byId("cancel-btn");
const downloadBtn = byId("download-btn");
const exampleNoteEl = byId("example-note");
const entryRows = [];
let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  let worker;
  try {
    worker = new Worker(url, { type: "module" });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  const originalTerminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    try {
      originalTerminate();
    } finally {
      URL.revokeObjectURL(url);
    }
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

function updateFieldError(input, errorEl, message) {
  errorEl.textContent = message ?? "";
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  } else {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", errorEl.id);
  }
}

function clearErrors() {
  for (const field of TOP_FIELDS) updateFieldError(inputs[field], byId("error-" + field), null);
  for (const row of entryRows) {
    for (const field of ENTRY_FIELDS) updateFieldError(row.inputs[field], row.errors[field], null);
    row.error.textContent = "";
  }
  byId("error-entries").textContent = "";
}

function createEntryRow(index) {
  const node = entryTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("legend").textContent = t.row(index + 1);
  const remove = node.querySelector("[data-remove-entry]");
  remove.setAttribute("aria-label", t.remove(index + 1));
  const rowInputs = {};
  const errors = {};
  for (const field of ENTRY_FIELDS) {
    const input = node.querySelector('[data-entry-field="' + field + '"]');
    const id = "entry-" + index + "-" + field;
    input.id = id;
    input.previousElementSibling.htmlFor = id;
    const error = input.nextElementSibling;
    error.id = "error-" + id;
    rowInputs[field] = input;
    errors[field] = error;
    input.addEventListener("input", () => {
      const { entries } = controller.getState().draft;
      entries[index][field] = input.value;
      edit({ entries });
    });
  }
  remove.addEventListener("click", () => {
    const { entries } = controller.getState().draft;
    if (entries.length <= 1) return;
    entries.splice(index, 1);
    edit({ entries });
    entryRows[Math.min(index, entries.length - 1)].inputs.date.focus();
  });
  entriesEl.appendChild(node);
  return { node, inputs: rowInputs, errors, error: node.querySelector("[data-entry-error]"), remove };
}

function syncEntries(entries) {
  while (entryRows.length > entries.length) entryRows.pop().node.remove();
  while (entryRows.length < entries.length) entryRows.push(createEntryRow(entryRows.length));
  for (const [index, row] of entryRows.entries()) {
    for (const field of ENTRY_FIELDS) {
      const input = row.inputs[field];
      if (input.value !== entries[index][field]) input.value = entries[index][field];
    }
    row.remove.disabled = entries.length === 1;
  }
  addBtn.disabled = entries.length >= MAX_ENTRIES;
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function renderBreakdown(result) {
  const totals = element("ul", "");
  for (const kind of KINDS) {
    const { hours, payTwd } = result.categories[kind];
    totals.appendChild(element("li", t.subtotalLine(t.category[kind], amount.format(hours), amount.format(payTwd))));
  }
  const title = element("h3", t.dailyHeading);
  title.id = "daily-result-heading";
  const scroll = element("div", "");
  scroll.className = "table-scroll";
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-labelledby", title.id);
  scroll.tabIndex = 0;
  const table = element("table", "");
  const head = table.createTHead().insertRow();
  for (const label of t.columns) {
    const th = element("th", label);
    th.scope = "col";
    head.appendChild(th);
  }
  const body = table.createTBody();
  for (const day of result.days) {
    const row = body.insertRow();
    row.dataset.resultDate = day.date;
    const date = element("th", day.date);
    date.scope = "row";
    row.appendChild(date);
    const rates = day.bands.map(({ hours, multiplier }) => t.bandLine(amount.format(hours), multiplier));
    if (day.dayPayApplied) rates.unshift(t.dayPayLine);
    row.insertCell().textContent = t.category[day.kind];
    row.insertCell().textContent = amount.format(day.hours);
    row.insertCell().textContent = rates.join(" · ") || t.noPayLine;
    row.insertCell().textContent = amount.format(day.payTwd);
  }
  scroll.appendChild(table);
  breakdownEl.replaceChildren(element("h3", t.categoryHeading), totals, title, scroll);
}

function renderError(error) {
  const message = t.error[error?.code] ?? t.error.INTERNAL;
  const row = entryRows[error?.row];
  const field = error?.field;
  let input;
  let label;
  if (row && ENTRY_FIELDS.includes(field)) {
    input = row.inputs[field];
    updateFieldError(input, row.errors[field], message);
    label = t.row(error.row + 1) + " · " + t.field[field];
  } else if (row) {
    row.error.textContent = message;
    input = row.inputs.date;
    label = t.row(error.row + 1);
  } else if (TOP_FIELDS.includes(field)) {
    input = inputs[field];
    updateFieldError(input, byId("error-" + field), message);
    label = t.field[field];
  } else if (field === "entries") {
    byId("error-entries").textContent = message;
    input = addBtn.disabled ? entryRows[0]?.inputs.date : addBtn;
  }
  statusEl.textContent = label ? label + " — " + message : message;
  if (submitted && input) input.focus();
  submitted = false;
}

function render({ state, draft, isExample, result, error }) {
  for (const field of TOP_FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  syncEntries(draft.entries);
  exampleNoteEl.hidden = !isExample;
  exampleNoteEl.textContent = isExample ? t.exampleNote : "";
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";
  clearErrors();

  if (state !== "success") {
    revokeReportUrl();
    if (!resultsEl.hidden) {
      resultsEl.hidden = true;
      summaryEl.textContent = "";
      metaEl.textContent = "";
      breakdownEl.replaceChildren();
    }
  }

  if (state === "error") {
    renderError(error);
  } else if (state === "success") {
    const total = t.totalLine(result.month, amount.format(result.totalPayTwd));
    summaryEl.textContent = result.days.every((day) => day.hours === 0) ? total + " " + t.zeroNote : total;
    metaEl.textContent = t.metaLine(result.hourlyRateTwd, result.dailyWageTwd, amount.format(result.countedOtHours));
    renderBreakdown(result);
    capNoteEl.hidden = !result.capNote;
    capNoteEl.textContent = result.capNote ? t.capNote : "";
    statusEl.textContent = summaryEl.textContent;
    resultsEl.hidden = false;
    submitted = false;
  } else {
    const status = { empty: t.statusEmpty, dirty: t.statusDirty, busy: t.statusBusy, cancelled: t.statusCancelled };
    statusEl.textContent = status[state];
  }
}

const controller = createController({ createWorker, onChange: render });

function edit(patch) {
  submitted = false;
  controller.edit(patch);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

for (const field of TOP_FIELDS) {
  inputs[field].addEventListener("input", () => edit({ [field]: inputs[field].value }));
}

addBtn.addEventListener("click", () => {
  const { entries } = controller.getState().draft;
  if (entries.length >= MAX_ENTRIES) return;
  entries.push({ ...EMPTY_ENTRY });
  edit({ entries });
  entryRows.at(-1).inputs.date.focus();
});

exampleBtn.addEventListener("click", () => {
  submitted = false;
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  submitted = false;
  controller.reset();
  inputs.monthlySalary.focus();
});

cancelBtn.addEventListener("click", () => {
  submitted = false;
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const current = controller.getState();
  if (!current.reportAvailable) return;
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
  submitted = false;
  revokeReportUrl();
  controller.reset();
});

render(controller.getState());

