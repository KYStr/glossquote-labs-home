// DOM wiring for the AQI Interpreter. All user-visible text is set
// through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (aqi-interpreter-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.
// Switching input mode clears the other mode's inputs, so a run can
// never fail the cross-mode SCHEMA rule (direct mode needs rows [];
// concentration mode needs aqi "").

import { createController } from "./controller.mjs";
import {
  DEFAULTS,
  LEVELS,
  POLLUTANTS,
  POLLUTANT_INFO,
  buildReport,
} from "./core/aqi-interpreter.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    modeLabel: "輸入方式",
    modeAqi: "直接輸入 AQI",
    modeConcentration: "輸入污染物濃度",
    systemLabel: "分級制度",
    systemTw: "台灣（環境部）",
    systemUs: "美國 EPA",
    aqiLabel: "AQI 數值",
    aqiHelp: "整數，範圍 0 至 500。",
    aqiPlaceholder: "例如 35",
    rowsLabel: "污染物濃度",
    rowsHelp: "1 至 7 列，每列一種污染物；同一污染物不可重複選取。",
    addRow: "新增污染物",
    removeRow: "移除",
    rowPollutantLabel: (n) => `第 ${n} 列污染物`,
    rowValueLabel: (n) => `第 ${n} 列濃度`,
    rowValuePlaceholder: "例如 20.0",
    pollutantDesc: {
      "PM2.5": "PM2.5（24 小時平均，µg/m³）",
      PM10: "PM10（24 小時平均，µg/m³）",
      "O3-8h": "O3 8 小時平均（ppm）",
      "O3-1h": "O3 1 小時平均（ppm）",
      CO: "CO 8 小時平均（ppm）",
      SO2: "SO2 1 小時平均（ppb）",
      NO2: "NO2 1 小時平均（ppb）",
    },
    pollutantUnit: {
      "PM2.5": "µg/m³",
      PM10: "µg/m³",
      "O3-8h": "ppm",
      "O3-1h": "ppm",
      CO: "ppm",
      SO2: "ppb",
      NO2: "ppb",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數 0–500，不含小數、符號或空白",
      DECIMAL_FORMAT: "請輸入數字，可含一個小數點（小數至多 6 位），不含符號或空白",
      ENUM: "選項不在允許範圍內",
      DUPLICATE: "同一污染物不可重複選取",
      ROW_LIMIT: "最多 7 列污染物",
      UNDEFINED_BAND:
        "此濃度沒有對應的 AQI 區間（例如 O3 8 小時超過 0.200 ppm、O3 1 小時低於最低有定義值，或 SO2 1 小時超過 304 ppb），請改輸入其他污染物或數值",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    rangeErrorAqi: "AQI 須在 0 至 500 之間",
    rangeErrorRow: (pollutant, cap, unit) => `${pollutant} 濃度須在 0 至 ${cap} ${unit} 之間`,
    statusEmpty: "尚未解讀。輸入 AQI 或污染物濃度，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（AQI 35，台灣制），請按「解讀空氣品質」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelLevel: "等級",
    labelAqi: "AQI",
    labelHealth: "健康影響",
    labelAdviceGeneral: "一般民眾活動建議",
    labelAdviceSensitive: "敏感族群活動建議",
    labelDominant: "指標污染物",
    dominantNone: "無（直接輸入 AQI）",
    labelSubIndices: "各污染物副指標",
    colPollutant: "污染物",
    colConcentration: "濃度",
    colSubIndex: "副指標",
    colLevel: "等級",
    labelNotices: "通知",
    noticeAboveTop: (pollutant) => `${pollutant} 濃度超過對照表上限，副指標以 500 計。`,
    noticeSkipped: (pollutant) => `${pollutant} 濃度沒有對應的 AQI 區間，已跳過此列。`,
    levelValue: (result) => `${result.levelZh}（${result.levelEn}）`,
    successSummary: (result) => `等級：${result.levelZh}（${result.levelEn}），AQI ${result.aqi}`,
  },
  en: {
    modeLabel: "Input mode",
    modeAqi: "Enter AQI directly",
    modeConcentration: "Enter pollutant concentrations",
    systemLabel: "Rating system",
    systemTw: "Taiwan (MOENV)",
    systemUs: "US EPA",
    aqiLabel: "AQI value",
    aqiHelp: "Whole number, from 0 to 500.",
    aqiPlaceholder: "e.g. 35",
    rowsLabel: "Pollutant concentrations",
    rowsHelp: "1 to 7 rows, one pollutant per row; the same pollutant cannot be selected twice.",
    addRow: "Add pollutant",
    removeRow: "Remove",
    rowPollutantLabel: (n) => `Row ${n} pollutant`,
    rowValueLabel: (n) => `Row ${n} concentration`,
    rowValuePlaceholder: "e.g. 20.0",
    pollutantDesc: {
      "PM2.5": "PM2.5 (24-hour average, µg/m³)",
      PM10: "PM10 (24-hour average, µg/m³)",
      "O3-8h": "O3 8-hour average (ppm)",
      "O3-1h": "O3 1-hour average (ppm)",
      CO: "CO 8-hour average (ppm)",
      SO2: "SO2 1-hour average (ppb)",
      NO2: "NO2 1-hour average (ppb)",
    },
    pollutantUnit: {
      "PM2.5": "µg/m³",
      PM10: "µg/m³",
      "O3-8h": "ppm",
      "O3-1h": "ppm",
      CO: "ppm",
      SO2: "ppb",
      NO2: "ppb",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an unpaired character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number from 0 to 500 with no decimal, sign, or space.",
      DECIMAL_FORMAT:
        "Enter a number with at most one decimal point (up to 6 decimal places) and no sign or space.",
      ENUM: "The selected option is not allowed.",
      DUPLICATE: "The same pollutant cannot be selected twice.",
      ROW_LIMIT: "At most 7 pollutant rows are allowed.",
      UNDEFINED_BAND:
        "This concentration has no matching AQI band (for example, 8-hour O3 above 0.200 ppm, 1-hour O3 below the lowest defined value, or 1-hour SO2 above 304 ppb). Try a different pollutant or value.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    rangeErrorAqi: "AQI must be between 0 and 500.",
    rangeErrorRow: (pollutant, cap, unit) => `${pollutant} concentration must be between 0 and ${cap} ${unit}.`,
    statusEmpty: "Nothing interpreted yet. Enter an AQI value or pollutant concentrations, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (AQI 35, Taiwan system). Press “Interpret air quality” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelLevel: "Level",
    labelAqi: "AQI",
    labelHealth: "Health impact",
    labelAdviceGeneral: "Advice for the general public",
    labelAdviceSensitive: "Advice for sensitive groups",
    labelDominant: "Dominant pollutant",
    dominantNone: "None (direct AQI input)",
    labelSubIndices: "Sub-indices by pollutant",
    colPollutant: "Pollutant",
    colConcentration: "Concentration",
    colSubIndex: "Sub-index",
    colLevel: "Level",
    labelNotices: "Notices",
    noticeAboveTop: (pollutant) =>
      `${pollutant} concentration exceeds the table top; sub-index capped at 500.`,
    noticeSkipped: (pollutant) =>
      `${pollutant} concentration has no matching AQI band; this row was skipped.`,
    levelValue: (result) => `${result.levelEn} (${result.levelZh})`,
    successSummary: (result) => `Level: ${result.levelEn} (${result.levelZh}), AQI ${result.aqi}`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const modeRadios = {
  aqi: document.getElementById("mode-aqi"),
  concentration: document.getElementById("mode-concentration"),
};
const systemRadios = {
  TW: document.getElementById("system-tw"),
  US: document.getElementById("system-us"),
};
const aqiFieldWrap = document.getElementById("aqi-field");
const aqiInput = document.getElementById("field-aqi");
const aqiError = document.getElementById("error-aqi");
const rowsWrap = document.getElementById("rows-field");
const rowsList = document.getElementById("rows-list");
const addRowBtn = document.getElementById("add-row-btn");
const rowsError = document.getElementById("error-rows");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const levelSwatch = document.getElementById("level-swatch");
const levelName = document.getElementById("level-name");
const resultAqi = document.getElementById("result-aqi");
const healthImpactEl = document.getElementById("health-impact");
const adviceGeneralEl = document.getElementById("advice-general");
const adviceSensitiveEl = document.getElementById("advice-sensitive");
const dominantEl = document.getElementById("dominant-value");
const subIndicesWrap = document.getElementById("subindices-wrap");
const subIndicesBody = document.getElementById("subindices-body");
const noticesWrap = document.getElementById("notices-wrap");
const noticesList = document.getElementById("notices-list");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let submitted = false;
let lastRowsSignature = null;
let pendingFocus = null;

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

function rowsSignature(rows) {
  return `${rows.length}#${rows.map((row) => row.pollutant).join("|")}`;
}

function setFieldError(inputEl, errorEl, message) {
  if (message === null) {
    inputEl.removeAttribute("aria-invalid");
    inputEl.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  inputEl.setAttribute("aria-invalid", "true");
  inputEl.setAttribute("aria-errormessage", errorEl.id);
  errorEl.textContent = message;
}

function errorMessage(error, rowPollutant) {
  if (error.code === "RANGE" && error.field === "aqi") return t.rangeErrorAqi;
  if (error.code === "RANGE" && error.field === "rows" && rowPollutant) {
    const info = POLLUTANT_INFO[rowPollutant];
    return t.rangeErrorRow(rowPollutant, info.cap, t.pollutantUnit[rowPollutant]);
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function buildRowElements(index, row) {
  const rowNumber = index + 1;
  const container = document.createElement("div");
  container.className = "pollutant-row";
  container.dataset.index = String(index);

  const pollutantField = document.createElement("div");
  pollutantField.className = "field row-field";
  const pollutantLabel = document.createElement("label");
  pollutantLabel.htmlFor = `row-${index}-pollutant`;
  pollutantLabel.textContent = t.rowPollutantLabel(rowNumber);
  const select = document.createElement("select");
  select.id = `row-${index}-pollutant`;
  select.name = `row-${index}-pollutant`;
  for (const pollutant of POLLUTANTS) {
    const option = document.createElement("option");
    option.value = pollutant;
    option.textContent = t.pollutantDesc[pollutant];
    select.append(option);
  }
  select.value = row.pollutant;
  pollutantField.append(pollutantLabel, select);

  const valueField = document.createElement("div");
  valueField.className = "field row-field";
  const valueLabel = document.createElement("label");
  valueLabel.htmlFor = `row-${index}-value`;
  valueLabel.textContent = t.rowValueLabel(rowNumber);
  const input = document.createElement("input");
  input.id = `row-${index}-value`;
  input.name = `row-${index}-value`;
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.placeholder = t.rowValuePlaceholder;
  input.value = row.value;
  input.setAttribute("aria-describedby", `row-${index}-error`);
  valueField.append(valueLabel, input);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "button-secondary row-remove";
  removeBtn.textContent = t.removeRow;
  removeBtn.dataset.row = String(index);

  const errorEl = document.createElement("p");
  errorEl.className = "field-error";
  errorEl.id = `row-${index}-error`;
  errorEl.setAttribute("role", "alert");

  select.addEventListener("change", () => {
    const current = controller.getState().draft;
    const nextRows = current.rows.map((entry, i) =>
      i === index ? { pollutant: select.value, value: entry.value } : { ...entry },
    );
    pendingFocus = { row: index, field: "pollutant" };
    controller.edit({ rows: nextRows });
  });
  input.addEventListener("input", () => {
    const current = controller.getState().draft;
    const nextRows = current.rows.map((entry, i) =>
      i === index ? { pollutant: entry.pollutant, value: input.value } : { ...entry },
    );
    controller.edit({ rows: nextRows });
  });
  removeBtn.addEventListener("click", () => {
    const current = controller.getState().draft;
    const nextRows = current.rows.filter((entry, i) => i !== index);
    pendingFocus = { row: null, field: "add" };
    controller.edit({ rows: nextRows });
  });

  container.append(pollutantField, valueField, removeBtn, errorEl);
  return container;
}

function renderRows(draft, error) {
  const signature = rowsSignature(draft.rows);
  if (signature !== lastRowsSignature) {
    rowsList.replaceChildren();
    draft.rows.forEach((row, index) => {
      rowsList.append(buildRowElements(index, row));
    });
    lastRowsSignature = signature;
    if (pendingFocus !== null) {
      const target = pendingFocus;
      pendingFocus = null;
      if (target.field === "add") {
        addRowBtn.focus();
      } else if (target.row !== null) {
        const select = document.getElementById(`row-${target.row}-pollutant`);
        if (select !== null) select.focus();
      }
    }
  } else {
    // Same rows: only sync values and option availability, so typing
    // never rebuilds the row the user is editing.
    draft.rows.forEach((row, index) => {
      const select = document.getElementById(`row-${index}-pollutant`);
      const input = document.getElementById(`row-${index}-value`);
      if (select !== null && select.value !== row.pollutant) select.value = row.pollutant;
      if (input !== null && input.value !== row.value) input.value = row.value;
    });
  }
  // Disable pollutants already used in another row (the core still
  // enforces DUPLICATE for programmatic input).
  draft.rows.forEach((row, index) => {
    const select = document.getElementById(`row-${index}-pollutant`);
    if (select === null) return;
    for (const option of select.options) {
      option.disabled =
        option.value !== row.pollutant &&
        draft.rows.some((other, j) => j !== index && other.pollutant === option.value);
    }
  });
  // Per-row errors.
  draft.rows.forEach((row, index) => {
    const select = document.getElementById(`row-${index}-pollutant`);
    const input = document.getElementById(`row-${index}-value`);
    const errorEl = document.getElementById(`row-${index}-error`);
    if (select === null || input === null || errorEl === null) return;
    const clearAttrs = (target) => {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    };
    const markInvalid = (target) => {
      target.setAttribute("aria-invalid", "true");
      target.setAttribute("aria-errormessage", errorEl.id);
    };
    const isRowError =
      error !== null && error.field === "rows" && error.row === index + 1;
    if (!isRowError) {
      clearAttrs(select);
      clearAttrs(input);
      errorEl.textContent = "";
      return;
    }
    const message = errorMessage(error, row.pollutant);
    errorEl.textContent = message;
    if (error.code === "ENUM" || error.code === "DUPLICATE") {
      markInvalid(select);
      clearAttrs(input);
    } else {
      markInvalid(input);
      clearAttrs(select);
    }
  });
  addRowBtn.disabled = draft.rows.length >= POLLUTANTS.length;
}

function renderResult(result) {
  const pinned = LEVELS[result.level];
  levelSwatch.className = `level-swatch level-${result.level}`;
  levelSwatch.textContent = result.hex;
  levelName.textContent = t.levelValue(result);
  resultAqi.textContent = `AQI ${result.aqi}`;
  healthImpactEl.textContent = lang === "en" ? pinned.healthImpactEn : result.healthImpact;
  adviceGeneralEl.textContent = lang === "en" ? pinned.adviceGeneralEn : result.adviceGeneral;
  adviceSensitiveEl.textContent = lang === "en" ? pinned.adviceSensitiveEn : result.adviceSensitive;
  dominantEl.textContent =
    result.dominantPollutant === null ? t.dominantNone : result.dominantPollutant;

  subIndicesWrap.hidden = result.subIndices.length === 0;
  subIndicesBody.replaceChildren();
  for (const entry of result.subIndices) {
    const tr = document.createElement("tr");
    const pollutantCell = document.createElement("td");
    pollutantCell.textContent = entry.pollutant;
    const concentrationCell = document.createElement("td");
    concentrationCell.textContent = `${String(entry.concentration)} ${t.pollutantUnit[entry.pollutant]}`;
    const subIndexCell = document.createElement("td");
    subIndexCell.textContent = String(entry.subIndex);
    const levelCell = document.createElement("td");
    const entryLevel = LEVELS[entry.level];
    levelCell.textContent = lang === "en" ? entryLevel.levelEn : entryLevel.levelZh;
    tr.append(pollutantCell, concentrationCell, subIndexCell, levelCell);
    subIndicesBody.append(tr);
  }

  noticesWrap.hidden = result.notices.length === 0;
  noticesList.replaceChildren();
  for (const notice of result.notices) {
    const li = document.createElement("li");
    li.textContent =
      notice.code === "ABOVE_TABLE_TOP"
        ? t.noticeAboveTop(notice.pollutant)
        : t.noticeSkipped(notice.pollutant);
    noticesList.append(li);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  modeRadios.aqi.checked = draft.mode === "aqi";
  modeRadios.concentration.checked = draft.mode === "concentration";
  systemRadios.TW.checked = draft.system === "TW";
  systemRadios.US.checked = draft.system === "US";
  aqiFieldWrap.hidden = draft.mode !== "aqi";
  rowsWrap.hidden = draft.mode !== "concentration";
  if (aqiInput.value !== draft.aqi) aqiInput.value = draft.aqi;
  renderRows(draft, state === "error" ? error : null);
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
    setFieldError(aqiInput, aqiError, null);
    rowsError.textContent = "";
  } else if (state === "dirty") {
    statusEl.textContent = t.statusDirty;
    resultsEl.hidden = true;
    setFieldError(aqiInput, aqiError, null);
    rowsError.textContent = "";
  } else if (state === "busy") {
    statusEl.textContent = t.statusBusy;
    resultsEl.hidden = true;
  } else if (state === "cancelled") {
    statusEl.textContent = t.statusCancelled;
    resultsEl.hidden = true;
    setFieldError(aqiInput, aqiError, null);
    rowsError.textContent = "";
  } else if (state === "error") {
    resultsEl.hidden = true;
    setFieldError(aqiInput, aqiError, null);
    rowsError.textContent = "";
    if (error !== null) {
      const message = errorMessage(
        error,
        error.field === "rows" && error.row !== null && draft.rows[error.row - 1]
          ? draft.rows[error.row - 1].pollutant
          : undefined,
      );
      if (error.field === "aqi") {
        setFieldError(aqiInput, aqiError, message);
        statusEl.textContent = `${t.aqiLabel}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          aqiInput.focus();
        }
      } else if (error.field === "rows" && error.row !== null) {
        statusEl.textContent = `${t.rowValueLabel(error.row)}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          const target =
            error.code === "ENUM" || error.code === "DUPLICATE"
              ? document.getElementById(`row-${error.row - 1}-pollutant`)
              : document.getElementById(`row-${error.row - 1}-value`);
          if (target !== null) target.focus();
        }
      } else {
        rowsError.textContent = message;
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
  } else if (state === "success" && result !== null) {
    renderResult(result);
    statusEl.textContent = t.successSummary(result);
    resultsEl.hidden = false;
    setFieldError(aqiInput, aqiError, null);
    rowsError.textContent = "";
  }
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  controller.run();
});

modeRadios.aqi.addEventListener("change", () => {
  if (modeRadios.aqi.checked) controller.edit({ mode: "aqi", rows: [] });
});
modeRadios.concentration.addEventListener("change", () => {
  if (modeRadios.concentration.checked) controller.edit({ mode: "concentration", aqi: "" });
});

systemRadios.TW.addEventListener("change", () => {
  if (systemRadios.TW.checked) controller.edit({ system: "TW" });
});
systemRadios.US.addEventListener("change", () => {
  if (systemRadios.US.checked) controller.edit({ system: "US" });
});

aqiInput.addEventListener("input", () => {
  controller.edit({ aqi: aqiInput.value });
});

addRowBtn.addEventListener("click", () => {
  const current = controller.getState().draft;
  if (current.rows.length >= POLLUTANTS.length) return;
  const used = new Set(current.rows.map((row) => row.pollutant));
  const next = POLLUTANTS.find((pollutant) => !used.has(pollutant));
  if (next === undefined) return;
  pendingFocus = { row: current.rows.length, field: "pollutant" };
  controller.edit({ rows: [...current.rows, { pollutant: next, value: "" }] });
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  lastRowsSignature = null;
  if (DEFAULTS.mode === "aqi") aqiInput.focus();
  else addRowBtn.focus();
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
    lastRowsSignature = null;
  }
});

render(controller.getState());
