import { createPackingState, createDownloadManager } from './state.mjs';
import { exportBackup, MAX_ROWS } from './core/packing-list.mjs';
import { createI18n } from './i18n.mjs';

const language = document.documentElement.lang;
const { copy, number, error } = createI18n(language);
let state = createPackingState();
const downloads = createDownloadManager();
const byId = id => document.getElementById(id);
const rowsElement = byId('rows');
const controls = new Map();
const status = message => { byId('status').textContent = message; };
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const rowName = (row, index) => row.nameRaw.trim() || copy.fallback(index + 1);

function field(row, index, key, label, numeric) {
  const wrapper = element('div', undefined, `field ${key}`);
  const id = `${row.id}-${key}`;
  const input = element('input');
  input.type = 'text';
  input.id = id;
  input.value = row[key];
  input.autocomplete = 'off';
  if (numeric) input.inputMode = 'numeric';
  const labelNode = element('label', `${label} ${index + 1}`);
  labelNode.htmlFor = id;
  const errorNode = element('p', undefined, 'field-error');
  errorNode.id = `${id}-error`;
  errorNode.hidden = true;
  input.setAttribute('aria-describedby', errorNode.id);
  input.addEventListener('input', () => {
    sourceChanged(() => state.edit(row.id, key, input.value));
  });
  wrapper.append(labelNode, input, errorNode);
  return { wrapper, input, errorNode };
}

function renderRows() {
  controls.clear();
  rowsElement.replaceChildren();
  const { draft } = state.view();
  for (const [index, row] of draft.rows.entries()) {
    const section = element('section', undefined, 'item-row');
    section.dataset.rowId = row.id;
    const heading = element('h3', rowName(row, index), 'row-heading');
    heading.id = `${row.id}-heading`;
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading);
    const fields = {};
    for (const [key, label, numeric] of [
      ['nameRaw', copy.name, false], ['quantityRaw', copy.quantity, true], ['unitWeightGramsRaw', copy.weight, true]
    ]) {
      fields[key] = field(row, index, key, label, numeric);
      section.append(fields[key].wrapper);
    }
    const weightHint = element('span', copy.unknown, 'weight-state');
    weightHint.id = `${row.id}-weight-state`;
    fields.unitWeightGramsRaw.wrapper.append(weightHint);
    fields.unitWeightGramsRaw.input.setAttribute('aria-describedby', `${fields.unitWeightGramsRaw.errorNode.id} ${weightHint.id}`);
    const packedLabel = element('label', undefined, 'packed-field');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.checked = row.packed;
    const packedText = element('span', copy.packed);
    packedLabel.append(checkbox, packedText);
    checkbox.addEventListener('change', () => {
      sourceChanged(() => state.edit(row.id, 'packed', checkbox.checked));
      if (state.view().filter === 'unpacked' && checkbox.checked) {
        const remaining = [...controls.values()].find(control => !control.section.hidden);
        (remaining?.checkbox ?? byId('add-item')).focus();
      }
    });
    const remove = element('button', copy.remove, 'quiet delete-item');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      const before = state.view().draft.rows.findIndex(item => item.id === row.id);
      sourceChanged(() => state.remove(row.id), true);
      const visible = [...controls.values()].filter(control => !control.section.hidden);
      (visible[Math.min(before, visible.length - 1)]?.remove ?? byId('add-item')).focus();
      status(copy.deleted);
    });
    section.append(packedLabel, remove);
    controls.set(row.id, { section, heading, fields, checkbox, packedText, remove, weightHint });
    rowsElement.append(section);
  }
}

function sourceChanged(action, rebuild = false) {
  const hadImport = ['reading', 'preview'].includes(state.view().importState);
  status('');
  action();
  byId('import-file').value = '';
  if (rebuild) renderRows();
  update();
  if (hadImport) status(copy.importInvalidated);
}

function addMetric(parent, label, value, prominent = false) {
  const wrapper = element('div', undefined, prominent ? 'weight-metric' : 'metric');
  wrapper.append(element('dt', label), element('dd', value));
  parent.append(wrapper);
}

function summaryContent(container, summary, preview = false) {
  container.replaceChildren();
  if (summary.rowCount === 0) {
    container.append(element('p', preview ? copy.previewEmpty : copy.emptySummary, 'muted'));
    return;
  }
  const metrics = element('dl', undefined, 'summary-metrics');
  addMetric(metrics, copy.rowCount, number(summary.rowCount));
  addMetric(metrics, copy.pieceCount, number(summary.pieceCount));
  addMetric(metrics, copy.packedRows, `${number(summary.packedRows)} / ${number(summary.rowCount)}`);
  addMetric(metrics, copy.packedPieces, `${number(summary.packedPieces)} / ${number(summary.pieceCount)}`);
  addMetric(metrics, summary.totalWeightGrams === null ? copy.subtotal : copy.total, `${number(summary.knownSubtotalGrams)} g`, true);
  container.append(metrics);
  if (!preview) {
    const progress = element('progress');
    progress.max = summary.rowCount;
    progress.value = summary.packedRows;
    const progressLabel = copy.progress(number(summary.packedRows), number(summary.rowCount), number(Math.round(summary.packedRows * 100 / summary.rowCount)));
    progress.setAttribute('aria-label', progressLabel);
    container.append(progress, element('p', progressLabel, 'help'));
  }
  if (summary.unknownWeightRows > 0) {
    container.append(element('p', copy.unknownDetail(number(summary.unknownWeightRows), number(summary.unknownWeightPieces)), 'unknown-notice'));
  }
  let text;
  let tone = 'limit-status';
  switch (summary.limitStatus) {
    case 'not-set': text = copy.notSet; break;
    case 'within': text = `✓ ${copy.within(number(summary.limitGrams))}`; break;
    case 'over': text = `! ${copy.over(number(summary.overByGrams))}`; tone += ' warning'; break;
    case 'over-known-minimum': text = `! ${copy.minimumOver(number(summary.minimumOverByGrams))}`; tone += ' warning'; break;
    case 'unknown-weight': text = `? ${copy.uncertain(number(summary.unknownWeightRows), number(summary.limitGrams))}`; tone += ' warning'; break;
  }
  if (text) container.append(element('p', text, tone));
}

function renderImport() {
  const { importState, importError, candidate } = state.view();
  byId('import-panel').hidden = importState === 'idle';
  byId('confirm-import').hidden = importState !== 'preview';
  byId('import-details').replaceChildren();
  byId('import-panel').setAttribute('aria-busy', String(importState === 'reading'));
  if (importState === 'reading') {
    byId('import-heading').textContent = copy.reading;
    byId('import-message').textContent = '';
  } else if (importState === 'error') {
    byId('import-heading').textContent = copy.importFailure;
    byId('import-message').textContent = error(importError);
  } else if (importState === 'preview') {
    byId('import-heading').textContent = copy.previewHeading;
    byId('import-message').textContent = copy.previewCount(number(candidate.preview.rowCount), number(candidate.preview.pieceCount));
    summaryContent(byId('import-details'), candidate.preview, true);
  } else {
    byId('import-heading').textContent = '';
    byId('import-message').textContent = '';
  }
}

function update() {
  const { draft, validation, filter, example } = state.view();
  for (const [index, row] of draft.rows.entries()) {
    const control = controls.get(row.id);
    const name = rowName(row, index);
    control.heading.textContent = name;
    control.checkbox.setAttribute('aria-label', `${copy.packed}: ${name}`);
    control.remove.setAttribute('aria-label', `${copy.remove}: ${name}`);
    control.section.hidden = filter === 'unpacked' && row.packed;
    control.section.classList.toggle('is-packed', row.packed);
    control.weightHint.textContent = /^[\u0009-\u000d\u0020]*$/.test(row.unitWeightGramsRaw) ? copy.unknown : copy.known;
    for (const field of Object.values(control.fields)) {
      field.input.removeAttribute('aria-invalid');
      field.errorNode.hidden = true;
      field.errorNode.textContent = '';
    }
  }
  byId('limit').removeAttribute('aria-invalid');
  byId('limit-error').hidden = true;
  byId('limit-error').textContent = '';
  if (!validation.ok) {
    for (const issue of validation.fieldErrors) {
      const field = issue.rowIndex === null ? { input: byId('limit'), errorNode: byId('limit-error') }
        : controls.get(draft.rows[issue.rowIndex].id).fields[issue.field];
      if (field) {
        field.input.setAttribute('aria-invalid', 'true');
        field.errorNode.textContent = error(issue.code, issue.field);
        field.errorNode.hidden = false;
      }
    }
    byId('summary').replaceChildren(element('p', `! ${copy.invalidSummary}`, 'field-error'));
  } else summaryContent(byId('summary'), validation.summary);
  byId('download').disabled = !validation.ok;
  byId('add-item').disabled = draft.rows.length >= MAX_ROWS;
  if (draft.rows.length >= MAX_ROWS) byId('row-limit').textContent = copy.maxRows;
  else byId('row-limit').textContent = language === 'en' ? 'Up to 100 rows. Checking a row marks all its pieces as packed.' : '最多 100 列；勾選一列代表該列全部數量已打包。';
  byId('empty-message').hidden = draft.rows.length > 0 && [...controls.values()].some(control => !control.section.hidden);
  byId('empty-message').textContent = draft.rows.length === 0 ? copy.empty : copy.filterEmpty;
  byId('example-notice').hidden = !example;
  byId('filter-all').setAttribute('aria-pressed', String(filter === 'all'));
  byId('filter-unpacked').setAttribute('aria-pressed', String(filter === 'unpacked'));
  renderImport();
}

byId('add-item').addEventListener('click', () => {
  sourceChanged(() => state.add(), true);
  const last = state.view().draft.rows.at(-1);
  if (last) controls.get(last.id).fields.nameRaw.input.focus();
  status(copy.added);
});
byId('limit').addEventListener('input', () => sourceChanged(() => state.limit(byId('limit').value)));
for (const [id, value] of [['filter-all', 'all'], ['filter-unpacked', 'unpacked']]) {
  byId(id).addEventListener('click', () => { state.setFilter(value); update(); });
}

let dialogAction = null;
let dialogInvoker = null;
function confirmAction(kind, action, invoker) {
  dialogAction = action;
  dialogInvoker = invoker;
  byId('dialog-title').textContent = copy[`${kind}Title`];
  byId('dialog-body').textContent = copy[`${kind}Body`];
  byId('dialog-confirm').textContent = copy[`${kind}Confirm`];
  byId('dialog-confirm').className = kind === 'reset' ? 'danger' : 'primary';
  byId('confirm-dialog').showModal();
  byId('dialog-cancel').focus();
}
byId('dialog-cancel').addEventListener('click', () => byId('confirm-dialog').close('cancel'));
byId('dialog-confirm').addEventListener('click', () => byId('confirm-dialog').close('confirm'));
byId('confirm-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  byId('confirm-dialog').close('cancel');
});
byId('confirm-dialog').addEventListener('close', () => {
  const action = dialogAction;
  dialogAction = null;
  const invoker = dialogInvoker;
  dialogInvoker = null;
  if (byId('confirm-dialog').returnValue === 'confirm') action?.();
  else status(copy.cancelled);
  invoker?.focus();
});
byId('load-example').addEventListener('click', event => {
  const load = () => {
    sourceChanged(() => state.loadExample(true, language), true);
    byId('limit').value = '';
    status(copy.exampleLoaded);
  };
  const draft = state.view().draft;
  if (draft.rows.length > 0 || draft.limitGramsRaw !== '') confirmAction('example', load, event.currentTarget);
  else load();
});
byId('reset').addEventListener('click', event => confirmAction('reset', () => {
  sourceChanged(() => state.reset(true), true);
  byId('limit').value = '';
  status(copy.resetDone);
}, event.currentTarget));

byId('import-file').addEventListener('change', async () => {
  const reading = state.readFile(byId('import-file').files[0]);
  byId('import-file').value = '';
  renderImport();
  const success = await reading;
  if (state.view().disposed) return;
  renderImport();
  if (success) status(copy.previewHeading);
  else if (state.view().importState === 'error') status(copy.importFailure);
});
// Supported native file-picker cancellation invalidates the preceding candidate too.
byId('import-file').addEventListener('cancel', () => {
  state.cancelImport(); renderImport(); status(copy.importCancelled);
});
byId('cancel-import').addEventListener('click', () => {
  state.cancelImport();
  renderImport();
  byId('import-file').focus();
  status(copy.importCancelled);
});
byId('confirm-import').addEventListener('click', () => {
  if (!state.confirmImport()) return;
  renderRows();
  byId('limit').value = state.view().draft.limitGramsRaw;
  update();
  byId('add-item').focus();
  status(copy.imported);
});
byId('download').addEventListener('click', () => {
  const result = exportBackup(state.view().draft);
  if (!result.ok) { update(); return; }
  const anchor = element('a');
  try {
    anchor.href = downloads.create(new Blob([result.json], { type: 'application/json;charset=utf-8' }));
    anchor.download = 'glossquote-packing-list.json';
    document.body.append(anchor);
    anchor.click();
    status(copy.downloaded);
  } catch { status(copy.downloadError); }
  finally { anchor.remove(); }
});

window.addEventListener('pagehide', () => {
  state.dispose();
  downloads.dispose();
  controls.clear();
  rowsElement.replaceChildren();
  byId('summary').replaceChildren();
  byId('import-details').replaceChildren();
  byId('import-message').textContent = '';
  byId('import-file').value = '';
  byId('limit').value = '';
  dialogAction = null;
  dialogInvoker = null;
});
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    state = createPackingState();
    if (byId('confirm-dialog').open) byId('confirm-dialog').close('cancel');
    renderRows(); update(); status('');
  }
});
renderRows();
update();
