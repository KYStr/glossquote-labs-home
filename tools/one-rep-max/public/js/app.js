// DOM wiring for the One-Rep Max Calculator. All user-visible text is
// set through textContent/value only; user input never becomes markup.
// The controller owns the draft, generations, and the state machine;
// this file only renders it and forwards form events.

import { createController } from "./controller.mjs";
import { formatKg, messageFor } from "./core/one-rep-max.mjs";

const STRINGS = {
  "zh-Hant": {
    statusEmpty: "請輸入重量與次數，或載入範例。",
    statusBusy: "處理中",
    statusDirty: "輸入已變更，請重新計算",
    statusCancelled: "已取消，可重新計算",
    summary: (kg) => `估算 1RM ${kg} 公斤`,
    kg: "公斤",
  },
  en: {
    statusEmpty: "Enter a weight and reps, or load the example.",
    statusBusy: "Working",
    statusDirty: "Input changed. Calculate again.",
    statusCancelled: "Cancelled. You can calculate again.",
    summary: (kg) => `Estimated 1RM ${kg} kg`,
    kg: "kg",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const appEl = document.getElementById("app");
const form = document.getElementById("calc-form");
const weightEl = document.getElementById("weight");
const unitGroupEl = document.getElementById("unit-group");
const unitKgEl = document.getElementById("unit-kg");
const unitLbEl = document.getElementById("unit-lb");
const repsEl = document.getElementById("reps");
const errorWeightEl = document.getElementById("error-weight");
const errorUnitEl = document.getElementById("error-unit");
const errorRepsEl = document.getElementById("error-reps");
const errorGeneralEl = document.getElementById("error-general");
const calculateBtn = document.getElementById("calculate-btn");
const cancelBtn = document.getElementById("cancel-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const exampleNoteEl = document.getElementById("example-note");
const statusEl = document.getElementById("status");
const resultEmptyEl = document.getElementById("result-empty");
const resultEl = document.getElementById("result");
const result1rmEl = document.getElementById("result-1rm");
const resultEpleyEl = document.getElementById("result-epley");
const resultBrzyckiEl = document.getElementById("result-brzycki");
const resultNoteEl = document.getElementById("result-note");
const pctRowsEl = document.getElementById("pct-rows");

let submitted = false;
let exampleLoaded = false;

const FIELD_ELEMENTS = {
  weight: { input: weightEl, error: errorWeightEl },
  reps: { input: repsEl, error: errorRepsEl },
  unit: { input: unitGroupEl, error: errorUnitEl },
};

function clearErrors() {
  for (const { input, error } of Object.values(FIELD_ELEMENTS)) {
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  }
  errorGeneralEl.textContent = "";
}

function render(s) {
  appEl.setAttribute("aria-busy", s.state === "busy" ? "true" : "false");
  if (weightEl.value !== s.draft.weight) weightEl.value = s.draft.weight;
  if (repsEl.value !== s.draft.reps) repsEl.value = s.draft.reps;
  unitKgEl.checked = s.draft.unit === "kg";
  unitLbEl.checked = s.draft.unit === "lb";
  cancelBtn.hidden = s.state !== "busy";
  calculateBtn.disabled = s.state === "busy";
  exampleNoteEl.hidden = !exampleLoaded;

  clearErrors();
  if (s.state === "error" && s.error !== null) {
    const message = messageFor(s.error, lang);
    const target = s.error.field !== null ? FIELD_ELEMENTS[s.error.field] : undefined;
    if (target !== undefined) {
      target.error.textContent = message;
      target.input.setAttribute("aria-invalid", "true");
      target.input.setAttribute("aria-errormessage", target.error.id);
    } else {
      errorGeneralEl.textContent = message;
    }
    statusEl.textContent = message;
    if (submitted) {
      submitted = false;
      // Only a failed submit moves focus to the first error field.
      if (target !== undefined) {
        const focusable =
          s.error.field === "unit" ? unitKgEl : target.input;
        focusable.focus();
      }
    }
  }

  const r = s.result;
  resultEl.hidden = r === null;
  resultEmptyEl.hidden = r !== null;
  if (r !== null) {
    result1rmEl.textContent = formatKg(r.oneRepMaxKg);
    resultEpleyEl.textContent = formatKg(r.epleyKg);
    resultBrzyckiEl.textContent = formatKg(r.brzyckiKg);
    resultNoteEl.hidden = !r.highReps;
    const rows = r.rows.map((row) => {
      const tr = document.createElement("tr");
      const percent = document.createElement("td");
      percent.textContent = `${row.percent}%`;
      const load = document.createElement("td");
      load.textContent = formatKg(row.loadKg);
      const reps = document.createElement("td");
      reps.textContent = String(row.typicalReps);
      tr.append(percent, load, reps);
      return tr;
    });
    pctRowsEl.replaceChildren(...rows);
    if (s.state === "success") statusEl.textContent = t.summary(formatKg(r.oneRepMaxKg));
  } else if (s.state !== "error") {
    if (s.state === "empty") statusEl.textContent = t.statusEmpty;
    else if (s.state === "busy") statusEl.textContent = t.statusBusy;
    else if (s.state === "dirty") statusEl.textContent = t.statusDirty;
    else if (s.state === "cancelled") statusEl.textContent = t.statusCancelled;
  }
  if (s.state === "busy") statusEl.textContent = t.statusBusy;
}

const controller = createController({ onChange: render });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitted = true;
  exampleLoaded = false;
  controller.run();
});

weightEl.addEventListener("input", () => {
  exampleLoaded = false;
  controller.edit({ weight: weightEl.value });
});

repsEl.addEventListener("input", () => {
  exampleLoaded = false;
  controller.edit({ reps: repsEl.value });
});

for (const radio of [unitKgEl, unitLbEl]) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      exampleLoaded = false;
      controller.edit({ unit: radio.value });
    }
  });
}

exampleBtn.addEventListener("click", () => {
  controller.edit({ weight: "100", reps: "5", unit: "kg" });
  exampleLoaded = true;
  render(controller.getState());
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  calculateBtn.focus();
});

resetBtn.addEventListener("click", () => {
  exampleLoaded = false;
  controller.reset();
  weightEl.focus();
});

window.addEventListener("pagehide", () => {
  controller.destroy();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // Returning from the back/forward cache resets to a clean draft.
    exampleLoaded = false;
    controller.reset();
  }
});

render(controller.getState());
