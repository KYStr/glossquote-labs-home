import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";
import { pageCountOf, pageLabels } from "../public/js/core/engine.mjs";
import { makeCorruptPdf, makeDocA, makeDocB, makeEncryptedPdf } from "./fixtures.mjs";

// Minimal DOM shim: the controller is exercised through the same events
// a browser would fire, with real fixture PDFs and the real engine.
// Downloads are captured through the env hook. Real-browser evidence
// stays NOT_RUN as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.files = [];
    this.ownText = "";
    this.children = [];
    this.attrs = {};
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
  dispatch(type, event = {}) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this, ...event });
  }
  click() {
    this.dispatch("click");
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
}

const IDS = [
  "tab-merge", "tab-split", "tab-extract", "tab-rotate",
  "file-input", "drop-zone", "file-list", "file-errors",
  "controls-merge", "range-block", "range-input", "range-error",
  "split-options", "split-combined", "split-pergroup",
  "rotate-options", "angle-select",
  "plan", "generate-button", "progress-note", "download-list",
  "start-over", "status-note", "announce",
];

function makeDoc(lang = "zh-Hant") {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  const doc = {
    documentElement: { lang },
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement() {
      return new FakeElement("");
    },
    createTextNode(text) {
      return { textContent: String(text) };
    },
  };
  elements.get("angle-select").value = "90";
  elements.get("split-combined").checked = true;
  elements.get("range-block").hidden = true;
  elements.get("split-options").hidden = true;
  elements.get("rotate-options").hidden = true;
  return { doc, el: (id) => elements.get(id) };
}

const fakeFile = (name, bytes) => ({
  name,
  size: bytes.length,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});

async function makeApp() {
  const { doc, el } = makeDoc();
  const downloads = [];
  const app = createApp(doc, {
    download: (name, bytes) => downloads.push({ name, bytes }),
    yieldNow: () => Promise.resolve(),
  });
  return { app, el, downloads };
}

test("merge flow: two files, plan shows 8 pages, generate downloads one merged file", async () => {
  const { app, el, downloads } = await makeApp();
  await app.addFiles([fakeFile("a.pdf", await makeDocA()), fakeFile("b.pdf", await makeDocB())]);
  assert.equal(el("file-list").children.length, 2);
  assert.match(el("plan").textContent, /共 8 頁/);
  assert.match(el("plan").textContent, /a-merged\.pdf/);
  assert.equal(el("generate-button").disabled, false);
  el("generate-button").click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, "a-merged.pdf");
  assert.equal(await pageCountOf(downloads[0].bytes), 8);
  assert.match(el("status-note").textContent, /已產生 1 個檔案/);
});

test("invalid files land in the error list with specific reasons and never in a plan", async () => {
  const { app, el } = await makeApp();
  const a = await makeDocA();
  await app.addFiles([
    fakeFile("locked.pdf", makeEncryptedPdf()),
    fakeFile("broken.pdf", makeCorruptPdf(a)),
    fakeFile("notes.txt", new TextEncoder().encode("hello")),
    fakeFile("a.pdf", a),
  ]);
  assert.equal(el("file-list").children.length, 1);
  const errors = el("file-errors").textContent;
  assert.match(errors, /受密碼保護/);
  assert.match(errors, /損毀或格式不正確/);
  assert.match(errors, /不是 PDF 檔/);
  // Only one valid file: merge still cannot generate.
  assert.equal(el("generate-button").disabled, true);
});

test("split per-group flow downloads one file per group with plan names", async () => {
  const { app, el, downloads } = await makeApp();
  el("tab-split").click();
  await app.addFiles([fakeFile("a.pdf", await makeDocA())]);
  el("range-input").value = "2-3,5";
  el("range-input").dispatch("input");
  el("split-pergroup").checked = true;
  el("split-pergroup").dispatch("change");
  assert.match(el("plan").textContent, /2 組/);
  assert.equal(el("generate-button").disabled, false);
  await app.generate();
  assert.deepEqual(downloads.map((d) => d.name), ["a-p2-3.pdf", "a-p5.pdf"]);
  assert.equal(await pageCountOf(downloads[0].bytes), 2);
  assert.deepEqual(await pageLabels(downloads[0].bytes), ["A-2", "A-3"]);
  assert.deepEqual(await pageLabels(downloads[1].bytes), ["A-5"]);
});

test("range errors surface next to the input and block generation", async () => {
  const { app, el } = await makeApp();
  el("tab-extract").click();
  await app.addFiles([fakeFile("a.pdf", await makeDocA())]);
  el("range-input").value = "1-4,3-5";
  el("range-input").dispatch("input");
  // Overlap is only an error for split; extract rejects duplicates too.
  assert.match(el("range-error").textContent, /不可重複選取/);
  assert.equal(el("generate-button").disabled, true);
  el("range-input").value = "5,1-2";
  el("range-input").dispatch("input");
  assert.equal(el("range-error").textContent, "");
  assert.match(el("plan").textContent, /頁面順序 5, 1, 2/);
  assert.equal(el("generate-button").disabled, false);
});

test("rotate flow: plan shows the resulting rotation for the sample page", async () => {
  const { app, el, downloads } = await makeApp();
  el("tab-rotate").click();
  await app.addFiles([fakeFile("a.pdf", await makeDocA())]);
  el("range-input").value = "2";
  el("range-input").dispatch("input");
  assert.match(el("plan").textContent, /0° → 90°/);
  await app.generate();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, "a-rotated.pdf");
});

test("start over clears files, plan and downloads", async () => {
  const { app, el } = await makeApp();
  await app.addFiles([fakeFile("a.pdf", await makeDocA()), fakeFile("b.pdf", await makeDocB())]);
  assert.equal(el("file-list").children.length, 2);
  el("start-over").click();
  assert.equal(el("file-list").children.length, 0);
  assert.equal(el("generate-button").disabled, true);
  assert.equal(el("status-note").textContent, "已清除全部檔案與結果。");
});

test("a hostile file name renders as text, never markup", async () => {
  const { app, el } = await makeApp();
  await app.addFiles([fakeFile("<img src=x onerror=alert(1)>.pdf", await makeDocA())]);
  const row = el("file-list").children[0];
  assert.equal(row.textContent.includes("<img src=x onerror=alert(1)>.pdf"), true);
  // The name lives in a single span's text; no element was built from it.
  assert.equal(row.children[0].children.length, 0);
});
