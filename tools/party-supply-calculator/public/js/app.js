// Party Supply Calculator — DOM app.
// All rendering uses textContent/value. The Worker is created from a fixed
// source string (pure core + fixed handler) embedded by the build; no user
// content ever becomes code. No fetch, storage, or network use.

import { Controller } from "./core/controller.mjs";
import { normalizeEcho, REPORT_FILENAME } from "./core/core.mjs";

// Replaced by scripts/build.mjs with the fixed worker source string.
const WORKER_SOURCE = __WORKER_SOURCE__;

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    meal: { snacks: "點心", light: "輕食", full: "正餐" },
    status: {
      empty: "請輸入賓客人數、派對時長與餐型，或載入範例。",
      dirty: "輸入已變更，請重新執行",
      example: "已載入範例，按「計算採購清單」執行。",
      busy: "處理中",
      cancelled: "已取消，可重新執行",
    },
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入太長（最多 8 個字元）。",
      UNICODE: "輸入含有不完整的文字字元。",
      EMPTY: "此欄不可空白。",
      INTEGER_FORMAT: "請輸入整數，例如 20；不接受小數、符號或空白。",
      DECIMAL_FORMAT: "請輸入時數，例如 2.5；整數位加最多 1 位小數。",
      STEP: "時長須為 0.5 小時的倍數，例如 2 或 2.5。",
      RANGE_GUESTS: "賓客人數需介於 1 至 500 人。",
      RANGE_DURATION: "派對時長需介於 0.5 至 12 小時。",
      ENUM: "請選擇點心、輕食或正餐。",
      INTERNAL: "計算失敗，請重試。",
      WORKER_ERROR: "計算失敗，請重試。",
      OUTPUT_LIMIT: "報告太大，無法下載。",
    },
    factorLabel: "時長係數",
    perPersonHeading: "每人份明細",
    totalsHeading: "採購總量",
  },
  en: {
    meal: { snacks: "Snacks only", light: "Light meal", full: "Full meal" },
    status: {
      empty: "Enter guest count, party duration and meal type, or load the example.",
      dirty: "Input changed. Run again.",
      example: "Example loaded. Run it when ready.",
      busy: "Working",
      cancelled: "Cancelled. You can run again.",
    },
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long (at most 8 characters).",
      UNICODE: "The input contains an incomplete text character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number, such as 20; no decimals, signs or spaces.",
      DECIMAL_FORMAT: "Enter hours, such as 2.5; whole hours plus at most 1 decimal place.",
      STEP: "Duration must be a multiple of 0.5 hours, such as 2 or 2.5.",
      RANGE_GUESTS: "Guest count must be between 1 and 500.",
      RANGE_DURATION: "Party duration must be between 0.5 and 12 hours.",
      ENUM: "Choose snacks, light meal or full meal.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    factorLabel: "Duration factor",
    perPersonHeading: "Per-person amounts",
    totalsHeading: "Shopping totals",
  },
};

const T = STRINGS[LANG];

const $ = (id) => document.getElementById(id);
const form = $("calc-form");
const guestsInput = $("input-guests");
const durationInput = $("input-duration");
const mealRadios = [...document.querySelectorAll('input[name="mealType"]')];
const statusEl = $("status");
const resultEl = $("result");
const sentenceEl = $("result-sentence");
const factorEl = $("result-factor");
const totalFoodEl = $("total-food");
const totalDrinksEl = $("total-drinks");
const totalBottlesEl = $("total-bottles");
const totalCupsEl = $("total-cups");
const totalPlatesEl = $("total-plates");
const totalIceEl = $("total-ice");
const perFoodEl = $("per-food");
const perDrinksEl = $("per-drinks");
const perCupsEl = $("per-cups");
const perPlatesEl = $("per-plates");
const perIceEl = $("per-ice");
const runBtn = $("btn-run");
const exampleBtn = $("btn-example");
const cancelBtn = $("btn-cancel");
const resetBtn = $("btn-reset");
const downloadBtn = $("btn-download");
const errorEls = { guests: $("error-guests"), durationHours: $("error-duration"), mealType: $("error-meal") };
const fieldEls = { guests: guestsInput, durationHours: durationInput, mealType: mealRadios[0] };

// --- Worker transport ------------------------------------------------------

let worker = null;
let workerUrl = null;

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

function completeJob(generation, outcome) {
  if (controller.deliver(generation, outcome)) render();
}

function failJob(generation) {
  completeJob(generation, {
    ok: false,
    error: { code: "WORKER_ERROR", field: null, row: null },
  });
}

const transport = {
  send(snapshot, generation) {
    try {
      const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
      workerUrl = URL.createObjectURL(blob);
      const jobWorker = new Worker(workerUrl, { type: "module" });
      worker = jobWorker;
      jobWorker.onmessage = ({ data }) => {
        if (worker === jobWorker && data?.generation === generation) {
          completeJob(generation, data.outcome);
        }
      };
      jobWorker.onerror = () => {
        if (worker === jobWorker) failJob(generation);
      };
      jobWorker.postMessage({ generation, input: snapshot });
    } catch {
      // Let the submit handler render busy before reporting a startup failure.
      queueMicrotask(() => failJob(generation));
    }
  },
  terminate() {
    terminateWorker();
  },
};

const controller = new Controller(transport);

// --- Download handling -----------------------------------------------------

let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

downloadBtn.addEventListener("click", () => {
  if (!controller.reportAvailable || !controller.reportBytes) return;
  revokeDownload();
  const blob = new Blob([controller.reportBytes], { type: "application/json" });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

// --- Rendering ---------------------------------------------------------------

let focusFirstErrorOnError = false;

function errorMessage(error) {
  if (!error) return "";
  if (error.code === "RANGE") {
    return error.field === "guests" ? T.errors.RANGE_GUESTS : T.errors.RANGE_DURATION;
  }
  return T.errors[error.code] || T.errors.WORKER_ERROR;
}

function formatNumber(n) {
  return String(n);
}

function buildSentence(result, draft) {
  const guests = normalizeEcho(draft.guests);
  const duration = normalizeEcho(draft.durationHours);
  const meal = T.meal[result.mealType];
  if (LANG === "zh") {
    return `${guests} 人、${duration} 小時、${meal}：食物 ${result.totals.foodG} 公克，飲料 ${result.totals.drinksMl} 毫升（${result.totals.drinksBottles2L} 瓶 2 公升裝），杯子 ${result.totals.cups} 個，盤子 ${result.totals.plates} 個，冰塊 ${result.totals.iceKg} 公斤。`;
  }
  return `${guests} guests, ${duration} hours, ${meal}: ${result.totals.foodG} g of food, ${result.totals.drinksMl} ml of drinks (${result.totals.drinksBottles2L} x 2 L bottles), ${result.totals.cups} cups, ${result.totals.plates} plates, ${result.totals.iceKg} kg of ice.`;
}

function setFieldError(field, message) {
  const el = errorEls[field];
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
  const input = fieldEls[field];
  if (!input) return;
  if (field === "mealType") {
    for (const radio of mealRadios) {
      if (message) radio.setAttribute("aria-invalid", "true");
      else radio.removeAttribute("aria-invalid");
    }
    return;
  }
  if (message) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", el.id);
  } else {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  }
}

function render() {
  const snap = controller.snapshot();

  form.setAttribute("aria-busy", snap.state === "busy" ? "true" : "false");
  runBtn.disabled = snap.state === "busy";
  cancelBtn.hidden = snap.state !== "busy";
  downloadBtn.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  setFieldError("guests", null);
  setFieldError("durationHours", null);
  setFieldError("mealType", null);

  if (snap.state === "success" && snap.result) {
    const result = snap.result;
    sentenceEl.textContent = buildSentence(result, snap.draft);
    factorEl.textContent = `${T.factorLabel} ${formatNumber(result.durationFactor)}`;
    totalFoodEl.textContent = formatNumber(result.totals.foodG);
    totalDrinksEl.textContent = formatNumber(result.totals.drinksMl);
    totalBottlesEl.textContent = formatNumber(result.totals.drinksBottles2L);
    totalCupsEl.textContent = formatNumber(result.totals.cups);
    totalPlatesEl.textContent = formatNumber(result.totals.plates);
    totalIceEl.textContent = formatNumber(result.totals.iceKg);
    perFoodEl.textContent = formatNumber(result.perPerson.foodG);
    perDrinksEl.textContent = formatNumber(result.perPerson.drinksMl);
    perCupsEl.textContent = formatNumber(result.perPerson.cups);
    perPlatesEl.textContent = formatNumber(result.perPerson.plates);
    perIceEl.textContent = formatNumber(result.perPerson.iceKg);
    resultEl.hidden = false;
    statusEl.textContent = sentenceEl.textContent;
  } else {
    resultEl.hidden = true;
    if (snap.state === "error" && snap.error) {
      const message = errorMessage(snap.error);
      statusEl.textContent = message;
      if (snap.error.field && errorEls[snap.error.field]) {
        setFieldError(snap.error.field, message);
      }
      if (focusFirstErrorOnError) {
        focusFirstErrorOnError = false;
        const target =
          snap.error.field && fieldEls[snap.error.field]
            ? fieldEls[snap.error.field]
            : guestsInput;
        target.focus();
      }
    } else if (snap.state === "dirty" && snap.exampleLoaded) {
      statusEl.textContent = T.status.example;
    } else {
      statusEl.textContent = T.status[snap.state] || "";
    }
  }
}

function syncDomFromDraft() {
  const draft = controller.draft;
  guestsInput.value = draft.guests;
  durationInput.value = draft.durationHours;
  for (const radio of mealRadios) {
    radio.checked = radio.value === draft.mealType;
  }
}

// --- Events ------------------------------------------------------------------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  focusFirstErrorOnError = true;
  controller.run();
  render();
});

guestsInput.addEventListener("input", () => {
  controller.edit({ guests: guestsInput.value });
  render();
});
durationInput.addEventListener("input", () => {
  controller.edit({ durationHours: durationInput.value });
  render();
});
for (const radio of mealRadios) {
  radio.addEventListener("change", () => {
    controller.edit({ mealType: radio.value });
    render();
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
  syncDomFromDraft();
  render();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  render();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  syncDomFromDraft();
  render();
  guestsInput.focus();
});

window.addEventListener("pagehide", () => {
  controller.stopWork();
  revokeDownload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    syncDomFromDraft();
    render();
  }
});

syncDomFromDraft();
render();
