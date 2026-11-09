// Bicycle Gear Rollout Table — DOM controller. Pure logic lives in core;
// this file only wires fields, session state and safe DOM
// (textContent/value only). No network, no storage: input and results live
// in page memory only.
import {
  createFlow,
  formatTenths,
  parseIntegerField,
  EXAMPLE,
  MAX_FRONT,
  MAX_REAR,
} from './core/bicycle-gear-table.mjs';

const isEn = document.documentElement.lang === 'en';
const locale = isEn ? 'en' : 'zh-Hant';

const STRINGS = {
  'zh-Hant': {
    statusEmpty: '填寫輪周、踏頻與齒數，再按「列出齒比與前進量」。',
    statusDirty: '已修改，舊結果已清除。按「列出齒比與前進量」重新計算。',
    statusBusy: '計算中…',
    statusReady: '已列出齒比。相同齒比併成一列。',
    statusError: '有欄位需要修正，請看下方說明。',
    statusExample: '已載入範例。按「列出齒比與前進量」計算。',
    statusCleared: '已清除草稿。',
    working: '計算中…',
    submit: '列出齒比與前進量',
    cancel: '取消',
    frontLabel: (i) => `前齒 ${i + 1}`,
    rearLabel: (i) => `後齒 ${i + 1}`,
    remove: '移除',
    addFront: '新增前齒',
    addRear: '新增後齒',
    wheelLabel: '輪周',
    cadenceLabel: '踏頻',
    summary: (groups, combos) => `共 ${groups} 組齒比，${combos} 個齒組`,
    errorTitle: '請修正以下欄位',
    errType: (label) => `${label}：請輸入整數，只接受阿拉伯數字，不含空白、小數或符號。`,
    errRange: (label, min, max) => `${label}：超出範圍（${min}–${max}）。`,
    errDuplicate: (label) => `${label}：齒數重複，請改一個不同的齒數。`,
    errGeneric: '資料格式不正確，請重新填寫。',
  },
  en: {
    statusEmpty: 'Enter the wheel circumference, cadence and teeth, then press “Compare gear rollouts”.',
    statusDirty: 'Edited — the old result was cleared. Press “Compare gear rollouts” to recalculate.',
    statusBusy: 'Working…',
    statusReady: 'Gear ratios listed. Equal ratios share one row.',
    statusError: 'Some fields need fixing; see below.',
    statusExample: 'Example loaded. Press “Compare gear rollouts” to calculate.',
    statusCleared: 'Draft cleared.',
    working: 'Working…',
    submit: 'Compare gear rollouts',
    cancel: 'Cancel',
    frontLabel: (i) => `Chainring ${i + 1}`,
    rearLabel: (i) => `Cog ${i + 1}`,
    remove: 'Remove',
    addFront: 'Add chainring',
    addRear: 'Add cog',
    wheelLabel: 'Wheel circumference',
    cadenceLabel: 'Cadence',
    summary: (groups, combos) => `${groups} ratio groups, ${combos} combos`,
    errorTitle: 'Please fix the following fields',
    errType: (label) => `${label}: enter an integer using Arabic numerals only — no spaces, decimals or signs.`,
    errRange: (label, min, max) => `${label}: out of range (${min}–${max}).`,
    errDuplicate: (label) => `${label}: teeth count is duplicated; enter a different count.`,
    errGeneric: 'The data format is not valid; please refill the form.',
  },
}[isEn ? 'en' : 'zh-Hant'];

const $ = (id) => document.getElementById(id);
const form = $('gear-form');
const wheelInput = $('f-wheel');
const cadenceInput = $('f-cadence');
const frontList = $('front-list');
const rearList = $('rear-list');
const addFrontBtn = $('add-front');
const addRearBtn = $('add-rear');
const submitBtn = $('submit-btn');
const cancelBtn = $('cancel-btn');
const loadExampleBtn = $('load-example-btn');
const clearBtn = $('clear-btn');
const statusEl = $('status');
const errorSummary = $('error-summary');
const errorHeading = $('error-summary-heading');
const errorList = $('error-list');
const summaryLine = $('summary-line');
const emptyResult = $('empty-result');
const resultsWrap = $('results-wrap');
const groupsBody = $('groups-body');

const flow = createFlow();
let runCounter = 0;
let pendingTimer = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function fieldErrorEl(inputId) {
  return $(`${inputId}-error`);
}

function clearFieldErrors() {
  for (const el of form.querySelectorAll('[aria-invalid="true"]')) {
    el.removeAttribute('aria-invalid');
  }
  for (const el of form.querySelectorAll('.field-error')) {
    el.hidden = true;
    el.textContent = '';
  }
  errorSummary.hidden = true;
  errorList.textContent = '';
}

function clearResults() {
  groupsBody.textContent = '';
  resultsWrap.hidden = true;
  summaryLine.hidden = true;
  summaryLine.textContent = '';
  emptyResult.hidden = false;
}

// Build one teeth row (label + text input + remove button).
function buildRow(listEl, kind, index, value) {
  const li = document.createElement('li');
  li.className = 'teeth-row';
  const field = document.createElement('div');
  field.className = 'field';
  const label = document.createElement('label');
  const inputId = `${kind}-${index}`;
  label.htmlFor = inputId;
  label.textContent = kind === 'front' ? STRINGS.frontLabel(index) : STRINGS.rearLabel(index);
  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.maxLength = 12;
  input.required = true;
  input.value = value;
  input.dataset.kind = kind;
  input.dataset.index = String(index);
  const err = document.createElement('p');
  err.className = 'field-error';
  err.id = `${inputId}-error`;
  err.hidden = true;
  field.append(label, input, err);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-secondary btn-small';
  remove.textContent = STRINGS.remove;
  remove.addEventListener('click', () => {
    const values = readTeeth(kind).filter((_, i) => i !== index);
    renderTeeth(kind, values.length ? values : ['']);
    onEdit();
  });
  li.append(field, remove);
  return li;
}

function readTeeth(kind) {
  const listEl = kind === 'front' ? frontList : rearList;
  return [...listEl.querySelectorAll('input')].map((input) => input.value);
}

function renderTeeth(kind, values) {
  const listEl = kind === 'front' ? frontList : rearList;
  listEl.textContent = '';
  values.forEach((value, i) => {
    listEl.append(buildRow(listEl, kind, i, value));
  });
  const max = kind === 'front' ? MAX_FRONT : MAX_REAR;
  (kind === 'front' ? addFrontBtn : addRearBtn).disabled = values.length >= max;
}

function readDraftTexts() {
  return {
    wheelMm: wheelInput.value,
    cadence: cadenceInput.value,
    front: readTeeth('front'),
    rear: readTeeth('rear'),
  };
}

function allBlank() {
  const d = readDraftTexts();
  return d.wheelMm === '' && d.cadence === '' && d.front.every((v) => v === '') && d.rear.every((v) => v === '');
}

// Validate the form text against the core's exact field rules.
// Returns { data } on success or { errors } with fixed {code, path} items.
function validateForm() {
  const texts = readDraftTexts();
  const errors = [];
  const data = { wheelMm: 0, cadence: 0, front: [], rear: [] };

  const wheel = parseIntegerField(texts.wheelMm, 100, 5000, '/wheelMm');
  if (wheel.error) errors.push(wheel.error);
  else data.wheelMm = wheel.value;

  const cadence = parseIntegerField(texts.cadence, 0, 300, '/cadence');
  if (cadence.error) errors.push(cadence.error);
  else data.cadence = cadence.value;

  for (const [kind, textsArr, pathBase] of [
    ['front', texts.front, '/front'],
    ['rear', texts.rear, '/rear'],
  ]) {
    const seen = new Set();
    const values = [];
    textsArr.forEach((text, i) => {
      const path = `${pathBase}/${i}`;
      const parsed = parseIntegerField(text, 1, 120, path);
      if (parsed.error) {
        errors.push(parsed.error);
        return;
      }
      if (seen.has(parsed.value)) {
        errors.push({ code: 'DUPLICATE', path });
        return;
      }
      seen.add(parsed.value);
      values.push(parsed.value);
    });
    if (kind === 'front') data.front = values;
    else data.rear = values;
  }

  return errors.length ? { errors } : { data };
}

function labelForPath(path) {
  if (path === '/wheelMm') return STRINGS.wheelLabel;
  if (path === '/cadence') return STRINGS.cadenceLabel;
  const m = /^\/(front|rear)\/(\d+)$/.exec(path);
  if (m) {
    const i = Number(m[2]);
    return m[1] === 'front' ? STRINGS.frontLabel(i) : STRINGS.rearLabel(i);
  }
  return '';
}

function inputForPath(path) {
  if (path === '/wheelMm') return wheelInput;
  if (path === '/cadence') return cadenceInput;
  const m = /^\/(front|rear)\/(\d+)$/.exec(path);
  if (m) return $(`${m[1]}-${m[2]}`);
  return null;
}

function messageForError(error) {
  const label = labelForPath(error.path);
  if (error.code === 'TYPE') return STRINGS.errType(label);
  if (error.code === 'RANGE') {
    const ranges = { '/wheelMm': [100, 5000], '/cadence': [0, 300] };
    if (ranges[error.path]) {
      const [min, max] = ranges[error.path];
      return STRINGS.errRange(label, min, max);
    }
    return STRINGS.errRange(label, 1, 120);
  }
  if (error.code === 'DUPLICATE') return STRINGS.errDuplicate(label);
  return STRINGS.errGeneric;
}

function showErrors(errors) {
  clearFieldErrors();
  errorHeading.textContent = STRINGS.errorTitle;
  let firstInput = null;
  for (const error of errors) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = messageForError(error);
    const input = inputForPath(error.path);
    if (input) {
      a.href = `#${input.id}`;
      a.addEventListener('click', (event) => {
        event.preventDefault();
        input.focus();
      });
      input.setAttribute('aria-invalid', 'true');
      const errEl = fieldErrorEl(input.id);
      if (errEl) {
        errEl.textContent = messageForError(error);
        errEl.hidden = false;
      }
      if (!firstInput) firstInput = input;
    }
    li.append(a);
    errorList.append(li);
  }
  errorSummary.hidden = false;
  if (firstInput) firstInput.focus();
}

function renderResults(result) {
  clearResults();
  const totalCombos = result.groups.reduce((sum, g) => sum + g.combos.length, 0);
  summaryLine.textContent = STRINGS.summary(result.groups.length, totalCombos);
  summaryLine.hidden = false;
  emptyResult.hidden = true;
  for (const group of result.groups) {
    const tr = document.createElement('tr');
    const ratioTd = document.createElement('td');
    ratioTd.textContent = `${group.ratio[0]} / ${group.ratio[1]}`;
    const combosTd = document.createElement('td');
    for (const [f, r] of group.combos) {
      const span = document.createElement('span');
      span.className = 'combo';
      span.textContent = `${f} / ${r}`;
      combosTd.append(span);
    }
    const rollTd = document.createElement('td');
    rollTd.textContent = `${formatTenths(group.rollTenthsMm, locale)} mm`;
    const speedTd = document.createElement('td');
    speedTd.textContent = `${formatTenths(group.speedTenthsKmh, locale)} km/h`;
    tr.append(ratioTd, combosTd, rollTd, speedTd);
    groupsBody.append(tr);
  }
  resultsWrap.hidden = false;
}

function renderFromSnapshot() {
  const snap = flow.snapshot();
  cancelBtn.hidden = snap.phase !== 'busy';
  submitBtn.disabled = snap.phase === 'busy';
  submitBtn.textContent = snap.phase === 'busy' ? STRINGS.working : STRINGS.submit;
  if (snap.phase === 'ready') {
    setStatus(STRINGS.statusReady);
    renderResults(snap.result);
  } else if (snap.phase === 'error') {
    setStatus(STRINGS.statusError);
    showErrors([snap.error]);
  }
}

function cancelPending() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function onEdit() {
  cancelPending();
  flow.edit(null);
  clearFieldErrors();
  clearResults();
  setStatus(allBlank() ? STRINGS.statusEmpty : STRINGS.statusDirty);
  renderFromSnapshot();
}

form.addEventListener('input', (event) => {
  if (event.target instanceof HTMLInputElement) onEdit();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (flow.snapshot().phase === 'busy') return;
  cancelPending();
  clearFieldErrors();
  clearResults();
  const { data, errors } = validateForm();
  if (errors) {
    setStatus(STRINGS.statusError);
    showErrors(errors);
    return;
  }
  flow.edit(data);
  runCounter += 1;
  const runId = runCounter;
  flow.run(runId);
  setStatus(STRINGS.statusBusy);
  renderFromSnapshot();
  // The pure core runs as a next-event-loop work item; the runId gate
  // drops the reply if the draft was edited or cancelled meanwhile.
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flow.settle(runId);
    renderFromSnapshot();
  }, 0);
});

cancelBtn.addEventListener('click', () => {
  cancelPending();
  flow.cancel();
  setStatus(STRINGS.statusDirty);
  renderFromSnapshot();
});

loadExampleBtn.addEventListener('click', () => {
  cancelPending();
  wheelInput.value = String(EXAMPLE.wheelMm);
  cadenceInput.value = String(EXAMPLE.cadence);
  renderTeeth('front', EXAMPLE.front.map(String));
  renderTeeth('rear', EXAMPLE.rear.map(String));
  flow.edit(EXAMPLE);
  clearFieldErrors();
  clearResults();
  setStatus(STRINGS.statusExample);
  renderFromSnapshot();
});

function resetAll(focusFirst) {
  cancelPending();
  flow.reset();
  wheelInput.value = '';
  cadenceInput.value = '';
  renderTeeth('front', ['']);
  renderTeeth('rear', ['']);
  clearFieldErrors();
  clearResults();
  setStatus(STRINGS.statusEmpty);
  renderFromSnapshot();
  if (focusFirst) wheelInput.focus();
}

clearBtn.addEventListener('click', () => resetAll(true));

addFrontBtn.addEventListener('click', () => {
  const values = readTeeth('front');
  if (values.length < MAX_FRONT) {
    values.push('');
    renderTeeth('front', values);
    onEdit();
  }
});

addRearBtn.addEventListener('click', () => {
  const values = readTeeth('rear');
  if (values.length < MAX_REAR) {
    values.push('');
    renderTeeth('rear', values);
    onEdit();
  }
});

// Leaving the page (including a bfcache restore) clears working memory.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) resetAll(false);
});

// Init: one blank front row and one blank rear row, empty phase.
renderTeeth('front', ['']);
renderTeeth('rear', ['']);
setStatus(STRINGS.statusEmpty);
document.getElementById('boot-note')?.remove();
