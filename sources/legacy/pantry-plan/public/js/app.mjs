import { Controller } from './controller.mjs';
import { InputError } from './core/quantities.mjs';
import { LIMITS } from './core/schema.mjs';
import zh from './locales/zh-Hant.mjs';
import en from './locales/en.mjs';

export function boot(doc, host) {
  const words = doc.documentElement.lang === 'en' ? en : zh;
  const get = id => doc.getElementById(id);
  const workspace = get('workspace');
  const supported = typeof host.BigInt === 'function' && typeof host.FileReader === 'function' &&
    typeof host.Blob === 'function' && typeof host.TextDecoder === 'function' &&
    typeof host.URL?.createObjectURL === 'function' && typeof ''.isWellFormed === 'function' &&
    typeof ''.normalize === 'function' && typeof host.Intl?.NumberFormat === 'function';
  if (!supported) { get('unsupported').hidden = false; get('unsupported').textContent = words.unsupported; return null; }
  const numberFormat = new host.Intl.NumberFormat(words.locale, { maximumFractionDigits: 3 });
  const amount = value => numberFormat.format(Number(value) / 1000);
  const integer = value => numberFormat.format(value);
  let controller, mealSequence = 0, pendingAction = null, previousResult = null;

  function element(tag, text, className) {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = '') {
    const node = element('button', text, className); node.type = 'button';
    node.addEventListener('click', () => protect(action)); return node;
  }
  function protect(action) {
    try { action(); } catch (error) { controller.invalidate(); controller.session.fail(error); refresh('error'); }
  }
  const io = {
    createReader: () => new host.FileReader(),
    decodeUTF8: buffer => new host.TextDecoder('utf-8', { fatal: true }).decode(buffer),
    createURL: (text, type) => host.URL.createObjectURL(new host.Blob([text], { type })),
    revokeURL: url => host.URL.revokeObjectURL(url),
    setTimeout: (fn, delay) => host.setTimeout(fn, delay), clearTimeout: timer => host.clearTimeout(timer),
    writeClipboard: text => {
      if (!host.navigator?.clipboard?.writeText) return Promise.reject(new Error('UNAVAILABLE'));
      return host.navigator.clipboard.writeText(text);
    },
    startDownload: (url, filename) => {
      const anchor = element('a'); anchor.href = url; anchor.download = filename;
      anchor.hidden = true; doc.body.append(anchor); anchor.click(); anchor.remove();
    },
  };
  controller = new Controller({ io, onChange: refresh });
  function project() { return controller.session.project; }
  function hasData() { return project().meals.length > 0 || project().stock.length > 0; }
  function updatePrimary() {
    const ids = ['calculate', 'download-txt', 'confirm-yes', 'confirm-import', 'cancel-import'];
    for (const id of ids) get(id).className = '';
    const session = controller.session;
    const id = pendingAction ? 'confirm-yes' : session.pending ? 'confirm-import' : session.state === 'running' ? 'cancel-import' : session.result ? 'download-txt' : 'calculate';
    get(id).className = 'primary';
  }
  function closeConfirmation() { pendingAction = null; get('confirm-area').hidden = true; updatePrimary(); }
  function confirm(message, label, action, origin) {
    pendingAction = { action, origin }; get('confirm-message').textContent = message;
    get('confirm-yes').textContent = label; get('confirm-area').hidden = false; updatePrimary(); get('confirm-no').focus();
  }
  function change(action, render = false) {
    closeConfirmation(); controller.edit(action); get('example-note').hidden = true;
    if (render) renderEditors();
  }
  function remove(action, origin, hasContents) {
    const perform = () => { change(action, true); get('add-meal').focus(); };
    if (hasContents) confirm(words.confirmRemove, words.remove, perform, origin); else perform();
  }
  function field(labelText, value, path, onInput, { options, inputMode, maximum, disabled = false } = {}) {
    const wrap = element('div', undefined, 'field');
    const id = `field-${path.replaceAll('.', '-')}`;
    const label = element('label', labelText); label.htmlFor = id;
    const control = element(options ? 'select' : 'input'); control.id = id; control.dataset.path = path;
    if (options) for (const [key, text] of options) { const option = element('option', text); option.value = key; control.append(option); }
    else { control.type = 'text'; control.autocomplete = 'off'; control.spellcheck = false; if (inputMode) control.inputMode = inputMode; if (maximum) control.maxLength = maximum; }
    control.value = value; control.disabled = disabled;
    const help = element('small', '', 'field-error'); help.id = `${id}-error`;
    control.setAttribute('aria-describedby', `${help.id}${inputMode ? ' quantity-help' : ''}`);
    control.addEventListener(options ? 'change' : 'input', () => protect(() => onInput(control.value)));
    wrap.append(label, control, help); return wrap;
  }
  function renderItem(item, path, deleteAction, inStock = false) {
    const row = element('div', undefined, 'ingredient-row');
    row.append(field(words.ingredient, item.ingredient, `${path}.ingredient`, value => change(() => { item.ingredient = value; }), { maximum: 240 }));
    row.append(field(words.quantity, item.quantity, `${path}.quantity`, value => change(() => { item.quantity = value; }), { inputMode: 'decimal' }));
    row.append(field(words.unit, item.unit, `${path}.unit`, value => {
      change(() => { item.unit = value; if (value !== 'customCount') item.unitLabel = ''; });
      const labelInput = doc.getElementById(`field-${path.replaceAll('.', '-')}-unitLabel`);
      labelInput.disabled = value !== 'customCount'; labelInput.value = item.unitLabel;
    }, { options: Object.entries(words.units) }));
    row.append(field(words.customUnit, item.unitLabel, `${path}.unitLabel`, value => change(() => { item.unitLabel = value; }), { maximum: 40, disabled: item.unit !== 'customCount' }));
    const removeButton = button(words.removeItem, () => remove(deleteAction, removeButton, Boolean(item.ingredient || item.quantity || item.unitLabel)), 'quiet remove');
    const rowNumber = Number(path.split('.').at(-1)) + 1;
    removeButton.setAttribute('aria-label', `${words.removeItem} — ${inStock ? words.stockRow : words.ingredient} ${rowNumber}`);
    row.append(removeButton); return row;
  }
  function focusPath(path) { doc.getElementById(`field-${path.replaceAll('.', '-')}`)?.focus(); }
  function newItem() { return { ingredient: '', quantity: '', unit: 'g', unitLabel: '' }; }
  function renderEditors() {
    const meals = get('meals'); meals.replaceChildren();
    if (!project().meals.length) meals.append(element('p', words.emptyMeals, 'empty'));
    project().meals.forEach((meal, m) => {
      const section = element('section', undefined, 'meal-section');
      const nameField = field(`${words.mealName} ${m + 1}`, meal.name, `meals.${m}.name`, value => change(() => { meal.name = value; }), { maximum: 240 });
      const header = element('div', undefined, 'meal-heading'); header.append(nameField);
      const removeMeal = button(words.removeMeal, () => remove(p => p.meals.splice(m, 1), removeMeal, Boolean(meal.name || meal.items.length)), 'quiet');
      header.append(removeMeal); section.append(header);
      meal.items.forEach((item, i) => section.append(renderItem(item, `meals.${m}.items.${i}`, () => meal.items.splice(i, 1))));
      const add = button(words.addItem, () => { const index = meal.items.length; change(() => meal.items.push(newItem()), true); focusPath(`meals.${m}.items.${index}.ingredient`); });
      add.disabled = requirementCount() >= LIMITS.requirements; section.append(add); meals.append(section);
    });
    const stock = get('stock'); stock.replaceChildren();
    if (!project().stock.length) stock.append(element('p', words.emptyStock, 'empty'));
    project().stock.forEach((item, i) => stock.append(renderItem(item, `stock.${i}`, p => p.stock.splice(i, 1), true)));
    updateCounts();
  }
  function requirementCount() { return project().meals.reduce((n, meal) => n + meal.items.length, 0); }
  function updateCounts() {
    get('counts').textContent = `${words.mealCount} ${integer(project().meals.length)}/${integer(LIMITS.meals)} · ${words.requirementCount} ${integer(requirementCount())}/${integer(LIMITS.requirements)} · ${words.stockCount} ${integer(project().stock.length)}/${integer(LIMITS.stock)}`;
    get('add-meal').disabled = project().meals.length >= LIMITS.meals || requirementCount() >= LIMITS.requirements;
    get('add-stock').disabled = project().stock.length >= LIMITS.stock;
    get('calculate').disabled = requirementCount() + project().stock.length === 0;
  }
  function showError(markFields = true) {
    for (const input of workspace.querySelectorAll('[data-path]')) {
      input.removeAttribute('aria-invalid');
      const help = doc.getElementById(`${input.id}-error`); if (help) help.textContent = '';
    }
    const error = controller.session.error;
    get('error-message').hidden = !error;
    if (!error) return;
    const message = words.errors[error.code] ?? words.errors.UNEXPECTED;
    get('error-message').textContent = `${words.invalid} ${message}`;
    if (markFields && error.path) {
      const input = [...workspace.querySelectorAll('[data-path]')].find(node => node.dataset.path === error.path);
      if (input) { input.setAttribute('aria-invalid', 'true'); doc.getElementById(`${input.id}-error`).textContent = message; }
    }
  }
  function sourceDetails(row) {
    const details = element('details', undefined, 'sources'); details.append(element('summary', words.sources));
    const totals = element('dl', undefined, 'totals');
    for (const [name, value] of [[words.required, row.required], [words.available, row.available], [words.deducted, row.used], [words.surplus, row.surplus]]) totals.append(element('dt', name), element('dd', `${amount(value)} ${row.unit}`));
    details.append(totals);
    const list = element('ul');
    for (const source of row.sources) list.append(element('li', `${words.fromMeal} ${source.mealName}: ${source.quantity} ${source.unit === 'customCount' ? source.unitLabel : source.unit} = ${amount(source.amount)} ${row.unit}`));
    for (const source of row.stockSources) list.append(element('li', `${words.stockRow} ${source.row}: ${source.quantity} ${source.unit === 'customCount' ? source.unitLabel : source.unit} = ${amount(source.amount)} ${row.unit}`));
    details.append(list); return details;
  }
  function resultRow(row, buy) {
    const section = element('section', undefined, 'result-row');
    const heading = element('div', undefined, 'result-heading');
    if (buy) {
      const label = element('label', undefined, 'purchase');
      const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = controller.session.checked.has(row.key);
      checkbox.setAttribute('aria-label', `${words.purchased}: ${row.ingredient}, ${amount(row.buy)} ${row.unit}`);
      checkbox.addEventListener('change', () => controller.mark(row.key, checkbox.checked));
      label.append(checkbox, element('span', row.ingredient)); heading.append(label);
    } else heading.append(element('h3', row.ingredient));
    heading.append(element('strong', `${amount(buy ? row.buy : row.surplus)} ${row.unit}`, 'measured'));
    section.append(heading);
    section.append(element('p', `${words.dimensions[row.dimension]} · ${row.unit}`, 'muted'));
    if (!buy) section.append(element('p', `${words.required} ${amount(row.required)} ${row.unit} · ${words.surplus} ${amount(row.surplus)} ${row.unit}`, 'muted'));
    if (row.unitConflict) section.append(element('p', words.conflict, 'notice warning'));
    section.append(sourceDetails(row)); return section;
  }
  function renderResults() {
    const result = controller.session.result, target = get('results'); target.replaceChildren();
    if (!result) { target.append(element('p', words.idle, 'empty')); return; }
    const buySection = element('section'); buySection.append(element('h2', `${words.buyHeading} (${integer(result.buy.length)})`));
    if (!result.buy.length) buySection.append(element('p', words.noPurchase, 'notice success'));
    for (const row of result.buy) buySection.append(resultRow(row, true)); target.append(buySection);
    for (const [title, rows] of [[words.enoughHeading, result.enough], [words.unmatchedHeading, result.unmatchedStock]]) {
      const details = element('details', undefined, 'result-group'); details.append(element('summary', `${title} (${integer(rows.length)})`));
      if (!rows.length) details.append(element('p', words.none));
      for (const row of rows) details.append(resultRow(row, false)); target.append(details);
    }
    target.append(element('p', words.progressNote, 'muted'));
  }
  function renderImport() {
    const pending = controller.session.pending;
    get('import-preview').hidden = !pending;
    const content = get('preview-content'); content.replaceChildren();
    if (!pending) return;
    content.append(element('p', `${words.mealCount}: ${pending.meals.length} · ${words.requirementCount}: ${pending.meals.reduce((n, meal) => n + meal.items.length, 0)} · ${words.stockCount}: ${pending.stock.length}`));
    const preview = element('pre'); preview.textContent = serializePreview(pending); content.append(preview);
  }
  function serializePreview(value) { return JSON.stringify(value, null, 2); }
  function refresh(kind) {
    const session = controller.session;
    get('status').textContent = session.state === 'error' ? words.invalid : words[session.state] ?? words.editing;
    if (kind === 'cancel') get('status').textContent = words.importCancelled;
    if (kind === 'download') get('status').textContent = words.downloadRequested;
    if (kind === 'copied') get('status').textContent = words.copied;
    if (kind === 'copy-fallback') get('status').textContent = words.copyFallback;
    get('copy-text').value = '';
    get('copy-fallback').hidden = kind !== 'copy-fallback';
    if (kind === 'copy-fallback' && session.result) get('copy-text').value = controller.exportText('txt', words);
    get('copy').disabled = !session.result || kind === 'copying';
    get('export-panel').hidden = !session.result;
    get('download-txt').disabled = !session.result;
    get('download-report').disabled = !session.result;
    get('cancel-import').hidden = session.state !== 'running';
    get('import-file').setAttribute('aria-busy', session.state === 'running' ? 'true' : 'false');
    if (session.result !== previousResult) { renderResults(); previousResult = session.result; }
    get('progress').hidden = !session.result;
    get('progress').textContent = session.result ? `${integer(session.result.buy.length - session.checked.size)} ${words.remaining} · ${words.purchased} ${integer(session.checked.size)}` : '';
    renderImport(); showError(!['import', 'preview'].includes(kind)); updateCounts(); updatePrimary();
  }

  get('add-meal').addEventListener('click', () => protect(() => {
    if (project().meals.length >= LIMITS.meals) throw new InputError('MEAL_LIMIT');
    if (requirementCount() >= LIMITS.requirements) throw new InputError('REQUIREMENT_LIMIT');
    let id; do { id = `dish-${++mealSequence}`; } while (project().meals.some(meal => meal.id === id));
    const index = project().meals.length;
    change(p => p.meals.push({ id, name: '', items: [newItem()] }), true); focusPath(`meals.${index}.name`);
  }));
  get('add-stock').addEventListener('click', () => protect(() => {
    if (project().stock.length >= LIMITS.stock) throw new InputError('STOCK_LIMIT');
    const index = project().stock.length; change(p => p.stock.push(newItem()), true); focusPath(`stock.${index}.ingredient`);
  }));
  get('calculate').addEventListener('click', () => protect(() => {
    closeConfirmation(); controller.calculate();
    if (controller.session.error) workspace.querySelector('[aria-invalid="true"]')?.focus();
  }));
  get('clear').addEventListener('click', () => { closeConfirmation(); controller.clear(); get('import-file').value = ''; get('example-note').hidden = true; renderEditors(); get('add-meal').focus(); });
  get('example').addEventListener('click', () => {
    function load() {
      const item = (ingredient, quantity, unit = 'g') => ({ ingredient, quantity, unit, unitLabel: '' });
      controller.replace({ schema: 1, meals: [
        { id: 'example-1', name: words.sampleMeal1, items: [item(words.sampleRice, '500'), item(words.sampleEgg, '3', 'piece')] },
        { id: 'example-2', name: words.sampleMeal2, items: [item(words.sampleRice, '0.75', 'kg'), item(words.sampleMilk, '500', 'ml'), item(words.sampleMilk, '500', 'g')] },
      ], stock: [item(words.sampleRice, '300'), item(words.sampleEgg, '5', 'piece')] });
      renderEditors(); get('example-note').textContent = words.exampleNotice; get('example-note').hidden = false; get('status').textContent = words.exampleStatus;
    }
    if (hasData()) confirm(words.confirmExample, words.replace, load, get('example')); else load();
  });
  for (const [id, kind] of [['download-txt', 'txt'], ['download-report', 'report'], ['download-project', 'project']]) get(id).addEventListener('click', () => controller.download(kind, words));
  get('copy').addEventListener('click', () => { void controller.copy(words); });
  get('import-file').addEventListener('change', () => {
    closeConfirmation(); const file = get('import-file').files?.[0];
    if (file) controller.beginImport(file); get('import-file').value = '';
  });
  get('cancel-import').addEventListener('click', () => controller.cancelImport());
  get('dismiss-import').addEventListener('click', () => controller.cancelImport());
  get('confirm-import').addEventListener('click', () => { controller.confirmImport(); renderEditors(); get('example-note').hidden = true; get('status').textContent = words.imported; get('add-meal').focus(); });
  get('confirm-no').addEventListener('click', () => { const origin = pendingAction?.origin; closeConfirmation(); origin?.focus(); });
  get('confirm-yes').addEventListener('click', () => { const action = pendingAction?.action; closeConfirmation(); if (action) protect(action); });
  get('lang-link').addEventListener('click', event => {
    if (!hasData()) return;
    event.preventDefault(); confirm(words.confirmLanguage, words.switchLanguage, () => { host.location.assign(get('lang-link').getAttribute('href')); }, get('lang-link'));
  });
  host.addEventListener('pagehide', () => {
    closeConfirmation(); previousResult = null; controller.dispose(); get('import-file').value = '';
    get('copy-text').value = ''; get('example-note').textContent = ''; get('progress').textContent = '';
    get('preview-content').replaceChildren(); get('meals').replaceChildren(); get('stock').replaceChildren(); get('results').replaceChildren();
  }, { once: true });
  host.addEventListener('pageshow', event => { if (event.persisted && controller.disposed) host.location.reload(); });
  renderEditors(); renderResults(); refresh('init'); workspace.disabled = false; get('unsupported').hidden = true;
  return controller;
}

if (typeof document !== 'undefined') {
  try { boot(document, globalThis); }
  catch { const notice = document.getElementById('unsupported'); notice.hidden = false; notice.textContent = document.documentElement.lang === 'en' ? en.unsupported : zh.unsupported; }
}
