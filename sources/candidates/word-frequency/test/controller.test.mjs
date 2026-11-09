import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim plus injected fakes (captured download, manual
// timers). Real browser rendering stays NOT_RUN as recorded in
// VERIFICATION.md.

class FakeElement {
  constructor(id, tagName = "div") {
    this.id = id;
    this.tagName = tagName;
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.className = "";
    this.ownText = "";
    this.children = [];
    this.listeners = new Map();
  }
  get textContent() {
    return this.ownText + this.children.map((child) => child.textContent).join("");
  }
  set textContent(value) {
    this.ownText = String(value);
    if (value === "") this.children = [];
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type) {
    const event = { type, target: this, preventDefault() {} };
    for (const fn of this.listeners.get(type) ?? []) fn(event);
    return event;
  }
  click() {
    this.dispatch("click");
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

const IDS = [
  "input-text", "input-error", "opt-stopwords", "stopwords-text",
  "stopwords-restore", "opt-mincount", "opt-minlength", "opt-numbers",
  "tab-words", "tab-chars", "tab-bigrams", "totals-line", "result-body",
  "rows-note", "opt-showall", "export-csv", "announce",
];

function makeApp() {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  elements.get("opt-numbers").checked = true;
  elements.get("opt-mincount").value = "1";
  elements.get("opt-minlength").value = "1";
  const doc = {
    documentElement: { lang: "zh-Hant" },
    querySelector: (selector) => elements.get(selector.slice(1)) ?? null,
    createElement: (tag) => new FakeElement("", tag),
  };
  const timers = [];
  const captured = { downloads: [] };
  const app = createApp(doc, {
    download: (filename, text) => {
      captured.downloads.push({ filename, text });
    },
    setTimeout: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    clearTimeout: (id) => {
      timers[id - 1] = null;
    },
  });
  const flushTimers = () => {
    for (const fn of timers.splice(0)) if (fn) fn();
  };
  return { app, elements, captured, flushTimers };
}

test("defaults: empty state, stopwords prefilled but off, numbers on", () => {
  const { elements } = makeApp();
  assert.match(elements.get("stopwords-text").value, /the/);
  assert.match(elements.get("stopwords-text").value, /的/);
  assert.equal(elements.get("opt-stopwords").checked, false);
  assert.match(elements.get("result-body").textContent, /沒有可計的項目/);
});

test("paste computes after debounce; tabs switch tables; totals update", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "我喜歡台灣，台灣喜歡我。";
  input.dispatch("input");
  assert.equal(elements.get("result-body").children.length, 1); // still the empty-state row
  flushTimers();
  // Words table is empty for this input; characters are not.
  elements.get("tab-chars").click();
  const body = elements.get("result-body");
  assert.equal(body.children.length, 5);
  assert.equal(body.children[0].children[1].textContent, "我");
  assert.equal(body.children[0].children[2].textContent, "2");
  assert.match(elements.get("totals-line").textContent, /總數 10 · 不重複 5 項 · 輸入 12 字元/);
  elements.get("tab-bigrams").click();
  assert.equal(elements.get("result-body").children.length, 6);
  assert.equal(elements.get("result-body").children[0].children[1].textContent, "喜歡");
});

test("stopwords toggle shrinks the words table; restore resets edits", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "The cat and the dog";
  input.dispatch("input");
  flushTimers();
  assert.equal(elements.get("result-body").children.length, 4);
  elements.get("opt-stopwords").checked = true;
  elements.get("opt-stopwords").dispatch("change");
  assert.equal(elements.get("result-body").children.length, 2);
  elements.get("stopwords-text").value = "cat";
  elements.get("stopwords-text").dispatch("input");
  flushTimers();
  assert.equal(elements.get("result-body").children.length, 3); // the, and, dog (cat now stopped instead)
  elements.get("stopwords-restore").click();
  assert.match(elements.get("stopwords-text").value, /the/);
  assert.equal(elements.get("result-body").children.length, 2);
});

test("CSV export downloads the full filtered table of the active tab", () => {
  const { elements, captured, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "don't don't DON'T";
  input.dispatch("input");
  flushTimers();
  elements.get("export-csv").click();
  assert.equal(captured.downloads.length, 1);
  assert.equal(captured.downloads[0].filename, "frequency.csv");
  assert.equal(captured.downloads[0].text, "item,count,percent\ndon't,3,100.0\n");
});

test("over-cap input is refused with the count shown", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "a".repeat(200001);
  input.dispatch("input");
  flushTimers();
  assert.match(elements.get("input-error").textContent, /200001/);
});
