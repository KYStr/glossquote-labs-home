// App wiring for Numeric Range Coverage Audit.
// The worker source below is embedded at build time: scripts/build.mjs
// replaces the placeholder string with the fixed worker bundle (core +
// handler). User input is never code: it only ever travels as message data.

import { buildReport, REPORT_FILENAME } from './core/range.mjs';
import { AuditController, DEFAULT_DRAFT } from './core/controller.mjs';

const WORKER_SOURCE = "__WORKER_SOURCE_PLACEHOLDER__";

const EXAMPLE_DRAFT = { start: '0', end: '10', intervals: '0\t4\n3\t6\n8\t10' };
const PAGE_SIZE = 25;
const DOWNLOAD_REVOKE_MS = 30000;

const STRINGS = {
  'zh-Hant': {
    state: {
      empty: '尚未檢查',
      dirty: '輸入已變更，請重新執行',
      busy: '處理中',
      success: '檢查完成',
      error: '輸入有誤',
      cancelled: '已取消，可重新執行',
    },
    emptyHint: '請輸入覆蓋域與區間，或載入範例。',
    exampleLoaded: '已載入範例（同時有一個重疊及一個空段），請按「檢查區間覆蓋」執行。',
    errorPrefix: '請修正後再執行。',
    errors: {
      SCHEMA: '輸入資料格式不正確。',
      INPUT_LIMIT: '區間文字超過 16,384 個字元上限。',
      EMPTY: '缺少內容：請填寫此欄位。',
      ROW_LIMIT: '區間超過 200 列上限。',
      UNICODE: '區間文字含有不成對的代理字元。',
      ENDPOINT: '數字格式不正確：請用十進數，最多 3 位小數，範圍在 -1,000,000,000 至 1,000,000,000 之間。',
      DOMAIN_ORDER: '覆蓋域起點必須小於終點。',
      ROW_FORMAT: '每列必須是「起點 Tab 終點」，恰好兩個欄位。',
      INTERVAL_ORDER: '區間起點必須小於終點。',
      OUTSIDE: '區間超出覆蓋域，不會自動裁切。',
      OUTPUT_LIMIT: '報告超過 2,097,152 bytes 上限，無法下載。',
      WORKER_ERROR: '處理失敗，請保留草稿再試一次。',
      INTERNAL: '發生內部錯誤，請再試一次。',
    },
    fieldLabel: { start: '覆蓋域起點', end: '覆蓋域終點', intervals: '區間起訖' },
    rowWord: '第 {row} 列',
    covered: '已覆蓋長度',
    uncovered: '缺口長度',
    overlapped: '重疊長度',
    pageInfo: '第 {page} / {pages} 頁，共 {total} 列',
    prevPage: '上一頁',
    nextPage: '下一頁',
    downloadReady: '報告已就緒，可以下載。',
    noSpans: '沒有可列出的區段。',
  },
  en: {
    state: {
      empty: 'Not audited yet',
      dirty: 'Input changed. Run again.',
      busy: 'Working',
      success: 'Audit complete',
      error: 'Input error',
      cancelled: 'Cancelled. You can run again.',
    },
    emptyHint: 'Enter a domain and intervals, or load the example.',
    exampleLoaded: 'Example loaded (one overlap and one gap). Press “Audit coverage” to run it.',
    errorPrefix: 'Fix the issue and run again.',
    errors: {
      SCHEMA: 'The input data is malformed.',
      INPUT_LIMIT: 'The intervals text exceeds the 16,384-character limit.',
      EMPTY: 'Missing content: fill in this field.',
      ROW_LIMIT: 'Intervals exceed the 200-row limit.',
      UNICODE: 'The intervals text contains an unpaired surrogate.',
      ENDPOINT: 'Bad number format: use a decimal with at most 3 fraction digits, between -1,000,000,000 and 1,000,000,000.',
      DOMAIN_ORDER: 'The domain start must be smaller than the domain end.',
      ROW_FORMAT: 'Each row must be exactly “start Tab end”, two columns.',
      INTERVAL_ORDER: 'An interval start must be smaller than its end.',
      OUTSIDE: 'An interval lies outside the domain; it is not clipped.',
      OUTPUT_LIMIT: 'The report exceeds the 2,097,152-byte limit and cannot be downloaded.',
      WORKER_ERROR: 'Processing failed. Your draft is kept; try again.',
      INTERNAL: 'An internal error occurred. Try again.',
    },
    fieldLabel: { start: 'Domain start', end: 'Domain end', intervals: 'Interval endpoints' },
    rowWord: 'Row {row}',
    covered: 'Covered length',
    uncovered: 'Gap length',
    overlapped: 'Overlap length',
    pageInfo: 'Page {page} of {pages}, {total} rows',
    prevPage: 'Previous page',
    nextPage: 'Next page',
    downloadReady: 'The report is ready to download.',
    noSpans: 'No spans to list.',
  },
};

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const T = STRINGS[lang];

const $ = (id) => document.getElementById(id);
const startInput = $('domain-start');
const endInput = $('domain-end');
const intervalsInput = $('intervals');
const runButton = $('run-btn');
const loadExampleButton = $('load-example-btn');
const resetButton = $('reset-btn');
const cancelButton = $('cancel-btn');
const downloadButton = $('download-btn');
const statusBadge = $('status-badge');
const statusText = $('status-text');
const errorBox = $('error-box');
const errorText = $('error-text');
const exampleNote = $('example-note');
const resultsSection = $('results');
const emptyState = $('empty-state');
const summaryCovered = $('summary-covered');
const summaryUncovered = $('summary-uncovered');
const summaryOverlapped = $('summary-overlapped');
const spansBody = $('spans-body');
const spansRegion = $('spans-region');
const prevPageButton = $('prev-page');
const nextPageButton = $('next-page');
const pageInfo = $('page-info');

let currentPage = 0;
let reportText = null;
let downloadUrl = null;
let downloadTimer = null;
let worker = null;
let workerUrl = null;

function readDraft() {
  return { start: startInput.value, end: endInput.value, intervals: intervalsInput.value };
}

function writeDraft(draft) {
  startInput.value = draft.start;
  endInput.value = draft.end;
  intervalsInput.value = draft.intervals;
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
  reportText = null;
}

function terminateWorker() {
  if (worker !== null) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl !== null) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

// Runner for the controller: posts the snapshot to the module Worker built
// from the fixed embedded bundle string. Also enforces the report size cap
// so an over-cap result surfaces as an OUTPUT_LIMIT error, never a download.
function runInWorker(snapshot, generation) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      terminateWorker();
      resolve(outcome);
    };
    let url;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      workerUrl = url;
      worker = new Worker(url, { type: 'module' });
    } catch {
      settle({ ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } });
      return;
    }
    worker.onmessage = (event) => {
      const message = event.data;
      if (!message || message.generation !== generation) return;
      if (message.ok) {
        const report = buildReport(message.result);
        if (!report.ok) {
          settle({ ok: false, error: report.error });
          return;
        }
        reportText = report.text;
        settle({ ok: true, result: message.result });
      } else {
        settle({ ok: false, error: message.error });
      }
    };
    worker.onerror = () => {
      settle({ ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } });
    };
    worker.postMessage({ generation, input: snapshot });
  });
}

const controller = new AuditController({ runner: runInWorker, onCancelWork: terminateWorker });

function formatError(error) {
  if (!error) return '';
  const parts = [T.errors[error.code] || T.errors.INTERNAL];
  if (error.field && T.fieldLabel[error.field]) parts.push(T.fieldLabel[error.field]);
  if (error.row !== null && error.row !== undefined) {
    parts.push(T.rowWord.replace('{row}', String(error.row)));
  }
  return parts.join(' ');
}

function setFieldError(fieldId, message) {
  const input = $(fieldId);
  const errorEl = $(fieldId + '-error');
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    if (errorEl) errorEl.textContent = message;
  } else {
    input.removeAttribute('aria-invalid');
    if (errorEl) errorEl.textContent = '';
  }
}

function clearFieldErrors() {
  setFieldError('domain-start', '');
  setFieldError('domain-end', '');
  setFieldError('intervals', '');
}

function renderSpans() {
  const result = controller.result;
  if (!result) {
    spansBody.textContent = '';
    pageInfo.textContent = '';
    return;
  }
  const total = result.spans.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage >= pages) currentPage = pages - 1;
  const start = currentPage * PAGE_SIZE;
  const pageSpans = result.spans.slice(start, start + PAGE_SIZE);
  spansBody.textContent = '';
  for (const span of pageSpans) {
    const row = document.createElement('tr');
    row.className = 'depth-' + String(Math.min(span.depth, 3));
    const fromCell = document.createElement('td');
    fromCell.className = 'num';
    fromCell.textContent = span.from;
    const toCell = document.createElement('td');
    toCell.className = 'num';
    toCell.textContent = span.to;
    const depthCell = document.createElement('td');
    depthCell.className = 'num';
    depthCell.textContent = String(span.depth);
    const linesCell = document.createElement('td');
    linesCell.textContent = span.lines.length === 0 ? '—' : span.lines.join(', ');
    row.append(fromCell, toCell, depthCell, linesCell);
    spansBody.appendChild(row);
  }
  pageInfo.textContent = T.pageInfo
    .replace('{page}', String(currentPage + 1))
    .replace('{pages}', String(pages))
    .replace('{total}', String(total));
  prevPageButton.disabled = currentPage === 0;
  nextPageButton.disabled = currentPage >= pages - 1;
  spansRegion.hidden = total === 0;
  if (total === 0) pageInfo.textContent = T.noSpans;
}

function render() {
  const state = controller.state;
  statusBadge.dataset.state = state;
  statusBadge.textContent = T.state[state];
  statusText.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');

  if (state === 'busy') {
    statusText.textContent = T.state.busy;
  } else if (state === 'success') {
    statusText.textContent = T.state.success + ' — ' + T.downloadReady;
  } else if (state === 'error') {
    statusText.textContent = T.state.error + '. ' + T.errorPrefix;
  } else if (state === 'dirty') {
    statusText.textContent = T.state.dirty;
  } else if (state === 'cancelled') {
    statusText.textContent = T.state.cancelled;
  } else {
    statusText.textContent = T.emptyHint;
  }

  runButton.disabled = state === 'busy';
  loadExampleButton.disabled = state === 'busy';
  resetButton.disabled = state === 'busy';
  cancelButton.hidden = state !== 'busy';
  downloadButton.hidden = !controller.reportAvailable;

  if (state !== 'success') revokeDownload();

  if (state === 'error' && controller.error) {
    errorText.textContent = formatError(controller.error);
    errorBox.hidden = false;
    const fieldMap = { start: 'domain-start', end: 'domain-end', intervals: 'intervals' };
    clearFieldErrors();
    if (controller.error.field && fieldMap[controller.error.field]) {
      setFieldError(fieldMap[controller.error.field], formatError(controller.error));
    }
  } else {
    errorBox.hidden = true;
    errorText.textContent = '';
    if (state !== 'dirty') clearFieldErrors();
  }

  if (state === 'success' && controller.result) {
    resultsSection.hidden = false;
    emptyState.hidden = true;
    summaryCovered.textContent = controller.result.covered;
    summaryUncovered.textContent = controller.result.uncovered;
    summaryOverlapped.textContent = controller.result.overlapped;
    renderSpans();
  } else {
    resultsSection.hidden = true;
    emptyState.hidden = false;
    summaryCovered.textContent = '—';
    summaryUncovered.textContent = '—';
    summaryOverlapped.textContent = '—';
    spansBody.textContent = '';
  }
}

controller.onChange(render);

for (const input of [startInput, endInput, intervalsInput]) {
  input.addEventListener('input', () => {
    exampleNote.hidden = true;
    controller.setDraft(readDraft());
  });
}

runButton.addEventListener('click', async () => {
  exampleNote.hidden = true;
  const done = await controller.run();
  if (done && controller.state === 'error' && controller.error && controller.error.field) {
    const fieldMap = { start: 'domain-start', end: 'domain-end', intervals: 'intervals' };
    const target = $(fieldMap[controller.error.field]);
    if (target) target.focus();
  }
});

loadExampleButton.addEventListener('click', () => {
  writeDraft(EXAMPLE_DRAFT);
  controller.loadExample(EXAMPLE_DRAFT);
  exampleNote.hidden = false;
  startInput.focus();
});

resetButton.addEventListener('click', () => {
  exampleNote.hidden = true;
  controller.reset();
  writeDraft(DEFAULT_DRAFT);
  startInput.focus();
});

cancelButton.addEventListener('click', () => {
  controller.cancel();
});

downloadButton.addEventListener('click', () => {
  if (!controller.reportAvailable || reportText === null) return;
  const text = reportText;
  revokeDownload();
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = REPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  downloadTimer = setTimeout(revokeDownload, DOWNLOAD_REVOKE_MS);
});

prevPageButton.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage -= 1;
    renderSpans();
  }
});

nextPageButton.addEventListener('click', () => {
  if (!controller.result) return;
  const pages = Math.max(1, Math.ceil(controller.result.spans.length / PAGE_SIZE));
  if (currentPage < pages - 1) {
    currentPage += 1;
    renderSpans();
  }
});

window.addEventListener('pagehide', () => {
  terminateWorker();
  revokeDownload();
});

writeDraft(DEFAULT_DRAFT);
render();
