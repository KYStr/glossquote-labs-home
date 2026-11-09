// DOM wiring for the Compound Interest & Savings Goal Calculator.
// All computation lives in js/core/*.mjs (pure). This layer only reads field
// values, renders results with textContent, and manages mode tabs, the
// monthly-table expander and the CSV download. No network, no storage.
import {
  parseAmountToCents,
  parseRateToThousandths,
  parseTermMonths,
  formatCents,
} from './core/money.mjs';
import {
  simulate,
  yearlySummary,
  monthsToTarget,
  requiredContribution,
  effectiveAnnualRatePercent,
} from './core/simulate.mjs';
import { monthlyTableCsv } from './core/csv.mjs';

const LANG = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';

const STR = {
  zh: {
    errors: {
      'required': '必填',
      'negative': '不能是負數',
      'invalid': '請輸入有效的數字',
      'too-many-decimals-amount': '金額最多兩位小數',
      'too-many-decimals-rate': '利率最多三位小數',
      'over-cap': '金額上限是 999,999,999.99',
      'over-max': '利率上限是 100%',
      'out-of-range': '期間需在 1 到 600 個月之間',
      'invalid-term': '請輸入整數月份',
    },
    showAll: (n) => `顯示全部 ${n} 個月`,
    showYear: '只顯示第一年',
    termHint: (m) => {
      const y = Math.floor(m / 12);
      const r = m % 12;
      if (y === 0) return '';
      return `= ${y} 年${r > 0 ? ` ${r} 個月` : ''}`;
    },
    goalA: {
      reached: (m, bal) => `第 ${m} 個月達標，期末餘額 ${bal}。`,
      'already-reached': '第 0 個月就已達標：期初金額已不低於目標。',
      'no-growth': '不會達標：利率與每月提撥都是 0，餘額不會成長。',
      'not-reached': (bal) => `600 個月內未達標（第 600 個月餘額 ${bal}）。`,
    },
    goalBMain: (c) => `每月需要提撥 ${c}`,
    goalBPair: (final, less, finalLess) => `以此金額，期末餘額 ${final}；少提撥一分（${less}），期末餘額 ${finalLess}，未達目標。`,
    goalBZeroTarget: '目標已不超過期初金額，不需要額外提撥。',
    goalBZeroInterest: '光靠利息就足以達標，不需要提撥。',
    csvHeader: ['月份', '當月利息', '提撥', '期末餘額'],
    csvName: 'compound-interest-monthly.csv',
  },
  en: {
    errors: {
      'required': 'Required',
      'negative': 'Cannot be negative',
      'invalid': 'Enter a valid number',
      'too-many-decimals-amount': 'Amounts allow at most 2 decimal places',
      'too-many-decimals-rate': 'Rates allow at most 3 decimal places',
      'over-cap': 'Maximum amount is 999,999,999.99',
      'over-max': 'Maximum rate is 100%',
      'out-of-range': 'Term must be between 1 and 600 months',
      'invalid-term': 'Enter a whole number of months',
    },
    showAll: (n) => `Show all ${n} months`,
    showYear: 'Show first year only',
    termHint: (m) => {
      const y = Math.floor(m / 12);
      const r = m % 12;
      if (y === 0) return '';
      return `= ${y} year${y === 1 ? '' : 's'}${r > 0 ? ` ${r} month${r === 1 ? '' : 's'}` : ''}`;
    },
    goalA: {
      reached: (m, bal) => `Target reached in month ${m}, with an end balance of ${bal}.`,
      'already-reached': 'Already reached at month 0: the initial amount is at or above the target.',
      'no-growth': 'Not reached: the rate and the monthly contribution are both zero, so the balance never grows.',
      'not-reached': (bal) => `Not reached within 600 months (balance at month 600: ${bal}).`,
    },
    goalBMain: (c) => `Required monthly contribution: ${c}`,
    goalBPair: (final, less, finalLess) => `At that amount the final balance is ${final}; one cent less (${less}) ends at ${finalLess}, short of the target.`,
    goalBZeroTarget: 'The target is at or below the initial amount, so no contribution is needed.',
    goalBZeroInterest: 'Interest alone reaches the target, so no contribution is needed.',
    csvHeader: ['Month', 'Interest', 'Contribution', 'End balance'],
    csvName: 'compound-interest-monthly.csv',
  },
}[LANG];

const $ = (id) => document.getElementById(id);
const currencyEl = $('currency');
const money = (cents) => {
  const symbol = currencyEl.value;
  const text = formatCents(cents);
  return symbol ? `${symbol} ${text}` : text;
};

// Read one field through a core parser; show/clear its error. Returns the
// parsed result object, or null when invalid.
function readField(inputId, errorId, parser, errorKind) {
  const input = $(inputId);
  const errorEl = $(errorId);
  const result = parser(input.value);
  if (result.ok) {
    errorEl.hidden = true;
    errorEl.textContent = '';
    input.removeAttribute('aria-invalid');
    return result;
  }
  let key = result.error;
  if (key === 'too-many-decimals') key = `too-many-decimals-${errorKind}`;
  if (errorKind === 'term' && key === 'invalid') key = 'invalid-term';
  errorEl.textContent = STR.errors[key] || STR.errors.invalid;
  errorEl.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  return null;
}

function setStale(mode, stale) {
  $(`stale-${mode}`).hidden = !stale;
}

function buildRows(tbody, rows, cellsOf) {
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const text of cellsOf(row)) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function updateTermHint(inputId, hintId) {
  const parsed = parseTermMonths($(inputId).value);
  $(hintId).textContent = parsed.ok ? STR.termHint(parsed.months) : '';
}

/* ------------------------------- Growth ------------------------------- */

const growthState = { last: null, expanded: false };

function computeGrowth() {
  updateTermHint('g-term', 'hint-g-term');
  const initial = readField('g-initial', 'err-g-initial', parseAmountToCents, 'amount');
  const rate = readField('g-rate', 'err-g-rate', parseRateToThousandths, 'rate');
  const contribution = readField('g-contribution', 'err-g-contribution', parseAmountToCents, 'amount');
  const term = readField('g-term', 'err-g-term', parseTermMonths, 'term');
  if (!initial || !rate || !contribution || !term) {
    setStale('growth', growthState.last !== null);
    $('g-csv').disabled = true;
    return;
  }
  const args = {
    initialCents: initial.cents,
    rateThousandths: rate.thousandths,
    contributionCents: contribution.cents,
    termMonths: term.months,
  };
  growthState.last = { args, result: simulate(args) };
  setStale('growth', false);
  $('g-csv').disabled = false;
  renderGrowth();
}

function renderGrowth() {
  const { args, result } = growthState.last;
  $('g-out-final').textContent = money(result.finalBalanceCents);
  $('g-out-initial').textContent = money(args.initialCents);
  $('g-out-contributions').textContent = money(result.totalContributionsCents);
  $('g-out-interest').textContent = money(result.totalInterestCents);
  $('g-out-ear').textContent = `${effectiveAnnualRatePercent(args.rateThousandths)}%`;
  buildRows($('g-yearly').querySelector('tbody'), yearlySummary(result.rows), (y) => [
    String(y.year),
    formatCents(y.contributionsYearCents),
    formatCents(y.interestYearCents),
    formatCents(y.contributionsCumulativeCents),
    formatCents(y.interestCumulativeCents),
    formatCents(y.endBalanceCents),
  ]);
  const visible = growthState.expanded ? result.rows : result.rows.slice(0, 12);
  buildRows($('g-monthly').querySelector('tbody'), visible, (r) => [
    String(r.month),
    formatCents(r.interestCents),
    formatCents(r.contributionCents),
    formatCents(r.balanceCents),
  ]);
  const toggle = $('g-toggle-months');
  if (result.rows.length > 12) {
    toggle.hidden = false;
    toggle.textContent = growthState.expanded ? STR.showYear : STR.showAll(result.rows.length);
  } else {
    toggle.hidden = true;
  }
}

/* --------------------------- Goal A: months --------------------------- */

const goalAState = { last: null };

function computeGoalA() {
  const initial = readField('a-initial', 'err-a-initial', parseAmountToCents, 'amount');
  const rate = readField('a-rate', 'err-a-rate', parseRateToThousandths, 'rate');
  const contribution = readField('a-contribution', 'err-a-contribution', parseAmountToCents, 'amount');
  const target = readField('a-target', 'err-a-target', parseAmountToCents, 'amount');
  if (!initial || !rate || !contribution || !target) {
    setStale('goala', goalAState.last !== null);
    return;
  }
  goalAState.last = monthsToTarget({
    initialCents: initial.cents,
    rateThousandths: rate.thousandths,
    contributionCents: contribution.cents,
    targetCents: target.cents,
  });
  setStale('goala', false);
  renderGoalA();
}

function renderGoalA() {
  const r = goalAState.last;
  const el = $('a-result');
  if (r.status === 'reached') el.textContent = STR.goalA.reached(r.months, money(r.balanceCents));
  else if (r.status === 'not-reached') el.textContent = STR.goalA['not-reached'](money(r.balanceCents));
  else el.textContent = STR.goalA[r.status];
}

/* --------------------- Goal B: required contribution --------------------- */

const goalBState = { last: null };

function computeGoalB() {
  updateTermHint('b-term', 'hint-b-term');
  const initial = readField('b-initial', 'err-b-initial', parseAmountToCents, 'amount');
  const rate = readField('b-rate', 'err-b-rate', parseRateToThousandths, 'rate');
  const target = readField('b-target', 'err-b-target', parseAmountToCents, 'amount');
  const term = readField('b-term', 'err-b-term', parseTermMonths, 'term');
  if (!initial || !rate || !target || !term) {
    setStale('goalb', goalBState.last !== null);
    return;
  }
  goalBState.last = {
    targetCents: target.cents,
    initialCents: initial.cents,
    result: requiredContribution({
      initialCents: initial.cents,
      rateThousandths: rate.thousandths,
      targetCents: target.cents,
      termMonths: term.months,
    }),
  };
  setStale('goalb', false);
  renderGoalB();
}

function renderGoalB() {
  const { result, targetCents, initialCents } = goalBState.last;
  $('b-out-main').textContent = STR.goalBMain(money(result.contributionCents));
  const pair = $('b-out-pair');
  if (result.contributionCents === 0n) {
    pair.textContent = targetCents <= initialCents ? STR.goalBZeroTarget : STR.goalBZeroInterest;
  } else {
    pair.textContent = STR.goalBPair(
      money(result.finalAtContributionCents),
      money(result.contributionCents - 1n),
      money(result.finalAtOneCentLessCents),
    );
  }
}

/* -------------------------------- Wiring -------------------------------- */

const MODE_FIELDS = {
  growth: ['g-initial', 'g-rate', 'g-contribution', 'g-term'],
  goala: ['a-initial', 'a-rate', 'a-contribution', 'a-target'],
  goalb: ['b-initial', 'b-rate', 'b-target', 'b-term'],
};
const COMPUTE = { growth: computeGrowth, goala: computeGoalA, goalb: computeGoalB };
for (const [mode, fields] of Object.entries(MODE_FIELDS)) {
  for (const id of fields) $(id).addEventListener('input', COMPUTE[mode]);
}

currencyEl.addEventListener('change', () => {
  if (growthState.last) renderGrowth();
  if (goalAState.last) renderGoalA();
  if (goalBState.last) renderGoalB();
});

$('g-toggle-months').addEventListener('click', () => {
  growthState.expanded = !growthState.expanded;
  renderGrowth();
});

$('g-csv').addEventListener('click', () => {
  if (!growthState.last || !$('stale-growth').hidden) return;
  const csv = monthlyTableCsv(growthState.last.result.rows, STR.csvHeader);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = STR.csvName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

const DEFAULTS = {
  growth: { 'g-initial': '10000', 'g-rate': '12', 'g-contribution': '100', 'g-term': '12' },
  goala: { 'a-initial': '0', 'a-rate': '12', 'a-contribution': '100', 'a-target': '1000' },
  goalb: { 'b-initial': '0', 'b-rate': '12', 'b-target': '12000', 'b-term': '12' },
};
for (const btn of document.querySelectorAll('button.reset')) {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    for (const [id, value] of Object.entries(DEFAULTS[mode])) $(id).value = value;
    if (mode === 'growth') growthState.expanded = false;
    COMPUTE[mode]();
  });
}

// Mode tabs: click plus arrow-key navigation (roving tabindex).
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab, focus = false) {
  for (const t of tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}
for (const tab of tabs) tab.addEventListener('click', () => activateTab(tab));
document.querySelector('[role="tablist"]').addEventListener('keydown', (event) => {
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  let next = null;
  if (event.key === 'ArrowRight') next = tabs[(current + 1) % tabs.length];
  if (event.key === 'ArrowLeft') next = tabs[(current - 1 + tabs.length) % tabs.length];
  if (event.key === 'Home') next = tabs[0];
  if (event.key === 'End') next = tabs[tabs.length - 1];
  if (next) {
    event.preventDefault();
    activateTab(next, true);
  }
});

// First paint: every mode computes from its prefilled example (SPEC section 3).
computeGrowth();
computeGoalA();
computeGoalB();
