import { validateText, normalizeNewlines, measureText, MAX_SOURCE_LINES } from './core/text.mjs';
import { newSession, transition } from './core/session.mjs';
import { encodeOutput } from './core/export.mjs';
import { getMessages } from './i18n.mjs';

const CORE_ERRORS = new Set(['INPUT_TOO_LARGE', 'INVALID_UNICODE', 'INVALID_OPTIONS', 'UNSUPPORTED', 'WORKER_FAILED']);
const METRIC_KEYS = ['codePoints', 'lines', 'utf8Bytes'];
const PROVENANCE_KEYS = ['keptSourceLines', 'emptyRemovedSourceLines', 'duplicateRemovedSourceLines', 'duplicateFirstSourceLines', 'trimmedSourceLines'];
export const REMOVAL_PAGE_SIZE = 100;
const zero = () => ({ codePoints: 0, lines: 0, utf8Bytes: 0 });

function exactFields(value, names) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    const keys = Reflect.ownKeys(value);
    if (keys.length !== names.length || keys.some(key => !names.includes(key))) return null;
    const fields = Object.create(null);
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
      fields[name] = descriptor.value;
    }
    return fields;
  } catch { return null; }
}

function matchesMetrics(actual, expected) {
  const fields = exactFields(actual, METRIC_KEYS);
  return fields && METRIC_KEYS.every(key => Number.isSafeInteger(fields[key]) && fields[key] >= 0 && fields[key] === expected[key]);
}

function numericList(value, sourceCount, increasing) {
  if (!Array.isArray(value)) return null;
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > sourceCount || length > MAX_SOURCE_LINES) return null;
  if (Reflect.ownKeys(value).length !== length + 1) return null;
  const copy = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
    const number = descriptor.value;
    if (!Number.isSafeInteger(number) || number < 1 || number > sourceCount ||
        (increasing && index > 0 && number <= copy[index - 1])) return null;
    copy.push(number);
  }
  return copy;
}

function inspectProvenance(raw, sourceLines, outputText, options) {
  const fields = exactFields(raw, PROVENANCE_KEYS);
  const settings = exactFields(options, ['trimAscii', 'dropEmpty', 'deduplicate']);
  if (!fields || !settings || Object.values(settings).some(value => typeof value !== 'boolean')) return null;
  const count = sourceLines.length;
  if (count > MAX_SOURCE_LINES) return null;
  const provenance = {};
  for (const key of PROVENANCE_KEYS) {
    const list = numericList(fields[key], count, key !== 'duplicateFirstSourceLines');
    if (!list) return null;
    provenance[key] = list;
  }
  const { keptSourceLines: kept, emptyRemovedSourceLines: empty, duplicateRemovedSourceLines: duplicate,
    duplicateFirstSourceLines: first, trimmedSourceLines: trimmed } = provenance;
  if (kept.length + empty.length + duplicate.length !== count || duplicate.length !== first.length ||
      (!settings.trimAscii && trimmed.length) || (!settings.dropEmpty && empty.length) ||
      (!settings.deduplicate && (duplicate.length || first.length))) return null;

  let k = 0; let e = 0; let d = 0; let t = 0; let cursor = 0; let outputLines = 0;
  const seen = settings.deduplicate ? new Map() : null;
  for (let index = 0; index < count; index += 1) {
    const lineNumber = index + 1;
    const isKept = kept[k] === lineNumber;
    const isEmpty = empty[e] === lineNumber;
    const isDuplicate = duplicate[d] === lineNumber;
    if (Number(isKept) + Number(isEmpty) + Number(isDuplicate) !== 1) return null;
    const original = sourceLines[index];
    const processed = settings.trimAscii ? original.replace(/^[ \t]+|[ \t]+$/g, '') : original;
    const wasTrimmed = processed !== original;
    if ((trimmed[t] === lineNumber) !== wasTrimmed) return null;
    if (wasTrimmed) t += 1;
    if (settings.dropEmpty && processed.length === 0) {
      if (!isEmpty) return null;
    } else {
      const firstSource = seen?.get(processed);
      if (firstSource !== undefined) {
        if (!isDuplicate || first[d] !== firstSource || first[d] >= lineNumber) return null;
      } else {
        if (!isKept) return null;
        seen?.set(processed, lineNumber);
        if (outputLines > 0) {
          if (outputText[cursor] !== '\n') return null;
          cursor += 1;
        }
        if (!outputText.startsWith(processed, cursor)) return null;
        cursor += processed.length;
        outputLines += 1;
      }
    }
    if (isKept) k += 1;
    if (isEmpty) e += 1;
    if (isDuplicate) d += 1;
  }
  return cursor === outputText.length && t === trimmed.length ? provenance : null;
}

export function inspectReply(data, jobId, expectedBefore, sourceText, options) {
  const envelope = exactFields(data, ['type', 'jobId', 'result']);
  if (!envelope || envelope.type !== 'result' || envelope.jobId !== jobId) return null;
  const success = exactFields(envelope.result, ['ok', 'value']);
  if (success?.ok === true) {
    const value = exactFields(success.value, ['text', 'before', 'after', 'provenance']);
    if (!value || !validateText(value.text).ok || normalizeNewlines(value.text) !== value.text) return null;
    const after = measureText(value.text);
    if (!matchesMetrics(value.before, expectedBefore) || !matchesMetrics(value.after, after)) return null;
    if (!validateText(sourceText).ok) return null;
    const lfText = normalizeNewlines(sourceText);
    const lines = lfText === '' ? [] : lfText.split('\n');
    if (lines.length !== expectedBefore.lines) return null;
    const provenance = inspectProvenance(value.provenance, lines, value.text, options);
    if (!provenance) return null;
    return { ok: true, value: { text: value.text, before: expectedBefore, after, provenance } };
  }
  const failure = exactFields(envelope.result, ['ok', 'error']);
  const error = failure?.ok === false && exactFields(failure.error, ['code']);
  return error && CORE_ERRORS.has(error.code) ? { ok: false, error: { code: error.code } } : null;
}

// Binary partition finds a page in the two sorted removal lists without merging every row.
export function removalPage(provenance, page) {
  const empty = provenance.emptyRemovedSourceLines;
  const duplicate = provenance.duplicateRemovedSourceLines;
  const total = empty.length + duplicate.length;
  if (!Number.isSafeInteger(page) || page < 0 || page >= Math.ceil(total / REMOVAL_PAGE_SIZE)) return [];
  const offset = page * REMOVAL_PAGE_SIZE;
  let low = Math.max(0, offset - duplicate.length);
  let high = Math.min(offset, empty.length);
  let e = 0; let d = 0;
  while (low <= high) {
    e = Math.floor((low + high) / 2);
    d = offset - e;
    if (e > 0 && d < duplicate.length && empty[e - 1] > duplicate[d]) high = e - 1;
    else if (d > 0 && e < empty.length && duplicate[d - 1] > empty[e]) low = e + 1;
    else break;
  }
  const rows = [];
  while (rows.length < REMOVAL_PAGE_SIZE && (e < empty.length || d < duplicate.length)) {
    if (d >= duplicate.length || (e < empty.length && empty[e] < duplicate[d])) {
      rows.push({ sourceLine: empty[e++], reason: 'empty', firstSourceLine: null });
    } else {
      rows.push({ sourceLine: duplicate[d], reason: 'duplicate', firstSourceLine: provenance.duplicateFirstSourceLines[d] });
      d += 1;
    }
  }
  return rows;
}

function containsLine(lines, number) {
  let low = 0; let high = lines.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle] === number) return true;
    if (lines[middle] < number) low = middle + 1; else high = middle - 1;
  }
  return false;
}

// Explicit dependencies let a loopback-only test harness exercise late replies and timeouts.
export function mountWorkbench({
  doc = document,
  createWorker = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }),
  now = () => globalThis.performance.now(),
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  unschedule = handle => globalThis.clearTimeout(handle),
  writeClipboard = text => globalThis.navigator.clipboard.writeText(text),
  createObjectURL = blob => globalThis.URL.createObjectURL(blob),
  revokeObjectURL = url => globalThis.URL.revokeObjectURL(url),
  capabilities = {
    worker: typeof globalThis.Worker === 'function',
    encoder: typeof globalThis.TextEncoder === 'function',
    blob: typeof globalThis.Blob === 'function',
  },
} = {}) {
  const MESSAGES = getMessages(doc.documentElement.lang);
  const get = id => {
    const element = doc.getElementById(id);
    if (!element) throw new Error('Missing workbench element.');
    return element;
  };
  const source = get('source-text');
  const output = get('output-text');
  const options = [get('trim-ascii'), get('drop-empty'), get('deduplicate')];
  const processButton = get('process-button');
  const cancelButton = get('cancel-button');
  const clearButton = get('clear-button');
  const copyButton = get('copy-button');
  const downloadButton = get('download-button');
  const status = get('work-status');
  const sourceError = get('source-error');
  const availability = get('availability');
  const reviewPanel = get('review-panel');
  const reviewCount = get('review-count');
  const noRemoval = get('review-none');
  const emptyResultNote = get('review-empty-note');
  const reviewDetails = get('removal-details');
  const reviewDetailsSummary = get('removal-details-summary');
  const reviewList = get('removal-list');
  const reviewPosition = get('review-page');
  const reviewFirst = get('review-first');
  const reviewPrevious = get('review-previous');
  const reviewNext = get('review-next');
  const reviewLast = get('review-last');
  const metrics = Object.fromEntries(['before', 'after'].map(prefix => [prefix, [get(`${prefix}-codepoints`), get(`${prefix}-lines`), get(`${prefix}-bytes`)]]));
  const supported = capabilities.worker && capabilities.encoder && capabilities.blob;
  let session = newSession();
  let worker = null;
  let watchdog = null;
  let before = zero();
  let after = zero();
  let outputText = '';
  let notice = supported ? 'idle' : 'UNSUPPORTED';
  let inputError = '';
  let downloadUrl = null;
  let downloadTimer = null;
  let copyTicket = 0;
  let reviewData = null;
  let reviewSourceLines = [];
  let reviewPageIndex = 0;
  let reviewNeedsRender = true;
  const subscriptions = [];

  function listen(target, type, listener) {
    target.addEventListener(type, listener);
    subscriptions.push(() => target.removeEventListener(type, listener));
  }
  function disposeJob() {
    if (watchdog !== null) { unschedule(watchdog); watchdog = null; }
    if (worker) {
      const oldWorker = worker;
      worker = null;
      oldWorker.onmessage = null;
      oldWorker.onerror = null;
      oldWorker.onmessageerror = null;
      try { oldWorker.terminate(); } catch { /* Work is already invalidated. */ }
    }
  }
  function disposeDownload() {
    if (downloadTimer !== null) { unschedule(downloadTimer); downloadTimer = null; }
    if (downloadUrl !== null) {
      const oldUrl = downloadUrl;
      downloadUrl = null;
      revokeObjectURL(oldUrl);
    }
  }
  function clearOutput() {
    copyTicket += 1; disposeDownload(); outputText = ''; after = zero();
    reviewData = null; reviewSourceLines = []; reviewPageIndex = 0;
    reviewDetails.open = false; reviewNeedsRender = true;
  }
  function hasResult() { return session.status === 'success' || session.status === 'empty'; }
  function formatReview(key, values = {}) {
    return MESSAGES[key].replace(/\{([a-zA-Z]+)\}/g, (placeholder, name) => String(values[name]));
  }
  function reviewSummaryText() {
    return reviewData ? formatReview('reviewSummary', {
      removed: reviewData.emptyRemovedSourceLines.length + reviewData.duplicateRemovedSourceLines.length,
      empty: reviewData.emptyRemovedSourceLines.length,
      duplicates: reviewData.duplicateRemovedSourceLines.length,
      trimmed: reviewData.trimmedSourceLines.length,
    }) : '';
  }
  function renderReview() {
    if (!reviewNeedsRender) return;
    reviewNeedsRender = false;
    const available = hasResult() && reviewData !== null;
    reviewPanel.hidden = !available;
    reviewList.replaceChildren();
    if (!available) {
      reviewCount.textContent = ''; reviewDetailsSummary.textContent = ''; reviewPosition.textContent = '';
      reviewDetails.hidden = true; noRemoval.hidden = true; emptyResultNote.hidden = true;
      for (const button of [reviewFirst, reviewPrevious, reviewNext, reviewLast]) button.disabled = true;
      return;
    }
    const total = reviewData.emptyRemovedSourceLines.length + reviewData.duplicateRemovedSourceLines.length;
    const pages = Math.ceil(total / REMOVAL_PAGE_SIZE);
    reviewCount.textContent = reviewSummaryText();
    noRemoval.hidden = total !== 0;
    emptyResultNote.hidden = outputText !== '' || reviewData.keptSourceLines.length === 0;
    reviewDetails.hidden = total === 0;
    reviewDetailsSummary.textContent = total ? formatReview('reviewDetails', { removed: total }) : '';
    reviewPosition.textContent = total ? formatReview('reviewPage', { page: reviewPageIndex + 1, pages }) : '';
    reviewFirst.disabled = reviewPrevious.disabled = !total || reviewPageIndex === 0;
    reviewNext.disabled = reviewLast.disabled = !total || reviewPageIndex === pages - 1;
    for (const row of removalPage(reviewData, reviewPageIndex)) {
      const item = doc.createElement('li');
      item.className = 'removal-row';
      const heading = doc.createElement('h4');
      heading.textContent = formatReview('reviewSourceLine', { line: row.sourceLine });
      const original = reviewSourceLines[row.sourceLine - 1];
      const content = doc.createElement('pre');
      content.className = 'removal-source';
      content.textContent = original;
      content.setAttribute('aria-label', formatReview('reviewOriginalLine', { line: row.sourceLine }));
      content.tabIndex = 0;
      const reason = doc.createElement('p');
      reason.className = 'removal-reason';
      reason.textContent = row.reason === 'empty' ? MESSAGES.reviewEmptyReason : formatReview('reviewDuplicateReason', { line: row.firstSourceLine });
      item.append(heading, content, reason);
      const addNote = text => {
        const note = doc.createElement('p'); note.className = 'removal-note'; note.textContent = text; item.append(note);
      };
      if (original.length === 0) addNote(MESSAGES.reviewEmptyContent);
      else if (/^[ \t]+$/.test(original)) addNote(MESSAGES.reviewWhitespaceContent);
      if (row.reason === 'duplicate' && (containsLine(reviewData.trimmedSourceLines, row.sourceLine) ||
          containsLine(reviewData.trimmedSourceLines, row.firstSourceLine))) addNote(MESSAGES.reviewTrimComparison);
      reviewList.append(item);
    }
  }
  function changeReviewPage(next) {
    if (!hasResult() || !reviewData) return;
    const pages = Math.ceil((reviewData.emptyRemovedSourceLines.length + reviewData.duplicateRemovedSourceLines.length) / REMOVAL_PAGE_SIZE);
    if (!Number.isSafeInteger(next) || next < 0 || next >= pages || next === reviewPageIndex) return;
    reviewPageIndex = next; reviewNeedsRender = true; renderReview();
  }
  function refreshBefore() {
    const validation = validateText(source.value);
    inputError = validation.ok ? '' : validation.error.code;
    before = validation.ok ? measureText(normalizeNewlines(source.value)) : null;
  }
  function render() {
    const running = session.status === 'running';
    output.value = outputText;
    processButton.disabled = !supported || running;
    cancelButton.hidden = !running;
    cancelButton.disabled = !running;
    clearButton.disabled = false;
    copyButton.disabled = !hasResult();
    downloadButton.disabled = !hasResult() || outputText === '';
    source.setAttribute('aria-invalid', String(Boolean(inputError)));
    sourceError.hidden = !inputError;
    sourceError.textContent = inputError ? MESSAGES[inputError] : '';
    availability.hidden = Boolean(supported);
    if (!supported) availability.textContent = MESSAGES.UNSUPPORTED;
    const nextStatus = (MESSAGES[notice] ?? MESSAGES.WORKER_FAILED) +
      ((notice === 'success' || notice === 'empty') && reviewData ? ` ${reviewSummaryText()}` : '');
    if (status.textContent !== nextStatus) status.textContent = nextStatus;
    for (const [prefix, value] of [['before', before], ['after', after]]) {
      metrics[prefix].forEach((element, index) => { element.textContent = value === null ? '—' : String(value[METRIC_KEYS[index]]); });
    }
    source.setAttribute('aria-busy', String(running));
    renderReview();
  }
  function changed() {
    session = transition(session, { type: 'change' });
    disposeJob();
    clearOutput();
    refreshBefore();
    notice = supported ? 'dirty' : 'UNSUPPORTED';
    render();
  }
  function fail(jobId, code) {
    if (session.status !== 'running' || session.jobId !== jobId) return;
    session = transition(session, { type: 'fail', jobId, code });
    disposeJob();
    clearOutput();
    if (code === 'INPUT_TOO_LARGE' || code === 'INVALID_UNICODE') inputError = code;
    notice = code;
    render();
  }
  function start() {
    if (!supported || session.status === 'running') return;
    session = transition(session, { type: 'start' });
    if (session.status !== 'running') return;
    const jobId = session.jobId;
    clearOutput();
    refreshBefore();
    notice = 'running';
    render();
    if (inputError) { fail(jobId, inputError); return; }
    const expectedBefore = before;
    const request = {
      type: 'clean', jobId, text: source.value,
      options: { trimAscii: options[0].checked, dropEmpty: options[1].checked, deduplicate: options[2].checked },
    };
    try {
      const startedAt = now();
      if (!Number.isFinite(startedAt)) { fail(jobId, 'WORKER_FAILED'); return; }
      worker = createWorker();
      watchdog = schedule(() => fail(jobId, 'TIMEOUT'), 5000);
      worker.onmessage = event => {
        if (session.status !== 'running' || session.jobId !== jobId) return;
        let data;
        let incomingId;
        let elapsed;
        try {
          data = event.data;
          incomingId = data && Object.getOwnPropertyDescriptor(data, 'jobId')?.value;
          elapsed = now() - startedAt;
        } catch { fail(jobId, 'WORKER_FAILED'); return; }
        if (Number.isSafeInteger(incomingId) && incomingId > 0 && incomingId !== jobId) return;
        if (!Number.isFinite(elapsed) || elapsed < 0) { fail(jobId, 'WORKER_FAILED'); return; }
        if (elapsed >= 5000) { fail(jobId, 'TIMEOUT'); return; }
        let reply;
        try { reply = inspectReply(data, jobId, expectedBefore, request.text, request.options); } catch { reply = null; }
        if (!reply) { fail(jobId, 'WORKER_FAILED'); return; }
        if (!reply.ok) { fail(jobId, reply.error.code); return; }
        const validatedElapsed = now() - startedAt;
        if (!Number.isFinite(validatedElapsed) || validatedElapsed < 0) { fail(jobId, 'WORKER_FAILED'); return; }
        if (validatedElapsed >= 5000) { fail(jobId, 'TIMEOUT'); return; }
        session = transition(session, { type: 'finish', jobId, outcome: reply.value.text === '' ? 'empty' : 'success' });
        disposeJob();
        outputText = reply.value.text;
        before = reply.value.before;
        after = reply.value.after;
        reviewData = reply.value.provenance;
        const lfSource = normalizeNewlines(request.text);
        reviewSourceLines = lfSource === '' ? [] : lfSource.split('\n');
        reviewPageIndex = 0; reviewDetails.open = false; reviewNeedsRender = true;
        notice = session.status;
        render();
      };
      worker.onerror = event => { event.preventDefault?.(); fail(jobId, 'WORKER_FAILED'); };
      worker.onmessageerror = () => fail(jobId, 'WORKER_FAILED');
      worker.postMessage(request);
    } catch { fail(jobId, 'WORKER_FAILED'); }
  }
  function cancel() {
    if (session.status !== 'running') return;
    session = transition(session, { type: 'cancel' });
    disposeJob();
    clearOutput();
    notice = 'cancelled';
    render();
  }
  function clear(focus = true) {
    session = transition(session, { type: 'clear' });
    disposeJob();
    clearOutput();
    source.value = '';
    before = zero();
    inputError = '';
    for (const option of options) option.checked = false;
    notice = supported ? 'idle' : 'UNSUPPORTED';
    render();
    if (focus) source.focus();
  }
  async function copy() {
    if (!hasResult()) return;
    const jobId = session.jobId;
    const ticket = ++copyTicket;
    let message;
    try { await writeClipboard(outputText); message = 'copied'; }
    catch { message = 'CLIPBOARD_FAILED'; }
    if (hasResult() && session.jobId === jobId && ticket === copyTicket) {
      notice = message;
      render();
    }
  }
  function download() {
    if (!hasResult() || outputText === '') return;
    copyTicket += 1;
    disposeDownload();
    const encoded = encodeOutput(outputText);
    if (!encoded.ok) { notice = encoded.error.code; render(); return; }
    let anchor;
    try {
      downloadUrl = createObjectURL(new Blob([encoded.value], { type: 'text/plain;charset=utf-8' }));
      anchor = doc.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'cleaned-text.txt';
      anchor.hidden = true;
      doc.body.append(anchor);
      anchor.click();
      downloadTimer = schedule(disposeDownload, 1000);
      notice = 'downloaded';
    } catch { disposeDownload(); notice = 'DOWNLOAD_FAILED'; }
    finally { anchor?.remove(); }
    render();
  }
  listen(source, 'input', changed);
  for (const option of options) listen(option, 'change', changed);
  listen(processButton, 'click', start);
  listen(cancelButton, 'click', cancel);
  listen(clearButton, 'click', () => clear());
  listen(copyButton, 'click', copy);
  listen(downloadButton, 'click', download);
  listen(reviewFirst, 'click', () => changeReviewPage(0));
  listen(reviewPrevious, 'click', () => changeReviewPage(reviewPageIndex - 1));
  listen(reviewNext, 'click', () => changeReviewPage(reviewPageIndex + 1));
  listen(reviewLast, 'click', () => {
    if (reviewData) changeReviewPage(Math.ceil((reviewData.emptyRemovedSourceLines.length + reviewData.duplicateRemovedSourceLines.length) / REMOVAL_PAGE_SIZE) - 1);
  });
  listen(doc.defaultView, 'pagehide', () => clear(false));
  render();
  return { destroy() { clear(false); for (const unsubscribe of subscriptions) unsubscribe(); } };
}

if (typeof document !== 'undefined' && document.body?.dataset.workbench === 'true') {
  mountWorkbench();
}
