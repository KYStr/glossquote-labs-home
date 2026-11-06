// DOM layer for the CSS Specificity Comparator (SPEC §2/§5).
// Renders exclusively with textContent / createTextNode; user input is never
// serialized as HTML. No network, storage, clipboard, or download APIs.

import { formatSummary } from './core.mjs';
import {
  createSession, setField, compare, reset, setLanguage, setGrammarOpen,
  hideResults,
} from './controller.mjs';
import { TEXTS } from './texts.mjs';

const initialLang = document.documentElement.lang &&
  document.documentElement.lang.toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';
const session = createSession(initialLang);

const els = {
  langLink: document.getElementById('lang-link'),
  left: document.getElementById('left-input'),
  right: document.getElementById('right-input'),
  compareBtn: document.getElementById('compare-btn'),
  resetBtn: document.getElementById('reset-btn'),
  status: document.getElementById('status'),
  errorSummary: document.getElementById('error-summary'),
  errorList: document.getElementById('error-list'),
  result: document.getElementById('result'),
  cmpProse: document.getElementById('cmp-prose'),
  firstDiff: document.getElementById('first-diff-value'),
  summary: document.getElementById('summary-text'),
  leftTriple: document.getElementById('left-triple'),
  rightTriple: document.getElementById('right-triple'),
  leftTree: document.getElementById('left-tree'),
  rightTree: document.getElementById('right-tree'),
  grammar: document.getElementById('grammar'),
};

function texts() { return TEXTS[session.lang]; }

function lookup(table, dotted) {
  let cur = table;
  for (const part of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function fmtTriple(v) { return '(' + v[0] + ',' + v[1] + ',' + v[2] + ')'; }

function collectI18n(rootEl, out) {
  if (rootEl.getAttribute && rootEl.getAttribute('data-i18n')) out.push(rootEl);
  const kids = rootEl.children || [];
  for (const kid of kids) collectI18n(kid, out);
  return out;
}

function applyTexts() {
  const t = texts();
  for (const el of collectI18n(document.body, [])) {
    const value = lookup(t, el.getAttribute('data-i18n'));
    if (value !== undefined) el.textContent = value;
  }
  els.langLink.textContent = t.langName;
  els.langLink.setAttribute('href', t.langHref);
  document.title = t.title;
  document.documentElement.lang = session.lang === 'en' ? 'en' : 'zh-Hant';
  const meta = document.getElementById('meta-desc');
  if (meta) meta.setAttribute('content', t.metaDesc);
}

function buildTree(node, raw) {
  const t = texts();
  const ul = document.createElement('ul');
  const li = document.createElement('li');
  const label = document.createElement('span');
  const slice = raw.slice(node.start, node.end);
  label.textContent =
    lookup(t, 'kinds.' + node.kind) + ' "' + slice + '" ' + fmtTriple(node.specificity);
  li.appendChild(label);
  if (node.kind === 'where') {
    const note = document.createElement('span');
    note.setAttribute('class', 'where-note');
    note.textContent = ' ' + t.whereNote;
    li.appendChild(note);
  }
  if (node.children && node.children.length > 0) {
    const childList = document.createElement('ul');
    for (const child of node.children) childList.appendChild(buildTree(child, raw).firstChild);
    li.appendChild(childList);
  }
  ul.appendChild(li);
  return ul;
}

function renderErrors() {
  const t = texts();
  els.errorList.replaceChildren();
  if (session.errors.length === 0) {
    els.errorSummary.hidden = true;
    return;
  }
  els.errorSummary.hidden = false;
  for (const err of session.errors) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    const fieldLabel = err.field === 'left' ? t.fieldLeft : t.fieldRight;
    const desc = lookup(t, 'errors.' + err.code) || err.code;
    link.setAttribute('href', err.field === 'left' ? '#left-input' : '#right-input');
    link.textContent = fieldLabel + ': ' + err.code + ' — ' + desc +
      (err.offset !== null && err.offset !== undefined ? ' (' + t.errAt + ' ' + err.offset + ')' : '');
    link.addEventListener('click', () => {
      (err.field === 'left' ? els.left : els.right).focus();
    });
    li.appendChild(link);
    if (err.offset !== null && err.offset !== undefined && err.field) {
      const raw = err.field === 'left' ? session.left : session.right;
      const ctx = document.createElement('span');
      ctx.setAttribute('class', 'err-context');
      const from = Math.max(0, err.offset - 10);
      const to = Math.min(raw.length, err.offset + 10);
      ctx.textContent = ' ' + t.errContext + ': "' + raw.slice(from, to) + '"';
      li.appendChild(ctx);
    }
    els.errorList.appendChild(li);
  }
}

function renderResult() {
  const t = texts();
  if (!session.result) {
    els.result.hidden = true;
    return;
  }
  const r = session.result;
  els.result.hidden = false;
  els.cmpProse.textContent =
    r.comparison === 'left' ? t.cmpLeft : r.comparison === 'right' ? t.cmpRight : t.cmpEqual;
  els.firstDiff.textContent = r.firstDifference === null ? 'none' : r.firstDifference;
  els.summary.value = formatSummary(r);
  els.leftTriple.textContent = fmtTriple(r.left.specificity);
  els.rightTriple.textContent = fmtTriple(r.right.specificity);
  els.leftTree.replaceChildren(buildTree(r.left.tree, r.left.raw));
  els.rightTree.replaceChildren(buildTree(r.right.tree, r.right.raw));
}

function render() {
  if (els.left.value !== session.left) els.left.value = session.left;
  if (els.right.value !== session.right) els.right.value = session.right;
  const t = texts();
  els.status.textContent =
    session.phase === 'result' ? t.statusResult :
    session.phase === 'invalid' ? t.statusInvalid :
    session.phase === 'dirty' ? t.statusDirty : t.statusIdle;
  if (els.grammar.open !== session.grammarOpen) els.grammar.open = session.grammarOpen;
  renderErrors();
  renderResult();
}

els.left.addEventListener('input', () => { setField(session, 'left', els.left.value); render(); });
els.right.addEventListener('input', () => { setField(session, 'right', els.right.value); render(); });
els.compareBtn.addEventListener('click', () => {
  const outcome = compare(session);
  render();
  if (outcome.focusField === 'left') els.left.focus();
  else if (outcome.focusField === 'right') els.right.focus();
});
els.resetBtn.addEventListener('click', () => { reset(session); render(); });
els.grammar.addEventListener('toggle', () => { setGrammarOpen(session, els.grammar.open); });
els.langLink.addEventListener('click', (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const target = session.lang === 'en' ? 'zh' : 'en';
  const destination = texts().langHref; // the clicked link's own target page
  setLanguage(session, target);
  history.pushState(null, '', destination);
  applyTexts();
  render();
  els.langLink.focus();
});
window.addEventListener('pagehide', () => { hideResults(session); render(); });
window.addEventListener('pageshow', () => { hideResults(session); render(); });

render();
