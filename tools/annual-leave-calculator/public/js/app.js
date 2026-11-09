// Annual Leave Calculator — DOM wiring.
// All user-visible values are written with textContent/value only.

import { run } from "./core/core.mjs";
import { errorMessage, messagesFor } from "./core/messages.mjs";
import { createController } from "./controller.mjs";

// Mirrors the first literal case in the specification's fixtures.json
// (regular-mid-tenure), labelled in the UI as synthetic example data.
const EXAMPLE_DRAFT = Object.freeze({
  startDate: "2021-06-15",
  referenceDate: "2026-11-09",
  usedDays: "4",
});

const FIELD_ELEMENTS = {
  startDate: { input: "start-date", error: "start-date-error" },
  referenceDate: { input: "reference-date", error: "reference-date-error" },
  usedDays: { input: "used-days", error: "used-days-error" },
};

function taipeiToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type).value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function init() {
  const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
  const messages = messagesFor(lang);

  const form = document.getElementById("leave-form");
  const statusEl = document.getElementById("status");
  const cancelBtn = document.getElementById("cancel-btn");
  const exampleBtn = document.getElementById("example-btn");
  const todayBtn = document.getElementById("today-btn");
  const resetBtn = document.getElementById("reset-btn");
  const resultPanel = document.getElementById("result-panel");
  const resultEmpty = document.getElementById("result-empty");
  const resultBody = document.getElementById("result-body");
  const remainingValue = document.getElementById("remaining-value");
  const stageMessage = document.getElementById("stage-message");
  const feb29Note = document.getElementById("feb29-note");
  const detail = {
    tenureYears: document.getElementById("tenure-years"),
    tenureMonths: document.getElementById("tenure-months"),
    tenureDays: document.getElementById("tenure-days"),
    entitlement: document.getElementById("entitlement-value"),
    used: document.getElementById("used-value"),
    remaining: document.getElementById("remaining-value-detail"),
    period: document.getElementById("period-value"),
    nextGrant: document.getElementById("next-grant-value"),
  };

  const inputs = {};
  const errorEls = {};
  for (const [field, ids] of Object.entries(FIELD_ELEMENTS)) {
    inputs[field] = document.getElementById(ids.input);
    errorEls[field] = document.getElementById(ids.error);
  }

  const controller = createController({
    run,
    schedule: (fn) =>
      setTimeout(() => {
        fn();
        render();
        const state = controller.getState();
        if (state.status === "error" && state.error && state.error.field) {
          const target = inputs[state.error.field];
          if (target) target.focus();
        }
      }, 0),
  });

  function readDraft() {
    return {
      startDate: inputs.startDate.value,
      referenceDate: inputs.referenceDate.value,
      usedDays: inputs.usedDays.value,
    };
  }

  function writeDraft(draft) {
    inputs.startDate.value = draft.startDate ?? "";
    inputs.referenceDate.value = draft.referenceDate ?? "";
    inputs.usedDays.value = draft.usedDays ?? "";
  }

  function clearFieldErrors() {
    for (const field of Object.keys(FIELD_ELEMENTS)) {
      errorEls[field].hidden = true;
      errorEls[field].textContent = "";
      inputs[field].removeAttribute("aria-invalid");
      inputs[field].removeAttribute("aria-errormessage");
    }
  }

  function render(note) {
    const state = controller.getState();
    clearFieldErrors();
    resultPanel.setAttribute("aria-busy", state.status === "busy" ? "true" : "false");
    cancelBtn.hidden = state.status !== "busy";

    if (state.resultAvailable && state.result) {
      const r = state.result;
      resultEmpty.hidden = true;
      resultBody.hidden = false;
      remainingValue.textContent = String(r.remainingDays);
      detail.tenureYears.textContent = String(r.completedYears);
      detail.tenureMonths.textContent = String(r.completedMonths);
      detail.tenureDays.textContent = String(r.tenureDays);
      detail.entitlement.textContent = String(r.entitlementDays);
      detail.used.textContent = String(r.usedDays);
      detail.remaining.textContent = String(r.remainingDays);
      detail.period.textContent =
        r.periodStart && r.periodEnd ? `${r.periodStart} – ${r.periodEnd}` : messages.periodNone;
      detail.nextGrant.textContent =
        lang === "en"
          ? `${r.nextGrantDate} (${r.nextGrantDays} days)`
          : `${r.nextGrantDate}（${r.nextGrantDays} 天）`;
      if (r.stage === "under-6-months") {
        stageMessage.textContent = messages.stageUnder;
        stageMessage.hidden = false;
      } else if (r.stage === "first-3-days") {
        stageMessage.textContent = messages.stageFirst;
        stageMessage.hidden = false;
      } else {
        stageMessage.textContent = "";
        stageMessage.hidden = true;
      }
      feb29Note.hidden = !r.feb29Adjusted;
      if (r.feb29Adjusted) feb29Note.textContent = messages.feb29Note;
    } else {
      resultEmpty.hidden = false;
      resultBody.hidden = true;
    }

    if (note) {
      statusEl.textContent = note;
      return;
    }
    if (state.status === "empty") statusEl.textContent = messages.statusEmpty;
    else if (state.status === "dirty") statusEl.textContent = messages.statusDirty;
    else if (state.status === "busy") statusEl.textContent = messages.statusBusy;
    else if (state.status === "cancelled") statusEl.textContent = messages.statusCancelled;
    else if (state.status === "success") statusEl.textContent = messages.statusSuccess;
    else if (state.status === "error") {
      const text = errorMessage(messages, state.error, state.draft);
      statusEl.textContent = text;
      if (state.error && state.error.field && errorEls[state.error.field]) {
        const field = state.error.field;
        errorEls[field].textContent = text;
        errorEls[field].hidden = false;
        inputs[field].setAttribute("aria-invalid", "true");
        inputs[field].setAttribute("aria-errormessage", errorEls[field].id);
      }
    }
  }

  for (const field of Object.keys(FIELD_ELEMENTS)) {
    inputs[field].addEventListener("input", () => {
      controller.updateDraft(readDraft());
      render();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    controller.updateDraft(readDraft());
    controller.execute();
    render();
  });

  cancelBtn.addEventListener("click", () => {
    controller.cancel();
    render();
  });

  exampleBtn.addEventListener("click", () => {
    writeDraft({ ...EXAMPLE_DRAFT });
    controller.updateDraft({ ...EXAMPLE_DRAFT });
    render(messages.exampleLoaded);
  });

  todayBtn.addEventListener("click", () => {
    const next = { ...readDraft(), referenceDate: taipeiToday() };
    writeDraft(next);
    controller.updateDraft(next);
    render(messages.todaySet);
  });

  resetBtn.addEventListener("click", () => {
    controller.reset();
    writeDraft({ startDate: "", referenceDate: "", usedDays: "" });
    render();
    inputs.startDate.focus();
  });

  window.addEventListener("pagehide", () => {
    controller.discardPending();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      controller.reset();
      writeDraft({ startDate: "", referenceDate: "", usedDays: "" });
      render();
    }
  });

  render();
}

if (typeof document !== "undefined") {
  init();
}
