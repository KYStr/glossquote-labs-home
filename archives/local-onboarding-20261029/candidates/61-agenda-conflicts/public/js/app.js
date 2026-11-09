import { validateAgenda, VALIDATION_CODES } from './core/validate.mjs';
import { aggregateAgenda } from './core/analyse.mjs';
import { serializeAgendaReport, formatMinute } from './core/output.mjs';

// Owns asynchronous data and URL lifetimes, independently of rendering.
export function createRunController({ createWorker, onState = () => {}, revokeUrl = () => {} }) {
  let generation = 0;
  let worker = null;
  let agenda = null;
  let result = null;
  let files = null;
  let progress = null;
  let status = 'idle';
  let errorCode = null;
  const urls = new Set();
  const snapshot = () => ({ generation, status, errorCode, result, files, progress });
  const emit = () => onState(snapshot());
  const revoke = () => { for (const url of urls) revokeUrl(url); urls.clear(); };
  function invalidate(next = 'editing', code = null, notify = true) {
    generation++;
    const previous = worker;
    worker = null;
    if (previous) { previous.onmessage = previous.onerror = previous.onmessageerror = null; previous.terminate(); }
    revoke();
    agenda = result = files = progress = null;
    status = next;
    errorCode = code;
    if (notify) emit();
  }
  const fail = code => invalidate('failed', code);
  function start(validAgenda, language = 'zh-Hant') {
    invalidate('checking', null, false);
    agenda = validAgenda;
    const token = generation;
    const totalPairs = agenda.sessions.length * (agenda.sessions.length - 1) / 2;
    progress = { checkedPairs: 0, totalPairs };
    emit();
    try {
      const owned = createWorker();
      worker = owned;
      const current = () => token === generation && owned === worker && status === 'checking';
      owned.onmessage = event => {
        const message = event.data;
        if (!current() || !message || message.generation !== generation) return;
        if (message.type === 'failed') { fail('CHECK_FAILED'); return; }
        if (!['progress', 'complete'].includes(message.type) || !Number.isInteger(message.checkedPairs)
          || message.totalPairs !== totalPairs || message.checkedPairs < progress.checkedPairs || message.checkedPairs > totalPairs) {
          fail('CHECK_FAILED'); return;
        }
        if (message.type === 'progress') {
          progress = { checkedPairs: message.checkedPairs, totalPairs };
          emit(); return;
        }
        if (message.checkedPairs !== totalPairs || !Array.isArray(message.pairResults) || message.pairResults.length > totalPairs) {
          fail('CHECK_FAILED'); return;
        }
        try {
          const completed = aggregateAgenda(agenda, message.pairResults);
          const serialized = serializeAgendaReport(completed, { language });
          if (!serialized.ok) { fail(serialized.code); return; }
          owned.onmessage = owned.onerror = owned.onmessageerror = null;
          owned.terminate();
          worker = null;
          agenda = null;
          result = completed;
          files = serialized.files;
          progress = { checkedPairs: totalPairs, totalPairs };
          status = 'ready';
          emit();
        } catch { if (current()) fail('CHECK_FAILED'); }
      };
      owned.onerror = owned.onmessageerror = event => {
        event?.preventDefault?.();
        if (current()) fail('CHECK_FAILED');
      };
      owned.postMessage({ agenda, generation });
    } catch { if (generation === token) fail('WORKER_UNAVAILABLE'); }
  }
  function acquireDownload(format, createUrl) {
    if (status !== 'ready' || !files || !['json', 'txt'].includes(format)) return null;
    const token = generation;
    const file = files[format];
    revoke();
    try {
      const url = createUrl(file);
      if (generation !== token || status !== 'ready') { revokeUrl(url); return null; }
      urls.add(url);
      return { url, name: file.name };
    } catch { fail('DOWNLOAD_FAILED'); return null; }
  }
  return { start, invalidate, cancel: () => invalidate('cancelled'), clear: () => invalidate('idle'),
    pagehide: () => invalidate('idle'), snapshot, acquireDownload };
}

export const UI_COPY = {
  'zh-Hant': {
    room: '房間', speaker: '講者', sessions: '場次', unnamedRoom: '未命名房間', unnamedSpeaker: '未命名講者',
    remove: '移除', removeRoom: '移除房間並解除對應場次指派', removeSpeaker: '移除講者並解除對應場次指派',
    id: '場次 ID', title: '場次名稱', start: '開始（HH:mm）', end: '結束（HH:mm）', unassigned: '未指派',
    noSessions: '尚無場次。先建立資源，再新增場次；也可保留未指派。', noResources: '尚未建立',
    check: '檢查議程', running: '正在檢查已填資源…', idle: '尚未檢查', editing: '尚未檢查 · 請重新檢查目前資料',
    cancelled: '已取消檢查；你的輸入仍在。', failed: '檢查沒有完成；你的輸入仍在。請檢查資料後再試。',
    WORKER_UNAVAILABLE: '目前無法啟動檢查。請在支援本地工作處理的瀏覽器與網站預覽中再試；你的輸入仍在。',
    OUTPUT_LIMIT: '兩份報告合計超過 2 MiB，未產生任何下載。請縮減場次內容後再試；你的輸入仍在。',
    DOWNLOAD_FAILED: '無法建立下載。請重新檢查後再試；你的輸入仍在。',
    validation: '尚未檢查：請修正下列欄位，所有場次都已保留。', row: '場次列', item: '第',
    checked: '已檢查場次對', complete: '檢查完成', overlap: '重疊錯誤', warning: '轉場不足提醒',
    roomMissing: '房間未指派', speakerMissing: '講者未指派', noMissing: '無',
    missingNotice: '未指派欄位的資源衝突無法判定；請補齊後重新檢查。',
    clearResult: '在已填資料中未找到衝突。', partialResult: '已指派資源未找到衝突；未指派資源未能檢查。',
    issuesResult: '請依衝突清單修正來源，再重新檢查。工具不會自動改排。',
    room_overlap: '房間重疊', speaker_overlap: '講者撞期', shared: '共同講者', gap: '間隔', required: '要求', minute: '分鐘',
    emptyPairs: '沒有找到這類問題。', emptySchedule: '沒有場次。', allUnassigned: '未指派場次仍保留在完整場次。',
    downloadReady: '兩份報告已備妥。下載只會在你按下按鈕時建立。', cleared: '已清除本頁資料；已下載的檔案需自行移除。',
    errors: {
      SCHEMA: '資料結構不完整，請補齊這一列。', UNKNOWN_FIELD: '包含不支援的欄位，請使用本頁欄位。',
      SESSION_COUNT: '請建立 1–200 場次。', ROOM_COUNT: '房間最多 20 個。', SPEAKER_COUNT: '講者最多 100 位。',
      ID_FORMAT: 'ID 須為 1–32 個 ASCII 英數字或 . _ -。', DUPLICATE_ID: '場次 ID 重複，請改用唯一 ID。',
      TITLE: '名稱須為 1–160 個字元，不可空白、含控制字元或不完整 Unicode。',
      NAME: '資源名稱整理空白後須為 1–80 個字元，不可含控制字元或不完整 Unicode。',
      DUPLICATE_NAME: '資源名稱在 NFC 與去除前後空白後重複，請改名。', ROOM_REFERENCE: '請選擇現有房間或未指派。',
      SPEAKER_REFERENCES: '每場請選擇 0–5 位講者。', SPEAKER_REFERENCE: '請選擇現有講者或未指派。',
      DUPLICATE_SPEAKER: '同一場不可重複選擇同位講者。', TIME_FORMAT: '請輸入 00:00–23:59 的 HH:mm 整數分鐘。',
      END_AFTER_START: '結束須晚於開始；不接受零長度或跨午夜場次。', TRANSITION: '轉場門檻須為 0–120 的整數分鐘。'
    },
    fields: { agenda: '議程', session: '場次', rooms: '房間', speakers: '講者', sessions: '場次', transitionMinutes: '轉場門檻',
      id: 'ID', title: '名稱', roomIndex: '房間', speakerIndexes: '講者', start: '開始', end: '結束' }
  },
  en: {
    room: 'Room', speaker: 'Speaker', sessions: 'Sessions', unnamedRoom: 'Unnamed room', unnamedSpeaker: 'Unnamed speaker',
    remove: 'Remove', removeRoom: 'Remove room and unassign it from sessions', removeSpeaker: 'Remove speaker and unassign them from sessions',
    id: 'Session ID', title: 'Session title', start: 'Start (HH:mm)', end: 'End (HH:mm)', unassigned: 'Unassigned',
    noSessions: 'No sessions yet. Create resources, then add a session. Resources can also stay unassigned.', noResources: 'None added yet',
    check: 'Check agenda', running: 'Checking assigned resources…', idle: 'Not checked yet', editing: 'Not checked · check the current data again',
    cancelled: 'Check cancelled. Your input is still here.', failed: 'The check did not finish. Your input is still here. Review it and try again.',
    WORKER_UNAVAILABLE: 'The check could not start. Try a browser and website preview that support local background processing. Your input is still here.',
    OUTPUT_LIMIT: 'The combined reports exceed 2 MiB. Neither download was created. Reduce the session content and try again; your input is still here.',
    DOWNLOAD_FAILED: 'The download could not be created. Check the agenda and try again; your input is still here.',
    validation: 'Not checked: correct the fields below. All sessions have been kept.', row: 'Session row', item: 'Item',
    checked: 'Session pairs checked', complete: 'Check finished', overlap: 'Overlap errors', warning: 'Short transition warnings',
    roomMissing: 'Room unassigned', speakerMissing: 'Speakers unassigned', noMissing: 'None',
    missingNotice: 'Conflicts for unassigned resources cannot be determined. Assign them and check again.',
    clearResult: 'No conflicts found in the supplied data.', partialResult: 'No conflicts found for assigned resources; unassigned resources could not be checked.',
    issuesResult: 'Use the findings to edit your source, then check again. The tool does not reschedule sessions.',
    room_overlap: 'Room overlap', speaker_overlap: 'Speaker clash', shared: 'Shared speakers', gap: 'Gap', required: 'Required', minute: 'min',
    emptyPairs: 'No findings of this type.', emptySchedule: 'No sessions.', allUnassigned: 'Unassigned sessions stay in the full session list.',
    downloadReady: 'Both reports are ready. A download is created only when you press its button.', cleared: 'Page data cleared. Remove previously downloaded files yourself.',
    errors: {
      SCHEMA: 'The data structure is incomplete. Complete this row.', UNKNOWN_FIELD: 'An unsupported field is present. Use the fields on this page.',
      SESSION_COUNT: 'Create 1–200 sessions.', ROOM_COUNT: 'Use at most 20 rooms.', SPEAKER_COUNT: 'Use at most 100 speakers.',
      ID_FORMAT: 'Use 1–32 ASCII letters, digits, or . _ - for the ID.', DUPLICATE_ID: 'This session ID is repeated. Use a unique ID.',
      TITLE: 'Use a nonblank title of 1–160 Unicode characters without controls or incomplete Unicode.',
      NAME: 'Use a resource name of 1–80 Unicode characters after trimming, without controls or incomplete Unicode.',
      DUPLICATE_NAME: 'This resource name is repeated after NFC normalization and trimming. Rename it.',
      ROOM_REFERENCE: 'Select an existing room or Unassigned.', SPEAKER_REFERENCES: 'Select 0–5 speakers per session.',
      SPEAKER_REFERENCE: 'Select an existing speaker or Unassigned.', DUPLICATE_SPEAKER: 'Do not assign the same speaker twice to a session.',
      TIME_FORMAT: 'Enter an exact HH:mm minute from 00:00 to 23:59.', END_AFTER_START: 'End must be later than start. Zero duration and midnight crossings are not supported.',
      TRANSITION: 'Use an integer transition threshold from 0 to 120 minutes.'
    },
    fields: { agenda: 'Agenda', session: 'Session', rooms: 'Rooms', speakers: 'Speakers', sessions: 'Sessions', transitionMinutes: 'Transition threshold',
      id: 'ID', title: 'Title', roomIndex: 'Room', speakerIndexes: 'Speakers', start: 'Start', end: 'End' }
  }
};

export function initApp(doc = document) {
  const language = doc.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const c = UI_COPY[language];
  const number = new Intl.NumberFormat(language);
  const $ = id => doc.getElementById(id);
  const make = (tag, text, className) => {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const source = { rooms: [], speakers: [], sessions: [], transition: '10' };
  let sequence = 0;
  let resourceView = 'rooms';
  const issueFields = new Map();
  const clearIssues = () => {
    for (const [field, description] of issueFields) {
      field.removeAttribute('aria-invalid');
      if (description) field.setAttribute('aria-describedby', description); else field.removeAttribute('aria-describedby');
    }
    issueFields.clear();
    $('validation-list').replaceChildren();
    $('validation').hidden = true;
  };
  const setWorkspace = view => {
    doc.body.dataset.workspace = view;
    for (const button of doc.querySelectorAll('[data-workspace-tab]')) {
      const selected = button.dataset.workspaceTab === view;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
  };
  const controller = createRunController({
    createWorker: () => new Worker(new URL('./conflict-worker.js', import.meta.url), { type: 'module' }),
    revokeUrl: url => URL.revokeObjectURL(url),
    onState: renderState
  });
  function mutate(update, redraw = false) {
    controller.invalidate();
    clearIssues();
    $('clear-confirm').hidden = true;
    update();
    if (redraw) renderEditors();
  }
  function field(labelText, id, control) {
    const wrapper = make('div', undefined, 'field');
    const label = make('label', labelText);
    label.htmlFor = id;
    control.id = id;
    wrapper.append(label, control);
    return wrapper;
  }
  function textInput(value, maxLength) {
    const input = make('input');
    input.type = 'text'; input.value = value; input.maxLength = maxLength;
    input.autocomplete = 'off';
    return input;
  }
  function registry(fieldName, cap) {
    const list = $(`${fieldName}-list`);
    list.replaceChildren();
    $(`add-${fieldName}`).disabled = source[fieldName].length >= cap;
    $(`${fieldName}-count`).textContent = `${number.format(source[fieldName].length)} / ${cap}`;
    if (!source[fieldName].length) list.append(make('p', c.noResources, 'muted'));
    source[fieldName].forEach((name, index) => {
      const row = make('div', undefined, 'registry-row');
      const control = textInput(name, 320);
      control.addEventListener('input', () => mutate(() => { source[fieldName][index] = control.value; renderSessions(); }));
      const remove = make('button', c.remove, 'quiet');
      remove.type = 'button';
      remove.title = fieldName === 'rooms' ? c.removeRoom : c.removeSpeaker;
      remove.setAttribute('aria-label', `${remove.title} ${index + 1}`);
      remove.addEventListener('click', () => {
        mutate(() => {
          source[fieldName].splice(index, 1);
          for (const item of source.sessions) {
            if (fieldName === 'rooms') item.roomIndex = item.roomIndex === index ? null : item.roomIndex > index ? item.roomIndex - 1 : item.roomIndex;
            else item.speakerSlots = item.speakerSlots.map(value => value === index ? null : value > index ? value - 1 : value);
          }
        }, true);
        $(`add-${fieldName}`).focus();
      });
      row.append(field(`${fieldName === 'rooms' ? c.room : c.speaker} ${index + 1}`, `${fieldName}-${index}`, control), remove);
      list.append(row);
    });
  }
  function selectResource(fieldName, selected) {
    const select = make('select');
    const empty = make('option', c.unassigned);
    empty.value = ''; select.append(empty);
    source[fieldName].forEach((name, index) => {
      const option = make('option', name.trim() || `${fieldName === 'rooms' ? c.unnamedRoom : c.unnamedSpeaker} ${index + 1}`);
      option.value = String(index); select.append(option);
    });
    select.value = selected === null ? '' : String(selected);
    return select;
  }
  function renderSessions() {
    const list = $('session-list');
    list.replaceChildren();
    $('session-count').textContent = `${number.format(source.sessions.length)} / 200`;
    $('add-session').disabled = source.sessions.length >= 200;
    if (!source.sessions.length) list.append(make('p', c.noSessions, 'empty-copy'));
    source.sessions.forEach((item, index) => {
      const row = make('fieldset', undefined, 'session-row');
      const legend = make('legend', `${c.row} ${index + 1}${item.id ? ` · ${item.id}` : ''}`);
      row.append(legend);
      for (const [key, label, maxLength] of [['id', c.id, 32], ['title', c.title, 320]]) {
        const input = textInput(item[key], maxLength);
        if (key === 'id') { input.spellcheck = false; input.className = 'data'; }
        input.addEventListener('input', () => mutate(() => {
          item[key] = input.value;
          if (key === 'id') legend.textContent = `${c.row} ${index + 1}${item.id ? ` · ${item.id}` : ''}`;
        }));
        row.append(field(label, `session-${index}-${key}`, input));
      }
      const room = selectResource('rooms', item.roomIndex);
      room.addEventListener('change', () => mutate(() => { item.roomIndex = room.value === '' ? null : Number(room.value); }));
      row.append(field(c.room, `session-${index}-roomIndex`, room));
      const speakerGroup = make('fieldset', undefined, 'speaker-choices');
      speakerGroup.id = `session-${index}-speakerIndexes`;
      speakerGroup.append(make('legend', `${c.speaker} (0–5)`));
      item.speakerSlots.forEach((speakerIndex, slot) => {
        const speaker = selectResource('speakers', speakerIndex);
        speaker.addEventListener('change', () => mutate(() => { item.speakerSlots[slot] = speaker.value === '' ? null : Number(speaker.value); }));
        speakerGroup.append(field(`${c.speaker} ${slot + 1}`, `session-${index}-speaker-${slot}`, speaker));
      });
      row.append(speakerGroup);
      const times = make('div', undefined, 'times');
      for (const [key, label] of [['start', c.start], ['end', c.end]]) {
        const input = textInput(item[key], 5); input.className = 'data'; input.spellcheck = false;
        input.placeholder = 'HH:mm';
        input.addEventListener('input', () => mutate(() => { item[key] = input.value; }));
        times.append(field(label, `session-${index}-${key}`, input));
      }
      row.append(times);
      const remove = make('button', `${c.remove} ${c.row}`, 'quiet remove-session'); remove.type = 'button';
      remove.setAttribute('aria-label', `${c.remove} ${c.row} ${index + 1}`);
      remove.addEventListener('click', () => { mutate(() => source.sessions.splice(index, 1), true); $('add-session').focus(); });
      row.append(remove); list.append(row);
    });
  }
  function renderEditors() { registry('rooms', 20); registry('speakers', 100); renderSessions(); }
  function rawSource() {
    return { rooms: [...source.rooms], speakers: [...source.speakers], transitionMinutes: /^\d{1,3}$/.test(source.transition) ? Number(source.transition) : NaN,
      sessions: source.sessions.map(({ id, title, roomIndex, speakerSlots, start, end }) => ({ id, title, roomIndex,
        speakerIndexes: speakerSlots.filter(value => value !== null), start, end })) };
  }
  function showErrors(errors) {
    clearIssues();
    $('validation').hidden = false;
    for (const [index, error] of errors.entries()) {
      const item = make('li'); item.id = `validation-error-${index}`;
      const location = error.row !== null ? `${c.row} ${error.row}${error.sessionId ? ` (${error.sessionId})` : ''}`
        : error.index !== null ? `${c.fields[error.field]} ${error.index + 1}` : c.fields[error.field];
      item.append(make('span', `${location} · ${c.fields[error.field] ?? c.fields.agenda}: ${c.errors[error.code]}`));
      $('validation-list').append(item);
      const fieldId = error.row !== null ? `session-${error.row - 1}-${error.field}`
        : error.index !== null ? `${error.field}-${error.index}` : error.field === 'transitionMinutes' ? 'transition' : null;
      const control = fieldId ? $(fieldId) : null;
      if (control) {
        if (!issueFields.has(control)) issueFields.set(control, control.getAttribute('aria-describedby'));
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), item.id].filter(Boolean).join(' '));
        const jump = make('a', language === 'en' ? 'Go to field' : '前往欄位');
        jump.href = '#source-panel';
        jump.addEventListener('click', event => { event.preventDefault(); setWorkspace('source'); (control.matches('input, select') ? control : control.querySelector('select'))?.focus(); });
        item.append(doc.createTextNode(' '), jump);
      }
    }
    setWorkspace('source'); $('validation').focus();
  }
  const sessionDescription = (item, agenda) => `${item.id} · ${formatMinute(item.startMinute)}–${formatMinute(item.endMinute)} · ${item.title} · ${item.roomIndex === null ? c.unassigned : agenda.rooms[item.roomIndex]} · ${item.speakerIndexes.map(index => agenda.speakers[index]).join(', ') || c.unassigned}`;
  function renderFindings(result) {
    const byId = new Map(result.agenda.sessions.map(item => [item.id, item]));
    for (const [elementId, pairs] of [['overlap-list', result.conflicts], ['warning-list', result.warnings]]) {
      const list = $(elementId); list.replaceChildren();
      if (!pairs.length) list.append(make('li', c.emptyPairs, 'muted'));
      for (const pair of pairs) {
        const item = make('li', undefined, `pair ${elementId === 'overlap-list' ? 'error-pair' : 'warning-pair'}`);
        const ordered = pair.sessionIds.map(id => byId.get(id));
        if (elementId === 'warning-list') ordered.sort((a, b) => a.startMinute - b.startMinute);
        item.append(make('h4', ordered.map(session => session.id).join(elementId === 'overlap-list' ? ' ↔ ' : ' → '), 'data'));
        if (pair.reasons) item.append(make('p', `! ${pair.reasons.map(reason => c[reason]).join(' + ')}${pair.reasons.includes('room_overlap') ? ` · ${result.agenda.rooms[ordered[0].roomIndex]}` : ''}`, 'reason'));
        else item.append(make('p', `! ${c.warning} · ${pair.fromRoom} → ${pair.toRoom} · ${c.gap} ${pair.gapMinutes} / ${c.required} ${pair.requiredMinutes} ${c.minute}`, 'reason'));
        item.append(make('p', `${c.shared}: ${pair.sharedSpeakers.join(', ') || c.noMissing}`));
        for (const session of ordered) item.append(make('p', sessionDescription(session, result.agenda), 'session-detail'));
        list.append(item);
      }
    }
  }
  function renderSchedules(result) {
    const container = $('resource-content'); container.replaceChildren();
    for (const button of doc.querySelectorAll('[data-resource-tab]')) {
      const selected = button.dataset.resourceTab === resourceView;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      if (selected) container.setAttribute('aria-labelledby', button.id);
    }
    const byId = new Map(result.agenda.sessions.map(item => [item.id, item]));
    const group = (name, sessions) => {
      const section = make('section', undefined, 'schedule-group');
      section.append(make('h4', name));
      const list = make('ol', undefined, 'schedule-list');
      if (!sessions.length) list.append(make('li', c.emptySchedule, 'muted'));
      for (const item of sessions) list.append(make('li', sessionDescription(byId.get(item.id), result.agenda)));
      section.append(list); container.append(section);
    };
    if (resourceView === 'all') group(c.sessions, result.agenda.sessions);
    else {
      const resources = result.resourceSchedules[resourceView];
      for (const resource of resources) group(resourceView === 'rooms' ? resource.room : resource.speaker, resource.sessions);
      const missing = resourceView === 'rooms' ? result.coverage.roomUnassignedSessionIds : result.coverage.speakerUnassignedSessionIds;
      if (missing.length) group(resourceView === 'rooms' ? c.roomMissing : c.speakerMissing, missing.map(id => ({ id })));
      if (!resources.length && !missing.length) container.append(make('p', c.emptySchedule));
    }
  }
  function renderState(state) {
    const running = state.status === 'checking';
    const ready = state.status === 'ready';
    $('check').disabled = running;
    $('check').textContent = running ? c.running : c.check;
    $('check').setAttribute('aria-busy', String(running));
    $('cancel').disabled = !running;
    $('cancel-results').disabled = !running;
    $('download-json').disabled = $('download-txt').disabled = !ready;
    $('results-panel').setAttribute('aria-busy', String(running));
    $('progress-area').hidden = !running;
    $('result-data').hidden = !ready;
    $('result-empty').hidden = ready || running;
    $('result-data').classList.toggle('ready', ready);
    if (!ready) {
      for (const id of ['summary', 'overlap-list', 'warning-list', 'resource-content']) $(id).replaceChildren();
    }
    let message = c[state.status] ?? c.idle;
    if (running) {
      message = c.running;
      const { checkedPairs, totalPairs } = state.progress;
      $('pair-progress').max = totalPairs || 1;
      $('pair-progress').value = checkedPairs;
      $('progress-count').textContent = `${number.format(checkedPairs)} / ${number.format(totalPairs)} · ${c.checked}`;
    } else if (state.status === 'failed') message = c[state.errorCode] ?? c.failed;
    else if (ready) {
      const result = state.result;
      message = `${c.complete} · ${number.format(result.coverage.checkedPairs)} ${c.checked}`;
      const summary = $('summary'); summary.replaceChildren();
      for (const [term, value] of [[`! ${c.overlap}`, result.conflicts.length], [`! ${c.warning}`, result.warnings.length],
        [c.roomMissing, result.coverage.roomUnassignedSessionIds.join(', ') || c.noMissing],
        [c.speakerMissing, result.coverage.speakerUnassignedSessionIds.join(', ') || c.noMissing]]) {
        const block = make('div'); block.append(make('dt', term), make('dd', typeof value === 'number' ? number.format(value) : value)); summary.append(block);
      }
      const hasMissing = result.coverage.roomUnassignedSessionIds.length || result.coverage.speakerUnassignedSessionIds.length;
      $('coverage-notice').hidden = !hasMissing;
      $('coverage-notice').textContent = `! ${c.missingNotice}`;
      $('result-explanation').textContent = result.conflicts.length || result.warnings.length ? c.issuesResult : hasMissing ? c.partialResult : c.clearResult;
      renderFindings(result); renderSchedules(result);
    }
    $('status').textContent = message;
    $('status').dataset.state = state.status;
    $('result-empty-message').textContent = message;
  }
  for (const [fieldName, cap] of [['rooms', 20], ['speakers', 100]]) {
    $(`add-${fieldName}`).addEventListener('click', () => {
      if (source[fieldName].length >= cap) return;
      mutate(() => source[fieldName].push(''), true);
      $(`${fieldName}-${source[fieldName].length - 1}`).focus();
    });
  }
  $('add-session').addEventListener('click', () => {
    if (source.sessions.length >= 200) return;
    mutate(() => {
      let id;
      do { id = `S${++sequence}`; } while (source.sessions.some(item => item.id === id));
      source.sessions.push({ id, title: '', roomIndex: null, speakerSlots: Array(5).fill(null), start: '', end: '' });
    }, true);
    $(`session-${source.sessions.length - 1}-title`).focus();
  });
  $('transition').addEventListener('input', () => mutate(() => { source.transition = $('transition').value; }));
  $('agenda-form').addEventListener('submit', event => {
    event.preventDefault();
    controller.invalidate(); clearIssues();
    const validation = validateAgenda(rawSource());
    if (!validation.ok) { showErrors(validation.errors); return; }
    setWorkspace('results'); controller.start(validation.agenda, language);
  });
  $('cancel').addEventListener('click', () => controller.cancel());
  $('cancel-results').addEventListener('click', () => controller.cancel());
  const clearAll = pagehide => {
    if (pagehide) controller.pagehide(); else controller.clear();
    source.rooms = []; source.speakers = []; source.sessions = []; source.transition = '10'; sequence = 0;
    $('transition').value = '10'; clearIssues(); $('clear-confirm').hidden = true;
    renderEditors(); setWorkspace('source');
    if (!pagehide) { $('status').textContent = c.cleared; $('clear').focus(); }
  };
  $('clear').addEventListener('click', () => {
    if (!source.rooms.length && !source.speakers.length && !source.sessions.length && source.transition === '10') { clearAll(false); return; }
    $('clear-confirm').hidden = false; $('keep-data').focus();
  });
  $('keep-data').addEventListener('click', () => { $('clear-confirm').hidden = true; $('clear').focus(); });
  $('confirm-clear').addEventListener('click', () => clearAll(false));
  function tabKeyboard(buttons, event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = buttons.indexOf(event.currentTarget);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].click();
  }
  const workspaceTabs = [...doc.querySelectorAll('[data-workspace-tab]')];
  for (const button of workspaceTabs) {
    button.addEventListener('click', () => setWorkspace(button.dataset.workspaceTab));
    button.addEventListener('keydown', event => tabKeyboard(workspaceTabs, event));
  }
  const resourceTabs = [...doc.querySelectorAll('[data-resource-tab]')];
  for (const button of resourceTabs) {
    button.addEventListener('click', () => { resourceView = button.dataset.resourceTab; const state = controller.snapshot(); if (state.result) renderSchedules(state.result); });
    button.addEventListener('keydown', event => tabKeyboard(resourceTabs, event));
  }
  for (const format of ['json', 'txt']) $('download-' + format).addEventListener('click', () => {
    const download = controller.acquireDownload(format, file => URL.createObjectURL(new Blob([file.text], { type: file.type })));
    if (!download) return;
    const anchor = make('a'); anchor.href = download.url; anchor.download = download.name;
    doc.body.append(anchor); anchor.click(); anchor.remove();
  });
  // Invalidate before native text editing changes source values; input/change repeat
  // this before changing the authoritative arrays, so no asynchronous gap exists.
  $('agenda-form').addEventListener('beforeinput', () => {
    if (['ready', 'checking'].includes(controller.snapshot().status)) controller.invalidate();
  });
  globalThis.addEventListener('pagehide', () => clearAll(true));
  renderEditors(); setWorkspace('source'); renderState(controller.snapshot());
  $('app').hidden = false; $('script-notice').hidden = true;
  return { controller };
}

// Importing this module under Node exercises only the controller/copy contract.
if (typeof document !== 'undefined') initApp();

// Kept explicit for static and Node completeness checks of both error dictionaries.
export const localizedValidationCodes = VALIDATION_CODES;
