// Mortgage Amortization controller. Parses and validates the form,
// delegates all arithmetic to the pure core, renders the ledger as a
// real table (cells are text nodes), and exports the displayed schedule
// as CSV. Nothing is stored or sent anywhere.

import {
  MortgageError,
  buildCsv,
  buildSchedule,
  formatCents,
  formatRate,
  graceLimit,
  makeCsvFilename,
  parseMoneyCents,
  parseRateScaled,
} from "./core/mortgage.mjs";
import { translate } from "./i18n.mjs";

const DEBOUNCE_MS = 150;
const MAX_PRINCIPAL_CENTS = 1_000_000_000_000;
const MAX_RATE_SCALED = 300_000;

export function createApp(doc, env = {}) {
  const createObjectURL = env.createObjectURL ?? ((blob) => URL.createObjectURL(blob));
  const revokeObjectURL = env.revokeObjectURL ?? ((url) => URL.revokeObjectURL(url));
  const now = env.now ?? (() => new Date());
  const lang = doc.documentElement && doc.documentElement.lang && doc.documentElement.lang.startsWith("en") ? "en" : "zh-Hant";
  const t = (code, params) => translate(lang, code, params);

  const el = {
    methodAnnuity: doc.querySelector("#method-annuity"),
    methodPrincipal: doc.querySelector("#method-principal"),
    principal: doc.querySelector("#principal"),
    rate: doc.querySelector("#rate"),
    termYears: doc.querySelector("#term-years"),
    graceMonths: doc.querySelector("#grace-months"),
    trancheEnabled: doc.querySelector("#tranche-enabled"),
    trancheFields: doc.querySelector("#tranche-fields"),
    trancheRate: doc.querySelector("#tranche-rate"),
    trancheMonth: doc.querySelector("#tranche-month"),
    prepayMonth: doc.querySelector("#prepay-month"),
    prepayAmount: doc.querySelector("#prepay-amount"),
    prepayMode: doc.querySelector("#prepay-mode"),
    prepayAdd: doc.querySelector("#prepay-add"),
    prepayList: doc.querySelector("#prepay-list"),
    prepayError: doc.querySelector("#prepay-error"),
    errPrincipal: doc.querySelector("#err-principal"),
    errRate: doc.querySelector("#err-rate"),
    errTerm: doc.querySelector("#err-term"),
    errGrace: doc.querySelector("#err-grace"),
    errTrancheRate: doc.querySelector("#err-tranche-rate"),
    errTrancheMonth: doc.querySelector("#err-tranche-month"),
    errPrepayMonth: doc.querySelector("#err-prepay-month"),
    errPrepayAmount: doc.querySelector("#err-prepay-amount"),
    totalPaid: doc.querySelector("#total-paid"),
    totalInterest: doc.querySelector("#total-interest"),
    savedRow: doc.querySelector("#saved-row"),
    interestSaved: doc.querySelector("#interest-saved"),
    yearlyBody: doc.querySelector("#yearly-body"),
    ledgerBody: doc.querySelector("#ledger-body"),
    stateMessage: doc.querySelector("#state-message"),
    resultsTables: doc.querySelector("#results-tables"),
    exportCsv: doc.querySelector("#export-csv"),
    reset: doc.querySelector("#reset-button"),
  };

  const events = []; // {month, amountCents, mode}
  let current = null; // last valid schedule
  let debounceTimer = null;

  function setFieldError(errorEl, inputEl, message) {
    errorEl.textContent = message ?? "";
    errorEl.hidden = message === null || message === undefined || message === "";
    if (inputEl) inputEl.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearErrors() {
    setFieldError(el.errPrincipal, el.principal, null);
    setFieldError(el.errRate, el.rate, null);
    setFieldError(el.errTerm, el.termYears, null);
    setFieldError(el.errGrace, el.graceMonths, null);
    setFieldError(el.errTrancheRate, el.trancheRate, null);
    setFieldError(el.errTrancheMonth, el.trancheMonth, null);
    setFieldError(el.prepayError, null, null);
  }

  function showResults(show) {
    el.resultsTables.hidden = !show;
    el.exportCsv.disabled = !show;
  }

  function parseWhole(text) {
    const trimmed = String(text).trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    return Number.parseInt(trimmed, 10);
  }

  function renderEvents() {
    el.prepayList.textContent = "";
    events.forEach((event, index) => {
      const item = doc.createElement("li");
      const label = doc.createElement("span");
      label.textContent = t("EVENT_TEXT", {
        month: event.month,
        amount: formatCents(event.amountCents),
        mode: t(event.mode === "reduce-term" ? "MODE_REDUCE_TERM" : "MODE_REDUCE_PAYMENT"),
      });
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = t("DELETE");
      button.addEventListener("click", () => {
        events.splice(index, 1);
        renderEvents();
        compute();
      });
      item.append(label);
      item.append(button);
      el.prepayList.append(item);
    });
  }

  function fillTable(body, rows, values) {
    body.textContent = "";
    for (const row of rows) {
      const tr = doc.createElement("tr");
      for (const value of values(row)) {
        const td = doc.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      body.append(tr);
    }
  }

  function compute() {
    clearErrors();
    const errors = [];
    const mark = (errorEl, inputEl, code, params) => {
      const message = t(code, params);
      setFieldError(errorEl, inputEl, message);
      errors.push(message);
    };

    const principalText = el.principal.value.trim();
    const rateText = el.rate.value.trim();
    let principalCents = null;
    let rateScaled = null;
    if (principalText !== "") {
      principalCents = parseMoneyCents(principalText);
      if (principalCents === null) mark(el.errPrincipal, el.principal, "PRINCIPAL_INVALID");
      else if (principalCents <= 0 || principalCents > MAX_PRINCIPAL_CENTS) {
        mark(el.errPrincipal, el.principal, "PRINCIPAL_OUT_OF_RANGE", {
          limit: formatCents(MAX_PRINCIPAL_CENTS),
          actual: formatCents(principalCents),
        });
      }
    }
    if (rateText !== "") {
      rateScaled = parseRateScaled(rateText);
      if (rateScaled === null) mark(el.errRate, el.rate, "RATE_INVALID");
      else if (rateScaled < 0 || rateScaled > MAX_RATE_SCALED) {
        mark(el.errRate, el.rate, "RATE_OUT_OF_RANGE", { limit: "30", actual: formatRate(rateScaled) });
      }
    }

    const years = parseWhole(el.termYears.value);
    let termMonths = null;
    if (years === null) mark(el.errTerm, el.termYears, "TERM_INVALID");
    else if (years < 1 || years > 40) mark(el.errTerm, el.termYears, "TERM_OUT_OF_RANGE", { limit: 40, actual: years });
    else termMonths = years * 12;

    const grace = parseWhole(el.graceMonths.value);
    if (grace === null) mark(el.errGrace, el.graceMonths, "GRACE_INVALID");
    else if (termMonths !== null && (grace < 0 || grace > graceLimit(termMonths))) {
      mark(el.errGrace, el.graceMonths, "GRACE_LIMIT_EXCEEDED", { limit: graceLimit(termMonths), actual: grace });
    }

    let tranche = null;
    if (el.trancheEnabled.checked) {
      const tRate = parseRateScaled(el.trancheRate.value);
      if (tRate === null) mark(el.errTrancheRate, el.trancheRate, "RATE_INVALID");
      else if (tRate < 0 || tRate > MAX_RATE_SCALED) {
        mark(el.errTrancheRate, el.trancheRate, "RATE_OUT_OF_RANGE", { limit: "30", actual: formatRate(tRate) });
      }
      const tMonth = parseWhole(el.trancheMonth.value);
      if (tMonth === null) mark(el.errTrancheMonth, el.trancheMonth, "MONTH_INVALID");
      else if (termMonths !== null && (tMonth < 2 || tMonth > termMonths)) {
        mark(el.errTrancheMonth, el.trancheMonth, "TRANCHE_MONTH_OUT_OF_RANGE", { limit: termMonths, actual: tMonth });
      }
      if (tRate !== null && tMonth !== null) tranche = { rateScaled: tRate, startMonth: tMonth };
    }

    if (errors.length > 0) {
      current = null;
      showResults(false);
      el.stateMessage.textContent = errors[0];
      el.stateMessage.hidden = false;
      return;
    }
    if (principalCents === null || rateScaled === null || termMonths === null || grace === null) {
      current = null;
      showResults(false);
      el.stateMessage.textContent = t("PLACEHOLDER");
      el.stateMessage.hidden = false;
      return;
    }

    let schedule;
    try {
      schedule = buildSchedule({
        principalCents,
        rateScaled,
        termMonths,
        graceMonths: grace,
        method: el.methodPrincipal.checked ? "principal" : "annuity",
        tranche,
        prepayments: events.map((event) => ({ ...event })),
      });
    } catch (err) {
      current = null;
      showResults(false);
      if (err instanceof MortgageError) {
        const params = { ...err.params };
        if (err.code === "PREPAYMENT_EXCEEDS_BALANCE") params.max = formatCents(err.params.max);
        if (err.code === "GRACE_LIMIT_EXCEEDED") {
          setFieldError(el.errGrace, el.graceMonths, t(err.code, params));
        } else {
          setFieldError(el.prepayError, null, t(err.code, params));
        }
        el.stateMessage.textContent = t(err.code, params);
      } else {
        el.stateMessage.textContent = String(err && err.message ? err.message : err);
      }
      el.stateMessage.hidden = false;
      return;
    }

    current = schedule;
    el.totalPaid.textContent = formatCents(schedule.totalPaid);
    el.totalInterest.textContent = formatCents(schedule.totalInterest);
    el.savedRow.hidden = !schedule.hadPrepayments;
    if (schedule.hadPrepayments) {
      el.interestSaved.textContent = formatCents(Math.max(0, schedule.interestSaved));
    }
    fillTable(el.yearlyBody, schedule.yearly, (y) => [
      String(y.year), String(y.months), formatCents(y.payment), formatCents(y.interest), formatCents(y.principal), formatCents(y.closing),
    ]);
    fillTable(el.ledgerBody, schedule.rows, (r) => [
      String(r.month), formatCents(r.opening), formatCents(r.payment), formatCents(r.interest), formatCents(r.principal), formatCents(r.closing),
    ]);
    el.stateMessage.textContent = "";
    el.stateMessage.hidden = true;
    showResults(true);
  }

  function scheduleCompute() {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      compute();
    }, DEBOUNCE_MS);
  }

  for (const input of [el.principal, el.rate, el.termYears, el.graceMonths, el.trancheRate, el.trancheMonth]) {
    input.addEventListener("input", scheduleCompute);
  }
  el.methodAnnuity.addEventListener("change", compute);
  el.methodPrincipal.addEventListener("change", compute);
  el.trancheEnabled.addEventListener("change", () => {
    el.trancheFields.hidden = !el.trancheEnabled.checked;
    compute();
  });

  el.prepayAdd.addEventListener("click", () => {
    setFieldError(el.errPrepayMonth, el.prepayMonth, null);
    setFieldError(el.errPrepayAmount, el.prepayAmount, null);
    const month = parseWhole(el.prepayMonth.value);
    if (month === null) {
      setFieldError(el.errPrepayMonth, el.prepayMonth, t("MONTH_INVALID"));
      return;
    }
    const years = parseWhole(el.termYears.value);
    const termMonths = years !== null && years >= 1 && years <= 40 ? years * 12 : null;
    if (termMonths !== null && (month < 1 || month > termMonths)) {
      setFieldError(el.errPrepayMonth, el.prepayMonth, t("PREPAYMENT_MONTH_OUT_OF_RANGE", { limit: termMonths, actual: month }));
      return;
    }
    const amountCents = parseMoneyCents(el.prepayAmount.value);
    if (amountCents === null || amountCents <= 0) {
      setFieldError(el.errPrepayAmount, el.prepayAmount, t("PREPAYMENT_AMOUNT_INVALID"));
      return;
    }
    if (events.length >= 12) {
      setFieldError(el.prepayError, null, t("PREPAYMENT_LIMIT", { limit: 12 }));
      return;
    }
    events.push({ month, amountCents, mode: el.prepayMode.value === "reduce-payment" ? "reduce-payment" : "reduce-term" });
    renderEvents();
    compute();
  });

  el.exportCsv.addEventListener("click", () => {
    if (!current) return;
    const blob = new Blob([buildCsv(current)], { type: "text/csv;charset=utf-8" });
    const url = createObjectURL(blob);
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = makeCsvFilename(now());
    doc.body.append(anchor);
    anchor.click();
    anchor.remove();
    revokeObjectURL(url);
  });

  el.reset.addEventListener("click", () => {
    el.methodAnnuity.checked = true;
    el.methodPrincipal.checked = false;
    el.principal.value = "";
    el.rate.value = "";
    el.termYears.value = "20";
    el.graceMonths.value = "0";
    el.trancheEnabled.checked = false;
    el.trancheFields.hidden = true;
    el.trancheRate.value = "";
    el.trancheMonth.value = "";
    el.prepayMonth.value = "";
    el.prepayAmount.value = "";
    events.length = 0;
    renderEvents();
    compute();
  });

  el.trancheFields.hidden = !el.trancheEnabled.checked;
  renderEvents();
  compute();
  return { compute, getCurrent: () => current, events, elements: el };
}

if (typeof document !== "undefined" && document.querySelector("#principal")) {
  createApp(document);
}
