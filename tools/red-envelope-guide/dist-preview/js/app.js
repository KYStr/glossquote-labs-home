// DOM wiring for the Red Envelope Guide. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.
//
// Applicability (SPEC userFlow): fields that do not apply to the chosen
// occasion are disabled in the UI. Switching occasion normalizes the
// non-applicable draft fields to their neutral values (null / true / "1")
// so the form stays runnable; the core independently enforces the
// applicability matrix for any programmatic input.

import { createController } from "./controller.mjs";
import {
  FIELDS,
  REPORT_FILENAME,
  formatAmount,
  serializeReport,
} from "./core/red-envelope.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const REPORT_URL_TTL_MS = 30000;

const APPLICABLE = {
  wedding: ["relationship", "tier", "attending", "attendeeCount"],
  "full-month": ["relationship"],
  housewarming: ["relationship"],
  "new-year-elder": ["giverStage"],
  "new-year-junior": ["ageBand"],
};
const NEUTRAL = {
  relationship: null,
  tier: null,
  giverStage: null,
  ageBand: null,
  attending: true,
  attendeeCount: "1",
};

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      occasion: "場合",
      relationship: "關係",
      tier: "婚禮場地",
      giverStage: "身分階段",
      ageBand: "小孩年齡",
      attending: "出席",
      attendeeCount: "同行人數（含自己）",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      TYPE: "欄位型別不正確",
      INPUT_LIMIT: "輸入過長",
      UNICODE: "含有無效字元",
      ENUM: "請選擇清單中的項目",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "超出允許範圍",
      EMPTY: "此場合需要這個欄位",
      NOT_APPLICABLE: "此場合不適用此欄位",
      INTERNAL: "發生未預期錯誤",
      WORKER_ERROR: "發生未預期錯誤",
      OUTPUT_LIMIT: "明細太大，無法下載",
    },
    statusEmpty: "尚未查詢。請選擇場合與條件，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例，請按「查詢建議金額」執行。",
    noteText: {
      "customs-vary": "各地與各家習俗不同，金額僅供參考，請以自身經濟狀況與雙方交情為準。",
      "not-attending-discount": "未出席以行情約六成計算。",
      "extra-attendees": "紅包以每份（出席單位）計，多人同行已加計每人份。",
      "gift-alternative": "喬遷也可改送等值禮品。",
    },
    summary: (result) =>
      `推薦金額 ${formatAmount(result.recommended)}，建議區間 ${formatAmount(result.rangeLow)} – ${formatAmount(result.rangeHigh)}（每份紅包）。`,
    rangeLabel: "建議區間",
    recommendedLabel: "推薦金額",
  },
  en: {
    fieldLabel: {
      occasion: "Occasion",
      relationship: "Relationship",
      tier: "Wedding venue",
      giverStage: "Your stage",
      ageBand: "Child's age band",
      attending: "Attending",
      attendeeCount: "Party size (including you)",
    },
    error: {
      SCHEMA: "The input is malformed.",
      TYPE: "Wrong field type.",
      INPUT_LIMIT: "Input is too long.",
      UNICODE: "Contains invalid characters.",
      ENUM: "Choose one of the listed options.",
      INTEGER_FORMAT: "Enter a whole number.",
      RANGE: "Outside the allowed range.",
      EMPTY: "This field is required for the chosen occasion.",
      NOT_APPLICABLE: "This field does not apply to the chosen occasion.",
      INTERNAL: "Something unexpected happened.",
      WORKER_ERROR: "Something unexpected happened.",
      OUTPUT_LIMIT: "The report is too large to download.",
    },
    statusEmpty: "Nothing looked up yet. Choose an occasion and conditions, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded. Run “Look up suggested amount” to compute it.",
    noteText: {
      "customs-vary":
        "Customs vary by family and region; amounts are references only — adjust to your means and your relationship.",
      "not-attending-discount": "Not attending: about 60% of the usual range.",
      "extra-attendees":
        "Amounts are per envelope (attending unit); extra attendees are already added.",
      "gift-alternative": "For a housewarming, a gift of equivalent value is also appropriate.",
    },
    summary: (result) =>
      `Recommended ${formatAmount(result.recommended)}; suggested range ${formatAmount(result.rangeLow)} – ${formatAmount(result.rangeHigh)} per envelope.`,
    rangeLabel: "Suggested range",
    recommendedLabel: "Recommended amount",
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const form = document.getElementById("envelope-form");
const inputs = {};
for (const field of FIELDS) inputs[field] = document.getElementById(`field-${field}`);
const fieldErrors = {};
for (const field of FIELDS) fieldErrors[field] = document.getElementById(`error-${field}`);
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const recommendedEl = document.getElementById("recommended-amount");
const rangeEl = document.getElementById("range-amounts");
const notesEl = document.getElementById("result-notes");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
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

function syncApplicable(draft) {
  const applicable = new Set(["occasion", ...APPLICABLE[draft.occasion]]);
  for (const field of FIELDS) {
    if (field === "occasion") continue;
    const wrap = document.getElementById(`wrap-${field}`);
    const disabled = !applicable.has(field);
    inputs[field].disabled = disabled;
    if (wrap !== null) wrap.classList.toggle("field-disabled", disabled);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error } = publicState;
  for (const field of FIELDS) {
    if (field === "attending") {
      if (inputs[field].checked !== draft[field]) inputs[field].checked = draft[field];
    } else if (field === "attendeeCount") {
      if (inputs[field].value !== draft[field]) inputs[field].value = draft[field];
    } else {
      const value = draft[field] ?? "";
      if (inputs[field].value !== value) inputs[field].value = value;
    }
  }
  syncApplicable(draft);
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
      const message = t.error[error.code] ?? t.error.INTERNAL;
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}：${message}`;
        if (submitted) {
          submitted = false;
          if (!inputs[error.field].disabled) inputs[error.field].focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    recommendedEl.textContent = formatAmount(result.recommended);
    rangeEl.textContent = `${t.rangeLabel}：${formatAmount(result.rangeLow)} – ${formatAmount(result.rangeHigh)}`;
    notesEl.replaceChildren();
    for (const note of result.notes) {
      const li = document.createElement("li");
      li.textContent = t.noteText[note] ?? note;
      notesEl.appendChild(li);
    }
    summaryEl.textContent = t.summary(result);
    statusEl.textContent = summaryEl.textContent;
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

function readField(field) {
  if (field === "attending") return inputs[field].checked;
  if (field === "attendeeCount") return inputs[field].value;
  const value = inputs[field].value;
  return value === "" ? null : value;
}

for (const field of FIELDS) {
  const eventName = field === "attendeeCount" ? "input" : "change";
  inputs[field].addEventListener(eventName, () => {
    if (field === "occasion") {
      const occasion = inputs[field].value;
      const patch = { occasion };
      const applicable = new Set(APPLICABLE[occasion]);
      for (const other of Object.keys(NEUTRAL)) {
        if (!applicable.has(other)) patch[other] = NEUTRAL[other];
      }
      controller.edit(patch);
      return;
    }
    controller.edit({ [field]: readField(field) });
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.occasion.focus();
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
