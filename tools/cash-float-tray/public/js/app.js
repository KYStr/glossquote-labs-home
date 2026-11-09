// DOM controller for Cash Float Tray. All text is set with textContent/value;
// user input is never inserted as HTML. No network, no storage: input,
// results and errors live only in page memory.
import { solve, validate } from './core/solve.mjs';
import { createFlow } from './core/flow.mjs';

const LANG = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';

const STRINGS = {
  zh: {
    working: '計算中',
    submit: '算出留盤與移出',
    readyStatus: '已算出留盤與移出。請逐列核對留幾件、移出幾件。',
    shortfall: (n) => `差額 ${n}：盤內面額湊不到目標。請依實際營運決定是否補足或調整目標。`,
    exact: '已足額：留盤金額等於目標。',
    requiredTarget: '請填寫目標留款。',
    requiredValue: '請填寫面額。',
    requiredCount: '請填寫件數。',
    syntax: '只接受 ASCII 十進位整數（例如 1000），不要空白、前導零、全形數字、小數或正負號。',
    rangeTarget: '目標留款須在 0 到 10000 之間。',
    rangeValue: '面額須在 1 到 10000 之間。',
    rangeCount: '件數須在 0 到 99 之間。',
    duplicate: '這個面額已經填過，請把件數合併到同一列。',
    rowValue: '面額',
    rowCount: '件數',
    removeRow: '移除此列',
    addRow: '＋ 新增一列面額',
    errorIntro: '有欄位需要修正：',
    exampleLoaded: '已載入範例（目標 10；6 元 1 件、4 元 2 件、3 元 3 件）。請按「算出留盤與移出」。',
  },
  en: {
    working: 'Working',
    submit: 'Split the cash tray',
    readyStatus: 'Split done. Check each row for how many pieces to keep and how many to remove.',
    shortfall: (n) => `Shortfall ${n}: the counted denominations cannot reach the target. Decide from actual operations whether to top up or adjust the target.`,
    exact: 'Exact: the kept amount equals the target.',
    requiredTarget: 'Enter the target float.',
    requiredValue: 'Enter a denomination.',
    requiredCount: 'Enter a piece count.',
    syntax: 'ASCII decimal integers only (for example 1000) — no spaces, leading zeros, full-width digits, decimals or signs.',
    rangeTarget: 'The target float must be between 0 and 10000.',
    rangeValue: 'A denomination must be between 1 and 10000.',
    rangeCount: 'A piece count must be between 0 and 99.',
    duplicate: 'This denomination is already listed; merge its pieces into the same row.',
    rowValue: 'Denomination',
    rowCount: 'Pieces',
    removeRow: 'Remove this row',
    addRow: '＋ Add a denomination row',
    errorIntro: 'Some fields need fixing:',
    exampleLoaded: 'Example loaded (target 10; 6 × 1, 4 × 2, 3 × 3). Press “Split the cash tray”.',
  },
};

const S = STRINGS[LANG];
const fmt = new Intl.NumberFormat(LANG === 'zh' ? 'zh-Hant' : 'en');

const form = document.getElementById('tray-form');
const targetInput = document.getElementById('target');
const targetError = document.getElementById('target-error');
const denomsList = document.getElementById('denoms');
const addRowBtn = document.getElementById('add-row');
const submitBtn = document.getElementById('submit');
const cancelBtn = document.getElementById('cancel');
const loadExampleBtn = document.getElementById('load-example');
const clearBtn = document.getElementById('clear-draft');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const resultEmpty = document.getElementById('result-empty');
const resultBody = document.getElementById('result-body');

const flow = createFlow({ validate, solve });
let runIdCounter = 0;
let settleTimer = null;

// Form draft: { target: string, rows: [{ value: string, count: string }] }
let draft = { target: '', rows: [{ value: '', count: '' }] };

const INT_PATTERN = /^(0|[1-9][0-9]*)$/;

function fieldErrorEl(id) {
  return document.getElementById(`${id}-error`);
}

function renderRows() {
  denomsList.replaceChildren();
  draft.rows.forEach((row, i) => {
    const li = document.createElement('li');
    li.className = 'denom-row';

    const valueDiv = document.createElement('div');
    valueDiv.className = 'field';
    const valueLabel = document.createElement('label');
    valueLabel.setAttribute('for', `value-${i}`);
    valueLabel.textContent = `${S.rowValue} ${i + 1}`;
    const valueInput = document.createElement('input');
    valueInput.id = `value-${i}`;
    valueInput.type = 'text';
    valueInput.inputMode = 'numeric';
    valueInput.maxLength = 12;
    valueInput.autocomplete = 'off';
    valueInput.value = row.value;
    valueInput.setAttribute('aria-describedby', `value-${i}-error`);
    const valueError = document.createElement('p');
    valueError.className = 'error';
    valueError.id = `value-${i}-error`;
    valueDiv.append(valueLabel, valueInput, valueError);

    const countDiv = document.createElement('div');
    countDiv.className = 'field';
    const countLabel = document.createElement('label');
    countLabel.setAttribute('for', `count-${i}`);
    countLabel.textContent = `${S.rowCount} ${i + 1}`;
    const countInput = document.createElement('input');
    countInput.id = `count-${i}`;
    countInput.type = 'text';
    countInput.inputMode = 'numeric';
    countInput.maxLength = 12;
    countInput.autocomplete = 'off';
    countInput.value = row.count;
    countInput.setAttribute('aria-describedby', `count-${i}-error`);
    const countError = document.createElement('p');
    countError.className = 'error';
    countError.id = `count-${i}-error`;
    countDiv.append(countLabel, countInput, countError);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `${S.removeRow} ${i + 1}`);
    removeBtn.disabled = draft.rows.length <= 1;
    removeBtn.addEventListener('click', () => {
      draft.rows.splice(i, 1);
      syncDraftToFlow();
      renderRows();
      render(flow.snapshot());
      const next = document.getElementById(`value-${Math.min(i, draft.rows.length - 1)}`);
      if (next) next.focus();
    });

    valueInput.addEventListener('input', () => {
      draft.rows[i].value = valueInput.value;
      clearFieldError(valueInput, valueError);
      syncDraftToFlow();
      render(flow.snapshot());
    });
    countInput.addEventListener('input', () => {
      draft.rows[i].count = countInput.value;
      clearFieldError(countInput, countError);
      syncDraftToFlow();
      render(flow.snapshot());
    });

    li.append(valueDiv, countDiv, removeBtn);
    denomsList.append(li);
  });
  addRowBtn.disabled = draft.rows.length >= 8;
}

function clearFieldError(input, errorEl) {
  input.removeAttribute('aria-invalid');
  errorEl.textContent = '';
}

function isDraftBlank() {
  if (draft.target !== '') return false;
  return draft.rows.every((r) => r.value === '' && r.count === '');
}

function syncDraftToFlow() {
  flow.edit(isDraftBlank() ? null : JSON.parse(JSON.stringify(draft)));
}

// Validate the form draft into a core input, or return field errors.
// Each error: { id, code, message } where id is the input element id.
function validateForm() {
  const errors = [];
  const push = (id, code, message) => errors.push({ id, code, message });

  let targetMinor = null;
  const rawTarget = draft.target;
  if (rawTarget === '') {
    push('target', 'REQUIRED', S.requiredTarget);
  } else if (!INT_PATTERN.test(rawTarget)) {
    push('target', 'SYNTAX', S.syntax);
  } else {
    targetMinor = Number(rawTarget);
    if (targetMinor < 0 || targetMinor > 10000) push('target', 'RANGE', S.rangeTarget);
  }

  const denominations = [];
  const seenValues = new Map();
  draft.rows.forEach((row, i) => {
    let valueMinor = null;
    let count = null;
    if (row.value === '') {
      push(`value-${i}`, 'REQUIRED', S.requiredValue);
    } else if (!INT_PATTERN.test(row.value)) {
      push(`value-${i}`, 'SYNTAX', S.syntax);
    } else {
      valueMinor = Number(row.value);
      if (valueMinor < 1 || valueMinor > 10000) {
        push(`value-${i}`, 'RANGE', S.rangeValue);
      } else if (seenValues.has(valueMinor)) {
        push(`value-${i}`, 'DUPLICATE', S.duplicate);
      } else {
        seenValues.set(valueMinor, i);
      }
    }
    if (row.count === '') {
      push(`count-${i}`, 'REQUIRED', S.requiredCount);
    } else if (!INT_PATTERN.test(row.count)) {
      push(`count-${i}`, 'SYNTAX', S.syntax);
    } else {
      count = Number(row.count);
      if (count < 0 || count > 99) push(`count-${i}`, 'RANGE', S.rangeCount);
    }
    denominations.push({ valueMinor, count });
  });

  if (errors.length > 0) return { errors };
  return {
    core: {
      targetMinor,
      denominations: denominations.map((d) => ({ valueMinor: d.valueMinor, count: d.count })),
    },
  };
}

function showFieldErrors(errors) {
  for (const e of errors) {
    const input = document.getElementById(e.id);
    const errorEl = fieldErrorEl(e.id);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (errorEl) errorEl.textContent = e.message;
  }
}

function clearAllFieldErrors() {
  targetInput.removeAttribute('aria-invalid');
  targetError.textContent = '';
  for (const el of denomsList.querySelectorAll('.error')) el.textContent = '';
  for (const el of denomsList.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
}

function renderStatusErrors(errors) {
  statusEl.replaceChildren();
  const intro = document.createElement('p');
  intro.textContent = S.errorIntro;
  statusEl.append(intro);
  const list = document.createElement('ul');
  for (const e of errors) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'linklike';
    btn.textContent = e.message;
    btn.addEventListener('click', () => {
      const input = document.getElementById(e.id);
      if (input) input.focus();
    });
    li.append(btn);
    list.append(li);
  }
  statusEl.append(list);
}

function renderResult(result) {
  document.getElementById('sum-total').textContent = fmt.format(result.totalMinor);
  document.getElementById('sum-kept').textContent = fmt.format(result.keptMinor);
  document.getElementById('sum-removed').textContent = fmt.format(result.removedMinor);
  document.getElementById('sum-shortfall').textContent = fmt.format(result.shortfallMinor);
  const shortfallNote = document.getElementById('shortfall-note');
  const exactNote = document.getElementById('exact-note');
  if (result.shortfallMinor > 0) {
    shortfallNote.textContent = S.shortfall(result.shortfallMinor);
    shortfallNote.hidden = false;
    exactNote.hidden = true;
  } else {
    exactNote.textContent = S.exact;
    exactNote.hidden = false;
    shortfallNote.hidden = true;
  }
  resultBody.replaceChildren();
  for (const row of result.rows) {
    const tr = document.createElement('tr');
    const tdValue = document.createElement('td');
    tdValue.textContent = fmt.format(row.valueMinor);
    const tdKept = document.createElement('td');
    tdKept.textContent = fmt.format(row.kept);
    const tdRemoved = document.createElement('td');
    tdRemoved.textContent = fmt.format(row.removed);
    tr.append(tdValue, tdKept, tdRemoved);
    resultBody.append(tr);
  }
}

function render(state) {
  if (settleTimer !== null && state.phase !== 'busy') {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  submitBtn.disabled = state.phase === 'busy';
  submitBtn.textContent = state.phase === 'busy' ? S.working : S.submit;
  cancelBtn.hidden = state.phase !== 'busy';

  if (state.phase === 'ready' && state.result) {
    statusEl.replaceChildren();
    const p = document.createElement('p');
    p.textContent = S.readyStatus;
    statusEl.append(p);
    renderResult(state.result);
    resultEl.hidden = false;
    resultEmpty.hidden = true;
  } else {
    resultEl.hidden = true;
    resultEmpty.hidden = false;
    if (state.phase === 'busy') {
      statusEl.replaceChildren();
      const p = document.createElement('p');
      p.textContent = S.working;
      statusEl.append(p);
    } else if (state.phase === 'error' && state.error && state.error.fields) {
      renderStatusErrors(state.error.fields);
    } else if (state.phase === 'error' && state.error) {
      statusEl.replaceChildren();
      const p = document.createElement('p');
      p.textContent = `${state.error.code} ${state.error.path}`;
      statusEl.append(p);
    } else if (state.phase === 'empty') {
      statusEl.replaceChildren();
    }
    // dirty: keep the status area as-is except clearing a stale ready note.
    if (state.phase === 'dirty') statusEl.replaceChildren();
  }
}

targetInput.addEventListener('input', () => {
  draft.target = targetInput.value;
  clearFieldError(targetInput, targetError);
  syncDraftToFlow();
  render(flow.snapshot());
});

addRowBtn.addEventListener('click', () => {
  if (draft.rows.length >= 8) return;
  draft.rows.push({ value: '', count: '' });
  syncDraftToFlow();
  renderRows();
  render(flow.snapshot());
  const last = draft.rows.length - 1;
  const el = document.getElementById(`value-${last}`);
  if (el) el.focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (flow.snapshot().phase === 'busy') return; // re-submit while busy is ignored
  clearAllFieldErrors();
  const checked = validateForm();
  if (checked.errors) {
    flow.fail({ code: 'FORM', path: '', fields: checked.errors });
    showFieldErrors(checked.errors);
    render(flow.snapshot());
    const first = document.getElementById(checked.errors[0].id);
    if (first) first.focus();
    return;
  }
  runIdCounter += 1;
  const runId = runIdCounter;
  flow.run(runId, checked.core);
  render(flow.snapshot());
  settleTimer = setTimeout(() => {
    settleTimer = null;
    render(flow.settle(runId));
  }, 0);
});

cancelBtn.addEventListener('click', () => {
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  render(flow.cancel());
});

loadExampleBtn.addEventListener('click', () => {
  draft = {
    target: '10',
    rows: [
      { value: '6', count: '1' },
      { value: '4', count: '2' },
      { value: '3', count: '3' },
    ],
  };
  targetInput.value = draft.target;
  clearAllFieldErrors();
  syncDraftToFlow();
  renderRows();
  statusEl.replaceChildren();
  const p = document.createElement('p');
  p.textContent = S.exampleLoaded;
  statusEl.append(p);
  render(flow.snapshot());
  targetInput.focus();
});

clearBtn.addEventListener('click', () => {
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  draft = { target: '', rows: [{ value: '', count: '' }] };
  targetInput.value = '';
  clearAllFieldErrors();
  flow.reset();
  renderRows();
  render(flow.snapshot());
  targetInput.focus();
});

// Leaving the page (including a bfcache restore) clears working memory.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    draft = { target: '', rows: [{ value: '', count: '' }] };
    targetInput.value = '';
    clearAllFieldErrors();
    flow.reset();
    renderRows();
    render(flow.snapshot());
  }
});

renderRows();
render(flow.snapshot());
