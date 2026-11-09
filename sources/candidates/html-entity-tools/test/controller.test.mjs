import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim plus injected fakes (captured clipboard, manual
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
  "mode-select", "input-text", "output-text", "encode-options",
  "opt-nonascii", "opt-style", "counts-line", "input-error",
  "changes-body", "changes-summary", "unresolved-body",
  "unresolved-summary", "double-hint", "decode-again", "copy-output",
  "announce",
];

function makeApp() {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  elements.get("mode-select").value = "decode";
  elements.get("opt-style").value = "named";
  const doc = {
    documentElement: { lang: "zh-Hant" },
    querySelector: (selector) => elements.get(selector.slice(1)) ?? null,
    createElement: (tag) => new FakeElement("", tag),
  };
  const timers = [];
  const captured = { clipboard: [] };
  createApp(doc, {
    clipboardWrite: async (text) => {
      captured.clipboard.push(text);
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
  return { elements, captured, flushTimers };
}

test("defaults: decode mode, encode options hidden, no-references message", () => {
  const { elements } = makeApp();
  assert.equal(elements.get("encode-options").hidden, true);
  assert.match(elements.get("changes-summary").textContent, /找不到任何參照/);
  assert.equal(elements.get("double-hint").hidden, true);
});

test("decode flow: debounced conversion renders output, counts and change rows", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "&#150; &notin;";
  input.dispatch("input");
  assert.equal(elements.get("output-text").value, "");
  flushTimers();
  assert.equal(elements.get("output-text").value, "– ∉");
  assert.match(elements.get("counts-line").textContent, /輸入 14 字元 · 輸出 3 字元/);
  const rows = elements.get("changes-body").children;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children[0].textContent, "0");
  assert.equal(rows[0].children[1].textContent, "&#150;");
  assert.equal(rows[0].children[2].textContent, "– U+2013");
  assert.match(rows[0].children[3].textContent, /C1 對照/);
  assert.equal(rows[1].children[0].textContent, "7");
});

test("unresolved rows render with the localized reason", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "&notreal; &#xZZ;";
  input.dispatch("input");
  flushTimers();
  const rows = elements.get("unresolved-body").children;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children[1].textContent, "&notreal;");
  assert.match(rows[0].children[2].textContent, /未知名稱/);
  assert.match(rows[1].children[2].textContent, /數字格式錯誤/);
  assert.equal(elements.get("output-text").value, "&notreal; &#xZZ;");
});

test("double-encoded hint offers decode-again, which re-runs on the output", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "&amp;lt;";
  input.dispatch("input");
  flushTimers();
  assert.equal(elements.get("output-text").value, "&lt;");
  assert.equal(elements.get("double-hint").hidden, false);
  elements.get("decode-again").click();
  assert.equal(elements.get("input-text").value, "&lt;");
  assert.equal(elements.get("output-text").value, "<");
  assert.equal(elements.get("double-hint").hidden, true);
});

test("encode mode: options appear and conversion follows them", () => {
  const { elements } = makeApp();
  elements.get("mode-select").value = "encode";
  elements.get("mode-select").dispatch("change");
  assert.equal(elements.get("encode-options").hidden, false);
  elements.get("input-text").value = "café";
  elements.get("opt-nonascii").checked = true;
  elements.get("opt-nonascii").dispatch("change");
  assert.equal(elements.get("output-text").value, "caf&eacute;");
  elements.get("opt-style").value = "hex";
  elements.get("opt-style").dispatch("change");
  assert.equal(elements.get("output-text").value, "caf&#xE9;");
});

test("over-cap input is refused with the count and clears the output", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "a".repeat(100001);
  input.dispatch("input");
  flushTimers();
  assert.match(elements.get("input-error").textContent, /100001/);
  assert.equal(elements.get("output-text").value, "");
});

test("copy writes the exact output text", async () => {
  const { elements, captured, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "&lt;p&gt;";
  input.dispatch("input");
  flushTimers();
  elements.get("copy-output").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(captured.clipboard, ["<p>"]);
});

test("change list renders at most 500 rows while the summary keeps the total", () => {
  const { elements, flushTimers } = makeApp();
  const input = elements.get("input-text");
  input.value = "&amp;".repeat(600);
  input.dispatch("input");
  flushTimers();
  assert.equal(elements.get("changes-body").children.length, 500);
  assert.match(elements.get("changes-summary").textContent, /600/);
  assert.equal(elements.get("output-text").value, "&".repeat(600));
});
