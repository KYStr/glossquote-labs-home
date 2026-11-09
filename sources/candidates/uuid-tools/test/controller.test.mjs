import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim plus injected fakes (sequential byte source,
// fixed clock, captured clipboard/download, manual timers). Real
// browser rendering stays NOT_RUN as recorded in VERIFICATION.md.

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
  "version-select", "count-input", "count-error", "opt-uppercase",
  "opt-hyphens", "generate-button", "batch-label", "results-list",
  "copy-all", "download-button", "inspect-input", "inspect-report",
  "announce",
];

function sequential(array) {
  for (let index = 0; index < array.length; index += 1) array[index] = index % 256;
}

function makeApp() {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  elements.get("version-select").value = "4";
  elements.get("count-input").value = "1";
  elements.get("opt-hyphens").checked = true;
  const doc = {
    documentElement: { lang: "zh-Hant" },
    querySelector: (selector) => elements.get(selector.slice(1)) ?? null,
    createElement: (tag) => new FakeElement("", tag),
  };
  const timers = [];
  const captured = { clipboard: [], downloads: [] };
  const app = createApp(doc, {
    fillRandom: sequential,
    nowMs: () => 1735689600000,
    clipboardWrite: async (text) => {
      captured.clipboard.push(text);
    },
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
    formatLocal: (ms) => `LOCAL<${ms}>`,
  });
  const flushTimers = () => {
    for (const fn of timers.splice(0)) if (fn) fn();
  };
  return { app, elements, captured, flushTimers };
}

test("defaults: no batch, copy and download disabled, empty inspector state", () => {
  const { elements } = makeApp();
  assert.equal(elements.get("copy-all").disabled, true);
  assert.equal(elements.get("download-button").disabled, true);
  assert.match(elements.get("batch-label").textContent, /尚未產生/);
  assert.match(elements.get("inspect-report").textContent, /空白/);
});

test("generate renders the batch and enables copy/download with byte-exact text", async () => {
  const { elements, captured } = makeApp();
  elements.get("count-input").value = "2";
  elements.get("generate-button").click();
  const list = elements.get("results-list");
  assert.equal(list.children.length, 2);
  assert.equal(list.children[0].textContent, "00010203-0405-4607-8809-0a0b0c0d0e0f");
  assert.equal(list.children[1].textContent, "10111213-1415-4617-9819-1a1b1c1d1e1f");
  assert.equal(elements.get("copy-all").disabled, false);
  assert.equal(elements.get("download-button").disabled, false);
  assert.match(elements.get("batch-label").textContent, /2 個 · 版本 4/);
  elements.get("copy-all").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(captured.clipboard, [
    "00010203-0405-4607-8809-0a0b0c0d0e0f\n10111213-1415-4617-9819-1a1b1c1d1e1f\n",
  ]);
  elements.get("download-button").click();
  assert.equal(captured.downloads.length, 1);
  assert.equal(captured.downloads[0].filename, "uuids.txt");
  assert.equal(captured.downloads[0].text, captured.clipboard[0]);
});

test("an invalid count is refused inline and generates nothing", () => {
  const { elements } = makeApp();
  elements.get("count-input").value = "0";
  elements.get("generate-button").click();
  assert.match(elements.get("count-error").textContent, /1 到 1000/);
  assert.equal(elements.get("results-list").children.length, 0);
  assert.equal(elements.get("copy-all").disabled, true);
});

test("v7 generation uses the injected clock", () => {
  const { elements } = makeApp();
  elements.get("version-select").value = "7";
  elements.get("generate-button").click();
  assert.equal(
    elements.get("results-list").children[0].textContent,
    "01941f29-7c00-7607-8809-0a0b0c0d0e0f",
  );
});

test("clicking a result loads it into the inspector (round trip)", () => {
  const { elements } = makeApp();
  elements.get("generate-button").click();
  elements.get("results-list").children[0].click();
  assert.equal(
    elements.get("inspect-input").value,
    "00010203-0405-4607-8809-0a0b0c0d0e0f",
  );
  const report = elements.get("inspect-report").textContent;
  assert.match(report, /格式正確/);
  assert.match(report, /4 — 隨機型/);
  assert.match(report, /RFC 9562 標準變體/);
});

test("inspector debounces input and renders version, variant and both times", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("inspect-input");
  input.value = "01941f29-7c00-7abc-8123-456789abcdef";
  input.dispatch("input");
  assert.doesNotMatch(elements.get("inspect-report").textContent, /2025-01-01/);
  flushTimers();
  const report = elements.get("inspect-report").textContent;
  assert.match(report, /格式正確/);
  assert.match(report, /7 — Unix 時間型/);
  assert.match(report, /2025-01-01T00:00:00\.000Z/);
  assert.match(report, /LOCAL<1735689600000>/);
});

test("inspector renders the specific error and the NIL name", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("inspect-input");
  input.value = "01941f29-7c00-7abc-8123-456789abcdeg";
  input.dispatch("input");
  flushTimers();
  const bad = elements.get("inspect-report").textContent;
  assert.match(bad, /不是嚴格合法的 UUID/);
  assert.match(bad, /第 36 字元「g」/);
  input.value = "00000000-0000-0000-0000-000000000000";
  input.dispatch("input");
  flushTimers();
  assert.match(elements.get("inspect-report").textContent, /NIL UUID/);
});
