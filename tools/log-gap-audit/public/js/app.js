// Log Gap Audit — DOM wiring. Safe DOM APIs only (textContent / value);
// user content never becomes markup, a selector, a URL, or code.
// The worker is built from the fixed embedded core source (Blob URL) when
// the preview build generated worker-source.mjs; otherwise the static
// module worker ./worker.mjs is used (same core, same contract).

import { AuditController } from './controller.mjs';

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';

const STRINGS = {
  'zh-Hant': {
    statusEmpty: '請輸入記錄，或載入範例。',
    statusDirty: '輸入已變更，請重新執行。',
    statusBusy: '處理中…',
    statusCancelled: '已取消，可重新執行。',
    statusSuccess: (rowCount, count) =>
      count === 0
        ? `共 ${rowCount} 列，沒有異常。`
        : `共 ${rowCount} 列，發現 ${count} 處異常。`,
    exampleNote: '已載入範例資料，請按「找出相鄰記錄異常」執行。',
    findingsHeading: '異常與兩個來源列',
    findingsNote:
      'SEQ_GAP 是兩數之間的整數缺口；其他列可能包含遲到資料。報告不推斷事件有無到達。',
    pageInfo: (page, pages) => `第 ${page} / ${pages} 頁`,
    colLine: '後一列',
    colPrevLine: '前一列',
    colSeqDelta: '序號差',
    colTimeDelta: '時間差（ms）',
    colIssues: '問題',
    issueSEQ_GAP: (i) => `序號缺口 ${i.from}–${i.to}（缺 ${i.count} 個）`,
    issueSEQ_REVERSE: '序號倒退',
    issueSEQ_REPEAT: '序號重複',
    issueTIME_GAP: '時間缺口超過門檻',
    issueTIME_REVERSE: '時間倒退',
    fieldRecords: '記錄',
    fieldThreshold: '時間缺口門檻',
    errorSCHEMA: '輸入格式不正確。',
    errorTHRESHOLD: '門檻必須是 0 至 999999999999999999 的整數。',
    errorINPUT_LIMIT: '記錄內容超過 65,536 個字元。',
    errorEMPTY: '請輸入記錄。',
    errorROW_LIMIT: '記錄最多 1,000 列。',
    errorUNICODE: '記錄含有不成對的代理字元（surrogate）。',
    errorROW_FORMAT: (row) => `第 ${row} 列格式錯誤：每列須為「序號 + Tab + 毫秒」。`,
    errorSEQUENCE: (row) => `第 ${row} 列序號錯誤：須為 0 或非零開頭、最多 18 位整數。`,
    errorTIME: (row) => `第 ${row} 列毫秒錯誤：須為 0 或非零開頭、最多 18 位整數。`,
    errorOUTPUT_LIMIT: '報告超過 2,097,152 位元組，無法產生。',
    errorINTERNAL: '內部錯誤，請重試。',
    errorWORKER_ERROR: '背景工作失敗，草稿已保留，請重試。',
  },
  en: {
    statusEmpty: 'Enter records, or load the example.',
    statusDirty: 'Input changed. Run again.',
    statusBusy: 'Working…',
    statusCancelled: 'Cancelled. You can run again.',
    statusSuccess: (rowCount, count) =>
      count === 0
        ? `${rowCount} rows, no anomalies.`
        : `${rowCount} rows, ${count} findings.`,
    exampleNote: 'Example data loaded. Press “Find adjacent anomalies” to run it.',
    findingsHeading: 'Findings and source row pairs',
    findingsNote:
      'SEQ_GAP is the integer gap between two numbers; other rows may contain late data. The report does not infer whether any event arrived.',
    pageInfo: (page, pages) => `Page ${page} of ${pages}`,
    colLine: 'Row',
    colPrevLine: 'Previous row',
    colSeqDelta: 'Sequence Δ',
    colTimeDelta: 'Time Δ (ms)',
    colIssues: 'Issues',
    issueSEQ_GAP: (i) => `Sequence gap ${i.from}–${i.to} (missing ${i.count})`,
    issueSEQ_REVERSE: 'Sequence reversed',
    issueSEQ_REPEAT: 'Sequence repeated',
    issueTIME_GAP: 'Time gap over threshold',
    issueTIME_REVERSE: 'Time reversed',
    fieldRecords: 'Records',
    fieldThreshold: 'Time-gap threshold',
    errorSCHEMA: 'The input is malformed.',
    errorTHRESHOLD: 'Threshold must be an integer from 0 to 999999999999999999.',
    errorINPUT_LIMIT: 'Records exceed 65,536 characters.',
    errorEMPTY: 'Enter at least one record.',
    errorROW_LIMIT: 'Records are limited to 1,000 rows.',
    errorUNICODE: 'Records contain an unpaired surrogate.',
    errorROW_FORMAT: (row) => `Row ${row} is malformed: each row must be “sequence Tab elapsed-ms”.`,
    errorSEQUENCE: (row) =>
      `Row ${row} has an invalid sequence: 0 or a non-zero-leading integer of at most 18 digits.`,
    errorTIME: (row) =>
      `Row ${row} has invalid elapsed-ms: 0 or a non-zero-leading integer of at most 18 digits.`,
    errorOUTPUT_LIMIT: 'The report exceeds 2,097,152 bytes and cannot be produced.',
    errorINTERNAL: 'Internal error. Try again.',
    errorWORKER_ERROR: 'The background worker failed. Your draft is kept; try again.',
  },
};

const S = STRINGS[lang];
const PAGE_SIZE = 25;

const $ = (id) => document.getElementById(id);
const auditForm = $('auditForm');
auditForm.addEventListener('submit', (event) => event.preventDefault());

const mainEl = $('main');
const recordsEl = $('records');
const thresholdEl = $('threshold');
const fileEl = $('fileInput');
const findBtn = $('findBtn');
const exampleBtn = $('exampleBtn');
const resetBtn = $('resetBtn');
const cancelBtn = $('cancelBtn');
const downloadBtn = $('downloadBtn');
const statusEl = $('status');
const errorBox = $('errorBox');
const exampleNoteEl = $('exampleNote');
const findingsSection = $('findingsSection');
const findingsSummary = $('findingsSummary');
const findingsBody = $('findingsBody');
const paginationEl = $('pagination');
const prevPageBtn = $('prevPageBtn');
const nextPageBtn = $('nextPageBtn');
const pageInfoEl = $('pageInfo');

let currentPage = 1;
let focusOnError = false;

let downloadUrl = null;
let downloadTimer = null;

function revokeDownload() {
  if (downloadUrl !== null) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  if (downloadTimer !== null) {
    clearTimeout(downloadTimer);
    downloadTimer = null;
  }
}

async function createRealWorker() {
  let source = null;
  try {
    const mod = await import('./worker-source.mjs');
    if (mod && typeof mod.WORKER_SOURCE === 'string') source = mod.WORKER_SOURCE;
  } catch {
    source = null;
  }
  if (source && source.length > 0) {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const worker = new Worker(url, { type: 'module' });
    const originalTerminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      try {
        originalTerminate();
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    return worker;
  }
  return new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
}

const controller = new AuditController({
  createWorker: createRealWorker,
  onChange: render,
});

function formatError(error) {
  if (!error) return '';
  const key = `error${error.code}`;
  const text = S[key];
  let message = typeof text === 'function' ? text(error.row) : text || error.code;
  const fieldName =
    error.field === 'records'
      ? S.fieldRecords
      : error.field === 'threshold'
        ? S.fieldThreshold
        : null;
  if (fieldName) {
    message += lang === 'en' ? ` (Field: ${fieldName})` : `（欄位：${fieldName}）`;
  }
  return message;
}

function issueText(issue) {
  if (issue.code === 'SEQ_GAP') return S.issueSEQ_GAP(issue);
  return S[`issue${issue.code}`] || issue.code;
}

function pageCount() {
  if (!controller.result) return 1;
  return Math.max(1, Math.ceil(controller.result.findings.length / PAGE_SIZE));
}

function renderFindings() {
  const result = controller.result;
  if (!result) {
    findingsSection.hidden = true;
    return;
  }
  findingsSection.hidden = false;
  findingsSummary.textContent = S.statusSuccess(result.rowCount, result.findings.length);
  findingsBody.replaceChildren();
  const pages = pageCount();
  if (currentPage > pages) currentPage = pages;
  if (currentPage < 1) currentPage = 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = result.findings.slice(start, start + PAGE_SIZE);
  for (const finding of page) {
    const tr = document.createElement('tr');
    const cells = [
      String(finding.line),
      String(finding.prevLine),
      finding.sequenceDelta,
      finding.timeDelta,
    ];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }
    const issuesTd = document.createElement('td');
    for (const issue of finding.issues) {
      const div = document.createElement('div');
      div.textContent = issueText(issue);
      issuesTd.appendChild(div);
    }
    tr.appendChild(issuesTd);
    findingsBody.appendChild(tr);
  }
  const showPagination = result.findings.length > PAGE_SIZE;
  paginationEl.hidden = !showPagination;
  if (showPagination) {
    pageInfoEl.textContent = S.pageInfo(currentPage, pages);
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= pages;
  }
}

function render() {
  const state = controller.state;
  revokeDownloadIfInvalid();

  // Sync draft values into the fields (no-op while typing: values are equal).
  if (recordsEl.value !== controller.draft.records) {
    recordsEl.value = controller.draft.records;
  }
  if (thresholdEl.value !== controller.draft.threshold) {
    thresholdEl.value = controller.draft.threshold;
  }

  mainEl.setAttribute('aria-busy', state === 'busy' ? 'true' : 'false');
  findBtn.disabled = state === 'busy';
  cancelBtn.hidden = state !== 'busy';
  downloadBtn.hidden = state !== 'success';
  exampleNoteEl.hidden = !controller.exampleLoaded;
  if (controller.exampleLoaded) exampleNoteEl.textContent = S.exampleNote;
  if (state === 'error') {
    statusEl.dataset.tone = 'error';
  } else if (state === 'success') {
    statusEl.dataset.tone = 'ok';
  } else {
    delete statusEl.dataset.tone;
  }

  if (state === 'success' && controller.result) {
    statusEl.textContent = S.statusSuccess(
      controller.result.rowCount,
      controller.result.findings.length,
    );
  } else if (state === 'error' && controller.error) {
    statusEl.textContent = formatError(controller.error);
  } else if (state === 'busy') {
    statusEl.textContent = S.statusBusy;
  } else if (state === 'dirty') {
    statusEl.textContent = S.statusDirty;
  } else if (state === 'cancelled') {
    statusEl.textContent = S.statusCancelled;
  } else {
    statusEl.textContent = S.statusEmpty;
  }

  // Error box + field linkage. Focus moves only on a submit failure.
  const error = state === 'error' ? controller.error : null;
  if (error) {
    errorBox.hidden = false;
    errorBox.textContent = formatError(error);
    const target =
      error.field === 'records' ? recordsEl : error.field === 'threshold' ? thresholdEl : null;
    for (const field of [recordsEl, thresholdEl]) {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-errormessage');
    }
    if (target) {
      target.setAttribute('aria-invalid', 'true');
      target.setAttribute('aria-errormessage', 'errorBox');
      if (focusOnError) target.focus();
    }
  } else {
    errorBox.hidden = true;
    errorBox.textContent = '';
    for (const field of [recordsEl, thresholdEl]) {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-errormessage');
    }
  }
  focusOnError = false;

  renderFindings();
}

function revokeDownloadIfInvalid() {
  if (controller.state !== 'success') revokeDownload();
}

recordsEl.addEventListener('input', () => {
  controller.setDraft({ records: recordsEl.value });
});

thresholdEl.addEventListener('input', () => {
  controller.setDraft({ threshold: thresholdEl.value });
});

fileEl.addEventListener('change', () => {
  const file = fileEl.files && fileEl.files[0];
  fileEl.value = '';
  if (file) void controller.loadFile(file);
});

findBtn.addEventListener('click', () => {
  focusOnError = true;
  void controller.run();
});

exampleBtn.addEventListener('click', () => {
  controller.loadExample();
  recordsEl.focus();
});

resetBtn.addEventListener('click', () => {
  controller.reset();
  recordsEl.focus();
});

cancelBtn.addEventListener('click', () => {
  controller.cancel();
});

downloadBtn.addEventListener('click', () => {
  const payload = controller.downloadPayload();
  if (!payload) return;
  revokeDownload();
  const blob = new Blob([payload.text], { type: 'application/json;charset=utf-8' });
  downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = payload.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  downloadTimer = setTimeout(revokeDownload, 30000);
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderFindings();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < pageCount()) {
    currentPage += 1;
    renderFindings();
  }
});

window.addEventListener('pagehide', () => {
  controller.dispose();
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    controller.reset();
    render();
  }
});

render();
