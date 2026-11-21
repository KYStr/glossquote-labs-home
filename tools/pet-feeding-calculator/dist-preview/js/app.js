// DOM wiring for the Pet Feeding Calculator. All user-visible text is
// set through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker
// source embedded by the preview build (WORKER_SOURCE). The controller
// owns the draft, sequence, and state machine; this file only renders
// it. There is no persistent storage: the draft lives only in this
// page and is discarded when the page is left (SPEC userFlow and
// implementation section).

import { createController } from "./controller.mjs";
import {
  FIELDS,
  MULTIPLIERS,
  REPORT_FILENAME,
  SPECIES_LABELS,
  formatCups,
  lifeStageLabel,
  serializeReport,
} from "./core/pet-feeding.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      ENUM: "請選擇有效的選項",
      DECIMAL_FORMAT: "請輸入數字，最多兩位小數",
      INTEGER_FORMAT: "每日餐數請輸入整數",
      RANGE: "超出允許範圍",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    errorWeight: {
      DECIMAL_FORMAT: "體重請輸入數字（公斤），最多兩位小數",
      RANGE: "體重超出該物種的允許範圍",
    },
    errorDensity: {
      DECIMAL_FORMAT: "每 100 公克熱量請輸入數字，最多兩位小數",
      RANGE: "每 100 公克熱量請輸入 20–900 大卡",
    },
    errorCup: {
      DECIMAL_FORMAT: "每杯熱量請輸入數字，最多兩位小數",
      RANGE: "每杯熱量請輸入 50–1500 大卡",
    },
    errorMeals: {
      RANGE: "每日餐數請輸入 1–6",
    },
    resultHeading: "每日熱量與餵食量",
    derLine: (derKcal) => `每日總熱量（DER）：${derKcal} 大卡`,
    gramsLine: (grams) => `每日飼料：${grams} 公克`,
    cupsLine: (cups) => `每日飼料：${cups} 杯`,
    rerLine: (rerKcal) => `靜止能量需求（RER）：${rerKcal} 大卡`,
    multiplierLine: (species, lifeStage, multiplier) =>
      `${SPECIES_LABELS[species].zh} · ${lifeStageLabel(species, lifeStage, "zh-Hant")} · 倍率 ${multiplier}`,
    mealHeading: "逐餐分配",
    mealHeader: ["餐次", "熱量（大卡）", "飼料（公克）", "飼料（杯）"],
    mealName: (index) => `第 ${index + 1} 餐`,
    cupsNote:
      "每餐杯數是各自四捨五入到小數 2 位，合計可能與每日杯數相差每餐至多 0.01 杯。",
    weightLossNote:
      "減重列以理想（目標）體重計算；使用減重列時請輸入目標體重。",
    disclaimer:
      "本工具依公開獸醫營養指引估算每日熱量與餵食量，僅供參考。個別寵物的實際需求與估算值差距可達 50%；請以體態評分（BCS）與獸醫師的建議為準，並依寵物的體重與體態變化調整餵食量。",
    exampleNote: "已載入範例，請按「計算每日餵食量」執行。",
  },
  en: {
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      ENUM: "Choose a valid option.",
      DECIMAL_FORMAT: "Enter a number with at most two decimal places.",
      INTEGER_FORMAT: "Enter the meals per day as a whole number.",
      RANGE: "Out of range.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    errorWeight: {
      DECIMAL_FORMAT: "Enter the weight in kg, with at most two decimal places.",
      RANGE: "Weight is outside the allowed range for this species.",
    },
    errorDensity: {
      DECIMAL_FORMAT: "Enter the kcal per 100 g, with at most two decimal places.",
      RANGE: "Enter 20–900 kcal per 100 g.",
    },
    errorCup: {
      DECIMAL_FORMAT: "Enter the kcal per cup, with at most two decimal places.",
      RANGE: "Enter 50–1500 kcal per cup.",
    },
    errorMeals: {
      RANGE: "Enter 1–6 meals per day.",
    },
    resultHeading: "Daily calories and food amount",
    derLine: (derKcal) => `Daily requirement (DER): ${derKcal} kcal`,
    gramsLine: (grams) => `Daily food: ${grams} g`,
    cupsLine: (cups) => `Daily food: ${cups} cups`,
    rerLine: (rerKcal) => `Resting energy requirement (RER): ${rerKcal} kcal`,
    multiplierLine: (species, lifeStage, multiplier) =>
      `${SPECIES_LABELS[species].en} · ${lifeStageLabel(species, lifeStage, "en")} · factor ${multiplier}`,
    mealHeading: "Per-meal amounts",
    mealHeader: ["Meal", "Calories (kcal)", "Food (g)", "Food (cups)"],
    mealName: (index) => `Meal ${index + 1}`,
    cupsNote:
      "Per-meal cups are each rounded to two decimals, so their sum can differ from the daily cups by up to 0.01 per meal.",
    weightLossNote:
      "The weight-loss row is calculated at the ideal (target) weight; enter the target weight when using it.",
    disclaimer:
      "This tool estimates daily calories and food amounts from published veterinary nutrition guidelines, as a starting point only. An individual pet's actual needs can differ from the estimate by up to 50%. Let body condition score (BCS) and your veterinarian's advice govern actual feeding, and adjust portions as your pet's weight and condition change.",
    exampleNote: "Example loaded. Run “Calculate daily feeding amount” to compute it.",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("pet-feeding-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const disclaimerEl = document.getElementById("disclaimer");
const weightLossEl = document.getElementById("weight-loss-note");
const derEl = document.getElementById("result-der");
const gramsEl = document.getElementById("result-grams");
const cupsEl = document.getElementById("result-cups");
const rerEl = document.getElementById("result-rer");
const multiplierEl = document.getElementById("result-multiplier");
const mealsBodyEl = document.getElementById("meals-body");
const cupsNoteEl = document.getElementById("cups-note");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
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

function errorMessage(error) {
  if (error === null) return t.error.INTERNAL;
  const fieldMessages = {
    weightKg: t.errorWeight,
    foodKcalPer100g: t.errorDensity,
    foodKcalPerCup: t.errorCup,
    mealsPerDay: t.errorMeals,
  }[error.field];
  if (fieldMessages !== undefined && fieldMessages[error.code] !== undefined) {
    return fieldMessages[error.code];
  }
  return t.error[error.code] ?? t.error.INTERNAL;
}

// Rebuild the life-stage options for the current species, keeping the
// draft's stage when it belongs to the species (the controller already
// falls back to adult-neutered otherwise). Rebuilt only when the
// species or the selected stage changes, so typing in other fields
// never disturbs an open select.
let renderedLifeStageKey = null;
function renderLifeStageOptions(species, selected) {
  const key = `${species}:${selected}`;
  if (key === renderedLifeStageKey) return;
  renderedLifeStageKey = key;
  const select = inputs.lifeStage;
  while (select.firstChild !== null) select.removeChild(select.firstChild);
  for (const stage of Object.keys(MULTIPLIERS[species])) {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = lifeStageLabel(species, stage, lang);
    if (stage === selected) option.selected = true;
    select.appendChild(option);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, status } = publicState;
  renderLifeStageOptions(draft.species, draft.lifeStage);
  for (const field of FIELDS) {
    if (field === "lifeStage") continue;
    if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  statusEl.textContent = status[lang];
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";
  cancelBtn.hidden = state !== "busy";

  if (state !== "success") revokeReportUrl();

  if (state === "success" && result !== null) {
    derEl.textContent = t.derLine(result.derKcal);
    gramsEl.textContent = t.gramsLine(result.gramsPerDay);
    cupsEl.textContent =
      result.cupsPerDay === null ? "" : t.cupsLine(formatCups(result.cupsPerDay));
    cupsEl.hidden = result.cupsPerDay === null;
    rerEl.textContent = t.rerLine(result.rerKcal);
    multiplierEl.textContent = t.multiplierLine(
      result.species,
      result.lifeStage,
      result.multiplier,
    );
    weightLossEl.hidden = result.lifeStage !== "weight-loss";
    if (result.lifeStage === "weight-loss") weightLossEl.textContent = t.weightLossNote;
    while (mealsBodyEl.firstChild !== null) mealsBodyEl.removeChild(mealsBodyEl.firstChild);
    for (let i = 0; i < result.mealsPerDay; i += 1) {
      const row = document.createElement("tr");
      const mealCell = document.createElement("td");
      mealCell.textContent = t.mealName(i);
      const kcalCell = document.createElement("td");
      kcalCell.textContent = String(result.perMealKcal[i]);
      const gramsCell = document.createElement("td");
      gramsCell.textContent = String(result.perMealGrams[i]);
      const cupsCell = document.createElement("td");
      cupsCell.textContent =
        result.perMealCups === null ? "—" : formatCups(result.perMealCups[i]);
      row.append(mealCell, kcalCell, gramsCell, cupsCell);
      mealsBodyEl.appendChild(row);
    }
    cupsNoteEl.hidden = result.perMealCups === null;
    if (result.perMealCups !== null) cupsNoteEl.textContent = t.cupsNote;
    disclaimerEl.textContent = t.disclaimer;
    resultsEl.hidden = false;
    clearFieldErrors();
    return;
  }

  resultsEl.hidden = true;
  if (state === "error") {
    clearFieldErrors();
    if (error !== null) {
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      }
      // The status region keeps the pinned status string; the detail
      // lives in the field's own error slot (role="alert").
    }
  } else {
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
inputs.species.addEventListener("change", () => {
  controller.edit({ species: inputs.species.value });
});
inputs.lifeStage.addEventListener("change", () => {
  controller.edit({ lifeStage: inputs.lifeStage.value });
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.species.focus();
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

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    revokeReportUrl();
    controller.reset();
  }
});

render(controller.getState());
