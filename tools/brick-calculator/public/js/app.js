// DOM wiring for the Brick Calculator. All user-visible text is
// set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (brick-calculator-report.json) is created only on an explicit click,
// from the current success snapshot, and its Blob URL is revoked
// within 30 seconds or as soon as the result is invalidated.

import { createController } from "./controller.mjs";
import { buildReport, PRESETS } from "./core/brick-calculator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const SCALAR_FIELDS = ["wallLengthM", "wallHeightM", "jointMm", "wastePct"];
const CUSTOM_DIM_FIELDS = ["brickLengthMm", "brickHeightMm", "brickWidthMm"];
const DECIMAL_PLACES = {
  wallLengthM: 3,
  wallHeightM: 3,
  widthM: 3,
  heightM: 3,
  jointMm: 1,
  wastePct: 2,
};

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      wallLengthM: "牆長",
      wallHeightM: "牆高",
      widthM: "開口寬",
      heightM: "開口高",
      brickPreset: "磚塊種類",
      brickLengthMm: "磚長",
      brickHeightMm: "磚高",
      brickWidthMm: "磚厚",
      jointMm: "灰縫厚度",
      wastePct: "損耗率",
    },
    error: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入過長。",
      UNICODE: "請使用半形數字。",
      EMPTY: "此欄位必填。",
      INTEGER_FORMAT: "請輸入整數。",
      INTERNAL: "處理失敗，請重試。",
      WORKER_ERROR: "處理失敗，請重試。",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載。",
      ROW_LIMIT: "開口最多 10 個。",
    },
    decimalFormat: (places) => `請輸入數字（最多 ${places} 位小數）。`,
    rangeError: {
      wallLengthM: "牆長須在 0.01 至 100 公尺之間。",
      wallHeightM: "牆高須在 0.01 至 100 公尺之間。",
      widthM: "開口寬須在 0.01 至 100 公尺之間。",
      heightM: "開口高須在 0.01 至 100 公尺之間。",
      jointMm: "灰縫厚度須在 0 至 20 公釐之間。",
      wastePct: "損耗率須在 0 至 50% 之間。",
      brickLengthMm: "磚長須在 20 至 500 公釐之間。",
      brickHeightMm: "磚高須在 20 至 300 公釐之間。",
      brickWidthMm: "磚厚須在 20 至 300 公釐之間。",
      openings: "開口總面積不可大於或等於牆面面積。",
    },
    statusEmpty: "尚未計算。輸入牆長與牆高，或載入範例。",
    statusDirty: "輸入已變更，請重新執行。",
    statusBusy: "處理中。",
    statusCancelled: "已取消，可重新執行。",
    exampleNote: "已載入範例（標準紅磚、無開口牆面），請按「計算磚塊用量」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelSummary: "磚塊數與砂漿",
    labelBricksToBuy: "應購磚數",
    labelMortar: "砂漿體積",
    labelGross: "毛面積",
    labelOpening: "開口面積",
    labelNet: "淨面積",
    labelPerM2: "每平方公尺磚數",
    labelNetBricks: "淨磚數",
    unitBricks: "塊",
    unitM2: "平方公尺",
    unitPerM2: "塊 / 平方公尺",
    unitM3: "立方公尺",
    unitL: "公升",
    addOpening: "新增開口",
    removeOpening: "移除開口",
    openingRowLabel: (index) => `開口 ${index}`,
    successSummary: (result) => `應購磚數 ${result.bricksToBuy} 塊，砂漿 ${result.mortarVolumeM3} 立方公尺。`,
    presetName: (preset) => `${PRESETS[preset].nameZh}（${PRESETS[preset].lengthMm} × ${PRESETS[preset].heightMm} × ${PRESETS[preset].widthMm} 公釐）`,
    mortarValue: (result) => `${result.mortarVolumeM3} 立方公尺（${result.mortarVolumeL} 公升）`,
  },
  en: {
    fieldLabel: {
      wallLengthM: "Wall length",
      wallHeightM: "Wall height",
      widthM: "Opening width",
      heightM: "Opening height",
      brickPreset: "Brick type",
      brickLengthMm: "Brick length",
      brickHeightMm: "Brick height",
      brickWidthMm: "Brick width",
      jointMm: "Mortar joint",
      wastePct: "Waste allowance",
    },
    error: {
      SCHEMA: "Invalid input format.",
      INPUT_LIMIT: "Input too long.",
      UNICODE: "Use ASCII digits only.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
      ROW_LIMIT: "At most 10 openings.",
    },
    decimalFormat: (places) => `Enter a number with up to ${places} decimal places.`,
    rangeError: {
      wallLengthM: "Wall length must be between 0.01 and 100 m.",
      wallHeightM: "Wall height must be between 0.01 and 100 m.",
      widthM: "Opening width must be between 0.01 and 100 m.",
      heightM: "Opening height must be between 0.01 and 100 m.",
      jointMm: "Mortar joint must be between 0 and 20 mm.",
      wastePct: "Waste allowance must be between 0 and 50%.",
      brickLengthMm: "Brick length must be between 20 and 500 mm.",
      brickHeightMm: "Brick height must be between 20 and 300 mm.",
      brickWidthMm: "Brick width must be between 20 and 300 mm.",
      openings: "Total opening area must be less than the wall area.",
    },
    statusEmpty: "Nothing calculated yet. Enter wall length and height, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working.",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (standard red brick, no openings). Press “Calculate bricks” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelSummary: "Bricks and mortar",
    labelBricksToBuy: "Bricks to buy",
    labelMortar: "Mortar volume",
    labelGross: "Gross area",
    labelOpening: "Opening area",
    labelNet: "Net area",
    labelPerM2: "Bricks per m²",
    labelNetBricks: "Net bricks",
    unitBricks: "bricks",
    unitM2: "m²",
    unitPerM2: "bricks / m²",
    unitM3: "m³",
    unitL: "L",
    addOpening: "Add opening",
    removeOpening: "Remove opening",
    openingRowLabel: (index) => `Opening ${index}`,
    successSummary: (result) => `Bricks to buy: ${result.bricksToBuy}; mortar ${result.mortarVolumeM3} m³.`,
    presetName: (preset) => `${PRESETS[preset].nameEn} (${PRESETS[preset].lengthMm} × ${PRESETS[preset].heightMm} × ${PRESETS[preset].widthMm} mm)`,
    mortarValue: (result) => `${result.mortarVolumeM3} m³ (${result.mortarVolumeL} L)`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("entry-form");
const inputs = {
  wallLengthM: document.getElementById("field-wallLengthM"),
  wallHeightM: document.getElementById("field-wallHeightM"),
  brickPreset: document.getElementById("field-brickPreset"),
  brickLengthMm: document.getElementById("field-brickLengthMm"),
  brickHeightMm: document.getElementById("field-brickHeightMm"),
  brickWidthMm: document.getElementById("field-brickWidthMm"),
  jointMm: document.getElementById("field-jointMm"),
  wastePct: document.getElementById("field-wastePct"),
};
const fieldErrors = {
  wallLengthM: document.getElementById("error-wallLengthM"),
  wallHeightM: document.getElementById("error-wallHeightM"),
  brickPreset: document.getElementById("error-brickPreset"),
  brickLengthMm: document.getElementById("error-brickLengthMm"),
  brickHeightMm: document.getElementById("error-brickHeightMm"),
  brickWidthMm: document.getElementById("error-brickWidthMm"),
  jointMm: document.getElementById("error-jointMm"),
  wastePct: document.getElementById("error-wastePct"),
  openings: document.getElementById("error-openings"),
};
const customDims = document.getElementById("custom-dims");
const openingsList = document.getElementById("openings-list");
const addOpeningBtn = document.getElementById("add-opening-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const detailRows = document.getElementById("detail-rows");
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
  if (errorEl === undefined) return;
  if (message === null) {
    if (target) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (target) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of Object.keys(fieldErrors)) setFieldError(field, null);
  for (const rowEl of openingsList.querySelectorAll(".opening-row")) {
    for (const errorEl of rowEl.querySelectorAll(".field-error")) errorEl.textContent = "";
    for (const input of rowEl.querySelectorAll("input")) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-errormessage");
    }
  }
}

function errorMessage(error) {
  if (error.code === "RANGE" && error.field !== null && t.rangeError[error.field]) {
    return t.rangeError[error.field];
  }
  if (error.code === "DECIMAL_FORMAT" && error.field !== null && DECIMAL_PLACES[error.field] !== undefined) {
    return t.decimalFormat(DECIMAL_PLACES[error.field]);
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function openingInput(rowIndex, field) {
  return document.getElementById(`field-opening-${rowIndex}-${field}`);
}

function openingError(rowIndex, field) {
  return document.getElementById(`error-opening-${rowIndex}-${field}`);
}

function setRowError(rowIndex, field, message) {
  const errorEl = openingError(rowIndex, field);
  const target = openingInput(rowIndex, field);
  if (errorEl === null || target === null) return;
  if (message === null) {
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-errormessage", `error-opening-${rowIndex}-${field}`);
  errorEl.textContent = message;
}

// Builds the opening rows from scratch; only called when the row
// count changes or the draft is replaced wholesale (reset / example),
// so typing in a row never rebuilds the row under the user's focus.
function rebuildOpeningRows(openings) {
  openingsList.replaceChildren();
  openings.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowEl = document.createElement("div");
    rowEl.className = "opening-row";
    rowEl.dataset.row = String(rowNumber);

    const heading = document.createElement("p");
    heading.className = "opening-row-label";
    heading.textContent = t.openingRowLabel(rowNumber);
    rowEl.appendChild(heading);

    for (const field of ["widthM", "heightM"]) {
      const fieldWrap = document.createElement("div");
      fieldWrap.className = "field";
      const label = document.createElement("label");
      label.setAttribute("for", `field-opening-${rowNumber}-${field}`);
      label.textContent = t.fieldLabel[field];
      const input = document.createElement("input");
      input.id = `field-opening-${rowNumber}-${field}`;
      input.name = `opening-${rowNumber}-${field}`;
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.value = row[field] ?? "";
      input.setAttribute("aria-describedby", `help-opening-${field}`);
      const errorEl = document.createElement("p");
      errorEl.className = "field-error";
      errorEl.id = `error-opening-${rowNumber}-${field}`;
      errorEl.setAttribute("role", "alert");
      fieldWrap.append(label, input, errorEl);
      rowEl.appendChild(fieldWrap);
      input.addEventListener("input", () => {
        const draft = controller.getState().draft;
        const next = draft.openings.map((entry, i) =>
          i === index ? { ...entry, [field]: input.value } : { ...entry },
        );
        controller.edit({ openings: next });
      });
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "button-secondary";
    removeBtn.textContent = t.removeOpening;
    removeBtn.addEventListener("click", () => {
      const draft = controller.getState().draft;
      const next = draft.openings.filter((_, i) => i !== index);
      controller.edit({ openings: next });
      addOpeningBtn.focus();
    });
    rowEl.appendChild(removeBtn);
    openingsList.appendChild(rowEl);
  });
}

function syncOpeningRows(openings) {
  const rows = openingsList.querySelectorAll(".opening-row");
  if (rows.length !== openings.length) {
    rebuildOpeningRows(openings);
    return;
  }
  openings.forEach((row, index) => {
    const rowNumber = index + 1;
    for (const field of ["widthM", "heightM"]) {
      const input = openingInput(rowNumber, field);
      if (input !== null && input.value !== row[field]) input.value = row[field];
    }
  });
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
    [t.labelBricksToBuy, `${result.bricksToBuy} ${t.unitBricks}`],
    [t.labelMortar, t.mortarValue(result)],
  ]);
  appendSummaryRows(detailRows, [
    [t.labelGross, `${result.grossAreaM2} ${t.unitM2}`],
    [t.labelOpening, `${result.openingAreaM2} ${t.unitM2}`],
    [t.labelNet, `${result.netAreaM2} ${t.unitM2}`],
    [t.labelPerM2, `${result.bricksPerM2} ${t.unitPerM2}`],
    [t.labelNetBricks, `${result.bricksNet} ${t.unitBricks}`],
  ]);
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of [...SCALAR_FIELDS, ...CUSTOM_DIM_FIELDS]) {
    const value = draft[field] ?? "";
    if (inputs[field].value !== value) inputs[field].value = value;
  }
  if (inputs.brickPreset.value !== draft.brickPreset) {
    inputs.brickPreset.value = draft.brickPreset;
  }
  customDims.hidden = draft.brickPreset !== "custom";
  syncOpeningRows(draft.openings ?? []);
  addOpeningBtn.disabled = (draft.openings ?? []).length >= 10;
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
      if (error.row !== null && (error.field === "widthM" || error.field === "heightM")) {
        setRowError(error.row, error.field, message);
        statusEl.textContent = `${t.openingRowLabel(error.row)} ${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          const target = openingInput(error.row, error.field);
          if (target !== null) target.focus();
        }
      } else if (error.field !== null && fieldErrors[error.field] !== undefined) {
        setFieldError(error.field, message);
        const label = t.fieldLabel[error.field] ?? error.field;
        statusEl.textContent = `${label}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          const target = inputs[error.field];
          if (target) target.focus();
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

for (const field of [...SCALAR_FIELDS, ...CUSTOM_DIM_FIELDS]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

inputs.brickPreset.addEventListener("change", () => {
  controller.edit({ brickPreset: inputs.brickPreset.value });
});

addOpeningBtn.addEventListener("click", () => {
  const draft = controller.getState().draft;
  const next = [...(draft.openings ?? []), { widthM: "", heightM: "" }];
  controller.edit({ openings: next });
  const rowNumber = next.length;
  const target = openingInput(rowNumber, "widthM");
  if (target !== null) target.focus();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.wallLengthM.focus();
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
