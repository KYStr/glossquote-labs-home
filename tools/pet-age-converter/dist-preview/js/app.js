// DOM wiring for the Pet Age Converter. All rendering uses
// textContent/value; user input is never treated as markup. The draft
// lives only in this page: editing revokes the old result through the
// controller, and leaving the page discards everything. Selecting a
// cat disables the size field and clears it, exactly as the SPEC pins
// (the core still rejects a cat with a non-empty size on its own).

import { createController } from "./controller.mjs";
import {
  DEFAULT_DRAFT,
  EXAMPLE_INPUT,
  STATUS_MESSAGES,
  errorMessage,
  formatYears,
} from "./core/pet-age.mjs";

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const text = (zh, en) => (lang === "en" ? en : zh);

const main = document.getElementById("app");
const form = document.getElementById("calc-form");
const speciesInput = document.getElementById("species");
const sizeInput = document.getElementById("size");
const sizeCatNote = document.getElementById("size-cat-note");
const yearsInput = document.getElementById("years");
const monthsInput = document.getElementById("months");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const cancelBtn = document.getElementById("cancel-btn");
const resetBtn = document.getElementById("reset-btn");
const exampleNote = document.getElementById("example-note");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultHumanYears = document.getElementById("result-human-years");
const resultStage = document.getElementById("result-stage");
const resultTotalMonths = document.getElementById("result-total-months");
const resultSegments = document.getElementById("result-segments");
const fieldInputs = {
  species: speciesInput,
  size: sizeInput,
  years: yearsInput,
  months: monthsInput,
};
const errorEls = {
  species: document.getElementById("error-species"),
  size: document.getElementById("error-size"),
  years: document.getElementById("error-years"),
  months: document.getElementById("error-months"),
};

const statusDefault = statusEl.textContent;
let focusFirstError = false;

const controller = createController({
  schedule: (fn) => setTimeout(fn, 0),
  cancelScheduled: (handle) => clearTimeout(handle),
  onChange: render,
});

// Keeps the size field's enabled state and value in line with the
// species: cats clear and disable it (with the pinned note shown);
// dogs re-enable it.
function syncSizeState() {
  if (speciesInput.value === "cat") {
    sizeInput.value = "";
    sizeInput.disabled = true;
    sizeCatNote.hidden = false;
  } else {
    sizeInput.disabled = false;
    sizeCatNote.hidden = true;
  }
}

function readDraft() {
  return {
    species: speciesInput.value,
    size: sizeInput.value,
    years: yearsInput.value,
    months: monthsInput.value,
  };
}

function applyDraft(draft) {
  speciesInput.value = draft.species;
  syncSizeState();
  if (draft.species !== "cat") sizeInput.value = draft.size;
  yearsInput.value = draft.years;
  monthsInput.value = draft.months;
}

function handleEdit() {
  exampleNote.hidden = true;
  controller.edit(readDraft());
}

function clearErrors() {
  for (const el of Object.values(errorEls)) el.textContent = "";
  for (const input of Object.values(fieldInputs)) {
    input.removeAttribute("aria-invalid");
  }
}

function renderResults(result) {
  resultHumanYears.textContent = formatYears(result.humanYears);
  resultStage.textContent = lang === "en" ? result.stageEn : result.stageZh;
  resultTotalMonths.textContent = String(result.totalMonths);

  const segmentLabels = [
    text("第一年", "First year"),
    text("第二年", "Second year"),
    text(
      `之後（每年 +${result.laterRatePerYear} 歲）`,
      `After that (+${result.laterRatePerYear} per year)`,
    ),
  ];
  const segmentValues = [
    result.breakdown.segment1,
    result.breakdown.segment2,
    result.breakdown.segment3,
  ];
  resultSegments.replaceChildren();
  segmentLabels.forEach((label, index) => {
    const tr = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    labelCell.textContent = label;
    const valueCell = document.createElement("td");
    valueCell.textContent = formatYears(segmentValues[index]);
    tr.append(labelCell, valueCell);
    resultSegments.append(tr);
  });
}

function render(state) {
  main.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  cancelBtn.hidden = state.state !== "busy";
  runBtn.disabled = state.state === "busy";

  if (state.state === "empty") statusEl.textContent = statusDefault;
  else if (state.state === "dirty") statusEl.textContent = STATUS_MESSAGES.dirty[lang];
  else if (state.state === "busy") statusEl.textContent = STATUS_MESSAGES.busy[lang];
  else if (state.state === "cancelled") statusEl.textContent = STATUS_MESSAGES.cancelled[lang];
  else if (state.state === "success") statusEl.textContent = text("換算完成", "Done.");
  else if (state.state === "error" && state.error) {
    statusEl.textContent = errorMessage(state.error, lang);
  }

  clearErrors();
  if (state.state === "error" && state.error) {
    const field = state.error.field;
    if (field !== null && Object.hasOwn(errorEls, field)) {
      errorEls[field].textContent = errorMessage(state.error, lang);
      fieldInputs[field].setAttribute("aria-invalid", "true");
      if (focusFirstError) fieldInputs[field].focus();
    }
    focusFirstError = false;
  } else if (state.state === "success") {
    focusFirstError = false;
  }

  if (state.resultAvailable && state.result !== null) {
    renderResults(state.result);
    resultsEl.hidden = false;
  } else {
    resultsEl.hidden = true;
  }
}

speciesInput.addEventListener("change", () => {
  syncSizeState();
  handleEdit();
});
sizeInput.addEventListener("change", handleEdit);
yearsInput.addEventListener("input", handleEdit);
monthsInput.addEventListener("input", handleEdit);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  exampleNote.hidden = true;
  focusFirstError = true;
  controller.run();
});

exampleBtn.addEventListener("click", () => {
  applyDraft(EXAMPLE_INPUT);
  controller.edit(JSON.parse(JSON.stringify(EXAMPLE_INPUT)));
  exampleNote.hidden = false;
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  applyDraft(DEFAULT_DRAFT);
  exampleNote.hidden = true;
  speciesInput.focus();
});

window.addEventListener("pagehide", () => {
  controller.destroy();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
    applyDraft(DEFAULT_DRAFT);
    exampleNote.hidden = true;
  }
});

applyDraft(DEFAULT_DRAFT);
