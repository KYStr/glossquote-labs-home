import { calculateRoster } from './core/roster.js';
import { createRosterState } from './core/ui-state.js';
import { buildReport } from './core/report.js';

const allDays = [1, 2, 3, 4, 5, 6, 7];
const language = document.documentElement.lang === 'en' ? 'en' : 'zh-TW';
const english = language === 'en';
const t = english ? {
  copying: 'Copying report…', copied: 'Report copied.', copyFailed: 'Clipboard access failed. Your roster is still on the page; select the report text below or download it.',
  downloadLimit: 'Several downloads are already starting. Wait briefly and try again.', downloadStarted: 'Report handed to your browser for download. Your browser manages the file.', unsupported: 'This browser cannot complete this action. The result remains on the page and the report text can be selected manually.',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], member: n => `Member ${n}`,
  availability: 'Available weekdays', unavailable: 'This member is currently unavailable on every weekday.',
  all: 'Select all', none: 'Clear weekdays', up: 'Move up', down: 'Move down', remove: 'Remove',
  count: n => `${n} / 30 members`, emptyPeople: 'No members. Add a member to generate a roster.',
  changed: 'Inputs changed. Generate the roster again.', empty: 'No roster yet. Enter dates and members, then choose “Generate roster.”',
  running: 'Calculating duty days…', complete: n => `All ${n} duty days are assigned. This result follows member order and weekday availability.`,
  partial: n => `Partially assigned: ${n} duty days have no available member. Review every “Unassigned” date below.`,
  nobody: 'No member is available on these duty days. Every date remains unassigned; edit weekday availability and generate the roster again.',
  unassigned: 'Unassigned', totals: r => `Duty days: ${r.totalDays} · Assigned: ${r.assignedCount} · Unassigned: ${r.unassignedCount}`,
  clearTitle: 'Confirm clearing', clearMessage: 'Clear all inputs and results? This page keeps no saved copy. Cancel to keep the current content. Files already handed to your browser are not deleted.',
  clearAccept: 'Clear all', exampleTitle: 'Load example?', exampleMessage: 'The example replaces all current inputs and results with fictional A/B members for 2026-10-19 to 2026-10-23. Cancel to keep your content.', exampleAccept: 'Replace with example',
  errorIntro: 'Check the marked field.', dateFormat: 'Use the exact YYYY-MM-DD format, without surrounding spaces.', dateInvalid: 'This Gregorian date does not exist.', dateRange: 'Use a date between 1900-01-01 and 2099-12-31.',
  order: 'End date must be on or after the start date.', span: 'Choose a range of at most 366 days, including both endpoints.', weekdayEmpty: 'Select at least one duty weekday.',
  noDates: 'No selected duty weekday falls in this date range. Adjust the dates or selected weekdays.', peopleCount: 'Add between 1 and 30 members.',
  nameType: 'Enter a member name.', nameRaw: 'Use no more than 512 UTF-16 units before trimming.', nameControl: 'Names cannot contain control characters, tabs, or line breaks.', nameSurrogate: 'Use valid Unicode characters in the name.', nameEmpty: 'Enter a name with at least one non-space character.', nameLong: 'Use at most 80 Unicode characters after trimming.', schema: 'The input could not be validated. Reload the page and enter it again.',
} : {
  copying: '正在複製報告…', copied: '報告已複製。', copyFailed: '無法使用剪貼簿。輪值表仍在頁面；請選取下方報告文字，或下載檔案。',
  downloadLimit: '下載請求較多，請稍候再試。', downloadStarted: '報告已交給瀏覽器下載。檔案由瀏覽器管理。', unsupported: '此瀏覽器無法完成這項操作。結果仍留在頁面，可手動選取報告文字。',
  days: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'], member: n => `成員 ${n}`,
  availability: '可輪值星期', unavailable: '此人目前沒有任何可輪值日。',
  all: '全選', none: '全清', up: '上移', down: '下移', remove: '刪除',
  count: n => `${n} / 30 位成員`, emptyPeople: '目前沒有成員。請新增成員後產生輪值表。',
  changed: '輸入已變更，請重新產生輪值表。', empty: '尚未產生輪值表。輸入日期與成員後，選擇「產生輪值表」。',
  running: '正在計算輪值日…', complete: n => `已排完 ${n} 個輪值日。此結果只依名單順序與可用星期計算。`,
  partial: n => `部分排定：有 ${n} 個輪值日無可用成員。請檢查下方每個「未排」日期。`,
  nobody: '這些輪值日都沒有可用成員。每個日期仍列為未排；請編輯可用星期後重新計算。',
  unassigned: '未排', totals: r => `輪值日數：${r.totalDays} · 已排：${r.assignedCount} · 未排：${r.unassignedCount}`,
  clearTitle: '確認清除', clearMessage: '清除所有輸入和結果？此頁不會保留副本。取消會保留目前內容。已交給瀏覽器的檔案不會刪除。',
  clearAccept: '清除全部', exampleTitle: '載入範例？', exampleMessage: '範例將取代目前所有輸入與結果，使用虛構成員 A、B 及 2026-10-19 至 2026-10-23。取消會保留目前內容。', exampleAccept: '以範例取代',
  errorIntro: '請檢查標示的欄位。', dateFormat: '請使用精確的 YYYY-MM-DD 格式，前後不要加空白。', dateInvalid: '這個 Gregorian 日期不存在。', dateRange: '日期須介於 1900-01-01 與 2099-12-31。',
  order: '結束日期不能早於開始日期。', span: '起訖日都包含在內，日期範圍最多 366 日。', weekdayEmpty: '請至少勾選一個輪值星期。',
  noDates: '此日期範圍內沒有符合所選輪值星期的日期。請調整日期或輪值星期。', peopleCount: '請新增 1 至 30 位成員。',
  nameType: '請輸入成員姓名。', nameRaw: '去除空白前的姓名最多 512 個 UTF-16 單位。', nameControl: '姓名不能包含控制字、定位字元或換行。', nameSurrogate: '請使用有效的 Unicode 姓名字元。', nameEmpty: '請輸入至少一個非空白的姓名字元。', nameLong: '去除首尾空白後，姓名最多 80 個 Unicode 字元。', schema: '無法驗證輸入。請重新載入頁面後再輸入。',
};

const byId = id => document.getElementById(id);
const make = (tag, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
const state = createRosterState();
let ready = false;
let pendingConfirmation = null;

function makeDays(selected, prefix) {
  const group = make('div', '', 'weekdays');
  for (const day of allDays) {
    const label = make('label', '', 'weekday');
    const input = make('input'); input.type = 'checkbox'; input.value = String(day); input.id = `${prefix}-${day}`; input.checked = selected.includes(day); input.disabled = !ready;
    label.append(input, make('span', t.days[day - 1])); group.append(label);
  }
  return group;
}
const selectedDays = node => [...node.querySelectorAll('input[type="checkbox"]:checked')].map(input => Number(input.value));
function readPeople() {
  return [...byId('people').querySelectorAll('.member')].map(node => ({ id: node.dataset.id, nameRaw: node.querySelector('input[type="text"]').value, weekdays: selectedDays(node) }));
}
function updateAvailability(node) {
  const days = selectedDays(node);
  const summary = node.querySelector('.availability-summary');
  summary.textContent = days.length ? days.map(n => t.days[n - 1]).join(english ? ', ' : '、') : t.unavailable;
  summary.classList.toggle('unavailable', !days.length);
}
function renderPeople(people) {
  const container = byId('people'); container.replaceChildren();
  people.forEach((person, index) => {
    const row = make('div', '', 'member'); row.dataset.id = person.id;
    const field = make('div', '', 'field'); const label = make('label', t.member(index + 1)); label.htmlFor = `name-${person.id}`;
    const input = make('input'); input.type = 'text'; input.id = `name-${person.id}`; input.value = person.nameRaw; input.maxLength = 512; input.autocomplete = 'off'; input.disabled = !ready; input.setAttribute('aria-describedby', `error-${person.id}`);
    const error = make('p', '', 'field-error'); error.id = `error-${person.id}`; error.hidden = true; field.append(label, input, error);
    const availability = make('div'); const summaryText = make('span', '', 'availability-summary'); summaryText.id = `availability-${person.id}`;
    const details = make('details'); const summary = make('summary', t.availability); summary.setAttribute('aria-label', `${t.member(index + 1)}: ${t.availability}`);
    const fieldset = make('fieldset'); fieldset.setAttribute('aria-describedby', summaryText.id);
    fieldset.append(make('legend', `${t.member(index + 1)}: ${t.availability}`), makeDays(person.weekdays, `weekday-${person.id}`));
    const weekError = make('p', '', 'field-error'); weekError.id = `week-error-${person.id}`; weekError.hidden = true; fieldset.append(weekError); fieldset.setAttribute('aria-describedby', `${summaryText.id} ${weekError.id}`);
    details.append(summary, fieldset); availability.append(summaryText, details);
    const actions = make('div', '', 'member-actions');
    for (const [action, text] of [['all', t.all], ['none', t.none], ['up', t.up], ['down', t.down], ['remove', t.remove]]) {
      const button = make('button', text); button.type = 'button'; button.dataset.action = action; button.setAttribute('aria-label', `${text} · ${t.member(index + 1)}`);
      button.disabled = !ready || (action === 'up' && index === 0) || (action === 'down' && index === people.length - 1); actions.append(button);
    }
    row.append(field, availability, actions); container.append(row); updateAvailability(row);
  });
  if (!people.length) container.append(make('p', t.emptyPeople, 'notice'));
  byId('member-count').textContent = t.count(people.length);
  byId('add-member').disabled = !ready || people.length >= 30;
}
function clearErrors() {
  for (const node of document.querySelectorAll('.field-error, #form-error')) { node.textContent = ''; node.hidden = true; }
  for (const node of document.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
}
function discardResult(message = t.changed) {
  byId('result-content').hidden = true; byId('roster-body').replaceChildren(); byId('member-totals').replaceChildren();
  byId('result-totals').textContent = ''; byId('report-text').value = ''; byId('report-details').open = false; byId('report-status').textContent = '';
  for (const id of ['copy-report', 'download-report', 'report-text']) byId(id).disabled = true;
  byId('result-status').className = ''; byId('result-status').textContent = message;
}
function edited() { state.edit(); discardResult(); clearErrors(); byId('example-note').hidden = true; }
function snapshot() { return { startRaw: byId('start-date').value, endRaw: byId('end-date').value, weekdays: selectedDays(byId('duty-days')), people: readPeople() }; }

function displayError(error) {
  const { code, path } = error;
  const dateIssue = code.match(/^(?:START|END)_DATE_(FORMAT|INVALID|RANGE)$/);
  const messages = { DATE_ORDER: t.order, DATE_SPAN_LIMIT: t.span, WEEKDAYS_EMPTY: t.weekdayEmpty, NO_DUTY_DATES: t.noDates, PEOPLE_COUNT: t.peopleCount, PERSON_NAME_TYPE: t.nameType, PERSON_NAME_RAW_LIMIT: t.nameRaw, PERSON_NAME_CONTROL: t.nameControl, PERSON_NAME_SURROGATE: t.nameSurrogate, PERSON_NAME_EMPTY: t.nameEmpty, PERSON_NAME_TOO_LONG: t.nameLong };
  const message = dateIssue ? { FORMAT: t.dateFormat, INVALID: t.dateInvalid, RANGE: t.dateRange }[dateIssue[1]] : messages[code] ?? t.schema;
  let control; let target;
  if (path === '/startRaw' || path === '/endRaw') { const side = path === '/startRaw' ? 'start' : 'end'; control = byId(`${side}-date`); target = byId(`${side}-error`); }
  else if (path.startsWith('/weekdays')) { control = byId('duty-days').querySelector('input'); target = byId('duty-error'); }
  else if (path.startsWith('/people/')) {
    const index = Number(path.split('/')[2]); const row = byId('people').querySelectorAll('.member')[index];
    if (row) {
      if (path.includes('/weekdays')) { row.querySelector('details').open = true; control = row.querySelector('input[type="checkbox"]'); target = row.querySelector('[id^="week-error-"]'); }
      else { control = row.querySelector('input[type="text"]'); target = row.querySelector('.field-error'); }
    }
  } else if (path === '/people') { control = byId('add-member'); target = byId('people-error'); }
  if (target) { target.textContent = message; target.hidden = false; }
  if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); }
  byId('form-error').textContent = `${t.errorIntro} ${message}`; byId('form-error').hidden = false;
  if (!control) byId('form-error').focus();
}
const memberLabel = row => english ? `${t.member(row.personNumber)}: ${row.personName}` : `${t.member(row.personNumber)}：${row.personName}`;
function displayResult(result) {
  const report = buildReport(result, language);
  if (!report.ok) { state.edit(); discardResult(t.empty); displayError({ code: 'SCHEMA', path: '/' }); return; }
  const partial = result.unassignedCount > 0;
  byId('result-status').textContent = !result.assignedCount ? `${t.partial(result.unassignedCount)} ${t.nobody}` : partial ? t.partial(result.unassignedCount) : t.complete(result.totalDays);
  byId('result-status').className = partial ? 'partial' : 'complete'; byId('result-totals').textContent = t.totals(result);
  for (const day of result.days) {
    const row = make('tr'); row.append(make('td', day.date), make('td', t.days[day.weekday - 1]), make('td', day.personNumber === null ? t.unassigned : memberLabel(day), day.personNumber === null ? 'unassigned' : '')); byId('roster-body').append(row);
  }
  for (const person of result.counts) { const row = make('li'); row.append(make('span', memberLabel(person)), make('strong', String(person.count))); byId('member-totals').append(row); }
  byId('result-content').hidden = false;
  byId('report-text').value = report.text;
  for (const id of ['copy-report', 'download-report', 'report-text']) byId(id).disabled = false;
}
function resetPage() {
  state.reset(); pendingConfirmation = null;
  byId('start-date').value = ''; byId('end-date').value = '';
  byId('duty-days').replaceChildren(...makeDays([1, 2, 3, 4, 5], 'duty').children);
  renderPeople([{ id: 'person-1', nameRaw: '', weekdays: allDays }]); clearErrors(); discardResult(t.empty); byId('example-note').hidden = true;
  if (byId('confirm-dialog').open) byId('confirm-dialog').close();
}
function confirm(type, trigger) {
  const example = type === 'example'; pendingConfirmation = { type, trigger };
  byId('confirm-title').textContent = example ? t.exampleTitle : t.clearTitle; byId('confirm-message').textContent = example ? t.exampleMessage : t.clearMessage;
  byId('confirm-accept').textContent = example ? t.exampleAccept : t.clearAccept; byId('confirm-dialog').showModal(); byId('confirm-cancel').focus();
}

function initialize() {
  if (typeof byId('confirm-dialog').showModal !== 'function') throw Error('Dialog unavailable');
  byId('roster-form').addEventListener('submit', event => {
    event.preventDefault();
    const request = snapshot(); const revision = state.snapshot().revision;
    discardResult(t.running); clearErrors();
    const result = calculateRoster(request);
    if (!result.ok) { state.edit(); discardResult(t.empty); displayError(result.error); return; }
    if (state.accept(result, revision)) displayResult(result);
  });
  byId('roster-form').addEventListener('input', event => { if (event.target.matches('input[type="text"]')) edited(); });
  byId('roster-form').addEventListener('change', event => { if (event.target.matches('input[type="checkbox"]')) { edited(); const row = event.target.closest('.member'); if (row) updateAvailability(row); } });
  byId('add-member').addEventListener('click', () => {
    const people = readPeople(); if (people.length >= 30) return;
    const used = new Set(people.map(person => person.id)); let n = 1; while (used.has(`person-${n}`)) n++;
    people.push({ id: `person-${n}`, nameRaw: '', weekdays: allDays }); edited(); renderPeople(people); byId(`name-person-${n}`).focus();
  });
  byId('people').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]'); if (!button || button.disabled) return;
    const row = button.closest('.member'); const people = readPeople(); const index = people.findIndex(p => p.id === row.dataset.id); const action = button.dataset.action;
    if (action === 'all' || action === 'none') { for (const input of row.querySelectorAll('input[type="checkbox"]')) input.checked = action === 'all'; edited(); updateAvailability(row); return; }
    if (action === 'remove') people.splice(index, 1);
    else { const next = action === 'up' ? index - 1 : index + 1; if (next < 0 || next >= people.length) return; [people[index], people[next]] = [people[next], people[index]]; }
    const id = row.dataset.id; edited(); renderPeople(people);
    const focusId = action === 'remove' ? people[Math.min(index, people.length - 1)]?.id : id;
    if (focusId) byId(`name-${focusId}`).focus(); else byId('add-member').focus();
  });
  for (const [id, type] of [['clear-all', 'clear'], ['load-example', 'example']]) byId(id).addEventListener('click', event => confirm(type, event.currentTarget));
  byId('confirm-cancel').addEventListener('click', () => byId('confirm-dialog').close());
  byId('confirm-accept').addEventListener('click', () => {
    const confirmation = pendingConfirmation; if (!confirmation) return;
    byId('confirm-dialog').close(); pendingConfirmation = null;
    if (confirmation.type === 'clear') resetPage();
    else {
      edited(); byId('start-date').value = '2026-10-19'; byId('end-date').value = '2026-10-23';
      byId('duty-days').replaceChildren(...makeDays([1, 2, 3, 4, 5], 'duty').children);
      renderPeople([{ id: 'person-1', nameRaw: 'A', weekdays: [1, 3, 5] }, { id: 'person-2', nameRaw: 'B', weekdays: [2, 4] }]); byId('example-note').hidden = false;
    }
    confirmation.trigger.focus();
  });
  byId('confirm-dialog').addEventListener('close', () => { if (pendingConfirmation) { const trigger = pendingConfirmation.trigger; pendingConfirmation = null; trigger.focus(); } });
  byId('copy-report').addEventListener('click', () => {
    const result = state.snapshot().result; if (!result) return;
    const report = buildReport(result, language); if (!report.ok) return;
    if (typeof navigator.clipboard?.writeText !== 'function') { byId('report-status').textContent = t.copyFailed; byId('report-details').open = true; return; }
    state.copy(text => navigator.clipboard.writeText(text), report.text, phase => {
      if (phase === 'copying') { byId('copy-report').disabled = true; byId('report-status').textContent = t.copying; }
      if (phase === 'copied') byId('report-status').textContent = t.copied;
      if (phase === 'failed') { byId('report-status').textContent = t.copyFailed; byId('report-details').open = true; }
      if (phase === 'settled') byId('copy-report').disabled = false;
    });
  });
  byId('download-report').addEventListener('click', () => {
    const result = state.snapshot().result; if (!result) return;
    const report = buildReport(result, language); if (!report.ok) return;
    const outcome = state.download(() => URL.createObjectURL(new Blob([report.text], { type: report.mimeType })), url => {
      const link = make('a'); link.href = url; link.download = report.filename; document.body.append(link);
      try { link.click(); } finally { link.remove(); }
    });
    byId('report-status').textContent = outcome.ok ? t.downloadStarted : outcome.code === 'DOWNLOAD_LIMIT' ? t.downloadLimit : t.unsupported;
    if (!outcome.ok) byId('report-details').open = true;
  });
  window.addEventListener('pagehide', resetPage);
  window.addEventListener('pageshow', event => { if (event.persisted) resetPage(); });
  resetPage();
  ready = true;
  for (const node of document.querySelectorAll('input, button')) node.disabled = false;
  renderPeople(readPeople());
  for (const id of ['copy-report', 'download-report', 'report-text']) byId(id).disabled = true;
  byId('boot-status').hidden = true;
}

try { initialize(); }
catch {
  ready = false;
  for (const node of document.querySelectorAll('input, button, textarea')) node.disabled = true;
  byId('boot-status').hidden = false;
}
