// DOM wiring for the Golden Hour Calculator. All values are rendered
// with textContent / value only; the computation itself runs in a
// module Worker built from the fixed worker source. The city preset
// table is app-layer fixed data: choosing a city fills latitude,
// longitude and UTC offset, and hand-editing any of the three fields
// switches the preset back to custom.

import { REPORT_FILENAME, REPORT_LIMIT_BYTES, serializeReport } from "./core/golden-hour.mjs";
import { createController } from "./controller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const lang = document.documentElement.lang === "en" ? "en" : "zh";

export const CITIES = [
  { key: "taipei", latitude: "25.0330", longitude: "121.5654", utcOffset: "+08:00" },
  { key: "taichung", latitude: "24.1477", longitude: "120.6736", utcOffset: "+08:00" },
  { key: "kaohsiung", latitude: "22.6273", longitude: "120.3014", utcOffset: "+08:00" },
  { key: "tokyo", latitude: "35.6762", longitude: "139.6503", utcOffset: "+09:00" },
  { key: "sydney", latitude: "-33.8688", longitude: "151.2093", utcOffset: "+10:00" },
  { key: "london", latitude: "51.5074", longitude: "-0.1278", utcOffset: "+00:00" },
  { key: "new-york", latitude: "40.7128", longitude: "-74.0060", utcOffset: "-05:00" },
  { key: "reykjavik", latitude: "64.1466", longitude: "-21.9426", utcOffset: "+00:00" },
];

const STRINGS = {
  zh: {
    emptyField: {
      date: "請輸入日期。",
      latitude: "請輸入緯度。",
      longitude: "請輸入經度。",
      utcOffset: "請輸入 UTC 偏移。",
    },
    errors: {
      SCHEMA: "輸入格式不正確，請檢查後重新輸入。",
      INPUT_LIMIT: "輸入太長，請縮短後再試。",
      UNICODE: "輸入含有不完整的字元。",
      DATE_FORMAT: "日期格式不正確：請輸入真實日期，例如 2026-06-21。",
      DECIMAL_FORMAT: "格式不正確：請輸入數字，最多 4 位小數，不加 + 號或空白。",
      OFFSET_FORMAT: "偏移格式不正確：請用 ±HH:MM，分鐘只接受 00、15、30、45，例如 +08:00。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
    },
    rangeField: {
      date: "日期需在 1900-01-01 至 2100-12-31 之間。",
      latitude: "緯度需在 −89.9 至 89.9 度之間。",
      longitude: "經度需在 −180 至 180 度之間。",
      utcOffset: "偏移需在 −12:00 至 +14:00 之間。",
    },
    statusDirty: "輸入已變更，請重新執行",
    statusCancelled: "已取消，可重新執行",
    statusBusy: "處理中",
    statusFixField: "請修正標示的欄位後重新執行。",
    exampleNote: "目前是範例內容（2026-06-21，台北）；按「計算黃金時刻」執行。",
    statusDone: (sunrise, sunset) => `計算完成：日出 ${sunrise}、日落 ${sunset}`,
    summary: {
      sunrise: "日出",
      solarNoon: "太陽正午",
      sunset: "日落",
      dayLength: "日長",
      noonElevation: "正午仰角",
    },
    windows: {
      goldenMorning: "上午黃金時刻",
      goldenEvening: "傍晚黃金時刻",
      blueMorning: "上午藍調時刻",
      blueEvening: "傍晚藍調時刻",
    },
    windowReason: {
      golden: {
        SUN_NEVER_LOW: "這天太陽不會降到 −4° 以下，因此沒有黃金時刻。",
        SUN_NEVER_HIGH: "這天太陽最高不到 +6°，因此沒有黃金時刻。",
      },
      blue: {
        SUN_NEVER_LOW: "這天太陽不會降到 −6° 以下，因此沒有藍調時刻。",
        SUN_NEVER_HIGH: "這天太陽最高不到 −4°，因此沒有藍調時刻。",
      },
    },
    polar: {
      POLAR_DAY: "極晝：這一天太陽整日不落下。",
      POLAR_NIGHT: "極夜：這一天太陽整日不升起。",
    },
    previousDay: "（前一日）",
    nextDay: "（次一日）",
    minutesUnit: (n) => `${n} 分鐘`,
    degreesUnit: (n) => `${n}°`,
    reportTooLarge: "報告超過大小上限，無法下載。",
  },
  en: {
    emptyField: {
      date: "Enter the date.",
      latitude: "Enter the latitude.",
      longitude: "Enter the longitude.",
      utcOffset: "Enter the UTC offset.",
    },
    errors: {
      SCHEMA: "The input shape is not valid; check it and run again.",
      INPUT_LIMIT: "The input is too long; shorten it and try again.",
      UNICODE: "The input contains an incomplete character.",
      DATE_FORMAT: "Use a real calendar date in YYYY-MM-DD form, for example 2026-06-21.",
      DECIMAL_FORMAT: "Use a number with at most 4 decimal places, without a + sign or spaces.",
      OFFSET_FORMAT: "Use ±HH:MM with minutes of 00, 15, 30 or 45 only, for example +08:00.",
      INTERNAL: "Processing failed. Try again.",
      WORKER_ERROR: "Processing failed. Try again.",
    },
    rangeField: {
      date: "The date must be between 1900-01-01 and 2100-12-31.",
      latitude: "The latitude must be between −89.9 and 89.9 degrees.",
      longitude: "The longitude must be between −180 and 180 degrees.",
      utcOffset: "The offset must be between −12:00 and +14:00.",
    },
    statusDirty: "Input changed. Run again.",
    statusCancelled: "Cancelled. You can run again.",
    statusBusy: "Working",
    statusFixField: "Fix the highlighted field and run again.",
    exampleNote: "Showing the worked example (2026-06-21, Taipei). Press \u201CCalculate golden hour\u201D to run it.",
    statusDone: (sunrise, sunset) => `Done: sunrise ${sunrise}, sunset ${sunset}`,
    summary: {
      sunrise: "Sunrise",
      solarNoon: "Solar noon",
      sunset: "Sunset",
      dayLength: "Day length",
      noonElevation: "Solar noon elevation",
    },
    windows: {
      goldenMorning: "Morning golden hour",
      goldenEvening: "Evening golden hour",
      blueMorning: "Morning blue hour",
      blueEvening: "Evening blue hour",
    },
    windowReason: {
      golden: {
        SUN_NEVER_LOW: "The sun never drops below −4° on this date, so there is no golden hour.",
        SUN_NEVER_HIGH: "The sun never reaches +6° on this date, so there is no golden hour.",
      },
      blue: {
        SUN_NEVER_LOW: "The sun never drops below −6° on this date, so there is no blue hour.",
        SUN_NEVER_HIGH: "The sun never rises to −4° on this date, so there is no blue hour.",
      },
    },
    polar: {
      POLAR_DAY: "Polar day: the sun does not set on this date.",
      POLAR_NIGHT: "Polar night: the sun does not rise on this date.",
    },
    previousDay: " (previous day)",
    nextDay: " (next day)",
    minutesUnit: (n) => `${n} min`,
    degreesUnit: (n) => `${n}°`,
    reportTooLarge: "The report exceeds the size limit and cannot be downloaded.",
  },
};

const t = STRINGS[lang];

const FIELD_NAMES = ["date", "latitude", "longitude", "utcOffset"];
const WINDOW_KEYS = ["goldenMorning", "goldenEvening", "blueMorning", "blueEvening"];

const elements = {
  form: document.getElementById("golden-form"),
  inputs: {},
  errors: {},
  preset: document.getElementById("field-preset"),
  status: document.getElementById("status"),
  exampleNote: document.getElementById("example-note"),
  runButton: document.getElementById("run-btn"),
  exampleButton: document.getElementById("example-btn"),
  resetButton: document.getElementById("reset-btn"),
  cancelButton: document.getElementById("cancel-btn"),
  results: document.getElementById("results"),
  polarNote: document.getElementById("polar-note"),
  summary: document.getElementById("summary-list"),
  windows: document.getElementById("windows-list"),
  downloadButton: document.getElementById("download-btn"),
};

for (const field of FIELD_NAMES) {
  elements.inputs[field] = document.getElementById(`field-${field}`);
  elements.errors[field] = document.getElementById(`error-${field}`);
}

function errorMessage(error) {
  if (error.code === "EMPTY") return t.emptyField[error.field] ?? t.errors.SCHEMA;
  if (error.code === "RANGE" && error.field !== null && t.rangeField[error.field] !== undefined) {
    return t.rangeField[error.field];
  }
  return t.errors[error.code] ?? t.errors.WORKER_ERROR;
}

function formatTime(time, dayOffset) {
  if (dayOffset === -1) return `${time}${t.previousDay}`;
  if (dayOffset === 1) return `${time}${t.nextDay}`;
  return time;
}

function presetKeyFor(draft) {
  for (const city of CITIES) {
    if (
      city.latitude === draft.latitude &&
      city.longitude === draft.longitude &&
      city.utcOffset === draft.utcOffset
    ) {
      return city.key;
    }
  }
  return "custom";
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

  for (const field of FIELD_NAMES) {
    const input = elements.inputs[field];
    if (input.value !== draft[field]) input.value = draft[field];
  }
  const presetKey = presetKeyFor(draft);
  if (elements.preset.value !== presetKey) elements.preset.value = presetKey;

  for (const field of FIELD_NAMES) {
    const slot = elements.errors[field];
    if (slot !== null && slot !== undefined) slot.textContent = "";
    const input = elements.inputs[field];
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
      const input = elements.inputs[state.error.field];
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
    statusText =
      result.status === "NORMAL"
        ? t.statusDone(result.sunrise, result.sunset)
        : t.polar[result.status];
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
    const summaryRows = [];
    if (result.status === "NORMAL") {
      summaryRows.push([t.summary.sunrise, formatTime(result.sunrise, result.sunriseDayOffset)]);
      summaryRows.push([t.summary.solarNoon, formatTime(result.solarNoon, result.solarNoonDayOffset)]);
      summaryRows.push([t.summary.sunset, formatTime(result.sunset, result.sunsetDayOffset)]);
      summaryRows.push([t.summary.dayLength, `${result.dayLength}${lang === "zh" ? `（${t.minutesUnit(result.dayLengthMinutes)}）` : ` (${t.minutesUnit(result.dayLengthMinutes)})`}`]);
    }
    summaryRows.push([t.summary.noonElevation, t.degreesUnit(result.noonElevation)]);
    for (const [label, value] of summaryRows) {
      const row = document.createElement("div");
      row.className = "summary-row";
      const rowLabel = document.createElement("span");
      rowLabel.className = "summary-label";
      rowLabel.textContent = label;
      const rowValue = document.createElement("span");
      rowValue.className = "summary-value";
      rowValue.textContent = value;
      row.append(rowLabel, rowValue);
      elements.summary.append(row);
    }

    elements.polarNote.textContent =
      result.status === "NORMAL" ? "" : t.polar[result.status];
    elements.polarNote.hidden = result.status === "NORMAL";

    elements.windows.replaceChildren();
    for (const key of WINDOW_KEYS) {
      const item = document.createElement("li");
      const term = document.createElement("span");
      term.className = "reading-label";
      term.textContent = t.windows[key];
      const detail = document.createElement("span");
      detail.className = "reading-value";
      const windowValue = result[key];
      if (windowValue === null) {
        const kind = key.startsWith("golden") ? "golden" : "blue";
        detail.textContent = t.windowReason[kind][result.windowStatus[key]];
      } else {
        const start = formatTime(windowValue.start, windowValue.startDayOffset);
        const end = formatTime(windowValue.end, windowValue.endDayOffset);
        detail.textContent = `${start}–${end} (${t.minutesUnit(windowValue.durationMinutes)})`;
      }
      item.append(term, detail);
      elements.windows.append(item);
    }
  } else {
    elements.summary.replaceChildren();
    elements.windows.replaceChildren();
    elements.polarNote.textContent = "";
    elements.polarNote.hidden = true;
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

for (const field of FIELD_NAMES) {
  elements.inputs[field].addEventListener("input", (event) => {
    controller.edit({ [field]: event.target.value });
  });
}

elements.preset.addEventListener("change", (event) => {
  const city = CITIES.find((entry) => entry.key === event.target.value);
  if (city === undefined) return;
  controller.edit({
    latitude: city.latitude,
    longitude: city.longitude,
    utcOffset: city.utcOffset,
  });
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
  elements.inputs.date.focus();
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
