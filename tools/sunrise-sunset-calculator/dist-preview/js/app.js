// DOM wiring for the Sunrise & Sunset Calculator. All user-visible
// text is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The eight city presets are app-level fixed data
// (SPEC inputsOutputs): choosing one writes its latitude, longitude,
// and UTC offset into the draft; editing any of those fields by hand
// switches the preset back to custom. The report download is created
// only on an explicit click, from the current success snapshot, and
// its Blob URL is revoked within 30 seconds or as soon as the result
// is invalidated.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  REPORT_LIMIT_BYTES,
  serializeReport,
} from "./core/sun.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

// Fixed city presets: standard-time offsets, coordinates to 4 decimal
// places, exactly as pinned in the SPEC table.
const PRESETS = {
  taipei: { latitude: "25.0330", longitude: "121.5654", utcOffset: "+08:00" },
  taichung: { latitude: "24.1477", longitude: "120.6736", utcOffset: "+08:00" },
  kaohsiung: { latitude: "22.6273", longitude: "120.3014", utcOffset: "+08:00" },
  tokyo: { latitude: "35.6762", longitude: "139.6503", utcOffset: "+09:00" },
  sydney: { latitude: "-33.8688", longitude: "151.2093", utcOffset: "+10:00" },
  london: { latitude: "51.5074", longitude: "-0.1278", utcOffset: "+00:00" },
  newyork: { latitude: "40.7128", longitude: "-74.0060", utcOffset: "-05:00" },
  reykjavik: { latitude: "64.1466", longitude: "-21.9426", utcOffset: "+00:00" },
};

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      date: "日期",
      latitude: "緯度",
      longitude: "經度",
      utcOffset: "UTC 偏移",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      DATE_FORMAT: "日期格式不正確：請用 YYYY-MM-DD 並確認是真實日期",
      DECIMAL_FORMAT: "請輸入數字：整數最多 3 位、小數最多 4 位",
      OFFSET_FORMAT: "偏移格式不正確：請用 ±HH:MM，分鐘須為 00、15、30 或 45",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorEmpty: {
      date: "請輸入日期",
      latitude: "請輸入緯度",
      longitude: "請輸入經度",
      utcOffset: "請輸入 UTC 偏移",
    },
    errorRange: {
      date: "日期須在 1900-01-01 至 2100-12-31 之間",
      latitude: "緯度須在 −89.9 至 89.9 之間",
      longitude: "經度須在 −180 至 180 之間",
      utcOffset: "偏移須在 −12:00 至 +14:00 之間",
    },
    statusEmpty: "尚未計算。輸入日期與座標，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算日出日落」執行。",
    polarDay: "極晝：這一天太陽整日不落下。",
    polarNight: "極夜：這一天太陽整日不升起。",
    rowSunrise: "日出",
    rowSolarNoon: "太陽正午",
    rowSunset: "日落",
    rowDayLength: "日長",
    prevDay: "（前一日）",
    nextDay: "（次一日）",
    statusSuccess: (result) =>
      `日出 ${result.sunrise}，日落 ${result.sunset}，日長 ${result.dayLength}`,
  },
  en: {
    fieldLabel: {
      date: "Date",
      latitude: "Latitude",
      longitude: "Longitude",
      utcOffset: "UTC offset",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      DATE_FORMAT: "Enter a real calendar date as YYYY-MM-DD.",
      DECIMAL_FORMAT: "Enter a number: up to 3 integer digits and 4 decimal places.",
      OFFSET_FORMAT: "Use ±HH:MM with minutes 00, 15, 30 or 45.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorEmpty: {
      date: "Enter a date.",
      latitude: "Enter a latitude.",
      longitude: "Enter a longitude.",
      utcOffset: "Enter a UTC offset.",
    },
    errorRange: {
      date: "Date must be between 1900-01-01 and 2100-12-31.",
      latitude: "Latitude must be between −89.9 and 89.9.",
      longitude: "Longitude must be between −180 and 180.",
      utcOffset: "Offset must be between −12:00 and +14:00.",
    },
    statusEmpty: "Nothing calculated yet. Enter a date and coordinates, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate sunrise & sunset” to run it.",
    polarDay: "Polar day: the sun does not set on this date.",
    polarNight: "Polar night: the sun does not rise on this date.",
    rowSunrise: "Sunrise",
    rowSolarNoon: "Solar noon",
    rowSunset: "Sunset",
    rowDayLength: "Day length",
    prevDay: "(previous day)",
    nextDay: "(next day)",
    statusSuccess: (result) =>
      `Sunrise ${result.sunrise}, sunset ${result.sunset}, day length ${result.dayLength}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("sun-form");
const inputs = {
  date: document.getElementById("field-date"),
  latitude: document.getElementById("field-latitude"),
  longitude: document.getElementById("field-longitude"),
  utcOffset: document.getElementById("field-utcOffset"),
};
const presetSelect = document.getElementById("field-preset");
const fieldErrors = {
  date: document.getElementById("error-date"),
  latitude: document.getElementById("error-latitude"),
  longitude: document.getElementById("error-longitude"),
  utcOffset: document.getElementById("error-utcOffset"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const polarNoteEl = document.getElementById("polar-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
// The default draft and the worked example both carry the Taipei
// preset coordinates, so the preset starts (and resets) at Taipei.
let preset = "taipei";

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
  if (error.code === "EMPTY") return t.errorEmpty[error.field] ?? t.error.INTERNAL;
  if (error.code === "RANGE") return t.errorRange[error.field] ?? t.error.INTERNAL;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function withDayMarker(time, dayOffset) {
  if (dayOffset === -1) return `${time} ${t.prevDay}`;
  if (dayOffset === 1) return `${time} ${t.nextDay}`;
  return time;
}

function renderSummary(result) {
  summaryRows.replaceChildren();
  const rows = [
    [t.rowSunrise, withDayMarker(result.sunrise, result.sunriseDayOffset)],
    [t.rowSolarNoon, withDayMarker(result.solarNoon, result.solarNoonDayOffset)],
    [t.rowSunset, withDayMarker(result.sunset, result.sunsetDayOffset)],
    [t.rowDayLength, result.dayLength],
  ];
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    summaryRows.appendChild(div);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  if (presetSelect.value !== preset) presetSelect.value = preset;
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeDownload();

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
    clearFieldErrors();
    if (result.status === "NORMAL") {
      polarNoteEl.hidden = true;
      summaryRows.hidden = false;
      renderSummary(result);
      statusEl.textContent = t.statusSuccess(result);
    } else {
      summaryRows.hidden = true;
      polarNoteEl.hidden = false;
      polarNoteEl.textContent = result.status === "POLAR_DAY" ? t.polarDay : t.polarNight;
      statusEl.textContent = polarNoteEl.textContent;
    }
    resultsEl.hidden = false;
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
    if (field !== "date") preset = "";
    controller.edit({ [field]: inputs[field].value });
  });
}

presetSelect.addEventListener("change", () => {
  const chosen = presetSelect.value;
  if (chosen !== "" && PRESETS[chosen] !== undefined) {
    preset = chosen;
    controller.edit({ ...PRESETS[chosen] });
  } else {
    preset = "";
  }
  render(controller.getState());
});

exampleBtn.addEventListener("click", () => {
  preset = "taipei";
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  preset = "taipei";
  controller.reset();
  inputs.date.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const publicState = controller.getState();
  if (!publicState.reportAvailable || publicState.result === null) return;
  const bytes = new TextEncoder().encode(serializeReport(publicState.result));
  if (bytes.byteLength > REPORT_LIMIT_BYTES) return;
  revokeDownload();
  const blob = new Blob([bytes], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

window.addEventListener("pagehide", () => {
  revokeDownload();
  controller.destroy();
});

render(controller.getState());
