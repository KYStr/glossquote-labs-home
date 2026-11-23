// DOM wiring for the Poker Odds Calculator. All user-visible text
// is set through textContent/value only; user input never becomes
// markup. Computation runs in a module Worker built from the fixed
// worker source embedded by the preview build (WORKER_SOURCE). The
// controller owns the draft, generation, and state machine; this file
// only renders it. The fixed report download
// (poker-odds-calculator-report.json) is created only on an explicit
// click, from the current success snapshot, and its Blob URL is
// revoked within 30 seconds or as soon as the result is invalidated.
// Card fields are text inputs; they are split on whitespace/commas
// into card-code arrays for the core, and shown joined with spaces.

import { createController } from "./controller.mjs";
import {
  CATEGORY_NAMES,
  FIELDS,
  ROYAL_FLUSH_NAMES,
  buildReport,
  evaluateHand,
} from "./core/poker-odds.mjs";
import { WORKER_SOURCE } from "./worker-source.js";

const SUIT_SYMBOLS = { s: "♠", h: "♥", d: "♦", c: "♣" };

const STRINGS = {
  "zh-Hant": {
    fieldLabel: {
      holeCards: "手牌",
      boardCards: "公共牌",
      opponents: "對手人數",
      pot: "底池",
      toCall: "跟注額",
    },
    error: {
      SCHEMA: "輸入格式錯誤",
      INPUT_LIMIT: "輸入過長",
      UNICODE: "輸入含有不成對的字元",
      EMPTY: "請填寫此欄",
      CARD_FORMAT: "牌碼格式錯誤，例如 As、Kh、Td",
      CARD_COUNT: "牌張數錯誤：手牌須為 2 張，公共牌須為 0、3、4 或 5 張",
      DUPLICATE_CARD: "有重複的牌",
      INTEGER_FORMAT: "請輸入整數",
      RANGE: "數值超出範圍",
      INTERNAL: "處理失敗，請重試",
      WORKER_ERROR: "處理失敗，請重試",
      OUTPUT_LIMIT: "報告超過大小上限，無法下載",
    },
    statusEmpty: "尚未計算。輸入手牌與公共牌，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    exampleNote: "已載入範例（同花聽牌 As Ks 對 Qs 7s 2c），請按「計算勝率」執行。",
    downloaded: "報告已下載。",
    fieldErrorJoiner: "：",
    labelCurrentHand: "目前成牌",
    labelHoleCards: "手牌",
    labelBoardCards: "公共牌",
    labelOuts: "outs",
    labelHitNext: "下一張命中率",
    labelHitTwo: "兩張命中率",
    labelApprox: "2/4 法則近似值（僅供參考）",
    labelRemaining: "未見牌數",
    labelWin: "勝率",
    labelTie: "平手率",
    labelLoss: "敗率",
    labelEquity: "權益",
    labelMethod: "方法",
    labelScenarios: "情境數／試驗數",
    labelPotOdds: "底池賠率",
    labelBreakEven: "損益平衡權益",
    labelHint: "提示",
    methodExact: "精確枚舉",
    methodMonteCarlo: "蒙地卡羅",
    monteCarloNote:
      "蒙地卡羅估計，95% 信賴區間半寬至多 ±0.31 個百分點",
    hintCall: "跟注",
    hintFold: "棄牌",
    hintMarginal: "邊際",
    potNotFilled: "未填寫底池或跟注額，不計算底池賠率與提示。",
    noCards: "無公共牌",
    notApplicable: "—",
    approxSuffix: "%（近似）",
    pctSuffix: "%",
    successSummary: (result) => `權益 ${result.equityPct}%，勝率 ${result.winPct}%`,
  },
  en: {
    fieldLabel: {
      holeCards: "Hole cards",
      boardCards: "Board cards",
      opponents: "Number of opponents",
      pot: "Pot",
      toCall: "Amount to call",
    },
    error: {
      SCHEMA: "Invalid input format",
      INPUT_LIMIT: "Input too long",
      UNICODE: "Input contains an unpaired character",
      EMPTY: "This field is required",
      CARD_FORMAT: "Invalid card code, e.g. As, Kh, Td",
      CARD_COUNT: "Wrong card count: 2 hole cards and 0, 3, 4 or 5 board cards",
      DUPLICATE_CARD: "Duplicate card",
      INTEGER_FORMAT: "Enter a whole number",
      RANGE: "Value out of range",
      INTERNAL: "Something went wrong. Try again.",
      WORKER_ERROR: "Something went wrong. Try again.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
    },
    statusEmpty: "Nothing calculated yet. Enter hole and board cards, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    exampleNote: "Example loaded (flush draw As Ks vs Qs 7s 2c). Press “Calculate odds” to run it.",
    downloaded: "Report downloaded.",
    fieldErrorJoiner: ": ",
    labelCurrentHand: "Current hand",
    labelHoleCards: "Hole cards",
    labelBoardCards: "Board cards",
    labelOuts: "Outs",
    labelHitNext: "Next-card hit rate",
    labelHitTwo: "Two-card hit rate",
    labelApprox: "Rule of 2/4 approximation (reference only)",
    labelRemaining: "Unseen cards",
    labelWin: "Win rate",
    labelTie: "Tie rate",
    labelLoss: "Loss rate",
    labelEquity: "Equity",
    labelMethod: "Method",
    labelScenarios: "Scenarios / trials",
    labelPotOdds: "Pot odds",
    labelBreakEven: "Break-even equity",
    labelHint: "Hint",
    methodExact: "Exact enumeration",
    methodMonteCarlo: "Monte Carlo",
    monteCarloNote:
      "Monte Carlo estimate, 95% CI half-width at most ±0.31 pp",
    hintCall: "Call",
    hintFold: "Fold",
    hintMarginal: "Marginal",
    potNotFilled: "Pot or amount to call not filled in; no pot odds or hint.",
    noCards: "No board cards",
    notApplicable: "—",
    approxSuffix: "% (approx.)",
    pctSuffix: "%",
    successSummary: (result) => `Equity ${result.equityPct}%, win rate ${result.winPct}%`,
  },
};

const lang = document.documentElement.lang === "en" ? "en" : "zh-Hant";
const t = STRINGS[lang];

const CARD_FIELDS = ["holeCards", "boardCards"];

const form = document.getElementById("entry-form");
const inputs = {
  holeCards: document.getElementById("field-hole-cards"),
  boardCards: document.getElementById("field-board-cards"),
  opponents: document.getElementById("field-opponents"),
  pot: document.getElementById("field-pot"),
  toCall: document.getElementById("field-to-call"),
};
const fieldErrors = {
  holeCards: document.getElementById("error-hole-cards"),
  boardCards: document.getElementById("error-board-cards"),
  opponents: document.getElementById("error-opponents"),
  pot: document.getElementById("error-pot"),
  toCall: document.getElementById("error-to-call"),
};
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryRows = document.getElementById("summary-rows");
const equityRows = document.getElementById("equity-rows");
const distributionRows = document.getElementById("distribution-rows");
const potRows = document.getElementById("pot-rows");
const monteCarloNoteEl = document.getElementById("monte-carlo-note");
const runBtn = document.getElementById("run-btn");
const exampleBtn = document.getElementById("example-btn");
const resetBtn = document.getElementById("reset-btn");
const cancelBtn = document.getElementById("cancel-btn");
const downloadBtn = document.getElementById("download-btn");
const exampleNoteEl = document.getElementById("example-note");

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

let reportUrl = null;
let reportRevokeTimer = null;

function revokeReportUrl() {
  if (reportRevokeTimer !== null) {
    clearTimeout(reportRevokeTimer);
    reportRevokeTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function setFieldError(field, message) {
  const errorEl = fieldErrors[field];
  const target = inputs[field];
  if (message === null) {
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-errormessage");
    errorEl.textContent = "";
    return;
  }
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-errormessage", `error-${field}`);
  errorEl.textContent = message;
}

function clearFieldErrors() {
  for (const field of FIELDS) setFieldError(field, null);
}

function errorMessage(error) {
  return t.error[error.code] ?? t.error.INTERNAL;
}

function splitCardText(text) {
  return text.split(/[\s,]+/).filter((part) => part.length > 0);
}

function displayCards(codes) {
  if (codes.length === 0) return t.noCards;
  return codes
    .map((code) => {
      if (code.length !== 2) return code;
      const rank = code[0].toUpperCase();
      const symbol = SUIT_SYMBOLS[code[1].toLowerCase()] ?? code[1];
      return `${rank}${symbol}`;
    })
    .join(" ");
}

function categoryDisplay(result, draft) {
  const names = CATEGORY_NAMES[result.currentCategory];
  const label = lang === "en" ? names.en : names.zh;
  if (result.currentCategory !== "straight-flush") return label;
  // A straight flush topping at A is displayed as a royal flush.
  try {
    const ids = [...draft.holeCards, ...draft.boardCards].map((code) => {
      const ranks = "23456789TJQKA";
      const suits = "cdhs";
      const rank = ranks.indexOf(code[0].toUpperCase());
      const suit = suits.indexOf(code[1].toLowerCase());
      return rank * 4 + suit;
    });
    const evaluated = evaluateHand(ids);
    if (evaluated[0] === 9 && evaluated[1] === 14) {
      return lang === "en" ? ROYAL_FLUSH_NAMES.en : ROYAL_FLUSH_NAMES.zh;
    }
  } catch {
    // Display only; the core result stands on its own.
  }
  return label;
}

function appendSummaryRows(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    div.className = "summary-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    div.append(dt, dd);
    container.appendChild(div);
  }
}

function pctOrDash(value) {
  return value === null ? t.notApplicable : `${value}${t.pctSuffix}`;
}

function renderResult(result, draft) {
  const approx =
    result.approxNextPct === null
      ? t.notApplicable
      : `${result.approxNextPct}${t.approxSuffix} / ${result.approxTwoCardPct}${t.approxSuffix}`;
  appendSummaryRows(summaryRows, [
    [t.labelCurrentHand, categoryDisplay(result, draft)],
    [t.labelHoleCards, displayCards(draft.holeCards)],
    [t.labelBoardCards, displayCards(draft.boardCards)],
    [t.labelOuts, result.outs === null ? t.notApplicable : String(result.outs)],
    [t.labelHitNext, pctOrDash(result.hitNextPct)],
    [t.labelHitTwo, pctOrDash(result.hitTwoCardPct)],
    [t.labelApprox, approx],
    [t.labelRemaining, String(result.remainingCards)],
  ]);
  appendSummaryRows(equityRows, [
    [t.labelWin, pctOrDash(result.winPct)],
    [t.labelTie, pctOrDash(result.tiePct)],
    [t.labelLoss, pctOrDash(result.lossPct)],
    [t.labelEquity, pctOrDash(result.equityPct)],
    [
      t.labelMethod,
      result.method === "exact" ? t.methodExact : t.methodMonteCarlo,
    ],
    [t.labelScenarios, String(result.scenarios)],
  ]);
  monteCarloNoteEl.hidden = result.method !== "monte-carlo";
  if (result.method === "monte-carlo") monteCarloNoteEl.textContent = t.monteCarloNote;
  const distribution = Object.entries(result.finalHandDistribution).map(
    ([slug, value]) => {
      const names = CATEGORY_NAMES[slug];
      return [lang === "en" ? names.en : names.zh, `${value}${t.pctSuffix}`];
    },
  );
  appendSummaryRows(distributionRows, distribution);
  if (result.hint === null) {
    appendSummaryRows(potRows, [[t.labelHint, t.potNotFilled]]);
  } else {
    const hintText =
      result.hint === "call"
        ? t.hintCall
        : result.hint === "fold"
          ? t.hintFold
          : t.hintMarginal;
    appendSummaryRows(potRows, [
      [
        t.labelPotOdds,
        result.potOddsRatio === null ? t.notApplicable : result.potOddsRatio,
      ],
      [t.labelBreakEven, pctOrDash(result.breakEvenPct)],
      [t.labelHint, hintText],
    ]);
  }
}

function render(publicState) {
  const { state, draft, isExample, result, error, reportAvailable } = publicState;
  for (const field of FIELDS) {
    const shown = CARD_FIELDS.includes(field) ? draft[field].join(" ") : draft[field];
    if (inputs[field].value !== shown) inputs[field].value = shown;
  }
  exampleNoteEl.hidden = !isExample;
  if (isExample) exampleNoteEl.textContent = t.exampleNote;
  statusEl.setAttribute("aria-busy", state === "busy" ? "true" : "false");
  cancelBtn.hidden = state !== "busy";
  runBtn.disabled = state === "busy";
  downloadBtn.hidden = !reportAvailable;
  if (!reportAvailable) revokeReportUrl();

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
      const message = errorMessage(error);
      if (error.field !== null && FIELDS.includes(error.field)) {
        setFieldError(error.field, message);
        statusEl.textContent = `${t.fieldLabel[error.field]}${t.fieldErrorJoiner}${message}`;
        if (submitted) {
          submitted = false;
          inputs[error.field].focus();
        }
      } else {
        statusEl.textContent = message;
      }
    } else {
      statusEl.textContent = t.error.INTERNAL;
    }
    resultsEl.hidden = true;
  } else if (state === "success" && result !== null) {
    renderResult(result, draft);
    statusEl.textContent = t.successSummary(result);
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

for (const field of FIELDS) {
  inputs[field].addEventListener("input", () => {
    if (CARD_FIELDS.includes(field)) {
      controller.edit({ [field]: splitCardText(inputs[field].value) });
    } else {
      controller.edit({ [field]: inputs[field].value });
    }
  });
}

exampleBtn.addEventListener("click", () => {
  controller.loadExample();
});

resetBtn.addEventListener("click", () => {
  controller.reset();
  inputs.holeCards.focus();
});

cancelBtn.addEventListener("click", () => {
  controller.cancel();
  runBtn.focus();
});

downloadBtn.addEventListener("click", () => {
  const snapshot = controller.getState();
  if (!snapshot.reportAvailable || snapshot.result === null) return;
  const report = buildReport(snapshot.result);
  if (!report.ok) {
    statusEl.textContent = errorMessage(report.error);
    return;
  }
  revokeReportUrl();
  const blob = new Blob([report.text], { type: "application/json" });
  reportUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = reportUrl;
  anchor.download = report.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  reportRevokeTimer = setTimeout(revokeReportUrl, 30000);
  statusEl.textContent = t.downloaded;
});

window.addEventListener("pagehide", () => {
  controller.destroy();
  revokeReportUrl();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller.reset();
  }
});

render(controller.getState());
