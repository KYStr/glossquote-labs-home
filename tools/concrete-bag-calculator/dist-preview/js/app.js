// DOM wiring for the Concrete Bag Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The SPEC gives this tool no download or export: the
// result is plain selectable text on the page.

import { createController } from "./controller.mjs";
import { BAG_YIELDS, SHAPES } from "./core/concrete.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const TEXT_FIELDS = [
  "lengthCm",
  "widthCm",
  "thicknessCm",
  "depthCm",
  "diameterCm",
  "heightCm",
  "count",
  "wastePct",
];
const ERROR_FIELDS = ["shape", ...TEXT_FIELDS];
const BAG_ROWS = [
  { key: "bag40", label: "40 lb" },
  { key: "bag60", label: "60 lb" },
  { key: "bag80", label: "80 lb" },
];

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      shape: "形狀",
      lengthCm: "長（公分）",
      widthCm: "寬（公分）",
      thicknessCm: "厚（公分）",
      depthCm: "深（公分）",
      diameterCm: "直徑（公分）",
      heightCm: "高（公分）",
      count: "數量",
      wastePct: "損耗率（%）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      EMPTY: "不可空白",
      NUMBER_FORMAT: "請輸入數字（小數至多 2 位）",
      INTEGER_FORMAT: "請輸入整數",
      ENUM: "請選擇形狀",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorRange: {
      lengthCm: "長須大於 0 且不超過 10000 公分",
      widthCm: "寬須大於 0 且不超過 10000 公分",
      thicknessCm: "厚須大於 0 且不超過 10000 公分",
      depthCm: "深須大於 0 且不超過 10000 公分",
      diameterCm: "直徑須大於 0 且不超過 10000 公分",
      heightCm: "高須大於 0 且不超過 10000 公分",
      count: "數量須在 1–999 之間",
      wastePct: "損耗率須在 0–100% 之間",
    },
    statusEmpty: "尚未計算。輸入尺寸，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算混凝土用量」執行。",
    summaryNet: "淨體積（m³）",
    summaryAdjusted: "含損耗體積（m³）",
    summaryAdjustedYd3: "含損耗體積（yd³）",
  },
  en: {
    fieldLabel: {
      shape: "Shape",
      lengthCm: "Length (cm)",
      widthCm: "Width (cm)",
      thicknessCm: "Thickness (cm)",
      depthCm: "Depth (cm)",
      diameterCm: "Diameter (cm)",
      heightCm: "Height (cm)",
      count: "Count",
      wastePct: "Waste (%)",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      EMPTY: "This field is required.",
      NUMBER_FORMAT: "Enter a number with up to 2 decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      ENUM: "Choose a shape.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorRange: {
      lengthCm: "Length must be above 0 and at most 10000 cm.",
      widthCm: "Width must be above 0 and at most 10000 cm.",
      thicknessCm: "Thickness must be above 0 and at most 10000 cm.",
      depthCm: "Depth must be above 0 and at most 10000 cm.",
      diameterCm: "Diameter must be above 0 and at most 10000 cm.",
      heightCm: "Height must be above 0 and at most 10000 cm.",
      count: "Count must be between 1 and 999.",
      wastePct: "Waste must be between 0 and 100%.",
    },
    statusEmpty: "Nothing calculated yet. Enter dimensions or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate concrete” to run it.",
    summaryNet: "Net volume (m³)",
    summaryAdjusted: "With waste (m³)",
    summaryAdjustedYd3: "With waste (yd³)",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("concrete-form");
const inputs = {};
for (const field of TEXT_FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const shapeInputs = {};
for (const shape of SHAPES) shapeInputs[shape] = document.getElementById(`field-shape-${shape}`);
const fieldErrors = {};
for (const field of ERROR_FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const fieldGroups = [...document.querySelectorAll("[data-shapes]")];
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const bagRowsEl = document.getElementById("bag-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
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

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = field === "shape" ? shapeInputs.slab : inputs[field];
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
  for (const field of ERROR_FIELDS) setFieldError(field, null);
}

function errorField(error) {
  if (typeof error.path !== "string" || error.path.length < 2) return null;
  const field = error.path.slice(1);
  return ERROR_FIELDS.includes(field) ? field : null;
}

function errorMessage(error) {
  if (error.code === "RANGE") {
    const field = errorField(error);
    return (field !== null && t.errorRange[field]) || t.error.INTERNAL;
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderSummary(result) {
  summaryRows.replaceChildren();
  const rows = [
    [t.summaryNet, result.netVolumeM3],
    [t.summaryAdjusted, result.adjustedVolumeM3],
    [t.summaryAdjustedYd3, result.adjustedVolumeYd3],
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

function renderBagRows(result) {
  bagRowsEl.replaceChildren();
  for (const { key, label } of BAG_ROWS) {
    const tr = document.createElement("tr");
    const cells = [label, BAG_YIELDS[key], String(result.bags[key])];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    bagRowsEl.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of TEXT_FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  for (const shape of SHAPES) {
    shapeInputs[shape].checked = draft.shape === shape;
  }
  for (const group of fieldGroups) {
    group.hidden = !group.dataset.shapes.split(" ").includes(draft.shape);
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";

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
      const field = errorField(error);
      if (field !== null) {
        setFieldError(field, message);
        statusEl.textContent = `${t.fieldLabel[field]}：${message}`;
        if (submitted) {
          submitted = false;
          (field === "shape" ? shapeInputs[draft.shape] : inputs[field]).focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "ready" && result !== null) {
    renderSummary(result);
    renderBagRows(result);
    statusEl.textContent = `${t.summaryAdjusted}：${result.adjustedVolumeM3} · ${t.summaryAdjustedYd3}：${result.adjustedVolumeYd3}`;
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

for (const field of TEXT_FIELDS) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const shape of SHAPES) {
  shapeInputs[shape].addEventListener("change", () => {
    controller.edit({ shape });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  shapeInputs.slab.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

window.addEventListener("pagehide", () => {
  controller.destroy();
});

render(controller.getState());
