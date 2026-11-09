// App wiring for Numeric Range Coverage Audit.
// The worker source below is embedded at build time: scripts/build.mjs
// replaces the placeholder string with the fixed worker bundle (core +
// handler). User input is never code: it only ever travels as message data.

import { buildReport, REPORT_FILENAME } from './core/range.mjs';
import { AuditController, DEFAULT_DRAFT } from './core/controller.mjs';

const WORKER_SOURCE = "// Pure core for Numeric Range Coverage Audit.\n// No DOM, network, or storage access. Importable by Node tests and by the\n// module Worker (the build embeds this file's source into the worker bundle).\n//\n// Contract: docs/specs/range-coverage-audit/SPEC.md (spec-range-coverage-audit-20261109)\n// Half-open [lo, hi) decimal ranges over one domain. All endpoints are\n// converted to BigInt thousandths; no rounding ever happens.\n\nexport const MAX_INTERVAL_CHARS = 16384;\nexport const MAX_INTERVAL_ROWS = 200;\nexport const MAX_ENDPOINT_ABS_THOUSANDTHS = 1000000000000n; // 1,000,000,000\nexport const MAX_REPORT_BYTES = 2097152;\nexport const REPORT_FILENAME = 'range-coverage-audit-report.json';\n\n// -?(0|[1-9][0-9]{0,9})(\\.[0-9]{1,3})? — no whitespace, no plus, no exponent.\nconst DECIMAL_RE = /^-?(0|[1-9][0-9]{0,9})(\\.[0-9]{1,3})?$/;\n\nfunction fail(code, field, row) {\n  return { ok: false, error: { code, field, row } };\n}\n\n// Parse a decimal string to BigInt thousandths. Returns null when the grammar\n// or the absolute range (-1,000,000,000 … 1,000,000,000) fails. -0 becomes 0.\nexport function parseDecimal(text) {\n  if (typeof text !== 'string' || !DECIMAL_RE.test(text)) return null;\n  const negative = text.startsWith('-');\n  const body = negative ? text.slice(1) : text;\n  const dot = body.indexOf('.');\n  const intPart = dot === -1 ? body : body.slice(0, dot);\n  const fracPart = dot === -1 ? '' : body.slice(dot + 1);\n  const thousandths = BigInt(intPart) * 1000n + BigInt((fracPart + '000').slice(0, 3));\n  if (thousandths > MAX_ENDPOINT_ABS_THOUSANDTHS) return null;\n  return negative ? -thousandths : thousandths;\n}\n\n// Format BigInt thousandths as a standard ASCII decimal string: no\n// unnecessary leading/trailing zeros, no negative zero, no rounding.\nexport function formatDecimal(thousandths) {\n  if (thousandths === 0n) return '0';\n  const negative = thousandths < 0n;\n  const abs = negative ? -thousandths : thousandths;\n  const intPart = abs / 1000n;\n  const frac = abs % 1000n;\n  let out = intPart.toString();\n  if (frac !== 0n) {\n    out += '.' + frac.toString().padStart(3, '0').replace(/0+$/, '');\n  }\n  return negative ? '-' + out : out;\n}\n\n// True when the string contains an unpaired UTF-16 surrogate.\nexport function hasUnpairedSurrogate(text) {\n  for (let i = 0; i < text.length; i += 1) {\n    const code = text.charCodeAt(i);\n    if (code >= 0xd800 && code <= 0xdbff) {\n      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;\n      if (next < 0xdc00 || next > 0xdfff) return true;\n      i += 1;\n    } else if (code >= 0xdc00 && code <= 0xdfff) {\n      return true;\n    }\n  }\n  return false;\n}\n\nfunction sameLines(a, b) {\n  if (a.length !== b.length) return false;\n  for (let i = 0; i < a.length; i += 1) {\n    if (a[i] !== b[i]) return false;\n  }\n  return true;\n}\n\n// Validate and audit one snapshot. Input must be a plain object with exactly\n// the own string fields {start, end, intervals}; anything else is SCHEMA.\n// Success is {ok:true, result:{spans, covered, uncovered, overlapped}}.\n// Failure is {ok:false, error:{code, field, row}}.\nexport function runAudit(input) {\n  if (input === null || typeof input !== 'object' || Array.isArray(input)) {\n    return fail('SCHEMA', null, null);\n  }\n  const keys = Object.keys(input);\n  if (keys.length !== 3 || !keys.includes('start') || !keys.includes('end') || !keys.includes('intervals')) {\n    return fail('SCHEMA', null, null);\n  }\n  for (const key of ['start', 'end', 'intervals']) {\n    const descriptor = Object.getOwnPropertyDescriptor(input, key);\n    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {\n      return fail('SCHEMA', null, null);\n    }\n    if (typeof input[key] !== 'string') return fail('SCHEMA', null, null);\n  }\n\n  const { start, end, intervals } = input;\n\n  // Domain endpoints first: start, then end, then domain order.\n  if (start === '') return fail('EMPTY', 'start', null);\n  const startValue = parseDecimal(start);\n  if (startValue === null) return fail('ENDPOINT', 'start', null);\n  if (end === '') return fail('EMPTY', 'end', null);\n  const endValue = parseDecimal(end);\n  if (endValue === null) return fail('ENDPOINT', 'end', null);\n  if (startValue >= endValue) return fail('DOMAIN_ORDER', 'end', null);\n\n  // Intervals: capacity, then surrogate, then row count.\n  if (intervals.length > MAX_INTERVAL_CHARS) return fail('INPUT_LIMIT', 'intervals', null);\n  if (hasUnpairedSurrogate(intervals)) return fail('UNICODE', 'intervals', null);\n  let body = intervals;\n  if (body.endsWith('\\n')) body = body.slice(0, -1);\n  const rows = body === '' ? [] : body.split('\\n');\n  if (rows.length > MAX_INTERVAL_ROWS) return fail('ROW_LIMIT', 'intervals', null);\n\n  const parsed = [];\n  for (let i = 0; i < rows.length; i += 1) {\n    const rowNo = i + 1;\n    const columns = rows[i].split('\\t');\n    if (columns.length !== 2) return fail('ROW_FORMAT', 'intervals', rowNo);\n    const lo = parseDecimal(columns[0]);\n    if (lo === null) return fail('ENDPOINT', 'intervals', rowNo);\n    const hi = parseDecimal(columns[1]);\n    if (hi === null) return fail('ENDPOINT', 'intervals', rowNo);\n    if (lo >= hi) return fail('INTERVAL_ORDER', 'intervals', rowNo);\n    if (lo < startValue || hi > endValue) return fail('OUTSIDE', 'intervals', rowNo);\n    parsed.push({ lo, hi, line: rowNo });\n  }\n\n  // Sweep distinct endpoints in ascending order. At each x, intervals ending\n  // at x are already out and intervals starting at x are already in, which\n  // the predicate lo <= x < hi expresses exactly. Touching endpoints never\n  // produce a zero-width span and never count as overlapping.\n  const points = new Set([startValue, endValue]);\n  for (const item of parsed) {\n    points.add(item.lo);\n    points.add(item.hi);\n  }\n  const sorted = [...points].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));\n\n  const spans = [];\n  let covered = 0n;\n  let uncovered = 0n;\n  let overlapped = 0n;\n  for (let i = 0; i + 1 < sorted.length; i += 1) {\n    const x = sorted[i];\n    const y = sorted[i + 1];\n    const lines = parsed\n      .filter((item) => item.lo <= x && item.hi > x)\n      .map((item) => item.line);\n    const length = y - x;\n    if (lines.length >= 1) covered += length;\n    if (lines.length === 0) uncovered += length;\n    if (lines.length >= 2) overlapped += length;\n    const last = spans[spans.length - 1];\n    if (last && sameLines(last.lines, lines)) {\n      last.to = formatDecimal(y);\n    } else {\n      spans.push({ from: formatDecimal(x), to: formatDecimal(y), depth: lines.length, lines });\n    }\n  }\n\n  return {\n    ok: true,\n    result: {\n      spans,\n      covered: formatDecimal(covered),\n      uncovered: formatDecimal(uncovered),\n      overlapped: formatDecimal(overlapped),\n    },\n  };\n}\n\n// Canonical JSON: object own keys sorted by UTF-16 code units, recursively;\n// array order unchanged. Compact, one trailing LF, no BOM.\nexport function canonicalize(value) {\n  if (Array.isArray(value)) return value.map(canonicalize);\n  if (value !== null && typeof value === 'object') {\n    const out = {};\n    for (const key of Object.keys(value).sort()) {\n      out[key] = canonicalize(value[key]);\n    }\n    return out;\n  }\n  return value;\n}\n\nexport function serializeReport(result) {\n  return JSON.stringify(canonicalize(result)) + '\\n';\n}\n\n// Build the downloadable report text. Over the 2,097,152-byte cap the report\n// is refused (OUTPUT_LIMIT) and no product is produced.\nexport function buildReport(result) {\n  const text = serializeReport(result);\n  const bytes = new TextEncoder().encode(text).length;\n  if (bytes > MAX_REPORT_BYTES) {\n    return { ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null } };\n  }\n  return { ok: true, text, bytes };\n}\n\n// Module Worker entry for Numeric Range Coverage Audit.\n//\n// The build (scripts/build.mjs) concatenates public/js/core/range.mjs with\n// this file — minus the import line below — into one self-contained bundle\n// string, which the app loads through a Blob URL. That keeps user input out\n// of code entirely: the worker only ever receives data, never code.\n//\n// `handleWorkerMessage` is exported so Node tests can exercise the exact\n// worker path without a browser.\n\n\nexport function handleWorkerMessage(message) {\n  if (!message || typeof message !== 'object' || typeof message.generation !== 'number') {\n    return { generation: 0, ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } };\n  }\n  try {\n    const outcome = runAudit(message.input);\n    if (outcome.ok) {\n      return { generation: message.generation, ok: true, result: outcome.result };\n    }\n    return { generation: message.generation, ok: false, error: outcome.error };\n  } catch {\n    return { generation: message.generation, ok: false, error: { code: 'WORKER_ERROR', field: null, row: null } };\n  }\n}\n\nif (typeof self !== 'undefined' && self !== null && typeof self.postMessage === 'function') {\n  self.onmessage = (event) => {\n    self.postMessage(handleWorkerMessage(event.data));\n  };\n}\n";

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
