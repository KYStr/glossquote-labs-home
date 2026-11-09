// An intentionally small DOM double for app event/race tests. This does not
// emulate browser layout, native clipboard permissions, downloads or BFCache.
class Element {
  constructor(doc, tag) {
    this.doc = doc;
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.className = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.open = false;
    this.ownText = '';
  }
  set textContent(text) { this.ownText = String(text); this.replaceChildren(); }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { for (const child of this.children) child.parent = null; this.children = []; this.append(...children); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, callback) { const callbacks = this.listeners.get(name) ?? []; callbacks.push(callback); this.listeners.set(name, callbacks); }
  emit(name, properties = {}) {
    const event = { target: this, preventDefault() {}, ...properties };
    return Promise.all((this.listeners.get(name) ?? []).map(callback => callback(event)));
  }
  click() {
    if (this.disabled) return Promise.resolve();
    if (this.tagName === 'A') this.doc.downloads.push({ href: this.href, filename: this.download });
    return this.emit('click');
  }
  focus() { this.doc.activeElement = this; }
  select() { this.selected = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  querySelectorAll(selector) {
    const matches = element => selector.startsWith('.') ? element.className.split(' ').includes(selector.slice(1)) : element.attributes.has(selector.slice(1, -1));
    return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
}

export function createDOM(lang = 'en', clipboard) {
  const doc = {
    documentElement: { lang }, downloads: [],
    createElement(tag) { return new Element(doc, tag); },
    querySelectorAll(selector) { return this.body.querySelectorAll(selector); },
    getElementById(id) {
      const find = element => element.id === id ? element : element.children.map(find).find(Boolean);
      return find(this.body) ?? null;
    }
  };
  doc.body = new Element(doc, 'body');
  for (const id of ['budget-form', 'currency', 'currency-error', 'rows', 'add', 'calculate', 'example', 'clear', 'row-count', 'status', 'error-summary', 'results', 'summary', 'details', 'report', 'copy', 'download', 'download-status', 'export-status', 'confirm-dialog', 'dialog-title', 'dialog-text', 'cancel', 'confirm']) {
    const element = doc.createElement(id === 'report' ? 'textarea' : 'div');
    element.id = id;
    doc.body.append(element);
  }
  const target = new Element(doc, 'window');
  const blobs = new Map(); const revoked = []; const timers = new Map(); let number = 0;
  const win = {
    navigator: { clipboard }, Blob,
    URL: { createObjectURL(blob) { const url = `blob:fake-${++number}`; blobs.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); blobs.delete(url); } },
    setTimeout(callback, delay) { const id = ++number; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener: (...args) => target.addEventListener(...args),
    emit: (...args) => target.emit(...args)
  };
  return { doc, win, blobs, revoked, timers, get: id => doc.getElementById(id) };
}
