import { createInitialDraft, validateDraft } from './core/validation.js';
import { calculateSchedule, formatScheduleClock, formatTargetClock } from './core/schedule.js';
import { formatPlainTextReport, encodeUtf8Report } from './core/report.js';

const messages = {
  'zh-Hant': {
    activity: '活動', name: '活動名稱', duration: '分鐘', note: '備註（選填）', up: '上移', down: '下移', remove: '移除此活動',
    rowBoundary: '首列不能上移，末列不能下移；至少保留一段活動。',
    rowLimit: '最多 60 段；至少保留一段。', full: '已達 60 段上限。移除一段後可再新增。',
    built: '時間表已排出。編輯任何欄位會清除此結果。', composing: '請完成輸入法組字後再排出時間表。',
    copy: '複製報告', copying: '正在複製…', copied: '已複製文字報告。', fallback: '無法一鍵複製；請選取下方報告再複製。',
    downloadHelp: '每次按下載只建立一份報告。最多同時處理 8 份，60 秒後釋放下載資源。',
    downloadWait: '已有 8 份下載正在處理。請等最早一份的 60 秒期限到期，再下載。',
    downloadStarted: '已交給瀏覽器下載 TXT 報告。', downloadFailed: '無法啟動下載；請選取報告文字手動複製。',
    clearConfirm: '清除目前時間表？所有欄位和結果都會清空。',
    languageConfirm: '切換至英文？離開會清除目前時間表的所有欄位和結果。',
    moved: (position, count) => `活動已移至第 ${position} 段，共 ${count} 段。`,
    total: '總長', end: '結束', target: '目標', difference: '差異', min: n => `${n} 分鐘`,
    comparison: n => n === 0 ? '準時' : `${n > 0 ? '提早' : '超時'} ${Math.abs(n)} 分鐘`,
    errors: {
      INVALID_SCHEMA: '資料格式不正確。請清除全部後重新填寫。', UNKNOWN_FIELD: '資料包含不支援的欄位。請清除全部後重新填寫。',
      MISSING_FIELD: '必要欄位缺失。請清除全部後重新填寫。', INVALID_FIELD_TYPE: '欄位資料型別不正確。請清除全部後重新填寫。',
      ROW_COUNT: '請保留 1 到 60 段活動。', INVALID_ROW_ID: '活動識別資料不正確。請清除全部後重新填寫。', DUPLICATE_ROW_ID: '活動識別資料重複。請清除全部後重新填寫。',
      RAW_TEXT_TOO_LONG: '每個原始文字欄位最多 256 個 UTF-16 code units。請縮短內容。',
      CONTROL_CHARACTER: '請移除控制字元與換行，改用單行文字。', UNPAIRED_SURROGATE: '文字包含不完整的 Unicode 字元。請刪除後重新輸入。',
      TIME_FORMAT: '請輸入 ASCII 24 小時制 HH:MM，例如 09:00；不要加空白。',
      TARGET_NEXT_DAY_WITHOUT_TARGET: '請先輸入目標結束時間。', TARGET_NOT_AFTER_START: '同日目標必須晚於開始時間；若要排到次日，請勾選「目標在次日」。',
      NAME_REQUIRED: '請輸入這段活動的名稱。', NAME_TOO_LONG: '名稱修剪後最多 80 個 UTF-16 code units。',
      DURATION_FORMAT: '請輸入 ASCII 整數分鐘，例如 35。', DURATION_RANGE: '每段時長必須是 1 到 720 分鐘。',
      NOTE_TOO_LONG: '備註修剪後最多 160 個 UTF-16 code units。', TOTAL_DURATION_EXCEEDED: '全程最多 1440 分鐘；請縮短或移除活動。'
    }
  },
  en: {
    activity: 'Activity', name: 'Activity name', duration: 'Minutes', note: 'Note (optional)', up: 'Move up', down: 'Move down', remove: 'Remove activity',
    rowBoundary: 'The first activity cannot move up and the last cannot move down. Keep at least one activity.',
    rowLimit: 'Up to 60 activities; keep at least one.', full: 'The 60-activity limit is reached. Remove an activity to add another.',
    built: 'Timeline built. Editing any field clears this result.', composing: 'Finish composing the text before building the timeline.',
    copy: 'Copy report', copying: 'Copying…', copied: 'Report copied.', fallback: 'One-click copy is unavailable. Select the report below to copy it.',
    downloadHelp: 'Each click downloads one report. Up to 8 downloads can be active; their resources are released after 60 seconds.',
    downloadWait: '8 downloads are active. Wait until the oldest download reaches 60 seconds to download again.',
    downloadStarted: 'The TXT report was handed to your browser for download.', downloadFailed: 'The download could not start. Select the report text to copy it manually.',
    clearConfirm: 'Clear this timeline? All fields and results will be cleared.',
    languageConfirm: 'Switch to Traditional Chinese? Leaving clears all fields and results in this timeline.',
    moved: (position, count) => `Activity moved to position ${position} of ${count}.`,
    total: 'Total', end: 'End', target: 'Target', difference: 'Difference', min: n => `${n} min`,
    comparison: n => n === 0 ? 'On time' : `${Math.abs(n)} minutes ${n > 0 ? 'early' : 'late'}`,
    errors: {
      INVALID_SCHEMA: 'The data structure is invalid. Clear all and enter the timeline again.', UNKNOWN_FIELD: 'The data contains an unsupported field. Clear all and enter the timeline again.',
      MISSING_FIELD: 'A required field is missing. Clear all and enter the timeline again.', INVALID_FIELD_TYPE: 'A field has an invalid data type. Clear all and enter the timeline again.',
      ROW_COUNT: 'Keep between 1 and 60 activities.', INVALID_ROW_ID: 'The activity identifier is invalid. Clear all and enter the timeline again.', DUPLICATE_ROW_ID: 'An activity identifier is repeated. Clear all and enter the timeline again.',
      RAW_TEXT_TOO_LONG: 'Each raw text field can contain up to 256 UTF-16 code units. Shorten the text.',
      CONTROL_CHARACTER: 'Remove control characters and line breaks. Use single-line text.', UNPAIRED_SURROGATE: 'The text contains an incomplete Unicode character. Delete it and enter it again.',
      TIME_FORMAT: 'Enter an ASCII 24-hour HH:MM time, such as 09:00, without spaces.',
      TARGET_NEXT_DAY_WITHOUT_TARGET: 'Enter a target end time first.', TARGET_NOT_AFTER_START: 'A same-day target must be later than the start. Select “Target is the next day” if needed.',
      NAME_REQUIRED: 'Enter a name for this activity.', NAME_TOO_LONG: 'The trimmed name can contain up to 80 UTF-16 code units.',
      DURATION_FORMAT: 'Enter whole minutes using ASCII digits, such as 35.', DURATION_RANGE: 'Each activity must be 1 to 720 minutes.',
      NOTE_TOO_LONG: 'The trimmed note can contain up to 160 UTF-16 code units.', TOTAL_DURATION_EXCEEDED: 'The timeline can be at most 1440 minutes. Shorten or remove an activity.'
    }
  }
};

// Browser and controlled offline harness run this same application. No state is exposed globally.
export function mountApp(platform, locale = platform.document.documentElement.lang) {
  const { document, window, navigator, URL, Blob, setTimeout, clearTimeout } = platform;
  const text = messages[locale === 'en' ? 'en' : 'zh-Hant'];
  const ids = ['timeline-form', 'start-time', 'target-time', 'target-next-day', 'activity-rows', 'add-activity', 'row-count', 'row-limit', 'clear-all', 'build-timeline', 'field-error', 'notice', 'empty-result', 'result', 'schedule-rows', 'schedule-summary', 'report', 'copy-report', 'download-report', 'download-help', 'language-link'];
  const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const state = { draft: createInitialDraft(), schedule: null, report: '', revision: 0, pageGeneration: 0,
    clipboardRequestId: 0, pending: null, error: null, notice: null, downloads: new Map() };
  let nextRow = 2;
  let active = true;
  let invalidControl = null;
  const composing = new Set();
  const controls = new Map();
  const element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  function setNotice(code, content) {
    state.notice = code;
    ui.notice.textContent = content ?? (code ? text[code] : '');
  }
  function syncActions() {
    ui['copy-report'].disabled = !active || !state.report || state.pending !== null;
    ui['copy-report'].setAttribute('aria-busy', String(state.pending !== null));
    ui['copy-report'].textContent = state.pending !== null ? text.copying : text.copy;
    ui['download-report'].disabled = !active || !state.report || state.downloads.size >= 8;
    ui['download-help'].textContent = state.downloads.size >= 8 ? text.downloadWait : text.downloadHelp;
  }
  function clearError() {
    if (invalidControl) {
      invalidControl.removeAttribute('aria-invalid');
      invalidControl.setAttribute('aria-describedby', invalidControl === ui['start-time'] || invalidControl === ui['target-time'] ? 'clock-help' : invalidControl === ui['target-next-day'] ? 'target-day-help' : 'row-help');
    }
    invalidControl = null;
    state.error = null;
    ui['field-error'].textContent = '';
    ui['field-error'].hidden = true;
  }
  function invalidate() {
    state.revision++;
    state.pending = null;
    state.schedule = null;
    state.report = '';
    ui.report.value = '';
    ui.result.hidden = true;
    ui['schedule-rows'].replaceChildren();
    ui['schedule-summary'].replaceChildren();
    ui['empty-result'].hidden = false;
    clearError();
    setNotice(null);
    syncActions();
  }
  function trackComposition(input) {
    input.addEventListener('compositionstart', () => { composing.add(input); invalidate(); });
    input.addEventListener('compositionend', () => { composing.delete(input); });
  }
  function syncRowNames() {
    state.draft.rows.forEach((row, index) => {
      const rowControls = controls.get(row.id);
      const label = `${text.activity} ${index + 1}: ${row.nameRaw.trim() || text.activity}`;
      for (const action of ['up', 'down', 'remove']) rowControls[action].setAttribute('aria-label', `${text[action]} ${label}`);
    });
  }
  function renderRows() {
    for (const rowControls of controls.values()) for (const key of ['nameRaw', 'durationMinutesRaw', 'noteRaw']) composing.delete(rowControls[key]);
    controls.clear();
    ui['activity-rows'].replaceChildren();
    state.draft.rows.forEach((row, index) => {
      const container = element('section', 'activity-row');
      const heading = element('h3', '', `${text.activity} ${index + 1}`);
      heading.id = `heading-${row.id}`;
      container.setAttribute('aria-labelledby', heading.id);
      const fields = element('div', 'row-fields');
      const rowControls = {};
      for (const [key, labelText, suffix] of [['nameRaw', text.name, 'name'], ['durationMinutesRaw', text.duration, 'duration'], ['noteRaw', text.note, 'note']]) {
        const field = element('div', 'field');
        const label = element('label', '', labelText);
        const input = element('input', suffix === 'duration' ? 'duration-input' : '');
        input.id = `${suffix}-${row.id}`;
        input.type = 'text';
        input.maxLength = 256;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('inputmode', suffix === 'duration' ? 'numeric' : 'text');
        input.setAttribute('aria-describedby', 'row-help');
        label.htmlFor = input.id;
        input.value = row[key];
        input.addEventListener('input', () => { invalidate(); row[key] = input.value; if (key === 'nameRaw') syncRowNames(); });
        trackComposition(input);
        rowControls[key] = input;
        field.append(label, input);
        fields.append(field);
      }
      const actions = element('div', 'row-actions');
      for (const action of ['up', 'down', 'remove']) {
        const button = element('button', '', text[action]);
        button.type = 'button';
        button.id = `${action}-${row.id}`;
        button.setAttribute('aria-describedby', 'row-limit');
        button.disabled = action === 'up' ? index === 0 : action === 'down' ? index === state.draft.rows.length - 1 : state.draft.rows.length === 1;
        rowControls[action] = button;
        button.addEventListener('click', () => changeOrder(row.id, action));
        actions.append(button);
      }
      container.append(heading, fields, actions);
      controls.set(row.id, rowControls);
      ui['activity-rows'].append(container);
    });
    syncRowNames();
    const count = state.draft.rows.length;
    ui['row-count'].textContent = `${count} / 60`;
    ui['row-limit'].textContent = `${count === 60 ? text.full : text.rowLimit} ${text.rowBoundary}`;
    ui['add-activity'].disabled = count >= 60;
  }
  function changeOrder(id, action) {
    const index = state.draft.rows.findIndex(row => row.id === id);
    const count = state.draft.rows.length;
    if (!active || index < 0 || action === 'remove' && count === 1 || action === 'up' && index === 0 || action === 'down' && index === count - 1) return;
    invalidate();
    if (action === 'remove') {
      composing.delete(controls.get(id).nameRaw); composing.delete(controls.get(id).durationMinutesRaw); composing.delete(controls.get(id).noteRaw);
      state.draft.rows.splice(index, 1);
      renderRows();
      controls.get(state.draft.rows[Math.min(index, count - 2)].id).nameRaw.focus();
      return;
    }
    const destination = index + (action === 'up' ? -1 : 1);
    const [row] = state.draft.rows.splice(index, 1);
    state.draft.rows.splice(destination, 0, row);
    renderRows();
    const rowControls = controls.get(id);
    const focus = rowControls[action].disabled ? rowControls[action === 'up' ? 'down' : 'up'] : rowControls[action];
    focus.focus();
    setNotice('moved', text.moved(destination + 1, count));
  }
  function showError(error) {
    state.error = error;
    const rootFields = { startTimeRaw: 'start-time', targetTimeRaw: 'target-time', targetNextDay: 'target-next-day', rows: 'add-activity' };
    invalidControl = error.rowId && controls.has(error.rowId) ? controls.get(error.rowId)[error.field?.slice(7)] : ui[rootFields[error.field]];
    ui['field-error'].textContent = text.errors[error.code];
    ui['field-error'].hidden = false;
    if (invalidControl) {
      const previous = invalidControl.getAttribute('aria-describedby');
      invalidControl.setAttribute('aria-describedby', `${previous ? `${previous} ` : ''}field-error`);
      invalidControl.setAttribute('aria-invalid', 'true');
    }
    (invalidControl || ui['build-timeline']).focus();
  }
  function renderResult() {
    for (const row of state.schedule.rows) {
      const item = element('li', 'schedule-row');
      const range = element('span', 'time-range', `${formatScheduleClock(row.startAbsoluteMinute, locale)}–${formatScheduleClock(row.endAbsoluteMinute, locale)}`);
      const description = element('div', 'activity-description');
      description.append(element('strong', '', row.name));
      if (row.note) description.append(element('p', '', row.note));
      item.append(range, description, element('span', '', text.min(row.durationMinutes)));
      ui['schedule-rows'].append(item);
    }
    const summary = (label, value) => { const pair = element('div'); pair.append(element('dt', '', label), element('dd', '', value)); ui['schedule-summary'].append(pair); };
    summary(text.total, text.min(state.schedule.totalMinutes));
    summary(text.end, formatScheduleClock(state.schedule.endAbsoluteMinute, locale));
    const comparison = state.schedule.targetComparison;
    if (comparison) {
      summary(text.target, formatTargetClock({ minuteOfDay: comparison.targetMinuteOfDay, dayOffset: comparison.targetDayOffset }, locale));
      summary(text.difference, text.comparison(comparison.differenceMinutes));
    }
    ui.result.hidden = false;
    ui['empty-result'].hidden = true;
    ui.report.value = state.report;
    setNotice('built');
    syncActions();
  }
  function hasContent() {
    return state.report !== '' || state.draft.startTimeRaw !== '' || state.draft.targetTimeRaw !== '' || state.draft.targetNextDay || state.draft.rows.length !== 1 || state.draft.rows.some(row => row.nameRaw !== '' || row.durationMinutesRaw !== '' || row.noteRaw !== '');
  }
  function reset() {
    active = true;
    invalidate();
    composing.clear();
    state.draft = createInitialDraft();
    ui['start-time'].value = '';
    ui['target-time'].value = '';
    ui['target-next-day'].checked = false;
    ui['target-next-day'].disabled = true;
    renderRows();
    syncActions();
  }
  for (const [id, key] of [['start-time', 'startTimeRaw'], ['target-time', 'targetTimeRaw']]) {
    ui[id].addEventListener('input', () => {
      invalidate();
      state.draft[key] = ui[id].value;
      if (key === 'targetTimeRaw') {
        ui['target-next-day'].disabled = ui[id].value === '';
        if (ui[id].value === '') { state.draft.targetNextDay = false; ui['target-next-day'].checked = false; }
      }
    });
    trackComposition(ui[id]);
  }
  ui['target-next-day'].addEventListener('change', () => { invalidate(); state.draft.targetNextDay = ui['target-next-day'].checked; });
  ui['add-activity'].addEventListener('click', () => {
    if (!active || state.draft.rows.length >= 60) return;
    invalidate();
    const id = `row-${nextRow++}`;
    state.draft.rows.push({ id, nameRaw: '', durationMinutesRaw: '', noteRaw: '' });
    renderRows();
    controls.get(id).nameRaw.focus();
  });
  ui['timeline-form'].addEventListener('submit', event => {
    event.preventDefault();
    if (!active) return;
    invalidate();
    if (composing.size > 0) { setNotice('composing'); return; }
    const validated = validateDraft(state.draft);
    if (!validated.ok) { showError(validated.error); return; }
    state.schedule = calculateSchedule(validated.value);
    state.report = formatPlainTextReport(state.schedule, locale);
    renderResult();
  });
  ui['clear-all'].addEventListener('click', () => {
    if (!active || hasContent() && !window.confirm(text.clearConfirm)) return;
    reset();
    ui['start-time'].focus();
  });
  ui['language-link'].addEventListener('click', event => {
    event.preventDefault();
    if (!active || hasContent() && !window.confirm(text.languageConfirm)) return;
    window.location.assign(locale === 'en' ? '/index.html' : '/en/index.html');
  });
  ui['copy-report'].addEventListener('click', () => {
    if (!active || !state.report || state.pending !== null) return;
    if (typeof navigator.clipboard?.writeText !== 'function') { setNotice('fallback'); return; }
    const request = { revision: state.revision, requestId: ++state.clipboardRequestId, pageGeneration: state.pageGeneration };
    state.pending = request;
    setNotice(null);
    syncActions();
    const current = () => active && state.revision === request.revision && state.clipboardRequestId === request.requestId && state.pageGeneration === request.pageGeneration && state.pending === request;
    const resolved = () => { if (!current()) return; setNotice('copied'); };
    const rejected = () => { if (!current()) return; setNotice('fallback'); };
    const finished = () => { if (!current()) return; state.pending = null; syncActions(); };
    try { Promise.resolve(navigator.clipboard.writeText(state.report)).then(resolved, rejected).finally(finished); }
    catch { rejected(); finished(); }
  });
  ui['download-report'].addEventListener('click', () => {
    if (!active || !state.report || state.downloads.size >= 8) return;
    try {
      const blob = new Blob([encodeUtf8Report(state.report)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const record = { timer: null };
      state.downloads.set(url, record);
      record.timer = setTimeout(() => {
        if (state.downloads.get(url) !== record) return;
        URL.revokeObjectURL(url);
        state.downloads.delete(url);
        syncActions();
      }, 60000);
      const anchor = element('a');
      anchor.href = url;
      anchor.download = 'glossquote-event-timeline.txt';
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      setNotice('downloadStarted');
    } catch { setNotice('downloadFailed'); }
    syncActions();
  });
  window.addEventListener('pagehide', () => {
    active = false;
    state.pageGeneration++;
    invalidate();
    composing.clear();
    for (const rowControls of controls.values()) for (const key of ['nameRaw', 'durationMinutesRaw', 'noteRaw']) rowControls[key].value = '';
    ui['start-time'].value = '';
    ui['target-time'].value = '';
    ui['target-next-day'].checked = false;
    ui['target-next-day'].disabled = true;
    ui['activity-rows'].replaceChildren();
    ui['row-count'].textContent = '';
    ui['row-limit'].textContent = text.rowLimit;
    controls.clear();
    state.draft = { startTimeRaw: '', targetTimeRaw: '', targetNextDay: false, rows: [] };
    for (const [url, record] of state.downloads) { clearTimeout(record.timer); URL.revokeObjectURL(url); }
    state.downloads.clear();
    syncActions();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });
  reset();
}

if (typeof document !== 'undefined') {
  mountApp({ document, window, navigator, URL, Blob, setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window) });
}
