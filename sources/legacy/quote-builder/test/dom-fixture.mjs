// Minimal in-memory event/element fixture. No layout, browser, file picker,
// actual downloads, storage panel, or browser API compatibility is simulated.
export class ElementFixture {
  constructor(tag, owner) { this.tagName = tag.toUpperCase(); this.ownerDocument = owner; this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.dataset = {}; this.value = ''; this._text = ''; this.className = ''; this.hidden = false; }
  set id(value) { this.attributes.set('id', value); }
  get id() { return this.attributes.get('id') || ''; }
  set href(value) { this.attributes.set('href', value); }
  get href() { return this.attributes.get('href'); }
  set textContent(value) { this.children = []; this._text = String(value); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...children) { for (const child of children) { this.children.push(child); child.parentElement = this; } }
  replaceChildren(...children) { this.children = []; this._text = ''; this.append(...children); }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  dispatch(type, extra = {}) {
    const event = { type, target: this, currentTarget: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const callback of this.listeners.get(type) || []) callback(event);
    return event;
  }
  focus() { this.ownerDocument.activeElement = this; }
  reset() { for (const control of this.querySelectorAll('input,textarea')) control.value = ''; }
  querySelectorAll(selector) {
    const matches = node => selector.split(',').some(part => part.startsWith('.') ? node.className.split(' ').includes(part.slice(1)) : part.startsWith('[') ? node.attributes.has(part.slice(1, -1)) : node.tagName === part.toUpperCase());
    const found = [];
    function walk(node) { for (const child of node.children) { if (matches(child)) found.push(child); walk(child); } }
    walk(this); return found;
  }
}

export function documentFixture(html) {
  const doc = { activeElement: null, createdTags: [] };
  doc.createElement = tag => { doc.createdTags.push(tag); return new ElementFixture(tag, doc); };
  const root = new ElementFixture('fixture-root', doc);
  const stack = [root];
  const ids = new Set();
  for (const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)([^>]*)>/gi)) {
    const [, closing, tag, attributes] = match;
    if (closing) {
      if (stack.at(-1).tagName !== tag.toUpperCase()) throw new Error(`UNBALANCED_TAG:${tag}`);
      stack.pop(); continue;
    }
    const node = new ElementFixture(tag, doc);
    for (const attribute of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) node.setAttribute(attribute[1], attribute[2]);
    node.className = node.getAttribute('class') || '';
    node.hidden = /\bhidden\b/.test(attributes);
    node.value = node.getAttribute('value') || '';
    if (node.id) { if (ids.has(node.id)) throw new Error('DUPLICATE_ID'); ids.add(node.id); }
    if (tag === 'html') { doc.documentElement = node; node.lang = node.getAttribute('lang'); }
    stack.at(-1).append(node);
    if (!['meta', 'link', 'input', 'br', 'hr'].includes(tag)) stack.push(node);
  }
  if (stack.length !== 1) throw new Error('UNCLOSED_TAG');
  doc.getElementById = id => {
    function find(node) { if (node.id === id) return node; for (const child of node.children) { const found = find(child); if (found) return found; } return null; }
    return find(root);
  };
  doc.root = root;
  const events = new Map();
  const win = { addEventListener(type, callback) { events.set(type, callback); }, dispatch(type) { events.get(type)?.(); } };
  return { doc, win };
}
