// Food Storage Guide — DOM wiring.
//
// The worker bundle source (pure core + fixed message handler) is embedded
// by scripts/build.mjs in place of the token below; the page creates a
// module Worker from that fixed string via a Blob URL. No user content ever
// becomes code. All rendering uses textContent/value.

import { createController } from './core/controller.mjs';
import {
  DEFAULT_DRAFT, ITEMS, REPORT_FILENAME, cellFor, localTodayDate,
} from './core/core.mjs';

const WORKER_SOURCE = '__WORKER_SOURCE__';

const LANG = document.documentElement.lang === 'en' ? 'en' : 'zh';

const TEXTS = {
  zh: {
    dirty: '輸入已變更，請重新執行。',
    busy: '處理中…',
    cancelled: '已取消，可重新執行。',
    success: '查詢完成，結果對應目前輸入。',
    exampleLoaded: '已載入範例，請按「查詢保存期限」執行。',
    workerUnavailable: '處理失敗，草稿還在，請重試。',
    statusLabel: { fresh: '仍在期限內', 'use-soon': '儘快使用', expired: '已過期' },
    daysRemaining: (n) => (n >= 0 ? `還剩 ${n} 天` : `已過期 ${-n} 天`),
    rangeText: (range) => (range === null ? '依包裝上的使用期限' : `${range.min}–${range.max} 天`),
    fields: {
      item: '食物品項',
      location: '存放位置',
      opened: '已開封',
      startDate: '開始日期',
      todayDate: '今天日期',
      packageDate: '包裝使用期限',
    },
    errors: {
      SCHEMA: '輸入資料不完整或格式不正確，請檢查欄位後再試。',
      INPUT_LIMIT: '輸入太長，請刪減後再試。',
      UNICODE: '輸入含有無法處理的字元，請修正後再試。',
      DATE_FORMAT: '日期格式應為 YYYY-MM-DD，例如 2026-11-20。',
      DATE_RANGE: '日期不存在或年份超出 2000–2100，請修正後再試。',
      PACKAGE_DATE_REQUIRED: '此品項以包裝上的使用期限為準，請輸入包裝使用期限。',
      NOT_APPLICABLE: 'FoodKeeper 沒有這個品項在這個位置的保存數據。',
      NOT_RECOMMENDED: 'FoodKeeper 明確不建議這樣存放。',
      OUTPUT_LIMIT: '報告太大，無法產生下載。',
      WORKER_ERROR: '處理失敗，草稿還在，請重試。',
      INTERNAL: '處理失敗，草稿還在，請重試。',
    },
  },
  en: {
    dirty: 'Input changed. Run again.',
    busy: 'Working…',
    cancelled: 'Cancelled. You can run again.',
    success: 'Check complete. The result matches the current input.',
    exampleLoaded: 'Example loaded. Run the storage check when ready.',
    workerUnavailable: 'Processing failed. Your draft is intact; please try again.',
    statusLabel: { fresh: 'Still within its safe period', 'use-soon': 'Use soon', expired: 'Expired' },
    daysRemaining: (n) => (n >= 0 ? `${n} day${n === 1 ? '' : 's'} remaining` : `Expired ${-n} day${-n === 1 ? '' : 's'} ago`),
    rangeText: (range) => (range === null ? 'Follow the use-by date on the package' : `${range.min}–${range.max} days`),
    fields: {
      item: 'Food item',
      location: 'Storage location',
      opened: 'Opened',
      startDate: 'Start date',
      todayDate: 'Today',
      packageDate: 'Package use-by date',
    },
    errors: {
      SCHEMA: 'The input is incomplete or malformed. Check the fields and try again.',
      INPUT_LIMIT: 'The input is too long. Shorten it and try again.',
      UNICODE: 'The input contains a character that cannot be processed. Correct it and try again.',
      DATE_FORMAT: 'Use the YYYY-MM-DD date format, for example 2026-11-20.',
      DATE_RANGE: 'The date does not exist or the year is outside 2000–2100. Correct it and try again.',
      PACKAGE_DATE_REQUIRED: 'This item follows the use-by date on the package. Enter that date.',
      NOT_APPLICABLE: 'FoodKeeper has no storage time for this food in this location.',
      NOT_RECOMMENDED: 'FoodKeeper explicitly does not recommend storing it this way.',
      OUTPUT_LIMIT: 'The report is too large to download.',
      WORKER_ERROR: 'Processing failed. Your draft is intact; please try again.',
      INTERNAL: 'Processing failed. Your draft is intact; please try again.',
    },
  },
};
const T = TEXTS[LANG];

const EXAMPLE = {
  item: 'ground-beef', location: 'fridge', opened: false, startDate: '2026-11-20', todayDate: '2026-11-20',
};

class WorkerHandle {
  constructor() {
    const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript; charset=utf-8' });
    this.url = URL.createObjectURL(blob);
    this.worker = new Worker(this.url, { type: 'module' });
  }

  set onmessage(handler) {
    this.worker.onmessage = handler;
  }

  postMessage(message) {
    this.worker.postMessage(message);
  }

  terminate() {
    this.worker.terminate();
    URL.revokeObjectURL(this.url);
  }
}

const $ = (id) => document.getElementById(id);
const form = $('food-form');
const els = {
  item: $('item'),
  locationPantry: $('location-pantry'),
  locationFridge: $('location-fridge'),
  locationFreezer: $('location-freezer'),
  opened: $('opened'),
  startDate: $('startDate'),
  todayDate: $('todayDate'),
  packageField: $('package-field'),
  packageDate: $('packageDate'),
  runButton: $('run-button'),
  exampleButton: $('example-button'),
  resetButton: $('reset-button'),
  cancelButton: $('cancel-button'),
  downloadButton: $('download-button'),
  downloadRow: $('download-row'),
  status: $('status'),
  exampleNote: $('example-note'),
  result: $('result'),
};

const FIELD_ELEMENTS = {
  item: () => els.item,
  location: () => els.locationFridge,
  opened: () => els.opened,
  startDate: () => els.startDate,
  todayDate: () => els.todayDate,
  packageDate: () => els.packageDate,
};

let syncing = false;
let prevState = 'empty';
let downloadUrl = null;
let downloadTimer = null;

function readDraft() {
  const location = els.locationFreezer.checked ? 'freezer'
    : els.locationPantry.checked ? 'pantry' : 'fridge';
  return {
    item: els.item.value,
    location,
    opened: els.opened.checked,
    startDate: els.startDate.value,
    todayDate: els.todayDate.value,
  };
}

function writeDraft(draft) {
  syncing = true;
  els.item.value = draft.item;
  els.locationPantry.checked = draft.location === 'pantry';
  els.locationFridge.checked = draft.location === 'fridge';
  els.locationFreezer.checked = draft.location === 'freezer';
  els.opened.checked = draft.opened === true;
  els.startDate.value = draft.startDate;
  els.todayDate.value = draft.todayDate;
  syncPackageField();
  syncing = false;
}

function syncPackageField() {
  const draft = readDraft();
  const show = cellFor(draft.item, draft.location, draft.opened) === 'PKG';
  els.packageField.hidden = !show;
  els.packageDate.disabled = !show;
  if (!show) els.packageDate.value = '';
}

// The worker input is derived from the draft: an empty todayDate is
// omitted (the core then uses the device local date, per SPEC), and the
// package date is sent only when the PKG field is shown and non-empty.
function buildRunInput() {
  const draft = readDraft();
  const input = {
    item: draft.item,
    location: draft.location,
    opened: draft.opened,
    startDate: draft.startDate,
  };
  if (draft.todayDate !== '') input.todayDate = draft.todayDate;
  if (!els.packageField.hidden && els.packageDate.value !== '') {
    input.packageDate = els.packageDate.value;
  }
  return input;
}

function clearFieldErrors() {
  for (const field of Object.keys(FIELD_ELEMENTS)) {
    const slot = $(`error-${field}`);
    if (slot) {
      slot.textContent = '';
      slot.hidden = true;
    }
    const element = FIELD_ELEMENTS[field]();
    if (element) element.removeAttribute('aria-invalid');
  }
}

function showFieldError(error) {
  if (!error || !error.field) return;
  const slot = $(`error-${error.field}`);
  const message = T.errors[error.code] || T.errors.WORKER_ERROR;
  if (slot) {
    slot.textContent = message;
    slot.hidden = false;
  }
  const element = FIELD_ELEMENTS[error.field] ? FIELD_ELEMENTS[error.field]() : null;
  if (element) element.setAttribute('aria-invalid', 'true');
}

function revokeDownload() {
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

function itemName(id) {
  const item = ITEMS.find((entry) => entry.id === id);
  if (!item) return id;
  return LANG === 'en' ? item.en : `${item.zh} / ${item.en}`;
}

function locationName(location) {
  if (LANG === 'en') {
    return location === 'pantry' ? 'Pantry' : location === 'fridge' ? 'Fridge' : 'Freezer';
  }
  return location === 'pantry' ? '常溫' : location === 'fridge' ? '冷藏' : '冷凍';
}

function fillResult(result) {
  $('sum-status').textContent = T.statusLabel[result.status];
  $('sum-remaining').textContent = T.daysRemaining(result.remainingDays);
  $('sum-safe-until').textContent = result.safeUntil;
  $('detail-item').textContent = itemName(result.item);
  $('detail-location').textContent = locationName(result.location);
  $('detail-opened').textContent = result.opened
    ? (LANG === 'en' ? 'Opened' : '已開封')
    : (LANG === 'en' ? 'Unopened' : '未開封');
  $('detail-start').textContent = result.startDate;
  $('detail-safe').textContent = result.safeUntil;
  $('detail-best').textContent = result.bestUntil;
  $('detail-range').textContent = T.rangeText(result.rangeDays);
  $('detail-note').textContent = result.note === null ? '—' : result.note;
  $('result').dataset.status = result.status;
}

function render(snap) {
  const wasBusy = prevState === 'busy';
  prevState = snap.state;
  form.setAttribute('aria-busy', snap.state === 'busy' ? 'true' : 'false');
  els.cancelButton.hidden = snap.state !== 'busy';
  els.runButton.disabled = snap.state === 'busy';
  els.downloadRow.hidden = !snap.reportAvailable;
  if (!snap.reportAvailable) revokeDownload();

  clearFieldErrors();
  if (snap.state === 'success' && snap.result) {
    els.result.hidden = false;
    fillResult(snap.result);
  } else {
    els.result.hidden = true;
  }

  switch (snap.state) {
    case 'dirty':
      els.status.textContent = T.dirty;
      break;
    case 'busy':
      els.status.textContent = T.busy;
      break;
    case 'cancelled':
      els.status.textContent = T.cancelled;
      break;
    case 'success':
      els.status.textContent = T.success;
      break;
    case 'error': {
      const message = snap.error
        ? (T.errors[snap.error.code] || T.errors.WORKER_ERROR)
        : T.errors.WORKER_ERROR;
      els.status.textContent = message;
      showFieldError(snap.error);
      if (wasBusy && snap.error && snap.error.field && FIELD_ELEMENTS[snap.error.field]) {
        FIELD_ELEMENTS[snap.error.field]().focus();
      }
      break;
    }
    default:
      els.status.textContent = '';
  }
}

const controller = createController({
  createWorker: () => new WorkerHandle(),
  onChange: render,
});

form.addEventListener('input', () => {
  if (syncing) return;
  els.exampleNote.hidden = true;
  syncPackageField();
  controller.edit(readDraft());
});
form.addEventListener('change', () => {
  if (syncing) return;
  syncPackageField();
  controller.edit(readDraft());
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  els.exampleNote.hidden = true;
  controller.run(buildRunInput());
});
els.exampleButton.addEventListener('click', () => {
  writeDraft(EXAMPLE);
  controller.edit(readDraft());
  els.exampleNote.hidden = false;
  els.status.textContent = T.exampleLoaded;
});
els.resetButton.addEventListener('click', () => {
  els.exampleNote.hidden = true;
  controller.reset();
  writeDraft(DEFAULT_DRAFT);
  els.packageDate.value = '';
  els.todayDate.value = localTodayDate();
  els.item.focus();
});
els.cancelButton.addEventListener('click', () => {
  controller.cancel();
});
els.downloadButton.addEventListener('click', () => {
  const report = controller.getReport();
  if (!report || !report.ok) return;
  revokeDownload();
  const blob = new Blob([report.bytes], { type: 'application/json' });
  downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

window.addEventListener('pagehide', () => {
  controller.dispose();
  revokeDownload();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    controller.reset();
    writeDraft(DEFAULT_DRAFT);
    els.packageDate.value = '';
    els.todayDate.value = localTodayDate();
    els.exampleNote.hidden = true;
  }
});

writeDraft(DEFAULT_DRAFT);
// The today field shows the device local date until the user changes it;
// an empty value at run time means "use the device local date".
if (els.todayDate.value === '') els.todayDate.value = localTodayDate();
render(controller.snapshot());
