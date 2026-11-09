import { mountApp } from '../public/js/app.js';

// A deliberately small offline DOM/platform model. This runs the real app module,
// but does not claim native Clipboard, files, rendering, IME or BFCache evidence.
class Element {
  constructor(document, tag) {
    this.document = document; this.tagName = tag.toUpperCase(); this.children = []; this.attributes = new Map(); this.events = new Map(); this.parentNode = null;
    this.id = ''; this.className = ''; this._text = '';
    for (const [key, initial] of [['value', ''], ['disabled', false], ['hidden', false], ['checked', false]]) {
      let current = initial;
      Object.defineProperty(this, key, { get: () => current, set: value => { current = value; document.writes++; } });
    }
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(text) { this._text = String(text); this.children = []; this.document.writes++; }
  append(...nodes) { for (const node of nodes) { if (node.parentNode) node.remove(); node.parentNode = this; this.children.push(node); } this.document.writes++; }
  replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this._text = ''; this.append(...nodes); }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; this.document.writes++; } }
  setAttribute(key, value) { this.attributes.set(key, String(value)); this.document.writes++; }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); this.document.writes++; }
  addEventListener(type, handler) { if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(handler); }
  fire(type, extra = {}) {
    if (type === 'click' && this.disabled) return;
    const event = { target: this, preventDefault() {}, ...extra };
    for (const handler of this.events.get(type) ?? []) handler(event);
  }
  focus() { if (!this.disabled) { this.document.activeElement = this; this.document.writes++; } }
  click() { if (this.tagName === 'A') this.document.downloads.push({ url: this.href, filename: this.download }); this.fire('click'); }
}
export function harness(locale = 'en', clipboard) {
  const document = { writes: 0, activeElement: null, documentElement: { lang: locale }, downloads: [] };
  document.body = new Element(document, 'body');
  document.createElement = tag => new Element(document, tag);
  document.getElementById = id => {
    const search = node => node.id === id ? node : node.children.map(search).find(Boolean);
    return search(document.body) ?? null;
  };
  const ids = ['timeline-form', 'start-time', 'target-time', 'target-next-day', 'activity-rows', 'add-activity', 'row-count', 'row-limit', 'clear-all', 'build-timeline', 'field-error', 'notice', 'empty-result', 'result', 'schedule-rows', 'schedule-summary', 'report', 'copy-report', 'download-report', 'download-help', 'language-link'];
  for (const id of ids) { const element = document.createElement(id === 'report' ? 'textarea' : 'div'); element.id = id; document.body.append(element); }
  const listeners = new Map();
  const window = {
    confirmations: [], answers: [], navigations: [],
    confirm(message) { this.confirmations.push(message); return this.answers.shift() ?? true; },
    location: { assign(url) { window.navigations.push(url); } },
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
    fire(type, extra = {}) { for (const callback of listeners.get(type) ?? []) callback(extra); }
  };
  let now = 0; let timerId = 0; let urlId = 0;
  const timers = new Map(); const urls = new Map(); const revoked = [];
  const platform = { document, window, navigator: { clipboard }, Blob,
    URL: { createObjectURL(blob) { const url = `blob:test-${++urlId}`; urls.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push({ url, at: now }); urls.delete(url); } },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  mountApp(platform, locale);
  const get = id => document.getElementById(id);
  const input = (id, value) => { const element = get(id); element.value = value; element.fire('input'); };
  const click = id => id === 'build-timeline' ? get('timeline-form').fire('submit') : get(id).click();
  const build = (name = 'A', duration = '1', start = '09:00') => { input('start-time', start); input('name-row-1', name); input('duration-row-1', duration); click('build-timeline'); };
  const advance = milliseconds => {
    const end = now + milliseconds;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].callback();
    }
    now = end;
  };
  function snapshot() {
    const serialize = node => ({ id: node.id, text: node._text, value: node.value, checked: node.checked, hidden: node.hidden, disabled: node.disabled, attributes: [...node.attributes], children: node.children.map(serialize) });
    return { dom: serialize(document.body), focus: document.activeElement?.id ?? null, timers: timers.size, urls: [...urls.keys()], revoked: [...revoked] };
  }
  return { document, window, get, input, click, build, advance, snapshot, timers, urls, revoked };
}
export function deferred() {
  let resolve; let reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
export async function flush() { for (let count = 0; count < 8; count++) await Promise.resolve(); }
