// DOM controller for Card Sleeve Stock Fit.
// Owns the form, the run-state machine and the worker. All user text is
// inserted with textContent/value only. Input and results stay in page
// memory; nothing is written to the URL, logs or any storage.
import { solve, parseTenths, parseIntField, normalizeName } from './core/solve.mjs';
import { createFlow } from './core/flow.mjs';

const LANG = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';

const STR = {
  'zh-Hant': {
    statusEmpty: '填寫左側欄位後，按「分配現有牌套」開始計算。',
    statusDirty: '草稿已更改，尚未分配。',
    statusBusy: '計算中…',
    statusReady: (covered, total) => `已完成分配：覆蓋 ${covered} / ${total} 張。`,
    statusError: '輸入有誤，請依下列說明修正後再送出。',
    submit: '分配現有牌套',
    submitBusy: '計算中',
    cancel: '取消',
    noteAllCovered: '全部卡片皆已覆蓋。',
    noteShort: (missing) => `仍有 ${missing} 張未覆蓋：可放寬最大餘隙、增加相容牌套的庫存，或新增尺寸相容的牌套，再重新分配。`,
    noteNone: '沒有任何卡片可套：請檢查每族卡片是否有尺寸相容且有庫存的牌套，或放寬餘隙區間。',
    allocNone: '—',
    allocItem: (name, qty) => `${name} × ${qty}`,
    size: (w, h) => `${w} × ${h} mm`,
    errSIZE: '輸入資料過大（超過 64 KB），請減少列數後再試。',
    errSHAPE: '欄位不完整或有多餘欄位，請檢查後再試。',
    errTYPE: '請輸入有效的數字。',
    errRANGE: '超出允許範圍，請修正後再試。',
    errDUPLICATE: '名稱重複，請改用不同的名稱。',
    errORDER: '最大餘隙不可小於最小餘隙。',
    errREF: '參照無法解析。',
    errENUM: '選項無效。',
    errRequired: '此欄必填。',
    fixLink: '前往修正',
    cardName: (n) => `卡族 ${n} 名稱`,
    cardW: (n) => `卡族 ${n} 外寬`,
    cardH: (n) => `卡族 ${n} 外高`,
    cardQty: (n) => `卡族 ${n} 張數`,
    sleeveName: (n) => `牌套 ${n} 名稱`,
    sleeveW: (n) => `牌套 ${n} 內寬`,
    sleeveH: (n) => `牌套 ${n} 內高`,
    sleeveStock: (n) => `牌套 ${n} 庫存`,
    removeRow: (n) => `移除第 ${n} 列`,
    addCard: '＋ 新增一列卡族',
    addSleeve: '＋ 新增一列牌套',
  },
  en: {
    statusEmpty: 'Fill in the fields on the left, then choose “Allocate available sleeves”.',
    statusDirty: 'Draft changed; not allocated yet.',
    statusBusy: 'Working…',
    statusReady: (covered, total) => `Allocation done: ${covered} of ${total} cards covered.`,
    statusError: 'There are input errors. Fix them using the notes below, then submit again.',
    submit: 'Allocate available sleeves',
    submitBusy: 'Working',
    cancel: 'Cancel',
    noteAllCovered: 'Every card is covered.',
    noteShort: (missing) => `${missing} card(s) still uncovered: widen the maximum gap, add stock of a compatible sleeve, or add a sleeve with a compatible size, then allocate again.`,
    noteNone: 'No card can be sleeved: check that each group has a compatible sleeve with stock, or widen the gap range.',
    allocNone: '—',
    allocItem: (name, qty) => `${name} × ${qty}`,
    size: (w, h) => `${w} × ${h} mm`,
    errSIZE: 'The input is too large (over 64 KB). Remove some rows and try again.',
    errSHAPE: 'Fields are missing or extra. Check the form and try again.',
    errTYPE: 'Enter a valid number.',
    errRANGE: 'Out of the allowed range. Fix it and try again.',
    errDUPLICATE: 'This name is used twice. Use a different name.',
    errORDER: 'The maximum gap cannot be smaller than the minimum gap.',
    errREF: 'The reference cannot be resolved.',
    errENUM: 'The option is invalid.',
    errRequired: 'This field is required.',
    fixLink: 'Go to fix',
    cardName: (n) => `Card group ${n} name`,
    cardW: (n) => `Card group ${n} outer width`,
    cardH: (n) => `Card group ${n} outer height`,
    cardQty: (n) => `Card group ${n} count`,
    sleeveName: (n) => `Sleeve ${n} name`,
    sleeveW: (n) => `Sleeve ${n} inner width`,
    sleeveH: (n) => `Sleeve ${n} inner height`,
    sleeveStock: (n) => `Sleeve ${n} stock`,
    removeRow: (n) => `Remove row ${n}`,
    addCard: '+ Add a card group row',
    addSleeve: '+ Add a sleeve row',
  },
}[LANG];

const T = STR;
const $ = (id) => document.getElementById(id);

const form = $('sleeve-form');
const statusEl = $('status');
const resultEl = $('result');
const submitBtn = $('submit');
const cancelBtn = $('cancel');
const minGapInput = $('min-gap');
const maxGapInput = $('max-gap');

// --- model ---------------------------------------------------------------
function blankCard() { return { name: '', w: '', h: '', qty: '' }; }
function blankSleeve() { return { name: '', w: '', h: '', stock: '' }; }
const model = {
  cards: [blankCard()],
  sleeves: [blankSleeve()],
};

const EXAMPLE = {
  minGap: '0',
  maxGap: '2',
  cards: [
    { name: 'A', w: '63', h: '88', qty: '1' },
    { name: 'B', w: '62', h: '88', qty: '1' },
  ],
  sleeves: [
    { name: 'S1', w: '63', h: '88', stock: '1' },
    { name: 'S2', w: '65', h: '88', stock: '1' },
  ],
};

// --- flow + worker --------------------------------------------------------
const flow = createFlow({
  validate: (input) => {
    if (input === null || input === undefined) return { code: 'TYPE', path: '' };
    const reply = solve(input);
    return reply.status === 'error' ? reply.error : null;
  },
  solve,
});
let runCounter = 0;
let worker = null;
try {
  worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    const snap = flow.snapshot();
    if (msg.runId !== snap.activeRunId) return; // stale reply: ignore
    if (msg.type === 'result') {
      flow.settle(msg.runId, msg.reply);
      render();
    }
    // 'progress' and 'cancelled' need no UI change: the busy state already
    // shows, and a cancel the user asked for already moved the flow.
  };
  worker.onerror = () => {
    worker = null;
    const snap = flow.snapshot();
    if (snap.phase === 'busy') {
      flow.settle(snap.activeRunId); // synchronous fallback for this run
      render();
    }
  };
} catch {
  worker = null;
}

// --- formatting ------------------------------------------------------------
const mmFmt = new Intl.NumberFormat(LANG === 'en' ? 'en' : 'zh-Hant', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat(LANG === 'en' ? 'en' : 'zh-Hant');
function fmtMm(tenths) { return mmFmt.format(tenths / 10); }
function fmtInt(n) { return intFmt.format(n); }

// --- row rendering ---------------------------------------------------------
function fieldCell(rowEl, kind, index, label, value, maxLength, inputMode) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const labelEl = document.createElement('label');
  const id = `${kind}-${index}-${label.key}`;
  labelEl.htmlFor = id;
  labelEl.textContent = label.text;
  const input = document.createElement('input');
  input.id = id;
  input.name = id;
  input.type = 'text';
  input.inputMode = inputMode;
  input.maxLength = maxLength;
  input.value = value;
  input.setAttribute('aria-describedby', `${id}-error`);
  const errorEl = document.createElement('p');
  errorEl.className = 'error';
  errorEl.id = `${id}-error`;
  input.addEventListener('input', () => {
    label.set(input.value);
    clearFieldError(input, errorEl);
    onEdit();
  });
  wrap.append(labelEl, input, errorEl);
  rowEl.append(wrap);
  return input;
}

function renderRows() {
  const cardList = $('card-rows');
  const sleeveList = $('sleeve-rows');
  cardList.textContent = '';
  sleeveList.textContent = '';
  model.cards.forEach((row, i) => {
    const li = document.createElement('li');
    li.className = 'data-row';
    fieldCell(li, 'card', i, { key: 'name', text: T.cardName(i + 1), set: (v) => { row.name = v; } }, row.name, 128, 'text');
    fieldCell(li, 'card', i, { key: 'w', text: T.cardW(i + 1), set: (v) => { row.w = v; } }, row.w, 12, 'decimal');
    fieldCell(li, 'card', i, { key: 'h', text: T.cardH(i + 1), set: (v) => { row.h = v; } }, row.h, 12, 'decimal');
    fieldCell(li, 'card', i, { key: 'qty', text: T.cardQty(i + 1), set: (v) => { row.qty = v; } }, row.qty, 12, 'numeric');
    li.append(removeButton('card', i));
    cardList.append(li);
  });
  model.sleeves.forEach((row, i) => {
    const li = document.createElement('li');
    li.className = 'data-row';
    fieldCell(li, 'sleeve', i, { key: 'name', text: T.sleeveName(i + 1), set: (v) => { row.name = v; } }, row.name, 128, 'text');
    fieldCell(li, 'sleeve', i, { key: 'w', text: T.sleeveW(i + 1), set: (v) => { row.w = v; } }, row.w, 12, 'decimal');
    fieldCell(li, 'sleeve', i, { key: 'h', text: T.sleeveH(i + 1), set: (v) => { row.h = v; } }, row.h, 12, 'decimal');
    fieldCell(li, 'sleeve', i, { key: 'stock', text: T.sleeveStock(i + 1), set: (v) => { row.stock = v; } }, row.stock, 12, 'numeric');
    li.append(removeButton('sleeve', i));
    sleeveList.append(li);
  });
  $('add-card').disabled = model.cards.length >= 8;
  $('add-sleeve').disabled = model.sleeves.length >= 8;
}

function removeButton(kind, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'remove-row';
  btn.textContent = '✕';
  btn.setAttribute('aria-label', T.removeRow(index + 1));
  btn.disabled = (kind === 'card' ? model.cards.length : model.sleeves.length) <= 1;
  btn.addEventListener('click', () => {
    if (kind === 'card') model.cards.splice(index, 1);
    else model.sleeves.splice(index, 1);
    renderRows();
    onEdit();
    $(kind === 'card' ? 'add-card' : 'add-sleeve').focus();
  });
  return btn;
}

// --- errors ------------------------------------------------------------------
function fieldIdForPath(path) {
  if (path === '/minGap') return 'min-gap';
  if (path === '/maxGap') return 'max-gap';
  const m = /^\/(cards|sleeves)\/(\d+)\/(name|w|h|qty|stock)$/.exec(path);
  if (m) return `${m[1] === 'cards' ? 'card' : 'sleeve'}-${m[2]}-${m[3]}`;
  return null;
}

function clearFieldError(input, errorEl) {
  input.removeAttribute('aria-invalid');
  if (errorEl) errorEl.textContent = '';
}

function clearAllErrors() {
  for (const input of form.querySelectorAll('input')) {
    input.removeAttribute('aria-invalid');
  }
  for (const el of form.querySelectorAll('.error')) el.textContent = '';
}

function messageFor(code) {
  return T[`err${code}`] || T.errTYPE;
}

// errors: [{code, path, fieldId?}] — show per-field text and a status summary
// with links; focus the first error field. Returns the first field id.
function showErrors(errors) {
  clearAllErrors();
  const items = [];
  let firstFieldId = null;
  for (const e of errors) {
    const fieldId = e.fieldId || fieldIdForPath(e.path);
    if (fieldId) {
      const input = $(fieldId);
      const errorEl = $(`${fieldId}-error`);
      if (input && errorEl) {
        input.setAttribute('aria-invalid', 'true');
        errorEl.textContent = messageFor(e.code);
      }
      if (!firstFieldId) firstFieldId = fieldId;
      items.push({ code: e.code, fieldId });
    } else {
      items.push({ code: e.code, fieldId: null });
    }
  }
  statusEl.textContent = '';
  const intro = document.createElement('p');
  intro.textContent = T.statusError;
  statusEl.append(intro);
  const list = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    if (item.fieldId) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'linklike';
      btn.textContent = `${messageFor(item.code)} — ${T.fixLink}`;
      btn.addEventListener('click', () => {
        const input = $(item.fieldId);
        if (input) input.focus();
      });
      li.append(btn);
    } else {
      li.textContent = messageFor(item.code);
    }
    list.append(li);
  }
  statusEl.append(list);
  if (firstFieldId) {
    const input = $(firstFieldId);
    if (input) input.focus();
  }
  return firstFieldId;
}

// --- parsing the form into core input ----------------------------------------
function parseForm() {
  const errors = [];
  const readTenths = (text, path, fieldId) => {
    const v = parseTenths(text.trim());
    if (v === null) errors.push({ code: 'TYPE', path, fieldId });
    return v;
  };
  const readInt = (text, path, fieldId) => {
    const v = parseIntField(text.trim());
    if (v === null) errors.push({ code: 'TYPE', path, fieldId });
    return v;
  };
  const readName = (text, path, fieldId) => {
    if (normalizeName(text) === '') errors.push({ code: 'RANGE', path, fieldId });
    return text;
  };

  const minGap = readTenths(minGapInput.value, '/minGap', 'min-gap');
  const maxGap = readTenths(maxGapInput.value, '/maxGap', 'max-gap');
  const cards = model.cards.map((row, i) => ({
    name: readName(row.name, `/cards/${i}/name`, `card-${i}-name`),
    w: readTenths(row.w, `/cards/${i}/w`, `card-${i}-w`),
    h: readTenths(row.h, `/cards/${i}/h`, `card-${i}-h`),
    qty: readInt(row.qty, `/cards/${i}/qty`, `card-${i}-qty`),
  }));
  const sleeves = model.sleeves.map((row, i) => ({
    name: readName(row.name, `/sleeves/${i}/name`, `sleeve-${i}-name`),
    w: readTenths(row.w, `/sleeves/${i}/w`, `sleeve-${i}-w`),
    h: readTenths(row.h, `/sleeves/${i}/h`, `sleeve-${i}-h`),
    stock: readInt(row.stock, `/sleeves/${i}/stock`, `sleeve-${i}-stock`),
  }));
  if (errors.length > 0) return { errors };
  return { input: { minGap, maxGap, cards, sleeves } };
}

// --- render ------------------------------------------------------------------
function setStatusText(text) {
  statusEl.textContent = '';
  const p = document.createElement('p');
  p.textContent = text;
  statusEl.append(p);
}

function renderResult(result) {
  const total = result.cardRows.reduce((s, r) => s + r.missing, 0) + result.covered;
  const missing = result.cardRows.reduce((s, r) => s + r.missing, 0);
  $('sum-covered').textContent = fmtInt(result.covered);
  $('sum-total').textContent = fmtInt(total);
  $('sum-missing').textContent = fmtInt(missing);

  const note = $('result-note');
  note.hidden = false;
  if (missing === 0) {
    note.textContent = T.noteAllCovered;
    note.classList.add('ok');
  } else {
    note.classList.remove('ok');
    note.textContent = result.covered === 0 ? T.noteNone : T.noteShort(missing);
  }

  const cardBody = $('card-result-table').querySelector('tbody');
  cardBody.textContent = '';
  const inputCards = model.cards;
  result.cardRows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const cells = [
      row.name,
      T.size(fmtMm(inputCards[i] ? parseTenths(inputCards[i].w) ?? 0 : 0), fmtMm(inputCards[i] ? parseTenths(inputCards[i].h) ?? 0 : 0)),
      fmtInt(row.missing + row.use.reduce((s, u) => s + u.qty, 0)),
      row.use.length === 0 ? T.allocNone : row.use.map((u) => T.allocItem(u.sleeve, fmtInt(u.qty))).join(', '),
      fmtInt(row.missing),
    ];
    for (const text of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    cardBody.append(tr);
  });

  const sleeveBody = $('sleeve-result-table').querySelector('tbody');
  sleeveBody.textContent = '';
  const inputSleeves = model.sleeves;
  result.sleeveRows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const stock = inputSleeves[i] ? parseIntField(inputSleeves[i].stock) ?? 0 : 0;
    const cells = [
      row.name,
      T.size(fmtMm(inputSleeves[i] ? parseTenths(inputSleeves[i].w) ?? 0 : 0), fmtMm(inputSleeves[i] ? parseTenths(inputSleeves[i].h) ?? 0 : 0)),
      fmtInt(stock),
      fmtInt(row.remaining),
    ];
    for (const text of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    sleeveBody.append(tr);
  });

  resultEl.hidden = false;
}

function render() {
  const snap = flow.snapshot();
  if (snap.phase === 'ready' && snap.result) {
    setStatusText(T.statusReady(snap.result.covered,
      snap.result.cardRows.reduce((s, r) => s + r.missing, 0) + snap.result.covered));
    renderResult(snap.result);
  } else if (snap.phase === 'error' && snap.error) {
    resultEl.hidden = true;
    showErrors([{ code: snap.error.code, path: snap.error.path }]);
  } else if (snap.phase === 'busy') {
    resultEl.hidden = true;
    setStatusText(T.statusBusy);
  } else if (snap.phase === 'dirty') {
    resultEl.hidden = true;
    setStatusText(T.statusDirty);
  } else {
    resultEl.hidden = true;
    setStatusText(T.statusEmpty);
  }
  const busy = snap.phase === 'busy';
  submitBtn.disabled = busy;
  submitBtn.textContent = busy ? T.submitBusy : T.submit;
  cancelBtn.hidden = !busy;
}

// --- events ------------------------------------------------------------------
function onEdit() {
  const snap = flow.snapshot();
  if (snap.phase === 'busy' && snap.activeRunId !== null) {
    if (worker) worker.postMessage({ type: 'cancel', runId: snap.activeRunId });
  }
  resultEl.hidden = true;
  clearAllErrors();
  flow.edit({
    minGap: minGapInput.value,
    maxGap: maxGapInput.value,
    cards: model.cards,
    sleeves: model.sleeves,
  });
  render();
}

minGapInput.addEventListener('input', () => { clearFieldError(minGapInput, $('min-gap-error')); onEdit(); });
maxGapInput.addEventListener('input', () => { clearFieldError(maxGapInput, $('max-gap-error')); onEdit(); });

$('add-card').addEventListener('click', () => {
  if (model.cards.length >= 8) return;
  model.cards.push(blankCard());
  renderRows();
  onEdit();
  $(`card-${model.cards.length - 1}-name`).focus();
});
$('add-sleeve').addEventListener('click', () => {
  if (model.sleeves.length >= 8) return;
  model.sleeves.push(blankSleeve());
  renderRows();
  onEdit();
  $(`sleeve-${model.sleeves.length - 1}-name`).focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const snap = flow.snapshot();
  if (snap.phase === 'busy') return; // re-submit while busy is ignored
  const parsed = parseForm();
  if (parsed.errors) {
    flow.fail(parsed.errors[0]);
    showErrors(parsed.errors);
    return;
  }
  const runId = ++runCounter;
  flow.run(runId, parsed.input);
  const after = flow.snapshot();
  if (after.phase === 'error' && after.error) {
    render();
    return;
  }
  render();
  if (worker) {
    worker.postMessage({ type: 'run', runId, input: parsed.input });
  } else {
    // Synchronous fallback when the worker could not start.
    setTimeout(() => {
      const s = flow.snapshot();
      if (s.phase === 'busy' && s.activeRunId === runId) {
        flow.settle(runId);
        render();
      }
    }, 0);
  }
});

cancelBtn.addEventListener('click', () => {
  const snap = flow.snapshot();
  if (snap.phase !== 'busy') return;
  if (worker) worker.postMessage({ type: 'cancel', runId: snap.activeRunId });
  flow.cancel();
  render();
});

$('load-example').addEventListener('click', () => {
  minGapInput.value = EXAMPLE.minGap;
  maxGapInput.value = EXAMPLE.maxGap;
  model.cards = EXAMPLE.cards.map((r) => ({ ...r }));
  model.sleeves = EXAMPLE.sleeves.map((r) => ({ ...r }));
  renderRows();
  onEdit();
  submitBtn.focus();
});

$('clear-draft').addEventListener('click', () => {
  resetAll();
  minGapInput.focus();
});

function resetAll() {
  const snap = flow.snapshot();
  if (snap.phase === 'busy' && snap.activeRunId !== null && worker) {
    worker.postMessage({ type: 'cancel', runId: snap.activeRunId });
  }
  minGapInput.value = '0';
  maxGapInput.value = '2';
  model.cards = [blankCard()];
  model.sleeves = [blankSleeve()];
  renderRows();
  clearAllErrors();
  flow.reset();
  render();
}

// Leaving the page (including a bfcache restore) clears working memory.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) resetAll();
});

// --- init ----------------------------------------------------------------------
renderRows();
render();
