// Small offline DOM/browser service double. It runs the shipped app handlers;
// it is not evidence of a native clipboard, browser download, or real BFCache.
import { mountReadingPlan } from '../../public/js/app.mjs';
import { input } from './fixtures.mjs';

class Target {
  listeners = new Map();
  addEventListener(type, fn) { const fns = this.listeners.get(type) ?? []; fns.push(fn); this.listeners.set(type, fns); }
  emit(type, extra = {}) {
    const event = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...extra };
    this.lastEvent = event;
    return this.listeners.get(type)?.map(fn => fn(event)) ?? [];
  }
}
class Element extends Target {
  constructor(doc, tag = 'div') { super(); this.doc = doc; this.tagName = tag; this.children = []; this.value = ''; this.hidden = false; this.dataset = {}; this.attrs = {}; this.disabled = false; this.open = false; this._text = ''; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(text) { this._text = text; this.children = []; }
  replaceChildren(...nodes) { this._text = ''; this.children = nodes; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key, value) { this.attrs[key] = value; }
  removeAttribute(key) { delete this.attrs[key]; }
  focus() { this.doc.activeElement = this; }
  select() { this.selectionStart = 0; this.selectionEnd = this.value.length; }
  click() { if (this.tagName === 'a') this.doc.downloads.push({ href: this.href, download: this.download }); if (!this.disabled) this.emit('click'); }
  remove() { this.removed = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function harness(locale = 'en', writeText, { mount = true } = {}) {
  const ids = ['reading-form', 'input-controls', 'result', 'result-title', 'book-name', 'result-note', 'summary', 'schedule', 'report', 'exports', 'status', 'copy', 'copy-status', 'download', 'download-status', 'clear-dialog', 'date-mode', 'date-help', 'date-mode-error', 'create', 'clear', 'errors', 'keep-data', 'confirm-clear', 'titleRaw', 'totalPagesRaw', 'completedPagesRaw', 'startDateRaw', 'endDateRaw', 'dailyCapRaw', 'weekdays'];
  for (const field of ['titleRaw', 'totalPagesRaw', 'completedPagesRaw', 'startDateRaw', 'endDateRaw', 'weekdays', 'dailyCapRaw']) ids.push(`${field}-error`);
  const doc = { documentElement: { lang: locale }, elements: {}, downloads: [], activeElement: null };
  for (const id of ids) { doc.elements[id] = new Element(doc); doc.elements[id].id = id; }
  const boxes = Array.from({ length: 7 }, (_, i) => Object.assign(new Element(doc, 'input'), { name: 'weekday', value: String(i + 1), checked: i < 5 }));
  doc.body = new Element(doc, 'body');
  doc.getElementById = (id) => { if (!doc.elements[id]) throw new Error(`MISSING_HARNESS_ELEMENT ${id}`); return doc.elements[id]; };
  doc.querySelectorAll = () => boxes;
  doc.createElement = (tag) => new Element(doc, tag);
  const win = new Target(); win.navigator = { clipboard: writeText ? { writeText } : undefined }; win.Blob = Blob;
  const created = new Map(); const revoked = []; const timers = new Map(); let seq = 0;
  win.URL = { createObjectURL(blob) { const url = `blob:fake-${++seq}`; created.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); } };
  win.setTimeout = (callback, delay) => { const timer = ++seq; timers.set(timer, { callback, delay }); return timer; };
  win.clearTimeout = (timer) => timers.delete(timer);
  doc.elements['input-controls'].disabled = true; doc.elements.create.disabled = true;
  if (mount) mountReadingPlan(doc, win);
  const el = doc.getElementById;
  function set(field, value, extra = {}) { el(field).value = value; el('reading-form').emit('input', { target: el(field), ...extra }); }
  function fill(changes = {}) { const v = input(changes); for (const [field, value] of Object.entries(v)) if (field !== 'weekdays') set(field, value); boxes.forEach(b => { b.checked = v.weekdays.includes(Number(b.value)); }); el('reading-form').emit('change', { target: boxes[0] }); }
  function submit() { return el('reading-form').emit('submit'); }
  function click(id) { return el(id).emit('click'); }
  return { doc, win, el, boxes, created, revoked, timers, set, fill, submit, click };
}
