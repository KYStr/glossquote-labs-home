import { inspectUrl, composeUrl, trackingRowIds, MAX_UNITS, MAX_ROWS } from './core/url.mjs';
import { messages, translator } from './i18n.mjs';

const locale = document.documentElement.lang;
const t = translator(locale), errors = (messages[locale] ?? messages.en).errors;
const byId = id => document.getElementById(id);
const source = byId('source'), output = byId('result'), status = byId('status');
let model = null, edits = new Map(), removed = new Set(), additions = [], nextAddition = 0;
let revision = 0, outputRevision = -1, copySequence = 0;
const downloads = new Map();
const controlText = value => value.replaceAll('\r', '␍').replaceAll('\n', '␊\n').replaceAll('\t', '⇥');
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
function announce(text, kind = '') { status.textContent = text; status.dataset.kind = kind; }
function revokeDownloads() {
  for (const [url, timer] of downloads) { clearTimeout(timer); URL.revokeObjectURL(url); }
  downloads.clear();
}
function invalidate(note = t('pending')) {
  revision++; outputRevision = -1; copySequence++;
  output.value = ''; byId('changed').textContent = '';
  byId('copy').disabled = true; byId('download').disabled = true;
  byId('draft-note').textContent = note;
  byId('copy').textContent = byId('copy').dataset.label;
  revokeDownloads(); announce('');
}
function resetModel() {
  model = null; edits = new Map(); removed = new Set(); additions = []; nextAddition = 0;
  byId('rows').replaceChildren(); byId('raw-source').textContent = ''; byId('parsed').replaceChildren();
  byId('workspace').hidden = true; byId('inspection').hidden = true;
  byId('generate').disabled = true; byId('add').disabled = true; byId('tracking').disabled = true;
  byId('row-count').textContent = '';
}
function sourceChanged() {
  invalidate(t('reinspect')); resetModel(); byId('source-error').textContent = '';
  source.removeAttribute('aria-invalid');
  if (source.value.length > MAX_UNITS) { byId('source-error').textContent = errors.SOURCE_LIMIT; source.setAttribute('aria-invalid', 'true'); }
  byId('inspect').classList.add('primary'); byId('generate').classList.remove('primary');
}
source.addEventListener('input', sourceChanged);
function showParsed() {
  byId('raw-source').textContent = model.source;
  for (const [name, value] of Object.entries(model.parsed)) {
    byId('parsed').append(element('dt', byId('parsed').dataset[name]), element('dd', value === '' ? '∅' : value));
  }
  byId('inspection').hidden = false;
}
function renderRows() {
  const list = byId('rows'); list.replaceChildren();
  byId('empty-rows').hidden = model.rows.length + additions.length > 0;
  byId('row-count').textContent = t('rows', model.rows.length + additions.length);
  byId('add').disabled = model.rows.length + additions.length >= MAX_ROWS;
  const rows = [...model.rows, ...additions.map((pair, index) => ({ ...pair, added: true, index: model.rows.length + index, decodedKey: pair.key, decodedValue: pair.value, decodeError: false }))];
  for (const row of rows) {
    const n = row.index + 1, title = t(row.added ? 'added' : 'row', n);
    const li = element('li', undefined, 'parameter-row'); li.dataset.id = row.id;
    const fieldset = element('fieldset'); fieldset.append(element('legend', title));
    const pair = element('div', undefined, 'pair');
    const inputs = {}, initial = {};
    const draft = row.added ? row : edits.get(row.id) ?? { key: row.decodedKey, value: row.decodedValue };
    let controlMarkers = null;
    const markerText = () => {
      const current = row.added ? additions.find(a => a.id === row.id) : edits.get(row.id) ?? { key: row.decodedKey, value: row.decodedValue };
      return current ? t('controls') + '\n' + t('key') + ': ' + controlText(current.key) + '\n' + t('value') + ': ' + controlText(current.value) : '';
    };
    for (const field of ['key', 'value']) {
      const group = element('div'); const id = `edit-${row.id}-${field}`;
      const label = element('label', t(field)); label.htmlFor = id;
      const input = element('textarea'); input.id = id; input.rows = 2; input.spellcheck = false; input.autocomplete = 'off';
      input.setAttribute('aria-label', `${title}: ${t(field)}`);
      input.value = row.decodeError ? '' : row[field === 'key' ? 'decodedKey' : 'decodedValue']; initial[field] = input.value;
      input.value = row.decodeError ? '' : draft[field];
      input.disabled = row.decodeError || removed.has(row.id); inputs[field] = input;
      input.addEventListener('input', () => {
        invalidate();
        if (row.added) additions.find(a => a.id === row.id)[field] = input.value;
        else if (inputs.key.value === initial.key && inputs.value.value === initial.value) edits.delete(row.id);
        else edits.set(row.id, {
          key: inputs.key.value === initial.key ? row.decodedKey : inputs.key.value,
          value: inputs.value.value === initial.value ? row.decodedValue : inputs.value.value
        });
        if (controlMarkers) controlMarkers.textContent = markerText();
      });
      group.append(label, input); pair.append(group);
    }
    if (row.added) {
      const remove = element('button', t('removeAdded', n)); remove.type = 'button';
      remove.addEventListener('click', () => { invalidate(); additions = additions.filter(a => a.id !== row.id); renderRows(); byId('add').focus(); }); pair.append(remove);
    } else {
      const label = element('label', undefined, 'removal'); const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = removed.has(row.id);
      checkbox.setAttribute('aria-label', `${title}: ${t('remove')}`);
      label.append(checkbox, element('span', t('remove'))); pair.append(label);
      if (removed.has(row.id)) li.classList.add('selected');
      checkbox.addEventListener('change', () => {
        invalidate(); if (checkbox.checked) removed.add(row.id); else removed.delete(row.id);
        li.classList.toggle('selected', checkbox.checked);
        for (const input of Object.values(inputs)) input.disabled = checkbox.checked || row.decodeError;
      });
    }
    fieldset.append(pair);
    if (!row.added) {
      if (row.decodeError) fieldset.append(element('p', t('undecodable'), 'row-note error'));
      const details = element('details'); details.append(element('summary', t('raw')), element('pre', row.raw === '' ? t('emptyRaw') : row.raw));
      fieldset.append(details);
      if (!row.decodeError && /[\r\n\t]/u.test(row.decodedKey + row.decodedValue)) {
        controlMarkers = element('pre', markerText(), 'control-data'); fieldset.append(controlMarkers);
        if (/\r/u.test(row.decodedKey + row.decodedValue)) fieldset.append(element('p', t('crNotice'), 'hint'));
      }
    }
    li.append(fieldset); list.append(li);
  }
}
byId('inspect').addEventListener('click', () => {
  invalidate(''); resetModel(); byId('source-error').textContent = ''; source.removeAttribute('aria-invalid');
  try {
    model = inspectUrl(source.value); showParsed(); renderRows();
    byId('workspace').hidden = false; byId('generate').disabled = false; byId('tracking').disabled = model.rows.length === 0;
    byId('inspect').classList.remove('primary'); byId('generate').classList.add('primary');
    announce(t('inspected')); byId('workspace-title').focus();
  } catch (error) { byId('source-error').textContent = errors[error.code] ?? errors.UNKNOWN; source.setAttribute('aria-invalid', 'true'); source.focus(); }
});
byId('add').addEventListener('click', () => {
  if (!model || model.rows.length + additions.length >= MAX_ROWS) return;
  invalidate(); const id = `a${nextAddition++}`; additions.push({ id, key: '', value: '' }); renderRows(); byId(`edit-${id}-key`).focus();
});
byId('tracking').addEventListener('click', () => {
  if (!model) return;
  const ids = trackingRowIds(model); invalidate(); for (const id of ids) removed.add(id); renderRows(); announce(t('selected', ids.length));
});
byId('generate').addEventListener('click', () => {
  if (!model) return;
  invalidate('');
  try {
    const result = composeUrl(model, edits, removed, additions);
    output.value = result.url; outputRevision = revision;
    byId('changed').textContent = t('changed', result.changedRows);
    byId('copy').disabled = false; byId('download').disabled = false;
    announce(t('generated'), 'success'); output.focus();
  } catch (error) { announce(errors[error.code] ?? errors.UNKNOWN, 'error'); }
});
byId('copy').addEventListener('click', async () => {
  if (outputRevision !== revision || !output.value) return;
  const capturedRevision = revision, sequence = ++copySequence, url = output.value;
  byId('copy').disabled = true; byId('copy').textContent = t('copying');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
    await navigator.clipboard.writeText(url);
    if (capturedRevision === revision && sequence === copySequence) announce(t('copied'), 'success');
  } catch {
    if (capturedRevision === revision && sequence === copySequence) { announce(t('copyFailed'), 'error'); output.focus(); output.select(); }
  } finally {
    if (capturedRevision === revision && sequence === copySequence) { byId('copy').disabled = false; byId('copy').textContent = byId('copy').dataset.label; }
  }
});
byId('download').addEventListener('click', () => {
  if (outputRevision !== revision || !output.value) return;
  let url, anchor;
  try {
    revokeDownloads(); url = URL.createObjectURL(new Blob([output.value + '\n'], { type: 'text/plain;charset=utf-8' }));
    downloads.set(url, setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 30_000));
    anchor = element('a'); anchor.href = url; anchor.download = 'glossquote-url.txt'; anchor.hidden = true; document.body.append(anchor); anchor.click();
    announce(t('downloaded'), 'success');
  } catch { if (url) revokeDownloads(); announce(t('downloadFailed'), 'error'); }
  finally { anchor?.remove(); }
});
byId('clear').addEventListener('click', () => {
  source.value = ''; sourceChanged(); byId('draft-note').textContent = ''; announce(t('cleared')); source.focus();
});
byId('example').addEventListener('click', () => { source.value = 'https://example.com/page?utm_source=demo&tag=A&tag=B#details'; sourceChanged(); source.focus(); });
window.addEventListener('pagehide', () => { source.value = ''; invalidate(''); resetModel(); });
window.addEventListener('pageshow', event => { if (event.persisted) sourceChanged(); });
for (const id of ['inspect', 'clear', 'example']) byId(id).disabled = false;
