// 瀏覽器控制層：只使用安全文字節點，不傳送或持久保存使用者輸入。
import { planProject, parseDuration, PlanError, LIMITS } from './core/plan.mjs';
import { messages, formatReport } from './i18n.mjs';

const $ = id => document.getElementById(id);
const form = $('planner');
// 初始化前先阻止原生提交；來源 fieldset 與送出鍵預設停用、所有欄位沒有 name。
form.addEventListener('submit', event => event.preventDefault());
const language = document.documentElement.lang;
const t = messages[language];
let revision = 0; // 任何輸入或生命週期失效均換代。
let copyToken = 0; // 複製操作另有 token，舊 promise 不得干擾較新的操作。
let result = null;
let nextId = 1;
let downloadURL = null;
let downloadTimer = null;
let clearOpener = null;
let composing = false; // IME 尚在組字時不能建立未完成字串的結果。
const rows = () => [...$('tasks').children];

function node(tag, text, className = '') {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function revokeDownload() {
  if (downloadTimer !== null) clearTimeout(downloadTimer);
  downloadTimer = null;
  if (downloadURL !== null) URL.revokeObjectURL(downloadURL);
  downloadURL = null;
  $('download').disabled = result === null;
}

function clearErrors() {
  $('error-box').hidden = true;
  $('error-text').textContent = '';
  for (const control of form.querySelectorAll('[aria-invalid]')) {
    control.removeAttribute('aria-invalid');
    control.setAttribute('aria-describedby', (control.getAttribute('aria-describedby') || '').split(' ').filter(id => id !== 'error-text').join(' '));
  }
}

function invalidate(announce = true) {
  const hadResult = result !== null;
  revision += 1;
  copyToken += 1;
  result = null;
  // 已手動開始的下載保留短暫 URL grace；輸入失效不提前撤銷外部動作。
  $('result').hidden = true;
  $('summary').replaceChildren();
  $('schedule').replaceChildren();
  $('adjustment').textContent = '';
  $('adjustment').hidden = true;
  $('report').value = '';
  $('copy').disabled = true;
  $('copy').textContent = t.copy;
  $('copy').removeAttribute('aria-busy');
  $('download').disabled = true;
  $('status').textContent = announce && hadResult ? t.changed : t.noResult;
  clearErrors();
}

function refreshCount() {
  const count = rows().length;
  $('task-count').textContent = `${count} / ${LIMITS.tasks}`;
  $('add-task').disabled = count >= LIMITS.tasks;
  for (const row of rows()) row.querySelector('button').disabled = count === 1;
}

function addTask(values = {}, focus = false) {
  if (rows().length >= LIMITS.tasks) return;
  const id = `T${nextId++}`;
  const row = node('section', undefined, 'task-row');
  row.dataset.id = id;
  row.setAttribute('aria-labelledby', `${id}-heading`);
  const heading = node('div', undefined, 'task-heading');
  const title = node('h3', `${t.task} ${id}`);
  title.id = `${id}-heading`;
  const remove = node('button', `${t.remove} ${id}`, 'quiet');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    if (rows().length <= 1) return;
    invalidate();
    const fallback = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    refreshCount();
    fallback.querySelector('input').focus();
  });
  heading.append(title, remove);
  const fields = node('div', undefined, 'task-fields');
  for (const [key, labelText] of [['name', t.name], ['duration', t.duration], ['dependencies', t.dependencies]]) {
    const wrapper = node('div');
    const label = node('label', labelText);
    label.htmlFor = `${id}-${key}`;
    const input = node('input');
    input.id = `${id}-${key}`;
    input.type = 'text';
    input.autocomplete = 'off';
    input.value = String(values[key] ?? (key === 'duration' ? '1' : ''));
    input.maxLength = key === 'name' ? 200 : key === 'duration' ? 3 : 1665;
    input.setAttribute('aria-describedby', key === 'dependencies' ? `${id}-dependency-hint tasks-hint` : 'tasks-hint');
    if (key === 'duration') input.inputMode = 'numeric';
    if (key !== 'dependencies') input.required = true;
    wrapper.append(label, input);
    if (key === 'dependencies') {
      const hint = node('p', t.dependencyHint, 'hint');
      hint.id = `${id}-dependency-hint`;
      wrapper.append(hint);
    }
    fields.append(wrapper);
  }
  row.append(heading, fields);
  $('tasks').append(row);
  refreshCount();
  if (focus) $(`${id}-name`).focus();
}

function resetAll(announce = false, discardDownload = false) {
  if (discardDownload) revokeDownload();
  composing = false;
  invalidate(false);
  form.reset();
  $('project').value = '';
  $('deadline').value = '';
  $('holidays').value = '';
  $('tasks').replaceChildren();
  nextId = 1;
  addTask();
  if ($('clear-dialog').open) $('clear-dialog').close();
  clearOpener = null;
  if (announce) $('status').textContent = t.cleared;
}

function inputData() {
  const holidayText = $('holidays').value.trim();
  return {
    project: $('project').value,
    deadline: $('deadline').value,
    weekdays: [...document.querySelectorAll('.weekday:checked')].map(input => Number(input.value)),
    holidays: holidayText ? holidayText.split(/\r?\n/).map(value => value.trim()) : [],
    tasks: rows().map(row => {
      const id = row.dataset.id;
      const text = $(`${id}-dependencies`).value.trim();
      return { id, name: $(`${id}-name`).value, duration: parseDuration($(`${id}-duration`).value, `${id}-duration`), dependsOn: text ? text.split(',').map(value => value.trim()) : [] };
    })
  };
}

function showError(error) {
  const code = error instanceof PlanError ? error.code : 'INTERNAL';
  $('error-text').textContent = t.errors[code] || t.errors.INTERNAL;
  $('error-box').hidden = false;
  const field = $(error.field);
  const target = field?.matches('input,textarea') ? field : error.field === 'weekdays' ? document.querySelector('.weekday') : null;
  if (target) {
    target.setAttribute('aria-invalid', 'true');
    target.setAttribute('aria-describedby', `${target.getAttribute('aria-describedby') || ''} error-text`.trim());
    target.focus();
  } else $('error-box').focus();
}

function render(plan) {
  for (const [label, value] of [[t.earliest, plan.start], [t.effective, plan.effectiveDeadline], [t.requested, plan.deadline]]) {
    const item = node('div');
    const description = node('dl');
    description.append(node('dt', label), node('dd', value));
    item.append(description);
    $('summary').append(item);
  }
  $('adjustment').hidden = plan.deadline === plan.effectiveDeadline;
  $('adjustment').textContent = t.adjusted;
  for (const task of plan.tasks) {
    const card = node('article', undefined, 'schedule-card');
    const detail = node('div');
    detail.append(node('h3', `[${task.id}] ${task.name}`), node('p', `${task.duration} ${t.days} · ${t.dependencies}: ${task.dependsOn.join(', ') || t.none}`));
    const dates = node('div', undefined, 'schedule-dates');
    for (const [label, value] of [[t.start, task.start], [t.finish, task.finish]]) {
      const block = node('div', label);
      block.append(node('strong', value));
      dates.append(block);
    }
    card.append(detail, dates);
    $('schedule').append(card);
  }
  $('report').value = formatReport(plan, language);
  $('result').hidden = false;
  $('copy').disabled = false;
  $('download').disabled = downloadURL !== null;
  $('status').textContent = t.ready;
}

function selectManual() {
  $('report').focus();
  $('report').select();
  $('status').textContent = t.manual;
}

async function copyReport() {
  if (!result || $('copy').disabled) return;
  const snapshot = $('report').value;
  const generation = revision;
  const token = ++copyToken;
  const current = () => generation === revision && token === copyToken && result !== null;
  $('copy').disabled = true;
  $('copy').textContent = t.copying;
  $('copy').setAttribute('aria-busy', 'true');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(snapshot);
    if (!current()) return;
    $('status').textContent = t.copied;
  } catch {
    if (!current()) return;
    selectManual();
  } finally {
    // finally 亦必須檢查代次，不能替新一輪 B 解除 busy。
    if (current()) {
      $('copy').disabled = false;
      $('copy').textContent = t.copy;
      $('copy').removeAttribute('aria-busy');
    }
  }
}

function downloadReport() {
  if (!result || $('download').disabled || downloadURL !== null) return;
  // 最多一個 URL；十秒 grace 內禁止下一次下載，不提前取消前一個。
  try {
    const blob = new Blob(['\ufeff', $('report').value], { type: 'text/plain;charset=utf-8' });
    downloadURL = URL.createObjectURL(blob);
    $('download').disabled = true;
    const anchor = node('a');
    anchor.href = downloadURL;
    anchor.download = 'project-backplan.txt';
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // 不在 click 同步堆疊回收，給瀏覽器開始下載的機會。
    downloadTimer = setTimeout(revokeDownload, 10000);
    $('status').textContent = t.downloaded;
  } catch {
    revokeDownload();
    $('status').textContent = t.downloadFailed;
  }
}

try {
  form.addEventListener('input', () => invalidate());
  form.addEventListener('change', () => invalidate());
  form.addEventListener('compositionstart', () => { composing = true; invalidate(); });
  form.addEventListener('compositionend', () => { composing = false; invalidate(); });
  form.addEventListener('submit', event => {
    if (composing || event.isComposing) { invalidate(false); $('status').textContent = t.composing; return; }
    invalidate(false);
    try { result = planProject(inputData()); render(result); } catch (error) { invalidate(false); showError(error); }
  });
  $('add-task').addEventListener('click', () => { invalidate(); addTask({}, true); });
  $('example').addEventListener('click', () => {
    resetAll();
    $('tasks').replaceChildren();
    nextId = 1;
    $('project').value = language === 'en' ? 'Launch essentials' : '上線必要工作';
    $('deadline').value = '2026-11-06';
    addTask({ name: language === 'en' ? 'Prepare content' : '準備內容', duration: '3' });
    addTask({ name: language === 'en' ? 'Review and deliver' : '審核與交件', duration: '2', dependencies: 'T1' });
    $('deadline').focus();
  });
  $('clear').addEventListener('click', () => { clearOpener = document.activeElement; $('clear-dialog').showModal(); });
  const cancelClear = () => { $('clear-dialog').close(); clearOpener?.focus(); clearOpener = null; };
  $('cancel-clear').addEventListener('click', cancelClear);
  $('clear-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelClear(); });
  $('confirm-clear').addEventListener('click', () => { resetAll(true); $('project').focus(); });
  $('copy').addEventListener('click', copyReport);
  $('download').addEventListener('click', downloadReport);
  $('language-link').addEventListener('click', () => resetAll(false, true));
  // 背景化也清除，避免頁面與非同步剪貼簿在不可見狀態保留舊工作。
  window.addEventListener('pagehide', () => resetAll(false, true));
  window.addEventListener('pageshow', event => { if (event.persisted) resetAll(false, true); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') resetAll(false, true); });
  resetAll();
  $('editor').disabled = false;
  $('calculate').disabled = false;
  $('init-status').hidden = true;
} catch {
  $('editor').disabled = true;
  $('calculate').disabled = true;
  $('init-status').textContent = t.initialization;
}
