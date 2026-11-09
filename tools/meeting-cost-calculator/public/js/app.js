// DOM wiring for the Meeting Cost Calculator. All validation and math live
// in ./core/; this file only moves strings between the form, the core and
// the result tables. User input reaches the page exclusively through
// textContent and input values — never as markup. The live cost is always
// recomputed from the total elapsed time (SPEC section 4); nothing here
// accumulates money per tick.

import {
  computeForElapsedMs,
  computeForMinutes,
  formatCentsPlain,
  formatMoney,
  formatElapsed,
  parseDuration,
  presetRateCents,
  timerElapsedMs,
  timerIsRunning,
  timerPause,
  timerReset,
  timerStart,
  createTimerState,
  validateRoster,
} from "./core/calculator.mjs";
import { MAX_GROUPS, MIN_GROUPS, PRESETS, currencySymbol } from "./core/data.mjs";

const LANG = document.documentElement.lang.startsWith("zh") ? "zh" : "en";

const STRINGS = {
  zh: {
    groupLegend: (n) => `群組 ${n}`,
    headcountLabel: "人數（整數 1–100）",
    rateLabel: "時薪（0–100,000，最多小數兩位）",
    presetLabel: "年薪預設（示意，填入後可改）",
    customOption: "自訂（直接輸入時薪）",
    presetOption: (annual, label) => `年薪 ${annual.toLocaleString("en-US")}（${label}）`,
    removeGroup: "移除此群組",
    announceStarted: "計時開始。",
    announcePaused: "計時已暫停，時間與成本凍結。",
    announceResumed: "計時繼續。",
    announceReset: "計時已歸零。",
    announceStale: "輸入有誤，結果已過時，計時仍在累計。",
    errors: {
      required: "此欄必填。",
      "not-a-number": "請輸入數字。",
      "not-whole": "必須是整數。",
      "too-many-decimals": "小數位數過多，最多兩位。",
      "out-of-range": "超出允許範圍。",
      "duration-out-of-range": "總時長必須介於 1 到 1,440 分鐘（24 小時需搭配 0 分鐘）。",
      "group-count": "群組數量必須介於一到五組。",
    },
  },
  en: {
    groupLegend: (n) => `Group ${n}`,
    headcountLabel: "Headcount (whole, 1–100)",
    rateLabel: "Hourly rate (0–100,000, at most two decimals)",
    presetLabel: "Annual-salary preset (illustrative; editable after filling)",
    customOption: "Custom (type the rate)",
    presetOption: (annual, label) => `Annual ${annual.toLocaleString("en-US")} (${label})`,
    removeGroup: "Remove this group",
    announceStarted: "Timer started.",
    announcePaused: "Timer paused; elapsed time and cost are frozen.",
    announceResumed: "Timer resumed.",
    announceReset: "Timer reset to zero.",
    announceStale: "Invalid input; results are out of date. The timer keeps accumulating.",
    errors: {
      required: "This field is required.",
      "not-a-number": "Enter a number.",
      "not-whole": "Must be a whole number.",
      "too-many-decimals": "Too many decimal places; at most two allowed.",
      "out-of-range": "Outside the allowed range.",
      "duration-out-of-range": "Total duration must be between 1 and 1,440 minutes (24 hours requires 0 minutes).",
      "group-count": "Between one and five groups are required.",
    },
  },
};
const S = STRINGS[LANG];

const state = {
  mode: "manual",
  currency: "USD",
  groups: [{ headcount: "5", rate: "40.00", preset: "custom" }],
  hours: "1",
  minutes: "0",
  timer: createTimerState(),
  lastValid: null,
  stale: false,
};

const $ = (id) => document.getElementById(id);
const els = {
  groups: $("groups"),
  addGroup: $("add-group"),
  groupLimitNote: $("group-limit-note"),
  currency: $("currency"),
  modeManual: $("mode-manual"),
  modeTimer: $("mode-timer"),
  manualPanel: $("manual-panel"),
  timerPanel: $("timer-panel"),
  hours: $("hours"),
  minutes: $("minutes"),
  errHours: $("err-hours"),
  errMinutes: $("err-minutes"),
  errDuration: $("err-duration"),
  elapsed: $("elapsed"),
  btnStart: $("btn-start"),
  btnPause: $("btn-pause"),
  btnResume: $("btn-resume"),
  btnReset: $("btn-reset"),
  staleNote: $("stale-note"),
  outBurn: $("out-burn"),
  outPerMinute: $("out-per-minute"),
  outTotal: $("out-total"),
  breakdownBody: $("breakdown-body"),
  announcer: $("announcer"),
};

function announce(message) {
  els.announcer.textContent = message;
}

function errorText(code) {
  return code ? S.errors[code] ?? code : "";
}

// ---------------------------------------------------------------------------
// Group blocks (built with DOM APIs; user text is never parsed as markup).

function buildGroupBlock(index) {
  const group = state.groups[index];
  const fieldset = document.createElement("fieldset");
  fieldset.className = "group-block";
  fieldset.dataset.index = String(index);

  const legend = document.createElement("legend");
  legend.textContent = S.groupLegend(index + 1);
  fieldset.append(legend);

  const makeField = (key, labelText, inputMode) => {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const id = `g${index}-${key}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = "text";
    input.inputMode = inputMode;
    input.autocomplete = "off";
    input.value = group[key];
    input.dataset.groupField = key;
    const error = document.createElement("p");
    error.className = "error";
    error.id = `err-g${index}-${key}`;
    error.hidden = true;
    input.setAttribute("aria-describedby", error.id);
    wrap.append(label, input, error);
    return wrap;
  };

  fieldset.append(makeField("headcount", S.headcountLabel, "numeric"));
  fieldset.append(makeField("rate", S.rateLabel, "decimal"));

  const presetWrap = document.createElement("div");
  presetWrap.className = "field";
  const presetId = `g${index}-preset`;
  const presetLabel = document.createElement("label");
  presetLabel.htmlFor = presetId;
  presetLabel.textContent = S.presetLabel;
  const select = document.createElement("select");
  select.id = presetId;
  select.name = presetId;
  select.dataset.groupField = "preset";
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = S.customOption;
  select.append(custom);
  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = String(preset.annual);
    option.textContent = S.presetOption(preset.annual, preset.label);
    select.append(option);
  }
  select.value = group.preset;
  presetWrap.append(presetLabel, select);
  fieldset.append(presetWrap);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-group";
  remove.dataset.removeGroup = String(index);
  remove.textContent = S.removeGroup;
  remove.disabled = state.groups.length <= MIN_GROUPS;
  fieldset.append(remove);

  return fieldset;
}

function renderGroups() {
  const blocks = state.groups.map((_, i) => buildGroupBlock(i));
  els.groups.replaceChildren(...blocks);
  els.addGroup.disabled = state.groups.length >= MAX_GROUPS;
  els.groupLimitNote.hidden = state.groups.length < MAX_GROUPS;
}

// ---------------------------------------------------------------------------
// Output rendering. A compute result carries exact BigInt rationals; texts
// are formatted at render time so a currency change re-symbols even a
// frozen (stale) result without recomputing it.

function renderResult(result) {
  const symbol = currencySymbol(state.currency) ?? "";
  els.outBurn.textContent = formatMoney({ num: result.burnCents, den: 1n }, symbol);
  els.outPerMinute.textContent = formatMoney(result.costPerMinute, symbol);
  els.outTotal.textContent = formatMoney(result.total, symbol);
  const rows = result.rows.map((row, i) => {
    const tr = document.createElement("tr");
    const cells = [
      S.groupLegend(i + 1),
      String(row.headcount),
      formatMoney({ num: BigInt(row.rateCents), den: 1n }, symbol),
      formatMoney(row.perPerson, symbol),
      formatMoney(row.subtotal, symbol),
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    return tr;
  });
  els.breakdownBody.replaceChildren(...rows);
}

function setFieldError(inputId, errorId, code) {
  const input = $(inputId);
  const error = $(errorId);
  if (!input || !error) return;
  if (code) {
    error.textContent = errorText(code);
    error.hidden = false;
    input.setAttribute("aria-invalid", "true");
  } else {
    error.textContent = "";
    error.hidden = true;
    input.removeAttribute("aria-invalid");
  }
}

function refreshOutputs() {
  const roster = validateRoster(state.groups);

  // Per-field roster errors.
  if (roster.errors?.fields) {
    roster.errors.fields.forEach((fieldError, i) => {
      setFieldError(`g${i}-headcount`, `err-g${i}-headcount`, fieldError.headcount);
      setFieldError(`g${i}-rate`, `err-g${i}-rate`, fieldError.rate);
    });
  } else {
    state.groups.forEach((_, i) => {
      setFieldError(`g${i}-headcount`, `err-g${i}-headcount`, null);
      setFieldError(`g${i}-rate`, `err-g${i}-rate`, null);
    });
  }

  let result = null;
  if (state.mode === "manual") {
    const duration = parseDuration(state.hours, state.minutes);
    setFieldError("hours", "err-hours", duration.ok ? null : duration.errors.hours);
    setFieldError("minutes", "err-minutes", duration.ok ? null : duration.errors.minutes);
    if (!duration.ok && duration.errors.duration) {
      els.errDuration.textContent = errorText(duration.errors.duration);
      els.errDuration.hidden = false;
    } else {
      els.errDuration.textContent = "";
      els.errDuration.hidden = true;
    }
    if (roster.ok && duration.ok) {
      result = computeForMinutes(roster.groups, duration.value, currencySymbol(state.currency));
    }
  } else if (roster.ok) {
    const elapsedMs = timerElapsedMs(state.timer, performance.now());
    result = computeForElapsedMs(roster.groups, elapsedMs, currencySymbol(state.currency));
  }

  if (result) {
    state.lastValid = result;
    if (state.stale) state.stale = false;
    renderResult(result);
  } else if (state.lastValid) {
    if (!state.stale) {
      state.stale = true;
      announce(S.announceStale);
    }
    renderResult(state.lastValid);
  }
  els.staleNote.hidden = !state.stale;
  els.elapsed.textContent = formatElapsed(
    timerElapsedMs(state.timer, performance.now()),
  );
  syncTimerButtons();
}

function syncTimerButtons() {
  const running = timerIsRunning(state.timer);
  const hasElapsed = state.timer.accumulatedMs > 0;
  els.btnStart.hidden = running || hasElapsed;
  els.btnPause.hidden = !running;
  els.btnResume.hidden = running || !hasElapsed;
}

// ---------------------------------------------------------------------------
// Events.

els.groups.addEventListener("input", (event) => {
  const input = event.target;
  const block = input.closest("[data-index]");
  if (!block) return;
  const index = Number(block.dataset.index);
  const field = input.dataset.groupField;
  if (field === "headcount" || field === "rate") {
    state.groups[index][field] = input.value;
    if (field === "rate" && state.groups[index].preset !== "custom") {
      state.groups[index].preset = "custom";
      const select = $(`g${index}-preset`);
      if (select) select.value = "custom";
    }
    refreshOutputs();
  }
});

els.groups.addEventListener("change", (event) => {
  const select = event.target;
  if (select.dataset.groupField !== "preset") return;
  const block = select.closest("[data-index]");
  const index = Number(block.dataset.index);
  state.groups[index].preset = select.value;
  if (select.value !== "custom") {
    const filled = formatCentsPlain(presetRateCents(Number(select.value)));
    state.groups[index].rate = filled;
    const rateInput = $(`g${index}-rate`);
    if (rateInput) rateInput.value = filled;
  }
  refreshOutputs();
});

els.groups.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-group]");
  if (!button) return;
  const index = Number(button.dataset.removeGroup);
  if (state.groups.length <= MIN_GROUPS) return;
  state.groups.splice(index, 1);
  renderGroups();
  refreshOutputs();
});

els.addGroup.addEventListener("click", () => {
  if (state.groups.length >= MAX_GROUPS) return;
  state.groups.push({ headcount: "", rate: "", preset: "custom" });
  renderGroups();
  refreshOutputs();
});

els.currency.addEventListener("change", () => {
  state.currency = els.currency.value;
  refreshOutputs();
});

for (const [input, key] of [
  [els.hours, "hours"],
  [els.minutes, "minutes"],
]) {
  input.addEventListener("input", () => {
    state[key] = input.value;
    refreshOutputs();
  });
}

function setMode(mode) {
  state.mode = mode;
  els.modeManual.setAttribute("aria-pressed", String(mode === "manual"));
  els.modeTimer.setAttribute("aria-pressed", String(mode === "timer"));
  els.manualPanel.hidden = mode !== "manual";
  els.timerPanel.hidden = mode !== "timer";
  refreshOutputs();
}
els.modeManual.addEventListener("click", () => setMode("manual"));
els.modeTimer.addEventListener("click", () => setMode("timer"));

els.btnStart.addEventListener("click", () => {
  timerStart(state.timer, performance.now());
  announce(S.announceStarted);
  refreshOutputs();
});
els.btnPause.addEventListener("click", () => {
  timerPause(state.timer, performance.now());
  announce(S.announcePaused);
  refreshOutputs();
});
els.btnResume.addEventListener("click", () => {
  timerStart(state.timer, performance.now());
  announce(S.announceResumed);
  refreshOutputs();
});
els.btnReset.addEventListener("click", () => {
  timerReset(state.timer);
  announce(S.announceReset);
  refreshOutputs();
});

// Display refresh: at least once per second while the timer is relevant.
// The cost is recomputed from total elapsed on every refresh — never
// incremented — and a hidden tab simply catches up on the next refresh,
// because the base is monotonic (SPEC section 4).
setInterval(() => {
  if (state.mode === "timer") refreshOutputs();
}, 250);

renderGroups();
refreshOutputs();
