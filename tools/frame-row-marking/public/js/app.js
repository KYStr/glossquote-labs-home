// Frame Row Marking — DOM controller. Pure logic lives in core; this file
// only wires fields, session state and safe DOM (textContent/value only).
// No network, no storage: input and results live in page memory only.
import {
  solve,
  createFlow,
  formatMm,
  parseIntegerField,
  validateNameField,
  EXAMPLE,
} from './core/frame-row-marking.mjs';

const STRINGS = {
  'zh-Hant': {
    statusEmpty: '填寫牆面與相框尺寸，再按「算出牆上掛點」。',
    statusDirty: '已修改，舊結果已清除。按「算出牆上掛點」重新計算。',
    statusBusy: '計算中…',
    statusReady: '已算出掛點。結果以同一基準角量測。',
    statusReadyInfeasible: '牆面不夠寬。請依下方建議調整後再算一次。',
    statusError: '有欄位需要修正，請看下方說明。',
    statusExample: '已載入範例。按「算出牆上掛點」計算。',
    statusCleared: '已清除草稿。',
    working: '計算中…',
    mark: '算出牆上掛點',
    frameLegend: (i) => `框 ${i + 1}`,
    nameLabel: (i) => `框 ${i + 1} 名稱`,
    widthLabel: (i) => `框 ${i + 1} 寬`,
    heightLabel: (i) => `框 ${i + 1} 高`,
    hookLeftLabel: (i) => `框 ${i + 1} 掛點左`,
    hookTopLabel: (i) => `框 ${i + 1} 掛點上`,
    moveUp: '上移',
    moveDown: '下移',
    remove: '移除',
    gapLabel: '等距留白',
    deficitLabel: '牆面不夠寬，還差',
    deficitJoin: '。',
    deficitHint: '下一步：加寬牆面、縮小相框，或降低最小留白。',
    tableCaption: '掛點座標表（毫米，相對同一基準角）',
    thFrame: '框',
    thLeft: '左緣 X',
    thTop: '頂緣 Y',
    thHookX: '掛點 X',
    thHookY: '掛點 Y',
    diagramLabel: '牆面配置示意圖',
    errorTitle: '請修正以下欄位',
    errTypeNumber: (label) => `${label}：請輸入整數毫米，只接受阿拉伯數字，不含空白、小數或符號。`,
    errTypeName: (label) => `${label}：名稱需 1–24 字，以字母或數字開頭，僅可用字母、數字、空格、連字號或底線。`,
    errRange: (label, min, max) => `${label}：超出範圍（${min}–${max} 毫米）。`,
    errEnum: () => '對齊方式：請選擇頂緣對齊或中心對齊。',
    errDuplicate: (label) => `${label}：框名重複，請改一個不同的名稱。`,
    errOffset: () => '掛點超出框面：請把掛點偏移改到框寬、框高以內。',
    errSize: () => '輸入過大（上限 64 KB），請減少框數或縮短名稱。',
    errShape: () => '資料格式不正確，請重新填寫。',
    errFrames: () => '相框需 2–12 框。',
  },
  en: {
    statusEmpty: 'Enter the wall and frame sizes, then press “Mark frame hooks”.',
    statusDirty: 'Edited — the old result was cleared. Press “Mark frame hooks” to recalculate.',
    statusBusy: 'Working…',
    statusReady: 'Hooks marked. All readings share one wall origin.',
    statusReadyInfeasible: 'The wall is too narrow. Adjust as suggested below and try again.',
    statusError: 'Some fields need fixing; see below.',
    statusExample: 'Example loaded. Press “Mark frame hooks” to calculate.',
    statusCleared: 'Draft cleared.',
    working: 'Working…',
    mark: 'Mark frame hooks',
    frameLegend: (i) => `Frame ${i + 1}`,
    nameLabel: (i) => `Frame ${i + 1} name`,
    widthLabel: (i) => `Frame ${i + 1} width`,
    heightLabel: (i) => `Frame ${i + 1} height`,
    hookLeftLabel: (i) => `Frame ${i + 1} hook from left`,
    hookTopLabel: (i) => `Frame ${i + 1} hook from top`,
    moveUp: 'Move up',
    moveDown: 'Move down',
    remove: 'Remove',
    gapLabel: 'Equal gap',
    deficitLabel: 'Wall too narrow, short by',
    deficitJoin: '. ',
    deficitHint: 'Next step: widen the wall, shrink a frame, or lower the minimum gap.',
    tableCaption: 'Hook coordinates (mm, from one wall origin)',
    thFrame: 'Frame',
    thLeft: 'Left edge X',
    thTop: 'Top edge Y',
    thHookX: 'Hook X',
    thHookY: 'Hook Y',
    diagramLabel: 'Wall layout diagram',
    errorTitle: 'Please fix these fields',
    errTypeNumber: (label) => `${label}: enter whole millimetres using Arabic digits only — no spaces, decimals or signs.`,
    errTypeName: (label) => `${label}: use 1–24 characters, starting with a letter or digit; letters, digits, spaces, hyphens and underscores only.`,
    errRange: (label, min, max) => `${label}: out of range (${min}–${max} mm).`,
    errEnum: () => 'Alignment: choose top or center alignment.',
    errDuplicate: (label) => `${label}: this frame name is already used; pick a different one.`,
    errOffset: () => 'Hook outside the frame: move the hook offset within the frame width and height.',
    errSize: () => 'Input too large (64 KB limit); use fewer frames or shorter names.',
    errShape: () => 'The data is malformed; please fill the form again.',
    errFrames: () => 'Use 2–12 frames.',
  },
};

const RANGES = {
  spanMm: [1, 20000],
  minGapMm: [0, 2000],
  wMm: [1, 5000],
  hMm: [1, 5000],
  hookLeftMm: [0, 5000],
  hookTopMm: [0, 5000],
};

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const T = STRINGS[lang];
const locale = lang === 'en' ? 'en' : 'zh-Hant';

const flow = createFlow();
let runCounter = 0;
let pendingTimer = null;
let stale = false;
let interacted = false;

const $ = (id) => document.getElementById(id);
const form = $('mark-form');
const statusEl = $('status');
const errorSummary = $('error-summary');
const errorList = $('error-list');
const resultsEl = $('results');
const diagramEl = $('diagram');
const wallEl = $('wall');
const gapLine = $('gap-line');
const deficitEl = $('deficit');
const marksBody = $('marks-body');
const submitBtn = $('submit-btn');
const cancelBtn = $('cancel-btn');
const clearBtn = $('clear-btn');
const exampleBtn = $('example-btn');
const addBtn = $('add-frame-btn');
const framesList = $('frames-list');
const rowTemplate = $('frame-row-template');

function fieldLabelFor(path) {
  const m = path.match(/^\/frames\/(\d+)\/(name|wMm|hMm|hookLeftMm|hookTopMm)$/);
  if (m) {
    const i = Number(m[1]);
    const map = { name: T.nameLabel(i), wMm: T.widthLabel(i), hMm: T.heightLabel(i), hookLeftMm: T.hookLeftLabel(i), hookTopMm: T.hookTopLabel(i) };
    return map[m[2]];
  }
  if (path === '/spanMm') return lang === 'en' ? 'Wall width' : '牆面可用寬';
  if (path === '/minGapMm') return lang === 'en' ? 'Minimum gap' : '最小留白';
  if (path === '/align') return lang === 'en' ? 'Alignment' : '對齊方式';
  if (path === '/frames') return lang === 'en' ? 'Frames' : '相框列';
  return lang === 'en' ? 'Input' : '輸入';
}

function fieldIdFor(path) {
  if (path === '/spanMm') return 'f-span';
  if (path === '/minGapMm') return 'f-gap';
  if (path === '/align') return 'f-align-top';
  if (path === '/frames') return 'frames-list';
  const m = path.match(/^\/frames\/(\d+)\/(name|wMm|hMm|hookLeftMm|hookTopMm)$/);
  if (m) {
    const short = { name: 'name', wMm: 'w', hMm: 'h', hookLeftMm: 'hl', hookTopMm: 'ht' }[m[2]];
    return `f-frame-${m[1]}-${short}`;
  }
  return 'f-span';
}

function messageFor(error) {
  const { code, path } = error;
  const label = fieldLabelFor(path);
  switch (code) {
    case 'TYPE':
      return path.includes('/name')
        ? T.errTypeName(label)
        : T.errTypeNumber(label);
    case 'RANGE': {
      const key = path.split('/').pop();
      if (path === '/frames') return T.errFrames();
      const [min, max] = RANGES[key] || [0, 0];
      return T.errRange(label, min, max);
    }
    case 'ENUM':
      return T.errEnum();
    case 'DUPLICATE':
      return T.errDuplicate(label);
    case 'OFFSET':
      return T.errOffset();
    case 'SIZE':
      return T.errSize();
    default:
      return T.errShape();
  }
}

function rows() {
  return [...framesList.querySelectorAll('.frame-row')];
}

function inputOf(row, field) {
  return row.querySelector(`[data-field="${field}"]`);
}

function errorOf(row, field) {
  return row.querySelector(`[data-error-for="${field}"]`);
}

function createRow(values) {
  const node = rowTemplate.content.firstElementChild.cloneNode(true);
  const set = (field, value) => {
    const input = inputOf(node, field);
    input.value = value ?? '';
  };
  set('name', values?.name);
  set('wMm', values?.wMm);
  set('hMm', values?.hMm);
  set('hookLeftMm', values?.hookLeftMm);
  set('hookTopMm', values?.hookTopMm);
  node.querySelector('[data-action="up"]').addEventListener('click', () => moveRow(node, -1));
  node.querySelector('[data-action="down"]').addEventListener('click', () => moveRow(node, 1));
  node.querySelector('[data-action="remove"]').addEventListener('click', () => removeRow(node));
  return node;
}

function renumber() {
  rows().forEach((row, i) => {
    row.querySelector('legend').textContent = T.frameLegend(i);
    const labels = {
      name: T.nameLabel(i),
      wMm: T.widthLabel(i),
      hMm: T.heightLabel(i),
      hookLeftMm: T.hookLeftLabel(i),
      hookTopMm: T.hookTopLabel(i),
    };
    for (const [field, label] of Object.entries(labels)) {
      const input = inputOf(row, field);
      const short = { name: 'name', wMm: 'w', hMm: 'h', hookLeftMm: 'hl', hookTopMm: 'ht' }[field];
      const id = `f-frame-${i}-${short}`;
      input.id = id;
      const lab = row.querySelector(`label[data-label-for="${field}"]`);
      if (lab) {
        lab.textContent = label;
        lab.setAttribute('for', id);
      }
      const errEl = errorOf(row, field);
      if (errEl) errEl.id = `${id}-error`;
      input.setAttribute('aria-describedby', `${id}-error`);
    }
    row.querySelector('[data-action="up"]').disabled = i === 0;
    row.querySelector('[data-action="down"]').disabled = i === rows().length - 1;
    row.querySelector('[data-action="remove"]').disabled = rows().length <= 2;
    row.querySelector('[data-action="up"]').textContent = T.moveUp;
    row.querySelector('[data-action="down"]').textContent = T.moveDown;
    row.querySelector('[data-action="remove"]').textContent = T.remove;
  });
  addBtn.disabled = rows().length >= 12;
}

function moveRow(row, delta) {
  const list = rows();
  const i = list.indexOf(row);
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  if (delta < 0) framesList.insertBefore(row, list[j]);
  else framesList.insertBefore(list[j], row);
  renumber();
  onEdit();
  row.querySelector('input').focus();
}

function removeRow(row) {
  if (rows().length <= 2) return;
  row.remove();
  renumber();
  onEdit();
}

function resetForm() {
  $('f-span').value = '';
  $('f-gap').value = '0';
  $('f-align-top').checked = true;
  framesList.textContent = '';
  framesList.append(createRow(), createRow());
  renumber();
}

function readDraft() {
  const errors = [];
  const data = { spanMm: 0, minGapMm: 0, align: 'top', frames: [] };

  const span = parseIntegerField($('f-span').value, 1, 20000, '/spanMm');
  if (span.error) errors.push(span.error);
  else data.spanMm = span.value;

  const gap = parseIntegerField($('f-gap').value, 0, 2000, '/minGapMm');
  if (gap.error) errors.push(gap.error);
  else data.minGapMm = gap.value;

  const alignInput = form.querySelector('input[name="align"]:checked');
  data.align = alignInput ? alignInput.value : 'top';

  rows().forEach((row, i) => {
    const frame = {};
    const nameRes = validateNameField(inputOf(row, 'name').value, `/frames/${i}/name`);
    if (nameRes.error) errors.push(nameRes.error);
    else frame.name = nameRes.name;
    for (const [field, min, max] of [
      ['wMm', 1, 5000],
      ['hMm', 1, 5000],
      ['hookLeftMm', 0, 5000],
      ['hookTopMm', 0, 5000],
    ]) {
      const res = parseIntegerField(inputOf(row, field).value, min, max, `/frames/${i}/${field}`);
      if (res.error) errors.push(res.error);
      else frame[field] = res.value;
    }
    data.frames.push(frame);
  });

  return { data: errors.length ? null : data, errors };
}

function clearFieldErrors() {
  errorSummary.hidden = true;
  errorList.textContent = '';
  document.querySelectorAll('.field-error').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  document.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
}

function showErrors(errors) {
  clearFieldErrors();
  errorSummary.hidden = false;
  errorSummary.querySelector('h2').textContent = T.errorTitle;
  for (const error of errors) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${fieldIdFor(error.path)}`;
    a.textContent = messageFor(error);
    li.append(a);
    errorList.append(li);
    const target = document.getElementById(fieldIdFor(error.path));
    if (target) {
      target.setAttribute('aria-invalid', 'true');
      if (target.closest('.field')) {
        const errEl = target.closest('.field').querySelector('.field-error');
        if (errEl) {
          errEl.textContent = messageFor(error);
          errEl.hidden = false;
        }
      }
    }
  }
  statusEl.textContent = T.statusError;
}

const marksWrap = $('marks-table-wrap');

function clearResults() {
  resultsEl.hidden = true;
  diagramEl.hidden = true;
  marksWrap.hidden = true;
  deficitEl.hidden = true;
  wallEl.textContent = '';
  marksBody.textContent = '';
  gapLine.textContent = '';
  deficitEl.textContent = '';
}

function renderResults(result, data) {
  resultsEl.hidden = false;
  if (!result.feasible) {
    gapLine.textContent = '';
    diagramEl.hidden = true;
    marksWrap.hidden = true;
    deficitEl.hidden = false;
    deficitEl.textContent = `${T.deficitLabel} ${formatMm(result.deficitMm * 10, locale)} mm${T.deficitJoin}${T.deficitHint}`;
    statusEl.textContent = T.statusReadyInfeasible;
    return;
  }
  deficitEl.hidden = true;
  deficitEl.textContent = '';
  marksWrap.hidden = false;
  gapLine.textContent = `${T.gapLabel}：${formatMm(result.gapTenths, locale)} mm`;
  // Table (the text equivalent of the diagram).
  marksBody.textContent = '';
  for (const mark of result.marks) {
    const tr = document.createElement('tr');
    for (const text of [
      mark.name,
      formatMm(mark.leftTenths, locale),
      formatMm(mark.topTenths, locale),
      formatMm(mark.hookXTenths, locale),
      formatMm(mark.hookYTenths, locale),
    ]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    marksBody.append(tr);
  }
  // Diagram: wall strip; each frame box positioned from the same origin.
  const H = Math.max(...data.frames.map((f) => f.hMm));
  const DIAGRAM_PX = 160;
  wallEl.textContent = '';
  result.marks.forEach((mark, i) => {
    const f = data.frames[i];
    const box = document.createElement('div');
    box.className = 'frame-box';
    box.style.left = `${(mark.leftTenths / 10 / data.spanMm) * 100}%`;
    box.style.width = `${(f.wMm / data.spanMm) * 100}%`;
    box.style.top = `${(mark.topTenths / 10 / H) * DIAGRAM_PX}px`;
    box.style.height = `${(f.hMm / H) * DIAGRAM_PX}px`;
    const nameEl = document.createElement('span');
    nameEl.className = 'frame-box-name';
    nameEl.textContent = mark.name;
    box.append(nameEl);
    const hook = document.createElement('span');
    hook.className = 'hook-dot';
    hook.style.left = `${(mark.hookXTenths / 10 / data.spanMm) * 100}%`;
    hook.style.top = `${(mark.hookYTenths / 10 / H) * DIAGRAM_PX}px`;
    wallEl.append(box, hook);
  });
  diagramEl.hidden = false;
  statusEl.textContent = T.statusReady;
}

function render() {
  const snap = flow.snapshot();
  if (snap.phase === 'busy') {
    submitBtn.disabled = true;
    submitBtn.textContent = T.working;
    cancelBtn.hidden = false;
    statusEl.textContent = T.statusBusy;
    return;
  }
  submitBtn.disabled = false;
  submitBtn.textContent = T.mark;
  cancelBtn.hidden = true;
  if (snap.phase === 'ready' && !stale) return; // results already rendered
  if (!interacted) statusEl.textContent = T.statusEmpty;
  else if (stale) statusEl.textContent = T.statusDirty;
}

function onEdit() {
  interacted = true;
  stale = true;
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  flow.cancel();
  clearResults();
  clearFieldErrors();
  render();
}

function submit() {
  const { data, errors } = readDraft();
  if (errors.length) {
    showErrors(errors);
    const first = document.getElementById(fieldIdFor(errors[0].path));
    if (first) first.focus();
    return;
  }
  clearFieldErrors();
  clearResults();
  stale = false;
  const runId = ++runCounter;
  flow.edit(data);
  flow.run(runId);
  render();
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flow.settle(runId);
    const snap = flow.snapshot();
    if (snap.phase === 'ready') renderResults(snap.result, data);
    else if (snap.phase === 'error') showErrors([snap.error]);
    render();
  }, 0);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submit();
});

form.addEventListener('input', (event) => {
  if (event.target.matches('input[type="text"], input[name="align"]')) onEdit();
});
form.addEventListener('change', (event) => {
  if (event.target.matches('input[name="align"]')) onEdit();
});

cancelBtn.addEventListener('click', () => {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  flow.cancel();
  stale = true;
  render();
  submitBtn.focus();
});

clearBtn.addEventListener('click', () => {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  flow.reset();
  resetForm();
  clearFieldErrors();
  clearResults();
  stale = false;
  interacted = false;
  statusEl.textContent = T.statusCleared;
  $('f-span').focus();
});

exampleBtn.addEventListener('click', () => {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  flow.cancel();
  framesList.textContent = '';
  for (const frame of EXAMPLE.frames) {
    framesList.append(
      createRow({
        name: frame.name,
        wMm: String(frame.wMm),
        hMm: String(frame.hMm),
        hookLeftMm: String(frame.hookLeftMm),
        hookTopMm: String(frame.hookTopMm),
      }),
    );
  }
  $('f-span').value = String(EXAMPLE.spanMm);
  $('f-gap').value = String(EXAMPLE.minGapMm);
  const alignInput = form.querySelector(`input[name="align"][value="${EXAMPLE.align}"]`);
  if (alignInput) alignInput.checked = true;
  renumber();
  clearFieldErrors();
  clearResults();
  stale = true;
  interacted = true;
  statusEl.textContent = T.statusExample;
  submitBtn.focus();
});

addBtn.addEventListener('click', () => {
  if (rows().length >= 12) return;
  framesList.append(createRow());
  renumber();
  onEdit();
  rows().at(-1).querySelector('input').focus();
});

// Leaving the page (including bfcache restore) clears working memory.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    flow.reset();
    resetForm();
    clearFieldErrors();
    clearResults();
    stale = false;
    interacted = false;
    render();
  }
});

resetForm();
const bootNote = document.getElementById('boot-note');
if (bootNote) bootNote.hidden = true;
render();
