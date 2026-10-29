import { messages } from './i18n.mjs';
import { createSession } from './session.mjs';
import { projectDraft } from './draft.mjs';
import { formatOffset } from './core/zone.mjs';
import { parseCivilDate, civilEpoch } from './core/date.mjs';

const lang = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const t = messages[lang];
const byId = id => document.getElementById(id);

function initialize() {
  const form = byId('event-form');
  const controls = byId('app-controls');
  const timedFields = byId('timed-fields');
  const allDayFields = byId('all-day-fields');
  const download = byId('download');
  const status = byId('status');
  const summary = byId('summary');
  const raw = byId('raw-ics');
  const previewButton = byId('preview');
  const errorSummary = byId('error-summary');
  const downloadSupported = 'download' in document.createElement('a') && typeof Blob === 'function' && typeof URL.createObjectURL === 'function' && typeof URL.revokeObjectURL === 'function';
  const session = createSession({
    randomUUID: () => globalThis.crypto.randomUUID(), now: () => Date.now(),
    createFileUrl: downloadSupported ? text => URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' })) : undefined,
    revokeFileUrl: url => URL.revokeObjectURL(url),
  });
  const mode = () => byId('mode-all-day').checked ? 'all-day' : 'timed';
  function target(field) { return byId(field === 'startDate' && mode() === 'all-day' ? 'allStartDate' : field) ?? form; }
  function errorNode(field) { return byId(`error-${field === 'startDate' && mode() === 'all-day' ? 'allStartDate' : field}`); }
  function setStatus(key) { const text = t[key]; if (status.textContent !== text) status.textContent = text; byId('result').dataset.state = key; }
  function clearDisplay() {
    download.removeAttribute('href'); download.removeAttribute('download'); download.setAttribute('aria-disabled', 'true'); download.tabIndex = -1;
    download.classList.remove('primary'); previewButton.classList.add('primary');
    summary.replaceChildren(); summary.hidden = true; raw.textContent = ''; byId('raw-details').hidden = true; byId('raw-details').open = false;
    byId('download-note').hidden = true;
  }
  function clearErrors() {
    for (const element of form.querySelectorAll('[aria-invalid]')) element.removeAttribute('aria-invalid');
    for (const element of form.querySelectorAll('.field-error')) element.textContent = '';
    errorSummary.replaceChildren(); errorSummary.hidden = true;
  }
  function clearChoices() {
    for (const side of ['start', 'end']) { byId(`${side}Choice`).hidden = true; byId(`${side}-options`).replaceChildren(); }
  }
  function syncMode() {
    const allDay = mode() === 'all-day';
    timedFields.hidden = allDay; timedFields.disabled = allDay;
    allDayFields.hidden = !allDay; allDayFields.disabled = !allDay;
  }
  function readDraft() {
    return projectDraft({ mode: mode(), title: byId('title').value, location: byId('location').value, notes: byId('notes').value,
      startDate: byId('startDate').value, startTime: byId('startTime').value, endDate: byId('endDate').value,
      endTime: byId('endTime').value, zone: byId('zone').value,
      allStartDate: byId('allStartDate').value, lastDate: byId('lastDate').value,
      startChoice: form.querySelector('input[name="startChoice"]:checked')?.value ?? '',
      endChoice: form.querySelector('input[name="endChoice"]:checked')?.value ?? '' });
  }
  function changed(event) {
    // Detach the link before revoking the old object URL and reading new input.
    clearDisplay(); session.invalidate(); clearErrors();
    if (!['startChoice', 'endChoice'].includes(event.target.name)) clearChoices();
    syncMode(); setStatus('changed');
  }
  function civilLabel(date) {
    try { return new Intl.DateTimeFormat(lang, { timeZone: 'UTC', dateStyle: 'long', calendar: 'gregory' }).format(civilEpoch(parseCivilDate(date))); }
    catch { return date; }
  }
  function utcLabel(epochMs) { return `${new Date(epochMs).toISOString().slice(0, 16).replace('T', ' ')} UTC`; }
  function addRow(label, value) {
    const row = document.createElement('div'); const term = document.createElement('dt'); const content = document.createElement('dd');
    term.textContent = label; content.textContent = value; row.append(term, content); summary.append(row);
  }
  function renderEvent(event) {
    summary.replaceChildren(); summary.hidden = false;
    addRow(t.title, event.title);
    if (event.mode === 'all-day') { addRow(t.allDay, `${civilLabel(event.startDate)} – ${civilLabel(event.lastDate)}`); addRow(t.includedDates, t.days(event.days)); }
    else {
      addRow(t.localStart, `${civilLabel(event.startDate)} ${event.startTime} (${formatOffset(event.start.offsetMinutes)})`);
      addRow(t.localEnd, `${civilLabel(event.endDate)} ${event.endTime} (${formatOffset(event.end.offsetMinutes)})`);
      addRow(t.zone, `${t.cities[event.zone]} · ${event.zone}`);
      addRow(t.utcStart, utcLabel(event.start.epochMs)); addRow(t.utcEnd, utcLabel(event.end.epochMs));
    }
    if (event.location) addRow(t.location, event.location);
    if (event.notes) addRow(t.notes, event.notes);
  }
  function renderAmbiguities(ambiguities, draft) {
    clearChoices();
    for (const side of ['start', 'end']) {
      const candidates = ambiguities[side]; if (!candidates) continue;
      const group = byId(`${side}Choice`); group.hidden = false;
      byId(`${side}-choice-legend`).textContent = t[`${side}Occurrence`];
      const options = byId(`${side}-options`);
      candidates.forEach((candidate, i) => {
        const value = i === 0 ? 'early' : 'late'; const label = document.createElement('label'); label.className = 'occurrence-option';
        const input = document.createElement('input'); input.type = 'radio'; input.name = `${side}Choice`; input.value = value; input.id = `${side}-${value}`;
        input.checked = draft[`${side}Choice`] === value;
        const text = document.createElement('span'); text.textContent = `${i === 0 ? t.first : t.second} · ${formatOffset(candidate.offsetMinutes)}`;
        label.append(input, text); options.append(label);
      });
    }
  }
  function renderErrors(errors) {
    errorSummary.hidden = false; const heading = document.createElement('h2'); heading.textContent = t.errorsTitle; heading.id = 'error-summary-title';
    const list = document.createElement('ul');
    for (const error of errors) {
      const message = t.errors[error.code] ?? t.errors.INVALID_EVENT;
      const control = target(error.field); const fieldError = errorNode(error.field);
      if (control !== form) control.setAttribute('aria-invalid', 'true');
      if (fieldError) fieldError.textContent = message;
      const item = document.createElement('li'); const link = document.createElement('a');
      link.href = `#${control.id}`; link.textContent = `${t.fields[error.field] ?? t.fields.form}: ${message}`;
      link.addEventListener('click', event => { event.preventDefault(); control.focus(); }); item.append(link); list.append(item);
    }
    errorSummary.append(heading, list); errorSummary.focus();
  }
  function reset() {
    clearDisplay(); session.reset(); form.reset(); clearErrors(); clearChoices(); syncMode(); form.removeAttribute('aria-busy'); setStatus('idle');
  }
  form.addEventListener('input', event => { if (event.target.type !== 'radio' && event.target.tagName !== 'SELECT') changed(event); });
  form.addEventListener('change', event => { if (event.target.type === 'radio' || event.target.tagName === 'SELECT') changed(event); });
  form.addEventListener('submit', event => {
    event.preventDefault(); form.setAttribute('aria-busy', 'true');
    try {
      clearErrors();
      const draft = readDraft(); const result = session.preview(draft);
      clearDisplay(); renderAmbiguities(result.ambiguities, draft);
      if (result.event) renderEvent(result.event);
      setStatus(result.status);
      if (!result.ok) { renderErrors(result.errors); return; }
      raw.textContent = result.ics; byId('raw-details').hidden = false;
      if (result.url) {
        download.href = result.url; download.download = 'glossquote-event.ics'; download.setAttribute('aria-disabled', 'false'); download.tabIndex = 0;
        download.classList.add('primary'); previewButton.classList.remove('primary');
      } else { byId('download-note').textContent = t.downloadUnavailable; byId('download-note').hidden = false; }
    } finally { form.removeAttribute('aria-busy'); }
  });
  download.addEventListener('click', event => { if (download.getAttribute('aria-disabled') === 'true') event.preventDefault(); });
  byId('clear').addEventListener('click', reset);
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });
  reset(); controls.disabled = false; byId('initialization').hidden = true;
}

try { initialize(); }
catch { const notice = byId('initialization'); if (notice) { notice.textContent = t.bootError; notice.hidden = false; } const controls = byId('app-controls'); if (controls) controls.disabled = true; }
