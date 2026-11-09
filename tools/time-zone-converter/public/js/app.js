// DOM wiring for the Time Zone Converter. All conversion and validation
// lives in ./core/convert.mjs; this file only reads native controls, calls
// the core, and renders exclusively with textContent, so nothing the user
// enters can ever become markup.

import { ZONES, checkAddTarget, convert } from "./core/convert.mjs";

const STRINGS = {
  zh: {
    remove: "移除",
    removeLabel: (zone) => `移除目標時區 ${zone}`,
    dayWords: { "-1": "前一天", "0": "同一天", "1": "隔天" },
    fieldErrors: {
      "invalid-date": "日期無效：請輸入真實存在的日期。",
      "date-out-of-range": "日期超出範圍：僅支援 2000-01-01 到 2099-12-31。",
      "invalid-time": "時間無效：請用 24 小時制 HH:MM。",
      "unknown-zone": "時區無效：請從清單中選取。",
    },
    duplicateNote: (zone) => `「${zone}」已經在目標清單裡了，沒有重複加入。`,
    tooManyNote: "目標時區最多 20 個，無法再加入。",
    unknownNote: "請從清單中選取時區。",
    gapBanner: ({ date, time, zone, jump, resolved }) =>
      `注意：你輸入的 ${date} ${time} 在來源時區 ${zone} 當天不存在——時鐘在這天會直接跳過這段時間（前跳 ${jump} 分鐘）。本工具已將它順延到跳過之後的 ${resolved.date} ${resolved.time}，並以此換算。`,
    overlapBanner: ({ date, time, zone }) =>
      `注意：你輸入的 ${date} ${time} 在來源時區 ${zone} 當天會出現兩次（時鐘倒退、時間重複）。本工具採用較早的那一次換算。`,
  },
  en: {
    remove: "Remove",
    removeLabel: (zone) => `Remove target zone ${zone}`,
    dayWords: { "-1": "previous day", "0": "same day", "1": "next day" },
    fieldErrors: {
      "invalid-date": "Invalid date: please enter a date that exists.",
      "date-out-of-range": "Date out of range: only 2000-01-01 to 2099-12-31 is supported.",
      "invalid-time": "Invalid time: please use 24-hour HH:MM.",
      "unknown-zone": "Invalid time zone: please pick one from the list.",
    },
    duplicateNote: (zone) => `${zone} is already in the target list; it was not added twice.`,
    tooManyNote: "At most 20 target zones are allowed; nothing more was added.",
    unknownNote: "Please pick a time zone from the list.",
    gapBanner: ({ date, time, zone, jump, resolved }) =>
      `Note: the local time you entered, ${date} ${time}, does not occur in the source zone ${zone} on that date — the clocks jump straight over it (a jump of ${jump} minutes). It has been shifted forward to ${resolved.date} ${resolved.time}, and the conversion uses that resolved time.`,
    overlapBanner: ({ date, time, zone }) =>
      `Note: the local time you entered, ${date} ${time}, occurs twice in the source zone ${zone} on that date (the clocks go back and the hour repeats). The earlier occurrence is used.`,
  },
};

const lang = document.documentElement.lang.startsWith("en") ? "en" : "zh";
const t = STRINGS[lang];

const DEFAULT_SOURCE = "Asia/Taipei";
const DEFAULT_TARGETS = [
  "America/New_York",
  "Europe/London",
  "Australia/Sydney",
  "Asia/Kathmandu",
];

const elements = {
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  sourceZone: document.getElementById("source-zone"),
  targetZone: document.getElementById("target-zone"),
  addTarget: document.getElementById("add-target"),
  targetNote: document.getElementById("target-note"),
  targetList: document.getElementById("target-list"),
  fieldError: document.getElementById("field-error"),
  utcInstant: document.getElementById("utc-instant"),
  banner: document.getElementById("banner"),
  staleNote: document.getElementById("stale-note"),
  tableWrap: document.getElementById("table-wrap"),
  resultRows: document.getElementById("result-rows"),
  emptyPrompt: document.getElementById("empty-prompt"),
};

const state = { targets: [...DEFAULT_TARGETS] };
let hasValidResult = false;

function fillZoneSelect(select, selected) {
  for (const zone of ZONES) {
    const option = document.createElement("option");
    option.value = zone;
    option.textContent = zone;
    select.append(option);
  }
  select.value = selected;
}

function dayShiftText(shift) {
  const marker = shift > 0 ? "+1" : shift < 0 ? "-1" : "0";
  return `${t.dayWords[String(shift)]} (${marker})`;
}

function renderTargetList() {
  elements.targetList.replaceChildren();
  for (const zone of state.targets) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = zone;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = t.remove;
    button.setAttribute("aria-label", t.removeLabel(zone));
    button.addEventListener("click", () => {
      state.targets = state.targets.filter((entry) => entry !== zone);
      elements.targetNote.textContent = "";
      renderTargetList();
      render();
    });
    item.append(name, button);
    elements.targetList.append(item);
  }
}

function renderRows(rows) {
  elements.resultRows.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const cells = [row.zone, row.date, row.time, row.offset, dayShiftText(row.dayShift)];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    elements.resultRows.append(tr);
  }
}

function render() {
  const input = {
    date: elements.date.value,
    time: elements.time.value,
    zone: elements.sourceZone.value,
    targets: [...state.targets],
  };
  const result = convert(input);

  if (!result.ok) {
    // SPEC section 3: a field error freezes the table at its last valid
    // state, marked out of date. The inputs keep what the user typed.
    elements.fieldError.textContent =
      t.fieldErrors[result.error] ?? t.fieldErrors["invalid-date"];
    elements.fieldError.hidden = false;
    if (hasValidResult) {
      elements.staleNote.hidden = false;
      elements.tableWrap.classList.add("is-stale");
    }
    return;
  }

  hasValidResult = true;

  elements.fieldError.hidden = true;
  elements.fieldError.textContent = "";
  elements.staleNote.hidden = true;
  elements.tableWrap.classList.remove("is-stale");

  elements.utcInstant.textContent = `${result.utc.date} ${result.utc.time} UTC`;

  if (result.kind === "gap") {
    elements.banner.textContent = t.gapBanner({
      date: input.date,
      time: input.time,
      zone: input.zone,
      jump: result.jumpMinutes,
      resolved: result.resolvedReading,
    });
    elements.banner.hidden = false;
  } else if (result.kind === "overlap") {
    elements.banner.textContent = t.overlapBanner({
      date: input.date,
      time: input.time,
      zone: input.zone,
    });
    elements.banner.hidden = false;
  } else {
    elements.banner.hidden = true;
    elements.banner.textContent = "";
  }

  if (state.targets.length === 0) {
    elements.tableWrap.hidden = true;
    elements.emptyPrompt.hidden = false;
  } else {
    elements.tableWrap.hidden = false;
    elements.emptyPrompt.hidden = true;
    renderRows(result.rows);
  }
}

function onAddTarget() {
  const zone = elements.targetZone.value;
  const check = checkAddTarget(state.targets, zone);
  if (!check.ok) {
    if (check.error === "duplicate-target") {
      elements.targetNote.textContent = t.duplicateNote(zone);
    } else if (check.error === "too-many-targets") {
      elements.targetNote.textContent = t.tooManyNote;
    } else {
      elements.targetNote.textContent = t.unknownNote;
    }
    return;
  }
  elements.targetNote.textContent = "";
  state.targets.push(zone);
  renderTargetList();
  render();
}

fillZoneSelect(elements.sourceZone, DEFAULT_SOURCE);
fillZoneSelect(elements.targetZone, ZONES[0]);
renderTargetList();
render();

for (const control of [elements.date, elements.time, elements.sourceZone]) {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
}
elements.addTarget.addEventListener("click", onAddTarget);
