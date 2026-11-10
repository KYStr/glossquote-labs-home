// Workdays Calculator — DOM wiring.
// All user-visible values are written with textContent/value only.

import { REPORT_BYTES_LIMIT, serializeReport } from "./core/core.mjs";
import { errorMessage, messagesFor } from "./core/messages.mjs";
import { DEFAULT_DRAFT, createController } from "./controller.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

// Mirrors the first literal case in the specification's fixtures.json
// (basic-week), labelled in the UI as synthetic example data.
const EXAMPLE_DRAFT = Object.freeze({
  mode: "count",
  startDate: "2026-01-02",
  endDate: "2026-01-09",
  days: "5",
  holidays: "",
});

const FIELD_ELEMENTS = {
  startDate: { input: "start-date", error: "start-date-error" },
  endDate: { input: "end-date", error: "end-date-error" },
  days: { input: "days", error: "days-error" },
  holidays: { input: "holidays", error: "holidays-error" },
};

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  let worker;
  try {
    worker = new Worker(url, { type: "module" });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  const terminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    try {
      terminate();
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  return worker;
}

function init() {
  const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
  const messages = messagesFor(lang);

  const form = document.getElementById("workdays-form");
  const statusEl = document.getElementById("status");
  const modeCountRadio = document.getElementById("mode-count");
  const modeShiftRadio = document.getElementById("mode-shift");
  const endField = document.getElementById("end-date-field");
  const daysField = document.getElementById("days-field");
  const runBtn = document.getElementById("run-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const exampleBtn = document.getElementById("example-btn");
  const resetBtn = document.getElementById("reset-btn");
  const resultPanel = document.getElementById("result-panel");
  const resultEmpty = document.getElementById("result-empty");
  const countBlock = document.getElementById("result-count");
  const shiftBlock = document.getElementById("result-shift");
  const downloadBtn = document.getElementById("download-btn");
  const countDetail = {
    start: document.getElementById("count-start"),
    end: document.getElementById("count-end"),
    calendar: document.getElementById("count-calendar"),
    weekend: document.getElementById("count-weekend"),
    subtracted: document.getElementById("count-subtracted"),
    onWeekends: document.getElementById("count-on-weekends"),
    outOfRange: document.getElementById("count-out-of-range"),
    duplicates: document.getElementById("count-duplicates"),
  };
  const businessDaysValue = document.getElementById("business-days-value");
  const shiftDetail = {
    days: document.getElementById("shift-days"),
    moved: document.getElementById("shift-moved"),
    isBusiness: document.getElementById("shift-is-business"),
  };
  const resultDateValue = document.getElementById("result-date-value");
  const resultWeekdayName = document.getElementById("result-weekday-name");

  const inputs = {};
  const errorEls = {};
  for (const [field, ids] of Object.entries(FIELD_ELEMENTS)) {
    inputs[field] = document.getElementById(ids.input);
    errorEls[field] = document.getElementById(ids.error);
  }

  let reportUrl = null;

  const controller = createController({
    createWorker,
    onSettled() {
      render();
      const state = controller.getState();
      if (state.status === "error") inputs[state.error?.field]?.focus();
    },
  });

  function releaseReportUrl() {
    if (reportUrl !== null) {
      URL.revokeObjectURL(reportUrl);
      reportUrl = null;
    }
  }

  function readDraft() {
    return {
      mode: modeShiftRadio.checked ? "shift" : "count",
      startDate: inputs.startDate.value,
      endDate: inputs.endDate.value,
      days: inputs.days.value,
      holidays: inputs.holidays.value,
    };
  }

  function writeDraft(draft) {
    modeCountRadio.checked = draft.mode !== "shift";
    modeShiftRadio.checked = draft.mode === "shift";
    inputs.startDate.value = draft.startDate ?? "";
    inputs.endDate.value = draft.endDate ?? "";
    inputs.days.value = draft.days ?? "";
    inputs.holidays.value = draft.holidays ?? "";
  }

  function clearFieldErrors() {
    for (const field of Object.keys(FIELD_ELEMENTS)) {
      errorEls[field].hidden = true;
      errorEls[field].textContent = "";
      inputs[field].removeAttribute("aria-invalid");
      inputs[field].removeAttribute("aria-errormessage");
    }
  }

  function dateWithWeekday(dateText, weekday) {
    const name = messages.weekdays[weekday];
    return lang === "en" ? `${dateText} (${name})` : `${dateText}（${name}）`;
  }

  function render(note) {
    const state = controller.getState();
    clearFieldErrors();
    resultPanel.setAttribute("aria-busy", state.status === "busy" ? "true" : "false");
    cancelBtn.hidden = state.status !== "busy";
    endField.hidden = state.draft.mode !== "count";
    daysField.hidden = state.draft.mode !== "shift";
    runBtn.textContent = state.draft.mode === "shift" ? messages.runShift : messages.runCount;

    if (state.resultAvailable && state.result) {
      const r = state.result;
      resultEmpty.hidden = true;
      downloadBtn.hidden = false;
      if (r.mode === "count") {
        countBlock.hidden = false;
        shiftBlock.hidden = true;
        businessDaysValue.textContent = String(r.businessDays);
        countDetail.start.textContent = dateWithWeekday(r.startDate, r.startWeekday);
        countDetail.end.textContent = dateWithWeekday(r.endDate, r.endWeekday);
        countDetail.calendar.textContent = String(r.calendarDays);
        countDetail.weekend.textContent = String(r.weekendDays);
        countDetail.subtracted.textContent = String(r.holidaysSubtracted);
        countDetail.onWeekends.textContent = String(r.holidaysOnWeekends);
        countDetail.outOfRange.textContent = String(r.holidaysOutOfRange);
        countDetail.duplicates.textContent = String(r.duplicateHolidayLines);
      } else {
        countBlock.hidden = true;
        shiftBlock.hidden = false;
        resultDateValue.textContent = r.resultDate;
        resultWeekdayName.textContent = messages.weekdays[r.resultWeekday];
        shiftDetail.days.textContent = String(r.days);
        shiftDetail.moved.textContent = String(r.calendarDaysMoved);
        shiftDetail.isBusiness.textContent = r.resultIsBusinessDay ? messages.yes : messages.no;
      }
    } else {
      resultEmpty.hidden = false;
      countBlock.hidden = true;
      shiftBlock.hidden = true;
      downloadBtn.hidden = true;
      releaseReportUrl();
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
      const text = errorMessage(messages, state.error);
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
  for (const radio of [modeCountRadio, modeShiftRadio]) {
    radio.addEventListener("change", () => {
      controller.updateDraft(readDraft());
      render();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    controller.updateDraft(readDraft());
    controller.execute();
    if (controller.getState().status === "busy") render();
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

  resetBtn.addEventListener("click", () => {
    controller.reset();
    writeDraft({ ...DEFAULT_DRAFT });
    render();
    modeCountRadio.focus();
  });

  downloadBtn.addEventListener("click", () => {
    const state = controller.getState();
    if (!state.resultAvailable || !state.result) return;
    const text = serializeReport(state.result);
    const bytes = new TextEncoder().encode(text);
    if (bytes.byteLength > REPORT_BYTES_LIMIT) return;
    releaseReportUrl();
    const blob = new Blob([text], { type: "application/json" });
    reportUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = reportUrl;
    anchor.download = "workdays-report.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(releaseReportUrl, 30000);
  });

  window.addEventListener("pagehide", () => {
    controller.discardPending();
    releaseReportUrl();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      controller.reset();
      writeDraft({ ...DEFAULT_DRAFT });
      render();
    }
  });

  render();
}

if (typeof document !== "undefined") {
  init();
}
