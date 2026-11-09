// DOM wiring for the Mahjong Score Calculator. All user-visible
// text is set through textContent/value only; user input never
// becomes markup. Computation runs in a module Worker built from
// the fixed worker source embedded by the preview build
// (WORKER_SOURCE). The controller owns the draft, generation, and
// state machine; this file only renders it. The report download is
// created only on an explicit click, from the current success
// snapshot, and its object URL is revoked within 30 seconds or as
// soon as the result is invalidated.

import { createController } from "./controller.mjs";
import {
  ITEM_NAMES,
  OVERRIDABLE_CODES,
  REASON_NAMES,
  REPORT_FILENAME,
  SELECTABLE_CODES,
  buildReport,
} from "./core/mahjong.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const LANG = document.documentElement.lang === "en" ? "en" : "zh";

const STRINGS = {
  zh: {
    fieldLabel: {
      winMethod: "胡牌方式",
      winnerIsDealer: "胡牌者是莊家",
      discarderIsDealer: "放槍者是莊家",
      dealerStreak: "連莊次數",
      base: "底",
      perTai: "每台金額",
      cap: "台數上限",
      selected: "牌型勾選",
      honorFlowers: "正花朵數",
      offFlowers: "偏花朵數",
      kongCount: "槓數",
      overrides: "自訂台數",
    },
    error: {
      SCHEMA: "輸入格式不正確",
      INPUT_LIMIT: "輸入太長（最多 8 字元）",
      ENUM: "選項不在允許範圍內",
      EMPTY: "此欄不可空白",
      INTEGER_FORMAT: "請輸入整數（ASCII 數字、不可有前導零）",
      RANGE: "數值超出允許範圍",
      FLOWER_LIMIT: "正花與偏花合計不得超過 8 朵",
      CONFLICT: "勾選內容互相衝突",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限",
    },
    errorRange: {
      base: "底須在 0–100000 元之間",
      perTai: "每台金額須在 0–10000 元之間",
      dealerStreak: "連莊次數須在 0–8 之間",
      honorFlowers: "正花朵數須在 0–8 之間",
      offFlowers: "偏花朵數須在 0–8 之間",
      kongCount: "槓數須在 0–4 之間",
    },
    statusEmpty: "尚未計算。勾選牌型與情境，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（合成案例），請按「計算台數與金額」執行。",
    noScoringItems: "沒有計台項目",
    summaryTotal: "總台數",
    summaryDealer: "其中莊家台",
    summaryPaid: "計付台數",
    summaryCapped: "（已封頂）",
    summaryUnit: "每單位金額（底＋計付台×每台）",
    summaryFromEach: "三家各付",
    summaryFromDiscarder: "放槍者付",
    summaryReceived: "胡牌者共收",
    excludedHeading: "未計台項目",
    flowersEcho: (honor, off, kongs) => `正花 ${honor} 朵 · 偏花 ${off} 朵 · 槓 ${kongs}`,
    taiUnit: "台",
    moneyUnit: "元",
    countSuffix: (count) => `×${count} 朵`,
  },
  en: {
    fieldLabel: {
      winMethod: "Win method",
      winnerIsDealer: "Winner is dealer",
      discarderIsDealer: "Discarder is dealer",
      dealerStreak: "Dealer streak",
      base: "Base",
      perTai: "Amount per tai",
      cap: "Tai cap",
      selected: "Pattern selections",
      honorFlowers: "Honor flowers",
      offFlowers: "Off flowers",
      kongCount: "Kong count",
      overrides: "Custom tai",
    },
    error: {
      SCHEMA: "The input shape is not valid",
      INPUT_LIMIT: "Input is too long (8 characters at most)",
      ENUM: "The option is not one of the allowed values",
      EMPTY: "This field must not be empty",
      INTEGER_FORMAT: "Enter an integer (ASCII digits, no leading zero)",
      RANGE: "The value is outside the allowed range",
      FLOWER_LIMIT: "Honor and off flowers together must not exceed 8",
      CONFLICT: "The selections conflict with each other",
      INTERNAL: "Processing failed. Please try again.",
      WORKER_ERROR: "Processing failed. Please try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit",
    },
    errorRange: {
      base: "Base must be between 0 and 100,000",
      perTai: "Amount per tai must be between 0 and 10,000",
      dealerStreak: "Dealer streak must be between 0 and 8",
      honorFlowers: "Honor flowers must be between 0 and 8",
      offFlowers: "Off flowers must be between 0 and 8",
      kongCount: "Kong count must be between 0 and 4",
    },
    statusEmpty: "Not calculated yet. Select the hand's patterns, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (a synthetic case). Press “Calculate tai & payout” to run it.",
    noScoringItems: "No scoring items",
    summaryTotal: "Total tai",
    summaryDealer: "of which dealer tai",
    summaryPaid: "Paid tai",
    summaryCapped: " (capped)",
    summaryUnit: "Unit amount (base + paid tai × per-tai)",
    summaryFromEach: "Each of the three opponents pays",
    summaryFromDiscarder: "The discarder pays",
    summaryReceived: "Winner receives in total",
    excludedHeading: "Items not counted",
    flowersEcho: (honor, off, kongs) => `Honor flowers ${honor} · Off flowers ${off} · Kongs ${kongs}`,
    taiUnit: " tai",
    moneyUnit: "",
    countSuffix: (count) => `×${count}`,
  },
};
const T = STRINGS[LANG];

const form = document.getElementById("score-form");
const statusEl = document.getElementById("status");
const exampleNoteEl = document.getElementById("example-note");
const errorBoxEl = document.getElementById("error-box");
const errorTextEl = document.getElementById("error-text");
const resultsEl = document.getElementById("results");
const summaryRowsEl = document.getElementById("summary-rows");
const linesBodyEl = document.getElementById("result-lines");
const noItemsEl = document.getElementById("no-items");
const excludedBlockEl = document.getElementById("excluded-block");
const excludedListEl = document.getElementById("excluded-list");
const flowersEchoEl = document.getElementById("flowers-echo");
const runBtn = document.getElementById("run-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");

function el(id) {
  return document.getElementById(id);
}

function fieldControlId(field) {
  if (field === null || field === undefined) return null;
  if (field.startsWith("selected/")) return `sel-${field.slice("selected/".length)}`;
  if (field.startsWith("overrides/")) return `ovr-${field.slice("overrides/".length)}`;
  switch (field) {
    case "winMethod":
      return "win-self-draw";
    case "winnerIsDealer":
      return "winner-dealer";
    case "discarderIsDealer":
      return "discarder-dealer";
    case "dealerStreak":
      return "dealer-streak";
    case "base":
      return "base";
    case "perTai":
      return "per-tai";
    case "cap":
      return "cap";
    case "selected":
      return "sel-ALL_HONORS";
    case "honorFlowers":
      return "honor-flowers";
    case "offFlowers":
      return "off-flowers";
    case "kongCount":
      return "kong-count";
    case "overrides":
      return "ovr-PING_HU";
    default:
      // Conflict fields are scoring item codes.
      return `sel-${field}`;
  }
}

function fieldLabel(field) {
  if (field === null || field === undefined) return "";
  if (field.startsWith("selected/")) return ITEM_NAMES[field.slice("selected/".length)]?.[LANG] ?? field;
  if (field.startsWith("overrides/")) {
    const code = field.slice("overrides/".length);
    const name = code === "HONOR_FLOWER_EACH" ? (LANG === "en" ? "Each honor flower" : "正花每朵") : ITEM_NAMES[code]?.[LANG];
    return `${T.fieldLabel.overrides}：${name ?? code}`;
  }
  if (T.fieldLabel[field]) return T.fieldLabel[field];
  if (ITEM_NAMES[field]) return ITEM_NAMES[field][LANG];
  return field;
}

function errorMessage(error) {
  if (error.code === "CONFLICT") {
    return `${T.error.CONFLICT}：${fieldLabel(error.field)}`;
  }
  if (error.code === "RANGE" && error.field && T.errorRange[error.field]) {
    return `${fieldLabel(error.field)}：${T.errorRange[error.field]}`;
  }
  const base = T.error[error.code] ?? T.error.INTERNAL;
  return error.field ? `${fieldLabel(error.field)}：${base}` : base;
}

function readDraft() {
  const selected = {};
  for (const code of SELECTABLE_CODES) {
    if (el(`sel-${code}`).checked) selected[code] = true;
  }
  const overrides = {};
  for (const code of OVERRIDABLE_CODES) {
    const value = el(`ovr-${code}`).value;
    if (value !== "") overrides[code] = value;
  }
  return {
    winMethod: form.querySelector('input[name="winMethod"]:checked').value,
    winnerIsDealer: el("winner-dealer").checked,
    discarderIsDealer: el("discarder-dealer").checked,
    dealerStreak: el("dealer-streak").value,
    base: el("base").value,
    perTai: el("per-tai").value,
    cap: el("cap").value,
    selected,
    honorFlowers: el("honor-flowers").value,
    offFlowers: el("off-flowers").value,
    kongCount: el("kong-count").value,
    overrides,
  };
}

function writeDraft(draft) {
  for (const radio of form.querySelectorAll('input[name="winMethod"]')) {
    radio.checked = radio.value === draft.winMethod;
  }
  el("winner-dealer").checked = draft.winnerIsDealer === true;
  el("discarder-dealer").checked = draft.discarderIsDealer === true;
  el("dealer-streak").value = draft.dealerStreak;
  el("base").value = draft.base;
  el("per-tai").value = draft.perTai;
  el("cap").value = draft.cap;
  for (const code of SELECTABLE_CODES) {
    el(`sel-${code}`).checked = draft.selected?.[code] === true;
  }
  el("honor-flowers").value = draft.honorFlowers;
  el("off-flowers").value = draft.offFlowers;
  el("kong-count").value = draft.kongCount;
  for (const code of OVERRIDABLE_CODES) {
    el(`ovr-${code}`).value = draft.overrides?.[code] ?? "";
  }
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

let workerUrl = null;
function createWorker() {
  if (workerUrl === null) {
    const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
    workerUrl = URL.createObjectURL(blob);
  }
  return new Worker(workerUrl, { type: "module" });
}

let reportUrl = null;
let reportTimer = null;
function revokeReportUrl() {
  if (reportTimer !== null) {
    clearTimeout(reportTimer);
    reportTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

let previousState = "empty";

function clearFieldErrors() {
  for (const node of form.querySelectorAll(".field-error")) node.textContent = "";
  for (const node of form.querySelectorAll("[aria-invalid='true']")) node.removeAttribute("aria-invalid");
}

function showFieldError(error) {
  const controlId = fieldControlId(error.field);
  if (controlId === null) return;
  const control = el(controlId);
  const slot = el(`error-for-${controlId}`);
  if (slot) slot.textContent = errorMessage(error);
  if (control) control.setAttribute("aria-invalid", "true");
}

function summaryRow(term, value) {
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  dd.textContent = value;
  summaryRowsEl.append(dt, dd);
}

function renderResult(result) {
  summaryRowsEl.replaceChildren();
  summaryRow(T.summaryTotal, `${result.totalTai}${T.taiUnit}`);
  summaryRow(T.summaryDealer, `${result.dealerTai}${T.taiUnit}`);
  summaryRow(T.summaryPaid, `${result.paidTai}${T.taiUnit}${result.capped ? T.summaryCapped : ""}`);
  summaryRow(T.summaryUnit, `${result.payout.unitAmount}${T.moneyUnit ? ` ${T.moneyUnit}` : ""}`);
  if (result.payout.winMethod === "self-draw") {
    summaryRow(T.summaryFromEach, `${result.payout.fromEachOpponent}${T.moneyUnit ? ` ${T.moneyUnit}` : ""}`);
  } else {
    summaryRow(T.summaryFromDiscarder, `${result.payout.fromDiscarder}${T.moneyUnit ? ` ${T.moneyUnit}` : ""}`);
  }
  summaryRow(T.summaryReceived, `${result.payout.totalReceived}${T.moneyUnit ? ` ${T.moneyUnit}` : ""}`);

  flowersEchoEl.textContent = T.flowersEcho(result.flowers.honor, result.flowers.off, result.kongs);

  linesBodyEl.replaceChildren();
  for (const line of result.lines) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent =
      ITEM_NAMES[line.code][LANG] + (line.count !== undefined ? ` ${T.countSuffix(line.count)}` : "");
    const taiCell = document.createElement("td");
    taiCell.textContent = String(line.tai);
    tr.append(nameCell, taiCell);
    linesBodyEl.append(tr);
  }
  noItemsEl.hidden = result.lines.length > 0;
  if (result.lines.length === 0) noItemsEl.textContent = T.noScoringItems;

  excludedListEl.replaceChildren();
  for (const item of result.excluded) {
    const li = document.createElement("li");
    li.textContent = `✕ ${ITEM_NAMES[item.code][LANG]} — ${REASON_NAMES[item.reason][LANG]}`;
    excludedListEl.append(li);
  }
  excludedBlockEl.hidden = result.excluded.length === 0;
}

function render(state) {
  // Keep the form in sync after loadExample/reset without clobbering
  // in-progress typing (after an edit the draft equals the form).
  if (canonical(readDraft()) !== canonical(state.draft)) writeDraft(state.draft);
  el("discarder-dealer").disabled = state.draft.winMethod !== "discard";

  statusEl.setAttribute("aria-busy", state.state === "busy" ? "true" : "false");
  if (state.state === "empty") statusEl.textContent = T.statusEmpty;
  else if (state.state === "dirty") statusEl.textContent = T.statusDirty;
  else if (state.state === "busy") statusEl.textContent = T.statusBusy;
  else if (state.state === "cancelled") statusEl.textContent = T.statusCancelled;
  else statusEl.textContent = "";

  exampleNoteEl.hidden = !state.isExample;
  if (state.isExample) exampleNoteEl.textContent = T.exampleNote;

  runBtn.disabled = state.state === "busy";
  cancelBtn.hidden = state.state !== "busy";

  clearFieldErrors();
  if (state.state === "error" && state.error) {
    errorTextEl.textContent = errorMessage(state.error);
    errorBoxEl.hidden = false;
    showFieldError(state.error);
    // Only a failed submission moves focus to the first error field.
    if (previousState === "busy") {
      const controlId = fieldControlId(state.error.field);
      if (controlId !== null) el(controlId)?.focus();
    }
  } else {
    errorBoxEl.hidden = true;
    errorTextEl.textContent = "";
  }

  if (state.reportAvailable && state.result) {
    renderResult(state.result);
    resultsEl.hidden = false;
    downloadBtn.disabled = false;
  } else {
    resultsEl.hidden = true;
    downloadBtn.disabled = true;
    revokeReportUrl();
  }
  previousState = state.state;
}

const controller = createController({ createWorker, onChange: render });

form.addEventListener("input", () => controller.edit(readDraft()));
form.addEventListener("change", () => controller.edit(readDraft()));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  controller.run();
});
el("example-btn").addEventListener("click", () => controller.loadExample());
el("reset-btn").addEventListener("click", () => {
  controller.reset();
  el("win-discard").focus();
});
cancelBtn.addEventListener("click", () => controller.cancel());
downloadBtn.addEventListener("click", () => {
  const state = controller.getState();
  if (!state.reportAvailable || !state.result) return;
  const report = buildReport(state.result);
  if (!report.ok) return;
  revokeReportUrl();
  const blob = new Blob([report.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  reportTimer = setTimeout(revokeReportUrl, 30000);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
});
window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeReportUrl();
  if (workerUrl !== null) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
});

render(controller.getState());
