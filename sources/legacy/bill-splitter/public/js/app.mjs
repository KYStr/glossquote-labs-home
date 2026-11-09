import { calculatePaidSettlement, calculateQuickSettlement } from './core/split.mjs';
import { formatAmount } from './core/money.mjs';
import { buildReport } from './core/report.mjs';
import { messages } from './i18n.mjs';

const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const t = messages[locale], byId = id => document.getElementById(id), form = byId('bill-form');
let nextId = 1, people = [], revision = 0, result = null, resultRevision = -1;
let workflow = 'quick';
const downloads = new Map();
const errorDescriptions = new Map();
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function releaseDownloads() {
  for (const [url, timer] of downloads) { clearTimeout(timer); URL.revokeObjectURL(url); }
  downloads.clear();
}
function clearErrors() {
  for (const [field, original] of errorDescriptions) {
    if (original === null) field.removeAttribute('aria-describedby');
    else field.setAttribute('aria-describedby', original);
  }
  errorDescriptions.clear();
  byId('form-error').textContent = '';
  for (const node of form.querySelectorAll('[aria-invalid]')) node.removeAttribute('aria-invalid');
  for (const node of form.querySelectorAll('.field-error')) node.textContent = '';
}
function invalidate(message = t.changed) {
  revision++; result = null; resultRevision = -1;
  releaseDownloads(); clearErrors();
  byId('result-content').replaceChildren(); byId('report').value = '';
  byId('output').hidden = true; byId('empty-result').hidden = false; byId('empty-result').textContent = message;
  byId('copy').disabled = true; byId('download').disabled = true;
  byId('output-status').textContent = ''; byId('draft-state').textContent = message;
  byId('calculation-status').textContent = '';
}
function person() { const id = nextId++; return { id, name: `${t.person} ${id}`, weight: '1', paid: '0' }; }
function field(row, key, label, value, numeric = false) {
  const wrapper = el('div', undefined, `person-field ${key}-field`), id = `${key}-${row.id}`;
  const caption = el('label', label); caption.htmlFor = id;
  const input = el('input'); input.id = id; input.name = id; input.type = 'text'; input.value = value; input.autocomplete = 'off';
  input.dataset.personId = String(row.id); input.dataset.field = key;
  if (numeric) { input.inputMode = key === 'weight' ? 'numeric' : 'decimal'; input.className = 'amount'; }
  if (key === 'paid') { input.maxLength = 32; input.placeholder = '0'; }
  if (key === 'name') input.maxLength = 80;
  const error = el('p', '', 'field-error'); error.id = `${id}-error`; input.setAttribute('aria-describedby', error.id);
  wrapper.append(caption, input, error);
  if (key === 'weight') wrapper.hidden = workflow === 'quick' || byId('mode').value !== 'shares';
  return wrapper;
}
function renderPeople() {
  const fragment = document.createDocumentFragment();
  for (const row of people) {
    const group = el('fieldset', undefined, 'person-row'); group.append(el('legend', `#${row.id}`, 'person-number'));
    group.append(field(row, 'name', t.name, row.name), field(row, 'weight', t.weight, row.weight, true), field(row, 'paid', t.paid, row.paid, true));
    const remove = el('button', t.remove, 'remove-button'); remove.type = 'button'; remove.disabled = people.length <= 2;
    remove.title = people.length <= 2 ? t.minimum : `${t.remove} #${row.id}`; remove.setAttribute('aria-label', `${t.remove} #${row.id}`);
    remove.addEventListener('click', () => {
      if (people.length <= 2) return;
      const index = people.findIndex(p => p.id === row.id);
      invalidate(); people = people.filter(p => p.id !== row.id); renderPeople(); byId(`name-${people[Math.min(index, people.length - 1)].id}`).focus();
    });
    group.append(remove); fragment.append(group);
  }
  byId('people').replaceChildren(fragment); byId('people-count').textContent = `${people.length} ${t.count}`;
  byId('add-person').disabled = people.length >= 50; byId('people-limit').textContent = people.length >= 50 ? t.maximum : people.length <= 2 ? t.minimum : '';
}
function renderMode() {
  const quick = workflow === 'quick';
  byId('workflow-quick').checked = quick; byId('workflow-advanced').checked = !quick;
  byId('advanced-options').hidden = quick;
  byId('quick-help').hidden = !quick;
  form.dataset.workflow = workflow;
  byId('calculate').textContent = quick ? t.quickCalculate : t.advancedCalculate;
  byId('example').textContent = quick ? t.quickExampleButton : t.advancedExampleButton;
  renderPeople();
}
function draft() {
  if (workflow === 'quick') return { precision: Number(byId('precision').value), people: people.map(({id,name,paid}) => ({id,name,paid})) };
  return { precision: Number(byId('precision').value), mode: byId('mode').value, people: people.map(p => ({ ...p })) };
}
function showSettlement(value, content, amount) {
  content.append(el('h3', t.settlement));
  if (!value.transfers.length) content.append(el('p', value.total === 0n ? t.quickZero : t.none));
  else { const list = el('ul', undefined, 'transfers'); for (const tr of value.transfers) { const from = value.people[tr.fromIndex], to = value.people[tr.toIndex]; list.append(el('li', `#${from.id} ${from.name} ${t.pays} #${to.id} ${to.name} ${amount(tr.amount)}`)); } content.append(list); }
}
function showResult(value) {
  const amount = n => formatAmount(n, value.precision, locale), content = byId('result-content');
  const quick = value.workflow === 'quick';
  showSettlement(value, content, amount);
  content.append(el('p', `${t.quickTotal} ${amount(value.total)}`, 'result-total'));
  content.append(el('p', `${value.people.length} ${t.count}`, 'hint'));
  value.people.forEach((p, i) => {
    const row = el('div', undefined, 'result-row');
    row.append(el('span', `#${p.id} ${p.name}`, 'result-name'), el('span', `${quick ? t.quickDue : t.due} ${amount(p.share)}`, 'result-amount'));
    if (value.settlement) { const balance = value.balances[i]; row.append(el('span', `${t.paid} ${amount(p.paid)}`, 'result-detail'), el('span', `${balance > 0n ? t.receive : balance < 0n ? t.owe : t.even} ${amount(balance < 0n ? -balance : balance)}`, 'result-detail')); }
    content.append(row);
  });
  content.append(el('p', t.rule, 'hint'));
  byId('report').value = buildReport(value, locale); byId('empty-result').hidden = true; byId('output').hidden = false;
  byId('copy').disabled = false; byId('download').disabled = false; byId('draft-state').textContent = t.complete; byId('calculation-status').textContent = t.complete;
}
form.addEventListener('input', event => {
  invalidate(); const target = event.target;
  if (target.dataset.personId) { const row = people.find(p => p.id === Number(target.dataset.personId)); if (row && ['name', 'weight', 'paid'].includes(target.dataset.field)) row[target.dataset.field] = target.value; }
});
form.addEventListener('change', event => {
  invalidate();
  if (event.target.id === 'workflow-quick' || event.target.id === 'workflow-advanced') {
    if (event.target.checked) { workflow = event.target.id === 'workflow-quick' ? 'quick' : 'advanced'; renderMode(); }
  } else if (event.target.id === 'mode') renderPeople();
});
form.addEventListener('submit', event => {
  event.preventDefault(); invalidate('');
  try { const value = workflow === 'quick' ? calculateQuickSettlement(draft()) : calculatePaidSettlement(draft()); result = value; resultRevision = revision; showResult(value); }
  catch (error) {
    let message = t[error.code] ?? t.INPUT_SCHEMA;
    if (error.details?.amount !== undefined) message = message.replace('{amount}', formatAmount(error.details.amount, Number(byId('precision').value), locale));
    byId('form-error').textContent = message; byId('draft-state').textContent = message; byId('empty-result').textContent = workflow === 'quick' ? t.quickInitial : t.initial; byId('calculation-status').textContent = message;
    // Group errors point to a real, visible control rather than a non-focusable div.
    let field = byId(error.fieldId);
    if (error.fieldId === 'people') {
      const key = error.code === 'PAID_TOTAL_MAX' ? 'paid' : error.code === 'WEIGHTS_ZERO' ? 'weight' : 'name';
      field = byId(`${key}-${people[0]?.id}`);
    }
    if (field && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(field.tagName.toUpperCase())) {
      const fieldError = byId(`${field.id}-error`);
      if (fieldError) fieldError.textContent = message;
      const original = field.getAttribute('aria-describedby');
      errorDescriptions.set(field, original);
      const descriptions = new Set((original ?? '').split(/\s+/).filter(Boolean));
      descriptions.add(fieldError?.id ?? 'form-error');
      field.setAttribute('aria-describedby', [...descriptions].join(' '));
      field.setAttribute('aria-invalid', 'true'); field.focus();
    } else byId('form-error').focus();
  }
});
byId('add-person').addEventListener('click', () => { if (people.length >= 50) return; invalidate(); const row = person(); people.push(row); renderPeople(); byId(`name-${row.id}`).focus(); });
function reset() {
  invalidate(workflow === 'quick' ? t.quickInitial : t.initial);
  nextId = 1; people = [person(), person(), person()]; form.reset(); renderMode();
  byId('name-1').focus();
}
byId('clear').addEventListener('click', () => { reset(); byId('calculation-status').textContent = workflow === 'quick' ? t.quickCleared : t.cleared; });
byId('example').addEventListener('click', () => {
  invalidate(); nextId = 1;
  const names = locale === 'en' ? ['Alice','Bob','Charlie'] : ['甲','乙','丙'], previous = people;
  people = names.map((name, i) => ({ ...person(), name, paid: ['900','300','0'][i], weight: workflow === 'quick' ? previous[i]?.weight ?? '1' : ['2','1','1'][i] }));
  byId('precision').value = '2';
  if (workflow === 'advanced') byId('mode').value = 'shares';
  renderMode(); byId('name-1').focus(); byId('draft-state').textContent = workflow === 'quick' ? t.quickExample : t.example;
});
byId('copy').addEventListener('click', async () => {
  if (!result || resultRevision !== revision) return;
  const capturedRevision = revision, capturedResult = result, report = buildReport(result, locale);
  byId('copy').disabled = true; byId('output-status').textContent = t.copyBusy;
  try { await navigator.clipboard.writeText(report); if (revision !== capturedRevision || result !== capturedResult) return; byId('output-status').textContent = t.copyDone; }
  catch { if (revision !== capturedRevision || result !== capturedResult) return; byId('output-status').textContent = t.copyFail; byId('report').focus(); byId('report').select(); }
  finally { if (revision === capturedRevision && result === capturedResult) byId('copy').disabled = false; }
});
byId('download').addEventListener('click', () => {
  if (!result || resultRevision !== revision) return;
  let url, anchor;
  try {
    url = URL.createObjectURL(new Blob([buildReport(result, locale)], { type: 'text/plain;charset=utf-8' }));
    anchor = el('a'); anchor.href = url; anchor.download = 'glossquote-split.txt'; document.body.append(anchor); anchor.click(); anchor.remove();
    downloads.set(url, setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 30000)); byId('output-status').textContent = t.downloadDone;
  } catch { if (url) URL.revokeObjectURL(url); byId('output-status').textContent = t.downloadFail; }
  finally { anchor?.remove(); }
});
window.addEventListener('pagehide', () => { reset(); releaseDownloads(); });
people = [person(), person(), person()]; renderMode();
