// Offline integration fixture: actual app.mjs ESM + minimal DOM + controlled clipboard promises.
// Not a browser, native clipboard, or BFCache simulation claim.
import { setImmediate } from 'node:timers/promises';

let fixtureSequence = 0;
class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  emit(type, data = {}) {
    const event = { type, target: this, isTrusted: false, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...data };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
    return event;
  }
}

class Element extends Events {
  constructor(document, tagName, id = '') {
    super();
    this.document = document;
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.dataset = {};
    this.attributes = {};
    this.disabled = false;
    this.hidden = false;
    this.selectionStart = 0;
    this.selectionEnd = 0;
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node.tagName === '#FRAGMENT') this.children.push(...node.children);
      else this.children.push(node);
    }
  }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
  querySelectorAll(selector) {
    if (selector !== 'button') throw new Error('UNSUPPORTED_FIXTURE_SELECTOR');
    return this.descendants().filter(element => element.tagName === 'BUTTON');
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  focus() { this.document.activeElement = this; this.document.focusCalls += 1; }
  select() { this.document.selectionCalls += 1; this.selectionStart = 0; this.selectionEnd = this.value.length; }
  setSelectionRange(start, end) { this.document.selectionCalls += 1; this.selectionStart = start; this.selectionEnd = end; }
}

function makeDocument(language) {
  const document = { documentElement: { lang: language }, activeElement: null, focusCalls: 0, selectionCalls: 0 };
  const ids = ['chunk-form', 'source', 'limit', 'mode', 'split', 'clear', 'status', 'chunks', 'result-summary', 'empty', 'pagination', 'page-choice', 'previous', 'next', 'source-error', 'limit-error', 'mode-error', 'source-count', 'page-range', 'results'];
  const roots = new Map(ids.map(id => [id, new Element(document, id === 'source' ? 'textarea' : ['split', 'clear', 'previous', 'next'].includes(id) ? 'button' : 'div', id)]));
  document.getElementById = id => roots.get(id) ?? [...roots.values()].flatMap(root => root.descendants()).find(element => element.id === id) ?? null;
  document.createElement = tag => new Element(document, tag);
  document.createDocumentFragment = () => new Element(document, '#fragment');
  return document;
}

export const flushCallbacks = () => setImmediate();

export async function loadAppFixture(language) {
  const document = makeDocument(language);
  const window = new Events();
  const requests = [];
  const clipboard = {
    writeText(text) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      requests.push({ text, resolve, reject });
      return promise;
    }
  };
  const names = ['document', 'window', 'navigator'];
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries({ document, window, navigator: { clipboard } })) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const restore = () => {
    for (const name of names) {
      const descriptor = descriptors.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  };
  try {
    const url = new URL('../public/js/app.mjs', import.meta.url);
    url.searchParams.set('offline-integration-fixture', String(++fixtureSequence));
    await import(url.href); // Production module is executed without rewriting its source.
  } catch (error) { restore(); throw error; }

  const element = id => document.getElementById(id);
  const chunks = () => element('chunks').descendants().filter(node => node.tagName === 'TEXTAREA');
  const copyButtons = () => element('chunks').querySelectorAll('button');
  return {
    document, window, requests, element, chunks, copyButtons,
    input(id, value) { const control = element(id); control.focus(); control.value = value; control.emit(id === 'mode' ? 'change' : 'input'); },
    split() { element('chunk-form').emit('submit'); },
    copy(index) { const button = copyButtons().find(node => node.dataset.chunkIndex === String(index)); button.focus(); button.emit('click'); },
    lifecycle(type) { window.emit(type, { persisted: true }); },
    observe() {
      return {
        source: element('source').value, limit: element('limit').value,
        chunks: chunks().map(node => node.value), status: element('status').textContent,
        kind: element('status').dataset.kind,
        editorLocks: ['source', 'limit', 'mode', 'split', 'clear', 'page-choice'].map(id => [id, element(id).disabled]),
        copyLocks: copyButtons().map(node => node.disabled), busy: element('chunk-form').attributes['aria-busy'],
        focused: document.activeElement?.id || document.activeElement?.dataset.chunkIndex || null,
        focusCalls: document.focusCalls, selectionCalls: document.selectionCalls
      };
    },
    async close() {
      window.emit('pagehide');
      for (const request of requests) request.resolve();
      await flushCallbacks();
      restore();
    }
  };
}
