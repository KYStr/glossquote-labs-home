import { createPlanner } from './state.mjs';
import { copyFor, errorMessage } from './copy.mjs';
import { DAY_KEYS, ROW_KEYS } from './core/schema.mjs';

export function initPlanner(document, window) {
  const language = document.documentElement.lang;
  const copy = copyFor(language);
  const model = createPlanner(language);
  const byId = id => { const node = document.getElementById(id); if (!node) throw new Error('Missing worksheet control'); return node; };
  const rows = byId('items'), report = byId('report'), results = byId('results'), resultList = byId('result-list');
  const status = byId('status'), confirmation = byId('confirmation'), cancel = byId('cancel'), confirm = byId('confirm');
  const languageLink = byId('language'), calculate = byId('calculate');
  const fields = new Map();
  let confirmationOrigin = null;
  const numbers = new Intl.NumberFormat(language);
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function bindInput(input, error, field, update) {
    fields.set(field, { input, error });
    const edited = () => { update(input.value); renderFeedback(); };
    input.addEventListener('input', edited);
    input.addEventListener('change', edited);
    input.addEventListener('compositionstart', () => { model.beginComposition(); renderFeedback(); });
    input.addEventListener('compositionend', () => { update(input.value); model.endComposition(); renderFeedback(); });
  }
  for (const key of DAY_KEYS) bindInput(byId(key), byId(`${key}-error`), key, value => model.editDay(key, value));
  function mountRows() {
    for (const key of [...fields.keys()]) if (key.startsWith('items[')) fields.delete(key);
    rows.replaceChildren();
    model.state.draft.items.forEach((row, index) => {
      const section = element('fieldset', undefined, 'item-row');
      section.append(element('legend', `${copy.item} ${index + 1}`));
      for (const key of ROW_KEYS.slice(1)) {
        const wrapper = element('div', undefined, 'field');
        const id = `${row.id}-${key}`;
        const label = element('label', copy.fields[key]); label.htmlFor = id;
        const input = element('input'); input.id = id; input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.value = row[key]; input.disabled = true;
        if (key !== 'nameRaw' && key !== 'unitRaw') input.inputMode = 'numeric';
        const help = element('small', copy.help[key]); help.id = `${id}-help`;
        const error = element('span', '', 'field-error'); error.id = `${id}-error`;
        input.setAttribute('aria-describedby', `${help.id} ${error.id}`);
        // Capture stable identifiers, never a row object holding discarded input.
        const rowId = row.id;
        bindInput(input, error, `items[${index}].${key}`, value => model.editRow(rowId, key, value));
        wrapper.append(label, input, help, error); section.append(wrapper);
      }
      const remove = element('button', copy.remove, 'remove'); remove.type = 'button'; remove.disabled = true;
      remove.setAttribute('aria-label', `${copy.remove} ${index + 1}`);
      const rowId = row.id;
      remove.addEventListener('click', () => {
        if (!model.removeRow(rowId)) return;
        mountRows(); renderFeedback();
        const next = model.state.draft.items[Math.min(index, model.state.draft.items.length - 1)];
        byId(`${next.id}-nameRaw`).focus();
      });
      section.append(remove); rows.append(section);
    });
    for (const key of DAY_KEYS) byId(key).value = model.state.draft[key];
  }
  function updateControls() {
    const s = model.state;
    const locked = !s.active || s.busy || !!s.pending;
    for (const { input } of fields.values()) input.disabled = locked;
    for (const id of ['example-normal', 'example-shortage', 'clear', 'add', 'calculate']) byId(id).disabled = locked || s.composing;
    byId('add').disabled ||= s.draft.items.length >= 30;
    for (const button of rows.querySelectorAll('button')) button.disabled = locked || s.composing || s.draft.items.length <= 1;
    report.disabled = !s.active || !s.result;
    cancel.disabled = !s.active || !s.pending; confirm.disabled = !s.active || !s.pending;
    byId('item-count').textContent = copy.count(s.draft.items.length);
    calculate.setAttribute('aria-busy', String(s.busy));
  }
  function renderResults() {
    resultList.replaceChildren();
    const s = model.state;
    results.hidden = !s.result;
    report.value = s.report;
    if (!s.result) return;
    s.result.items.forEach((row, i) => {
      const article = element('article', undefined, 'result-item');
      article.append(element('h3', `${i + 1}. ${row.name} (${row.unit})`));
      const quantities = element('dl', undefined, 'result-values');
      for (const key of ['packsToOrder', 'orderUnits', 'shortageBeforeArrivalUnits', 'runwayWholeDays', 'observedUseUnits', 'currentStockUnits', 'safetyReserveUnits', 'packSizeUnits', 'averageDailyUse']) {
        const group = element('div');
        let text;
        if (key === 'runwayWholeDays') text = row[key] === null ? copy.notEstimated : `${numbers.format(row[key])} ${copy.days}`;
        else if (key === 'averageDailyUse') text = `${row.averageDailyUse.roundedTo3} ${row.unit}${copy.daily}`;
        else text = `${numbers.format(row[key])} ${key === 'packsToOrder' ? copy.packs : row.unit}`;
        group.append(element('dt', copy.resultLabels[key]), element('dd', text)); quantities.append(group);
      }
      article.append(quantities);
      if (row.shortageBeforeArrivalUnits > 0) article.append(element('p', copy.shortage, 'warning'));
      if (row.observedUseUnits === 0) article.append(element('p', copy.zero, 'notice'));
      resultList.append(article);
    });
  }
  function renderFeedback() {
    const s = model.state;
    for (const { input, error } of fields.values()) { input.removeAttribute('aria-invalid'); error.textContent = ''; }
    status.textContent = copy.status[s.status]; status.className = `status ${s.status}`;
    if (s.error) {
      const target = fields.get(s.error.field);
      if (target) { target.input.setAttribute('aria-invalid', 'true'); target.error.textContent = errorMessage(s.error.code, s.error.field, language); }
      else status.textContent = copy.status.blocked;
    }
    renderResults(); updateControls();
  }
  function showRequest(kind, origin) {
    const destination = model.request(kind);
    if (model.state.pending) {
      confirmationOrigin = origin;
      byId('confirmation-text').textContent = copy.confirm[kind];
      confirm.textContent = copy.confirmAction[kind];
      confirmation.hidden = false; updateControls(); cancel.focus();
    } else { mountRows(); renderFeedback(); }
    return destination;
  }
  function closeConfirmation() { confirmation.hidden = true; byId('confirmation-text').textContent = ''; updateControls(); }
  byId('add').addEventListener('click', () => {
    if (!model.addRow()) return;
    mountRows(); renderFeedback(); byId(`${model.state.draft.items.at(-1).id}-nameRaw`).focus();
  });
  for (const [id, kind] of [['example-normal', 'normal'], ['example-shortage', 'shortage'], ['clear', 'clear']]) {
    const button = byId(id); button.addEventListener('click', () => showRequest(kind, button));
  }
  languageLink.addEventListener('click', event => {
    if (model.state.composing || model.state.pending || !model.state.active) { event.preventDefault(); return; }
    if (!model.isInitial()) { event.preventDefault(); showRequest('language', languageLink); }
  });
  cancel.addEventListener('click', () => { model.cancel(); closeConfirmation(); confirmationOrigin?.focus(); confirmationOrigin = null; });
  confirmation.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); cancel.click(); } });
  confirm.addEventListener('click', () => {
    const destination = model.confirm(); closeConfirmation();
    if (destination) { clearPage(); window.location.assign(destination); return; }
    mountRows(); renderFeedback(); confirmationOrigin?.focus(); confirmationOrigin = null;
  });
  calculate.addEventListener('click', () => {
    if (model.state.composing || model.state.busy || model.state.pending || !model.state.active) return;
    calculate.disabled = true; calculate.setAttribute('aria-busy', 'true'); status.textContent = copy.status.running;
    model.calculate(); renderFeedback();
    if (model.state.error) fields.get(model.state.error.field)?.input.focus();
  });
  function clearPage() {
    model.dispose();
    for (const control of document.querySelectorAll('input, textarea')) control.value = '';
    for (const control of document.querySelectorAll('input, textarea, button')) control.disabled = true;
    resultList.replaceChildren(); results.hidden = true; report.value = ''; status.textContent = '';
    for (const { input, error } of fields.values()) { input.removeAttribute('aria-invalid'); error.textContent = ''; }
    confirmation.hidden = true; byId('confirmation-text').textContent = ''; confirmationOrigin = null;
  }
  window.addEventListener('pagehide', clearPage);
  window.addEventListener('pageshow', event => { if (event.persisted) { model.reset(); confirmation.hidden = true; mountRows(); renderFeedback(); } });
  mountRows(); renderFeedback(); byId('initialization').hidden = true;
  return { model, clearPage };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  try { initPlanner(document, window); }
  catch {
    for (const control of document.querySelectorAll('input, textarea, button')) { control.disabled = true; if ('value' in control) control.value = ''; }
    const status = document.getElementById('status');
    if (status) status.textContent = copyFor(document.documentElement.lang).status.blocked;
  }
}
