import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";

// Minimal DOM shim: the controller is exercised through the same events
// a browser would fire. Real-browser rendering evidence stays NOT_RUN
// as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.innerHTML = "";
    this.ownText = "";
    this.children = [];
    this.listeners = new Map();
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.clientHeight = 0;
  }
  get textContent() {
    return this.ownText;
  }
  set textContent(value) {
    this.ownText = String(value);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this });
  }
  click() {
    this.dispatch("click");
  }
}

const IDS = [
  "editor", "preview", "counts", "limit-error", "sample-button",
  "clear-button", "copy-button", "export-button", "sync-toggle",
  "status-note", "announce",
];

function makeApp(lang = "zh-Hant") {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  const doc = {
    documentElement: { lang },
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement() {
      return new FakeElement("");
    },
  };
  const el = (id) => elements.get(id);
  el("sync-toggle").checked = true;
  el("limit-error").hidden = true;
  const timers = [];
  const clipboard = {
    written: [],
    async writeText(text) {
      this.written.push(text);
    },
  };
  const downloads = [];
  const env = {
    clipboard,
    setTimeout(fn) {
      timers.push(fn);
      return timers.length;
    },
    clearTimeout() {},
    now: () => new Date(2026, 10, 2, 9, 5, 3),
    download(filename, text) {
      downloads.push({ filename, text });
    },
  };
  createApp(doc, env);
  const type = (text) => {
    el("editor").value = text;
    el("editor").dispatch("input");
    while (timers.length > 0) timers.shift()();
  };
  return { el, type, clipboard, downloads };
}

test("initial state: hint shown, export disabled, counts at zero", () => {
  const { el } = makeApp();
  assert.ok(el("preview").innerHTML.includes("即時顯示預覽"));
  assert.equal(el("copy-button").disabled, true);
  assert.equal(el("export-button").disabled, true);
  assert.equal(el("counts").textContent, "0 字元 · 0 字");
});

test("typing renders through the debounce; counts and copy use the same string", async () => {
  const { el, type, clipboard } = makeApp();
  type("# 標題\n\n內文");
  assert.equal(el("preview").innerHTML, "<h1>標題</h1>\n<p>內文</p>");
  assert.equal(el("counts").textContent, "8 字元 · 4 字");
  assert.equal(el("copy-button").disabled, false);
  el("copy-button").click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(clipboard.written, ["<h1>標題</h1>\n<p>內文</p>"]);
});

test("export downloads the standalone document with the heading title", () => {
  const { el, type, downloads } = makeApp();
  type("# 標題\n\n內文");
  el("export-button").click();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "markdown-20261102-090503.html");
  assert.ok(downloads[0].text.includes("<title>標題</title>"));
  assert.ok(downloads[0].text.includes("<h1>標題</h1>\n<p>內文</p>"));
  assert.ok(downloads[0].text.startsWith("<!DOCTYPE html>"));
});

test("over the limit the preview freezes and copy/export disable; shortening recovers", () => {
  const { el, type } = makeApp();
  type("# Keep");
  const frozen = el("preview").innerHTML;
  type("a".repeat(200001));
  assert.equal(el("limit-error").hidden, false);
  assert.ok(el("limit-error").textContent.includes("200001"));
  assert.equal(el("preview").innerHTML, frozen);
  assert.equal(el("copy-button").disabled, true);
  assert.equal(el("export-button").disabled, true);
  type("# Back");
  assert.equal(el("limit-error").hidden, true);
  assert.equal(el("preview").innerHTML, "<h1>Back</h1>");
});

test("sample loads directly when empty and needs a confirming click when not", () => {
  const { el } = makeApp();
  el("sample-button").click();
  assert.ok(el("editor").value.includes("# 範例文件"));
  assert.ok(el("preview").innerHTML.includes("<h1>範例文件</h1>"));
  el("editor").value = "mine";
  el("editor").dispatch("input");
  el("sample-button").click();
  assert.equal(el("editor").value, "mine");
  assert.ok(el("sample-button").textContent.includes("再按一次"));
  el("sample-button").click();
  assert.ok(el("editor").value.includes("# 範例文件"));
});

test("clear empties the editor and the preview returns to the hint", () => {
  const { el, type } = makeApp();
  type("text");
  el("clear-button").click();
  assert.equal(el("editor").value, "");
  assert.ok(el("preview").innerHTML.includes("即時顯示預覽"));
});

test("scroll sync follows the same fraction when enabled", () => {
  const { el } = makeApp();
  const editor = el("editor");
  const preview = el("preview");
  editor.scrollHeight = 1000;
  editor.clientHeight = 200;
  editor.scrollTop = 400;
  preview.scrollHeight = 600;
  preview.clientHeight = 100;
  editor.dispatch("scroll");
  assert.equal(preview.scrollTop, 250);
  el("sync-toggle").checked = false;
  editor.scrollTop = 800;
  editor.dispatch("scroll");
  assert.equal(preview.scrollTop, 250);
});
