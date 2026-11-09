// Taiwan Uniform Invoice Prize Check controller. Validates the
// winning-number setup, then runs full checks (appending result rows),
// honest quick checks, and batch classification through the pure core.
// All rendering uses text nodes; nothing is stored or sent.

import {
  InvoiceError,
  checkFull,
  checkQuick,
  classifyBatch,
  formatAmount,
  parseCandidate,
  parseSetup,
  summarize,
} from "./core/invoice.mjs";
import { translate } from "./i18n.mjs";

const TIER_ORDER = ["special", "grand", "first", "second", "third", "fourth", "fifth", "sixth", "none"];

export function createApp(doc, env = {}) {
  const clipboard = env.clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
  const lang = doc.documentElement && doc.documentElement.lang && doc.documentElement.lang.startsWith("en") ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);

  const el = {
    special: doc.querySelector("#special"),
    grand: doc.querySelector("#grand"),
    firsts: [
      doc.querySelector("#first-1"), doc.querySelector("#first-2"), doc.querySelector("#first-3"),
      doc.querySelector("#first-4"), doc.querySelector("#first-5"),
    ],
    adds: [
      doc.querySelector("#add-1"), doc.querySelector("#add-2"),
      doc.querySelector("#add-3"), doc.querySelector("#add-4"),
    ],
    errSpecial: doc.querySelector("#err-special"),
    errGrand: doc.querySelector("#err-grand"),
    errFirst: doc.querySelector("#err-first"),
    errAdd: doc.querySelector("#err-add"),
    setupSummary: doc.querySelector("#setup-summary"),
    setupReset: doc.querySelector("#setup-reset"),
    fullInput: doc.querySelector("#full-input"),
    fullCheck: doc.querySelector("#full-check"),
    fullError: doc.querySelector("#full-error"),
    resultsBody: doc.querySelector("#results-body"),
    resultsSummary: doc.querySelector("#results-summary"),
    copySummary: doc.querySelector("#copy-summary"),
    copyStatus: doc.querySelector("#copy-status"),
    clearResults: doc.querySelector("#clear-results"),
    quickInput: doc.querySelector("#quick-input"),
    quickCheck: doc.querySelector("#quick-check"),
    quickError: doc.querySelector("#quick-error"),
    quickResult: doc.querySelector("#quick-result"),
    batchInput: doc.querySelector("#batch-input"),
    batchRun: doc.querySelector("#batch-run"),
    batchError: doc.querySelector("#batch-error"),
    batchSummary: doc.querySelector("#batch-summary"),
    batchBody: doc.querySelector("#batch-body"),
    copyBatchSummary: doc.querySelector("#copy-batch-summary"),
    batchCopyStatus: doc.querySelector("#batch-copy-status"),
  };

  let setup = null;
  let results = [];
  let batchSummaryText = "";
  let resetArmed = false;
  let validateTimer = null;

  const fieldErrorEls = { special: el.errSpecial, grand: el.errGrand, first: el.errFirst, addSixth: el.errAdd };

  function setError(errorEl, message) {
    errorEl.textContent = message ?? "";
    errorEl.hidden = !message;
  }

  function summaryText(summary, includeInvalid) {
    const parts = TIER_ORDER.map((tier) => `${t("TIER_" + tier)} ${summary.counts[tier]}`);
    if (includeInvalid) parts.push(`${t("TIER_invalid")} ${summary.counts.invalid}`);
    parts.push(t("SUMMARY_TOTAL", { amount: formatAmount(summary.totalAmount) }));
    return parts.join(" · ");
  }

  function noteText(note) {
    switch (note.kind) {
      case "special": return t("NOTE_SPECIAL");
      case "grand": return t("NOTE_GRAND");
      case "first-suffix": return t("NOTE_SUFFIX", { k: note.k, n: note.firstIndex + 1 });
      case "additional": return t("NOTE_ADDITIONAL");
      default: return t("NOTE_NONE");
    }
  }

  function validateSetup() {
    for (const errorEl of Object.values(fieldErrorEls)) setError(errorEl, null);
    const raw = {
      special: el.special.value,
      grand: el.grand.value,
      first: el.firsts.map((input) => input.value),
      addSixth: el.adds.map((input) => input.value),
    };
    try {
      setup = parseSetup(raw);
    } catch (err) {
      setup = null;
      if (err instanceof InvoiceError) {
        const params = { ...err.params };
        if (params.field) params.field = t("FIELD_" + params.field);
        if (params.other) params.other = t("FIELD_" + params.other);
        setError(fieldErrorEls[err.params.field] ?? el.errSpecial, t(err.code, params));
      }
      el.setupSummary.textContent = t("SETUP_EMPTY");
      syncEnabled();
      return false;
    }
    el.setupSummary.textContent = t("SETUP_SUMMARY", {
      special: 1,
      grand: 1,
      first: setup.first.length,
      add: setup.addSixth.length,
    });
    syncEnabled();
    return true;
  }

  function syncEnabled() {
    const ready = setup !== null;
    el.fullCheck.disabled = !ready;
    el.quickCheck.disabled = !ready;
    el.batchRun.disabled = !ready;
  }

  function scheduleValidate() {
    if (validateTimer !== null) clearTimeout(validateTimer);
    validateTimer = setTimeout(() => {
      validateTimer = null;
      validateSetup();
    }, 200);
  }

  function appendRow(body, cells) {
    const tr = doc.createElement("tr");
    for (const text of cells) {
      const td = doc.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    body.append(tr);
  }

  function renderResultsSummary() {
    el.resultsSummary.textContent = results.length === 0
      ? ""
      : summaryText(summarize(results), false);
  }

  function doFullCheck() {
    if (!setup) return;
    setError(el.fullError, null);
    const parsed = parseCandidate(el.fullInput.value, 8);
    if (!parsed.ok) {
      setError(el.fullError, t(parsed.code, parsed));
      return;
    }
    const result = checkFull(setup, parsed.value);
    results.push(result);
    appendRow(el.resultsBody, [
      result.number,
      t("TIER_" + result.tier),
      formatAmount(result.amount),
      noteText(result.note),
    ]);
    renderResultsSummary();
    el.fullInput.value = "";
    if (typeof el.fullInput.focus === "function") el.fullInput.focus();
  }

  function doQuickCheck() {
    if (!setup) return;
    setError(el.quickError, null);
    const parsed = parseCandidate(el.quickInput.value, 3);
    if (!parsed.ok) {
      setError(el.quickError, t(parsed.code, parsed));
      el.quickResult.textContent = "";
      return;
    }
    const result = checkQuick(setup, parsed.value);
    el.quickResult.textContent = "";
    const title = doc.createElement("p");
    title.textContent = result.possible ? t("QUICK_POSSIBLE") : t("QUICK_CANNOT");
    el.quickResult.append(title);
    for (const channel of result.channels) {
      const line = doc.createElement("p");
      if (channel.kind === "special") line.textContent = t("QUICK_CH_SPECIAL");
      else if (channel.kind === "grand") line.textContent = t("QUICK_CH_GRAND");
      else if (channel.kind === "first") line.textContent = t("QUICK_CH_FIRST", { n: channel.firstIndex + 1 });
      else line.textContent = t("QUICK_CH_ADDITIONAL");
      el.quickResult.append(line);
    }
  }

  function doBatch() {
    if (!setup) return;
    setError(el.batchError, null);
    let outcome;
    try {
      outcome = classifyBatch(setup, el.batchInput.value);
    } catch (err) {
      if (err instanceof InvoiceError) setError(el.batchError, t(err.code, err.params));
      return;
    }
    el.batchBody.textContent = "";
    for (const row of outcome.rows) {
      if (row.status === "invalid") {
        appendRow(el.batchBody, [String(row.line), row.raw, t("TIER_invalid"), "—", t("REASON_" + row.reason)]);
      } else {
        appendRow(el.batchBody, [String(row.line), row.number, t("TIER_" + row.tier), formatAmount(row.amount), noteText(row.note)]);
      }
    }
    batchSummaryText = summaryText(outcome.summary, true);
    el.batchSummary.textContent = batchSummaryText;
  }

  async function copyText(text, statusEl) {
    if (!text || !clipboard || typeof clipboard.writeText !== "function") {
      statusEl.textContent = t("COPY_FAILED");
      return;
    }
    try {
      await clipboard.writeText(text);
      statusEl.textContent = t("COPIED");
    } catch {
      statusEl.textContent = t("COPY_FAILED");
    }
  }

  for (const input of [el.special, el.grand, ...el.firsts, ...el.adds]) {
    input.addEventListener("input", () => {
      resetArmed = false;
      scheduleValidate();
    });
    input.addEventListener("change", validateSetup);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") validateSetup();
    });
  }
  el.fullCheck.addEventListener("click", doFullCheck);
  el.fullInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") doFullCheck();
  });
  el.quickCheck.addEventListener("click", doQuickCheck);
  el.quickInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") doQuickCheck();
  });
  el.batchRun.addEventListener("click", doBatch);
  el.copySummary.addEventListener("click", () => copyText(el.resultsSummary.textContent, el.copyStatus));
  el.copyBatchSummary.addEventListener("click", () => copyText(batchSummaryText, el.batchCopyStatus));
  el.clearResults.addEventListener("click", () => {
    results = [];
    el.resultsBody.textContent = "";
    renderResultsSummary();
    el.batchBody.textContent = "";
    el.batchSummary.textContent = "";
    batchSummaryText = "";
    setError(el.fullError, null);
    setError(el.batchError, null);
  });
  el.setupReset.addEventListener("click", () => {
    if (!resetArmed) {
      resetArmed = true;
      el.setupReset.textContent = t("CONFIRM_RESET");
      return;
    }
    resetArmed = false;
    el.setupReset.textContent = el.setupReset.dataset.label ?? el.setupReset.textContent;
    el.special.value = "";
    el.grand.value = "";
    for (const input of el.firsts) input.value = "";
    for (const input of el.adds) input.value = "";
    validateSetup();
  });
  if (el.setupReset.dataset) el.setupReset.dataset.label = el.setupReset.textContent;

  validateSetup();
  return { validateSetup, getSetup: () => setup, getResults: () => results, elements: el };
}

if (typeof document !== "undefined" && document.querySelector("#special")) {
  createApp(document);
}
