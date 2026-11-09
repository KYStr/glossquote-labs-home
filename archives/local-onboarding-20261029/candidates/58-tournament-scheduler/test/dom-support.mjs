// Offline structural event harness. It has no layout, browser, network, storage or download capability.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECT_ROOT, tokenizeHtml } from '../scripts/check.mjs';

class FakeElement {
  constructor(tag, doc) {
    this.tagName = tag;
    this.doc = doc;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = new Map();
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.rawText = '';
  }
  set textContent(value) { this.rawText = value; this.children = []; }
  get textContent() { return this.rawText + this.children.map(child => child.textContent).join(''); }
  get firstElementChild() { return this.children[0] ?? null; }
  append(...nodes) {
    for (const node of nodes) {
      if (node.tagName === '#fragment') this.append(...node.children);
      else { this.children.push(node); node.parent = this; }
    }
  }
  prepend(...nodes) { this.children.unshift(...nodes); }
  replaceChildren(...nodes) { this.rawText = ''; this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() { this.doc.activeElement = this; }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  fire(type, target = this) {
    const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const callback of this.listeners.get(type) ?? []) callback(event);
    return event;
  }
  click() { if (this.tagName === 'a') this.doc.downloadRequests.push({ href: this.href, download: this.download }); else this.fire('click'); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
}

export async function fakeDocument(locale) {
  const html = await readFile(join(PROJECT_ROOT, 'public', locale === 'en' ? 'en/index.html' : 'index.html'), 'utf8');
  const ids = new Map();
  const events = new Map();
  const doc = {
    documentElement: { lang: locale }, activeElement: null, createdTags: [], downloadRequests: [],
    getElementById: id => ids.get(id) ?? null,
    createElement(tag) { this.createdTags.push(tag); return new FakeElement(tag, this); },
    createDocumentFragment() { return new FakeElement('#fragment', this); },
    defaultView: { addEventListener(type, fn) { events.set(type, fn); } },
    firePageHide() { events.get('pagehide')(); }
  };
  doc.body = new FakeElement('body', doc);
  for (const { tag, attrs } of tokenizeHtml(html)) if (attrs.id) {
    const element = new FakeElement(tag, doc);
    element.id = attrs.id;
    element.attributes = { ...attrs };
    element.value = attrs.value ?? '';
    element.hidden = Object.hasOwn(attrs, 'hidden');
    element.disabled = Object.hasOwn(attrs, 'disabled');
    ids.set(attrs.id, element);
  }
  ids.get('cycles').value = '1';
  ids.get('schedule-form').reset = () => {
    for (const id of ['teams', 'startDate', 'startTime', 'matchMinutes', 'changeoverMinutes']) ids.get(id).value = '';
    ids.get('cycles').value = '1';
    ids.get('courts').value = '2';
  };
  return doc;
}

export function descendants(element, tag) {
  return element.children.flatMap(child => [...(child.tagName === tag ? [child] : []), ...descendants(child, tag)]);
}
