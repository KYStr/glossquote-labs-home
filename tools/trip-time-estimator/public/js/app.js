// DOM wiring for the Trip Time Estimator. All values are rendered
// with textContent / value only; the computation itself runs in a
// module Worker built from the fixed worker source.

import { REPORT_FILENAME, REPORT_LIMIT_BYTES, serializeReport } from "./core/trip.mjs";
import { createController } from "./controller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const lang = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    emptyField: {
      mode: "請選擇計算方式。",
      departureDate: "請輸入出發日期。",
      departureTime: "請輸入出發時間。",
      departureOffset: "請選擇出發地偏移。",
      arrivalOffset: "請選擇抵達地偏移。",
      duration: "請輸入旅程時間。",
      arrivalTime: "請輸入抵達時間。",
      arrivalNextDay: "請設定抵達日期是否為次日。",
    },
    errors: {
      SCHEMA: "輸入格式不正確，請檢查後重新輸入。",
      INPUT_LIMIT: "輸入太長，請縮短後再試。",
      UNICODE: "輸入含有不完整的字元。",
      ENUM: "請選擇有效的選項。",
      DATE_FORMAT: "日期格式不正確：請用 YYYY-MM-DD。",
      DATE_INVALID: "這個日期不存在。",
      TIME_FORMAT: "時間格式不正確：請用 HH:MM（24 小時制）。",
      OFFSET_FORMAT: "偏移格式不正確。",
      DURATION_FORMAT: "旅程時間格式不正確：請用 H:MM，例如 3:05。",
      DURATION_NOT_POSITIVE: "抵達時間不晚於出發時間；請確認抵達時間，或開啟「抵達日期為出發日期的次日」。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
    },
    rangeField: {
      departureDate: "日期需在 2000-01-01 至 2099-12-31 之間。",
      departureTime: "時間需在 00:00 至 23:59 之間。",
      departureOffset: "偏移需在 -12:00 至 +14:00 之間。",
      arrivalOffset: "偏移需在 -12:00 至 +14:00 之間。",
      duration: "旅程時間需在 0:01 至 48:00 之間。",
      arrivalTime: "抵達時間超出可計算範圍：請確認時間，或確認推得的旅程時間不超過 48:00。",
    },
    statusDirty: "輸入已變更，請重新執行",
    statusCancelled: "已取消，可重新執行",
    statusBusy: "處理中",
    statusFixField: "請修正標示的欄位後重新執行。",
    exampleNote: "目前是範例內容（臺北出發、飛往東京）；按「計算旅程時間」執行。",
    dayShift: {
      before: "前一天",
      same: "當天",
      next: "隔天",
      days: (n) => `${n} 天`,
    },
    summaryArrival: "抵達（抵達地）",
    summaryDuration: "旅程時間",
    minutesSuffix: (n) => `（${n} 分鐘）`,
    readings: {
      departureLocal: "出發（出發地）",
      departureInArrivalZone: "出發時刻（以抵達地計）",
      arrivalLocal: "抵達（抵達地）",
      arrivalInDepartureZone: "抵達時刻（以出發地計）",
    },
    reportTooLarge: "報告超過大小上限，無法下載。",
  },
  en: {
    emptyField: {
      mode: "Choose a mode.",
      departureDate: "Enter the departure date.",
      departureTime: "Enter the departure time.",
      departureOffset: "Choose the departure offset.",
      arrivalOffset: "Choose the arrival offset.",
      duration: "Enter the travel duration.",
      arrivalTime: "Enter the arrival time.",
      arrivalNextDay: "Set whether arrival is on the next day.",
    },
    errors: {
      SCHEMA: "The input shape is not valid; check it and run again.",
      INPUT_LIMIT: "The input is too long; shorten it and try again.",
      UNICODE: "The input contains an incomplete character.",
      ENUM: "Choose a valid option.",
      DATE_FORMAT: "Use the date format YYYY-MM-DD.",
      DATE_INVALID: "That date does not exist.",
      TIME_FORMAT: "Use the time format HH:MM (24-hour).",
      OFFSET_FORMAT: "The offset format is not valid.",
      DURATION_FORMAT: "Use the duration format H:MM, for example 3:05.",
      DURATION_NOT_POSITIVE:
        "The arrival time is not later than the departure time; check the arrival time, or turn on \u201CArrival is on the day after the departure date\u201D.",
      INTERNAL: "Processing failed. Try again.",
      WORKER_ERROR: "Processing failed. Try again.",
    },
    rangeField: {
      departureDate: "The date must be between 2000-01-01 and 2099-12-31.",
      departureTime: "The time must be between 00:00 and 23:59.",
      departureOffset: "The offset must be between -12:00 and +14:00.",
      arrivalOffset: "The offset must be between -12:00 and +14:00.",
      duration: "The duration must be between 0:01 and 48:00.",
      arrivalTime: "The arrival time is out of range: check the time, or that the implied duration is at most 48:00.",
    },
    statusDirty: "Input changed. Run again.",
    statusCancelled: "Cancelled. You can run again.",
    statusBusy: "Working",
    statusFixField: "Fix the highlighted field and run again.",
    exampleNote: "Showing the worked example (Taipei to Tokyo). Press \u201CCalculate trip time\u201D to run it.",
    dayShift: {
      before: "the day before",
      same: "the same day",
      next: "the next day",
      days: (n) => `${n} days`,
    },
    summaryArrival: "Arrival (arrival zone)",
    summaryDuration: "Trip duration",
    minutesSuffix: (n) => ` (${n} min)`,
    readings: {
      departureLocal: "Departure (departure zone)",
      departureInArrivalZone: "Departure instant (in the arrival zone)",
      arrivalLocal: "Arrival (arrival zone)",
      arrivalInDepartureZone: "Arrival instant (in the departure zone)",
    },
    reportTooLarge: "The report exceeds the size limit and cannot be downloaded.",
  },
};

const t = STRINGS[lang];

// The fixed offset list for both selects: -12:00 to +14:00 every
// 15 minutes, with zero written only as +00:00.
function formatOffsetMinutes(total) {
  const sign = total < 0 ? "-" : "+";
  const abs = Math.abs(total);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

const OFFSET_OPTIONS = [];
for (let minutes = -720; minutes <= 840; minutes += 15) {
  OFFSET_OPTIONS.push(formatOffsetMinutes(minutes));
}

// Route presets fill only the two offsets. Every label carries the
// standard-time note next to the group in the page.
const PRESETS = [
  { zh: "臺北 → 東京", en: "Taipei → Tokyo", departureOffset: "+08:00", arrivalOffset: "+09:00" },
  { zh: "臺北 → 洛杉磯", en: "Taipei → Los Angeles", departureOffset: "+08:00", arrivalOffset: "-08:00" },
  { zh: "臺北 → 倫敦", en: "Taipei → London", departureOffset: "+08:00", arrivalOffset: "+00:00" },
  { zh: "臺北 → 紐約", en: "Taipei → New York", departureOffset: "+08:00", arrivalOffset: "-05:00" },
  { zh: "臺北 → 雪梨", en: "Taipei → Sydney", departureOffset: "+08:00", arrivalOffset: "+10:00" },
  { zh: "臺北 → 巴黎", en: "Taipei → Paris", departureOffset: "+08:00", arrivalOffset: "+01:00" },
];

const FIELD_NAMES = [
  "mode",
  "departureDate",
  "departureTime",
  "departureOffset",
  "arrivalOffset",
  "duration",
  "arrivalTime",
  "arrivalNextDay",
];

const elements = {
  form: document.getElementById("trip-form"),
  inputs: {},
  errors: {},
  modeRadios: Array.from(document.querySelectorAll('input[name="mode"]')),
  modeDurationFields: document.getElementById("mode-duration-fields"),
  modeArrivalFields: document.getElementById("mode-arrival-fields"),
  presetRow: document.getElementById("preset-row"),
  status: document.getElementById("status"),
  exampleNote: document.getElementById("example-note"),
  runButton: document.getElementById("run-btn"),
  exampleButton: document.getElementById("example-btn"),
  resetButton: document.getElementById("reset-btn"),
  cancelButton: document.getElementById("cancel-btn"),
  results: document.getElementById("results"),
  summary: document.getElementById("summary-list"),
  readings: document.getElementById("readings-list"),
  downloadButton: document.getElementById("download-btn"),
};

for (const field of FIELD_NAMES) {
  elements.inputs[field] =
    field === "mode" ? elements.modeRadios[0] : document.getElementById(`field-${field}`);
  elements.errors[field] = document.getElementById(`error-${field}`);
}

// Populate the two offset selects from the fixed list.
for (const field of ["departureOffset", "arrivalOffset"]) {
  const select = elements.inputs[field];
  for (const text of OFFSET_OPTIONS) {
    const option = document.createElement("option");
    option.value = text;
    option.textContent = text;
    select.append(option);
  }
}

// Route preset buttons.
const presetButtons = PRESETS.map((preset) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "preset";
  button.textContent = preset[lang];
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    controller.edit({
      departureOffset: preset.departureOffset,
      arrivalOffset: preset.arrivalOffset,
    });
  });
  elements.presetRow.append(button);
  return button;
});

function fieldElement(field) {
  if (field === "mode") return elements.modeRadios[0];
  return elements.inputs[field] ?? null;
}

function errorMessage(error) {
  if (error.code === "EMPTY") return t.emptyField[error.field] ?? t.errors.SCHEMA;
  if (error.code === "RANGE" && error.field !== null && t.rangeField[error.field] !== undefined) {
    return t.rangeField[error.field];
  }
  if (error.code === "ENUM" && error.field === "mode") return t.emptyField.mode;
  return t.errors[error.code] ?? t.errors.WORKER_ERROR;
}

function dayShiftLabel(shift) {
  if (shift === -1) return t.dayShift.before;
  if (shift === 0) return t.dayShift.same;
  if (shift === 1) return t.dayShift.next;
  return t.dayShift.days(shift > 0 ? `+${shift}` : `${shift}`);
}

function dayShiftText(shift) {
  const signed = shift >= 0 ? `+${shift}` : `${shift}`;
  return lang === "zh" ? `${dayShiftLabel(shift)}（${signed}）` : `${dayShiftLabel(shift)} (${signed})`;
}

function readingText(reading) {
  const base = `${reading.date} ${reading.time} (UTC ${reading.offset})`;
  if (reading.dayShift === undefined) return base;
  return `${base} · ${dayShiftText(reading.dayShift)}`;
}

let reportUrl = null;
let reportTimer = null;

function revokeReportUrl() {
  if (reportTimer !== null) {
    clearTimeout(reportTimer);
    reportTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

let latestState = null;
let submitted = false;

function render(state) {
  latestState = state;
  const draft = state.draft;

  for (const radio of elements.modeRadios) {
    radio.checked = radio.value === draft.mode;
  }
  elements.modeDurationFields.hidden = draft.mode !== "duration";
  elements.modeArrivalFields.hidden = draft.mode !== "arrival";
  for (const field of ["departureDate", "departureTime", "duration", "arrivalTime"]) {
    const input = elements.inputs[field];
    if (input.value !== draft[field]) input.value = draft[field];
  }
  for (const field of ["departureOffset", "arrivalOffset"]) {
    const select = elements.inputs[field];
    if (select.value !== draft[field]) select.value = draft[field];
  }
  elements.inputs.arrivalNextDay.checked = draft.arrivalNextDay === "true";

  PRESETS.forEach((preset, index) => {
    const active =
      draft.departureOffset === preset.departureOffset && draft.arrivalOffset === preset.arrivalOffset;
    presetButtons[index].setAttribute("aria-pressed", active ? "true" : "false");
  });

  for (const field of FIELD_NAMES) {
    const slot = elements.errors[field];
    if (slot !== null && slot !== undefined) slot.textContent = "";
    const input = fieldElement(field);
    if (input !== null && input !== undefined && input.removeAttribute !== undefined) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }

  let statusText = "";
  if (state.state === "busy") statusText = t.statusBusy;
  else if (state.state === "dirty") statusText = t.statusDirty;
  else if (state.state === "cancelled") statusText = t.statusCancelled;

  if (state.state === "error" && state.error !== null) {
    const message = errorMessage(state.error);
    if (state.error.field !== null && elements.errors[state.error.field] !== undefined) {
      elements.errors[state.error.field].textContent = message;
      const input = fieldElement(state.error.field);
      if (input !== null) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-errormessage", `error-${state.error.field}`);
        if (submitted) input.focus();
      }
      statusText = t.statusFixField;
    } else {
      statusText = message;
    }
  }

  if (state.state === "success" && state.result !== null) {
    const result = state.result;
    statusText = `${t.summaryArrival} ${result.arrivalLocal.date} ${result.arrivalLocal.time} · ${dayShiftText(result.arrivalLocal.dayShift)}`;
  }

  elements.status.textContent = statusText;
  elements.status.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  elements.exampleNote.textContent = t.exampleNote;
  elements.exampleNote.hidden = !state.isExample;
  elements.cancelButton.hidden = state.state !== "busy";
  elements.runButton.disabled = state.state === "busy";

  const showResults = state.state === "success" && state.result !== null;
  elements.results.hidden = !showResults;
  if (showResults) {
    const result = state.result;
    elements.summary.replaceChildren();
    const summaryRows = [
      [t.summaryArrival, readingText(result.arrivalLocal)],
      [t.summaryDuration, `${result.duration}${t.minutesSuffix(result.durationMinutes)}`],
    ];
    for (const [label, value] of summaryRows) {
      const row = document.createElement("div");
      row.className = "summary-row";
      const term = document.createElement("span");
      term.className = "summary-label";
      term.textContent = label;
      const detail = document.createElement("span");
      detail.className = "summary-value";
      detail.textContent = value;
      row.append(term, detail);
      elements.summary.append(row);
    }
    elements.readings.replaceChildren();
    const readingRows = [
      ["departureLocal", result.departureLocal],
      ["departureInArrivalZone", result.departureInArrivalZone],
      ["arrivalLocal", result.arrivalLocal],
      ["arrivalInDepartureZone", result.arrivalInDepartureZone],
    ];
    for (const [key, reading] of readingRows) {
      const item = document.createElement("li");
      const term = document.createElement("span");
      term.className = "reading-label";
      term.textContent = t.readings[key];
      const detail = document.createElement("span");
      detail.className = "reading-value";
      detail.textContent = readingText(reading);
      item.append(term, detail);
      elements.readings.append(item);
    }
  } else {
    elements.summary.replaceChildren();
    elements.readings.replaceChildren();
  }

  elements.downloadButton.hidden = !state.reportAvailable;
  if (!state.reportAvailable) revokeReportUrl();
  submitted = false;
}

const controller = createController({
  createWorker() {
    const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, { type: "module" });
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      terminate();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    return worker;
  },
  onChange: render,
});

for (const radio of elements.modeRadios) {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    const patch = { mode: radio.value };
    if (radio.value === "duration") {
      patch.arrivalTime = "";
      patch.arrivalNextDay = "";
    } else {
      patch.duration = "";
    }
    controller.edit(patch);
  });
}

for (const field of ["departureDate", "departureTime", "duration", "arrivalTime"]) {
  elements.inputs[field].addEventListener("input", (event) => {
    controller.edit({ [field]: event.target.value });
  });
}
for (const field of ["departureOffset", "arrivalOffset"]) {
  elements.inputs[field].addEventListener("change", (event) => {
    controller.edit({ [field]: event.target.value });
  });
}
elements.inputs.arrivalNextDay.addEventListener("change", (event) => {
  controller.edit({ arrivalNextDay: event.target.checked ? "true" : "false" });
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

elements.exampleButton.addEventListener("click", () => {
  controller.loadExample();
});

elements.resetButton.addEventListener("click", () => {
  controller.reset();
  elements.inputs.departureDate.focus();
});

elements.cancelButton.addEventListener("click", () => {
  controller.cancel();
});

elements.downloadButton.addEventListener("click", () => {
  if (latestState === null || !latestState.reportAvailable || latestState.result === null) return;
  revokeReportUrl();
  const bytes = new TextEncoder().encode(serializeReport(latestState.result));
  if (bytes.byteLength > REPORT_LIMIT_BYTES) {
    elements.status.textContent = t.reportTooLarge;
    return;
  }
  reportUrl = URL.createObjectURL(new Blob([bytes], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportTimer = setTimeout(revokeReportUrl, 30000);
});

window.addEventListener("pagehide", () => {
  revokeReportUrl();
  controller.destroy();
});

render(controller.snapshot());
