// DOM wiring for the HbA1c Converter. All user-visible text is set
// through textContent/value only; user input never becomes HTML.
// Computation runs in a module Worker built from the fixed worker source
// embedded by the preview build (WORKER_SOURCE). The controller owns the
// draft, generation, and state machine; this file only renders it.

import { createController, DEFAULT_DRAFT } from './controller.mjs';
import { REPORT_FILENAME, serializeReport } from './core/convert.mjs';
import { message } from './i18n.mjs';
import { WORKER_SOURCE } from './worker-source.js';

const REPORT_URL_TTL_MS = 30000;

const lang = document.documentElement.lang === 'zh-Hant' ? 'zh-Hant' : 'en';
const t = (key) => message(lang, key);

const valueInput = document.getElementById('value-input');
const unitSelect = document.getElementById('unit-select');
const runButton = document.getElementById('run-button');
const exampleButton = document.getElementById('example-button');
const resetButton = document.getElementById('reset-button');
const cancelButton = document.getElementById('cancel-button');
const downloadButton = document.getElementById('download-button');
const statusRegion = document.getElementById('status');
const statusText = document.getElementById('status-text');
const errorBox = document.getElementById('error-box');
const errorText = document.getElementById('error-text');
const exampleNote = document.getElementById('example-note');
const valueHelp = document.getElementById('value-help');
const resultSection = document.getElementById('result-section');
const resultSummary = document.getElementById('result-summary');
const cells = {
  a1c: document.getElementById('res-a1c'),
  ifcc: document.getElementById('res-ifcc'),
  eagMgdl: document.getElementById('res-eag-mgdl'),
  eagMmoll: document.getElementById('res-eag-mmoll'),
  category: document.getElementById('res-category'),
};

const UNIT_HELP_KEY = {
  'a1c-percent': 'valueHelp_a1c_percent',
  ifcc: 'valueHelp_ifcc',
  'eag-mgdl': 'valueHelp_eag_mgdl',
  'eag-mmoll': 'valueHelp_eag_mmoll',
};

const CATEGORY_KEY = {
  normal: 'categoryNormal',
  prediabetes: 'categoryPrediabetes',
  'diabetes-range': 'categoryDiabetesRange',
};

let reportUrl = null;
let reportUrlTimer = null;
let submitted = false;
let previousState = 'empty';

function createWorker() {
  const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });
  const originalTerminate = worker.terminate.bind(worker);
  worker.terminate = () => {
    originalTerminate();
    URL.revokeObjectURL(url);
  };
  return worker;
}

function revokeReportUrl() {
  if (reportUrlTimer !== null) {
    clearTimeout(reportUrlTimer);
    reportUrlTimer = null;
  }
  if (reportUrl !== null) {
    URL.revokeObjectURL(reportUrl);
    reportUrl = null;
  }
}

function readDraft() {
  return { value: valueInput.value, unit: unitSelect.value };
}

function writeDraft(draft) {
  valueInput.value = draft.value;
  unitSelect.value = draft.unit;
}

function render(snap) {
  statusRegion.setAttribute('aria-busy', snap.state === 'busy' ? 'true' : 'false');
  cancelButton.hidden = snap.state !== 'busy';
  downloadButton.hidden = snap.state !== 'success';
  runButton.disabled = snap.state === 'busy';
  valueHelp.textContent = t(UNIT_HELP_KEY[snap.draft.unit] ?? 'valueHelp_a1c_percent');
  exampleNote.hidden = !snap.isExample;
  if (snap.isExample) exampleNote.textContent = t('exampleNote');

  if (snap.state !== 'success') revokeReportUrl();

  if (snap.state === 'error' && snap.error !== null) {
    const errorMessage = t(`error_${snap.error.code}`);
    errorText.textContent = errorMessage;
    errorBox.hidden = false;
    statusText.textContent = errorMessage;
    if (snap.error.field === 'value') {
      valueInput.setAttribute('aria-invalid', 'true');
      valueInput.setAttribute('aria-errormessage', 'error-text');
      // Only a failed submission moves focus to the first error field.
      if (submitted && previousState === 'busy') valueInput.focus();
    } else if (snap.error.field === 'unit') {
      unitSelect.setAttribute('aria-invalid', 'true');
      unitSelect.setAttribute('aria-errormessage', 'error-text');
      if (submitted && previousState === 'busy') unitSelect.focus();
    }
    submitted = false;
    resultSection.hidden = true;
  } else {
    errorBox.hidden = true;
    valueInput.removeAttribute('aria-invalid');
    valueInput.removeAttribute('aria-errormessage');
    unitSelect.removeAttribute('aria-invalid');
    unitSelect.removeAttribute('aria-errormessage');
    if (snap.state === 'empty') statusText.textContent = t('statusEmpty');
    else if (snap.state === 'dirty') statusText.textContent = t('statusDirty');
    else if (snap.state === 'busy') statusText.textContent = t('statusBusy');
    else if (snap.state === 'cancelled') statusText.textContent = t('statusCancelled');
    else if (snap.state === 'success') statusText.textContent = t('statusSuccess');
  }

  if (snap.state === 'success' && snap.result !== null) {
    const result = snap.result;
    resultSummary.textContent = t('summary')
      .replace('{a1c}', result.a1cPercent)
      .replace('{ifcc}', result.ifcc)
      .replace('{mgdl}', result.eagMgdl)
      .replace('{mmoll}', result.eagMmoll)
      .replace('{category}', t(CATEGORY_KEY[result.category]));
    cells.a1c.textContent = `${result.a1cPercent} %`;
    cells.ifcc.textContent = `${result.ifcc} mmol/mol`;
    cells.eagMgdl.textContent = `${result.eagMgdl} mg/dL`;
    cells.eagMmoll.textContent = `${result.eagMmoll} mmol/L`;
    cells.category.textContent = t(CATEGORY_KEY[result.category]);
    resultSection.hidden = false;
  } else {
    resultSection.hidden = true;
  }
  previousState = snap.state;
}

const controller = createController({ createWorker, onChange: render });

function onEdit() {
  exampleNote.hidden = true;
  controller.edit(readDraft());
}

valueInput.addEventListener('input', onEdit);
unitSelect.addEventListener('change', onEdit);

runButton.addEventListener('click', () => {
  submitted = true;
  exampleNote.hidden = true;
  controller.run(readDraft());
});

exampleButton.addEventListener('click', () => {
  controller.loadExample();
  writeDraft(controller.getState().draft);
});

resetButton.addEventListener('click', () => {
  controller.reset();
  writeDraft({ ...DEFAULT_DRAFT });
  exampleNote.hidden = true;
  valueInput.focus();
});

cancelButton.addEventListener('click', () => {
  controller.cancel();
  runButton.focus();
});

downloadButton.addEventListener('click', () => {
  const current = controller.getState();
  if (current.state !== 'success' || current.result === null) return;
  const serialized = serializeReport(current.result);
  if (!serialized.ok) {
    statusText.textContent = t('error_OUTPUT_LIMIT');
    return;
  }
  revokeReportUrl();
  const blob = new Blob([serialized.text], { type: 'application/json' });
  reportUrl = URL.createObjectURL(blob);
  reportUrlTimer = setTimeout(revokeReportUrl, REPORT_URL_TTL_MS);
  const anchor = document.createElement('a');
  anchor.href = reportUrl;
  anchor.download = REPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
});

window.addEventListener('pagehide', () => {
  revokeReportUrl();
  controller.destroy();
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    revokeReportUrl();
    controller.reset();
    writeDraft({ ...DEFAULT_DRAFT });
  }
});

render(controller.getState());
