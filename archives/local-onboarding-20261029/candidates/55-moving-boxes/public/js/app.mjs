import { createController } from './controller.mjs';
import zh from './locales/zh-Hant.mjs';
import en from './locales/en.mjs';

const PAGE_SIZE = 50;
export function mountApp(doc, platform) {
  const t = doc.documentElement.lang === 'en' ? en : zh;
  const w = t.words;
  const number = value => new Intl.NumberFormat(t.locale).format(value);
  const get = id => doc.getElementById(id);
  const node = (tag, value = '', attributes = {}) => {
    const element = doc.createElement(tag);
    if (value !== '') element.textContent = value;
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  };
  const action = (parent, title, callback, attributes = {}) => {
    const button = node('button', title, { type: 'button', ...attributes });
    button.addEventListener('click', callback); parent.append(button); return button;
  };
  let selected = null;
  let searchPage = 0;
  let itemPage = 0;
  let itemEdit = null;
  let lastFieldIds = {};
  let lastOrigin = null;
  const marked = new Set();
  const boxDrafts = new Map();
  const addDrafts = new Map();
  const itemDrafts = new Map();
  const newBoxIds = { id: 'new-box-id', room: 'new-box-room', priority: 'new-box-priority', notes: 'new-box-notes' };
  const boxValue = ids => ({ id: get(ids.id).value, room: get(ids.room).value, priority: get(ids.priority).checked, notes: get(ids.notes).value });
  const blankItem = () => ({ name: '', quantity: '1', notes: '' });
  const isBlank = draft => !draft.name && draft.quantity === '1' && !draft.notes;
  const newBoxDirty = () => { const draft = boxValue(newBoxIds); return !!(draft.id || draft.room || draft.priority || draft.notes); };
  const hasDrafts = () => newBoxDirty() || boxDrafts.size > 0 || [...addDrafts.values()].some(value => !isBlank(value)) || itemDrafts.size > 0;
  let controller;
  const syncDirty = () => controller.setDraftDirty(hasDrafts());
  const draftChanged = () => controller.editDraft(hasDrafts());
  const focusError = () => { const current = [...marked][0]; if (current) current.focus(); };
  const showConfirmation = () => {
    const panel = get('confirmation');
    if (!panel.hidden) { if (doc.activeElement !== panel) lastOrigin = doc.activeElement; panel.focus(); }
  };
  const restoreOrigin = () => { if (lastOrigin?.isConnected) lastOrigin.focus(); else get('workspace').focus(); lastOrigin = null; };
  const clearDrafts = () => { boxDrafts.clear(); addDrafts.clear(); itemDrafts.clear(); itemEdit = null; get('new-box-form').reset(); };

  function renderStatus(view) {
    for (const element of marked) element.removeAttribute('aria-invalid');
    marked.clear();
    const message = t.errors[view.code];
    get('status').textContent = message ? w.invalid : (t.status[view.code] ?? t.status.EDITING);
    get('error').hidden = !message;
    get('error').textContent = message ? '! ' + message : '';
    if (message && view.field) {
      const key = view.field.split('.').at(-1);
      const input = get(view.field === 'query' ? 'search-input' : view.field === 'import' ? 'import-file' : lastFieldIds[key]);
      if (input) { input.setAttribute('aria-invalid', 'true'); marked.add(input); }
    }
    get('draft-notice').hidden = !view.dirty;
    get('draft-notice').textContent = view.dirty ? w.dirty : '';
    get('prepare-export').disabled = view.dirty || view.busy;
    get('download-export').disabled = !view.prepared || view.dirty || view.busy;
    get('download-export').className = view.prepared ? 'primary' : '';
    get('output-panel').hidden = !view.prepared;
    get('output-text').value = view.prepared?.text ?? '';
    get('output-filename').textContent = view.prepared ? w.filename + ': ' + view.prepared.filename : '';
    get('cancel-read').hidden = !view.busy;
    get('import-file').setAttribute('aria-busy', String(view.busy));
    renderConfirmation(view);
  }
  function renderConfirmation(view) {
    const pending = view.confirmation;
    get('confirmation').hidden = !pending;
    get('confirm-preview').replaceChildren();
    if (!pending) return;
    const importing = pending.kind === 'import' || pending.kind === 'example';
    get('confirm-heading').textContent = importing ? w.importHeading : w.deleteHeading;
    if (importing) {
      get('confirm-summary').textContent = w.incoming + ': ' + number(pending.boxes) + ' ' + w.boxes + ' / ' + number(pending.items) + ' ' + w.items + '. ' + w.existing + ': ' + number(pending.existingBoxes) + ' ' + w.boxes + ' / ' + number(pending.existingItems) + ' ' + w.items + '.';
      get('confirm-warning').textContent = (pending.kind === 'example' ? w.exampleWarning + ' ' : '') + w.replacement;
      for (const box of pending.preview) get('confirm-preview').append(node('li', box.id + ' · ' + box.room + ' · ' + number(box.items) + ' ' + w.items));
      get('confirm-action').textContent = w.confirmImport;
    } else {
      get('confirm-summary').textContent = pending.kind === 'box' ? w.box + ': ' + pending.id + ' · ' + number(pending.count) + ' ' + w.items : w.box + ': ' + pending.boxId + ' · ' + pending.name + ' · ' + w.quantity + ': ' + number(pending.quantity);
      get('confirm-warning').textContent = pending.kind === 'box' ? w.deleteBoxWarning : w.deleteItemWarning;
      get('confirm-action').textContent = pending.kind === 'box' ? w.confirmBox : w.confirmItem;
    }
  }
  function paginate(parent, total, current, change) {
    parent.replaceChildren();
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return;
    const previous = action(parent, w.previous, () => change(current - 1)); previous.disabled = current === 0;
    parent.append(node('span', w.page + ' ' + number(current + 1) + ' ' + w.of + ' ' + number(pages)));
    const next = action(parent, w.next, () => change(current + 1)); next.disabled = current + 1 >= pages;
  }
  function renderSearch(view) {
    const results = controller.search();
    searchPage = Math.min(searchPage, Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1));
    get('search-summary').textContent = (view.query.trim() ? w.searchTitle : w.allItems) + ' · ' + number(results.length) + ' ' + w.results;
    get('search-empty').textContent = !results.length ? (view.counts.items ? w.noMatches : w.noItems) : '';
    get('search-list').replaceChildren();
    for (const result of results.slice(searchPage * PAGE_SIZE, (searchPage + 1) * PAGE_SIZE)) {
      const row = node('li');
      const text = node('div'); text.append(node('strong', result.name), node('span', w.box + ': ' + result.boxId + ' · ' + result.room + ' · ' + w.quantity + ': ' + number(result.quantity) + (result.priority ? ' · ' + w.priority : '')));
      if (result.notes) text.append(node('p', result.notes, { class: 'help' }));
      row.append(text); action(row, w.openBox + ' ' + result.boxId, () => selectBox(result.boxId));
      get('search-list').append(row);
    }
    paginate(get('search-pagination'), results.length, searchPage, value => { searchPage = value; renderSearch(controller.view()); });
  }
  function selectBox(id) {
    selected = id; itemPage = 0; itemEdit = null;
    controller.editDraft(hasDrafts());
    renderProject(controller.view());
    get('workspace').focus();
  }
  function field(parent, id, label, value, { check = false, quantity = false, limit, required = false, onInput } = {}) {
    const group = node('div');
    const title = node('label', label + (limit ? ' (' + number(limit) + ' ' + w.fieldLimit + ')' : ''), { for: id });
    const input = node('input', '', { id, type: check ? 'checkbox' : 'text', autocomplete: 'off', 'aria-describedby': 'error' });
    if (check) { input.checked = value; title.className = 'check'; title.replaceChildren(input, node('span', label)); group.append(title); }
    else { input.value = value; if (limit) input.maxLength = limit * 2 + 100; if (quantity) { input.inputMode = 'numeric'; input.maxLength = 6; } input.required = required; group.append(title, input); }
    input.addEventListener(check ? 'change' : 'input', () => { onInput(check ? input.checked : input.value); draftChanged(); });
    parent.append(group); return input;
  }
  function itemFields(parent, prefix, draft, onInput) {
    const grid = node('div', '', { class: 'form-grid' }); parent.append(grid);
    const ids = { name: prefix + '-name', quantity: prefix + '-quantity', notes: prefix + '-notes' };
    field(grid, ids.name, w.name, draft.name, { limit: 120, required: true, onInput: value => { lastFieldIds = ids; onInput('name', value); } });
    field(grid, ids.quantity, w.quantity, draft.quantity, { quantity: true, required: true, onInput: value => { lastFieldIds = ids; onInput('quantity', value); } });
    field(parent, ids.notes, w.notes, draft.notes, { limit: 500, onInput: value => { lastFieldIds = ids; onInput('notes', value); } });
    return ids;
  }
  function renderWorkspace(view) {
    const root = get('workspace'); root.replaceChildren(); root.setAttribute('tabindex', '-1');
    const box = view.project.boxes.find(box => box.id === selected);
    if (!box) {
      const empty = node('div', '', { class: 'empty-state' }); empty.append(node('h2', w.emptyBoxes), node('p', w.emptyBoxHelp));
      action(empty, w.addBox, () => get('new-box-room').focus()); root.append(empty); return;
    }
    const heading = node('div', '', { class: 'box-heading' }); heading.append(node('h2', box.id, { class: 'box-id' }), node('span', box.room));
    if (box.priority) heading.append(node('span', '✓ ' + w.priority, { class: 'priority' }));
    root.append(heading, node('p', number(box.items.length) + ' ' + w.items, { class: 'muted' }));
    const details = node('details', '', { class: 'box-settings' }); details.append(node('summary', w.boxSettings));
    if (boxDrafts.has(box.id)) details.open = true;
    const form = node('form'); form.noValidate = true; details.append(form); root.append(details);
    const base = { id: box.id, room: box.room, priority: box.priority, notes: box.notes };
    const draft = boxDrafts.get(box.id) ?? { ...base };
    const ids = { id: 'edit-box-id', room: 'edit-box-room', priority: 'edit-box-priority', notes: 'edit-box-notes' };
    const change = (key, value) => { draft[key] = value; boxDrafts.set(box.id, draft); lastFieldIds = ids; };
    const grid = node('div', '', { class: 'form-grid' }); form.append(grid);
    field(grid, ids.id, w.box, draft.id, { limit: 40, required: true, onInput: value => change('id', value) });
    field(grid, ids.room, w.room, draft.room, { limit: 80, required: true, onInput: value => change('room', value) });
    field(form, ids.priority, w.priority, draft.priority, { check: true, onInput: value => change('priority', value) });
    field(form, ids.notes, w.notes, draft.notes, { limit: 500, onInput: value => change('notes', value) });
    form.append(node('p', w.boxHelp, { class: 'help' }));
    const settingsActions = node('div', '', { class: 'actions' }); form.append(settingsActions);
    settingsActions.append(node('button', w.saveBox, { type: 'submit' }));
    action(settingsActions, w.cancelEdit, () => { boxDrafts.delete(box.id); renderWorkspace(controller.view()); controller.editDraft(hasDrafts()); });
    form.addEventListener('submit', event => {
      event.preventDefault(); lastFieldIds = ids; boxDrafts.delete(box.id);
      selected = draft.id.normalize('NFC').trim();
      const pendingAdd = addDrafts.get(box.id);
      if (!controller.updateBox(box.id, draft)) { selected = box.id; boxDrafts.set(box.id, draft); focusError(); }
      else { if (pendingAdd) { addDrafts.set(selected, pendingAdd); if (selected !== box.id) addDrafts.delete(box.id); } renderProject(controller.view()); }
      syncDirty();
    });
    action(root, w.removeBox, () => { if (controller.requestDeleteBox(box.id)) showConfirmation(); }, { class: 'danger' });
    const list = node('ul', '', { class: 'item-list' }); root.append(list);
    if (!box.items.length) list.append(node('li', w.emptyItems, { class: 'help' }));
    itemPage = Math.min(itemPage, Math.max(0, Math.ceil(box.items.length / PAGE_SIZE) - 1));
    for (const item of box.items.slice(itemPage * PAGE_SIZE, (itemPage + 1) * PAGE_SIZE)) {
      const row = node('li', '', { class: 'item-row' });
      const top = node('div', '', { class: 'item-heading' }); top.append(node('strong', item.name), node('span', w.quantity + ': ' + number(item.quantity))); row.append(top);
      if (item.notes) row.append(node('p', item.notes, { class: 'item-notes' }));
      const actions = node('div', '', { class: 'actions' }); row.append(actions);
      action(actions, w.editItem, () => { itemEdit = item.id; renderWorkspace(controller.view()); get('item-' + item.id + '-name').focus(); }, { 'aria-label': w.editItem + ': ' + item.name });
      action(actions, w.removeItem, () => { controller.requestDeleteItem(box.id, item.id); showConfirmation(); }, { 'aria-label': w.removeItem + ': ' + item.name });
      if (itemEdit === item.id) {
        const editForm = node('form'); editForm.noValidate = true;
        const itemDraft = itemDrafts.get(item.id) ?? { name: item.name, quantity: String(item.quantity), notes: item.notes };
        const itemIds = itemFields(editForm, 'item-' + item.id, itemDraft, (key, value) => { itemDraft[key] = value; itemDrafts.set(item.id, itemDraft); });
        const editingActions = node('div', '', { class: 'actions' }); editForm.append(editingActions);
        editingActions.append(node('button', w.saveItem, { type: 'submit' }));
        action(editingActions, w.cancelEdit, () => { itemDrafts.delete(item.id); itemEdit = null; controller.editDraft(hasDrafts()); renderWorkspace(controller.view()); });
        editForm.addEventListener('submit', event => {
          event.preventDefault(); lastFieldIds = itemIds; itemDrafts.delete(item.id);
          if (!controller.updateItem(box.id, item.id, itemDraft)) { itemDrafts.set(item.id, itemDraft); focusError(); }
          else { itemEdit = null; renderWorkspace(controller.view()); }
          syncDirty();
        }); row.append(editForm);
      }
      const destinations = view.project.boxes.filter(other => other.id !== box.id);
      if (destinations.length) {
        const move = node('form', '', { class: 'move-form' });
        const group = node('div', '', { class: 'move-field' }); const selectId = 'move-' + item.id;
        group.append(node('label', w.target + ' · ' + item.name, { for: selectId }));
        const select = node('select', '', { id: selectId }); select.append(node('option', w.selectTarget, { value: '' }));
        for (const target of destinations) select.append(node('option', target.id + ' · ' + target.room, { value: target.id }));
        select.addEventListener('change', () => controller.editDraft(hasDrafts()));
        group.append(select); move.append(group, node('button', w.moveItem, { type: 'submit' }));
        move.addEventListener('submit', event => { event.preventDefault(); if (!select.value) { select.focus(); return; } controller.moveItem(box.id, item.id, select.value); syncDirty(); }); row.append(move);
      } else row.append(node('p', w.noDestination, { class: 'help' }));
      list.append(row);
    }
    const pagination = node('div', '', { class: 'actions' }); root.append(pagination);
    paginate(pagination, box.items.length, itemPage, value => { itemPage = value; renderWorkspace(controller.view()); });
    const addForm = node('form', '', { class: 'add-item' }); addForm.noValidate = true; addForm.append(node('h3', w.addItem), node('p', w.itemHelp, { class: 'help' }));
    const addDraft = addDrafts.get(box.id) ?? blankItem();
    const addIds = itemFields(addForm, 'add-item', addDraft, (key, value) => { addDraft[key] = value; addDrafts.set(box.id, addDraft); });
    const addActions = node('div', '', { class: 'actions' }); addForm.append(addActions);
    const addButton = node('button', w.addItem, { type: 'submit', class: 'primary' }); addButton.disabled = view.counts.items >= 1000; addActions.append(addButton);
    action(addActions, w.cancelEdit, () => { addDrafts.delete(box.id); controller.editDraft(hasDrafts()); renderWorkspace(controller.view()); });
    addForm.addEventListener('submit', event => {
      event.preventDefault(); lastFieldIds = addIds; addDrafts.delete(box.id);
      if (!controller.addItem(box.id, addDraft)) { addDrafts.set(box.id, addDraft); focusError(); }
      else { itemPage = Math.floor(box.items.length / PAGE_SIZE); renderWorkspace(controller.view()); get('add-item-name').focus(); }
      syncDirty();
    }); root.append(addForm);
  }
  function renderProject(view) {
    if (!view.project.boxes.some(box => box.id === selected)) selected = view.project.boxes[0]?.id ?? null;
    const existingIds = new Set(view.project.boxes.map(box => box.id));
    const itemIds = new Set(view.project.boxes.flatMap(box => box.items.map(item => item.id)));
    for (const id of [...boxDrafts.keys()]) if (!existingIds.has(id)) boxDrafts.delete(id);
    for (const id of [...addDrafts.keys()]) if (!existingIds.has(id)) addDrafts.delete(id);
    for (const id of [...itemDrafts.keys()]) if (!itemIds.has(id)) itemDrafts.delete(id);
    get('counts').textContent = number(view.counts.boxes) + ' ' + w.boxes + ' · ' + number(view.counts.items) + ' ' + w.items;
    get('box-index').replaceChildren(); get('box-select').replaceChildren();
    if (!view.project.boxes.length) get('box-select').append(node('option', w.emptyBoxes, { value: '' }));
    for (const box of view.project.boxes) {
      const title = box.id + ' · ' + box.room + ' · ' + number(box.items.length) + ' ' + w.items;
      get('box-select').append(node('option', title, { value: box.id }));
      const li = node('li'); const button = action(li, '', () => selectBox(box.id), { 'aria-current': String(selected === box.id) });
      button.append(node('span', box.id, { class: 'mono' }), node('span', box.room), node('span', number(box.items.length) + ' ' + w.items + (box.priority ? ' · ✓ ' + w.priority : ''), { class: 'help' })); get('box-index').append(li);
    }
    get('box-select').value = selected ?? '';
    get('add-box').disabled = view.counts.boxes >= 100;
    get('add-box').className = view.counts.boxes ? '' : 'primary';
    renderWorkspace(view); renderSearch(view); renderStatus(view);
  }

  try {
    if (!platform || typeof platform.Blob !== 'function' || typeof platform.FileReader !== 'function' || typeof platform.TextEncoder !== 'function' || typeof platform.TextDecoder !== 'function' || typeof platform.URL?.createObjectURL !== 'function' || typeof platform.URL?.revokeObjectURL !== 'function' || typeof ''.normalize !== 'function') throw new Error('UNSUPPORTED');
    controller = createController({ language: t.language,
      notify: (view, kind) => { if (kind === 'project') renderProject(view); else if (kind === 'search') { renderSearch(view); renderStatus(view); } else { renderStatus(view); if (kind === 'confirmation' && view.confirmation) showConfirmation(); } },
      createReader: () => new platform.FileReader(), makeBlob: (parts, options) => new platform.Blob(parts, options),
      createURL: blob => platform.URL.createObjectURL(blob), revokeURL: url => platform.URL.revokeObjectURL(url), setTimer: (callback, delay) => platform.setTimeout(callback, delay), clearTimer: id => platform.clearTimeout(id)
    });
    for (const id of Object.values(newBoxIds)) get(id).addEventListener(id.endsWith('priority') ? 'change' : 'input', () => { lastFieldIds = newBoxIds; draftChanged(); });
    get('new-box-form').addEventListener('submit', event => {
      event.preventDefault(); lastFieldIds = newBoxIds; const draft = boxValue(newBoxIds);
      if (controller.createBox(draft)) { get('new-box-form').reset(); const view = controller.view(); selected = view.project.boxes.at(-1).id; itemPage = 0; renderProject(view); get('add-item-name').focus(); }
      else focusError(); syncDirty();
    });
    get('reset-box').addEventListener('click', () => { get('new-box-form').reset(); draftChanged(); });
    get('box-select').addEventListener('change', () => selectBox(get('box-select').value));
    get('search-input').addEventListener('input', () => { searchPage = 0; controller.setQuery(get('search-input').value); get('search-results').open = true; });
    get('export-mode').addEventListener('change', () => controller.setMode(get('export-mode').value));
    get('prepare-export').addEventListener('click', () => { syncDirty(); controller.prepareExport(); });
    get('download-export').addEventListener('click', () => {
      const artifact = controller.download(); if (!artifact) return;
      const anchor = node('a', '', { href: artifact.url, download: artifact.filename }); anchor.hidden = true; doc.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
    });
    get('import-file').addEventListener('change', () => { controller.importFile(get('import-file').files?.[0]); get('import-file').value = ''; });
    get('import-text').addEventListener('input', () => controller.editDraft(hasDrafts()));
    get('parse-import').addEventListener('click', () => { controller.importText(get('import-text').value); showConfirmation(); });
    get('cancel-read').addEventListener('click', () => controller.cancel());
    get('load-example').addEventListener('click', () => { controller.loadExample(); showConfirmation(); });
    get('confirm-action').addEventListener('click', () => {
      const kind = controller.view().confirmation?.kind;
      if (kind === 'import' || kind === 'example') { clearDrafts(); selected = null; itemPage = 0; get('import-text').value = ''; }
      if (controller.confirm()) { renderProject(controller.view()); syncDirty(); restoreOrigin(); }
    });
    get('cancel-action').addEventListener('click', () => { controller.cancel(); restoreOrigin(); });
    get('clear-all').addEventListener('click', () => {
      clearDrafts(); selected = null; searchPage = 0; itemPage = 0; get('search-input').value = ''; get('import-text').value = ''; get('import-file').value = ''; get('language-confirmation').hidden = true; controller.clear();
    });
    get('language-link').addEventListener('click', event => { event.preventDefault(); get('language-confirmation').hidden = false; get('language-confirmation').focus(); });
    get('language-cancel').addEventListener('click', () => { get('language-confirmation').hidden = true; get('language-link').focus(); });
    platform.addEventListener('pagehide', () => { clearDrafts(); selected = null; lastOrigin = null; lastFieldIds = {}; get('import-text').value = ''; get('search-input').value = ''; get('import-file').value = ''; controller.clear(); get('workspace').replaceChildren(); get('box-index').replaceChildren(); get('box-select').replaceChildren(); get('search-list').replaceChildren(); get('confirm-preview').replaceChildren(); get('confirm-summary').textContent = ''; get('confirmation').hidden = true; get('output-text').value = ''; get('output-panel').hidden = true; get('download-export').disabled = true; get('application-controls').disabled = true; });
    platform.addEventListener('pageshow', event => { if (event.persisted) { get('application-controls').disabled = false; renderProject(controller.view()); } });
    get('application-controls').disabled = false;
    renderProject(controller.view());
    return controller;
  } catch {
    if (controller) controller.dispose();
    get('application-controls').disabled = true;
    get('error').hidden = false; get('error').textContent = t.errors.UNSUPPORTED;
    get('status').textContent = t.errors.UNSUPPORTED;
    return null;
  }
}
if (typeof document !== 'undefined' && typeof window !== 'undefined') mountApp(document, window);
