// DOM wiring for the BAC Calculator. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  MAX_DRINKS,
  REPORT_FILENAME,
  formatNumber,
  serializeReport,
} from "./core/bac-calculator.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      sex: "性別",
      weightKg: "體重（kg）",
      drinks: "飲料清單",
      volumeMl: "容量（ml）",
      abvPercent: "酒精濃度（%）",
      elapsedMinutes: "距開始飲用的經過時間（分鐘）",
    },
    sexLabel: { male: "男性", female: "女性" },
    bandLabel: {
      "below-threshold": "未達行政罰門檻（喝酒仍不可駕車）",
      administrative: "行政罰區間（吐氣達 0.15 mg/L 或血液達 0.03% 以上）",
      criminal: "刑事責任區間（吐氣達 0.25 mg/L 或血液達 0.05% 以上）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長",
      UNICODE: "輸入含有不完整的字元",
      EMPTY: "必填",
      INTEGER_FORMAT: "請輸入整數",
      ENUM: "請選擇性別",
      RANGE: "超出允許範圍",
      ROW_LIMIT: "最多 12 杯",
      INTERNAL: "計算失敗，請重試",
      WORKER_ERROR: "計算失敗，請重試",
      OUTPUT_LIMIT: "報告太大，無法下載",
    },
    decimalError: {
      weightKg: "體重請用數字，最多一位小數",
      abvPercent: "酒精濃度請用數字，最多一位小數",
    },
    emptyDrinks: "請至少加入一杯飲料",
    statusEmpty: "尚未計算。請輸入資料，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「估算酒精濃度」執行。",
    drinkLabel: (n) => `第 ${n} 杯`,
    removeDrink: "移除這杯",
    addDrink: "新增一杯",
    minutesUnit: (n) => `${n} 分鐘`,
    summary: (result) =>
      `推估濃度 ${formatNumber(result.bacGL, 3)} g/L（${formatNumber(result.bacPercent, 3)}%），吐氣換算 ${formatNumber(result.breathMgL, 3)} mg/L。`,
  },
  en: {
    fieldLabel: {
      sex: "Sex",
      weightKg: "Body weight (kg)",
      drinks: "Drinks",
      volumeMl: "Volume (ml)",
      abvPercent: "Alcohol by volume (%)",
      elapsedMinutes: "Minutes since drinking started",
    },
    sexLabel: { male: "Male", female: "Female" },
    bandLabel: {
      "below-threshold": "Below the administrative threshold (still not OK to drive)",
      administrative: "Administrative-penalty band (breath 0.15 mg/L or blood 0.03% and above)",
      criminal: "Criminal-liability band (breath 0.25 mg/L or blood 0.05% and above)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Input contains an incomplete character.",
      EMPTY: "This field is required.",
      INTEGER_FORMAT: "Enter a whole number.",
      ENUM: "Choose a sex.",
      RANGE: "Out of range.",
      ROW_LIMIT: "At most 12 drinks.",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    decimalError: {
      weightKg: "Enter body weight as a number with at most one decimal place.",
      abvPercent: "Enter alcohol by volume as a number with at most one decimal place.",
    },
    emptyDrinks: "Add at least one drink.",
    statusEmpty: "Nothing calculated yet. Enter your drinks, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Estimate BAC” to compute it.",
    drinkLabel: (n) => `Drink ${n}`,
    removeDrink: "Remove this drink",
    addDrink: "Add a drink",
    minutesUnit: (n) => `${n} minutes`,
    summary: (result) =>
      `Estimated BAC ${formatNumber(result.bacGL, 3)} g/L (${formatNumber(result.bacPercent, 3)}%), breath equivalent ${formatNumber(result.breathMgL, 3)} mg/L.`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("bac-form");
const sexRadios = {
  male: document.getElementById("field-sex-male"),
  female: document.getElementById("field-sex-female"),
};
const weightInput = document.getElementById("field-weightKg");
const elapsedInput = document.getElementById("field-elapsedMinutes");
const drinkRowsEl = document.getElementById("drink-rows");
const addDrinkBtn = document.getElementById("add-drink-btn");
const fieldErrors = {};
for (const field of ["sex", "weightKg", "drinks", "elapsedMinutes"]) {
  fieldErrors[field] = document.getElementById(`error-${field}`);
}
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const bandEl = document.getElementById("result-band");
const bacGlEl = document.getElementById("result-bac-gl");
const bacPercentEl = document.getElementById("result-bac-percent");
const breathEl = document.getElementById("result-breath");
const peakEl = document.getElementById("result-peak");
const alcoholEl = document.getElementById("result-alcohol");
const toAdminEl = document.getElementById("result-to-admin");
const toZeroEl = document.getElementById("result-to-zero");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;
// Rendered drink-row DOM, kept stable across renders so typing never
// loses focus; rebuilt only when the row count changes.
let rowEls = [];

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

function errorMessage(field, code) {
  if (code === "DECIMAL_FORMAT") return t.decimalError[field] ?? t.error.INTERNAL;
  if (code === "EMPTY" && field === "drinks") return t.emptyDrinks;
  return t.error[code] ?? t.error.INTERNAL;
}

function setStaticFieldError(field, message) {
  const errorEl = fieldErrors[field];
  errorEl.textContent = message === null ? "" : message;
  const targets =
    field === "sex"
      ? Object.values(sexRadios)
      : field === "weightKg"
        ? [weightInput]
        : field === "elapsedMinutes"
          ? [elapsedInput]
          : [];
  for (const target of targets) {
    if (message === null) {
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-errormessage");
    } else {
      target.setAttribute("aria-invalid", "true");
      target.setAttribute("aria-errormessage", `error-${field}`);
    }
  }
}

function setRowFieldError(index, field, message) {
  const row = rowEls[index];
  if (!row) return;
  const errorEl = field === "volumeMl" ? row.volumeError : row.abvError;
  const input = field === "volumeMl" ? row.volumeInput : row.abvInput;
  errorEl.textContent = message === null ? "" : message;
  if (message === null) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  } else {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-errormessage", errorEl.id);
  }
}

function clearFieldErrors() {
  for (const field of ["sex", "weightKg", "drinks", "elapsedMinutes"]) {
    setStaticFieldError(field, null);
  }
  for (let i = 0; i < rowEls.length; i += 1) {
    setRowFieldError(i, "volumeMl", null);
    setRowFieldError(i, "abvPercent", null);
  }
}

function errorAnchor(error) {
  if (error.field === "sex") return sexRadios.male;
  if (error.field === "weightKg") return weightInput;
  if (error.field === "elapsedMinutes") return elapsedInput;
  if ((error.field === "volumeMl" || error.field === "abvPercent") && error.row !== null) {
    const row = rowEls[error.row - 1];
    if (!row) return null;
    return error.field === "volumeMl" ? row.volumeInput : row.abvInput;
  }
  return null;
}

function readDrinksFromRows() {
  return rowEls.map((row) => ({
    volumeMl: row.volumeInput.value,
    abvPercent: row.abvInput.value,
  }));
}

function buildRow(index) {
  const n = index + 1;
  const rowEl = document.createElement("div");
  rowEl.className = "drink-row";

  const volumeWrap = document.createElement("div");
  volumeWrap.className = "field drink-field";
  const volumeLabel = document.createElement("label");
  volumeLabel.setAttribute("for", `field-drink-${index}-volumeMl`);
  volumeLabel.textContent = `${t.drinkLabel(n)}：${t.fieldLabel.volumeMl}`;
  const volumeInput = document.createElement("input");
  volumeInput.id = `field-drink-${index}-volumeMl`;
  volumeInput.name = `drink-${index}-volumeMl`;
  volumeInput.type = "text";
  volumeInput.inputMode = "numeric";
  volumeInput.autocomplete = "off";
  const volumeError = document.createElement("p");
  volumeError.className = "field-error";
  volumeError.id = `error-drink-${index}-volumeMl`;
  volumeError.setAttribute("role", "alert");
  volumeInput.setAttribute("aria-describedby", volumeError.id);
  volumeWrap.append(volumeLabel, volumeInput, volumeError);

  const abvWrap = document.createElement("div");
  abvWrap.className = "field drink-field";
  const abvLabel = document.createElement("label");
  abvLabel.setAttribute("for", `field-drink-${index}-abvPercent`);
  abvLabel.textContent = `${t.drinkLabel(n)}：${t.fieldLabel.abvPercent}`;
  const abvInput = document.createElement("input");
  abvInput.id = `field-drink-${index}-abvPercent`;
  abvInput.name = `drink-${index}-abvPercent`;
  abvInput.type = "text";
  abvInput.inputMode = "decimal";
  abvInput.autocomplete = "off";
  const abvError = document.createElement("p");
  abvError.className = "field-error";
  abvError.id = `error-drink-${index}-abvPercent`;
  abvError.setAttribute("role", "alert");
  abvInput.setAttribute("aria-describedby", abvError.id);
  abvWrap.append(abvLabel, abvInput, abvError);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "button-secondary drink-remove";
  removeBtn.textContent = t.removeDrink;
  removeBtn.addEventListener("click", () => {
    const drinks = readDrinksFromRows();
    drinks.splice(index, 1);
    controller.edit({ drinks });
    if (rowEls[0]) rowEls[0].volumeInput.focus();
  });

  volumeInput.addEventListener("input", () => {
    controller.edit({ drinks: readDrinksFromRows() });
  });
  abvInput.addEventListener("input", () => {
    controller.edit({ drinks: readDrinksFromRows() });
  });

  rowEl.append(volumeWrap, abvWrap, removeBtn);
  return { rowEl, volumeInput, abvInput, volumeError, abvError, removeBtn };
}

function syncRows(drinks) {
  if (rowEls.length !== drinks.length) {
    drinkRowsEl.replaceChildren();
    rowEls = drinks.map((row, index) => {
      const built = buildRow(index);
      built.volumeInput.value = row.volumeMl;
      built.abvInput.value = row.abvPercent;
      drinkRowsEl.appendChild(built.rowEl);
      return built;
    });
  } else {
    drinks.forEach((row, index) => {
      if (rowEls[index].volumeInput.value !== row.volumeMl) {
        rowEls[index].volumeInput.value = row.volumeMl;
      }
      if (rowEls[index].abvInput.value !== row.abvPercent) {
        rowEls[index].abvInput.value = row.abvPercent;
      }
    });
  }
  addDrinkBtn.disabled = drinks.length >= MAX_DRINKS;
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const [value, radio] of Object.entries(sexRadios)) {
    radio.checked = draft.sex === value;
  }
  if (weightInput.value !== draft.weightKg) weightInput.value = draft.weightKg;
  if (elapsedInput.value !== draft.elapsedMinutes) elapsedInput.value = draft.elapsedMinutes;
  syncRows(draft.drinks);
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  downloadBtn.hidden = state !== "success";
  runBtn.disabled = state === "busy";

  if (state !== "success") revokeReportUrl();

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
      const message = errorMessage(error.field, error.code);
      if (error.field === "volumeMl" || error.field === "abvPercent") {
        if (error.row !== null) setRowFieldError(error.row - 1, error.field, message);
        statusEl.textContent = `${t.drinkLabel(error.row ?? 1)}：${message}`;
      } else if (error.field !== null && FIELDS.includes(error.field)) {
        setStaticFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
      } else {
        statusEl.textContent = message;
      }
      if (submitted) {
        submitted = false;
        const anchor = errorAnchor(error);
        if (anchor !== null) anchor.focus();
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    summaryEl.textContent = t.summary(result);
    bandEl.textContent = t.bandLabel[result.band];
    bacGlEl.textContent = `${formatNumber(result.bacGL, 3)} g/L`;
    bacPercentEl.textContent = `${formatNumber(result.bacPercent, 3)} %`;
    breathEl.textContent = `${formatNumber(result.breathMgL, 3)} mg/L`;
    peakEl.textContent = `${formatNumber(result.peakBacGL, 3)} g/L`;
    alcoholEl.textContent = `${formatNumber(result.totalAlcoholGrams, 1)} g`;
    toAdminEl.textContent = t.minutesUnit(result.minutesToBelowAdmin);
    toZeroEl.textContent = t.minutesUnit(result.minutesToZero);
    statusEl.textContent = t.summary(result);
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

weightInput.addEventListener("input", () => {
  controller.edit({ weightKg: weightInput.value });
});

elapsedInput.addEventListener("input", () => {
  controller.edit({ elapsedMinutes: elapsedInput.value });
});

for (const [value, radio] of Object.entries(sexRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) controller.edit({ sex: value });
  });
}

addDrinkBtn.addEventListener("click", () => {
  const drinks = readDrinksFromRows();
  if (drinks.length >= MAX_DRINKS) return;
  drinks.push({ volumeMl: "", abvPercent: "" });
  controller.edit({ drinks });
  const last = rowEls[rowEls.length - 1];
  if (last) last.volumeInput.focus();
});

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  sexRadios.male.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
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
