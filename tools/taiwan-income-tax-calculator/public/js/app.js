// Taiwan Income Tax Calculator — DOM wiring.
//
// The worker bundle source (pure core + fixed message handler) is embedded
// by scripts/build.mjs in place of the token below; the page creates a
// module Worker from that fixed string via a Blob URL. No user content ever
// becomes code. All rendering uses textContent/value.

import { createController } from './core/controller.mjs';
import { DEFAULT_DRAFT, REPORT_FILENAME } from './core/core.mjs';

const WORKER_SOURCE = '__WORKER_SOURCE__';

const LANG = document.documentElement.lang === 'en' ? 'en' : 'zh';

const TEXTS = {
  zh: {
    dirty: '輸入已變更，請重新執行。',
    busy: '處理中…',
    cancelled: '已取消，可重新執行。',
    success: '試算完成，結果對應目前輸入。',
    exampleLoaded: '已載入範例，請按「試算應納稅額」執行。',
    workerUnavailable: '處理失敗，草稿還在，請重試。',
    fields: {
      grossSalary: '全年薪資所得總額',
      filingStatus: '申報身分',
      selfAge70Plus: '本人年滿 70 歲',
      spouseAge70Plus: '配偶年滿 70 歲',
      dependentsUnder70: '扶養親屬（未滿 70 歲）人數',
      dependents70Plus: '扶養直系尊親屬（年滿 70 歲）人數',
    },
    errors: {
      SCHEMA: '輸入資料不完整或格式不正確，請檢查欄位後再試。',
      INPUT_LIMIT: '輸入太長，請刪減後再試。',
      EMPTY: '此欄必填，請輸入數值。',
      INTEGER_FORMAT: '請輸入整數，不要有小數點、符號或空白。',
      RANGE: '數值超出允許範圍，請修正後再試。',
      ENUM_VALUE: '所選項目無效，請重新選擇。',
      OUTPUT_LIMIT: '報告太大，無法產生下載。',
      WORKER_ERROR: '處理失敗，草稿還在，請重試。',
      INTERNAL: '處理失敗，草稿還在，請重試。',
    },
  },
  en: {
    dirty: 'Input changed. Run again.',
    busy: 'Working…',
    cancelled: 'Cancelled. You can run again.',
    success: 'Estimate complete. The result matches the current input.',
    exampleLoaded: 'Example loaded. Run the estimate when ready.',
    workerUnavailable: 'Processing failed. Your draft is intact; please try again.',
    fields: {
      grossSalary: 'Gross salary for the year',
      filingStatus: 'Filing status',
      selfAge70Plus: 'I was 70 or older',
      spouseAge70Plus: 'Spouse was 70 or older',
      dependentsUnder70: 'Dependents under 70',
      dependents70Plus: 'Lineal ascendant dependents aged 70+',
    },
    errors: {
      SCHEMA: 'The input is incomplete or malformed. Check the fields and try again.',
      INPUT_LIMIT: 'The input is too long. Shorten it and try again.',
      EMPTY: 'This field is required. Enter a value.',
      INTEGER_FORMAT: 'Enter a whole number with no decimal point, sign, or spaces.',
      RANGE: 'The value is outside the allowed range. Correct it and try again.',
      ENUM_VALUE: 'The selected option is invalid. Choose again.',
      OUTPUT_LIMIT: 'The report is too large to download.',
      WORKER_ERROR: 'Processing failed. Your draft is intact; please try again.',
      INTERNAL: 'Processing failed. Your draft is intact; please try again.',
    },
  },
};
const T = TEXTS[LANG];

const EXAMPLE = {
  grossSalary: '720000',
  filingStatus: 'single',
  selfAge70Plus: false,
  spouseAge70Plus: null,
  dependentsUnder70: '0',
  dependents70Plus: '0',
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
const form = $('tax-form');
const els = {
  grossSalary: $('grossSalary'),
  filingSingle: $('filing-single'),
  filingMarried: $('filing-married'),
  selfAge70Plus: $('selfAge70Plus'),
  spouseField: $('spouse-field'),
  spouseAge70Plus: $('spouseAge70Plus'),
  dependentsUnder70: $('dependentsUnder70'),
  dependents70Plus: $('dependents70Plus'),
  runButton: $('run-button'),
  exampleButton: $('example-button'),
  resetButton: $('reset-button'),
  cancelButton: $('cancel-button'),
  downloadButton: $('download-button'),
  downloadRow: $('download-row'),
  status: $('status'),
  exampleNote: $('example-note'),
  result: $('result'),
  zeroTaxNote: $('zero-tax-note'),
};

const FIELD_ELEMENTS = {
  grossSalary: () => els.grossSalary,
  filingStatus: () => els.filingSingle,
  selfAge70Plus: () => els.selfAge70Plus,
  spouseAge70Plus: () => els.spouseAge70Plus,
  dependentsUnder70: () => els.dependentsUnder70,
  dependents70Plus: () => els.dependents70Plus,
};

let syncing = false;
let prevState = 'empty';
let downloadUrl = null;
let downloadTimer = null;

function formatAmount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function readDraft() {
  const married = els.filingMarried.checked;
  return {
    grossSalary: els.grossSalary.value,
    filingStatus: married ? 'married' : 'single',
    selfAge70Plus: els.selfAge70Plus.checked,
    spouseAge70Plus: married ? els.spouseAge70Plus.checked : null,
    dependentsUnder70: els.dependentsUnder70.value,
    dependents70Plus: els.dependents70Plus.value,
  };
}

function writeDraft(draft) {
  syncing = true;
  els.grossSalary.value = draft.grossSalary;
  els.filingSingle.checked = draft.filingStatus !== 'married';
  els.filingMarried.checked = draft.filingStatus === 'married';
  els.selfAge70Plus.checked = draft.selfAge70Plus === true;
  els.spouseAge70Plus.checked = draft.spouseAge70Plus === true;
  els.dependentsUnder70.value = draft.dependentsUnder70;
  els.dependents70Plus.value = draft.dependents70Plus;
  syncSpouseField();
  syncing = false;
}

function syncSpouseField() {
  const married = els.filingMarried.checked;
  els.spouseField.hidden = !married;
  els.spouseAge70Plus.disabled = !married;
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

function fillResult(result) {
  $('sum-taxPayable').textContent = formatAmount(result.taxPayable);
  $('sum-taxableNet').textContent = formatAmount(result.taxableNet);
  $('sum-rate').textContent = `${result.ratePercent}%`;
  $('step-grossSalary').textContent = formatAmount(result.grossSalary);
  $('step-salarySpecialDeduction').textContent = formatAmount(result.salarySpecialDeduction);
  $('step-salaryNet').textContent = formatAmount(result.salaryNet);
  $('step-exemptionTotal').textContent = formatAmount(result.exemptionTotal);
  $('step-standardDeduction').textContent = formatAmount(result.standardDeduction);
  $('step-taxableNet').textContent = formatAmount(result.taxableNet);
  $('step-bracket').textContent = `${result.ratePercent}% / ${formatAmount(result.progressiveDifference)}`;
  $('step-taxPayable').textContent = formatAmount(result.taxPayable);
  els.zeroTaxNote.hidden = result.taxPayable !== 0;
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
  syncSpouseField();
  controller.edit(readDraft());
});
form.addEventListener('change', () => {
  if (syncing) return;
  syncSpouseField();
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  els.exampleNote.hidden = true;
  controller.run();
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
  els.grossSalary.focus();
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
    els.exampleNote.hidden = true;
  }
});

writeDraft(DEFAULT_DRAFT);
render(controller.snapshot());
