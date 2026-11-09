// DOM wiring for the Heart Rate Zones Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The SPEC gives this tool no download or copy button;
// the zone tables are plain selectable text.

import { createController } from "./controller.mjs";
import { FIELDS } from "./core/zones.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      age: "年齡",
      measuredMaxHr: "實測最大心率（選填）",
      restingHr: "靜止心率（選填）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      EMPTY: "請輸入年齡，或填入實測最大心率",
      INTEGER_FORMAT: "請輸入整數",
      RESTING_NOT_BELOW_MAX: "靜止心率必須低於最大心率",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorRange: {
      age: "年齡須在 10–100 歲之間",
      measuredMaxHr: "實測最大心率須在 100–230 bpm 之間",
      restingHr: "靜止心率須在 30–120 bpm 之間",
    },
    statusEmpty: "尚未計算。輸入年齡，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算心率區間」執行。",
    summaryFox: "Fox 公式（220 − 年齡）",
    summaryTanaka: "Tanaka 公式（208 − 0.7 × 年齡）",
    summaryUsed: "實際採用",
    sourceTanaka: "來源：Tanaka 估算",
    sourceMeasured: "來源：實測最大心率",
    valueNone: "—",
    karvonenMissing: "未提供靜止心率，無法計算儲備心率區間",
    karvonenMeta: (restingHr, reserve) => `靜止心率 ${restingHr} bpm · 心率儲備 ${reserve} bpm`,
    zoneNames: ["恢復區", "脂肪燃燒區", "有氧區", "閾值區", "最大強度區"],
    zoneUses: [
      "非常輕鬆，可完整交談；暖身與主動恢復。",
      "輕鬆有氧；建立耐力基礎，可長時間維持。",
      "中等強度；提升心肺適能，呼吸加快但可說短句。",
      "辛苦；接近乳酸閾值，提升速度耐力，只能說單字。",
      "非常辛苦；短時間間歇與無氧能力，無法交談。",
    ],
  },
  en: {
    fieldLabel: {
      age: "Age",
      measuredMaxHr: "Measured maximum heart rate (optional)",
      restingHr: "Resting heart rate (optional)",
    },
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      EMPTY: "Enter your age, or a measured maximum heart rate.",
      INTEGER_FORMAT: "Enter a whole number.",
      RESTING_NOT_BELOW_MAX: "Resting heart rate must be below the maximum heart rate.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorRange: {
      age: "Age must be between 10 and 100.",
      measuredMaxHr: "Measured maximum heart rate must be between 100 and 230 bpm.",
      restingHr: "Resting heart rate must be between 30 and 120 bpm.",
    },
    statusEmpty: "Nothing calculated yet. Enter your age or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate heart rate zones” to run it.",
    summaryFox: "Fox formula (220 − age)",
    summaryTanaka: "Tanaka formula (208 − 0.7 × age)",
    summaryUsed: "Used for the zones",
    sourceTanaka: "Source: Tanaka estimate",
    sourceMeasured: "Source: measured maximum heart rate",
    valueNone: "—",
    karvonenMissing: "Resting heart rate not provided, so reserve zones cannot be calculated.",
    karvonenMeta: (restingHr, reserve) =>
      `Resting heart rate ${restingHr} bpm · Heart rate reserve ${reserve} bpm`,
    zoneNames: ["Recovery", "Fat Burn", "Aerobic", "Threshold", "Maximum"],
    zoneUses: [
      "Very light; you can hold a full conversation; warm-up and active recovery.",
      "Easy aerobic effort; builds the endurance base and can be held for a long time.",
      "Moderate effort; improves cardiorespiratory fitness; breathing quickens but short phrases are possible.",
      "Hard effort near the lactate threshold; improves speed endurance; only single words are possible.",
      "Very hard effort for short intervals and anaerobic capacity; conversation is impossible.",
    ],
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("zones-form");
const inputs = {
  age: document.getElementById("field-age"),
  measuredMaxHr: document.getElementById("field-measuredMaxHr"),
  restingHr: document.getElementById("field-restingHr"),
};
const fieldErrors = {
  age: document.getElementById("error-age"),
  measuredMaxHr: document.getElementById("error-measuredMaxHr"),
  restingHr: document.getElementById("error-restingHr"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const zonesBody = document.getElementById("zone-rows");
const karvonenBlock = document.getElementById("karvonen-block");
const karvonenMetaEl = document.getElementById("karvonen-meta");
const karvonenBody = document.getElementById("karvonen-rows");
const karvonenMissingEl = document.getElementById("karvonen-missing");
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
  if (error.code === "RANGE") return t.errorRange[error.field] ?? t.error.INTERNAL;
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderZoneRows(tbody, zones) {
  tbody.replaceChildren();
  for (const zone of zones) {
    const tr = document.createElement("tr");
    const cells = [
      `Z${zone.zone} · ${t.zoneNames[zone.zone - 1]}`,
      `${zone.pctLow}–${zone.pctHigh}%`,
      `${zone.lowBpm}–${zone.highBpm}`,
      t.zoneUses[zone.zone - 1],
    ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function renderSummary(result) {
  summaryRows.replaceChildren();
  const { maxHr } = result;
  const rows = [
    [t.summaryFox, maxHr.fox === null ? t.valueNone : `${maxHr.fox} bpm`],
    [t.summaryTanaka, maxHr.tanaka === null ? t.valueNone : `${maxHr.tanaka} bpm`],
    [
      t.summaryUsed,
      `${maxHr.used} bpm（${maxHr.source === "measured" ? t.sourceMeasured : t.sourceTanaka}）`,
    ],
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
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
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
    renderSummary(result);
    renderZoneRows(zonesBody, result.zones);
    if (result.karvonen === null) {
      karvonenBlock.hidden = true;
      karvonenMissingEl.hidden = false;
      karvonenMissingEl.textContent = t.karvonenMissing;
    } else {
      karvonenBlock.hidden = false;
      karvonenMissingEl.hidden = true;
      karvonenMetaEl.textContent = t.karvonenMeta(
        result.karvonen.restingHr,
        result.karvonen.reserve,
      );
      renderZoneRows(karvonenBody, result.karvonen.zones);
    }
    statusEl.textContent = `${t.summaryUsed}：${result.maxHr.used} bpm`;
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
  inputs.age.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

window.addEventListener("pagehide", () => {
  controller.destroy();
});

render(controller.getState());
