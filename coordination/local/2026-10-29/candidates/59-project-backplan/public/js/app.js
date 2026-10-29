import { parseCivilDate, weekday } from './core/calendar.mjs';

// Session ownership is separate from rendering so lifecycle contracts have offline tests.
// Offline protocol tests are not browser Worker, focus, layout, or download acceptance.
export class PlanSession {
  constructor({ createWorker, createURL, revokeURL, onState = () => {}, onProgress = () => {}, onResult = () => {}, onFailure = () => {}, setTimer = (callback, milliseconds) => globalThis.setTimeout(callback, milliseconds), clearTimer = id => globalThis.clearTimeout(id) }) {
    Object.assign(this, { createWorker, createURL, revokeURL, onState, onProgress, onResult, onFailure, setTimer, clearTimer });
    this.generation = 0;
    this.worker = null;
    this.urls = [];
    this.timer = null;
    this.result = null;
  }

  stopWorker() {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.onmessageerror = null;
      this.worker.terminate();
    }
    this.worker = null;
  }

  invalidate(reason = 'editing') {
    this.generation += 1;
    this.stopWorker();
    this.result = null;
    for (const url of this.urls) this.revokeURL(url);
    this.urls = [];
    this.onState(reason);
  }

  fail(errors = [{ code: 'WORKER_FAILURE', field: 'project' }]) {
    this.stopWorker();
    this.result = null;
    for (const url of this.urls) this.revokeURL(url);
    this.urls = [];
    this.onState('error');
    this.onFailure(errors);
  }

  start(input, locale) {
    this.invalidate('running');
    const generation = this.generation;
    let worker;
    try {
      worker = this.createWorker();
      this.worker = worker;
      const current = () => this.worker === worker && this.generation === generation;
      const armWatchdog = () => {
        if (this.timer !== null) this.clearTimer(this.timer);
        this.timer = this.setTimer(() => { if (current()) this.fail(); }, 30000);
      };
      worker.onerror = event => { event.preventDefault?.(); if (current()) this.fail(); };
      worker.onmessageerror = () => { if (current()) this.fail(); };
      worker.onmessage = event => {
        const message = event.data;
        if (!current() || !message || message.generation !== generation) return;
        if (message.type === 'progress') {
          const units = { validate: 'tasks', graph: 'tasks', calendar: 'civilDays', forward: 'tasks', backward: 'tasks', serialize: 'bytes' };
          const maximum = message.unit === 'tasks' ? 100 : message.unit === 'civilDays' ? 184569 : 2097152;
          if (!Object.hasOwn(units, message.phase) || units[message.phase] !== message.unit || !Number.isSafeInteger(message.completed) || message.completed < 0 || message.completed > maximum) { this.fail(); return; }
          armWatchdog();
          this.onProgress(message);
        } else if (message.type === 'failure') {
          this.fail(Array.isArray(message.errors) && message.errors.length > 0 && message.errors.length <= 2000 ? message.errors : undefined);
        } else if (message.type === 'result') {
          const pair = message.output;
          const encoder = new TextEncoder();
          if (message.plan?.schema !== 'gq.backplan' || !pair?.ok || typeof pair.json?.text !== 'string' || typeof pair.txt?.text !== 'string' ||
              pair.json.filename !== 'project-backplan.json' || pair.txt.filename !== 'project-backplan.txt' ||
              encoder.encode(pair.json.text).length + encoder.encode(pair.txt.text).length !== pair.totalBytes || pair.totalBytes > 2097152) { this.fail(); return; }
          this.stopWorker();
          try {
            const json = this.createURL(pair.json);
            this.urls.push(json);
            const txt = this.createURL(pair.txt);
            this.urls.push(txt);
            this.result = message.plan;
            this.onState('success');
            this.onResult(message.plan, { json, txt }, pair.totalBytes);
          } catch { this.fail([{ code: 'OUTPUT_FAILED', field: 'project' }]); }
        } else this.fail();
      };
      armWatchdog();
      worker.postMessage({ type: 'calculate', generation, input, locale });
    } catch { this.fail(); }
  }
}

export const COPY = {
  'zh-Hant': {
    id: 'ID', name: '任務名稱', duration: '工期（工作日）', predecessors: '前置任務', remove: '移除任務', task: '任務',
    selectHelp: '可選多個 ID；Ctrl / Command 配合點選可切換。未選表示沒有前置。', missing: '不存在的 ID',
    editing: '✎ 編輯中', stale: '✎ 輸入已變更，請重新計算', running: '正在計算工作日與依賴…', success: '✓ 日程已計算', error: '⚠ 請修正後重新計算',
    cancelled: '計算已取消，結果與下載已撤下。可繼續編輯。', cleared: '輸入與結果已清除。', requiredDeadline: '先輸入交件日，才能計算日程。',
    ready: '填好日曆與任務後計算；錯誤會保留草稿供修正。', empty: '尚未計算日程', emptyHelp: '輸入交件日、任務工期與前置關係，查看最晚開始日和餘裕。',
    calculate: '計算日程', rowCount: n => `${n} / 100 項任務`,
    phase: { validate: '已驗證任務', graph: '已排序任務依賴', calendar: '已走訪日曆日期', forward: '已計算最早日期', backward: '已計算最晚日期', serialize: '已建立下載內容' },
    unit: { tasks: '項', civilDays: '個曆日', bytes: 'bytes' },
    fields: { project: '專案', deadline: '交件日', workweek: '工作週', holidays: '休假日期', tasks: '任務清單', id: 'ID', name: '名稱', durationWorkdays: '工期', predecessors: '前置任務' },
    errors: {
      PROJECT_SCHEMA: '專案欄位格式不正確，請重新輸入。', DATE_INVALID: '請輸入 2000–2099 年間真實的 YYYY-MM-DD 日期。',
      WORKWEEK_INVALID: '工作週需由不重複的星期組成，請重新選擇。', NO_WORKDAYS: '至少選擇一個工作日。',
      HOLIDAY_LIMIT: '休假最多 366 個，請減少日期。', HOLIDAY_DUPLICATE: '休假日期重複，請移除重複項。',
      TASK_LIMIT: '需有 1–100 項任務，請調整清單。', TASK_SCHEMA: '任務欄位格式不正確，請重新輸入。',
      ID_INVALID: 'ID 需為 1–32 個英文字母、數字、點、底線或連字號，不含空白。', ID_DUPLICATE: 'ID 重複，請為每項任務使用唯一 ID。',
      NAME_INVALID: '名稱需為 1–120 個 Unicode 字元，不可只有空白或含控制字元、換行。',
      DURATION_INVALID: '工期需為 1–260 的整數工作日，只用半形數字且不以 0 開頭。',
      DEPENDENCY_LIMIT: '全案最多 500 條依賴，請減少前置關係。', PREDECESSOR_INVALID: '前置任務需使用有效 ID，請重新選擇。',
      DUPLICATE_EDGE: '相同前置任務重複，請移除重複關係。', UNKNOWN_PREDECESSOR: '找不到前置 ID，請修正該 ID 或移除關係。',
      CYCLE: '依賴形成閉環，請編輯下列任務的前置關係：', INTERNAL_ERROR: '無法建立一致的完整日程。請檢查設定後重新計算；沒有保留舊結果。',
      WORKER_FAILURE: '計算未能完成。請重新計算；若仍失敗，請用支援模組 Worker 的瀏覽器開啟本頁。沒有保留舊結果。',
      OUTPUT_LIMIT: '兩份下載合計超過 2 MiB，請減少內容後重新計算。未建立任何下載。', OUTPUT_FAILED: '無法建立兩份下載，請重新計算。未保留任何下載。',
      OUTPUT_OPTIONS: '下載設定無效，請重新計算。', OUTPUT_INVALID: '下載內容不完整，請重新計算。'
    },
    errorHeading: '請修正以下項目', locate: '前往修正', anchor: '全案起點／最晚開工', effective: '有效交件日', entered: '原交件日', longest: '最長路徑工作日', count: '任務數',
    adjustment: (days, reason) => `截止日向前調整 ${days} 個曆日：${reason}；採用最近的前一工作日。`,
    adjustmentReasons: { workweek: '原日期不在所選工作週', holiday: '原日期是你輸入的休假', both: '原日期既不在所選工作週，也被列為休假' },
    noAdjustment: '截止日是你設定的工作日，無需調整。', critical: '◆ 關鍵任務', noncritical: '有餘裕',
    criticalList: '關鍵路徑的零餘裕任務（依賴順序）', criticalHelp: '以下是零餘裕任務集合，可能涵蓋多條路徑。依賴欄保留實際連線；清單相鄰不一定互相依賴。',
    headers: ['ID / 任務', '工期', '前置 ID', '最早開始 ES', '最早完成 EF', '最晚開始 LS', '最晚完成 LF', '餘裕（工作日）', '關鍵標記'], none: '無',
    tableCaption: '完整日程表；起日與迄日均計入工期。', downloadReady: bytes => `兩份 UTF-8 下載合計 ${bytes} bytes。下載只會在你點選時開始。`
  },
  en: {
    id: 'ID', name: 'Task name', duration: 'Duration (workdays)', predecessors: 'Predecessor tasks', remove: 'Remove task', task: 'Task',
    selectHelp: 'Select multiple IDs with Ctrl / Command and click. No selection means no predecessors.', missing: 'missing ID',
    editing: '✎ Editing', stale: '✎ Inputs changed; calculate again', running: 'Calculating workdays and dependencies…', success: '✓ Plan calculated', error: '⚠ Review and calculate again',
    cancelled: 'Calculation cancelled. Results and downloads were removed. You can keep editing.', cleared: 'Inputs and results cleared.', requiredDeadline: 'Enter a deadline to enable calculation.',
    ready: 'Calculate after entering the calendar and tasks. Errors preserve your editable draft.', empty: 'No plan calculated yet', emptyHelp: 'Enter a deadline, task durations, and predecessors to see late starts and slack.',
    calculate: 'Calculate plan', rowCount: n => `${n} / 100 tasks`,
    phase: { validate: 'Tasks validated', graph: 'Dependencies sorted', calendar: 'Calendar dates visited', forward: 'Early dates calculated', backward: 'Late dates calculated', serialize: 'Download content created' },
    unit: { tasks: 'tasks', civilDays: 'calendar days', bytes: 'bytes' },
    fields: { project: 'Project', deadline: 'Deadline', workweek: 'Workweek', holidays: 'Holidays', tasks: 'Task list', id: 'ID', name: 'Name', durationWorkdays: 'Duration', predecessors: 'Predecessors' },
    errors: {
      PROJECT_SCHEMA: 'Project fields are invalid. Enter the project again.', DATE_INVALID: 'Enter a real YYYY-MM-DD date in 2000–2099.',
      WORKWEEK_INVALID: 'Choose unique weekdays for the workweek.', NO_WORKDAYS: 'Select at least one workday.',
      HOLIDAY_LIMIT: 'Use at most 366 holidays. Remove excess dates.', HOLIDAY_DUPLICATE: 'A holiday is repeated. Remove the duplicate date.',
      TASK_LIMIT: 'Use 1–100 tasks. Adjust the task list.', TASK_SCHEMA: 'Task fields are invalid. Enter the task again.',
      ID_INVALID: 'Use 1–32 letters, digits, dots, underscores, or hyphens for an ID, with no spaces.', ID_DUPLICATE: 'This ID is repeated. Give each task a unique ID.',
      NAME_INVALID: 'Use 1–120 Unicode characters for the name. It cannot be blank or contain control characters or line breaks.',
      DURATION_INVALID: 'Use an integer from 1–260 workdays, with ASCII digits and no leading zero.',
      DEPENDENCY_LIMIT: 'Use at most 500 dependencies in the project. Remove excess predecessors.', PREDECESSOR_INVALID: 'A predecessor needs a valid ID. Choose it again.',
      DUPLICATE_EDGE: 'A predecessor is repeated. Remove the duplicate relationship.', UNKNOWN_PREDECESSOR: 'A predecessor ID is missing. Correct the ID or remove the relationship.',
      CYCLE: 'The dependencies form a cycle. Edit the predecessors of these tasks:', INTERNAL_ERROR: 'A consistent complete plan could not be created. Check the settings and calculate again. No previous result was retained.',
      WORKER_FAILURE: 'Calculation did not finish. Calculate again; if it still fails, use a browser that supports module Workers. No previous result was retained.',
      OUTPUT_LIMIT: 'The two downloads exceed 2 MiB in total. Reduce the content and calculate again. No download was created.', OUTPUT_FAILED: 'Both downloads could not be created. Calculate again. No download was retained.',
      OUTPUT_OPTIONS: 'Download settings are invalid. Calculate again.', OUTPUT_INVALID: 'Download content is incomplete. Calculate again.'
    },
    errorHeading: 'Review these fields', locate: 'Edit field', anchor: 'Project anchor / latest start', effective: 'Effective deadline', entered: 'Entered deadline', longest: 'Longest path workdays', count: 'Tasks',
    adjustment: (days, reason) => `Deadline moved ${days} calendar days earlier: ${reason}. The nearest previous workday is used.`,
    adjustmentReasons: { workweek: 'the entered date is outside your workweek', holiday: 'the entered date is a holiday you supplied', both: 'the entered date is both outside your workweek and a holiday you supplied' },
    noAdjustment: 'The deadline is a workday in your calendar; no adjustment was needed.', critical: '◆ Critical', noncritical: 'Has slack',
    criticalList: 'Zero-slack tasks on critical paths (dependency order)', criticalHelp: 'This set may cover several paths. Predecessor columns show the actual connections; adjacent IDs in this list are not necessarily connected.',
    headers: ['ID / Task', 'Duration', 'Predecessor IDs', 'Early start ES', 'Early finish EF', 'Late start LS', 'Late finish LF', 'Slack (workdays)', 'Critical status'], none: 'None',
    tableCaption: 'Complete schedule; both start and finish dates count toward duration.', downloadReady: bytes => `Both UTF-8 downloads total ${bytes} bytes. A download starts only when you select its link.`
  }
};

function boot() {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const t = COPY[locale];
  const $ = id => document.getElementById(id);
  const form = $('project-form');
  const rows = $('task-rows');
  const number = value => new Intl.NumberFormat(locale).format(value);
  let nextRow = 0;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const selectPane = pane => {
    document.body.dataset.pane = pane;
    for (const id of ['input-tab', 'result-tab']) $(id).setAttribute('aria-pressed', String(id.startsWith(pane)));
  };
  const clearErrors = () => {
    $('errors').replaceChildren();
    $('errors').hidden = true;
    for (const field of form.querySelectorAll('[aria-invalid]')) {
      field.removeAttribute('aria-invalid');
      field.setAttribute('aria-describedby', field.dataset.help ?? '');
    }
  };
  const emptyResult = () => {
    $('result-content').replaceChildren();
    $('downloads').hidden = true;
    for (const id of ['download-json', 'download-txt']) $(id).removeAttribute('href');
    $('empty-result').hidden = false;
    $('download-size').textContent = '';
  };
  const updateReady = () => {
    const running = session.worker !== null;
    $('calculate').disabled = running || $('deadline').value === '';
    $('calculate').textContent = running ? t.running : t.calculate;
    $('calculate-help').textContent = $('deadline').value === '' ? t.requiredDeadline : t.ready;
    $('cancel').hidden = !running;
    $('add-task').disabled = rows.children.length >= 100;
    $('task-count').textContent = t.rowCount(rows.children.length);
  };
  const fieldFor = path => {
    if (path === 'deadline' || path === 'workweek' || path.startsWith('holidays')) return $(path.startsWith('holidays') ? 'holidays' : path);
    const match = /^tasks\.(\d+)(?:\.([A-Za-z]+))?/.exec(path);
    if (match) return rows.children[Number(match[1])]?.querySelector(`[data-field="${match[2] ?? 'id'}"]`) ?? rows;
    return rows;
  };
  const renderErrors = errors => {
    clearErrors();
    const box = $('errors');
    box.append(element('h3', t.errorHeading));
    const list = element('ul');
    errors.forEach((error, i) => {
      const li = element('li');
      li.id = `error-${i}`;
      const path = typeof error.field === 'string' ? error.field : 'project';
      const parts = path.split('.');
      const rowNumber = parts[0] === 'tasks' && /^\d+$/.test(parts[1] ?? '') ? ` ${Number(parts[1]) + 1}` : '';
      const label = `${t.fields[parts[0]] ?? t.fields.project}${rowNumber}${t.fields[parts[2]] ? ` · ${t.fields[parts[2]]}` : ''}`;
      li.append(element('span', `${label}${error.taskId ? ` (${error.taskId})` : ''}: ${t.errors[error.code] ?? t.errors.INTERNAL_ERROR}`));
      if (error.relatedId) li.append(element('code', ` ${error.relatedId}`));
      if (Array.isArray(error.cycles)) {
        const cycles = element('ul');
        for (const cycle of error.cycles) {
          const cycleItem = element('li');
          cycleItem.append(element('code', cycle.join(' → ')));
          for (const taskId of new Set(cycle)) {
            const row = [...rows.children].find(row => row.querySelector('[data-field="id"]').value === taskId);
            if (row) {
              const button = element('button', `${t.locate} ${taskId}`, 'quiet');
              button.type = 'button';
              button.addEventListener('click', () => { selectPane('input'); row.querySelector('select').focus(); });
              cycleItem.append(button);
            }
          }
          cycles.append(cycleItem);
        }
        li.append(cycles);
      }
      const target = fieldFor(path);
      target.setAttribute('aria-invalid', 'true');
      target.setAttribute('aria-describedby', `${target.dataset.help ?? ''} ${li.id}`.trim());
      const locate = element('button', t.locate, 'quiet');
      locate.type = 'button';
      locate.addEventListener('click', () => { selectPane('input'); target.focus(); });
      li.append(locate);
      list.append(li);
    });
    box.append(list);
    box.hidden = false;
  };
  const session = new PlanSession({
    createWorker: () => new Worker(new URL('./planner-worker.js', import.meta.url), { type: 'module' }),
    createURL: file => URL.createObjectURL(new Blob([file.text], { type: file.mime })),
    revokeURL: url => URL.revokeObjectURL(url),
    onState: state => {
      emptyResult();
      clearErrors();
      $('progress').textContent = '';
      $('status').textContent = t[state] ?? t.editing;
      $('results-pane').setAttribute('aria-busy', String(state === 'running'));
      // start() calls this before constructing the Worker, so update readiness once more after start.
      updateReady();
    },
    onProgress: message => { $('progress').textContent = `${t.phase[message.phase]}: ${number(message.completed)} ${t.unit[message.unit]}`; },
    onFailure: errors => { renderErrors(errors); updateReady(); },
    onResult: (plan, urls, totalBytes) => {
      const content = $('result-content');
      const summary = element('dl', undefined, 'plan-summary');
      const appendFact = (label, value) => { const group = element('div'); group.append(element('dt', label), element('dd', value)); summary.append(group); };
      appendFact(t.anchor, plan.anchor);
      appendFact(t.effective, plan.settings.effectiveDeadline);
      appendFact(t.entered, plan.settings.deadline);
      appendFact(t.longest, number(plan.longestPathWorkdays));
      appendFact(t.count, number(plan.tasks.length));
      const outsideWeek = !plan.settings.workweek.includes(weekday(parseCivilDate(plan.settings.deadline).ordinal));
      const holiday = plan.settings.holidays.includes(plan.settings.deadline);
      const reason = t.adjustmentReasons[outsideWeek && holiday ? 'both' : holiday ? 'holiday' : 'workweek'];
      content.append(summary, element('p', plan.settings.deadlineAdjusted ? t.adjustment(number(plan.settings.deadlineAdjustmentDays), reason) : t.noAdjustment, 'adjustment'));
      content.append(element('h3', t.criticalList), element('p', plan.criticalTaskIds.join(', '), 'critical-ids'), element('p', t.criticalHelp, 'help'));
      const table = element('table', undefined, 'schedule');
      table.append(element('caption', t.tableCaption));
      const head = element('thead');
      const headingRow = element('tr');
      t.headers.forEach(text => { const th = element('th', text); th.scope = 'col'; headingRow.append(th); });
      head.append(headingRow);
      const body = element('tbody');
      for (const task of plan.tasks) {
        const tr = element('tr');
        const title = element('th');
        title.scope = 'row';
        title.append(element('code', task.id), element('span', task.name, 'task-title'));
        tr.append(title);
        const cells = [number(task.durationWorkdays), task.predecessors.join(', ') || t.none, task.ES, task.EF, task.LS, task.LF, number(task.slackWorkdays), task.critical ? t.critical : t.noncritical];
        cells.forEach((value, i) => {
          const td = element('td', undefined, i === 7 && task.critical ? 'critical-cell' : '');
          const mobileLabel = element('span', t.headers[i + 1], 'mobile-label');
          mobileLabel.setAttribute('aria-hidden', 'true');
          td.append(mobileLabel, element('span', value));
          tr.append(td);
        });
        body.append(tr);
      }
      table.append(head, body);
      const scroll = element('div', undefined, 'table-region');
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', t.tableCaption);
      scroll.tabIndex = 0;
      scroll.append(table);
      content.append(scroll);
      $('empty-result').hidden = true;
      $('download-json').href = urls.json;
      $('download-txt').href = urls.txt;
      $('downloads').hidden = false;
      $('download-size').textContent = t.downloadReady(number(totalBytes));
      updateReady();
    }
  });

  const invalidate = () => { session.invalidate('stale'); updateReady(); };
  const rebuildPredecessors = () => {
    const ids = [...rows.children].map(row => row.querySelector('[data-field="id"]').value).filter(Boolean);
    for (const row of rows.children) {
      const select = row.querySelector('select');
      const selected = new Set([...select.selectedOptions].map(option => option.value));
      select.replaceChildren();
      for (const id of new Set([...ids, ...selected])) {
        const option = element('option', ids.includes(id) ? id : `${id} (${t.missing})`);
        option.value = id;
        option.selected = selected.has(id);
        select.append(option);
      }
      select.size = Math.min(5, Math.max(2, select.options.length));
    }
  };
  const addRow = () => {
    if (rows.children.length >= 100) return;
    const key = ++nextRow;
    const row = element('fieldset', undefined, 'task-row');
    row.append(element('legend', `${t.task} ${key}`));
    for (const [field, label, maxLength, inputMode] of [['id', t.id, 32, 'text'], ['name', t.name, 240, 'text'], ['durationWorkdays', t.duration, 4, 'numeric']]) {
      const wrapper = element('div', undefined, `field field-${field}`);
      const input = element('input');
      input.id = `task-${key}-${field}`;
      input.name = input.id;
      input.dataset.field = field;
      input.maxLength = maxLength;
      input.inputMode = inputMode;
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      const labelNode = element('label', label);
      labelNode.htmlFor = input.id;
      wrapper.append(labelNode, input);
      row.append(wrapper);
    }
    const predecessorField = element('div', undefined, 'field field-predecessors');
    const label = element('label', t.predecessors);
    const select = element('select');
    select.id = `task-${key}-predecessors`;
    label.htmlFor = select.id;
    select.name = select.id;
    select.multiple = true;
    select.dataset.field = 'predecessors';
    select.dataset.help = 'dependency-help';
    select.setAttribute('aria-describedby', 'dependency-help');
    predecessorField.append(label, select);
    row.append(predecessorField);
    const remove = element('button', t.remove, 'quiet remove-task');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      invalidate();
      const neighbor = row.nextElementSibling ?? row.previousElementSibling;
      row.remove();
      rebuildPredecessors();
      updateReady();
      (neighbor?.querySelector('input') ?? $('add-task')).focus();
    });
    row.append(remove);
    rows.append(row);
    rebuildPredecessors();
    updateReady();
    return row;
  };
  form.addEventListener('input', event => {
    invalidate();
    if (event.target.dataset.field === 'id') rebuildPredecessors();
  });
  form.addEventListener('change', invalidate);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if ($('deadline').value === '') return;
    const input = {
      deadline: $('deadline').value,
      workweek: [...form.querySelectorAll('[name="weekday"]:checked')].map(field => Number(field.value)),
      holidays: $('holidays').value.split(/[\n,]/).map(date => date.trim()).filter(Boolean),
      tasks: [...rows.children].map(row => {
        const value = field => row.querySelector(`[data-field="${field}"]`).value;
        return { id: value('id'), name: value('name'), durationWorkdays: value('durationWorkdays'), predecessors: [...row.querySelector('select').selectedOptions].map(option => option.value) };
      })
    };
    session.start(input, locale);
    updateReady();
  });
  $('add-task').addEventListener('click', () => { invalidate(); addRow()?.querySelector('input').focus(); });
  $('cancel').addEventListener('click', () => { session.invalidate('cancelled'); updateReady(); });
  const reset = () => {
    session.invalidate('cleared');
    form.reset();
    rows.replaceChildren();
    nextRow = 0;
    addRow();
    selectPane('input');
    updateReady();
  };
  $('clear').addEventListener('click', reset);
  $('input-tab').addEventListener('click', () => selectPane('input'));
  $('result-tab').addEventListener('click', () => selectPane('result'));
  window.addEventListener('pagehide', reset);
  $('dependency-help').textContent = t.selectHelp;
  $('empty-title').textContent = t.empty;
  $('empty-help').textContent = t.emptyHelp;
  addRow();
  selectPane('input');
  $('status').textContent = t.editing;
  updateReady();
}

if (typeof document !== 'undefined') boot();
