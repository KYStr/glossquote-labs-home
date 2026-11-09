import { calculateBudget, formatMinor, reportBudget } from './core/subscription-budget.mjs';
import { messages } from './i18n.mjs';

export function mountApp(doc, win) {
  const t = messages[doc.documentElement.lang];
  const byId = id => doc.getElementById(id);
  const ui = Object.fromEntries([
    'budget-form', 'currency', 'currency-error', 'rows', 'add', 'calculate', 'example', 'clear',
    'row-count', 'status', 'error-summary', 'results', 'summary', 'details', 'report', 'copy',
    'download', 'download-status', 'export-status', 'confirm-dialog', 'dialog-title', 'dialog-text', 'cancel', 'confirm'
  ].map(id => [id, byId(id)]));
  let sequence = 0;
  const state = {
    draft: [], revision: 0, generation: 0, result: null, copyRequestId: 0,
    copyBusy: false, pendingDownloads: new Map(), pending: null, dialogOrigin: null
  };
  const create = (tag, className, text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const blank = () => ({ id: `r${++sequence}`, nameRaw: '', amountRaw: '', period: 'monthly', plannedStop: false });
  function syncDownload() {
    const limited = state.pendingDownloads.size >= 8;
    ui.download.disabled = state.result === null || limited;
    ui['download-status'].textContent = state.result !== null && limited ? t.downloadLimit : '';
  }
  function releaseDownload(url) {
    // A timer from a previous page generation or an already-cleared URL does nothing.
    if (!state.pendingDownloads.has(url)) return;
    win.clearTimeout(state.pendingDownloads.get(url));
    win.URL.revokeObjectURL(url);
    state.pendingDownloads.delete(url);
    syncDownload();
  }
  function clearDownloads() {
    for (const url of state.pendingDownloads.keys()) releaseDownload(url);
  }
  function clearErrors() {
    ui['error-summary'].textContent = '';
    ui['error-summary'].hidden = true;
    ui['currency-error'].textContent = '';
    for (const field of doc.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
    for (const error of ui.rows.querySelectorAll('.field-error')) error.textContent = '';
  }
  function invalidate(message = t.changed) {
    state.revision += 1;
    state.copyRequestId += 1;
    state.copyBusy = false;
    state.result = null;
    ui.results.hidden = true;
    ui.summary.replaceChildren();
    ui.details.replaceChildren();
    ui.report.value = '';
    ui.copy.disabled = true;
    ui.copy.textContent = t.copy;
    ui.copy.setAttribute('aria-busy', 'false');
    syncDownload();
    ui['export-status'].textContent = '';
    ui.status.textContent = message;
    clearErrors();
  }
  function updateCount() {
    ui['row-count'].textContent = t.count(state.draft.length);
    ui.add.disabled = state.draft.length >= 60;
  }
  function renderRows() {
    ui.rows.replaceChildren();
    state.draft.forEach((row, index) => {
      const group = create('fieldset', 'subscription-row');
      group.id = `group-${row.id}`;
      group.append(create('legend', 'row-legend', t.row(index + 1)));
      const fields = create('div', 'row-fields');
      for (const [key, labelText, type] of [['nameRaw', t.name, 'input'], ['amountRaw', t.amount, 'input'], ['period', t.period, 'select']]) {
        const wrap = create('div', `field ${key}`);
        const label = create('label', '', labelText);
        const control = create(type);
        control.id = `${row.id}-${key}`;
        label.htmlFor = control.id;
        control.setAttribute('aria-describedby', `${control.id}-error`);
        if (type === 'select') {
          for (const [value, labelText] of Object.entries(t.periods)) {
            const option = create('option', '', labelText);
            option.value = value;
            control.append(option);
          }
        } else {
          control.type = 'text';
          control.autocomplete = 'off';
          control.spellcheck = false;
          control.maxLength = key === 'nameRaw' ? 256 : 16;
          if (key === 'amountRaw') control.inputMode = 'decimal';
        }
        control.value = row[key];
        const edit = () => { row[key] = control.value; invalidate(); };
        control.addEventListener('input', edit);
        control.addEventListener('change', edit);
        const error = create('p', 'field-error');
        error.id = `${control.id}-error`;
        wrap.append(label, control, error);
        fields.append(wrap);
      }
      const checkLabel = create('label', 'stop-control');
      const checkbox = create('input');
      checkbox.id = `${row.id}-plannedStop`;
      checkbox.type = 'checkbox';
      checkbox.checked = row.plannedStop;
      const editStop = () => { row.plannedStop = checkbox.checked; invalidate(); };
      checkbox.addEventListener('input', editStop);
      checkbox.addEventListener('change', editStop);
      checkLabel.append(checkbox, create('span', '', t.stop));
      const remove = create('button', 'quiet remove', t.remove);
      remove.id = `${row.id}-remove`;
      remove.type = 'button';
      remove.setAttribute('aria-label', t.removeRow(index + 1));
      remove.addEventListener('click', () => {
        const position = state.draft.findIndex(item => item.id === row.id);
        state.draft.splice(position, 1);
        invalidate();
        renderRows();
        const next = state.draft[Math.min(position, state.draft.length - 1)];
        (next ? byId(`${next.id}-nameRaw`) : ui.add).focus();
      });
      fields.append(checkLabel, remove);
      group.append(fields);
      ui.rows.append(group);
    });
    updateCount();
  }
  function reset() {
    state.draft = [blank(), blank()];
    ui.currency.value = 'TWD';
    invalidate(t.initial);
    renderRows();
  }
  function hasContent() {
    return ui.currency.value !== 'TWD' || state.draft.length !== 2 ||
      state.draft.some(row => row.nameRaw !== '' || row.amountRaw !== '' || row.period !== 'monthly' || row.plannedStop);
  }
  function useExample() {
    state.draft = t.exampleNames.map((name, index) => ({
      id: `r${++sequence}`, nameRaw: name, amountRaw: ['100', '600', '1200'][index],
      period: ['monthly', 'quarterly', 'yearly'][index], plannedStop: index === 1
    }));
    ui.currency.value = 'TWD';
    invalidate(t.changed);
    renderRows();
    byId(`${state.draft[0].id}-nameRaw`).focus();
  }
  function confirmAction(kind) {
    if (!hasContent()) {
      (kind === 'clear' ? reset : useExample)();
      if (kind === 'clear') byId(`${state.draft[0].id}-nameRaw`).focus();
      return;
    }
    state.pending = kind;
    state.dialogOrigin = doc.activeElement;
    ui['dialog-title'].textContent = kind === 'clear' ? t.clearTitle : t.exampleTitle;
    ui['dialog-text'].textContent = kind === 'clear' ? t.clearText : t.exampleText;
    ui.confirm.textContent = kind === 'clear' ? t.clearConfirm : t.exampleConfirm;
    ui['confirm-dialog'].showModal();
    ui.cancel.focus();
  }
  function closeDialog() {
    state.pending = null;
    ui['confirm-dialog'].close();
    state.dialogOrigin?.focus();
    state.dialogOrigin = null;
  }
  ui.cancel.addEventListener('click', closeDialog);
  ui['confirm-dialog'].addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });
  ui.confirm.addEventListener('click', () => {
    const action = state.pending;
    closeDialog();
    if (action === 'clear') reset();
    else if (action === 'example') useExample();
    byId(`${state.draft[0].id}-nameRaw`).focus();
  });
  ui.clear.addEventListener('click', () => confirmAction('clear'));
  ui.example.addEventListener('click', () => confirmAction('example'));
  ui.add.addEventListener('click', () => {
    if (state.draft.length >= 60) { ui.status.textContent = t.limit; return; }
    state.draft.push(blank());
    invalidate();
    renderRows();
    byId(`${state.draft.at(-1).id}-nameRaw`).focus();
  });
  ui.currency.addEventListener('input', () => invalidate());
  ui.currency.addEventListener('change', () => invalidate());
  const monthlyText = item => `${item.monthlyApproximate ? `${t.approx} ` : ''}${formatMinor(item.monthlyMinor)}`;
  function renderResult(value) {
    for (const [key, title] of [['current', t.current], ['plannedStop', t.stopped], ['retained', t.retained]]) {
      const item = value[key];
      const block = create('div', `summary-line ${key}`);
      block.append(create('h3', '', `${title} · ${t.items(item.rowCount)}`));
      const annual = create('p', 'annual-value');
      annual.append(create('span', 'metric-label', t.annual), create('strong', 'money', `${value.currency} ${formatMinor(item.annualMinor)}`));
      const monthly = create('p', 'monthly-value');
      monthly.append(create('span', 'metric-label', t.monthly), create('span', 'money', `${value.currency} ${monthlyText(item)}`));
      block.append(annual, monthly);
      ui.summary.append(block);
    }
    for (const row of value.rows) {
      const item = create('li', 'detail-row');
      item.append(create('h4', '', row.name));
      item.append(create('p', '', `${t.detailPayment} ${row.amountText} · ${t.periods[row.period]} · ${row.plannedStop ? t.detailStop : t.detailKeep}`));
      item.append(create('p', 'money', `${t.annual} ${formatMinor(row.annualMinor)} / ${t.monthly} ${monthlyText(row)}`));
      ui.details.append(item);
    }
    ui.report.value = reportBudget(value, doc.documentElement.lang);
    ui.results.hidden = false;
    ui.copy.disabled = false;
    syncDownload();
  }
  ui['budget-form'].addEventListener('submit', event => {
    event.preventDefault();
    invalidate('');
    const result = calculateBudget({ currencyRaw: ui.currency.value, rows: state.draft.map(row => ({ ...row })) });
    if (!result.ok) {
      const { code, row, field } = result.error;
      const message = t.errors[code];
      const fieldId = field === 'currencyRaw' ? 'currency' : row ?
        `${state.draft[row - 1].id}-${field === 'id' ? 'nameRaw' : field}` : 'add';
      const control = byId(fieldId) ?? ui.add;
      const error = byId(fieldId === 'currency' ? 'currency-error' : `${fieldId}-error`);
      if (error) error.textContent = message;
      control.setAttribute('aria-invalid', 'true');
      ui['error-summary'].textContent = `${t.errorPrefix} ${row ? `${t.row(row)}: ` : ''}${message}`;
      ui['error-summary'].hidden = false;
      control.focus();
      return;
    }
    state.result = result.value;
    renderResult(result.value);
    ui.status.textContent = t.ready;
  });
  function manualCopy() {
    ui['export-status'].textContent = t.copyFailed;
    ui.report.focus();
    ui.report.select();
  }
  ui.copy.addEventListener('click', async () => {
    if (!state.result || state.copyBusy) return;
    const revision = state.revision;
    const generation = state.generation;
    const request = ++state.copyRequestId;
    const text = ui.report.value;
    const current = () => state.revision === revision && state.generation === generation &&
      state.copyRequestId === request && state.result !== null;
    state.copyBusy = true;
    ui.copy.disabled = true;
    ui.copy.textContent = t.copying;
    ui.copy.setAttribute('aria-busy', 'true');
    ui['export-status'].textContent = '';
    try {
      if (typeof win.navigator.clipboard?.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
      await win.navigator.clipboard.writeText(text);
      if (current()) ui['export-status'].textContent = t.copied;
    } catch {
      if (current()) manualCopy();
    } finally {
      if (current()) {
        state.copyBusy = false;
        ui.copy.disabled = false;
        ui.copy.textContent = t.copy;
        ui.copy.setAttribute('aria-busy', 'false');
      }
    }
  });
  ui.download.addEventListener('click', () => {
    if (!state.result || state.pendingDownloads.size >= 8) return;
    let anchor;
    try {
      const blob = new win.Blob([ui.report.value], { type: 'text/plain;charset=utf-8' });
      const url = win.URL.createObjectURL(blob);
      state.pendingDownloads.set(url, win.setTimeout(() => releaseDownload(url), 30000));
      anchor = create('a');
      anchor.href = url;
      anchor.download = 'glossquote-subscription-budget.txt';
      doc.body.append(anchor);
      anchor.click();
      syncDownload();
      ui['export-status'].textContent = t.downloaded;
    } catch {
      ui['export-status'].textContent = t.downloadFailed;
      ui.report.focus();
      ui.report.select();
    } finally { anchor?.remove(); }
  });
  function leavePage() {
    state.generation += 1;
    state.pending = null;
    state.dialogOrigin = null;
    if (ui['confirm-dialog'].open) ui['confirm-dialog'].close();
    clearDownloads();
    reset();
  }
  win.addEventListener('pagehide', leavePage);
  win.addEventListener('pageshow', event => { if (event.persisted) leavePage(); });
  reset();
  for (const id of ['add', 'calculate', 'example', 'clear']) ui[id].disabled = false;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') mountApp(document, window);
