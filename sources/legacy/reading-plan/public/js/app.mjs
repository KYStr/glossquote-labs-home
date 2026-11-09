import { createReadingPlan } from './core/reading-plan.mjs';
import { parseISODate } from './core/civil-date.mjs';
import { serializePlanReport, WEEKDAYS } from './core/report.mjs';
import { MESSAGES, errorMessage } from './i18n.mjs';

// DOM and browser services are explicit so offline tests exercise these same
// handlers, including async callbacks, without claiming native API evidence.
export function mountReadingPlan(doc, win) {
  const locale = doc.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const m = MESSAGES[locale];
  const byId = (id) => doc.getElementById(id);
  const form = byId('reading-form');
  const fields = ['titleRaw', 'totalPagesRaw', 'completedPagesRaw', 'startDateRaw', 'endDateRaw', 'dailyCapRaw'];
  const boxes = [...doc.querySelectorAll('[name="weekday"]')];
  const result = byId('result');
  const summary = byId('summary');
  const rows = byId('schedule');
  const report = byId('report');
  const exports = byId('exports');
  const status = byId('status');
  const copyButton = byId('copy');
  const copyStatus = byId('copy-status');
  const dialog = byId('clear-dialog');
  let revision = 0;
  let requestId = 0;
  let pageGeneration = 0;
  let busy = false;
  let current = null;
  let attempted = false;
  let textDates = false;
  const urls = new Map();

  function say(text) { status.textContent = text; }
  function clearErrors() {
    byId('errors').replaceChildren();
    byId('errors').hidden = true;
    for (const field of [...fields, 'weekdays']) {
      byId(`${field}-error`).textContent = '';
      byId(field).removeAttribute('aria-invalid');
    }
  }
  function expireResult() {
    revision += 1; requestId += 1; busy = false; current = null;
    result.hidden = true;
    byId('result-title').textContent = '';
    byId('book-name').textContent = '';
    byId('result-note').textContent = '';
    summary.replaceChildren(); rows.replaceChildren(); rows.hidden = true;
    report.value = ''; exports.hidden = true;
    copyButton.disabled = true; copyButton.textContent = m.copy;
    copyButton.removeAttribute('aria-busy'); byId('download').disabled = true;
    copyStatus.textContent = ''; byId('download-status').textContent = '';
  }
  function onEdit() {
    expireResult(); clearErrors();
    byId('date-mode-error').textContent = '';
    say(attempted ? m.changed : m.initial);
    byId('create').textContent = attempted ? m.recalculate : m.create;
  }
  function readInput() {
    return { titleRaw: byId('titleRaw').value, totalPagesRaw: byId('totalPagesRaw').value,
      completedPagesRaw: byId('completedPagesRaw').value, startDateRaw: byId('startDateRaw').value,
      endDateRaw: byId('endDateRaw').value, weekdays: boxes.filter((b) => b.checked).map((b) => Number(b.value)),
      dailyCapRaw: byId('dailyCapRaw').value };
  }
  function node(tag, text, className) {
    const el = doc.createElement(tag); el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function addSummary(label, value) {
    const group = doc.createElement('div');
    group.append(node('dt', label), node('dd', String(value)));
    summary.append(group);
  }
  function render(value) {
    result.hidden = false;
    const s = value.summary;
    if (value.kind === 'infeasible') {
      result.dataset.kind = 'infeasible';
      byId('result-title').textContent = m.infeasible;
      byId('result-note').textContent = m.adjust;
      for (const [label, count] of [[m.remaining, s.remainingPages], [m.available, s.eligibleDayCount], [m.cap, s.dailyCap], [m.capacity, s.capacityPages], [m.shortfall, s.shortfallPages], [m.minDays, s.minimumReadingDays]]) addSummary(label, count);
      say(m.infeasible); return;
    }
    current = value;
    result.dataset.kind = 'plan';
    const zero = value.status === 'no-remaining-pages';
    byId('result-title').textContent = zero ? m.zero : m.scheduled;
    byId('book-name').textContent = value.title || m.unnamed;
    byId('result-note').textContent = zero ? m.noSchedule : m.planOnly;
    addSummary(m.remaining, s.remainingPages); addSummary(m.available, s.eligibleDayCount);
    if (!zero) {
      addSummary(m.minimum, s.minimumPagesPerReadingDay); addSummary(m.last, s.lastReadingDate);
      addSummary(m.readingDays, s.readingDays); addSummary(m.flexibleDays, s.flexibleDays);
      rows.hidden = false;
      for (const row of value.schedule) {
        const li = doc.createElement('li'); li.className = `schedule-row ${row.kind}`;
        const date = doc.createElement('div');
        date.append(node('time', row.date), node('span', WEEKDAYS[locale][row.isoWeekday - 1], 'weekday'));
        const pages = doc.createElement('div');
        pages.append(node('strong', row.kind === 'flex' ? m.flex : m.pages(row.pageStart, row.pageEnd)));
        if (row.kind === 'reading') pages.append(node('span', m.count(row.pagesPerDay), 'page-count'));
        li.append(date, pages); rows.append(li);
      }
    }
    report.value = serializePlanReport(value, locale);
    exports.hidden = false; copyButton.disabled = false; byId('download').disabled = false;
    say(zero ? m.zero : m.scheduled);
  }
  function submit(event) {
    event.preventDefault();
    expireResult(); clearErrors(); attempted = true;
    byId('create').textContent = m.recalculate;
    const value = createReadingPlan(readInput());
    if (value.kind === 'invalid') {
      const list = byId('errors'); list.hidden = false;
      list.append(node('p', m.invalid));
      const ul = doc.createElement('ul'); list.append(ul);
      for (const e of value.errors) {
        const message = errorMessage(e.code, locale);
        ul.append(node('li', message));
        if (e.field !== 'root') {
          byId(`${e.field}-error`).textContent = message;
          byId(e.field).setAttribute('aria-invalid', 'true');
        }
      }
      const first = value.errors[0].field;
      if (first !== 'root') (first === 'weekdays' ? boxes[0] : byId(first)).focus();
      say(m.invalid);
    } else render(value);
  }
  const matches = (token) => token.revision === revision && token.requestId === requestId && token.pageGeneration === pageGeneration && current?.kind === 'plan';
  async function copy() {
    if (!current || busy) return;
    const token = { revision, requestId: ++requestId, pageGeneration };
    const text = report.value;
    busy = true; copyButton.disabled = true; copyButton.textContent = m.copying;
    copyButton.setAttribute('aria-busy', 'true'); copyStatus.textContent = '';
    try {
      if (typeof win.navigator?.clipboard?.writeText !== 'function') throw new Error('COPY_UNAVAILABLE');
      await win.navigator.clipboard.writeText(text);
      if (matches(token)) copyStatus.textContent = m.copied;
    } catch {
      if (matches(token)) { copyStatus.textContent = m.copyDenied; report.focus(); report.select(); }
    } finally {
      if (matches(token)) { busy = false; copyButton.disabled = false; copyButton.textContent = m.copy; copyButton.removeAttribute('aria-busy'); }
    }
  }
  function release(url) {
    const timer = urls.get(url);
    if (timer === undefined) return;
    win.clearTimeout(timer); urls.delete(url); win.URL.revokeObjectURL(url);
  }
  function download() {
    if (!current) return;
    let url;
    let anchor;
    try {
      const blob = new win.Blob([report.value], { type: 'text/plain;charset=utf-8' });
      url = win.URL.createObjectURL(blob);
      const timer = win.setTimeout(() => release(url), 10000);
      urls.set(url, timer);
      anchor = doc.createElement('a'); anchor.href = url; anchor.download = 'glossquote-reading-plan.txt';
      anchor.hidden = true; doc.body.append(anchor); anchor.click();
      byId('download-status').textContent = m.downloaded;
    } catch {
      if (url) release(url);
      byId('download-status').textContent = m.downloadFailed;
    } finally { anchor?.remove(); }
  }
  function toggleDates() {
    const dates = [byId('startDateRaw'), byId('endDateRaw')];
    if (textDates && dates.some((el) => el.value !== '' && !parseISODate(el.value).ok)) {
      byId('date-mode-error').textContent = m.dateModeError; return;
    }
    textDates = !textDates;
    for (const el of dates) {
      const raw = el.value; el.type = textDates ? 'text' : 'date'; el.value = raw;
      el.setAttribute('inputmode', textDates ? 'text' : 'numeric');
    }
    byId('date-mode').textContent = textDates ? m.nativeDates : m.textDates;
    byId('date-mode').setAttribute('aria-pressed', String(textDates));
    byId('date-help').textContent = textDates ? m.dateTextHelp : m.dateNativeHelp;
    byId('date-mode-error').textContent = '';
  }
  function isDirty() {
    return fields.some((field) => byId(field).value !== (field === 'completedPagesRaw' ? '0' : '')) || boxes.some((box, i) => box.checked !== (i < 5));
  }
  function reset(message = m.initial) {
    expireResult(); clearErrors(); attempted = false;
    for (const field of fields) byId(field).value = field === 'completedPagesRaw' ? '0' : '';
    boxes.forEach((box, i) => { box.checked = i < 5; });
    textDates = false;
    for (const id of ['startDateRaw', 'endDateRaw']) { byId(id).type = 'date'; byId(id).setAttribute('inputmode', 'numeric'); }
    byId('date-mode').textContent = m.textDates; byId('date-mode').setAttribute('aria-pressed', 'false');
    byId('date-help').textContent = m.dateNativeHelp; byId('date-mode-error').textContent = '';
    byId('create').textContent = m.create;
    if (dialog.open) dialog.close();
    say(message);
  }
  function clearRequest() {
    if (!isDirty()) { reset(m.cleared); return; }
    dialog.showModal(); byId('keep-data').focus();
  }
  function keepData() { dialog.close(); byId('clear').focus(); }
  function pagehide() {
    pageGeneration += 1; reset();
    for (const url of [...urls.keys()]) release(url);
  }
  function pageshow(event) { if (event.persisted) { pageGeneration += 1; reset(); } }
  form.addEventListener('input', onEdit);
  form.addEventListener('change', (event) => { if (event.target.name === 'weekday') onEdit(); });
  form.addEventListener('submit', submit);
  byId('date-mode').addEventListener('click', toggleDates);
  byId('clear').addEventListener('click', clearRequest);
  byId('keep-data').addEventListener('click', keepData);
  byId('confirm-clear').addEventListener('click', () => { reset(m.cleared); byId('clear').focus(); });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); keepData(); });
  copyButton.addEventListener('click', copy);
  byId('download').addEventListener('click', download);
  win.addEventListener('pagehide', pagehide);
  win.addEventListener('pageshow', pageshow);
  // Reset browser-restored form values as well as initial markup defaults.
  reset();
  // Markup stays disabled if loading or any initialization step fails.
  // Install the submit preventDefault handler before making controls usable.
  byId('input-controls').disabled = false;
  byId('create').disabled = false;
  form.dataset.ready = 'true';
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') mountReadingPlan(document, window);
