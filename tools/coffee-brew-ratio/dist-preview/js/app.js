// DOM wiring for the Coffee Brew Ratio Calculator. All user-visible text
// is set through textContent/value only; user input never becomes markup.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.
// This tool has no download artifact (SPEC scope).

import { createController } from "./controller.mjs";
import { FIELDS, formatAmount, formatRatioLabel } from "./core/brew.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      mode: "計算模式",
      amountDose: "咖啡粉量（克）",
      amountWater: "總水量（毫升）",
      ratio: "沖煮比例",
      bloomMultiplier: "悶蒸倍數",
    },
    helpAmountDose: "1.0–200.0 克，最多一位小數。",
    helpAmountWater: "10.0–4000.0 毫升，最多一位小數。",
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有無效字元",
      EMPTY: "請輸入數值",
      ENUM: "請選擇計算模式",
      DECIMAL_FORMAT: "請輸入最多一位小數的數字",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
    },
    errorRange: {
      amountDose: "粉量須在 1.0–200.0 克之間",
      amountWater: "水量須在 10.0–4000.0 毫升之間",
      ratio: "比例須在 1:10.0–1:20.0 之間",
      bloomMultiplier: "悶蒸倍數須在 0.0–5.0 之間",
    },
    statusEmpty: "尚未計算。輸入數值，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算沖煮表」執行。",
    summary: (dose, water, ratioLabel, bloom) =>
      `粉量 ${dose} g · 總水量 ${water} ml · 比例 ${ratioLabel} · 悶蒸水量 ${bloom} ml`,
    kind: { bloom: "悶蒸", pour: "注水" },
  },
  en: {
    fieldLabel: {
      mode: "Calculation mode",
      amountDose: "Coffee dose (g)",
      amountWater: "Total water (ml)",
      ratio: "Brew ratio",
      bloomMultiplier: "Bloom multiplier",
    },
    helpAmountDose: "1.0 to 200.0 g, at most one decimal place.",
    helpAmountWater: "10.0 to 4000.0 ml, at most one decimal place.",
    error: {
      SCHEMA: "The input format is invalid.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains invalid characters.",
      EMPTY: "Enter a value.",
      ENUM: "Choose a calculation mode.",
      DECIMAL_FORMAT: "Enter a number with at most one decimal place.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
    },
    errorRange: {
      amountDose: "Dose must be between 1.0 and 200.0 g.",
      amountWater: "Water must be between 10.0 and 4000.0 ml.",
      ratio: "Ratio must be between 1:10.0 and 1:20.0.",
      bloomMultiplier: "Bloom multiplier must be between 0.0 and 5.0.",
    },
    statusEmpty: "Nothing calculated yet. Enter values or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (synthetic case). Press “Calculate brew plan” to run it.",
    summary: (dose, water, ratioLabel, bloom) =>
      `Dose ${dose} g · Total water ${water} ml · Ratio ${ratioLabel} · Bloom water ${bloom} ml`,
    kind: { bloom: "Bloom", pour: "Pour" },
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("brew-form");
const modeRadios = {
  dose: document.getElementById("field-mode-dose"),
  water: document.getElementById("field-mode-water"),
};
const inputs = {
  amount: document.getElementById("field-amount"),
  ratio: document.getElementById("field-ratio"),
  bloomMultiplier: document.getElementById("field-bloomMultiplier"),
};
const fieldErrors = {
  mode: document.getElementById("error-mode"),
  amount: document.getElementById("error-amount"),
  ratio: document.getElementById("error-ratio"),
  bloomMultiplier: document.getElementById("error-bloomMultiplier"),
};
const amountLabel = document.getElementById("amount-label");
const amountHelp = document.getElementById("help-amount");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const tableBody = document.getElementById("step-rows");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleNoteEl = document.getElementById("example-note");
const presetButtons = [...document.querySelectorAll("[data-ratio-preset]")];

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

function focusTargetFor(field) {
  if (field === "mode") return modeRadios.dose;
  return inputs[field] ?? null;
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = focusTargetFor(field);
  if (message === null) {
    if (target !== null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    }
    errorEl.textContent = "";
    return;
  }
  if (target !== null) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-errormessage", `error-${field}`);
  }
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error, draft) {
  if (error.code === "RANGE") {
    if (error.field === "amount") {
      return draft.mode === "water" ? t.errorRange.amountWater : t.errorRange.amountDose;
    }
    if (error.field === "ratio") return t.errorRange.ratio;
    if (error.field === "bloomMultiplier") return t.errorRange.bloomMultiplier;
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

function renderTable(result) {
  tableBody.replaceChildren();
  for (const step of result.steps) {
    const tr = document.createElement("tr");
    const cells = [
      `${step.step} · ${t.kind[step.kind]}`,
      `${formatAmount(step.addMl)} ml`,
      `${formatAmount(step.cumulativeMl)} ml`,
    ];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of ["amount", "ratio", "bloomMultiplier"]) {
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  modeRadios.dose.checked = draft.mode === "dose";
  modeRadios.water.checked = draft.mode === "water";
  amountLabel.textContent =
    draft.mode === "water" ? t.fieldLabel.amountWater : t.fieldLabel.amountDose;
  amountHelp.textContent = draft.mode === "water" ? t.helpAmountWater : t.helpAmountDose;
  for (const button of presetButtons) {
    button.setAttribute(
      "aria-pressed",
      draft.ratio === button.dataset.ratioPreset ? "true" : "false",
    );
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
      const message = errorMessage(error, draft);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        const label =
          error.field === "mode"
            ? t.fieldLabel.mode
            : error.field === "amount"
              ? draft.mode === "water"
                ? t.fieldLabel.amountWater
                : t.fieldLabel.amountDose
              : t.fieldLabel[error.field];
        statusEl.textContent = `${label}：${message}`;
        if (submitted) {
          submitted = false;
          const target = focusTargetFor(error.field);
          if (target !== null) target.focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    const summary = t.summary(
      formatAmount(result.doseGrams),
      formatAmount(result.totalWaterMl),
      formatRatioLabel(result.ratio),
      formatAmount(result.bloomWaterMl),
    );
    summaryEl.textContent = summary;
    statusEl.textContent = summary;
    renderTable(result);
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

for (const radio of [modeRadios.dose, modeRadios.water]) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ mode: radio.value });
  });
}

for (const field of ["amount", "ratio", "bloomMultiplier"]) {
  inputs[field].addEventListener("input", () => {
    controller.edit({ [field]: inputs[field].value });
  });
}

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    controller.edit({ ratio: button.dataset.ratioPreset });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  modeRadios.dose.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

window.addEventListener("pagehide", () => {
  controller.destroy();
});

render(controller.getState());
