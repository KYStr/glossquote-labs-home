// DOM wiring for the Pregnancy Due Date Calculator.
//
// All computation lives in ./core/*.mjs (pure, timestamp-free).
// This layer only reads field values, renders results and errors
// with textContent, and tracks per-mode session state. Nothing is
// stored anywhere and nothing leaves the page: entered dates live
// in the form fields for this page session only.

import { daysFromCivil, formatCivilDate } from "./core/civil.mjs";
import {
  computeFromConception,
  computeFromLmp,
  computeFromUltrasound,
} from "./core/due-date.mjs";

const STRINGS = {
  "zh-Hant": {
    errors: {
      required: "請先輸入這個欄位。",
      invalidDate: "日期不存在或格式不正確，請重新輸入。",
      invalidNumber: "請輸入數字。",
      future: "日期不能晚於今天。",
      notWhole: "請輸入整數，不要有小數。",
      range: {
        cycleLength: "週期長度需在 21 到 45 天之間。",
        scanWeeks: "週數需在 4 到 42 週之間。",
        scanDays: "天數需在 0 到 6 天之間。",
      },
    },
    trimesterNames: { first: "第一孕期", second: "第二孕期", third: "第三孕期" },
    beyondShort: "已超過 42 週（請核對日期）",
    ga: (weeks, days) => `${weeks} 週又 ${days} 天`,
    formatDate: (iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      return `${y} 年 ${m} 月 ${d} 日`;
    },
  },
  en: {
    errors: {
      required: "Please fill in this field.",
      invalidDate: "That date does not exist or is not formatted correctly.",
      invalidNumber: "Please enter a number.",
      future: "The date cannot be later than today.",
      notWhole: "Please enter a whole number, with no decimals.",
      range: {
        cycleLength: "Cycle length must be between 21 and 45 days.",
        scanWeeks: "Weeks must be between 4 and 42.",
        scanDays: "Days must be between 0 and 6.",
      },
    },
    trimesterNames: { first: "First trimester", second: "Second trimester", third: "Third trimester" },
    beyondShort: "More than 42 weeks (please check the dates)",
    ga: (weeks, days) =>
      `${weeks} ${weeks === 1 ? "week" : "weeks"}, ${days} ${days === 1 ? "day" : "days"}`,
    formatDate: (iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      return `${months[m - 1]} ${d}, ${y}`;
    },
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const S = STRINGS[lang];

// "Today" is the device's local civil date, read once as a civil
// date (never as a timestamp) exactly as SPEC section 5 allows.
const now = new Date();
const todayDay = daysFromCivil(now.getFullYear(), now.getMonth() + 1, now.getDate());
const todayIso = formatCivilDate(todayDay);

const FIELD_INPUT_IDS = {
  lmpDate: "lmp-date",
  cycleLength: "cycle-length",
  conceptionDate: "conception-date",
  scanDate: "scan-date",
  scanWeeks: "scan-weeks",
  scanDays: "scan-days",
};
const DATE_FIELDS = new Set(["lmpDate", "conceptionDate", "scanDate"]);
const MODE_FIELDS = {
  lmp: ["lmpDate", "cycleLength"],
  conception: ["conceptionDate"],
  ultrasound: ["scanDate", "scanWeeks", "scanDays"],
};
const COMPUTE = {
  lmp: (values) => computeFromLmp(values, todayDay),
  conception: (values) => computeFromConception(values, todayDay),
  ultrasound: (values) => computeFromUltrasound(values, todayDay),
};

const form = document.getElementById("calc-form");
const panels = {
  lmp: document.getElementById("panel-lmp"),
  conception: document.getElementById("panel-conception"),
  ultrasound: document.getElementById("panel-ultrasound"),
};
const resultEmpty = document.getElementById("result-empty");
const resultBody = document.getElementById("result-body");
const resultStale = document.getElementById("result-stale");
const outEdd = document.getElementById("out-edd");
const outToday = document.getElementById("out-today");
const outGa = document.getElementById("out-ga");
const outTrimester = document.getElementById("out-trimester");
const outBeyond = document.getElementById("out-beyond");
const trimesterCells = [
  [document.getElementById("t1-start"), document.getElementById("t1-end")],
  [document.getElementById("t2-start"), document.getElementById("t2-end")],
  [document.getElementById("t3-start"), document.getElementById("t3-end")],
];

// Per-mode session state: each mode keeps its own last valid result
// and whether the user has interacted with its fields. Field values
// themselves stay in the inputs, so switching modes restores them.
const modeState = {
  lmp: { result: null, touched: false },
  conception: { result: null, touched: false },
  ultrasound: { result: null, touched: false },
};
let activeMode = "lmp";

function currentMode() {
  const checked = form.querySelector('input[name="mode"]:checked');
  return checked ? checked.value : "lmp";
}

function errorText(field, code) {
  if (code === "range") return S.errors.range[field] ?? S.errors.invalidNumber;
  if (code === "invalid") return DATE_FIELDS.has(field) ? S.errors.invalidDate : S.errors.invalidNumber;
  return S.errors[code] ?? S.errors.invalidNumber;
}

function showErrors(mode, errors) {
  for (const field of MODE_FIELDS[mode]) {
    const input = document.getElementById(FIELD_INPUT_IDS[field]);
    const errorEl = document.getElementById(`err-${field}`);
    const code = errors ? errors[field] : undefined;
    if (code) {
      errorEl.textContent = errorText(field, code);
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", `err-${field}`);
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }
}

function renderResult(result, stale) {
  resultEmpty.hidden = true;
  resultBody.hidden = false;
  resultStale.hidden = !stale;
  outEdd.textContent = S.formatDate(result.edd);
  outToday.textContent = S.formatDate(todayIso);
  outGa.textContent = S.ga(result.gestationalWeeks, result.gestationalDays);
  if (result.beyondTerm) {
    outTrimester.textContent = S.beyondShort;
    outBeyond.hidden = false;
  } else {
    outTrimester.textContent = S.trimesterNames[result.trimester];
    outBeyond.hidden = true;
  }
  result.trimesters.forEach((trimester, index) => {
    trimesterCells[index][0].textContent = S.formatDate(trimester.start);
    trimesterCells[index][1].textContent = S.formatDate(trimester.end);
  });
}

function renderEmpty() {
  resultBody.hidden = true;
  resultEmpty.hidden = false;
}

function recompute(mode, { showErrors: shouldShowErrors }) {
  const values = {};
  for (const field of MODE_FIELDS[mode]) {
    values[field] = document.getElementById(FIELD_INPUT_IDS[field]).value;
  }
  const outcome = COMPUTE[mode](values);
  const state = modeState[mode];
  if (outcome.ok) {
    state.result = outcome.result;
    showErrors(mode, null);
    renderResult(outcome.result, false);
    return;
  }
  showErrors(mode, shouldShowErrors ? outcome.errors : null);
  if (state.result) {
    renderResult(state.result, true);
  } else {
    renderEmpty();
  }
}

function activateMode(mode) {
  activeMode = mode;
  for (const [name, panel] of Object.entries(panels)) {
    panel.hidden = name !== mode;
  }
  recompute(mode, { showErrors: modeState[mode].touched });
}

form.addEventListener("submit", (event) => event.preventDefault());

for (const radio of form.querySelectorAll('input[name="mode"]')) {
  radio.addEventListener("change", () => activateMode(currentMode()));
}

for (const [mode, fields] of Object.entries(MODE_FIELDS)) {
  for (const field of fields) {
    const input = document.getElementById(FIELD_INPUT_IDS[field]);
    if (DATE_FIELDS.has(field)) input.max = todayIso;
    const onEdit = () => {
      modeState[mode].touched = true;
      if (mode === activeMode) recompute(mode, { showErrors: true });
    };
    input.addEventListener("input", onEdit);
    input.addEventListener("change", onEdit);
  }
}

activateMode("lmp");
