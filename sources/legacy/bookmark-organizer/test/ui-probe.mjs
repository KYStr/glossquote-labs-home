// A deliberately small in-memory call probe. No HTML engine, layout, browser, or OS input.
export class ProbeElement {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase(); this.document = document; this.children = []; this.attributes = {}; this.listeners = {}; this._text = ''; this._value = undefined; this.id = ''; this.hidden = false; this.disabled = false;
    this.classList = { add: name => { this.className = `${this.className ?? ''} ${name}`; } };
  }
  set textContent(value) { this.children = []; this._text = String(value); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set value(value) { this._value = value; }
  get value() { return this._value ?? (this.tagName === 'SELECT' ? this.options[0]?.value ?? '' : ''); }
  get options() { return this.children.filter(child => child.tagName === 'OPTION'); }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this._text = ''; this._value = undefined; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
  dispatch(type) { for (const listener of this.listeners[type] ?? []) listener({ preventDefault() {} }); }
  focus() { this.document.activeElement = this; }
  click() { if (this.tagName === 'A') this.document.downloads.push({ href: this.href, download: this.download }); this.dispatch('click'); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
}
export function probeDocument(html, lang) {
  const document = { documentElement: { lang }, downloads: [], activeElement: null };
  document.body = new ProbeElement('body', document);
  document.createElement = tag => new ProbeElement(tag, document);
  document.getElementById = id => {
    const visit = node => node.id === id ? node : node.children.map(visit).find(Boolean);
    return visit(document.body) ?? null;
  };
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const node = document.createElement(match[1]); node.id = match[2]; document.body.append(node);
  }
  document.getElementById('view-mode').value = 'all';
  return document;
}
