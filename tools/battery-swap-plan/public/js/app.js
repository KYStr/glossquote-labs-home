// DOM controller for Event Battery Swap Plan. All text is set with
// textContent/value; user input is never inserted as HTML. No network, no
// storage: input, results and errors live only in page memory.
import { solve, validate, validateName, normalizeName } from './core/solve.mjs';
import { createFlow } from './core/flow.mjs';

const LANG = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';

const STRINGS = {
  zh: {
    working: '計算中',
    submit: '排出裝入與替換',
    readyStatus: '已排出裝入與替換。請逐列核對每組的裝入或替換時刻。',
    shortage: (n, minute, device) => `首次缺口在第 ${n} 個事件（${minute}，${device}），全場共需 ${n} 組以上。請補備用組或調整時段。`,
    enough: '現有滿電組足夠，全場沒有缺口。',
    requiredCharged: '請填寫現有滿電組數。',
    requiredName: '請填寫設備名稱。',
    requiredRuntime: '請填寫實測續航分鐘。',
    requiredTime: '請填寫時間（HH:MM）。',
    syntaxInt: '只接受 ASCII 十進位整數（例如 30），不要空白、前導零、全形數字、小數或正負號。',
    syntaxTime: '時間請用 HH:MM（例如 09:30）；結束可用 24:00。',
    rangeCharged: '滿電組數須在 0 到 100 之間。',
    rangeRuntime: '實測續航須在 10 到 1440 分鐘之間。',
    rangeTimeStart: '開始時間須在 00:00 到 23:59 之間。',
    rangeTimeEnd: '結束時間須在 00:01 到 24:00 之間。',
    nameFormat: '名稱須以字母或數字開頭，其餘只能用字母、數字、空格、連字號或底線。',
    nameLength: '名稱長度須為 1 到 24 個字元。',
    duplicateName: '這個設備名稱已經用過，請改一個不同的名稱。',
    order: '結束時間必須晚於開始時間。',
    overlap: '這個時段與同台設備的另一時段重疊。',
    deviceLabel: (n) => `設備 ${n}`,
    removeDevice: '移除這台設備',
    addDevice: '＋ 新增一台設備',
    nameLabel: '設備名稱',
    runtimeLabel: '實測續航（分鐘）',
    runLabel: (n) => `時段 ${n}`,
    startLabel: '開始',
    endLabel: '結束',
    removeRun: '移除此時段',
    addRun: '＋ 新增一時段',
    errorIntro: '有欄位需要修正：',
    exampleLoaded: '已載入範例（3 組滿電；A 續航 30 分，00:00–00:20、00:40–01:05；B 續航 20 分，00:10–00:50）。請按「排出裝入與替換」。',
    kindLoad: '裝入',
    kindSwap: '替換',
    noPack: '缺組',
    firstMissingLabel: '首次缺口',
    noMissing: '無缺口',
  },
  en: {
    working: 'Working',
    submit: 'Plan battery swaps',
    readyStatus: 'Swap plan ready. Check each row for when a pack is loaded or swapped.',
    shortage: (n, minute, device) => `First shortage at event ${n} (${minute}, ${device}); the day needs at least ${n} packs. Add spare packs or adjust the schedule.`,
    enough: 'The charged packs on hand are enough; there is no shortage.',
    requiredCharged: 'Enter how many packs are charged.',
    requiredName: 'Enter a device name.',
    requiredRuntime: 'Enter the measured runtime in minutes.',
    requiredTime: 'Enter a time (HH:MM).',
    syntaxInt: 'ASCII decimal integers only (for example 30) — no spaces, leading zeros, full-width digits, decimals or signs.',
    syntaxTime: 'Use HH:MM (for example 09:30); 24:00 is allowed as an end time.',
    rangeCharged: 'Charged packs must be between 0 and 100.',
    rangeRuntime: 'Measured runtime must be between 10 and 1440 minutes.',
    rangeTimeStart: 'Start time must be between 00:00 and 23:59.',
    rangeTimeEnd: 'End time must be between 00:01 and 24:00.',
    nameFormat: 'A name must start with a letter or digit; the rest may only use letters, digits, spaces, hyphens or underscores.',
    nameLength: 'A name must be 1 to 24 characters long.',
    duplicateName: 'This device name is already used; pick a different name.',
    order: 'The end time must be later than the start time.',
    overlap: 'This period overlaps another period of the same device.',
    deviceLabel: (n) => `Device ${n}`,
    removeDevice: 'Remove this device',
    addDevice: '＋ Add a device',
    nameLabel: 'Device name',
    runtimeLabel: 'Measured runtime (minutes)',
    runLabel: (n) => `Period ${n}`,
    startLabel: 'Start',
    endLabel: 'End',
    removeRun: 'Remove this period',
    addRun: '＋ Add a period',
    errorIntro: 'Some fields need fixing:',
    exampleLoaded: 'Example loaded (3 charged packs; A runs 30 min, 00:00–00:20 and 00:40–01:05; B runs 20 min, 00:10–00:50). Press “Plan battery swaps”.',
    kindLoad: 'Load',
    kindSwap: 'Swap',
    noPack: 'Missing',
    firstMissingLabel: 'First shortage',
    noMissing: 'No shortage',
  },
};

const S = STRINGS[LANG];
const fmt = new Intl.NumberFormat(LANG === 'zh' ? 'zh-Hant' : 'en');

const form = document.getElementById('plan-form');
const chargedInput = document.getElementById('charged');
const chargedError = document.getElementById('charged-error');
const devicesList = document.getElementById('devices');
const addDeviceBtn = document.getElementById('add-device');
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

// Form draft: { charged: string, devices: [{ name, runtime, runs: [{start, end}] }] }
function blankDraft() {
  return {
    charged: '',
    devices: [{ name: '', runtime: '', runs: [{ start: '', end: '' }] }],
  };
}
let draft = blankDraft();

const INT_PATTERN = /^(0|[1-9][0-9]*)$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

function fmtTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Parse an HH:MM field. Returns { minutes } or { error: 'SYNTAX'|'RANGE' }.
// 24:00 is allowed only as an end time.
function parseTime(raw, isEnd) {
  if (!TIME_PATTERN.test(raw)) return { error: 'SYNTAX' };
  const h = Number(raw.slice(0, 2));
  const m = Number(raw.slice(3, 5));
  if (h > 24 || m > 59) return { error: 'SYNTAX' };
  const minutes = h * 60 + m;
  if (minutes > (isEnd ? 1440 : 1439)) return { error: 'RANGE' };
  if (!isEnd && minutes < 0) return { error: 'RANGE' };
  if (isEnd && minutes < 1) return { error: 'RANGE' };
  return { minutes };
}

function fieldErrorEl(id) {
  return document.getElementById(`${id}-error`);
}

function clearFieldError(input, errorEl) {
  if (input) input.removeAttribute('aria-invalid');
  if (errorEl) errorEl.textContent = '';
}

function isDraftBlank() {
  if (draft.charged !== '') return false;
  return draft.devices.every(
    (d) => d.name === '' && d.runtime === ''
      && d.runs.every((r) => r.start === '' && r.end === ''),
  );
}

function syncDraftToFlow() {
  flow.edit(isDraftBlank() ? null : JSON.parse(JSON.stringify(draft)));
}

function makeField(container, labelText, id, opts) {
  const div = document.createElement('div');
  div.className = 'field';
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.autocomplete = 'off';
  input.maxLength = opts.maxLength;
  if (opts.inputMode) input.inputMode = opts.inputMode;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  input.value = opts.value;
  input.setAttribute('aria-describedby', `${id}-error`);
  const errorEl = document.createElement('p');
  errorEl.className = 'error';
  errorEl.id = `${id}-error`;
  div.append(label, input, errorEl);
  container.append(div);
  return { input, errorEl };
}

function renderDevices() {
  devicesList.replaceChildren();
  draft.devices.forEach((device, i) => {
    const li = document.createElement('li');
    li.className = 'device';

    const head = document.createElement('div');
    head.className = 'device-head';
    const title = document.createElement('h3');
    title.textContent = S.deviceLabel(i + 1);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-device';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `${S.removeDevice} ${i + 1}`);
    removeBtn.disabled = draft.devices.length <= 1;
    removeBtn.addEventListener('click', () => {
      draft.devices.splice(i, 1);
      syncDraftToFlow();
      renderDevices();
      render(flow.snapshot());
      const next = document.getElementById(`name-${Math.min(i, draft.devices.length - 1)}`);
      if (next) next.focus();
    });
    head.append(title, removeBtn);
    li.append(head);

    const nameRow = makeField(li, S.nameLabel, `name-${i}`, {
      maxLength: 128, value: device.name,
    });
    nameRow.input.addEventListener('input', () => {
      draft.devices[i].name = nameRow.input.value;
      clearFieldError(nameRow.input, nameRow.errorEl);
      syncDraftToFlow();
      render(flow.snapshot());
    });

    const runtimeRow = makeField(li, S.runtimeLabel, `runtime-${i}`, {
      maxLength: 12, inputMode: 'numeric', value: device.runtime,
    });
    runtimeRow.input.addEventListener('input', () => {
      draft.devices[i].runtime = runtimeRow.input.value;
      clearFieldError(runtimeRow.input, runtimeRow.errorEl);
      syncDraftToFlow();
      render(flow.snapshot());
    });

    const runsTitle = document.createElement('p');
    runsTitle.className = 'runs-title';
    runsTitle.textContent = LANG === 'zh' ? '開機時段（每台 1–16 段）' : 'Active periods (1–16 per device)';
    li.append(runsTitle);

    const runsOl = document.createElement('ol');
    runsOl.className = 'runs';
    device.runs.forEach((run, j) => {
      const runLi = document.createElement('li');
      runLi.className = 'run-row';

      const startWrap = document.createElement('div');
      startWrap.className = 'field';
      const startLabel = document.createElement('label');
      startLabel.setAttribute('for', `start-${i}-${j}`);
      startLabel.textContent = `${S.runLabel(j + 1)} · ${S.startLabel}`;
      const startInput = document.createElement('input');
      startInput.id = `start-${i}-${j}`;
      startInput.type = 'text';
      startInput.inputMode = 'numeric';
      startInput.maxLength = 5;
      startInput.placeholder = '09:30';
      startInput.autocomplete = 'off';
      startInput.value = run.start;
      startInput.setAttribute('aria-describedby', `start-${i}-${j}-error`);
      const startError = document.createElement('p');
      startError.className = 'error';
      startError.id = `start-${i}-${j}-error`;
      startWrap.append(startLabel, startInput, startError);

      const endWrap = document.createElement('div');
      endWrap.className = 'field';
      const endLabel = document.createElement('label');
      endLabel.setAttribute('for', `end-${i}-${j}`);
      endLabel.textContent = `${S.runLabel(j + 1)} · ${S.endLabel}`;
      const endInput = document.createElement('input');
      endInput.id = `end-${i}-${j}`;
      endInput.type = 'text';
      endInput.inputMode = 'numeric';
      endInput.maxLength = 5;
      endInput.placeholder = '17:00';
      endInput.autocomplete = 'off';
      endInput.value = run.end;
      endInput.setAttribute('aria-describedby', `end-${i}-${j}-error`);
      const endError = document.createElement('p');
      endError.className = 'error';
      endError.id = `end-${i}-${j}-error`;
      endWrap.append(endLabel, endInput, endError);

      const removeRunBtn = document.createElement('button');
      removeRunBtn.type = 'button';
      removeRunBtn.className = 'remove-run';
      removeRunBtn.textContent = '✕';
      removeRunBtn.setAttribute('aria-label', `${S.removeRun} ${j + 1}`);
      removeRunBtn.disabled = device.runs.length <= 1;
      removeRunBtn.addEventListener('click', () => {
        device.runs.splice(j, 1);
        syncDraftToFlow();
        renderDevices();
        render(flow.snapshot());
        const next = document.getElementById(`start-${i}-${Math.min(j, device.runs.length - 1)}`);
        if (next) next.focus();
      });

      startInput.addEventListener('input', () => {
        draft.devices[i].runs[j].start = startInput.value;
        clearFieldError(startInput, startError);
        syncDraftToFlow();
        render(flow.snapshot());
      });
      endInput.addEventListener('input', () => {
        draft.devices[i].runs[j].end = endInput.value;
        clearFieldError(endInput, endError);
        syncDraftToFlow();
        render(flow.snapshot());
      });

      runLi.append(startWrap, endWrap, removeRunBtn);
      runsOl.append(runLi);
    });
    li.append(runsOl);

    const addRunBtn = document.createElement('button');
    addRunBtn.type = 'button';
    addRunBtn.textContent = S.addRun;
    addRunBtn.disabled = device.runs.length >= 16;
    addRunBtn.addEventListener('click', () => {
      device.runs.push({ start: '', end: '' });
      syncDraftToFlow();
      renderDevices();
      render(flow.snapshot());
      const el = document.getElementById(`start-${i}-${device.runs.length - 1}`);
      if (el) el.focus();
    });
    li.append(addRunBtn);
  });
  addDeviceBtn.disabled = draft.devices.length >= 8;
}

// Map a core error path to the form field id it belongs to, or null.
function fieldIdForPath(path) {
  if (path === '/charged') return 'charged';
  let m = path.match(/^\/devices\/(\d+)\/name$/);
  if (m) return `name-${m[1]}`;
  m = path.match(/^\/devices\/(\d+)\/runtime$/);
  if (m) return `runtime-${m[1]}`;
  m = path.match(/^\/devices\/(\d+)\/runs\/(\d+)\/start$/);
  if (m) return `start-${m[1]}-${m[2]}`;
  m = path.match(/^\/devices\/(\d+)\/runs\/(\d+)\/end$/);
  if (m) return `end-${m[1]}-${m[2]}`;
  return null;
}

function messageForCode(code) {
  switch (code) {
    case 'ORDER': return S.order;
    case 'OVERLAP': return S.overlap;
    case 'DUPLICATE': return S.duplicateName;
    case 'SIZE': return LANG === 'zh' ? '輸入過大，請減少設備或時段。' : 'Input is too large; remove some devices or periods.';
    default: return `${code}`;
  }
}

// Validate the form draft into a core input, or return field errors.
// Each error: { id, code, message } where id is the input element id.
function validateForm() {
  const errors = [];
  const push = (id, code, message) => errors.push({ id, code, message });

  let charged = null;
  if (draft.charged === '') {
    push('charged', 'REQUIRED', S.requiredCharged);
  } else if (!INT_PATTERN.test(draft.charged)) {
    push('charged', 'SYNTAX', S.syntaxInt);
  } else {
    charged = Number(draft.charged);
    if (charged < 0 || charged > 100) push('charged', 'RANGE', S.rangeCharged);
  }

  const seenNames = new Map();
  const devices = [];
  draft.devices.forEach((device, i) => {
    let name = null;
    if (device.name === '') {
      push(`name-${i}`, 'REQUIRED', S.requiredName);
    } else {
      const nameError = validateName(device.name, `/devices/${i}/name`);
      if (nameError) {
        push(`name-${i}`, nameError.code, nameError.code === 'RANGE' ? S.nameLength : S.nameFormat);
      } else {
        name = normalizeName(device.name);
        if (seenNames.has(name)) {
          push(`name-${i}`, 'DUPLICATE', S.duplicateName);
        } else {
          seenNames.set(name, i);
        }
      }
    }

    let runtime = null;
    if (device.runtime === '') {
      push(`runtime-${i}`, 'REQUIRED', S.requiredRuntime);
    } else if (!INT_PATTERN.test(device.runtime)) {
      push(`runtime-${i}`, 'SYNTAX', S.syntaxInt);
    } else {
      runtime = Number(device.runtime);
      if (runtime < 10 || runtime > 1440) push(`runtime-${i}`, 'RANGE', S.rangeRuntime);
    }

    const runs = [];
    device.runs.forEach((run, j) => {
      let start = null;
      let end = null;
      if (run.start === '') {
        push(`start-${i}-${j}`, 'REQUIRED', S.requiredTime);
      } else {
        const parsed = parseTime(run.start, false);
        if (parsed.error) {
          push(`start-${i}-${j}`, parsed.error, parsed.error === 'RANGE' ? S.rangeTimeStart : S.syntaxTime);
        } else {
          start = parsed.minutes;
        }
      }
      if (run.end === '') {
        push(`end-${i}-${j}`, 'REQUIRED', S.requiredTime);
      } else {
        const parsed = parseTime(run.end, true);
        if (parsed.error) {
          push(`end-${i}-${j}`, parsed.error, parsed.error === 'RANGE' ? S.rangeTimeEnd : S.syntaxTime);
        } else {
          end = parsed.minutes;
        }
      }
      runs.push({ start, end });
    });

    devices.push({ name, runtime, runs });
  });

  if (errors.length > 0) return { errors };

  const core = { charged, devices };
  // Backstop: the core re-checks everything, including cross-field rules
  // (ORDER / OVERLAP) the form does not check itself.
  const invalid = validate(core);
  if (invalid) {
    const id = fieldIdForPath(invalid.error.path);
    const message = messageForCode(invalid.error.code);
    if (id) return { errors: [{ id, code: invalid.error.code, message }] };
    return { errors: [{ id: null, code: invalid.error.code, message }] };
  }
  return { core };
}

function showFieldErrors(errors) {
  for (const e of errors) {
    if (!e.id) continue;
    const input = document.getElementById(e.id);
    const errorEl = fieldErrorEl(e.id);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (errorEl) errorEl.textContent = e.message;
  }
}

function clearAllFieldErrors() {
  chargedInput.removeAttribute('aria-invalid');
  chargedError.textContent = '';
  for (const el of devicesList.querySelectorAll('.error')) el.textContent = '';
  for (const el of devicesList.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
}

function renderStatusErrors(errors) {
  statusEl.replaceChildren();
  const intro = document.createElement('p');
  intro.textContent = S.errorIntro;
  statusEl.append(intro);
  const list = document.createElement('ul');
  for (const e of errors) {
    const li = document.createElement('li');
    if (e.id) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'linklike';
      btn.textContent = e.message;
      btn.addEventListener('click', () => {
        const input = document.getElementById(e.id);
        if (input) input.focus();
      });
      li.append(btn);
    } else {
      li.textContent = e.message;
    }
    list.append(li);
  }
  statusEl.append(list);
}

function renderResult(result) {
  document.getElementById('sum-required').textContent = fmt.format(result.required);
  document.getElementById('sum-extra').textContent = fmt.format(result.extra);
  document.getElementById('sum-unused').textContent = fmt.format(result.unused);
  const firstMissingEl = document.getElementById('sum-first-missing');
  if (result.firstMissing === null) {
    firstMissingEl.textContent = S.noMissing;
  } else {
    const ev = result.events[result.firstMissing - 1];
    firstMissingEl.textContent = `${fmt.format(result.firstMissing)} · ${fmtTime(ev.minute)} · ${ev.device}`;
  }
  const shortageNote = document.getElementById('shortage-note');
  const enoughNote = document.getElementById('enough-note');
  if (result.firstMissing === null) {
    enoughNote.textContent = S.enough;
    enoughNote.hidden = false;
    shortageNote.hidden = true;
  } else {
    const ev = result.events[result.firstMissing - 1];
    shortageNote.textContent = S.shortage(result.firstMissing, fmtTime(ev.minute), ev.device);
    shortageNote.hidden = false;
    enoughNote.hidden = true;
  }
  resultBody.replaceChildren();
  for (const ev of result.events) {
    const tr = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.textContent = fmtTime(ev.minute);
    const tdDevice = document.createElement('td');
    tdDevice.textContent = ev.device;
    const tdKind = document.createElement('td');
    tdKind.textContent = ev.kind === 'load' ? S.kindLoad : S.kindSwap;
    const tdPack = document.createElement('td');
    tdPack.textContent = ev.pack === null ? S.noPack : fmt.format(ev.pack);
    if (ev.pack === null) tdPack.className = 'missing';
    tr.append(tdTime, tdDevice, tdKind, tdPack);
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
      p.textContent = messageForCode(state.error.code);
      statusEl.append(p);
    } else if (state.phase === 'empty') {
      statusEl.replaceChildren();
    }
    if (state.phase === 'dirty') statusEl.replaceChildren();
  }
}

chargedInput.addEventListener('input', () => {
  draft.charged = chargedInput.value;
  clearFieldError(chargedInput, chargedError);
  syncDraftToFlow();
  render(flow.snapshot());
});

addDeviceBtn.addEventListener('click', () => {
  if (draft.devices.length >= 8) return;
  draft.devices.push({ name: '', runtime: '', runs: [{ start: '', end: '' }] });
  syncDraftToFlow();
  renderDevices();
  render(flow.snapshot());
  const el = document.getElementById(`name-${draft.devices.length - 1}`);
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
    const first = checked.errors.find((e) => e.id);
    if (first) {
      const el = document.getElementById(first.id);
      if (el) el.focus();
    }
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
    charged: '3',
    devices: [
      {
        name: 'A', runtime: '30',
        runs: [{ start: '00:00', end: '00:20' }, { start: '00:40', end: '01:05' }],
      },
      {
        name: 'B', runtime: '20',
        runs: [{ start: '00:10', end: '00:50' }],
      },
    ],
  };
  chargedInput.value = draft.charged;
  clearAllFieldErrors();
  syncDraftToFlow();
  renderDevices();
  render(flow.snapshot());
  statusEl.replaceChildren();
  const p = document.createElement('p');
  p.textContent = S.exampleLoaded;
  statusEl.append(p);
  chargedInput.focus();
});

clearBtn.addEventListener('click', () => {
  if (settleTimer !== null) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  draft = blankDraft();
  chargedInput.value = '';
  clearAllFieldErrors();
  flow.reset();
  renderDevices();
  render(flow.snapshot());
  chargedInput.focus();
});

// Leaving the page (including a bfcache restore) clears working memory.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    draft = blankDraft();
    chargedInput.value = '';
    clearAllFieldErrors();
    flow.reset();
    renderDevices();
    render(flow.snapshot());
  }
});

renderDevices();
render(flow.snapshot());
